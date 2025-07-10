import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";

import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import { RulesProvider } from "./contexts/RulesContext";
import { BinderProvider } from "./contexts/BinderContext";
import { CardCacheProvider } from "./contexts/CardCacheContext";
import { BinderCardCustomizationProvider } from "./contexts/BinderCardCustomizationContext";
import ProtectedRoute, {
  AdminProtectedRoute,
} from "./components/auth/ProtectedRoute";
import PublicRoute from "./components/auth/PublicRoute";
import RootLayout from "./components/layout/RootLayout";
import AuthLayout from "./components/layout/AuthLayout";
import ScrollToTop from "./components/layout/ScrollToTop";
import { useUserTracking } from "./hooks/useUserTracking";
import { useActivityTracking } from "./hooks/useActivityTracking";

// Pages
import HomePage from "./pages/HomePage";
import BinderPage from "./pages/BinderPage";
import BindersPage from "./pages/BindersPage";
import StaticBinderPage from "./pages/StaticBinderPage";

import DashboardHandler from "./components/auth/DashboardHandler";
import PublicProfilePage from "./pages/PublicProfilePage";
import SettingsPage from "./pages/SettingsPage";
import AdminPage from "./pages/AdminPage";
import BinderViewer from "./components/admin/BinderViewer";
import PublicBinderViewPage from "./pages/PublicBinderViewPage";
import SharedBinderPage from "./pages/SharedBinderPage";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import ContactPage from "./pages/ContactPage";
import BlogIndexPage from "./pages/BlogIndexPage";
import BlogPost1 from "./pages/BlogPage";
import BlogPost2 from "./pages/BlogPost2";
import BlogPost3 from "./pages/BlogPost3";
import BlogPost4 from "./pages/BlogPost4";
import BlogPost5 from "./pages/BlogPost5";
import BlogPost6 from "./pages/BlogPost6";
import FAQPage from "./pages/FAQPage";
import MessagesPage from "./pages/MessagesPage";
import NotFoundPage from "./pages/NotFoundPage";
import Clarity from "@microsoft/clarity";

const projectId = "s6ry57f9wb";

Clarity.init(projectId);

// Create a client for TanStack Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

// Themed Toaster component that uses theme context
const ThemedToaster = () => {
  const { theme } = useTheme();

  return (
    <Toaster
      position="top-right"
      toastOptions={{
        // Default options for all toasts
        duration: 4000,
        style: {
          background: theme === "dark" ? "#374151" : "#ffffff",
          color: theme === "dark" ? "#f3f4f6" : "#1f2937",
          border: theme === "dark" ? "1px solid #4b5563" : "1px solid #e5e7eb",
          borderRadius: "8px",
          fontSize: "14px",
          fontWeight: "500",
          boxShadow:
            theme === "dark"
              ? "0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2)"
              : "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
        },
        // Success toast styles
        success: {
          iconTheme: {
            primary: theme === "dark" ? "#10b981" : "#059669",
            secondary: theme === "dark" ? "#374151" : "#ffffff",
          },
        },
        // Error toast styles
        error: {
          iconTheme: {
            primary: theme === "dark" ? "#ef4444" : "#dc2626",
            secondary: theme === "dark" ? "#374151" : "#ffffff",
          },
        },
        // Loading toast styles
        loading: {
          iconTheme: {
            primary: theme === "dark" ? "#6b7280" : "#9ca3af",
            secondary: theme === "dark" ? "#374151" : "#ffffff",
          },
        },
      }}
    />
  );
};

const App = () => {
  // Enable automatic user tracking
  useUserTracking();

  // Enable real activity tracking for accurate "last seen"
  useActivityTracking();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <RulesProvider>
          <CardCacheProvider>
            <BinderProvider>
              <BinderCardCustomizationProvider>
                <BrowserRouter>
                  <ScrollToTop />
                  <Routes>
                    {/* Shared Binder Route - Outside RootLayout (no navbar) */}
                    <Route
                      path="share/:shareToken"
                      element={<SharedBinderPage />}
                    />

                    {/* Public Routes */}
                    <Route path="/" element={<RootLayout />}>
                      <Route index element={<HomePage />} />
                      <Route path="binders" element={<BindersPage />} />
                      <Route
                        path="binders/:slug"
                        element={<StaticBinderPage />}
                      />
                      <Route path="binder/:id" element={<BinderPage />} />
                      <Route
                        path="binder"
                        element={<Navigate to="/binders" replace />}
                      />

                      {/* Privacy Policy - Accessible to everyone */}
                      <Route path="privacy" element={<PrivacyPolicyPage />} />

                      {/* Contact - Accessible to everyone */}
                      <Route path="contact" element={<ContactPage />} />

                      {/* Blog - Accessible to everyone */}
                      <Route path="blog" element={<BlogIndexPage />} />
                      <Route
                        path="blog/ultimate-guide-organizing-pokemon-cards"
                        element={<BlogPost1 />}
                      />
                      <Route
                        path="blog/fort-knox-pokemon-card-binder-guide-2025"
                        element={<BlogPost2 />}
                      />
                      <Route
                        path="blog/best-pokemon-card-binders-2025-complete-guide"
                        element={<BlogPost3 />}
                      />
                      <Route
                        path="blog/ultimate-pokemon-binder-showdown-2025"
                        element={<BlogPost4 />}
                      />
                      <Route
                        path="blog/how-to-spot-fake-pokemon-cards-protect-collection"
                        element={<BlogPost5 />}
                      />
                      <Route
                        path="blog/best-pokemon-tcg-tracking-apps-2025-guide"
                        element={<BlogPost6 />}
                      />

                      {/* FAQ - Accessible to everyone */}
                      <Route path="faq" element={<FAQPage />} />

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
                        <Route path="profile" element={<PublicProfilePage />} />
                        <Route
                          path="profile/:userId"
                          element={<PublicProfilePage />}
                        />
                        <Route
                          path="binder/:binderId/view"
                          element={<PublicBinderViewPage />}
                        />
                        <Route
                          path="user/:userId/binder/:binderId"
                          element={<PublicBinderViewPage />}
                        />
                        <Route path="messages" element={<MessagesPage />} />
                        <Route path="settings" element={<SettingsPage />} />
                      </Route>

                      {/* Admin Routes - Only accessible to admin/owner */}
                      <Route element={<AdminProtectedRoute />}>
                        <Route path="admin" element={<AdminPage />} />
                        <Route
                          path="admin/binder/:userId/:binderId/:source"
                          element={<BinderViewer />}
                        />
                      </Route>

                      {/* Fallback route */}
                      <Route path="*" element={<NotFoundPage />} />
                    </Route>
                  </Routes>
                </BrowserRouter>
                <ThemedToaster />
              </BinderCardCustomizationProvider>
            </BinderProvider>
          </CardCacheProvider>
        </RulesProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
