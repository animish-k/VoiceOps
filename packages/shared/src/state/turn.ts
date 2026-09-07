export type TurnStatus =
  | 'IDLE'
  | 'LISTENING'
  | 'THINKING'
  | 'EXECUTING_TOOL'
  | 'SPEAKING'
  | 'COMPLETED'
  | 'INTERRUPTED';

export interface TurnTelemetryTimestamps {
  utteranceStartedAt?: number;
  utteranceEndedAt?: number;
  interruptionDetectedAt?: number;
  audioStopRequestedAt?: number;
  audioStoppedAt?: number;
  cutoffLatencyMs?: number;
  toolExecutionStartedAt?: number;
  toolExecutionEndedAt?: number;
  ttsFirstAudioAt?: number;
}

export interface TurnMetadata {
  turnId: number;        // Monotonically increasing counter (1, 2, 3...)
  requestId: string;     // Unique UUID per user turn
  status: TurnStatus;
  userUtterance?: string;
  assistantSpokenText?: string;
  timestamps: TurnTelemetryTimestamps;
  isAborted: boolean;
}
