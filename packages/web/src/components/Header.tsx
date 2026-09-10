import React from 'react';
import { Activity, Radio, Cpu, Mic, Volume2 } from 'lucide-react';
import { useDashboardStore } from '../state/useDashboardStore.js';

export const Header: React.FC = () => {
  const lastUpdatedTurnId = useDashboardStore(s => s.lastUpdatedTurnId);
  const assistantStatus = useDashboardStore(s => s.assistantStatus);
  const mode = useDashboardStore(s => s.mode);

  const getStatusBadge = () => {
    if (assistantStatus.isListening) {
      return {
        label: 'Listening...',
        icon: Mic,
        color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
        dot: 'bg-emerald-400 animate-ping'
      };
    }
    if (assistantStatus.isThinking) {
      return {
        label: 'Thinking / Tool Executing...',
        icon: Cpu,
        color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
        dot: 'bg-amber-400 animate-pulse'
      };
    }
    if (assistantStatus.isSpeaking) {
      return {
        label: 'Speaking (Rime TTS)',
        icon: Volume2,
        color: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
        dot: 'bg-blue-400 animate-ping'
      };
    }
    return {
      label: 'Idle / Ready',
      icon: Radio,
      color: 'text-gray-400 bg-gray-800 border-gray-700',
      dot: 'bg-gray-500'
    };
  };

  const status = getStatusBadge();
  const StatusIcon = status.icon;

  return (
    <header className="border-b border-ops-border bg-ops-card/90 backdrop-blur px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-30 shadow-md">
      <div className="flex items-center space-x-3.5">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600/30 to-indigo-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-inner">
          <Activity className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-1.5">
              VoiceOps
            </h1>
            <span className="text-[10px] uppercase font-mono tracking-widest px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 font-semibold border border-blue-500/30">
              Operations Copilot
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 font-medium border border-purple-500/30">
              {mode === 'SIMULATION' ? 'Simulated Sandbox' : 'Live WebRTC'}
            </span>
          </div>
          <p className="text-xs text-ops-muted mt-0.5">Voice-native operations intelligence</p>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        {/* Authoritative Turn Indicator */}
        <div className="flex items-center space-x-2.5 px-3.5 py-1.5 rounded-lg bg-ops-bg border border-ops-border shadow-inner">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-mono font-medium text-ops-muted">AUTHORITATIVE:</span>
          <span className="text-xs font-mono font-bold text-white bg-gray-800 px-2 py-0.5 rounded border border-gray-700">
            TURN {lastUpdatedTurnId}
          </span>
        </div>

        {/* Assistant / Session Status Badge */}
        <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border text-xs font-medium ${status.color}`}>
          <div className={`w-2 h-2 rounded-full ${status.dot}`} />
          <StatusIcon className="w-3.5 h-3.5" />
          <span>{status.label}</span>
        </div>
      </div>
    </header>
  );
};
