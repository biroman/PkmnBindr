import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";

import { RulesProvider } from "./contexts/RulesContext";
import { BinderProvider } from "./contexts/BinderContext";
import { CardCacheProvider } from "./contexts/CardCacheContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import PublicRoute from "./components/auth/PublicRoute";
import RootLayout from "./components/layout/RootLayout";
import AuthLayout from "./components/layout/AuthLayout";
import { useUserTracking } from "./hooks/useUserTracking";
import { useActivityTracking } from "./hooks/useActivityTracking";

// Pages
import HomePage from "./pages/HomePage";
import BinderPage from "./pages/BinderPage";
import BindersPage from "./pages/BindersPage";

import DashboardHandler from "./components/auth/DashboardHandler";
import ProfilePage from "./pages/ProfilePage";
import AdminPage from "./pages/AdminPage";
import RulesPage from "./pages/RulesPage";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import NotFoundPage from "./pages/NotFoundPage";

// Create a client for TanStack Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

const App = () => {
  // Enable automatic user tracking
  useUserTracking();

  // Enable real activity tracking for accurate "last seen"
  useActivityTracking();

  return (
    <QueryClientProvider client={queryClient}>
      <RulesProvider>
        <CardCacheProvider>
          <BinderProvider>
            <BrowserRouter>
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<RootLayout />}>
                  <Route index element={<HomePage />} />
                  <Route path="binders" element={<BindersPage />} />
                  <Route path="binder/:id" element={<BinderPage />} />
                  <Route
                    path="binder"
                    element={<Navigate to="/binders" replace />}
                  />

                  {/* Auth Routes - Only accessible when not logged in */}
                  <Route element={<PublicRoute />}>
                    <Route path="auth" element={<AuthLayout />}>
                      <Route path="login" element={<LoginPage />} />
                      <Route path="register" element={<RegisterPage />} />
                      <Route
                        path="forgot-password"
                        element={<ForgotPasswordPage />}
                      />
                    </Route>
                  </Route>

                  {/* Dashboard - handles both normal access and email verification */}
                  <Route path="dashboard" element={<DashboardHandler />} />

                  {/* Protected Routes - Only accessible when logged in */}
                  <Route element={<ProtectedRoute />}>
                    <Route path="profile" element={<ProfilePage />} />
                    <Route path="admin" element={<AdminPage />} />
                    <Route path="rules" element={<RulesPage />} />
                  </Route>

                  {/* Fallback route */}
                  <Route path="*" element={<NotFoundPage />} />
                </Route>
              </Routes>
            </BrowserRouter>
            <Toaster position="top-right" />
          </BinderProvider>
        </CardCacheProvider>
      </RulesProvider>
    </QueryClientProvider>
  );
};

export default App;
