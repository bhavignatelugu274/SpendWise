import { buildMonthlySeries } from './forecasting';
import { formatINR, formatPct, getDaysInMonth, getMonthKey } from './formatters';
import {
  AnomalyRecord,
  BudgetConfig,
  BudgetRiskItem,
  BudgetRiskLevel,
  EXPENSE_CATEGORIES,
  ExpenseCategory,
  HealthScoreFactor,
  HealthScoreOutput,
  SimulationAdjustment,
  SimulationOutput,
  SmartInsight,
  Transaction,
} from './types';

function classifyRisk(actual: number, projected: number, budget: number): BudgetRiskLevel {
  if (budget <= 0) return 'Safe';
  if (actual > budget) return 'Budget Exceeded';
  const ratio = Math.max(actual / budget, projected / budget);
  if (ratio >= 1.0) return 'High Risk';
  if (ratio >= 0.78) return 'Approaching Limit';
  return 'Safe';
}

export function getMonthElapsedRatio(
  monthKey: string,
  transactions: Transaction[],
  referenceDateStr = '2026-11-22'
): { elapsedDays: number; totalDays: number; isCurrentInProgress: boolean } {
  const totalDays = getDaysInMonth(monthKey);
  const refMonth = referenceDateStr.slice(0, 7);

  if (monthKey === refMonth) {
    const refDay = Math.min(totalDays, Math.max(1, Number(referenceDateStr.slice(8, 10)) || totalDays));
    return { elapsedDays: refDay, totalDays, isCurrentInProgress: refDay < totalDays };
  }

  // Check if monthKey is strictly after reference month -> 1 day elapsed
  if (monthKey > refMonth) {
    return { elapsedDays: 1, totalDays, isCurrentInProgress: true };
  }

  // Completed historical month
  const maxDayInData = transactions
    .filter((t) => getMonthKey(t.date) === monthKey)
    .reduce((maxD, t) => Math.max(maxD, Number(t.date.slice(8, 10)) || 0), 0);

  if (maxDayInData > 0 && maxDayInData < totalDays - 4 && monthKey === getLatestMonthKey(transactions)) {
    return { elapsedDays: maxDayInData, totalDays, isCurrentInProgress: true };
  }

  return { elapsedDays: totalDays, totalDays, isCurrentInProgress: false };
}

export function getLatestMonthKey(transactions: Transaction[]): string {
  let latest = '';
  for (const tx of transactions) {
    const mk = getMonthKey(tx.date);
    if (mk > latest) latest = mk;
  }
  return latest || '2026-11';
}

export function calculateBudgetRisks(
  transactions: Transaction[],
  monthKey: string,
  budgets: BudgetConfig,
  referenceDateStr = '2026-11-22'
): BudgetRiskItem[] {
  const monthExpenses = transactions.filter(
    (t) => t.type === 'expense' && getMonthKey(t.date) === monthKey
  );
  const { elapsedDays, totalDays, isCurrentInProgress } = getMonthElapsedRatio(
    monthKey,
    transactions,
    referenceDateStr
  );

  const paceFactor = isCurrentInProgress ? totalDays / Math.max(1, elapsedDays) : 1;
  const daysRemaining = Math.max(0, totalDays - elapsedDays);

  const items: BudgetRiskItem[] = [];

  for (const cat of EXPENSE_CATEGORIES) {
    const budget = budgets.categoryBudgets[cat] ?? 0;
    const actual = monthExpenses
      .filter((t) => t.category === cat)
      .reduce((sum, t) => sum + t.amount, 0);

    // Fixed categories like Rent & Subscriptions don't scale linearly by day-of-month
    const isFixedCategory = cat === 'Rent' || cat === 'Subscriptions' || cat === 'Bills';
    const projectedMonthEnd = isFixedCategory ? actual : Math.round(actual * paceFactor);

    const utilizationPct = budget > 0 ? Number(((actual / budget) * 100).toFixed(1)) : 0;
    const projectedUtilizationPct =
      budget > 0 ? Number(((projectedMonthEnd / budget) * 100).toFixed(1)) : 0;
    const riskLevel = classifyRisk(actual, projectedMonthEnd, budget);

    let alertMessage = '';
    let recommendation = '';

    if (budget <= 0) {
      alertMessage = `No monthly budget target set for ${cat}.`;
      recommendation = `Set a category cap in Budget Planner to track ${cat} burn rate.`;
    } else if (riskLevel === 'Budget Exceeded') {
      alertMessage = `${cat} spending (${formatINR(actual)}) has exceeded your ${formatINR(budget)} budget by ${formatINR(actual - budget)}.`;
      recommendation = `Pause discretionary ${cat.toLowerCase()} outlays for the remaining ${daysRemaining} days or rebalance surplus from another category.`;
    } else if (riskLevel === 'High Risk') {
      alertMessage = isCurrentInProgress
        ? `Your current ${cat.toLowerCase()} spending pace (${formatINR(projectedMonthEnd)} projected) suggests you may exceed your ${cat.toLowerCase()} budget before month-end.`
        : `${cat} reached ${formatPct(utilizationPct)} of its ${formatINR(budget)} limit.`;
      recommendation = `Cap daily ${cat.toLowerCase()} spending to ${formatINR(Math.max(0, Math.round((budget - actual) / Math.max(1, daysRemaining))))}/day for the next ${daysRemaining} days.`;
    } else if (riskLevel === 'Approaching Limit') {
      alertMessage = `${cat} is at ${formatPct(utilizationPct)} utilization (${formatINR(budget - actual)} remaining).`;
      recommendation = `Keep ${cat.toLowerCase()} purchases moderate through month-end to stay within target.`;
    } else {
      alertMessage = `${cat} is tracking safely within its ${formatINR(budget)} monthly limit.`;
      recommendation = `Maintain current pace; ${formatINR(Math.max(0, budget - actual))} headroom remains.`;
    }

    items.push({
      category: cat,
      budget,
      actual,
      projectedMonthEnd,
      utilizationPct,
      projectedUtilizationPct,
      riskLevel,
      alertMessage,
      recommendation,
    });
  }

  return items.sort((a, b) => b.projectedUtilizationPct - a.projectedUtilizationPct);
}

export function runSavingsSimulation(
  baseCategoryTotals: Record<ExpenseCategory, number>,
  budgets: BudgetConfig,
  adjustments: SimulationAdjustment[]
): SimulationOutput {
  const adjustmentMap = new Map<ExpenseCategory, number>();
  for (const adj of adjustments) {
    adjustmentMap.set(adj.category, Math.min(80, Math.max(0, adj.reductionPct)));
  }

  let originalMonthlyExpense = 0;
  let adjustedMonthlyExpense = 0;

  const breakdown = EXPENSE_CATEGORIES.map((category) => {
    const originalProjected = Math.round(baseCategoryTotals[category] ?? 0);
    const reductionPct = adjustmentMap.get(category) ?? 0;
    const adjustedProjected = Math.round(originalProjected * (1 - reductionPct / 100));
    const monthlySaved = Math.max(0, originalProjected - adjustedProjected);
    const budget = budgets.categoryBudgets[category] ?? 0;

    originalMonthlyExpense += originalProjected;
    adjustedMonthlyExpense += adjustedProjected;

    return {
      category,
      originalProjected,
      adjustedProjected,
      monthlySaved,
      budget,
      originalRisk: classifyRisk(originalProjected, originalProjected, budget),
      adjustedRisk: classifyRisk(adjustedProjected, adjustedProjected, budget),
    };
  });

  const potentialMonthlySavings = Math.max(0, originalMonthlyExpense - adjustedMonthlyExpense);
  const potentialAnnualSavings = potentialMonthlySavings * 12;
  const savingsGoal = budgets.monthlySavingsGoal;
  const goalCoveragePct =
    savingsGoal > 0 ? Number(((potentialMonthlySavings / savingsGoal) * 100).toFixed(1)) : null;

  return {
    originalMonthlyExpense,
    adjustedMonthlyExpense,
    potentialMonthlySavings,
    potentialAnnualSavings,
    savingsGoal,
    goalCoveragePct,
    breakdown,
  };
}

/**
 * Transparent 5-factor Financial Health Score (0-100).
 * Gracefully handles missing income or missing budgets without fabricating data.
 */
export function calculateFinancialHealthScore(
  transactions: Transaction[],
  monthKey: string,
  budgets: BudgetConfig
): HealthScoreOutput {
  const monthlySeries = buildMonthlySeries(transactions);
  const currentMonth = monthlySeries.find((m) => m.monthKey === monthKey);

  const monthExpense = currentMonth?.totalExpense ?? 0;
  const monthIncome = currentMonth?.totalIncome ?? 0;
  const hasIncomeData = monthIncome > 0;
  const hasBudgetData = budgets.totalMonthlyBudget > 0;

  if (!currentMonth || (monthExpense === 0 && monthIncome === 0)) {
    return {
      totalScore: 0,
      tier: 'High Risk',
      hasIncomeData: false,
      hasBudgetData,
      factors: [
        {
          id: 'empty',
          label: 'Insufficient Monthly Records',
          score: 0,
          maxScore: 100,
          summary: 'No transactions recorded for the selected month.',
          recommendation: 'Add transactions or load Sample Data to compute your Financial Health Score.',
          available: false,
        },
      ],
      methodologyNote: 'Financial health scoring requires expense or income records for the active month.',
    };
  }

  // Factor 1: Spending vs Income Ratio (max 25)
  let spendIncomeScore = 0;
  let spendIncomeSummary = 'No income logged for this month.';
  let spendIncomeRec = 'Log your monthly salary or income to enable income-relative scoring.';
  if (hasIncomeData) {
    const ratio = monthExpense / monthIncome;
    // Ideal <= 0.55 => 25 pts; >= 1.05 => 0 pts
    const normalized = Math.max(0, Math.min(1, (1.05 - ratio) / 0.5));
    spendIncomeScore = Math.round(normalized * 25);
    spendIncomeSummary = `Expenses represent ${formatPct(ratio * 100)} of monthly income (${formatINR(monthExpense)} / ${formatINR(monthIncome)}).`;
    spendIncomeRec =
      ratio > 0.75
        ? 'Aim to keep monthly living expenses below 70% of take-home income.'
        : 'Strong expense-to-income ratio; channel surplus toward savings goals.';
  }

  // Factor 2: Budget Utilization (max 25)
  let budgetScore = 0;
  let budgetSummary = 'No total monthly budget configured.';
  let budgetRec = 'Set a monthly budget in Budget Planner to track utilization.';
  if (hasBudgetData) {
    const util = monthExpense / budgets.totalMonthlyBudget;
    // <= 0.85 => 25 pts, 1.0 => 15 pts, >= 1.25 => 0 pts
    let normalized = 1;
    if (util > 0.85) {
      normalized = Math.max(0, 1 - (util - 0.85) / 0.4);
    }
    budgetScore = Math.round(normalized * 25);
    budgetSummary = `Using ${formatPct(util * 100)} of your ${formatINR(budgets.totalMonthlyBudget)} monthly budget.`;
    budgetRec =
      util > 1
        ? `Monthly spending exceeded your budget by ${formatINR(monthExpense - budgets.totalMonthlyBudget)}.`
        : 'Keep monthly total under 90% of budget to preserve an emergency buffer.';
  }

  // Factor 3: Savings Rate (max 20)
  let savingsScore = 0;
  let savingsSummary = 'Income required to measure savings rate.';
  let savingsRec = 'Record income entries to track net monthly savings rate.';
  if (hasIncomeData) {
    const savingsRate = (monthIncome - monthExpense) / monthIncome;
    // >= 25% savings => 20 pts, <= 0% => 0 pts
    const normalized = Math.max(0, Math.min(1, savingsRate / 0.25));
    savingsScore = Math.round(normalized * 20);
    savingsSummary = `Net savings rate is ${formatPct(savingsRate * 100)} (${formatINR(monthIncome - monthExpense)} retained).`;
    savingsRec =
      savingsRate < 0.2
        ? 'Use the Savings Simulator to identify a 10–15% discretionary trim and lift savings above 20%.'
        : 'Healthy savings rate exceeding 20% benchmark.';
  }

  // Factor 4: Spending Consistency across complete months (max 15)
  const completeExpenses = monthlySeries
    .filter((m) => !m.isPartialMonth && m.totalExpense > 0)
    .map((m) => m.totalExpense);
  let consistencyScore = 10;
  let consistencySummary = 'Single-month baseline; multi-month history improves consistency tracking.';
  let consistencyRec = 'Continue tracking monthly expenses to measure spending volatility.';
  if (completeExpenses.length >= 3) {
    const mean = completeExpenses.reduce((a, b) => a + b, 0) / completeExpenses.length;
    const variance =
      completeExpenses.reduce((acc, v) => acc + (v - mean) ** 2, 0) / completeExpenses.length;
    const cv = mean > 0 ? Math.sqrt(variance) / mean : 0; // Coefficient of variation
    // CV <= 0.08 => 15 pts; CV >= 0.35 => 0 pts
    const normalized = Math.max(0, Math.min(1, (0.35 - cv) / 0.27));
    consistencyScore = Math.round(normalized * 15);
    consistencySummary = `Month-to-month spending volatility (CV) is ${formatPct(cv * 100)} across ${completeExpenses.length} complete months.`;
    consistencyRec =
      cv > 0.2
        ? 'Smooth out irregular shopping spikes using dedicated sinking funds.'
        : 'Consistent, predictable monthly cash outflow pattern.';
  }

  // Factor 5: Category Overspending Control (max 15)
  let catControlScore = 0;
  let catSummary = 'Configure category budgets to evaluate category discipline.';
  let catRec = 'Assign category limits in Budget Planner.';
  const configuredCats = EXPENSE_CATEGORIES.filter((c) => (budgets.categoryBudgets[c] ?? 0) > 0);
  if (configuredCats.length > 0) {
    const overspentCats = configuredCats.filter(
      (c) => currentMonth.byCategory[c] > budgets.categoryBudgets[c]
    );
    const ratioWithin = (configuredCats.length - overspentCats.length) / configuredCats.length;
    catControlScore = Math.round(ratioWithin * 15);
    catSummary =
      overspentCats.length === 0
        ? `All ${configuredCats.length} budgeted categories are currently within limits.`
        : `${overspentCats.length} of ${configuredCats.length} categories exceeded budget (${overspentCats.join(', ')}).`;
    catRec =
      overspentCats.length > 0
        ? `Focus immediate reductions on ${overspentCats[0]} where budget limits were breached.`
        : 'Category allocations are well balanced.';
  }

  const rawFactors: HealthScoreFactor[] = [
    {
      id: 'spend-income',
      label: 'Spending vs. Income Ratio',
      score: spendIncomeScore,
      maxScore: 25,
      summary: spendIncomeSummary,
      recommendation: spendIncomeRec,
      available: hasIncomeData,
    },
    {
      id: 'budget-util',
      label: 'Budget Utilization',
      score: budgetScore,
      maxScore: 25,
      summary: budgetSummary,
      recommendation: budgetRec,
      available: hasBudgetData,
    },
    {
      id: 'savings-rate',
      label: 'Monthly Savings Rate',
      score: savingsScore,
      maxScore: 20,
      summary: savingsSummary,
      recommendation: savingsRec,
      available: hasIncomeData,
    },
    {
      id: 'consistency',
      label: 'Spending Consistency',
      score: consistencyScore,
      maxScore: 15,
      summary: consistencySummary,
      recommendation: consistencyRec,
      available: true,
    },
    {
      id: 'category-control',
      label: 'Category Discipline',
      score: catControlScore,
      maxScore: 15,
      summary: catSummary,
      recommendation: catRec,
      available: configuredCats.length > 0,
    },
  ];

  // Normalize across available weights if income or budgets are missing so users aren't unfairly zeroed
  const availableMax = rawFactors.filter((f) => f.available).reduce((s, f) => s + f.maxScore, 0);
  const availableEarned = rawFactors.filter((f) => f.available).reduce((s, f) => s + f.score, 0);
  const totalScore = availableMax > 0 ? Math.round((availableEarned / availableMax) * 100) : 0;

  let tier: HealthScoreOutput['tier'] = 'High Risk';
  if (totalScore >= 80) tier = 'Excellent';
  else if (totalScore >= 60) tier = 'Good';
  else if (totalScore >= 40) tier = 'Needs Attention';

  const missingNotes: string[] = [];
  if (!hasIncomeData) missingNotes.push('income records missing (income-based weights excluded from denominator)');
  if (!hasBudgetData) missingNotes.push('monthly budget target missing');

  const methodologyNote =
    missingNotes.length === 0
      ? 'Weighted composite across Spending-to-Income (25%), Budget Utilization (25%), Savings Rate (20%), Spending Consistency (15%), and Category Discipline (15%).'
      : `Partial scoring active: ${missingNotes.join('; ')}. Score normalized across remaining active criteria.`;

  return {
    totalScore,
    tier,
    hasIncomeData,
    hasBudgetData,
    factors: rawFactors,
    methodologyNote,
  };
}

function median(sorted: number[]): number {
  const n = sorted.length;
  if (n === 0) return 0;
  const mid = Math.floor(n / 2);
  return n % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  }
  return sorted[base];
}

/**
 * Robust statistical anomaly detection using Modified Z-Score (Median + MAD)
 * and Tukey IQR fence per category (requires >= 4 samples in category).
 */
export function detectAnomalies(transactions: Transaction[]): AnomalyRecord[] {
  const expenses = transactions.filter((t) => t.type === 'expense');
  const byCategory = new Map<ExpenseCategory, Transaction[]>();

  for (const tx of expenses) {
    const cat = EXPENSE_CATEGORIES.includes(tx.category as ExpenseCategory)
      ? (tx.category as ExpenseCategory)
      : 'Other';
    const arr = byCategory.get(cat) ?? [];
    arr.push(tx);
    byCategory.set(cat, arr);
  }

  const anomalies: AnomalyRecord[] = [];

  for (const [category, catTxs] of byCategory.entries()) {
    if (catTxs.length < 4 || category === 'Rent') continue;

    const sortedAmounts = catTxs.map((t) => t.amount).sort((a, b) => a - b);
    const med = median(sortedAmounts);
    const absDevs = sortedAmounts.map((v) => Math.abs(v - med)).sort((a, b) => a - b);
    const mad = median(absDevs);
    const q1 = quantile(sortedAmounts, 0.25);
    const q3 = quantile(sortedAmounts, 0.75);
    const iqr = q3 - q1;
    const iqrFence = q3 + 1.5 * iqr;

    for (const tx of catTxs) {
      const modZ = mad > 0 ? (0.6745 * (tx.amount - med)) / mad : tx.amount > med * 2.5 ? 4.0 : 0;
      if ((modZ >= 3.2 || (iqr > 0 && tx.amount > iqrFence)) && tx.amount > med * 2.0) {
        const multiple = med > 0 ? (tx.amount / med).toFixed(1) : '—';
        anomalies.push({
          transaction: tx,
          categoryMedian: Math.round(med),
          categoryMad: Math.round(mad),
          modifiedZScore: Number(modZ.toFixed(2)),
          iqrUpperFence: Math.round(iqrFence),
          reason: `${multiple}× higher than your typical ${category.toLowerCase()} median of ${formatINR(Math.round(med))}.`,
        });
      }
    }
  }

  return anomalies.sort((a, b) => b.modifiedZScore - a.modifiedZScore);
}

/**
 * Generates personalized, mathematically verifiable insights strictly from the active dataset.
 */
export function generateSmartInsights(
  transactions: Transaction[],
  monthKey: string,
  budgets: BudgetConfig,
  referenceDateStr = '2026-11-22'
): { insights: SmartInsight[]; anomalies: AnomalyRecord[] } {
  const insights: SmartInsight[] = [];
  const anomalies = detectAnomalies(transactions);
  const monthlySeries = buildMonthlySeries(transactions);
  const currentIdx = monthlySeries.findIndex((m) => m.monthKey === monthKey);
  const current = currentIdx >= 0 ? monthlySeries[currentIdx] : undefined;
  const previous = currentIdx > 0 ? monthlySeries[currentIdx - 1] : undefined;

  if (!current || current.totalExpense === 0) {
    return {
      insights: [
        {
          id: 'no-data',
          category: 'Spending Trends',
          severity: 'info',
          title: 'Add transactions to generate spending intelligence',
          description:
            'Once you record expenses or import a CSV statement, SpendWise AI will compute category shares, month-over-month shifts, savings levers, and outlier alerts.',
        },
      ],
      anomalies: [],
    };
  }

  // 1. Top non-rent category share
  const nonRentCats = EXPENSE_CATEGORIES.filter((c) => c !== 'Rent')
    .map((c) => ({ category: c, amount: current.byCategory[c] }))
    .sort((a, b) => b.amount - a.amount);

  if (nonRentCats[0] && nonRentCats[0].amount > 0) {
    const sharePct = (nonRentCats[0].amount / current.totalExpense) * 100;
    insights.push({
      id: 'top-category-share',
      category: 'Spending Trends',
      severity: 'info',
      title: `${nonRentCats[0].category} is your largest flexible spend driver`,
      description: `${nonRentCats[0].category} accounted for ${formatPct(sharePct)} (${formatINR(nonRentCats[0].amount)}) of your expenses in ${current.label}.`,
      metricValue: formatPct(sharePct),
    });
  }

  // 2. Month-over-Month Category Shift (compare against previous month if available)
  if (previous) {
    const biggestIncrease = EXPENSE_CATEGORIES.filter((c) => c !== 'Rent')
      .map((c) => {
        const curVal = current.byCategory[c];
        const prevVal = previous.byCategory[c];
        const pct = prevVal > 0 ? ((curVal - prevVal) / prevVal) * 100 : 0;
        return { category: c, curVal, prevVal, diff: curVal - prevVal, pct };
      })
      .filter((item) => item.prevVal > 500 && item.diff > 400)
      .sort((a, b) => b.diff - a.diff)[0];

    if (biggestIncrease) {
      insights.push({
        id: 'mom-increase',
        category: 'Spending Trends',
        severity: biggestIncrease.pct > 20 ? 'warning' : 'info',
        title: `${biggestIncrease.category} spending climbed vs. ${previous.label}`,
        description: `Your ${biggestIncrease.category.toLowerCase()} spending reached ${formatINR(biggestIncrease.curVal)} compared with ${formatINR(biggestIncrease.prevVal)} in ${previous.label} (+${formatPct(biggestIncrease.pct)}).`,
        metricValue: `+${formatINR(biggestIncrease.diff)}`,
      });
    }
  }

  // 3. Budget Warnings
  const risks = calculateBudgetRisks(transactions, monthKey, budgets, referenceDateStr);
  for (const risk of risks) {
    if (risk.riskLevel === 'High Risk' || risk.riskLevel === 'Budget Exceeded') {
      insights.push({
        id: `budget-warn-${risk.category}`,
        category: 'Budget Warnings',
        severity: risk.riskLevel === 'Budget Exceeded' ? 'danger' : 'warning',
        title: `${risk.category}: ${risk.riskLevel}`,
        description: risk.alertMessage,
        metricValue: formatPct(risk.projectedUtilizationPct),
      });
    }
  }

  // 4. Discretionary 10% Savings Opportunity (strictly computed from dataset)
  const discretionaryTotal =
    current.byCategory.Dining +
    current.byCategory.Shopping +
    current.byCategory.Travel +
    current.byCategory.Subscriptions;
  if (discretionaryTotal > 0) {
    const tenPctSave = Math.round(discretionaryTotal * 0.1);
    insights.push({
      id: 'discretionary-10pct',
      category: 'Savings Opportunities',
      severity: 'positive',
      title: 'Actionable 10% discretionary optimization',
      description: `Reducing Dining, Shopping, Travel, and Subscriptions (${formatINR(discretionaryTotal)} combined) by 10% could free up ${formatINR(tenPctSave)} monthly (${formatINR(tenPctSave * 12)} annually).`,
      metricValue: `${formatINR(tenPctSave)}/mo`,
    });
  }

  // 5. Weekend vs Weekday Spending Pace
  if (current.weekendExpense > 0 && current.totalExpense > current.weekendExpense) {
    const weekendShare = (current.weekendExpense / current.totalExpense) * 100;
    if (weekendShare >= 35) {
      insights.push({
        id: 'weekend-concentration',
        category: 'Savings Opportunities',
        severity: 'info',
        title: 'Weekend transactions concentrate cash outflow',
        description: `Friday–Sunday purchases accounted for ${formatPct(weekendShare)} (${formatINR(current.weekendExpense)}) of your ${current.label} outlays.`,
        metricValue: formatPct(weekendShare),
      });
    }
  }

  // 6. Payment Method Dominance
  const topMethod = (Object.entries(current.byPaymentMethod) as Array<[string, number]>).sort(
    (a, b) => b[1] - a[1]
  )[0];
  if (topMethod && topMethod[1] > 0) {
    const methodShare = (topMethod[1] / current.totalExpense) * 100;
    insights.push({
      id: 'payment-channel',
      category: 'Spending Trends',
      severity: 'info',
      title: `${topMethod[0]} is your primary payment rail`,
      description: `${formatPct(methodShare)} of ${current.label} expenses (${formatINR(topMethod[1])}) flowed through ${topMethod[0]}.`,
      metricValue: formatPct(methodShare),
    });
  }

  // 7. Unusual Transactions from MAD/IQR Anomaly Detection
  for (const anomaly of anomalies.slice(0, 4)) {
    insights.push({
      id: `anomaly-${anomaly.transaction.id}`,
      category: 'Unusual Transactions',
      severity: 'warning',
      title: `Unusual ${anomaly.transaction.category} charge at ${anomaly.transaction.merchant}`,
      description: `${formatINR(anomaly.transaction.amount)} on ${anomaly.transaction.date} is ${anomaly.reason}`,
      metricValue: `${anomaly.modifiedZScore.toFixed(1)}σ`,
    });
  }

  return { insights, anomalies };
}
