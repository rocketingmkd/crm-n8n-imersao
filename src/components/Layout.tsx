import { Outlet, useLocation } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { useState, useEffect, useMemo } from "react";
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  Settings, 
  Menu,
  LogOut,
  ChevronRight,
  ChevronLeft,
  Kanban as KanbanIcon,
  Bot,
  BookOpen,
  Crown,
  Check,
  Sparkles,
  Sun,
  Moon,
  X,
  UserCircle,
  ListTodo
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { usePlanFeatures } from "@/hooks/usePlanFeatures";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import SupportButton from "@/components/SupportButton";
import { AppLogo } from "@/components/AppLogo";

const allNavigationItems = [
  { name: "Dashboard", href: "/app/dashboard", icon: LayoutDashboard, requiredFeature: null },
  { name: "Agenda", href: "/app/agenda", icon: Calendar, requiredFeature: 'agendamento_automatico' as const },
  { name: "Tipos de Atendimento", href: "/app/tipos-atendimento", icon: ListTodo, requiredFeature: 'agendamento_automatico' as const },
  { name: "CRM / Clientes", href: "/app/clientes/crm", icon: Users, requiredFeature: null },
  { name: "Configurações", href: "/app/configuracoes", icon: Settings, requiredFeature: null },
];

function SidebarContent({ onNavigate, isCollapsed, onToggleCollapse }: { 
  onNavigate?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  const location = useLocation();
  const { profile, organization, signOut } = useAuth();
  const { features } = usePlanFeatures();
  const { theme, toggleTheme } = useTheme();
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [selectedPlanForRequest, setSelectedPlanForRequest] = useState<string | null>(null);

  const navigation = useMemo(() => {
    return allNavigationItems.filter(item => {
      if (!item.requiredFeature) return true;
      return features[item.requiredFeature];
    });
  }, [features]);

  useEffect(() => {
    const handleOpenPlanModal = () => setIsPlanModalOpen(true);
    window.addEventListener('open-plan-modal', handleOpenPlanModal);
    return () => window.removeEventListener('open-plan-modal', handleOpenPlanModal);
  }, []);

  const { data: plans = [] } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('planos_assinatura')
        .select('*')
        .order('id_plano', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const currentPlan = plans.find(p => p.id_plano === organization?.plano_assinatura);

  const handleRequestPlanChange = async () => {
    if (!selectedPlanForRequest || !organization?.id) {
      toast.error('Por favor, selecione um plano');
      return;
    }
    try {
      toast.success('Solicitação enviada! Entraremos em contato em breve.', {
        description: `Plano solicitado: ${plans.find(p => p.id_plano === selectedPlanForRequest)?.nome_plano}`,
      });
      setIsPlanModalOpen(false);
      setSelectedPlanForRequest(null);
    } catch (error) {
      console.error('Erro ao solicitar mudança de plano:', error);
      toast.error('Erro ao enviar solicitação');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      window.location.href = '/login';
    } catch (error) {
      window.location.href = '/login';
    }
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex h-full flex-col relative">
        {/* Collapse Toggle */}
        {onToggleCollapse && (
          <Button
            variant="outline"
            size="icon"
            onClick={onToggleCollapse}
            className="absolute -right-3 top-6 z-50 h-6 w-6 rounded-full border border-border bg-card shadow-sm hover:bg-accent/10 hover:border-primary/40 transition-all hidden lg:flex"
          >
            {isCollapsed ? (
              <ChevronRight className="h-3 w-3 text-foreground" />
            ) : (
              <ChevronLeft className="h-3 w-3 text-foreground" />
            )}
          </Button>
        )}

        {/* Header: Logo + Company + User */}
        <div className={cn(
          "border-b border-sidebar-border transition-all duration-300",
          isCollapsed ? "px-2 py-4" : "px-4 py-4"
        )}>
          <div className={cn(
            "flex items-center transition-all duration-300",
            isCollapsed ? "justify-center" : "gap-3"
          )}>
            <AppLogo variant="org" height={isCollapsed ? 28 : 36} />
          </div>

          {!isCollapsed && (
            <div className="mt-3 space-y-2">
              <div className="liquid-glass-subtle rounded-xl px-3 py-2.5 space-y-2.5">
                {organization && (
                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Empresa</p>
                    <p className="text-xs font-semibold text-foreground truncate">{organization.nome}</p>
                  </div>
                )}
                <div className="flex items-center gap-2.5">
                  <Avatar className="h-8 w-8 shrink-0 border border-white/10">
                    <AvatarImage src={profile?.url_avatar ?? undefined} alt={profile?.nome_completo ?? "Usuário"} className="object-cover" />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                      {profile?.nome_completo?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {profile?.nome_completo || 'Usuário'}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate capitalize">
                      {profile?.funcao || 'profissional'}
                    </p>
                  </div>
                </div>
              </div>
              <NavLink
                to="/app/minha-conta"
                className={cn(
                  "group flex items-center gap-3 rounded-xl text-[13px] font-medium transition-all duration-200 px-3 py-2",
                  location.pathname === "/app/minha-conta"
                    ? "bg-primary text-primary-foreground shadow-pink"
                    : "text-muted-foreground liquid-glass-subtle hover:text-foreground"
                )}
              >
                <UserCircle className={cn(
                  "h-[18px] w-[18px] shrink-0",
                  location.pathname === "/app/minha-conta" ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                )} />
                <span className="truncate">Minha Conta</span>
              </NavLink>
            </div>
          )}

          {isCollapsed && (
            <div className="mt-3 space-y-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex justify-center">
                    <Avatar className="h-8 w-8 shrink-0 border border-white/10">
                      <AvatarImage src={profile?.url_avatar ?? undefined} alt={profile?.nome_completo ?? "Usuário"} className="object-cover" />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                        {profile?.nome_completo?.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  {profile?.nome_completo || 'Usuário'}
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <NavLink
                    to="/app/minha-conta"
                    className={cn(
                      "group flex items-center justify-center rounded-xl p-2.5 transition-all duration-200",
                      location.pathname === "/app/minha-conta"
                        ? "bg-primary text-primary-foreground shadow-pink"
                        : "text-muted-foreground liquid-glass-subtle hover:text-foreground"
                    )}
                  >
                    <UserCircle className="h-[18px] w-[18px]" />
                  </NavLink>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>Minha Conta</TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className={cn(
          "flex-1 space-y-1 overflow-y-auto py-4 transition-all duration-300",
          isCollapsed ? "px-2" : "px-3"
        )}>
          {!isCollapsed && (
            <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Menu
            </p>
          )}
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            const linkContent = (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={onNavigate}
                className={cn(
                  "group flex items-center gap-3 rounded-xl text-[13px] font-medium transition-all duration-200",
                  isCollapsed ? "justify-center p-2.5" : "px-3 py-2.5",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-pink"
                    : "text-muted-foreground liquid-glass-subtle hover:text-foreground"
                )}
              >
                <item.icon className={cn(
                  "h-[18px] w-[18px] shrink-0 transition-colors duration-200",
                  isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                )} />
                {!isCollapsed && <span className="truncate">{item.name}</span>}
              </NavLink>
            );

            if (isCollapsed) {
              return (
                <Tooltip key={item.name}>
                  <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8}>
                    {item.name}
                  </TooltipContent>
                </Tooltip>
              );
            }
            return linkContent;
          })}

        </nav>

        {/* Footer: Plan + Theme + Logout */}
        <div className={cn(
          "border-t border-sidebar-border space-y-1 transition-all duration-300",
          isCollapsed ? "p-2" : "p-3"
        )}>
          {/* Plan */}
          {currentPlan && !isCollapsed && (
            <div
              onClick={() => setIsPlanModalOpen(true)}
              className="group flex items-center gap-3 rounded-xl text-[13px] font-medium transition-all duration-200 px-3 py-2.5 text-muted-foreground liquid-glass-subtle hover:text-foreground cursor-pointer"
            >
              <Crown className="h-[18px] w-[18px] shrink-0 text-primary" />
              <span className="truncate flex-1">{currentPlan.nome_plano}</span>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          )}
          {currentPlan && isCollapsed && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  onClick={() => setIsPlanModalOpen(true)}
                  className="group flex items-center justify-center rounded-xl p-2.5 text-muted-foreground liquid-glass-subtle hover:text-foreground cursor-pointer"
                >
                  <Crown className="h-[18px] w-[18px] text-primary" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>{currentPlan.nome_plano}</TooltipContent>
            </Tooltip>
          )}
          {isCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleTheme}
                  className="w-full h-9 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl"
                >
                  {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                {theme === "dark" ? "Modo claro" : "Modo escuro"}
              </TooltipContent>
            </Tooltip>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground hover:bg-muted text-xs rounded-xl"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {theme === "dark" ? "Modo claro" : "Modo escuro"}
            </Button>
          )}

          {isCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleSignOut}
                  className="w-full h-9 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-xl"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>Sair</TooltipContent>
            </Tooltip>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="w-full justify-start gap-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive text-xs rounded-xl"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          )}
        </div>

        {/* Plan Modal */}
        <Dialog open={isPlanModalOpen} onOpenChange={setIsPlanModalOpen}>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto bg-card border-border">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Alterar Plano de Assinatura
              </DialogTitle>
              <DialogDescription>
                Seu plano atual: <strong>{currentPlan?.nome_plano}</strong>. 
                Selecione um novo plano para solicitar a alteração.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              {plans.map((plan) => {
                const isCurrentPlan = plan.id_plano === organization?.plano_assinatura;
                const isSelected = selectedPlanForRequest === plan.id_plano;
                
                return (
                  <div
                    key={plan.id_plano}
                    onClick={() => !isCurrentPlan && setSelectedPlanForRequest(plan.id_plano)}
                    className={cn(
                      "relative p-5 rounded-lg border-2 transition-all cursor-pointer",
                      isCurrentPlan && "border-primary/40 bg-primary/5 cursor-not-allowed opacity-75",
                      isSelected && !isCurrentPlan && "border-primary bg-primary/5 ring-2 ring-primary/30",
                      !isSelected && !isCurrentPlan && "border-border hover:border-primary/40"
                    )}
                  >
                    {isCurrentPlan && (
                      <div className="absolute top-2 right-2">
                        <Badge className="bg-primary text-primary-foreground border-0 text-[10px]">
                          Atual
                        </Badge>
                      </div>
                    )}
                    {isSelected && !isCurrentPlan && (
                      <div className="absolute top-2 right-2 h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}

                    <div className="mb-4">
                      <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                        <Crown className="h-5 w-5 text-primary" />
                        {plan.nome_plano}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">{plan.descricao_plano}</p>
                      <div className="mt-3">
                        <span className="text-3xl font-bold text-foreground">
                          R$ {plan.preco_mensal?.toFixed(2)}
                        </span>
                        <span className="text-sm text-muted-foreground">/mês</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Recursos:</p>
                      <div className="space-y-1.5">
                        {plan.atendimento_inteligente && (
                          <div className="flex items-center gap-2 text-xs"><Check className="h-3 w-3 text-primary" /><span>Atendimento Inteligente</span></div>
                        )}
                        {plan.agendamento_automatico && (
                          <div className="flex items-center gap-2 text-xs"><Check className="h-3 w-3 text-primary" /><span>Agendamento Automático</span></div>
                        )}
                        {plan.lembretes_automaticos && (
                          <div className="flex items-center gap-2 text-xs"><Check className="h-3 w-3 text-primary" /><span>Lembretes Automáticos</span></div>
                        )}
                        {plan.confirmacao_email && (
                          <div className="flex items-center gap-2 text-xs"><Check className="h-3 w-3 text-primary" /><span>Confirmação por Email</span></div>
                        )}
                        {plan.base_conhecimento && (
                          <div className="flex items-center gap-2 text-xs"><Check className="h-3 w-3 text-primary" /><span>Base de Conhecimento</span></div>
                        )}
                        {plan.relatorios_avancados && (
                          <div className="flex items-center gap-2 text-xs"><Check className="h-3 w-3 text-primary" /><span>Relatórios Avançados</span></div>
                        )}
                        {plan.integracao_whatsapp && (
                          <div className="flex items-center gap-2 text-xs"><Check className="h-3 w-3 text-primary" /><span>Integração WhatsApp</span></div>
                        )}
                        {plan.multi_usuarios && (
                          <div className="flex items-center gap-2 text-xs"><Check className="h-3 w-3 text-primary" /><span>Múltiplos Usuários</span></div>
                        )}
                        {plan.personalizacao_agente && (
                          <div className="flex items-center gap-2 text-xs"><Check className="h-3 w-3 text-primary" /><span>Personalização do Agente</span></div>
                        )}
                        {plan.analytics && (
                          <div className="flex items-center gap-2 text-xs"><Check className="h-3 w-3 text-primary" /><span>Analytics</span></div>
                        )}
                      </div>
                      <div className="mt-3 pt-3 border-t border-border">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Limites:</p>
                        <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                          <div><span className="font-medium">Agendamentos:</span> {plan.max_agendamentos_mes ?? '∞'}</div>
                          <div><span className="font-medium">Mensagens:</span> {plan.max_mensagens_whatsapp_mes ?? '∞'}</div>
                          <div><span className="font-medium">Usuários:</span> {plan.max_usuarios ?? '∞'}</div>
                          <div><span className="font-medium">Clientes:</span> {plan.max_contatos ?? '∞'}</div>
                          <div><span className="font-medium">Arquivos (BC):</span> {(plan as any).max_arquivos_conhecimento ?? '∞'}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPlanModalOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleRequestPlanChange}
                disabled={!selectedPlanForRequest}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Solicitar Alteração
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}

export default function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { organization } = useAuth();

  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => !prev);
  };

  return (
    <div className="flex min-h-screen w-full bg-background liquid-bg">
      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden lg:fixed lg:left-0 lg:top-0 lg:z-40 lg:flex lg:h-screen liquid-glass-sidebar transition-all duration-300",
        isSidebarCollapsed ? "lg:w-[60px]" : "lg:w-60"
      )}>
        <SidebarContent 
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={toggleSidebar}
        />
      </aside>

      {/* Mobile Header */}
      <header className="fixed top-0 left-0 right-0 z-50 flex h-14 items-center justify-between liquid-glass-subtle px-4 lg:hidden">
        <div className="flex items-center gap-2.5">
          <AppLogo variant="org" height={28} />
        </div>
        
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[260px] p-0 liquid-glass-strong border-border">
            <SidebarContent onNavigate={() => setMobileMenuOpen(false)} />
          </SheetContent>
        </Sheet>
      </header>

      {/* Main Content */}
      <main className={cn(
        "w-full h-screen pt-14 lg:pt-0 overflow-hidden transition-all duration-300",
        isSidebarCollapsed ? "lg:ml-[60px]" : "lg:ml-60"
      )}>
        <div className="h-full overflow-y-auto">
          <Outlet />
        </div>
      </main>

      <SupportButton />
    </div>
  );
}
