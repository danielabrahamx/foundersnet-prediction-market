import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { MarketDisplay, UserPositionDisplay, PriceHistory } from "@/types/market";
import { formatTimeUntilExpiry } from "@/services/amm";
import { useWallet } from "@/contexts/WalletContext";
import { apiRequest } from "@/lib/queryClient";
import type { Market, Position } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { moveToOctas, octasToMove } from "@/config/contracts";


function marketToDisplay(m: Market): MarketDisplay {
  // The API returns BigInt values as strings (to avoid JSON serialization issues)
  // We need to parse them back to numbers and convert from octas to MOVE
  const yesPoolOctas = typeof m.yesPool === 'string' ? parseFloat(m.yesPool) : (Number(m.yesPool) || 0);
  const noPoolOctas = typeof m.noPool === 'string' ? parseFloat(m.noPool) : (Number(m.noPool) || 0);
  const totalLiquidityOctas = typeof m.totalLiquidity === 'string' ? parseFloat(m.totalLiquidity) : (Number(m.totalLiquidity) || 0);

  // Convert to MOVE
  const yesPool = octasToMove(yesPoolOctas || 5000000000); // Default 50 MOVE if missing
  const noPool = octasToMove(noPoolOctas || 5000000000); // Default 50 MOVE if missing
  const totalLiquidity = octasToMove(totalLiquidityOctas || 10000000000); // Default 100 MOVE if missing

  const volume24hOctas = typeof m.volume24h === 'string' ? parseFloat(m.volume24h) : (Number(m.volume24h) || 0);
  const volume24h = octasToMove(volume24hOctas);

  const expiryTimestamp = typeof m.expiryTimestamp === 'string' ? parseInt(m.expiryTimestamp, 10) : m.expiryTimestamp;

  // PARIMUTUEL MODEL: Prices are always 50/50 - they don't change based on pool sizes
  // The odds are determined at resolution time based on pool proportions
  const yesPriceBps = 5000; // Always 50%
  const noPriceBps = 5000; // Always 50%

  return {
    id: m.id,
    companyName: m.companyName,
    description: m.description,
    yesPriceBps,
    noPriceBps,
    yesPriceUsd: 0.50, // Always $0.50
    noPriceUsd: 0.50, // Always $0.50
    totalLiquidity,
    yesPool,
    noPool,
    volume24h,
    resolved: m.resolved || false,
    winningOutcome: m.winningOutcome || false,
    expiryTimestamp,
    timeUntilExpiry: m.resolved ? "Resolved" : formatTimeUntilExpiry(expiryTimestamp),
  };
}

function positionToDisplay(p: Position, market: MarketDisplay | undefined): UserPositionDisplay {
  // Parse strings to numbers and convert octas to MOVE
  const yesTokensOctas = typeof p.yesTokens === 'string' ? parseFloat(p.yesTokens) : (Number(p.yesTokens) || 0);
  const noTokensOctas = typeof p.noTokens === 'string' ? parseFloat(p.noTokens) : (Number(p.noTokens) || 0);
  const totalInvestedOctas = typeof p.totalInvested === 'string' ? parseFloat(p.totalInvested) : (Number(p.totalInvested) || 0);

  const yesTokens = octasToMove(yesTokensOctas);
  const noTokens = octasToMove(noTokensOctas);
  const totalInvested = octasToMove(totalInvestedOctas);

  // PARIMUTUEL P/L CALCULATION:
  // - For active markets: Show POTENTIAL profit if you win
  // - For resolved markets: Show ACTUAL profit/loss based on outcome

  // IMPORTANT: After claiming winnings, tokens are set to 0 but totalInvested remains.
  // We need to track the ORIGINAL bet side to determine win/loss status.
  // If both tokens are 0 but totalInvested > 0, the user has already claimed.

  // Get pool sizes from market (with defaults)
  const yesPool = (market as any)?.yesPool || 0;
  const noPool = (market as any)?.noPool || 0;
  const totalPool = yesPool + noPool;

  let potentialPnl = 0;
  let potentialPnlPercent = 0;
  let realizedPnl = 0;
  let realizedPnlPercent = 0;

  // Determine what side the user bet on (even after claiming when tokens are 0)
  // We check if there are tokens, and if not but invested > 0, we need to infer
  const hasYesBet = yesTokens > 0;
  const hasNoBet = noTokens > 0;
  const hasClaimed = !hasYesBet && !hasNoBet && totalInvested > 0 && market?.resolved;

  // Determine if user WON based on market outcome:
  // - If they still have winning tokens, they won and can claim
  // - If they have already claimed (tokens=0, invested>0, resolved), they WON (you can only claim if you won)
  // - If they have losing tokens (tokens>0 on wrong side), they lost
  // - If tokens=0, invested>0, resolved, and it's NOT a claim, check the outcome

  // For unclaimed positions, check current tokens vs winning outcome
  const hasWinningPosition = market?.resolved
    ? hasClaimed
      ? true  // If claimed, they must have won (you can only claim if you won)
      : (market.winningOutcome ? hasYesBet : hasNoBet)
    : false;

  const userWinningTokens = market?.winningOutcome ? yesTokens : noTokens;
  const winningPool = market ? (market.winningOutcome ? yesPool : noPool) : 0;

  if (market?.resolved) {
    // Market is resolved - calculate actual P/L
    if (hasClaimed) {
      // User already claimed - they WON. Calculate based on pools and investment.
      // Since we don't have their original token count after claiming,
      // estimate using the proportion they invested relative to the winning pool
      if (winningPool > 0 && totalPool > 0) {
        // In parimutuel, if you invested X in the winning side:
        // Payout = (totalPool / winningPool) * X
        // Since we don't know exact tokens anymore, use totalInvested as approximation
        const estimatedPayout = (totalPool / winningPool) * totalInvested;
        realizedPnl = estimatedPayout - totalInvested;
      } else {
        // Fallback: assume break-even if pool data is missing
        realizedPnl = 0;
      }
    } else if (hasWinningPosition && winningPool > 0 && totalPool > 0) {
      // Has winning tokens, can still claim
      const payout = (totalPool / winningPool) * userWinningTokens;
      realizedPnl = payout - totalInvested;
    } else {
      // Lost the bet - lost everything invested
      realizedPnl = -totalInvested;
    }
    realizedPnlPercent = totalInvested > 0 ? (realizedPnl / totalInvested) * 100 : 0;
  } else {
    // Market active - calculate potential profit if you win
    if (yesTokens > 0 && yesPool > 0 && totalPool > 0) {
      // Potential payout if YES wins
      const potentialPayout = (totalPool / yesPool) * yesTokens;
      potentialPnl = potentialPayout - totalInvested;
    } else if (noTokens > 0 && noPool > 0 && totalPool > 0) {
      // Potential payout if NO wins
      const potentialPayout = (totalPool / noPool) * noTokens;
      potentialPnl = potentialPayout - totalInvested;
    }
    potentialPnlPercent = totalInvested > 0 ? (potentialPnl / totalInvested) * 100 : 0;
  }

  // Can only claim if resolved AND has winning tokens (not yet claimed)
  const canClaim = market?.resolved
    ? (market.winningOutcome ? hasYesBet : hasNoBet)
    : false;

  const winningTokens = market?.winningOutcome ? yesTokens : noTokens;

  // For claimable amount, calculate actual payout
  let claimableAmount = 0;
  if (canClaim && market && winningPool > 0 && totalPool > 0) {
    claimableAmount = (totalPool / winningPool) * winningTokens;
  }

  // Display value: for active markets show bet amount, for resolved show payout
  const currentValue = market?.resolved
    ? (canClaim ? claimableAmount : (hasClaimed ? totalInvested + realizedPnl : 0))
    : totalInvested;

  return {
    marketId: p.marketId,
    companyName: market?.companyName || "Unknown Market",
    yesTokens,
    noTokens,
    totalInvested,
    currentValue,
    // Use realized for resolved, potential for active
    unrealizedPnl: market?.resolved ? realizedPnl : potentialPnl,
    unrealizedPnlPercent: market?.resolved ? realizedPnlPercent : potentialPnlPercent,
    resolved: market?.resolved || false,
    claimable: canClaim,  // Only claimable if they haven't claimed yet
    claimableAmount,
    potentialPnl, // Add potential P/L for display
    potentialPnlPercent,
    // New fields for better status tracking
    isWinner: hasWinningPosition,
    hasClaimed,
  };
}

function generatePriceHistory(baseYesPrice: number): PriceHistory[] {
  const history: PriceHistory[] = [];
  const now = Date.now();
  let currentPrice = baseYesPrice - 1000 + Math.random() * 500;

  for (let i = 168; i >= 0; i--) {
    const change = (Math.random() - 0.48) * 200;
    currentPrice = Math.max(1000, Math.min(9000, currentPrice + change));

    history.push({
      timestamp: now - i * 60 * 60 * 1000,
      yesPriceBps: Math.round(currentPrice),
      noPriceBps: 10000 - Math.round(currentPrice),
    });
  }

  history[history.length - 1].yesPriceBps = baseYesPrice;
  history[history.length - 1].noPriceBps = 10000 - baseYesPrice;

  return history;
}

interface MarketContextType {
  markets: MarketDisplay[];
  positions: UserPositionDisplay[];
  loading: boolean;
  getMarket: (id: string) => MarketDisplay | undefined;
  getPosition: (marketId: string) => UserPositionDisplay | undefined;
  getPriceHistory: (marketId: string) => PriceHistory[];
  refreshMarkets: () => Promise<void>;
  executeTrade: (marketId: string, type: "YES" | "NO", amount: number) => Promise<void>;
  claimWinnings: (marketId: string) => Promise<void>;
  createMarket: (name: string, description: string, liquidity: number, expiry: Date) => Promise<void>;
  resolveMarket: (marketId: string, outcome: boolean) => Promise<void>;
  seedMarkets: () => Promise<void>;
}

const MarketContext = createContext<MarketContextType | null>(null);

export function useMarkets() {
  const context = useContext(MarketContext);
  if (!context) {
    throw new Error("useMarkets must be used within MarketProvider");
  }
  return context;
}

interface MarketProviderProps {
  children: ReactNode;
}

export function MarketProvider({ children }: MarketProviderProps) {
  const { address, signAndSubmitTransaction, connected } = useWallet();
  const queryClient = useQueryClient();
  const [priceHistories] = useState<Map<string, PriceHistory[]>>(new Map());
  const { toast } = useToast();

  // Fetch markets with enhanced response parsing
  const { data: rawMarkets = [], isLoading: marketsLoading, refetch: refetchMarkets } = useQuery<Market[]>({
    queryKey: ["/api/markets"],
    queryFn: async () => {
      const res = await fetch("/api/markets", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch markets");
      const json = await res.json();
      // API returns { data: Market[], meta: {...} }
      return json.data || json;
    },
  });

  const { data: rawPositions = [], isLoading: positionsLoading } = useQuery<Position[]>({
    queryKey: ["/api/positions", address],
    queryFn: async () => {
      if (!address) return [];
      const res = await fetch(`/api/positions?userAddress=${address}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch positions");
      const json = await res.json();
      return json.data || json;
    },
    enabled: !!address,
  });

  const markets = rawMarkets.map(marketToDisplay);
  const positions = rawPositions.map(p => {
    const market = markets.find(m => m.id === p.marketId);
    return positionToDisplay(p, market);
  });

  const loading = marketsLoading || positionsLoading;

  useEffect(() => {
    markets.forEach(m => {
      if (!priceHistories.has(m.id)) {
        priceHistories.set(m.id, generatePriceHistory(m.yesPriceBps));
      }
    });
  }, [markets, priceHistories]);

  const getMarket = useCallback((id: string) => {
    return markets.find(m => m.id === id);
  }, [markets]);

  const getPosition = useCallback((marketId: string) => {
    return positions.find(p => p.marketId === marketId);
  }, [positions]);

  const getPriceHistory = useCallback((marketId: string) => {
    const market = markets.find(m => m.id === marketId);
    if (!priceHistories.has(marketId) && market) {
      priceHistories.set(marketId, generatePriceHistory(market.yesPriceBps));
    }
    return priceHistories.get(marketId) || [];
  }, [markets, priceHistories]);

  const refreshMarkets = useCallback(async () => {
    await refetchMarkets();
  }, [refetchMarkets]);

  const tradeMutation = useMutation({
    mutationFn: async (trade: { marketId: string; type: "YES" | "NO"; amount: number }) => {
      if (!connected || !address) {
        throw new Error("Wallet not connected");
      }

      // Convert amount from MOVE to octas (smallest unit)
      const amountInOctas = moveToOctas(trade.amount);

      // Step 1: Request unsigned transaction from backend
      const response = await apiRequest("POST", "/api/place-bet", {
        marketId: trade.marketId,
        betType: trade.type,
        amount: amountInOctas,
        userAddress: address,
      });

      const result = await response.json();

      if (!result.unsignedTransaction) {
        throw new Error(result.error || "Failed to create transaction");
      }

      // Step 2: Parse unsigned transaction and sign with wallet
      const unsignedTx = JSON.parse(result.unsignedTransaction);

      toast({
        title: "Signing transaction...",
        description: "Please approve the transaction in your wallet",
      });

      // Step 3: Sign and submit with wallet adapter
      const txResponse = await signAndSubmitTransaction({
        data: unsignedTx.rawTransaction || unsignedTx,
      });

      // Step 4: Report txHash back to backend for verification
      await apiRequest("POST", "/api/place-bet", {
        marketId: trade.marketId,
        betType: trade.type,
        amount: amountInOctas,
        userAddress: address,
        txHash: txResponse.hash,
      });

      return txResponse.hash;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/positions", address] });
      queryClient.invalidateQueries({ queryKey: ["/api/markets"] });
    },
  });

  const executeTrade = useCallback(async (marketId: string, type: "YES" | "NO", amount: number) => {
    await tradeMutation.mutateAsync({ marketId, type, amount });
  }, [tradeMutation]);

  const claimWinnings = useCallback(async (marketId: string) => {
    if (!connected || !address) {
      throw new Error("Wallet not connected");
    }

    try {
      // Step 1: Request unsigned transaction from backend
      const response = await apiRequest("POST", "/api/claim-winnings", {
        marketId,
        userAddress: address,
      });

      const result = await response.json();

      if (!result.unsignedTransaction) {
        throw new Error(result.error || "Failed to create claim transaction");
      }

      // Step 2: Parse unsigned transaction and sign with wallet
      const unsignedTx = JSON.parse(result.unsignedTransaction);

      toast({
        title: "Claiming winnings...",
        description: "Please approve the transaction in your wallet",
      });

      // Step 3: Sign and submit with wallet adapter
      const txResponse = await signAndSubmitTransaction({
        data: unsignedTx.rawTransaction || unsignedTx,
      });

      // Step 4: Report txHash back to backend for verification
      await apiRequest("POST", "/api/claim-winnings", {
        marketId,
        userAddress: address,
        txHash: txResponse.hash,
      });

      queryClient.invalidateQueries({ queryKey: ["/api/positions", address] });
      queryClient.invalidateQueries({ queryKey: ["/api/markets"] });

      toast({
        title: "Winnings claimed!",
        description: `Transaction confirmed: ${txResponse.hash.slice(0, 8)}...`,
      });
    } catch (error) {
      console.error("Error claiming winnings:", error);
      throw error;
    }
  }, [address, connected, queryClient, signAndSubmitTransaction, toast]);

  const createMarketMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; liquidity: number; expiry: Date }) => {
      // Convert liquidity from MOVE to octas (smallest unit)
      // This ensures we send an integer value that can be converted to BigInt
      const liquidityInOctas = moveToOctas(data.liquidity);

      const response = await apiRequest("POST", "/api/create-market", {
        companyName: data.name,
        description: data.description,
        yesPool: Math.round(liquidityInOctas / 2),
        noPool: Math.round(liquidityInOctas / 2),
        totalLiquidity: liquidityInOctas,
        expiryTimestamp: Math.floor(data.expiry.getTime() / 1000), // Convert to Unix seconds (contract expects seconds)
        creator: address,
      });

      // Check for error response
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.details || `Server error: ${response.status}`);
      }

      const result = await response.json();

      if (!result.unsignedTransaction) {
        throw new Error(result.error || "Failed to create transaction");
      }

      // Parse unsigned transaction and sign with wallet
      const unsignedTx = JSON.parse(result.unsignedTransaction);

      toast({
        title: "Signing transaction...",
        description: "Please approve the market creation in your wallet",
      });

      // Sign and submit with wallet adapter
      const txResponse = await signAndSubmitTransaction({
        data: unsignedTx.rawTransaction || unsignedTx,
      });

      toast({
        title: "Market creating...",
        description: `Transaction submitted: ${txResponse.hash.slice(0, 8)}...`,
      });

      return txResponse.hash;
    },
    onSuccess: () => {
      // Invalidate queries to refresh market list
      queryClient.invalidateQueries({ queryKey: ["/api/markets"] });

      toast({
        title: "Market created",
        description: "Your new market will appear shortly",
      });
    },
  });

  const createMarket = useCallback(async (name: string, description: string, liquidity: number, expiry: Date) => {
    await createMarketMutation.mutateAsync({ name, description, liquidity, expiry });
  }, [createMarketMutation]);

  const resolveMarketMutation = useMutation({
    mutationFn: async (data: { marketId: string; outcome: boolean }) => {
      const response = await apiRequest("POST", "/api/resolve-market", {
        marketId: data.marketId,
        adminAddress: address,
        winningOutcome: data.outcome,
      });

      const result = await response.json();

      if (!result.unsignedTransaction) {
        throw new Error(result.error || "Failed to create resolution transaction");
      }

      // Parse unsigned transaction and sign with wallet
      const unsignedTx = JSON.parse(result.unsignedTransaction);

      toast({
        title: "Signing transaction...",
        description: "Please approve the market resolution in your wallet",
      });

      // Sign and submit with wallet adapter
      const txResponse = await signAndSubmitTransaction({
        data: unsignedTx.rawTransaction || unsignedTx,
      });

      toast({
        title: "Market resolving...",
        description: `Transaction submitted: ${txResponse.hash.slice(0, 8)}...`,
      });

      return txResponse.hash;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/markets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/positions", address] });

      toast({
        title: "Market resolved",
        description: "Winnings are now claimable",
      });
    },
  });

  const resolveMarket = useCallback(async (marketId: string, outcome: boolean) => {
    await resolveMarketMutation.mutateAsync({ marketId, outcome });
  }, [resolveMarketMutation]);

  const seedMarkets = useCallback(async () => {
    console.warn("Seed markets endpoint has been removed. Markets should be created via the blockchain.");
    // Seed functionality removed - markets should be created through create-market endpoint
  }, []);

  return (
    <MarketContext.Provider
      value={{
        markets,
        positions,
        loading,
        getMarket,
        getPosition,
        getPriceHistory,
        refreshMarkets,
        executeTrade,
        claimWinnings,
        createMarket,
        resolveMarket,
        seedMarkets,
      }}
    >
      {children}
    </MarketContext.Provider>
  );
}
