export const EXPENSE_CATEGORIES = [
  'Rent',
  'Groceries',
  'Dining',
  'Travel',
  'Bills',
  'Shopping',
  'Health',
  'Subscriptions',
  'Other',
] as const;

export const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Dividend', 'Other Income'] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
export type IncomeCategory = (typeof INCOME_CATEGORIES)[number];
export type Category = ExpenseCategory | IncomeCategory;

export const PAYMENT_METHODS = ['UPI', 'Debit Card', 'Credit Card', 'Cash'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export type TransactionType = 'expense' | 'income';

export type CategorySource = 'ml_predicted' | 'rule_matched' | 'manual';

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  merchant: string;
  amount: number;
  category: Category;
  paymentMethod: PaymentMethod;
  type: TransactionType;
  categorySource: CategorySource;
  predictionConfidence?: number; // 0..1 when ml_predicted
  isSample?: boolean;
}

export interface BudgetConfig {
  totalMonthlyBudget: number;
  monthlySavingsGoal: number;
  categoryBudgets: Record<ExpenseCategory, number>;
}

export interface MonthlyAggregate {
  monthKey: string; // YYYY-MM
  label: string; // e.g., "Oct 2025"
  totalExpense: number;
  totalIncome: number;
  netSavings: number;
  transactionCount: number;
  weekendExpense: number;
  recurringExpense: number;
  byCategory: Record<ExpenseCategory, number>;
  byPaymentMethod: Record<PaymentMethod, number>;
  isPartialMonth: boolean;
}

export type ForecastModelLabel = 'ML Forecast' | 'Baseline Estimate' | 'Insufficient Data';

export interface ModelMetrics {
  mae: number | null;
  rmse: number | null;
  mape: number | null;
  r2: number | null;
  testSampleSize: number;
  trainSampleSize: number;
}

export interface FeatureWeight {
  feature: string;
  weight: number;
  description: string;
}

export interface CategoryForecast {
  category: ExpenseCategory;
  lastCompleteMonth: number;
  trailing3MoAvg: number;
  predictedAmount: number | null;
  deltaPct: number | null;
  budget: number;
  expectedOvershoot: number;
}

export interface HistoricalForecastPoint {
  monthKey: string;
  label: string;
  actual: number | null;
  baselinePredicted: number | null;
  mlPredicted: number | null;
  split: 'train' | 'test' | 'forecast';
}

export interface ForecastOutput {
  modelLabel: ForecastModelLabel;
  algorithmName: string;
  targetMonthKey: string;
  targetMonthLabel: string;
  predictedTotal: number | null;
  baselineTotal: number | null;
  expectedBudgetOvershoot: number | null;
  completeMonthsCount: number;
  metrics: {
    ml: ModelMetrics;
    baseline: ModelMetrics;
  };
  featureWeights: FeatureWeight[];
  categoryForecasts: CategoryForecast[];
  series: HistoricalForecastPoint[];
  explanation: string;
}

export type BudgetRiskLevel = 'Safe' | 'Approaching Limit' | 'High Risk' | 'Budget Exceeded';

export interface BudgetRiskItem {
  category: ExpenseCategory | 'Total';
  budget: number;
  actual: number;
  projectedMonthEnd: number;
  utilizationPct: number;
  projectedUtilizationPct: number;
  riskLevel: BudgetRiskLevel;
  alertMessage: string;
  recommendation: string;
}

export type DiscretionaryCategory =
  | 'Dining'
  | 'Shopping'
  | 'Travel'
  | 'Subscriptions'
  | 'Health'
  | 'Other';

export interface SimulationAdjustment {
  category: ExpenseCategory;
  reductionPct: number; // 0..60
}

export interface SimulationCategoryBreakdown {
  category: ExpenseCategory;
  originalProjected: number;
  adjustedProjected: number;
  monthlySaved: number;
  budget: number;
  originalRisk: BudgetRiskLevel;
  adjustedRisk: BudgetRiskLevel;
}

export interface SimulationOutput {
  originalMonthlyExpense: number;
  adjustedMonthlyExpense: number;
  potentialMonthlySavings: number;
  potentialAnnualSavings: number;
  savingsGoal: number;
  goalCoveragePct: number | null;
  breakdown: SimulationCategoryBreakdown[];
}

export interface HealthScoreFactor {
  id: string;
  label: string;
  score: number;
  maxScore: number;
  summary: string;
  recommendation: string;
  available: boolean;
}

export interface HealthScoreOutput {
  totalScore: number; // 0..100
  tier: 'Excellent' | 'Good' | 'Needs Attention' | 'High Risk';
  hasIncomeData: boolean;
  hasBudgetData: boolean;
  factors: HealthScoreFactor[];
  methodologyNote: string;
}

export type InsightCategory =
  | 'Spending Trends'
  | 'Savings Opportunities'
  | 'Budget Warnings'
  | 'Unusual Transactions';

export interface SmartInsight {
  id: string;
  category: InsightCategory;
  severity: 'info' | 'warning' | 'danger' | 'positive';
  title: string;
  description: string;
  metricValue?: string;
}

export interface AnomalyRecord {
  transaction: Transaction;
  categoryMedian: number;
  categoryMad: number;
  modifiedZScore: number;
  iqrUpperFence: number;
  reason: string;
}

export type DatasetMode = 'sample' | 'user' | 'empty';

export type DashboardSection =
  | 'overview'
  | 'transactions'
  | 'analytics'
  | 'forecast'
  | 'budgets'
  | 'simulator'
  | 'health'
  | 'insights'
  | 'settings'
  | 'methodology';

export type AppScreen = 'landing' | 'dashboard' | 'methodology';
