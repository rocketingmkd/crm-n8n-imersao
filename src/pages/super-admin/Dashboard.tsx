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
  // Buscar estatísticas
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["super-admin-stats"],
    queryFn: async () => {
      // Total de organizações
      const { count: totalOrgs } = await supabase
        .from("organizations")
        .select("*", { count: "exact", head: true });

      // Organizações ativas
      const { count: activeOrgs } = await supabase
        .from("organizations")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);

      // Total de usuários
      const { count: totalUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("is_super_admin", false);

      // Total de pacientes
      const { count: totalPatients } = await supabase
        .from("patients")
        .select("*", { count: "exact", head: true });

      // Total de compromissos
      const { count: totalAppointments } = await supabase
        .from("appointments")
        .select("*", { count: "exact", head: true });

      // Total de tokens e custos
      const { data: tokenData } = await supabase
        .from("token_usage")
        .select("total_tokens, cost_reais");

      const totalTokens = tokenData?.reduce((sum, item) => sum + (item.total_tokens || 0), 0) || 0;
      const totalCost = tokenData?.reduce((sum, item) => sum + (Number(item.cost_reais) || 0), 0) || 0;

      return {
        totalOrganizations: totalOrgs || 0,
        activeOrganizations: activeOrgs || 0,
        totalUsers: totalUsers || 0,
        totalPatients: totalPatients || 0,
        totalAppointments: totalAppointments || 0,
        totalTokens,
        totalCost,
      };
    },
  });

  // Buscar dados de tokens para gráficos
  const { data: tokenUsageData, isLoading: loadingTokens } = useQuery({
    queryKey: ["token-usage-charts"],
    queryFn: async () => {
      // Buscar todos os registros de token_usage
      const { data: allTokens, error } = await supabase
        .from("token_usage")
        .select("organization_id, total_tokens, cost_reais, created_at")
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Buscar organizações
      const { data: orgs } = await supabase
        .from("organizations")
        .select("id, name");

      const orgsMap = new Map(orgs?.map(o => [o.id, o.name]) || []);

      // Agrupar por data (últimos 30 dias)
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      const dailyData: Record<string, { tokens: number; cost: number }> = {};
      const orgData: Record<string, { tokens: number; cost: number }> = {};

      allTokens?.forEach((item) => {
        const date = new Date(item.created_at);
        if (date >= thirtyDaysAgo) {
          const dateKey = date.toISOString().split('T')[0];
          if (!dailyData[dateKey]) {
            dailyData[dateKey] = { tokens: 0, cost: 0 };
          }
          dailyData[dateKey].tokens += item.total_tokens || 0;
          dailyData[dateKey].cost += Number(item.cost_reais) || 0;
        }

        // Agrupar por organização
        const orgName = orgsMap.get(item.organization_id) || 'Desconhecida';
        if (!orgData[orgName]) {
          orgData[orgName] = { tokens: 0, cost: 0 };
        }
        orgData[orgName].tokens += item.total_tokens || 0;
        orgData[orgName].cost += Number(item.cost_reais) || 0;
      });

      // Converter para arrays para os gráficos
      const dailyChartData: TokenUsageData[] = Object.entries(dailyData)
        .map(([date, data]) => ({
          date: new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          tokens: data.tokens,
          cost: Number(data.cost.toFixed(8)),
        }))
        .sort((a, b) => new Date(a.date.split('/').reverse().join('-')).getTime() - new Date(b.date.split('/').reverse().join('-')).getTime());

      const orgChartData: OrganizationTokenData[] = Object.entries(orgData)
        .map(([name, data]) => ({
          name: name.length > 20 ? name.substring(0, 20) + '...' : name,
          tokens: data.tokens,
          cost: Number(data.cost.toFixed(8)),
        }))
        .sort((a, b) => b.tokens - a.tokens)
        .slice(0, 10); // Top 10 organizações

      return {
        daily: dailyChartData,
        byOrganization: orgChartData,
      };
    },
  });

  // Buscar últimas organizações
  const { data: recentOrgs } = useQuery({
    queryKey: ["recent-organizations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96 bg-black">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-pink-500 border-t-transparent"></div>
      </div>
    );
  }

  const kpis = [
    {
      title: "Total de Organizações",
      value: stats?.totalOrganizations || 0,
      description: `${stats?.activeOrganizations || 0} ativas`,
      icon: Building2,
      color: "from-pink-500 to-rose-500",
    },
    {
      title: "Total de Usuários",
      value: stats?.totalUsers || 0,
      description: "Usuários cadastrados",
      icon: Users,
      color: "from-pink-400 to-fuchsia-500",
    },
    {
      title: "Total de Pacientes",
      value: stats?.totalPatients || 0,
      description: "Em todas as organizações",
      icon: Activity,
      color: "from-rose-500 to-pink-500",
    },
    {
      title: "Total de Compromissos",
      value: stats?.totalAppointments || 0,
      description: "Agendamentos totais",
      icon: TrendingUp,
      color: "from-pink-600 to-rose-600",
    },
    {
      title: "Total de Tokens",
      value: (stats?.totalTokens || 0).toLocaleString('pt-BR'),
      description: "Consumidos no sistema",
      icon: Zap,
      color: "from-pink-500 to-fuchsia-600",
    },
    {
      title: "Custo Total (R$)",
      value: (stats?.totalCost || 0).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 8
      }),
      description: "Gasto com tokens",
      icon: DollarSign,
      color: "from-rose-400 to-pink-400",
    },
  ];

  return (
    <div className="space-y-6 bg-black min-h-screen p-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 mt-1">
          Visão geral do sistema
        </p>
      </div>

      {/* KPIs Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card
              key={kpi.title}
              className="border-pink-500/30 bg-black/80 backdrop-blur-xl"
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-white">
                  {kpi.title}
                </CardTitle>
                <div
                  className={`rounded-lg bg-gradient-to-br ${kpi.color} p-2`}
                >
                  <Icon className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {kpi.value}
                </div>
                <p className="text-xs text-gray-400 mt-1">{kpi.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Gráficos de Tokens */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Gráfico de Tokens ao Longo do Tempo */}
        <Card className="border-pink-500/30 bg-black/80 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Zap className="h-5 w-5 text-pink-500" />
              Consumo de Tokens (Últimos 30 dias)
            </CardTitle>
            <CardDescription className="text-gray-400">
              Evolução do consumo de tokens ao longo do tempo
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingTokens ? (
              <div className="flex items-center justify-center h-64">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-pink-500 border-t-transparent"></div>
              </div>
            ) : tokenUsageData?.daily && tokenUsageData.daily.length > 0 ? (
              <ChartContainer
                config={{
                  tokens: {
                    label: "Tokens",
                    color: "hsl(330, 81%, 60%)",
                  },
                }}
                className="h-[300px] w-full"
              >
                <LineChart data={tokenUsageData.daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(236, 72, 153, 0.1)" />
                  <XAxis 
                    dataKey="date" 
                    stroke="rgba(236, 72, 153, 0.5)"
                    style={{ fontSize: '12px' }}
                    tick={{ fill: 'rgba(255, 255, 255, 0.7)' }}
                  />
                  <YAxis 
                    stroke="rgba(236, 72, 153, 0.5)"
                    style={{ fontSize: '12px' }}
                    tick={{ fill: 'rgba(255, 255, 255, 0.7)' }}
                    tickFormatter={(value) => {
                      if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                      if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
                      return value.toString();
                    }}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line 
                    type="monotone" 
                    dataKey="tokens" 
                    stroke="rgb(236, 72, 153)" 
                    strokeWidth={2}
                    dot={{ fill: "rgb(236, 72, 153)", r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-400">
                Nenhum dado disponível
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gráfico de Custo ao Longo do Tempo */}
        <Card className="border-pink-500/30 bg-black/80 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-pink-500" />
              Custo em Reais (Últimos 30 dias)
            </CardTitle>
            <CardDescription className="text-gray-400">
              Evolução dos custos com tokens ao longo do tempo
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingTokens ? (
              <div className="flex items-center justify-center h-64">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-pink-500 border-t-transparent"></div>
              </div>
            ) : tokenUsageData?.daily && tokenUsageData.daily.length > 0 ? (
              <ChartContainer
                config={{
                  cost: {
                    label: "Custo (R$)",
                    color: "hsl(330, 81%, 60%)",
                  },
                }}
                className="h-[300px] w-full"
              >
                <LineChart data={tokenUsageData.daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(236, 72, 153, 0.1)" />
                  <XAxis 
                    dataKey="date" 
                    stroke="rgba(236, 72, 153, 0.5)"
                    style={{ fontSize: '12px' }}
                    tick={{ fill: 'rgba(255, 255, 255, 0.7)' }}
                  />
                  <YAxis 
                    stroke="rgba(236, 72, 153, 0.5)"
                    style={{ fontSize: '12px' }}
                    tick={{ fill: 'rgba(255, 255, 255, 0.7)' }}
                    tickFormatter={(value) => {
                      if (value >= 1) return `R$ ${value.toFixed(2)}`;
                      return `R$ ${value.toFixed(6)}`;
                    }}
                  />
                  <ChartTooltip 
                    content={<ChartTooltipContent />}
                    formatter={(value: number) => [
                      `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 8 })}`,
                      'Custo'
                    ]}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="cost" 
                    stroke="rgb(244, 114, 182)" 
                    strokeWidth={2}
                    dot={{ fill: "rgb(244, 114, 182)", r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-400">
                Nenhum dado disponível
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gráfico de Tokens por Organização */}
        <Card className="border-pink-500/30 bg-black/80 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Building2 className="h-5 w-5 text-pink-500" />
              Tokens por Empresa (Top 10)
            </CardTitle>
            <CardDescription className="text-gray-400">
              Distribuição de consumo de tokens por empresa
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingTokens ? (
              <div className="flex items-center justify-center h-64">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-pink-500 border-t-transparent"></div>
              </div>
            ) : tokenUsageData?.byOrganization && tokenUsageData.byOrganization.length > 0 ? (
              <ChartContainer
                config={{
                  tokens: {
                    label: "Tokens",
                    color: "hsl(330, 81%, 60%)",
                  },
                }}
                className="h-[300px] w-full"
              >
                <BarChart data={tokenUsageData.byOrganization} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(236, 72, 153, 0.1)" />
                  <XAxis 
                    type="number"
                    stroke="rgba(236, 72, 153, 0.5)"
                    style={{ fontSize: '12px' }}
                    tick={{ fill: 'rgba(255, 255, 255, 0.7)' }}
                    tickFormatter={(value) => {
                      if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                      if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
                      return value.toString();
                    }}
                  />
                  <YAxis 
                    type="category"
                    dataKey="name" 
                    stroke="rgba(236, 72, 153, 0.5)"
                    style={{ fontSize: '12px' }}
                    tick={{ fill: 'rgba(255, 255, 255, 0.7)' }}
                    width={120}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar 
                    dataKey="tokens" 
                    fill="rgb(236, 72, 153)"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-400">
                Nenhum dado disponível
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gráfico de Custo por Organização */}
        <Card className="border-pink-500/30 bg-black/80 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-pink-500" />
              Custo por Empresa (Top 10)
            </CardTitle>
            <CardDescription className="text-gray-400">
              Distribuição de custos por empresa
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingTokens ? (
              <div className="flex items-center justify-center h-64">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-pink-500 border-t-transparent"></div>
              </div>
            ) : tokenUsageData?.byOrganization && tokenUsageData.byOrganization.length > 0 ? (
              <ChartContainer
                config={{
                  cost: {
                    label: "Custo (R$)",
                    color: "hsl(330, 81%, 60%)",
                  },
                }}
                className="h-[300px] w-full"
              >
                <BarChart data={tokenUsageData.byOrganization} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(236, 72, 153, 0.1)" />
                  <XAxis 
                    type="number"
                    stroke="rgba(236, 72, 153, 0.5)"
                    style={{ fontSize: '12px' }}
                    tick={{ fill: 'rgba(255, 255, 255, 0.7)' }}
                    tickFormatter={(value) => {
                      if (value >= 1) return `R$ ${value.toFixed(2)}`;
                      return `R$ ${value.toFixed(6)}`;
                    }}
                  />
                  <YAxis 
                    type="category"
                    dataKey="name" 
                    stroke="rgba(236, 72, 153, 0.5)"
                    style={{ fontSize: '12px' }}
                    tick={{ fill: 'rgba(255, 255, 255, 0.7)' }}
                    width={120}
                  />
                  <ChartTooltip 
                    content={<ChartTooltipContent />}
                    formatter={(value: number) => [
                      `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 8 })}`,
                      'Custo'
                    ]}
                  />
                  <Bar 
                    dataKey="cost" 
                    fill="rgb(244, 114, 182)"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-400">
                Nenhum dado disponível
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Organizations */}
      <Card className="border-pink-500/30 bg-black/80 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-white">
            Empresas Recentes
          </CardTitle>
          <CardDescription className="text-gray-400">
            Últimas empresas cadastradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentOrgs?.map((org) => (
              <div
                key={org.id}
                className="flex items-center justify-between rounded-lg border border-pink-500/30 bg-black/60 p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-rose-500">
                    <Building2 className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-white">{org.name}</p>
                    <p className="text-xs text-gray-400">{org.slug}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      org.is_active
                        ? "bg-pink-600/20 text-pink-300 ring-1 ring-pink-500/30"
                        : "bg-gray-600/20 text-gray-300 ring-1 ring-gray-500/30"
                    }`}
                  >
                    {org.is_active ? "Ativa" : "Inativa"}
                  </span>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(org.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>
            ))}
            {(!recentOrgs || recentOrgs.length === 0) && (
              <p className="text-center text-gray-400 py-8">
                Nenhuma organização cadastrada ainda
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

