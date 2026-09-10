import React from 'react';
import { AlertTriangle, IndianRupee, Clock, Flame, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { useDashboardStore } from '../state/useDashboardStore.js';

export const MetricsGrid: React.FC = () => {
  const metrics = useDashboardStore(s => s.metrics);
  const totalMatchingCount = useDashboardStore(s => s.totalMatchingCount);
  const activeIncidents = useDashboardStore(s => s.activeIncidents);

  const formattedVolume = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(metrics.totalVolumeRupees);

  const criticalIncidentsCount = activeIncidents.filter(i => i.severity === 'P1' || i.severity === 'P2').length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Failure Rate & Failed Count */}
      <div className="bg-ops-card border border-ops-border rounded-xl p-4 shadow-sm relative overflow-hidden flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-ops-muted uppercase tracking-wider">
            Failure Rate & Count
          </span>
          <span
            className={`p-1.5 rounded-lg border ${
              metrics.failureRatePercentage > 20
                ? 'bg-red-500/15 text-red-400 border-red-500/30'
                : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
          </span>
        </div>

        <div className="mt-2.5">
          <div className="flex items-baseline space-x-2">
            <span
              className={`text-2xl font-bold font-mono ${
                metrics.failureRatePercentage > 20 ? 'text-red-400' : 'text-emerald-400'
              }`}
            >
              {metrics.failureRatePercentage}%
            </span>
            <span className="text-xs text-ops-muted font-mono">
              ({metrics.failedTransactions} / {totalMatchingCount} failed)
            </span>
          </div>

          <div className="mt-2 w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                metrics.failureRatePercentage > 20 ? 'bg-red-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, metrics.failureRatePercentage)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Matching Transaction Volume */}
      <div className="bg-ops-card border border-ops-border rounded-xl p-4 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-ops-muted uppercase tracking-wider">
            Total Volume
          </span>
          <span className="p-1.5 rounded-lg bg-blue-500/15 text-blue-400 border border-blue-500/30">
            <IndianRupee className="w-4 h-4" />
          </span>
        </div>

        <div className="mt-2.5">
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-white tracking-tight">
              {formattedVolume}
            </span>
          </div>
          <span className="text-xs text-ops-muted mt-1 block">
            Across {totalMatchingCount} matching records
          </span>
        </div>
      </div>

      {/* P95 Latency */}
      <div className="bg-ops-card border border-ops-border rounded-xl p-4 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-ops-muted uppercase tracking-wider">
            P95 Switch Latency
          </span>
          <span
            className={`p-1.5 rounded-lg border ${
              metrics.p95LatencyMs > 400
                ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
            }`}
          >
            <Clock className="w-4 h-4" />
          </span>
        </div>

        <div className="mt-2.5">
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-white">
              {metrics.p95LatencyMs} ms
            </span>
          </div>
          <span
            className={`text-xs mt-1 flex items-center space-x-1 ${
              metrics.p95LatencyMs > 400 ? 'text-amber-400' : 'text-emerald-400'
            }`}
          >
            {metrics.p95LatencyMs > 400 ? (
              <>
                <ArrowUpRight className="w-3 h-3" />
                <span>Elevated switch queue time</span>
              </>
            ) : (
              <>
                <ArrowDownRight className="w-3 h-3" />
                <span>Nominal tolerance (&lt; 500ms)</span>
              </>
            )}
          </span>
        </div>
      </div>

      {/* Active Incidents */}
      <div className="bg-ops-card border border-ops-border rounded-xl p-4 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-ops-muted uppercase tracking-wider">
            Active Incidents
          </span>
          <span
            className={`p-1.5 rounded-lg border ${
              criticalIncidentsCount > 0
                ? 'bg-red-500/15 text-red-400 border-red-500/30'
                : 'bg-blue-500/15 text-blue-400 border-blue-500/30'
            }`}
          >
            <Flame className="w-4 h-4" />
          </span>
        </div>

        <div className="mt-2.5">
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-white">
              {activeIncidents.length}
            </span>
            <span className="text-xs text-red-400 font-mono font-medium">
              ({criticalIncidentsCount} High/Critical)
            </span>
          </div>
          <span className="text-xs text-ops-muted mt-1 block">
            Regional infrastructure alerts
          </span>
        </div>
      </div>
    </div>
  );
};
