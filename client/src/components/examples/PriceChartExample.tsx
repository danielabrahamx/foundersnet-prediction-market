import { PriceChart } from "../PriceChart";
import type { PriceHistory } from "@/types/market";

function generateMockHistory(): PriceHistory[] {
  const history: PriceHistory[] = [];
  const now = Date.now();
  let price = 5500;
  
  for (let i = 168; i >= 0; i--) {
    price = Math.max(2000, Math.min(8000, price + (Math.random() - 0.48) * 200));
    history.push({
      timestamp: now - i * 60 * 60 * 1000,
      yesPriceBps: Math.round(price),
      noPriceBps: 10000 - Math.round(price),
    });
  }
  
  return history;
}

export default function PriceChartExample() {
  return <PriceChart priceHistory={generateMockHistory()} currentYesPrice={6500} />;
}
