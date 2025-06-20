import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { WorkspaceProvider } from './contexts/WorkspaceContext';
import { CampaignProvider } from './contexts/CampaignContext';
import Dashboard from './pages/Dashboard';
import CampaignDetails from './pages/CampaignDetails';
import BuyersPage from './pages/BuyersPage';
import SettingsPage from './pages/SettingsPage';
import LoginPage from './pages/LoginPage';
import PrivateRoute from './components/PrivateRoute';
import { QueryClient } from 'react-query';
import BulkStatsPage from './pages/BulkStatsPage';
import { Toaster } from 'sonner';
import ContractorWorkflowPage from "./pages/ContractorWorkflowPage";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <WorkspaceProvider>
          <CampaignProvider>
            <QueryClient>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
                <Route path="/campaign/:id" element={<PrivateRoute><CampaignDetails /></PrivateRoute>} />
                <Route path="/buyers" element={<PrivateRoute><BuyersPage /></PrivateRoute>} />
                <Route path="/settings" element={<PrivateRoute><SettingsPage /></PrivateRoute>} />
                <Route path="/bulk-stats" element={<PrivateRoute><BulkStatsPage /></PrivateRoute>} />
                <Route path="/contractor-workflow" element={<ContractorWorkflowPage />} />
              </Routes>
            </QueryClient>
            <Toaster />
          </CampaignProvider>
        </WorkspaceProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
