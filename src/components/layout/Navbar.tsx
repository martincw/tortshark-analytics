
import React, { useEffect, useState } from "react";
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
import { Menu, Wrench, LogOut } from "lucide-react";
import { getPublicUrl } from "@/services/storageService";
import { uploadLogoToStorage } from "@/utils/uploadLogoUtil";
import { toast } from "sonner";

interface NavItem {
  href: string;
  label: string;
}

const navItems: NavItem[] = [
  { href: "/", label: "Dashboard" },
  { href: "/campaigns", label: "Campaigns" },
  { href: "/accounts", label: "Accounts" },
  { href: "/integrations", label: "Integrations" },
  { href: "/tools", label: "Tools" },
];

export const Navbar: React.FC = () => {
  const campaignContext = useCampaign();
  const { signOut } = useAuth();
  const { campaigns = [], selectedCampaignIds = [], setSelectedCampaignIds } = campaignContext || {};
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isLogoLoading, setIsLogoLoading] = useState(true);
  
  useEffect(() => {
    const fetchLogo = async () => {
      try {
        setIsLogoLoading(true);
        // Get the logo URL from Supabase storage
        const logoPath = "tortshark-logo.png";
        
        // Check if the logo exists first
        const url = getPublicUrl("assets", logoPath);
        
        // Test if the URL is valid by trying to fetch it
        const response = await fetch(url, { method: 'HEAD' });
        
        if (response.ok) {
          console.log("Logo found in storage:", url);
          setLogoUrl(url);
        } else {
          console.log("Logo not found in storage, uploading...");
          // If the logo doesn't exist, upload it
          const uploadSuccess = await uploadLogoToStorage();
          
          if (uploadSuccess) {
            // Get the URL again after upload
            const newUrl = getPublicUrl("assets", logoPath);
            setLogoUrl(newUrl);
            console.log("Logo uploaded successfully, new URL:", newUrl);
          } else {
            console.error("Failed to upload logo");
            // Fallback to the original image if upload fails
            setLogoUrl("/assets/tortshark-logo.png");
          }
        }
      } catch (error) {
        console.error("Error loading logo:", error);
        toast.error("Could not load the logo");
        // Fallback to the original image on error
        setLogoUrl("/assets/tortshark-logo.png");
      } finally {
        setIsLogoLoading(false);
      }
    };
    
    fetchLogo();
  }, []);
  
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
                  <Link key={item.href} to={item.href} className="px-4 py-2 rounded-md hover:bg-secondary">
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
            {isLogoLoading ? (
              <div className="h-8 w-32 bg-secondary animate-pulse rounded"></div>
            ) : logoUrl ? (
              <img 
                src={logoUrl} 
                alt="TortShark Logo" 
                className="h-8"
                onError={(e) => {
                  console.error("Image failed to load:", e);
                  // Fallback to static asset if Supabase image fails
                  const imgElement = e.target as HTMLImageElement;
                  imgElement.src = "/assets/tortshark-logo.png";
                }}
              />
            ) : (
              <div className="h-8 w-32 bg-secondary animate-pulse rounded"></div>
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
              {item.label === "Tools" && <Wrench className="h-4 w-4 mr-2" />}
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
