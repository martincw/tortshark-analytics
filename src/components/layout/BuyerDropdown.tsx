
import React from "react";
import { Link } from "react-router-dom";
import { ExternalLink, ChevronDown } from "lucide-react";
import { useBuyers } from "@/hooks/useBuyers";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";

export const BuyerDropdown: React.FC = () => {
  const { buyers, loading, fetchBuyers } = useBuyers();
  
  React.useEffect(() => {
    fetchBuyers();
  }, [fetchBuyers]);
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="flex items-center cursor-pointer">
          Buyers <ChevronDown className="h-3 w-3 ml-1" />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56 bg-popover">
        <DropdownMenuLabel>Buyer Websites</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup className="max-h-[300px] overflow-y-auto">
          {loading ? (
            <DropdownMenuItem disabled>Loading buyers...</DropdownMenuItem>
          ) : buyers.length === 0 ? (
            <DropdownMenuItem disabled>No buyers available</DropdownMenuItem>
          ) : (
            buyers.map((buyer) => (
              buyer.url ? (
                <DropdownMenuItem key={buyer.id} asChild>
                  <a 
                    href={buyer.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center"
                  >
                    {buyer.name}
                    <ExternalLink className="h-3 w-3 ml-2" />
                  </a>
                </DropdownMenuItem>
              ) : null
            )).filter(Boolean) // Filter out null items (buyers without URLs)
          )}
          {buyers.length > 0 && buyers.every(buyer => !buyer.url) && (
            <DropdownMenuItem disabled>No buyer websites available</DropdownMenuItem>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/buyers" className="w-full">
            Manage Buyers
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
