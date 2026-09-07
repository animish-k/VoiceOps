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
import { DETERMINISTIC_TRANSACTIONS } from '../fixtures/deterministic_data.js';

export interface StressTestMetrics {
  iterations: number;
  stale_results_generated: number;
  stale_results_discarded: number;
  incorrect_state_commits: number;
  incorrect_authoritative_responses: number;
}

export async function runInterruptionStressTest(iterations = 20): Promise<StressTestMetrics> {
  const metrics: StressTestMetrics = {
    iterations,
    stale_results_generated: 0,
    stale_results_discarded: 0,
    incorrect_state_commits: 0,
    incorrect_authoritative_responses: 0
  };

  for (let i = 0; i < iterations; i++) {
    const logger = new AgentEventLogger();
    const dataEngine = new SyntheticDataEngine({ seedCount: 150 });
    const toolRegistry = new ToolRegistry(dataEngine);

    let turn1EnteredTool: () => void;
    const turn1EnteredPromise = new Promise<void>((resolve) => {
      turn1EnteredTool = resolve;
    });

    let releaseTurn1: () => void;
    const turn1Gate = new Promise<void>((resolve) => {
      releaseTurn1 = resolve;
    });

    toolRegistry.registerTool({
      name: 'query_transactions',
      description: 'query with delay simulation',
      parameters: {},
      execute: async (args: Record<string, unknown>) => {
        const region = (args as any).region;
        const isBangalore = Array.isArray(region)
          ? region.includes('Bangalore')
          : region === 'Bangalore';

        if (isBangalore) {
          turn1EnteredTool();
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

    // 1. Start delayed Turn 1
    const turn1Promise = coordinator.processUtterance('Show failed transactions from Bangalore.');
    await turn1EnteredPromise;

    // 2. Start Turn 2
    const turn2Promise = coordinator.processUtterance('Wait, only Mumbai failures above ten thousand rupees.');

    // 3. Allow Turn 2 to commit
    const turn2Result = await turn2Promise;
    if (!turn2Result.committed || !turn2Result.isAuthoritative) {
      metrics.incorrect_state_commits++;
    }

    // 4. Resolve Turn 1 afterward
    metrics.stale_results_generated++;
    releaseTurn1!();
    const turn1Result = await turn1Promise;

    // 5. Verify Turn 1 cannot commit
    if (turn1Result.committed) {
      metrics.incorrect_state_commits++;
    }

    if (turn1Result.isAuthoritative || (turn1Result.spokenText && turn1Result.spokenText.length > 0 && !turn1Result.aborted)) {
      metrics.incorrect_authoritative_responses++;
    }

    const state = coordinator.getDashboardState();
    if (state.lastUpdatedTurnId !== 2) {
      metrics.incorrect_state_commits++;
    }
    if (state.filters.regions?.[0] !== 'Mumbai' || state.filters.minAmount !== 10000) {
      metrics.incorrect_state_commits++;
    }

    const discardEvents = logger.getEvents().filter((e: AgentEvent) => e.type === 'stale_result_discarded');
    if (discardEvents.length > 0) {
      metrics.stale_results_discarded += discardEvents.length;
    }
  }

  return metrics;
}

test('Interruption Stress Test: 20 iterations of stale-result race condition', async () => {
  const iterations = 20;
  const metrics = await runInterruptionStressTest(iterations);

  assert.equal(metrics.iterations, iterations, `Should run ${iterations} iterations`);
  assert.equal(metrics.stale_results_generated, iterations, 'Every iteration must generate 1 stale Turn 1 result');
  assert.equal(metrics.stale_results_discarded, iterations, 'Every stale result must be discarded by fence');
  assert.equal(metrics.incorrect_state_commits, 0, 'Must have zero incorrect state commits');
  assert.equal(metrics.incorrect_authoritative_responses, 0, 'Must have zero incorrect authoritative responses');
});
