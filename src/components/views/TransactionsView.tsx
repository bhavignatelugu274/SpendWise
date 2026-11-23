import React, { useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowUpDown,
  Download,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { ExpenseCategorizer } from '../../lib/categorizer';
import { exportTransactionsToCsv, parseTransactionsCsv } from '../../lib/csv';
import { formatINR, formatShortDate, getMonthKey } from '../../lib/formatters';
import {
  Category,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  PAYMENT_METHODS,
  PaymentMethod,
  Transaction,
  TransactionType,
} from '../../lib/types';

interface TransactionsViewProps {
  transactions: Transaction[];
  categorizer: ExpenseCategorizer;
  onAddTransaction: (tx: Omit<Transaction, 'id'>) => void;
  onUpdateTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onImportTransactions: (imported: Transaction[]) => void;
  onNotify: (type: 'success' | 'error' | 'info', title: string, description?: string) => void;
  externalAddModalOpen: boolean;
  onCloseExternalAddModal: () => void;
  onOpenExternalAddModal: () => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  transactions,
  categorizer,
  onAddTransaction,
  onUpdateTransaction,
  onDeleteTransaction,
  onImportTransactions,
  onNotify,
  externalAddModalOpen,
  onCloseExternalAddModal,
  onOpenExternalAddModal,
}) => {
  const [search, setSearch] = useState('');
  const [monthFilter, setMonthFilter] = useState<string>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [methodFilter, setMethodFilter] = useState<string>('All');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'>('date_desc');

  // Slide-over Add / Edit Drawer state
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [formDate, setFormDate] = useState('2026-11-22');
  const [formMerchant, setFormMerchant] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formType, setFormType] = useState<TransactionType>('expense');
  const [formCategory, setFormCategory] = useState<Category>('Dining');
  const [formCategoryTouched, setFormCategoryTouched] = useState(false);
  const [formMethod, setFormMethod] = useState<PaymentMethod>('UPI');
  const [formError, setFormError] = useState('');

  // CSV Import Modal state
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [csvSummary, setCsvSummary] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isDrawerOpen = externalAddModalOpen || editingTx !== null;

  const availableMonths = useMemo(
    () => Array.from(new Set(transactions.map((t) => getMonthKey(t.date)))).sort().reverse(),
    [transactions]
  );

  // Live ML / Rule prediction preview while typing in the Add/Edit drawer
  const livePrediction = useMemo(() => {
    if (!formMerchant.trim() && !formDesc.trim()) return null;
    return categorizer.predict(formMerchant, formDesc, formType);
  }, [categorizer, formMerchant, formDesc, formType]);

  const openNewDrawer = () => {
    setEditingTx(null);
    setFormDate('2026-11-22');
    setFormMerchant('');
    setFormDesc('');
    setFormAmount('');
    setFormType('expense');
    setFormCategory('Other');
    setFormCategoryTouched(false);
    setFormMethod('UPI');
    setFormError('');
    onOpenExternalAddModal();
  };

  const openEditDrawer = (tx: Transaction) => {
    setEditingTx(tx);
    setFormDate(tx.date);
    setFormMerchant(tx.merchant);
    setFormDesc(tx.description);
    setFormAmount(String(tx.amount));
    setFormType(tx.type);
    setFormCategory(tx.category);
    setFormCategoryTouched(true);
    setFormMethod(tx.paymentMethod);
    setFormError('');
  };

  const closeDrawer = () => {
    setEditingTx(null);
    setFormError('');
    onCloseExternalAddModal();
  };

  const handleMerchantOrDescChange = (nextMerchant: string, nextDesc: string, nextType: TransactionType) => {
    setFormMerchant(nextMerchant);
    setFormDesc(nextDesc);
    setFormType(nextType);
    if (!formCategoryTouched && (nextMerchant.trim() || nextDesc.trim())) {
      const pred = categorizer.predict(nextMerchant, nextDesc, nextType);
      setFormCategory(pred.category);
    }
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = Number(formAmount);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(formDate)) {
      setFormError('Please provide a valid date (YYYY-MM-DD).');
      return;
    }
    if (!formMerchant.trim()) {
      setFormError('Merchant name is required.');
      return;
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setFormError('Amount must be a positive number.');
      return;
    }

    const pred = categorizer.predict(formMerchant, formDesc || formMerchant, formType);
    const chosenCategory = formCategoryTouched ? formCategory : pred.category;
    const categorySource =
      formCategoryTouched && chosenCategory !== pred.category
        ? 'manual'
        : formCategoryTouched && editingTx
          ? editingTx.categorySource
          : pred.source;

    if (editingTx) {
      onUpdateTransaction({
        ...editingTx,
        date: formDate,
        merchant: formMerchant.trim(),
        description: formDesc.trim() || `${formMerchant.trim()} transaction`,
        amount: Math.round(numericAmount * 100) / 100,
        type: formType,
        category: chosenCategory,
        paymentMethod: formMethod,
        categorySource: formCategory !== editingTx.category ? 'manual' : categorySource,
        predictionConfidence: categorySource === 'ml_predicted' ? pred.confidence : undefined,
      });
      onNotify('success', 'Transaction updated', `${formMerchant.trim()} (${formatINR(numericAmount)}) saved.`);
    } else {
      onAddTransaction({
        date: formDate,
        merchant: formMerchant.trim(),
        description: formDesc.trim() || `${formMerchant.trim()} transaction`,
        amount: Math.round(numericAmount * 100) / 100,
        type: formType,
        category: chosenCategory,
        paymentMethod: formMethod,
        categorySource,
        predictionConfidence: categorySource === 'ml_predicted' ? pred.confidence : undefined,
        isSample: false,
      });
      onNotify('success', 'Transaction added', `${formMerchant.trim()} categorized as ${chosenCategory}.`);
    }

    closeDrawer();
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transactions
      .filter((t) => {
        if (monthFilter !== 'All' && getMonthKey(t.date) !== monthFilter) return false;
        if (categoryFilter !== 'All' && t.category !== categoryFilter) return false;
        if (methodFilter !== 'All' && t.paymentMethod !== methodFilter) return false;
        if (typeFilter !== 'All' && t.type !== typeFilter) return false;
        if (q) {
          const hay = `${t.merchant} ${t.description} ${t.category} ${t.paymentMethod}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'date_desc') return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
        if (sortBy === 'date_asc') return a.date > b.date ? 1 : a.date < b.date ? -1 : 0;
        if (sortBy === 'amount_desc') return b.amount - a.amount;
        return a.amount - b.amount;
      });
  }, [transactions, search, monthFilter, categoryFilter, methodFilter, typeFilter, sortBy]);

  const handleDownloadCsv = () => {
    const csv = exportTransactionsToCsv(filtered);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spendwise-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    onNotify('success', 'CSV exported', `${filtered.length} transactions downloaded.`);
  };

  const handleDownloadSampleTemplate = () => {
    const sample = [
      'Date,Merchant,Description,Amount,Category,Payment Method,Type',
      '2026-11-21,Swiggy,Dinner order,460,,UPI,expense',
      '2026-11-20,BigBasket,Fresh vegetables and staples,1320,,UPI,expense',
      '2026-11-19,Uber,Office cab ride,290,,UPI,expense',
      '2026-11-01,Employer Payroll,Monthly salary,95000,Salary,Debit Card,income',
    ].join('\n');
    const blob = new Blob([sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'spendwise-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCsvFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const res = parseTransactionsCsv(text, transactions, categorizer);

    setCsvErrors(res.errors);
    if (res.imported.length > 0) {
      onImportTransactions(res.imported);
      const summary = `Imported ${res.imported.length} new records${
        res.duplicateCount > 0 ? `, skipped ${res.duplicateCount} duplicates` : ''
      }.`;
      setCsvSummary(summary);
      onNotify('success', 'CSV Import Complete', summary);
    } else {
      setCsvSummary(
        res.duplicateCount > 0
          ? `0 new rows imported (${res.duplicateCount} duplicate records skipped).`
          : ''
      );
      if (res.errors.length > 0) {
        onNotify('error', 'CSV Import Issues', res.errors[0]);
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const categoryOptions = formType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="rounded-2xl bg-[#101827] border border-white/8 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input
              type="text"
              aria-label="Search transactions"
              placeholder="Search merchant, description, category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl bg-[#151F30] border border-white/10 pl-9 pr-3 py-2 text-xs text-[#F6F8FC] placeholder:text-[#94A3B8] focus:border-[#25E0A4]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                setCsvErrors([]);
                setCsvSummary('');
                setCsvModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-white/12 bg-[#151F30] text-xs font-medium text-[#F6F8FC] hover:bg-white/5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-[#6E8BFF]" aria-hidden="true" />
              Import CSV
            </button>
            <button
              type="button"
              onClick={handleDownloadCsv}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-white/12 bg-[#151F30] text-xs font-medium text-[#F6F8FC] hover:bg-white/5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#E7C68C]" aria-hidden="true" />
              Download CSV
            </button>
            <button
              type="button"
              onClick={openNewDrawer}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#25E0A4] text-[#070B14] text-xs font-semibold hover:bg-[#38ecc0] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              Add Transaction
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          <select
            aria-label="Filter by month"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="rounded-lg bg-[#151F30] border border-white/10 px-3 py-1.5 text-xs text-[#F6F8FC]"
          >
            <option value="All">All Months</option>
            {availableMonths.map((mk) => (
              <option key={mk} value={mk}>
                {mk}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg bg-[#151F30] border border-white/10 px-3 py-1.5 text-xs text-[#F6F8FC]"
          >
            <option value="All">All Categories</option>
            {[...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by payment method"
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="rounded-lg bg-[#151F30] border border-white/10 px-3 py-1.5 text-xs text-[#F6F8FC]"
          >
            <option value="All">All Payment Methods</option>
            {PAYMENT_METHODS.map((pm) => (
              <option key={pm} value={pm}>
                {pm}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by transaction type"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg bg-[#151F30] border border-white/10 px-3 py-1.5 text-xs text-[#F6F8FC]"
          >
            <option value="All">Expense &amp; Income</option>
            <option value="expense">Expenses Only</option>
            <option value="income">Income Only</option>
          </select>

          <div className="flex items-center gap-1.5 ml-auto text-xs text-[#94A3B8]">
            <ArrowUpDown className="w-3.5 h-3.5" aria-hidden="true" />
            <select
              aria-label="Sort transactions"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="rounded-lg bg-[#151F30] border border-white/10 px-2.5 py-1.5 text-xs text-[#F6F8FC]"
            >
              <option value="date_desc">Newest First</option>
              <option value="date_asc">Oldest First</option>
              <option value="amount_desc">Highest Amount</option>
              <option value="amount_asc">Lowest Amount</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-[#151F30] border border-white/8 overflow-hidden">
        <div className="px-5 py-3 border-b border-white/8 flex items-center justify-between text-xs text-[#94A3B8]">
          <span>
            Showing <strong className="text-[#F6F8FC] font-mono tabular-nums">{filtered.length}</strong> of{' '}
            <span className="font-mono tabular-nums">{transactions.length}</span> records
          </span>
          <span>Category Source: Naive Bayes ML · Rule Fallback · Manual</span>
        </div>

        {filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-[#94A3B8]">
            No transactions match your search or filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/8 bg-[#101827]/60 text-[#94A3B8]">
                  <th className="py-3 px-4 font-medium">Date</th>
                  <th className="py-3 px-4 font-medium">Merchant &amp; Description</th>
                  <th className="py-3 px-4 font-medium">Category</th>
                  <th className="py-3 px-4 font-medium">Assignment</th>
                  <th className="py-3 px-4 font-medium">Method</th>
                  <th className="py-3 px-4 font-medium text-right">Amount</th>
                  <th className="py-3 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/6">
                {filtered.slice(0, 120).map((tx) => (
                  <tr key={tx.id} className="hover:bg-white/[0.025] transition-colors">
                    <td className="py-3 px-4 font-mono tabular-nums text-[#94A3B8] whitespace-nowrap">
                      {formatShortDate(tx.date)}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-[#F6F8FC]">{tx.merchant}</p>
                      <p className="text-[11px] text-[#94A3B8] truncate max-w-xs">{tx.description}</p>
                    </td>
                    <td className="py-3 px-4 text-[#F6F8FC] font-medium whitespace-nowrap">
                      {tx.category}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-[11px]">
                      {tx.categorySource === 'ml_predicted' ? (
                        <span className="text-[#25E0A4]">
                          ML Predicted{tx.predictionConfidence ? ` (${Math.round(tx.predictionConfidence * 100)}%)` : ''}
                        </span>
                      ) : tx.categorySource === 'rule_matched' ? (
                        <span className="text-[#6E8BFF]">Rule Matched</span>
                      ) : (
                        <span className="text-[#94A3B8]">Manual</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-[#94A3B8] whitespace-nowrap">{tx.paymentMethod}</td>
                    <td
                      className={`py-3 px-4 text-right font-mono tabular-nums font-semibold whitespace-nowrap ${
                        tx.type === 'income' ? 'text-[#25E0A4]' : 'text-[#F6F8FC]'
                      }`}
                    >
                      {tx.type === 'income' ? '+' : '-'}
                      {formatINR(tx.amount)}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditDrawer(tx)}
                          aria-label={`Edit transaction ${tx.merchant} ${formatINR(tx.amount)}`}
                          className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#F6F8FC] hover:bg-white/5 transition-colors cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteTransaction(tx.id);
                            onNotify('info', 'Transaction deleted', `${tx.merchant} removed from ledger.`);
                          }}
                          aria-label={`Delete transaction ${tx.merchant} ${formatINR(tx.amount)}`}
                          className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#FF687B] hover:bg-[#FF687B]/10 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {filtered.length > 120 && (
          <div className="px-5 py-2.5 border-t border-white/8 text-xs text-[#94A3B8] text-center">
            Showing top 120 matching transactions. Use filters or CSV export to inspect all {filtered.length} rows.
          </div>
        )}
      </div>

      {/* Add / Edit Slide-Over Drawer */}
      {isDrawerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={editingTx ? 'Edit Transaction' : 'Add Transaction'}
          className="fixed inset-0 z-50 flex justify-end bg-black/65 backdrop-blur-xs"
        >
          <div className="w-full max-w-md bg-[#101827] border-l border-white/10 h-full overflow-y-auto p-6 flex flex-col justify-between shadow-2xl">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-white/8">
                <h2 className="font-display text-xl font-bold text-[#F6F8FC]">
                  {editingTx ? 'Edit Transaction' : 'Add Transaction'}
                </h2>
                <button
                  type="button"
                  onClick={closeDrawer}
                  aria-label="Close transaction drawer"
                  className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#F6F8FC] hover:bg-white/5 cursor-pointer"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>

              <form id="tx-form" onSubmit={handleSaveForm} className="mt-5 space-y-4">
                {formError && (
                  <div className="rounded-xl bg-[#FF687B]/10 border border-[#FF687B]/30 p-3 text-xs text-[#FF687B] flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>{formError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">
                    Transaction Type
                  </label>
                  <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[#070B14] border border-white/8">
                    {(['expense', 'income'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          handleMerchantOrDescChange(formMerchant, formDesc, t);
                          if (t === 'income') setFormCategory('Salary');
                        }}
                        className={`py-2 rounded-lg text-xs font-semibold capitalize transition-colors cursor-pointer ${
                          formType === t
                            ? 'bg-[#151F30] text-[#25E0A4]'
                            : 'text-[#94A3B8] hover:text-[#F6F8FC]'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="tx-date" className="block text-xs font-medium text-[#94A3B8] mb-1.5">
                      Date
                    </label>
                    <input
                      id="tx-date"
                      type="date"
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      required
                      className="w-full rounded-xl bg-[#151F30] border border-white/10 px-3 py-2 text-xs text-[#F6F8FC]"
                    />
                  </div>
                  <div>
                    <label htmlFor="tx-amount" className="block text-xs font-medium text-[#94A3B8] mb-1.5">
                      Amount (₹)
                    </label>
                    <input
                      id="tx-amount"
                      type="number"
                      min="1"
                      step="0.01"
                      placeholder="450"
                      value={formAmount}
                      onChange={(e) => setFormAmount(e.target.value)}
                      required
                      className="w-full rounded-xl bg-[#151F30] border border-white/10 px-3 py-2 text-xs font-mono tabular-nums text-[#F6F8FC]"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="tx-merchant" className="block text-xs font-medium text-[#94A3B8] mb-1.5">
                    Merchant
                  </label>
                  <input
                    id="tx-merchant"
                    type="text"
                    placeholder="e.g., Swiggy, Uber, BigBasket, BESCOM, Netflix"
                    value={formMerchant}
                    onChange={(e) => handleMerchantOrDescChange(e.target.value, formDesc, formType)}
                    required
                    className="w-full rounded-xl bg-[#151F30] border border-white/10 px-3 py-2 text-xs text-[#F6F8FC]"
                  />
                </div>

                <div>
                  <label htmlFor="tx-desc" className="block text-xs font-medium text-[#94A3B8] mb-1.5">
                    Description
                  </label>
                  <input
                    id="tx-desc"
                    type="text"
                    placeholder="e.g., Dinner order or weekly produce"
                    value={formDesc}
                    onChange={(e) => handleMerchantOrDescChange(formMerchant, e.target.value, formType)}
                    className="w-full rounded-xl bg-[#151F30] border border-white/10 px-3 py-2 text-xs text-[#F6F8FC]"
                  />
                </div>

                {/* Live Categorizer Feedback */}
                {livePrediction && (
                  <div className="rounded-xl bg-[#151F30] border border-white/8 p-3 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[#94A3B8]">Auto-Categorisation</span>
                      <span className="font-mono text-[#25E0A4]">
                        {livePrediction.source === 'ml_predicted'
                          ? `ML Predicted · ${Math.round(livePrediction.confidence * 100)}%`
                          : 'Rule Fallback'}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#94A3B8]">
                      Suggested: <strong className="text-[#F6F8FC]">{livePrediction.category}</strong> ·{' '}
                      {livePrediction.algorithmNote}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="tx-category" className="block text-xs font-medium text-[#94A3B8] mb-1.5">
                      Category
                    </label>
                    <select
                      id="tx-category"
                      value={formCategory}
                      onChange={(e) => {
                        setFormCategory(e.target.value as Category);
                        setFormCategoryTouched(true);
                      }}
                      className="w-full rounded-xl bg-[#151F30] border border-white/10 px-3 py-2 text-xs text-[#F6F8FC]"
                    >
                      {categoryOptions.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="tx-method" className="block text-xs font-medium text-[#94A3B8] mb-1.5">
                      Payment Method
                    </label>
                    <select
                      id="tx-method"
                      value={formMethod}
                      onChange={(e) => setFormMethod(e.target.value as PaymentMethod)}
                      className="w-full rounded-xl bg-[#151F30] border border-white/10 px-3 py-2 text-xs text-[#F6F8FC]"
                    >
                      {PAYMENT_METHODS.map((pm) => (
                        <option key={pm} value={pm}>
                          {pm}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </form>
            </div>

            <div className="pt-5 border-t border-white/8 flex items-center justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={closeDrawer}
                className="px-4 py-2 rounded-xl border border-white/12 text-xs font-medium text-[#94A3B8] hover:text-[#F6F8FC] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="tx-form"
                className="px-5 py-2 rounded-xl bg-[#25E0A4] text-[#070B14] text-xs font-semibold hover:bg-[#38ecc0] transition-colors cursor-pointer"
              >
                {editingTx ? 'Save Changes' : 'Save Transaction'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {csvModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Import Transactions CSV"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs"
        >
          <div className="w-full max-w-lg rounded-2xl bg-[#101827] border border-white/12 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/8">
              <h2 className="font-display text-lg font-bold text-[#F6F8FC]">Import CSV Statement</h2>
              <button
                type="button"
                onClick={() => setCsvModalOpen(false)}
                aria-label="Close CSV import modal"
                className="p-1 text-[#94A3B8] hover:text-[#F6F8FC] cursor-pointer"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <p className="text-xs text-[#94A3B8] leading-relaxed">
              Upload a CSV file containing <code className="text-[#F6F8FC]">Date</code>,{' '}
              <code className="text-[#F6F8FC]">Merchant</code>,{' '}
              <code className="text-[#F6F8FC]">Description</code>,{' '}
              <code className="text-[#F6F8FC]">Amount</code>, and optional{' '}
              <code className="text-[#F6F8FC]">Category</code>,{' '}
              <code className="text-[#F6F8FC]">Payment Method</code>, and{' '}
              <code className="text-[#F6F8FC]">Type</code> columns. Blank categories are auto-predicted via Naive Bayes; duplicates are automatically skipped.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#25E0A4] text-[#070B14] text-xs font-semibold hover:bg-[#38ecc0] cursor-pointer">
                <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                Choose CSV File
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleCsvFileChange}
                  className="sr-only"
                />
              </label>

              <button
                type="button"
                onClick={handleDownloadSampleTemplate}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-white/12 bg-[#151F30] text-xs font-medium text-[#F6F8FC] hover:bg-white/5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[#E7C68C]" aria-hidden="true" />
                Download Sample CSV Template
              </button>
            </div>

            {csvSummary && (
              <div className="rounded-xl bg-[#25E0A4]/10 border border-[#25E0A4]/25 p-3 text-xs text-[#25E0A4]">
                {csvSummary}
              </div>
            )}

            {csvErrors.length > 0 && (
              <div className="rounded-xl bg-[#FF687B]/10 border border-[#FF687B]/30 p-3 space-y-1 max-h-40 overflow-y-auto">
                <p className="text-xs font-semibold text-[#FF687B]">Validation Errors:</p>
                {csvErrors.map((err, idx) => (
                  <p key={idx} className="text-xs text-[#FF687B]/90">
                    {err}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
