export type TransactionStatus = 'SUCCESS' | 'FAILED' | 'PENDING' | 'DISPUTED';

export type SupportedRegion = 'Bangalore' | 'Mumbai' | 'Delhi' | 'Hyderabad' | 'Chennai';

export type CustomerTier = 'standard' | 'premium' | 'enterprise';

export interface Transaction {
  id: string;
  timestamp: string; // ISO 8601 string
  amount: number;
  currency: string;
  region: SupportedRegion;
  status: TransactionStatus;
  errorCode?: string;
  errorMessage?: string;
  merchantId: string;
  customerTier: CustomerTier;
  paymentMethod: 'UPI' | 'CREDIT_CARD' | 'NET_BANKING' | 'WALLET';
}

export type IncidentSeverity = 'P1' | 'P2' | 'P3' | 'P4';
export type IncidentStatus = 'OPEN' | 'INVESTIGATING' | 'MITIGATED' | 'RESOLVED';

export interface Incident {
  id: string;
  title: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  affectedRegion: SupportedRegion;
  startedAt: string;
  summary: string;
  failingComponent: string;
}
