import { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { Menu, X, Shield, Hospital, LayoutDashboard, LogOut, Gem, Eye, Sliders, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import flowgrammersLogo from "@/assets/logo-flowgrammers.png";

const menuItems = [
  { path: "/super-admin/dashboard", label: "Visão Geral", icon: LayoutDashboard },
  { path: "/super-admin/organizations", label: "Clínicas", icon: Hospital },
  { path: "/super-admin/plans", label: "Pacotes", icon: Gem },
  { path: "/super-admin/token-usage", label: "Observabilidade", icon: Eye },
  { path: "/super-admin/settings", label: "Configs", icon: Sliders },
];

export default function SuperAdminLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, signOut } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    } finally {
      // Sempre navegar para login, mesmo com erro
      navigate("/login");
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-black">
      {/* Sidebar Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-full transform border-r border-pink-500/30 bg-black backdrop-blur-xl transition-all duration-300 lg:relative lg:translate-x-0",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full",
          isSidebarCollapsed ? "lg:w-16" : "lg:w-64"
        )}
      >
        {/* Botão de Colapsar/Expandir (Desktop) */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="absolute -right-3 top-4 z-50 h-6 w-6 rounded-full border border-pink-500/30 bg-black shadow-md hover:bg-pink-500/20 hover:border-pink-500/50 transition-all hidden lg:flex"
        >
          {isSidebarCollapsed ? (
            <ChevronRight className="h-3.5 w-3.5 text-pink-500" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5 text-pink-500" />
          )}
          <span className="sr-only">{isSidebarCollapsed ? 'Expandir' : 'Colapsar'} sidebar</span>
        </Button>

        {/* Header */}
        <div className={cn(
          "flex h-16 items-center justify-between border-b border-pink-500/30 transition-all duration-300",
          isSidebarCollapsed ? "px-2" : "px-4"
        )}>
          <div className={cn(
            "flex items-center transition-all duration-300",
            isSidebarCollapsed ? "justify-center gap-0" : "gap-3"
          )}>
            {/* Logo Flowgrammers */}
            <div className="flex h-10 w-10 items-center justify-center shrink-0">
              <img src={flowgrammersLogo} alt="Flowgrammers" className="h-10 w-auto object-contain" />
            </div>
            {!isSidebarCollapsed && (
              <div className="flex flex-col">
                <h1 className="text-sm font-bold text-white leading-tight">
                  Flowgrammers
                </h1>
                <p className="text-xs text-gray-400 leading-tight">
                  Admin FlowClinic
                </p>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-pink-300 hover:text-pink-100 hover:bg-pink-800/30"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* User Info */}
        <div className={cn(
          "border-b border-pink-500/30 transition-all duration-300",
          isSidebarCollapsed ? "p-2" : "p-4"
        )}>
          <div className={cn(
            "flex items-center transition-all duration-300",
            isSidebarCollapsed ? "justify-center" : "gap-3"
          )}>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-rose-500 shrink-0">
              <Shield className="h-5 w-5 text-white" />
            </div>
            {!isSidebarCollapsed && (
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-semibold text-white">
                  {profile?.full_name || "Admin"}
                </p>
                <p className="text-xs text-gray-400">Admin</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className={cn(
          "flex-1 space-y-1 transition-all duration-300",
          isSidebarCollapsed ? "p-2" : "p-4"
        )}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  setIsSidebarOpen(false);
                }}
                className={cn(
                  "flex w-full items-center rounded-lg text-sm font-medium transition-all",
                  isSidebarCollapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2.5",
                  isActive
                    ? "bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-lg shadow-pink-500/50"
                    : "text-gray-300 hover:bg-pink-800/30 hover:text-pink-100"
                )}
                title={isSidebarCollapsed ? item.label : undefined}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!isSidebarCollapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Logout Button */}
        <div className={cn(
          "border-t border-pink-500/30 transition-all duration-300",
          isSidebarCollapsed ? "p-2" : "p-4"
        )}>
          <Button
            onClick={handleLogout}
            variant="ghost"
            className={cn(
              "w-full text-gray-300 hover:bg-red-900/30 hover:text-red-300 transition-all duration-300",
              isSidebarCollapsed ? "justify-center p-2" : "justify-start"
            )}
            title={isSidebarCollapsed ? "Sair" : undefined}
          >
            <LogOut className="h-5 w-5" />
            {!isSidebarCollapsed && <span className="ml-2">Sair</span>}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Bar */}
        <header className={cn(
          "flex h-16 items-center border-b border-pink-500/30 bg-black backdrop-blur-xl transition-all duration-300",
          isSidebarCollapsed ? "lg:pl-4" : "px-4 lg:px-6"
        )}>
          <Button
            variant="ghost"
            size="icon"
            className="mr-2 text-pink-300 hover:text-pink-100 hover:bg-pink-800/30 lg:hidden"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex items-center gap-2">
            {/* Logo Flowgrammers */}
            <div className="flex h-8 w-8 items-center justify-center shrink-0">
              <img src={flowgrammersLogo} alt="Flowgrammers" className="h-8 w-auto object-contain" />
            </div>
            <div className="flex flex-col">
              <h2 className="text-xs font-bold text-white leading-tight">
                Flowgrammers
              </h2>
              <p className="text-[10px] text-gray-400 leading-tight">
                Admin FlowClinic
              </p>
            </div>
          </div>

          <div className="ml-auto">
            <span className="inline-flex items-center rounded-full bg-pink-600/20 px-3 py-1 text-xs font-semibold text-pink-300 ring-1 ring-pink-500/30">
               Admin
            </span>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-black">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

