import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { MarketDisplay, UserPositionDisplay, PriceHistory } from "@/types/market";
import { formatTimeUntilExpiry } from "@/services/amm";
import { useWallet } from "@/contexts/WalletContext";
import { apiRequest } from "@/lib/queryClient";
import type { Market, Position } from "@shared/schema";

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
  const { address } = useWallet();
  const queryClient = useQueryClient();
  const [priceHistories] = useState<Map<string, PriceHistory[]>>(new Map());

  const { data: rawMarkets = [], isLoading: marketsLoading, refetch: refetchMarkets } = useQuery<Market[]>({
    queryKey: ["/api/markets"],
  });

  const { data: rawPositions = [], isLoading: positionsLoading } = useQuery<Position[]>({
    queryKey: ["/api/positions", address],
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
      const market = getMarket(trade.marketId);
      const tokensOut = trade.amount / (trade.type === "YES" ? (market?.yesPriceUsd || 0.5) : (market?.noPriceUsd || 0.5));
      
      await apiRequest("POST", "/api/trades", {
        marketId: trade.marketId,
        userAddress: address,
        tradeType: trade.type,
        action: "BUY",
        moveAmount: Math.round(trade.amount),
        tokensAmount: Math.round(tokensOut),
        price: trade.type === "YES" ? (market?.yesPriceBps || 5000) : (market?.noPriceBps || 5000),
      });
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
    console.log(`Claiming winnings from market ${marketId}`);
    await new Promise(resolve => setTimeout(resolve, 1500));
    queryClient.invalidateQueries({ queryKey: ["/api/positions", address] });
  }, [address, queryClient]);

  const createMarketMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; liquidity: number; expiry: Date }) => {
      await apiRequest("POST", "/api/markets", {
        companyName: data.name,
        description: data.description,
        yesPool: Math.round(data.liquidity / 2),
        noPool: Math.round(data.liquidity / 2),
        totalLiquidity: data.liquidity,
        volume24h: 0,
        resolved: false,
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
      await apiRequest("POST", `/api/markets/${data.marketId}/resolve`, {
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

  const seedMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/seed", { adminAddress: address });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/markets"] });
    },
  });

  const seedMarkets = useCallback(async () => {
    await seedMutation.mutateAsync();
  }, [seedMutation]);

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
