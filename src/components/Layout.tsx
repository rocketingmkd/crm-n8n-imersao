import { Outlet, useLocation } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { useState, useEffect, useMemo } from "react";
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  Plug, 
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
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { usePlanFeatures } from "@/hooks/usePlanFeatures";
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
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import SupportButton from "@/components/SupportButton";

// Definição dos itens de navegação com suas features necessárias
const allNavigationItems = [
  { name: "Dashboard", href: "/app/dashboard", icon: LayoutDashboard, requiredFeature: null },
  { name: "Agenda", href: "/app/agenda", icon: Calendar, requiredFeature: 'agendamento_automatico' as const },
  { name: "Clientes", href: "/app/clientes/crm", icon: Users, requiredFeature: null },
  { name: "Kanban", href: "/app/clientes/kanban", icon: KanbanIcon, requiredFeature: null },
  { name: "Agente de IA", href: "/app/agent-ia", icon: Bot, requiredFeature: null },
  { name: "Conhecimento do Agente", href: "/app/conhecimento", icon: BookOpen, requiredFeature: 'base_conhecimento' as const },
  { name: "Integração WhatsApp", href: "/app/integrations", icon: Plug, requiredFeature: null },
];

import flowgrammersLogo from "@/assets/logo-flowgrammers.png";

function FlowgrammersLogo({ size = 32 }: { size?: number }) {
  return (
    <img
      src={flowgrammersLogo}
      alt="Flowgrammers"
      style={{ height: size, width: 'auto' }}
      className="object-contain"
    />
  );
}

function SidebarContent({ onNavigate, isCollapsed, onToggleCollapse }: { 
  onNavigate?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  const location = useLocation();
  const { profile, organization, signOut } = useAuth();
  const { features } = usePlanFeatures();
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [selectedPlanForRequest, setSelectedPlanForRequest] = useState<string | null>(null);

  // Filtrar navegação baseado nas features do plano
  const navigation = useMemo(() => {
    return allNavigationItems.filter(item => {
      if (!item.requiredFeature) return true;
      return features[item.requiredFeature];
    });
  }, [features]);

  // Listener para abrir modal de planos via evento customizado
  useEffect(() => {
    const handleOpenPlanModal = () => setIsPlanModalOpen(true);
    window.addEventListener('open-plan-modal', handleOpenPlanModal);
    return () => window.removeEventListener('open-plan-modal', handleOpenPlanModal);
  }, []);

  // Carregar planos disponíveis
  const { data: plans = [] } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_plan_configs')
        .select('*')
        .order('plan_id', { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  const currentPlan = plans.find(p => p.plan_id === organization?.subscription_plan);

  const handleRequestPlanChange = async () => {
    if (!selectedPlanForRequest || !organization?.id) {
      toast.error('Por favor, selecione um plano');
      return;
    }

    try {
      toast.success('Solicitação enviada! Entraremos em contato em breve.', {
        description: `Plano solicitado: ${plans.find(p => p.plan_id === selectedPlanForRequest)?.plan_name}`,
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
    <div className="flex h-full flex-col relative">
      {/* Botão de Colapsar/Expandir */}
      {onToggleCollapse && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className="absolute -right-3 top-4 z-50 h-6 w-6 rounded-full border border-primary/30 bg-background shadow-md hover:bg-primary/20 hover:border-primary/50 transition-all hidden lg:flex"
        >
          {isCollapsed ? (
            <ChevronRight className="h-3.5 w-3.5 text-primary" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5 text-primary" />
          )}
        </Button>
      )}

      {/* Logo & Organization */}
      <div className={cn(
        "border-b border-primary/30 py-4 transition-all duration-300",
        isCollapsed ? "px-2" : "px-4 md:px-6"
      )}>
        <div className={cn(
          "flex items-center mb-3 transition-all duration-300",
          isCollapsed ? "justify-center" : "gap-3"
        )}>
          {organization?.logo_url ? (
            <img
              src={organization.logo_url}
              alt={organization.name}
              className={cn(
                "w-auto object-contain transition-all duration-300",
                isCollapsed ? "h-8 max-w-[40px]" : "h-10 md:h-12 max-w-[160px]"
              )}
            />
          ) : (
            <div className="flex items-center gap-2">
              <FlowgrammersLogo size={isCollapsed ? 28 : 32} />
              {!isCollapsed && (
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-foreground leading-tight">Flowgrammers</span>
                  <span className="text-xs text-muted-foreground leading-tight">FlowClinic</span>
                </div>
              )}
            </div>
          )}
        </div>
        {organization && !isCollapsed && (
          <div className="px-2">
            <p className="text-xs font-medium text-muted-foreground">Organização</p>
            <p className="text-sm font-semibold text-foreground truncate">{organization.name}</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className={cn(
        "flex-1 space-y-1 py-6 md:py-8 overflow-y-auto transition-all duration-300",
        isCollapsed ? "px-2" : "px-3 md:px-4"
      )}>
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;

          return (
            <NavLink
              key={item.name}
              to={item.href}
              onClick={onNavigate}
              className={cn(
                "group flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-200",
                isCollapsed ? "justify-center p-2.5 md:p-3" : "px-3 md:px-4 py-2.5 md:py-3",
                isActive
                  ? "gradient-pink text-primary-foreground shadow-pink"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
              title={isCollapsed ? item.name : undefined}
            >
              <item.icon className={cn(
                "h-5 w-5 shrink-0 transition-all duration-200",
                isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
              )} />
              {!isCollapsed && <span className="truncate">{item.name}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className={cn(
        "border-t border-primary/30 space-y-3 transition-all duration-300",
        isCollapsed ? "p-2" : "p-3 md:p-4"
      )}>
        {/* Badge do Plano */}
        {currentPlan && !isCollapsed && (
          <div 
            onClick={() => setIsPlanModalOpen(true)}
            className="rounded-lg border-2 border-primary/30 p-3 cursor-pointer transition-all hover:border-primary/50 hover:shadow-pink"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold text-foreground">
                  {currentPlan.plan_name}
                </span>
              </div>
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
            </div>
          </div>
        )}

        {currentPlan && isCollapsed && (
          <div 
            onClick={() => setIsPlanModalOpen(true)}
            className="rounded-lg border-2 border-primary/30 p-2 cursor-pointer transition-all hover:border-primary/50 flex items-center justify-center"
            title={currentPlan.plan_name}
          >
            <Crown className="h-5 w-5 text-primary" />
          </div>
        )}

        <div className={cn(
          "flex items-center rounded-lg bg-secondary/50 transition-all duration-300",
          isCollapsed ? "justify-center p-2" : "gap-3 px-3 md:px-4 py-2.5 md:py-3"
        )}>
          <div className="flex h-9 w-9 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-full gradient-pink">
            <span className="text-xs md:text-sm font-semibold text-primary-foreground">
              {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
            </span>
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {profile?.full_name || 'Usuário'}
              </p>
              <p className="text-xs text-muted-foreground truncate capitalize">
                {profile?.role || 'doctor'}
              </p>
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className={cn(
            "w-full text-muted-foreground hover:bg-destructive/20 hover:text-destructive transition-all duration-300",
            isCollapsed ? "justify-center p-2" : "justify-start gap-2"
          )}
          title={isCollapsed ? "Sair" : undefined}
        >
          <LogOut className="h-4 w-4" />
          {!isCollapsed && <span>Sair</span>}
        </Button>
      </div>

      {/* Modal de Planos */}
      <Dialog open={isPlanModalOpen} onOpenChange={setIsPlanModalOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto bg-card border-primary/30">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Alterar Plano de Assinatura
            </DialogTitle>
            <DialogDescription>
              Seu plano atual: <strong>{currentPlan?.plan_name}</strong>. 
              Selecione um novo plano para solicitar a alteração.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            {plans.map((plan) => {
              const isCurrentPlan = plan.plan_id === organization?.subscription_plan;
              const isSelected = selectedPlanForRequest === plan.plan_id;
              
              return (
                <div
                  key={plan.plan_id}
                  onClick={() => !isCurrentPlan && setSelectedPlanForRequest(plan.plan_id)}
                  className={cn(
                    "relative p-5 rounded-lg border-2 transition-all cursor-pointer",
                    isCurrentPlan && "border-primary bg-primary/5 cursor-not-allowed opacity-75",
                    isSelected && !isCurrentPlan && "border-primary bg-primary/5 ring-2 ring-primary",
                    !isSelected && !isCurrentPlan && "border-border hover:border-primary/50"
                  )}
                >
                  {isCurrentPlan && (
                    <div className="absolute top-2 right-2">
                      <Badge className="gradient-pink text-primary-foreground border-0">
                        Plano Atual
                      </Badge>
                    </div>
                  )}

                  {isSelected && !isCurrentPlan && (
                    <div className="absolute top-2 right-2 h-6 w-6 rounded-full gradient-pink flex items-center justify-center">
                      <Check className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}

                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                      <Crown className="h-5 w-5 text-primary" />
                      {plan.plan_name}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {plan.plan_description}
                    </p>
                    <div className="mt-3">
                      <span className="text-3xl font-bold text-foreground">
                        R$ {plan.price_monthly?.toFixed(2)}
                      </span>
                      <span className="text-sm text-muted-foreground">/mês</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">Recursos:</p>
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
                      <p className="text-xs font-semibold text-muted-foreground uppercase mb-1.5">Limites:</p>
                      <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                        <div><span className="font-medium">Agendamentos:</span> {plan.max_agendamentos_mes || '∞'}</div>
                        <div><span className="font-medium">Mensagens:</span> {plan.max_mensagens_whatsapp_mes || '∞'}</div>
                        <div><span className="font-medium">Usuários:</span> {plan.max_usuarios || '∞'}</div>
                        <div><span className="font-medium">Pacientes:</span> {plan.max_pacientes || '∞'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPlanModalOpen(false)} className="border-primary/30 hover:bg-primary/10">
              Cancelar
            </Button>
            <Button 
              onClick={handleRequestPlanChange}
              disabled={!selectedPlanForRequest}
              className="gradient-pink text-primary-foreground shadow-pink hover:opacity-90"
            >
              Solicitar Alteração
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => !prev);
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden lg:fixed lg:left-0 lg:top-0 lg:z-40 lg:flex lg:h-screen lg:border-r lg:border-primary/30 lg:bg-background transition-all duration-300",
        isSidebarCollapsed ? "lg:w-16" : "lg:w-64"
      )}>
        <SidebarContent 
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={toggleSidebar}
        />
      </aside>

      {/* Mobile Header */}
      <header className="fixed top-0 left-0 right-0 z-50 flex h-16 items-center justify-between border-b border-primary/30 bg-background/95 backdrop-blur-sm px-4 lg:hidden">
        <div className="flex items-center gap-2">
          <FlowgrammersLogo size={28} />
          <div className="flex flex-col">
            <span className="text-xs font-bold text-foreground leading-tight">Flowgrammers</span>
            <span className="text-[10px] text-muted-foreground leading-tight">FlowClinic</span>
          </div>
        </div>
        
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-secondary">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[280px] p-0 bg-background border-primary/30">
            <SidebarContent onNavigate={() => setMobileMenuOpen(false)} />
          </SheetContent>
        </Sheet>
      </header>

      {/* Main Content */}
      <main className={cn(
        "w-full h-screen pt-16 lg:pt-0 overflow-hidden transition-all duration-300",
        isSidebarCollapsed ? "lg:ml-16" : "lg:ml-64"
      )}>
        <div className="h-full overflow-y-auto">
          <Outlet />
        </div>
      </main>

      {/* Support Button */}
      <SupportButton />
    </div>
  );
}
