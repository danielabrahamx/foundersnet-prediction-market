import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useState, useEffect } from "react";
import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react";
import { Network } from "@aptos-labs/ts-sdk";
import { WalletProvider } from "@/contexts/WalletContext";
import { MarketProvider } from "@/contexts/MarketContext";
import { Navbar } from "@/components/Navbar";
import Home from "@/pages/Home";
import TradingPage from "@/pages/TradingPage";
import Portfolio from "@/pages/Portfolio";
import Admin from "@/pages/Admin";
import NotFound from "@/pages/not-found";
import { isContractsDeployed } from "@/config/contracts";
import { AlertTriangle } from "lucide-react";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/market/:id" component={TradingPage} />
      <Route path="/portfolio" component={Portfolio} />
      <Route path="/admin" component={Admin} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("theme");
      if (stored === "dark" || stored === "light") return stored;
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return "light";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  return (
    <QueryClientProvider client={queryClient}>
      <AptosWalletAdapterProvider
        autoConnect={true}
        dappConfig={{ network: Network.TESTNET }}
        onError={(error) => console.error("Wallet error:", error)}
      >
        <TooltipProvider>
          <WalletProvider>
            <MarketProvider>
              <div className="min-h-screen bg-background text-foreground">
                {!isContractsDeployed() && (
                  <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2">
                    <div className="max-w-7xl mx-auto flex items-center gap-2 text-amber-600 dark:text-amber-400 text-sm">
                      <AlertTriangle className="h-4 w-4" />
                      <span>Simulation Mode - Smart contracts not deployed. Trades are stored locally.</span>
                    </div>
                  </div>
                )}
                <Navbar theme={theme} onToggleTheme={toggleTheme} />
                <main className="max-w-7xl mx-auto px-4 py-6">
                  <Router />
                </main>
              </div>
              <Toaster />
            </MarketProvider>
          </WalletProvider>
        </TooltipProvider>
      </AptosWalletAdapterProvider>
    </QueryClientProvider>
  );
}

export default App;
