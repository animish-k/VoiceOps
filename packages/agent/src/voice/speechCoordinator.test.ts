import test from 'node:test';
import assert from 'node:assert/strict';
import { VoiceOutputFence } from './outputFence.js';
import { RimeSpeechCoordinator, SynthesizedAudioPacket } from './speechCoordinator.js';
import { AgentEventLogger } from '../observability/EventLogger.js';
import { createLoggerVoiceTelemetrySink } from './sessionTelemetry.js';

class MockRimeTts {
  public synthesizedTexts: string[] = [];

  synthesize(text: string, _options?: unknown, signal?: AbortSignal) {
    this.synthesizedTexts.push(text);
    return {
      async *[Symbol.asyncIterator]() {
        for (let i = 0; i < 3; i++) {
          if (signal?.aborted) {
            throw new DOMException('Aborted', 'AbortError');
          }
          yield {
            requestId: `req-${i}`,
            segmentId: `seg-${i}`,
            frame: {} as any,
            final: i === 2
          } as SynthesizedAudioPacket;
        }
      },
      close: () => {}
    };
  }
}

test('RimeSpeechCoordinator: speaks current turn and records telemetry', async () => {
  const logger = new AgentEventLogger();
  const fence = new VoiceOutputFence();
  fence.setAuthoritativeTurn(1);

  const mockTts = new MockRimeTts();
  const telemetry = createLoggerVoiceTelemetrySink(logger);
  const coordinator = new RimeSpeechCoordinator(mockTts as any, fence, telemetry);

  const receivedFrames: SynthesizedAudioPacket[] = [];
  const emitted = await coordinator.speak(
    { turnId: 1, requestId: 'req-1', text: 'I found 3 failed transactions in Bangalore.' },
    (packet) => {
      receivedFrames.push(packet);
    }
  );

  assert.equal(emitted, true);
  assert.equal(receivedFrames.length, 3);
  assert.deepEqual(mockTts.synthesizedTexts, ['I found 3 failed transactions in Bangalore.']);

  const events = logger.getEvents();
  assert.ok(events.some(e => e.type === 'tts_started'));
  assert.ok(events.some(e => e.type === 'tts_first_audio'));
  assert.ok(events.some(e => e.type === 'tts_completed'));
});

test('RimeSpeechCoordinator: rejects obsolete turn speech before TTS', async () => {
  const logger = new AgentEventLogger();
  const fence = new VoiceOutputFence();
  fence.setAuthoritativeTurn(2); // Fence is on turn 2

  const mockTts = new MockRimeTts();
  const telemetry = createLoggerVoiceTelemetrySink(logger);
  const coordinator = new RimeSpeechCoordinator(mockTts as any, fence, telemetry);

  const emitted = await coordinator.speak(
    { turnId: 1, requestId: 'req-1', text: 'Old Bangalore response' },
    () => {}
  );

  assert.equal(emitted, false, 'Obsolete turn 1 response must not be spoken');
  assert.equal(mockTts.synthesizedTexts.length, 0, 'TTS must not receive obsolete response');
});

test('RimeSpeechCoordinator: handles interruption and emits interruption telemetry', async () => {
  const logger = new AgentEventLogger();
  const fence = new VoiceOutputFence();
  fence.setAuthoritativeTurn(1);

  const mockTts = new MockRimeTts();
  const telemetry = createLoggerVoiceTelemetrySink(logger);
  const coordinator = new RimeSpeechCoordinator(mockTts as any, fence, telemetry);

  // Begin active speech on Turn 1
  const activeSpeech = fence.beginSpeech({
    turnId: 1,
    requestId: 'req-1',
    text: 'Bangalore failures...'
  });
  assert.ok(activeSpeech);

  // Interrupt with Turn 2
  const interruption = coordinator.interrupt(2);
  assert.ok(interruption);
  assert.ok(interruption.interruptionDetectedAt > 0);
  assert.ok(interruption.audioStopRequestedAt > 0);
  assert.ok(typeof interruption.cutoffLatencyMs === 'number');

  // Verify fence state
  assert.equal(fence.currentTurnId, 2);
  assert.equal(activeSpeech.signal.aborted, true);

  const events = logger.getEvents();
  assert.ok(events.some(e => e.type === 'interruption_detected'));
  assert.ok(events.some(e => e.type === 'audio_stop_requested'));
  assert.ok(events.some(e => e.type === 'audio_stopped'));
});

