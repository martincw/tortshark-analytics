import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Index from "@/pages/Index";
import AuthPage from "@/pages/AuthPage";
import Dashboard from "@/pages/Dashboard";
import CampaignsPage from "@/pages/CampaignsPage";
import CampaignDetail from "@/pages/CampaignDetail";
import AddCampaignPage from "@/pages/AddCampaignPage";
import BulkStatsPage from "@/pages/BulkStatsPage";
import AccountsPage from "@/pages/AccountsPage";
import IntegrationsPage from "@/pages/IntegrationsPage";
import SettingsPage from "@/pages/SettingsPage";
import ToolsPage from "@/pages/ToolsPage";
import NotFound from "@/pages/NotFound";
import MainLayout from "@/layouts/MainLayout";
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/contexts/AuthContext";
import { CampaignProvider } from "@/contexts/CampaignContext";
import AnalysisPage from "@/pages/AnalysisPage";
import ProfitProjectionsPage from "@/pages/ProfitProjectionsPage";

function App() {
  return (
    <Router>
      <AuthProvider>
        <CampaignProvider>
          <ThemeProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route element={<MainLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/campaigns" element={<CampaignsPage />} />
                <Route path="/campaigns/:id" element={<CampaignDetail />} />
                <Route path="/campaigns/add" element={<AddCampaignPage />} />
                <Route path="/campaigns/projections" element={<ProfitProjectionsPage />} />
                <Route path="/campaigns/bulk-stats" element={<BulkStatsPage />} />
                <Route path="/accounts" element={<AccountsPage />} />
                <Route path="/integrations" element={<IntegrationsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/tools" element={<ToolsPage />} />
                <Route path="/analysis" element={<AnalysisPage />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </ThemeProvider>
        </CampaignProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
