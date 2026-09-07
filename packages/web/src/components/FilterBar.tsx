import React from 'react';
import { Filter, RotateCcw, Tag } from 'lucide-react';
import { dashboardStore, useDashboardState } from '../state/useDashboardStore.js';

export const FilterBar: React.FC = () => {
  const { filters, lastUpdatedTurnId } = useDashboardState();

  const hasActiveFilters = Boolean(
    filters.regions?.length ||
    filters.statuses?.length ||
    typeof filters.minAmount === 'number' ||
    typeof filters.maxAmount === 'number'
  );

  const handleReset = () => {
    dashboardStore.resetFilters(lastUpdatedTurnId + 1);
  };

  return (
    <div className="bg-ops-card border border-ops-border rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center space-x-2">
        <div className="p-1.5 rounded-lg bg-gray-800 text-ops-muted">
          <Filter className="w-4 h-4" />
        </div>
        <span className="text-xs font-medium text-ops-muted">Active Voice Filters:</span>

        {!hasActiveFilters ? (
          <span className="text-xs text-gray-500 italic">None (Displaying all regional records)</span>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {filters.regions?.map(region => (
              <span
                key={region}
                className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/30"
              >
                <Tag className="w-3 h-3" />
                <span>Region: {region}</span>
              </span>
            ))}

            {filters.statuses?.map(status => (
              <span
                key={status}
                className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium border ${
                  status === 'FAILED'
                    ? 'bg-red-500/10 text-red-400 border-red-500/30'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                }`}
              >
                <span>Status: {status}</span>
              </span>
            ))}

            {typeof filters.minAmount === 'number' && (
              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/30">
                <span>Min: ₹{filters.minAmount.toLocaleString('en-IN')}</span>
              </span>
            )}

            {typeof filters.maxAmount === 'number' && (
              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/30">
                <span>Max: ₹{filters.maxAmount.toLocaleString('en-IN')}</span>
              </span>
            )}
          </div>
        )}
      </div>

      {hasActiveFilters && (
        <button
          onClick={handleReset}
          className="flex items-center space-x-1 text-xs px-2.5 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-ops-muted hover:text-white transition-colors border border-ops-border"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Clear Filters</span>
        </button>
      )}
    </div>
  );
};
