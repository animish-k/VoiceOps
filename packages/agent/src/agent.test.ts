import test from 'node:test';
import assert from 'node:assert/strict';
import { AgentCoordinator } from './AgentCoordinator.js';
import { MockLLMProvider } from './llm/MockLLMProvider.js';
import { ToolRegistry } from './tools/ToolRegistry.js';
import { SyntheticDataEngine } from './data/SyntheticDataEngine.js';

test('Happy Path Demo: Turn 1 query interrupted by Turn 2 superseding query', async () => {
  const dataEngine = new SyntheticDataEngine({ seedCount: 150 });
  const toolRegistry = new ToolRegistry(dataEngine);
  const llmProvider = new MockLLMProvider();

  const coordinator = new AgentCoordinator({
    toolRegistry,
    llmProvider
  });

  // Execute Turn 1 normal happy path first
  const turn1Result = await coordinator.processUtterance('Show failed transactions from Bangalore.');
  assert.equal(turn1Result.turnId, 1);
  assert.equal(turn1Result.committed, true);
  assert.equal(turn1Result.isAuthoritative, true);
  assert.ok(turn1Result.spokenText?.includes('Bangalore'));
  assert.ok(turn1Result.spokenText?.includes('failures') || turn1Result.spokenText?.includes('failed'));

  const state1 = coordinator.getDashboardState();
  assert.equal(state1.lastUpdatedTurnId, 1);
  assert.deepEqual(state1.filters.regions, ['Bangalore']);
  assert.deepEqual(state1.filters.statuses, ['FAILED']);
});

test('Interruption Scenario: Delayed Turn 1 is superseded by Turn 2 and properly fenced', async () => {
  const dataEngine = new SyntheticDataEngine({ seedCount: 150 });
  const toolRegistry = new ToolRegistry(dataEngine);

  // Custom tool registry to inject controllable delay into query_transactions for Turn 1
  let releaseTurn1Delay: () => void;
  const turn1Gate = new Promise<void>((resolve) => {
    releaseTurn1Delay = resolve;
  });

  toolRegistry.registerTool({
    name: 'query_transactions',
    description: 'query',
    parameters: {},
    execute: async (args, signal) => {
      // If region is Bangalore (Turn 1), wait on the gate before completing
      if ((args as any).region?.includes('Bangalore')) {
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
    llmProvider: new MockLLMProvider()
  });

  // Start Turn 1 (will pause inside query_transactions)
  const turn1Promise = coordinator.processUtterance('Show failed transactions from Bangalore.');

  // User interrupts with Turn 2 immediately
  const turn2Promise = coordinator.processUtterance('Wait, only Mumbai failures above ten thousand rupees.');

  // Turn 2 executes and finishes first
  const turn2Result = await turn2Promise;
  assert.equal(turn2Result.turnId, 2);
  assert.equal(turn2Result.committed, true);
  assert.equal(turn2Result.isAuthoritative, true);
  assert.ok(turn2Result.spokenText?.includes('Mumbai'));
  assert.ok(turn2Result.spokenText?.includes('10,000'));

  // Authoritative state belongs to Turn 2
  const stateAfterTurn2 = coordinator.getDashboardState();
  assert.equal(stateAfterTurn2.lastUpdatedTurnId, 2);
  assert.deepEqual(stateAfterTurn2.filters.regions, ['Mumbai']);
  assert.equal(stateAfterTurn2.filters.minAmount, 10000);

  // Now release Turn 1 slow tool
  releaseTurn1Delay!();
  const turn1Result = await turn1Promise;

  // Verify Turn 1 was fenced and discarded
  assert.equal(turn1Result.turnId, 1);
  assert.equal(turn1Result.committed, false);
  assert.equal(turn1Result.isAuthoritative, false);

  // Verify state is STILL Turn 2 and was NOT overwritten by Turn 1
  const finalState = coordinator.getDashboardState();
  assert.equal(finalState.lastUpdatedTurnId, 2);
  assert.deepEqual(finalState.filters.regions, ['Mumbai']);
  assert.equal(finalState.filters.minAmount, 10000);
});

test('Response Generation: Only authoritative turn produces response', async () => {
  const coordinator = new AgentCoordinator();

  const turn1 = coordinator.turnManager.startTurn('Show Bangalore failures');
  const turn2 = coordinator.turnManager.startTurn('Show Mumbai failures');

  // Turn 1 response generation should not happen or be rejected
  const turn1Allowed = coordinator.stateBoundary.checkFence(turn1);
  assert.equal(turn1Allowed.allowed, false);

  const turn2Allowed = coordinator.stateBoundary.checkFence(turn2);
  assert.equal(turn2Allowed.allowed, true);
});
