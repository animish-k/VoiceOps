import React, { useState } from 'react';
import { Mic, MicOff, Volume2, Sparkles, FastForward } from 'lucide-react';
import { dashboardStore, useDashboardState } from '../state/useDashboardStore.js';

export const VoiceWidget: React.FC = () => {
  const { assistantStatus, lastUpdatedTurnId } = useDashboardState();
  const [isMicActive, setIsMicActive] = useState(false);

  const toggleMic = () => {
    const nextState = !isMicActive;
    setIsMicActive(nextState);
    dashboardStore.setAssistantStatus({
      isListening: nextState
    });
  };

  const handleSimulateTurn1 = () => {
    const nextTurn = lastUpdatedTurnId + 1;
    dashboardStore.setAssistantStatus({
      currentTurnId: nextTurn,
      isThinking: true,
      lastSpokenResponse: "Filtering for failed transactions in Bangalore..."
    });

    setTimeout(() => {
      dashboardStore.setFilters(nextTurn, {
        regions: ['Bangalore'],
        statuses: ['FAILED']
      });
      dashboardStore.setAssistantStatus({
        isThinking: false,
        isSpeaking: true,
        lastSpokenResponse: "Found 3 failed transactions in Bangalore. High rate limit errors detected on partner acquirers."
      });
    }, 400);
  };

  const handleSimulateTurn2Interruption = () => {
    const nextTurn = lastUpdatedTurnId + 1;
    dashboardStore.setAssistantStatus({
      currentTurnId: nextTurn,
      isSpeaking: false,
      isThinking: true,
      interruptionCount: assistantStatus.interruptionCount + 1,
      lastSpokenResponse: "Interrupted! Fencing Turn 1 and applying Mumbai filter > ₹10,000..."
    });

    setTimeout(() => {
      dashboardStore.setFilters(nextTurn, {
        regions: ['Mumbai'],
        statuses: ['FAILED'],
        minAmount: 10000
      });
      dashboardStore.setAssistantStatus({
        isThinking: false,
        isSpeaking: true,
        lastSpokenResponse: "Showing failed transactions for Mumbai above ₹10,000. 3 high-value switch failures identified."
      });
    }, 350);
  };

  return (
    <div className="bg-ops-card border border-ops-border rounded-xl p-5 shadow-lg relative overflow-hidden">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Mic and Assistant Status */}
        <div className="flex items-center space-x-4 w-full md:w-auto">
          <button
            onClick={toggleMic}
            className={`relative p-4 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-lg ${
              isMicActive
                ? 'bg-red-500 text-white shadow-red-500/30 scale-105'
                : 'bg-blue-600 text-white hover:bg-blue-500 shadow-blue-500/20'
            }`}
          >
            {isMicActive ? <Mic className="w-6 h-6 animate-pulse" /> : <MicOff className="w-6 h-6" />}
            {isMicActive && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
            )}
          </button>

          <div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-bold text-white">Voice Copilot Engine</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Rime TTS Ready
              </span>
            </div>
            <p className="text-xs text-ops-muted mt-0.5">
              {isMicActive ? 'Listening to voice stream... (LiveKit WebRTC)' : 'Click microphone to begin voice session'}
            </p>
          </div>
        </div>

        {/* Spoken Response Display */}
        <div className="flex-1 w-full bg-ops-bg border border-ops-border rounded-xl p-3.5 flex items-start space-x-3">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 shrink-0 mt-0.5">
            <Volume2 className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-ops-muted">Spoken Output (Rime)</span>
              {assistantStatus.interruptionCount > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  {assistantStatus.interruptionCount} Interruption(s) Handled
                </span>
              )}
            </div>
            <p className="text-xs font-medium text-gray-200 mt-1 leading-relaxed">
              "{assistantStatus.lastSpokenResponse}"
            </p>
          </div>
        </div>
      </div>

      {/* Quick Interactive Scenario Simulator */}
      <div className="mt-4 pt-4 border-t border-ops-border/60 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2 text-xs text-ops-muted">
          <Sparkles className="w-3.5 h-3.5 text-blue-400" />
          <span>Quick Scenario Triggers:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleSimulateTurn1}
            className="flex items-center space-x-1.5 text-xs px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 border border-ops-border transition-colors"
          >
            <span>1. "Show failed transactions from Bangalore"</span>
          </button>

          <button
            onClick={handleSimulateTurn2Interruption}
            className="flex items-center space-x-1.5 text-xs px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-colors"
          >
            <FastForward className="w-3.5 h-3.5" />
            <span>2. Interrupt: "Wait, only Mumbai failures &gt; ₹10,000"</span>
          </button>
        </div>
      </div>
    </div>
  );
};
