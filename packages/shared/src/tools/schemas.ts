import { SupportedRegion, TransactionStatus } from '../types/domain.js';

export interface QueryTransactionsParams {
  region?: SupportedRegion | SupportedRegion[];
  status?: TransactionStatus | TransactionStatus[];
  minAmount?: number;
  maxAmount?: number;
  merchantId?: string | string[];
  timeRange?: {
    start?: string;
    end?: string;
    hours?: number;
  };
  paymentMethod?: 'UPI' | 'CREDIT_CARD' | 'NET_BANKING' | 'WALLET';
  searchQuery?: string;
  limit?: number;
}

export interface CompareTimeframesParams {
  metric: 'failure_rate' | 'volume' | 'latency';
  timeframeA: 'today' | 'last_4_hours' | 'current_shift';
  timeframeB: 'yesterday' | 'previous_4_hours' | 'previous_shift';
  region?: SupportedRegion;
}

export interface GetIncidentDetailsParams {
  incidentId?: string;
  region?: SupportedRegion;
  severity?: 'P1' | 'P2' | 'P3' | 'P4';
}
