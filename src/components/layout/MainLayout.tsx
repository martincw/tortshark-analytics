
import React from "react";
import { Outlet } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { Navbar } from "./Navbar";
import { useAuth } from "@/contexts/AuthContext";

export function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background antialiased">
      <Navbar />
      <div className="container py-6">
        {children}
      </div>
      <Toaster />
    </div>
  );
}
