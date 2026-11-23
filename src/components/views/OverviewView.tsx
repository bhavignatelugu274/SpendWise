import React, { useMemo } from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  Filter,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AnimatedNumber } from '../AnimatedNumber';
import { ChartTooltip } from '../ChartTooltip';
import {
  calculateBudgetRisks,
  calculateFinancialHealthScore,
  generateSmartInsights,
} from '../../lib/analytics';
import { buildMonthlySeries, generateForecast } from '../../lib/forecasting';
import { formatCompactINR, formatINR, formatMonthLabel, formatPct, formatShortDate, getMonthKey } from '../../lib/formatters';
import {
  BudgetConfig,
  DashboardSection,
  EXPENSE_CATEGORIES,
  ExpenseCategory,
  PAYMENT_METHODS,
  PaymentMethod,
  Transaction,
} from '../../lib/types';

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  Rent: '#6E8BFF',
  Groceries: '#25E0A4',
  Dining: '#E7C68C',
  Travel: '#38BDF8',
  Bills: '#A78BFA',
  Shopping: '#F6B960',
  Health: '#FB7185',
  Subscriptions: '#34D399',
  Other: '#94A3B8',
};

interface OverviewViewProps {
  transactions: Transaction[];
  budgets: BudgetConfig;
  selectedMonth: string;
  onSelectMonth: (month: string) => void;
  selectedCategory: ExpenseCategory | 'All';
  onSelectCategory: (cat: ExpenseCategory | 'All') => void;
  selectedMethod: PaymentMethod | 'All';
  onSelectMethod: (method: PaymentMethod | 'All') => void;
  onNavigate: (section: DashboardSection) => void;
  onOpenAddTransaction: () => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  transactions,
  budgets,
  selectedMonth,
  onSelectMonth,
  selectedCategory,
  onSelectCategory,
  selectedMethod,
  onSelectMethod,
  onNavigate,
  onOpenAddTransaction,
}) => {
  const availableMonths = useMemo(() => {
    const keys = Array.from(new Set(transactions.map((t) => getMonthKey(t.date)))).sort().reverse();
    return keys.length > 0 ? keys : ['2026-11'];
  }, [transactions]);

  const filteredMonthTxs = useMemo(() => {
    return transactions.filter((t) => {
      if (getMonthKey(t.date) !== selectedMonth) return false;
      if (selectedCategory !== 'All' && t.category !== selectedCategory) return false;
      if (selectedMethod !== 'All' && t.paymentMethod !== selectedMethod) return false;
      return true;
    });
  }, [transactions, selectedMonth, selectedCategory, selectedMethod]);

  const monthlySeries = useMemo(() => buildMonthlySeries(transactions), [transactions]);
  const forecast = useMemo(() => generateForecast(transactions, budgets), [transactions, budgets]);
  const health = useMemo(
    () => calculateFinancialHealthScore(transactions, selectedMonth, budgets),
    [transactions, selectedMonth, budgets]
  );
  const budgetRisks = useMemo(
    () => calculateBudgetRisks(transactions, selectedMonth, budgets),
    [transactions, selectedMonth, budgets]
  );
  const { insights } = useMemo(
    () => generateSmartInsights(transactions, selectedMonth, budgets),
    [transactions, selectedMonth, budgets]
  );

  const monthExpenses = filteredMonthTxs.filter((t) => t.type === 'expense');
  const monthIncome = filteredMonthTxs
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalMonthlyExpenses = monthExpenses.reduce((sum, t) => sum + t.amount, 0);
  const activeBudgetCap =
    selectedCategory === 'All'
      ? budgets.totalMonthlyBudget
      : budgets.categoryBudgets[selectedCategory] ?? 0;
  const budgetRemaining = activeBudgetCap > 0 ? activeBudgetCap - totalMonthlyExpenses : 0;

  // Expected monthly savings: Income - Expenses (if income exists) or Budget - Expenses
  const totalMonthRow = monthlySeries.find((m) => m.monthKey === selectedMonth);
  const fullMonthIncome = totalMonthRow?.totalIncome ?? 0;
  const fullMonthExpense = totalMonthRow?.totalExpense ?? 0;
  const expectedSavings =
    fullMonthIncome > 0
      ? fullMonthIncome - fullMonthExpense
      : budgets.totalMonthlyBudget > 0
        ? budgets.totalMonthlyBudget - fullMonthExpense
        : 0;

  // Category breakdown from filtered expenses
  const categoryBreakdown = useMemo(() => {
    const map = new Map<ExpenseCategory, number>();
    for (const c of EXPENSE_CATEGORIES) map.set(c, 0);
    for (const tx of monthExpenses) {
      const cat = EXPENSE_CATEGORIES.includes(tx.category as ExpenseCategory)
        ? (tx.category as ExpenseCategory)
        : 'Other';
      map.set(cat, (map.get(cat) ?? 0) + tx.amount);
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({
        name,
        value: Math.round(value),
        color: CATEGORY_COLORS[name],
      }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [monthExpenses]);

  const budgetUtilizationPct =
    activeBudgetCap > 0 ? Math.min(100, (totalMonthlyExpenses / activeBudgetCap) * 100) : 0;

  const recentTransactions = filteredMonthTxs.slice(0, 6);

  if (transactions.length === 0) {
    return (
      <div className="rounded-2xl bg-[#151F30] border border-white/8 p-10 text-center max-w-2xl mx-auto my-8">
        <h2 className="font-display text-2xl font-bold text-[#F6F8FC]">
          Your ledger is ready for transactions
        </h2>
        <p className="mt-2.5 text-sm text-[#94A3B8] leading-relaxed">
          Add your first expense manually, import a CSV bank statement, or click Explore Demo in the top bar to load a 14-month Indian personal finance dataset.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={onOpenAddTransaction}
            className="px-5 py-2.5 rounded-xl bg-[#25E0A4] text-[#070B14] text-sm font-semibold hover:bg-[#38ecc0] transition-colors cursor-pointer"
          >
            Add First Transaction
          </button>
          <button
            type="button"
            onClick={() => onNavigate('transactions')}
            className="px-5 py-2.5 rounded-xl border border-white/12 bg-[#101827] text-sm font-medium text-[#F6F8FC] hover:bg-white/5 transition-colors cursor-pointer"
          >
            Import CSV File
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <section
        aria-label="Dashboard Filters"
        className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-[#101827] border border-white/8 p-4"
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-medium text-[#94A3B8]">
            <Filter className="w-3.5 h-3.5 text-[#25E0A4]" aria-hidden="true" />
            <span>Active Slice</span>
          </div>

          <label className="inline-flex items-center gap-2 text-xs text-[#94A3B8]">
            <span className="sr-only">Select Month</span>
            <Calendar className="w-3.5 h-3.5 text-[#94A3B8]" aria-hidden="true" />
            <select
              aria-label="Filter by month"
              value={selectedMonth}
              onChange={(e) => onSelectMonth(e.target.value)}
              className="rounded-lg bg-[#151F30] border border-white/10 px-3 py-1.5 text-xs font-medium text-[#F6F8FC] focus:border-[#25E0A4]"
            >
              {availableMonths.map((mk) => (
                <option key={mk} value={mk}>
                  {formatMonthLabel(mk)}
                </option>
              ))}
            </select>
          </label>

          <select
            aria-label="Filter by category"
            value={selectedCategory}
            onChange={(e) => onSelectCategory(e.target.value as ExpenseCategory | 'All')}
            className="rounded-lg bg-[#151F30] border border-white/10 px-3 py-1.5 text-xs font-medium text-[#F6F8FC] focus:border-[#25E0A4]"
          >
            <option value="All">All Categories</option>
            {EXPENSE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by payment method"
            value={selectedMethod}
            onChange={(e) => onSelectMethod(e.target.value as PaymentMethod | 'All')}
            className="rounded-lg bg-[#151F30] border border-white/10 px-3 py-1.5 text-xs font-medium text-[#F6F8FC] focus:border-[#25E0A4]"
          >
            <option value="All">All Payment Rails</option>
            {PAYMENT_METHODS.map((pm) => (
              <option key={pm} value={pm}>
                {pm}
              </option>
            ))}
          </select>
        </div>

        {(selectedCategory !== 'All' || selectedMethod !== 'All') && (
          <button
            type="button"
            onClick={() => {
              onSelectCategory('All');
              onSelectMethod('All');
            }}
            className="text-xs font-medium text-[#25E0A4] hover:underline cursor-pointer"
          >
            Reset Filters
          </button>
        )}
      </section>

      {/* 4 Prominent KPI Cards */}
      <section aria-label="Key Financial Metrics" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-[#151F30] border border-white/8 p-5">
          <p className="text-xs font-medium text-[#94A3B8]">Total Monthly Expenses</p>
          <p className="mt-2 text-2xl sm:text-3xl font-bold text-[#F6F8FC]">
            <AnimatedNumber value={totalMonthlyExpenses} formatter={(n) => formatINR(Math.round(n))} />
          </p>
          <p className="mt-2 text-xs text-[#94A3B8]">
            {monthExpenses.length} expense transactions · {formatMonthLabel(selectedMonth)}
          </p>
        </div>

        <div className="rounded-2xl bg-[#151F30] border border-white/8 p-5">
          <p className="text-xs font-medium text-[#94A3B8]">Monthly Budget Remaining</p>
          <p
            className={`mt-2 text-2xl sm:text-3xl font-bold ${
              activeBudgetCap <= 0
                ? 'text-[#94A3B8]'
                : budgetRemaining >= 0
                  ? 'text-[#25E0A4]'
                  : 'text-[#FF687B]'
            }`}
          >
            {activeBudgetCap > 0 ? (
              <AnimatedNumber value={budgetRemaining} formatter={(n) => formatINR(Math.round(n))} />
            ) : (
              <span className="font-mono text-xl">Not Configured</span>
            )}
          </p>
          <p className="mt-2 text-xs text-[#94A3B8]">
            {activeBudgetCap > 0
              ? `${formatPct((totalMonthlyExpenses / activeBudgetCap) * 100)} of ${formatINR(activeBudgetCap)} limit`
              : 'Configure target in Budget Planner'}
          </p>
        </div>

        <div className="rounded-2xl bg-[#151F30] border border-white/8 p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-[#94A3B8]">Predicted Next-Month</p>
            <span className="text-[11px] font-medium text-[#6E8BFF] whitespace-nowrap shrink-0">
              {forecast.modelLabel}
            </span>
          </div>
          <p className="mt-2 text-2xl sm:text-3xl font-bold text-[#F6F8FC]">
            {forecast.predictedTotal !== null ? (
              <AnimatedNumber
                value={forecast.predictedTotal}
                formatter={(n) => formatINR(Math.round(n))}
              />
            ) : (
              <span className="font-mono text-xl text-[#94A3B8]">Insufficient Data</span>
            )}
          </p>
          <p className="mt-2 text-xs text-[#94A3B8]">
            Target: {forecast.targetMonthLabel} ·{' '}
            {forecast.expectedBudgetOvershoot !== null && forecast.expectedBudgetOvershoot > 0 ? (
              <span className="text-[#F6B960]">+{formatINR(forecast.expectedBudgetOvershoot)} over budget</span>
            ) : (
              <span>Within budget trajectory</span>
            )}
          </p>
        </div>

        <div className="rounded-2xl bg-[#151F30] border border-white/8 p-5">
          <p className="text-xs font-medium text-[#94A3B8]">Expected Monthly Savings</p>
          <p
            className={`mt-2 text-2xl sm:text-3xl font-bold ${
              expectedSavings >= 0 ? 'text-[#E7C68C]' : 'text-[#FF687B]'
            }`}
          >
            {fullMonthIncome > 0 || budgets.totalMonthlyBudget > 0 ? (
              <AnimatedNumber value={expectedSavings} formatter={(n) => formatINR(Math.round(n))} />
            ) : (
              <span className="font-mono text-xl text-[#94A3B8]">—</span>
            )}
          </p>
          <p className="mt-2 text-xs text-[#94A3B8]">
            {fullMonthIncome > 0
              ? `From ${formatINR(fullMonthIncome)} logged income`
              : monthIncome > 0
                ? `${formatINR(monthIncome)} income logged`
                : 'Estimated against monthly budget'}
          </p>
        </div>
      </section>

      {/* Main Analytics Row: Expenditure Breakdown + Financial Health Ring + Forecast Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Expenditure Breakdown */}
        <section className="lg:col-span-5 rounded-2xl bg-[#151F30] border border-white/8 p-5 sm:p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-lg font-semibold text-[#F6F8FC]">
                Expenditure Breakdown
              </h2>
              <p className="text-xs text-[#94A3B8]">
                {formatMonthLabel(selectedMonth)} category share
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('analytics')}
              className="text-xs font-medium text-[#25E0A4] hover:underline cursor-pointer"
            >
              View 10 Charts
            </button>
          </div>

          {categoryBreakdown.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-12 text-xs text-[#94A3B8]">
              No expenses match current filters for {formatMonthLabel(selectedMonth)}.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center flex-1">
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryBreakdown}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={52}
                      outerRadius={78}
                      paddingAngle={2}
                      stroke="none"
                      isAnimationActive={false}
                    >
                      {categoryBreakdown.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {categoryBreakdown.slice(0, 6).map((item) => {
                  const pct =
                    totalMonthlyExpenses > 0 ? (item.value / totalMonthlyExpenses) * 100 : 0;
                  return (
                    <div key={item.name} className="flex items-center justify-between text-xs gap-2">
                      <span className="flex items-center gap-2 text-[#F6F8FC] truncate">
                        <span
                          className="w-2.5 h-2.5 rounded-xs shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        {item.name}
                      </span>
                      <span className="font-mono tabular-nums text-[#94A3B8] shrink-0">
                        {formatCompactINR(item.value)} · {pct.toFixed(0)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* Budget Utilization & Upcoming Forecast Preview */}
        <section className="lg:col-span-4 rounded-2xl bg-[#151F30] border border-white/8 p-5 sm:p-6 flex flex-col justify-between gap-5">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-lg font-semibold text-[#F6F8FC]">
                Budget Utilization
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('budgets')}
                className="text-xs font-medium text-[#25E0A4] hover:underline cursor-pointer"
              >
                Adjust Limits
              </button>
            </div>

            {activeBudgetCap > 0 ? (
              <div>
                <div className="flex items-baseline justify-between text-xs mb-2">
                  <span className="text-[#94A3B8]">
                    {formatINR(totalMonthlyExpenses)} spent
                  </span>
                  <span className="font-mono tabular-nums text-[#F6F8FC]">
                    {formatPct((totalMonthlyExpenses / activeBudgetCap) * 100)} of {formatINR(activeBudgetCap)}
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-[#070B14] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      totalMonthlyExpenses > activeBudgetCap
                        ? 'bg-[#FF687B]'
                        : budgetUtilizationPct > 80
                          ? 'bg-[#F6B960]'
                          : 'bg-[#25E0A4]'
                    }`}
                    style={{ width: `${budgetUtilizationPct}%` }}
                  />
                </div>
              </div>
            ) : (
              <p className="text-xs text-[#94A3B8]">No budget configured yet.</p>
            )}

            <div className="mt-4 space-y-2.5">
              {budgetRisks.slice(0, 3).map((risk) => (
                <div
                  key={risk.category}
                  className="flex items-center justify-between text-xs py-1.5 border-b border-white/6 last:border-0"
                >
                  <span className="text-[#F6F8FC] font-medium">{risk.category}</span>
                  <div className="flex items-center gap-2 font-mono tabular-nums">
                    <span className="text-[#94A3B8]">{formatINR(risk.actual)}</span>
                    <span
                      className={
                        risk.riskLevel === 'Budget Exceeded'
                          ? 'text-[#FF687B]'
                          : risk.riskLevel === 'High Risk'
                            ? 'text-[#F6B960]'
                            : risk.riskLevel === 'Approaching Limit'
                              ? 'text-[#E7C68C]'
                              : 'text-[#25E0A4]'
                      }
                    >
                      {risk.riskLevel}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-white/8">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-[#94A3B8] flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-[#6E8BFF]" aria-hidden="true" />
                Forecast Preview ({forecast.targetMonthLabel})
              </span>
              <button
                type="button"
                onClick={() => onNavigate('forecast')}
                className="text-[#6E8BFF] hover:underline font-medium cursor-pointer"
              >
                Model Metrics
              </button>
            </div>
            <div className="h-20">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={forecast.series.slice(-5)}>
                  <XAxis dataKey="label" tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="actual" name="Actual" fill="#25E0A4" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="mlPredicted" name="ML Forecast" fill="#6E8BFF" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* Financial Health Score Ring */}
        <section className="lg:col-span-3 rounded-2xl bg-[#151F30] border border-white/8 p-5 sm:p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-[#F6F8FC]">Health Score</h2>
            <button
              type="button"
              onClick={() => onNavigate('health')}
              className="text-xs font-medium text-[#25E0A4] hover:underline cursor-pointer"
            >
              Breakdown
            </button>
          </div>

          <div className="flex flex-col items-center justify-center my-4">
            <div className="relative w-36 h-36 flex items-center justify-center">
              <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90" aria-hidden="true">
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  fill="none"
                  stroke="#070B14"
                  strokeWidth="10"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  fill="none"
                  stroke={
                    health.totalScore >= 80
                      ? '#25E0A4'
                      : health.totalScore >= 60
                        ? '#6E8BFF'
                        : health.totalScore >= 40
                          ? '#F6B960'
                          : '#FF687B'
                  }
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={`${(health.totalScore / 100) * 314.16} 314.16`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-mono tabular-nums text-3xl font-bold text-[#F6F8FC]">
                  {health.totalScore}
                </span>
                <span className="text-xs font-medium text-[#94A3B8]">{health.tier}</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-[#94A3B8] leading-relaxed text-center">
            {health.hasIncomeData
              ? 'Weighted across spending ratio, budget utilization, savings rate & consistency.'
              : 'Scored using budget utilization & spending consistency (no income logged).'}
          </p>
        </section>
      </div>

      {/* Bottom Row: Recent Transactions & Personalized Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Transactions */}
        <section className="lg:col-span-7 rounded-2xl bg-[#151F30] border border-white/8 p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-lg font-semibold text-[#F6F8FC]">
                Recent Transactions
              </h2>
              <p className="text-xs text-[#94A3B8]">
                Latest entries in {formatMonthLabel(selectedMonth)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('transactions')}
              className="text-xs font-medium text-[#25E0A4] hover:underline cursor-pointer"
            >
              Manage All
            </button>
          </div>

          {recentTransactions.length === 0 ? (
            <p className="text-xs text-[#94A3B8] py-8 text-center">
              No transactions match this filter selection.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/8 text-[#94A3B8]">
                    <th className="pb-2.5 font-medium">Date</th>
                    <th className="pb-2.5 font-medium">Merchant</th>
                    <th className="pb-2.5 font-medium">Category</th>
                    <th className="pb-2.5 font-medium">Rail</th>
                    <th className="pb-2.5 font-medium text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/6">
                  {recentTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-white/[0.02]">
                      <td className="py-2.5 font-mono tabular-nums text-[#94A3B8] whitespace-nowrap">
                        {formatShortDate(tx.date)}
                      </td>
                      <td className="py-2.5 font-medium text-[#F6F8FC]">{tx.merchant}</td>
                      <td className="py-2.5 text-[#94A3B8]">{tx.category}</td>
                      <td className="py-2.5 text-[#94A3B8]">{tx.paymentMethod}</td>
                      <td
                        className={`py-2.5 text-right font-mono tabular-nums font-medium whitespace-nowrap ${
                          tx.type === 'income' ? 'text-[#25E0A4]' : 'text-[#F6F8FC]'
                        }`}
                      >
                        <span className="inline-flex items-center gap-1">
                          {tx.type === 'income' ? (
                            <ArrowDownRight className="w-3 h-3 text-[#25E0A4]" aria-hidden="true" />
                          ) : (
                            <ArrowUpRight className="w-3 h-3 text-[#94A3B8]" aria-hidden="true" />
                          )}
                          {tx.type === 'income' ? '+' : '-'}
                          {formatINR(tx.amount)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Personalized Insights Panel */}
        <section className="lg:col-span-5 rounded-2xl bg-[#151F30] border border-white/8 p-5 sm:p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-lg font-semibold text-[#F6F8FC]">
                Personalized Insights
              </h2>
              <p className="text-xs text-[#94A3B8]">Derived directly from active dataset</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('insights')}
              className="text-xs font-medium text-[#25E0A4] hover:underline cursor-pointer"
            >
              All Insights
            </button>
          </div>

          <div className="space-y-3 flex-1">
            {insights.slice(0, 4).map((ins) => (
              <div
                key={ins.id}
                className="rounded-xl bg-[#101827] border border-white/8 p-3.5 flex items-start gap-3"
              >
                {ins.severity === 'warning' || ins.severity === 'danger' ? (
                  <AlertTriangle
                    className={`w-4 h-4 mt-0.5 shrink-0 ${
                      ins.severity === 'danger' ? 'text-[#FF687B]' : 'text-[#F6B960]'
                    }`}
                    aria-hidden="true"
                  />
                ) : (
                  <Sparkles className="w-4 h-4 mt-0.5 shrink-0 text-[#25E0A4]" aria-hidden="true" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-xs font-semibold text-[#F6F8FC]">{ins.title}</p>
                    {ins.metricValue && (
                      <span className="font-mono tabular-nums text-xs text-[#E7C68C] shrink-0">
                        {ins.metricValue}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-[#94A3B8] leading-relaxed">{ins.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
