import { BudgetConfig, ExpenseCategory, PaymentMethod, Transaction } from './types';

function createRng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function getDaysInYearMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export const DEFAULT_DEMO_BUDGETS: BudgetConfig = {
  totalMonthlyBudget: 62000,
  monthlySavingsGoal: 25000,
  categoryBudgets: {
    Rent: 22000,
    Groceries: 9000,
    Dining: 7500,
    Travel: 5000,
    Bills: 5500,
    Shopping: 6500,
    Health: 2500,
    Subscriptions: 1800,
    Other: 2200,
  },
};

export const EMPTY_BUDGETS: BudgetConfig = {
  totalMonthlyBudget: 0,
  monthlySavingsGoal: 0,
  categoryBudgets: {
    Rent: 0,
    Groceries: 0,
    Dining: 0,
    Travel: 0,
    Bills: 0,
    Shopping: 0,
    Health: 0,
    Subscriptions: 0,
    Other: 0,
  },
};

interface MerchantTemplate {
  merchant: string;
  description: string;
  category: ExpenseCategory;
  min: number;
  max: number;
  methods: PaymentMethod[];
}

const GROCERY_TEMPLATES: MerchantTemplate[] = [
  { merchant: 'BigBasket', description: 'Weekly fresh produce & staples', category: 'Groceries', min: 850, max: 2150, methods: ['UPI', 'Credit Card'] },
  { merchant: 'Zepto', description: 'Quick essentials & dairy delivery', category: 'Groceries', min: 220, max: 680, methods: ['UPI'] },
  { merchant: 'Blinkit', description: 'Household groceries & snacks', category: 'Groceries', min: 290, max: 820, methods: ['UPI', 'Debit Card'] },
  { merchant: 'DMart Ready', description: 'Monthly pantry & grains refill', category: 'Groceries', min: 1450, max: 2800, methods: ['Debit Card', 'Credit Card'] },
  { merchant: 'Reliance Fresh', description: 'Fruits & vegetables', category: 'Groceries', min: 320, max: 740, methods: ['UPI', 'Cash'] },
];

const DINING_TEMPLATES: MerchantTemplate[] = [
  { merchant: 'Swiggy', description: 'Dinner food delivery order', category: 'Dining', min: 280, max: 740, methods: ['UPI', 'Credit Card'] },
  { merchant: 'Zomato', description: 'Weekend lunch & biryani order', category: 'Dining', min: 340, max: 960, methods: ['UPI', 'Credit Card'] },
  { merchant: 'Third Wave Coffee', description: 'Specialty pour-over & croissant', category: 'Dining', min: 240, max: 520, methods: ['UPI'] },
  { merchant: 'Blue Tokai', description: 'Cold brew & sandwich', category: 'Dining', min: 260, max: 490, methods: ['UPI', 'Debit Card'] },
  { merchant: 'Biryani Blues', description: 'Family dinner dine-in', category: 'Dining', min: 650, max: 1450, methods: ['Credit Card', 'UPI'] },
  { merchant: 'Chai Point', description: 'Evening tea & snacks', category: 'Dining', min: 95, max: 240, methods: ['UPI', 'Cash'] },
];

const TRAVEL_TEMPLATES: MerchantTemplate[] = [
  { merchant: 'Uber', description: 'Office & city cab commute', category: 'Travel', min: 180, max: 560, methods: ['UPI'] },
  { merchant: 'Ola Cabs', description: 'Airport / station ride', category: 'Travel', min: 210, max: 890, methods: ['UPI', 'Debit Card'] },
  { merchant: 'Namma Metro', description: 'Metro smart card recharge', category: 'Travel', min: 200, max: 500, methods: ['UPI'] },
  { merchant: 'IndianOil', description: 'Two-wheeler / car fuel refill', category: 'Travel', min: 550, max: 1650, methods: ['UPI', 'Credit Card'] },
  { merchant: 'Rapido', description: 'Quick bike taxi ride', category: 'Travel', min: 65, max: 170, methods: ['UPI', 'Cash'] },
];

const SHOPPING_TEMPLATES: MerchantTemplate[] = [
  { merchant: 'Amazon India', description: 'Home electronics & accessories', category: 'Shopping', min: 699, max: 3200, methods: ['Credit Card', 'UPI'] },
  { merchant: 'Myntra', description: 'Apparel & casual footwear', category: 'Shopping', min: 899, max: 2799, methods: ['Credit Card', 'Debit Card'] },
  { merchant: 'Flipkart', description: 'Books & desk peripherals', category: 'Shopping', min: 450, max: 2100, methods: ['UPI', 'Credit Card'] },
  { merchant: 'Decathlon', description: 'Running shoes & fitness gear', category: 'Shopping', min: 799, max: 2499, methods: ['Debit Card', 'UPI'] },
];

const HEALTH_TEMPLATES: MerchantTemplate[] = [
  { merchant: 'Apollo Pharmacy', description: 'Prescription medicines & vitamins', category: 'Health', min: 320, max: 1150, methods: ['UPI', 'Cash'] },
  { merchant: 'PharmEasy', description: 'Monthly wellness supplements', category: 'Health', min: 450, max: 1350, methods: ['UPI', 'Debit Card'] },
  { merchant: 'Practo', description: 'Specialist consultation & lab test', category: 'Health', min: 600, max: 1600, methods: ['Credit Card', 'UPI'] },
];

const OTHER_TEMPLATES: MerchantTemplate[] = [
  { merchant: 'Urban Company', description: 'Home cleaning & maintenance', category: 'Other', min: 499, max: 1399, methods: ['UPI'] },
  { merchant: 'Local Kirana', description: 'Cash petty household items', category: 'Other', min: 140, max: 450, methods: ['Cash'] },
  { merchant: 'DTDC Courier', description: 'Parcel dispatch charges', category: 'Other', min: 180, max: 520, methods: ['Cash', 'UPI'] },
];

/**
 * Generates a deterministic 14-month Indian personal expense dataset
 * from 2025-10 through 2026-11 (up to 2026-11-22) for demo presentation.
 */
export function generateDemoTransactions(): Transaction[] {
  const rng = createRng(4202611);
  const transactions: Transaction[] = [];
  let seq = 1;

  const pick = <T,>(arr: T[]): T => arr[Math.floor(rng() * arr.length)];
  const randInt = (min: number, max: number) => Math.round(min + rng() * (max - min));

  // 14 months: 2025-10 .. 2026-11
  const startYear = 2025;
  const startMonth = 10; // 1-indexed
  const totalMonths = 14;

  for (let mIdx = 0; mIdx < totalMonths; mIdx++) {
    const absMonth = startMonth - 1 + mIdx;
    const year = startYear + Math.floor(absMonth / 12);
    const month = (absMonth % 12) + 1;
    const isCurrentMonth = year === 2026 && month === 11;
    const maxDay = isCurrentMonth ? 22 : getDaysInYearMonth(year, month);
    const ym = `${year}-${pad2(month)}`;

    // Subtle upward trend & seasonality (Diwali Oct/Nov festive bump)
    const inflationTrend = 1 + mIdx * 0.012;
    const festiveMultiplier = month === 10 || month === 11 ? 1.18 : 1.0;

    // 1. Salary (1st of month)
    transactions.push({
      id: `demo-${seq++}`,
      date: `${ym}-01`,
      description: 'Monthly Salary Credit — TechCorp India',
      merchant: 'TechCorp Payroll',
      amount: 92000 + (mIdx >= 6 ? 6000 : 0),
      category: 'Salary',
      paymentMethod: 'Debit Card',
      type: 'income',
      categorySource: 'manual',
      isSample: true,
    });

    // Occasional freelance project income every 3rd month
    if (mIdx % 3 === 2) {
      transactions.push({
        id: `demo-${seq++}`,
        date: `${ym}-${pad2(Math.min(14, maxDay))}`,
        description: 'Data Analytics Consulting Milestone',
        merchant: 'Freelance Client',
        amount: randInt(12000, 18500),
        category: 'Freelance',
        paymentMethod: 'UPI',
        type: 'income',
        categorySource: 'manual',
        isSample: true,
      });
    }

    // 2. Rent (3rd of month)
    transactions.push({
      id: `demo-${seq++}`,
      date: `${ym}-03`,
      description: 'Monthly Apartment Rent Transfer',
      merchant: 'Prestige Residency',
      amount: mIdx >= 8 ? 22500 : 21500,
      category: 'Rent',
      paymentMethod: 'UPI',
      type: 'expense',
      categorySource: 'rule_matched',
      isSample: true,
    });

    // 3. Bills (Electricity, Broadband, Mobile)
    transactions.push({
      id: `demo-${seq++}`,
      date: `${ym}-05`,
      description: 'BESCOM Electricity Bill Payment',
      merchant: 'BESCOM',
      amount: Math.round(randInt(1650, 2650) * (month >= 4 && month <= 6 ? 1.25 : 1)),
      category: 'Bills',
      paymentMethod: 'UPI',
      type: 'expense',
      categorySource: 'ml_predicted',
      predictionConfidence: 0.94,
      isSample: true,
    });

    transactions.push({
      id: `demo-${seq++}`,
      date: `${ym}-07`,
      description: 'Airtel Xstream Fiber Broadband',
      merchant: 'Airtel',
      amount: 1179,
      category: 'Bills',
      paymentMethod: 'UPI',
      type: 'expense',
      categorySource: 'ml_predicted',
      predictionConfidence: 0.91,
      isSample: true,
    });

    transactions.push({
      id: `demo-${seq++}`,
      date: `${ym}-10`,
      description: 'Jio Postpaid Mobile Plan',
      merchant: 'Jio',
      amount: 707,
      category: 'Bills',
      paymentMethod: 'Debit Card',
      type: 'expense',
      categorySource: 'rule_matched',
      isSample: true,
    });

    // 4. Subscriptions
    transactions.push({
      id: `demo-${seq++}`,
      date: `${ym}-08`,
      description: 'Netflix Standard Monthly Plan',
      merchant: 'Netflix',
      amount: 649,
      category: 'Subscriptions',
      paymentMethod: 'Credit Card',
      type: 'expense',
      categorySource: 'ml_predicted',
      predictionConfidence: 0.97,
      isSample: true,
    });

    transactions.push({
      id: `demo-${seq++}`,
      date: `${ym}-12`,
      description: 'Spotify Premium & YouTube Premium',
      merchant: 'Spotify',
      amount: 318,
      category: 'Subscriptions',
      paymentMethod: 'Credit Card',
      type: 'expense',
      categorySource: 'ml_predicted',
      predictionConfidence: 0.95,
      isSample: true,
    });

    if (maxDay >= 18) {
      transactions.push({
        id: `demo-${seq++}`,
        date: `${ym}-18`,
        description: 'Cult.fit Monthly Membership',
        merchant: 'Cult.fit',
        amount: 850,
        category: 'Subscriptions',
        paymentMethod: 'UPI',
        type: 'expense',
        categorySource: 'rule_matched',
        isSample: true,
      });
    }

    // 5. Groceries (6-8 trips per month)
    const groceryCount = isCurrentMonth ? 6 : randInt(6, 8);
    for (let i = 0; i < groceryCount; i++) {
      const tmpl = pick(GROCERY_TEMPLATES);
      const day = randInt(1, maxDay);
      transactions.push({
        id: `demo-${seq++}`,
        date: `${ym}-${pad2(day)}`,
        description: tmpl.description,
        merchant: tmpl.merchant,
        amount: Math.round(randInt(tmpl.min, tmpl.max) * inflationTrend),
        category: 'Groceries',
        paymentMethod: pick(tmpl.methods),
        type: 'expense',
        categorySource: 'ml_predicted',
        predictionConfidence: 0.92,
        isSample: true,
      });
    }

    // 6. Dining (9-13 transactions, higher on weekends & current month pace)
    const diningCount = isCurrentMonth ? 11 : randInt(9, 13);
    for (let i = 0; i < diningCount; i++) {
      const tmpl = pick(DINING_TEMPLATES);
      let day = randInt(1, maxDay);
      // Bias slightly toward Fri-Sun
      const dObj = new Date(year, month - 1, day);
      const dow = dObj.getDay();
      if (dow !== 0 && dow !== 5 && dow !== 6 && rng() < 0.55) {
        const shift = 5 - dow;
        if (day + shift <= maxDay && day + shift >= 1) day += shift;
      }
      // Make current month Dining noticeably pace high to trigger proactive alert!
      const currentDiningBump = isCurrentMonth ? 1.28 : 1.0;
      transactions.push({
        id: `demo-${seq++}`,
        date: `${ym}-${pad2(day)}`,
        description: tmpl.description,
        merchant: tmpl.merchant,
        amount: Math.round(randInt(tmpl.min, tmpl.max) * inflationTrend * currentDiningBump),
        category: 'Dining',
        paymentMethod: pick(tmpl.methods),
        type: 'expense',
        categorySource: 'ml_predicted',
        predictionConfidence: 0.93,
        isSample: true,
      });
    }

    // 7. Travel (6-9 transactions)
    const travelCount = isCurrentMonth ? 6 : randInt(6, 9);
    for (let i = 0; i < travelCount; i++) {
      const tmpl = pick(TRAVEL_TEMPLATES);
      const day = randInt(1, maxDay);
      transactions.push({
        id: `demo-${seq++}`,
        date: `${ym}-${pad2(day)}`,
        description: tmpl.description,
        merchant: tmpl.merchant,
        amount: Math.round(randInt(tmpl.min, tmpl.max) * inflationTrend),
        category: 'Travel',
        paymentMethod: pick(tmpl.methods),
        type: 'expense',
        categorySource: 'ml_predicted',
        predictionConfidence: 0.9,
        isSample: true,
      });
    }

    // 8. Shopping (2-4 transactions, festive spike in Oct/Nov)
    const shopCount = isCurrentMonth ? 3 : month === 10 ? 5 : randInt(2, 4);
    for (let i = 0; i < shopCount; i++) {
      const tmpl = pick(SHOPPING_TEMPLATES);
      const day = randInt(1, maxDay);
      transactions.push({
        id: `demo-${seq++}`,
        date: `${ym}-${pad2(day)}`,
        description: tmpl.description,
        merchant: tmpl.merchant,
        amount: Math.round(randInt(tmpl.min, tmpl.max) * inflationTrend * festiveMultiplier),
        category: 'Shopping',
        paymentMethod: pick(tmpl.methods),
        type: 'expense',
        categorySource: 'ml_predicted',
        predictionConfidence: 0.89,
        isSample: true,
      });
    }

    // 9. Health (1-2 transactions)
    const healthCount = isCurrentMonth ? 1 : randInt(1, 2);
    for (let i = 0; i < healthCount; i++) {
      const tmpl = pick(HEALTH_TEMPLATES);
      const day = randInt(1, maxDay);
      transactions.push({
        id: `demo-${seq++}`,
        date: `${ym}-${pad2(day)}`,
        description: tmpl.description,
        merchant: tmpl.merchant,
        amount: Math.round(randInt(tmpl.min, tmpl.max)),
        category: 'Health',
        paymentMethod: pick(tmpl.methods),
        type: 'expense',
        categorySource: 'ml_predicted',
        predictionConfidence: 0.88,
        isSample: true,
      });
    }

    // 10. Other (2-3 transactions)
    const otherCount = isCurrentMonth ? 2 : randInt(2, 3);
    for (let i = 0; i < otherCount; i++) {
      const tmpl = pick(OTHER_TEMPLATES);
      const day = randInt(1, maxDay);
      transactions.push({
        id: `demo-${seq++}`,
        date: `${ym}-${pad2(day)}`,
        description: tmpl.description,
        merchant: tmpl.merchant,
        amount: Math.round(randInt(tmpl.min, tmpl.max)),
        category: 'Other',
        paymentMethod: pick(tmpl.methods),
        type: 'expense',
        categorySource: 'rule_matched',
        isSample: true,
      });
    }
  }

  // Inject 2 realistic anomalous outliers for Anomaly Detection & Insights demonstration
  transactions.push({
    id: `demo-${seq++}`,
    date: '2026-11-15',
    description: 'Apple MacBook Display & Battery Service',
    merchant: 'Aptronix Service',
    amount: 16800,
    category: 'Shopping',
    paymentMethod: 'Credit Card',
    type: 'expense',
    categorySource: 'manual',
    isSample: true,
  });

  transactions.push({
    id: `demo-${seq++}`,
    date: '2026-10-21',
    description: 'Diwali Family Celebration Dinner',
    merchant: 'ITC Gardenia',
    amount: 5450,
    category: 'Dining',
    paymentMethod: 'Credit Card',
    type: 'expense',
    categorySource: 'ml_predicted',
    predictionConfidence: 0.86,
    isSample: true,
  });

  return transactions.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}
