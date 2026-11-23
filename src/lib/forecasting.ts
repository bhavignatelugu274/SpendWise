import { addMonths, formatMonthLabel, getDaysInMonth, getMonthKey } from './formatters';
import {
  BudgetConfig,
  CategoryForecast,
  EXPENSE_CATEGORIES,
  ExpenseCategory,
  FeatureWeight,
  ForecastOutput,
  HistoricalForecastPoint,
  ModelMetrics,
  MonthlyAggregate,
  PAYMENT_METHODS,
  PaymentMethod,
  Transaction,
} from './types';

function emptyCategoryMap(): Record<ExpenseCategory, number> {
  return {
    Rent: 0,
    Groceries: 0,
    Dining: 0,
    Travel: 0,
    Bills: 0,
    Shopping: 0,
    Health: 0,
    Subscriptions: 0,
    Other: 0,
  };
}

function emptyPaymentMap(): Record<PaymentMethod, number> {
  return {
    UPI: 0,
    'Debit Card': 0,
    'Credit Card': 0,
    Cash: 0,
  };
}

/**
 * Aggregates transactions chronologically by YYYY-MM.
 * Detects if the final month is an in-progress partial month based on latest transaction day
 * relative to total days in that month (when >= 3 months exist).
 */
export function buildMonthlySeries(transactions: Transaction[]): MonthlyAggregate[] {
  if (transactions.length === 0) return [];

  const grouped = new Map<
    string,
    {
      txs: Transaction[];
      maxDay: number;
    }
  >();

  for (const tx of transactions) {
    const mk = getMonthKey(tx.date);
    if (!/^\d{4}-\d{2}$/.test(mk)) continue;
    const day = Number(tx.date.slice(8, 10)) || 1;
    const entry = grouped.get(mk) ?? { txs: [], maxDay: 0 };
    entry.txs.push(tx);
    if (day > entry.maxDay) entry.maxDay = day;
    grouped.set(mk, entry);
  }

  const sortedKeys = Array.from(grouped.keys()).sort();

  return sortedKeys.map((monthKey, idx) => {
    const { txs, maxDay } = grouped.get(monthKey)!;
    const byCategory = emptyCategoryMap();
    const byPaymentMethod = emptyPaymentMap();
    let totalExpense = 0;
    let totalIncome = 0;
    let weekendExpense = 0;
    let recurringExpense = 0;

    for (const tx of txs) {
      if (tx.type === 'income') {
        totalIncome += tx.amount;
      } else {
        totalExpense += tx.amount;
        if (EXPENSE_CATEGORIES.includes(tx.category as ExpenseCategory)) {
          byCategory[tx.category as ExpenseCategory] += tx.amount;
        } else {
          byCategory.Other += tx.amount;
        }
        if (PAYMENT_METHODS.includes(tx.paymentMethod)) {
          byPaymentMethod[tx.paymentMethod] += tx.amount;
        }
        const d = new Date(`${tx.date}T00:00:00`);
        const dow = d.getDay();
        if (dow === 0 || dow === 5 || dow === 6) {
          weekendExpense += tx.amount;
        }
        if (tx.category === 'Rent' || tx.category === 'Subscriptions' || tx.category === 'Bills') {
          recurringExpense += tx.amount;
        }
      }
    }

    const daysInMonth = getDaysInMonth(monthKey);
    const isLast = idx === sortedKeys.length - 1;
    const isPartialMonth = isLast && sortedKeys.length >= 3 && maxDay < daysInMonth - 3;

    return {
      monthKey,
      label: formatMonthLabel(monthKey),
      totalExpense,
      totalIncome,
      netSavings: totalIncome - totalExpense,
      transactionCount: txs.length,
      weekendExpense,
      recurringExpense,
      byCategory,
      byPaymentMethod,
      isPartialMonth,
    };
  });
}

function solveLinearSystem(A: number[][], b: number[]): number[] | null {
  const n = A.length;
  const M = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    let pivotRow = col;
    let maxVal = Math.abs(M[col][col]);
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(M[r][col]) > maxVal) {
        maxVal = Math.abs(M[r][col]);
        pivotRow = r;
      }
    }
    if (maxVal < 1e-10) return null;
    if (pivotRow !== col) {
      const tmp = M[col];
      M[col] = M[pivotRow];
      M[pivotRow] = tmp;
    }

    const pivot = M[col][col];
    for (let j = col; j <= n; j++) {
      M[col][j] /= pivot;
    }

    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = M[r][col];
      for (let j = col; j <= n; j++) {
        M[r][j] -= factor * M[col][j];
      }
    }
  }

  return M.map((row) => row[n]);
}

interface RidgeModel {
  intercept: number;
  weights: number[];
  means: number[];
  stds: number[];
}

function fitRidgeRegression(X: number[][], y: number[], lambda = 3.0): RidgeModel | null {
  const n = X.length;
  const p = X[0]?.length ?? 0;
  if (n < 3 || p === 0) return null;

  // Standardize features strictly using training split statistics
  const means = new Array(p).fill(0);
  const stds = new Array(p).fill(1);

  for (let j = 0; j < p; j++) {
    let sum = 0;
    for (let i = 0; i < n; i++) sum += X[i][j];
    means[j] = sum / n;

    let sq = 0;
    for (let i = 0; i < n; i++) {
      const d = X[i][j] - means[j];
      sq += d * d;
    }
    const sd = Math.sqrt(sq / n);
    stds[j] = sd > 1e-6 ? sd : 1;
  }

  const yMean = y.reduce((a, b) => a + b, 0) / n;

  const Z = X.map((row) => row.map((v, j) => (v - means[j]) / stds[j]));
  const yc = y.map((v) => v - yMean);

  // Normal equations: (Z^T Z + lambda * I) w = Z^T yc
  const XtX: number[][] = Array.from({ length: p }, () => new Array(p).fill(0));
  const Xty: number[] = new Array(p).fill(0);

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < p; j++) {
      Xty[j] += Z[i][j] * yc[i];
      for (let k = 0; k < p; k++) {
        XtX[j][k] += Z[i][j] * Z[i][k];
      }
    }
  }

  for (let j = 0; j < p; j++) {
    XtX[j][j] += lambda;
  }

  const weights = solveLinearSystem(XtX, Xty);
  if (!weights) return null;

  return {
    intercept: yMean,
    weights,
    means,
    stds,
  };
}

function predictRidge(model: RidgeModel, x: number[]): number {
  let pred = model.intercept;
  for (let j = 0; j < model.weights.length; j++) {
    const z = (x[j] - model.means[j]) / model.stds[j];
    pred += model.weights[j] * z;
  }
  return Math.max(0, pred);
}

function computeMetrics(actuals: number[], preds: number[], trainSampleSize: number): ModelMetrics {
  const n = actuals.length;
  if (n === 0) {
    return { mae: null, rmse: null, mape: null, r2: null, testSampleSize: 0, trainSampleSize };
  }

  let absErr = 0;
  let sqErr = 0;
  let apeSum = 0;
  let apeCount = 0;

  for (let i = 0; i < n; i++) {
    const err = actuals[i] - preds[i];
    absErr += Math.abs(err);
    sqErr += err * err;
    if (actuals[i] > 0) {
      apeSum += Math.abs(err) / actuals[i];
      apeCount++;
    }
  }

  const mae = absErr / n;
  const rmse = Math.sqrt(sqErr / n);
  const mape = apeCount > 0 ? (apeSum / apeCount) * 100 : null;

  let r2: number | null = null;
  if (n >= 2) {
    const meanActual = actuals.reduce((a, b) => a + b, 0) / n;
    const sst = actuals.reduce((acc, v) => acc + (v - meanActual) ** 2, 0);
    if (sst > 1e-6) {
      r2 = 1 - sqErr / sst;
    }
  }

  return {
    mae: Math.round(mae),
    rmse: Math.round(rmse),
    mape: mape !== null ? Number(mape.toFixed(1)) : null,
    r2: r2 !== null ? Number(r2.toFixed(3)) : null,
    testSampleSize: n,
    trainSampleSize,
  };
}

function buildFeatureVector(
  series: MonthlyAggregate[],
  targetIdx: number,
  targetMonthKey: string
): number[] {
  const prev1 = series[targetIdx - 1];
  const prev2 = targetIdx >= 2 ? series[targetIdx - 2] : prev1;
  const lookbackStart = Math.max(0, targetIdx - 3);
  const window = series.slice(lookbackStart, targetIdx);
  const rolling3 = window.reduce((s, m) => s + m.totalExpense, 0) / window.length;
  const momDelta = prev1.totalExpense - prev2.totalExpense;
  const weekendRatio = prev1.totalExpense > 0 ? prev1.weekendExpense / prev1.totalExpense : 0.35;
  const recurringRatio = prev1.totalExpense > 0 ? prev1.recurringExpense / prev1.totalExpense : 0.4;
  const calMonth = Number(targetMonthKey.slice(5, 7)) || 1;
  const angle = (2 * Math.PI * (calMonth - 1)) / 12;

  return [
    targetIdx, // Chronological trend index
    rolling3, // Trailing 3-month rolling expense mean
    momDelta, // Month-on-month velocity
    weekendRatio, // Prior month weekend share
    recurringRatio, // Prior month recurring bills+rent share
    Math.sin(angle), // Seasonal cycle sin
    Math.cos(angle), // Seasonal cycle cos
  ];
}

const FEATURE_META: Array<{ name: string; description: string }> = [
  { name: 'Time Trend Index', description: 'Long-term monthly spending trajectory' },
  { name: '3-Mo Rolling Avg', description: 'Smoothed trailing 3-month baseline' },
  { name: 'MoM Velocity', description: 'Month-over-month acceleration or drop' },
  { name: 'Weekend Spend Ratio', description: 'Share of Fri–Sun discretionary outlays' },
  { name: 'Recurring Ratio', description: 'Share of rent, utilities & subscriptions' },
  { name: 'Seasonality (Sin)', description: 'Annual cyclical calendar component' },
  { name: 'Seasonality (Cos)', description: 'Annual seasonal phase shift' },
];

/**
 * Generates chronological next-month and category-wise forecasts.
 * Never fabricates accuracy or substitutes predictions when history < 2 complete months.
 */
export function generateForecast(
  transactions: Transaction[],
  budgets: BudgetConfig
): ForecastOutput {
  const allSeries = buildMonthlySeries(transactions);
  const completeSeries = allSeries.filter((m) => !m.isPartialMonth);
  const latestAll = allSeries[allSeries.length - 1];
  const targetMonthKey = latestAll ? addMonths(latestAll.monthKey, 1) : '2026-12';
  const targetMonthLabel = formatMonthLabel(targetMonthKey);

  const emptyMetrics: ModelMetrics = {
    mae: null,
    rmse: null,
    mape: null,
    r2: null,
    testSampleSize: 0,
    trainSampleSize: 0,
  };

  if (completeSeries.length < 2) {
    const fallbackCategories: CategoryForecast[] = EXPENSE_CATEGORIES.map((cat) => ({
      category: cat,
      lastCompleteMonth: completeSeries[0]?.byCategory[cat] ?? 0,
      trailing3MoAvg: completeSeries[0]?.byCategory[cat] ?? 0,
      predictedAmount: null,
      deltaPct: null,
      budget: budgets.categoryBudgets[cat] ?? 0,
      expectedOvershoot: 0,
    }));

    return {
      modelLabel: 'Insufficient Data',
      algorithmName: 'Requires at least 2 complete historical months',
      targetMonthKey,
      targetMonthLabel,
      predictedTotal: null,
      baselineTotal: null,
      expectedBudgetOvershoot: null,
      completeMonthsCount: completeSeries.length,
      metrics: { ml: emptyMetrics, baseline: emptyMetrics },
      featureWeights: [],
      categoryForecasts: fallbackCategories,
      series: allSeries.map((m) => ({
        monthKey: m.monthKey,
        label: m.label,
        actual: m.totalExpense,
        baselinePredicted: null,
        mlPredicted: null,
        split: 'train',
      })),
      explanation:
        'Fewer than 2 complete historical months are available. Add or import multi-month history (or launch Demo Mode) to unlock baseline and Ridge regression forecasts.',
    };
  }

  // Rolling 3-month baseline predictions for every month >= index 1
  const baselineForIdx = (idx: number) => {
    const start = Math.max(0, idx - 3);
    const slice = completeSeries.slice(start, idx);
    return slice.reduce((s, m) => s + m.totalExpense, 0) / slice.length;
  };

  // Baseline Estimate mode when 2..5 complete months exist
  if (completeSeries.length < 6) {
    const baselineNext = Math.round(baselineForIdx(completeSeries.length));
    const testStart = Math.max(1, completeSeries.length - 2);
    const actuals: number[] = [];
    const basePreds: number[] = [];
    for (let i = testStart; i < completeSeries.length; i++) {
      actuals.push(completeSeries[i].totalExpense);
      basePreds.push(baselineForIdx(i));
    }
    const baseMetrics = computeMetrics(actuals, basePreds, testStart);
    const overshoot =
      budgets.totalMonthlyBudget > 0 ? Math.max(0, baselineNext - budgets.totalMonthlyBudget) : 0;

    const categoryForecasts = buildCategoryForecasts(completeSeries, budgets, false);

    const chartSeries: HistoricalForecastPoint[] = completeSeries.map((m, idx) => ({
      monthKey: m.monthKey,
      label: m.label,
      actual: Math.round(m.totalExpense),
      baselinePredicted: idx >= 1 ? Math.round(baselineForIdx(idx)) : null,
      mlPredicted: null,
      split: idx >= testStart ? 'test' : 'train',
    }));
    chartSeries.push({
      monthKey: targetMonthKey,
      label: targetMonthLabel,
      actual: null,
      baselinePredicted: baselineNext,
      mlPredicted: null,
      split: 'forecast',
    });

    return {
      modelLabel: 'Baseline Estimate',
      algorithmName: 'Trailing 3-Month Rolling Average',
      targetMonthKey,
      targetMonthLabel,
      predictedTotal: baselineNext,
      baselineTotal: baselineNext,
      expectedBudgetOvershoot: budgets.totalMonthlyBudget > 0 ? overshoot : null,
      completeMonthsCount: completeSeries.length,
      metrics: { ml: emptyMetrics, baseline: baseMetrics },
      featureWeights: [],
      categoryForecasts,
      series: chartSeries,
      explanation: `${completeSeries.length} complete months available. Ridge regression requires at least 6 complete months for chronological train/test validation; using an honest trailing rolling average baseline.`,
    };
  }

  // >= 6 complete months: Genuine Chronological Train/Test Ridge Regression
  // Rows start at index 1 because lag features use i-1
  const totalSamples = completeSeries.length - 1;
  const testCount = Math.min(3, Math.max(2, Math.floor(totalSamples * 0.25)));
  const splitMonthIdx = completeSeries.length - testCount;

  const trainX: number[][] = [];
  const trainY: number[] = [];
  for (let i = 1; i < splitMonthIdx; i++) {
    trainX.push(buildFeatureVector(completeSeries, i, completeSeries[i].monthKey));
    trainY.push(completeSeries[i].totalExpense);
  }

  const evalModel = fitRidgeRegression(trainX, trainY, 6.5);
  if (!evalModel) {
    // Fallback cleanly to baseline if matrix degenerate (e.g. identical zero expenses)
    const baselineNext = Math.round(baselineForIdx(completeSeries.length));
    return {
      modelLabel: 'Baseline Estimate',
      algorithmName: 'Trailing 3-Month Rolling Average (Singular Feature Fallback)',
      targetMonthKey,
      targetMonthLabel,
      predictedTotal: baselineNext,
      baselineTotal: baselineNext,
      expectedBudgetOvershoot:
        budgets.totalMonthlyBudget > 0 ? Math.max(0, baselineNext - budgets.totalMonthlyBudget) : null,
      completeMonthsCount: completeSeries.length,
      metrics: { ml: emptyMetrics, baseline: emptyMetrics },
      featureWeights: [],
      categoryForecasts: buildCategoryForecasts(completeSeries, budgets, false),
      series: [],
      explanation: 'Spending variance was insufficient to invert feature covariance; reverted to rolling average baseline.',
    };
  }

  // Chronological out-of-sample evaluation (zero future leakage)
  const testActuals: number[] = [];
  const mlTestPreds: number[] = [];
  const baseTestPreds: number[] = [];

  for (let i = splitMonthIdx; i < completeSeries.length; i++) {
    const fv = buildFeatureVector(completeSeries, i, completeSeries[i].monthKey);
    testActuals.push(completeSeries[i].totalExpense);
    mlTestPreds.push(predictRidge(evalModel, fv));
    baseTestPreds.push(baselineForIdx(i));
  }

  const mlMetrics = computeMetrics(testActuals, mlTestPreds, trainX.length);
  const baseMetrics = computeMetrics(testActuals, baseTestPreds, trainX.length);

  // Refit final Ridge model on all complete months to predict next target month
  const fullX: number[][] = [];
  const fullY: number[] = [];
  for (let i = 1; i < completeSeries.length; i++) {
    fullX.push(buildFeatureVector(completeSeries, i, completeSeries[i].monthKey));
    fullY.push(completeSeries[i].totalExpense);
  }

  const finalModel = fitRidgeRegression(fullX, fullY, 3.0) ?? evalModel;
  const nextFeatures = buildFeatureVector(completeSeries, completeSeries.length, targetMonthKey);
  const mlNextPred = Math.round(predictRidge(finalModel, nextFeatures));
  const baselineNext = Math.round(baselineForIdx(completeSeries.length));

  const featureWeights: FeatureWeight[] = FEATURE_META.map((meta, j) => ({
    feature: meta.name,
    weight: Number(finalModel.weights[j].toFixed(1)),
    description: meta.description,
  })).sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight));

  const categoryForecasts = buildCategoryForecasts(completeSeries, budgets, true);

  const chartSeries: HistoricalForecastPoint[] = completeSeries.map((m, idx) => {
    if (idx === 0) {
      return {
        monthKey: m.monthKey,
        label: m.label,
        actual: Math.round(m.totalExpense),
        baselinePredicted: null,
        mlPredicted: null,
        split: 'train',
      };
    }
    const fv = buildFeatureVector(completeSeries, idx, m.monthKey);
    const isTest = idx >= splitMonthIdx;
    return {
      monthKey: m.monthKey,
      label: m.label,
      actual: Math.round(m.totalExpense),
      baselinePredicted: Math.round(baselineForIdx(idx)),
      mlPredicted: Math.round(predictRidge(isTest ? evalModel : finalModel, fv)),
      split: isTest ? 'test' : 'train',
    };
  });

  chartSeries.push({
    monthKey: targetMonthKey,
    label: targetMonthLabel,
    actual: null,
    baselinePredicted: baselineNext,
    mlPredicted: mlNextPred,
    split: 'forecast',
  });

  const expectedOvershoot =
    budgets.totalMonthlyBudget > 0 ? Math.max(0, mlNextPred - budgets.totalMonthlyBudget) : null;

  return {
    modelLabel: 'ML Forecast',
    algorithmName: 'Ridge Regression (L2-Regularized OLS with Chronological Split)',
    targetMonthKey,
    targetMonthLabel,
    predictedTotal: mlNextPred,
    baselineTotal: baselineNext,
    expectedBudgetOvershoot: expectedOvershoot,
    completeMonthsCount: completeSeries.length,
    metrics: { ml: mlMetrics, baseline: baseMetrics },
    featureWeights,
    categoryForecasts,
    series: chartSeries,
    explanation: `Trained on ${trainX.length} chronological months and evaluated out-of-sample on the most recent ${testCount} complete months to prevent time-series leakage.`,
  };
}

function buildCategoryForecasts(
  completeSeries: MonthlyAggregate[],
  budgets: BudgetConfig,
  useTrendBlend: boolean
): CategoryForecast[] {
  const n = completeSeries.length;
  const last = completeSeries[n - 1];

  return EXPENSE_CATEGORIES.map((category) => {
    const vals = completeSeries.map((m) => m.byCategory[category]);
    const recent3 = vals.slice(Math.max(0, n - 3));
    const trailing3MoAvg = recent3.reduce((a, b) => a + b, 0) / recent3.length;
    const lastVal = last.byCategory[category];

    let predicted = trailing3MoAvg;
    if (useTrendBlend && n >= 6) {
      // Simple dampened OLS slope per category blended 65% with 3-mo rolling avg
      const xs = vals.map((_, i) => i);
      const xMean = (n - 1) / 2;
      const yMean = vals.reduce((a, b) => a + b, 0) / n;
      let num = 0;
      let den = 0;
      for (let i = 0; i < n; i++) {
        num += (xs[i] - xMean) * (vals[i] - yMean);
        den += (xs[i] - xMean) ** 2;
      }
      const slope = den > 0 ? num / den : 0;
      const linearNext = Math.max(0, yMean + slope * (n - xMean));
      predicted = Math.max(0, 0.55 * trailing3MoAvg + 0.45 * linearNext);
    }

    const predictedRounded = Math.round(predicted);
    const deltaPct = lastVal > 0 ? Number((((predictedRounded - lastVal) / lastVal) * 100).toFixed(1)) : null;
    const budget = budgets.categoryBudgets[category] ?? 0;
    const expectedOvershoot = budget > 0 ? Math.max(0, predictedRounded - budget) : 0;

    return {
      category,
      lastCompleteMonth: Math.round(lastVal),
      trailing3MoAvg: Math.round(trailing3MoAvg),
      predictedAmount: predictedRounded,
      deltaPct,
      budget,
      expectedOvershoot,
    };
  });
}
