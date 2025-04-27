import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CampaignProvider } from "./contexts/CampaignContext";
import { AuthProvider } from "./contexts/AuthContext";
import { MainLayout } from "./components/layout/MainLayout";
import { useAuth } from "./contexts/AuthContext";

// Pages
import Index from "./pages/Index";
import CampaignDetail from "./pages/CampaignDetail";
import CampaignsPage from "./pages/CampaignsPage";
import AddCampaignPage from "./pages/AddCampaignPage";
import AccountsPage from "./pages/AccountsPage";
import IntegrationsPage from "./pages/IntegrationsPage";
import SettingsPage from "./pages/SettingsPage";
import ToolsPage from "./pages/ToolsPage";
import BulkStatsPage from "./pages/BulkStatsPage";
import Dashboard from "./pages/Dashboard";
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound";
import BuyersPage from "./pages/BuyersPage";

const queryClient = new QueryClient();

// Protected route component that redirects to auth page if not authenticated
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();
  
  // While checking authentication status, show nothing or a loading indicator
  if (isLoading) return null;
  
  // If not authenticated, redirect to auth page
  if (!user) return <Navigate to="/auth" replace />;
  
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
              
              {/* All other routes are protected and wrapped with MainLayout */}
              <Route element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }>
                <Route path="/" element={<Index />} />
                <Route path="/campaigns" element={<CampaignsPage />} />
                <Route path="/campaign/:id" element={<CampaignDetail />} />
                <Route path="/add-campaign" element={<AddCampaignPage />} />
                <Route path="/bulk-stats" element={<BulkStatsPage />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/accounts" element={<AccountsPage />} />
                <Route path="/integrations" element={<IntegrationsPage />} />
                <Route path="/tools" element={<ToolsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/buyers" element={<BuyersPage />} />
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
