
import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useCampaign } from "@/contexts/CampaignContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { 
  Menu, 
  Wrench, 
  LogOut, 
  ChartBarIcon, 
  Table, 
  CalendarIcon,
  DatabaseIcon,
  LinkIcon,
  WalletCards,
  ExternalLink,
  ChevronDown
} from "lucide-react";
import { toast } from "sonner";
import { useBuyers } from "@/hooks/useBuyers";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavItem {
  href: string;
  label: string;
  icon?: React.ReactNode;
  priority?: boolean;
  external?: boolean;
  dropdown?: boolean;
}

const navItems: NavItem[] = [
  { href: "/", label: "Overview" },
  { href: "/dashboard", label: "Daily Dashboard", icon: <CalendarIcon className="h-4 w-4 mr-2" />, priority: true },
  { href: "/accounts", label: "Accounts" },
  { href: "/buyers", label: "Buyers", dropdown: true },
  { href: "https://app.relayfi.com/login", label: "Banking", icon: <WalletCards className="h-4 w-4 mr-2" />, external: true },
  { href: "https://app.leadprosper.io/dashboard", label: "LeadProsper", icon: <ExternalLink className="h-4 w-4 mr-2" />, external: true },
];

const LOGO_URL = "https://www.digitalnomad.com/wp-content/uploads/2025/04/TortShark-Logo.webp";

export const Navbar: React.FC = () => {
  const location = useLocation();
  const { signOut } = useAuth();
  const [logoError, setLogoError] = useState(false);
  const { buyers, loading, fetchBuyers } = useBuyers();
  
  useEffect(() => {
    fetchBuyers();
  }, [fetchBuyers]);
  
  const handleLogout = async () => {
    await signOut();
  };

  const handleLogoError = () => {
    console.error("Error loading logo from URL");
    setLogoError(true);
    toast.error("Could not load the logo");
  };

  const isActive = (href: string) => location.pathname === href;

  const BuyerDropdown = () => {
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

  return (
    <div className="border-b bg-background sticky top-0 z-50">
      <div className="flex h-16 items-center px-4 justify-between">
        <div className="flex items-center">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="pr-0">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
                <SheetDescription>
                  Manage your campaigns and account settings from here.
                </SheetDescription>
              </SheetHeader>
              <div className="grid gap-4 py-4">
                {navItems.map((item) => (
                  item.external ? (
                    <a 
                      key={item.href}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`px-4 py-2 rounded-md hover:bg-secondary flex items-center ${
                        item.priority ? "text-primary font-medium" : ""
                      }`}
                    >
                      {item.icon}
                      {item.label}
                      {item.priority && <span className="ml-2 text-xs px-2 py-0.5 bg-primary/10 rounded-full">New</span>}
                    </a>
                  ) : item.dropdown ? (
                    <div key={item.href} className="px-4 py-2 rounded-md hover:bg-secondary">
                      <Link to={item.href} className="font-medium">
                        {item.label}
                      </Link>
                      <div className="mt-2 pl-4 space-y-1">
                        {!loading && buyers.filter(buyer => buyer.url).map((buyer) => (
                          <a 
                            key={buyer.id}
                            href={buyer.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm flex items-center py-1 hover:text-primary"
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            {buyer.name}
                          </a>
                        ))}
                        {(!loading && buyers.filter(buyer => buyer.url).length === 0) && (
                          <span className="text-xs text-muted-foreground">No buyer websites available</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <Link 
                      key={item.href} 
                      to={item.href} 
                      className={`px-4 py-2 rounded-md hover:bg-secondary flex items-center ${
                        isActive(item.href) ? "bg-secondary font-medium" : ""
                      } ${item.priority ? "text-primary font-medium" : ""}`}
                    >
                      {item.icon}
                      {item.label}
                      {item.priority && <span className="ml-2 text-xs px-2 py-0.5 bg-primary/10 rounded-full">New</span>}
                    </Link>
                  )
                ))}
                
                <Link 
                  to="/bulk-stats" 
                  className={`px-4 py-2 rounded-md hover:bg-secondary flex items-center ${
                    isActive("/bulk-stats") ? "bg-secondary font-medium" : ""
                  }`}
                >
                  <Table className="h-4 w-4 mr-2" />
                  Bulk Stats
                </Link>
                <Link 
                  to="/integrations" 
                  className={`px-4 py-2 rounded-md hover:bg-secondary flex items-center ${
                    isActive("/integrations") ? "bg-secondary font-medium" : ""
                  }`}
                >
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Integrations
                </Link>
              </div>
            </SheetContent>
          </Sheet>
          <Link to="/" className="ml-4">
            {logoError ? (
              <div className="h-8 px-2 flex items-center text-primary font-bold">TortShark</div>
            ) : (
              <img 
                src={LOGO_URL} 
                alt="TortShark Logo" 
                className="h-8"
                onError={handleLogoError}
              />
            )}
          </Link>
        </div>
        <nav className="md:flex items-center space-x-4 hidden">
          {navItems.filter(item => item.priority).map((item) => (
            item.external ? (
              <a
                key={item.href}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`text-sm font-medium transition-colors hover:text-primary flex items-center px-3 py-1.5 rounded-md`}
              >
                {item.icon}
                {item.label}
              </a>
            ) : (
              <Link 
                key={item.href} 
                to={item.href} 
                className={`text-sm font-medium transition-colors hover:text-primary flex items-center px-3 py-1.5 rounded-md ${
                  isActive(item.href) ? "bg-primary/10 text-primary" : ""
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            )
          ))}
          <div className="h-6 border-r mx-2"></div>
          {navItems.filter(item => !item.priority).map((item) => (
            item.external ? (
              <a
                key={item.href}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`text-sm transition-colors hover:text-primary flex items-center text-muted-foreground`}
              >
                {item.icon}
                {item.label}
              </a>
            ) : item.dropdown ? (
              <div key={item.href} className="text-sm transition-colors hover:text-primary flex items-center relative">
                <BuyerDropdown />
              </div>
            ) : (
              <Link 
                key={item.href} 
                to={item.href} 
                className={`text-sm transition-colors hover:text-primary flex items-center ${
                  isActive(item.href) ? "font-medium text-primary" : "text-muted-foreground"
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            )
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="flex items-center"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </nav>
      </div>
    </div>
  );
};
