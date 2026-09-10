import React from 'react';
import { Filter, RotateCcw, MapPin, CheckCircle2, AlertCircle, IndianRupee, Clock } from 'lucide-react';
import { useDashboardStore } from '../state/useDashboardStore.js';

export const FilterBar: React.FC = () => {
  const filters = useDashboardStore(s => s.filters);
  const lastUpdatedTurnId = useDashboardStore(s => s.lastUpdatedTurnId);
  const resetFilters = useDashboardStore(s => s.resetFilters);

  const hasActiveFilters = Boolean(
    filters.regions?.length ||
    filters.statuses?.length ||
    typeof filters.minAmount === 'number' ||
    typeof filters.maxAmount === 'number' ||
    typeof filters.timeRangeHours === 'number' ||
    filters.paymentMethods?.length ||
    filters.searchQuery
  );

  const handleReset = () => {
    resetFilters(lastUpdatedTurnId + 1);
  };

  return (
    <div className="bg-ops-card border border-ops-border rounded-xl p-3.5 shadow-sm flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-gray-800/80 border border-gray-700 text-ops-muted text-xs font-semibold uppercase tracking-wider">
          <Filter className="w-3.5 h-3.5 text-blue-400" />
          <span>Active Filters:</span>
        </div>

        {!hasActiveFilters ? (
          <span className="text-xs text-gray-500 italic py-1">
            No active filters (Displaying full synthetic dataset)
          </span>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {/* Regions */}
            {filters.regions?.map(region => (
              <span
                key={region}
                className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-sm"
              >
                <MapPin className="w-3 h-3 text-cyan-400" />
                <span>Region: {region}</span>
              </span>
            ))}

            {/* Statuses */}
            {filters.statuses?.map(status => (
              <span
                key={status}
                className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border shadow-sm ${
                  status === 'FAILED'
                    ? 'bg-red-500/15 text-red-300 border-red-500/40'
                    : status === 'SUCCESS'
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                    : 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                }`}
              >
                {status === 'FAILED' ? (
                  <AlertCircle className="w-3 h-3 text-red-400" />
                ) : (
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                )}
                <span>Status: {status}</span>
              </span>
            ))}

            {/* Min Amount */}
            {typeof filters.minAmount === 'number' && (
              <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/40 shadow-sm">
                <IndianRupee className="w-3 h-3 text-purple-400" />
                <span>Min: &gt; ₹{filters.minAmount.toLocaleString('en-IN')}</span>
              </span>
            )}

            {/* Max Amount */}
            {typeof filters.maxAmount === 'number' && (
              <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/40 shadow-sm">
                <IndianRupee className="w-3 h-3 text-purple-400" />
                <span>Max: &lt; ₹{filters.maxAmount.toLocaleString('en-IN')}</span>
              </span>
            )}

            {/* Time Range */}
            {typeof filters.timeRangeHours === 'number' && (
              <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/40 shadow-sm">
                <Clock className="w-3 h-3 text-amber-400" />
                <span>Last {filters.timeRangeHours}h</span>
              </span>
            )}

            {/* Payment Methods */}
            {filters.paymentMethods?.map(pm => (
              <span
                key={pm}
                className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/40 shadow-sm"
              >
                <span>Method: {pm}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {hasActiveFilters && (
        <button
          onClick={handleReset}
          className="flex items-center space-x-1.5 text-xs px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-ops-muted hover:text-white transition-colors border border-ops-border shadow-sm active:scale-95"
          title="Reset to all records"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Filters</span>
        </button>
      )}
    </div>
  );
};
