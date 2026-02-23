import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  Users,
  Activity,
  TrendingUp,
  Zap,
  DollarSign,
  MessageSquare,
  FileText,
  CalendarDays,
  Filter,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { supabase } from "@/lib/supabase";
import { fetchContagemMensagensPorOrg } from "@/lib/conversas";
import { toast } from "sonner";

type PeriodFilter = "7d" | "14d" | "30d" | "90d" | "all";

const PERIOD_OPTIONS: { value: PeriodFilter; label: string }[] = [
  { value: "7d", label: "Últimos 7 dias" },
  { value: "14d", label: "Últimas 2 semanas" },
  { value: "30d", label: "Último mês" },
  { value: "90d", label: "Últimos 3 meses" },
  { value: "all", label: "Todo o período" },
];

function getDaysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function formatDateBR(d: Date) {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

interface Org {
  id: string;
  nome: string;
  identificador: string | null;
  criado_em?: string;
  ativo?: boolean;
}

// Cores distintas para os KPIs
const KPI_COLORS = [
  { bg: "bg-violet-500/10", text: "text-violet-500", border: "border-violet-500/20" },
  { bg: "bg-blue-500/10", text: "text-blue-500", border: "border-blue-500/20" },
  { bg: "bg-cyan-500/10", text: "text-cyan-500", border: "border-cyan-500/20" },
  { bg: "bg-emerald-500/10", text: "text-emerald-500", border: "border-emerald-500/20" },
  { bg: "bg-amber-500/10", text: "text-amber-500", border: "border-amber-500/20" },
  { bg: "bg-rose-500/10", text: "text-rose-500", border: "border-rose-500/20" },
  { bg: "bg-indigo-500/10", text: "text-indigo-500", border: "border-indigo-500/20" },
  { bg: "bg-teal-500/10", text: "text-teal-500", border: "border-teal-500/20" },
  { bg: "bg-orange-500/10", text: "text-orange-500", border: "border-orange-500/20" },
  { bg: "bg-pink-500/10", text: "text-pink-500", border: "border-pink-500/20" },
];

export default function SuperAdminDashboard() {
  const [period, setPeriod] = useState<PeriodFilter>("30d");
  const [selectedOrg, setSelectedOrg] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [tokenRecords, setTokenRecords] = useState<{ id_organizacao: string; total_tokens: number; custo_reais: number; criado_em: string }[]>([]);
  const [msgCountByOrgId, setMsgCountByOrgId] = useState<Record<string, number>>({});
  const [docRecords, setDocRecords] = useState<{ id?: number; metadados?: { organizacao?: string }; titulo?: string | null }[]>([]);
  const [counts, setCounts] = useState<{
    totalOrgs: number;
    activeOrgs: number;
    totalUsers: number;
    totalPatients: number;
    totalAppointments: number;
  }>({ totalOrgs: 0, activeOrgs: 0, totalUsers: 0, totalPatients: 0, totalAppointments: 0 });
  const [filteredCounts, setFilteredCounts] = useState<{ users: number; patients: number; appointments: number }>({ users: 0, patients: 0, appointments: 0 });
  const [isFilterLoading, setIsFilterLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        const [
          orgsRes, tokensRes, docsRes,
          countOrgs, countActive, countUsers, countPatients, countAppointments,
        ] = await Promise.all([
          supabase.from("organizacoes").select("id, nome, identificador, criado_em, ativo").order("nome"),
          supabase.from("uso_tokens").select("id_organizacao, total_tokens, custo_reais, criado_em").order("criado_em", { ascending: true }),
          supabase.from("documentos").select("id, metadados, titulo").then((r) => r),
          supabase.from("organizacoes").select("*", { count: "exact", head: true }),
          supabase.from("organizacoes").select("*", { count: "exact", head: true }).eq("ativo", true),
          supabase.from("perfis").select("*", { count: "exact", head: true }).eq("super_admin", false),
          supabase.from("contatos").select("*", { count: "exact", head: true }),
          supabase.from("agendamentos").select("*", { count: "exact", head: true }),
        ]);
        if (orgsRes.error) throw orgsRes.error;
        if (tokensRes.error) throw tokensRes.error;
        const orgList = orgsRes.data || [];
        setOrgs(orgList);
        setTokenRecords(tokensRes.data || []);
        setDocRecords(docsRes.error ? [] : ((docsRes.data || []) as any[]));
        setCounts({
          totalOrgs: countOrgs.count ?? 0,
          activeOrgs: countActive.count ?? 0,
          totalUsers: countUsers.count ?? 0,
          totalPatients: countPatients.count ?? 0,
          totalAppointments: countAppointments.count ?? 0,
        });
        const since = period === "all" ? undefined : getDaysAgo(parseInt(period));
        const msgCounts = await fetchContagemMensagensPorOrg(
          supabase,
          orgList.map((o) => ({ id: o.id, identificador: o.identificador ?? null })),
          { since }
        );
        setMsgCountByOrgId(msgCounts);
      } catch (e) {
        console.error(e);
        toast.error("Erro ao carregar dados do dashboard");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [period]);

  // Fetch filtered counts when org filter changes
  useEffect(() => {
    const loadFiltered = async () => {
      setIsFilterLoading(true);
      if (selectedOrg === "all") {
        setFilteredCounts({ users: counts.totalUsers, patients: counts.totalPatients, appointments: counts.totalAppointments });
        setIsFilterLoading(false);
        return;
      }
      try {
        const [usersRes, patientsRes, appointmentsRes] = await Promise.all([
          supabase.from("perfis").select("*", { count: "exact", head: true }).eq("super_admin", false).eq("id_organizacao", selectedOrg),
          supabase.from("contatos").select("*", { count: "exact", head: true }).eq("id_organizacao", selectedOrg),
          supabase.from("agendamentos").select("*", { count: "exact", head: true }).eq("id_organizacao", selectedOrg),
        ]);
        setFilteredCounts({
          users: usersRes.count ?? 0,
          patients: patientsRes.count ?? 0,
          appointments: appointmentsRes.count ?? 0,
        });
      } catch (e) {
        console.error(e);
      } finally {
        setIsFilterLoading(false);
      }
    };
    loadFiltered();
  }, [selectedOrg, counts]);

  const orgMap = useMemo(() => new Map(orgs.map((o) => [o.id, o])), [orgs]);
  const since = useMemo(() => (period === "all" ? null : getDaysAgo(parseInt(period))), [period]);

  const filteredTokens = useMemo(() => {
    let data = tokenRecords;
    if (since) data = data.filter((r) => new Date(r.criado_em) >= since);
    if (selectedOrg !== "all") data = data.filter((r) => r.id_organizacao === selectedOrg);
    return data;
  }, [tokenRecords, since, selectedOrg]);

  const filesByOrg = useMemo(() => {
    const byIdentificador: Record<string, Set<string>> = {};
    docRecords.forEach((d) => {
      const org = d.metadados?.organizacao;
      if (!org) return;
      if (!byIdentificador[org]) byIdentificador[org] = new Set();
      const fileKey = (d.titulo && d.titulo.trim()) || String(d.id ?? "");
      byIdentificador[org].add(fileKey);
    });
    const byOrgId: Record<string, number> = {};
    orgs.forEach((o) => {
      if (o.identificador && byIdentificador[o.identificador])
        byOrgId[o.id] = byIdentificador[o.identificador].size;
    });
    return byOrgId;
  }, [docRecords, orgs]);

  const totalTokens = filteredTokens.reduce((s, r) => s + (r.total_tokens || 0), 0);
  const totalCost = filteredTokens.reduce((s, r) => s + (Number(r.custo_reais) || 0), 0);
  const totalMensagens = useMemo(() => {
    if (selectedOrg === "all") return Object.values(msgCountByOrgId).reduce((a, b) => a + b, 0);
    return msgCountByOrgId[selectedOrg] ?? 0;
  }, [msgCountByOrgId, selectedOrg]);
  const totalArquivosRag = useMemo(() => {
    if (selectedOrg === "all") return Object.values(filesByOrg).reduce((a, b) => a + b, 0);
    return filesByOrg[selectedOrg] ?? 0;
  }, [filesByOrg, selectedOrg]);

  const orgIdsInFilter = useMemo(() => {
    if (selectedOrg !== "all") return [selectedOrg];
    return [...new Set(filteredTokens.map((r) => r.id_organizacao))];
  }, [selectedOrg, filteredTokens]);
  const numOrgsWithData = orgIdsInFilter.length;
  const mediaCusto = numOrgsWithData > 0 ? totalCost / numOrgsWithData : 0;
  const mediaTokens = numOrgsWithData > 0 ? totalTokens / numOrgsWithData : 0;

  const dailyChartData = useMemo(() => {
    const map: Record<string, { tokens: number; cost: number }> = {};
    filteredTokens.forEach((r) => {
      const key = new Date(r.criado_em).toISOString().split("T")[0];
      if (!map[key]) map[key] = { tokens: 0, cost: 0 };
      map[key].tokens += r.total_tokens || 0;
      map[key].cost += Number(r.custo_reais) || 0;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, d]) => ({
        date: formatDateBR(new Date(date)),
        tokens: d.tokens,
        cost: Math.round(d.cost * 100) / 100,
      }));
  }, [filteredTokens]);

  const orgChartData = useMemo(() => {
    const map: Record<string, { tokens: number; cost: number }> = {};
    filteredTokens.forEach((r) => {
      const name = orgMap.get(r.id_organizacao)?.nome || "Desconhecida";
      if (!map[name]) map[name] = { tokens: 0, cost: 0 };
      map[name].tokens += r.total_tokens || 0;
      map[name].cost += Number(r.custo_reais) || 0;
    });
    return Object.entries(map)
      .map(([name, d]) => ({
        name: name.length > 18 ? name.slice(0, 18) + "..." : name,
        tokens: d.tokens,
        cost: Math.round(d.cost * 100) / 100,
      }))
      .sort((a, b) => b.tokens - a.tokens)
      .slice(0, 10);
  }, [filteredTokens, orgMap]);

  const msgChartData = useMemo(() => {
    const filtered = selectedOrg !== "all" ? orgs.filter((o) => o.id === selectedOrg) : orgs;
    return filtered
      .map((o) => ({ name: o.nome.length > 18 ? o.nome.slice(0, 18) + "..." : o.nome, mensagens: msgCountByOrgId[o.id] ?? 0 }))
      .filter((d) => d.mensagens > 0)
      .sort((a, b) => b.mensagens - a.mensagens)
      .slice(0, 10);
  }, [orgs, msgCountByOrgId, selectedOrg]);

  const filesChartData = useMemo(() => {
    const filtered = selectedOrg !== "all" ? orgs.filter((o) => o.id === selectedOrg) : orgs;
    return filtered
      .map((o) => ({ name: o.nome.length > 18 ? o.nome.slice(0, 18) + "..." : o.nome, arquivos: filesByOrg[o.id] ?? 0 }))
      .filter((d) => d.arquivos > 0)
      .sort((a, b) => b.arquivos - a.arquivos)
      .slice(0, 10);
  }, [orgs, filesByOrg, selectedOrg]);

  const recentOrgs = useMemo(() => {
    return [...orgs]
      .sort((a, b) => new Date(b.criado_em ?? 0).getTime() - new Date(a.criado_em ?? 0).getTime())
      .slice(0, 5);
  }, [orgs]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const kpis = [
    { title: "Organizações", value: selectedOrg === "all" ? counts.totalOrgs : 1, description: selectedOrg === "all" ? `${counts.activeOrgs} ativas` : "Filtrada", icon: Building2, filterable: true },
    { title: "Usuários", value: filteredCounts.users, description: selectedOrg === "all" ? "Cadastrados" : "Na organização", icon: Users, filterable: true },
    { title: "Clientes", value: filteredCounts.patients, description: selectedOrg === "all" ? "Em todas as orgs" : "Na organização", icon: Activity, filterable: true },
    { title: "Compromissos", value: filteredCounts.appointments, description: selectedOrg === "all" ? "Agendamentos" : "Na organização", icon: TrendingUp, filterable: true },
    { title: "Tokens", value: totalTokens.toLocaleString("pt-BR"), description: "No período", icon: Zap, filterable: false },
    { title: "Custo (R$)", value: totalCost.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), description: "No período", icon: DollarSign, filterable: false },
    { title: "Mensagens", value: totalMensagens.toLocaleString("pt-BR"), description: "No período", icon: MessageSquare, filterable: false },
    { title: "Arquivos RAG", value: totalArquivosRag.toLocaleString("pt-BR"), description: "Arquivos únicos", icon: FileText, filterable: false },
    { title: "Média Custo/Emp.", value: mediaCusto.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }), description: "Visão média", icon: DollarSign, filterable: false },
    { title: "Média Tokens/Emp.", value: Math.round(mediaTokens).toLocaleString("pt-BR"), description: "Visão média", icon: Zap, filterable: false },
  ];

  return (
    <div className="space-y-6">
      {/* Header com filtros */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">Visão Geral</h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">Resumo completo: tokens, mensagens, arquivos e visão média</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
            <Select value={period} onValueChange={(v) => setPeriod(v as PeriodFilter)}>
              <SelectTrigger className="h-9 text-xs w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1.5 min-w-0">
            <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
            <Select value={selectedOrg} onValueChange={setSelectedOrg}>
              <SelectTrigger className="h-9 text-xs w-[200px]">
                <SelectValue placeholder="Todas as empresas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as empresas</SelectItem>
                {orgs.map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* KPIs Multicores */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          const color = KPI_COLORS[idx % KPI_COLORS.length];
          return (
            <div
              key={kpi.title}
              className="liquid-glass p-3 md:p-4 transition-all duration-200 hover:scale-[1.02] group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase tracking-wider">{kpi.title}</span>
                <div className={`rounded-lg ${color.bg} p-1.5 md:p-2 transition-colors`}>
                  <Icon className={`h-3.5 w-3.5 md:h-4 md:w-4 ${color.text}`} />
                </div>
              </div>
              <div className="text-lg md:text-2xl font-bold text-foreground truncate" title={String(kpi.value)}>
                {isFilterLoading && kpi.filterable ? (
                  <div className="h-6 w-12 rounded-md bg-muted/50 animate-pulse" />
                ) : (
                  kpi.value
                )}
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">{kpi.description}</p>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2">
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-foreground flex items-center gap-2 text-sm md:text-base">
              <Zap className="h-4 w-4 text-amber-500" />
              Consumo de Tokens
            </CardTitle>
            <CardDescription className="text-xs">Evolução no período selecionado</CardDescription>
          </CardHeader>
          <CardContent>
            {dailyChartData.length === 0 ? (
              <div className="flex items-center justify-center h-48 md:h-64 text-muted-foreground text-sm">Nenhum dado no período</div>
            ) : (
              <ChartContainer config={{ tokens: { label: "Tokens", color: "hsl(45, 93%, 47%)" } }} className="h-[200px] md:h-[280px] w-full">
                <LineChart data={dailyChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" style={{ fontSize: "10px" }} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis style={{ fontSize: "10px" }} tick={{ fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}K` : String(v))} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="tokens" stroke="hsl(45, 93%, 47%)" strokeWidth={2} dot={{ r: 2 }} />
                </LineChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-foreground flex items-center gap-2 text-sm md:text-base">
              <DollarSign className="h-4 w-4 text-emerald-500" />
              Custo (R$)
            </CardTitle>
            <CardDescription className="text-xs">Evolução no período selecionado</CardDescription>
          </CardHeader>
          <CardContent>
            {dailyChartData.length === 0 ? (
              <div className="flex items-center justify-center h-48 md:h-64 text-muted-foreground text-sm">Nenhum dado no período</div>
            ) : (
              <ChartContainer config={{ cost: { label: "Custo (R$)", color: "hsl(142, 72%, 40%)" } }} className="h-[200px] md:h-[280px] w-full">
                <LineChart data={dailyChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" style={{ fontSize: "10px" }} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis style={{ fontSize: "10px" }} tick={{ fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `R$ ${v}`} />
                  <ChartTooltip content={<ChartTooltipContent />} formatter={(value: number) => [`R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 6 })}`, "Custo"]} />
                  <Line type="monotone" dataKey="cost" stroke="hsl(142, 72%, 40%)" strokeWidth={2} dot={{ r: 2 }} />
                </LineChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-foreground flex items-center gap-2 text-sm md:text-base">
              <Building2 className="h-4 w-4 text-violet-500" />
              Tokens por Empresa (Top 10)
            </CardTitle>
            <CardDescription className="text-xs">No período selecionado</CardDescription>
          </CardHeader>
          <CardContent>
            {orgChartData.length === 0 ? (
              <div className="flex items-center justify-center h-48 md:h-64 text-muted-foreground text-sm">Nenhum dado no período</div>
            ) : (
              <ChartContainer config={{ tokens: { label: "Tokens", color: "hsl(262, 83%, 58%)" } }} className="h-[200px] md:h-[280px] w-full">
                <BarChart data={orgChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" style={{ fontSize: "10px" }} tick={{ fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}K` : String(v))} />
                  <YAxis type="category" dataKey="name" style={{ fontSize: "10px" }} tick={{ fill: "hsl(var(--muted-foreground))" }} width={100} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="tokens" fill="hsl(262, 83%, 58%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-foreground flex items-center gap-2 text-sm md:text-base">
              <DollarSign className="h-4 w-4 text-rose-500" />
              Custo por Empresa (Top 10)
            </CardTitle>
            <CardDescription className="text-xs">No período selecionado</CardDescription>
          </CardHeader>
          <CardContent>
            {orgChartData.length === 0 ? (
              <div className="flex items-center justify-center h-48 md:h-64 text-muted-foreground text-sm">Nenhum dado no período</div>
            ) : (
              <ChartContainer config={{ cost: { label: "Custo (R$)", color: "hsl(350, 89%, 60%)" } }} className="h-[200px] md:h-[280px] w-full">
                <BarChart data={orgChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" style={{ fontSize: "10px" }} tick={{ fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `R$ ${v}`} />
                  <YAxis type="category" dataKey="name" style={{ fontSize: "10px" }} tick={{ fill: "hsl(var(--muted-foreground))" }} width={100} />
                  <ChartTooltip content={<ChartTooltipContent />} formatter={(value: number) => [`R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 6 })}`, "Custo"]} />
                  <Bar dataKey="cost" fill="hsl(350, 89%, 60%)" radius={[0, 4, 4, 0]} opacity={0.9} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts — Mensagens e Arquivos por Empresa */}
      <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2">
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-foreground flex items-center gap-2 text-sm md:text-base">
              <MessageSquare className="h-4 w-4 text-blue-500" />
              Mensagens por Empresa
            </CardTitle>
            <CardDescription className="text-xs">Total de mensagens por organização</CardDescription>
          </CardHeader>
          <CardContent>
            {msgChartData.length === 0 ? (
              <div className="flex items-center justify-center h-48 md:h-64 text-muted-foreground text-sm">Nenhum dado disponível</div>
            ) : (
              <ChartContainer config={{ mensagens: { label: "Mensagens", color: "hsl(217, 91%, 60%)" } }} className="h-[200px] md:h-[280px] w-full">
                <BarChart data={msgChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" style={{ fontSize: "10px" }} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis type="category" dataKey="name" style={{ fontSize: "10px" }} tick={{ fill: "hsl(var(--muted-foreground))" }} width={100} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="mensagens" fill="hsl(217, 91%, 60%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-foreground flex items-center gap-2 text-sm md:text-base">
              <FileText className="h-4 w-4 text-teal-500" />
              Arquivos de Conhecimento por Empresa
            </CardTitle>
            <CardDescription className="text-xs">Documentos RAG únicos por organização</CardDescription>
          </CardHeader>
          <CardContent>
            {filesChartData.length === 0 ? (
              <div className="flex items-center justify-center h-48 md:h-64 text-muted-foreground text-sm">Nenhum dado disponível</div>
            ) : (
              <ChartContainer config={{ arquivos: { label: "Arquivos", color: "hsl(168, 76%, 42%)" } }} className="h-[200px] md:h-[280px] w-full">
                <BarChart data={filesChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" style={{ fontSize: "10px" }} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis type="category" dataKey="name" style={{ fontSize: "10px" }} tick={{ fill: "hsl(var(--muted-foreground))" }} width={100} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="arquivos" fill="hsl(168, 76%, 42%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Empresas Recentes */}
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-foreground text-sm md:text-base">Empresas Recentes</CardTitle>
          <CardDescription className="text-xs">Últimas empresas cadastradas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {recentOrgs.map((org) => (
              <div key={org.id} className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Building2 className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{org.nome}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{org.identificador ?? org.id}</p>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${org.ativo ? "bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/20" : "bg-muted text-muted-foreground ring-1 ring-border"}`}>
                    {org.ativo ? "Ativa" : "Inativa"}
                  </span>
                  <p className="text-[10px] text-muted-foreground mt-1">{org.criado_em ? new Date(org.criado_em).toLocaleDateString("pt-BR") : "—"}</p>
                </div>
              </div>
            ))}
            {orgs.length === 0 && (
              <p className="text-center text-muted-foreground py-8 text-sm">Nenhuma empresa cadastrada</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
