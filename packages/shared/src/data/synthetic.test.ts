import test from 'node:test';
import assert from 'node:assert/strict';
import {
  querySyntheticTransactions,
  SYNTHETIC_TRANSACTIONS,
  generateSyntheticTransactions
} from './synthetic.js';

test('synthetic dataset generator creates requested transaction volume', () => {
  const dataset = generateSyntheticTransactions(50);
  assert.equal(dataset.length, 50);
  assert.ok(dataset.some(tx => tx.region === 'Bangalore'));
  assert.ok(dataset.some(tx => tx.region === 'Mumbai'));
});

test('querySyntheticTransactions filters by region and failure status', () => {
  const result = querySyntheticTransactions(
    { region: 'Bangalore', status: 'FAILED' },
    SYNTHETIC_TRANSACTIONS
  );

  assert.ok(result.transactions.length > 0);
  assert.ok(result.transactions.every(tx => tx.region === 'Bangalore' && tx.status === 'FAILED'));
});

test('querySyntheticTransactions filters by minimum amount constraint', () => {
  const result = querySyntheticTransactions(
    { region: 'Mumbai', status: 'FAILED', minAmount: 10000 },
    SYNTHETIC_TRANSACTIONS
  );

  assert.ok(result.transactions.length > 0);
  assert.ok(result.transactions.every(tx => tx.region === 'Mumbai' && tx.status === 'FAILED' && tx.amount >= 10000));
  // Verify low value failure (e.g. ₹750) is excluded
  assert.ok(result.transactions.every(tx => tx.amount >= 10000));
});
