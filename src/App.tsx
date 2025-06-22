
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { WorkspaceProvider } from './contexts/WorkspaceContext';
import { CampaignProvider } from './contexts/CampaignContext';
import Dashboard from './pages/Dashboard';
import CampaignDetail from './pages/CampaignDetail';
import BuyersPage from './pages/BuyersPage';
import SettingsPage from './pages/SettingsPage';
import AuthPage from './pages/AuthPage';
import PrivateRoute from './components/PrivateRoute';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import BulkStatsPage from './pages/BulkStatsPage';
import BulkCaseRevenuePage from './pages/BulkCaseRevenuePage';
import { Toaster } from 'sonner';
import ContractorWorkflowPage from "./pages/ContractorWorkflowPage";

const queryClient = new QueryClient();

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <WorkspaceProvider>
          <CampaignProvider>
            <QueryClientProvider client={queryClient}>
              <Routes>
                <Route path="/login" element={<AuthPage />} />
                <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
                <Route path="/campaign/:id" element={<PrivateRoute><CampaignDetail /></PrivateRoute>} />
                <Route path="/buyers" element={<PrivateRoute><BuyersPage /></PrivateRoute>} />
                <Route path="/settings" element={<PrivateRoute><SettingsPage /></PrivateRoute>} />
                <Route path="/bulk-stats" element={<PrivateRoute><BulkStatsPage /></PrivateRoute>} />
                <Route path="/contractor-workflow" element={<ContractorWorkflowPage />} />
              </Routes>
            </QueryClientProvider>
            <Toaster />
          </CampaignProvider>
        </WorkspaceProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
