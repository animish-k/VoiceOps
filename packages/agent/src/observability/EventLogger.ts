export type AgentEventType =
  | 'turn_created'
  | 'turn_interrupted'
  | 'tool_started'
  | 'tool_completed'
  | 'tool_aborted'
  | 'stale_result_discarded'
  | 'state_commit'
  | 'response_generated';
  | 'response_generated'
  | 'voice_session_started'
  | 'voice_session_connected'
  | 'voice_session_disconnected'
  | 'voice_session_state'
  | 'voice_session_error'
  | 'stt_interim'
  | 'stt_final'
  | 'interruption_detected'
  | 'audio_stop_requested'
  | 'audio_stopped'
  | 'tts_started'
  | 'tts_first_audio'
  | 'tts_completed'
  | 'tts_cancelled';

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

export interface VoiceSessionEvent extends BaseAgentEvent {
  type:
    | 'voice_session_started'
    | 'voice_session_connected'
    | 'voice_session_disconnected'
    | 'voice_session_state'
    | 'voice_session_error';
  state?: string;
  previousState?: string;
  message?: string;
  source?: string;
}

export interface SttEvent extends BaseAgentEvent {
  type: 'stt_interim' | 'stt_final';
  transcript: string;
  language?: string | null;
  durationMs?: number;
}

export interface VoiceInterruptionEvent extends BaseAgentEvent {
  type: 'interruption_detected' | 'audio_stop_requested' | 'audio_stopped';
  interruptionDetectedAt?: number;
  audioStopRequestedAt?: number;
  audioStoppedAt?: number;
  cutoffLatencyMs?: number;
  probability?: number;
  detectionDelayInS?: number;
}

export interface TtsTelemetryEvent extends BaseAgentEvent {
  type: 'tts_started' | 'tts_first_audio' | 'tts_completed' | 'tts_cancelled';
  text?: string;
  modelId?: string;
  speaker?: string;
  language?: string;
  transport?: string;
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
  | ResponseGeneratedEvent
  | VoiceSessionEvent
  | SttEvent
  | VoiceInterruptionEvent
  | TtsTelemetryEvent;

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
    // Redact any potential credentials/secrets before recording/emitting
    const sanitized = this.sanitizeEvent(event);
    this.eventHistory.push(sanitized);
    for (const listener of this.listeners) {
      try {
        listener(event);
        listener(sanitized);
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

  private sanitizeEvent(event: AgentEvent): AgentEvent {
    // Ensure no secrets like RIME_API_KEY or LIVEKIT_API_SECRET leak
    const clone = { ...event } as Record<string, unknown>;
    for (const key of ['apiKey', 'apiSecret', 'secret', 'token', 'password', 'key']) {
      if (key in clone) {
        clone[key] = '[REDACTED]';
      }
    }
    return clone as unknown as AgentEvent;
  }
}

export const defaultAgentEventLogger = new AgentEventLogger();
