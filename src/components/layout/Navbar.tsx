import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAccountType } from "@/contexts/AccountTypeContext";
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
  LayoutDashboard,
  CalendarIcon,
  CreditCard,
  Users,
  ListFilter,
  Link as LinkIcon,
} from "lucide-react";
import { toast } from "sonner";
import { SidebarMenu } from "./SidebarMenu";
import { NavItem } from "@/types/navigation";
import { WorkspaceSelector } from "../workspace/WorkspaceSelector";
import { useWorkspace } from "@/contexts/WorkspaceContext";

// Main navigation items (excluding external links that will only be in sidebar)
const navItems: NavItem[] = [
  { href: "/", label: "Overview", icon: <LayoutDashboard className="h-4 w-4 mr-2" /> },
  { href: "/dashboard", label: "Daily Dashboard", icon: <CalendarIcon className="h-4 w-4 mr-2" />, priority: true },
  { href: "/accounts", label: "Accounts", icon: <CreditCard className="h-4 w-4 mr-2" /> },
  { href: "/buyers", label: "Buyers", icon: <Users className="h-4 w-4 mr-2" /> },
  { href: "/leads", label: "Leads", icon: <ListFilter className="h-4 w-4 mr-2" /> },
  { href: "/data-sources", label: "Data Sources", icon: <LinkIcon className="h-4 w-4 mr-2" /> },
];

// Team and settings items - still needed for sidebar, but moved to sidebar
const teamNavItems: NavItem[] = [
  { href: "/team-settings", label: "Team", icon: <Users className="h-4 w-4 mr-2" /> },
  { href: "/settings", label: "Settings", icon: <LinkIcon className="h-4 w-4 mr-2" /> },
];

// External links that will only appear in sidebar
export const externalNavItems: NavItem[] = [
  { href: "https://app.relayfi.com/login", label: "Banking", external: true },
  { href: "https://app.leadprosper.io/dashboard", label: "LeadProsper", external: true },
  { href: "https://robby2dff4b-app.clickfunnels.com/funnels", label: "Clickfunnels", external: true },
];

const LOGO_URL = "https://www.digitalnomad.com/wp-content/uploads/2025/04/TortShark-Logo.webp";

export const Navbar: React.FC = () => {
  const location = useLocation();
  const { signOut } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const { accountType } = useAccountType();
  const navigate = useNavigate();
  const [logoError, setLogoError] = useState(false);
  
  const handleSignOut = async () => {
    await signOut();
  };

  const handleLogoError = () => {
    console.error("Error loading logo from URL");
    setLogoError(true);
    toast.error("Could not load the logo");
  };

  const isActive = (href: string) => location.pathname === href;

  // Don't render navbar for contractors (they use ContractorLayout)
  if (accountType === 'contractor') {
    return null;
  }

  // Create a simple NavItems component for rendering
  const NavItems = ({ items, isActive, priority }: { items: NavItem[]; isActive: (href: string) => boolean; priority?: boolean }) => {
    const filteredItems = priority !== undefined ? items.filter(item => !!item.priority === priority) : items;
    
    return (
      <>
        {filteredItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              isActive(item.href)
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </>
    );
  };

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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
              <SidebarMenu 
                navItems={[...navItems, ...teamNavItems]}
                externalNavItems={externalNavItems} 
                isActive={isActive} 
              />
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
          
          {/* Add Workspace Selector */}
          <WorkspaceSelector />
        </div>
        <nav className="md:flex items-center space-x-4 hidden">
          <NavItems items={navItems} isActive={isActive} priority={true} />
          <div className="h-6 border-r mx-2"></div>
          <NavItems items={navItems} isActive={isActive} priority={false} />
          
          {/* Team settings menu removed from here */}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="flex items-center"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </nav>
      </div>
    </nav>
  );
};
