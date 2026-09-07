import { Transaction, Incident } from '@voiceops/shared';

/**
 * Completely deterministic synthetic transactions for testing.
 * No Math.random() or non-deterministic generators.
 */
export const DETERMINISTIC_TRANSACTIONS: Transaction[] = [
  // 1. Bangalore Failures
  {
    id: 'tx_blr_f01',
    timestamp: '2026-09-07T18:00:00.000Z',
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
    timestamp: '2026-09-07T17:45:00.000Z',
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
    timestamp: '2026-09-07T17:30:00.000Z',
    amount: 850,
    currency: 'INR',
    region: 'Bangalore',
    status: 'FAILED',
    errorCode: 'BANK_DEBIT_FAILED',
    errorMessage: 'Customer bank rejected debit attempt',
    merchantId: 'MERCH_ZOMATO',
    customerTier: 'standard',
    paymentMethod: 'UPI'
  },
  // Bangalore Success
  {
    id: 'tx_blr_s01',
    timestamp: '2026-09-07T18:10:00.000Z',
    amount: 3200,
    currency: 'INR',
    region: 'Bangalore',
    status: 'SUCCESS',
    merchantId: 'MERCH_AMAZON_IN',
    customerTier: 'standard',
    paymentMethod: 'UPI'
  },

  // 2. Mumbai High-Value Failures (> 10,000 INR)
  {
    id: 'tx_mum_hv01',
    timestamp: '2026-09-07T18:15:00.000Z',
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
    timestamp: '2026-09-07T18:05:00.000Z',
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
    timestamp: '2026-09-07T17:50:00.000Z',
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
  // Mumbai Low-Value Failure (<= 10,000 INR)
  {
    id: 'tx_mum_lv01',
    timestamp: '2026-09-07T17:35:00.000Z',
    amount: 750,
    currency: 'INR',
    region: 'Mumbai',
    status: 'FAILED',
    errorCode: 'INSUFFICIENT_FUNDS',
    errorMessage: 'Declined due to insufficient account balance',
    merchantId: 'MERCH_SWIGGY',
    customerTier: 'standard',
    paymentMethod: 'UPI'
  },
  // Mumbai Success High-Value (> 10,000 INR)
  {
    id: 'tx_mum_s01',
    timestamp: '2026-09-07T18:20:00.000Z',
    amount: 25000,
    currency: 'INR',
    region: 'Mumbai',
    status: 'SUCCESS',
    merchantId: 'MERCH_MAKEMYTRIP',
    customerTier: 'enterprise',
    paymentMethod: 'NET_BANKING'
  },

  // 3. Delhi Transactions
  {
    id: 'tx_del_f01',
    timestamp: '2026-09-07T16:00:00.000Z',
    amount: 55000,
    currency: 'INR',
    region: 'Delhi',
    status: 'FAILED',
    errorCode: 'GATEWAY_UNAVAILABLE',
    errorMessage: 'Downstream acquiring gateway unreachable',
    merchantId: 'MERCH_FLIPKART',
    customerTier: 'enterprise',
    paymentMethod: 'CREDIT_CARD'
  },
  {
    id: 'tx_del_s01',
    timestamp: '2026-09-07T16:30:00.000Z',
    amount: 1200,
    currency: 'INR',
    region: 'Delhi',
    status: 'SUCCESS',
    merchantId: 'MERCH_ZOMATO',
    customerTier: 'standard',
    paymentMethod: 'UPI'
  },

  // 4. Chennai & Hyderabad Transactions
  {
    id: 'tx_chn_s01',
    timestamp: '2026-09-07T15:00:00.000Z',
    amount: 9500,
    currency: 'INR',
    region: 'Chennai',
    status: 'SUCCESS',
    merchantId: 'MERCH_SWIGGY',
    customerTier: 'premium',
    paymentMethod: 'UPI'
  },
  {
    id: 'tx_hyd_f01',
    timestamp: '2026-09-07T14:00:00.000Z',
    amount: 15000,
    currency: 'INR',
    region: 'Hyderabad',
    status: 'FAILED',
    errorCode: 'NPCI_TIMEOUT_01',
    errorMessage: 'NPCI Central Switch Timeout',
    merchantId: 'MERCH_RELIANCE',
    customerTier: 'premium',
    paymentMethod: 'WALLET'
  }
];

export const DETERMINISTIC_INCIDENTS: Incident[] = [
  {
    id: 'INC-8491',
    title: 'P1: Mumbai Regional Switch Latency Degradation',
    severity: 'P1',
    status: 'INVESTIGATING',
    affectedRegion: 'Mumbai',
    startedAt: '2026-09-07T17:30:00.000Z',
    summary: 'Spike in gateway timeouts (>5000ms) observed on Mumbai payment switch nodes.',
    failingComponent: 'switch-node-mumbai-03'
  },
  {
    id: 'INC-8488',
    title: 'P2: Bangalore Bank Gateway Rate Limit Throttle',
    severity: 'P2',
    status: 'OPEN',
    affectedRegion: 'Bangalore',
    startedAt: '2026-09-07T16:20:00.000Z',
    summary: 'Partner bank acquiring endpoint returning HTTP 429 rate limit errors for UPI v2 transactions.',
    failingComponent: 'acquirer-conn-blr'
  }
];
