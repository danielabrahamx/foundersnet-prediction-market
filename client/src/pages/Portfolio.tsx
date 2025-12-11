import { PortfolioTable } from "@/components/PortfolioTable";
import { useMarkets } from "@/contexts/MarketContext";
import { useWallet } from "@/contexts/WalletContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Wallet } from "lucide-react";

export default function Portfolio() {
  const { positions, claimWinnings } = useMarkets();
  const { connected, connect } = useWallet();

  if (!connected) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Portfolio</h1>
          <p className="text-muted-foreground">
            View your positions and manage your trades
          </p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <Wallet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-semibold mb-2">Connect Your Wallet</p>
            <p className="text-muted-foreground mb-4">
              Connect your Petra wallet to view your portfolio
            </p>
            <Button onClick={connect} data-testid="button-connect">
              Connect Wallet
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2" data-testid="text-page-title">
          Portfolio
        </h1>
        <p className="text-muted-foreground">
          View your positions and manage your trades
        </p>
      </div>
      <PortfolioTable positions={positions} onClaimWinnings={claimWinnings} />
    </div>
  );
}
