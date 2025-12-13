import { z } from "zod";

// User types
export const insertUserSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;

export interface User {
  id: string;
  username: string;
  password: string;
}

// Market types
export const insertMarketSchema = z.object({
  companyName: z.string(),
  description: z.string(),
  yesPool: z.number().optional().default(5000),
  noPool: z.number().optional().default(5000),
  totalLiquidity: z.number().optional().default(10000),
  volume24h: z.number().optional().default(0),
  resolved: z.boolean().optional().default(false),
  winningOutcome: z.boolean().optional().nullable(),
  expiryTimestamp: z.number(),
  creator: z.string(),
});

export type InsertMarket = z.infer<typeof insertMarketSchema>;

export interface Market {
  id: string;
  companyName: string;
  description: string;
  yesPool: number;
  noPool: number;
  totalLiquidity: number;
  volume24h: number;
  resolved: boolean;
  winningOutcome: boolean | null;
  expiryTimestamp: number;
  creator: string;
  createdAt: Date;
}

// Position types
export const insertPositionSchema = z.object({
  marketId: z.string(),
  userAddress: z.string(),
  yesTokens: z.number().optional().default(0),
  noTokens: z.number().optional().default(0),
  totalInvested: z.number().optional().default(0),
  averageYesPrice: z.number().optional().default(5000),
  averageNoPrice: z.number().optional().default(5000),
});

export type InsertPosition = z.infer<typeof insertPositionSchema>;

export interface Position {
  id: string;
  marketId: string;
  userAddress: string;
  yesTokens: number;
  noTokens: number;
  totalInvested: number;
  averageYesPrice: number;
  averageNoPrice: number;
  updatedAt: Date;
}

// Trade types
export const insertTradeSchema = z.object({
  marketId: z.string(),
  userAddress: z.string(),
  tradeType: z.string(),
  action: z.string(),
  moveAmount: z.number(),
  tokensAmount: z.number(),
  price: z.number(),
  txHash: z.string().optional(),
});

export type InsertTrade = z.infer<typeof insertTradeSchema>;

export interface Trade {
  id: string;
  marketId: string;
  userAddress: string;
  tradeType: string;
  action: string;
  moveAmount: number;
  tokensAmount: number;
  price: number;
  txHash?: string;
  createdAt: Date;
}
