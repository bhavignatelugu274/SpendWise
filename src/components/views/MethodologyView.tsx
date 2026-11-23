import React from 'react';
import { ArrowLeft, BrainCircuit, CheckCircle2, Code2, Cpu, Database, Layers, LineChart } from 'lucide-react';
import { BrandLogo } from '../BrandLogo';

interface MethodologyViewProps {
  onBack: () => void;
  embedded?: boolean;
}

const WORKFLOW_STEPS = [
  {
    num: '01',
    title: 'Data Collection',
    detail:
      'Accepts manual entries, RFC-4180 CSV bank/wallet statements, and a deterministic 14-month Indian synthetic dataset (420+ records across UPI, Debit Card, Credit Card, and Cash) seeded with Mulberry32 PRNG for reproducible evaluation.',
    icon: Database,
  },
  {
    num: '02',
    title: 'Data Cleaning & Deduplication',
    detail:
      'Normalizes ISO and DD/MM/YYYY date formats, strips ₹ currency symbols and thousand separators, validates positive numeric amounts, and eliminates duplicate rows using composite signatures (date + merchant + amount + type).',
    icon: Layers,
  },
  {
    num: '03',
    title: 'Exploratory Data Analysis (EDA)',
    detail:
      'Aggregates daily, weekday, category, merchant, and payment-channel distributions into 10 synchronized charts, including a weekday spending heatmap and Modified Z-Score / Tukey IQR outlier detection.',
    icon: LineChart,
  },
  {
    num: '04',
    title: 'Feature Engineering',
    detail:
      'Constructs strictly causal temporal features per complete month: chronological trend index, trailing 3-month rolling mean, lag-1 monthly total, month-over-month delta, weekend spend ratio, recurring fixed-cost ratio, and cyclical calendar encoding (sin/cos).',
    icon: Cpu,
  },
  {
    num: '05',
    title: 'Model Training',
    detail:
      'Runs an in-browser Multinomial Naive Bayes text classifier (Laplace-smoothed TF tokens with user-feedback retraining + rule fallback) for categorization, and L2-regularized Ridge Regression solved via exact normal equations for forecasting.',
    icon: BrainCircuit,
  },
  {
    num: '06',
    title: 'Chronological Evaluation',
    detail:
      'Fits StandardScaler solely on the training window and evaluates held-out recent months chronologically using MAE, RMSE, MAPE, and R² alongside a trailing 3-month rolling average baseline—preventing time-series leakage.',
    icon: CheckCircle2,
  },
  {
    num: '07',
    title: 'Dashboard & Python Service Architecture',
    detail:
      'Delivered as a responsive React + TypeScript + Recharts application backed by local browser storage, paired with a decoupled FastAPI + Scikit-Learn reference microservice (python_ml_service/main.py) for server-side TF-IDF + LogisticRegression and IsolationForest execution.',
    icon: Code2,
  },
];

export const MethodologyView: React.FC<MethodologyViewProps> = ({ onBack, embedded = false }) => {
  const content = (
    <div className="space-y-8">
      <div className="rounded-2xl bg-[#151F30] border border-white/8 p-6 sm:p-8">
        <p className="text-xs font-semibold text-[#25E0A4] mb-2">
          Data Science &amp; Visualization Project Documentation
        </p>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#F6F8FC]">
          SpendWise AI Scientific Workflow &amp; Honest Limitations
        </h1>
        <p className="mt-3 text-sm text-[#94A3B8] leading-relaxed max-w-3xl">
          Every metric, forecast, alert, and insight in SpendWise AI is derived programmatically from the active transaction dataset. When historical depth is insufficient, the system explicitly reports &ldquo;Baseline Estimate&rdquo; or &ldquo;Insufficient Data&rdquo; instead of inventing synthetic numbers.
        </p>
      </div>

      {/* 7-Stage Pipeline */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {WORKFLOW_STEPS.map((step) => {
          const Icon = step.icon;
          return (
            <div
              key={step.num}
              className="rounded-2xl bg-[#151F30] border border-white/8 p-6 space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 text-[#25E0A4]" aria-hidden="true" />
                  <h2 className="font-display text-base font-semibold text-[#F6F8FC]">
                    {step.num}. {step.title}
                  </h2>
                </div>
              </div>
              <p className="text-xs text-[#94A3B8] leading-relaxed">{step.detail}</p>
            </div>
          );
        })}
      </div>

      {/* Formulas & Known Limitations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-[#151F30] border border-white/8 p-6 space-y-3">
          <h3 className="font-display text-base font-semibold text-[#F6F8FC]">
            Financial Health &amp; Anomaly Formulas
          </h3>
          <ul className="space-y-2.5 text-xs text-[#94A3B8] leading-relaxed">
            <li>
              <strong className="text-[#F6F8FC]">Health Score (0–100):</strong> Weighted sum of Spending-to-Income (25%), Budget Utilization (25%), Savings Rate (20%), Monthly Volatility CV (15%), and Category Discipline (15%). Missing income weights are excluded cleanly from the denominator.
            </li>
            <li>
              <strong className="text-[#F6F8FC]">Modified Z-Score Anomaly Detection:</strong>{' '}
              <code className="text-[#E7C68C]">M_i = 0.6745 × (x_i − median) / MAD</code> combined with Tukey&apos;s <code className="text-[#E7C68C]">Q3 + 1.5 × IQR</code> fence per category (minimum 4 transactions).
            </li>
            <li>
              <strong className="text-[#F6F8FC]">Budget Pace Projection:</strong> For in-progress months, discretionary spend scales by <code className="text-[#E7C68C]">daysInMonth / elapsedDays</code> while fixed categories (Rent, Bills, Subscriptions) remain unscaled.
            </li>
          </ul>
        </div>

        <div className="rounded-2xl bg-[#151F30] border border-white/8 p-6 space-y-3">
          <h3 className="font-display text-base font-semibold text-[#F6F8FC]">
            Known Limitations &amp; Scope Boundaries
          </h3>
          <ul className="space-y-2.5 text-xs text-[#94A3B8] leading-relaxed">
            <li>
              <strong className="text-[#F6F8FC]">Browser-First Execution:</strong> Because the live preview runtime executes in TypeScript/Node without a Python worker daemon, Multinomial Naive Bayes and Ridge Regression execute natively in-browser, while the equivalent FastAPI + Scikit-Learn service is provided in <code className="text-[#6E8BFF]">python_ml_service/main.py</code>.
            </li>
            <li>
              <strong className="text-[#F6F8FC]">Sample Data Boundary:</strong> Pre-loaded demo records are deterministic synthetic data clearly labeled &ldquo;Sample Data&rdquo; and should not be interpreted as real user banking history.
            </li>
            <li>
              <strong className="text-[#F6F8FC]">No Live Bank OAuth:</strong> Direct UPI or bank credential scraping is intentionally excluded for security; users import CSV exports safely.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );

  if (embedded) return content;

  return (
    <div className="min-h-screen bg-[#070B14] text-[#F6F8FC]">
      <header className="sticky top-0 z-40 border-b border-white/8 bg-[#070B14]/85 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <BrandLogo size={28} />
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/12 bg-[#101827] text-xs font-medium text-[#F6F8FC] hover:bg-[#151F30] cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            Return
          </button>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10">{content}</main>
    </div>
  );
};
