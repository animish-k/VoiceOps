import assert from 'node:assert/strict';
import test from 'node:test';
import { loadVoiceOpsConfig } from './config.js';

const environment = {
  LIVEKIT_URL: 'wss://example.livekit.cloud',
  LIVEKIT_API_KEY: 'api-key',
  LIVEKIT_API_SECRET: 'api-secret',
  RIME_API_KEY: 'rime-key'
};

test('loads the verified default Rime configuration', () => {
  const config = loadVoiceOpsConfig(environment);

  assert.deepEqual(config.rime, {
    modelId: 'coda',
    speaker: 'celeste',
    language: 'en',
    transport: 'websocket',
    audioFormat: 'pcm',
    sampleRate: 16000,
    segment: 'bySentence'
  });
});

test('rejects incomplete credentials', () => {
  assert.throws(() => loadVoiceOpsConfig({}), /LIVEKIT_URL/);
  assert.throws(
    () => loadVoiceOpsConfig({ ...environment, RIME_API_KEY: '' }),
    /RIME_API_KEY/
  );
});

test('rejects an invalid sample rate', () => {
  assert.throws(
    () => loadVoiceOpsConfig({ ...environment, RIME_SAMPLE_RATE: 'not-a-rate' }),
    /RIME_SAMPLE_RATE must be a positive integer/
  );
});

test('rejects an audio format the LiveKit Rime plugin does not support', () => {
  assert.throws(
    () => loadVoiceOpsConfig({ ...environment, RIME_AUDIO_FORMAT: 'mp3' }),
    /RIME_AUDIO_FORMAT must be pcm/
  );
});