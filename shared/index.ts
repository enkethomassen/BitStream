// Shared types across the monorepo

export interface Payment {
  id: number;
  recipient: string;
  amount: string; // in MUSD (formatted)
  interval: number; // seconds
  lastExecuted: number; // unix timestamp
  isActive: boolean;
  isX402: boolean;
  endpoint: string;
}

export interface VaultInfo {
  collateral: string; // BTC (mocked, in wei)
  musdBalance: string;
  collateralRatio: number;
  payments: Payment[];
}

export interface ScheduledJob {
  paymentId: number;
  userAddress: string;
  isX402: boolean;
  endpoint?: string;
  amount: string;
  recipient: string;
}

export interface X402PaymentResult {
  success: boolean;
  txHash?: string;
  error?: string;
  paidAmount?: string;
  endpoint?: string;
  timestamp: number;
}

export interface PaymentLog {
  id: string;
  timestamp: number;
  paymentId: number;
  userAddress: string;
  recipient: string;
  amount: string;
  type: "wallet" | "x402";
  status: "success" | "failed" | "pending";
  txHash?: string;
  endpoint?: string;
  error?: string;
}

export const PAYMENT_INTERVALS = {
  HOURLY: 3600,
  DAILY: 86400,
  WEEKLY: 604800,
  MONTHLY: 2592000,
} as const;

export const COLLATERAL_RATIO_MIN = 150; // 150%
export const MUSD_DECIMALS = 18;
export const BTC_MOCK_PRICE = 65000; // USD per BTC (mock oracle)
