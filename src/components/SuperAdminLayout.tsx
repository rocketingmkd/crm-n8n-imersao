import { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { Menu, X, Building2, LayoutDashboard, LogOut, Gem, Eye, Sliders, ChevronLeft, ChevronRight, Sun, Moon, Activity, FileBarChart, UserCircle, Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AppLogo } from "@/components/AppLogo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const menuItems = [
  { path: "/super-admin/dashboard", label: "Visão Geral", icon: LayoutDashboard },
  { path: "/super-admin/organizations", label: "Empresas", icon: Building2 },
  { path: "/super-admin/relatorios", label: "Relatórios", icon: FileBarChart },
  { path: "/super-admin/plans", label: "Pacotes", icon: Gem },
  { path: "/super-admin/token-usage", label: "Consumos dos Planos", icon: Eye },
  { path: "/super-admin/observability", label: "Observabilidade", icon: Activity },
  { path: "/super-admin/gestao-vps", label: "Gestão de VPS", icon: Server },
  { path: "/super-admin/settings", label: "Configs", icon: Sliders },
  { path: "/super-admin/minha-conta", label: "Minha conta", icon: UserCircle },
];

export default function SuperAdminLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const handleLogout = async () => {
    try {
      await signOut();
      window.location.href = '/login';
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
      window.location.href = '/login';
    }
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex h-screen overflow-hidden bg-background liquid-bg">
        {/* Mobile Overlay */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={cn(
            "fixed left-0 top-0 z-50 h-full flex flex-col overflow-visible transform liquid-glass-sidebar transition-all duration-300 lg:relative lg:translate-x-0",
            isSidebarOpen ? "translate-x-0" : "-translate-x-full",
            isSidebarCollapsed ? "lg:w-[60px]" : "lg:w-60"
          )}
        >
          {/* Collapse Toggle */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="absolute -right-3 top-6 z-50 h-6 w-6 rounded-full border border-border bg-card shadow-sm hover:bg-accent/10 hover:border-primary/40 transition-all hidden lg:flex"
          >
            {isSidebarCollapsed ? (
              <ChevronRight className="h-3 w-3 text-foreground" />
            ) : (
              <ChevronLeft className="h-3 w-3 text-foreground" />
            )}
          </Button>

          {/* Header: Logo + User (matching org Layout) */}
          <div className={cn(
            "border-b border-border transition-all duration-300",
            isSidebarCollapsed ? "px-2 py-4" : "px-4 py-4"
          )}>
            <div className={cn(
              "flex items-center transition-all duration-300",
              isSidebarCollapsed ? "justify-center" : "gap-3"
            )}>
              <AppLogo variant="platform" height={isSidebarCollapsed ? 24 : 30} />
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted ml-auto"
                onClick={() => setIsSidebarOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {!isSidebarCollapsed && (
              <div className="mt-3 liquid-glass-subtle rounded-xl px-3 py-2.5 space-y-2.5">
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Plataforma</p>
                  <p className="text-xs font-semibold text-foreground truncate">Super Admin</p>
                </div>
                <div className="flex items-center gap-2.5">
                  <Avatar className="h-8 w-8 shrink-0 border border-white/10">
                    <AvatarImage src={profile?.url_avatar ?? undefined} alt={profile?.nome_completo ?? "Admin"} className="object-cover" />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                      {profile?.nome_completo?.charAt(0).toUpperCase() || "A"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {profile?.nome_completo || "Admin"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Administrador</p>
                  </div>
                </div>
              </div>
            )}

            {isSidebarCollapsed && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="mt-3 flex justify-center">
                    <Avatar className="h-8 w-8 shrink-0 border border-white/10">
                      <AvatarImage src={profile?.url_avatar ?? undefined} alt={profile?.nome_completo ?? "Admin"} className="object-cover" />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                        {profile?.nome_completo?.charAt(0).toUpperCase() || "A"}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  {profile?.nome_completo || "Admin"}
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* Navigation */}
          <nav className={cn(
            "flex-1 space-y-1 overflow-y-auto py-4 transition-all duration-300",
            isSidebarCollapsed ? "px-2" : "px-3"
          )}>
            {!isSidebarCollapsed && (
              <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Menu
              </p>
            )}
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              const btn = (
                <button
                  key={item.path}
                  onClick={() => {
                    navigate(item.path);
                    setIsSidebarOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center rounded-xl text-[13px] font-medium transition-all duration-200",
                    isSidebarCollapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2.5",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-pink"
                      : "text-muted-foreground liquid-glass-subtle hover:text-foreground"
                  )}
                >
                  <Icon className={cn(
                    "h-[18px] w-[18px] shrink-0 transition-colors duration-200",
                    isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                  )} />
                  {!isSidebarCollapsed && <span className="truncate">{item.label}</span>}
                </button>
              );

              if (isSidebarCollapsed) {
                return (
                  <Tooltip key={item.path}>
                    <TooltipTrigger asChild>{btn}</TooltipTrigger>
                    <TooltipContent side="right" sideOffset={8}>{item.label}</TooltipContent>
                  </Tooltip>
                );
              }
              return <div key={item.path}>{btn}</div>;
            })}
          </nav>

          {/* Footer: Theme + Logout */}
          <div className={cn(
            "border-t border-border space-y-1 transition-all duration-300",
            isSidebarCollapsed ? "p-2" : "p-3"
          )}>
            {isSidebarCollapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={toggleTheme} className="w-full h-9 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl">
                    {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>{theme === "dark" ? "Modo claro" : "Modo escuro"}</TooltipContent>
              </Tooltip>
            ) : (
              <Button variant="ghost" size="sm" onClick={toggleTheme} className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground hover:bg-muted text-xs rounded-xl">
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                {theme === "dark" ? "Modo claro" : "Modo escuro"}
              </Button>
            )}

            {isSidebarCollapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={handleLogout} variant="ghost" size="icon" className="w-full h-9 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-xl">
                    <LogOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>Sair</TooltipContent>
              </Tooltip>
            ) : (
              <Button onClick={handleLogout} variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive text-xs rounded-xl">
                <LogOut className="h-4 w-4" />
                Sair
              </Button>
            )}
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Top Bar */}
          <header className="flex h-14 items-center liquid-glass-subtle px-4 lg:px-6">
            <Button
              variant="ghost"
              size="icon"
              className="mr-2 h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted lg:hidden"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>

            <AppLogo variant="platform" height={26} />

            <div className="ml-auto">
              <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-[10px] font-semibold text-primary ring-1 ring-primary/20">
                Admin
              </span>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto p-4 lg:p-6 liquid-bg">
            <Outlet />
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
