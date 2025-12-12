import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertMarketSchema, insertTradeSchema } from "@shared/schema";
import { movementClient } from "./services/movementClient";
import { z } from "zod";

function getAdminAddress(): string | null {
  return movementClient.getAdminAddress();
}

function isAdmin(address: string): boolean {
  const adminAddress = getAdminAddress();
  if (!adminAddress) return false;
  return address.toLowerCase() === adminAddress.toLowerCase();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.get("/api/markets", async (req, res) => {
    try {
      // Try to fetch from Movement chain first
      let markets = await movementClient.getMarketsFromChain();
      
      // If no markets from chain, fall back to cached database
      if (markets.length === 0) {
        const cachedMarkets = await storage.getAllMarkets();
        markets = cachedMarkets.map(m => ({
          id: m.id,
          companyName: m.companyName,
          description: m.description,
          yesPool: BigInt(m.yesPool),
          noPool: BigInt(m.noPool),
          totalLiquidity: BigInt(m.totalLiquidity),
          volume24h: BigInt(m.volume24h || 0),
          resolved: m.resolved,
          winningOutcome: m.winningOutcome ?? undefined,
          expiryTimestamp: BigInt(m.expiryTimestamp),
          creator: m.creator,
        }));
      }
      
      res.json(markets);
    } catch (error) {
      console.error("Error fetching markets:", error);
      res.status(500).json({ error: "Failed to fetch markets" });
    }
  });

  app.get("/api/markets/:id", async (req, res) => {
    try {
      // Try to fetch from Movement chain first
      let market = await movementClient.getMarketFromChain(req.params.id);
      
      // If not found on chain, fall back to cached database
      if (!market) {
        const cachedMarket = await storage.getMarket(req.params.id);
        if (!cachedMarket) {
          return res.status(404).json({ error: "Market not found" });
        }
        market = {
          id: cachedMarket.id,
          companyName: cachedMarket.companyName,
          description: cachedMarket.description,
          yesPool: BigInt(cachedMarket.yesPool),
          noPool: BigInt(cachedMarket.noPool),
          totalLiquidity: BigInt(cachedMarket.totalLiquidity),
          volume24h: BigInt(cachedMarket.volume24h || 0),
          resolved: cachedMarket.resolved,
          winningOutcome: cachedMarket.winningOutcome ?? undefined,
          expiryTimestamp: BigInt(cachedMarket.expiryTimestamp),
          creator: cachedMarket.creator,
        };
      }
      
      res.json(market);
    } catch (error) {
      console.error("Error fetching market:", error);
      res.status(500).json({ error: "Failed to fetch market" });
    }
  });

  app.post("/api/markets", async (req, res) => {
    try {
      const { creator } = req.body;
      if (!creator || !isAdmin(creator)) {
        return res.status(403).json({ error: "Only admin can create markets" });
      }

      const parsed = insertMarketSchema.parse(req.body);

      try {
        // Submit signed transaction to Movement
        const txHash = await movementClient.submitCreateMarketTx({
          companyName: parsed.companyName,
          description: parsed.description,
          yesPool: BigInt(parsed.yesPool || 5000),
          noPool: BigInt(parsed.noPool || 5000),
          totalLiquidity: BigInt(parsed.totalLiquidity || 10000),
          expiryTimestamp: BigInt(parsed.expiryTimestamp || Date.now()),
        });

        // Cache the market in the database
        const market = await storage.createMarket(parsed);

        res.status(201).json({
          ...market,
          txHash,
        });
      } catch (blockchainError) {
        console.error("Failed to submit transaction to Movement:", blockchainError);
        res.status(500).json({
          error: "Failed to submit market creation transaction",
          details: blockchainError instanceof Error ? blockchainError.message : String(blockchainError),
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid market data", details: error.errors });
      }
      console.error("Error creating market:", error);
      res.status(500).json({ error: "Failed to create market" });
    }
  });

  app.post("/api/markets/:id/resolve", async (req, res) => {
    try {
      const { adminAddress, winningOutcome } = req.body;
      
      if (!adminAddress || !isAdmin(adminAddress)) {
        return res.status(403).json({ error: "Only admin can resolve markets" });
      }

      if (typeof winningOutcome !== "boolean") {
        return res.status(400).json({ error: "winningOutcome must be a boolean" });
      }

      try {
        // Submit signed transaction to Movement
        const txHash = await movementClient.submitResolveMarketTx(
          req.params.id,
          winningOutcome
        );

        // Update the cached market in the database
        const market = await storage.resolveMarket(req.params.id, winningOutcome);
        if (!market) {
          return res.status(404).json({ error: "Market not found" });
        }

        res.json({
          ...market,
          txHash,
        });
      } catch (blockchainError) {
        console.error("Failed to submit transaction to Movement:", blockchainError);
        res.status(500).json({
          error: "Failed to submit market resolution transaction",
          details: blockchainError instanceof Error ? blockchainError.message : String(blockchainError),
        });
      }
    } catch (error) {
      console.error("Error resolving market:", error);
      res.status(500).json({ error: "Failed to resolve market" });
    }
  });

  app.get("/api/positions/:userAddress", async (req, res) => {
    try {
      // Try to fetch positions from cache first
      const positions = await storage.getPositionsByUser(req.params.userAddress);
      res.json(positions);
    } catch (error) {
      console.error("Error fetching positions:", error);
      res.status(500).json({ error: "Failed to fetch positions" });
    }
  });

  app.get("/api/positions/:userAddress/:marketId", async (req, res) => {
    try {
      // Try to fetch from Movement chain first
      let position = await movementClient.getPositionFromChain(
        req.params.marketId,
        req.params.userAddress
      );

      // If not found on chain, fall back to cached database
      if (!position) {
        const cachedPosition = await storage.getPosition(
          req.params.marketId,
          req.params.userAddress
        );
        if (cachedPosition) {
          position = {
            marketId: cachedPosition.marketId,
            userAddress: cachedPosition.userAddress,
            yesTokens: BigInt(cachedPosition.yesTokens),
            noTokens: BigInt(cachedPosition.noTokens),
            totalInvested: BigInt(cachedPosition.totalInvested),
            averageYesPrice: cachedPosition.averageYesPrice,
            averageNoPrice: cachedPosition.averageNoPrice,
          };
        }
      }

      res.json(position || null);
    } catch (error) {
      console.error("Error fetching position:", error);
      res.status(500).json({ error: "Failed to fetch position" });
    }
  });

  app.post("/api/trades", async (req, res) => {
    try {
      const parsed = insertTradeSchema.parse(req.body);
      
      // Verify the transaction hash on Movement if provided
      if (parsed.txHash) {
        try {
          const isBuyingYes = parsed.tradeType === "YES";
          const isVerified = await movementClient.verifyBuyTransaction(
            parsed.txHash,
            parsed.marketId,
            isBuyingYes,
            BigInt(parsed.moveAmount),
            parsed.userAddress
          );

          if (!isVerified) {
            return res.status(400).json({
              error: "Transaction verification failed",
              details: "The transaction hash does not correspond to the expected buy action",
            });
          }
        } catch (verifyError) {
          console.error("Failed to verify transaction:", verifyError);
          return res.status(400).json({
            error: "Failed to verify transaction",
            details: verifyError instanceof Error ? verifyError.message : String(verifyError),
          });
        }
      }
      
      const trade = await storage.createTrade(parsed);
      
      await storage.createOrUpdatePosition({
        marketId: parsed.marketId,
        userAddress: parsed.userAddress,
        yesTokens: parsed.tradeType === "YES" ? parsed.tokensAmount : 0,
        noTokens: parsed.tradeType === "NO" ? parsed.tokensAmount : 0,
        totalInvested: parsed.moveAmount,
        averageYesPrice: parsed.tradeType === "YES" ? parsed.price : 5000,
        averageNoPrice: parsed.tradeType === "NO" ? parsed.price : 5000,
      });
      
      const market = await storage.getMarket(parsed.marketId);
      if (market) {
        await storage.updateMarket(parsed.marketId, {
          volume24h: (market.volume24h || 0) + parsed.moveAmount,
        });
      }
      
      res.status(201).json(trade);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid trade data", details: error.errors });
      }
      console.error("Error creating trade:", error);
      res.status(500).json({ error: "Failed to create trade" });
    }
  });

  app.get("/api/trades/market/:marketId", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const trades = await storage.getTradesByMarket(req.params.marketId, limit);
      res.json(trades);
    } catch (error) {
      console.error("Error fetching trades:", error);
      res.status(500).json({ error: "Failed to fetch trades" });
    }
  });

  app.get("/api/trades/user/:userAddress", async (req, res) => {
    try {
      const trades = await storage.getTradesByUser(req.params.userAddress);
      res.json(trades);
    } catch (error) {
      console.error("Error fetching trades:", error);
      res.status(500).json({ error: "Failed to fetch trades" });
    }
  });

  app.post("/api/seed", async (req, res) => {
    try {
      const { adminAddress } = req.body;
      if (!adminAddress || !isAdmin(adminAddress)) {
        return res.status(403).json({ error: "Only admin can seed data" });
      }

      const existingMarkets = await storage.getAllMarkets();
      if (existingMarkets.length > 0) {
        return res.json({ message: "Markets already exist", count: existingMarkets.length });
      }

      const now = Date.now();
      const seedMarkets = [
        {
          companyName: "SpaceX valuation reaches $200B by Q2 2025",
          description: "Will SpaceX achieve a $200 billion valuation in their next funding round before July 2025?",
          yesPool: 6500,
          noPool: 3500,
          totalLiquidity: 10000,
          volume24h: 2450,
          resolved: false,
          expiryTimestamp: now + 120 * 24 * 60 * 60 * 1000,
          creator: adminAddress,
        },
        {
          companyName: "OpenAI valued above $150B in next funding round",
          description: "Will OpenAI's next funding round value the company above $150 billion?",
          yesPool: 7200,
          noPool: 2800,
          totalLiquidity: 15000,
          volume24h: 5230,
          resolved: false,
          expiryTimestamp: now + 90 * 24 * 60 * 60 * 1000,
          creator: adminAddress,
        },
        {
          companyName: "Stripe IPO valuation exceeds $100B",
          description: "Will Stripe's IPO valuation exceed $100 billion when they go public?",
          yesPool: 4800,
          noPool: 5200,
          totalLiquidity: 8000,
          volume24h: 1890,
          resolved: false,
          expiryTimestamp: now + 180 * 24 * 60 * 60 * 1000,
          creator: adminAddress,
        },
        {
          companyName: "Databricks reaches $50B valuation",
          description: "Will Databricks achieve a $50 billion valuation before their IPO?",
          yesPool: 5500,
          noPool: 4500,
          totalLiquidity: 12000,
          volume24h: 3120,
          resolved: false,
          expiryTimestamp: now + 150 * 24 * 60 * 60 * 1000,
          creator: adminAddress,
        },
        {
          companyName: "Canva valued above $40B",
          description: "Will Canva maintain or exceed their $40 billion valuation in the next funding round?",
          yesPool: 6100,
          noPool: 3900,
          totalLiquidity: 9000,
          volume24h: 1560,
          resolved: false,
          expiryTimestamp: now + 60 * 24 * 60 * 60 * 1000,
          creator: adminAddress,
        },
        {
          companyName: "Anthropic reaches $30B valuation",
          description: "Will Anthropic achieve a $30 billion valuation in 2025?",
          yesPool: 8200,
          noPool: 1800,
          totalLiquidity: 7500,
          volume24h: 4200,
          resolved: true,
          winningOutcome: true,
          expiryTimestamp: now - 5 * 24 * 60 * 60 * 1000,
          creator: adminAddress,
        },
      ];

      const txHashes: string[] = [];

      // Submit markets to Movement blockchain
      for (const market of seedMarkets) {
        try {
          if (!market.resolved) {
            const txHash = await movementClient.submitCreateMarketTx({
              companyName: market.companyName,
              description: market.description,
              yesPool: BigInt(market.yesPool),
              noPool: BigInt(market.noPool),
              totalLiquidity: BigInt(market.totalLiquidity),
              expiryTimestamp: BigInt(market.expiryTimestamp),
            });
            txHashes.push(txHash);
          }
          // Cache the market in the database
          await storage.createMarket(market);
        } catch (error) {
          console.error(`Failed to seed market ${market.companyName}:`, error);
          // Continue seeding other markets
        }
      }

      res.json({
        message: "Seeded markets",
        count: seedMarkets.length,
        txHashes,
      });
    } catch (error) {
      console.error("Error seeding data:", error);
      res.status(500).json({ error: "Failed to seed data" });
    }
  });

  return httpServer;
}
