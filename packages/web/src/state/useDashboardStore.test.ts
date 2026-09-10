import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { useDashboardStore } from './useDashboardStore.js';
import { SYNTHETIC_TRANSACTIONS, DashboardState, DataChannelEvent } from '@voiceops/shared';

describe('VoiceOps Turn-Fenced Store & Primary Demo Flows', () => {
  beforeEach(() => {
    useDashboardStore.getState().resetToBaseline();
  });

  it('A. Initializes with synthetic data and default metrics', () => {
    const state = useDashboardStore.getState();

    assert.equal(state.lastUpdatedTurnId, 1);
    assert.equal(state.transactions.length, SYNTHETIC_TRANSACTIONS.length);
    assert.equal(state.totalMatchingCount, SYNTHETIC_TRANSACTIONS.length);
    assert.ok(state.metrics.totalTransactions > 0);
    assert.ok(state.activeIncidents.length > 0);
  });

  it('B. Turn 1: Bangalore failed filter displays correctly', () => {
    const store = useDashboardStore.getState();

    const applied = store.setFilters(1, {
      regions: ['Bangalore'],
      statuses: ['FAILED']
    });

    assert.equal(applied, true);

    const state = useDashboardStore.getState();
    assert.equal(state.lastUpdatedTurnId, 1);
    assert.deepEqual(state.filters.regions, ['Bangalore']);
    assert.deepEqual(state.filters.statuses, ['FAILED']);

    // All matching transactions should be Bangalore and FAILED
    assert.ok(state.transactions.length > 0);
    state.transactions.forEach(tx => {
      assert.equal(tx.region, 'Bangalore');
      assert.equal(tx.status, 'FAILED');
    });

    // Metrics match filtered results
    assert.equal(state.metrics.totalTransactions, state.transactions.length);
    assert.equal(state.metrics.failedTransactions, state.transactions.length);
    assert.equal(state.metrics.failureRatePercentage, 100);
  });

  it('C. Turn 2: Mumbai + FAILED + minAmount 10000 displays correctly', () => {
    const store = useDashboardStore.getState();

    // First Turn 1
    store.setFilters(1, {
      regions: ['Bangalore'],
      statuses: ['FAILED']
    });

    // Then Turn 2 Interruption
    const applied = store.setFilters(2, {
      regions: ['Mumbai'],
      statuses: ['FAILED'],
      minAmount: 10000
    });

    assert.equal(applied, true);

    const state = useDashboardStore.getState();
    assert.equal(state.lastUpdatedTurnId, 2);
    assert.deepEqual(state.filters.regions, ['Mumbai']);
    assert.deepEqual(state.filters.statuses, ['FAILED']);
    assert.equal(state.filters.minAmount, 10000);

    // All returned transactions must be Mumbai, FAILED, and >= 10,000
    assert.ok(state.transactions.length > 0);
    state.transactions.forEach(tx => {
      assert.equal(tx.region, 'Mumbai');
      assert.equal(tx.status, 'FAILED');
      assert.ok(tx.amount >= 10000, `Transaction amount ${tx.amount} is less than 10000`);
    });
  });

  it('D. Stale Turn 1 state update arriving after Turn 2 is rejected and ignored', () => {
    const store = useDashboardStore.getState();

    // 1. Establish Turn 2 authoritative state
    store.setFilters(2, {
      regions: ['Mumbai'],
      statuses: ['FAILED'],
      minAmount: 10000
    });

    const stateAtTurn2 = useDashboardStore.getState();
    assert.equal(stateAtTurn2.lastUpdatedTurnId, 2);
    assert.deepEqual(stateAtTurn2.filters.regions, ['Mumbai']);
    const expectedTxCount = stateAtTurn2.transactions.length;

    // 2. Late Turn 1 Snapshot arrives
    const staleTurn1Snapshot: DashboardState = {
      lastUpdatedTurnId: 1,
      filters: { regions: ['Bangalore'], statuses: ['FAILED'] },
      transactions: SYNTHETIC_TRANSACTIONS.filter(t => t.region === 'Bangalore'),
      totalMatchingCount: 3,
      metrics: {
        totalTransactions: 3,
        failedTransactions: 3,
        failureRatePercentage: 100,
        totalVolumeRupees: 19550,
        p95LatencyMs: 420
      },
      activeIncidents: [],
      assistantStatus: {
        isListening: false,
        isThinking: false,
        isSpeaking: true,
        currentTurnId: 1,
        interruptionCount: 0,
        lastSpokenResponse: 'Stale Bangalore'
      }
    };

    const accepted = store.applySnapshot(staleTurn1Snapshot, 1);

    // Assert that the snapshot was rejected by the Turn Fence
    assert.equal(accepted, false, 'Turn Fence should have rejected Turn 1 update');

    // Assert that the state remains strictly on Turn 2
    const currentState = useDashboardStore.getState();
    assert.equal(currentState.lastUpdatedTurnId, 2, 'Authoritative turn must remain 2');
    assert.deepEqual(currentState.filters.regions, ['Mumbai'], 'Region filter must remain Mumbai');
    assert.equal(currentState.filters.minAmount, 10000, 'minAmount filter must remain 10000');
    assert.equal(currentState.transactions.length, expectedTxCount);
  });

  it('E. Valid Turn 2 or higher update is accepted', () => {
    const store = useDashboardStore.getState();

    // Turn 1
    store.setFilters(1, { regions: ['Bangalore'] });
    assert.equal(useDashboardStore.getState().lastUpdatedTurnId, 1);

    // Turn 2
    const acceptedTurn2 = store.setFilters(2, { regions: ['Mumbai'] });
    assert.equal(acceptedTurn2, true);
    assert.equal(useDashboardStore.getState().lastUpdatedTurnId, 2);

    // Turn 3
    const acceptedTurn3 = store.setFilters(3, { regions: ['Delhi'] });
    assert.equal(acceptedTurn3, true);
    assert.equal(useDashboardStore.getState().lastUpdatedTurnId, 3);
  });

  it('F. Handles DataChannelEvent protocol correctly', () => {
    const store = useDashboardStore.getState();

    // Event 1: Tool execution start
    const event1: DataChannelEvent = {
      type: 'TOOL_EXECUTION_START',
      toolName: 'query_transactions',
      args: { region: 'Mumbai', minAmount: 10000 },
      turnId: 2
    };
    const handled1 = store.handleDataChannelEvent(event1);
    assert.equal(handled1, true);
    assert.equal(useDashboardStore.getState().toolExecution?.active, true);
    assert.equal(useDashboardStore.getState().toolExecution?.toolName, 'query_transactions');

    // Event 2: Interruption event
    const event2: DataChannelEvent = {
      type: 'TURN_INTERRUPTED',
      supersededTurnId: 1,
      newTurnId: 2,
      reason: 'User voice interruption'
    };
    const handled2 = store.handleDataChannelEvent(event2);
    assert.equal(handled2, true);
    assert.equal(useDashboardStore.getState().interruptionInfo?.supersededTurnId, 1);
    assert.equal(useDashboardStore.getState().interruptionInfo?.newTurnId, 2);
  });
});
