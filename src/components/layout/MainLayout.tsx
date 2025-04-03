
import React from "react";
import { Outlet } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { CampaignProvider } from "@/contexts/CampaignContext";
import { Navbar } from "./Navbar";

export function MainLayout() {
  return (
    <div className="min-h-screen bg-background antialiased">
      <Navbar />
      <div className="container py-6">
        <Outlet />
      </div>
      <Toaster />
    </div>
  );
}
