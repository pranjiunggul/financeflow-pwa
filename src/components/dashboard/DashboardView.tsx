import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database';
import {
  TrendingUp,
  TrendingDown,
  ArrowLeftRight,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  FileSpreadsheet,
  AlertTriangle,
} from 'lucide-react';
import type {
  Account,
  Transaction,
  Category,
  CurrencyCode,
} from '../../types';
import { formatCurrency } from '../../services/fx';
import { IconRenderer } from '../common/IconRenderer';

// Visual Charts
import { NetWorthChart } from './NetWorthChart';
import { CashFlowBarChart } from './CashFlowBarChart';
import { CategoryDonutChart } from './CategoryDonutChart';
import { BudgetPerformanceWidget } from './BudgetPerformanceWidget';
import { ProactiveAlertBanner } from '../advisor/ProactiveAlertBanner';
import { useTranslation } from '../../i18n';

interface DashboardViewProps {
  accounts: Account[];
  transactions: Transaction[];
  categories: Category[];
  baseCurrency: CurrencyCode;
  onOpenNewTransaction: (type?: 'expense' | 'income' | 'transfer') => void;
  onEditTransaction: (tx: Transaction) => void;
  onSelectTab: (tab: any) => void;
  onOpenExportReport: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  accounts,
  transactions,
  categories,
  baseCurrency,
  onOpenNewTransaction,
  onEditTransaction,
  onSelectTab,
  onOpenExportReport,
}) => {
  const { t } = useTranslation();
  const activeAccounts = accounts.filter((a) => !a.isDeleted);
  const activeTransactions = transactions.filter((t) => !t.isDeleted);
  const aiAlerts = useLiveQuery(() => db.ai_failure_alerts.filter((a) => !a.dismissed).toArray()) || [];

  // 1. Calculate Total Net Worth normalized in Base Currency
  const totalNetWorth = activeAccounts
    .filter((a) => a.includeInNetWorth)
    .reduce((sum, acc) => {
      const approxRate = acc.currency === baseCurrency ? 1.0 : acc.currency === 'USD' ? 16250 : 1.0;
      return sum + acc.currentBalance * approxRate;
    }, 0);

  // 2. Calculate Current Month Inflow, Outflow, and Net Cashflow
  const currentMonthPrefix = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
  const currentMonthTxs = activeTransactions.filter((t) => t.date.startsWith(currentMonthPrefix));

  const monthlyIncome = currentMonthTxs
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + (t.baseAmount || t.amount), 0);

  const monthlyExpense = currentMonthTxs
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + (t.baseAmount || t.amount), 0);

  const netCashFlow = monthlyIncome - monthlyExpense;
  const savingsRate = monthlyIncome > 0 ? Math.round((netCashFlow / monthlyIncome) * 100) : 0;

  // 3. Recent Transactions (last 5)
  const recentTransactions = [...activeTransactions]
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
    .slice(0, 5);

  return (
    <div className="space-y-6 pb-20 sm:pb-8">
      {/* AI Provider Persistent Failure Warning */}
      {aiAlerts.length > 0 && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between text-xs text-rose-300">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>
              <strong>AI Provider Alert:</strong> {aiAlerts[0].providerName} failed {aiAlerts[0].failureCount} consecutive times ({aiAlerts[0].reason}). Fallback provider is currently active.
            </span>
          </div>
          <button
            onClick={() => onSelectTab('settings')}
            className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 font-bold ml-3 shrink-0"
          >
            Review Settings
          </button>
        </div>
      )}

      {/* Proactive Advisor Alerts Banner */}
      <ProactiveAlertBanner onNavigateTab={onSelectTab} />

      {/* Top Banner: Net Worth & Quick Actions */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/40 border border-slate-800/80 p-6 sm:p-8 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              <span>{t('dashboard.totalNetWorth')}</span>
              <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full font-mono">
                {baseCurrency}
              </span>
            </div>
            <div className="text-3xl sm:text-4xl md:text-5xl font-black text-white font-mono tracking-tight">
              {formatCurrency(totalNetWorth, baseCurrency)}
            </div>
            <p className="text-xs text-slate-400 mt-2">
              {t('dashboard.acrossAccounts', { count: activeAccounts.length })}
            </p>
          </div>

          {/* Quick Transaction Action Buttons + Export */}
          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={() => onOpenNewTransaction('expense')}
              className="flex items-center space-x-2 px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 hover:text-rose-300 rounded-2xl text-xs sm:text-sm font-bold transition transform active:scale-95"
            >
              <TrendingDown className="w-4 h-4" />
              <span>+ {t('dashboard.addExpense')}</span>
            </button>
            <button
              onClick={() => onOpenNewTransaction('income')}
              className="flex items-center space-x-2 px-4 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:text-emerald-300 rounded-2xl text-xs sm:text-sm font-bold transition transform active:scale-95"
            >
              <TrendingUp className="w-4 h-4" />
              <span>+ {t('dashboard.addIncome')}</span>
            </button>
            <button
              onClick={() => onOpenNewTransaction('transfer')}
              className="flex items-center space-x-2 px-4 py-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 hover:text-indigo-300 rounded-2xl text-xs sm:text-sm font-bold transition transform active:scale-95"
            >
              <ArrowLeftRight className="w-4 h-4" />
              <span>{t('dashboard.transfer')}</span>
            </button>
            <button
              onClick={onOpenExportReport}
              className="flex items-center space-x-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white rounded-2xl text-xs sm:text-sm font-bold transition transform active:scale-95"
              title="Reports, CSV and Excel Export"
            >
              <FileSpreadsheet className="w-4 h-4 text-blue-400" />
              <span>{t('dashboard.exportReports')}</span>
            </button>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Monthly Cash Flow KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Income Card */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              {t('dashboard.thisMonthIncome')}
            </span>
            <div className="text-xl sm:text-2xl font-extrabold text-emerald-400 font-mono">
              {formatCurrency(monthlyIncome, baseCurrency)}
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">{t('common.today')}</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
            <ArrowDownRight className="w-6 h-6" />
          </div>
        </div>

        {/* Expense Card */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              {t('dashboard.thisMonthExpense')}
            </span>
            <div className="text-xl sm:text-2xl font-extrabold text-rose-400 font-mono">
              {formatCurrency(monthlyExpense, baseCurrency)}
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">{t('common.today')}</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0">
            <ArrowUpRight className="w-6 h-6" />
          </div>
        </div>

        {/* Net Savings Card */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              {t('dashboard.savingsRate')}
            </span>
            <div className="text-xl sm:text-2xl font-extrabold text-blue-400 font-mono">
              {savingsRate}%
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              {t('dashboard.netCashFlow')}: {formatCurrency(netCashFlow, baseCurrency)}
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 1. Net Worth Evolution Chart (Milestone 3.1) */}
      <NetWorthChart
        transactions={transactions}
        accounts={accounts}
        baseCurrency={baseCurrency}
      />

      {/* 2. Visual Comparison Grid: Cash Flow Bar & Category Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CashFlowBarChart
          transactions={transactions}
          baseCurrency={baseCurrency}
        />
        <CategoryDonutChart
          transactions={transactions}
          categories={categories}
          baseCurrency={baseCurrency}
        />
      </div>

      {/* 3. Budget vs Actual Performance Widget (Milestone 3.2) */}
      <BudgetPerformanceWidget
        transactions={transactions}
        categories={categories}
        baseCurrency={baseCurrency}
        onOpenCategoriesTab={() => onSelectTab('categories')}
      />

      {/* 4. Accounts and Recent Ledger Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Accounts Overview Column */}
        <div className="p-5 rounded-3xl bg-slate-900/40 border border-slate-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">{t('accounts.title')}</h3>
            <button
              onClick={() => onSelectTab('accounts')}
              className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center space-x-1"
            >
              <span>{t('common.edit')}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {activeAccounts.map((acc) => (
              <div
                key={acc.id}
                className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800/80 flex items-center justify-between hover:border-slate-700 transition"
              >
                <div className="flex items-center space-x-3">
                  <div
                    className="p-2.5 rounded-xl shrink-0"
                    style={{ backgroundColor: `${acc.color}20`, color: acc.color }}
                  >
                    <IconRenderer name={acc.icon} className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">{acc.name}</h4>
                    <span className="text-[11px] text-slate-400 uppercase tracking-wider">
                      {acc.type}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-sm font-extrabold text-white font-mono block">
                    {formatCurrency(acc.currentBalance, acc.currency)}
                  </span>
                  {acc.monthlyAdminFee?.enabled && (
                    <span className="text-[10px] text-slate-400">
                      Fee: {formatCurrency(acc.monthlyAdminFee.amount, acc.currency)}/mo
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Transactions List */}
        <div className="lg:col-span-2 p-5 rounded-3xl bg-slate-900/40 border border-slate-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              {t('dashboard.recentTransactions')}
            </h3>
            <button
              onClick={() => onSelectTab('transactions')}
              className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center space-x-1"
            >
              <span>{t('dashboard.viewAll')}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentTransactions.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-sm">
              {t('dashboard.noTransactions')}
            </div>
          ) : (
            <div className="divide-y divide-slate-800/60">
              {recentTransactions.map((tx) => {
                const account = activeAccounts.find((a) => a.id === tx.accountId);
                const category = categories.find((c) => c.id === tx.categoryId);

                const isExpense = tx.type === 'expense';
                const isIncome = tx.type === 'income';
                const isTransfer = tx.type === 'transfer';

                return (
                  <div
                    key={tx.id}
                    onClick={() => onEditTransaction(tx)}
                    className="py-3 flex items-center justify-between hover:bg-slate-900/80 px-2 rounded-xl cursor-pointer transition"
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className="p-2.5 rounded-xl shrink-0"
                        style={{
                          backgroundColor: isTransfer
                            ? '#6366f120'
                            : category
                            ? `${category.color}20`
                            : '#3b82f620',
                          color: isTransfer ? '#818cf8' : category ? category.color : '#60a5fa',
                        }}
                      >
                        <IconRenderer
                          name={isTransfer ? 'ArrowLeftRight' : category?.icon || 'Receipt'}
                          className="w-5 h-5"
                        />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-bold text-white truncate max-w-[180px] sm:max-w-xs">
                            {tx.description}
                          </span>
                          {isTransfer && (
                            <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded font-semibold">
                              Transfer
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 text-xs text-slate-400 mt-0.5">
                          <span>{tx.date}</span>
                          <span>•</span>
                          <span className="text-slate-300">{account?.name || 'Account'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className={`text-sm font-bold font-mono ${
                          isExpense
                            ? 'text-rose-400'
                            : isIncome
                            ? 'text-emerald-400'
                            : 'text-indigo-400'
                        }`}
                      >
                        {isExpense ? '-' : isIncome ? '+' : ''}
                        {formatCurrency(tx.amount, tx.currency)}
                      </span>
                      {tx.currency !== baseCurrency && (
                        <span className="text-[11px] text-slate-400 font-mono block">
                          ≈ {formatCurrency(tx.baseAmount, baseCurrency)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
