import React from 'react';
import { AlertTriangle, ArrowUpRight, CheckCircle2, Clock, IndianRupee } from 'lucide-react';
import { useDashboardState } from '../state/useDashboardStore.js';

export const MetricsGrid: React.FC = () => {
  const { metrics, totalMatchingCount } = useDashboardState();

  const formattedVolume = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(metrics.totalVolumeRupees);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {/* Failure Rate Metric */}
      <div className="bg-ops-card border border-ops-border rounded-xl p-4 shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-ops-muted uppercase tracking-wider">Failure Rate</span>
          <span className={`p-1.5 rounded-lg ${metrics.failureRatePercentage > 15 ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
            <AlertTriangle className="w-4 h-4" />
          </span>
        </div>
        <div className="mt-2 flex items-baseline space-x-2">
          <span className="text-2xl font-bold font-mono text-white">{metrics.failureRatePercentage}%</span>
          <span className="text-xs text-ops-muted">({metrics.failedTransactions} failed)</span>
        </div>
        <div className="mt-2 w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${metrics.failureRatePercentage > 15 ? 'bg-red-500' : 'bg-emerald-500'}`}
            style={{ width: `${Math.min(100, metrics.failureRatePercentage * 2)}%` }}
          />
        </div>
      </div>

      {/* Matching Volume */}
      <div className="bg-ops-card border border-ops-border rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-ops-muted uppercase tracking-wider">Total Volume</span>
          <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
            <IndianRupee className="w-4 h-4" />
          </span>
        </div>
        <div className="mt-2 flex items-baseline space-x-2">
          <span className="text-2xl font-bold font-mono text-white">{formattedVolume}</span>
        </div>
        <span className="text-xs text-ops-muted mt-1 block">Across {totalMatchingCount} filtered items</span>
      </div>

      {/* P95 Latency */}
      <div className="bg-ops-card border border-ops-border rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-ops-muted uppercase tracking-wider">P95 Switch Latency</span>
          <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
            <Clock className="w-4 h-4" />
          </span>
        </div>
        <div className="mt-2 flex items-baseline space-x-2">
          <span className="text-2xl font-bold font-mono text-white">{metrics.p95LatencyMs} ms</span>
        </div>
        <span className="text-xs text-emerald-400 mt-1 flex items-center space-x-1">
          <ArrowUpRight className="w-3 h-3" />
          <span>Nominal tolerance &lt; 500ms</span>
        </span>
      </div>

      {/* Active Stream Health */}
      <div className="bg-ops-card border border-ops-border rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-ops-muted uppercase tracking-wider">Gateway Status</span>
          <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
          </span>
        </div>
        <div className="mt-2 flex items-baseline space-x-2">
          <span className="text-2xl font-bold font-mono text-white">HEALTHY</span>
        </div>
        <span className="text-xs text-ops-muted mt-1 block">5 Indian Regional Hubs Active</span>
      </div>
    </div>
  );
};
