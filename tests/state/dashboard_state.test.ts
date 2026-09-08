import test from 'node:test';
import assert from 'node:assert/strict';
import { dashboardStore } from '../../packages/web/src/state/useDashboardStore.js';
import { DETERMINISTIC_TRANSACTIONS } from '../fixtures/deterministic_data.js';

test('Frontend Store: Out-of-order turnId event is rejected and authoritative turnId is accepted', () => {
  // Establish baseline authoritative state at turnId = 2
  const turn2Accepted = dashboardStore.applyTurnUpdate(2, {
    filters: {
      regions: ['Mumbai'],
      statuses: ['FAILED'],
      minAmount: 10000
    }
  });
  assert.equal(turn2Accepted, true, 'Turn 2 update must be accepted');

  const stateTurn2 = dashboardStore.getState();
  assert.equal(stateTurn2.lastUpdatedTurnId, 2);
  assert.deepEqual(stateTurn2.filters.regions, ['Mumbai']);

  // Incoming event with lower turnId = 1 (stale result)
  const turn1StaleAccepted = dashboardStore.applyTurnUpdate(1, {
    filters: {
      regions: ['Bangalore'],
      statuses: ['FAILED']
    }
  });

  // Verify Turn 1 event was rejected / discarded
  assert.equal(turn1StaleAccepted, false, 'Turn 1 stale update must be rejected when current turn is 2');

  const stateAfterStale = dashboardStore.getState();
  assert.equal(stateAfterStale.lastUpdatedTurnId, 2, 'Authoritative turnId must remain 2');
  assert.deepEqual(stateAfterStale.filters.regions, ['Mumbai'], 'Filters must remain Mumbai');

  // Incoming event with matching turnId = 2 (accepted)
  const turn2PatchAccepted = dashboardStore.applyTurnUpdate(2, {
    totalMatchingCount: 42
  });
  assert.equal(turn2PatchAccepted, true);
  assert.equal(dashboardStore.getState().totalMatchingCount, 42);

  // Incoming event with higher turnId = 3 (accepted)
  const turn3Accepted = dashboardStore.applyTurnUpdate(3, {
    filters: {
      regions: ['Delhi']
    }
  });
  assert.equal(turn3Accepted, true);
  assert.equal(dashboardStore.getState().lastUpdatedTurnId, 3);
  assert.deepEqual(dashboardStore.getState().filters.regions, ['Delhi']);
});

test('Frontend Store: Turn 10 (Bangalore) followed by Turn 20 (Mumbai failures > ₹10,000) prevents stale Bangalore reappearance', () => {
  const turn10 = 10;
  const turn20 = 20;

  dashboardStore.setFilters(turn10, {
    regions: ['Bangalore'],
    statuses: ['FAILED']
  });

  const state1 = dashboardStore.getState();
  assert.equal(state1.lastUpdatedTurnId, turn10);
  assert.deepEqual(state1.filters.regions, ['Bangalore']);

  // User interrupts with Turn 20
  dashboardStore.setFilters(turn20, {
    regions: ['Mumbai'],
    statuses: ['FAILED'],
    minAmount: 10000
  });

  const state2 = dashboardStore.getState();
  assert.equal(state2.lastUpdatedTurnId, turn20);
  assert.deepEqual(state2.filters.regions, ['Mumbai']);
  assert.equal(state2.filters.minAmount, 10000);

  // Delayed Turn 10 attempts to setFilters
  const staleFilterApplied = dashboardStore.setFilters(turn10, {
    regions: ['Bangalore'],
    statuses: ['FAILED']
  });

  assert.equal(staleFilterApplied, false, 'Stale setFilters call must be rejected');

  // Confirm state remains Turn 20
  const finalState = dashboardStore.getState();
  assert.equal(finalState.lastUpdatedTurnId, turn20);
  assert.deepEqual(finalState.filters.regions, ['Mumbai']);
  assert.equal(finalState.filters.minAmount, 10000);
});
