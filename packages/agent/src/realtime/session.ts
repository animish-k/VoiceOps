import type { JobContext } from '@livekit/agents';
import { voice } from '@livekit/agents';
import { VoiceOpsConfig, VoiceSessionState } from '../config.js';
import { createVoiceSession } from '../providers/rime.js';

export interface VoiceSessionLifecycle {
  state: VoiceSessionState;
  onStateChange?: (state: VoiceSessionState) => void;
}

export interface VoiceSessionHandle {
  session: voice.AgentSession;
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
): Promise<VoiceSessionHandle> {
  transition(lifecycle, 'connecting');
  const session = createVoiceSession(config);

  try {
    await session.start({
      agent,
      room: context.room
    });
    await context.connect();
    transition(lifecycle, 'connected');
  } catch (error) {
    transition(lifecycle, 'error');
    await session.close().catch(() => undefined);
    throw error;
  }

  return {
    session,
    close: async () => {
      await session.close();
      transition(lifecycle, 'disconnected');
    }
  };
}