import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, TrendingUp, CheckCircle, Flame } from "lucide-react";
import type { MarketFilter } from "@/types/market";

interface MarketFiltersProps {
  activeFilter: MarketFilter;
  onFilterChange: (filter: MarketFilter) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function MarketFilters({
  activeFilter,
  onFilterChange,
  searchQuery,
  onSearchChange,
}: MarketFiltersProps) {
  const filters: { value: MarketFilter; label: string; icon: typeof TrendingUp }[] = [
    { value: "active", label: "Active", icon: TrendingUp },
    { value: "resolved", label: "Resolved", icon: CheckCircle },
    { value: "trending", label: "Trending", icon: Flame },
  ];

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
      <div className="flex gap-2 flex-wrap">
        {filters.map((filter) => (
          <Button
            key={filter.value}
            variant={activeFilter === filter.value ? "default" : "outline"}
            size="sm"
            onClick={() => onFilterChange(filter.value)}
            className="gap-2"
            data-testid={`button-filter-${filter.value}`}
          >
            <filter.icon className="h-4 w-4" />
            {filter.label}
          </Button>
        ))}
      </div>
      <div className="relative w-full sm:w-auto">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search markets..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 w-full sm:w-[250px]"
          data-testid="input-search"
        />
      </div>
    </div>
  );
}
