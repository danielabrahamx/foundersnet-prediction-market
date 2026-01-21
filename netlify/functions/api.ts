import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import serverless from "serverless-http";
import { movementClient, type MovementMarket } from "../../server/services/movementClient";
import { z } from "zod";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ============================================================================
// Helper Functions
// ============================================================================

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

// MOVE token constants
const OCTAS_PER_MOVE = 100_000_000;
const MIN_BET_OCTAS = 0.1 * OCTAS_PER_MOVE;

// Admin validation
function getAdminAddress(): string | null {
    return movementClient.getAdminAddress();
}

function isAdmin(address: string): boolean {
    const adminAddress = getAdminAddress();
    if (!adminAddress) return false;
    return address.toLowerCase() === adminAddress.toLowerCase();
}

// ============================================================================
// Request Validation Schemas
// ============================================================================

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

// ============================================================================
// API Routes
// ============================================================================

// GET /api/markets
app.get("/api/markets", async (req, res) => {
    const startTime = Date.now();
    try {
        const markets = await movementClient.getMarketsFromChain();
        const duration = Date.now() - startTime;
        res.json({
            data: serializeMarkets(markets),
            meta: {
                count: markets.length,
                fetchedAt: new Date().toISOString(),
                duration,
            }
        });
    } catch (error: any) {
        console.error("Error fetching markets:", error);
        res.status(500).json({
            error: "Failed to fetch markets",
            details: error instanceof Error ? error.message : String(error),
        });
    }
});

// GET /api/markets/count
app.get("/api/markets/count", async (req, res) => {
    try {
        const count = await movementClient.getMarketCount();
        res.json({ count });
    } catch (error) {
        res.status(503).json({ error: "Failed to fetch market count" });
    }
});

// GET /api/positions
app.get("/api/positions", async (req, res) => {
    const userAddress = req.query.userAddress as string;
    if (!userAddress) {
        return res.status(400).json({ error: "Missing userAddress parameter" });
    }

    try {
        const positions = await movementClient.getUserPositions(userAddress);
        res.json({
            data: serializePositions(positions),
            meta: { count: positions.length }
        });
    } catch (error: any) {
        console.error("Error fetching positions:", error);
        res.status(500).json({ error: "Failed to fetch positions" });
    }
});

// POST /api/create-market
app.post("/api/create-market", async (req, res) => {
    try {
        const parsed = createMarketSchema.parse(req.body);

        if (!isAdmin(parsed.creator)) {
            return res.status(403).json({
                error: "Only admin can create markets",
                details: `Address ${parsed.creator} is not authorized`,
            });
        }

        const unsignedTx = await movementClient.buildCreateMarketTx({
            companyName: parsed.companyName,
            description: parsed.description,
            initialLiquidity: BigInt(parsed.totalLiquidity),
            expiryTimestamp: BigInt(parsed.expiryTimestamp),
            creator: parsed.creator,
        });

        res.status(200).json({
            message: "Unsigned transaction created - sign with your wallet",
            unsignedTransaction: unsignedTx,
            marketData: {
                companyName: parsed.companyName,
                description: parsed.description,
                totalLiquidity: parsed.totalLiquidity,
                expiryTimestamp: parsed.expiryTimestamp,
            },
        });
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: "Invalid market data", details: error.errors });
        }
        console.error("Error creating market:", error);
        res.status(500).json({
            error: "Failed to create market",
            details: error instanceof Error ? error.message : String(error),
        });
    }
});

// POST /api/place-bet
app.post("/api/place-bet", async (req, res) => {
    try {
        const parsed = placeBetSchema.parse(req.body);

        if (parsed.amount < MIN_BET_OCTAS) {
            return res.status(400).json({
                error: "Bet amount too low",
                details: `Minimum bet is 0.1 MOVE (${MIN_BET_OCTAS} octas)`,
            });
        }

        if (parsed.txHash) {
            const isValid = await movementClient.verifyTransactionSuccess(parsed.txHash);
            if (!isValid) {
                return res.status(400).json({ error: "Transaction verification failed" });
            }
            return res.json({ message: "Bet placed and verified", txHash: parsed.txHash });
        }

        const market = await movementClient.getMarketFromChain(parsed.marketId);
        if (!market) {
            return res.status(404).json({ error: "Market not found" });
        }
        if (market.resolved) {
            return res.status(400).json({ error: "Market already resolved" });
        }

        const unsignedTx = await movementClient.submitPlaceBetTx(
            parsed.marketId,
            parsed.betType,
            BigInt(parsed.amount),
            parsed.userAddress
        );

        res.json({
            message: "Unsigned transaction created - sign with your wallet",
            unsignedTransaction: unsignedTx,
        });
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: "Invalid bet data", details: error.errors });
        }
        console.error("Error placing bet:", error);
        res.status(500).json({
            error: "Failed to place bet",
            details: error instanceof Error ? error.message : String(error),
        });
    }
});

// POST /api/resolve-market
app.post("/api/resolve-market", async (req, res) => {
    try {
        const parsed = resolveMarketSchema.parse(req.body);

        if (!isAdmin(parsed.adminAddress)) {
            return res.status(403).json({ error: "Only admin can resolve markets" });
        }

        const unsignedTx = await movementClient.buildResolveMarketTx(
            parsed.marketId,
            parsed.winningOutcome
        );

        res.json({
            message: "Unsigned transaction created - sign with your wallet",
            unsignedTransaction: unsignedTx,
        });
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: "Invalid resolution data", details: error.errors });
        }
        console.error("Error resolving market:", error);
        res.status(500).json({ error: "Failed to resolve market" });
    }
});

// POST /api/claim-winnings
app.post("/api/claim-winnings", async (req, res) => {
    try {
        const parsed = claimWinningsSchema.parse(req.body);

        if (parsed.txHash) {
            const isValid = await movementClient.verifyTransactionSuccess(parsed.txHash);
            if (!isValid) {
                return res.status(400).json({ error: "Transaction verification failed" });
            }
            return res.json({ message: "Winnings claimed and verified", txHash: parsed.txHash });
        }

        const market = await movementClient.getMarketFromChain(parsed.marketId);
        if (!market) {
            return res.status(404).json({ error: "Market not found" });
        }
        if (!market.resolved) {
            return res.status(400).json({ error: "Market not resolved" });
        }

        const unsignedTx = await movementClient.submitClaimWinningsTx(
            parsed.marketId,
            parsed.userAddress
        );

        res.json({
            message: "Unsigned transaction created - sign with your wallet",
            unsignedTransaction: unsignedTx,
        });
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: "Invalid claim data", details: error.errors });
        }
        console.error("Error claiming winnings:", error);
        res.status(500).json({ error: "Failed to claim winnings" });
    }
});

// GET /api/health
app.get("/api/health", async (req, res) => {
    try {
        const health = await movementClient.checkHealth();
        res.json(health);
    } catch (error) {
        res.status(503).json({ status: "unhealthy", error: String(error) });
    }
});

// Error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
});

// Export the serverless handler
export const handler = serverless(app);
