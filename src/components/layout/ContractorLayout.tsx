
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ContractorLayoutProps {
  children: React.ReactNode;
}

export const ContractorLayout: React.FC<ContractorLayoutProps> = ({ children }) => {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast.error("Error signing out");
        console.error("Error signing out:", error);
      } else {
        navigate("/auth");
      }
    } catch (error) {
      toast.error("Error signing out");
      console.error("Error signing out:", error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Simplified Header for Contractors */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link to="/daily-stats" className="flex items-center space-x-2">
              <img 
                src="/assets/tortshark-logo.png" 
                alt="TortShark" 
                className="h-8 w-8"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <span className="text-xl font-bold">TortShark</span>
            </Link>
            <span className="text-sm text-muted-foreground">Daily Stats Entry</span>
          </div>
          
          <Button variant="ghost" onClick={handleSignOut} className="flex items-center space-x-2">
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
};
