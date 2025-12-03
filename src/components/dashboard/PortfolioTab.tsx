import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, CalendarIcon, LayoutGrid, List } from "lucide-react";
import { usePortfolio } from "@/hooks/usePortfolio";
import { AddBackendCaseDialog } from "./AddBackendCaseDialog";
import { PortfolioCampaignCard } from "./portfolio/PortfolioCampaignCard";
import { PortfolioSummaryCards } from "./portfolio/PortfolioSummaryCards";
import { useCampaign } from "@/contexts/CampaignContext";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const PortfolioTab = () => {
  const { 
    portfolioData, 
    summary, 
    isLoading, 
    dateRange, 
    setDateRange, 
    fetchPortfolioData,
    updatePortfolioSettings,
    toggleCampaignEnabled
  } = usePortfolio();
  const { campaigns } = useCampaign();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const clearDateRange = () => {
    setDateRange({ from: undefined, to: undefined });
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <PortfolioSummaryCards summary={summary} />

      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Case Portfolio</CardTitle>
              <CardDescription>
                Toggle campaigns to include/exclude from portfolio calculations
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* View Toggle */}
              <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as "grid" | "list")}>
                <ToggleGroupItem value="grid" aria-label="Grid view" size="sm">
                  <LayoutGrid className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="list" aria-label="List view" size="sm">
                  <List className="h-4 w-4" />
                </ToggleGroupItem>
              </ToggleGroup>

              {/* Date Range Filter */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn(
                    "justify-start text-left font-normal",
                    !dateRange.from && "text-muted-foreground"
                  )}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "LLL dd")} - {format(dateRange.to, "LLL dd")}
                        </>
                      ) : (
                        format(dateRange.from, "LLL dd, y")
                      )
                    ) : (
                      "Date Range"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange.from}
                    selected={{ from: dateRange.from, to: dateRange.to }}
                    onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
                    numberOfMonths={2}
                  />
                  {(dateRange.from || dateRange.to) && (
                    <div className="p-2 border-t">
                      <Button variant="ghost" size="sm" onClick={clearDateRange} className="w-full">
                        Clear Filter
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>

              <Button onClick={() => setIsAddDialogOpen(true)} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Cases
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <p className="text-muted-foreground">Loading portfolio data...</p>
            </div>
          ) : portfolioData.length === 0 ? (
            <div className="flex flex-col justify-center items-center h-32 text-center">
              <p className="text-muted-foreground mb-4">No campaigns found</p>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {portfolioData.map((item) => (
                <PortfolioCampaignCard
                  key={item.campaignId}
                  portfolio={item}
                  isEnabled={item.isEnabled}
                  onToggle={toggleCampaignEnabled}
                  onSettingsUpdate={updatePortfolioSettings}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {portfolioData.map((item) => (
                <PortfolioCampaignCard
                  key={item.campaignId}
                  portfolio={item}
                  isEnabled={item.isEnabled}
                  onToggle={toggleCampaignEnabled}
                  onSettingsUpdate={updatePortfolioSettings}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AddBackendCaseDialog
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        campaigns={campaigns}
        onCaseAdded={fetchPortfolioData}
      />
    </div>
  );
};

export default PortfolioTab;
