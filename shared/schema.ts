import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, bigint, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const markets = pgTable("markets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyName: text("company_name").notNull(),
  description: text("description").notNull(),
  yesPool: bigint("yes_pool", { mode: "number" }).notNull().default(5000),
  noPool: bigint("no_pool", { mode: "number" }).notNull().default(5000),
  totalLiquidity: bigint("total_liquidity", { mode: "number" }).notNull().default(10000),
  volume24h: bigint("volume_24h", { mode: "number" }).notNull().default(0),
  resolved: boolean("resolved").notNull().default(false),
  winningOutcome: boolean("winning_outcome").default(false),
  expiryTimestamp: bigint("expiry_timestamp", { mode: "number" }).notNull(),
  creator: text("creator").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMarketSchema = createInsertSchema(markets).omit({
  id: true,
  createdAt: true,
});

export type InsertMarket = z.infer<typeof insertMarketSchema>;
export type Market = typeof markets.$inferSelect;

export const positions = pgTable("positions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  marketId: varchar("market_id").notNull().references(() => markets.id),
  userAddress: text("user_address").notNull(),
  yesTokens: bigint("yes_tokens", { mode: "number" }).notNull().default(0),
  noTokens: bigint("no_tokens", { mode: "number" }).notNull().default(0),
  totalInvested: bigint("total_invested", { mode: "number" }).notNull().default(0),
  averageYesPrice: integer("average_yes_price").notNull().default(5000),
  averageNoPrice: integer("average_no_price").notNull().default(5000),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPositionSchema = createInsertSchema(positions).omit({
  id: true,
  updatedAt: true,
});

export type InsertPosition = z.infer<typeof insertPositionSchema>;
export type Position = typeof positions.$inferSelect;

export const trades = pgTable("trades", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  marketId: varchar("market_id").notNull().references(() => markets.id),
  userAddress: text("user_address").notNull(),
  tradeType: text("trade_type").notNull(),
  action: text("action").notNull(),
  moveAmount: bigint("move_amount", { mode: "number" }).notNull(),
  tokensAmount: bigint("tokens_amount", { mode: "number" }).notNull(),
  price: integer("price").notNull(),
  txHash: text("tx_hash"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTradeSchema = createInsertSchema(trades).omit({
  id: true,
  createdAt: true,
});

export type InsertTrade = z.infer<typeof insertTradeSchema>;
export type Trade = typeof trades.$inferSelect;
