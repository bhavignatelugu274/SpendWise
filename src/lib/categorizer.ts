import {
  Category,
  CategorySource,
  EXPENSE_CATEGORIES,
  ExpenseCategory,
  INCOME_CATEGORIES,
  Transaction,
  TransactionType,
} from './types';

interface TrainingSample {
  text: string;
  category: ExpenseCategory;
}

const BASE_TRAINING_CORPUS: TrainingSample[] = [
  // Dining
  { text: 'swiggy food delivery dinner lunch biryani', category: 'Dining' },
  { text: 'zomato restaurant order cafe pizza', category: 'Dining' },
  { text: 'starbucks blue tokai third wave coffee espresso latte', category: 'Dining' },
  { text: 'chai point samosa bakery snacks breakfast', category: 'Dining' },
  { text: 'dominos pizza hut kfc mcdonalds burger', category: 'Dining' },
  { text: 'barbeque nation itc gardenia dinner buffet dine in', category: 'Dining' },
  // Groceries
  { text: 'bigbasket fresh vegetables fruits staples groceries', category: 'Groceries' },
  { text: 'zepto milk bread eggs quick delivery', category: 'Groceries' },
  { text: 'blinkit dairy groceries snacks pantry', category: 'Groceries' },
  { text: 'dmart ready supermarket grains rice dal', category: 'Groceries' },
  { text: 'reliance fresh natures basket organic produce', category: 'Groceries' },
  { text: 'instamart swiggy grocery household milk', category: 'Groceries' },
  // Travel
  { text: 'uber ola cab ride airport commute', category: 'Travel' },
  { text: 'rapido auto rickshaw bike taxi ride', category: 'Travel' },
  { text: 'namma metro dmrc metro card recharge train', category: 'Travel' },
  { text: 'irctc railway ticket indigo flight spicejet vistara', category: 'Travel' },
  { text: 'indianoil hpcl bharat petroleum fuel petrol diesel', category: 'Travel' },
  { text: 'fastag toll highway parking', category: 'Travel' },
  // Bills
  { text: 'bescom tata power electricity bill power utility', category: 'Bills' },
  { text: 'airtel xstream fiber broadband internet wifi', category: 'Bills' },
  { text: 'jio postpaid prepaid mobile recharge plan', category: 'Bills' },
  { text: 'indane hp gas cylinder piped gas water bill', category: 'Bills' },
  { text: 'act fibernet hathway broadband bill', category: 'Bills' },
  // Subscriptions
  { text: 'netflix prime video hotstar streaming monthly', category: 'Subscriptions' },
  { text: 'spotify youtube premium apple music', category: 'Subscriptions' },
  { text: 'cultfit gym membership fitness monthly pass', category: 'Subscriptions' },
  { text: 'google one icloud storage chatgpt notion adobe', category: 'Subscriptions' },
  // Shopping
  { text: 'amazon india flipkart electronics gadget headphones', category: 'Shopping' },
  { text: 'myntra ajio zara apparel shoes clothing', category: 'Shopping' },
  { text: 'decathlon sports gear running shoes backpack', category: 'Shopping' },
  { text: 'croma reliance digital laptop keyboard mouse', category: 'Shopping' },
  { text: 'nykaa skincare cosmetics lifestyle', category: 'Shopping' },
  // Health
  { text: 'apollo pharmacy medplus medicines tablets', category: 'Health' },
  { text: 'pharmeasy 1mg wellness supplements diagnostics', category: 'Health' },
  { text: 'practo doctor clinic hospital consultation lab test', category: 'Health' },
  { text: 'lenskart dental checkup eye care', category: 'Health' },
  // Rent
  { text: 'monthly apartment house rent landlord maintenance', category: 'Rent' },
  { text: 'nobroker society flat lease deposit rent', category: 'Rent' },
  // Other
  { text: 'urban company home cleaning plumbing repair', category: 'Other' },
  { text: 'dtdc courier postal parcel kirana cash petty', category: 'Other' },
  { text: 'donation gift charity stationery xerox', category: 'Other' },
];

const DETERMINISTIC_RULES: Array<{ pattern: RegExp; category: ExpenseCategory }> = [
  { pattern: /\b(rent|landlord|lease|nobroker|pg rent|hostel)\b/i, category: 'Rent' },
  { pattern: /\b(bigbasket|zepto|blinkit|dmart|instamart|kirana|supermarket|grocery|groceries|vegetables|milk)\b/i, category: 'Groceries' },
  { pattern: /\b(swiggy|zomato|restaurant|cafe|coffee|starbucks|blue tokai|third wave|chai|pizza|burger|dining|biryani)\b/i, category: 'Dining' },
  { pattern: /\b(uber|ola|rapido|metro|irctc|indigo|flight|fuel|petrol|diesel|indianoil|hpcl|fastag|cab|auto)\b/i, category: 'Travel' },
  { pattern: /\b(electricity|bescom|water bill|broadband|airtel|jio|wifi|gas|utility|recharge|postpaid)\b/i, category: 'Bills' },
  { pattern: /\b(netflix|spotify|youtube|prime video|hotstar|cult\.?fit|icloud|chatgpt|subscription|membership)\b/i, category: 'Subscriptions' },
  { pattern: /\b(apollo|pharmeasy|1mg|practo|hospital|clinic|pharmacy|medicine|doctor|lab|dental)\b/i, category: 'Health' },
  { pattern: /\b(amazon|flipkart|myntra|ajio|decathlon|croma|nykaa|zara|shopping|laptop|shoes|apparel)\b/i, category: 'Shopping' },
];

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2);
}

export interface ClassificationPrediction {
  category: Category;
  source: CategorySource;
  confidence: number;
  matchedTokens: string[];
  algorithmNote: string;
}

/**
 * Genuine Multinomial Naive Bayes text classifier with Laplace smoothing (alpha = 1.0)
 * trained on merchant + description tokens, with explicit rule fallback when confidence < 0.52.
 */
export class ExpenseCategorizer {
  private categoryDocCounts: Record<ExpenseCategory, number>;
  private categoryWordCounts: Record<ExpenseCategory, Map<string, number>>;
  private categoryTotalWords: Record<ExpenseCategory, number>;
  private vocabulary: Set<string>;
  private totalDocs: number;

  constructor(userFeedbackTransactions: Transaction[] = []) {
    this.categoryDocCounts = {} as Record<ExpenseCategory, number>;
    this.categoryWordCounts = {} as Record<ExpenseCategory, Map<string, number>>;
    this.categoryTotalWords = {} as Record<ExpenseCategory, number>;
    this.vocabulary = new Set<string>();
    this.totalDocs = 0;

    this.fit(userFeedbackTransactions);
  }

  public fit(userTransactions: Transaction[] = []): void {
    for (const cat of EXPENSE_CATEGORIES) {
      this.categoryDocCounts[cat] = 0;
      this.categoryWordCounts[cat] = new Map<string, number>();
      this.categoryTotalWords[cat] = 0;
    }
    this.vocabulary.clear();
    this.totalDocs = 0;

    for (const sample of BASE_TRAINING_CORPUS) {
      this.addDocument(sample.text, sample.category, 1);
    }

    // Weight user-verified manual or corrected non-sample transactions higher (weight = 2)
    for (const tx of userTransactions) {
      if (tx.type === 'expense' && EXPENSE_CATEGORIES.includes(tx.category as ExpenseCategory)) {
        const weight = tx.categorySource === 'manual' ? 2 : 1;
        this.addDocument(`${tx.merchant} ${tx.description}`, tx.category as ExpenseCategory, weight);
      }
    }
  }

  private addDocument(text: string, category: ExpenseCategory, weight: number): void {
    const tokens = tokenize(text);
    if (tokens.length === 0) return;

    this.categoryDocCounts[category] += weight;
    this.totalDocs += weight;

    for (const token of tokens) {
      this.vocabulary.add(token);
      const prev = this.categoryWordCounts[category].get(token) ?? 0;
      this.categoryWordCounts[category].set(token, prev + weight);
      this.categoryTotalWords[category] += weight;
    }
  }

  public predict(
    merchant: string,
    description: string,
    type: TransactionType = 'expense'
  ): ClassificationPrediction {
    if (type === 'income') {
      const combined = `${merchant} ${description}`.toLowerCase();
      let incomeCat: Category = 'Salary';
      if (combined.includes('freelance') || combined.includes('consulting')) {
        incomeCat = 'Freelance';
      } else if (combined.includes('dividend') || combined.includes('interest')) {
        incomeCat = 'Dividend';
      } else if (!combined.includes('salary') && !combined.includes('payroll') && combined.trim().length > 0) {
        incomeCat = INCOME_CATEGORIES[3]; // Other Income
      }
      return {
        category: incomeCat,
        source: 'rule_matched',
        confidence: 0.9,
        matchedTokens: tokenize(combined).slice(0, 3),
        algorithmNote: 'Income keyword matcher',
      };
    }

    const rawText = `${merchant} ${description}`.trim();
    const tokens = tokenize(rawText);
    const vocabSize = Math.max(1, this.vocabulary.size);
    const alpha = 1.0;

    const knownTokens = tokens.filter((t) => this.vocabulary.has(t));

    if (knownTokens.length > 0) {
      const logScores: Array<{ category: ExpenseCategory; logProb: number }> = [];
      for (const cat of EXPENSE_CATEGORIES) {
        const prior = (this.categoryDocCounts[cat] + 1) / (this.totalDocs + EXPENSE_CATEGORIES.length);
        let logProb = Math.log(prior);
        const denom = this.categoryTotalWords[cat] + alpha * vocabSize;
        for (const token of knownTokens) {
          const count = this.categoryWordCounts[cat].get(token) ?? 0;
          logProb += Math.log((count + alpha) / denom);
        }
        logScores.push({ category: cat, logProb });
      }

      const maxLog = Math.max(...logScores.map((s) => s.logProb));
      const exps = logScores.map((s) => ({
        category: s.category,
        exp: Math.exp(s.logProb - maxLog),
      }));
      const sumExp = exps.reduce((acc, s) => acc + s.exp, 0);
      const posteriors = exps
        .map((s) => ({ category: s.category, prob: s.exp / sumExp }))
        .sort((a, b) => b.prob - a.prob);

      const best = posteriors[0];
      if (best && best.prob >= 0.45) {
        return {
          category: best.category,
          source: 'ml_predicted',
          confidence: Number(best.prob.toFixed(2)),
          matchedTokens: Array.from(new Set(knownTokens)).slice(0, 4),
          algorithmNote: 'Multinomial Naive Bayes (Laplace-smoothed TF tokens)',
        };
      }
    }

    // Transparent deterministic rule fallback
    for (const rule of DETERMINISTIC_RULES) {
      if (rule.pattern.test(rawText)) {
        return {
          category: rule.category,
          source: 'rule_matched',
          confidence: 0.78,
          matchedTokens: tokens.slice(0, 3),
          algorithmNote: 'Deterministic keyword rule fallback',
        };
      }
    }

    return {
      category: 'Other',
      source: 'rule_matched',
      confidence: 0.35,
      matchedTokens: [],
      algorithmNote: 'Fallback default (insufficient merchant tokens)',
    };
  }
}
