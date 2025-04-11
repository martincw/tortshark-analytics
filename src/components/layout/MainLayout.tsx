
import React from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { CampaignProvider } from "@/contexts/CampaignContext";
import { Navbar } from "./Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogIn, LogOut } from "lucide-react";

export function MainLayout() {
  const { user, signOut, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleAuthAction = async () => {
    if (user) {
      await signOut();
      navigate("/");
    } else {
      navigate("/auth");
    }
  };

  return (
    <div className="min-h-screen bg-background antialiased">
      <Navbar />
      <div className="container py-6">
        <div className="flex justify-end mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleAuthAction}
            disabled={isLoading}
          >
            {user ? (
              <>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4 mr-2" />
                Login
              </>
            )}
          </Button>
        </div>
        <Outlet />
      </div>
      <Toaster />
    </div>
  );
}
