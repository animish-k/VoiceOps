import test from 'node:test';
import assert from 'node:assert/strict';
import { TurnManager } from './TurnManager.js';
import { StateCommitBoundary } from './StateCommitBoundary.js';
import { AgentEventLogger } from '../observability/EventLogger.js';
import { SyntheticDataEngine } from '../data/SyntheticDataEngine.js';
import { executeQueryTransactions } from '../tools/queryTransactions.js';

test('Stale result fencing: Out-of-order execution correctly discards stale Turn 1 results', async () => {
  const logger = new AgentEventLogger();
  const turnManager = new TurnManager(logger);
  const stateBoundary = new StateCommitBoundary(turnManager, undefined, logger);
  const dataEngine = new SyntheticDataEngine();

  // 1. Turn 1 starts delayed query
  const turn1 = turnManager.startTurn('Show failed transactions from Bangalore.');
  assert.equal(turn1.turnId, 1);

  // Simulate Turn 1 query starting (deferred promise resolution)
  let resolveTurn1: (value: any) => void;
  const turn1AsyncWork = new Promise((resolve) => {
    resolveTurn1 = resolve;
  });

  // 2. Turn 2 supersedes Turn 1 while Turn 1 is in-flight
  const turn2 = turnManager.startTurn('Wait, only Mumbai failures above ten thousand rupees.');
  assert.equal(turn2.turnId, 2);
  assert.equal(turnManager.getCurrentTurnId(), 2);
  assert.equal(turn1.isAborted(), true);

  // 3. Turn 2 completes first
  const turn2Result = await executeQueryTransactions(
    { region: ['Mumbai'], status: ['FAILED'], minAmount: 10000 },
    dataEngine,
    turn2.signal
  );

  const turn2Commit = stateBoundary.commitToolResult(turn2, 'query_transactions', turn2Result);
  assert.equal(turn2Commit.committed, true);

  // Authoritative state should reflect Turn 2
  const stateAfterTurn2 = stateBoundary.getDashboardState();
  assert.equal(stateAfterTurn2.lastUpdatedTurnId, 2);
  assert.deepEqual(stateAfterTurn2.filters.regions, ['Mumbai']);
  assert.equal(stateAfterTurn2.filters.minAmount, 10000);
  assert.ok(stateAfterTurn2.transactions.every(tx => tx.region === 'Mumbai'));

  // 4. Turn 1 finishes later (e.g. un-cancellable or slow backend query)
  const turn1Result = await executeQueryTransactions(
    { region: ['Bangalore'], status: ['FAILED'] },
    dataEngine
    // simulating non-cancellable query completing without throwing
  );
  resolveTurn1!(turn1Result);
  await turn1AsyncWork;

  // 5. Attempt to commit Turn 1 stale result
  const turn1Commit = stateBoundary.commitToolResult(turn1, 'query_transactions', turn1Result);

  // 6. Verify Turn 1 is discarded and state is untouched
  assert.equal(turn1Commit.committed, false);
  assert.ok(turn1Commit.discardReason === 'turn_aborted' || turn1Commit.discardReason === 'outdated_generation' || turn1Commit.discardReason === 'turn_superseded');

  // Verify dashboard state is STILL Turn 2 (Mumbai, minAmount 10000)
  const finalState = stateBoundary.getDashboardState();
  assert.equal(finalState.lastUpdatedTurnId, 2);
  assert.deepEqual(finalState.filters.regions, ['Mumbai']);
  assert.equal(finalState.filters.minAmount, 10000);
  assert.ok(finalState.transactions.every(tx => tx.region === 'Mumbai'));

  // Verify telemetry recorded stale discard event
  const events = logger.getEvents();
  const discardEvent = events.find(e => e.type === 'stale_result_discarded');
  assert.ok(discardEvent);
  assert.equal(discardEvent.turnId, 1);
  assert.equal((discardEvent as any).authoritativeTurnId, 2);
});
