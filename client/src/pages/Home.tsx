import { useState, useMemo } from "react";
import { MarketCard } from "@/components/MarketCard";
import { MarketFilters } from "@/components/MarketFilters";
import { useMarkets } from "@/contexts/MarketContext";
import { Skeleton } from "@/components/ui/skeleton";
import type { MarketFilter } from "@/types/market";

export default function Home() {
  const { markets, loading } = useMarkets();
  const [activeFilter, setActiveFilter] = useState<MarketFilter>("active");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredMarkets = useMemo(() => {
    let result = markets;

    switch (activeFilter) {
      case "active":
        result = result.filter((m) => !m.resolved);
        break;
      case "resolved":
        result = result.filter((m) => m.resolved);
        break;
      case "trending":
        result = [...result]
          .filter((m) => !m.resolved)
          .sort((a, b) => b.volume24h - a.volume24h)
          .slice(0, 6);
        break;
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (m) =>
          m.companyName.toLowerCase().includes(query) ||
          m.description.toLowerCase().includes(query)
      );
    }

    return result;
  }, [markets, activeFilter, searchQuery]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2" data-testid="text-page-title">
          Prediction Markets
        </h1>
        <p className="text-muted-foreground">
          Trade on private company valuations using outcome tokens
        </p>
      </div>

      <MarketFilters
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-[220px] rounded-xl" />
          ))}
        </div>
      ) : filteredMarkets.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-lg">No markets found</p>
          {searchQuery && (
            <p className="text-sm text-muted-foreground mt-1">
              Try a different search term
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMarkets.map((market) => (
            <MarketCard key={market.id} market={market} />
          ))}
        </div>
      )}
    </div>
  );
}
