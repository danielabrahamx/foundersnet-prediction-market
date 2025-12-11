import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { CONTRACT_CONFIG } from "@/config/contracts";
import { useWallet as useAptosWallet } from "@aptos-labs/wallet-adapter-react";

interface WalletContextType {
  connected: boolean;
  address: string | null;
  balance: number;
  isAdmin: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
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

  const connected = aptosWallet.connected;
  const address = aptosWallet.account?.address?.toString() || null;
  const isAdmin = address?.toLowerCase() === CONTRACT_CONFIG.adminAddress.toLowerCase();

  useEffect(() => {
    if (connected) {
      setBalance(1000);
    } else {
      setBalance(0);
    }
  }, [connected]);

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
        const petraWallet = wallets.find(w => 
          w.name.toLowerCase().includes("petra")
        );
        
        if (petraWallet) {
          console.log("Connecting to Petra wallet...");
          await aptosWallet.connect(petraWallet.name);
          console.log("Petra wallet connected successfully");
          return;
        }
        
        console.log("Connecting to first available wallet:", wallets[0].name);
        await aptosWallet.connect(wallets[0].name);
        console.log("Wallet connected:", wallets[0].name);
      } else {
        console.warn("No wallet extensions detected. Please install Petra wallet.");
        window.open("https://petra.app/", "_blank");
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
    
    console.log("Signing transaction:", payload);
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    const hash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`;
    console.log("Mock transaction hash:", hash);
    return { hash };
  }, [connected]);

  return (
    <WalletContext.Provider
      value={{
        connected,
        address,
        balance,
        isAdmin,
        connect,
        disconnect,
        signAndSubmitTransaction,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}
