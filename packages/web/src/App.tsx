import React from 'react';
import { Header } from './components/Header.js';
import { VoiceWidget } from './components/VoiceWidget.js';
import { MetricsGrid } from './components/MetricsGrid.js';
import { FilterBar } from './components/FilterBar.js';
import { TransactionTable } from './components/TransactionTable.js';
import { IncidentPanel } from './components/IncidentPanel.js';
import { ActivityFeed } from './components/ActivityFeed.js';

export const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-ops-bg text-ops-text flex flex-col font-sans selection:bg-blue-500 selection:text-white">
      {/* Persistent Operations Header */}
      <Header />

      {/* Main Operations Control Room Canvas */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-5">
        {/* Voice Copilot & Interruption Console */}
        <section aria-label="Voice Copilot Console">
          <VoiceWidget />
        </section>

        {/* Real-time Regional KPIs & Health */}
        <section aria-label="Real-time Metrics">
          <MetricsGrid />
        </section>

        {/* Active Voice Filters Indicator */}
        <section aria-label="Voice Filter Parameters">
          <FilterBar />
        </section>

        {/* Split Grid: Live Transaction Feed & Incidents / Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Main Ledger Feed (2 Cols) */}
          <section className="lg:col-span-2 space-y-5" aria-label="Transaction Ledger">
            <TransactionTable />
          </section>

          {/* Incidents & Live Agent Activity Telemetry (1 Col) */}
          <section className="space-y-5" aria-label="Incidents and Activity">
            <IncidentPanel />
            <ActivityFeed />
          </section>
        </div>
      </main>

      {/* Operations Footer with Integration Status */}
      <footer className="border-t border-ops-border py-4 px-6 text-center text-xs text-ops-muted bg-ops-card/50">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <span>VoiceOps • Voice-Native Operations Intelligence • LiveKit + Gemini + Rime TTS Architecture</span>
          <span className="font-mono text-[11px] text-gray-500">Authoritative Turn-Fenced State Sync</span>
        </div>
      </footer>
    </div>
  );
};
