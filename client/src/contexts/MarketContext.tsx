import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { MarketDisplay, UserPositionDisplay, PriceHistory } from "@/types/market";
import { formatTimeUntilExpiry } from "@/services/amm";
import { useWallet } from "@/contexts/WalletContext";
import { apiRequest } from "@/lib/queryClient";
import type { Market, Position } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

function marketToDisplay(m: Market): MarketDisplay {
  const total = (m.yesPool || 5000) + (m.noPool || 5000);
  const yesPriceBps = total > 0 ? Math.round(((m.noPool || 5000) / total) * 10000) : 5000;
  const noPriceBps = 10000 - yesPriceBps;

  return {
    id: m.id,
    companyName: m.companyName,
    description: m.description,
    yesPriceBps,
    noPriceBps,
    yesPriceUsd: yesPriceBps / 10000,
    noPriceUsd: noPriceBps / 10000,
    totalLiquidity: m.totalLiquidity || 10000,
    volume24h: m.volume24h || 0,
    resolved: m.resolved || false,
    winningOutcome: m.winningOutcome || false,
    expiryTimestamp: m.expiryTimestamp,
    timeUntilExpiry: m.resolved ? "Resolved" : formatTimeUntilExpiry(m.expiryTimestamp),
  };
}

function positionToDisplay(p: Position, market: MarketDisplay | undefined): UserPositionDisplay {
  const yesValue = (p.yesTokens || 0) * (market?.yesPriceUsd || 0.5);
  const noValue = (p.noTokens || 0) * (market?.noPriceUsd || 0.5);
  const currentValue = yesValue + noValue;
  const unrealizedPnl = currentValue - (p.totalInvested || 0);
  const unrealizedPnlPercent = p.totalInvested > 0 ? (unrealizedPnl / p.totalInvested) * 100 : 0;

  const hasWinningTokens = market?.resolved
    ? (market.winningOutcome ? (p.yesTokens || 0) > 0 : (p.noTokens || 0) > 0)
    : false;
  const winningTokens = market?.winningOutcome ? (p.yesTokens || 0) : (p.noTokens || 0);

  return {
    marketId: p.marketId,
    companyName: market?.companyName || "Unknown Market",
    yesTokens: p.yesTokens || 0,
    noTokens: p.noTokens || 0,
    totalInvested: p.totalInvested || 0,
    currentValue,
    unrealizedPnl,
    unrealizedPnlPercent,
    resolved: market?.resolved || false,
    claimable: hasWinningTokens,
    claimableAmount: hasWinningTokens ? winningTokens : 0,
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
      // Positions are now fetched from blockchain for each market
      // For now, return empty array - positions should be fetched per-market from blockchain
      return [];
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

      // Step 1: Request unsigned transaction from backend
      const response = await apiRequest("POST", "/api/place-bet", {
        marketId: trade.marketId,
        betType: trade.type,
        amount: Math.round(trade.amount),
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
        amount: Math.round(trade.amount),
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
      await apiRequest("POST", "/api/create-market", {
        companyName: data.name,
        description: data.description,
        yesPool: Math.round(data.liquidity / 2),
        noPool: Math.round(data.liquidity / 2),
        totalLiquidity: data.liquidity,
        expiryTimestamp: data.expiry.getTime(),
        creator: address,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/markets"] });
    },
  });

  const createMarket = useCallback(async (name: string, description: string, liquidity: number, expiry: Date) => {
    await createMarketMutation.mutateAsync({ name, description, liquidity, expiry });
  }, [createMarketMutation]);

  const resolveMarketMutation = useMutation({
    mutationFn: async (data: { marketId: string; outcome: boolean }) => {
      await apiRequest("POST", "/api/resolve-market", {
        marketId: data.marketId,
        adminAddress: address,
        winningOutcome: data.outcome,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/markets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/positions", address] });
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
