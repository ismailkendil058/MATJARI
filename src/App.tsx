import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/Layout";
import { AuthProvider, useAuth } from "@/components/AuthContext";
import CaissePage from "./pages/CaissePage";
import CreditsPage from "./pages/CreditsPage";
import FacturesPage from "./pages/FacturesPage";
import InventairePage from "./pages/InventairePage";
import AnalytiquePage from "./pages/AnalytiquePage";
import LoginPage from "./pages/LoginPage";
import WorkersPage from "./pages/WorkersPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children, requireAdmin = false }: { children: React.ReactNode, requireAdmin?: boolean }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) return null; // Or a loading spinner
  if (!user) return <Navigate to="/login" replace />;
  if (requireAdmin && user.role !== 'admin') return <Navigate to="/" replace />;

  return <>{children}</>;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<LoginPage />} />

    <Route path="/" element={
      <ProtectedRoute>
        <Layout><CaissePage /></Layout>
      </ProtectedRoute>
    } />
    <Route path="/credits" element={
      <ProtectedRoute>
        <Layout><CreditsPage /></Layout>
      </ProtectedRoute>
    } />
    <Route path="/factures" element={
      <ProtectedRoute>
        <Layout><FacturesPage /></Layout>
      </ProtectedRoute>
    } />
    <Route path="/inventaire" element={
      <ProtectedRoute>
        <Layout><InventairePage /></Layout>
      </ProtectedRoute>
    } />
    <Route path="/analytique" element={
      <ProtectedRoute requireAdmin>
        <Layout><AnalytiquePage /></Layout>
      </ProtectedRoute>
    } />
    <Route path="/workers" element={
      <ProtectedRoute requireAdmin>
        <Layout><WorkersPage /></Layout>
      </ProtectedRoute>
    } />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
