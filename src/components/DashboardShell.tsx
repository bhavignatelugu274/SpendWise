import React, { useState } from 'react';
import {
  Activity,
  BarChart3,
  BookOpen,
  BrainCircuit,
  Home,
  LayoutDashboard,
  ListOrdered,
  Menu,
  Plus,
  RotateCcw,
  Settings,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  X,
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { DashboardSection, DatasetMode } from '../lib/types';

interface DashboardShellProps {
  activeSection: DashboardSection;
  onSelectSection: (section: DashboardSection) => void;
  onBackToLanding: () => void;
  datasetMode: DatasetMode;
  onExploreDemo: () => void;
  onResetDemo: () => void;
  onOpenAddTransaction: () => void;
  children: React.ReactNode;
}

const NAV_ITEMS: Array<{ id: DashboardSection; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'transactions', label: 'Transactions', icon: ListOrdered },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'forecast', label: 'Expense Forecast', icon: BrainCircuit },
  { id: 'budgets', label: 'Budget Planner', icon: ShieldAlert },
  { id: 'simulator', label: 'Savings Simulator', icon: SlidersHorizontal },
  { id: 'health', label: 'Financial Health', icon: Activity },
  { id: 'insights', label: 'Smart Insights', icon: Sparkles },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const DashboardShell: React.FC<DashboardShellProps> = ({
  activeSection,
  onSelectSection,
  onBackToLanding,
  datasetMode,
  onExploreDemo,
  onResetDemo,
  onOpenAddTransaction,
  children,
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeTitle =
    activeSection === 'methodology'
      ? 'Project Methodology'
      : NAV_ITEMS.find((n) => n.id === activeSection)?.label ?? 'Overview';

  const sidebarContent = (
    <div className="flex flex-col h-full justify-between py-5 px-3.5">
      <div className="space-y-6">
        <div className="px-2 flex items-center justify-between">
          <button
            type="button"
            onClick={onBackToLanding}
            className="text-left focus-visible:rounded-lg cursor-pointer"
          >
            <BrandLogo size={28} />
          </button>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close sidebar"
            className="lg:hidden p-1.5 rounded-lg text-[#94A3B8] hover:text-[#F6F8FC]"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <nav aria-label="Dashboard Sections" className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectSection(item.id);
                  setMobileOpen(false);
                }}
                aria-current={active ? 'page' : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-[#151F30] text-[#25E0A4] border border-white/10'
                    : 'text-[#94A3B8] hover:text-[#F6F8FC] hover:bg-white/[0.03] border border-transparent'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="pt-4 border-t border-white/8 space-y-1">
        <button
          type="button"
          onClick={() => {
            onSelectSection('methodology');
            setMobileOpen(false);
          }}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
            activeSection === 'methodology'
              ? 'bg-[#151F30] text-[#E7C68C] border border-white/10'
              : 'text-[#94A3B8] hover:text-[#F6F8FC] hover:bg-white/[0.03]'
          }`}
        >
          <BookOpen className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>Project Methodology</span>
        </button>

        <button
          type="button"
          onClick={onBackToLanding}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-[#94A3B8] hover:text-[#F6F8FC] hover:bg-white/[0.03] transition-colors cursor-pointer"
        >
          <Home className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>Landing Page</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#070B14] text-[#F6F8FC] flex">
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 border-r border-white/8 bg-[#101827]/75 sticky top-0 h-screen">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/65"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-68 max-w-[80vw] bg-[#101827] border-r border-white/10 h-full">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Workspace Header */}
        <header className="sticky top-0 z-30 h-16 border-b border-white/8 bg-[#070B14]/85 backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation sidebar"
              className="lg:hidden p-2 rounded-lg border border-white/10 text-[#F6F8FC] hover:bg-white/5"
            >
              <Menu className="w-4 h-4" aria-hidden="true" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
                <span className="hidden sm:inline">SpendWise AI</span>
                <span className="hidden sm:inline" aria-hidden="true">/</span>
                <h1 className="font-display text-base sm:text-lg font-semibold text-[#F6F8FC] truncate">
                  {activeTitle}
                </h1>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {datasetMode === 'sample' ? (
              <div className="hidden md:flex items-center gap-2.5 text-xs text-[#E7C68C] pr-2">
                <span>Sample Data Active</span>
                <button
                  type="button"
                  onClick={onResetDemo}
                  className="inline-flex items-center gap-1 text-[#94A3B8] hover:text-[#F6F8FC] cursor-pointer"
                  title="Restore deterministic 14-month demo dataset"
                >
                  <RotateCcw className="w-3 h-3" aria-hidden="true" />
                  Reset Demo
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onExploreDemo}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/12 bg-[#101827] text-xs font-medium text-[#E7C68C] hover:bg-[#151F30] whitespace-nowrap cursor-pointer"
              >
                Explore Demo
              </button>
            )}

            <button
              type="button"
              onClick={onOpenAddTransaction}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#25E0A4] text-[#070B14] text-xs font-semibold hover:bg-[#38ecc0] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              Add Expense
            </button>
          </div>
        </header>

        {/* Prominent Sample Data Disclosure Strip when Demo Mode is active */}
        {datasetMode === 'sample' && (
          <div className="bg-[#101827] border-b border-white/8 px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
            <p className="text-[#94A3B8]">
              <strong className="text-[#E7C68C]">Sample Data</strong> · Viewing deterministic 14-month synthetic Indian personal finance history (Oct 2025 – Nov 2026). Local edits persist in browser storage.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onResetDemo}
                className="text-[#25E0A4] hover:underline font-medium cursor-pointer"
              >
                Reset Demo
              </button>
              <button
                type="button"
                onClick={() => onSelectSection('settings')}
                className="text-[#94A3B8] hover:text-[#F6F8FC] cursor-pointer"
              >
                Manage Storage
              </button>
            </div>
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1400px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
