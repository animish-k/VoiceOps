import test from 'node:test';
import assert from 'node:assert/strict';
import { TurnManager } from './TurnManager.js';
import { TurnContext } from './TurnContext.js';
import { AgentEventLogger } from '../observability/EventLogger.js';

test('Turn sequencing: Turn 1 created, Turn 2 created, Turn 1 becomes obsolete', () => {
  const logger = new AgentEventLogger();
  const turnManager = new TurnManager(logger);

  // Turn 1 starts
  const turn1 = turnManager.startTurn('Show failed transactions from Bangalore.');
  assert.equal(turn1.turnId, 1);
  assert.ok(turn1.requestId);
  assert.equal(turnManager.getCurrentTurnId(), 1);
  assert.ok(turnManager.isAuthoritative(turn1));
  assert.equal(turn1.isAborted(), false);

  // Turn 2 starts (interrupts Turn 1)
  const turn2 = turnManager.startTurn('Wait, only Mumbai failures above ten thousand rupees.');
  assert.equal(turn2.turnId, 2);
  assert.equal(turnManager.getCurrentTurnId(), 2);

  // Turn 1 is now obsolete
  assert.equal(turnManager.isAuthoritative(turn1), false);
  assert.equal(turn1.isAborted(), true);
  assert.equal(turn1.isSuperseded, true);
  assert.equal(turn1.status, 'INTERRUPTED');

  // Turn 2 is authoritative
  assert.equal(turnManager.isAuthoritative(turn2), true);
  assert.equal(turn2.isAborted(), false);

  // Telemetry check
  const events = logger.getEvents();
  assert.ok(events.some(e => e.type === 'turn_created' && e.turnId === 1));
  assert.ok(events.some(e => e.type === 'turn_interrupted' && e.turnId === 1 && (e as any).supersededByTurnId === 2));
  assert.ok(events.some(e => e.type === 'turn_created' && e.turnId === 2));
});

test('Abort behavior: AbortSignal triggers listeners on supersede', (t, done) => {
  const logger = new AgentEventLogger();
  const turnManager = new TurnManager(logger);

  const turn1 = turnManager.startTurn('Initial query');
  let signalTriggered = false;

  turn1.signal.addEventListener('abort', () => {
    signalTriggered = true;
    assert.equal(turn1.signal.reason, 'Superseded by turn 2');
    done();
  });

  // Supersede with Turn 2
  turnManager.startTurn('Interruption query');
  assert.ok(signalTriggered);
});
