
import React from "react";
import { Outlet } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";

export function MainLayout() {
  return (
    <div className="min-h-screen bg-background antialiased">
      <div className="container py-6">
        <Outlet />
      </div>
      <Toaster />
    </div>
  );
}

export default MainLayout;
