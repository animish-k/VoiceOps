import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AgentCoordinator,
  AgentEventLogger,
  AgentEvent,
  ToolRegistry,
  MockLLMProvider,
  SyntheticDataEngine
} from '@voiceops/agent';
import { DETERMINISTIC_TRANSACTIONS } from '../fixtures/deterministic_data.js';
import { LatencyTracker, calculateCutoffLatency } from '../fixtures/telemetry_helpers.js';

test('Observability: Structured events emitted with turnId, requestId, and timestamps', async () => {
  const logger = new AgentEventLogger();
  const dataEngine = new SyntheticDataEngine({ seedCount: 150 });
  const toolRegistry = new ToolRegistry(dataEngine);

  const coordinator = new AgentCoordinator({
    toolRegistry,
    llmProvider: new MockLLMProvider(),
    logger
  });

  const result = await coordinator.processUtterance('Show failed transactions from Bangalore.');
  assert.equal(result.committed, true);

  const events: AgentEvent[] = logger.getEvents();
  assert.ok(events.length >= 4, 'Should record lifecycle events');

  // Verify all events contain turnId, requestId, timestamp
  for (const event of events) {
    assert.ok(typeof event.turnId === 'number', 'Every event must have numeric turnId');
    assert.ok(typeof event.requestId === 'string' && event.requestId.length > 0, 'Every event must have non-empty requestId');
    assert.ok(typeof event.timestamp === 'number' && event.timestamp > 0, 'Every event must have timestamp');

    // Security check: Verify no API keys or secrets in logs
    const serialized = JSON.stringify(event);
    assert.ok(!serialized.toLowerCase().includes('apikey'), 'Must not log API keys');
    assert.ok(!serialized.toLowerCase().includes('secret'), 'Must not log secrets');
    assert.ok(!serialized.toLowerCase().includes('bearer'), 'Must not log bearer tokens');
  }

  // Check specific event types
  const turnCreated = events.find((e: AgentEvent) => e.type === 'turn_created');
  assert.ok(turnCreated);

  const toolStarted = events.find((e: AgentEvent) => e.type === 'tool_started');
  assert.ok(toolStarted);
  assert.equal((toolStarted as any).toolName, 'query_transactions');

  const toolCompleted = events.find((e: AgentEvent) => e.type === 'tool_completed');
  assert.ok(toolCompleted);
  assert.equal((toolCompleted as any).toolName, 'query_transactions');
  assert.ok(typeof (toolCompleted as any).durationMs === 'number');

  const stateCommit = events.find((e: AgentEvent) => e.type === 'state_commit');
  assert.ok(stateCommit);
  assert.equal((stateCommit as any).toolName, 'query_transactions');

  const responseGenerated = events.find((e: AgentEvent) => e.type === 'response_generated');
  assert.ok(responseGenerated);
  assert.ok(typeof (responseGenerated as any).spokenText === 'string');
});

test('Observability: Tool aborted and stale result discarded events', async () => {
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
      if ((args as any).region?.includes('Bangalore')) {
        turn1EnteredTool();
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
    llmProvider: new MockLLMProvider(),
    logger
  });

  const p1 = coordinator.processUtterance('Show failed transactions from Bangalore.');
  await turn1EnteredPromise;

  const p2 = coordinator.processUtterance('Wait, only Mumbai failures above ten thousand rupees.');

  await p2;
  releaseTurn1!();
  await p1;

  const events: AgentEvent[] = logger.getEvents();

  // Verify turn_interrupted event
  const interruptedEvent = events.find((e: AgentEvent) => e.type === 'turn_interrupted');
  assert.ok(interruptedEvent);
  assert.equal(interruptedEvent.turnId, 1);
  assert.equal((interruptedEvent as any).supersededByTurnId, 2);

  // Verify stale_result_discarded event
  const staleEvent = events.find((e: AgentEvent) => e.type === 'stale_result_discarded');
  assert.ok(staleEvent);
  assert.equal(staleEvent.turnId, 1);
  assert.equal((staleEvent as any).authoritativeTurnId, 2);
  assert.equal((staleEvent as any).toolName, 'query_transactions');
});

test('Interruption Telemetry Helpers: Cutoff latency calculation and latency tracking', () => {
  const tracker = new LatencyTracker();

  tracker.start('tool_execution');
  // simulate operation
  const record = tracker.end('tool_execution');

  assert.ok(typeof record.durationMs === 'number');
  assert.ok(record.durationMs >= 0);
  assert.ok(record.startTimestampMs > 0);
  assert.ok(record.endTimestampMs! >= record.startTimestampMs);

  // Cutoff latency
  const detectedAt = 1000;
  const stoppedAt = 1045;
  const cutoff = calculateCutoffLatency(detectedAt, stoppedAt);
  assert.equal(cutoff, 45);

  assert.throws(() => {
    calculateCutoffLatency(2000, 1990);
  }, /audioStoppedAt cannot be earlier/);
});
