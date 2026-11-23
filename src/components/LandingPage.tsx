import React, { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import {
  Activity,
  ArrowRight,
  BarChart3,
  BellRing,
  BrainCircuit,
  Menu,
  ShieldCheck,
  SlidersHorizontal,
  TrendingUp,
  Upload,
  Wallet,
  X,
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { ImageWithFallback } from './ImageWithFallback';
import { formatINR } from '../lib/formatters';

interface LandingPageProps {
  onLaunchDashboard: () => void;
  onExploreDemo: () => void;
  onOpenMethodology: () => void;
}

const FEATURES = [
  {
    num: '01',
    title: 'Smart Expense Tracking',
    description:
      'Consolidate UPI, debit card, credit card, and cash entries into a single structured ledger with instant CSV import and duplicate detection.',
    icon: Wallet,
    accent: '#25E0A4',
    span: 'lg:col-span-2',
  },
  {
    num: '02',
    title: 'AI-Powered Categorisation',
    description:
      'Multinomial Naive Bayes text classification predicts categories from merchant descriptions, backed by transparent rule fallbacks and manual learning.',
    icon: BrainCircuit,
    accent: '#6E8BFF',
    span: 'lg:col-span-1',
  },
  {
    num: '03',
    title: 'Future Expense Forecasting',
    description:
      'Chronological Ridge Regression trained without future leakage forecasts next-month totals and category outlays with out-of-sample MAE, RMSE, and R².',
    icon: TrendingUp,
    accent: '#25E0A4',
    span: 'lg:col-span-1',
  },
  {
    num: '04',
    title: 'Intelligent Budget Alerts',
    description:
      'Monitors daily spending velocity against remaining days in the month to flag approaching limits and overshoot risk before month-end.',
    icon: BellRing,
    accent: '#F6B960',
    span: 'lg:col-span-2',
  },
  {
    num: '05',
    title: 'What-If Savings Simulator',
    description:
      'Model discretionary reductions across Dining, Shopping, Travel, and Subscriptions to compute monthly and annualized savings scenarios.',
    icon: SlidersHorizontal,
    accent: '#E7C68C',
    span: 'lg:col-span-1',
  },
  {
    num: '06',
    title: 'Financial Health Intelligence',
    description:
      'An explainable 0–100 composite score evaluating income ratio, savings rate, budget utilization, and month-to-month spending consistency.',
    icon: Activity,
    accent: '#6E8BFF',
    span: 'lg:col-span-2',
  },
];

const PIPELINE_STAGES = [
  {
    step: '01',
    label: 'IMPORT',
    title: 'Ingest & Deduplicate',
    detail: 'Log manual expenses or upload bank CSV exports with automatic duplicate filtering.',
    icon: Upload,
  },
  {
    step: '02',
    label: 'ANALYSE',
    title: 'Categorise & Profile',
    detail: 'Classify merchants via Naive Bayes and surface daily, weekday, and channel patterns.',
    icon: BarChart3,
  },
  {
    step: '03',
    label: 'PREDICT',
    title: 'Forecast & Alert',
    detail: 'Project next-month spending via chronological Ridge Regression and detect budget risk.',
    icon: TrendingUp,
  },
  {
    step: '04',
    label: 'SAVE',
    title: 'Simulate & Optimize',
    detail: 'Test habit adjustments in the What-If Simulator and raise your Financial Health Score.',
    icon: ShieldCheck,
  },
];

export const LandingPage: React.FC<LandingPageProps> = ({
  onLaunchDashboard,
  onExploreDemo,
  onOpenMethodology,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const heroRef = useRef<HTMLDivElement | null>(null);

  const { scrollYProgress } = useScroll();
  const previewY = useTransform(scrollYProgress, [0, 0.35], [0, -28]);

  // Subtle atmospheric emerald particle field
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const prefersReduced =
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    const resize = () => {
      canvas.width = canvas.offsetWidth * Math.min(window.devicePixelRatio || 1, 2);
      canvas.height = canvas.offsetHeight * Math.min(window.devicePixelRatio || 1, 2);
    };
    resize();
    window.addEventListener('resize', resize);

    const count = 34;
    const particles = Array.from({ length: count }, (_, idx) => ({
      x: ((idx * 173) % 1000) / 1000,
      y: ((idx * 317) % 1000) / 1000,
      r: 1.1 + (idx % 3) * 0.65,
      vx: (((idx % 5) - 2) * 0.00004) || 0.00003,
      vy: -0.00005 - (idx % 4) * 0.00002,
      alpha: 0.14 + (idx % 4) * 0.09,
    }));

    const drawFrame = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      for (const p of particles) {
        if (!prefersReduced) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.y < -0.02) p.y = 1.02;
          if (p.x < 0) p.x = 1;
          if (p.x > 1) p.x = 0;
        }
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, p.r * 1.4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(37, 224, 164, ${p.alpha})`;
        ctx.fill();
      }

      if (!prefersReduced) {
        animId = requestAnimationFrame(drawFrame);
      }
    };

    drawFrame();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  const handleHeroMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = heroRef.current?.getBoundingClientRect();
    if (!rect) return;
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: ny * -5, y: nx * 6 });
  };

  return (
    <div className="min-h-screen bg-[#070B14] text-[#F6F8FC] overflow-x-hidden">
      {/* Sticky Frosted-Glass Top Bar (Strict 3-Zone Contract) */}
      <header className="sticky top-0 z-40 border-b border-white/8 bg-[#070B14]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          <a href="#top" className="shrink-0 focus-visible:rounded-lg">
            <BrandLogo size={30} />
          </a>

          <nav aria-label="Primary Navigation" className="hidden md:flex items-center gap-7 text-sm font-medium text-[#94A3B8]">
            <a
              href="#features"
              className="group relative py-1 hover:text-[#F6F8FC] transition-colors whitespace-nowrap shrink-0"
            >
              Features
              <span className="absolute left-0 bottom-0 h-px w-0 bg-[#25E0A4] transition-all duration-200 group-hover:w-full" />
            </a>
            <a
              href="#how-it-works"
              className="group relative py-1 hover:text-[#F6F8FC] transition-colors whitespace-nowrap shrink-0"
            >
              How It Works
              <span className="absolute left-0 bottom-0 h-px w-0 bg-[#25E0A4] transition-all duration-200 group-hover:w-full" />
            </a>
            <button
              type="button"
              onClick={onOpenMethodology}
              className="group relative py-1 hover:text-[#F6F8FC] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Insights &amp; Science
              <span className="absolute left-0 bottom-0 h-px w-0 bg-[#25E0A4] transition-all duration-200 group-hover:w-full" />
            </button>
            <button
              type="button"
              onClick={onLaunchDashboard}
              className="group relative py-1 hover:text-[#F6F8FC] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Dashboard
              <span className="absolute left-0 bottom-0 h-px w-0 bg-[#25E0A4] transition-all duration-200 group-hover:w-full" />
            </button>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onLaunchDashboard}
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#25E0A4] text-[#070B14] text-xs font-semibold hover:bg-[#38ecc0] transition-all duration-200 shadow-lg shadow-[#25E0A4]/15 whitespace-nowrap shrink-0 cursor-pointer"
            >
              Launch Dashboard
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
              className="md:hidden p-2 rounded-lg border border-white/10 text-[#F6F8FC] hover:bg-white/5"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/8 bg-[#101827] px-4 py-4 space-y-2">
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2.5 text-sm font-medium text-[#F6F8FC] hover:text-[#25E0A4]"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2.5 text-sm font-medium text-[#F6F8FC] hover:text-[#25E0A4]"
            >
              How It Works
            </a>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenMethodology();
              }}
              className="block w-full text-left py-2.5 text-sm font-medium text-[#F6F8FC] hover:text-[#25E0A4]"
            >
              Project Methodology
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onLaunchDashboard();
              }}
              className="w-full mt-2 py-2.5 px-4 rounded-lg bg-[#25E0A4] text-[#070B14] text-sm font-semibold"
            >
              Launch Dashboard
            </button>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section
        id="top"
        ref={heroRef}
        onMouseMove={handleHeroMouseMove}
        onMouseLeave={() => setTilt({ x: 0, y: 0 })}
        className="relative isolate overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28"
      >
        {/* Luminous grid & ambient radial light */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-20 opacity-25"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(148,163,184,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.08) 1px, transparent 1px)',
            backgroundSize: '56px 56px',
            maskImage: 'radial-gradient(ellipse 80% 70% at 50% 30%, black 35%, transparent 100%)',
          }}
        />
        <div
          aria-hidden="true"
          className="absolute -top-32 left-1/4 w-[520px] h-[520px] -z-20 rounded-full bg-[#25E0A4]/10 blur-[120px]"
        />
        <div
          aria-hidden="true"
          className="absolute top-24 right-1/6 w-[440px] h-[440px] -z-20 rounded-full bg-[#6E8BFF]/10 blur-[120px]"
        />
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="absolute inset-0 w-full h-full -z-10 pointer-events-none"
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-10 items-center">
            {/* Left Copy Column */}
            <div className="lg:col-span-6 space-y-7">
              <div className="flex items-center gap-2.5 text-xs font-medium text-[#94A3B8]">
                <span className="text-[#25E0A4]">Track it. Forecast it. Save more.</span>
                <span aria-hidden="true">·</span>
                <span>Personal Expense Intelligence</span>
              </div>

              <h1
                className="font-display font-bold tracking-tight text-[#F6F8FC] leading-[1.04]"
                style={{ fontSize: 'clamp(2.5rem, 4.4vw, 4.1rem)', textWrap: 'balance' }}
              >
                <motion.span
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  className="block"
                >
                  YOUR MONEY.
                </motion.span>
                <motion.span
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                  className="block text-[#E7C68C]"
                >
                  YOUR MOVES.
                </motion.span>
                <motion.span
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  className="block text-[#25E0A4]"
                >
                  YOUR FUTURE.
                </motion.span>
              </h1>

              <motion.p
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.28 }}
                className="text-base sm:text-lg text-[#94A3B8] max-w-xl leading-relaxed"
              >
                Understand every rupee. Predict tomorrow&apos;s spending. Build smarter financial habits with intelligent data science.
              </motion.p>

              <p className="text-sm text-[#F6F8FC]/85 font-medium">
                &ldquo;Don&apos;t just track what you&apos;ve spent. Know what&apos;s coming next.&rdquo;
              </p>

              <div className="flex flex-wrap items-center gap-3.5 pt-1">
                <button
                  type="button"
                  onClick={onLaunchDashboard}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#25E0A4] text-[#070B14] text-sm font-semibold hover:bg-[#38ecc0] transition-all duration-200 shadow-lg shadow-[#25E0A4]/20 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Explore My Dashboard
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-white/12 bg-[#101827]/70 text-[#F6F8FC] text-sm font-medium hover:bg-[#151F30] hover:border-white/20 transition-all duration-200 whitespace-nowrap shrink-0"
                >
                  See How It Works
                </a>
                <button
                  type="button"
                  onClick={onExploreDemo}
                  className="inline-flex items-center gap-1.5 px-4 py-3 text-sm font-medium text-[#E7C68C] hover:text-[#f5dab0] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Explore Demo Dataset
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Right 3D-Inspired Floating Dashboard Preview */}
            <motion.div
              style={{ y: previewY }}
              className="lg:col-span-6 relative"
            >
              <div
                style={{
                  transform: `perspective(1200px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
                  transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
                className="relative rounded-2xl bg-[#101827]/90 backdrop-blur-xl border border-white/12 p-5 sm:p-6 shadow-2xl"
              >
                {/* Ambient Photo Strip Header inside Preview */}
                <div className="relative h-36 sm:h-44 rounded-xl overflow-hidden mb-5 border border-white/10">
                  <ImageWithFallback
                    src="/src/assets/images/hero_fintech_desk_1795407186677.jpg"
                    alt="Modern financial analytics desk with laptop and smartphone"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#070B14]/90 via-[#070B14]/35 to-transparent" />
                  <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-4">
                    <div>
                      <p className="text-xs text-[#94A3B8]">Sample Preview · November Cycle</p>
                      <p className="font-mono tabular-nums text-2xl sm:text-3xl font-bold text-[#F6F8FC]">
                        {formatINR(58420)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-[#94A3B8]">ML Forecast (Next Mo)</p>
                      <p className="font-mono tabular-nums text-sm sm:text-base font-semibold text-[#25E0A4]">
                        {formatINR(60180)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Preview Telemetry Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-5">
                  <div className="rounded-xl bg-[#151F30] border border-white/8 p-3.5">
                    <p className="text-xs text-[#94A3B8]">Health Score</p>
                    <div className="mt-1.5 flex items-baseline justify-between">
                      <span className="font-mono tabular-nums text-xl font-bold text-[#25E0A4]">78</span>
                      <span className="text-xs text-[#94A3B8]">/ 100 Good</span>
                    </div>
                  </div>
                  <div className="rounded-xl bg-[#151F30] border border-white/8 p-3.5">
                    <p className="text-xs text-[#94A3B8]">Dining Pace</p>
                    <div className="mt-1.5 flex items-baseline justify-between">
                      <span className="font-mono tabular-nums text-xl font-bold text-[#F6B960]">94%</span>
                      <span className="text-xs text-[#F6B960]">High Risk</span>
                    </div>
                  </div>
                  <div className="rounded-xl bg-[#151F30] border border-white/8 p-3.5">
                    <p className="text-xs text-[#94A3B8]">15% Trim Potential</p>
                    <div className="mt-1.5 flex items-baseline justify-between">
                      <span className="font-mono tabular-nums text-xl font-bold text-[#E7C68C]">
                        {formatINR(3450)}
                      </span>
                      <span className="text-xs text-[#94A3B8]">/ month</span>
                    </div>
                  </div>
                </div>

                {/* Animated Vector Spending Sparkline & Recent UPI Activity */}
                <div className="rounded-xl bg-[#151F30] border border-white/8 p-4">
                  <div className="flex items-center justify-between text-xs text-[#94A3B8] mb-3">
                    <span>Chronological Spend vs. Ridge Regression Forecast</span>
                    <span className="text-[#6E8BFF] font-medium">Sample Data</span>
                  </div>
                  <svg viewBox="0 0 420 84" className="w-full h-20 overflow-visible" aria-hidden="true">
                    <defs>
                      <linearGradient id="heroCurveFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#25E0A4" stopOpacity="0.28" />
                        <stop offset="100%" stopColor="#25E0A4" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M0 64 C 42 56, 70 60, 110 46 C 150 32, 185 49, 228 38 C 270 28, 305 35, 345 26 L 345 84 L 0 84 Z"
                      fill="url(#heroCurveFill)"
                    />
                    <motion.path
                      d="M0 64 C 42 56, 70 60, 110 46 C 150 32, 185 49, 228 38 C 270 28, 305 35, 345 26"
                      fill="none"
                      stroke="#25E0A4"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                    />
                    <motion.path
                      d="M345 26 L 412 20"
                      fill="none"
                      stroke="#6E8BFF"
                      strokeWidth="2.5"
                      strokeDasharray="5 5"
                      strokeLinecap="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.6, delay: 0.9 }}
                    />
                    <circle cx="345" cy="26" r="4" fill="#25E0A4" />
                    <circle cx="412" cy="20" r="4.5" fill="#6E8BFF" />
                  </svg>
                  <div className="mt-3 pt-3 border-t border-white/8 flex items-center justify-between text-xs">
                    <span className="text-[#94A3B8]">Swiggy · UPI · Naive Bayes (93% conf.)</span>
                    <span className="font-mono tabular-nums text-[#F6F8FC] font-medium">-{formatINR(485)}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Editorial Photography & Domain Storytelling Band */}
      <section className="py-16 border-y border-white/8 bg-[#101827]/45">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
            <motion.article
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.5 }}
              className="group relative rounded-2xl overflow-hidden border border-white/10 bg-[#151F30] flex flex-col"
            >
              <div className="relative h-64 sm:h-72 overflow-hidden">
                <ImageWithFallback
                  src="/src/assets/images/upi_contactless_payment_1795407186798.jpg"
                  alt="Contactless Indian UPI QR payment at a cafe counter"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#151F30] via-[#151F30]/35 to-transparent" />
              </div>
              <div className="p-6 sm:p-7 flex-1 flex flex-col justify-between">
                <div>
                  <p className="text-xs font-medium text-[#25E0A4] mb-2">
                    UPI, Cards &amp; Cash · Multi-Rail Consolidation
                  </p>
                  <h2 className="font-display text-xl sm:text-2xl font-semibold text-[#F6F8FC]">
                    Small daily payments add up faster than bank statements reveal.
                  </h2>
                  <p className="mt-2.5 text-sm text-[#94A3B8] leading-relaxed">
                    Every ₹240 coffee scan, cab ride, and late-night delivery order is automatically classified and mapped against your weekly burn rate.
                  </p>
                </div>
              </div>
            </motion.article>

            <motion.article
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="group relative rounded-2xl overflow-hidden border border-white/10 bg-[#151F30] flex flex-col"
            >
              <div className="relative h-64 sm:h-72 overflow-hidden">
                <ImageWithFallback
                  src="/src/assets/images/financial_planning_workspace_1795407187757.jpg"
                  alt="Minimalist wealth planning journal, smartphone, and metallic debit card"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#151F30] via-[#151F30]/35 to-transparent" />
              </div>
              <div className="p-6 sm:p-7 flex-1 flex flex-col justify-between">
                <div>
                  <p className="text-xs font-medium text-[#E7C68C] mb-2">
                    Statistical Rigor · Honest Evaluation
                  </p>
                  <h2 className="font-display text-xl sm:text-2xl font-semibold text-[#F6F8FC]">
                    Real predictive modeling with transparent out-of-sample metrics.
                  </h2>
                  <p className="mt-2.5 text-sm text-[#94A3B8] leading-relaxed">
                    No invented confidence badges. SpendWise AI evaluates held-out MAE, RMSE, MAPE, and R² chronologically and falls back cleanly when data is scarce.
                  </p>
                </div>
              </div>
            </motion.article>
          </div>
        </div>
      </section>

      {/* 6 Core Features Bento Grid */}
      <section id="features" className="py-20 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-12">
            <p className="text-xs font-semibold text-[#25E0A4] mb-2">Capabilities</p>
            <h2
              className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#F6F8FC]"
              style={{ textWrap: 'balance' }}
            >
              Six analytical engines working from one verified ledger.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <motion.div
                  key={feat.num}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.4, delay: idx * 0.05 }}
                  className={`group rounded-2xl bg-[#151F30]/85 border border-white/8 hover:border-white/20 p-6 sm:p-7 transition-all duration-200 hover:-translate-y-1 ${feat.span}`}
                >
                  <div className="flex items-center justify-between mb-5">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center border border-white/10 bg-[#101827]"
                      style={{ color: feat.accent }}
                    >
                      <Icon className="w-5 h-5" aria-hidden="true" />
                    </div>
                    <span className="font-mono text-xs text-[#94A3B8]">{feat.num}</span>
                  </div>
                  <h3 className="font-display text-xl font-semibold text-[#F6F8FC] mb-2.5">
                    {feat.title}
                  </h3>
                  <p className="text-sm text-[#94A3B8] leading-relaxed">{feat.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4-Stage How It Works Timeline */}
      <section id="how-it-works" className="py-20 lg:py-24 border-t border-white/8 bg-[#101827]/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-14">
            <p className="text-xs font-semibold text-[#6E8BFF] mb-2">How It Works</p>
            <h2
              className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#F6F8FC]"
              style={{ textWrap: 'balance' }}
            >
              From scattered receipts to forward-looking clarity in four stages.
            </h2>
          </div>

          <div className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Desktop connecting pipeline track */}
            <div
              aria-hidden="true"
              className="hidden lg:block absolute top-11 left-[10%] right-[10%] h-px bg-gradient-to-r from-[#25E0A4]/50 via-[#6E8BFF]/50 to-[#E7C68C]/50"
            />
            {PIPELINE_STAGES.map((stage, idx) => {
              const Icon = stage.icon;
              return (
                <motion.div
                  key={stage.step}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.4, delay: idx * 0.08 }}
                  className="relative rounded-2xl bg-[#151F30] border border-white/8 p-6"
                >
                  <div className="relative z-10 w-10 h-10 rounded-xl bg-[#070B14] border border-white/15 flex items-center justify-center text-[#25E0A4] mb-5">
                    <Icon className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <p className="font-mono text-xs text-[#E7C68C] mb-1">
                    {stage.step}. {stage.label}
                  </p>
                  <h3 className="font-display text-lg font-semibold text-[#F6F8FC] mb-2">
                    {stage.title}
                  </h3>
                  <p className="text-sm text-[#94A3B8] leading-relaxed">{stage.detail}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Final Cinematic CTA */}
      <section className="py-20 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-3xl overflow-hidden border border-white/12 bg-[#101827]">
            <ImageWithFallback
              src="/src/assets/images/savings_architecture_cta_1795407187239.jpg"
              alt="Modern architectural glass pavilion overlooking evening city lights"
              className="absolute inset-0 w-full h-full object-cover opacity-40"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#070B14]/95 via-[#070B14]/82 to-[#070B14]/65" />

            <div className="relative z-10 px-6 py-14 sm:px-12 sm:py-20 max-w-3xl">
              <p className="text-xs font-semibold text-[#E7C68C] mb-3">
                Ready for Live Exploration
              </p>
              <h2
                className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-[#F6F8FC] leading-[1.08]"
                style={{ textWrap: 'balance' }}
              >
                THE FUTURE OF YOUR FINANCES STARTS WITH CLARITY.
              </h2>
              <p className="mt-4 text-base text-[#94A3B8] max-w-xl leading-relaxed">
                Open the interactive dashboard with pre-loaded 14-month Indian sample transactions, or import your own CSV statement directly in your browser.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={onLaunchDashboard}
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#25E0A4] text-[#070B14] text-sm font-semibold hover:bg-[#38ecc0] transition-all shadow-lg shadow-[#25E0A4]/20 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Start Analysing
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={onOpenMethodology}
                  className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl border border-white/15 bg-[#101827]/75 text-sm font-medium text-[#F6F8FC] hover:bg-[#151F30] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Read Data Science Methodology
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quiet Footer */}
      <footer className="border-t border-white/8 py-10 bg-[#070B14]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <BrandLogo size={26} />
            <p className="mt-2 text-xs text-[#94A3B8]">
              Local browser storage · Zero external banking credentials collected · Sample data clearly labeled
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-xs font-medium text-[#94A3B8]">
            <a href="#features" className="hover:text-[#F6F8FC] transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-[#F6F8FC] transition-colors">
              How It Works
            </a>
            <button
              type="button"
              onClick={onOpenMethodology}
              className="hover:text-[#F6F8FC] transition-colors cursor-pointer"
            >
              Project Methodology
            </button>
            <button
              type="button"
              onClick={onLaunchDashboard}
              className="text-[#25E0A4] hover:text-[#38ecc0] transition-colors cursor-pointer"
            >
              Launch Dashboard
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
