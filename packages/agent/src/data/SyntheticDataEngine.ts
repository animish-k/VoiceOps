import {
  Transaction,
  TransactionStatus,
  SupportedRegion,
  CustomerTier,
  QueryTransactionsParams,
  MetricsSummary
} from '@voiceops/shared';

export interface SyntheticDataEngineOptions {
  seedCount?: number;
  deterministic?: boolean;
}

export class SyntheticDataEngine {
  private transactions: Transaction[] = [];

  constructor(options: SyntheticDataEngineOptions = {}) {
    this.seed(options.seedCount ?? 150);
  }

  public seed(count = 150): void {
    const regions: SupportedRegion[] = ['Bangalore', 'Mumbai', 'Delhi', 'Hyderabad', 'Chennai'];
    const merchants = [
      'MERCH_FLIPKART',
      'MERCH_SWIGGY',
      'MERCH_AMAZON_IN',
      'MERCH_ZOMATO',
      'MERCH_MAKEMYTRIP',
      'MERCH_RELIANCE'
    ];
    const paymentMethods: Transaction['paymentMethod'][] = ['UPI', 'CREDIT_CARD', 'NET_BANKING', 'WALLET'];

    const errorDetails = [
      { code: 'NPCI_TIMEOUT_01', msg: 'NPCI Central Switch Timeout' },
      { code: 'BANK_DEBIT_FAILED', msg: 'Customer bank rejected debit attempt' },
      { code: 'GATEWAY_UNAVAILABLE', msg: 'Downstream acquiring gateway unreachable' },
      { code: 'RISK_SCORE_EXCEEDED', msg: 'Fraud prevention rule triggered high risk score' },
      { code: 'INSUFFICIENT_FUNDS', msg: 'Declined due to insufficient account balance' }
    ];

    const results: Transaction[] = [];

    // --- Deterministic Seed Items for Demo Flow ---
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

    // 2. Mumbai failed transactions (High Value > 10,000 INR and Low Value <= 10,000 INR)
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
        amount: 750,
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

    // 3. Additional deterministic records for other regions
    const fixedAmounts = [1500, 3200, 18500, 950, 42000, 6800, 24000, 1200, 56000, 3100];
    for (let i = results.length; i < count; i++) {
      const region = regions[i % regions.length];
      const isFailed = i % 4 === 0;
      const status: TransactionStatus = isFailed ? 'FAILED' : 'SUCCESS';
      const amount = fixedAmounts[i % fixedAmounts.length] + ((i * 37) % 500);
      const error = isFailed ? errorDetails[i % errorDetails.length] : undefined;
      const tier: CustomerTier = i % 5 === 0 ? 'enterprise' : i % 2 === 0 ? 'premium' : 'standard';

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
        customerTier: tier,
        paymentMethod: paymentMethods[i % paymentMethods.length]
      });
    }

    this.transactions = results;
  }

  public getTransactions(): Transaction[] {
    return [...this.transactions];
  }

  public query(params: QueryTransactionsParams): {
    transactions: Transaction[];
    totalMatching: number;
    metrics: MetricsSummary;
  } {
    let filtered = this.transactions;

    if (params.region) {
      const regions = Array.isArray(params.region)
        ? params.region.map(r => r.toLowerCase())
        : [params.region.toLowerCase()];
      filtered = filtered.filter(tx => regions.includes(tx.region.toLowerCase()));
    }

    if (params.status) {
      const statuses = Array.isArray(params.status)
        ? params.status
        : [params.status];
      filtered = filtered.filter(tx => statuses.includes(tx.status));
    }

    if (typeof params.minAmount === 'number') {
      filtered = filtered.filter(tx => tx.amount >= (params.minAmount ?? 0));
    }

    if (typeof params.maxAmount === 'number') {
      filtered = filtered.filter(tx => tx.amount <= (params.maxAmount ?? Infinity));
    }

    if (params.merchantId) {
      const merchantIds = Array.isArray(params.merchantId)
        ? params.merchantId.map(m => m.toLowerCase())
        : [params.merchantId.toLowerCase()];
      filtered = filtered.filter(tx => merchantIds.includes(tx.merchantId.toLowerCase()));
    }

    if (params.timeRange) {
      if (params.timeRange.hours) {
        const cutoff = Date.now() - params.timeRange.hours * 3600 * 1000;
        filtered = filtered.filter(tx => new Date(tx.timestamp).getTime() >= cutoff);
      }
      if (params.timeRange.start) {
        const startTime = new Date(params.timeRange.start).getTime();
        filtered = filtered.filter(tx => new Date(tx.timestamp).getTime() >= startTime);
      }
      if (params.timeRange.end) {
        const endTime = new Date(params.timeRange.end).getTime();
        filtered = filtered.filter(tx => new Date(tx.timestamp).getTime() <= endTime);
      }
    }

    if (params.paymentMethod) {
      filtered = filtered.filter(tx => tx.paymentMethod === params.paymentMethod);
    }

    if (params.searchQuery) {
      const q = params.searchQuery.toLowerCase();
      filtered = filtered.filter(tx =>
        tx.id.toLowerCase().includes(q) ||
        tx.merchantId.toLowerCase().includes(q) ||
        (tx.errorCode && tx.errorCode.toLowerCase().includes(q)) ||
        (tx.errorMessage && tx.errorMessage.toLowerCase().includes(q))
      );
    }

    const totalMatching = filtered.length;
    const limit = params.limit ?? 50;
    const paged = filtered.slice(0, limit);
    const metrics = this.computeMetrics(filtered);

    return {
      transactions: paged,
      totalMatching,
      metrics
    };
  }

  public computeMetrics(dataset: Transaction[]): MetricsSummary {
    const totalTransactions = dataset.length;
    const failedTransactions = dataset.filter(tx => tx.status === 'FAILED').length;
    const failureRatePercentage = totalTransactions > 0
      ? Number(((failedTransactions / totalTransactions) * 100).toFixed(2))
      : 0;
    const totalVolumeRupees = dataset.reduce((sum, tx) => sum + tx.amount, 0);

    return {
      totalTransactions,
      failedTransactions,
      failureRatePercentage,
      totalVolumeRupees,
      p95LatencyMs: 340 // baseline realistic synthetic P95 latency
    };
  }
}

export const defaultSyntheticEngine = new SyntheticDataEngine();
