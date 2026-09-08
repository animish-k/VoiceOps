import type { JobContext } from '@livekit/agents';
import { voice } from '@livekit/agents';
import { VoiceOpsConfig, VoiceSessionState } from '../config.js';
import { createVoiceSession } from '../providers/rime.js';
import { createVoiceSession, createRimeTts } from '../providers/rime.js';
import { createVoiceStt } from '../providers/stt.js';
import { VoiceOutputFence } from '../voice/outputFence.js';
import { RimeSpeechCoordinator } from '../voice/speechCoordinator.js';
import { attachSessionTelemetry, createLoggerVoiceTelemetrySink } from '../voice/sessionTelemetry.js';
import { AgentEventLogger } from '../observability/EventLogger.js';

export interface VoiceSessionLifecycle {
  state: VoiceSessionState;
  onStateChange?: (state: VoiceSessionState) => void;
}

export interface VoiceSessionOptions {
  lifecycle?: VoiceSessionLifecycle;
  logger?: AgentEventLogger;
  fence?: VoiceOutputFence;
  coordinator?: RimeSpeechCoordinator;
}

export interface VoiceSessionHandle {
  session: voice.AgentSession;
  coordinator?: RimeSpeechCoordinator;
  fence?: VoiceOutputFence;
  close: () => Promise<void>;
}

function transition(lifecycle: VoiceSessionLifecycle, state: VoiceSessionState): void {
  lifecycle.state = state;
  lifecycle.onStateChange?.(state);
}

export async function startVoiceSession(
  context: JobContext,
  config: VoiceOpsConfig,
  agent: voice.Agent,
  lifecycle: VoiceSessionLifecycle = { state: 'disconnected' }
  options: VoiceSessionOptions = {}
): Promise<VoiceSessionHandle> {
  const lifecycle = options.lifecycle || { state: 'disconnected' };
  transition(lifecycle, 'connecting');
  const session = createVoiceSession(config);

  const fence = options.fence || new VoiceOutputFence();
  const rimeTts = createRimeTts(config);
  const logger = options.logger || new AgentEventLogger();

  const telemetrySink = createLoggerVoiceTelemetrySink(logger, () => ({
    turnId: fence.currentTurnId,
    requestId: `voice-${fence.currentTurnId}`
  }));

  const speechCoordinator = options.coordinator || new RimeSpeechCoordinator(rimeTts, fence, telemetrySink);

  const session = new voice.AgentSession({
    stt: createVoiceStt(),
    tts: rimeTts
  });

  attachSessionTelemetry(session, telemetrySink);

  try {
    await session.start({
      agent,
      room: context.room
    });
    await context.connect();
    transition(lifecycle, 'connected');

    logger.emit({
      type: 'voice_session_connected',
      turnId: 0,
      requestId: 'session_init',
      timestamp: Date.now()
    });
  } catch (error) {
    transition(lifecycle, 'error');
    await session.close().catch(() => undefined);
    throw error;
  }

  return {
    session,
    coordinator: speechCoordinator,
    fence,
    close: async () => {
      await session.close();
      transition(lifecycle, 'disconnected');
      logger.emit({
        type: 'voice_session_disconnected',
        turnId: fence.currentTurnId,
        requestId: 'session_close',
        timestamp: Date.now()
      });
    }
  };
}