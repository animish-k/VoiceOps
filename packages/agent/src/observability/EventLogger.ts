export type AgentEventType =
  | 'turn_created'
  | 'turn_interrupted'
  | 'tool_started'
  | 'tool_completed'
  | 'tool_aborted'
  | 'stale_result_discarded'
  | 'state_commit'
  | 'response_generated';

export interface BaseAgentEvent {
  type: AgentEventType;
  turnId: number;
  requestId: string;
  timestamp: number;
}

export interface TurnCreatedEvent extends BaseAgentEvent {
  type: 'turn_created';
  userUtterance?: string;
}

export interface TurnInterruptedEvent extends BaseAgentEvent {
  type: 'turn_interrupted';
  supersededByTurnId: number;
  reason: string;
}

export interface ToolStartedEvent extends BaseAgentEvent {
  type: 'tool_started';
  toolName: string;
  args: Record<string, unknown>;
}

export interface ToolCompletedEvent extends BaseAgentEvent {
  type: 'tool_completed';
  toolName: string;
  durationMs: number;
  resultSummary?: Record<string, unknown>;
}

export interface ToolAbortedEvent extends BaseAgentEvent {
  type: 'tool_aborted';
  toolName: string;
  reason: string;
  durationMs?: number;
}

export interface StaleResultDiscardedEvent extends BaseAgentEvent {
  type: 'stale_result_discarded';
  toolName: string;
  authoritativeTurnId: number;
  discardReason: 'turn_aborted' | 'turn_superseded' | 'outdated_generation';
}

export interface StateCommitEvent extends BaseAgentEvent {
  type: 'state_commit';
  toolName: string;
  matchingCount: number;
  filters: Record<string, unknown>;
}

export interface ResponseGeneratedEvent extends BaseAgentEvent {
  type: 'response_generated';
  spokenText: string;
  durationMs?: number;
}

export type AgentEvent =
  | TurnCreatedEvent
  | TurnInterruptedEvent
  | ToolStartedEvent
  | ToolCompletedEvent
  | ToolAbortedEvent
  | StaleResultDiscardedEvent
  | StateCommitEvent
  | ResponseGeneratedEvent;

export type AgentEventListener = (event: AgentEvent) => void;

export class AgentEventLogger {
  private listeners: Set<AgentEventListener> = new Set();
  private eventHistory: AgentEvent[] = [];

  public subscribe(listener: AgentEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public emit(event: AgentEvent): void {
    this.eventHistory.push(event);
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('Error in agent event listener:', err);
      }
    }
  }

  public getEvents(): AgentEvent[] {
    return [...this.eventHistory];
  }

  public getEventsForTurn(turnId: number): AgentEvent[] {
    return this.eventHistory.filter(e => e.turnId === turnId);
  }

  public clear(): void {
    this.eventHistory = [];
  }
}

export const defaultAgentEventLogger = new AgentEventLogger();
