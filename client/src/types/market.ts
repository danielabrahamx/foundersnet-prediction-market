export interface Market {
  id: string;
  companyName: string;
  description: string;
  yesPool: bigint;
  noPool: bigint;
  totalLiquidity: bigint;
  resolved: boolean;
  winningOutcome: boolean;
  expiryTimestamp: number;
  creator: string;
  createdAt: number;
}

export interface MarketDisplay {
  id: string;
  companyName: string;
  description: string;
  yesPriceBps: number;
  noPriceBps: number;
  yesPriceUsd: number;
  noPriceUsd: number;
  totalLiquidity: number;
  yesPool: number;
  noPool: number;
  volume24h: number;
  resolved: boolean;
  winningOutcome: boolean;
  expiryTimestamp: number;
  timeUntilExpiry: string;
}

export interface UserPosition {
  marketId: string;
  userAddress: string;
  yesTokens: bigint;
  noTokens: bigint;
  totalInvested: bigint;
  averageYesPrice: number;
  averageNoPrice: number;
  lastTradeTimestamp: number;
}

export interface UserPositionDisplay {
  marketId: string;
  companyName: string;
  yesTokens: number;
  noTokens: number;
  totalInvested: number;
  currentValue: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  potentialPnl: number;
  potentialPnlPercent: number;
  resolved: boolean;
  claimable: boolean;
  claimableAmount: number;
  isWinner?: boolean;      // Whether the user won this bet (true for winners, even after claiming)
  hasClaimed?: boolean;    // Whether the user has already claimed their winnings
}

export interface TradeEstimate {
  tokensOut: number;
  priceImpactBps: number;
  fee: number;
  averagePrice: number;
}

export interface PriceHistory {
  timestamp: number;
  yesPriceBps: number;
  noPriceBps: number;
}

export type TradeType = "YES" | "NO";
export type TradeAction = "BUY" | "SELL";
export type MarketFilter = "active" | "resolved" | "trending";

export interface TransactionState {
  status: "idle" | "pending" | "confirmed" | "failed";
  hash?: string;
  error?: string;
}
