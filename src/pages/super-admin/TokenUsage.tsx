import { useEffect, useState } from "react";
import { Zap, TrendingUp, Building2, DollarSign, Activity } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface OrganizationTokens {
  organization_id: string;
  organization_name: string;
  organization_logo: string | null;
  total_tokens: number;
  total_cost: number;
}

export default function TokenUsage() {
  const [isLoading, setIsLoading] = useState(true);
  const [orgTokens, setOrgTokens] = useState<OrganizationTokens[]>([]);
  const [grandTotalTokens, setGrandTotalTokens] = useState(0);
  const [grandTotalCost, setGrandTotalCost] = useState(0);

  useEffect(() => { loadTokenUsage(); }, []);

  const loadTokenUsage = async () => {
    try {
      setIsLoading(true);
      const { data: tokenData, error: tokenError } = await supabase.from("token_usage").select("organization_id, total_tokens, cost_reais");
      if (tokenError) throw tokenError;
      const { data: orgsData, error: orgsError } = await supabase.from("organizations").select("id, name, logo_url");
      if (orgsError) throw orgsError;
      const grouped: Record<string, { total_tokens: number; total_cost: number }> = {};
      tokenData?.forEach((r) => {
        if (!grouped[r.organization_id]) grouped[r.organization_id] = { total_tokens: 0, total_cost: 0 };
        grouped[r.organization_id].total_tokens += r.total_tokens || 0;
        grouped[r.organization_id].total_cost += r.cost_reais || 0;
      });
      const result: OrganizationTokens[] = Object.entries(grouped).map(([orgId, data]) => {
        const org = orgsData?.find((o) => o.id === orgId);
        return { organization_id: orgId, organization_name: org?.name || "Desconhecida", organization_logo: org?.logo_url || null, ...data };
      }).sort((a, b) => b.total_cost - a.total_cost);
      setOrgTokens(result);
      setGrandTotalTokens(result.reduce((s, o) => s + o.total_tokens, 0));
      setGrandTotalCost(result.reduce((s, o) => s + o.total_cost, 0));
    } catch (error) {
      console.error("Erro:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  const avgCostPerOrg = orgTokens.length > 0 ? grandTotalCost / orgTokens.length : 0;
  const avgTokensPerOrg = orgTokens.length > 0 ? grandTotalTokens / orgTokens.length : 0;

  const kpis = [
    { title: "Total de Tokens", value: grandTotalTokens.toLocaleString('pt-BR'), description: `${orgTokens.length} empresas`, icon: Zap },
    { title: "Custo Total", value: grandTotalCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 }), description: "Todos os gastos", icon: DollarSign },
    { title: "Média por Empresa", value: avgCostPerOrg.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 }), description: "Custo médio", icon: TrendingUp },
    { title: "Empresas Ativas", value: orgTokens.length, description: "Com consumo", icon: Activity },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Observabilidade</h1>
        <p className="text-sm text-muted-foreground mt-1">Consumo de tokens e custos por empresa</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.title} className="border-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">{kpi.title}</CardTitle>
                <div className="rounded-lg bg-primary/10 p-2"><Icon className="h-4 w-4 text-primary" /></div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{kpi.value}</div>
                <p className="text-[10px] text-muted-foreground mt-1">{kpi.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Summary */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-foreground text-base">Resumo Detalhado</CardTitle>
          <CardDescription>Estatísticas gerais de consumo</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-lg p-4 border border-border bg-muted/30">
              <div className="flex items-center gap-2 mb-2"><Zap className="h-4 w-4 text-primary" /><p className="text-xs text-muted-foreground">Total de Tokens</p></div>
              <p className="text-2xl font-bold text-foreground">{grandTotalTokens.toLocaleString('pt-BR')}</p>
              <p className="text-[10px] text-muted-foreground mt-1">Média: {Math.round(avgTokensPerOrg).toLocaleString('pt-BR')} por empresa</p>
            </div>
            <div className="rounded-lg p-4 border border-border bg-muted/30">
              <div className="flex items-center gap-2 mb-2"><DollarSign className="h-4 w-4 text-primary" /><p className="text-xs text-muted-foreground">Custo Total</p></div>
              <p className="text-2xl font-bold text-primary">{grandTotalCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              <p className="text-[10px] text-muted-foreground mt-1">Média: {avgCostPerOrg.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })} por empresa</p>
            </div>
            <div className="rounded-lg p-4 border border-border bg-muted/30">
              <div className="flex items-center gap-2 mb-2"><Building2 className="h-4 w-4 text-primary" /><p className="text-xs text-muted-foreground">Empresas</p></div>
              <p className="text-2xl font-bold text-foreground">{orgTokens.length}</p>
              <p className="text-[10px] text-muted-foreground mt-1">Com consumo registrado</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Per org */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Consumo por Empresa</h2>
        {orgTokens.length === 0 ? (
          <Card className="border-border">
            <CardContent className="py-12 text-center">
              <Zap className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Nenhum consumo registrado ainda</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {orgTokens.map((org) => {
              const percentage = grandTotalCost > 0 ? (org.total_cost / grandTotalCost) * 100 : 0;
              return (
                <Card key={org.organization_id} className="border-border hover:border-primary/30 transition-all">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {org.organization_logo ? (
                          <img src={org.organization_logo} alt={org.organization_name} className="h-9 w-9 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 shrink-0">
                            <Building2 className="h-4 w-4 text-primary" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-foreground text-sm truncate">{org.organization_name}</CardTitle>
                          <CardDescription className="text-[10px]">{percentage.toFixed(1)}% do total</CardDescription>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.min(percentage, 100)}%` }} />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-lg p-2.5 border border-border bg-muted/30">
                          <p className="text-[10px] text-muted-foreground mb-0.5">Tokens</p>
                          <p className="text-base font-bold text-foreground">{org.total_tokens.toLocaleString('pt-BR')}</p>
                        </div>
                        <div className="rounded-lg p-2.5 border border-border bg-muted/30">
                          <p className="text-[10px] text-muted-foreground mb-0.5">Custo</p>
                          <p className="text-base font-bold text-primary">{org.total_cost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
