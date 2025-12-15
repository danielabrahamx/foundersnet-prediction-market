import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { CONTRACT_CONFIG } from "@/config/contracts";
import { useWallet as useAptosWallet } from "@aptos-labs/wallet-adapter-react";
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";

// Initialize Aptos client for Movement testnet
const aptosConfig = new AptosConfig({
  network: Network.CUSTOM,
  fullnode: "https://testnet.movementnetwork.xyz/v1",
});
const aptosClient = new Aptos(aptosConfig);

// MOVE token has 8 decimals (same as APT)
const OCTAS_PER_MOVE = 100_000_000;

interface WalletContextType {
  connected: boolean;
  address: string | null;
  balance: number;
  isAdmin: boolean;
  isLoadingBalance: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  refreshBalance: () => Promise<void>;
  signAndSubmitTransaction: (payload: unknown) => Promise<{ hash: string }>;
}

const WalletContext = createContext<WalletContextType | null>(null);

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within WalletProvider");
  }
  return context;
}

interface WalletProviderProps {
  children: ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  const aptosWallet = useAptosWallet();
  const [balance, setBalance] = useState(0);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  const connected = aptosWallet.connected;
  const address = aptosWallet.account?.address?.toString() || null;
  const isAdmin = address?.toLowerCase() === CONTRACT_CONFIG.adminAddress.toLowerCase();

  // Fetch real balance from Movement blockchain
  const fetchBalance = useCallback(async (walletAddress: string) => {
    setIsLoadingBalance(true);
    try {
      console.log(`Fetching balance for ${walletAddress}...`);
      const accountBalance = await aptosClient.getAccountAPTAmount({
        accountAddress: walletAddress,
      });
      // Convert from octas to MOVE (8 decimals)
      const moveBalance = accountBalance / OCTAS_PER_MOVE;
      console.log(`Balance: ${accountBalance} octas = ${moveBalance} MOVE`);
      setBalance(moveBalance);
    } catch (error: unknown) {
      console.error("Failed to fetch balance:", error);
      // Check if account doesn't exist yet (not funded)
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("not found") || errorMessage.includes("Account not found")) {
        console.warn("Account not found on chain - may need to be funded first");
        setBalance(0);
      } else {
        setBalance(0);
      }
    } finally {
      setIsLoadingBalance(false);
    }
  }, []);

  // Refresh balance function for external use
  const refreshBalance = useCallback(async () => {
    if (address) {
      await fetchBalance(address);
    }
  }, [address, fetchBalance]);

  // Fetch balance when wallet connects or address changes
  useEffect(() => {
    if (connected && address) {
      fetchBalance(address);

      // Also set up periodic refresh every 30 seconds
      const intervalId = setInterval(() => {
        fetchBalance(address);
      }, 30000);

      return () => clearInterval(intervalId);
    } else {
      setBalance(0);
    }
  }, [connected, address, fetchBalance]);

  const connect = useCallback(async () => {
    try {
      const wallets = aptosWallet.wallets;
      console.log("Available wallets:", wallets?.map(w => w.name));

      // Check if we're in an iframe (Replit webview)
      const isInIframe = window !== window.top;
      if (isInIframe) {
        console.log("Detected iframe - opening in new window for wallet connection");
        window.open(window.location.href, "_blank");
        return;
      }

      if (wallets && wallets.length > 0) {
        // Prefer Nightly wallet for Movement (has native Movement support)
        // DO NOT USE Petra - it's Aptos-specific and won't work with Movement
        const nightlyWallet = wallets.find(w =>
          w.name.toLowerCase().includes("nightly")
        );

        if (nightlyWallet) {
          console.log("Connecting to Nightly wallet (Movement native)...");
          await aptosWallet.connect(nightlyWallet.name);
          console.log("Nightly wallet connected successfully");
          return;
        }

        console.log("Connecting to first available wallet:", wallets[0].name);
        await aptosWallet.connect(wallets[0].name);
        console.log("Wallet connected:", wallets[0].name);
      } else {
        console.warn("No wallet extensions detected. Please install Nightly wallet for Movement.");
        window.open("https://nightly.app/", "_blank");
      }
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      throw error;
    }
  }, [aptosWallet]);

  const disconnect = useCallback(() => {
    aptosWallet.disconnect();
    setBalance(0);
    console.log("Wallet disconnected");
  }, [aptosWallet]);

  const signAndSubmitTransaction = useCallback(async (payload: unknown): Promise<{ hash: string }> => {
    if (!connected) {
      throw new Error("Wallet not connected");
    }

    console.log("Submitting transaction:", payload);

    try {
      // Use the real wallet adapter signAndSubmitTransaction
      const response = await aptosWallet.signAndSubmitTransaction(payload as Parameters<typeof aptosWallet.signAndSubmitTransaction>[0]);
      console.log("Transaction submitted:", response);

      // Refresh balance after transaction
      if (address) {
        setTimeout(() => fetchBalance(address), 2000);
      }

      return { hash: response.hash };
    } catch (error) {
      console.error("Transaction failed:", error);
      throw error;
    }
  }, [connected, aptosWallet, address, fetchBalance]);

  return (
    <WalletContext.Provider
      value={{
        connected,
        address,
        balance,
        isAdmin,
        isLoadingBalance,
        connect,
        disconnect,
        refreshBalance,
        signAndSubmitTransaction,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}
