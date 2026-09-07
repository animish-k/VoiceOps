import test from 'node:test';
import assert from 'node:assert/strict';
import { SyntheticDataEngine } from '../data/SyntheticDataEngine.js';
import { executeQueryTransactions } from './queryTransactions.js';
import { ToolRegistry } from './ToolRegistry.js';

test('Tool filtering: Bangalore + FAILED filters accurately', async () => {
  const engine = new SyntheticDataEngine({ seedCount: 150 });
  const result = await executeQueryTransactions(
    { region: ['Bangalore'], status: ['FAILED'] },
    engine
  );

  assert.equal(result.success, true);
  assert.ok(result.transactions.length > 0);
  assert.ok(result.transactions.every(tx => tx.region === 'Bangalore' && tx.status === 'FAILED'));
  assert.equal(result.appliedFilters.region?.[0], 'Bangalore');
  assert.equal(result.metrics.failedTransactions, result.totalMatching);
  assert.equal(result.metrics.failureRatePercentage, 100);
});

test('Tool filtering: Mumbai + FAILED + minAmount 10000 filters accurately', async () => {
  const engine = new SyntheticDataEngine({ seedCount: 150 });
  const result = await executeQueryTransactions(
    { region: ['Mumbai'], status: ['FAILED'], minAmount: 10000 },
    engine
  );

  assert.equal(result.success, true);
  assert.ok(result.transactions.length > 0);
  assert.ok(
    result.transactions.every(
      tx => tx.region === 'Mumbai' && tx.status === 'FAILED' && tx.amount >= 10000
    )
  );

  // Check that low-value Mumbai failure (tx_mum_lv01: ₹750) is excluded
  assert.ok(result.transactions.every(tx => tx.amount >= 10000));
  assert.ok(!result.transactions.some(tx => tx.id === 'tx_mum_lv01'));
});

test('Tool filtering: merchantId and timeRange', async () => {
  const engine = new SyntheticDataEngine({ seedCount: 150 });
  const result = await executeQueryTransactions(
    { merchantId: ['MERCH_SWIGGY'], timeRange: { hours: 24 } },
    engine
  );

  assert.equal(result.success, true);
  assert.ok(result.transactions.length > 0);
  assert.ok(result.transactions.every(tx => tx.merchantId === 'MERCH_SWIGGY'));
});

test('ToolRegistry executes tool and validates schema', async () => {
  const registry = new ToolRegistry();
  assert.ok(registry.hasTool('query_transactions'));

  const schemas = registry.getSchemas();
  assert.ok(schemas.some(s => s.name === 'query_transactions'));

  const result = await registry.executeTool('query_transactions', {
    region: ['Delhi'],
    status: ['SUCCESS']
  }) as any;

  assert.equal(result.success, true);
  assert.ok(result.transactions.every((tx: any) => tx.region === 'Delhi' && tx.status === 'SUCCESS'));
});
