import React from 'react';
import { Flame, AlertCircle, ShieldAlert, Server, MapPin, Clock } from 'lucide-react';
import { Incident } from '@voiceops/shared';
import { useDashboardStore } from '../state/useDashboardStore.js';

export const IncidentPanel: React.FC = () => {
  const activeIncidents = useDashboardStore(s => s.activeIncidents);

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'P1':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-red-500/20 text-red-400 border border-red-500/50 flex items-center space-x-1 animate-pulse">
            <Flame className="w-3 h-3 text-red-400" />
            <span>CRITICAL P1</span>
          </span>
        );
      case 'P2':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center space-x-1">
            <AlertCircle className="w-3 h-3 text-amber-400" />
            <span>HIGH P2</span>
          </span>
        );
      case 'P3':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/40">
            MEDIUM P3
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-gray-800 text-gray-400 border border-gray-700">
            LOW P4
          </span>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'INVESTIGATING':
        return <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 font-semibold">INVESTIGATING</span>;
      case 'OPEN':
        return <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">OPEN</span>;
      case 'MITIGATED':
        return <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">MITIGATED</span>;
      default:
        return <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-gray-800 text-gray-400 font-semibold">RESOLVED</span>;
    }
  };

  return (
    <div className="bg-ops-card border border-ops-border rounded-xl shadow-sm overflow-hidden flex flex-col h-full">
      <div className="px-5 py-4 border-b border-ops-border flex items-center justify-between bg-ops-card">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 rounded-lg bg-red-500/15 text-red-400 border border-red-500/30">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Active Regional Incidents
            </h2>
            <p className="text-xs text-ops-muted mt-0.5">Payment infrastructure status</p>
          </div>
        </div>

        <span className="text-xs font-mono px-2.5 py-1 rounded-md bg-red-500/15 text-red-300 border border-red-500/30 font-bold">
          {activeIncidents.length} Active
        </span>
      </div>

      <div className="divide-y divide-ops-border/60 overflow-y-auto max-h-[500px]">
        {activeIncidents.length === 0 ? (
          <div className="p-8 text-center text-ops-muted italic text-xs">
            No active incidents reported across payment nodes.
          </div>
        ) : (
          activeIncidents.map((inc: Incident) => (
            <div key={inc.id} className="p-4 hover:bg-gray-800/40 transition-colors">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                  {getSeverityBadge(inc.severity)}
                  <span className="font-mono text-xs font-bold text-white">{inc.id}</span>
                </div>
                {getStatusBadge(inc.status)}
              </div>

              <h3 className="text-xs font-semibold text-gray-200 mt-1 leading-snug">
                {inc.title}
              </h3>

              <p className="text-xs text-ops-muted mt-1.5 leading-relaxed bg-ops-bg/60 p-2 rounded-lg border border-ops-border/60">
                {inc.summary}
              </p>

              <div className="mt-2.5 grid grid-cols-2 gap-2 text-[11px] text-gray-400 font-mono">
                <div className="flex items-center space-x-1 truncate">
                  <MapPin className="w-3 h-3 text-cyan-400 shrink-0" />
                  <span>Region: <strong className="text-gray-200">{inc.affectedRegion}</strong></span>
                </div>
                <div className="flex items-center space-x-1 truncate">
                  <Server className="w-3 h-3 text-purple-400 shrink-0" />
                  <span>Node: <strong className="text-gray-200">{inc.failingComponent}</strong></span>
                </div>
              </div>

              <div className="mt-1.5 flex items-center space-x-1 text-[10px] text-gray-500 font-mono">
                <Clock className="w-3 h-3 text-gray-500" />
                <span>Started: {new Date(inc.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
