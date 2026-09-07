import React from 'react';
import { Flame } from 'lucide-react';
import { useDashboardState } from '../state/useDashboardStore.js';

export const IncidentPanel: React.FC = () => {
  const { activeIncidents } = useDashboardState();

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'P1':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/40">CRITICAL P1</span>;
      case 'P2':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40">HIGH P2</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/40">MEDIUM P3</span>;
    }
  };

  return (
    <div className="bg-ops-card border border-ops-border rounded-xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-ops-border flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Flame className="w-4 h-4 text-red-400" />
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Active Incidents</h2>
        </div>
        <span className="text-xs font-mono px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
          {activeIncidents.length} Unresolved
        </span>
      </div>

      <div className="divide-y divide-ops-border/60">
        {activeIncidents.map(inc => (
          <div key={inc.id} className="p-4 hover:bg-gray-800/40 transition-colors">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center space-x-2">
                  {getSeverityBadge(inc.severity)}
                  <span className="font-mono text-xs font-bold text-white">{inc.id}</span>
                  <span className="text-xs font-medium text-gray-300">{inc.title}</span>
                </div>
                <p className="text-xs text-ops-muted mt-1.5 leading-relaxed">{inc.summary}</p>
                <div className="mt-2 flex items-center space-x-4 text-[11px] text-gray-500 font-mono">
                  <span>Region: <strong className="text-gray-300">{inc.affectedRegion}</strong></span>
                  <span>Component: <strong className="text-gray-300">{inc.failingComponent}</strong></span>
                  <span>Started: {new Date(inc.startedAt).toLocaleTimeString()}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
