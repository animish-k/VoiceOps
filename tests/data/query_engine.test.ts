import test from 'node:test';
import assert from 'node:assert/strict';
import { querySyntheticTransactions } from '@voiceops/shared';
import { SyntheticDataEngine } from '@voiceops/agent';
import { DETERMINISTIC_TRANSACTIONS } from '../fixtures/deterministic_data.js';

test('A. Query: region = Bangalore, status = FAILED', () => {
  const { transactions, totalMatching } = querySyntheticTransactions(
    { region: 'Bangalore', status: 'FAILED' },
    DETERMINISTIC_TRANSACTIONS
  );

  assert.equal(totalMatching, 3, 'Should match exactly 3 Bangalore failure transactions');
  assert.equal(transactions.length, 3);
  assert.ok(transactions.every(tx => tx.region === 'Bangalore' && tx.status === 'FAILED'));

  const ids = transactions.map(tx => tx.id);
  assert.ok(ids.includes('tx_blr_f01'));
  assert.ok(ids.includes('tx_blr_f02'));
  assert.ok(ids.includes('tx_blr_f03'));
});

test('B. Query: region = Mumbai, status = FAILED, minAmount = 10000', () => {
  const { transactions, totalMatching } = querySyntheticTransactions(
    { region: 'Mumbai', status: 'FAILED', minAmount: 10000 },
    DETERMINISTIC_TRANSACTIONS
  );

  assert.equal(totalMatching, 3, 'Should match 3 Mumbai high-value failure transactions');
  assert.equal(transactions.length, 3);
  assert.ok(
    transactions.every(tx => tx.region === 'Mumbai' && tx.status === 'FAILED' && tx.amount >= 10000)
  );

  // Check that low-value Mumbai failure (tx_mum_lv01: ₹750) is excluded
  const ids = transactions.map(tx => tx.id);
  assert.ok(!ids.includes('tx_mum_lv01'), 'Low-value failure tx_mum_lv01 must be excluded');
  assert.ok(ids.includes('tx_mum_hv01'));
  assert.ok(ids.includes('tx_mum_hv02'));
  assert.ok(ids.includes('tx_mum_hv03'));
});

test('C. Query: Multiple filters simultaneously (region, status, minAmount, maxAmount, paymentMethod)', () => {
  const { transactions, totalMatching } = querySyntheticTransactions(
    {
      region: ['Mumbai'],
      status: ['FAILED'],
      minAmount: 10000,
      maxAmount: 50000,
      paymentMethod: 'NET_BANKING'
    },
    DETERMINISTIC_TRANSACTIONS
  );

  assert.equal(totalMatching, 1);
  assert.equal(transactions.length, 1);
  assert.equal(transactions[0].id, 'tx_mum_hv01');
  assert.equal(transactions[0].paymentMethod, 'NET_BANKING');
  assert.equal(transactions[0].amount, 32000);
});

test('D. Query: Time-range filtering with start and end ISO strings', () => {
  const start = '2026-09-07T17:00:00.000Z';
  const end = '2026-09-07T18:10:00.000Z';

  const { transactions, totalMatching } = querySyntheticTransactions(
    {
      timeRange: { start, end }
    },
    DETERMINISTIC_TRANSACTIONS
  );

  assert.ok(totalMatching > 0);
  assert.ok(
    transactions.every(tx => {
      const time = new Date(tx.timestamp).getTime();
      return time >= new Date(start).getTime() && time <= new Date(end).getTime();
    })
  );
});

test('E. Query: Merchant filtering (single and array)', () => {
  // Single merchant
  const singleRes = querySyntheticTransactions(
    { merchantId: 'MERCH_SWIGGY' },
    DETERMINISTIC_TRANSACTIONS
  );
  assert.ok(singleRes.transactions.length > 0);
  assert.ok(singleRes.transactions.every(tx => tx.merchantId === 'MERCH_SWIGGY'));

  // Array of merchants
  const multiRes = querySyntheticTransactions(
    { merchantId: ['MERCH_SWIGGY', 'MERCH_FLIPKART'] },
    DETERMINISTIC_TRANSACTIONS
  );
  assert.ok(multiRes.transactions.length > singleRes.transactions.length);
  assert.ok(
    multiRes.transactions.every(tx =>
      ['MERCH_SWIGGY', 'MERCH_FLIPKART'].includes(tx.merchantId)
    )
  );
});

test('F. Query: Limit and Pagination handling', () => {
  const fullRes = querySyntheticTransactions({}, DETERMINISTIC_TRANSACTIONS);
  const totalCount = DETERMINISTIC_TRANSACTIONS.length;
  assert.equal(fullRes.totalMatching, totalCount);

  // Custom limit of 2
  const limitRes = querySyntheticTransactions(
    { limit: 2 },
    DETERMINISTIC_TRANSACTIONS
  );
  assert.equal(limitRes.transactions.length, 2);
  assert.equal(limitRes.totalMatching, totalCount);

  // Default limit behavior (should not exceed total matching)
  const defaultLimitRes = querySyntheticTransactions(
    {},
    DETERMINISTIC_TRANSACTIONS
  );
  assert.equal(defaultLimitRes.transactions.length, Math.min(50, totalCount));
});

test('SyntheticDataEngine: Metrics calculation correctness', () => {
  const engine = new SyntheticDataEngine({ seedCount: 150 });
  const result = engine.query({ region: ['Bangalore'], status: ['FAILED'] });

  assert.ok(result.totalMatching >= 3);
  assert.ok(result.metrics.failedTransactions >= 3);
  assert.equal(result.metrics.failureRatePercentage, 100);
  assert.ok(result.metrics.totalVolumeRupees >= 4500 + 14200 + 850);
});
