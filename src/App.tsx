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
import { AccountTypeProvider } from "./contexts/AccountTypeContext";
import { ContractorLayout } from "./components/layout/ContractorLayout";
import { useAccountType } from "./contexts/AccountTypeContext";

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
import ContractorBulkEntry from "./pages/ContractorBulkEntry";
import ContractorSubmissionsPage from "./pages/ContractorSubmissionsPage";
import CasesRevenueEntryPage from "./pages/CasesRevenueEntryPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      retryDelay: 1000,
    },
  },
});

// Enhanced ProtectedRoute with contractor handling
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

// Contractor route wrapper
const ContractorRoute = ({ children }: { children: React.ReactNode }) => {
  const { accountType, isLoading } = useAccountType();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  // If contractor trying to access non-daily-stats page, redirect
  if (accountType === 'contractor' && location.pathname !== '/daily-stats') {
    return <Navigate to="/daily-stats" replace />;
  }

  // If contractor, use contractor layout
  if (accountType === 'contractor') {
    return <ContractorLayout>{children}</ContractorLayout>;
  }

  // For non-contractors, use regular layout
  return <MainLayout>{children}</MainLayout>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <AccountTypeProvider>
          <WorkspaceProvider>
            <CampaignProvider>
              <BrowserRouter>
                <Routes>
                  {/* Auth page is public */}
                  <Route path="/auth" element={<AuthPage />} />
                  
                  {/* Public contractor bulk entry page - no authentication required */}
                  <Route path="/bulk-entry" element={<ContractorBulkEntry />} />
                  
                  {/* Handle workspace invitations */}
                  <Route path="/invite" element={<InvitationAccepter />} />
                  
                  {/* Redirect /campaign to /campaigns to fix 404 issues */}
                  <Route path="/campaign" element={<Navigate to="/campaigns" replace />} />
                  
                  {/* Redirect /integrations to /data-sources */}
                  <Route path="/integrations" element={<Navigate to="/data-sources" replace />} />
                  
                  {/* All other routes are protected and wrapped with ContractorRoute */}
                  <Route path="/" element={
                    <ProtectedRoute>
                      <ContractorRoute>
                        <Index />
                      </ContractorRoute>
                    </ProtectedRoute>
                  } />
                  <Route path="/campaign/:id" element={
                    <ProtectedRoute>
                      <ContractorRoute>
                        <CampaignDetail />
                      </ContractorRoute>
                    </ProtectedRoute>
                  } />
                  <Route path="/campaigns" element={
                    <ProtectedRoute>
                      <ContractorRoute>
                        <CampaignsPage />
                      </ContractorRoute>
                    </ProtectedRoute>
                  } />
                  <Route path="/add-campaign" element={
                    <ProtectedRoute>
                      <ContractorRoute>
                        <AddCampaignPage />
                      </ContractorRoute>
                    </ProtectedRoute>
                  } />
                  <Route path="/bulk-stats" element={
                    <ProtectedRoute>
                      <ContractorRoute>
                        <BulkStatsPage />
                      </ContractorRoute>
                    </ProtectedRoute>
                  } />
                  <Route path="/daily-stats" element={
                    <ProtectedRoute>
                      <ContractorRoute>
                        <DailyStatsPage />
                      </ContractorRoute>
                    </ProtectedRoute>
                  } />
                  <Route path="/stats-workflow" element={
                    <ProtectedRoute>
                      <ContractorRoute>
                        <StatsWorkflowPage />
                      </ContractorRoute>
                    </ProtectedRoute>
                  } />
                  <Route path="/dashboard" element={
                    <ProtectedRoute>
                      <ContractorRoute>
                        <Dashboard />
                      </ContractorRoute>
                    </ProtectedRoute>
                  } />
                  <Route path="/accounts" element={
                    <ProtectedRoute>
                      <ContractorRoute>
                        <AccountsPage />
                      </ContractorRoute>
                    </ProtectedRoute>
                  } />
                  <Route path="/data-sources" element={
                    <ProtectedRoute>
                      <ContractorRoute>
                        <DataSourcesPage />
                      </ContractorRoute>
                    </ProtectedRoute>
                  } />
                  <Route path="/settings" element={
                    <ProtectedRoute>
                      <ContractorRoute>
                        <SettingsPage />
                      </ContractorRoute>
                    </ProtectedRoute>
                  } />
                  <Route path="/team-settings" element={
                    <ProtectedRoute>
                      <ContractorRoute>
                        <TeamSettingsPage />
                      </ContractorRoute>
                    </ProtectedRoute>
                  } />
                  <Route path="/contractor-submissions" element={
                    <ProtectedRoute>
                      <ContractorRoute>
                        <ContractorSubmissionsPage />
                      </ContractorRoute>
                    </ProtectedRoute>
                  } />
                  <Route path="/cases-revenue-entry" element={
                    <ProtectedRoute>
                      <ContractorRoute>
                        <CasesRevenueEntryPage />
                      </ContractorRoute>
                    </ProtectedRoute>
                  } />
                  <Route path="/buyers" element={
                    <ProtectedRoute>
                      <ContractorRoute>
                        <BuyersPage />
                      </ContractorRoute>
                    </ProtectedRoute>
                  } />
                  <Route path="/leads" element={
                    <ProtectedRoute>
                      <ContractorRoute>
                        <LeadsPage />
                      </ContractorRoute>
                    </ProtectedRoute>
                  } />
                  <Route path="*" element={
                    <ProtectedRoute>
                      <ContractorRoute>
                        <NotFound />
                      </ContractorRoute>
                    </ProtectedRoute>
                  } />
                </Routes>
              </BrowserRouter>
              <Toaster />
              <Sonner />
            </CampaignProvider>
          </WorkspaceProvider>
        </AccountTypeProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
