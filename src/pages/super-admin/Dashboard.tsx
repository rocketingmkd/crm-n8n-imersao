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

export default function SuperAdminDashboard() {
  const [period, setPeriod] = useState<PeriodFilter>("30d");
  const [selectedOrg, setSelectedOrg] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [tokenRecords, setTokenRecords] = useState<{ id_organizacao: string; total_tokens: number; custo_reais: number; criado_em: string }[]>([]);
  const [msgRecords, setMsgRecords] = useState<{ id_organizacao: string; criado_em?: string }[]>([]);
  const [docRecords, setDocRecords] = useState<{ id?: number; metadados?: { organizacao?: string }; titulo?: string | null }[]>([]);
  const [counts, setCounts] = useState<{
    totalOrgs: number;
    activeOrgs: number;
    totalUsers: number;
    totalPatients: number;
    totalAppointments: number;
  }>({ totalOrgs: 0, activeOrgs: 0, totalUsers: 0, totalPatients: 0, totalAppointments: 0 });

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        const [
          orgsRes,
          tokensRes,
          msgRes,
          docsRes,
          countOrgs,
          countActive,
          countUsers,
          countPatients,
          countAppointments,
        ] = await Promise.all([
          supabase.from("organizacoes").select("id, nome, identificador, criado_em, ativo").order("nome"),
          supabase.from("uso_tokens").select("id_organizacao, total_tokens, custo_reais, criado_em").order("criado_em", { ascending: true }),
          supabase.from("mensagens").select("id_organizacao, criado_em").then((r) => r),
          supabase.from("documentos").select("id, metadados, titulo").then((r) => r),
          supabase.from("organizacoes").select("*", { count: "exact", head: true }),
          supabase.from("organizacoes").select("*", { count: "exact", head: true }).eq("ativo", true),
          supabase.from("perfis").select("*", { count: "exact", head: true }).eq("super_admin", false),
          supabase.from("contatos").select("*", { count: "exact", head: true }),
          supabase.from("agendamentos").select("*", { count: "exact", head: true }),
        ]);
        if (orgsRes.error) throw orgsRes.error;
        if (tokensRes.error) throw tokensRes.error;
        setOrgs(orgsRes.data || []);
        setTokenRecords(tokensRes.data || []);
        setMsgRecords(msgRes.error ? [] : (msgRes.data || []));
        setDocRecords(docsRes.error ? [] : (docsRes.data || []));
        setCounts({
          totalOrgs: countOrgs.count ?? 0,
          activeOrgs: countActive.count ?? 0,
          totalUsers: countUsers.count ?? 0,
          totalPatients: countPatients.count ?? 0,
          totalAppointments: countAppointments.count ?? 0,
        });
      } catch (e) {
        console.error(e);
        toast.error("Erro ao carregar dados do dashboard");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const orgMap = useMemo(() => new Map(orgs.map((o) => [o.id, o])), [orgs]);

  const since = useMemo(() => (period === "all" ? null : getDaysAgo(parseInt(period))), [period]);

  const filteredTokens = useMemo(() => {
    let data = tokenRecords;
    if (since) data = data.filter((r) => new Date(r.criado_em) >= since);
    if (selectedOrg !== "all") data = data.filter((r) => r.id_organizacao === selectedOrg);
    return data;
  }, [tokenRecords, since, selectedOrg]);

  const filteredMessages = useMemo(() => {
    let data = msgRecords;
    if (since) data = data.filter((r) => r.criado_em && new Date(r.criado_em) >= since);
    if (selectedOrg !== "all") data = data.filter((r) => r.id_organizacao === selectedOrg);
    return data;
  }, [msgRecords, since, selectedOrg]);

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
  const totalMensagens = filteredMessages.length;
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
    { title: "Organizações", value: selectedOrg === "all" ? counts.totalOrgs : 1, description: selectedOrg === "all" ? `${counts.activeOrgs} ativas` : "Filtrada", icon: Building2 },
    { title: "Usuários", value: counts.totalUsers, description: "Cadastrados", icon: Users },
    { title: "Clientes", value: counts.totalPatients, description: "Em todas as orgs", icon: Activity },
    { title: "Compromissos", value: counts.totalAppointments, description: "Agendamentos", icon: TrendingUp },
    { title: "Tokens", value: totalTokens.toLocaleString("pt-BR"), description: "No período", icon: Zap },
    { title: "Custo (R$)", value: totalCost.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), description: "No período", icon: DollarSign },
    { title: "Mensagens", value: totalMensagens.toLocaleString("pt-BR"), description: "No período", icon: MessageSquare },
    { title: "Arquivos RAG", value: totalArquivosRag.toLocaleString("pt-BR"), description: "Arquivos únicos", icon: FileText },
    { title: "Média Custo/Empresa", value: mediaCusto.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }), description: "Visão média", icon: DollarSign },
    { title: "Média Tokens/Empresa", value: Math.round(mediaTokens).toLocaleString("pt-BR"), description: "Visão média", icon: Zap },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Resumo completo: tokens, mensagens, arquivos e visão média</p>
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
                {orgs.map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-10">
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
                <div className="text-xl font-bold text-foreground truncate" title={String(kpi.value)}>{kpi.value}</div>
                <p className="text-[10px] text-muted-foreground mt-1">{kpi.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2 text-base">
              <Zap className="h-4 w-4 text-primary" />
              Consumo de Tokens
            </CardTitle>
            <CardDescription>Evolução no período selecionado</CardDescription>
          </CardHeader>
          <CardContent>
            {dailyChartData.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">Nenhum dado no período</div>
            ) : (
              <ChartContainer config={{ tokens: { label: "Tokens", color: "hsl(var(--primary))" } }} className="h-[280px] w-full">
                <LineChart data={dailyChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" style={{ fontSize: "11px" }} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis style={{ fontSize: "11px" }} tick={{ fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}K` : String(v))} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="tokens" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2 text-base">
              <DollarSign className="h-4 w-4 text-primary" />
              Custo (R$)
            </CardTitle>
            <CardDescription>Evolução no período selecionado</CardDescription>
          </CardHeader>
          <CardContent>
            {dailyChartData.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">Nenhum dado no período</div>
            ) : (
              <ChartContainer config={{ cost: { label: "Custo (R$)", color: "hsl(var(--primary))" } }} className="h-[280px] w-full">
                <LineChart data={dailyChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" style={{ fontSize: "11px" }} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis style={{ fontSize: "11px" }} tick={{ fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `R$ ${v}`} />
                  <ChartTooltip content={<ChartTooltipContent />} formatter={(value: number) => [`R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 6 })}`, "Custo"]} />
                  <Line type="monotone" dataKey="cost" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4 text-primary" />
              Tokens por Empresa (Top 10)
            </CardTitle>
            <CardDescription>No período selecionado</CardDescription>
          </CardHeader>
          <CardContent>
            {orgChartData.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">Nenhum dado no período</div>
            ) : (
              <ChartContainer config={{ tokens: { label: "Tokens", color: "hsl(var(--primary))" } }} className="h-[280px] w-full">
                <BarChart data={orgChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" style={{ fontSize: "11px" }} tick={{ fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}K` : String(v))} />
                  <YAxis type="category" dataKey="name" style={{ fontSize: "11px" }} tick={{ fill: "hsl(var(--muted-foreground))" }} width={120} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="tokens" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2 text-base">
              <DollarSign className="h-4 w-4 text-primary" />
              Custo por Empresa (Top 10)
            </CardTitle>
            <CardDescription>No período selecionado</CardDescription>
          </CardHeader>
          <CardContent>
            {orgChartData.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">Nenhum dado no período</div>
            ) : (
              <ChartContainer config={{ cost: { label: "Custo (R$)", color: "hsl(var(--primary))" } }} className="h-[280px] w-full">
                <BarChart data={orgChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" style={{ fontSize: "11px" }} tick={{ fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `R$ ${v}`} />
                  <YAxis type="category" dataKey="name" style={{ fontSize: "11px" }} tick={{ fill: "hsl(var(--muted-foreground))" }} width={120} />
                  <ChartTooltip content={<ChartTooltipContent />} formatter={(value: number) => [`R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 6 })}`, "Custo"]} />
                  <Bar dataKey="cost" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} opacity={0.9} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-foreground text-base">Empresas Recentes</CardTitle>
          <CardDescription>Últimas empresas cadastradas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentOrgs.map((org) => (
              <div key={org.id} className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                    <Building2 className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{org.nome}</p>
                    <p className="text-[10px] text-muted-foreground">{org.identificador ?? org.id}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${org.ativo ? "bg-primary/10 text-primary ring-1 ring-primary/20" : "bg-muted text-muted-foreground ring-1 ring-border"}`}>
                    {org.ativo ? "Ativa" : "Inativa"}
                  </span>
                  <p className="text-[10px] text-muted-foreground mt-1">{org.criado_em ? new Date(org.criado_em).toLocaleDateString("pt-BR") : "—"}</p>
                  <p className="text-[10px] text-muted-foreground">Arquivos RAG: {filesByOrg[org.id] ?? 0}</p>
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
