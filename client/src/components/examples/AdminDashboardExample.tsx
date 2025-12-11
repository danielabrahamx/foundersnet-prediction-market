import { AdminDashboard } from "../AdminDashboard";
import { WalletProvider } from "@/contexts/WalletContext";
import { MarketProvider } from "@/contexts/MarketContext";

export default function AdminDashboardExample() {
  return (
    <WalletProvider>
      <MarketProvider>
        <AdminDashboard />
      </MarketProvider>
    </WalletProvider>
  );
}
