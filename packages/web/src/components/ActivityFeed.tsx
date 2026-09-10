import React from 'react';
import { Terminal, Cpu, Zap, ShieldAlert, Filter, MessageSquare } from 'lucide-react';
import { useDashboardStore, ActivityLogItem } from '../state/useDashboardStore.js';

export const ActivityFeed: React.FC = () => {
  const activityLog = useDashboardStore(s => s.activityLog);
  const toolExecution = useDashboardStore(s => s.toolExecution);

  const getTypeIcon = (type: ActivityLogItem['type']) => {
    switch (type) {
      case 'TOOL_EXECUTION':
        return <Cpu className="w-3.5 h-3.5 text-amber-400" />;
      case 'INTERRUPTION':
        return <Zap className="w-3.5 h-3.5 text-amber-400" />;
      case 'FENCE_REJECT':
        return <ShieldAlert className="w-3.5 h-3.5 text-red-400" />;
      case 'TRANSCRIPT':
        return <MessageSquare className="w-3.5 h-3.5 text-blue-400" />;
      default:
        return <Filter className="w-3.5 h-3.5 text-cyan-400" />;
    }
  };

  return (
    <div className="bg-ops-card border border-ops-border rounded-xl shadow-sm overflow-hidden flex flex-col">
      <div className="px-5 py-3.5 border-b border-ops-border flex items-center justify-between bg-ops-card">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 rounded-lg bg-gray-800 text-blue-400">
            <Terminal className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Agent Activity &amp; Audit Log
            </h2>
            <p className="text-xs text-ops-muted">Live event channel &amp; turn-fence telemetry</p>
          </div>
        </div>

        {toolExecution?.active && (
          <span className="flex items-center space-x-1.5 text-xs font-mono px-2.5 py-1 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 animate-pulse">
            <Cpu className="w-3.5 h-3.5 animate-spin" />
            <span>Running {toolExecution.toolName}...</span>
          </span>
        )}
      </div>

      <div className="p-3 space-y-2 max-h-64 overflow-y-auto font-mono text-xs divide-y divide-ops-border/40">
        {activityLog.length === 0 ? (
          <div className="text-center text-ops-muted py-6 italic">No recent agent events</div>
        ) : (
          activityLog.map(item => (
            <div key={item.id} className="pt-2 first:pt-0">
              <div className="flex items-center justify-between text-[11px] text-gray-500">
                <div className="flex items-center space-x-1.5 font-medium text-gray-300">
                  {getTypeIcon(item.type)}
                  <span className="text-white font-bold">{item.title}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-gray-800 text-gray-400 border border-gray-700">
                    Turn #{item.turnId}
                  </span>
                </div>
                <span className="text-gray-500">{item.timestamp}</span>
              </div>
              {item.details && (
                <div className="mt-1 text-[11px] text-gray-400 bg-ops-bg/80 p-1.5 rounded border border-ops-border/60 break-all leading-relaxed">
                  {item.details}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
