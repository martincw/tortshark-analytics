
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CampaignProvider } from "./contexts/CampaignContext";
import { AuthProvider } from "./contexts/AuthContext";
import { MainLayout } from "./components/layout/MainLayout";
import { useAuth } from "./contexts/AuthContext";
import { useState, useEffect } from "react";

// Pages
import Index from "./pages/Index";
import CampaignDetail from "./pages/CampaignDetail";
import CampaignsPage from "./pages/CampaignsPage";
import AddCampaignPage from "./pages/AddCampaignPage";
import AccountsPage from "./pages/AccountsPage";
import DataSourcesPage from "./pages/DataSourcesPage";
import SettingsPage from "./pages/SettingsPage";
import BulkStatsPage from "./pages/BulkStatsPage";
import Dashboard from "./pages/Dashboard";
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound";
import BuyersPage from "./pages/BuyersPage";
import LeadsPage from "./pages/LeadsPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      retryDelay: 1000,
    },
  },
});

// Protected route component that redirects to auth page if not authenticated
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading, authError } = useAuth();
  const [isChecking, setIsChecking] = useState(true);
  
  useEffect(() => {
    // Add a short timeout to ensure auth check completes
    const timer = setTimeout(() => {
      setIsChecking(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [user, isLoading]);
  
  // While checking authentication status, show a simple loading indicator
  if (isLoading || isChecking) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  // If there's an auth error that's not just an expired session, log it
  if (authError && !authError.includes("Invalid Refresh Token") && !authError.includes("not found")) {
    console.error("Authentication error in protected route:", authError);
  }
  
  // If not authenticated, redirect to auth page
  if (!user) {
    console.log("User not authenticated, redirecting to auth page");
    return <Navigate to="/auth" replace />;
  }
  
  console.log("User authenticated, rendering protected route");
  // If authenticated, render the children
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <CampaignProvider>
          <BrowserRouter>
            <Routes>
              {/* Auth page is public */}
              <Route path="/auth" element={<AuthPage />} />
              
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
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/accounts" element={<AccountsPage />} />
                <Route path="/data-sources" element={<DataSourcesPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/buyers" element={<BuyersPage />} />
                <Route path="/leads" element={<LeadsPage />} /> 
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </BrowserRouter>
          <Toaster />
          <Sonner />
        </CampaignProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
