import { useState, useMemo } from "react";
import { MarketCard } from "@/components/MarketCard";
import { MarketFilters, type MarketSort } from "@/components/MarketFilters";
import { useMarkets } from "@/contexts/MarketContext";
import { useWallet } from "@/contexts/WalletContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Database } from "lucide-react";
import { Link } from "wouter";
import type { MarketFilter } from "@/types/market";

interface EmptyStateProps {
  searchQuery: string;
  isAdmin: boolean;
}

function EmptyState({ searchQuery, isAdmin }: EmptyStateProps) {
  if (searchQuery) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground text-lg">No markets found</p>
        <p className="text-sm text-muted-foreground mt-1">
          Try a different search term
        </p>
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="py-12 text-center">
        <Database className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-lg font-semibold mb-2">No markets available</p>
        <p className="text-muted-foreground mb-4">
          {isAdmin
            ? "Create new prediction markets from the Admin Dashboard."
            : "Check back soon for new prediction markets."}
        </p>
        {isAdmin && (
          <Link href="/admin">
            <Button data-testid="button-go-to-admin">
              Go to Admin Dashboard
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}


export default function Home() {
  const { markets, loading } = useMarkets();
  const { isAdmin } = useWallet();
  const [activeFilter, setActiveFilter] = useState<MarketFilter>("active");
  const [activeSort, setActiveSort] = useState<MarketSort>("newest");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredAndSortedMarkets = useMemo(() => {
    let result = markets;

    // Apply filter
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

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (m) =>
          m.companyName.toLowerCase().includes(query) ||
          m.description.toLowerCase().includes(query)
      );
    }

    // Apply sorting (except for trending which has its own sort)
    if (activeFilter !== "trending") {
      result = [...result].sort((a, b) => {
        switch (activeSort) {
          case "newest":
            return b.expiryTimestamp - a.expiryTimestamp;
          case "liquidity":
            return b.totalLiquidity - a.totalLiquidity;
          case "volume":
            return b.volume24h - a.volume24h;
          default:
            return 0;
        }
      });
    }

    return result;
  }, [markets, activeFilter, activeSort, searchQuery]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2" data-testid="text-page-title">
          Prediction Markets for startup fundraises.
        </h1>
        <p className="text-muted-foreground">
          The closest thing to trading in private companies' shares.
        </p>
      </div>

      <MarketFilters
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        activeSort={activeSort}
        onSortChange={setActiveSort}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-[220px] rounded-xl" />
          ))}
        </div>
      ) : filteredAndSortedMarkets.length === 0 ? (
        <EmptyState
          searchQuery={searchQuery}
          isAdmin={isAdmin}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedMarkets.map((market) => (
            <MarketCard key={market.id} market={market} />
          ))}
        </div>
      )}
    </div>
  );
}
