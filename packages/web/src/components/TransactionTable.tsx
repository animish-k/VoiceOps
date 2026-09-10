import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Clock, ShieldAlert, ChevronLeft, ChevronRight, Layers } from 'lucide-react';
import { Transaction } from '@voiceops/shared';
import { useDashboardStore } from '../state/useDashboardStore.js';

export const TransactionTable: React.FC = () => {
  const transactions = useDashboardStore(s => s.transactions);
  const totalMatchingCount = useDashboardStore(s => s.totalMatchingCount);
  const lastUpdatedTurnId = useDashboardStore(s => s.lastUpdatedTurnId);

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const totalPages = Math.max(1, Math.ceil(transactions.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const visibleTransactions = transactions.slice(startIndex, startIndex + pageSize);

  const getStatusBadge = (tx: Transaction) => {
    switch (tx.status) {
      case 'FAILED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/15 text-red-400 border border-red-500/30">
            <AlertCircle className="w-3 h-3" />
            <span>FAILED</span>
          </span>
        );
      case 'SUCCESS':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" />
            <span>SUCCESS</span>
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Clock className="w-3 h-3" />
            <span>PENDING</span>
          </span>
        );
      case 'DISPUTED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/15 text-purple-400 border border-purple-500/30">
            <ShieldAlert className="w-3 h-3" />
            <span>DISPUTED</span>
          </span>
        );
    }
  };

  const getRegionBadge = (region: string) => {
    const styles: Record<string, string> = {
      Bangalore: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
      Mumbai: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
      Delhi: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      Hyderabad: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
      Chennai: 'bg-pink-500/15 text-pink-300 border-pink-500/30'
    };
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-mono font-medium border ${styles[region] || 'bg-gray-800 text-gray-300 border-gray-700'}`}>
        {region}
      </span>
    );
  };

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'enterprise':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase">Enterprise</span>;
      case 'premium':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 uppercase">Premium</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-medium text-gray-400 bg-gray-800 border border-gray-700 uppercase">Standard</span>;
    }
  };

  return (
    <div className="bg-ops-card border border-ops-border rounded-xl shadow-sm overflow-hidden flex flex-col">
      <div className="px-6 py-4 border-b border-ops-border flex flex-wrap items-center justify-between gap-3 bg-ops-card">
        <div className="flex items-center space-x-3">
          <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Live Transaction Ledger
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Turn #{lastUpdatedTurnId} View
              </span>
            </div>
            <p className="text-xs text-ops-muted mt-0.5">
              Showing {visibleTransactions.length} of {transactions.length} matching transactions ({totalMatchingCount} total matches)
            </p>
          </div>
        </div>

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-ops-muted">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 rounded bg-gray-800 border border-gray-700 disabled:opacity-40 hover:bg-gray-700 text-white"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1 rounded bg-gray-800 border border-gray-700 disabled:opacity-40 hover:bg-gray-700 text-white"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-ops-border bg-ops-bg/80 text-ops-muted uppercase tracking-wider font-semibold">
              <th className="px-5 py-3 font-semibold">Transaction ID</th>
              <th className="px-5 py-3 font-semibold">Region</th>
              <th className="px-5 py-3 font-semibold">Amount</th>
              <th className="px-5 py-3 font-semibold">Status</th>
              <th className="px-5 py-3 font-semibold">Payment Method</th>
              <th className="px-5 py-3 font-semibold">Merchant</th>
              <th className="px-5 py-3 font-semibold">Tier</th>
              <th className="px-5 py-3 font-semibold">Error Diagnosis</th>
              <th className="px-5 py-3 font-semibold">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ops-border/60">
            {visibleTransactions.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-16 text-center text-ops-muted italic">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <AlertCircle className="w-8 h-8 text-gray-500" />
                    <p className="text-sm font-medium text-gray-400">No transactions match current voice criteria</p>
                    <p className="text-xs text-gray-500">Try saying "Show all transactions" or "Reset filters"</p>
                  </div>
                </td>
              </tr>
            ) : (
              visibleTransactions.map(tx => (
                <tr key={tx.id} className="hover:bg-gray-800/50 transition-colors">
                  <td className="px-5 py-3.5 font-mono font-medium text-white">{tx.id}</td>
                  <td className="px-5 py-3.5">{getRegionBadge(tx.region)}</td>
                  <td className="px-5 py-3.5 font-mono font-bold text-white whitespace-nowrap">
                    ₹{tx.amount.toLocaleString('en-IN')}
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap">{getStatusBadge(tx)}</td>
                  <td className="px-5 py-3.5 font-mono text-gray-300 whitespace-nowrap">
                    {tx.paymentMethod}
                  </td>
                  <td className="px-5 py-3.5 text-gray-300 whitespace-nowrap font-medium">
                    {tx.merchantId}
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap">{getTierBadge(tx.customerTier)}</td>
                  <td className="px-5 py-3.5">
                    {tx.errorCode ? (
                      <div className="max-w-xs">
                        <span className="font-mono text-red-400 font-semibold block">
                          {tx.errorCode}
                        </span>
                        <span className="text-[11px] text-gray-400 truncate block">
                          {tx.errorMessage}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-500 font-mono">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 font-mono text-gray-400 whitespace-nowrap">
                    {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
