import { config as loadEnv } from 'dotenv';
import { defineAgent, JobContext, voice, cli, ServerOptions } from '@livekit/agents';
import { fileURLToPath } from 'node:url';
import { loadVoiceOpsConfig } from '../config.js';
import { AgentCoordinator } from '../AgentCoordinator.js';
import { createRimeTts } from '../providers/rime.js';
import { createVoiceStt } from '../providers/stt.js';
import { VoiceOutputFence } from '../voice/outputFence.js';
import { RimeSpeechCoordinator } from '../voice/speechCoordinator.js';
import { attachSessionTelemetry, createLoggerVoiceTelemetrySink } from '../voice/sessionTelemetry.js';
import { AgentEventLogger } from '../observability/EventLogger.js';
loadEnv({ path: '../../.env' });

export default defineAgent({
  entry: async (ctx: JobContext) => {
    const config = loadVoiceOpsConfig();
    const logger = new AgentEventLogger();
    const coordinator = new AgentCoordinator({ logger });
    const fence = new VoiceOutputFence();
    const rimeTts = createRimeTts(config);

    const telemetrySink = createLoggerVoiceTelemetrySink(logger, () => ({
      turnId: fence.currentTurnId,
      requestId: `voice-${fence.currentTurnId}`
    }));

    const speechCoordinator = new RimeSpeechCoordinator(rimeTts, fence, telemetrySink);

    // Create STT and TTS session
    const session = new voice.AgentSession({
      stt: createVoiceStt(),
      tts: rimeTts,
      turnHandling: {
    endpointing: {
      mode: 'fixed',
      minDelay: 300,
      maxDelay: 1800
    }
  }
    });

    attachSessionTelemetry(session, telemetrySink);

    logger.emit({
      type: 'voice_session_started',
      turnId: 0,
      requestId: 'init',
      timestamp: Date.now()
    });

    const agent = new voice.Agent({
      instructions: 'You are VoiceOps, an expert operations analytics assistant helping investigate transaction failures and incidents. Provide concise, accurate summaries of filtered results.',
      stt: createVoiceStt(),
      tts: rimeTts
    });

    // Handle user turn completion from STT
    agent.onUserTurnCompleted = async (_chatCtx, newMessage) => {
  const userUtterance = newMessage.textContent || '';
      if (!userUtterance || typeof userUtterance !== 'string' || userUtterance.trim().length === 0) {
        return;
      }

      // Interrupt any previous obsolete speech immediately upon new turn
      const nextTurnId = fence.currentTurnId + 1;
      speechCoordinator.interrupt(nextTurnId);

      // Process utterance through authoritative backend AgentCoordinator
      const result = await coordinator.processUtterance(userUtterance);

      if (result.isAuthoritative && result.spokenText) {
        fence.setAuthoritativeTurn(result.turnId);

        // Broadcast authoritative state update via room data channel
        if (result.state && ctx.room?.localParticipant) {
          try {
            const payload = JSON.stringify({
              type: 'state_commit',
              turnId: result.turnId,
              state: result.state
            });
            await ctx.room.localParticipant.publishData(new TextEncoder().encode(payload), { reliable: true });
          } catch (pubErr) {
            console.error('Failed to publish state via data channel:', pubErr);
          }
        }

        // Emit speech via fenced Rime coordinator
        await speechCoordinator.speak(
  {
    turnId: result.turnId,
    requestId: result.requestId,
    text: result.spokenText
  },
  async (packet) => {
    if (packet.frame && session.output.audio) {
      await session.output.audio.captureFrame(packet.frame);
    }
  }
);
      }
    };

    // Connect to room and start session
    await ctx.connect();
    await session.start({
      agent,
      room: ctx.room,
      outputOptions: {
    audioEnabled: true,
    audioSampleRate: 24000,
    audioNumChannels: 1
  }
    });

    logger.emit({
      type: 'voice_session_connected',
      turnId: 0,
      requestId: 'connected',
      timestamp: Date.now()
    });
  }
});

cli.runApp(new ServerOptions({
  agent: fileURLToPath(import.meta.url)
}));