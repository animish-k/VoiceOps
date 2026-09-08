import { AgentSessionEventTypes, voice } from '@livekit/agents';
import { AgentEventLogger, AgentEvent } from '../observability/EventLogger.js';
import { VoiceTelemetryEvent, VoiceTelemetrySink } from './speechCoordinator.js';

export function attachSessionTelemetry(
  session: voice.AgentSession,
  telemetry: VoiceTelemetrySink
): () => void {
  const onTranscript = (event: {
    transcript: string;
    isFinal: boolean;
    createdAt: number;
    language: string | null;
  }) => {
    telemetry.emit(event.isFinal ? 'stt_final' : 'stt_interim', {
      transcript: event.transcript,
      createdAt: event.createdAt,
      language: event.language
    });
  };
  const onAgentState = (event: { newState: string; oldState: string; createdAt: number }) => {
    telemetry.emit('voice_session_state', {
      state: event.newState,
      previousState: event.oldState,
      createdAt: event.createdAt
    });
  };
  const onOverlap = (event: {
    detectedAt: number;
    isInterruption: boolean;
    probability: number;
    detectionDelayInS: number;
  }) => {
    if (event.isInterruption) {
      telemetry.emit('interruption_detected', {
        detectedAt: event.detectedAt,
        probability: event.probability,
        detectionDelayInS: event.detectionDelayInS
      });
    }
  };
  const onError = (event: { error: unknown; createdAt: number; source?: unknown }) => {
    const error = asRecord(event.error);
    const nestedError = asRecord(error?.error);
    const source = asRecord(event.source);
    telemetry.emit('voice_session_error', {
      message: typeof nestedError?.message === 'string' ? nestedError.message : 'Voice session error',
      source: typeof source?.label === 'string' ? source.label : undefined,
      createdAt: event.createdAt
    });
  };

  session.on(AgentSessionEventTypes.UserInputTranscribed, onTranscript);
  session.on(AgentSessionEventTypes.AgentStateChanged, onAgentState);
  session.on(AgentSessionEventTypes.OverlappingSpeech, onOverlap);
  session.on(AgentSessionEventTypes.Error, onError);

  return () => {
    session.off(AgentSessionEventTypes.UserInputTranscribed, onTranscript);
    session.off(AgentSessionEventTypes.AgentStateChanged, onAgentState);
    session.off(AgentSessionEventTypes.OverlappingSpeech, onOverlap);
    session.off(AgentSessionEventTypes.Error, onError);
  };
}

export function createLoggerVoiceTelemetrySink(
  logger: AgentEventLogger,
  getContext?: () => { turnId?: number; requestId?: string }
): VoiceTelemetrySink {
  return {
    emit: (event: VoiceTelemetryEvent, payload: Record<string, unknown>) => {
      const ctx = getContext?.() || {};
      const turnId = typeof payload.turnId === 'number' ? payload.turnId : (ctx.turnId ?? 0);
      const requestId = typeof payload.requestId === 'string' ? payload.requestId : (ctx.requestId ?? 'system');
      const timestamp = (payload.createdAt as number) ?? (payload.detectedAt as number) ?? Date.now();

      logger.emit({
        type: event as any,
        turnId,
        requestId,
        timestamp,
        ...payload
      } as AgentEvent);
    }
  };
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : undefined;
}

export type SessionTelemetryEvent = VoiceTelemetryEvent | 'stt_interim' | 'stt_final' | 'voice_session_state' | 'voice_session_error';