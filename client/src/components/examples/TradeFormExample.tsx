import { TradeForm } from "../TradeForm";
import { WalletProvider } from "@/contexts/WalletContext";
import { MarketProvider } from "@/contexts/MarketContext";
import type { MarketDisplay } from "@/types/market";

const mockMarket: MarketDisplay = {
  id: "1",
  companyName: "SpaceX valuation reaches $200B",
  description: "Will SpaceX achieve a $200 billion valuation?",
  yesPriceBps: 6500,
  noPriceBps: 3500,
  yesPriceUsd: 0.65,
  noPriceUsd: 0.35,
  totalLiquidity: 10000,
  volume24h: 2450,
  resolved: false,
  winningOutcome: false,
  expiryTimestamp: Math.floor(Date.now() / 1000) + 120 * 24 * 60 * 60, // Unix seconds
  timeUntilExpiry: "120d 0h",
};

export default function TradeFormExample() {
  return (
    <WalletProvider>
      <MarketProvider>
        <div className="max-w-sm">
          <TradeForm market={mockMarket} />
        </div>
      </MarketProvider>
    </WalletProvider>
  );
}
