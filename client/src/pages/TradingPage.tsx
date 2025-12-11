import { useRoute, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, Droplets, TrendingUp, ExternalLink } from "lucide-react";
import { TradeForm } from "@/components/TradeForm";
import { PriceChart } from "@/components/PriceChart";
import { useMarkets } from "@/contexts/MarketContext";
import { Skeleton } from "@/components/ui/skeleton";

export default function TradingPage() {
  const [, params] = useRoute("/market/:id");
  const { getMarket, getPriceHistory } = useMarkets();

  const market = params?.id ? getMarket(params.id) : undefined;
  const priceHistory = params?.id ? getPriceHistory(params.id) : [];

  if (!market) {
    return (
      <div className="space-y-6">
        <Link href="/">
          <Button variant="ghost" className="gap-2" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
            Back to Markets
          </Button>
        </Link>
        <div className="text-center py-12">
          <p className="text-muted-foreground text-lg">Market not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/">
        <Button variant="ghost" className="gap-2" data-testid="button-back">
          <ArrowLeft className="h-4 w-4" />
          Back to Markets
        </Button>
      </Link>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-xl" data-testid="text-market-title">
                    {market.companyName}
                  </CardTitle>
                  <p className="text-muted-foreground mt-2">
                    {market.description}
                  </p>
                </div>
                {market.resolved ? (
                  <Badge variant="secondary" className="shrink-0">
                    Resolved: {market.winningOutcome ? "YES" : "NO"}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="shrink-0 gap-1">
                    <Clock className="h-3 w-3" />
                    {market.timeUntilExpiry}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-yes/10 rounded-md p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">YES Price</p>
                  <p className="font-mono font-bold text-yes text-xl">
                    ${market.yesPriceUsd.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(market.yesPriceBps / 100).toFixed(0)}% probability
                  </p>
                </div>
                <div className="bg-no/10 rounded-md p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">NO Price</p>
                  <p className="font-mono font-bold text-no text-xl">
                    ${market.noPriceUsd.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(market.noPriceBps / 100).toFixed(0)}% probability
                  </p>
                </div>
                <div className="rounded-md p-3 text-center bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1">
                    <Droplets className="h-3 w-3" />
                    Liquidity
                  </p>
                  <p className="font-mono font-semibold text-lg">
                    {market.totalLiquidity.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">MOVE</p>
                </div>
                <div className="rounded-md p-3 text-center bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    24h Volume
                  </p>
                  <p className="font-mono font-semibold text-lg">
                    {market.volume24h.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">MOVE</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <PriceChart priceHistory={priceHistory} currentYesPrice={market.yesPriceBps} />

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { action: "Bought", type: "YES", amount: 50, tokens: 76.9, time: "2m ago" },
                  { action: "Bought", type: "NO", amount: 25, tokens: 71.4, time: "5m ago" },
                  { action: "Sold", type: "YES", amount: 100, tokens: 142.8, time: "12m ago" },
                  { action: "Bought", type: "YES", amount: 200, tokens: 285.7, time: "28m ago" },
                ].map((activity, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      <Badge
                        className={
                          activity.type === "YES"
                            ? "bg-yes/20 text-yes border-yes/30"
                            : "bg-no/20 text-no border-no/30"
                        }
                      >
                        {activity.type}
                      </Badge>
                      <span className="text-sm">
                        {activity.action} {activity.tokens.toFixed(1)} tokens for {activity.amount} MOVE
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">{activity.time}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:w-[360px] shrink-0">
          <div className="lg:sticky lg:top-24">
            <TradeForm market={market} />
          </div>
        </div>
      </div>
    </div>
  );
}
