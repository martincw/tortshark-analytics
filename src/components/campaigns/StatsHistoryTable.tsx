
import React, { useState } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Edit, 
  Trash2, 
  Calendar,
  Plus,
  ArrowUp,
  ArrowDown
} from "lucide-react";
import { formatCurrency, formatNumber, sortStatHistoryByDate } from "@/utils/campaignUtils";
import { formatSafeDate, isDateInRange } from "@/lib/utils/ManualDateUtils";
import { StatHistoryEntry, DateRange } from "@/types/campaign";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface StatsHistoryTableProps {
  entries: StatHistoryEntry[];
  dateRange: DateRange;
  onEdit: (entry: StatHistoryEntry) => void;
  onDelete: (entryId: string) => void;
  selectedEntries: string[];
  onSelectEntry: (entryId: string) => void;
  onBulkDelete: () => void;
}

export function StatsHistoryTable({
  entries,
  dateRange,
  onEdit,
  onDelete,
  selectedEntries,
  onSelectEntry,
  onBulkDelete
}: StatsHistoryTableProps) {
  const [sortColumn, setSortColumn] = useState<string>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  
  const toggleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("desc");
    }
  };
  
  const sortedEntries = [...entries].sort((a, b) => {
    let comparison = 0;
    
    switch (sortColumn) {
      case "date":
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
        break;
      case "leads":
        comparison = a.leads - b.leads;
        break;
      case "cases":
        comparison = a.cases - b.cases;
        break;
      case "revenue":
        comparison = a.revenue - b.revenue;
        break;
      case "adSpend":
        comparison = (a.adSpend || 0) - (b.adSpend || 0);
        break;
    }
    
    return sortDirection === "asc" ? comparison : -comparison;
  });
  
  const filteredEntries = dateRange.startDate && dateRange.endDate
    ? sortedEntries.filter(entry => 
        isDateInRange(entry.date, dateRange.startDate, dateRange.endDate)
      )
    : sortedEntries;
    
  const isAllSelected = filteredEntries.length > 0 && 
    filteredEntries.every(entry => selectedEntries.includes(entry.id));
    
  const handleSelectAll = () => {
    if (isAllSelected) {
      // Deselect all
      const currentIds = filteredEntries.map(entry => entry.id);
      const newSelected = selectedEntries.filter(id => !currentIds.includes(id));
      selectedEntries.forEach(id => onSelectEntry(id));
    } else {
      // Select all
      filteredEntries.forEach(entry => {
        if (!selectedEntries.includes(entry.id)) {
          onSelectEntry(entry.id);
        }
      });
    }
  };

  return (
    <div className="rounded-md border">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-medium">Stats History</h3>
        <div className="flex items-center gap-2">
          {selectedEntries.length > 0 && (
            <Button 
              variant="destructive" 
              size="sm"
              onClick={onBulkDelete}
              className="h-8 gap-1"
            >
              <Trash2 className="h-4 w-4" />
              Delete {selectedEntries.length} Selected
            </Button>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                Sort by
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => toggleSort("date")}>
                Date {sortColumn === "date" && (sortDirection === "asc" ? "↑" : "↓")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toggleSort("leads")}>
                Leads {sortColumn === "leads" && (sortDirection === "asc" ? "↑" : "↓")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toggleSort("cases")}>
                Cases {sortColumn === "cases" && (sortDirection === "asc" ? "↑" : "↓")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toggleSort("revenue")}>
                Revenue {sortColumn === "revenue" && (sortDirection === "asc" ? "↑" : "↓")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toggleSort("adSpend")}>
                Ad Spend {sortColumn === "adSpend" && (sortDirection === "asc" ? "↑" : "↓")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      <div className="max-h-[400px] overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox 
                  checked={isAllSelected && filteredEntries.length > 0} 
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>
                <div className="flex items-center gap-1 cursor-pointer" onClick={() => toggleSort("date")}>
                  Date
                  {sortColumn === "date" && (
                    sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                  )}
                </div>
              </TableHead>
              <TableHead>
                <div className="flex items-center gap-1 cursor-pointer" onClick={() => toggleSort("leads")}>
                  Leads
                  {sortColumn === "leads" && (
                    sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                  )}
                </div>
              </TableHead>
              <TableHead>
                <div className="flex items-center gap-1 cursor-pointer" onClick={() => toggleSort("cases")}>
                  Cases
                  {sortColumn === "cases" && (
                    sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                  )}
                </div>
              </TableHead>
              <TableHead>
                <div className="flex items-center gap-1 cursor-pointer" onClick={() => toggleSort("revenue")}>
                  Revenue
                  {sortColumn === "revenue" && (
                    sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                  )}
                </div>
              </TableHead>
              <TableHead>
                <div className="flex items-center gap-1 cursor-pointer" onClick={() => toggleSort("adSpend")}>
                  Ad Spend
                  {sortColumn === "adSpend" && (
                    sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                  )}
                </div>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEntries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No stats entries found for the selected date range
                </TableCell>
              </TableRow>
            ) : (
              filteredEntries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>
                    <Checkbox 
                      checked={selectedEntries.includes(entry.id)}
                      onCheckedChange={() => onSelectEntry(entry.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                      {formatSafeDate(entry.date, "MMM d, yyyy")}
                    </div>
                  </TableCell>
                  <TableCell>{formatNumber(entry.leads)}</TableCell>
                  <TableCell>{formatNumber(entry.cases)}</TableCell>
                  <TableCell>{formatCurrency(entry.revenue)}</TableCell>
                  <TableCell>{formatCurrency(entry.adSpend || 0)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onEdit(entry)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => onDelete(entry.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
