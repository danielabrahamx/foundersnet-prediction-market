import { AdminDashboard } from "@/components/AdminDashboard";
import { useWallet } from "@/contexts/WalletContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Wallet } from "lucide-react";

export default function Admin() {
  const { connected, connect } = useWallet();

  if (!connected) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Manage markets and treasury operations
          </p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <Wallet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-semibold mb-2">Connect Admin Wallet</p>
            <p className="text-muted-foreground mb-4">
              Connect with an admin wallet to access this dashboard
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
          Admin Dashboard
        </h1>
        <p className="text-muted-foreground">
          Manage markets and treasury operations
        </p>
      </div>
      <AdminDashboard />
    </div>
  );
}
