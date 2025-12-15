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
import { Loader2, TrendingUp, Gift, Trophy, XCircle } from "lucide-react";
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

  // Calculate totals - separate active and resolved positions
  const activePositions = positions.filter(p => !p.resolved);
  const resolvedPositions = positions.filter(p => p.resolved);

  // Total bet amount across all active positions
  const totalActiveBets = activePositions.reduce((sum, p) => sum + p.totalInvested, 0);

  // Total potential profit from active positions (if you win)
  const totalPotentialProfit = activePositions.reduce((sum, p) => sum + p.potentialPnl, 0);

  // Total realized P/L from resolved positions
  const totalRealizedPnl = resolvedPositions.reduce((sum, p) => sum + p.unrealizedPnl, 0);

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
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Bet Amount</p>
            <p className="text-2xl font-mono font-bold" data-testid="text-total-value">
              {totalActiveBets.toFixed(2)} MOVE
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Across {activePositions.length} active position{activePositions.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              Potential Profit
            </p>
            <p
              className="text-2xl font-mono font-bold text-yes"
              data-testid="text-total-pnl"
            >
              +{totalPotentialProfit.toFixed(2)} MOVE
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              If your predictions are correct
            </p>
          </CardContent>
        </Card>
        <Card className={resolvedPositions.length > 0 ? (totalRealizedPnl >= 0 ? "bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20" : "bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20") : ""}>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Realized P/L</p>
            <p className={`text-2xl font-mono font-bold ${totalRealizedPnl >= 0 ? "text-yes" : "text-no"}`}>
              {totalRealizedPnl >= 0 ? "+" : ""}{totalRealizedPnl.toFixed(2)} MOVE
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              From {resolvedPositions.length} resolved market{resolvedPositions.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Claimable Winnings Section */}
      {claimablePositions.length > 0 && (
        <Card className="border-yes/50 bg-gradient-to-r from-yes/10 to-yes/5">
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
                  className="flex items-center justify-between gap-4 p-4 bg-background/80 rounded-lg border border-yes/20"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{position.companyName}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-muted-foreground">Bet: {position.totalInvested.toFixed(2)} MOVE</span>
                      <span className="text-sm text-muted-foreground">→</span>
                      <span className="text-sm font-semibold text-yes">Win: {position.claimableAmount.toFixed(2)} MOVE</span>
                      <Badge className="bg-yes/20 text-yes text-xs">
                        +{(position.claimableAmount - position.totalInvested).toFixed(2)} profit
                      </Badge>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleClaim(position.marketId)}
                    disabled={claimingId === position.marketId}
                    className="bg-yes hover:bg-yes/90"
                    data-testid={`button-claim-${position.marketId}`}
                  >
                    {claimingId === position.marketId ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Claim Winnings"
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Positions Table */}
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
                  <TableHead className="text-right">Bet Amount</TableHead>
                  <TableHead className="text-right">Potential Profit</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {positions.map((position) => {
                  // Use the isWinner field which correctly tracks wins even after claiming
                  const isWinner = position.resolved && position.isWinner;
                  const isLoser = position.resolved && !position.isWinner;
                  const hasClaimed = position.hasClaimed;

                  return (
                    <TableRow key={position.marketId} data-testid={`row-position-${position.marketId}`}>
                      <TableCell className="max-w-[200px]">
                        <Link href={`/market/${position.marketId}`}>
                          <span className="hover:underline cursor-pointer truncate block font-medium">
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
                        {position.yesTokens === 0 && position.noTokens === 0 && position.resolved && (
                          <Badge variant="outline" className="text-muted-foreground">
                            {hasClaimed ? (position.totalInvested > 0 ? "YES" : "—") : "—"}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {position.totalInvested.toFixed(2)} MOVE
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {position.resolved ? (
                          <span className={isWinner ? "text-yes" : "text-no"}>
                            {isWinner ? `+${position.unrealizedPnl.toFixed(2)}` : position.unrealizedPnl.toFixed(2)} MOVE
                          </span>
                        ) : (
                          <span className="text-yes">
                            +{position.potentialPnl.toFixed(2)} MOVE
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {isWinner && !hasClaimed && (
                          <Badge className="bg-yes/20 text-yes border-yes/30 gap-1">
                            <Trophy className="h-3 w-3" />
                            Won
                          </Badge>
                        )}
                        {isWinner && hasClaimed && (
                          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 gap-1">
                            <Trophy className="h-3 w-3" />
                            Claimed
                          </Badge>
                        )}
                        {isLoser && (
                          <Badge className="bg-no/20 text-no border-no/30 gap-1">
                            <XCircle className="h-3 w-3" />
                            Lost
                          </Badge>
                        )}
                        {!position.resolved && (
                          <Badge variant="outline" className="gap-1">
                            Active
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {position.claimable ? (
                          <Button
                            size="sm"
                            onClick={() => handleClaim(position.marketId)}
                            disabled={claimingId === position.marketId}
                            className="bg-yes hover:bg-yes/90"
                            data-testid={`button-claim-table-${position.marketId}`}
                          >
                            {claimingId === position.marketId ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Claim"
                            )}
                          </Button>
                        ) : position.resolved ? (
                          <span className="text-sm text-muted-foreground">—</span>
                        ) : (
                          <Link href={`/market/${position.marketId}`}>
                            <Button size="sm" variant="outline" data-testid={`button-trade-${position.marketId}`}>
                              View
                            </Button>
                          </Link>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
