import { PortfolioTable } from "../PortfolioTable";
import type { UserPositionDisplay } from "@/types/market";

const mockPositions: UserPositionDisplay[] = [
  {
    marketId: "1",
    companyName: "SpaceX valuation reaches $200B",
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
    companyName: "OpenAI valued above $150B",
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

export default function PortfolioTableExample() {
  return (
    <PortfolioTable
      positions={mockPositions}
      onClaimWinnings={async (id) => {
        console.log("Claiming winnings for:", id);
        await new Promise((r) => setTimeout(r, 1000));
      }}
    />
  );
}
