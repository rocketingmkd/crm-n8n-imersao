import { useEffect, useMemo, useState } from "react";
import { Zap, TrendingUp, Building2, DollarSign, Activity, CalendarDays, Filter, MessageSquare, FileText } from "lucide-react";
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
import { fetchContagemMensagensPorOrg } from "@/lib/conversas";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface TokenRecord {
  id: string;
  id_organizacao: string;
  total_tokens: number;
  custo_reais: number;
  criado_em: string;
}

interface Organization {
  id: string;
  nome: string;
  identificador?: string | null;
  url_logo: string | null;
}

type PeriodFilter = "7d" | "14d" | "30d" | "90d" | "all";

const PERIOD_OPTIONS: { value: PeriodFilter; labelKey: string }[] = [
  { value: "7d", labelKey: "superAdmin.tokenUsage.period7d" },
  { value: "14d", labelKey: "superAdmin.tokenUsage.period14d" },
  { value: "30d", labelKey: "superAdmin.tokenUsage.period30d" },
  { value: "90d", labelKey: "superAdmin.tokenUsage.period90d" },
  { value: "all", labelKey: "superAdmin.tokenUsage.periodAll" },
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
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [records, setRecords] = useState<TokenRecord[]>([]);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [docCountByIdentificador, setDocCountByIdentificador] = useState<Record<string, number>>({});
  const [msgCountByOrgId, setMsgCountByOrgId] = useState<Record<string, number>>({});
  const [period, setPeriod] = useState<PeriodFilter>("90d");
  const [selectedOrg, setSelectedOrg] = useState<string>("all");

  useEffect(() => {
    loadData();
  }, [period]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [tokenRes, orgsRes, docsRes] = await Promise.all([
        supabase.from("uso_tokens").select("id, id_organizacao, total_tokens, custo_reais, criado_em").order("criado_em", { ascending: true }),
        supabase.from("organizacoes").select("id, nome, identificador, url_logo"),
        supabase.from("documentos").select("id, metadata, titulo"),
      ]);
      if (tokenRes.error) throw tokenRes.error;
      setRecords(tokenRes.data || []);
      const orgList = orgsRes.error ? [] : (orgsRes.data || []);
      setOrgs(orgList);

      // Arquivos RAG: contar por arquivo único (organização + nome do arquivo/título), não por linha
      const filesByIdentificador: Record<string, Set<string>> = {};
      if (!docsRes.error && docsRes.data) {
        (docsRes.data as { metadata?: { organizacao?: string }; metadados?: { organizacao?: string }; titulo?: string | null; id?: number }[]).forEach((d) => {
          const org = d.metadata?.organizacao ?? d.metadados?.organizacao;
          if (!org) return;
          if (!filesByIdentificador[org]) filesByIdentificador[org] = new Set();
          const fileKey = (d.titulo && d.titulo.trim()) || String(d.id ?? "");
          filesByIdentificador[org].add(fileKey);
        });
      }
      const byIdentificador: Record<string, number> = {};
      Object.entries(filesByIdentificador).forEach(([org, set]) => { byIdentificador[org] = set.size; });
      setDocCountByIdentificador(byIdentificador);

      // Mensagens: contagem dinâmica nas tabelas {identificador}_conversas (n8n)
      const since = period === "all" ? undefined : getDaysAgo(parseInt(period));
      const byOrgId = await fetchContagemMensagensPorOrg(supabase, orgList.map((o) => ({ id: o.id, identificador: o.identificador ?? null })), { since });
      setMsgCountByOrgId(byOrgId);
    } catch (error) {
      console.error("Erro:", error);
      toast.error(t("superAdmin.tokenUsage.loadError"));
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
      data = data.filter((r) => new Date(r.criado_em) >= since);
    }
    if (selectedOrg !== "all") {
      data = data.filter((r) => r.id_organizacao === selectedOrg);
    }
    return data;
  }, [records, period, selectedOrg]);

  const totalTokens = filtered.reduce((s, r) => s + (r.total_tokens || 0), 0);
  const totalCost = filtered.reduce((s, r) => s + (r.custo_reais || 0), 0);

  const orgGroups = useMemo(() => {
    const map: Record<string, { tokens: number; cost: number; name: string; identificador: string | null; arquivosRag: number; mensagens: number }> = {};
    filtered.forEach((r) => {
      if (!map[r.id_organizacao]) {
        const org = orgMap.get(r.id_organizacao);
        const ident = org?.identificador ?? null;
        map[r.id_organizacao] = {
          tokens: 0,
          cost: 0,
          name: org?.nome || t("superAdmin.tokenUsage.unknown"),
          identificador: ident,
          arquivosRag: ident ? (docCountByIdentificador[ident] || 0) : 0,
          mensagens: msgCountByOrgId[r.id_organizacao] || 0,
        };
      }
      map[r.id_organizacao].tokens += r.total_tokens || 0;
      map[r.id_organizacao].cost += r.custo_reais || 0;
    });
    return Object.entries(map)
      .map(([id, d]) => ({ id, ...d }))
      .sort((a, b) => b.cost - a.cost);
  }, [filtered, orgMap, docCountByIdentificador, msgCountByOrgId]);

  // Daily chart data
  const dailyData = useMemo(() => {
    const map: Record<string, { tokens: number; cost: number }> = {};
    filtered.forEach((r) => {
      const key = new Date(r.criado_em).toISOString().split("T")[0];
      if (!map[key]) map[key] = { tokens: 0, cost: 0 };
      map[key].tokens += r.total_tokens || 0;
      map[key].cost += r.custo_reais || 0;
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
      const d = new Date(r.criado_em);
      const weekStart = new Date(d);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const key = weekStart.toISOString().split("T")[0];
      if (!map[key]) map[key] = { tokens: 0, cost: 0, label: getWeekLabel(d) };
      map[key].tokens += r.total_tokens || 0;
      map[key].cost += r.custo_reais || 0;
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
      const d = new Date(r.criado_em);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!map[key]) map[key] = { tokens: 0, cost: 0, label: getMonthLabel(d) };
      map[key].tokens += r.total_tokens || 0;
      map[key].cost += r.custo_reais || 0;
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
      result.push({ name: t("superAdmin.tokenUsage.others"), value: others.reduce((s, o) => s + o.cost, 0) });
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
    const ids = new Set(records.map((r) => r.id_organizacao));
    return orgs.filter((o) => ids.has(o.id));
  }, [records, orgs]);

  const totalArquivosRag = useMemo(
    () => Object.values(docCountByIdentificador).reduce((s, n) => s + n, 0),
    [docCountByIdentificador]
  );
  const totalMensagens = useMemo(
    () => Object.values(msgCountByOrgId).reduce((s, n) => s + n, 0),
    [msgCountByOrgId]
  );
  const avgCost = orgGroups.length > 0 ? totalCost / orgGroups.length : 0;
  const kpis = useMemo(() => [
    { titleKey: "superAdmin.tokenUsage.totalTokens", value: totalTokens.toLocaleString(), icon: Zap, color: { bg: "bg-amber-500/10", text: "text-amber-500", border: "border-amber-500/20" } },
    { titleKey: "superAdmin.tokenUsage.totalCost", value: totalCost.toLocaleString(undefined, { style: "currency", currency: "BRL" }), icon: DollarSign, color: { bg: "bg-emerald-500/10", text: "text-emerald-500", border: "border-emerald-500/20" } },
    { titleKey: "superAdmin.tokenUsage.messages", value: totalMensagens.toLocaleString(), subKey: "superAdmin.tokenUsage.messagesHint", icon: MessageSquare, color: { bg: "bg-blue-500/10", text: "text-blue-500", border: "border-blue-500/20" } },
    { titleKey: "superAdmin.tokenUsage.ragFiles", value: totalArquivosRag.toLocaleString(), subKey: "superAdmin.tokenUsage.ragFilesHint", icon: FileText, color: { bg: "bg-violet-500/10", text: "text-violet-500", border: "border-violet-500/20" } },
    { titleKey: "superAdmin.tokenUsage.avgPerCompany", value: avgCost.toLocaleString(undefined, { style: "currency", currency: "BRL" }), icon: TrendingUp, color: { bg: "bg-rose-500/10", text: "text-rose-500", border: "border-rose-500/20" } },
    { titleKey: "superAdmin.tokenUsage.activeCompanies", value: orgGroups.length, icon: Activity, color: { bg: "bg-cyan-500/10", text: "text-cyan-500", border: "border-cyan-500/20" } },
  ], [totalTokens, totalCost, totalMensagens, totalArquivosRag, avgCost, orgGroups.length]);
  const dailyChartConfig = useMemo(() => ({
    tokens: { label: t("superAdmin.tokenUsage.tokens"), color: "hsl(330, 85%, 55%)" },
    cost: { label: t("superAdmin.tokenUsage.cost"), color: "hsl(25, 95%, 53%)" },
  }), [t]);
  const weeklyChartConfig = useMemo(() => ({
    tokens: { label: t("superAdmin.tokenUsage.tokens"), color: "hsl(262, 83%, 58%)" },
    cost: { label: t("superAdmin.tokenUsage.cost"), color: "hsl(142, 72%, 40%)" },
  }), [t]);
  const monthlyChartConfig = useMemo(() => ({
    tokens: { label: t("superAdmin.tokenUsage.tokens"), color: "hsl(200, 80%, 50%)" },
    cost: { label: t("superAdmin.tokenUsage.cost"), color: "hsl(40, 90%, 55%)" },
  }), [t]);
  const orgChartConfig = useMemo(() => ({
    tokens: { label: t("superAdmin.tokenUsage.tokens"), color: "hsl(330, 85%, 55%)" },
    cost: { label: t("superAdmin.tokenUsage.cost"), color: "hsl(25, 95%, 53%)" },
  }), [t]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header + Filtros */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="page-header">
          <h1>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
              <Zap className="h-4 w-4 text-amber-500" />
            </div>
            {t("superAdmin.tokenUsage.title")}
          </h1>
          <p>{t("superAdmin.tokenUsage.subtitle")}</p>
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
                  <SelectItem key={o.value} value={o.value}>{t(o.labelKey)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1.5">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedOrg} onValueChange={setSelectedOrg}>
              <SelectTrigger className="w-[180px] h-8 text-xs">
                <SelectValue placeholder={t("superAdmin.tokenUsage.allCompanies")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("superAdmin.tokenUsage.allCompanies")}</SelectItem>
                {orgsWithUsage.map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* KPIs Multicores */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 xl:grid-cols-6">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          const sub = "subKey" in kpi ? t((kpi as { subKey?: string }).subKey!) : undefined;
          return (
            <div
              key={kpi.titleKey}
              className={`relative overflow-hidden rounded-xl border ${kpi.color.border} bg-card p-3 md:p-4 transition-all duration-200 hover:shadow-lg hover:scale-[1.02] group`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase tracking-wider">{t(kpi.titleKey)}</span>
                <div className={`rounded-lg ${kpi.color.bg} p-1.5 md:p-2`}>
                  <Icon className={`h-3.5 w-3.5 md:h-4 md:w-4 ${kpi.color.text}`} />
                </div>
              </div>
              <div className="text-lg md:text-2xl font-bold text-foreground truncate">{kpi.value}</div>
              {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
              <div className={`absolute -right-3 -bottom-3 h-16 w-16 rounded-full ${kpi.color.bg} opacity-30 blur-xl`} />
            </div>
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
              {t("superAdmin.tokenUsage.dailyConsumption")}
            </CardTitle>
            <CardDescription>{t("superAdmin.tokenUsage.dailyConsumptionDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            {dailyData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">{t("superAdmin.tokenUsage.noData")}</p>
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
              {t("superAdmin.tokenUsage.weeklyConsumption")}
            </CardTitle>
            <CardDescription>{t("superAdmin.tokenUsage.weeklyConsumptionDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            {weeklyData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">{t("superAdmin.tokenUsage.noData")}</p>
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
              {t("superAdmin.tokenUsage.monthlyConsumption")}
            </CardTitle>
            <CardDescription>{t("superAdmin.tokenUsage.monthlyConsumptionDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            {monthlyData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">{t("superAdmin.tokenUsage.noData")}</p>
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
              {t("superAdmin.tokenUsage.dailyCost")}
            </CardTitle>
            <CardDescription>{t("superAdmin.tokenUsage.dailyCostDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            {dailyData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">{t("superAdmin.tokenUsage.noData")}</p>
            ) : (
              <ChartContainer config={dailyChartConfig} className="h-[220px] w-full">
                <LineChart data={dailyData} margin={{ left: 0, right: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10 }} tickFormatter={(v) => `R$${v}`} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="cost" name={t("superAdmin.tokenUsage.cost")} stroke="hsl(25, 95%, 53%)" strokeWidth={2} dot={false} />
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
                {t("superAdmin.tokenUsage.distributionByCompany")}
              </CardTitle>
              <CardDescription>{t("superAdmin.tokenUsage.distributionDesc")}</CardDescription>
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
                {t("superAdmin.tokenUsage.topCompaniesByCost")}
              </CardTitle>
              <CardDescription>{t("superAdmin.tokenUsage.topCompaniesDesc")}</CardDescription>
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
                        {orgInfo?.url_logo ? (
                          <img src={orgInfo.url_logo} alt={org.name} className="h-9 w-9 rounded-full object-cover shrink-0" />
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
                        <div className="rounded-lg p-2.5 border border-border bg-muted/30">
                          <p className="text-[10px] text-muted-foreground mb-0.5">Mensagens</p>
                          <p className="text-base font-bold text-foreground">{org.mensagens.toLocaleString("pt-BR")}</p>
                        </div>
                        <div className="rounded-lg p-2.5 border border-border bg-muted/30">
                          <p className="text-[10px] text-muted-foreground mb-0.5">Arquivos RAG</p>
                          <p className="text-base font-bold text-foreground">{org.arquivosRag}</p>
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
