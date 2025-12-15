import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, CheckCircle } from "lucide-react";
import { useWallet } from "@/contexts/WalletContext";
import { useMarkets } from "@/contexts/MarketContext";
import type { MarketDisplay, TransactionState } from "@/types/market";
import { useToast } from "@/hooks/use-toast";

interface TradeFormProps {
  market: MarketDisplay;
}

export function TradeForm({ market }: TradeFormProps) {
  const [tradeType, setTradeType] = useState<"YES" | "NO">("YES");
  const [amount, setAmount] = useState("");
  const [txState, setTxState] = useState<TransactionState>({ status: "idle" });
  const { connected, balance, connect } = useWallet();
  const { executeTrade, getPosition } = useMarkets();
  const { toast } = useToast();

  const position = getPosition(market.id);
  const numAmount = parseFloat(amount) || 0;

  // Get pool sizes from market for potential payout calculation
  const yesPool = (market as any).yesPool || market.totalLiquidity / 2;
  const noPool = (market as any).noPool || market.totalLiquidity / 2;
  const totalPool = yesPool + noPool;

  // Calculate potential payout based on current pool sizes
  const potentialPayout = useMemo(() => {
    if (numAmount <= 0) return 0;
    const newYesPool = tradeType === "YES" ? yesPool + numAmount : yesPool;
    const newNoPool = tradeType === "NO" ? noPool + numAmount : noPool;
    const newTotalPool = newYesPool + newNoPool;

    // Payout = (totalPool / winningPool) * userBet
    const winningPool = tradeType === "YES" ? newYesPool : newNoPool;
    return winningPool > 0 ? (newTotalPool / winningPool) * numAmount : 0;
  }, [numAmount, tradeType, yesPool, noPool]);

  const potentialProfit = potentialPayout - numAmount;

  const handleTrade = async () => {
    if (!connected) {
      await connect();
      return;
    }

    if (numAmount <= 0 || numAmount > balance) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount within your balance.",
        variant: "destructive",
      });
      return;
    }

    setTxState({ status: "pending" });

    try {
      await executeTrade(market.id, tradeType, numAmount);
      setTxState({ status: "confirmed" });
      toast({
        title: "Bet placed successfully!",
        description: `You bet ${numAmount} MOVE on ${tradeType}`,
      });
      setAmount("");
      setTimeout(() => setTxState({ status: "idle" }), 3000);
    } catch (error) {
      setTxState({ status: "failed", error: "Transaction failed" });
      toast({
        title: "Trade failed",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleMaxClick = () => {
    setAmount(balance.toString());
  };

  if (market.resolved) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Market Resolved</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <CheckCircle className="h-12 w-12 mx-auto mb-3 text-yes" />
            <p className="text-lg font-semibold mb-2">
              Outcome: {market.winningOutcome ? "YES" : "NO"}
            </p>
            <p className="text-sm text-muted-foreground">
              Trading is closed. Check your portfolio for claimable winnings.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Trade</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={tradeType} onValueChange={(v) => setTradeType(v as "YES" | "NO")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger
              value="YES"
              className="data-[state=active]:bg-yes data-[state=active]:text-yes-foreground"
              data-testid="tab-buy-yes"
            >
              Buy YES
            </TabsTrigger>
            <TabsTrigger
              value="NO"
              className="data-[state=active]:bg-no data-[state=active]:text-no-foreground"
              data-testid="tab-buy-no"
            >
              Buy NO
            </TabsTrigger>
          </TabsList>

          <TabsContent value={tradeType} className="space-y-4 mt-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="amount">Amount (MOVE)</Label>
                <button
                  type="button"
                  onClick={handleMaxClick}
                  className="text-xs text-primary hover:underline"
                  data-testid="button-max"
                >
                  Max: {balance.toLocaleString()}
                </button>
              </div>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="font-mono"
                data-testid="input-amount"
              />
            </div>

            {numAmount > 0 && (
              <Card className="bg-gradient-to-br from-muted/50 to-muted/30 border-primary/20">
                <CardContent className="p-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Your bet</span>
                    <span className="font-mono font-semibold">
                      {numAmount.toFixed(2)} MOVE on {tradeType}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Current {tradeType} pool</span>
                    <span className="font-mono">
                      {(tradeType === "YES" ? yesPool : noPool).toFixed(2)} MOVE
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total pool</span>
                    <span className="font-mono">
                      {(totalPool + numAmount).toFixed(2)} MOVE
                    </span>
                  </div>
                  <hr className="border-primary/20" />
                  <div className="flex justify-between text-sm font-semibold">
                    <span className="text-muted-foreground">Potential payout (if {tradeType} wins)</span>
                    <span className="font-mono text-yes">
                      {potentialPayout.toFixed(2)} MOVE
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Potential profit</span>
                    <span className="font-mono text-yes">
                      +{potentialProfit.toFixed(2)} MOVE ({((potentialProfit / numAmount) * 100).toFixed(0)}%)
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    Parimutuel betting: No price impact, payouts determined at resolution
                  </p>
                </CardContent>
              </Card>
            )}

            <Button
              className="w-full"
              size="lg"
              onClick={handleTrade}
              disabled={txState.status === "pending" || (connected && numAmount <= 0)}
              data-testid="button-execute-trade"
            >
              {txState.status === "pending" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : txState.status === "confirmed" ? (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Success!
                </>
              ) : connected ? (
                `Buy ${tradeType} Tokens`
              ) : (
                "Connect Wallet"
              )}
            </Button>
          </TabsContent>
        </Tabs>

        {position && (position.yesTokens > 0 || position.noTokens > 0) && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm font-medium mb-2">Your Position</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {position.yesTokens > 0 && (
                <div className="bg-yes/10 rounded-md p-2 border border-yes/20">
                  <p className="text-xs text-muted-foreground">YES Bet</p>
                  <p className="font-mono font-semibold text-yes">
                    {position.yesTokens.toFixed(2)} MOVE
                  </p>
                </div>
              )}
              {position.noTokens > 0 && (
                <div className="bg-no/10 rounded-md p-2 border border-no/20">
                  <p className="text-xs text-muted-foreground">NO Bet</p>
                  <p className="font-mono font-semibold text-no">
                    {position.noTokens.toFixed(2)} MOVE
                  </p>
                </div>
              )}
            </div>
            {position.potentialPnl > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                Potential profit if you win: <span className="text-yes font-mono">+{position.potentialPnl.toFixed(2)} MOVE</span>
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
