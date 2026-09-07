import { Incident, SupportedRegion, Transaction, TransactionStatus } from '../types/domain.js';
import { QueryTransactionsParams } from '../tools/schemas.js';

export const SYNTHETIC_INCIDENTS: Incident[] = [
  {
    id: 'INC-8491',
    title: 'P1: Mumbai Regional Switch Latency Degradation',
    severity: 'P1',
    status: 'INVESTIGATING',
    affectedRegion: 'Mumbai',
    startedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    summary: 'Spike in gateway timeouts (>5000ms) observed on Mumbai payment switch nodes.',
    failingComponent: 'switch-node-mumbai-03'
  },
  {
    id: 'INC-8488',
    title: 'P2: Bangalore Bank Gateway Rate Limit Throttle',
    severity: 'P2',
    status: 'OPEN',
    affectedRegion: 'Bangalore',
    startedAt: new Date(Date.now() - 110 * 60 * 1000).toISOString(),
    summary: 'Partner bank acquiring endpoint returning HTTP 429 rate limit errors for UPI v2 transactions.',
    failingComponent: 'acquirer-conn-blr'
  },
  {
    id: 'INC-8472',
    title: 'P3: Delhi High-Value Clearing Delay',
    severity: 'P3',
    status: 'MITIGATED',
    affectedRegion: 'Delhi',
    startedAt: new Date(Date.now() - 240 * 60 * 1000).toISOString(),
    summary: 'Batched clearing queue backlogged for enterprise merchant transfers.',
    failingComponent: 'clearing-worker-del'
  }
];

export function generateSyntheticTransactions(count = 120): Transaction[] {
  const regions: SupportedRegion[] = ['Bangalore', 'Mumbai', 'Delhi', 'Hyderabad', 'Chennai'];
  const errorDetails = [
    { code: 'NPCI_TIMEOUT_01', msg: 'NPCI Central Switch Timeout' },
    { code: 'BANK_DEBIT_FAILED', msg: 'Customer bank rejected debit attempt' },
    { code: 'GATEWAY_UNAVAILABLE', msg: 'Downstream acquiring gateway unreachable' },
    { code: 'RISK_SCORE_EXCEEDED', msg: 'Fraud prevention rule triggered high risk score' },
    { code: 'INSUFFICIENT_FUNDS', msg: 'Declined due to insufficient account balance' }
  ];

  const merchants = ['MERCH_FLIPKART', 'MERCH_SWIGGY', 'MERCH_AMAZON_IN', 'MERCH_ZOMATO', 'MERCH_MAKEMYTRIP', 'MERCH_RELIANCE'];
  const paymentMethods: Transaction['paymentMethod'][] = ['UPI', 'CREDIT_CARD', 'NET_BANKING', 'WALLET'];

  const results: Transaction[] = [];

  // Deterministic seed items to guarantee demo flow
  // 1. Bangalore failed transactions
  results.push(
    {
      id: 'tx_blr_f01',
      timestamp: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
      amount: 4500,
      currency: 'INR',
      region: 'Bangalore',
      status: 'FAILED',
      errorCode: 'NPCI_TIMEOUT_01',
      errorMessage: 'NPCI Central Switch Timeout',
      merchantId: 'MERCH_SWIGGY',
      customerTier: 'standard',
      paymentMethod: 'UPI'
    },
    {
      id: 'tx_blr_f02',
      timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
      amount: 14200,
      currency: 'INR',
      region: 'Bangalore',
      status: 'FAILED',
      errorCode: 'GATEWAY_UNAVAILABLE',
      errorMessage: 'Downstream acquiring gateway unreachable',
      merchantId: 'MERCH_FLIPKART',
      customerTier: 'premium',
      paymentMethod: 'CREDIT_CARD'
    },
    {
      id: 'tx_blr_f03',
      timestamp: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
      amount: 850,
      currency: 'INR',
      region: 'Bangalore',
      status: 'FAILED',
      errorCode: 'BANK_DEBIT_FAILED',
      errorMessage: 'Customer bank rejected debit attempt',
      merchantId: 'MERCH_ZOMATO',
      customerTier: 'standard',
      paymentMethod: 'UPI'
    }
  );

  // 2. Mumbai failed high-value transactions (> 10,000 INR)
  results.push(
    {
      id: 'tx_mum_hv01',
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      amount: 32000,
      currency: 'INR',
      region: 'Mumbai',
      status: 'FAILED',
      errorCode: 'GATEWAY_UNAVAILABLE',
      errorMessage: 'Downstream acquiring gateway unreachable',
      merchantId: 'MERCH_MAKEMYTRIP',
      customerTier: 'enterprise',
      paymentMethod: 'NET_BANKING'
    },
    {
      id: 'tx_mum_hv02',
      timestamp: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
      amount: 78500,
      currency: 'INR',
      region: 'Mumbai',
      status: 'FAILED',
      errorCode: 'NPCI_TIMEOUT_01',
      errorMessage: 'NPCI Central Switch Timeout',
      merchantId: 'MERCH_RELIANCE',
      customerTier: 'enterprise',
      paymentMethod: 'UPI'
    },
    {
      id: 'tx_mum_hv03',
      timestamp: new Date(Date.now() - 32 * 60 * 1000).toISOString(),
      amount: 12500,
      currency: 'INR',
      region: 'Mumbai',
      status: 'FAILED',
      errorCode: 'RISK_SCORE_EXCEEDED',
      errorMessage: 'Fraud prevention rule triggered high risk score',
      merchantId: 'MERCH_AMAZON_IN',
      customerTier: 'premium',
      paymentMethod: 'CREDIT_CARD'
    },
    {
      id: 'tx_mum_lv01',
      timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      amount: 750, // Low-value Mumbai failure (should be filtered out by > 10,000)
      currency: 'INR',
      region: 'Mumbai',
      status: 'FAILED',
      errorCode: 'INSUFFICIENT_FUNDS',
      errorMessage: 'Declined due to insufficient account balance',
      merchantId: 'MERCH_SWIGGY',
      customerTier: 'standard',
      paymentMethod: 'UPI'
    }
  );

  // Generate remaining random synthetic distribution
  for (let i = results.length; i < count; i++) {
    const region = regions[i % regions.length];
    const isFailed = i % 4 === 0; // ~25% failure rate
    const status: TransactionStatus = isFailed ? 'FAILED' : 'SUCCESS';
    const amount = Math.floor(Math.random() * 85000) + 100;
    const error = isFailed ? errorDetails[i % errorDetails.length] : undefined;

    results.push({
      id: `tx_${region.toLowerCase().slice(0, 3)}_${1000 + i}`,
      timestamp: new Date(Date.now() - (i * 3 + 2) * 60 * 1000).toISOString(),
      amount,
      currency: 'INR',
      region,
      status,
      errorCode: error?.code,
      errorMessage: error?.msg,
      merchantId: merchants[i % merchants.length],
      customerTier: i % 5 === 0 ? 'enterprise' : i % 2 === 0 ? 'premium' : 'standard',
      paymentMethod: paymentMethods[i % paymentMethods.length]
    });
  }

  return results;
}

export const SYNTHETIC_TRANSACTIONS = generateSyntheticTransactions(150);

export function querySyntheticTransactions(
  params: QueryTransactionsParams,
  dataset: Transaction[] = SYNTHETIC_TRANSACTIONS
): { transactions: Transaction[]; totalMatching: number } {
  let filtered = dataset;

  if (params.region) {
    filtered = filtered.filter(tx => tx.region.toLowerCase() === params.region?.toLowerCase());
  }

  if (params.status) {
    filtered = filtered.filter(tx => tx.status === params.status);
  }

  if (typeof params.minAmount === 'number') {
    filtered = filtered.filter(tx => tx.amount >= (params.minAmount ?? 0));
  }

  if (typeof params.maxAmount === 'number') {
    filtered = filtered.filter(tx => tx.amount <= (params.maxAmount ?? Infinity));
  }

  if (params.paymentMethod) {
    filtered = filtered.filter(tx => tx.paymentMethod === params.paymentMethod);
  }

  const totalMatching = filtered.length;
  const limit = params.limit ?? 50;
  const paged = filtered.slice(0, limit);

  return {
    transactions: paged,
    totalMatching
  };
}
