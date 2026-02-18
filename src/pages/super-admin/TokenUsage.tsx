import { useEffect, useMemo, useState } from "react";
import { Zap, TrendingUp, Building2, DollarSign, Activity, CalendarDays, Filter } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, AreaChart, Area } from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface TokenRecord {
  id: string;
  organization_id: string;
  total_tokens: number;
  cost_reais: number;
  created_at: string;
}

interface Organization {
  id: string;
  name: string;
  logo_url: string | null;
}

type PeriodFilter = "7d" | "14d" | "30d" | "90d" | "all";

const PERIOD_OPTIONS: { value: PeriodFilter; label: string }[] = [
  { value: "7d", label: "Últimos 7 dias" },
  { value: "14d", label: "Últimas 2 semanas" },
  { value: "30d", label: "Último mês" },
  { value: "90d", label: "Últimos 3 meses" },
  { value: "all", label: "Todo o período" },
];

const CHART_COLORS = [
  "hsl(330, 85%, 55%)",
  "hsl(25, 95%, 53%)",
  "hsl(262, 83%, 58%)",
  "hsl(142, 72%, 40%)",
  "hsl(40, 90%, 55%)",
  "hsl(200, 80%, 50%)",
  "hsl(0, 72%, 50%)",
  "hsl(180, 60%, 45%)",
];

function getDaysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function formatDateBR(d: Date) {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function getWeekLabel(d: Date) {
  const start = new Date(d);
  start.setDate(start.getDate() - start.getDay());
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return `${formatDateBR(start)} - ${formatDateBR(end)}`;
}

function getMonthLabel(d: Date) {
  return d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
}

export default function TokenUsage() {
  const [isLoading, setIsLoading] = useState(true);
  const [records, setRecords] = useState<TokenRecord[]>([]);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [period, setPeriod] = useState<PeriodFilter>("30d");
  const [selectedOrg, setSelectedOrg] = useState<string>("all");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [tokenRes, orgsRes] = await Promise.all([
        supabase.from("token_usage").select("id, organization_id, total_tokens, cost_reais, created_at").order("created_at", { ascending: true }),
        supabase.from("organizations").select("id, name, logo_url"),
      ]);
      if (tokenRes.error) throw tokenRes.error;
      if (orgsRes.error) throw orgsRes.error;
      setRecords(tokenRes.data || []);
      setOrgs(orgsRes.data || []);
    } catch (error) {
      console.error("Erro:", error);
      toast.error("Erro ao carregar dados de tokens");
    } finally {
      setIsLoading(false);
    }
  };

  const orgMap = useMemo(() => new Map(orgs.map((o) => [o.id, o])), [orgs]);

  const filtered = useMemo(() => {
    let data = records;
    if (period !== "all") {
      const days = parseInt(period);
      const since = getDaysAgo(days);
      data = data.filter((r) => new Date(r.created_at) >= since);
    }
    if (selectedOrg !== "all") {
      data = data.filter((r) => r.organization_id === selectedOrg);
    }
    return data;
  }, [records, period, selectedOrg]);

  const totalTokens = filtered.reduce((s, r) => s + (r.total_tokens || 0), 0);
  const totalCost = filtered.reduce((s, r) => s + (r.cost_reais || 0), 0);

  const orgGroups = useMemo(() => {
    const map: Record<string, { tokens: number; cost: number; name: string }> = {};
    filtered.forEach((r) => {
      if (!map[r.organization_id]) {
        const org = orgMap.get(r.organization_id);
        map[r.organization_id] = { tokens: 0, cost: 0, name: org?.name || "Desconhecida" };
      }
      map[r.organization_id].tokens += r.total_tokens || 0;
      map[r.organization_id].cost += r.cost_reais || 0;
    });
    return Object.entries(map)
      .map(([id, d]) => ({ id, ...d }))
      .sort((a, b) => b.cost - a.cost);
  }, [filtered, orgMap]);

  // Daily chart data
  const dailyData = useMemo(() => {
    const map: Record<string, { tokens: number; cost: number }> = {};
    filtered.forEach((r) => {
      const key = new Date(r.created_at).toISOString().split("T")[0];
      if (!map[key]) map[key] = { tokens: 0, cost: 0 };
      map[key].tokens += r.total_tokens || 0;
      map[key].cost += r.cost_reais || 0;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, d]) => ({
        date: formatDateBR(new Date(date)),
        tokens: d.tokens,
        cost: Math.round(d.cost * 100) / 100,
      }));
  }, [filtered]);

  // Weekly chart data
  const weeklyData = useMemo(() => {
    const map: Record<string, { tokens: number; cost: number; label: string }> = {};
    filtered.forEach((r) => {
      const d = new Date(r.created_at);
      const weekStart = new Date(d);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const key = weekStart.toISOString().split("T")[0];
      if (!map[key]) map[key] = { tokens: 0, cost: 0, label: getWeekLabel(d) };
      map[key].tokens += r.total_tokens || 0;
      map[key].cost += r.cost_reais || 0;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, d]) => ({
        week: d.label,
        tokens: d.tokens,
        cost: Math.round(d.cost * 100) / 100,
      }));
  }, [filtered]);

  // Monthly chart data
  const monthlyData = useMemo(() => {
    const map: Record<string, { tokens: number; cost: number; label: string }> = {};
    filtered.forEach((r) => {
      const d = new Date(r.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!map[key]) map[key] = { tokens: 0, cost: 0, label: getMonthLabel(d) };
      map[key].tokens += r.total_tokens || 0;
      map[key].cost += r.cost_reais || 0;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, d]) => ({
        month: d.label,
        tokens: d.tokens,
        cost: Math.round(d.cost * 100) / 100,
      }));
  }, [filtered]);

  // Pie chart data (top orgs)
  const pieData = useMemo(() => {
    const top = orgGroups.slice(0, 7);
    const others = orgGroups.slice(7);
    const result = top.map((o) => ({ name: o.name.length > 18 ? o.name.slice(0, 18) + "..." : o.name, value: o.cost }));
    if (others.length > 0) {
      result.push({ name: "Outros", value: others.reduce((s, o) => s + o.cost, 0) });
    }
    return result;
  }, [orgGroups]);

  // Org bar chart data
  const orgBarData = useMemo(() => {
    return orgGroups.slice(0, 10).map((o) => ({
      name: o.name.length > 15 ? o.name.slice(0, 15) + "..." : o.name,
      tokens: o.tokens,
      cost: Math.round(o.cost * 100) / 100,
    }));
  }, [orgGroups]);

  const orgsWithUsage = useMemo(() => {
    const ids = new Set(records.map((r) => r.organization_id));
    return orgs.filter((o) => ids.has(o.id));
  }, [records, orgs]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const avgCost = orgGroups.length > 0 ? totalCost / orgGroups.length : 0;

  const kpis = [
    { title: "Total de Tokens", value: totalTokens.toLocaleString("pt-BR"), icon: Zap },
    { title: "Custo Total", value: totalCost.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }), icon: DollarSign },
    { title: "Média por Empresa", value: avgCost.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }), icon: TrendingUp },
    { title: "Empresas Ativas", value: orgGroups.length, icon: Activity },
  ];

  const dailyChartConfig = {
    tokens: { label: "Tokens", color: "hsl(330, 85%, 55%)" },
    cost: { label: "Custo (R$)", color: "hsl(25, 95%, 53%)" },
  };

  const weeklyChartConfig = {
    tokens: { label: "Tokens", color: "hsl(262, 83%, 58%)" },
    cost: { label: "Custo (R$)", color: "hsl(142, 72%, 40%)" },
  };

  const monthlyChartConfig = {
    tokens: { label: "Tokens", color: "hsl(200, 80%, 50%)" },
    cost: { label: "Custo (R$)", color: "hsl(40, 90%, 55%)" },
  };

  const orgChartConfig = {
    tokens: { label: "Tokens", color: "hsl(330, 85%, 55%)" },
    cost: { label: "Custo (R$)", color: "hsl(25, 95%, 53%)" },
  };

  return (
    <div className="space-y-6">
      {/* Header + Filtros */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Consumo de Tokens</h1>
          <p className="text-sm text-muted-foreground mt-1">Acompanhe o uso de tokens e custos por empresa</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <Select value={period} onValueChange={(v) => setPeriod(v as PeriodFilter)}>
              <SelectTrigger className="w-[160px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1.5">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedOrg} onValueChange={setSelectedOrg}>
              <SelectTrigger className="w-[180px] h-8 text-xs">
                <SelectValue placeholder="Todas as empresas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as empresas</SelectItem>
                {orgsWithUsage.map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* KPIs */}
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
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Gráficos: Diário + Semanal */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Consumo Diário (Area) */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base text-foreground flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Consumo Diário
            </CardTitle>
            <CardDescription>Tokens consumidos por dia</CardDescription>
          </CardHeader>
          <CardContent>
            {dailyData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sem dados no período</p>
            ) : (
              <ChartContainer config={dailyChartConfig} className="h-[220px] w-full">
                <AreaChart data={dailyData} margin={{ left: 0, right: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area type="monotone" dataKey="tokens" name="Tokens" stroke="hsl(330, 85%, 55%)" fill="hsl(330, 85%, 55%)" fillOpacity={0.15} strokeWidth={2} />
                </AreaChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Consumo Semanal (Bar) */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base text-foreground flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              Consumo Semanal
            </CardTitle>
            <CardDescription>Tokens por semana</CardDescription>
          </CardHeader>
          <CardContent>
            {weeklyData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sem dados no período</p>
            ) : (
              <ChartContainer config={weeklyChartConfig} className="h-[220px] w-full">
                <BarChart data={weeklyData} margin={{ left: 0, right: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" />
                  <XAxis dataKey="week" tickLine={false} axisLine={false} tick={{ fontSize: 9 }} interval={0} angle={-20} textAnchor="end" height={50} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="tokens" name="Tokens" fill="hsl(262, 83%, 58%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Gráficos: Mensal + Custo Diário */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Consumo Mensal (Bar) */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base text-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Consumo Mensal
            </CardTitle>
            <CardDescription>Tokens por mês</CardDescription>
          </CardHeader>
          <CardContent>
            {monthlyData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sem dados no período</p>
            ) : (
              <ChartContainer config={monthlyChartConfig} className="h-[220px] w-full">
                <BarChart data={monthlyData} margin={{ left: 0, right: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="tokens" name="Tokens" fill="hsl(200, 80%, 50%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Custo Diário (Line) */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base text-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              Custo Diário (R$)
            </CardTitle>
            <CardDescription>Evolução do custo por dia</CardDescription>
          </CardHeader>
          <CardContent>
            {dailyData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sem dados no período</p>
            ) : (
              <ChartContainer config={dailyChartConfig} className="h-[220px] w-full">
                <LineChart data={dailyData} margin={{ left: 0, right: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10 }} tickFormatter={(v) => `R$${v}`} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="cost" name="Custo (R$)" stroke="hsl(25, 95%, 53%)" strokeWidth={2} dot={false} />
                </LineChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Gráficos: Pizza + Top empresas */}
      {selectedOrg === "all" && orgGroups.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Distribuição por empresa (Pie) */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-base text-foreground flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                Distribuição por Empresa
              </CardTitle>
              <CardDescription>Participação no custo total</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{}} className="h-[280px] w-full">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} labelLine={false}>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip formatter={(v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} />
                </PieChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Top empresas (Bar horizontal) */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-base text-foreground flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Top Empresas por Custo
              </CardTitle>
              <CardDescription>Maiores consumidoras</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={orgChartConfig} className="h-[280px] w-full">
                <BarChart data={orgBarData} layout="vertical" margin={{ left: 0, right: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" />
                  <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} tickFormatter={(v) => `R$${v}`} />
                  <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} width={100} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="cost" name="Custo (R$)" fill="hsl(330, 85%, 55%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Cards por empresa */}
      {selectedOrg === "all" && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Consumo por Empresa
            <Badge variant="outline" className="text-xs">{orgGroups.length}</Badge>
          </h2>
          {orgGroups.length === 0 ? (
            <Card className="border-border">
              <CardContent className="py-12 text-center">
                <Zap className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Nenhum consumo registrado no período</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {orgGroups.map((org) => {
                const pct = totalCost > 0 ? (org.cost / totalCost) * 100 : 0;
                const orgInfo = orgMap.get(org.id);
                return (
                  <Card key={org.id} className="border-border hover:border-primary/30 transition-all">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        {orgInfo?.logo_url ? (
                          <img src={orgInfo.logo_url} alt={org.name} className="h-9 w-9 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 shrink-0">
                            <Building2 className="h-4 w-4 text-primary" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-foreground text-sm truncate">{org.name}</CardTitle>
                          <CardDescription className="text-[10px]">{pct.toFixed(1)}% do total</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden mb-3">
                        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-lg p-2.5 border border-border bg-muted/30">
                          <p className="text-[10px] text-muted-foreground mb-0.5">Tokens</p>
                          <p className="text-base font-bold text-foreground">{org.tokens.toLocaleString("pt-BR")}</p>
                        </div>
                        <div className="rounded-lg p-2.5 border border-border bg-muted/30">
                          <p className="text-[10px] text-muted-foreground mb-0.5">Custo</p>
                          <p className="text-base font-bold text-primary">{org.cost.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
