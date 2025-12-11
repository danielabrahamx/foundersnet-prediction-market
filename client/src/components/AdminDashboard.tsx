import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AlertTriangle, Plus, CheckCircle, Loader2, Shield, Wallet } from "lucide-react";
import { useWallet } from "@/contexts/WalletContext";
import { useMarkets } from "@/contexts/MarketContext";
import { useToast } from "@/hooks/use-toast";
import type { MarketDisplay } from "@/types/market";

export function AdminDashboard() {
  const { address, isAdmin } = useWallet();
  const { markets, createMarket, resolveMarket } = useMarkets();
  const { toast } = useToast();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [newMarket, setNewMarket] = useState({
    name: "",
    description: "",
    liquidity: 1000,
    expiryDays: 30,
  });

  const [resolveData, setResolveData] = useState({
    marketId: "",
    outcome: "yes" as "yes" | "no",
  });

  const unresolvedMarkets = markets.filter(m => !m.resolved);
  const treasuryBalance = 2450;

  const handleCreateMarket = async () => {
    if (!newMarket.name || !newMarket.description) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + newMarket.expiryDays);
      
      await createMarket(newMarket.name, newMarket.description, newMarket.liquidity, expiry);
      
      toast({
        title: "Market created",
        description: `Successfully created market: ${newMarket.name}`,
      });
      
      setNewMarket({ name: "", description: "", liquidity: 1000, expiryDays: 30 });
      setCreateDialogOpen(false);
    } catch (error) {
      toast({
        title: "Failed to create market",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResolveMarket = async () => {
    if (!resolveData.marketId) {
      toast({
        title: "Select a market",
        description: "Please select a market to resolve.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await resolveMarket(resolveData.marketId, resolveData.outcome === "yes");
      
      toast({
        title: "Market resolved",
        description: `Market resolved with outcome: ${resolveData.outcome.toUpperCase()}`,
      });
      
      setResolveData({ marketId: "", outcome: "yes" });
      setResolveDialogOpen(false);
    } catch (error) {
      toast({
        title: "Failed to resolve market",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="py-12 text-center">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <p className="text-lg font-semibold mb-2">Access Denied</p>
          <p className="text-muted-foreground">
            This page is only accessible to admin wallets.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-primary/50 bg-primary/5">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium">Admin Mode Active</p>
              <p className="text-sm text-muted-foreground font-mono">
                {address?.slice(0, 10)}...{address?.slice(-8)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Active Markets</p>
            <p className="text-2xl font-mono font-bold" data-testid="text-active-markets">
              {unresolvedMarkets.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Resolved Markets</p>
            <p className="text-2xl font-mono font-bold" data-testid="text-resolved-markets">
              {markets.length - unresolvedMarkets.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Treasury Balance</p>
            <p className="text-2xl font-mono font-bold" data-testid="text-treasury">
              {treasuryBalance.toLocaleString()} MOVE
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Create Market</CardTitle>
            <CardDescription>
              Create a new prediction market for users to trade on.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full gap-2" data-testid="button-open-create-market">
                  <Plus className="h-4 w-4" />
                  New Market
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Market</DialogTitle>
                  <DialogDescription>
                    Set up a new prediction market for company valuations.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="market-name">Market Name</Label>
                    <Input
                      id="market-name"
                      placeholder="e.g., Company X reaches $10B valuation"
                      value={newMarket.name}
                      onChange={(e) => setNewMarket({ ...newMarket, name: e.target.value })}
                      data-testid="input-market-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="market-description">Description</Label>
                    <Textarea
                      id="market-description"
                      placeholder="Detailed description of the market outcome criteria..."
                      value={newMarket.description}
                      onChange={(e) => setNewMarket({ ...newMarket, description: e.target.value })}
                      data-testid="input-market-description"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="liquidity">Initial Liquidity (MOVE)</Label>
                      <Input
                        id="liquidity"
                        type="number"
                        value={newMarket.liquidity}
                        onChange={(e) => setNewMarket({ ...newMarket, liquidity: parseInt(e.target.value) || 0 })}
                        data-testid="input-liquidity"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="expiry">Expiry (days)</Label>
                      <Input
                        id="expiry"
                        type="number"
                        value={newMarket.expiryDays}
                        onChange={(e) => setNewMarket({ ...newMarket, expiryDays: parseInt(e.target.value) || 30 })}
                        data-testid="input-expiry"
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateMarket} disabled={loading} data-testid="button-create-market">
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Create Market
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resolve Market</CardTitle>
            <CardDescription>
              Settle an active market by declaring the winning outcome.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full gap-2" data-testid="button-open-resolve-market">
                  <CheckCircle className="h-4 w-4" />
                  Resolve Market
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Resolve Market</DialogTitle>
                  <DialogDescription>
                    Select a market and declare the winning outcome. This action is irreversible.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Select Market</Label>
                    <Select
                      value={resolveData.marketId}
                      onValueChange={(v) => setResolveData({ ...resolveData, marketId: v })}
                    >
                      <SelectTrigger data-testid="select-market">
                        <SelectValue placeholder="Choose a market..." />
                      </SelectTrigger>
                      <SelectContent>
                        {unresolvedMarkets.map((market) => (
                          <SelectItem key={market.id} value={market.id}>
                            {market.companyName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Winning Outcome</Label>
                    <RadioGroup
                      value={resolveData.outcome}
                      onValueChange={(v) => setResolveData({ ...resolveData, outcome: v as "yes" | "no" })}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="yes" id="outcome-yes" data-testid="radio-yes" />
                        <Label htmlFor="outcome-yes" className="text-yes font-semibold">
                          YES
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="no" id="outcome-no" data-testid="radio-no" />
                        <Label htmlFor="outcome-no" className="text-no font-semibold">
                          NO
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setResolveDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleResolveMarket} disabled={loading} data-testid="button-resolve-market">
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Resolve
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Treasury Management</CardTitle>
          <CardDescription>
            Withdraw accumulated trading fees from the treasury.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4 p-4 bg-muted/50 rounded-md">
            <div>
              <p className="text-sm text-muted-foreground">Available Balance</p>
              <p className="font-mono font-semibold text-lg">{treasuryBalance.toLocaleString()} MOVE</p>
            </div>
            <Button variant="outline" disabled data-testid="button-withdraw">
              <Wallet className="h-4 w-4 mr-2" />
              Withdraw
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Treasury withdrawals will be enabled after contract deployment.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
