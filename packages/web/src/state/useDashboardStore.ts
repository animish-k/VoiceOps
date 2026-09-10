import { create } from 'zustand';
import {
  DashboardState,
  DashboardFilterState,
  MetricsSummary,
  Transaction,
  TurnStatus,
  TurnMetadata,
  DataChannelEvent,
  SYNTHETIC_TRANSACTIONS,
  SYNTHETIC_INCIDENTS,
  querySyntheticTransactions
} from '@voiceops/shared';

export interface ActivityLogItem {
  id: string;
  timestamp: string;
  turnId: number;
  type: 'TOOL_EXECUTION' | 'INTERRUPTION' | 'FILTER_CHANGE' | 'TRANSCRIPT' | 'FENCE_REJECT';
  title: string;
  details?: string;
}

export interface InterruptionInfo {
  supersededTurnId: number;
  newTurnId: number;
  reason: string;
  timestamp: number;
}

export interface DashboardStoreState extends DashboardState {
  // Extended UI & Session States
  userTranscript: string;
  assistantTranscript: string;
  interruptionInfo: InterruptionInfo | null;
  activityLog: ActivityLogItem[];
  mode: 'SIMULATION' | 'LIVE_READY';
  toolExecution: {
    active: boolean;
    toolName?: string;
    args?: Record<string, unknown>;
    durationMs?: number;
  } | null;

  // Store Actions
  applySnapshot: (snapshot: DashboardState, turnId: number) => boolean;
  applyPatch: (patch: Partial<DashboardState>, turnId: number) => boolean;
  applyTurnUpdate: (turnId: number, update: Partial<DashboardState>) => boolean;
  setAssistantStatus: (status: Partial<DashboardState['assistantStatus']>) => void;
  setTranscript: (role: 'user' | 'assistant', text: string, isFinal: boolean, turnId: number) => boolean;
  handleTurnInterrupted: (supersededTurnId: number, newTurnId: number, reason?: string) => void;
  handleToolExecutionStart: (toolName: string, args: Record<string, unknown>, turnId: number) => boolean;
  handleToolExecutionComplete: (toolName: string, durationMs: number, turnId: number) => boolean;
  handleTurnStatusUpdate: (status: TurnStatus, metadata: TurnMetadata, turnId: number) => boolean;
  handleDataChannelEvent: (event: DataChannelEvent) => boolean;
  setFilters: (turnId: number, filters: DashboardFilterState) => boolean;
  resetFilters: (turnId?: number) => boolean;
  clearInterruption: () => void;
  resetToBaseline: () => void;
}

export function computeMetrics(transactions: Transaction[]): MetricsSummary {
  const total = transactions.length;
  const failed = transactions.filter(t => t.status === 'FAILED').length;
  const totalVolume = transactions.reduce((acc, t) => acc + t.amount, 0);
  const failureRate = total > 0 ? (failed / total) * 100 : 0;

  return {
    totalTransactions: total,
    failedTransactions: failed,
    failureRatePercentage: parseFloat(failureRate.toFixed(1)),
    totalVolumeRupees: totalVolume,
    p95LatencyMs: failed > 0 ? 420 : 210
  };
}

const initialTransactions = SYNTHETIC_TRANSACTIONS;
const initialMetrics = computeMetrics(initialTransactions);

const initialDashboardState: DashboardState = {
  lastUpdatedTurnId: 1,
  filters: {},
  transactions: initialTransactions,
  totalMatchingCount: initialTransactions.length,
  metrics: initialMetrics,
  activeIncidents: SYNTHETIC_INCIDENTS,
  assistantStatus: {
    isListening: false,
    isThinking: false,
    isSpeaking: false,
    currentTurnId: 1,
    interruptionCount: 0,
    lastSpokenResponse: "VoiceOps Copilot ready. Ask to investigate transactions, regional failures, or switch metrics."
  }
};

export const useDashboardStore = create<DashboardStoreState>((set, get) => ({
  ...initialDashboardState,
  userTranscript: '',
  assistantTranscript: initialDashboardState.assistantStatus.lastSpokenResponse || '',
  interruptionInfo: null,
  activityLog: [
    {
      id: 'log-init',
      timestamp: new Date().toLocaleTimeString(),
      turnId: 1,
      type: 'FILTER_CHANGE',
      title: 'Session Initialized',
      details: 'Loaded 150 synthetic transactions across 5 Indian regional hubs.'
    }
  ],
  mode: 'SIMULATION',
  toolExecution: null,

  applySnapshot: (snapshot: DashboardState, turnId: number): boolean => {
    const currentTurn = get().lastUpdatedTurnId;
    if (turnId < currentTurn) {
      console.warn(`[TURN FENCE REJECTED] Snapshot for Turn #${turnId} discarded. Authoritative Turn is #${currentTurn}`);
      set(state => ({
        activityLog: [
          {
            id: `log-${Date.now()}-${Math.random()}`,
            timestamp: new Date().toLocaleTimeString(),
            turnId,
            type: 'FENCE_REJECT',
            title: `Turn Fence Rejection (Turn #${turnId})`,
            details: `Discarded stale snapshot. Current authoritative turn is #${currentTurn}.`
          },
          ...state.activityLog.slice(0, 40)
        ]
      }));
      return false;
    }

    set(state => ({
      ...state,
      ...snapshot,
      lastUpdatedTurnId: Math.max(state.lastUpdatedTurnId, turnId),
      assistantTranscript: snapshot.assistantStatus.lastSpokenResponse || state.assistantTranscript,
      activityLog: [
        {
          id: `log-${Date.now()}-${Math.random()}`,
          timestamp: new Date().toLocaleTimeString(),
          turnId,
          type: 'FILTER_CHANGE',
          title: `Snapshot Applied (Turn #${turnId})`,
          details: `Updated ${snapshot.transactions.length} matching transactions.`
        },
        ...state.activityLog.slice(0, 40)
      ]
    }));
    return true;
  },

  applyPatch: (patch: Partial<DashboardState>, turnId: number): boolean => {
    const currentTurn = get().lastUpdatedTurnId;
    if (turnId < currentTurn) {
      console.warn(`[TURN FENCE REJECTED] Patch for Turn #${turnId} discarded. Authoritative Turn is #${currentTurn}`);
      set(state => ({
        activityLog: [
          {
            id: `log-${Date.now()}-${Math.random()}`,
            timestamp: new Date().toLocaleTimeString(),
            turnId,
            type: 'FENCE_REJECT',
            title: `Turn Fence Rejection (Turn #${turnId})`,
            details: `Discarded stale patch. Current authoritative turn is #${currentTurn}.`
          },
          ...state.activityLog.slice(0, 40)
        ]
      }));
      return false;
    }

    set(state => {
      const mergedFilters = patch.filters ? { ...state.filters, ...patch.filters } : state.filters;
      const mergedAssistant = patch.assistantStatus
        ? { ...state.assistantStatus, ...patch.assistantStatus }
        : state.assistantStatus;

      return {
        ...state,
        ...patch,
        filters: mergedFilters,
        assistantStatus: mergedAssistant,
        lastUpdatedTurnId: Math.max(state.lastUpdatedTurnId, turnId)
      };
    });
    return true;
  },

  applyTurnUpdate: (turnId: number, update: Partial<DashboardState>): boolean => {
    return get().applyPatch(update, turnId);
  },

  setAssistantStatus: (status: Partial<DashboardState['assistantStatus']>) => {
    set(state => {
      const updatedAssistant = {
        ...state.assistantStatus,
        ...status
      };
      return {
        ...state,
        assistantStatus: updatedAssistant,
        assistantTranscript: status.lastSpokenResponse !== undefined ? status.lastSpokenResponse : state.assistantTranscript
      };
    });
  },

  setTranscript: (role: 'user' | 'assistant', text: string, isFinal: boolean, turnId: number): boolean => {
    const currentTurn = get().lastUpdatedTurnId;
    if (turnId < currentTurn) {
      console.warn(`[TURN FENCE REJECTED] Transcript delta for Turn #${turnId} discarded.`);
      return false;
    }

    set(state => {
      if (role === 'user') {
        return {
          userTranscript: text,
          lastUpdatedTurnId: Math.max(state.lastUpdatedTurnId, turnId),
          activityLog: isFinal
            ? [
                {
                  id: `log-${Date.now()}-${Math.random()}`,
                  timestamp: new Date().toLocaleTimeString(),
                  turnId,
                  type: 'TRANSCRIPT',
                  title: `User Request (Turn #${turnId})`,
                  details: `"${text}"`
                },
                ...state.activityLog.slice(0, 40)
              ]
            : state.activityLog
        };
      } else {
        return {
          assistantTranscript: text,
          assistantStatus: {
            ...state.assistantStatus,
            lastSpokenResponse: text
          },
          lastUpdatedTurnId: Math.max(state.lastUpdatedTurnId, turnId)
        };
      }
    });
    return true;
  },

  handleTurnInterrupted: (supersededTurnId: number, newTurnId: number, reason = 'User interrupted assistant speech') => {
    set(state => ({
      interruptionInfo: {
        supersededTurnId,
        newTurnId,
        reason,
        timestamp: Date.now()
      },
      lastUpdatedTurnId: Math.max(state.lastUpdatedTurnId, newTurnId),
      assistantStatus: {
        ...state.assistantStatus,
        isSpeaking: false,
        isThinking: true,
        currentTurnId: newTurnId,
        interruptionCount: state.assistantStatus.interruptionCount + 1,
        lastSpokenResponse: `Interrupted Turn #${supersededTurnId} — Switching to Turn #${newTurnId}...`
      },
      activityLog: [
        {
          id: `log-${Date.now()}-${Math.random()}`,
          timestamp: new Date().toLocaleTimeString(),
          turnId: newTurnId,
          type: 'INTERRUPTION',
          title: `⚡ Interruption (Turn #${supersededTurnId} → Turn #${newTurnId})`,
          details: reason
        },
        ...state.activityLog.slice(0, 40)
      ]
    }));
  },

  handleToolExecutionStart: (toolName: string, args: Record<string, unknown>, turnId: number): boolean => {
    const currentTurn = get().lastUpdatedTurnId;
    if (turnId < currentTurn) return false;

    set(state => ({
      toolExecution: {
        active: true,
        toolName,
        args
      },
      assistantStatus: {
        ...state.assistantStatus,
        isThinking: true
      },
      activityLog: [
        {
          id: `log-${Date.now()}-${Math.random()}`,
          timestamp: new Date().toLocaleTimeString(),
          turnId,
          type: 'TOOL_EXECUTION',
          title: `Tool Started: ${toolName}`,
          details: JSON.stringify(args)
        },
        ...state.activityLog.slice(0, 40)
      ]
    }));
    return true;
  },

  handleToolExecutionComplete: (toolName: string, durationMs: number, turnId: number): boolean => {
    const currentTurn = get().lastUpdatedTurnId;
    if (turnId < currentTurn) return false;

    set(state => ({
      toolExecution: {
        active: false,
        toolName,
        durationMs
      },
      activityLog: [
        {
          id: `log-${Date.now()}-${Math.random()}`,
          timestamp: new Date().toLocaleTimeString(),
          turnId,
          type: 'TOOL_EXECUTION',
          title: `Tool Completed: ${toolName} (${durationMs}ms)`,
          details: `Execution took ${durationMs}ms`
        },
        ...state.activityLog.slice(0, 40)
      ]
    }));
    return true;
  },

  handleTurnStatusUpdate: (status: TurnStatus, _metadata: TurnMetadata, turnId: number): boolean => {
    const currentTurn = get().lastUpdatedTurnId;
    if (turnId < currentTurn) return false;

    set(state => ({
      lastUpdatedTurnId: Math.max(state.lastUpdatedTurnId, turnId),
      assistantStatus: {
        ...state.assistantStatus,
        isListening: status === 'LISTENING',
        isThinking: status === 'THINKING' || status === 'EXECUTING_TOOL',
        isSpeaking: status === 'SPEAKING',
        currentTurnId: turnId
      }
    }));
    return true;
  },

  handleDataChannelEvent: (event: DataChannelEvent): boolean => {
    switch (event.type) {
      case 'STATE_SNAPSHOT':
        return get().applySnapshot(event.payload, event.turnId);
      case 'STATE_PATCH':
        return get().applyPatch(event.payload, event.turnId);
      case 'TOOL_EXECUTION_START':
        return get().handleToolExecutionStart(event.toolName, event.args, event.turnId);
      case 'TOOL_EXECUTION_COMPLETE':
        return get().handleToolExecutionComplete(event.toolName, event.durationMs, event.turnId);
      case 'TURN_STATUS_UPDATE':
        return get().handleTurnStatusUpdate(event.status, event.metadata, event.turnId);
      case 'TURN_INTERRUPTED':
        get().handleTurnInterrupted(event.supersededTurnId, event.newTurnId, event.reason);
        return true;
      case 'TRANSCRIPT_DELTA':
        return get().setTranscript(event.role, event.text, event.isFinal, event.turnId);
      default:
        return false;
    }
  },

  setFilters: (turnId: number, filters: DashboardFilterState): boolean => {
    const currentTurn = get().lastUpdatedTurnId;
    if (turnId < currentTurn) {
      console.warn(`[TURN FENCE REJECTED] Filter update for Turn #${turnId} discarded. Authoritative Turn is #${currentTurn}`);
      set(state => ({
        activityLog: [
          {
            id: `log-${Date.now()}-${Math.random()}`,
            timestamp: new Date().toLocaleTimeString(),
            turnId,
            type: 'FENCE_REJECT',
            title: `Turn Fence Rejection (Turn #${turnId})`,
            details: `Discarded stale filter request. Authoritative Turn is #${currentTurn}.`
          },
          ...state.activityLog.slice(0, 40)
        ]
      }));
      return false;
    }

    const { transactions, totalMatching } = querySyntheticTransactions(
      {
        region: filters.regions?.[0],
        status: filters.statuses?.[0],
        minAmount: filters.minAmount,
        maxAmount: filters.maxAmount,
        paymentMethod: filters.paymentMethods?.[0] as any,
        searchQuery: filters.searchQuery
      },
      SYNTHETIC_TRANSACTIONS
    );

    const metrics = computeMetrics(transactions);

    set(state => ({
      filters,
      transactions,
      totalMatchingCount: totalMatching,
      metrics,
      lastUpdatedTurnId: Math.max(state.lastUpdatedTurnId, turnId),
      activityLog: [
        {
          id: `log-${Date.now()}-${Math.random()}`,
          timestamp: new Date().toLocaleTimeString(),
          turnId,
          type: 'FILTER_CHANGE',
          title: `Filters Applied (Turn #${turnId})`,
          details: `${filters.regions?.join(', ') || 'All Regions'} | ${filters.statuses?.join(', ') || 'All Statuses'}${filters.minAmount ? ` | Min ₹${filters.minAmount.toLocaleString('en-IN')}` : ''}`
        },
        ...state.activityLog.slice(0, 40)
      ]
    }));
    return true;
  },

  resetFilters: (turnId?: number): boolean => {
    const authoritativeTurn = turnId ?? (get().lastUpdatedTurnId + 1);
    return get().setFilters(authoritativeTurn, {});
  },

  clearInterruption: () => {
    set({ interruptionInfo: null });
  },

  resetToBaseline: () => {
    set({
      ...initialDashboardState,
      lastUpdatedTurnId: 1,
      userTranscript: '',
      assistantTranscript: initialDashboardState.assistantStatus.lastSpokenResponse || '',
      interruptionInfo: null,
      toolExecution: null,
      activityLog: [
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          turnId: 1,
          type: 'FILTER_CHANGE',
          title: 'Dashboard Reset',
          details: 'Restored baseline view with all regional transactions.'
        }
      ]
    });
  }
}));

// Backward-compatible hook wrapper
export const useDashboardState = useDashboardStore;
export const dashboardStore = {
  getState: () => useDashboardStore.getState(),
  applySnapshot: (snapshot: DashboardState, turnId: number) => useDashboardStore.getState().applySnapshot(snapshot, turnId),
  applyPatch: (patch: Partial<DashboardState>, turnId: number) => useDashboardStore.getState().applyPatch(patch, turnId),
  applyTurnUpdate: (turnId: number, update: Partial<DashboardState>) => useDashboardStore.getState().applyTurnUpdate(turnId, update),
  setFilters: (turnId: number, filters: DashboardFilterState) => useDashboardStore.getState().setFilters(turnId, filters),
  resetFilters: (turnId?: number) => useDashboardStore.getState().resetFilters(turnId),
  setAssistantStatus: (status: Partial<DashboardState['assistantStatus']>) => useDashboardStore.getState().setAssistantStatus(status),
  handleTurnInterrupted: (supersededTurnId: number, newTurnId: number, reason?: string) => useDashboardStore.getState().handleTurnInterrupted(supersededTurnId, newTurnId, reason),
  handleDataChannelEvent: (event: DataChannelEvent) => useDashboardStore.getState().handleDataChannelEvent(event),
  resetToBaseline: () => useDashboardStore.getState().resetToBaseline(),
  subscribe: (listener: (state: DashboardStoreState) => void) => useDashboardStore.subscribe(listener)
};
