import React from 'react';
import { formatINR } from '../lib/formatters';

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number | string;
    color?: string;
    dataKey?: string;
  }>;
  label?: string;
  currency?: boolean;
}

export const ChartTooltip: React.FC<ChartTooltipProps> = ({
  active,
  payload,
  label,
  currency = true,
}) => {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-xl bg-[#101827]/95 backdrop-blur-md border border-white/12 px-3.5 py-2.5 shadow-2xl text-xs">
      {label && <p className="font-semibold text-[#F6F8FC] mb-1.5">{label}</p>}
      <div className="space-y-1">
        {payload.map((entry, idx) => {
          if (entry.value === null || entry.value === undefined) return null;
          const numeric = typeof entry.value === 'number' ? entry.value : Number(entry.value);
          const formatted =
            currency && Number.isFinite(numeric) ? formatINR(numeric) : String(entry.value);
          return (
            <div key={`${entry.name ?? idx}`} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-[#94A3B8]">
                <span
                  className="inline-block w-2 h-2 rounded-xs shrink-0"
                  style={{ backgroundColor: entry.color ?? '#25E0A4' }}
                />
                {entry.name}
              </span>
              <span className="font-mono tabular-nums font-medium text-[#F6F8FC]">{formatted}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
