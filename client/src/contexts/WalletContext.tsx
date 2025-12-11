import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { CONTRACT_CONFIG } from "@/config/contracts";

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
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);

  const isAdmin = address?.toLowerCase() === CONTRACT_CONFIG.adminAddress.toLowerCase();

  const connect = useCallback(async () => {
    try {
      if (typeof window !== "undefined" && "aptos" in window) {
        const petra = (window as { aptos?: { connect: () => Promise<{ address: string }> } }).aptos;
        if (petra) {
          const response = await petra.connect();
          setAddress(response.address);
          setConnected(true);
          setBalance(1000);
          console.log("Wallet connected:", response.address);
          return;
        }
      }
      
      const mockAddress = CONTRACT_CONFIG.adminAddress;
      setAddress(mockAddress);
      setConnected(true);
      setBalance(1000);
      console.log("Mock wallet connected:", mockAddress);
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      throw error;
    }
  }, []);

  const disconnect = useCallback(() => {
    setConnected(false);
    setAddress(null);
    setBalance(0);
    console.log("Wallet disconnected");
  }, []);

  const signAndSubmitTransaction = useCallback(async (payload: unknown): Promise<{ hash: string }> => {
    if (!connected) {
      throw new Error("Wallet not connected");
    }
    
    console.log("Signing transaction:", payload);
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const hash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`;
    console.log("Transaction submitted:", hash);
    
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
