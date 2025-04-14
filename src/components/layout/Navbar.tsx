
import React, { useState } from "react";
import { Link } from "react-router-dom";
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
import { Menu, Wrench, LogOut, ChartBarIcon, LineChart, Table } from "lucide-react";
import { toast } from "sonner";

interface NavItem {
  href: string;
  label: string;
  icon?: React.ReactNode;
}

const navItems: NavItem[] = [
  { href: "/", label: "Dashboard" },
  { href: "/campaigns", label: "Campaigns" },
  { href: "/bulk-stats", label: "Bulk Stats", icon: <Table className="h-4 w-4 mr-2" /> },
  { href: "/analysis", label: "Analysis", icon: <LineChart className="h-4 w-4 mr-2" /> },
  { href: "/accounts", label: "Accounts" },
  { href: "/integrations", label: "Integrations" },
  { href: "/tools", label: "Tools", icon: <Wrench className="h-4 w-4 mr-2" /> },
];

// Direct logo URL
const LOGO_URL = "https://www.tortsharklaw.com/wp-content/uploads/2023/03/TortShark-Logo.png";

export const Navbar: React.FC = () => {
  const campaignContext = useCampaign();
  const { signOut } = useAuth();
  const { campaigns = [], selectedCampaignIds = [], setSelectedCampaignIds } = campaignContext || {};
  const [logoError, setLogoError] = useState(false);
  
  const handleCampaignSelection = (campaignId: string) => {
    if (!setSelectedCampaignIds) return;
    
    if (selectedCampaignIds.includes(campaignId)) {
      setSelectedCampaignIds(selectedCampaignIds.filter(id => id !== campaignId));
    } else {
      setSelectedCampaignIds([...selectedCampaignIds, campaignId]);
    }
  };

  const isCampaignSelected = (campaignId: string) => {
    return selectedCampaignIds.includes(campaignId);
  };

  const handleLogout = async () => {
    await signOut();
  };

  const handleLogoError = () => {
    console.error("Error loading logo from URL");
    setLogoError(true);
    toast.error("Could not load the logo");
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
                  <Link key={item.href} to={item.href} className="px-4 py-2 rounded-md hover:bg-secondary flex items-center">
                    {item.icon}
                    {item.label}
                  </Link>
                ))}
                
                {campaigns && campaigns.length > 0 && (
                  <div className="border-t pt-4">
                    <p className="text-sm font-medium px-4">Campaign Filters</p>
                    <div className="space-y-2 mt-2">
                      {campaigns.map((campaign) => (
                        <label key={campaign.id} className="flex items-center p-2 rounded-md hover:bg-secondary cursor-pointer">
                          <input
                            type="checkbox"
                            className="mr-2 h-4 w-4"
                            checked={isCampaignSelected(campaign.id)}
                            onChange={() => handleCampaignSelection(campaign.id)}
                          />
                          {campaign.name}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
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
        <nav className="flex items-center space-x-6">
          {navItems.map((item) => (
            <Link 
              key={item.href} 
              to={item.href} 
              className="text-sm font-medium transition-colors hover:text-primary flex items-center"
            >
              {item.icon}
              {item.label}
            </Link>
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
