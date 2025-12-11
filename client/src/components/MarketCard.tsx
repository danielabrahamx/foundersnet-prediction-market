import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, TrendingUp, Droplets } from "lucide-react";
import type { MarketDisplay } from "@/types/market";
import { Link } from "wouter";

interface MarketCardProps {
  market: MarketDisplay;
}

export function MarketCard({ market }: MarketCardProps) {
  return (
    <Link href={`/market/${market.id}`}>
      <Card
        className="cursor-pointer transition-transform duration-200 hover:scale-[1.02]"
        data-testid={`card-market-${market.id}`}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-base leading-tight line-clamp-2">
              {market.companyName}
            </h3>
            {market.resolved ? (
              <Badge variant="secondary" className="shrink-0">
                Resolved
              </Badge>
            ) : (
              <Badge variant="outline" className="shrink-0 gap-1">
                <Clock className="h-3 w-3" />
                {market.timeUntilExpiry}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1 rounded-md bg-yes/10 p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">YES</p>
              <p className="font-mono font-semibold text-yes text-lg">
                ${market.yesPriceUsd.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">
                {(market.yesPriceBps / 100).toFixed(0)}%
              </p>
            </div>
            <div className="flex-1 rounded-md bg-no/10 p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">NO</p>
              <p className="font-mono font-semibold text-no text-lg">
                ${market.noPriceUsd.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">
                {(market.noPriceBps / 100).toFixed(0)}%
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Droplets className="h-3.5 w-3.5" />
              <span className="font-mono">{market.totalLiquidity.toLocaleString()} MOVE</span>
            </div>
            <div className="flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5" />
              <span className="font-mono">{market.volume24h.toLocaleString()} 24h</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
