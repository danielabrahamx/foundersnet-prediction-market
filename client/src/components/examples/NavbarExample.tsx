import { useState } from "react";
import { Navbar } from "../Navbar";
import { WalletProvider } from "@/contexts/WalletContext";

export default function NavbarExample() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  
  return (
    <WalletProvider>
      <Navbar theme={theme} onToggleTheme={() => setTheme(t => t === "light" ? "dark" : "light")} />
    </WalletProvider>
  );
}
