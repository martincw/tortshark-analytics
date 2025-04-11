
import React from "react";
import { Link } from "react-router-dom";
import { useCampaign } from "@/contexts/CampaignContext";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, Tool } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
}

const navItems: NavItem[] = [
  { href: "/", label: "Dashboard" },
  { href: "/campaigns", label: "Campaigns" },
  { href: "/accounts", label: "Accounts" },
  { href: "/integrations", label: "Integrations" },
  { href: "/tools", label: "Tools" }, // Added Tools page to navigation
];

export const Navbar: React.FC = () => {
  const { campaigns, selectedCampaignIds, setSelectedCampaignIds } = useCampaign();
  
  const handleCampaignSelection = (campaignId: string) => {
    // Fix: Directly create a new array instead of using the callback style
    if (selectedCampaignIds.includes(campaignId)) {
      setSelectedCampaignIds(selectedCampaignIds.filter(id => id !== campaignId));
    } else {
      setSelectedCampaignIds([...selectedCampaignIds, campaignId]);
    }
  };

  const isCampaignSelected = (campaignId: string) => {
    return selectedCampaignIds.includes(campaignId);
  };

  return (
    <div className="border-b bg-background sticky top-0 z-50">
      <div className="flex h-16 items-center px-4">
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
                <Link key={item.href} to={item.href} className="px-4 py-2 rounded-md hover:bg-secondary">
                  {item.label}
                </Link>
              ))}
              
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
            </div>
          </SheetContent>
        </Sheet>
        <Link to="/" className="ml-4 font-bold text-xl">
          Campaign Tracker
        </Link>
        <nav className="ml-auto flex items-center space-x-6">
          {navItems.map((item) => (
            <Link 
              key={item.href} 
              to={item.href} 
              className="text-sm font-medium transition-colors hover:text-primary flex items-center"
            >
              {item.label === "Tools" && <Tool className="h-4 w-4 mr-2" />}
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
};
