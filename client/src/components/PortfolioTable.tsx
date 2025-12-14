import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, ArrowUpRight, ArrowDownRight, Gift } from "lucide-react";
import type { UserPositionDisplay } from "@/types/market";
import { useState } from "react";
import { Link } from "wouter";

interface PortfolioTableProps {
  positions: UserPositionDisplay[];
  onClaimWinnings: (marketId: string) => Promise<void>;
}

export function PortfolioTable({ positions, onClaimWinnings }: PortfolioTableProps) {
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const handleClaim = async (marketId: string) => {
    setClaimingId(marketId);
    try {
      await onClaimWinnings(marketId);
    } finally {
      setClaimingId(null);
    }
  };

  const totalValue = positions.reduce((sum, p) => sum + p.currentValue, 0);
  const totalPnl = positions.reduce((sum, p) => sum + p.unrealizedPnl, 0);
  const totalInvested = positions.reduce((sum, p) => sum + p.totalInvested, 0);
  const totalPnlPercent = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

  const claimablePositions = positions.filter(p => p.claimable);

  if (positions.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="text-muted-foreground">
            <p className="text-lg mb-2">No positions yet</p>
            <p className="text-sm">Start trading to build your portfolio</p>
          </div>
          <Link href="/">
            <Button className="mt-4" data-testid="button-browse-markets">
              Browse Markets
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Value</p>
            <p className="text-2xl font-mono font-bold" data-testid="text-total-value">
              {totalValue.toLocaleString()} APT
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total P&L</p>
            <p
              className={`text-2xl font-mono font-bold flex items-center gap-1 ${totalPnl >= 0 ? "text-yes" : "text-no"
                }`}
              data-testid="text-total-pnl"
            >
              {totalPnl >= 0 ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
              {totalPnl >= 0 ? "+" : ""}{totalPnl.toFixed(2)} ({totalPnlPercent.toFixed(1)}%)
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Active Positions</p>
            <p className="text-2xl font-mono font-bold" data-testid="text-positions-count">
              {positions.filter(p => !p.resolved).length}
            </p>
          </CardContent>
        </Card>
      </div>

      {claimablePositions.length > 0 && (
        <Card className="border-yes/50 bg-yes/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Gift className="h-5 w-5 text-yes" />
              Claimable Winnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {claimablePositions.map((position) => (
                <div
                  key={position.marketId}
                  className="flex items-center justify-between gap-4 p-3 bg-background rounded-md"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{position.companyName}</p>
                    <p className="text-sm text-muted-foreground">
                      {position.claimableAmount.toFixed(2)} APT
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleClaim(position.marketId)}
                    disabled={claimingId === position.marketId}
                    data-testid={`button-claim-${position.marketId}`}
                  >
                    {claimingId === position.marketId ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Claim"
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Positions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Market</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead className="text-right">Tokens</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead className="text-right">P&L</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {positions.map((position) => (
                  <TableRow key={position.marketId} data-testid={`row-position-${position.marketId}`}>
                    <TableCell className="max-w-[200px]">
                      <Link href={`/market/${position.marketId}`}>
                        <span className="hover:underline cursor-pointer truncate block">
                          {position.companyName}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      {position.yesTokens > 0 && (
                        <Badge className="bg-yes/20 text-yes border-yes/30">YES</Badge>
                      )}
                      {position.noTokens > 0 && (
                        <Badge className="bg-no/20 text-no border-no/30 ml-1">NO</Badge>
                      )}
                      {position.resolved && (
                        <Badge variant="secondary" className="ml-1">Resolved</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {position.yesTokens > 0 && `${position.yesTokens.toFixed(2)} YES`}
                      {position.yesTokens > 0 && position.noTokens > 0 && <br />}
                      {position.noTokens > 0 && `${position.noTokens.toFixed(2)} NO`}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {position.currentValue.toFixed(2)} APT
                    </TableCell>
                    <TableCell
                      className={`text-right font-mono ${position.unrealizedPnl >= 0 ? "text-yes" : "text-no"
                        }`}
                    >
                      {position.unrealizedPnl >= 0 ? "+" : ""}
                      {position.unrealizedPnl.toFixed(2)} ({position.unrealizedPnlPercent.toFixed(1)}%)
                    </TableCell>
                    <TableCell className="text-right">
                      {position.claimable ? (
                        <Button
                          size="sm"
                          onClick={() => handleClaim(position.marketId)}
                          disabled={claimingId === position.marketId}
                          data-testid={`button-claim-table-${position.marketId}`}
                        >
                          {claimingId === position.marketId ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Claim"
                          )}
                        </Button>
                      ) : (
                        <Link href={`/market/${position.marketId}`}>
                          <Button size="sm" variant="outline" data-testid={`button-trade-${position.marketId}`}>
                            Trade
                          </Button>
                        </Link>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
