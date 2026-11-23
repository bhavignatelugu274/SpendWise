import { ExpenseCategorizer } from './categorizer';
import {
  Category,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  PAYMENT_METHODS,
  PaymentMethod,
  Transaction,
  TransactionType,
} from './types';

export interface CsvImportResult {
  imported: Transaction[];
  duplicateCount: number;
  errors: string[];
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function normalizeDate(raw: string): string | null {
  const cleaned = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    const d = new Date(`${cleaned}T00:00:00`);
    return Number.isNaN(d.getTime()) ? null : cleaned;
  }
  // Support DD/MM/YYYY or DD-MM-YYYY
  const dmy = cleaned.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);
  if (dmy) {
    const iso = `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
    const d = new Date(`${iso}T00:00:00`);
    return Number.isNaN(d.getTime()) ? null : iso;
  }
  return null;
}

function normalizePaymentMethod(raw: string): PaymentMethod {
  const lower = raw.trim().toLowerCase();
  if (lower.includes('upi') || lower.includes('gpay') || lower.includes('phonepe')) return 'UPI';
  if (lower.includes('credit')) return 'Credit Card';
  if (lower.includes('debit')) return 'Debit Card';
  if (lower.includes('cash')) return 'Cash';
  return 'UPI';
}

function normalizeCategory(raw: string): Category | null {
  const lower = raw.trim().toLowerCase();
  const all = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];
  const matched = all.find((c) => c.toLowerCase() === lower);
  return matched ?? null;
}

function txSignature(t: { date: string; merchant: string; amount: number; type: string }): string {
  return `${t.date}|${t.merchant.trim().toLowerCase()}|${Math.round(t.amount * 100)}|${t.type}`;
}

export function parseTransactionsCsv(
  csvContent: string,
  existingTransactions: Transaction[],
  categorizer: ExpenseCategorizer
): CsvImportResult {
  const lines = csvContent
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    return {
      imported: [],
      duplicateCount: 0,
      errors: [
        'CSV file must include a header row and at least one transaction row (columns: Date, Merchant, Description, Amount, Category, Payment Method, Type).',
      ],
    };
  }

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z]/g, ''));

  const findCol = (...aliases: string[]) => headers.findIndex((h) => aliases.includes(h));

  const dateIdx = findCol('date', 'transactiondate', 'txndate');
  const merchantIdx = findCol('merchant', 'payee', 'vendor', 'name');
  const descIdx = findCol('description', 'narration', 'notes', 'memo', 'details');
  const amountIdx = findCol('amount', 'value', 'inr', 'amt');
  const catIdx = findCol('category', 'cat');
  const methodIdx = findCol('paymentmethod', 'method', 'payment', 'mode', 'channel');
  const typeIdx = findCol('type', 'transactiontype', 'txntype', 'kind');

  const missing: string[] = [];
  if (dateIdx === -1) missing.push('Date');
  if (amountIdx === -1) missing.push('Amount');
  if (merchantIdx === -1 && descIdx === -1) missing.push('Merchant or Description');

  if (missing.length > 0) {
    return {
      imported: [],
      duplicateCount: 0,
      errors: [
        `Invalid CSV header structure. Missing required column(s): ${missing.join(', ')}. Expected headers like: Date,Merchant,Description,Amount,Category,Payment Method,Type`,
      ],
    };
  }

  const seenSignatures = new Set(existingTransactions.map(txSignature));
  const imported: Transaction[] = [];
  const errors: string[] = [];
  let duplicateCount = 0;

  for (let rowIdx = 1; rowIdx < lines.length; rowIdx++) {
    const cols = parseCsvLine(lines[rowIdx]);
    const lineNo = rowIdx + 1;

    const rawDate = cols[dateIdx] ?? '';
    const isoDate = normalizeDate(rawDate);
    if (!isoDate) {
      errors.push(`Row ${lineNo}: Invalid date "${rawDate}". Use YYYY-MM-DD or DD/MM/YYYY.`);
      continue;
    }

    const rawAmount = (cols[amountIdx] ?? '').replace(/[₹,\s]/g, '');
    const amount = Number(rawAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      errors.push(`Row ${lineNo}: Invalid positive amount "${cols[amountIdx] ?? ''}".`);
      continue;
    }

    const merchant = (merchantIdx >= 0 ? cols[merchantIdx] : cols[descIdx])?.trim() || 'Unknown Merchant';
    const description =
      (descIdx >= 0 ? cols[descIdx] : cols[merchantIdx])?.trim() || `${merchant} transaction`;

    const rawType = (typeIdx >= 0 ? cols[typeIdx] : 'expense').toLowerCase();
    const type: TransactionType = rawType.includes('inc') || rawType.includes('credit') ? 'income' : 'expense';

    const paymentMethod = methodIdx >= 0 ? normalizePaymentMethod(cols[methodIdx] ?? '') : 'UPI';

    const rawCategory = catIdx >= 0 ? cols[catIdx] ?? '' : '';
    const explicitCategory = rawCategory ? normalizeCategory(rawCategory) : null;

    let category: Category;
    let categorySource: Transaction['categorySource'];
    let predictionConfidence: number | undefined;

    if (explicitCategory) {
      category = explicitCategory;
      categorySource = 'manual';
    } else {
      const pred = categorizer.predict(merchant, description, type);
      category = pred.category;
      categorySource = pred.source;
      predictionConfidence = pred.confidence;
    }

    const sig = txSignature({ date: isoDate, merchant, amount, type });
    if (seenSignatures.has(sig)) {
      duplicateCount++;
      continue;
    }
    seenSignatures.add(sig);

    imported.push({
      id: `csv-${Date.now()}-${rowIdx}`,
      date: isoDate,
      merchant,
      description,
      amount: Math.round(amount * 100) / 100,
      category,
      paymentMethod,
      type,
      categorySource,
      predictionConfidence,
      isSample: false,
    });
  }

  return { imported, duplicateCount, errors };
}

function escapeCsvField(val: string | number): string {
  const str = String(val);
  // Protect spreadsheets from formula injection
  const safe = /^[=+\-@]/.test(str) ? `'${str}` : str;
  if (safe.includes(',') || safe.includes('"') || safe.includes('\n')) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

export function exportTransactionsToCsv(transactions: Transaction[]): string {
  const header = ['Date', 'Merchant', 'Description', 'Amount', 'Category', 'Payment Method', 'Type', 'Categorization Source'];
  const rows = transactions.map((t) =>
    [
      escapeCsvField(t.date),
      escapeCsvField(t.merchant),
      escapeCsvField(t.description),
      escapeCsvField(t.amount),
      escapeCsvField(t.category),
      escapeCsvField(t.paymentMethod),
      escapeCsvField(t.type),
      escapeCsvField(t.categorySource),
    ].join(',')
  );
  return [header.join(','), ...rows].join('\n');
}
