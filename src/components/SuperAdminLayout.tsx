import { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { Menu, X, Shield, Building2, LayoutDashboard, LogOut, Gem, Eye, Sliders, ChevronLeft, ChevronRight, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import flowgrammersLogo from "@/assets/logo-flowgrammers.png";

const menuItems = [
  { path: "/super-admin/dashboard", label: "Visão Geral", icon: LayoutDashboard },
  { path: "/super-admin/organizations", label: "Empresas", icon: Building2 },
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
  const { theme, toggleTheme } = useTheme();

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    } finally {
      navigate("/login");
    }
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex h-screen overflow-hidden bg-background">
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
            "fixed left-0 top-0 z-50 h-full transform border-r border-border bg-card sidebar-shadow transition-all duration-300 lg:relative lg:translate-x-0",
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

          {/* Header */}
          <div className={cn(
            "flex h-14 items-center justify-between border-b border-border transition-all duration-300",
            isSidebarCollapsed ? "px-2" : "px-4"
          )}>
            <div className={cn(
              "flex items-center transition-all duration-300",
              isSidebarCollapsed ? "justify-center gap-0" : "gap-3"
            )}>
              <img
                src={flowgrammersLogo}
                alt="Flowgrammers"
                className={cn(
                  "object-contain shrink-0 transition-all duration-300",
                  isSidebarCollapsed ? "h-7" : "h-8"
                )}
              />
              {!isSidebarCollapsed && (
                <div className="flex flex-col min-w-0">
                  <h1 className="text-sm font-bold text-foreground leading-tight">
                    Flow<span className="text-gradient-pink">grammers</span>
                  </h1>
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    Painel Admin
                  </p>
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
              onClick={() => setIsSidebarOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* User Info */}
          <div className={cn(
            "border-b border-border transition-all duration-300",
            isSidebarCollapsed ? "p-2" : "p-4"
          )}>
            <div className={cn(
              "flex items-center transition-all duration-300",
              isSidebarCollapsed ? "justify-center" : "gap-3"
            )}>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary shrink-0">
                <Shield className="h-4 w-4 text-primary-foreground" />
              </div>
              {!isSidebarCollapsed && (
                <div className="flex-1 overflow-hidden">
                  <p className="truncate text-xs font-semibold text-foreground">
                    {profile?.full_name || "Admin"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Super Admin</p>
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className={cn(
            "flex-1 space-y-0.5 transition-all duration-300",
            isSidebarCollapsed ? "p-2" : "p-3"
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
                    "flex w-full items-center rounded-lg text-[13px] font-medium transition-all duration-200",
                    isSidebarCollapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2.5",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-pink"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" />
                  {!isSidebarCollapsed && <span>{item.label}</span>}
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
              return btn;
            })}
          </nav>

          {/* Footer */}
          <div className={cn(
            "border-t border-border space-y-1 transition-all duration-300",
            isSidebarCollapsed ? "p-2" : "p-3"
          )}>
            {/* Theme Toggle */}
            {isCollapsedThemeButton(isSidebarCollapsed, theme, toggleTheme)}

            {/* Logout */}
            {isSidebarCollapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={handleLogout}
                    variant="ghost"
                    size="icon"
                    className="w-full h-9 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>Sair</TooltipContent>
              </Tooltip>
            ) : (
              <Button
                onClick={handleLogout}
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive text-xs"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </Button>
            )}
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Top Bar */}
          <header className="flex h-14 items-center border-b border-border bg-card/95 backdrop-blur-md px-4 lg:px-6">
            <Button
              variant="ghost"
              size="icon"
              className="mr-2 h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted lg:hidden"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>

            <div className="flex items-center gap-2.5">
              <img src={flowgrammersLogo} alt="Flowgrammers" className="h-7 w-auto object-contain" />
              <div className="flex flex-col">
                <h2 className="text-xs font-bold text-foreground leading-tight">
                  Flow<span className="text-gradient-pink">grammers</span>
                </h2>
                <p className="text-[10px] text-muted-foreground leading-tight">
                  Painel Admin
                </p>
              </div>
            </div>

            <div className="ml-auto">
              <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-[10px] font-semibold text-primary ring-1 ring-primary/20">
                Super Admin
              </span>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-background">
            <Outlet />
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}

function isCollapsedThemeButton(isCollapsed: boolean, theme: string, toggleTheme: () => void) {
  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="w-full h-9 text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          {theme === "dark" ? "Modo claro" : "Modo escuro"}
        </TooltipContent>
      </Tooltip>
    );
  }
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground hover:bg-muted text-xs"
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      {theme === "dark" ? "Modo claro" : "Modo escuro"}
    </Button>
  );
}
