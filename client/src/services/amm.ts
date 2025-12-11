import type { TradeEstimate } from "@/types/market";
import { CONTRACT_CONFIG } from "@/config/contracts";

const FEE_BPS = CONTRACT_CONFIG.fees.tradingFeeBps;
const BASIS_POINTS = 10000;

export function calculatePrice(yesPool: number, noPool: number): { yesPriceBps: number; noPriceBps: number } {
  const total = yesPool + noPool;
  if (total === 0) {
    return { yesPriceBps: 5000, noPriceBps: 5000 };
  }
  const yesPriceBps = Math.round((noPool / total) * BASIS_POINTS);
  const noPriceBps = BASIS_POINTS - yesPriceBps;
  return { yesPriceBps, noPriceBps };
}

export function bpsToUsd(bps: number): number {
  return bps / BASIS_POINTS;
}

export function calculateBuyYes(
  yesPool: number,
  noPool: number,
  moveIn: number
): TradeEstimate {
  const fee = (moveIn * FEE_BPS) / BASIS_POINTS;
  const amountAfterFee = moveIn - fee;
  
  const k = yesPool * noPool;
  const newNoPool = noPool + amountAfterFee;
  const newYesPool = k / newNoPool;
  const tokensOut = yesPool - newYesPool;
  
  const { yesPriceBps: oldPrice } = calculatePrice(yesPool, noPool);
  const { yesPriceBps: newPrice } = calculatePrice(newYesPool, newNoPool);
  const priceImpactBps = Math.abs(newPrice - oldPrice);
  
  const averagePrice = tokensOut > 0 ? amountAfterFee / tokensOut : 0;
  
  return {
    tokensOut: Math.max(0, tokensOut),
    priceImpactBps,
    fee,
    averagePrice,
  };
}

export function calculateBuyNo(
  yesPool: number,
  noPool: number,
  moveIn: number
): TradeEstimate {
  const fee = (moveIn * FEE_BPS) / BASIS_POINTS;
  const amountAfterFee = moveIn - fee;
  
  const k = yesPool * noPool;
  const newYesPool = yesPool + amountAfterFee;
  const newNoPool = k / newYesPool;
  const tokensOut = noPool - newNoPool;
  
  const { noPriceBps: oldPrice } = calculatePrice(yesPool, noPool);
  const { noPriceBps: newPrice } = calculatePrice(newYesPool, newNoPool);
  const priceImpactBps = Math.abs(newPrice - oldPrice);
  
  const averagePrice = tokensOut > 0 ? amountAfterFee / tokensOut : 0;
  
  return {
    tokensOut: Math.max(0, tokensOut),
    priceImpactBps,
    fee,
    averagePrice,
  };
}

export function calculateSellYes(
  yesPool: number,
  noPool: number,
  tokensIn: number
): TradeEstimate {
  const k = yesPool * noPool;
  const newYesPool = yesPool + tokensIn;
  const newNoPool = k / newYesPool;
  const moveOut = noPool - newNoPool;
  
  const fee = (moveOut * FEE_BPS) / BASIS_POINTS;
  const amountAfterFee = moveOut - fee;
  
  const { yesPriceBps: oldPrice } = calculatePrice(yesPool, noPool);
  const { yesPriceBps: newPrice } = calculatePrice(newYesPool, newNoPool);
  const priceImpactBps = Math.abs(newPrice - oldPrice);
  
  const averagePrice = tokensIn > 0 ? amountAfterFee / tokensIn : 0;
  
  return {
    tokensOut: Math.max(0, amountAfterFee),
    priceImpactBps,
    fee,
    averagePrice,
  };
}

export function calculateSellNo(
  yesPool: number,
  noPool: number,
  tokensIn: number
): TradeEstimate {
  const k = yesPool * noPool;
  const newNoPool = noPool + tokensIn;
  const newYesPool = k / newNoPool;
  const moveOut = yesPool - newYesPool;
  
  const fee = (moveOut * FEE_BPS) / BASIS_POINTS;
  const amountAfterFee = moveOut - fee;
  
  const { noPriceBps: oldPrice } = calculatePrice(yesPool, noPool);
  const { noPriceBps: newPrice } = calculatePrice(newYesPool, newNoPool);
  const priceImpactBps = Math.abs(newPrice - oldPrice);
  
  const averagePrice = tokensIn > 0 ? amountAfterFee / tokensIn : 0;
  
  return {
    tokensOut: Math.max(0, amountAfterFee),
    priceImpactBps,
    fee,
    averagePrice,
  };
}

export function formatTimeUntilExpiry(expiryTimestamp: number): string {
  const now = Date.now();
  const diff = expiryTimestamp - now;
  
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
