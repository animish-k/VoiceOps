import assert from 'node:assert/strict';
import test from 'node:test';
import { VoiceOutputFence, VoiceResponse } from './outputFence.js';

const turnOne: VoiceResponse = {
  turnId: 1,
  requestId: 'request-1',
  text: 'Fetching failed transactions for Bangalore.'
};

const turnTwo: VoiceResponse = {
  turnId: 2,
  requestId: 'request-2',
  text: 'Showing failed transactions for Mumbai above ten thousand rupees.'
};

test('does not emit an obsolete response', () => {
  const fence = new VoiceOutputFence();
  fence.setAuthoritativeTurn(1);
  fence.beginSpeech(turnOne);

  fence.interrupt(2);

  assert.equal(fence.canEmit(turnOne), false);
  assert.equal(fence.beginSpeech(turnOne), undefined);
  assert.ok(fence.beginSpeech(turnTwo));
});

test('emits the current response after an interruption', () => {
  const fence = new VoiceOutputFence();
  fence.setAuthoritativeTurn(1);
  const firstSpeech = fence.beginSpeech(turnOne);
  assert.ok(firstSpeech);

  const telemetry = fence.interrupt(2);
  assert.ok(telemetry?.audioStoppedAt);
  assert.ok(firstSpeech.signal.aborted);

  const secondSpeech = fence.beginSpeech(turnTwo);
  assert.ok(secondSpeech);
  assert.equal(fence.canEmit(turnTwo), true);
  fence.completeSpeech(turnTwo);
});

test('does not move the fence backwards', () => {
  const fence = new VoiceOutputFence();
  fence.setAuthoritativeTurn(2);

  fence.setAuthoritativeTurn(1);

  assert.equal(fence.currentTurnId, 2);
  assert.equal(fence.interrupt(1), undefined);
});