import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Building2, Users, Activity, TrendingUp, Zap, DollarSign } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";

interface DashboardStats {
  totalOrganizations: number;
  activeOrganizations: number;
  totalUsers: number;
  totalPatients: number;
  totalAppointments: number;
  totalTokens: number;
  totalCost: number;
}

interface TokenUsageData {
  date: string;
  tokens: number;
  cost: number;
}

interface OrganizationTokenData {
  name: string;
  tokens: number;
  cost: number;
}

export default function SuperAdminDashboard() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["super-admin-stats"],
    queryFn: async () => {
      const { count: totalOrgs } = await supabase.from("organizacoes").select("*", { count: "exact", head: true });
      const { count: activeOrgs } = await supabase.from("organizacoes").select("*", { count: "exact", head: true }).eq("ativo", true);
      const { count: totalUsers } = await supabase.from("perfis").select("*", { count: "exact", head: true }).eq("super_admin", false);
      const { count: totalPatients } = await supabase.from("contatos").select("*", { count: "exact", head: true });
      const { count: totalAppointments } = await supabase.from("agendamentos").select("*", { count: "exact", head: true });
      const { data: tokenData } = await supabase.from("uso_tokens").select("total_tokens, custo_reais");
      const totalTokens = tokenData?.reduce((sum, item) => sum + (item.total_tokens || 0), 0) || 0;
      const totalCost = tokenData?.reduce((sum, item) => sum + (Number(item.custo_reais) || 0), 0) || 0;
      return {
        totalOrganizations: totalOrgs || 0, activeOrganizations: activeOrgs || 0,
        totalUsers: totalUsers || 0, totalPatients: totalPatients || 0,
        totalAppointments: totalAppointments || 0, totalTokens, totalCost,
      };
    },
  });

  const { data: tokenUsageData, isLoading: loadingTokens } = useQuery({
    queryKey: ["token-usage-charts"],
    queryFn: async () => {
      const { data: allTokens, error } = await supabase.from("uso_tokens").select("id_organizacao, total_tokens, custo_reais, criado_em").order("criado_em", { ascending: true });
      if (error) throw error;
      const { data: orgs } = await supabase.from("organizacoes").select("id, nome");
      const orgsMap = new Map(orgs?.map(o => [o.id, o.nome]) || []);
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const dailyData: Record<string, { tokens: number; cost: number }> = {};
      const orgData: Record<string, { tokens: number; cost: number }> = {};
      allTokens?.forEach((item) => {
        const date = new Date(item.criado_em);
        if (date >= thirtyDaysAgo) {
          const dateKey = date.toISOString().split('T')[0];
          if (!dailyData[dateKey]) dailyData[dateKey] = { tokens: 0, cost: 0 };
          dailyData[dateKey].tokens += item.total_tokens || 0;
          dailyData[dateKey].cost += Number(item.custo_reais) || 0;
        }
        const orgName = orgsMap.get(item.id_organizacao) || 'Desconhecida';
        if (!orgData[orgName]) orgData[orgName] = { tokens: 0, cost: 0 };
        orgData[orgName].tokens += item.total_tokens || 0;
        orgData[orgName].cost += Number(item.custo_reais) || 0;
      });
      const dailyChartData: TokenUsageData[] = Object.entries(dailyData)
        .map(([date, data]) => ({ date: new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), tokens: data.tokens, cost: Number(data.cost.toFixed(8)) }))
        .sort((a, b) => new Date(a.date.split('/').reverse().join('-')).getTime() - new Date(b.date.split('/').reverse().join('-')).getTime());
      const orgChartData: OrganizationTokenData[] = Object.entries(orgData)
        .map(([name, data]) => ({ name: name.length > 20 ? name.substring(0, 20) + '...' : name, tokens: data.tokens, cost: Number(data.cost.toFixed(8)) }))
        .sort((a, b) => b.tokens - a.tokens).slice(0, 10);
      return { daily: dailyChartData, byOrganization: orgChartData };
    },
  });

  const { data: recentOrgs } = useQuery({
    queryKey: ["recent-organizations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("organizacoes").select("*").order("criado_em", { ascending: false }).limit(5);
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  const kpis = [
    { title: "Organizações", value: stats?.totalOrganizations || 0, description: `${stats?.activeOrganizations || 0} ativas`, icon: Building2 },
    { title: "Usuários", value: stats?.totalUsers || 0, description: "Cadastrados", icon: Users },
    { title: "Clientes", value: stats?.totalPatients || 0, description: "Em todas as orgs", icon: Activity },
    { title: "Compromissos", value: stats?.totalAppointments || 0, description: "Agendamentos", icon: TrendingUp },
    { title: "Tokens", value: (stats?.totalTokens || 0).toLocaleString('pt-BR'), description: "Consumidos", icon: Zap },
    { title: "Custo (R$)", value: (stats?.totalCost || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), description: "Total gasto", icon: DollarSign },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Visão geral do sistema</p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.title} className="border-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">{kpi.title}</CardTitle>
                <div className="rounded-lg bg-primary/10 p-2">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{kpi.value}</div>
                <p className="text-[10px] text-muted-foreground mt-1">{kpi.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Tokens over time */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2 text-base">
              <Zap className="h-4 w-4 text-primary" />
              Consumo de Tokens (30 dias)
            </CardTitle>
            <CardDescription>Evolução do consumo ao longo do tempo</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingTokens ? (
              <div className="flex items-center justify-center h-64">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
              </div>
            ) : tokenUsageData?.daily && tokenUsageData.daily.length > 0 ? (
              <ChartContainer config={{ tokens: { label: "Tokens", color: "hsl(var(--primary))" } }} className="h-[280px] w-full">
                <LineChart data={tokenUsageData.daily}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" className="text-muted-foreground" style={{ fontSize: '11px' }} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis className="text-muted-foreground" style={{ fontSize: '11px' }} tick={{ fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(1)}K` : v.toString()} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="tokens" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))", r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">Nenhum dado disponível</div>
            )}
          </CardContent>
        </Card>

        {/* Cost over time */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2 text-base">
              <DollarSign className="h-4 w-4 text-primary" />
              Custo em Reais (30 dias)
            </CardTitle>
            <CardDescription>Evolução dos custos ao longo do tempo</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingTokens ? (
              <div className="flex items-center justify-center h-64">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
              </div>
            ) : tokenUsageData?.daily && tokenUsageData.daily.length > 0 ? (
              <ChartContainer config={{ cost: { label: "Custo (R$)", color: "hsl(var(--primary))" } }} className="h-[280px] w-full">
                <LineChart data={tokenUsageData.daily}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" style={{ fontSize: '11px' }} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis style={{ fontSize: '11px' }} tick={{ fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => v >= 1 ? `R$ ${v.toFixed(2)}` : `R$ ${v.toFixed(6)}`} />
                  <ChartTooltip content={<ChartTooltipContent />} formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 8 })}`, 'Custo']} />
                  <Line type="monotone" dataKey="cost" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))", r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">Nenhum dado disponível</div>
            )}
          </CardContent>
        </Card>

        {/* Tokens by org */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4 text-primary" />
              Tokens por Empresa (Top 10)
            </CardTitle>
            <CardDescription>Distribuição de consumo por empresa</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingTokens ? (
              <div className="flex items-center justify-center h-64"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div></div>
            ) : tokenUsageData?.byOrganization && tokenUsageData.byOrganization.length > 0 ? (
              <ChartContainer config={{ tokens: { label: "Tokens", color: "hsl(var(--primary))" } }} className="h-[280px] w-full">
                <BarChart data={tokenUsageData.byOrganization} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" style={{ fontSize: '11px' }} tick={{ fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(1)}K` : v.toString()} />
                  <YAxis type="category" dataKey="name" style={{ fontSize: '11px' }} tick={{ fill: 'hsl(var(--muted-foreground))' }} width={120} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="tokens" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">Nenhum dado disponível</div>
            )}
          </CardContent>
        </Card>

        {/* Cost by org */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2 text-base">
              <DollarSign className="h-4 w-4 text-primary" />
              Custo por Empresa (Top 10)
            </CardTitle>
            <CardDescription>Distribuição de custos por empresa</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingTokens ? (
              <div className="flex items-center justify-center h-64"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div></div>
            ) : tokenUsageData?.byOrganization && tokenUsageData.byOrganization.length > 0 ? (
              <ChartContainer config={{ cost: { label: "Custo (R$)", color: "hsl(var(--primary))" } }} className="h-[280px] w-full">
                <BarChart data={tokenUsageData.byOrganization} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" style={{ fontSize: '11px' }} tick={{ fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => v >= 1 ? `R$ ${v.toFixed(2)}` : `R$ ${v.toFixed(6)}`} />
                  <YAxis type="category" dataKey="name" style={{ fontSize: '11px' }} tick={{ fill: 'hsl(var(--muted-foreground))' }} width={120} />
                  <ChartTooltip content={<ChartTooltipContent />} formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 8 })}`, 'Custo']} />
                  <Bar dataKey="cost" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} opacity={0.8} />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">Nenhum dado disponível</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Orgs */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-foreground text-base">Empresas Recentes</CardTitle>
          <CardDescription>Últimas empresas cadastradas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentOrgs?.map((org) => (
              <div key={org.id} className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                    <Building2 className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{org.nome}</p>
                    <p className="text-[10px] text-muted-foreground">{org.identificador}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    org.ativo ? "bg-primary/10 text-primary ring-1 ring-primary/20" : "bg-muted text-muted-foreground ring-1 ring-border"
                  }`}>
                    {org.ativo ? "Ativa" : "Inativa"}
                  </span>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {new Date(org.criado_em).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>
            ))}
            {(!recentOrgs || recentOrgs.length === 0) && (
              <p className="text-center text-muted-foreground py-8 text-sm">Nenhuma empresa cadastrada ainda</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
