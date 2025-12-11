import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { MarketDisplay, UserPositionDisplay, PriceHistory } from "@/types/market";
import { calculatePrice, bpsToUsd, formatTimeUntilExpiry } from "@/services/amm";

const MOCK_MARKETS: MarketDisplay[] = [
  {
    id: "1",
    companyName: "SpaceX valuation reaches $200B by Q2 2025",
    description: "Will SpaceX achieve a $200 billion valuation in their next funding round before July 2025?",
    yesPriceBps: 6500,
    noPriceBps: 3500,
    yesPriceUsd: 0.65,
    noPriceUsd: 0.35,
    totalLiquidity: 10000,
    volume24h: 2450,
    resolved: false,
    winningOutcome: false,
    expiryTimestamp: Date.now() + 120 * 24 * 60 * 60 * 1000,
    timeUntilExpiry: "120d 0h",
  },
  {
    id: "2",
    companyName: "OpenAI valued above $150B in next funding round",
    description: "Will OpenAI's next funding round value the company above $150 billion?",
    yesPriceBps: 7200,
    noPriceBps: 2800,
    yesPriceUsd: 0.72,
    noPriceUsd: 0.28,
    totalLiquidity: 15000,
    volume24h: 5230,
    resolved: false,
    winningOutcome: false,
    expiryTimestamp: Date.now() + 90 * 24 * 60 * 60 * 1000,
    timeUntilExpiry: "90d 0h",
  },
  {
    id: "3",
    companyName: "Stripe IPO valuation exceeds $100B",
    description: "Will Stripe's IPO valuation exceed $100 billion when they go public?",
    yesPriceBps: 4800,
    noPriceBps: 5200,
    yesPriceUsd: 0.48,
    noPriceUsd: 0.52,
    totalLiquidity: 8000,
    volume24h: 1890,
    resolved: false,
    winningOutcome: false,
    expiryTimestamp: Date.now() + 180 * 24 * 60 * 60 * 1000,
    timeUntilExpiry: "180d 0h",
  },
  {
    id: "4",
    companyName: "Databricks reaches $50B valuation",
    description: "Will Databricks achieve a $50 billion valuation before their IPO?",
    yesPriceBps: 5500,
    noPriceBps: 4500,
    yesPriceUsd: 0.55,
    noPriceUsd: 0.45,
    totalLiquidity: 12000,
    volume24h: 3120,
    resolved: false,
    winningOutcome: false,
    expiryTimestamp: Date.now() + 150 * 24 * 60 * 60 * 1000,
    timeUntilExpiry: "150d 0h",
  },
  {
    id: "5",
    companyName: "Canva valued above $40B",
    description: "Will Canva maintain or exceed their $40 billion valuation in the next funding round?",
    yesPriceBps: 6100,
    noPriceBps: 3900,
    yesPriceUsd: 0.61,
    noPriceUsd: 0.39,
    totalLiquidity: 9000,
    volume24h: 1560,
    resolved: false,
    winningOutcome: false,
    expiryTimestamp: Date.now() + 60 * 24 * 60 * 60 * 1000,
    timeUntilExpiry: "60d 0h",
  },
  {
    id: "6",
    companyName: "Anthropic reaches $30B valuation",
    description: "Will Anthropic achieve a $30 billion valuation in 2025?",
    yesPriceBps: 8200,
    noPriceBps: 1800,
    yesPriceUsd: 0.82,
    noPriceUsd: 0.18,
    totalLiquidity: 7500,
    volume24h: 4200,
    resolved: true,
    winningOutcome: true,
    expiryTimestamp: Date.now() - 5 * 24 * 60 * 60 * 1000,
    timeUntilExpiry: "Resolved",
  },
];

const MOCK_POSITIONS: UserPositionDisplay[] = [
  {
    marketId: "1",
    companyName: "SpaceX valuation reaches $200B by Q2 2025",
    yesTokens: 150,
    noTokens: 0,
    totalInvested: 85,
    currentValue: 97.5,
    unrealizedPnl: 12.5,
    unrealizedPnlPercent: 14.7,
    resolved: false,
    claimable: false,
    claimableAmount: 0,
  },
  {
    marketId: "2",
    companyName: "OpenAI valued above $150B in next funding round",
    yesTokens: 200,
    noTokens: 0,
    totalInvested: 120,
    currentValue: 144,
    unrealizedPnl: 24,
    unrealizedPnlPercent: 20,
    resolved: false,
    claimable: false,
    claimableAmount: 0,
  },
  {
    marketId: "3",
    companyName: "Stripe IPO valuation exceeds $100B",
    yesTokens: 0,
    noTokens: 100,
    totalInvested: 45,
    currentValue: 52,
    unrealizedPnl: 7,
    unrealizedPnlPercent: 15.5,
    resolved: false,
    claimable: false,
    claimableAmount: 0,
  },
  {
    marketId: "6",
    companyName: "Anthropic reaches $30B valuation",
    yesTokens: 50,
    noTokens: 0,
    totalInvested: 35,
    currentValue: 50,
    unrealizedPnl: 15,
    unrealizedPnlPercent: 42.8,
    resolved: true,
    claimable: true,
    claimableAmount: 50,
  },
];

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
  const [markets, setMarkets] = useState<MarketDisplay[]>(MOCK_MARKETS);
  const [positions, setPositions] = useState<UserPositionDisplay[]>(MOCK_POSITIONS);
  const [loading, setLoading] = useState(false);
  const [priceHistories] = useState<Map<string, PriceHistory[]>>(() => {
    const map = new Map();
    MOCK_MARKETS.forEach(m => {
      map.set(m.id, generatePriceHistory(m.yesPriceBps));
    });
    return map;
  });

  const getMarket = useCallback((id: string) => {
    return markets.find(m => m.id === id);
  }, [markets]);

  const getPosition = useCallback((marketId: string) => {
    return positions.find(p => p.marketId === marketId);
  }, [positions]);

  const getPriceHistory = useCallback((marketId: string) => {
    return priceHistories.get(marketId) || [];
  }, [priceHistories]);

  const refreshMarkets = useCallback(async () => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setMarkets([...MOCK_MARKETS].map(m => ({
      ...m,
      timeUntilExpiry: m.resolved ? "Resolved" : formatTimeUntilExpiry(m.expiryTimestamp),
    })));
    setLoading(false);
  }, []);

  const executeTrade = useCallback(async (marketId: string, type: "YES" | "NO", amount: number) => {
    console.log(`Executing ${type} trade on market ${marketId} for ${amount} MOVE`);
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setPositions(prev => {
      const existing = prev.find(p => p.marketId === marketId);
      const market = markets.find(m => m.id === marketId);
      if (!market) return prev;
      
      const tokensReceived = amount / (type === "YES" ? market.yesPriceUsd : market.noPriceUsd);
      
      if (existing) {
        return prev.map(p => p.marketId === marketId ? {
          ...p,
          yesTokens: type === "YES" ? p.yesTokens + tokensReceived : p.yesTokens,
          noTokens: type === "NO" ? p.noTokens + tokensReceived : p.noTokens,
          totalInvested: p.totalInvested + amount,
          currentValue: p.currentValue + amount,
        } : p);
      } else {
        return [...prev, {
          marketId,
          companyName: market.companyName,
          yesTokens: type === "YES" ? tokensReceived : 0,
          noTokens: type === "NO" ? tokensReceived : 0,
          totalInvested: amount,
          currentValue: amount,
          unrealizedPnl: 0,
          unrealizedPnlPercent: 0,
          resolved: false,
          claimable: false,
          claimableAmount: 0,
        }];
      }
    });
  }, [markets]);

  const claimWinnings = useCallback(async (marketId: string) => {
    console.log(`Claiming winnings from market ${marketId}`);
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setPositions(prev => prev.map(p => p.marketId === marketId ? {
      ...p,
      claimable: false,
      claimableAmount: 0,
    } : p));
  }, []);

  const createMarket = useCallback(async (name: string, description: string, liquidity: number, expiry: Date) => {
    console.log(`Creating market: ${name}`);
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const newMarket: MarketDisplay = {
      id: String(markets.length + 1),
      companyName: name,
      description,
      yesPriceBps: 5000,
      noPriceBps: 5000,
      yesPriceUsd: 0.50,
      noPriceUsd: 0.50,
      totalLiquidity: liquidity,
      volume24h: 0,
      resolved: false,
      winningOutcome: false,
      expiryTimestamp: expiry.getTime(),
      timeUntilExpiry: formatTimeUntilExpiry(expiry.getTime()),
    };
    
    setMarkets(prev => [...prev, newMarket]);
  }, [markets.length]);

  const resolveMarket = useCallback(async (marketId: string, outcome: boolean) => {
    console.log(`Resolving market ${marketId} with outcome: ${outcome ? "YES" : "NO"}`);
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setMarkets(prev => prev.map(m => m.id === marketId ? {
      ...m,
      resolved: true,
      winningOutcome: outcome,
      timeUntilExpiry: "Resolved",
    } : m));
    
    setPositions(prev => prev.map(p => {
      if (p.marketId !== marketId) return p;
      const hasWinningTokens = outcome ? p.yesTokens > 0 : p.noTokens > 0;
      const winningTokens = outcome ? p.yesTokens : p.noTokens;
      return {
        ...p,
        resolved: true,
        claimable: hasWinningTokens,
        claimableAmount: winningTokens,
      };
    }));
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
      }}
    >
      {children}
    </MarketContext.Provider>
  );
}
