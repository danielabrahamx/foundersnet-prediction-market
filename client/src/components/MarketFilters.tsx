import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, TrendingUp, CheckCircle, Flame, ArrowDownWideNarrow } from "lucide-react";
import type { MarketFilter } from "@/types/market";

export type MarketSort = "newest" | "liquidity" | "volume";

interface MarketFiltersProps {
  activeFilter: MarketFilter;
  onFilterChange: (filter: MarketFilter) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeSort?: MarketSort;
  onSortChange?: (sort: MarketSort) => void;
}

export function MarketFilters({
  activeFilter,
  onFilterChange,
  searchQuery,
  onSearchChange,
  activeSort = "newest",
  onSortChange,
}: MarketFiltersProps) {
  const filters: { value: MarketFilter; label: string; icon: typeof TrendingUp }[] = [
    { value: "active", label: "Active", icon: TrendingUp },
    { value: "resolved", label: "Resolved", icon: CheckCircle },
    { value: "trending", label: "Trending", icon: Flame },
  ];

  const sortOptions: { value: MarketSort; label: string }[] = [
    { value: "newest", label: "Newest" },
    { value: "liquidity", label: "Highest Liquidity" },
    { value: "volume", label: "Highest Volume" },
  ];

  return (
    <div className="flex flex-col gap-4">
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
        <div className="flex gap-2 items-center w-full sm:w-auto">
          {onSortChange && (
            <Select value={activeSort} onValueChange={(value) => onSortChange(value as MarketSort)}>
              <SelectTrigger className="w-[160px]" data-testid="select-sort">
                <ArrowDownWideNarrow className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search markets..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 w-full sm:w-[200px]"
              data-testid="input-search"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
