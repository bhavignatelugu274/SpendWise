import React from 'react';
import { Database, Download, RotateCcw, Sparkles, Trash2 } from 'lucide-react';
import { exportTransactionsToCsv } from '../../lib/csv';
import { BudgetConfig, DatasetMode, Transaction } from '../../lib/types';

interface SettingsViewProps {
  transactions: Transaction[];
  budgets: BudgetConfig;
  datasetMode: DatasetMode;
  onResetDemo: () => void;
  onClearAllData: () => void;
  onNotify: (type: 'success' | 'error' | 'info', title: string, description?: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  transactions,
  budgets,
  datasetMode,
  onResetDemo,
  onClearAllData,
  onNotify,
}) => {
  const manualCount = transactions.filter((t) => t.categorySource === 'manual').length;
  const mlCount = transactions.filter((t) => t.categorySource === 'ml_predicted').length;

  const handleDownloadBackupJson = () => {
    const payload = JSON.stringify({ transactions, budgets, exportedAt: new Date().toISOString() }, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spendwise-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onNotify('success', 'JSON backup exported', `${transactions.length} transactions saved.`);
  };

  const handleDownloadCsv = () => {
    const csv = exportTransactionsToCsv(transactions);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spendwise-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    onNotify('success', 'CSV ledger downloaded', `${transactions.length} records exported.`);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Storage & Privacy Architecture */}
      <section className="rounded-2xl bg-[#151F30] border border-white/8 p-6 space-y-4">
        <div className="flex items-start gap-3">
          <Database className="w-5 h-5 text-[#25E0A4] mt-0.5 shrink-0" aria-hidden="true" />
          <div>
            <h2 className="font-display text-lg font-semibold text-[#F6F8FC]">
              Local Browser Storage &amp; Privacy
            </h2>
            <p className="text-xs text-[#94A3B8] mt-1 leading-relaxed">
              SpendWise AI persists all transactions, budget targets, and manual category corrections in your browser&apos;s{' '}
              <code className="text-[#F6F8FC]">localStorage</code>. No banking passwords, UPI PINs, or financial credentials are ever requested or transmitted.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="rounded-xl bg-[#101827] border border-white/8 p-4">
            <p className="text-xs text-[#94A3B8]">Active Dataset Mode</p>
            <p className="mt-1 font-semibold text-sm text-[#F6F8FC]">
              {datasetMode === 'sample'
                ? 'Sample Data (14-Mo Demo)'
                : datasetMode === 'user'
                  ? 'Personal Ledger'
                  : 'Empty Workspace'}
            </p>
          </div>
          <div className="rounded-xl bg-[#101827] border border-white/8 p-4">
            <p className="text-xs text-[#94A3B8]">Stored Records</p>
            <p className="mt-1 font-mono tabular-nums font-semibold text-sm text-[#25E0A4]">
              {transactions.length} transactions
            </p>
          </div>
          <div className="rounded-xl bg-[#101827] border border-white/8 p-4">
            <p className="text-xs text-[#94A3B8]">Categorisation Split</p>
            <p className="mt-1 font-mono tabular-nums font-semibold text-sm text-[#6E8BFF]">
              {mlCount} ML · {manualCount} Manual
            </p>
          </div>
        </div>
      </section>

      {/* Demo & Workspace Controls */}
      <section className="rounded-2xl bg-[#151F30] border border-white/8 p-6 space-y-4">
        <h3 className="font-display text-base font-semibold text-[#F6F8FC]">
          Demo Mode &amp; Data Management
        </h3>
        <p className="text-xs text-[#94A3B8] leading-relaxed">
          For live presentations, use Reset Demo to restore the deterministic 14-month Indian synthetic expense dataset, or clear the workspace to upload your own CSV statement from scratch.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="button"
            onClick={onResetDemo}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#25E0A4] text-[#070B14] text-xs font-semibold hover:bg-[#38ecc0] transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            {datasetMode === 'sample' ? 'Reset Demo Dataset' : 'Load Sample Demo Dataset'}
          </button>

          <button
            type="button"
            onClick={onClearAllData}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#FF687B]/35 bg-[#FF687B]/10 text-xs font-semibold text-[#FF687B] hover:bg-[#FF687B]/20 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
            Clear All Data (Start Empty)
          </button>
        </div>
      </section>

      {/* Export Controls */}
      <section className="rounded-2xl bg-[#151F30] border border-white/8 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#E7C68C]" aria-hidden="true" />
          <h3 className="font-display text-base font-semibold text-[#F6F8FC]">
            Portable Backups
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleDownloadCsv}
            disabled={transactions.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/12 bg-[#101827] text-xs font-medium text-[#F6F8FC] hover:bg-white/5 disabled:opacity-40 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#E7C68C]" aria-hidden="true" />
            Export Transactions CSV
          </button>
          <button
            type="button"
            onClick={handleDownloadBackupJson}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/12 bg-[#101827] text-xs font-medium text-[#F6F8FC] hover:bg-white/5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#6E8BFF]" aria-hidden="true" />
            Export Full State JSON
          </button>
        </div>
      </section>
    </div>
  );
};
