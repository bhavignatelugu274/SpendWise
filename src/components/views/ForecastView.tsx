import React from 'react';
import { AlertTriangle, BrainCircuit, CheckCircle2, Info, TrendingUp } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartTooltip } from '../ChartTooltip';
import { generateForecast } from '../../lib/forecasting';
import { formatCompactINR, formatINR, formatPct } from '../../lib/formatters';
import { BudgetConfig, Transaction } from '../../lib/types';

interface ForecastViewProps {
  transactions: Transaction[];
  budgets: BudgetConfig;
}

export const ForecastView: React.FC<ForecastViewProps> = ({ transactions, budgets }) => {
  const forecast = generateForecast(transactions, budgets);

  return (
    <div className="space-y-6">
      {/* Model Header & Prediction Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-5 rounded-2xl bg-[#151F30] border border-white/8 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-xs font-semibold text-[#6E8BFF] flex items-center gap-1.5">
                <BrainCircuit className="w-4 h-4" aria-hidden="true" />
                {forecast.modelLabel}
              </span>
              <span className="text-xs text-[#94A3B8] font-mono tabular-nums">
                {forecast.completeMonthsCount} complete mo.
              </span>
            </div>

            <p className="text-xs text-[#94A3B8]">
              Predicted Total Expense for <strong className="text-[#F6F8FC]">{forecast.targetMonthLabel}</strong>
            </p>
            <p className="mt-2 font-mono tabular-nums text-3xl sm:text-4xl font-bold text-[#F6F8FC]">
              {forecast.predictedTotal !== null ? formatINR(forecast.predictedTotal) : 'Insufficient Data'}
            </p>
            <p className="mt-2 text-xs text-[#94A3B8] leading-relaxed">{forecast.explanation}</p>
          </div>

          <div className="mt-5 pt-4 border-t border-white/8 grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-[#94A3B8]">Rolling 3-Mo Baseline</p>
              <p className="mt-1 font-mono tabular-nums font-semibold text-[#E7C68C]">
                {forecast.baselineTotal !== null ? formatINR(forecast.baselineTotal) : '—'}
              </p>
            </div>
            <div>
              <p className="text-[#94A3B8]">Expected Budget Overshoot</p>
              <p
                className={`mt-1 font-mono tabular-nums font-semibold ${
                  forecast.expectedBudgetOvershoot !== null && forecast.expectedBudgetOvershoot > 0
                    ? 'text-[#F6B960]'
                    : 'text-[#25E0A4]'
                }`}
              >
                {forecast.expectedBudgetOvershoot === null
                  ? 'No Budget Set'
                  : forecast.expectedBudgetOvershoot > 0
                    ? `+${formatINR(forecast.expectedBudgetOvershoot)}`
                    : '₹0 (Within Budget)'}
              </p>
            </div>
          </div>
        </div>

        {/* Model Performance Card */}
        <div className="lg:col-span-7 rounded-2xl bg-[#151F30] border border-white/8 p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="font-display text-lg font-semibold text-[#F6F8FC]">
                Model Performance (Chronological Holdout)
              </h2>
              <p className="text-xs text-[#94A3B8]">{forecast.algorithmName}</p>
            </div>
            <span className="text-xs text-[#94A3B8] font-mono tabular-nums">
              Train: {forecast.metrics.ml.trainSampleSize || forecast.metrics.baseline.trainSampleSize} mo · Test:{' '}
              {forecast.metrics.ml.testSampleSize || forecast.metrics.baseline.testSampleSize} mo
            </span>
          </div>

          {forecast.modelLabel === 'Insufficient Data' ? (
            <div className="rounded-xl bg-[#101827] border border-white/8 p-5 text-xs text-[#94A3B8] flex items-start gap-3">
              <Info className="w-4 h-4 text-[#6E8BFF] shrink-0 mt-0.5" aria-hidden="true" />
              <p>
                Validation metrics require at least 2 complete historical months for a baseline and 6+ complete months for chronological Ridge Regression train/test evaluation.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/8 text-[#94A3B8]">
                    <th className="py-2.5 font-medium">Model</th>
                    <th className="py-2.5 font-medium text-right">MAE</th>
                    <th className="py-2.5 font-medium text-right">RMSE</th>
                    <th className="py-2.5 font-medium text-right">MAPE</th>
                    <th className="py-2.5 font-medium text-right">R²</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/6">
                  <tr>
                    <td className="py-3 font-medium text-[#25E0A4]">
                      Ridge Regression (7 Features)
                    </td>
                    <td className="py-3 text-right font-mono tabular-nums text-[#F6F8FC]">
                      {forecast.metrics.ml.mae !== null ? formatINR(forecast.metrics.ml.mae) : '—'}
                    </td>
                    <td className="py-3 text-right font-mono tabular-nums text-[#F6F8FC]">
                      {forecast.metrics.ml.rmse !== null ? formatINR(forecast.metrics.ml.rmse) : '—'}
                    </td>
                    <td className="py-3 text-right font-mono tabular-nums text-[#F6F8FC]">
                      {forecast.metrics.ml.mape !== null ? formatPct(forecast.metrics.ml.mape) : '—'}
                    </td>
                    <td className="py-3 text-right font-mono tabular-nums text-[#F6F8FC]">
                      {forecast.metrics.ml.r2 !== null ? forecast.metrics.ml.r2.toFixed(3) : '—'}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 font-medium text-[#E7C68C]">
                      Trailing 3-Month Rolling Baseline
                    </td>
                    <td className="py-3 text-right font-mono tabular-nums text-[#F6F8FC]">
                      {forecast.metrics.baseline.mae !== null
                        ? formatINR(forecast.metrics.baseline.mae)
                        : '—'}
                    </td>
                    <td className="py-3 text-right font-mono tabular-nums text-[#F6F8FC]">
                      {forecast.metrics.baseline.rmse !== null
                        ? formatINR(forecast.metrics.baseline.rmse)
                        : '—'}
                    </td>
                    <td className="py-3 text-right font-mono tabular-nums text-[#F6F8FC]">
                      {forecast.metrics.baseline.mape !== null
                        ? formatPct(forecast.metrics.baseline.mape)
                        : '—'}
                    </td>
                    <td className="py-3 text-right font-mono tabular-nums text-[#F6F8FC]">
                      {forecast.metrics.baseline.r2 !== null
                        ? forecast.metrics.baseline.r2.toFixed(3)
                        : '—'}
                    </td>
                  </tr>
                </tbody>
              </table>
              <p className="mt-3 text-[11px] text-[#94A3B8]">
                All metrics computed strictly on held-out chronological test months using training-split StandardScaler parameters (zero data leakage).
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Historical vs Predicted Chart + Feature Importance */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 rounded-2xl bg-[#151F30] border border-white/8 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display text-base font-semibold text-[#F6F8FC] flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#25E0A4]" aria-hidden="true" />
                Historical vs. Predicted Trajectory
              </h3>
              <p className="text-xs text-[#94A3B8]">
                Chronological train/test split &amp; {forecast.targetMonthLabel} forecast
              </p>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={forecast.series}>
                <CartesianGrid stroke="rgba(148,163,184,0.1)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={formatCompactINR} tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="actual" name="Actual Expense" fill="#25E0A4" radius={[4, 4, 0, 0]} />
                <Line
                  type="monotone"
                  dataKey="mlPredicted"
                  name="ML Forecast"
                  stroke="#6E8BFF"
                  strokeWidth={2.5}
                  dot={{ r: 3.5 }}
                />
                <Line
                  type="monotone"
                  dataKey="baselinePredicted"
                  name="Baseline Rolling Avg"
                  stroke="#E7C68C"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-5 rounded-2xl bg-[#151F30] border border-white/8 p-5">
          <h3 className="font-display text-base font-semibold text-[#F6F8FC]">
            Standardized Ridge Feature Weights
          </h3>
          <p className="text-xs text-[#94A3B8] mb-4">
            Relative impact of engineered temporal features on next-month spend
          </p>

          {forecast.featureWeights.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#94A3B8]">
              Available once Ridge Regression activates (6+ complete months).
            </div>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={forecast.featureWeights} layout="vertical" margin={{ left: 32 }}>
                  <CartesianGrid stroke="rgba(148,163,184,0.1)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="feature" width={125} tick={{ fill: '#F6F8FC', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip currency={false} />} />
                  <Bar dataKey="weight" name="Standardized Weight (₹)" fill="#6E8BFF" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Category-Wise Forecast Table */}
      <div className="rounded-2xl bg-[#151F30] border border-white/8 p-5">
        <h3 className="font-display text-base font-semibold text-[#F6F8FC] mb-1">
          Category-Wise Next-Month Forecast ({forecast.targetMonthLabel})
        </h3>
        <p className="text-xs text-[#94A3B8] mb-4">
          Dampened linear trend + trailing 3-month rolling blend compared against category budgets
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/8 text-[#94A3B8]">
                <th className="py-2.5 font-medium">Category</th>
                <th className="py-2.5 font-medium text-right">Last Complete Mo.</th>
                <th className="py-2.5 font-medium text-right">3-Mo Rolling Avg</th>
                <th className="py-2.5 font-medium text-right">Predicted Next Mo.</th>
                <th className="py-2.5 font-medium text-right">Budget Target</th>
                <th className="py-2.5 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/6">
              {forecast.categoryForecasts.map((row) => (
                <tr key={row.category} className="hover:bg-white/[0.02]">
                  <td className="py-3 font-medium text-[#F6F8FC]">{row.category}</td>
                  <td className="py-3 text-right font-mono tabular-nums text-[#94A3B8]">
                    {formatINR(row.lastCompleteMonth)}
                  </td>
                  <td className="py-3 text-right font-mono tabular-nums text-[#94A3B8]">
                    {formatINR(row.trailing3MoAvg)}
                  </td>
                  <td className="py-3 text-right font-mono tabular-nums font-semibold text-[#F6F8FC]">
                    {row.predictedAmount !== null ? formatINR(row.predictedAmount) : '—'}
                  </td>
                  <td className="py-3 text-right font-mono tabular-nums text-[#94A3B8]">
                    {row.budget > 0 ? formatINR(row.budget) : '—'}
                  </td>
                  <td className="py-3 text-right whitespace-nowrap">
                    {row.predictedAmount === null ? (
                      <span className="text-[#94A3B8]">Insufficient Data</span>
                    ) : row.budget <= 0 ? (
                      <span className="text-[#94A3B8]">No Limit</span>
                    ) : row.expectedOvershoot > 0 ? (
                      <span className="inline-flex items-center gap-1 text-[#F6B960] font-mono tabular-nums">
                        <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                        +{formatINR(row.expectedOvershoot)} over
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[#25E0A4]">
                        <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                        On Track
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
