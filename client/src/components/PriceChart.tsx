import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { PriceHistory } from "@/types/market";

interface PriceChartProps {
  priceHistory: PriceHistory[];
  currentYesPrice: number;
}

type TimeRange = "1H" | "24H" | "7D";

export function PriceChart({ priceHistory, currentYesPrice }: PriceChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("24H");

  const filteredData = (() => {
    const now = Date.now();
    let cutoff: number;
    
    switch (timeRange) {
      case "1H":
        cutoff = now - 60 * 60 * 1000;
        break;
      case "24H":
        cutoff = now - 24 * 60 * 60 * 1000;
        break;
      case "7D":
      default:
        cutoff = now - 7 * 24 * 60 * 60 * 1000;
        break;
    }
    
    return priceHistory
      .filter(p => p.timestamp >= cutoff)
      .map(p => ({
        time: new Date(p.timestamp).toLocaleTimeString([], { 
          hour: "2-digit", 
          minute: "2-digit",
          ...(timeRange === "7D" ? { month: "short", day: "numeric" } : {})
        }),
        yesPrice: p.yesPriceBps / 10000,
        noPrice: p.noPriceBps / 10000,
      }));
  })();

  const minPrice = Math.min(...filteredData.map(d => d.yesPrice)) * 0.95;
  const maxPrice = Math.max(...filteredData.map(d => d.yesPrice)) * 1.05;

  return (
    <Card data-testid="chart-price">
      <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
        <CardTitle className="text-lg">Price History</CardTitle>
        <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
          <TabsList className="h-8">
            <TabsTrigger value="1H" className="text-xs px-2" data-testid="tab-1h">
              1H
            </TabsTrigger>
            <TabsTrigger value="24H" className="text-xs px-2" data-testid="tab-24h">
              24H
            </TabsTrigger>
            <TabsTrigger value="7D" className="text-xs px-2" data-testid="tab-7d">
              7D
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={filteredData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                className="text-muted-foreground"
              />
              <YAxis
                domain={[minPrice, maxPrice]}
                tickFormatter={(v) => `$${v.toFixed(2)}`}
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                className="text-muted-foreground"
                width={50}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-popover border rounded-md p-2 shadow-lg">
                        <p className="text-xs text-muted-foreground">
                          {payload[0]?.payload?.time}
                        </p>
                        <p className="font-mono font-semibold text-yes">
                          YES: ${(payload[0]?.value as number)?.toFixed(4)}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Line
                type="monotone"
                dataKey="yesPrice"
                stroke="hsl(160 84% 39%)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center gap-6 mt-2 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yes" />
            <span>YES Price</span>
            <span className="font-mono font-semibold">
              ${(currentYesPrice / 10000).toFixed(2)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
