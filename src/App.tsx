import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { useCoresPataforma } from "@/hooks/useCoresPataforma";

// Components
import ProtectedRoute from "./components/ProtectedRoute";
import SuperAdminRoute from "./components/SuperAdminRoute";
import OrgRoute from "./components/OrgRoute";
import Layout from "./components/Layout";
import SuperAdminLayout from "./components/SuperAdminLayout";

// Auth Pages
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";

// Organization Pages
import Dashboard from "./pages/Dashboard";
import Agenda from "./pages/Agenda";
import CRM from "./pages/CRM";
import Kanban from "./pages/Kanban";
import AgentIA from "./pages/AgentIA";
import Conhecimento from "./pages/Conhecimento";
import Integrations from "./pages/Integrations";
import Observability from "./pages/Observability";
import TiposAtendimento from "./pages/TiposAtendimento";

// Super Admin Pages
import SuperAdminDashboard from "./pages/super-admin/Dashboard";
import Organizations from "./pages/super-admin/Organizations";
import OrganizationForm from "./pages/super-admin/OrganizationForm";
import Plans from "./pages/super-admin/Plans";
import Relatorios from "./pages/super-admin/Relatorios";
import TokenUsage from "./pages/super-admin/TokenUsage";
import N8nInsights from "./pages/super-admin/N8nInsights";
import GestaoVps from "./pages/super-admin/GestaoVps";
import SuperAdminSettings from "./pages/super-admin/Settings";
import MinhaConta from "./pages/MinhaConta";

import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AplicadorCores() {
  useCoresPataforma();
  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AplicadorCores />
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Rotas públicas de autenticação */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />

              {/* Rotas do Super Admin */}
              <Route element={<SuperAdminRoute><SuperAdminLayout /></SuperAdminRoute>}>
                <Route path="/super-admin/dashboard" element={<SuperAdminDashboard />} />
                <Route path="/super-admin/organizations" element={<Organizations />} />
                <Route path="/super-admin/organizations/new" element={<OrganizationForm />} />
                <Route path="/super-admin/organizations/:id/edit" element={<OrganizationForm />} />
                <Route path="/super-admin/plans" element={<Plans />} />
                <Route path="/super-admin/relatorios" element={<Relatorios />} />
                <Route path="/super-admin/token-usage" element={<TokenUsage />} />
                <Route path="/super-admin/observability" element={<Observability />} />
                <Route path="/super-admin/insights" element={<N8nInsights />} />
                <Route path="/super-admin/gestao-vps" element={<GestaoVps />} />
                <Route path="/super-admin/settings" element={<SuperAdminSettings />} />
                <Route path="/super-admin/minha-conta" element={<MinhaConta />} />
              </Route>

              {/* Rotas de Organização (antiga "/" agora "/app/*") */}
              <Route element={<OrgRoute><Layout /></OrgRoute>}>
                <Route path="/" element={<Navigate to="/app/dashboard" replace />} />
                <Route path="/app/dashboard" element={<Dashboard />} />
                <Route path="/app/agenda" element={<Agenda />} />
                <Route path="/app/tipos-atendimento" element={<TiposAtendimento />} />
                <Route path="/app/clientes/crm" element={<CRM />} />
                <Route path="/app/clientes/kanban" element={<Kanban />} />
                <Route path="/app/agent-ia" element={<AgentIA />} />
                <Route path="/app/conhecimento" element={<Conhecimento />} />
                {/* Redirect antigos */}
                <Route path="/app/crm" element={<Navigate to="/app/clientes/crm" replace />} />
                <Route path="/app/crm/kanban" element={<Navigate to="/app/clientes/kanban" replace />} />
                <Route path="/app/integrations" element={<Integrations />} />
                <Route path="/app/minha-conta" element={<MinhaConta />} />
              </Route>

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
