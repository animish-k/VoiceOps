import { Incident, SupportedRegion, Transaction, TransactionStatus } from '../types/domain.js';

export interface DashboardFilterState {
  regions?: SupportedRegion[];
  statuses?: TransactionStatus[];
  minAmount?: number;
  maxAmount?: number;
  paymentMethods?: string[];
  searchQuery?: string;
  timeRangeHours?: number;
}

export interface MetricsSummary {
  totalTransactions: number;
  failedTransactions: number;
  failureRatePercentage: number;
  totalVolumeRupees: number;
  p95LatencyMs: number;
}

export interface DashboardState {
  lastUpdatedTurnId: number;
  filters: DashboardFilterState;
  transactions: Transaction[];
  totalMatchingCount: number;
  metrics: MetricsSummary;
  activeIncidents: Incident[];
  assistantStatus: {
    isListening: boolean;
    isThinking: boolean;
    isSpeaking: boolean;
    currentTurnId: number;
    interruptionCount: number;
    lastSpokenResponse?: string;
  };
}
