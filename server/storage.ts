import {
  type User, type InsertUser,
  type Market, type InsertMarket,
  type Position, type InsertPosition,
  type Trade, type InsertTrade,
} from "@shared/schema";
import { randomUUID } from "crypto";

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

/**
 * In-Memory Storage Implementation
 * 
 * WARNING: All data stored here will be lost when the server restarts.
 * This is intentional for the simplified Movement blockchain architecture.
 * The source of truth is the blockchain - this is just a cache/convenience layer.
 */
export class InMemoryStorage implements IStorage {
  private users = new Map<string, User>();
  private usersByUsername = new Map<string, User>();
  private markets = new Map<string, Market>();
  private positions = new Map<string, Position>();
  private trades = new Map<string, Trade>();

  constructor() {
    console.log("⚠️  Using in-memory storage - data will not persist across restarts");
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.usersByUsername.get(username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user: User = {
      id: randomUUID(),
      ...insertUser,
    };
    this.users.set(user.id, user);
    this.usersByUsername.set(user.username, user);
    return user;
  }

  async getAllMarkets(): Promise<Market[]> {
    return Array.from(this.markets.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  async getMarket(id: string): Promise<Market | undefined> {
    return this.markets.get(id);
  }

  async createMarket(market: InsertMarket): Promise<Market> {
    const created: Market = {
      id: randomUUID(),
      ...market,
      yesPool: market.yesPool ?? 5000,
      noPool: market.noPool ?? 5000,
      totalLiquidity: market.totalLiquidity ?? 10000,
      volume24h: market.volume24h ?? 0,
      resolved: market.resolved ?? false,
      winningOutcome: market.winningOutcome ?? null,
      createdAt: new Date(),
    };
    this.markets.set(created.id, created);
    return created;
  }

  async updateMarket(id: string, updates: Partial<Market>): Promise<Market | undefined> {
    const market = this.markets.get(id);
    if (!market) return undefined;

    const updated = { ...market, ...updates };
    this.markets.set(id, updated);
    return updated;
  }

  async resolveMarket(id: string, winningOutcome: boolean): Promise<Market | undefined> {
    const market = this.markets.get(id);
    if (!market) return undefined;

    const updated = { ...market, resolved: true, winningOutcome };
    this.markets.set(id, updated);
    return updated;
  }

  async getPositionsByUser(userAddress: string): Promise<Position[]> {
    return Array.from(this.positions.values()).filter(
      p => p.userAddress.toLowerCase() === userAddress.toLowerCase()
    );
  }

  async getPosition(marketId: string, userAddress: string): Promise<Position | undefined> {
    return Array.from(this.positions.values()).find(
      p => p.marketId === marketId &&
        p.userAddress.toLowerCase() === userAddress.toLowerCase()
    );
  }

  async createOrUpdatePosition(positionData: InsertPosition): Promise<Position> {
    const existing = await this.getPosition(positionData.marketId, positionData.userAddress);

    if (existing) {
      const updated: Position = {
        ...existing,
        yesTokens: (existing.yesTokens || 0) + (positionData.yesTokens || 0),
        noTokens: (existing.noTokens || 0) + (positionData.noTokens || 0),
        totalInvested: (existing.totalInvested || 0) + (positionData.totalInvested || 0),
        updatedAt: new Date(),
      };
      this.positions.set(existing.id, updated);
      return updated;
    }

    const created: Position = {
      id: randomUUID(),
      ...positionData,
      yesTokens: positionData.yesTokens ?? 0,
      noTokens: positionData.noTokens ?? 0,
      totalInvested: positionData.totalInvested ?? 0,
      averageYesPrice: positionData.averageYesPrice ?? 5000,
      averageNoPrice: positionData.averageNoPrice ?? 5000,
      userAddress: positionData.userAddress.toLowerCase(),
      updatedAt: new Date(),
    };
    this.positions.set(created.id, created);
    return created;
  }

  async getTradesByMarket(marketId: string, limit = 20): Promise<Trade[]> {
    return Array.from(this.trades.values())
      .filter(t => t.marketId === marketId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async getTradesByUser(userAddress: string): Promise<Trade[]> {
    return Array.from(this.trades.values())
      .filter(t => t.userAddress.toLowerCase() === userAddress.toLowerCase())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createTrade(trade: InsertTrade): Promise<Trade> {
    const created: Trade = {
      id: randomUUID(),
      ...trade,
      userAddress: trade.userAddress.toLowerCase(),
      createdAt: new Date(),
    };
    this.trades.set(created.id, created);
    return created;
  }
}

export const storage = new InMemoryStorage();
