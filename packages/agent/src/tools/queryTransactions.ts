import {
  QueryTransactionsParams,
  Transaction,
  MetricsSummary
} from '@voiceops/shared';
import { SyntheticDataEngine, defaultSyntheticEngine } from '../data/SyntheticDataEngine.js';

export interface QueryTransactionsResult {
  success: boolean;
  transactions: Transaction[];
  totalMatching: number;
  metrics: MetricsSummary;
  appliedFilters: QueryTransactionsParams;
}

export function executeQueryTransactions(
  params: QueryTransactionsParams,
  engine: SyntheticDataEngine = defaultSyntheticEngine,
  signal?: AbortSignal
): Promise<QueryTransactionsResult> {
  return new Promise((resolve, reject) => {
    // Check if aborted before running
    if (signal?.aborted) {
      return reject(new DOMException('Query aborted', 'AbortError'));
    }

    const abortHandler = () => {
      reject(new DOMException('Query aborted', 'AbortError'));
    };

    signal?.addEventListener('abort', abortHandler, { once: true });

    try {
      const { transactions, totalMatching, metrics } = engine.query(params);

      // Clean up abort listener
      signal?.removeEventListener('abort', abortHandler);

      resolve({
        success: true,
        transactions,
        totalMatching,
        metrics,
        appliedFilters: params
      });
    } catch (err) {
      signal?.removeEventListener('abort', abortHandler);
      reject(err);
    }
  });
}

export const QUERY_TRANSACTIONS_SCHEMA = {
  name: 'query_transactions',
  description: 'Query, filter, and aggregate transactions based on region, status, amount thresholds, merchant, and timeframe.',
  parameters: {
    type: 'object',
    properties: {
      region: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['Bangalore', 'Mumbai', 'Delhi', 'Hyderabad', 'Chennai']
        },
        description: 'One or more regions to filter by (e.g. ["Bangalore"], ["Mumbai"]).'
      },
      status: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['SUCCESS', 'FAILED', 'PENDING', 'DISPUTED']
        },
        description: 'One or more transaction statuses to filter by (e.g. ["FAILED"]).'
      },
      minAmount: {
        type: 'number',
        description: 'Minimum transaction amount in INR (e.g. 10000).'
      },
      maxAmount: {
        type: 'number',
        description: 'Maximum transaction amount in INR.'
      },
      merchantId: {
        type: 'array',
        items: {
          type: 'string'
        },
        description: 'One or more merchant IDs to filter by (e.g. ["MERCH_SWIGGY"]).'
      },
      timeRange: {
        type: 'object',
        properties: {
          hours: {
            type: 'number',
            description: 'Lookback window in hours (e.g. 4).'
          },
          start: {
            type: 'string',
            description: 'ISO start timestamp.'
          },
          end: {
            type: 'string',
            description: 'ISO end timestamp.'
          }
        },
        description: 'Time window filter.'
      },
      paymentMethod: {
        type: 'string',
        enum: ['UPI', 'CREDIT_CARD', 'NET_BANKING', 'WALLET'],
        description: 'Payment method filter.'
      },
      limit: {
        type: 'number',
        description: 'Maximum number of records to return (defaults to 50).'
      }
    }
  }
};
