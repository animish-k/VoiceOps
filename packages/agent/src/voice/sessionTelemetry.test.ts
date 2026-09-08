import test from 'node:test';
import assert from 'node:assert/strict';
import { AgentEventLogger } from '../observability/EventLogger.js';
import { createLoggerVoiceTelemetrySink } from './sessionTelemetry.js';

test('createLoggerVoiceTelemetrySink: forwards voice events to AgentEventLogger', () => {
  const logger = new AgentEventLogger();
  const sink = createLoggerVoiceTelemetrySink(logger, () => ({ turnId: 1, requestId: 'req-voice-1' }));

  sink.emit('stt_interim', {
    transcript: 'Show failed trans...',
    createdAt: Date.now()
  });

  sink.emit('stt_final', {
    transcript: 'Show failed transactions from Bangalore.',
    createdAt: Date.now()
  });

  sink.emit('tts_started', {
    text: 'Found 3 failed transactions in Bangalore.',
    modelId: 'coda',
    speaker: 'celeste',
    transport: 'websocket'
  });

  const events = logger.getEvents();
  assert.equal(events.length, 3);
  assert.equal(events[0].type, 'stt_interim');
  assert.equal(events[0].turnId, 1);
  assert.equal(events[1].type, 'stt_final');
  assert.equal(events[2].type, 'tts_started');
  assert.equal((events[2] as any).modelId, 'coda');
});

test('AgentEventLogger: redacts secrets from emitted telemetry events', () => {
  const logger = new AgentEventLogger();

  logger.emit({
    type: 'voice_session_error',
    turnId: 1,
    requestId: 'req-1',
    timestamp: Date.now(),
    message: 'Authentication failed',
    apiKey: 'super-secret-rime-key',
    apiSecret: 'super-secret-livekit-secret'
  } as any);

  const events = logger.getEvents();
  assert.equal(events.length, 1);
  assert.equal((events[0] as any).apiKey, '[REDACTED]');
  assert.equal((events[0] as any).apiSecret, '[REDACTED]');
});

