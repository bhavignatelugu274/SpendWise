import React, { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartTooltip } from '../ChartTooltip';
import { buildMonthlySeries, generateForecast } from '../../lib/forecasting';
import { formatCompactINR, formatINR, formatMonthLabel, getMonthKey } from '../../lib/formatters';
import {
  BudgetConfig,
  EXPENSE_CATEGORIES,
  ExpenseCategory,
  PAYMENT_METHODS,
  PaymentMethod,
  Transaction,
} from '../../lib/types';

const PALETTE = [
  '#25E0A4',
  '#6E8BFF',
  '#E7C68C',
  '#38BDF8',
  '#A78BFA',
  '#F6B960',
  '#FB7185',
  '#34D399',
  '#94A3B8',
];

interface AnalyticsViewProps {
  transactions: Transaction[];
  budgets: BudgetConfig;
  selectedMonth: string;
  onSelectMonth: (month: string) => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  transactions,
  budgets,
  selectedMonth,
  onSelectMonth,
}) => {
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | 'All'>('All');
  const [methodFilter, setMethodFilter] = useState<PaymentMethod | 'All'>('All');

  const availableMonths = useMemo(
    () => Array.from(new Set(transactions.map((t) => getMonthKey(t.date)))).sort().reverse(),
    [transactions]
  );

  const filteredAllTxs = useMemo(() => {
    return transactions.filter((t) => {
      if (categoryFilter !== 'All' && t.category !== categoryFilter) return false;
      if (methodFilter !== 'All' && t.paymentMethod !== methodFilter) return false;
      return true;
    });
  }, [transactions, categoryFilter, methodFilter]);

  const monthFilteredExpenses = useMemo(
    () =>
      filteredAllTxs.filter(
        (t) => t.type === 'expense' && getMonthKey(t.date) === selectedMonth
      ),
    [filteredAllTxs, selectedMonth]
  );

  const monthlySeries = useMemo(() => buildMonthlySeries(filteredAllTxs), [filteredAllTxs]);
  const forecast = useMemo(() => generateForecast(filteredAllTxs, budgets), [filteredAllTxs, budgets]);

  // 1 & 5. Category Donut + Horizontal Bar Data (active month)
  const categoryData = useMemo(() => {
    const totals = new Map<ExpenseCategory, number>();
    for (const c of EXPENSE_CATEGORIES) totals.set(c, 0);
    for (const tx of monthFilteredExpenses) {
      const cat = EXPENSE_CATEGORIES.includes(tx.category as ExpenseCategory)
        ? (tx.category as ExpenseCategory)
        : 'Other';
      totals.set(cat, (totals.get(cat) ?? 0) + tx.amount);
    }
    return EXPENSE_CATEGORIES.map((name, idx) => ({
      name,
      amount: Math.round(totals.get(name) ?? 0),
      budget: budgets.categoryBudgets[name] ?? 0,
      color: PALETTE[idx % PALETTE.length],
    }))
      .filter((d) => d.amount > 0 || d.budget > 0)
      .sort((a, b) => b.amount - a.amount);
  }, [monthFilteredExpenses, budgets]);

  // 2 & 9. Monthly Trend + Savings Trend
  const monthlyChartData = useMemo(
    () =>
      monthlySeries.map((m) => ({
        label: m.label,
        expenses: Math.round(m.totalExpense),
        income: Math.round(m.totalIncome),
        savings: Math.round(m.netSavings),
      })),
    [monthlySeries]
  );

  // 3. Daily Expenditure Area Chart (selected month)
  const dailyData = useMemo(() => {
    const dayMap = new Map<number, number>();
    for (const tx of monthFilteredExpenses) {
      const day = Number(tx.date.slice(8, 10)) || 1;
      dayMap.set(day, (dayMap.get(day) ?? 0) + tx.amount);
    }
    return Array.from({ length: 31 }, (_, i) => i + 1)
      .filter((d) => dayMap.has(d) || d <= 28)
      .map((day) => ({
        day: `Day ${day}`,
        amount: Math.round(dayMap.get(day) ?? 0),
      }));
  }, [monthFilteredExpenses]);

  // 4. Weekday Spending Heatmap (Mon..Sun x Week 1..5 for selected month)
  const heatmapData = useMemo(() => {
    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const grid = Array.from({ length: 5 }, (_, weekIdx) =>
      dayLabels.map((dayName, dowIdx) => ({
        week: `W${weekIdx + 1}`,
        dayName,
        dowIdx,
        amount: 0,
        count: 0,
      }))
    );

    let maxVal = 0;
    for (const tx of monthFilteredExpenses) {
      const dayOfMonth = Number(tx.date.slice(8, 10)) || 1;
      const weekIdx = Math.min(4, Math.floor((dayOfMonth - 1) / 7));
      const d = new Date(`${tx.date}T00:00:00`);
      const jsDow = d.getDay(); // 0=Sun..6=Sat
      const monIdx = (jsDow + 6) % 7; // 0=Mon..6=Sun
      grid[weekIdx][monIdx].amount += tx.amount;
      grid[weekIdx][monIdx].count += 1;
      if (grid[weekIdx][monIdx].amount > maxVal) maxVal = grid[weekIdx][monIdx].amount;
    }

    return { grid, dayLabels, maxVal };
  }, [monthFilteredExpenses]);

  // 7. Payment Method Breakdown
  const paymentMethodData = useMemo(() => {
    const map = new Map<PaymentMethod, number>();
    for (const pm of PAYMENT_METHODS) map.set(pm, 0);
    for (const tx of monthFilteredExpenses) {
      map.set(tx.paymentMethod, (map.get(tx.paymentMethod) ?? 0) + tx.amount);
    }
    return PAYMENT_METHODS.map((method, idx) => ({
      method,
      amount: Math.round(map.get(method) ?? 0),
      color: PALETTE[idx],
    }));
  }, [monthFilteredExpenses]);

  // 10. Highest Spending Merchants (Top 8 in selected month)
  const topMerchantsData = useMemo(() => {
    const map = new Map<string, number>();
    for (const tx of monthFilteredExpenses) {
      map.set(tx.merchant, (map.get(tx.merchant) ?? 0) + tx.amount);
    }
    return Array.from(map.entries())
      .map(([merchant, amount]) => ({ merchant, amount: Math.round(amount) }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8);
  }, [monthFilteredExpenses]);

  if (transactions.length === 0) {
    return (
      <div className="rounded-2xl bg-[#151F30] border border-white/8 p-10 text-center text-sm text-[#94A3B8]">
        Add or import transactions to explore interactive visualizations across categories, weekdays, merchants, and forecasts.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connected Filters */}
      <div className="rounded-2xl bg-[#101827] border border-white/8 p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-[#F6F8FC]">
            Interactive Data Visualizations
          </h2>
          <p className="text-xs text-[#94A3B8]">
            10 synchronized views · Active slice: {formatMonthLabel(selectedMonth)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            aria-label="Analytics month filter"
            value={selectedMonth}
            onChange={(e) => onSelectMonth(e.target.value)}
            className="rounded-lg bg-[#151F30] border border-white/10 px-3 py-1.5 text-xs text-[#F6F8FC]"
          >
            {availableMonths.map((mk) => (
              <option key={mk} value={mk}>
                {formatMonthLabel(mk)}
              </option>
            ))}
          </select>

          <select
            aria-label="Analytics category filter"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as ExpenseCategory | 'All')}
            className="rounded-lg bg-[#151F30] border border-white/10 px-3 py-1.5 text-xs text-[#F6F8FC]"
          >
            <option value="All">All Categories</option>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            aria-label="Analytics payment method filter"
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value as PaymentMethod | 'All')}
            className="rounded-lg bg-[#151F30] border border-white/10 px-3 py-1.5 text-xs text-[#F6F8FC]"
          >
            <option value="All">All Payment Rails</option>
            {PAYMENT_METHODS.map((pm) => (
              <option key={pm} value={pm}>
                {pm}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Charts 1 & 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-[#151F30] border border-white/8 p-5">
          <h3 className="font-display text-base font-semibold text-[#F6F8FC]">
            1. Expenses by Category (Donut)
          </h3>
          <p className="text-xs text-[#94A3B8] mb-4">{formatMonthLabel(selectedMonth)} distribution</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData.filter((d) => d.amount > 0)}
                  dataKey="amount"
                  nameKey="name"
                  innerRadius={58}
                  outerRadius={92}
                  paddingAngle={2}
                  stroke="none"
                  isAnimationActive={false}
                >
                  {categoryData
                    .filter((d) => d.amount > 0)
                    .map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: '11px', color: '#94A3B8' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl bg-[#151F30] border border-white/8 p-5">
          <h3 className="font-display text-base font-semibold text-[#F6F8FC]">
            2. Monthly Expenses Trend Line
          </h3>
          <p className="text-xs text-[#94A3B8] mb-4">Chronological monthly outflow trajectory</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyChartData}>
                <CartesianGrid stroke="rgba(148,163,184,0.1)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={formatCompactINR} tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Line
                  type="monotone"
                  dataKey="expenses"
                  name="Monthly Expenses"
                  stroke="#25E0A4"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#25E0A4' }}
                  activeDot={{ r: 5 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts 3 & 4 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-[#151F30] border border-white/8 p-5">
          <h3 className="font-display text-base font-semibold text-[#F6F8FC]">
            3. Daily Expenditure Area Chart
          </h3>
          <p className="text-xs text-[#94A3B8] mb-4">Daily cash outflow spikes in {formatMonthLabel(selectedMonth)}</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyData}>
                <defs>
                  <linearGradient id="dailyAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6E8BFF" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#6E8BFF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(148,163,184,0.1)" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: '#94A3B8', fontSize: 10 }} interval={4} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={formatCompactINR} tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="amount"
                  name="Daily Spend"
                  stroke="#6E8BFF"
                  strokeWidth={2}
                  fill="url(#dailyAreaGrad)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl bg-[#151F30] border border-white/8 p-5">
          <h3 className="font-display text-base font-semibold text-[#F6F8FC]">
            4. Weekday Spending Heatmap
          </h3>
          <p className="text-xs text-[#94A3B8] mb-4">
            Spend intensity by week-of-month and weekday ({formatMonthLabel(selectedMonth)})
          </p>
          <div className="overflow-x-auto">
            <div className="min-w-[360px] space-y-1.5">
              <div className="grid grid-cols-8 gap-1.5 text-[11px] text-[#94A3B8] text-center">
                <div />
                {heatmapData.dayLabels.map((d) => (
                  <div key={d}>{d}</div>
                ))}
              </div>
              {heatmapData.grid.map((row, wIdx) => (
                <div key={wIdx} className="grid grid-cols-8 gap-1.5 items-center">
                  <span className="text-[11px] font-mono text-[#94A3B8]">W{wIdx + 1}</span>
                  {row.map((cell) => {
                    const intensity =
                      heatmapData.maxVal > 0 ? cell.amount / heatmapData.maxVal : 0;
                    const bgOpacity = cell.amount === 0 ? 0.06 : 0.16 + intensity * 0.78;
                    return (
                      <div
                        key={`${wIdx}-${cell.dayName}`}
                        title={`${cell.week} ${cell.dayName}: ${formatINR(Math.round(cell.amount))} (${cell.count} txns)`}
                        className="h-9 rounded-lg border border-white/6 flex items-center justify-center text-[10px] font-mono tabular-nums text-[#F6F8FC] transition-transform hover:scale-105"
                        style={{
                          backgroundColor:
                            cell.amount === 0
                              ? 'rgba(148,163,184,0.06)'
                              : `rgba(37, 224, 164, ${bgOpacity.toFixed(2)})`,
                          color: intensity > 0.65 ? '#070B14' : '#F6F8FC',
                        }}
                      >
                        {cell.amount > 0 ? formatCompactINR(cell.amount) : '—'}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Charts 5 & 6 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-[#151F30] border border-white/8 p-5">
          <h3 className="font-display text-base font-semibold text-[#F6F8FC]">
            5. Category-Wise Horizontal Bar Chart
          </h3>
          <p className="text-xs text-[#94A3B8] mb-4">Ranked expenditure by category</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData.filter((d) => d.amount > 0)} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid stroke="rgba(148,163,184,0.1)" horizontal={false} />
                <XAxis type="number" tickFormatter={formatCompactINR} tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={85} tick={{ fill: '#F6F8FC', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="amount" name="Spent" radius={[0, 6, 6, 0]}>
                  {categoryData
                    .filter((d) => d.amount > 0)
                    .map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl bg-[#151F30] border border-white/8 p-5">
          <h3 className="font-display text-base font-semibold text-[#F6F8FC]">
            6. Budget vs. Actual Comparison
          </h3>
          <p className="text-xs text-[#94A3B8] mb-4">Target limits compared against real spend</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData}>
                <CartesianGrid stroke="rgba(148,163,184,0.1)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={formatCompactINR} tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="budget" name="Budget" fill="#334155" radius={[4, 4, 0, 0]} />
                <Bar dataKey="amount" name="Actual" fill="#25E0A4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts 7 & 8 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-[#151F30] border border-white/8 p-5">
          <h3 className="font-display text-base font-semibold text-[#F6F8FC]">
            7. Payment Method Breakdown (UPI vs. Card vs. Cash)
          </h3>
          <p className="text-xs text-[#94A3B8] mb-4">Channel distribution for {formatMonthLabel(selectedMonth)}</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={paymentMethodData}>
                <CartesianGrid stroke="rgba(148,163,184,0.1)" vertical={false} />
                <XAxis dataKey="method" tick={{ fill: '#F6F8FC', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={formatCompactINR} tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="amount" name="Spent" radius={[6, 6, 0, 0]}>
                  {paymentMethodData.map((entry) => (
                    <Cell key={entry.method} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl bg-[#151F30] border border-white/8 p-5">
          <h3 className="font-display text-base font-semibold text-[#F6F8FC]">
            8. Forecast vs. Historical Spending
          </h3>
          <p className="text-xs text-[#94A3B8] mb-4">
            {forecast.modelLabel} · Out-of-sample chronological fit
          </p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={forecast.series}>
                <CartesianGrid stroke="rgba(148,163,184,0.1)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={formatCompactINR} tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="actual" name="Actual Spend" fill="#25E0A4" radius={[4, 4, 0, 0]} />
                <Line
                  type="monotone"
                  dataKey="mlPredicted"
                  name="ML Forecast"
                  stroke="#6E8BFF"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="baselinePredicted"
                  name="3-Mo Baseline"
                  stroke="#E7C68C"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts 9 & 10 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-[#151F30] border border-white/8 p-5">
          <h3 className="font-display text-base font-semibold text-[#F6F8FC]">
            9. Net Savings Trend Chart
          </h3>
          <p className="text-xs text-[#94A3B8] mb-4">Monthly income retained minus expenses</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyChartData}>
                <defs>
                  <linearGradient id="savingsAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#E7C68C" stopOpacity={0.38} />
                    <stop offset="100%" stopColor="#E7C68C" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(148,163,184,0.1)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={formatCompactINR} tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="savings"
                  name="Net Savings"
                  stroke="#E7C68C"
                  strokeWidth={2}
                  fill="url(#savingsAreaGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl bg-[#151F30] border border-white/8 p-5">
          <h3 className="font-display text-base font-semibold text-[#F6F8FC]">
            10. Highest Spending Merchants
          </h3>
          <p className="text-xs text-[#94A3B8] mb-4">Top merchants in {formatMonthLabel(selectedMonth)}</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topMerchantsData} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid stroke="rgba(148,163,184,0.1)" horizontal={false} />
                <XAxis type="number" tickFormatter={formatCompactINR} tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="merchant" width={110} tick={{ fill: '#F6F8FC', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="amount" name="Spend" fill="#6E8BFF" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
