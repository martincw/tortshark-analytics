
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Filter } from "lucide-react";
import { useState } from "react";

export function BuyerFilterMenu() {
  const [platformFilter, setPlatformFilter] = useState<string[]>([]);
  
  // This is a stub component - in a real implementation, it would apply the filters
  // to the buyers list. For now, it's just UI scaffolding.
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="w-10">
          <Filter className="h-4 w-4" />
          <span className="sr-only">Filter</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Filter By</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Platform</DropdownMenuLabel>
        <DropdownMenuCheckboxItem
          checked={platformFilter.includes("email")}
          onCheckedChange={(checked) => {
            checked
              ? setPlatformFilter([...platformFilter, "email"])
              : setPlatformFilter(platformFilter.filter((p) => p !== "email"));
          }}
        >
          Email
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={platformFilter.includes("sms")}
          onCheckedChange={(checked) => {
            checked
              ? setPlatformFilter([...platformFilter, "sms"])
              : setPlatformFilter(platformFilter.filter((p) => p !== "sms"));
          }}
        >
          SMS
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={platformFilter.includes("telegram")}
          onCheckedChange={(checked) => {
            checked
              ? setPlatformFilter([...platformFilter, "telegram"])
              : setPlatformFilter(platformFilter.filter((p) => p !== "telegram"));
          }}
        >
          Telegram
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
