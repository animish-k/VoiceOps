import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AgentCoordinator,
  ToolRegistry,
  MockLLMProvider,
  SyntheticDataEngine
} from '@voiceops/agent';
import { dashboardStore } from '../../packages/web/src/state/useDashboardStore.js';
import { DETERMINISTIC_TRANSACTIONS } from '../fixtures/deterministic_data.js';

/**
 * SIMULATION MODE: End-to-end integration and state pipeline verification
 * Runs end-to-end user query simulation across agent coordination and frontend store layers.
 */

test('[SIMULATED E2E] Full VoiceOps Copilot Workflow: Load -> Query -> Barge-in Interruption -> Verified State', async () => {
  // 1. Initial State: Dashboard is initialized
  const initialStore = dashboardStore.getState();
  assert.ok(initialStore.transactions.length > 0, 'Dashboard must render initial transactions');
  assert.ok(initialStore.activeIncidents.length > 0, 'Dashboard must render active incidents');
  assert.equal(initialStore.assistantStatus.currentTurnId, 1);

  // 2. Setup Agent Coordinator with deterministic data
  const dataEngine = new SyntheticDataEngine({ seedCount: 150 });
  const toolRegistry = new ToolRegistry(dataEngine);

  let releaseTurn1: () => void;
  const turn1Gate = new Promise<void>((resolve) => {
    releaseTurn1 = resolve;
  });

  toolRegistry.registerTool({
    name: 'query_transactions',
    description: 'query with controllable async pause',
    parameters: {},
    execute: async (args: Record<string, unknown>) => {
      const region = (args as any).region;
      if (Array.isArray(region) ? region.includes('Bangalore') : region === 'Bangalore') {
        await turn1Gate;
      }
      return {
        success: true,
        ...dataEngine.query(args as any),
        appliedFilters: args as any
      };
    }
  });

  const coordinator = new AgentCoordinator({
    toolRegistry,
    llmProvider: new MockLLMProvider()
  });

  // 3. User speaks Turn 1: "Show failed transactions from Bangalore."
  const turn1Promise = coordinator.processUtterance('Show failed transactions from Bangalore.');

  // 4. User interrupts mid-flight with Turn 2: "Wait, only Mumbai failures above ten thousand rupees."
  const turn2Promise = coordinator.processUtterance('Wait, only Mumbai failures above ten thousand rupees.');

  // 5. Turn 2 executes and finishes first
  const turn2Result = await turn2Promise;
  assert.equal(turn2Result.turnId, 2);
  assert.equal(turn2Result.committed, true);
  assert.equal(turn2Result.isAuthoritative, true);

  // Sync state to frontend store
  if (turn2Result.state) {
    const applied = dashboardStore.applyTurnUpdate(2, turn2Result.state);
    assert.equal(applied, true, 'Turn 2 state should be applied to store');
  }

  // Verify frontend store has Turn 2 state
  const storeAfterTurn2 = dashboardStore.getState();
  assert.equal(storeAfterTurn2.lastUpdatedTurnId, 2);
  assert.deepEqual(storeAfterTurn2.filters.regions, ['Mumbai']);
  assert.equal(storeAfterTurn2.filters.minAmount, 10000);

  // 6. Turn 1 async backend call finally unblocks and completes
  releaseTurn1!();
  const turn1Result = await turn1Promise;

  // Verify Turn 1 result was fenced
  assert.equal(turn1Result.turnId, 1);
  assert.equal(turn1Result.committed, false);
  assert.equal(turn1Result.isAuthoritative, false);

  // Attempt to push Turn 1 stale state to frontend store
  const stalePushed = dashboardStore.applyTurnUpdate(1, {
    filters: { regions: ['Bangalore'] }
  });
  assert.equal(stalePushed, false, 'Frontend store must reject stale Turn 1 update');

  // 7. Verify final frontend store integrity
  const finalStore = dashboardStore.getState();
  assert.equal(finalStore.lastUpdatedTurnId, 2);
  assert.deepEqual(finalStore.filters.regions, ['Mumbai']);
  assert.deepEqual(finalStore.filters.statuses, ['FAILED']);
  assert.equal(finalStore.filters.minAmount, 10000);
});
