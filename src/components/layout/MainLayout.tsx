
import React from "react";
import { Outlet } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { Navbar } from "./Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function MainLayout() {
  const { signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    // No need to navigate - the ProtectedRoute component will handle redirection
  };

  return (
    <div className="min-h-screen bg-background antialiased">
      <Navbar />
      <div className="container py-6">
        <div className="flex justify-end mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
        <Outlet />
      </div>
      <Toaster />
    </div>
  );
}
