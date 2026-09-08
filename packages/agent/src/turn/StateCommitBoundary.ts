import {
  DashboardState,
  Transaction,
  MetricsSummary,
  DashboardFilterState,
  QueryTransactionsParams,
  Incident,
  SYNTHETIC_INCIDENTS
} from '@voiceops/shared';
import { TurnContext } from './TurnContext.js';
import { TurnManager } from './TurnManager.js';
import { AgentEventLogger, defaultAgentEventLogger } from '../observability/EventLogger.js';
import { QueryTransactionsResult } from '../tools/queryTransactions.js';

export interface StateCommitResult {
  committed: boolean;
  state?: DashboardState;
  discardReason?: 'turn_aborted' | 'turn_superseded' | 'outdated_generation';
}

export type StateChangeListener = (state: DashboardState, turnId: number) => void;

export class StateCommitBoundary {
  private currentState: DashboardState;
  private turnManager: TurnManager;
  private logger: AgentEventLogger;
  private listeners: Set<StateChangeListener> = new Set();

  constructor(
    turnManager: TurnManager,
    initialIncidents: Incident[] = SYNTHETIC_INCIDENTS,
    logger: AgentEventLogger = defaultAgentEventLogger
  ) {
    this.turnManager = turnManager;
    this.logger = logger;
    this.currentState = this.createInitialState(initialIncidents);
  }

  private createInitialState(incidents: Incident[]): DashboardState {
    return {
      lastUpdatedTurnId: 0,
      filters: {},
      transactions: [],
      totalMatchingCount: 0,
      metrics: {
        totalTransactions: 0,
        failedTransactions: 0,
        failureRatePercentage: 0,
        totalVolumeRupees: 0,
        p95LatencyMs: 0
      },
      activeIncidents: incidents,
      assistantStatus: {
        isListening: false,
        isThinking: false,
        isSpeaking: false,
        currentTurnId: 0,
        interruptionCount: 0
      }
    };
  }

  public getDashboardState(): DashboardState {
    return {
      ...this.currentState,
      filters: { ...this.currentState.filters },
      transactions: [...this.currentState.transactions],
      metrics: { ...this.currentState.metrics },
      activeIncidents: [...this.currentState.activeIncidents],
      assistantStatus: { ...this.currentState.assistantStatus }
    };
  }

  public subscribe(listener: StateChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Stale Result Fence Check
   * Fencing evaluates three critical criteria:
   * 1. The turn's AbortSignal has not been triggered.
   * 2. The turn is not flagged as superseded.
   * 3. The turnId matches the currently authoritative turn ID in TurnManager.
   */
  public checkFence(context: TurnContext): {
    allowed: boolean;
    reason?: 'turn_aborted' | 'turn_superseded' | 'outdated_generation';
  } {
    if (context.signal.aborted) {
      return { allowed: false, reason: 'turn_aborted' };
    }

    if (context.isSuperseded) {
      return { allowed: false, reason: 'turn_superseded' };
    }

    if (context.turnId !== this.turnManager.getCurrentTurnId()) {
      return { allowed: false, reason: 'outdated_generation' };
    }

    return { allowed: true };
  }

  /**
   * State Commit Boundary
   * Single gateway through which any tool execution must pass before mutating authoritative state.
   */
  public commitToolResult(
    context: TurnContext,
    toolName: string,
    result: unknown
  ): StateCommitResult {
    const fenceCheck = this.checkFence(context);

    if (!fenceCheck.allowed) {
      const discardReason = fenceCheck.reason!;
      this.logger.emit({
        type: 'stale_result_discarded',
        turnId: context.turnId,
        requestId: context.requestId,
        timestamp: Date.now(),
        toolName,
        authoritativeTurnId: this.turnManager.getCurrentTurnId(),
        discardReason
      });

      return {
        committed: false,
        discardReason
      };
    }

    // Process tool-specific state mutation
    if (toolName === 'query_transactions') {
      const queryResult = result as QueryTransactionsResult;
      const filters = queryResult.appliedFilters || {};

      const dashboardFilters: DashboardFilterState = {
        regions: filters.region
          ? (Array.isArray(filters.region) ? filters.region : [filters.region])
          : undefined,
        statuses: filters.status
          ? (Array.isArray(filters.status) ? filters.status : [filters.status])
          : undefined,
        minAmount: filters.minAmount,
        maxAmount: filters.maxAmount,
        paymentMethods: filters.paymentMethod ? [filters.paymentMethod] : undefined,
        searchQuery: filters.searchQuery,
        timeRangeHours: filters.timeRange?.hours
      };

      this.currentState = {
        ...this.currentState,
        lastUpdatedTurnId: context.turnId,
        filters: dashboardFilters,
        transactions: queryResult.transactions,
        totalMatchingCount: queryResult.totalMatching,
        metrics: queryResult.metrics,
        assistantStatus: {
          ...this.currentState.assistantStatus,
          currentTurnId: context.turnId,
          lastSpokenResponse: context.assistantSpokenText
        }
      };

      this.logger.emit({
        type: 'state_commit',
        turnId: context.turnId,
        requestId: context.requestId,
        timestamp: Date.now(),
        toolName,
        matchingCount: queryResult.totalMatching,
        filters: filters as Record<string, unknown>
      });

      // Notify external subscribers
      const snapshot = this.getDashboardState();
      for (const listener of this.listeners) {
        try {
          listener(snapshot, context.turnId);
        } catch (err) {
          console.error('Error in state change listener:', err);
        }
      }

      return {
        committed: true,
        state: snapshot
      };
    }

    return { committed: false, discardReason: 'outdated_generation' };
  }
}
