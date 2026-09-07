import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TurnManager,
  StateCommitBoundary,
  AgentEventLogger,
  ResponseGenerator,
  SyntheticDataEngine,
  executeQueryTransactions,
  AgentEvent
} from '@voiceops/agent';
import { Transaction } from '@voiceops/shared';
import { DETERMINISTIC_TRANSACTIONS } from '../fixtures/deterministic_data.js';

test('A. Normal Turn Creation and Authoritative State', () => {
  const logger = new AgentEventLogger();
  const turnManager = new TurnManager(logger);

  // Turn 1 is created
  const turn1 = turnManager.startTurn('Show failed transactions from Bangalore.');

  assert.equal(turn1.turnId, 1, 'Turn 1 must have turnId = 1');
  assert.ok(turn1.requestId, 'Turn 1 must have a non-empty requestId');
  assert.equal(typeof turn1.requestId, 'string');
  assert.equal(turn1.status, 'LISTENING', 'Initial turn status must be LISTENING');
  assert.equal(turnManager.getCurrentTurnId(), 1);
  assert.equal(turnManager.isAuthoritative(turn1), true, 'Turn 1 must be authoritative');
  assert.equal(turn1.isAborted(), false, 'Turn 1 must not be aborted initially');
  assert.equal(turn1.isSuperseded, false, 'Turn 1 must not be superseded initially');

  const events: AgentEvent[] = logger.getEvents();
  assert.equal(events.length, 1);
  assert.equal(events[0].type, 'turn_created');
  assert.equal(events[0].turnId, 1);
});

test('B. New Turn Supersedes Previous Turn', () => {
  const logger = new AgentEventLogger();
  const turnManager = new TurnManager(logger);

  const turn1 = turnManager.startTurn('Show failed transactions from Bangalore.');
  assert.equal(turn1.turnId, 1);

  // Turn 2 is created
  const turn2 = turnManager.startTurn('Wait, only Mumbai failures above ten thousand rupees.');

  assert.equal(turn2.turnId, 2, 'Turn 2 must have higher turnId');
  assert.ok(turn2.turnId > turn1.turnId, 'Turn 2 turnId > Turn 1 turnId');
  assert.equal(turnManager.getCurrentTurnId(), 2);

  // Turn 1 is no longer authoritative
  assert.equal(turnManager.isAuthoritative(turn1), false, 'Turn 1 must NOT be authoritative');
  assert.equal(turn1.isAborted(), true, 'Turn 1 must be aborted');
  assert.equal(turn1.isSuperseded, true, 'Turn 1 must be marked superseded');
  assert.equal(turn1.status, 'INTERRUPTED', 'Turn 1 status must be INTERRUPTED');

  // Turn 2 is authoritative
  assert.equal(turnManager.isAuthoritative(turn2), true, 'Turn 2 must be authoritative');
  assert.equal(turn2.isAborted(), false);
  assert.equal(turn2.isSuperseded, false);

  // Event logger verification
  const events: AgentEvent[] = logger.getEvents();
  assert.ok(events.some((e: AgentEvent) => e.type === 'turn_created' && e.turnId === 1));
  assert.ok(events.some((e: AgentEvent) => e.type === 'turn_interrupted' && e.turnId === 1 && (e as any).supersededByTurnId === 2));
  assert.ok(events.some((e: AgentEvent) => e.type === 'turn_created' && e.turnId === 2));
});

test('C. Multiple Interruptions (Turn 1 -> Turn 2 -> Turn 3 -> Turn 4)', () => {
  const logger = new AgentEventLogger();
  const turnManager = new TurnManager(logger);

  const turn1 = turnManager.startTurn('Show Bangalore failures');
  const turn2 = turnManager.startTurn('Wait, show Mumbai failures');
  const turn3 = turnManager.startTurn('Actually, Delhi failures');
  const turn4 = turnManager.startTurn('Final: Chennai failures only');

  assert.equal(turnManager.getCurrentTurnId(), 4);

  // Turns 1, 2, 3 must all be non-authoritative, aborted, and superseded
  for (const t of [turn1, turn2, turn3]) {
    assert.equal(turnManager.isAuthoritative(t), false, `Turn ${t.turnId} must not be authoritative`);
    assert.equal(t.isAborted(), true, `Turn ${t.turnId} must be aborted`);
    assert.equal(t.isSuperseded, true, `Turn ${t.turnId} must be superseded`);
    assert.equal(t.status, 'INTERRUPTED', `Turn ${t.turnId} status must be INTERRUPTED`);
  }

  // Turn 4 must be the single authoritative turn
  assert.equal(turnManager.isAuthoritative(turn4), true, 'Turn 4 must be authoritative');
  assert.equal(turn4.isAborted(), false);
  assert.equal(turn4.isSuperseded, false);

  // Verify interruption event chain
  const events: AgentEvent[] = logger.getEvents();
  const interruptedEvents = events.filter((e: AgentEvent) => e.type === 'turn_interrupted');
  assert.equal(interruptedEvents.length, 3, 'Three turns should be recorded as interrupted');
});

test('D. Abort Behavior and AbortSignal Listener Execution', () => {
  const logger = new AgentEventLogger();
  const turnManager = new TurnManager(logger);

  const turn1 = turnManager.startTurn('Initial long query');
  let abortFired = false;
  let abortReason: string | undefined;

  turn1.signal.addEventListener('abort', () => {
    abortFired = true;
    abortReason = turn1.signal.reason as string;
  });

  assert.equal(abortFired, false);

  // Trigger supersede
  turnManager.startTurn('Interruption utterance');

  assert.equal(abortFired, true, 'Abort listener should have fired synchronously upon supersede');
  assert.ok(abortReason?.includes('Superseded by turn 2'), 'Abort reason should mention superseding turn');
  assert.equal(turn1.signal.aborted, true);
});

test('E. Stale Result Fencing: Delayed Turn 1 Result Discarded', async () => {
  const logger = new AgentEventLogger();
  const turnManager = new TurnManager(logger);
  const stateBoundary = new StateCommitBoundary(turnManager, undefined, logger);
  const responseGen = new ResponseGenerator(logger);
  const dataEngine = new SyntheticDataEngine({ seedCount: 150 });

  // 1. Turn 1 starts
  const turn1 = turnManager.startTurn('Show failed transactions from Bangalore.');
  turn1.setStatus('EXECUTING_TOOL');

  // 2. Turn 2 supersedes Turn 1
  const turn2 = turnManager.startTurn('Wait, only Mumbai failures above ten thousand rupees.');
  turn2.setStatus('EXECUTING_TOOL');

  // 3. Turn 2 completes and commits state
  const turn2Result = await executeQueryTransactions(
    { region: ['Mumbai'], status: ['FAILED'], minAmount: 10000 },
    dataEngine,
    turn2.signal
  );
  const turn2Commit = stateBoundary.commitToolResult(turn2, 'query_transactions', turn2Result);
  assert.equal(turn2Commit.committed, true);

  // Authoritative state belongs to Turn 2
  const stateAfterTurn2 = stateBoundary.getDashboardState();
  assert.equal(stateAfterTurn2.lastUpdatedTurnId, 2);
  assert.deepEqual(stateAfterTurn2.filters.regions, ['Mumbai']);
  assert.equal(stateAfterTurn2.filters.minAmount, 10000);

  // 4. Turn 1 delayed execution finishes afterward
  const turn1Result = await executeQueryTransactions(
    { region: ['Bangalore'], status: ['FAILED'] },
    dataEngine
  );

  // 5. Attempt to commit Turn 1 stale result
  const turn1Commit = stateBoundary.commitToolResult(turn1, 'query_transactions', turn1Result);

  // 6. Assertions
  assert.equal(turn1Commit.committed, false, 'Turn 1 stale commit must be rejected');
  assert.ok(turn1Commit.discardReason, 'Discard reason must be present');

  // Verify dashboard state was NOT mutated by Turn 1
  const finalState = stateBoundary.getDashboardState();
  assert.equal(finalState.lastUpdatedTurnId, 2, 'Final state lastUpdatedTurnId must remain 2');
  assert.deepEqual(finalState.filters.regions, ['Mumbai']);
  assert.equal(finalState.filters.minAmount, 10000);
  assert.ok(finalState.transactions.every((tx: Transaction) => tx.region === 'Mumbai'));

  // Verify response generator cannot generate response for Turn 1
  const turn1Fence = stateBoundary.checkFence(turn1);
  assert.equal(turn1Fence.allowed, false, 'Response fence must reject Turn 1');

  // Verify stale_result_discarded event was logged
  const events: AgentEvent[] = logger.getEvents();
  const discardEvent = events.find((e: AgentEvent) => e.type === 'stale_result_discarded');
  assert.ok(discardEvent, 'stale_result_discarded event must be logged');
  assert.equal(discardEvent.turnId, 1);
  assert.equal((discardEvent as any).authoritativeTurnId, 2);
});
