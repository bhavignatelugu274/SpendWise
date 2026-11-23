import React, { useMemo, useState } from 'react';
import { AlertOctagon, AlertTriangle, CheckCircle2, Save, ShieldAlert } from 'lucide-react';
import { calculateBudgetRisks } from '../../lib/analytics';
import { formatINR, formatMonthLabel, formatPct, getMonthKey } from '../../lib/formatters';
import { BudgetConfig, EXPENSE_CATEGORIES, ExpenseCategory, Transaction } from '../../lib/types';

interface BudgetPlannerViewProps {
  transactions: Transaction[];
  budgets: BudgetConfig;
  selectedMonth: string;
  onUpdateBudgets: (next: BudgetConfig) => void;
  onNotify: (type: 'success' | 'error' | 'info', title: string, description?: string) => void;
}

export const BudgetPlannerView: React.FC<BudgetPlannerViewProps> = ({
  transactions,
  budgets,
  selectedMonth,
  onUpdateBudgets,
  onNotify,
}) => {
  const [draft, setDraft] = useState<BudgetConfig>(budgets);

  const risks = useMemo(
    () => calculateBudgetRisks(transactions, selectedMonth, budgets),
    [transactions, selectedMonth, budgets]
  );

  const monthSpendTotal = useMemo(
    () =>
      transactions
        .filter((t) => t.type === 'expense' && getMonthKey(t.date) === selectedMonth)
        .reduce((s, t) => s + t.amount, 0),
    [transactions, selectedMonth]
  );

  const handleCategoryChange = (cat: ExpenseCategory, val: string) => {
    const num = Math.max(0, Number(val) || 0);
    setDraft((prev) => ({
      ...prev,
      categoryBudgets: {
        ...prev.categoryBudgets,
        [cat]: num,
      },
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateBudgets(draft);
    onNotify('success', 'Budgets updated', 'Proactive pace alerts recalculated immediately.');
  };

  const sumCategories = EXPENSE_CATEGORIES.reduce(
    (s, cat) => s + (draft.categoryBudgets[cat] ?? 0),
    0
  );

  const getRiskStyle = (level: string) => {
    if (level === 'Budget Exceeded') return { color: 'text-[#FF687B]', bar: 'bg-[#FF687B]', Icon: AlertOctagon };
    if (level === 'High Risk') return { color: 'text-[#F6B960]', bar: 'bg-[#F6B960]', Icon: ShieldAlert };
    if (level === 'Approaching Limit') return { color: 'text-[#E7C68C]', bar: 'bg-[#E7C68C]', Icon: AlertTriangle };
    return { color: 'text-[#25E0A4]', bar: 'bg-[#25E0A4]', Icon: CheckCircle2 };
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Budget Editor Form */}
        <form
          onSubmit={handleSave}
          className="lg:col-span-5 rounded-2xl bg-[#151F30] border border-white/8 p-6 space-y-5"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold text-[#F6F8FC]">
                Monthly Budget Targets
              </h2>
              <p className="text-xs text-[#94A3B8]">
                Active allocation sum: <span className="font-mono tabular-nums text-[#F6F8FC]">{formatINR(sumCategories)}</span>
              </p>
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#25E0A4] text-[#070B14] text-xs font-semibold hover:bg-[#38ecc0] transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" aria-hidden="true" />
              Save Budgets
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label htmlFor="total-budget-input" className="block text-xs font-medium text-[#94A3B8] mb-1">
                Total Monthly Budget (₹)
              </label>
              <input
                id="total-budget-input"
                type="number"
                min="0"
                step="500"
                value={draft.totalMonthlyBudget}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    totalMonthlyBudget: Math.max(0, Number(e.target.value) || 0),
                  }))
                }
                className="w-full rounded-xl bg-[#101827] border border-white/10 px-3 py-2 text-xs font-mono tabular-nums text-[#F6F8FC]"
              />
            </div>

            <div>
              <label htmlFor="savings-goal-input" className="block text-xs font-medium text-[#94A3B8] mb-1">
                Monthly Savings Goal (₹)
              </label>
              <input
                id="savings-goal-input"
                type="number"
                min="0"
                step="500"
                value={draft.monthlySavingsGoal}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    monthlySavingsGoal: Math.max(0, Number(e.target.value) || 0),
                  }))
                }
                className="w-full rounded-xl bg-[#101827] border border-white/10 px-3 py-2 text-xs font-mono tabular-nums text-[#F6F8FC]"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-white/8 space-y-3">
            <p className="text-xs font-medium text-[#94A3B8]">Category Caps (₹ / month)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {EXPENSE_CATEGORIES.map((cat) => (
                <div key={cat}>
                  <label htmlFor={`budget-${cat}`} className="block text-xs text-[#94A3B8] mb-1">
                    {cat}
                  </label>
                  <input
                    id={`budget-${cat}`}
                    type="number"
                    min="0"
                    step="100"
                    value={draft.categoryBudgets[cat] ?? 0}
                    onChange={(e) => handleCategoryChange(cat, e.target.value)}
                    className="w-full rounded-lg bg-[#101827] border border-white/10 px-3 py-1.5 text-xs font-mono tabular-nums text-[#F6F8FC]"
                  />
                </div>
              ))}
            </div>
          </div>
        </form>

        {/* Proactive Budget Risk Monitor */}
        <section className="lg:col-span-7 rounded-2xl bg-[#151F30] border border-white/8 p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-lg font-semibold text-[#F6F8FC]">
                Proactive Pace &amp; Risk Alerts ({formatMonthLabel(selectedMonth)})
              </h2>
              <p className="text-xs text-[#94A3B8]">
                Calculated from cumulative spending velocity and remaining days in the month
              </p>
            </div>
            <div className="text-right text-xs">
              <span className="text-[#94A3B8]">Month Total: </span>
              <span className="font-mono tabular-nums font-semibold text-[#F6F8FC]">
                {formatINR(monthSpendTotal)}
              </span>
              {budgets.totalMonthlyBudget > 0 && (
                <span className="text-[#94A3B8] font-mono tabular-nums">
                  {' '}
                  / {formatINR(budgets.totalMonthlyBudget)}
                </span>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {risks.map((item) => {
              const { color, bar, Icon } = getRiskStyle(item.riskLevel);
              const fillWidth = Math.min(100, item.utilizationPct);

              return (
                <div
                  key={item.category}
                  className="rounded-xl bg-[#101827] border border-white/8 p-4 space-y-2.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${color}`} aria-hidden="true" />
                      <span className="text-sm font-semibold text-[#F6F8FC]">{item.category}</span>
                      <span className={`text-xs font-medium ${color}`}>· {item.riskLevel}</span>
                    </div>
                    <div className="font-mono tabular-nums text-xs text-[#94A3B8]">
                      <strong className="text-[#F6F8FC]">{formatINR(item.actual)}</strong>
                      {item.budget > 0 && ` / ${formatINR(item.budget)} (${formatPct(item.utilizationPct)})`}
                      {item.projectedMonthEnd > item.actual && item.budget > 0 && (
                        <span className="text-[#E7C68C]">
                          {' '}
                          · Pace: {formatINR(item.projectedMonthEnd)}
                        </span>
                      )}
                    </div>
                  </div>

                  {item.budget > 0 && (
                    <div className="h-2 rounded-full bg-[#070B14] overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${bar}`}
                        style={{ width: `${fillWidth}%` }}
                      />
                    </div>
                  )}

                  <p className="text-xs text-[#F6F8FC]/90">{item.alertMessage}</p>
                  <p className="text-xs text-[#94A3B8]">{item.recommendation}</p>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};
