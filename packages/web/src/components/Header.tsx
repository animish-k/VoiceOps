import React from 'react';
import { Activity, Radio } from 'lucide-react';
import { useDashboardState } from '../state/useDashboardStore.js';

export const Header: React.FC = () => {
  const { lastUpdatedTurnId, assistantStatus } = useDashboardState();

  return (
    <header className="border-b border-ops-border bg-ops-card/80 backdrop-blur px-6 py-4 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-inner">
          <Activity className="w-5 h-5 animate-pulse" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold tracking-tight text-white">VoiceOps</h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-medium border border-blue-500/20">
              Operations Copilot
            </span>
          </div>
          <p className="text-xs text-ops-muted">Realtime Support & Payment Switch Intelligence</p>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {/* Authoritative Turn Indicator */}
        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-ops-bg border border-ops-border">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-xs font-mono text-ops-muted">Authoritative Turn:</span>
          <span className="text-xs font-mono font-bold text-white">#{lastUpdatedTurnId}</span>
        </div>

        {/* Live Status Badge */}
        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-ops-bg border border-ops-border">
          <Radio className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
          <span className="text-xs font-medium text-blue-300">
            {assistantStatus.isSpeaking
              ? 'AI Speaking (Rime)'
              : assistantStatus.isThinking
              ? 'Executing Query...'
              : assistantStatus.isListening
              ? 'Listening...'
              : 'Voice Session Ready'}
          </span>
        </div>
      </div>
    </header>
  );
};
