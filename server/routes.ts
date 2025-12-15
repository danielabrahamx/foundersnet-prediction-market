import type { Express } from "express";
import { createServer, type Server } from "http";
import { movementClient, type MovementMarket } from "./services/movementClient";
import { z } from "zod";

// Helper function to serialize BigInt values to strings for JSON response
// JSON.stringify() cannot serialize BigInt, so we convert them to strings
function serializeMarket(market: MovementMarket): Record<string, any> {
  return {
    ...market,
    yesPool: market.yesPool.toString(),
    noPool: market.noPool.toString(),
    totalLiquidity: market.totalLiquidity.toString(),
    volume24h: market.volume24h.toString(),
    expiryTimestamp: market.expiryTimestamp.toString(),
  };
}

function serializeMarkets(markets: MovementMarket[]): Record<string, any>[] {
  return markets.map(serializeMarket);
}

// MOVE token constants
// 1 MOVE = 100,000,000 octas (10^8, same as Aptos)
const MOVE_DECIMALS = 8;
const OCTAS_PER_MOVE = 100_000_000;

// Minimum bet amount: 0.1 MOVE in octas
const MIN_BET_OCTAS = 0.1 * OCTAS_PER_MOVE; // 10,000,000 octas

// Admin validation
function getAdminAddress(): string | null {
  return movementClient.getAdminAddress();
}

function isAdmin(address: string): boolean {
  const adminAddress = getAdminAddress();
  if (!adminAddress) return false;
  return address.toLowerCase() === adminAddress.toLowerCase();
}

// Request validation schemas
const createMarketSchema = z.object({
  companyName: z.string(),
  description: z.string(),
  yesPool: z.number().optional().default(5000),
  noPool: z.number().optional().default(5000),
  totalLiquidity: z.number().optional().default(10000),
  expiryTimestamp: z.number(),
  creator: z.string(),
});

const placeBetSchema = z.object({
  marketId: z.string(),
  betType: z.enum(["YES", "NO"]),
  amount: z.number().positive(),
  userAddress: z.string(),
  txHash: z.string().optional(),
});

const resolveMarketSchema = z.object({
  marketId: z.string(),
  winningOutcome: z.boolean(),
  adminAddress: z.string(),
});

const claimWinningsSchema = z.object({
  marketId: z.string(),
  userAddress: z.string(),
  txHash: z.string().optional(),
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  /**
   * GET /api/markets
   * Fetch all markets from the Movement blockchain with enhanced error handling
   */
  app.get("/api/markets", async (req, res) => {
    const startTime = Date.now();

    try {
      console.log(`[${new Date().toISOString()}] Fetching all markets from blockchain...`);

      const markets = await movementClient.getMarketsFromChain();
      const duration = Date.now() - startTime;

      console.log(`[${new Date().toISOString()}] Successfully fetched ${markets.length} markets in ${duration}ms`);

      // Return enhanced response with metadata
      // Note: serializeMarkets converts BigInt values to strings for JSON serialization
      res.json({
        data: serializeMarkets(markets),
        meta: {
          count: markets.length,
          fetchedAt: new Date().toISOString(),
          duration,
        }
      });
    } catch (error: any) {
      const duration = Date.now() - startTime;

      console.error(`[${new Date().toISOString()}] Error fetching markets (took ${duration}ms):`, error);

      // Categorize error and return appropriate status code
      if (error?.name === "MovementNetworkError") {
        return res.status(503).json({
          error: "Blockchain network unavailable",
          code: "NETWORK_ERROR",
          details: error.message,
          timestamp: new Date().toISOString(),
          // Provide empty array as fallback
          fallback: {
            data: [],
            meta: {
              count: 0,
              fetchedAt: new Date().toISOString(),
              duration,
              warning: "Returning empty array due to network error"
            }
          }
        });
      }

      if (error?.name === "MovementContractError") {
        return res.status(502).json({
          error: "Smart contract error",
          code: error.code || "CONTRACT_ERROR",
          details: error.message,
          timestamp: new Date().toISOString(),
        });
      }

      // Generic error
      res.status(500).json({
        error: "Failed to fetch markets from blockchain",
        code: "INTERNAL_ERROR",
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
    }
  });

  /**
   * GET /api/markets/count
   * Get total count of markets (helper endpoint)
   */
  app.get("/api/markets/count", async (req, res) => {
    try {
      const count = await movementClient.getMarketCount();
      res.json({ count });
    } catch (error) {
      console.error("Error fetching market count:", error);
      res.status(503).json({
        error: "Failed to fetch market count",
        code: "NETWORK_ERROR",
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
    }
  });

  /**
   * GET /api/markets/:id
   * Fetch a specific market from the Movement blockchain with enhanced error handling
   */
  app.get("/api/markets/:id", async (req, res) => {
    // ... existing implementation ...
  });

  function serializePosition(position: any): Record<string, any> {
    return {
      ...position,
      yesTokens: position.yesTokens.toString(),
      noTokens: position.noTokens.toString(),
      totalInvested: position.totalInvested.toString(),
    };
  }

  function serializePositions(positions: any[]): Record<string, any>[] {
    return positions.map(serializePosition);
  }

  /**
   * GET /api/positions
   * Fetch user positions from the Movement blockchain
   */
  app.get("/api/positions", async (req, res) => {
    const startTime = Date.now();
    const userAddress = req.query.userAddress as string;

    try {
      if (!userAddress) {
        return res.status(400).json({
          error: "Missing userAddress parameter",
          code: "VALIDATION_ERROR",
          timestamp: new Date().toISOString(),
        });
      }

      console.log(`[${new Date().toISOString()}] Fetching positions for ${userAddress}...`);

      const positions = await movementClient.getUserPositions(userAddress);
      const duration = Date.now() - startTime;

      console.log(`[${new Date().toISOString()}] Fetched ${positions.length} positions in ${duration}ms`);

      res.json({
        data: serializePositions(positions),
        meta: {
          count: positions.length,
          fetchedAt: new Date().toISOString(),
          duration,
        }
      });
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`[${new Date().toISOString()}] Error fetching positions (took ${duration}ms):`, error);

      if (error?.name === "MovementNetworkError") {
        return res.status(503).json({
          error: "Blockchain network unavailable",
          code: "NETWORK_ERROR",
          details: error.message,
          timestamp: new Date().toISOString(),
          fallback: { data: [], meta: { count: 0 } }
        });
      }

      res.status(500).json({
        error: "Failed to fetch positions",
        code: "INTERNAL_ERROR",
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
    }
  });

  /**
   * POST /api/create-market
   * Create a new market on the Movement blockchain (admin only)
   * 
   * Required fields:
   * - companyName: string (name/title of the market)
   * - description: string (detailed description)
   * - expiryTimestamp: number (Unix timestamp for resolution date)
   * - totalLiquidity: number (initial liquidity, defaults to 10000)
   * - creator: string (admin address)
   */
  app.post("/api/create-market", async (req, res) => {
    const startTime = Date.now();

    try {
      console.log(`[${new Date().toISOString()}] Creating new market...`);
      console.log(`[${new Date().toISOString()}] Request body:`, JSON.stringify(req.body, null, 2));

      // Validate request data
      const parsed = createMarketSchema.parse(req.body);

      // Verify admin authorization with detailed logging
      const serverAdminAddress = getAdminAddress();
      console.log(`[${new Date().toISOString()}] Admin check - Server admin address: ${serverAdminAddress || 'NOT SET (MOVEMENT_ADMIN_PRIVATE_KEY missing)'}`);
      console.log(`[${new Date().toISOString()}] Admin check - Request creator: ${parsed.creator}`);

      if (!serverAdminAddress) {
        // If private key is missing but we have a configured address, we can proceed with client-side signing
        // The isAdmin(parsed.creator) check will handle validation against the configured address
        console.warn(`[${new Date().toISOString()}] MOVEMENT_ADMIN_PRIVATE_KEY is not set. Relying on client-side signing.`);
      }

      if (!isAdmin(parsed.creator)) {
        console.warn(`[${new Date().toISOString()}] Unauthorized market creation attempt by: ${parsed.creator}`);
        console.warn(`[${new Date().toISOString()}] Expected admin address: ${serverAdminAddress}`);
        return res.status(403).json({
          error: "Only admin can create markets",
          code: "UNAUTHORIZED",
          details: `Address ${parsed.creator} is not authorized. Admin address is ${serverAdminAddress}`,
          timestamp: new Date().toISOString(),
        });
      }

      console.log(`[${new Date().toISOString()}] Admin verified: ${parsed.creator}`);
      console.log(`[${new Date().toISOString()}] Building unsigned transaction for create market...`);

      // Build unsigned transaction for client to sign (client-side signing)
      const unsignedTx = await movementClient.buildCreateMarketTx({
        companyName: parsed.companyName,
        description: parsed.description,
        initialLiquidity: BigInt(parsed.totalLiquidity),
        expiryTimestamp: BigInt(parsed.expiryTimestamp),
        creator: parsed.creator,
      });

      const duration = Date.now() - startTime;
      console.log(`[${new Date().toISOString()}] Unsigned transaction built successfully in ${duration}ms`);

      res.status(200).json({
        message: "Unsigned transaction created - sign with your wallet",
        unsignedTransaction: unsignedTx,
        marketData: {
          companyName: parsed.companyName,
          description: parsed.description,
          totalLiquidity: parsed.totalLiquidity,
          expiryTimestamp: parsed.expiryTimestamp,
        },
        meta: {
          submittedAt: new Date().toISOString(),
          duration,
        }
      });
    } catch (error: any) {
      const duration = Date.now() - startTime;

      // Handle validation errors
      if (error instanceof z.ZodError) {
        console.error(`[${new Date().toISOString()}] Validation error (took ${duration}ms):`, error.errors);
        return res.status(400).json({
          error: "Invalid market data",
          code: "VALIDATION_ERROR",
          details: error.errors,
          timestamp: new Date().toISOString(),
        });
      }

      // Handle Movement-specific errors
      if (error?.name === "MovementNetworkError") {
        console.error(`[${new Date().toISOString()}] Network error (took ${duration}ms):`, error.message);
        return res.status(503).json({
          error: "Blockchain network unavailable",
          code: "NETWORK_ERROR",
          details: error.message,
          timestamp: new Date().toISOString(),
        });
      }

      if (error?.name === "MovementContractError") {
        console.error(`[${new Date().toISOString()}] Contract error (took ${duration}ms):`, error.message);
        return res.status(502).json({
          error: "Smart contract error",
          code: error.code || "CONTRACT_ERROR",
          details: error.message,
          timestamp: new Date().toISOString(),
        });
      }

      // Generic error
      console.error(`[${new Date().toISOString()}] Error creating market (took ${duration}ms):`, error);
      res.status(500).json({
        error: "Failed to create market",
        code: "INTERNAL_ERROR",
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
    }
  });

  /**
   * POST /api/place-bet
   * Place a bet on a market (returns unsigned transaction for client to sign)
   */
  app.post("/api/place-bet", async (req, res) => {
    const startTime = Date.now();

    try {
      const parsed = placeBetSchema.parse(req.body);

      // Minimum bet amount validation (0.1 MOVE minimum, amount is in octas)
      if (parsed.amount < MIN_BET_OCTAS) {
        return res.status(400).json({
          error: "Bet amount too low",
          code: "MINIMUM_BET_ERROR",
          details: `Minimum bet amount is 0.1 MOVE (${MIN_BET_OCTAS} octas)`,
          timestamp: new Date().toISOString(),
        });
      }

      // If txHash is provided, verify the transaction
      if (parsed.txHash) {
        console.log(`[${new Date().toISOString()}] Verifying bet transaction: ${parsed.txHash}`);
        const isValid = await movementClient.verifyTransactionSuccess(parsed.txHash);
        if (!isValid) {
          return res.status(400).json({
            error: "Transaction verification failed",
            code: "TX_VERIFICATION_FAILED",
            details: "The transaction was not successful or not found",
            timestamp: new Date().toISOString(),
          });
        }

        const duration = Date.now() - startTime;
        return res.json({
          message: "Bet placed and verified successfully",
          txHash: parsed.txHash,
          meta: {
            verified: true,
            duration,
            timestamp: new Date().toISOString(),
          }
        });
      }

      // Fetch market to validate it exists and is tradeable
      console.log(`[${new Date().toISOString()}] Fetching market ${parsed.marketId} for bet validation...`);
      const market = await movementClient.getMarketFromChain(parsed.marketId);

      if (!market) {
        return res.status(404).json({
          error: "Market not found",
          code: "MARKET_NOT_FOUND",
          details: `No market exists with ID: ${parsed.marketId}`,
          timestamp: new Date().toISOString(),
        });
      }

      // Check if market is resolved
      if (market.resolved) {
        return res.status(400).json({
          error: "Market already resolved",
          code: "MARKET_RESOLVED",
          details: "Cannot place bets on a resolved market",
          timestamp: new Date().toISOString(),
        });
      }

      // Check if market has expired (expiryTimestamp is in seconds, Date.now() is in milliseconds)
      const nowInSeconds = Math.floor(Date.now() / 1000);
      if (Number(market.expiryTimestamp) < nowInSeconds) {
        return res.status(400).json({
          error: "Market has expired",
          code: "MARKET_EXPIRED",
          details: "Cannot place bets on an expired market",
          timestamp: new Date().toISOString(),
        });
      }

      console.log(`[${new Date().toISOString()}] Building unsigned transaction for ${parsed.betType} bet of ${parsed.amount} octas (${parsed.amount / OCTAS_PER_MOVE} MOVE)`);

      // Build unsigned transaction for client to sign
      const unsignedTx = await movementClient.submitPlaceBetTx(
        parsed.marketId,
        parsed.betType,
        BigInt(parsed.amount),
        parsed.userAddress
      );

      const duration = Date.now() - startTime;
      console.log(`[${new Date().toISOString()}] Unsigned transaction built in ${duration}ms`);

      res.json({
        message: "Unsigned transaction created - sign with your wallet",
        unsignedTransaction: unsignedTx,
        betDetails: {
          marketId: parsed.marketId,
          betType: parsed.betType,
          amount: parsed.amount,
          userAddress: parsed.userAddress,
        },
        meta: {
          duration,
          timestamp: new Date().toISOString(),
        }
      });
    } catch (error: any) {
      const duration = Date.now() - startTime;

      if (error instanceof z.ZodError) {
        console.error(`[${new Date().toISOString()}] Validation error (took ${duration}ms):`, error.errors);
        return res.status(400).json({
          error: "Invalid bet data",
          code: "VALIDATION_ERROR",
          details: error.errors,
          timestamp: new Date().toISOString(),
        });
      }

      // Handle Movement-specific errors
      if (error?.name === "MovementContractError") {
        console.warn(`[${new Date().toISOString()}] Contract error (took ${duration}ms):`, error.message);

        // Return 400 for user errors (like insufficient balance), 500 for system errors
        const statusCode = error.code === "INSUFFICIENT_BALANCE" ? 400 : 500;

        return res.status(statusCode).json({
          error: "Transaction failed",
          code: error.code || "CONTRACT_ERROR",
          details: error.message,
          timestamp: new Date().toISOString(),
        });
      }

      if (error?.name === "MovementNetworkError") {
        console.error(`[${new Date().toISOString()}] Network error (took ${duration}ms):`, error.message);
        return res.status(503).json({
          error: "Blockchain network unavailable",
          code: "NETWORK_ERROR",
          details: error.message,
          timestamp: new Date().toISOString(),
        });
      }

      console.error(`[${new Date().toISOString()}] Error placing bet (took ${duration}ms):`, error);
      res.status(500).json({
        error: "Failed to place bet",
        code: "INTERNAL_ERROR",
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
    }
  });

  /**
   * POST /api/resolve-market
   * Resolve a market with the winning outcome (admin only)
   */
  app.post("/api/resolve-market", async (req, res) => {
    try {
      const parsed = resolveMarketSchema.parse(req.body);

      // Verify admin
      if (!isAdmin(parsed.adminAddress)) {
        return res.status(403).json({ error: "Only admin can resolve markets" });
      }

      // Build unsigned transaction for client-side signing
      const unsignedTx = await movementClient.buildResolveMarketTx(
        parsed.marketId,
        parsed.winningOutcome
      );

      res.json({
        message: "Unsigned transaction created - sign with your wallet",
        unsignedTransaction: unsignedTx,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Invalid resolution data",
          details: error.errors
        });
      }
      console.error("Error resolving market:", error);
      res.status(500).json({
        error: "Failed to resolve market",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  /**
   * POST /api/claim-winnings
   * Claim winnings from a resolved market (returns unsigned transaction for client to sign)
   */
  app.post("/api/claim-winnings", async (req, res) => {
    const startTime = Date.now();

    try {
      const parsed = claimWinningsSchema.parse(req.body);

      // If txHash is provided, verify the transaction
      if (parsed.txHash) {
        console.log(`[${new Date().toISOString()}] Verifying claim transaction: ${parsed.txHash}`);
        const isValid = await movementClient.verifyTransactionSuccess(parsed.txHash);
        if (!isValid) {
          return res.status(400).json({
            error: "Transaction verification failed",
            code: "TX_VERIFICATION_FAILED",
            details: "The transaction was not successful or not found",
            timestamp: new Date().toISOString(),
          });
        }

        const duration = Date.now() - startTime;
        return res.json({
          message: "Winnings claimed and verified successfully",
          txHash: parsed.txHash,
          meta: {
            verified: true,
            duration,
            timestamp: new Date().toISOString(),
          }
        });
      }

      // Fetch market to validate it's resolved
      console.log(`[${new Date().toISOString()}] Fetching market ${parsed.marketId} for claim validation...`);
      const market = await movementClient.getMarketFromChain(parsed.marketId);

      if (!market) {
        return res.status(404).json({
          error: "Market not found",
          code: "MARKET_NOT_FOUND",
          details: `No market exists with ID: ${parsed.marketId}`,
          timestamp: new Date().toISOString(),
        });
      }

      // Check if market is resolved
      if (!market.resolved) {
        return res.status(400).json({
          error: "Market not resolved",
          code: "MARKET_NOT_RESOLVED",
          details: "Cannot claim winnings from an unresolved market",
          timestamp: new Date().toISOString(),
        });
      }

      // Check user's position (optional - the smart contract will reject if no position)
      const position = await movementClient.getPositionFromChain(parsed.marketId, parsed.userAddress);
      if (!position) {
        return res.status(400).json({
          error: "No position found",
          code: "NO_POSITION",
          details: "You don't have any position in this market",
          timestamp: new Date().toISOString(),
        });
      }

      // Check if user has winning tokens
      const winningTokens = market.winningOutcome ? position.yesTokens : position.noTokens;
      if (winningTokens === BigInt(0)) {
        return res.status(400).json({
          error: "No winnings to claim",
          code: "NO_WINNINGS",
          details: `You have ${market.winningOutcome ? 'NO' : 'YES'} tokens but the market resolved to ${market.winningOutcome ? 'YES' : 'NO'}`,
          timestamp: new Date().toISOString(),
        });
      }

      console.log(`[${new Date().toISOString()}] Building unsigned claim transaction for ${winningTokens} winning tokens`);

      // Build unsigned transaction for client to sign
      const unsignedTx = await movementClient.submitClaimWinningsTx(
        parsed.marketId,
        parsed.userAddress
      );

      const duration = Date.now() - startTime;
      console.log(`[${new Date().toISOString()}] Unsigned claim transaction built in ${duration}ms`);

      res.json({
        message: "Unsigned transaction created - sign with your wallet to claim",
        unsignedTransaction: unsignedTx,
        claimDetails: {
          marketId: parsed.marketId,
          userAddress: parsed.userAddress,
          winningOutcome: market.winningOutcome,
          estimatedWinnings: winningTokens.toString(),
        },
        meta: {
          duration,
          timestamp: new Date().toISOString(),
        }
      });
    } catch (error) {
      const duration = Date.now() - startTime;

      if (error instanceof z.ZodError) {
        console.error(`[${new Date().toISOString()}] Validation error (took ${duration}ms):`, error.errors);
        return res.status(400).json({
          error: "Invalid claim data",
          code: "VALIDATION_ERROR",
          details: error.errors,
          timestamp: new Date().toISOString(),
        });
      }

      console.error(`[${new Date().toISOString()}] Error claiming winnings (took ${duration}ms):`, error);
      res.status(500).json({
        error: "Failed to claim winnings",
        code: "INTERNAL_ERROR",
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
    }
  });

  /**
   * GET /api/health
   * Check the health status of the blockchain connection
   */
  app.get("/api/health", async (req, res) => {
    try {
      const health = await movementClient.checkHealth();

      // Return appropriate status code based on health
      const statusCode = health.status === "healthy" ? 200 :
        health.status === "degraded" ? 200 : 503;

      res.status(statusCode).json(health);
    } catch (error) {
      console.error("Error checking health:", error);
      res.status(503).json({
        status: "unhealthy",
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
    }
  });

  return httpServer;
}
