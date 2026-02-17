import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Crown, Check, X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlanConfig {
  id: string;
  plan_id: string;
  plan_name: string;
  plan_description: string | null;
  atendimento_inteligente: boolean;
  agendamento_automatico: boolean;
  lembretes_automaticos: boolean;
  confirmacao_email: boolean;
  base_conhecimento: boolean;
  relatorios_avancados: boolean;
  integracao_whatsapp: boolean;
  multi_usuarios: boolean;
  personalizacao_agente: boolean;
  analytics: boolean;
  max_agendamentos_mes: number | null;
  max_mensagens_whatsapp_mes: number | null;
  max_usuarios: number | null;
  max_pacientes: number | null;
  price_monthly: number | null;
  price_annual: number | null;
}

const mainFeatures = [
  { key: 'atendimento_inteligente', label: 'Atendimento Inteligente', description: 'Chatbot com IA para atendimento' },
  { key: 'base_conhecimento', label: 'Base de Conhecimento', description: 'Personalização com informações do negócio' },
  { key: 'agendamento_automatico', label: 'Agendamento Automático', description: 'Sistema de agenda integrado' },
];

const secondaryFeatures = [
  { key: 'lembretes_automaticos', label: 'Lembretes Automáticos' },
  { key: 'confirmacao_email', label: 'Confirmação por Email' },
  { key: 'relatorios_avancados', label: 'Relatórios Avançados' },
  { key: 'integracao_whatsapp', label: 'Integração WhatsApp' },
  { key: 'multi_usuarios', label: 'Múltiplos Usuários' },
  { key: 'personalizacao_agente', label: 'Personalização do Agente' },
  { key: 'analytics', label: 'Analytics' },
];

export default function Plans() {
  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['admin-subscription-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_plan_configs')
        .select('*')
        .order('plan_id', { ascending: true });
      if (error) throw error;
      return data as PlanConfig[];
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Planos de Assinatura</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Visualize os planos disponíveis e seus recursos
        </p>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {plans.map((plan, index) => {
          const isPopular = index === 1;
          return (
            <Card 
              key={plan.plan_id}
              className={cn(
                "border transition-all hover:shadow-lg hover:shadow-primary/5 hover:border-primary/40",
                isPopular
                  ? "border-primary/50 ring-1 ring-primary/20"
                  : "border-border"
              )}
            >
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Crown className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-foreground text-base">{plan.plan_name}</CardTitle>
                      <CardDescription className="text-muted-foreground text-xs mt-0.5">
                        {plan.plan_description}
                      </CardDescription>
                    </div>
                  </div>
                  {isPopular && (
                    <span className="text-[10px] font-semibold uppercase tracking-wider bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                      Popular
                    </span>
                  )}
                </div>
                
                {/* Price */}
                <div className="mt-4 pt-4 border-t border-border">
                  {plan.price_monthly ? (
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-foreground">
                        R$ {plan.price_monthly.toFixed(2)}
                      </span>
                      <span className="text-sm text-muted-foreground">/mês</span>
                    </div>
                  ) : (
                    <span className="text-base font-semibold text-muted-foreground">
                      Sob consulta
                    </span>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-5">
                {/* Main Features */}
                <div className="space-y-2.5">
                  <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                    Recursos Principais
                  </h3>
                  <div className="space-y-2">
                    {mainFeatures.map((feature) => {
                      const isEnabled = plan[feature.key as keyof PlanConfig] as boolean;
                      return (
                        <div 
                          key={feature.key} 
                          className={cn(
                            "flex items-center gap-3 p-2.5 rounded-lg border transition-colors",
                            isEnabled 
                              ? "bg-primary/5 border-primary/20" 
                              : "bg-muted/30 border-border/50"
                          )}
                        >
                          {isEnabled ? (
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 shrink-0">
                              <Check className="h-3 w-3 text-primary" />
                            </div>
                          ) : (
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-muted shrink-0">
                              <X className="h-3 w-3 text-muted-foreground/40" />
                            </div>
                          )}
                          <div>
                            <p className={cn(
                              "text-xs font-medium",
                              isEnabled ? "text-foreground" : "text-muted-foreground/50"
                            )}>
                              {feature.label}
                            </p>
                            <p className={cn(
                              "text-[10px]",
                              isEnabled ? "text-muted-foreground" : "text-muted-foreground/30"
                            )}>
                              {feature.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Secondary Features */}
                <div className="space-y-2.5">
                  <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                    Outros Recursos
                  </h3>
                  <div className="grid grid-cols-2 gap-1.5">
                    {secondaryFeatures.map((feature) => {
                      const isEnabled = plan[feature.key as keyof PlanConfig] as boolean;
                      return (
                        <div key={feature.key} className="flex items-center gap-2 py-1">
                          {isEnabled ? (
                            <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                          ) : (
                            <X className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />
                          )}
                          <span className={cn(
                            "text-[11px]",
                            isEnabled ? "text-foreground" : "text-muted-foreground/40"
                          )}>
                            {feature.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Limits */}
                <div className="space-y-2.5 pt-4 border-t border-border">
                  <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                    Limites
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: plan.max_agendamentos_mes, label: 'Agendamentos/mês' },
                      { value: plan.max_mensagens_whatsapp_mes, label: 'Mensagens/mês' },
                      { value: plan.max_usuarios, label: 'Usuários' },
                      { value: plan.max_pacientes, label: 'Clientes' },
                    ].map((limit) => (
                      <div
                        key={limit.label}
                        className="text-center p-2.5 rounded-lg bg-muted/50 border border-border"
                      >
                        <p className="text-xl font-bold text-primary">
                          {limit.value || '∞'}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{limit.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Info */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-5 pb-5">
          <div className="flex gap-3">
            <AlertCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-foreground">
                Sobre os Planos
              </p>
              <p className="text-xs text-muted-foreground">
                Os recursos de cada plano são fixos. Para alterar o plano de uma empresa, 
                acesse a página de edição em "Empresas".
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
