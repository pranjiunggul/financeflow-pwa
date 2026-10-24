import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Trash2,
  RotateCcw,
  Calendar,
  Layers,
} from 'lucide-react';
import type {
  Transaction,
  Account,
  Category,
  CurrencyCode,
} from '../../types';
import { formatCurrency } from '../../services/fx';
import { restoreTransaction } from '../../services/ledger';
import { IconRenderer } from '../common/IconRenderer';

interface TransactionListViewProps {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  baseCurrency: CurrencyCode;
  onOpenNewTransaction: () => void;
  onEditTransaction: (tx: Transaction) => void;
  onOpenBulkHistory?: () => void;
}

export const TransactionListView: React.FC<TransactionListViewProps> = ({
  transactions,
  accounts,
  categories,
  baseCurrency,
  onOpenNewTransaction,
  onEditTransaction,
  onOpenBulkHistory,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('month');
  const [showTrash, setShowTrash] = useState(false);

  // Filter items
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Trash view toggle
      if (showTrash) {
        if (!tx.isDeleted) return false;
      } else {
        if (tx.isDeleted) return false;
      }

      // Type filter
      if (selectedType !== 'all' && tx.type !== selectedType) {
        return false;
      }

      // Account filter
      if (selectedAccountId !== 'all' && tx.accountId !== selectedAccountId && tx.transferMeta?.toAccountId !== selectedAccountId) {
        return false;
      }

      // Date range filter
      if (dateFilter !== 'all') {
        const today = new Date().toISOString().split('T')[0];
        if (dateFilter === 'today' && tx.date !== today) return false;
        if (dateFilter === 'month') {
          const currentMonth = today.slice(0, 7);
          if (!tx.date.startsWith(currentMonth)) return false;
        }
      }

      // Text search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesDesc = tx.description.toLowerCase().includes(query);
        const matchesAmount = tx.amount.toString().includes(query);
        const matchesTags = tx.tags?.some((t) => t.toLowerCase().includes(query));
        const cat = categories.find((c) => c.id === tx.categoryId);
        const matchesCat = cat?.name.toLowerCase().includes(query);
        return matchesDesc || matchesAmount || matchesTags || matchesCat;
      }

      return true;
    });
  }, [transactions, showTrash, selectedType, selectedAccountId, dateFilter, searchQuery, categories]);

  // Group transactions by date
  const groupedByDate = useMemo(() => {
    const groups = new Map<string, Transaction[]>();
    // Sort descending by timestamp / date
    const sorted = [...filteredTransactions].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    for (const tx of sorted) {
      const existing = groups.get(tx.date) || [];
      existing.push(tx);
      groups.set(tx.date, existing);
    }
    return Array.from(groups.entries());
  }, [filteredTransactions]);

  const activeAccounts = accounts.filter((a) => !a.isDeleted);

  return (
    <div className="space-y-5 pb-20 sm:pb-8">
      {/* Top Header & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {showTrash ? 'Trash & Deleted Ledger' : 'Transactions Ledger'}
          </h2>
          <p className="text-xs text-slate-400">
            {showTrash
              ? 'Soft-deleted transactions preserved for recovery'
              : `${filteredTransactions.length} records found`}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowTrash(!showTrash)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition ${
              showTrash
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{showTrash ? 'Exit Trash' : 'View Trash'}</span>
          </button>

          {!showTrash && (
            <div className="flex items-center space-x-2">
              {onOpenBulkHistory && (
                <button
                  onClick={onOpenBulkHistory}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-sky-300 border border-slate-700/80 rounded-xl text-xs sm:text-sm font-semibold flex items-center space-x-1.5 transition shadow-sm"
                  title="Scan & Impor Riwayat Transaksi dari Screenshot Multi-Baris"
                >
                  <Layers className="w-4 h-4 text-sky-400" />
                  <span className="hidden sm:inline">Scan Riwayat</span>
                  <span className="sm:hidden">Riwayat</span>
                </button>
              )}

              <button
                onClick={onOpenNewTransaction}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-blue-600/30 flex items-center space-x-1.5 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Add</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Filter and Search Bar Controls */}
      <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl space-y-3">
        {/* Search Input */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search by description, amount, category, or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-800/80 border border-slate-700/60 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
        </div>

        {/* Filter Badges: Type & Date */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          {/* Type Filter Tabs */}
          <div className="flex flex-wrap gap-1">
            {['all', 'expense', 'income', 'transfer', 'debt', 'receivable'].map((t) => (
              <button
                key={t}
                onClick={() => setSelectedType(t)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold uppercase tracking-wider transition ${
                  selectedType === t
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-800/60 text-slate-400 hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Account Filter & Date Range */}
          <div className="flex items-center space-x-2">
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs font-semibold text-slate-300 focus:outline-none"
            >
              <option value="all">All Accounts</option>
              {activeAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>

            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs font-semibold text-slate-300 focus:outline-none"
            >
              <option value="month">This Month</option>
              <option value="today">Today</option>
              <option value="all">All Time</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grouped Transaction List */}
      {groupedByDate.length === 0 ? (
        <div className="py-16 text-center bg-slate-900/20 border border-slate-800/60 rounded-3xl space-y-2">
          <p className="text-slate-400 text-sm">No transactions match your current filters.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedByDate.map(([dateString, txList]) => {
            // Daily totals
            const dayExpense = txList
              .filter((t) => t.type === 'expense')
              .reduce((sum, t) => sum + (t.baseAmount || t.amount), 0);

            const dayIncome = txList
              .filter((t) => t.type === 'income')
              .reduce((sum, t) => sum + (t.baseAmount || t.amount), 0);

            return (
              <div key={dateString} className="space-y-2">
                {/* Date Header with Daily Subtotals */}
                <div className="flex items-center justify-between px-2 text-xs font-bold text-slate-400">
                  <div className="flex items-center space-x-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>{dateString}</span>
                  </div>
                  <div className="flex items-center space-x-3 font-mono text-[11px]">
                    {dayIncome > 0 && <span className="text-emerald-400">+{formatCurrency(dayIncome, baseCurrency)}</span>}
                    {dayExpense > 0 && <span className="text-rose-400">-{formatCurrency(dayExpense, baseCurrency)}</span>}
                  </div>
                </div>

                {/* Day's Transactions Card */}
                <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl divide-y divide-slate-800/60 overflow-hidden">
                  {txList.map((tx) => {
                    const account = accounts.find((a) => a.id === tx.accountId);
                    const destAccount = tx.transferMeta?.toAccountId
                      ? accounts.find((a) => a.id === tx.transferMeta?.toAccountId)
                      : null;
                    const category = categories.find((c) => c.id === tx.categoryId);

                    const isExpense = tx.type === 'expense';
                    const isIncome = tx.type === 'income';
                    const isTransfer = tx.type === 'transfer';
                    const isDebt = tx.type === 'debt';
                    const isReceivable = tx.type === 'receivable';

                    return (
                      <div
                        key={tx.id}
                        onClick={() => !showTrash && onEditTransaction(tx)}
                        className={`p-3.5 flex items-center justify-between transition ${
                          showTrash
                            ? 'opacity-70 bg-rose-950/10'
                            : 'hover:bg-slate-800/40 cursor-pointer'
                        }`}
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
                              name={
                                isTransfer
                                  ? 'ArrowLeftRight'
                                  : isDebt
                                  ? 'HandCoins'
                                  : isReceivable
                                  ? 'Receipt'
                                  : category?.icon || 'Receipt'
                              }
                              className="w-5 h-5"
                            />
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-bold text-white truncate max-w-[160px] sm:max-w-xs">
                                {tx.description}
                              </span>
                              {isTransfer && (
                                <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded font-semibold">
                                  {account?.name} → {destAccount?.name}
                                </span>
                              )}
                              {tx.transferMeta?.feeAmount && tx.transferMeta.feeAmount > 0 && (
                                <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">
                                  Fee: {formatCurrency(tx.transferMeta.feeAmount, tx.currency)}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center space-x-2 text-xs text-slate-400 mt-0.5">
                              <span>{tx.time || '12:00'}</span>
                              <span>•</span>
                              <span className="text-slate-300">{account?.name}</span>
                              {category && !isTransfer && (
                                <>
                                  <span>•</span>
                                  <span className="text-slate-400">{category.name}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Amount & Actions */}
                        <div className="flex items-center space-x-3">
                          <div className="text-right">
                            <span
                              className={`text-sm font-bold font-mono ${
                                isExpense
                                  ? 'text-rose-400'
                                  : isIncome
                                  ? 'text-emerald-400'
                                  : isTransfer
                                  ? 'text-indigo-400'
                                  : isDebt
                                  ? 'text-amber-400'
                                  : 'text-sky-400'
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

                          {showTrash && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                restoreTransaction(tx.id);
                              }}
                              title="Restore Transaction"
                              className="p-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg transition"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
