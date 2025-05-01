
import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
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
  LogOut, 
  WalletCards,
  ExternalLink,
  CalendarIcon,
} from "lucide-react";
import { toast } from "sonner";
import { SidebarMenu } from "./SidebarMenu";
import { NavItems } from "./NavItems";
import { NavItem } from "@/types/navigation";

const navItems: NavItem[] = [
  { href: "/", label: "Campaigns" },
  { href: "/dashboard", label: "Daily Dashboard", icon: <CalendarIcon className="h-4 w-4 mr-2" />, priority: true },
  { href: "/accounts", label: "Accounts" },
  { href: "/buyers", label: "Buyers" },
  { href: "https://app.relayfi.com/login", label: "Banking", icon: <WalletCards className="h-4 w-4 mr-2" />, external: true },
  { href: "https://app.leadprosper.io/dashboard", label: "LeadProsper", icon: <ExternalLink className="h-4 w-4 mr-2" />, external: true },
];

const LOGO_URL = "https://www.digitalnomad.com/wp-content/uploads/2025/04/TortShark-Logo.webp";

export const Navbar: React.FC = () => {
  const location = useLocation();
  const { signOut } = useAuth();
  const [logoError, setLogoError] = useState(false);
  
  const handleLogout = async () => {
    await signOut();
  };

  const handleLogoError = () => {
    console.error("Error loading logo from URL");
    setLogoError(true);
    toast.error("Could not load the logo");
  };

  const isActive = (href: string) => location.pathname === href;

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
              <SidebarMenu navItems={navItems} isActive={isActive} />
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
          <NavItems items={navItems} isActive={isActive} priority={true} />
          <div className="h-6 border-r mx-2"></div>
          <NavItems items={navItems} isActive={isActive} priority={false} />
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
