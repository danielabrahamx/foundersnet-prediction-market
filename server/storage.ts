import { 
  type User, type InsertUser,
  type Market, type InsertMarket,
  type Position, type InsertPosition,
  type Trade, type InsertTrade,
  users, markets, positions, trades
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getAllMarkets(): Promise<Market[]>;
  getMarket(id: string): Promise<Market | undefined>;
  createMarket(market: InsertMarket): Promise<Market>;
  updateMarket(id: string, updates: Partial<Market>): Promise<Market | undefined>;
  resolveMarket(id: string, winningOutcome: boolean): Promise<Market | undefined>;
  
  getPositionsByUser(userAddress: string): Promise<Position[]>;
  getPosition(marketId: string, userAddress: string): Promise<Position | undefined>;
  createOrUpdatePosition(position: InsertPosition): Promise<Position>;
  
  getTradesByMarket(marketId: string, limit?: number): Promise<Trade[]>;
  getTradesByUser(userAddress: string): Promise<Trade[]>;
  createTrade(trade: InsertTrade): Promise<Trade>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getAllMarkets(): Promise<Market[]> {
    return db.select().from(markets).orderBy(desc(markets.createdAt));
  }

  async getMarket(id: string): Promise<Market | undefined> {
    const [market] = await db.select().from(markets).where(eq(markets.id, id));
    return market;
  }

  async createMarket(market: InsertMarket): Promise<Market> {
    const [created] = await db.insert(markets).values(market).returning();
    return created;
  }

  async updateMarket(id: string, updates: Partial<Market>): Promise<Market | undefined> {
    const [updated] = await db
      .update(markets)
      .set(updates)
      .where(eq(markets.id, id))
      .returning();
    return updated;
  }

  async resolveMarket(id: string, winningOutcome: boolean): Promise<Market | undefined> {
    const [updated] = await db
      .update(markets)
      .set({ resolved: true, winningOutcome })
      .where(eq(markets.id, id))
      .returning();
    return updated;
  }

  async getPositionsByUser(userAddress: string): Promise<Position[]> {
    return db
      .select()
      .from(positions)
      .where(eq(positions.userAddress, userAddress.toLowerCase()));
  }

  async getPosition(marketId: string, userAddress: string): Promise<Position | undefined> {
    const [position] = await db
      .select()
      .from(positions)
      .where(
        and(
          eq(positions.marketId, marketId),
          eq(positions.userAddress, userAddress.toLowerCase())
        )
      );
    return position;
  }

  async createOrUpdatePosition(positionData: InsertPosition): Promise<Position> {
    const existing = await this.getPosition(positionData.marketId, positionData.userAddress);
    
    if (existing) {
      const [updated] = await db
        .update(positions)
        .set({
          yesTokens: (existing.yesTokens || 0) + (positionData.yesTokens || 0),
          noTokens: (existing.noTokens || 0) + (positionData.noTokens || 0),
          totalInvested: (existing.totalInvested || 0) + (positionData.totalInvested || 0),
          updatedAt: new Date(),
        })
        .where(eq(positions.id, existing.id))
        .returning();
      return updated;
    }
    
    const [created] = await db
      .insert(positions)
      .values({
        ...positionData,
        userAddress: positionData.userAddress.toLowerCase(),
      })
      .returning();
    return created;
  }

  async getTradesByMarket(marketId: string, limit = 20): Promise<Trade[]> {
    return db
      .select()
      .from(trades)
      .where(eq(trades.marketId, marketId))
      .orderBy(desc(trades.createdAt))
      .limit(limit);
  }

  async getTradesByUser(userAddress: string): Promise<Trade[]> {
    return db
      .select()
      .from(trades)
      .where(eq(trades.userAddress, userAddress.toLowerCase()))
      .orderBy(desc(trades.createdAt));
  }

  async createTrade(trade: InsertTrade): Promise<Trade> {
    const [created] = await db
      .insert(trades)
      .values({
        ...trade,
        userAddress: trade.userAddress.toLowerCase(),
      })
      .returning();
    return created;
  }
}

export const storage = new DatabaseStorage();
