import test from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateBudgetRisks,
  calculateFinancialHealthScore,
  detectAnomalies,
  generateSmartInsights,
  runSavingsSimulation,
} from '../analytics';
import { ExpenseCategorizer } from '../categorizer';
import { exportTransactionsToCsv, parseTransactionsCsv } from '../csv';
import { DEFAULT_DEMO_BUDGETS, generateDemoTransactions } from '../demoData';
import { buildMonthlySeries, generateForecast } from '../forecasting';
import { Transaction } from '../types';

test('demo dataset generates deterministic 14-month Indian personal finance records', () => {
  const txA = generateDemoTransactions();
  const txB = generateDemoTransactions();

  assert.equal(txA.length, txB.length);
  assert.ok(txA.length > 400, 'Expected >= 400 demo transactions across 14 months');
  assert.equal(txA[0].id, txB[0].id);

  const series = buildMonthlySeries(txA);
  assert.equal(series.length, 14);
  assert.equal(series[0].monthKey, '2025-10');
  assert.equal(series[series.length - 1].monthKey, '2026-11');
  assert.equal(series[series.length - 1].isPartialMonth, true);
});

test('Naive Bayes categorizer predicts core merchants and adapts to manual feedback', () => {
  const categorizer = new ExpenseCategorizer();

  const swiggy = categorizer.predict('Swiggy', 'Dinner order', 'expense');
  assert.equal(swiggy.category, 'Dining');
  assert.equal(swiggy.source, 'ml_predicted');
  assert.ok(swiggy.confidence > 0.5);

  const uber = categorizer.predict('Uber', 'Airport cab ride', 'expense');
  assert.equal(uber.category, 'Travel');

  const netflix = categorizer.predict('Netflix', 'Monthly plan', 'expense');
  assert.equal(netflix.category, 'Subscriptions');

  // Test rule fallback on completely unseen phrase with rule keyword
  const unknownRule = categorizer.predict('Local Vendor', 'Hostel rent transfer', 'expense');
  assert.equal(unknownRule.category, 'Rent');

  // Retrain with user correction
  const feedbackTx: Transaction[] = [
    {
      id: 'fb-1',
      date: '2026-11-10',
      merchant: 'Kumbhakonam Degree Coffee',
      description: 'Filter coffee breakfast',
      amount: 180,
      category: 'Dining',
      paymentMethod: 'UPI',
      type: 'expense',
      categorySource: 'manual',
    },
  ];
  categorizer.fit(feedbackTx);
  const adapted = categorizer.predict('Kumbhakonam Degree Coffee', 'Morning coffee', 'expense');
  assert.equal(adapted.category, 'Dining');
  assert.equal(adapted.source, 'ml_predicted');
});

test('chronological forecasting enforces honest model labels across data regimes', () => {
  // 1. Insufficient data (<2 complete months)
  const singleMonth: Transaction[] = [
    {
      id: 's1',
      date: '2026-10-12',
      merchant: 'BigBasket',
      description: 'Groceries',
      amount: 2000,
      category: 'Groceries',
      paymentMethod: 'UPI',
      type: 'expense',
      categorySource: 'manual',
    },
  ];
  const insufficient = generateForecast(singleMonth, DEFAULT_DEMO_BUDGETS);
  assert.equal(insufficient.modelLabel, 'Insufficient Data');
  assert.equal(insufficient.predictedTotal, null);

  // 2. Baseline estimate (3 complete months)
  const threeMonths: Transaction[] = ['2026-08-29', '2026-09-29', '2026-10-29'].map((date, idx) => ({
    id: `m-${idx}`,
    date,
    merchant: 'BigBasket',
    description: 'Monthly stock',
    amount: 30000 + idx * 1000,
    category: 'Groceries',
    paymentMethod: 'UPI',
    type: 'expense',
    categorySource: 'manual',
  }));
  const baseline = generateForecast(threeMonths, DEFAULT_DEMO_BUDGETS);
  assert.equal(baseline.modelLabel, 'Baseline Estimate');
  assert.equal(baseline.predictedTotal, 31000);

  // 3. Full ML Ridge Regression on 14-month demo dataset
  const demoTxs = generateDemoTransactions();
  const mlForecast = generateForecast(demoTxs, DEFAULT_DEMO_BUDGETS);
  assert.equal(mlForecast.modelLabel, 'ML Forecast');
  assert.ok(mlForecast.predictedTotal !== null && mlForecast.predictedTotal > 40000);
  assert.ok(mlForecast.metrics.ml.mae !== null && mlForecast.metrics.ml.mae >= 0);
  assert.ok(mlForecast.metrics.ml.rmse !== null && mlForecast.metrics.ml.rmse >= 0);
  assert.ok(mlForecast.metrics.ml.testSampleSize >= 2);
});

test('CSV parser validates headers, detects duplicates, and round-trips exports', () => {
  const categorizer = new ExpenseCategorizer();
  const existing = generateDemoTransactions().slice(0, 5);

  const badCsv = 'Foo,Bar\n1,2';
  const badRes = parseTransactionsCsv(badCsv, existing, categorizer);
  assert.equal(badRes.imported.length, 0);
  assert.ok(badRes.errors[0].includes('Invalid CSV header'));

  const validCsv = [
    'Date,Merchant,Description,Amount,Category,Payment Method,Type',
    '2026-11-20,Swiggy,Lunch combo,450,,UPI,expense',
    '2026-11-20,Swiggy,Lunch combo,450,,UPI,expense', // duplicate inside file
    '2026-11-21,InvalidAmt,Bad row,-50,Other,Cash,expense',
  ].join('\n');

  const res = parseTransactionsCsv(validCsv, existing, categorizer);
  assert.equal(res.imported.length, 1);
  assert.equal(res.imported[0].category, 'Dining');
  assert.equal(res.duplicateCount, 1);
  assert.equal(res.errors.length, 1);

  const exported = exportTransactionsToCsv(res.imported);
  assert.ok(exported.includes('Swiggy'));
  assert.ok(exported.includes('450'));
});

test('budget risk, savings simulator, financial health score, and anomaly detection compute accurately', () => {
  const demoTxs = generateDemoTransactions();
  const risks = calculateBudgetRisks(demoTxs, '2026-11', DEFAULT_DEMO_BUDGETS, '2026-11-22');
  assert.equal(risks.length, 9);
  const diningRisk = risks.find((r) => r.category === 'Dining');
  assert.ok(diningRisk);
  assert.ok(diningRisk.projectedMonthEnd >= diningRisk.actual);

  const sim = runSavingsSimulation(
    {
      Rent: 22500,
      Groceries: 8000,
      Dining: 8000,
      Travel: 4000,
      Bills: 4000,
      Shopping: 6000,
      Health: 1500,
      Subscriptions: 1800,
      Other: 1200,
    },
    DEFAULT_DEMO_BUDGETS,
    [
      { category: 'Dining', reductionPct: 25 },
      { category: 'Shopping', reductionPct: 20 },
    ]
  );
  assert.equal(sim.potentialMonthlySavings, 3200);
  assert.equal(sim.potentialAnnualSavings, 38400);

  const health = calculateFinancialHealthScore(demoTxs, '2026-11', DEFAULT_DEMO_BUDGETS);
  assert.ok(health.totalScore >= 0 && health.totalScore <= 100);
  assert.equal(health.hasIncomeData, true);

  // Missing income gracefully handled without crashing or returning NaN
  const expenseOnly = demoTxs.filter((t) => t.type === 'expense');
  const healthNoIncome = calculateFinancialHealthScore(expenseOnly, '2026-11', DEFAULT_DEMO_BUDGETS);
  assert.equal(healthNoIncome.hasIncomeData, false);
  assert.ok(healthNoIncome.totalScore > 0);

  const anomalies = detectAnomalies(demoTxs);
  assert.ok(anomalies.some((a) => a.transaction.merchant === 'Aptronix Service'));

  const insights = generateSmartInsights(demoTxs, '2026-11', DEFAULT_DEMO_BUDGETS);
  assert.ok(insights.insights.length >= 4);
});
