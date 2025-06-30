
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from "sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { AccountTypeProvider } from "@/contexts/AccountTypeContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Navbar } from "@/components/layout/Navbar";
import { ContractorLayout } from "@/components/layout/ContractorLayout";

// Pages
import HomePage from "@/pages/HomePage";
import DashboardPage from "@/pages/DashboardPage";
import BuyersPage from "@/pages/BuyersPage";
import BulkStatsPage from "@/pages/BulkStatsPage";
import DailyStatsPage from "@/pages/DailyStatsPage";
import CasesRevenueEntryPage from "@/pages/CasesRevenueEntryPage";
import ContractorSubmissionsPage from "@/pages/ContractorSubmissionsPage";
import TeamPage from "@/pages/TeamPage";
import SettingsPage from "@/pages/SettingsPage";
import LoginPage from "@/pages/LoginPage";

// Create a client
const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AccountTypeProvider>
          <Router>
            <div className="min-h-screen bg-background">
              <Navbar />
              <ContractorLayout>
                <Routes>
                  <Route path="/login" element={<LoginPage />} />
                  <Route
                    path="/"
                    element={
                      <ProtectedRoute>
                        <HomePage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute>
                        <DashboardPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/buyers"
                    element={
                      <ProtectedRoute>
                        <BuyersPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/bulk-stats"
                    element={
                      <ProtectedRoute>
                        <BulkStatsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/daily-stats"
                    element={
                      <ProtectedRoute>
                        <DailyStatsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/cases-revenue-entry"
                    element={
                      <ProtectedRoute>
                        <CasesRevenueEntryPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/contractor-submissions"
                    element={
                      <ProtectedRoute>
                        <ContractorSubmissionsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/team"
                    element={
                      <ProtectedRoute>
                        <TeamPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/settings"
                    element={
                      <ProtectedRoute>
                        <SettingsPage />
                      </ProtectedRoute>
                    }
                  />
                </Routes>
              </ContractorLayout>
            </div>
            <Toaster />
          </Router>
        </AccountTypeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
