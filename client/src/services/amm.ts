import type { TradeEstimate } from "@/types/market";
import { CONTRACT_CONFIG } from "@/config/contracts";

const FEE_BPS = 0; // No fees in Parimutuel
const BASIS_POINTS = 10000;

// Pure parimutuel model: prices are always 50/50
// Winners split losers' pool proportionally based on their share
export function calculatePrice(_yesPool: number, _noPool: number): { yesPriceBps: number; noPriceBps: number } {
  return { yesPriceBps: 5000, noPriceBps: 5000 };
}

export function bpsToUsd(bps: number): number {
  return bps / BASIS_POINTS;
}

export function calculateBuyYes(
  _yesPool: number,
  _noPool: number,
  moveIn: number
): TradeEstimate {
  // Pure parimutuel: 1:1 tokens, no price impact, always 50/50
  return {
    tokensOut: moveIn,
    priceImpactBps: 0,
    fee: 0,
    averagePrice: 0.5, // Always 50%
  };
}

export function calculateBuyNo(
  _yesPool: number,
  _noPool: number,
  moveIn: number
): TradeEstimate {
  // Pure parimutuel: 1:1 tokens, no price impact, always 50/50
  return {
    tokensOut: moveIn,
    priceImpactBps: 0,
    fee: 0,
    averagePrice: 0.5, // Always 50%
  };
}

// Selling is not supported in this Parimutuel implementation
export function calculateSellYes(yesPool: number, noPool: number, tokensIn: number): TradeEstimate {
  return { tokensOut: 0, priceImpactBps: 0, fee: 0, averagePrice: 0 };
}

export function calculateSellNo(yesPool: number, noPool: number, tokensIn: number): TradeEstimate {
  return { tokensOut: 0, priceImpactBps: 0, fee: 0, averagePrice: 0 };
}

export function formatTimeUntilExpiry(expiryTimestamp: number): string {
  const now = Date.now();
  // expiryTimestamp is in Unix seconds, convert to milliseconds for comparison
  const expiryMs = expiryTimestamp * 1000;
  const diff = expiryMs - now;

  if (diff <= 0) return "Expired";

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 0) {
    return `${days}d ${hours}h`;
  }

  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}
