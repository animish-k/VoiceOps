import test from 'node:test';
import assert from 'node:assert/strict';
import { createLiveKitToken, issueBrowserVoiceToken } from './token.js';
import { loadVoiceOpsConfig } from '../config.js';

test('createLiveKitToken generates a valid JWT string', async () => {
  const token = await createLiveKitToken({
    apiKey: 'devkey',
    apiSecret: 'secret_which_is_at_least_32_characters_long_12345',
    roomName: 'ops-test-room',
    participantIdentity: 'analyst-1'
  });

  assert.equal(typeof token, 'string');
  assert.ok(token.length > 50);
  const parts = token.split('.');
  assert.equal(parts.length, 3, 'JWT must have 3 segments');
});

test('createLiveKitToken rejects missing credentials', async () => {
  await assert.rejects(
    async () => {
      await createLiveKitToken({
        apiKey: '',
        apiSecret: '',
        roomName: 'room',
        participantIdentity: 'analyst'
      });
    },
    /LiveKit apiKey and apiSecret are required/
  );
});

test('issueBrowserVoiceToken generates complete token response with config', async () => {
  const config = loadVoiceOpsConfig({
    LIVEKIT_URL: 'wss://livekit.example.com',
    LIVEKIT_API_KEY: 'test-api-key',
    LIVEKIT_API_SECRET: 'test-secret-at-least-32-chars-long-abcdef',
    RIME_API_KEY: 'rime-test-key'
  });

  const response = await issueBrowserVoiceToken(config, 'bangalore-incident-room', 'analyst-42');
  assert.equal(response.livekitUrl, 'wss://livekit.example.com');
  assert.equal(response.room, 'bangalore-incident-room');
  assert.equal(response.identity, 'analyst-42');
  assert.ok(response.token.length > 30);
});

