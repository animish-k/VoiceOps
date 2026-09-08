import { defineAgent, JobContext, voice } from '@livekit/agents';
import { loadVoiceOpsConfig } from '../config.js';
import { AgentCoordinator } from '../AgentCoordinator.js';
import { createRimeTts } from '../providers/rime.js';
import { createVoiceStt } from '../providers/stt.js';
import { VoiceOutputFence } from '../voice/outputFence.js';
import { RimeSpeechCoordinator } from '../voice/speechCoordinator.js';
import { attachSessionTelemetry, createLoggerVoiceTelemetrySink } from '../voice/sessionTelemetry.js';
import { AgentEventLogger } from '../observability/EventLogger.js';

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
      tts: rimeTts
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
      const userUtterance = typeof newMessage === 'string' ? newMessage : (newMessage as any)?.content || '';
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
            // Audio packet delivered to session/room playback
            if (packet.frame && ctx.room) {
              // Frame handled by LiveKit output
            }
          }
        );
      }
    };

    // Connect to room and start session
    await ctx.connect();
    await session.start({
      agent,
      room: ctx.room
    });

    logger.emit({
      type: 'voice_session_connected',
      turnId: 0,
      requestId: 'connected',
      timestamp: Date.now()
    });
  }
});

