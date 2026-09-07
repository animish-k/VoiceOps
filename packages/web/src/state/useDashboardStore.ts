import { useState, useEffect } from 'react';
import {
  DashboardState,
  DashboardFilterState,
  Transaction,
  SYNTHETIC_TRANSACTIONS,
  SYNTHETIC_INCIDENTS,
  querySyntheticTransactions
} from '@voiceops/shared';

// Initial baseline calculations
function computeMetrics(transactions: Transaction[]) {
  const total = transactions.length;
  const failed = transactions.filter(t => t.status === 'FAILED').length;
  const totalVolume = transactions.reduce((acc, t) => acc + t.amount, 0);
  const failureRate = total > 0 ? (failed / total) * 100 : 0;

  return {
    totalTransactions: total,
    failedTransactions: failed,
    failureRatePercentage: parseFloat(failureRate.toFixed(1)),
    totalVolumeRupees: totalVolume,
    p95LatencyMs: 340
  };
}

const initialTransactions = SYNTHETIC_TRANSACTIONS;
const initialMetrics = computeMetrics(initialTransactions);

const initialState: DashboardState = {
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
    lastSpokenResponse: "VoiceOps Copilot ready. Try asking: 'Show failed transactions from Bangalore'"
  }
};

// Singleton reactive listener store
type Listener = () => void;
let globalState: DashboardState = initialState;
const listeners = new Set<Listener>();

function emitChange() {
  listeners.forEach(l => l());
}

export const dashboardStore = {
  getState: () => globalState,

  // FENCED STATE MUTATION: Rejects out-of-order superseded turns
  applyTurnUpdate: (turnId: number, update: Partial<DashboardState>): boolean => {
    if (turnId < globalState.lastUpdatedTurnId) {
      console.warn(
        `[TURN FENCE REJECTED] Out-of-order update for Turn ${turnId} discarded. Authoritative Turn is ${globalState.lastUpdatedTurnId}`
      );
      return false;
    }

    globalState = {
      ...globalState,
      ...update,
      lastUpdatedTurnId: Math.max(globalState.lastUpdatedTurnId, turnId)
    };
    emitChange();
    return true;
  },

  setFilters: (turnId: number, filters: DashboardFilterState) => {
    if (turnId < globalState.lastUpdatedTurnId) {
      console.warn(`[TURN FENCE REJECTED] Filter update for Turn ${turnId} discarded.`);
      return false;
    }

    const { transactions, totalMatching } = querySyntheticTransactions(
      {
        region: filters.regions?.[0],
        status: filters.statuses?.[0],
        minAmount: filters.minAmount,
        maxAmount: filters.maxAmount,
        searchQuery: filters.searchQuery
      },
      SYNTHETIC_TRANSACTIONS
    );

    const metrics = computeMetrics(transactions);

    globalState = {
      ...globalState,
      lastUpdatedTurnId: turnId,
      filters,
      transactions,
      totalMatchingCount: totalMatching,
      metrics
    };
    emitChange();
    return true;
  },

  resetFilters: (turnId: number) => {
    return dashboardStore.setFilters(turnId, {});
  },

  setAssistantStatus: (status: Partial<DashboardState['assistantStatus']>) => {
    globalState = {
      ...globalState,
      assistantStatus: {
        ...globalState.assistantStatus,
        ...status
      }
    };
    emitChange();
  },

  subscribe: (listener: Listener) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }
};

export function useDashboardState(): DashboardState {
  const [state, setState] = useState(dashboardStore.getState());

  useEffect(() => {
    const unsubscribe = dashboardStore.subscribe(() => {
      setState(dashboardStore.getState());
    });
    return () => {
      unsubscribe();
    };
  }, []);

  return state;
}
