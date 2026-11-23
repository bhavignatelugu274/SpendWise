import React, { useMemo, useState } from 'react';
import { AlertTriangle, BellRing, Lightbulb, Sparkles, TrendingUp } from 'lucide-react';
import { generateSmartInsights } from '../../lib/analytics';
import { formatINR, formatMonthLabel, formatShortDate } from '../../lib/formatters';
import { BudgetConfig, InsightCategory, Transaction } from '../../lib/types';

interface SmartInsightsViewProps {
  transactions: Transaction[];
  budgets: BudgetConfig;
  selectedMonth: string;
}

const INSIGHT_FILTERS: Array<'All' | InsightCategory> = [
  'All',
  'Spending Trends',
  'Savings Opportunities',
  'Budget Warnings',
  'Unusual Transactions',
];

export const SmartInsightsView: React.FC<SmartInsightsViewProps> = ({
  transactions,
  budgets,
  selectedMonth,
}) => {
  const [activeFilter, setActiveFilter] = useState<'All' | InsightCategory>('All');

  const { insights, anomalies } = useMemo(
    () => generateSmartInsights(transactions, selectedMonth, budgets),
    [transactions, selectedMonth, budgets]
  );

  const visibleInsights = useMemo(
    () =>
      activeFilter === 'All'
        ? insights
        : insights.filter((ins) => ins.category === activeFilter),
    [insights, activeFilter]
  );

  const getCategoryIcon = (cat: InsightCategory) => {
    if (cat === 'Budget Warnings') return BellRing;
    if (cat === 'Savings Opportunities') return Lightbulb;
    if (cat === 'Unusual Transactions') return AlertTriangle;
    return TrendingUp;
  };

  return (
    <div className="space-y-6">
      {/* Header & Interactive Filter Tabs */}
      <div className="rounded-2xl bg-[#101827] border border-white/8 p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-semibold text-[#F6F8FC]">
            Smart Insights &amp; Anomaly Feed
          </h2>
          <p className="text-xs text-[#94A3B8]">
            Verified quantitative recommendations for {formatMonthLabel(selectedMonth)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-[#070B14] border border-white/8">
          {INSIGHT_FILTERS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveFilter(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeFilter === tab
                  ? 'bg-[#151F30] text-[#25E0A4]'
                  : 'text-[#94A3B8] hover:text-[#F6F8FC]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Insights Grid */}
      {visibleInsights.length === 0 ? (
        <div className="rounded-2xl bg-[#151F30] border border-white/8 p-8 text-center text-xs text-[#94A3B8]">
          No insights in the &ldquo;{activeFilter}&rdquo; category for {formatMonthLabel(selectedMonth)}.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visibleInsights.map((ins) => {
            const Icon = getCategoryIcon(ins.category);
            const iconColor =
              ins.severity === 'danger'
                ? 'text-[#FF687B]'
                : ins.severity === 'warning'
                  ? 'text-[#F6B960]'
                  : ins.severity === 'positive'
                    ? 'text-[#25E0A4]'
                    : 'text-[#6E8BFF]';

            return (
              <article
                key={ins.id}
                className="rounded-2xl bg-[#151F30] border border-white/8 p-5 space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="inline-flex items-center gap-1.5 text-[#94A3B8] font-medium">
                    <Icon className={`w-4 h-4 ${iconColor}`} aria-hidden="true" />
                    {ins.category}
                  </span>
                  {ins.metricValue && (
                    <span className="font-mono tabular-nums font-semibold text-[#E7C68C]">
                      {ins.metricValue}
                    </span>
                  )}
                </div>
                <h3 className="font-display text-base font-semibold text-[#F6F8FC]">{ins.title}</h3>
                <p className="text-xs text-[#94A3B8] leading-relaxed">{ins.description}</p>
              </article>
            );
          })}
        </div>
      )}

      {/* Statistical Outlier Detection Table */}
      <section className="rounded-2xl bg-[#151F30] border border-white/8 p-5">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="font-display text-base font-semibold text-[#F6F8FC] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#F6B960]" aria-hidden="true" />
              Statistical Anomaly Detection (Modified Z-Score &amp; Tukey IQR)
            </h3>
            <p className="text-xs text-[#94A3B8]">
              Transactions exceeding 3.2 MAD-adjusted σ or 1.5× IQR upper fence within their category
            </p>
          </div>
          <span className="font-mono text-xs text-[#94A3B8]">{anomalies.length} flagged</span>
        </div>

        {anomalies.length === 0 ? (
          <p className="text-xs text-[#94A3B8] py-6 text-center">
            No statistical spending outliers detected across your current transaction history.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/8 text-[#94A3B8]">
                  <th className="py-2.5 font-medium">Date</th>
                  <th className="py-2.5 font-medium">Merchant</th>
                  <th className="py-2.5 font-medium">Category</th>
                  <th className="py-2.5 font-medium text-right">Amount</th>
                  <th className="py-2.5 font-medium text-right">Category Median</th>
                  <th className="py-2.5 font-medium text-right">Modified Z</th>
                  <th className="py-2.5 font-medium pl-4">Explanation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/6">
                {anomalies.map((a) => (
                  <tr key={a.transaction.id} className="hover:bg-white/[0.02]">
                    <td className="py-3 font-mono tabular-nums text-[#94A3B8] whitespace-nowrap">
                      {formatShortDate(a.transaction.date)}
                    </td>
                    <td className="py-3 font-medium text-[#F6F8FC]">{a.transaction.merchant}</td>
                    <td className="py-3 text-[#94A3B8]">{a.transaction.category}</td>
                    <td className="py-3 text-right font-mono tabular-nums font-semibold text-[#F6B960]">
                      {formatINR(a.transaction.amount)}
                    </td>
                    <td className="py-3 text-right font-mono tabular-nums text-[#94A3B8]">
                      {formatINR(a.categoryMedian)}
                    </td>
                    <td className="py-3 text-right font-mono tabular-nums text-[#FF687B]">
                      {a.modifiedZScore.toFixed(2)}σ
                    </td>
                    <td className="py-3 pl-4 text-[#94A3B8]">{a.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
