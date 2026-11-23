import React, { useMemo } from 'react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { calculateFinancialHealthScore } from '../../lib/analytics';
import { formatMonthLabel } from '../../lib/formatters';
import { BudgetConfig, Transaction } from '../../lib/types';

interface FinancialHealthViewProps {
  transactions: Transaction[];
  budgets: BudgetConfig;
  selectedMonth: string;
}

export const FinancialHealthView: React.FC<FinancialHealthViewProps> = ({
  transactions,
  budgets,
  selectedMonth,
}) => {
  const health = useMemo(
    () => calculateFinancialHealthScore(transactions, selectedMonth, budgets),
    [transactions, selectedMonth, budgets]
  );

  const tierColor =
    health.totalScore >= 80
      ? '#25E0A4'
      : health.totalScore >= 60
        ? '#6E8BFF'
        : health.totalScore >= 40
          ? '#F6B960'
          : '#FF687B';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Circular Gauge Card */}
        <div className="lg:col-span-4 rounded-2xl bg-[#151F30] border border-white/8 p-6 flex flex-col items-center justify-between text-center">
          <div>
            <h2 className="font-display text-lg font-semibold text-[#F6F8FC]">
              Financial Health Score
            </h2>
            <p className="text-xs text-[#94A3B8]">{formatMonthLabel(selectedMonth)} evaluation</p>
          </div>

          <div className="relative w-48 h-48 my-6 flex items-center justify-center">
            <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90" aria-hidden="true">
              <circle cx="70" cy="70" r="58" fill="none" stroke="#070B14" strokeWidth="12" />
              <circle
                cx="70"
                cy="70"
                r="58"
                fill="none"
                stroke={tierColor}
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={`${(health.totalScore / 100) * 364.42} 364.42`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-mono tabular-nums text-4xl font-bold text-[#F6F8FC]">
                {health.totalScore}
              </span>
              <span className="text-xs font-semibold mt-0.5" style={{ color: tierColor }}>
                {health.tier}
              </span>
            </div>
          </div>

          <div className="w-full rounded-xl bg-[#101827] border border-white/8 p-3.5 text-left text-xs text-[#94A3B8] space-y-1">
            <p className="font-semibold text-[#F6F8FC]">Score Bands</p>
            <p>80–100: Excellent · 60–79: Good</p>
            <p>40–59: Needs Attention · 0–39: High Risk</p>
          </div>
        </div>

        {/* Factor Breakdown */}
        <div className="lg:col-span-8 rounded-2xl bg-[#151F30] border border-white/8 p-6 space-y-5">
          <div>
            <h3 className="font-display text-lg font-semibold text-[#F6F8FC]">
              Explainable Weighted Formula Breakdown
            </h3>
            <p className="text-xs text-[#94A3B8] mt-1 leading-relaxed">{health.methodologyNote}</p>
          </div>

          {(!health.hasIncomeData || !health.hasBudgetData) && (
            <div className="rounded-xl bg-[#101827] border border-white/10 p-3.5 text-xs text-[#E7C68C] flex items-start gap-2.5">
              <Info className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                {!health.hasIncomeData && 'Income entries are missing for this month. '}
                {!health.hasBudgetData && 'Total monthly budget is not configured. '}
                The score transparently normalizes across available metrics rather than assuming missing income.
              </span>
            </div>
          )}

          <div className="space-y-4">
            {health.factors.map((factor) => {
              const pct = factor.maxScore > 0 ? (factor.score / factor.maxScore) * 100 : 0;
              return (
                <div
                  key={factor.id}
                  className="rounded-xl bg-[#101827] border border-white/8 p-4 space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {factor.available ? (
                        <CheckCircle2 className="w-4 h-4 text-[#25E0A4]" aria-hidden="true" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-[#94A3B8]" aria-hidden="true" />
                      )}
                      <span className="text-sm font-semibold text-[#F6F8FC]">{factor.label}</span>
                    </div>
                    <span className="font-mono tabular-nums text-xs font-semibold text-[#F6F8FC]">
                      {factor.available ? `${factor.score} / ${factor.maxScore} pts` : 'Excluded (No Data)'}
                    </span>
                  </div>

                  <div className="h-2 rounded-full bg-[#070B14] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#25E0A4] transition-all duration-500"
                      style={{ width: `${factor.available ? pct : 0}%` }}
                    />
                  </div>

                  <p className="text-xs text-[#F6F8FC]/90">{factor.summary}</p>
                  <p className="text-xs text-[#94A3B8]">
                    How to improve: {factor.recommendation}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
