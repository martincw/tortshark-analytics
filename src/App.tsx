
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CampaignProvider } from "./contexts/CampaignContext";
import { AuthProvider } from "./contexts/AuthContext";
import { WorkspaceProvider } from "./contexts/WorkspaceContext";
import { MainLayout } from "./components/layout/MainLayout";
import { useAuth } from "./contexts/AuthContext";
import { useState, useEffect } from "react";
import { InvitationAccepter } from "./components/team/InvitationAccepter";

// Pages
import Index from "./pages/Index";
import CampaignDetail from "./pages/CampaignDetail";
import CampaignsPage from "./pages/CampaignsPage";
import AddCampaignPage from "./pages/AddCampaignPage";
import AccountsPage from "./pages/AccountsPage";
import DataSourcesPage from "./pages/DataSourcesPage";
import SettingsPage from "./pages/SettingsPage";
import BulkStatsPage from "./pages/BulkStatsPage";
import DailyStatsPage from "./pages/DailyStatsPage";
import Dashboard from "./pages/Dashboard";
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound";
import BuyersPage from "./pages/BuyersPage";
import LeadsPage from "./pages/LeadsPage";
import TeamSettingsPage from "./pages/TeamSettingsPage";
import StatsWorkflowPage from "./pages/StatsWorkflowPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      retryDelay: 1000,
    },
  },
});

// Protected route component with better handling of authentication state
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  
  // Show loading indicator while checking authentication status
  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  // If not authenticated, redirect to auth page with return path
  if (!isAuthenticated) {
    console.log("User not authenticated, redirecting to auth with returnTo path:", location.pathname + location.search);
    return <Navigate to={`/auth?returnTo=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }
  
  console.log("User authenticated, rendering protected route");
  // If authenticated, render the children
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <WorkspaceProvider>
          <CampaignProvider>
            <BrowserRouter>
              <Routes>
                {/* Auth page is public */}
                <Route path="/auth" element={<AuthPage />} />
                
                {/* Handle workspace invitations */}
                <Route path="/invite" element={<InvitationAccepter />} />
                
                {/* Redirect /campaign to /campaigns to fix 404 issues */}
                <Route path="/campaign" element={<Navigate to="/campaigns" replace />} />
                
                {/* Redirect /integrations to /data-sources */}
                <Route path="/integrations" element={<Navigate to="/data-sources" replace />} />
                
                {/* All other routes are protected and wrapped with MainLayout */}
                <Route element={
                  <ProtectedRoute>
                    <MainLayout />
                  </ProtectedRoute>
                }>
                  <Route path="/" element={<Index />} />
                  <Route path="/campaign/:id" element={<CampaignDetail />} />
                  <Route path="/campaigns" element={<CampaignsPage />} />
                  <Route path="/add-campaign" element={<AddCampaignPage />} />
                  <Route path="/bulk-stats" element={<BulkStatsPage />} />
                  <Route path="/daily-stats" element={<DailyStatsPage />} />
                  <Route path="/stats-workflow" element={<StatsWorkflowPage />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/accounts" element={<AccountsPage />} />
                  <Route path="/data-sources" element={<DataSourcesPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/team-settings" element={<TeamSettingsPage />} />
                  <Route path="/buyers" element={<BuyersPage />} />
                  <Route path="/leads" element={<LeadsPage />} /> 
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Routes>
            </BrowserRouter>
            <Toaster />
            <Sonner />
          </CampaignProvider>
        </WorkspaceProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
