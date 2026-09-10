import React, { useState, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  Sparkles,
  Zap,
  Play,
  ShieldCheck,
  RotateCcw,
  Radio
} from 'lucide-react';
import { useDashboardStore } from '../state/useDashboardStore.js';
import { useLiveKitVoiceSession } from '../voice/useLiveKitVoiceSession.js';
import { useVoiceOpsChannel } from '../hooks/useVoiceOpsChannel.js';

type VoiceMode = 'live' | 'simulation';

interface VoiceTokenResponse {
  token: string;
  livekitUrl?: string;
}

export const VoiceWidget: React.FC = () => {
  const assistantStatus = useDashboardStore(s => s.assistantStatus);
  const lastUpdatedTurnId = useDashboardStore(s => s.lastUpdatedTurnId);
  const userTranscript = useDashboardStore(s => s.userTranscript);
  const assistantTranscript = useDashboardStore(s => s.assistantTranscript);
  const interruptionInfo = useDashboardStore(s => s.interruptionInfo);

  const setAssistantStatus = useDashboardStore(s => s.setAssistantStatus);
  const setTranscript = useDashboardStore(s => s.setTranscript);
  const setFilters = useDashboardStore(s => s.setFilters);
  const handleTurnInterrupted = useDashboardStore(s => s.handleTurnInterrupted);
  const handleToolExecutionStart = useDashboardStore(s => s.handleToolExecutionStart);
  const handleToolExecutionComplete = useDashboardStore(s => s.handleToolExecutionComplete);
  const applySnapshot = useDashboardStore(s => s.applySnapshot);
  const resetToBaseline = useDashboardStore(s => s.resetToBaseline);
  const clearInterruption = useDashboardStore(s => s.clearInterruption);

  const [mode, setMode] = useState<VoiceMode>('simulation');
  const [isSimulatingFull, setIsSimulatingFull] = useState(false);
  const [connectionError, setConnectionError] = useState<Error>();

  const { processIncomingEvent } = useVoiceOpsChannel();

  const {
    state: liveState,
    error: liveError,
    connect,
    disconnect
  } = useLiveKitVoiceSession({
    onDataReceived: (data: unknown) => {
      const payload = data as Record<string, any>;
      if (payload && payload.type) {
        processIncomingEvent(payload as any);
      }
    }
  });

  const isLiveMicActive =
    liveState === 'connecting' ||
    liveState === 'connected' ||
    liveState === 'listening' ||
    liveState === 'reconnecting';

  const isMicActive = mode === 'live' ? isLiveMicActive : assistantStatus.isListening;

  // Auto-clear interruption banner after 8 seconds
  useEffect(() => {
    if (interruptionInfo) {
      const timer = setTimeout(() => {
        clearInterruption();
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [interruptionInfo, clearInterruption]);

  useEffect(() => {
    if (mode !== 'live') {
      return;
    }
    setAssistantStatus({
      isListening: liveState === 'listening' || liveState === 'reconnecting'
    });
  }, [liveState, mode, setAssistantStatus]);

  const requestVoiceToken = async (): Promise<VoiceTokenResponse> => {
    const apiUrl = import.meta.env.VITE_API_URL ?? '';
    const response = await fetch(`${apiUrl}/api/livekit/token`);
    if (!response.ok) {
      throw new Error(`Voice token request failed (${response.status})`);
    }

    const payload = (await response.json()) as VoiceTokenResponse;
    if (!payload.token) {
      throw new Error('Voice token response did not include a token');
    }
    return payload;
  };

  const toggleMic = async () => {
    setConnectionError(undefined);

    if (mode === 'simulation') {
      const nextListening = !assistantStatus.isListening;
      setAssistantStatus({
        isListening: nextListening,
        isSpeaking: false,
        isThinking: false
      });
      return;
    }

    if (isLiveMicActive) {
      await disconnect();
      return;
    }

    try {
      const tokenResponse = await requestVoiceToken();
      const livekitUrl = tokenResponse.livekitUrl ?? import.meta.env.VITE_LIVEKIT_URL;
      if (!livekitUrl) {
        throw new Error('VITE_LIVEKIT_URL is required for live voice');
      }
      await connect({ livekitUrl, token: tokenResponse.token });
    } catch (error) {
      setConnectionError(error instanceof Error ? error : new Error(String(error)));
    }
  };

  const displayedError = connectionError ?? liveError;

  // Turn 1 Simulation: "Show failed transactions from Bangalore"
  const handleSimulateTurn1 = () => {
    const turn1Id = 1;
    clearInterruption();

    // 1. User starts speaking
    setTranscript('user', 'Show failed transactions from Bangalore.', true, turn1Id);
    setAssistantStatus({
      currentTurnId: turn1Id,
      isListening: false,
      isThinking: true,
      isSpeaking: false
    });

    // 2. Tool execution simulated
    handleToolExecutionStart('query_transactions', { region: 'Bangalore', status: 'FAILED' }, turn1Id);

    setTimeout(() => {
      handleToolExecutionComplete('query_transactions', 18, turn1Id);
      setFilters(turn1Id, {
        regions: ['Bangalore'],
        statuses: ['FAILED']
      });

      setAssistantStatus({
        isThinking: false,
        isSpeaking: true,
        lastSpokenResponse:
          'Found 3 failed transactions in Bangalore. High rate limit errors detected on partner acquiring gateway.'
      });
      setTranscript(
        'assistant',
        'Found 3 failed transactions in Bangalore. High rate limit errors detected on partner acquiring gateway.',
        true,
        turn1Id
      );
    }, 450);
  };

  // Turn 2 Interruption Simulation: "Wait, only Mumbai failures above ten thousand rupees"
  const handleSimulateTurn2Interruption = () => {
    const supersededTurnId = 1;
    const newTurnId = 2;

    // 1. Trigger Interruption Event
    handleTurnInterrupted(
      supersededTurnId,
      newTurnId,
      'User voice cutoff detected during assistant playback'
    );

    // 2. User utterance for Turn 2
    setTranscript('user', 'Wait, only Mumbai failures above ten thousand rupees.', true, newTurnId);

    // 3. Tool execution for Turn 2
    handleToolExecutionStart(
      'query_transactions',
      { region: 'Mumbai', status: 'FAILED', minAmount: 10000 },
      newTurnId
    );

    setTimeout(() => {
      handleToolExecutionComplete('query_transactions', 14, newTurnId);
      setFilters(newTurnId, {
        regions: ['Mumbai'],
        statuses: ['FAILED'],
        minAmount: 10000
      });

      setAssistantStatus({
        isThinking: false,
        isSpeaking: true,
        lastSpokenResponse:
          'Authoritative Turn #2: Showing failed transactions for Mumbai above ₹10,000. 3 high-value switch failures identified (up to ₹78,500).'
      });
      setTranscript(
        'assistant',
        'Authoritative Turn #2: Showing failed transactions for Mumbai above ₹10,000. 3 high-value switch failures identified (up to ₹78,500).',
        true,
        newTurnId
      );
    }, 450);
  };

  // Stale Turn 1 Snapshot Simulation (Tests and demonstrates Turn Fence rejection)
  const handleSimulateStaleTurn1 = () => {
    const staleTurnId = 1;
    const fakeStaleState = {
      lastUpdatedTurnId: staleTurnId,
      filters: { regions: ['Bangalore' as const], statuses: ['FAILED' as const] },
      transactions: [],
      totalMatchingCount: 3,
      metrics: {
        totalTransactions: 3,
        failedTransactions: 3,
        failureRatePercentage: 100,
        totalVolumeRupees: 19550,
        p95LatencyMs: 420
      },
      activeIncidents: [],
      assistantStatus: {
        isListening: false,
        isThinking: false,
        isSpeaking: true,
        currentTurnId: staleTurnId,
        interruptionCount: 0,
        lastSpokenResponse: 'STALE PACKET: Bangalore transactions'
      }
    };

    applySnapshot(fakeStaleState, staleTurnId);
  };

  // Full Automated Interruption Demo Flow
  const handleRunFullScenario = () => {
    setIsSimulatingFull(true);
    resetToBaseline();

    // Step 1: User asks Bangalore Turn 1
    setTimeout(() => {
      handleSimulateTurn1();
    }, 600);

    // Step 2: User interrupts with Turn 2 while Turn 1 is speaking
    setTimeout(() => {
      handleSimulateTurn2Interruption();
    }, 2800);

    // Step 3: Late arriving Turn 1 packet arrives after Turn 2
    setTimeout(() => {
      handleSimulateStaleTurn1();
      setIsSimulatingFull(false);
    }, 5000);
  };

  return (
    <div className="bg-ops-card border border-ops-border rounded-xl p-5 shadow-lg relative overflow-hidden flex flex-col space-y-4">
      {/* Interruption Alert Banner */}
      {interruptionInfo && (
        <div className="bg-gradient-to-r from-amber-500/20 via-amber-500/15 to-transparent border border-amber-500/40 rounded-xl p-3.5 flex items-center justify-between shadow-inner animate-pulse">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                  ⚡ Interruption Handled
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Turn #{interruptionInfo.supersededTurnId} ➔ Turn #{interruptionInfo.newTurnId}
                </span>
              </div>
              <p className="text-xs text-amber-200/90 mt-0.5">
                {interruptionInfo.reason} — Audio cutoff triggered &amp; authoritative turn fenced.
              </p>
            </div>
          </div>
          <button
            onClick={clearInterruption}
            className="text-xs font-mono text-amber-400 hover:text-white px-2 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Voice Console Section */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Mic Control & Engine Status */}
        <div className="flex items-center space-x-4 bg-ops-bg p-3.5 rounded-xl border border-ops-border shrink-0">
          <button
            onClick={toggleMic}
            className={`relative p-4 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-lg ${
              isMicActive
                ? 'bg-red-500 text-white shadow-red-500/40 scale-105 ring-4 ring-red-500/20'
                : assistantStatus.isSpeaking
                ? 'bg-blue-600 text-white shadow-blue-500/30 ring-4 ring-blue-500/20'
                : 'bg-gray-800 text-gray-300 hover:bg-blue-600 hover:text-white border border-gray-700'
            }`}
            title={isMicActive ? 'Mute microphone' : 'Start listening'}
          >
            {isMicActive ? (
              <Mic className="w-6 h-6 animate-pulse" />
            ) : assistantStatus.isSpeaking ? (
              <Volume2 className="w-6 h-6 animate-bounce" />
            ) : (
              <MicOff className="w-6 h-6" />
            )}
            {isMicActive && (
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500"></span>
              </span>
            )}
          </button>

          <div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-bold text-white tracking-tight">Voice Operations Copilot</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30 font-semibold">
                {mode === 'live' ? 'LIVE VOICE (LiveKit + Rime)' : 'SIMULATION MODE'}
              </span>
            </div>
            <p className="text-xs text-ops-muted mt-1 flex items-center space-x-1.5">
              <Radio className="w-3 h-3 text-emerald-400" />
              <span>
                {mode === 'live'
                  ? displayedError?.message ??
                    (isLiveMicActive ? `LiveKit: ${liveState}` : 'Click mic to start LiveKit voice session')
                  : assistantStatus.isListening
                  ? 'Simulation listening for voice input...'
                  : assistantStatus.isThinking
                  ? 'Processing audio stream & executing tools...'
                  : assistantStatus.isSpeaking
                  ? 'Speaking synthetic response via Rime...'
                  : 'Ready for voice query / trigger below'}
              </span>
            </p>
          </div>
        </div>

        {/* Dynamic Waveform Visualizer */}
        <div className="flex-1 bg-ops-bg border border-ops-border rounded-xl p-3 flex flex-col justify-center min-h-[72px]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-ops-muted flex items-center space-x-1">
              <Volume2 className="w-3 h-3 text-blue-400" />
              <span>Audio Waveform Activity</span>
            </span>
            <span className="text-[10px] font-mono text-gray-500">
              {assistantStatus.isSpeaking
                ? 'Rime TTS Output Stream (Active)'
                : isMicActive
                ? 'Microphone VAD Stream (Listening)'
                : 'Stream Idle'}
            </span>
          </div>

          <div className="flex items-center justify-between gap-1 h-7 px-1">
            {[40, 65, 30, 85, 95, 45, 70, 100, 60, 35, 80, 50, 90, 75, 40, 60, 85, 30, 95, 55, 70, 45, 90, 60].map(
              (height, idx) => {
                const isActive = assistantStatus.isSpeaking || isMicActive;
                const dynamicHeight = isActive ? Math.max(15, (height * ((idx % 3) + 1)) % 100) : 15;
                return (
                  <div
                    key={idx}
                    className={`flex-1 rounded-full transition-all duration-200 ${
                      assistantStatus.isSpeaking
                        ? 'bg-blue-400'
                        : isMicActive
                        ? 'bg-emerald-400'
                        : 'bg-gray-800'
                    }`}
                    style={{ height: `${dynamicHeight}%` }}
                  />
                );
              }
            )}
          </div>
        </div>
      </div>

      {/* Transcripts (User & Assistant) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* User Utterance Box */}
        <div className="bg-ops-bg border border-ops-border rounded-xl p-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 flex items-center space-x-1">
                <Mic className="w-3.5 h-3.5" />
                <span>Analyst Voice Input</span>
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700">
                Turn #{lastUpdatedTurnId}
              </span>
            </div>
            <p className="text-xs text-gray-200 font-medium leading-relaxed italic">
              {userTranscript ? (
                `"${userTranscript}"`
              ) : (
                <span className="text-gray-500 not-italic">No voice input in current session.</span>
              )}
            </p>
          </div>
        </div>

        {/* Assistant Spoken Response Box */}
        <div className="bg-ops-bg border border-ops-border rounded-xl p-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400 flex items-center space-x-1">
                <Volume2 className="w-3.5 h-3.5" />
                <span>Copilot Spoken Response (Rime TTS)</span>
              </span>
              {assistantStatus.interruptionCount > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  {assistantStatus.interruptionCount} Interruption(s)
                </span>
              )}
            </div>
            <p className="text-xs text-gray-200 font-medium leading-relaxed">
              "{assistantTranscript || assistantStatus.lastSpokenResponse}"
            </p>
          </div>
        </div>
      </div>

      {/* Mode Switcher */}
      <div className="flex items-center gap-2 border-t border-ops-border/60 pt-3">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-ops-muted">Voice Engine Mode:</span>
        <button
          onClick={() => setMode('live')}
          className={`rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition-colors ${
            mode === 'live'
              ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-300'
              : 'border-ops-border bg-ops-bg text-ops-muted hover:text-gray-200'
          }`}
        >
          LIVE WEBRTC + RIME
        </button>
        <button
          onClick={() => {
            void disconnect();
            setMode('simulation');
          }}
          className={`rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition-colors ${
            mode === 'simulation'
              ? 'border-blue-400/40 bg-blue-500/10 text-blue-300'
              : 'border-ops-border bg-ops-bg text-ops-muted hover:text-gray-200'
          }`}
        >
          SIMULATION / DEMO
        </button>
      </div>

      {/* Interactive Scenario & Demo Trigger Controls */}
      <div className="pt-3 border-t border-ops-border/70 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center space-x-2 text-xs font-semibold text-ops-muted">
          <Sparkles className="w-4 h-4 text-blue-400" />
          <span>Primary Interruption Demo Flow:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Step 1 */}
          <button
            onClick={handleSimulateTurn1}
            className="flex items-center space-x-1.5 text-xs px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-cyan-300 border border-gray-700 transition-colors active:scale-95 shadow-sm"
          >
            <span className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px] font-bold">
              1
            </span>
            <span>Turn 1: "Bangalore Failures"</span>
          </button>

          {/* Step 2: Interruption */}
          <button
            onClick={handleSimulateTurn2Interruption}
            className="flex items-center space-x-1.5 text-xs px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 transition-colors active:scale-95 shadow-sm font-semibold"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>2. Interrupt: "Mumbai &gt; ₹10k"</span>
          </button>

          {/* Step 3: Stale Turn 1 Packet */}
          <button
            onClick={handleSimulateStaleTurn1}
            className="flex items-center space-x-1.5 text-xs px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 transition-colors active:scale-95 shadow-sm"
            title="Attempts to send late Turn 1 packet to test turn fence"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-red-400" />
            <span>3. Stale Turn 1 Packet (Verify Fence)</span>
          </button>

          {/* Full Scenario Automated Run */}
          <button
            onClick={handleRunFullScenario}
            disabled={isSimulatingFull}
            className="flex items-center space-x-1.5 text-xs px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors active:scale-95 shadow-md disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isSimulatingFull ? 'Running Demo...' : '▶ Run Full Demo Scenario'}</span>
          </button>

          {/* Reset to Baseline */}
          <button
            onClick={resetToBaseline}
            className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-ops-muted hover:text-white border border-gray-700 transition-colors"
            title="Reset to baseline"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
