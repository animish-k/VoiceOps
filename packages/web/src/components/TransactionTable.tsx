import React from 'react';
import { AlertCircle, CheckCircle2, Clock, ShieldAlert } from 'lucide-react';
import { Transaction } from '@voiceops/shared';
import { useDashboardState } from '../state/useDashboardStore.js';

export const TransactionTable: React.FC = () => {
  const { transactions, totalMatchingCount } = useDashboardState();

  const getStatusBadge = (tx: Transaction) => {
    switch (tx.status) {
      case 'FAILED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
            <AlertCircle className="w-3 h-3" />
            <span>FAILED</span>
          </span>
        );
      case 'SUCCESS':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            <span>SUCCESS</span>
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-3 h-3" />
            <span>PENDING</span>
          </span>
        );
      case 'DISPUTED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <ShieldAlert className="w-3 h-3" />
            <span>DISPUTED</span>
          </span>
        );
    }
  };

  const getRegionBadge = (region: string) => {
    const colors: Record<string, string> = {
      Bangalore: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
      Mumbai: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
      Delhi: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      Hyderabad: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      Chennai: 'bg-pink-500/10 text-pink-400 border-pink-500/20'
    };
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-mono font-medium border ${colors[region] || 'bg-gray-800 text-gray-400'}`}>
        {region}
      </span>
    );
  };

  return (
    <div className="bg-ops-card border border-ops-border rounded-xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-ops-border flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Live Transaction Feed</h2>
          <p className="text-xs text-ops-muted mt-0.5">Showing {transactions.length} of {totalMatchingCount} matching records</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-ops-border bg-ops-bg/60 text-ops-muted uppercase tracking-wider font-semibold">
              <th className="px-6 py-3">Transaction ID</th>
              <th className="px-6 py-3">Region</th>
              <th className="px-6 py-3">Amount (INR)</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Payment Method</th>
              <th className="px-6 py-3">Merchant</th>
              <th className="px-6 py-3">Error Diagnosis</th>
              <th className="px-6 py-3">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ops-border/60">
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-ops-muted italic">
                  No transactions match the current voice filter criteria.
                </td>
              </tr>
            ) : (
              transactions.map(tx => (
                <tr key={tx.id} className="hover:bg-gray-800/40 transition-colors">
                  <td className="px-6 py-3 font-mono font-medium text-white">{tx.id}</td>
                  <td className="px-6 py-3">{getRegionBadge(tx.region)}</td>
                  <td className="px-6 py-3 font-mono font-semibold text-white">
                    ₹{tx.amount.toLocaleString('en-IN')}
                  </td>
                  <td className="px-6 py-3">{getStatusBadge(tx)}</td>
                  <td className="px-6 py-3 font-mono text-ops-muted">{tx.paymentMethod}</td>
                  <td className="px-6 py-3 text-ops-muted">{tx.merchantId}</td>
                  <td className="px-6 py-3">
                    {tx.errorCode ? (
                      <div>
                        <span className="font-mono text-red-400 font-semibold">{tx.errorCode}</span>
                        <span className="block text-[10px] text-ops-muted truncate max-w-xs">{tx.errorMessage}</span>
                      </div>
                    ) : (
                      <span className="text-gray-500">—</span>
                    )}
                  </td>
                  <td className="px-6 py-3 font-mono text-gray-500 whitespace-nowrap">
                    {new Date(tx.timestamp).toLocaleTimeString()}
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
