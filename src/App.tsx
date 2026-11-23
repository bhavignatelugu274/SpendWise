import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DashboardShell } from './components/DashboardShell';
import { LandingPage } from './components/LandingPage';
import { ToastContainer, ToastMessage } from './components/Toast';
import { AnalyticsView } from './components/views/AnalyticsView';
import { BudgetPlannerView } from './components/views/BudgetPlannerView';
import { FinancialHealthView } from './components/views/FinancialHealthView';
import { ForecastView } from './components/views/ForecastView';
import { MethodologyView } from './components/views/MethodologyView';
import { OverviewView } from './components/views/OverviewView';
import { SavingsSimulatorView } from './components/views/SavingsSimulatorView';
import { SettingsView } from './components/views/SettingsView';
import { SmartInsightsView } from './components/views/SmartInsightsView';
import { TransactionsView } from './components/views/TransactionsView';
import { getLatestMonthKey } from './lib/analytics';
import { ExpenseCategorizer } from './lib/categorizer';
import {
  createEmptyState,
  createSampleState,
  loadPersistedState,
  savePersistedState,
} from './lib/storage';
import {
  AppScreen,
  BudgetConfig,
  DashboardSection,
  DatasetMode,
  ExpenseCategory,
  PaymentMethod,
  Transaction,
} from './lib/types';

export default function App() {
  const initialState = useMemo(() => loadPersistedState(), []);

  const [transactions, setTransactions] = useState<Transaction[]>(initialState.transactions);
  const [budgets, setBudgets] = useState<BudgetConfig>(initialState.budgets);
  const [datasetMode, setDatasetMode] = useState<DatasetMode>(initialState.datasetMode);

  const [screen, setScreen] = useState<AppScreen>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1' || params.get('demo') === '1') {
        return 'dashboard';
      }
    }
    return 'landing';
  });

  const [activeSection, setActiveSection] = useState<DashboardSection>('overview');
  const [selectedMonth, setSelectedMonth] = useState<string>(() =>
    getLatestMonthKey(initialState.transactions)
  );
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | 'All'>('All');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | 'All'>('All');
  const [externalAddModalOpen, setExternalAddModalOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Persist to browser localStorage whenever ledger or budget state changes
  useEffect(() => {
    savePersistedState({ transactions, budgets, datasetMode });
  }, [transactions, budgets, datasetMode]);

  // Keep selectedMonth valid when transactions change
  useEffect(() => {
    if (transactions.length > 0) {
      const latest = getLatestMonthKey(transactions);
      const hasSelected = transactions.some((t) => t.date.startsWith(selectedMonth));
      if (!hasSelected) {
        setSelectedMonth(latest);
      }
    }
  }, [transactions, selectedMonth]);

  // Retrain Naive Bayes categorizer automatically whenever user-corrected transactions change
  const categorizer = useMemo(() => new ExpenseCategorizer(transactions), [transactions]);

  const notify = useCallback(
    (type: ToastMessage['type'], title: string, description?: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { id, type, title, description }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3000);
    },
    []
  );

  const handleDismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleExploreDemo = () => {
    const sample = createSampleState();
    setTransactions(sample.transactions);
    setBudgets(sample.budgets);
    setDatasetMode('sample');
    setSelectedMonth(getLatestMonthKey(sample.transactions));
    setSelectedCategory('All');
    setSelectedMethod('All');
    setScreen('dashboard');
    setActiveSection('overview');
    notify('info', 'Sample Demo Dataset Loaded', '14 months of deterministic Indian transactions active.');
  };

  const handleResetDemo = () => {
    const sample = createSampleState();
    setTransactions(sample.transactions);
    setBudgets(sample.budgets);
    setDatasetMode('sample');
    setSelectedMonth(getLatestMonthKey(sample.transactions));
    notify('success', 'Demo Reset', 'Restored original 14-month deterministic sample dataset.');
  };

  const handleClearAllData = () => {
    const empty = createEmptyState();
    setTransactions(empty.transactions);
    setBudgets(empty.budgets);
    setDatasetMode('empty');
    setSelectedCategory('All');
    setSelectedMethod('All');
    notify('info', 'Workspace Cleared', 'All local transactions and budgets removed.');
  };

  const handleAddTransaction = (newTx: Omit<Transaction, 'id'>) => {
    const record: Transaction = {
      ...newTx,
      id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };
    setTransactions((prev) =>
      [record, ...prev].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    );
    if (datasetMode === 'empty') setDatasetMode('user');
  };

  const handleUpdateTransaction = (updated: Transaction) => {
    setTransactions((prev) =>
      prev
        .map((t) => (t.id === updated.id ? updated : t))
        .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    );
  };

  const handleDeleteTransaction = (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const handleImportTransactions = (imported: Transaction[]) => {
    setTransactions((prev) =>
      [...imported, ...prev].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    );
    if (datasetMode === 'empty') setDatasetMode('user');
  };

  const handleOpenAddTransaction = () => {
    setScreen('dashboard');
    setActiveSection('transactions');
    setExternalAddModalOpen(true);
  };

  return (
    <>
      {screen === 'landing' && (
        <LandingPage
          onLaunchDashboard={() => setScreen('dashboard')}
          onExploreDemo={handleExploreDemo}
          onOpenMethodology={() => setScreen('methodology')}
        />
      )}

      {screen === 'methodology' && (
        <MethodologyView onBack={() => setScreen('landing')} />
      )}

      {screen === 'dashboard' && (
        <DashboardShell
          activeSection={activeSection}
          onSelectSection={setActiveSection}
          onBackToLanding={() => setScreen('landing')}
          datasetMode={datasetMode}
          onExploreDemo={handleExploreDemo}
          onResetDemo={handleResetDemo}
          onOpenAddTransaction={handleOpenAddTransaction}
        >
          {activeSection === 'overview' && (
            <OverviewView
              transactions={transactions}
              budgets={budgets}
              selectedMonth={selectedMonth}
              onSelectMonth={setSelectedMonth}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              selectedMethod={selectedMethod}
              onSelectMethod={setSelectedMethod}
              onNavigate={setActiveSection}
              onOpenAddTransaction={handleOpenAddTransaction}
            />
          )}

          {activeSection === 'transactions' && (
            <TransactionsView
              transactions={transactions}
              categorizer={categorizer}
              onAddTransaction={handleAddTransaction}
              onUpdateTransaction={handleUpdateTransaction}
              onDeleteTransaction={handleDeleteTransaction}
              onImportTransactions={handleImportTransactions}
              onNotify={notify}
              externalAddModalOpen={externalAddModalOpen}
              onCloseExternalAddModal={() => setExternalAddModalOpen(false)}
              onOpenExternalAddModal={() => setExternalAddModalOpen(true)}
            />
          )}

          {activeSection === 'analytics' && (
            <AnalyticsView
              transactions={transactions}
              budgets={budgets}
              selectedMonth={selectedMonth}
              onSelectMonth={setSelectedMonth}
            />
          )}

          {activeSection === 'forecast' && (
            <ForecastView transactions={transactions} budgets={budgets} />
          )}

          {activeSection === 'budgets' && (
            <BudgetPlannerView
              transactions={transactions}
              budgets={budgets}
              selectedMonth={selectedMonth}
              onUpdateBudgets={setBudgets}
              onNotify={notify}
            />
          )}

          {activeSection === 'simulator' && (
            <SavingsSimulatorView
              transactions={transactions}
              budgets={budgets}
              selectedMonth={selectedMonth}
            />
          )}

          {activeSection === 'health' && (
            <FinancialHealthView
              transactions={transactions}
              budgets={budgets}
              selectedMonth={selectedMonth}
            />
          )}

          {activeSection === 'insights' && (
            <SmartInsightsView
              transactions={transactions}
              budgets={budgets}
              selectedMonth={selectedMonth}
            />
          )}

          {activeSection === 'settings' && (
            <SettingsView
              transactions={transactions}
              budgets={budgets}
              datasetMode={datasetMode}
              onResetDemo={handleResetDemo}
              onClearAllData={handleClearAllData}
              onNotify={notify}
            />
          )}

          {activeSection === 'methodology' && (
            <MethodologyView onBack={() => setActiveSection('overview')} embedded />
          )}
        </DashboardShell>
      )}

      <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />
    </>
  );
}
