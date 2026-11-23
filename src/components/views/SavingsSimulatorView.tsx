import React, { useMemo, useState } from 'react';
import { RotateCcw, SlidersHorizontal } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartTooltip } from '../ChartTooltip';
import { runSavingsSimulation } from '../../lib/analytics';
import { buildMonthlySeries } from '../../lib/forecasting';
import { formatCompactINR, formatINR, formatMonthLabel, formatPct } from '../../lib/formatters';
import { BudgetConfig, EXPENSE_CATEGORIES, ExpenseCategory, Transaction } from '../../lib/types';

const DEFAULT_ADJUSTMENTS: Record<ExpenseCategory, number> = {
  Rent: 0,
  Bills: 0,
  Groceries: 0,
  Dining: 20,
  Shopping: 15,
  Travel: 10,
  Subscriptions: 15,
  Health: 0,
  Other: 10,
};

interface SavingsSimulatorViewProps {
  transactions: Transaction[];
  budgets: BudgetConfig;
  selectedMonth: string;
}

export const SavingsSimulatorView: React.FC<SavingsSimulatorViewProps> = ({
  transactions,
  budgets,
  selectedMonth,
}) => {
  const [reductions, setReductions] = useState<Record<ExpenseCategory, number>>(DEFAULT_ADJUSTMENTS);
  const [includeFixedCategories, setIncludeFixedCategories] = useState(false);

  const monthlySeries = useMemo(() => buildMonthlySeries(transactions), [transactions]);

  const baseCategoryTotals = useMemo(() => {
    const activeRow = monthlySeries.find((m) => m.monthKey === selectedMonth);
    const fallback: Record<ExpenseCategory, number> = {
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
    return activeRow ? activeRow.byCategory : fallback;
  }, [monthlySeries, selectedMonth]);

  const simulation = useMemo(() => {
    const adjustments = EXPENSE_CATEGORIES.map((category) => ({
      category,
      reductionPct:
        !includeFixedCategories && (category === 'Rent' || category === 'Bills')
          ? 0
          : reductions[category] ?? 0,
    }));
    return runSavingsSimulation(baseCategoryTotals, budgets, adjustments);
  }, [baseCategoryTotals, budgets, reductions, includeFixedCategories]);

  const adjustableCategories = useMemo(
    () =>
      EXPENSE_CATEGORIES.filter((cat) =>
        includeFixedCategories ? true : cat !== 'Rent' && cat !== 'Bills'
      ),
    [includeFixedCategories]
  );

  const chartData = useMemo(
    () =>
      simulation.breakdown
        .filter((b) => b.originalProjected > 0)
        .map((b) => ({
          category: b.category,
          Original: b.originalProjected,
          Simulated: b.adjustedProjected,
        })),
    [simulation]
  );

  return (
    <div className="space-y-6">
      {/* Disclaimer Banner */}
      <div className="rounded-2xl bg-[#101827] border border-white/8 p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 text-xs text-[#94A3B8]">
          <SlidersHorizontal className="w-4 h-4 text-[#25E0A4] shrink-0" aria-hidden="true" />
          <span>
            <strong className="text-[#F6F8FC]">Hypothetical Scenario Simulator</strong> · Computed mathematically from your{' '}
            {formatMonthLabel(selectedMonth)} baseline ({formatINR(simulation.originalMonthlyExpense)}). Results represent potential, not guaranteed savings.
          </span>
        </div>
        <button
          type="button"
          onClick={() => setReductions(DEFAULT_ADJUSTMENTS)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#E7C68C] hover:underline cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
          Reset Sliders
        </button>
      </div>

      {/* KPI Output Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-[#151F30] border border-white/8 p-5">
          <p className="text-xs text-[#94A3B8]">Original Baseline Spend</p>
          <p className="mt-2 font-mono tabular-nums text-2xl font-bold text-[#F6F8FC]">
            {formatINR(simulation.originalMonthlyExpense)}
          </p>
        </div>

        <div className="rounded-2xl bg-[#151F30] border border-white/8 p-5">
          <p className="text-xs text-[#94A3B8]">Simulated Monthly Expense</p>
          <p className="mt-2 font-mono tabular-nums text-2xl font-bold text-[#6E8BFF]">
            {formatINR(simulation.adjustedMonthlyExpense)}
          </p>
        </div>

        <div className="rounded-2xl bg-[#151F30] border border-white/8 p-5">
          <p className="text-xs text-[#94A3B8]">Potential Monthly Savings</p>
          <p className="mt-2 font-mono tabular-nums text-2xl font-bold text-[#25E0A4]">
            +{formatINR(simulation.potentialMonthlySavings)}
          </p>
        </div>

        <div className="rounded-2xl bg-[#151F30] border border-white/8 p-5">
          <p className="text-xs text-[#94A3B8]">Potential Annual Savings (12×)</p>
          <p className="mt-2 font-mono tabular-nums text-2xl font-bold text-[#E7C68C]">
            +{formatINR(simulation.potentialAnnualSavings)}
          </p>
          {simulation.goalCoveragePct !== null && (
            <p className="mt-1 text-xs text-[#94A3B8]">
              Covers {formatPct(simulation.goalCoveragePct)} of monthly savings goal
            </p>
          )}
        </div>
      </div>

      {/* Sliders + Before/After Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 rounded-2xl bg-[#151F30] border border-white/8 p-6 space-y-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-lg font-semibold text-[#F6F8FC]">
              Habit Reduction Sliders
            </h2>
            <label className="inline-flex items-center gap-2 text-xs text-[#94A3B8] cursor-pointer">
              <input
                type="checkbox"
                checked={includeFixedCategories}
                onChange={(e) => setIncludeFixedCategories(e.target.checked)}
                className="rounded border-white/20 bg-[#070B14]"
              />
              Include Rent &amp; Bills
            </label>
          </div>

          <div className="space-y-4">
            {adjustableCategories.map((cat) => {
              const pct = reductions[cat] ?? 0;
              const baseVal = Math.round(baseCategoryTotals[cat] ?? 0);
              const savedVal = Math.round((baseVal * pct) / 100);

              return (
                <div key={cat} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[#F6F8FC]">
                      Reduce {cat} by <span className="font-mono text-[#25E0A4]">{pct}%</span>
                    </span>
                    <span className="font-mono tabular-nums text-[#94A3B8]">
                      Saves {formatINR(savedVal)} / mo
                    </span>
                  </div>
                  <input
                    type="range"
                    aria-label={`Reduce ${cat} spending percentage`}
                    min={0}
                    max={60}
                    step={5}
                    value={pct}
                    onChange={(e) =>
                      setReductions((prev) => ({ ...prev, [cat]: Number(e.target.value) }))
                    }
                    className="w-full cursor-pointer"
                  />
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-7 rounded-2xl bg-[#151F30] border border-white/8 p-6 flex flex-col justify-between space-y-5">
          <div>
            <h3 className="font-display text-base font-semibold text-[#F6F8FC]">
              Before vs. After Category Comparison
            </h3>
            <p className="text-xs text-[#94A3B8] mb-4">
              Original {formatMonthLabel(selectedMonth)} baseline vs. hypothetical scenario
            </p>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid stroke="rgba(148,163,184,0.1)" vertical={false} />
                  <XAxis dataKey="category" tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={formatCompactINR} tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="Original" name="Current Baseline" fill="#334155" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Simulated" name="Hypothetical Target" fill="#25E0A4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Updated Risk Transitions */}
          <div className="pt-4 border-t border-white/8">
            <p className="text-xs font-medium text-[#94A3B8] mb-2.5">
              Updated Budget Risk Transitions
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              {simulation.breakdown
                .filter((b) => b.monthlySaved > 0 && b.budget > 0)
                .map((b) => (
                  <div
                    key={b.category}
                    className="rounded-xl bg-[#101827] border border-white/8 px-3 py-2 flex items-center justify-between gap-2"
                  >
                    <span className="font-medium text-[#F6F8FC]">{b.category}</span>
                    <span className="font-mono text-[11px] text-[#94A3B8]">
                      {b.originalRisk} → <strong className="text-[#25E0A4]">{b.adjustedRisk}</strong>
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
