import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DashboardState,
  TurnMetadata,
  DataChannelEvent,
  QueryTransactionsParams,
  Transaction,
  Incident
} from '@voiceops/shared';
import { AgentCoordinator } from '@voiceops/agent';

test('Contracts: DashboardState conforms to contract schema', () => {
  const coordinator = new AgentCoordinator();
  const state: DashboardState = coordinator.getDashboardState();

  assert.ok(typeof state.lastUpdatedTurnId === 'number');
  assert.ok(typeof state.filters === 'object');
  assert.ok(Array.isArray(state.transactions));
  assert.ok(typeof state.totalMatchingCount === 'number');
  assert.ok(typeof state.metrics === 'object');
  assert.ok(typeof state.metrics.totalTransactions === 'number');
  assert.ok(typeof state.metrics.failedTransactions === 'number');
  assert.ok(typeof state.metrics.failureRatePercentage === 'number');
  assert.ok(typeof state.metrics.totalVolumeRupees === 'number');
  assert.ok(typeof state.metrics.p95LatencyMs === 'number');
  assert.ok(Array.isArray(state.activeIncidents));
  assert.ok(typeof state.assistantStatus === 'object');
  assert.ok(typeof state.assistantStatus.currentTurnId === 'number');
  assert.ok(typeof state.assistantStatus.interruptionCount === 'number');
});

test('Contracts: TurnMetadata schema and fields', () => {
  const coordinator = new AgentCoordinator();
  const turn = coordinator.turnManager.startTurn('Test query');

  const metadata: TurnMetadata = {
    turnId: turn.turnId,
    requestId: turn.requestId,
    status: turn.status,
    userUtterance: turn.userUtterance,
    assistantSpokenText: turn.assistantSpokenText,
    timestamps: turn.timestamps,
    isAborted: turn.isAborted()
  };

  assert.equal(typeof metadata.turnId, 'number');
  assert.equal(typeof metadata.requestId, 'string');
  assert.equal(typeof metadata.status, 'string');
  assert.equal(typeof metadata.isAborted, 'boolean');
  assert.ok(typeof metadata.timestamps === 'object');
});

test('Contracts: DataChannelEvent variants and turnId propagation', () => {
  const coordinator = new AgentCoordinator();
  const state = coordinator.getDashboardState();

  const events: DataChannelEvent[] = [
    {
      type: 'STATE_SNAPSHOT',
      payload: state,
      turnId: 1
    },
    {
      type: 'STATE_PATCH',
      payload: { totalMatchingCount: 10 },
      turnId: 1
    },
    {
      type: 'TOOL_EXECUTION_START',
      toolName: 'query_transactions',
      args: { region: 'Bangalore' },
      turnId: 1
    },
    {
      type: 'TOOL_EXECUTION_COMPLETE',
      toolName: 'query_transactions',
      durationMs: 45,
      turnId: 1
    },
    {
      type: 'TURN_STATUS_UPDATE',
      status: 'EXECUTING_TOOL',
      metadata: {
        turnId: 1,
        requestId: 'req_123',
        status: 'EXECUTING_TOOL',
        timestamps: {},
        isAborted: false
      },
      turnId: 1
    },
    {
      type: 'TURN_INTERRUPTED',
      supersededTurnId: 1,
      newTurnId: 2,
      reason: 'User barge-in'
    },
    {
      type: 'TRANSCRIPT_DELTA',
      role: 'user',
      text: 'Show Mumbai failures',
      isFinal: true,
      turnId: 2
    }
  ];

  for (const event of events) {
    if ('turnId' in event) {
      assert.ok(typeof event.turnId === 'number', 'Every event with turnId must have a valid numeric turnId');
      assert.ok(event.turnId > 0, 'turnId must be positive');
    }
    if (event.type === 'TURN_INTERRUPTED') {
      assert.ok(typeof event.supersededTurnId === 'number');
      assert.ok(typeof event.newTurnId === 'number');
      assert.ok(event.newTurnId > event.supersededTurnId);
    }
  }
});

test('Contracts: QueryTransactionsParams structure validation', () => {
  const validParams: QueryTransactionsParams = {
    region: 'Bangalore',
    status: 'FAILED',
    minAmount: 1000,
    maxAmount: 50000,
    merchantId: ['MERCH_SWIGGY', 'MERCH_FLIPKART'],
    timeRange: { hours: 4, start: '2026-09-07T12:00:00.000Z' },
    paymentMethod: 'UPI',
    searchQuery: 'NPCI',
    limit: 25
  };

  assert.equal(validParams.region, 'Bangalore');
  assert.equal(validParams.status, 'FAILED');
  assert.equal(validParams.minAmount, 1000);
});
