import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AgentCoordinator,
  ToolRegistry,
  MockLLMProvider,
  SyntheticDataEngine,
  AgentEventLogger,
  AgentEvent
} from '@voiceops/agent';
import { Transaction } from '@voiceops/shared';
import { DETERMINISTIC_TRANSACTIONS } from '../fixtures/deterministic_data.js';

test('Critical Race Condition: Delayed Turn 1 superseded by Turn 2 with strict result fencing', async () => {
  const logger = new AgentEventLogger();
  const dataEngine = new SyntheticDataEngine({ seedCount: 150 });
  const toolRegistry = new ToolRegistry(dataEngine);

  // Gates to synchronize Turn 1 tool start and release
  let turn1EnteredTool: () => void;
  const turn1EnteredPromise = new Promise<void>((resolve) => {
    turn1EnteredTool = resolve;
  });

  let releaseTurn1: () => void;
  const turn1Gate = new Promise<void>((resolve) => {
    releaseTurn1 = resolve;
  });

  // Custom tool wrapper to hold Turn 1 in flight until explicitly released
  toolRegistry.registerTool({
    name: 'query_transactions',
    description: 'Query synthetic transactions with delay simulation',
    parameters: {},
    execute: async (args: Record<string, unknown>, _signal?: AbortSignal) => {
      const region = (args as any).region;
      const isBangalore = Array.isArray(region)
        ? region.includes('Bangalore')
        : region === 'Bangalore';

      if (isBangalore) {
        turn1EnteredTool();
        // Pause Turn 1 query until Turn 2 has already committed
        await turn1Gate;
      }

      const queryRes = dataEngine.query(args as any);
      return {
        success: true,
        ...queryRes,
        appliedFilters: args as any
      };
    }
  });

  const coordinator = new AgentCoordinator({
    toolRegistry,
    llmProvider: new MockLLMProvider(),
    logger
  });

  // Step 1: Start Turn 1 - "Show failed transactions from Bangalore."
  const turn1Promise = coordinator.processUtterance('Show failed transactions from Bangalore.');

  // Wait for Turn 1 to reach tool execution
  await turn1EnteredPromise;

  // Step 2 & 3: Before Turn 1 completes, user interrupts with Turn 2 - "Wait, only Mumbai failures above ten thousand rupees."
  const turn2Promise = coordinator.processUtterance('Wait, only Mumbai failures above ten thousand rupees.');

  // Step 4 & 5: Turn 2 executes, completes first, and commits authoritative state
  const turn2Result = await turn2Promise;

  assert.equal(turn2Result.turnId, 2, 'Turn 2 must have turnId = 2');
  assert.equal(turn2Result.committed, true, 'Turn 2 must commit successfully');
  assert.equal(turn2Result.isAuthoritative, true, 'Turn 2 must be authoritative');
  assert.equal(turn2Result.aborted, false, 'Turn 2 must not be aborted');
  assert.ok(turn2Result.spokenText?.includes('Mumbai'), 'Turn 2 spoken text must mention Mumbai');
  assert.ok(turn2Result.spokenText?.includes('10,000') || turn2Result.spokenText?.includes('10000'), 'Turn 2 spoken text must mention 10,000 threshold');

  // Verify dashboard state immediately after Turn 2 commit
  const stateAfterTurn2 = coordinator.getDashboardState();
  assert.equal(stateAfterTurn2.lastUpdatedTurnId, 2);
  assert.deepEqual(stateAfterTurn2.filters.regions, ['Mumbai']);
  assert.deepEqual(stateAfterTurn2.filters.statuses, ['FAILED']);
  assert.equal(stateAfterTurn2.filters.minAmount, 10000);
  assert.ok(stateAfterTurn2.transactions.length > 0, 'Transactions matching Turn 2 criteria should be present');
  assert.ok(
    stateAfterTurn2.transactions.every((tx: Transaction) => tx.region === 'Mumbai' && tx.status === 'FAILED' && tx.amount >= 10000),
    'All rendered transactions must match Turn 2 filters'
  );

  // Step 6: Release Turn 1 delayed operation, allowing it to finish after Turn 2 has committed
  releaseTurn1!();
  const turn1Result = await turn1Promise;

  // Step 7: Verify Turn 1 is fenced and discarded
  assert.equal(turn1Result.turnId, 1, 'Turn 1 result must have turnId = 1');
  assert.equal(turn1Result.committed, false, 'Turn 1 stale state commit must be rejected');
  assert.equal(turn1Result.isAuthoritative, false, 'Turn 1 must NOT be authoritative');
  assert.ok(turn1Result.discardReason, 'Turn 1 must have a discard reason recorded');

  // Comprehensive Final State Assertions:
  const finalState = coordinator.getDashboardState();

  // 1. Final authoritative turnId = 2
  assert.equal(finalState.lastUpdatedTurnId, 2, 'Final state lastUpdatedTurnId must remain 2');

  // 2. Final filters: region = Mumbai, status = FAILED, minAmount = 10000
  assert.deepEqual(finalState.filters.regions, ['Mumbai']);
  assert.deepEqual(finalState.filters.statuses, ['FAILED']);
  assert.equal(finalState.filters.minAmount, 10000);

  // 3. No Bangalore Turn 1 state remains
  assert.ok(
    !finalState.transactions.some((tx: Transaction) => tx.region === 'Bangalore'),
    'Zero Bangalore transactions must appear in final state'
  );

  // 4. All transactions match Mumbai high-value failure criteria
  assert.ok(
    finalState.transactions.every((tx: Transaction) => tx.region === 'Mumbai' && tx.status === 'FAILED' && tx.amount >= 10000),
    'All transactions in final state must be Mumbai high-value failures'
  );

  // 5. Stale Turn 1 result did not generate active spoken response
  assert.equal(
    finalState.assistantStatus.currentTurnId,
    2,
    'Assistant status currentTurnId must remain 2'
  );

  // 6. Observability: stale_result_discarded event exists
  const events: AgentEvent[] = logger.getEvents();
  const staleDiscardEvents = events.filter((e: AgentEvent) => e.type === 'stale_result_discarded');
  assert.ok(staleDiscardEvents.length >= 1, 'stale_result_discarded event must be logged');
  const discardEvent = staleDiscardEvents.find((e: AgentEvent) => e.turnId === 1);
  assert.ok(discardEvent, 'stale_result_discarded event for Turn 1 must exist');
  assert.equal((discardEvent as any).authoritativeTurnId, 2);
  assert.equal((discardEvent as any).toolName, 'query_transactions');
});
