import React from 'react';
import { Header } from './components/Header.js';
import { MetricsGrid } from './components/MetricsGrid.js';
import { FilterBar } from './components/FilterBar.js';
import { VoiceWidget } from './components/VoiceWidget.js';
import { TransactionTable } from './components/TransactionTable.js';
import { IncidentPanel } from './components/IncidentPanel.js';

export const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-ops-bg text-ops-text flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* Voice Control & Interactive Copilot */}
        <VoiceWidget />

        {/* Real-time System Metrics */}
        <MetricsGrid />

        {/* Voice Filter Indicator */}
        <FilterBar />

        {/* Data Grid & Incidents Split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <TransactionTable />
          </div>

          <div className="space-y-6">
            <IncidentPanel />
          </div>
        </div>
      </main>

      <footer className="border-t border-ops-border py-4 px-6 text-center text-xs text-ops-muted">
        VoiceOps • Hands-Free Operations Intelligence • Powered by LiveKit, Gemini & Rime TTS
      </footer>
    </div>
  );
};
