import { useMemo, useState } from "react";
import {
  Calendar,
  Users,
  Activity,
  CheckCircle2,
  MessageSquare,
  UserCheck,
  ListTodo,
  BarChart3,
  DollarSign,
  CalendarDays,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import KPICard from "@/components/KPICard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppointments, useAgendamentosPorPeriodo } from "@/hooks/useAppointments";
import { useContacts } from "@/hooks/useContacts";
import { useEntityLabel } from "@/hooks/useEntityLabel";
import { useChatMetrics } from "@/hooks/useChatMetrics";
import { useTokenUsageOrg } from "@/hooks/useTokenUsageOrg";
import { useTarefas } from "@/hooks/useTarefas";
import { usePlanFeatures } from "@/hooks/usePlanFeatures";
import { useAuth } from "@/hooks/useAuth";
import { isToday } from "@/lib/dateUtils";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, AreaChart, Area } from "recharts";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type PeriodPreset = "today" | "7d" | "30d" | "90d" | "custom";

const PERIOD_OPTIONS: { value: PeriodPreset; labelKey: string }[] = [
  { value: "today", labelKey: "app.dashboard.periodToday" },
  { value: "7d", labelKey: "app.dashboard.period7d" },
  { value: "30d", labelKey: "app.dashboard.period30d" },
  { value: "90d", labelKey: "app.dashboard.period90d" },
  { value: "custom", labelKey: "app.analytics.periodCustom" },
];

function getDateRange(preset: PeriodPreset, customStart?: string, customEnd?: string) {
  const today = new Date();
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const start = new Date(end);

  if (preset === "custom" && customStart && customEnd) {
    return {
      start: new Date(customStart + "T00:00:00"),
      end: new Date(customEnd + "T23:59:59"),
    };
  }

  switch (preset) {
    case "today":
      start.setDate(end.getDate());
      break;
    case "7d":
      start.setDate(end.getDate() - 7);
      break;
    case "30d":
      start.setDate(end.getDate() - 30);
      break;
    case "90d":
      start.setDate(end.getDate() - 90);
      break;
    default:
      start.setDate(end.getDate() - 7);
  }
  return { start, end };
}

export default function DashboardAnalytics() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profile, organization } = useAuth();
  const { features } = usePlanFeatures();
  const { singular, plural } = useEntityLabel();

  const hasAgendamento = features.agendamento_automatico;
  const isBasicOrIntermediate =
    organization?.plano_assinatura === "plano_a" || organization?.plano_assinatura === "plano_b";

  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>("7d");
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");

  const { start, end } = useMemo(
    () => getDateRange(periodPreset, customStart, customEnd),
    [periodPreset, customStart, customEnd]
  );

  const { data: allAppointments = [] } = useAppointments();
  const { data: appointmentsInPeriod = [] } = useAgendamentosPorPeriodo(start, end);
  const { data: chatMetrics, isLoading: loadingChats } = useChatMetrics({ start, end });
  const { data: tokenUsage } = useTokenUsageOrg(start, end);
  const { data: contacts = [] } = useContacts();
  const { data: tarefas = [] } = useTarefas();

  const today = new Date();
  const todayAppointments = allAppointments.filter((apt) => {
    if (apt.inicio) return isToday(apt.inicio);
    return apt.data === today.toISOString().split("T")[0];
  });

  const periodLabel =
    periodPreset === "custom" && customStart && customEnd
      ? `${format(new Date(customStart), "dd/MM/yyyy", { locale: ptBR })} - ${format(new Date(customEnd), "dd/MM/yyyy", { locale: ptBR })}`
      : periodPreset === "today"
      ? t("app.dashboard.periodToday")
      : periodPreset === "7d"
      ? t("app.dashboard.period7d")
      : periodPreset === "30d"
      ? t("app.dashboard.period30d")
      : t("app.dashboard.period90d");

  const contatosConcluidosNoPeriodo = contacts.filter((c) => {
    if ((c as { status_kanban?: string }).status_kanban !== "concluido") return false;
    const criado = (c as { criado_em?: string }).criado_em;
    if (!criado) return true;
    const d = new Date(criado);
    return d >= start && d <= end;
  }).length;

  const agendadosNoPeriodo = appointmentsInPeriod.length;
  const confirmadosNoPeriodo = appointmentsInPeriod.filter((a) => a.situacao === "confirmado").length;
  const confirmedToday = todayAppointments.filter((apt) => apt.situacao === "confirmado").length;
  const totalAgendaNoPeriodo =
    periodPreset === "today" ? todayAppointments.length : agendadosNoPeriodo;
  const confirmadosAgendaNoPeriodo =
    periodPreset === "today" ? confirmedToday : confirmadosNoPeriodo;
  const taxaConfirmacaoAgenda =
    totalAgendaNoPeriodo > 0
      ? Math.round((confirmadosAgendaNoPeriodo / totalAgendaNoPeriodo) * 100)
      : 0;

  const activeContacts = contacts.filter((c) => c.situacao === "ativo").length;

  const conversationsValue =
    periodPreset === "today"
      ? chatMetrics?.conversationsToday ?? 0
      : chatMetrics?.periodConversations ?? 0;
  const messagesValue =
    periodPreset === "today"
      ? chatMetrics?.messagesToday ?? 0
      : chatMetrics?.periodMessages ?? 0;

  const messagesChartData = useMemo(() => {
    const daily = chatMetrics?.dailyBreakdown ?? [];
    return daily.map((d) => ({
      dia: new Date(d.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
      mensagens: d.messages,
      conversas: d.conversations,
    }));
  }, [chatMetrics?.dailyBreakdown]);

  const appointmentsChartData = useMemo(() => {
    const byDay: Record<string, { total: number; confirmados: number }> = {};
    appointmentsInPeriod.forEach((a) => {
      const d = (a as { data?: string }).data ?? "";
      if (!d) return;
      if (!byDay[d]) byDay[d] = { total: 0, confirmados: 0 };
      byDay[d].total++;
      if (a.situacao === "confirmado") byDay[d].confirmados++;
    });
    return Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({
        dia: new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
        total: v.total,
        confirmados: v.confirmados,
      }));
  }, [appointmentsInPeriod]);

  const tokenChartData = useMemo(() => {
    const daily = tokenUsage?.daily ?? [];
    return daily.map((d) => ({
      dia: new Date(d.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
      tokens: d.tokens,
      custo: d.cost,
    }));
  }, [tokenUsage?.daily]);

  if (isBasicOrIntermediate) {
    return (
      <div className="liquid-glass p-6 md:p-8 rounded-2xl border border-border/50">
        <p className="text-muted-foreground text-center">{t("app.dashboard.reportsUpgrade")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            {t("app.dashboard.analytics")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("app.analytics.subtitle")}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate("/app/dashboard")}>
          {t("app.analytics.backToDashboard")}
        </Button>
      </div>

      {/* Filtro por data */}
      <Card className="liquid-glass-subtle p-4">
        <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <Select
              value={periodPreset}
              onValueChange={(v) => setPeriodPreset(v as PeriodPreset)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {t(opt.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {periodPreset === "custom" && (
            <div className="flex items-center gap-2 flex-wrap">
              <DatePicker
                value={customStart}
                onChange={setCustomStart}
                placeholder={t("app.analytics.startDate")}
                className="w-[150px]"
              />
              <span className="text-muted-foreground text-sm">até</span>
              <DatePicker
                value={customEnd}
                onChange={setCustomEnd}
                placeholder={t("app.analytics.endDate")}
                className="w-[150px]"
              />
            </div>
          )}

          <span className="text-sm text-muted-foreground ml-0 sm:ml-2">
            {periodLabel}
          </span>
        </div>
      </Card>

      {/* KPIs */}
      <div className="grid gap-4 sm:gap-5 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <div
          className="cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-xl"
          onClick={() => navigate("/app/dashboard")}
        >
          <KPICard
            title={t("app.dashboard.conversations")}
            value={conversationsValue}
            change={`${messagesValue} ${t("app.dashboard.messages")}`}
            changeType="positive"
            icon={MessageSquare}
            description={periodLabel}
          />
        </div>
        <div
          className="cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-xl"
          onClick={() => navigate("/app/dashboard")}
        >
          <KPICard
            title={t("app.dashboard.messages")}
            value={messagesValue}
            changeType="positive"
            icon={Activity}
            description={`${t("app.dashboard.messagesVolume")} · ${periodLabel}`}
          />
        </div>

        {hasAgendamento && (
          <>
            <div
              className="cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-xl"
              onClick={() => navigate("/app/agenda")}
            >
              <KPICard
                title={
                  periodPreset === "today"
                    ? t("app.dashboard.appointmentsToday")
                    : t("app.dashboard.appointmentsPeriod")
                }
                value={
                  periodPreset === "today"
                    ? todayAppointments.length
                    : appointmentsInPeriod.length
                }
                change={t("app.dashboard.confirmedCount", {
                  count:
                    periodPreset === "today" ? confirmedToday : confirmadosNoPeriodo,
                })}
                changeType="positive"
                icon={Calendar}
                description={periodLabel}
              />
            </div>
            <div
              className="cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-xl"
              onClick={() => navigate("/app/agenda")}
            >
              <KPICard
                title={t("app.dashboard.confirmationRate")}
                value={`${taxaConfirmacaoAgenda}%`}
                change={`${confirmadosAgendaNoPeriodo} ${t("app.dashboard.confirmed").toLowerCase()} / ${totalAgendaNoPeriodo} ${t("app.dashboard.inAgenda")}`}
                changeType="positive"
                icon={CheckCircle2}
                description={`Agenda · ${periodLabel}`}
              />
            </div>
            <div
              className="cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-xl"
              onClick={() => navigate("/app/clientes/crm")}
            >
              <KPICard
                title={t("app.dashboard.completedKanban")}
                value={contatosConcluidosNoPeriodo}
                change={t("app.dashboard.statusCompleted")}
                changeType="positive"
                icon={UserCheck}
                description={`Kanban · ${periodLabel}`}
              />
            </div>
          </>
        )}

        <div
          className="cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-xl"
          onClick={() => navigate("/app/dashboard")}
        >
          <KPICard
            title="Tarefas"
            value={tarefas.length}
            change={`${tarefas.filter((t) => t.status === "a_fazer").length} ${t("app.dashboard.toDo")} · ${tarefas.filter((t) => t.status === "feito").length} ${t("app.dashboard.done")}`}
            changeType="neutral"
            icon={ListTodo}
            description="Kanban de tarefas"
          />
        </div>

        <div
          className="cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-xl"
          onClick={() => navigate("/app/clientes/crm")}
        >
          <KPICard
            title={t("app.dashboard.totalContacts", { plural })}
            value={contacts.length}
            change={t("app.dashboard.activeCount", { count: activeContacts })}
            changeType="positive"
            icon={Users}
            description={t("app.dashboard.contactsBase")}
          />
        </div>
      </div>

      {/* Gráficos */}
      <div className="space-y-6">
        <h2 className="font-display text-lg font-semibold text-foreground">
          {t("app.dashboard.charts")}
        </h2>
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
          {tokenUsage && (
            <>
              <Card className="liquid-glass-subtle p-4 md:p-6">
                <div className="flex items-center gap-2 mb-4">
                  <DollarSign className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-foreground">
                    {t("app.dashboard.tokenCost")}
                  </h3>
                </div>
                {tokenChartData.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    {t("app.dashboard.noConsumption")}
                  </p>
                ) : (
                  <ChartContainer
                    config={{ custo: { label: "Custo (R$)", color: "hsl(142, 72%, 40%)" } }}
                    className="h-[220px] w-full"
                  >
                    <AreaChart data={tokenChartData} margin={{ left: 0, right: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                      <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$ ${Number(v).toFixed(2)}`} />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent formatter={(v: number) => `R$ ${Number(v).toFixed(4)}`} />
                        }
                      />
                      <Area
                        type="monotone"
                        dataKey="custo"
                        stroke="hsl(142, 72%, 40%)"
                        fill="hsl(142, 72%, 40%)"
                        fillOpacity={0.2}
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ChartContainer>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  {t("app.dashboard.totalCost")}: R$ {tokenUsage.totalCost.toFixed(4)} ·{" "}
                  {tokenUsage.totalTokens.toLocaleString("pt-BR")} tokens
                </p>
              </Card>

              <Card className="liquid-glass-subtle p-4 md:p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-foreground">
                    {t("app.dashboard.tokenQuantity")}
                  </h3>
                </div>
                {tokenChartData.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    {t("app.dashboard.noConsumption")}
                  </p>
                ) : (
                  <ChartContainer
                    config={{ tokens: { label: "Tokens", color: "hsl(45, 93%, 47%)" } }}
                    className="h-[220px] w-full"
                  >
                    <BarChart data={tokenChartData} margin={{ left: 0, right: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                      <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v))}
                      />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent formatter={(v: number) => v.toLocaleString("pt-BR")} />
                        }
                      />
                      <Bar dataKey="tokens" fill="hsl(45, 93%, 47%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                )}
              </Card>
            </>
          )}

          <Card className="liquid-glass-subtle p-4 md:p-6">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">{t("app.dashboard.messagesPerDay")}</h3>
            </div>
            {!chatMetrics?.dailyBreakdown || chatMetrics.dailyBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                {t("app.dashboard.noMessages")}
              </p>
            ) : (
              <ChartContainer
                config={{ messages: { label: "Mensagens", color: "hsl(262, 83%, 58%)" } }}
                className="h-[220px] w-full"
              >
                <BarChart data={chatMetrics.dailyBreakdown} margin={{ left: 0, right: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => (v ? String(v).slice(5) : "")}
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="messages" fill="hsl(262, 83%, 58%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </Card>

          {hasAgendamento && (
            <Card className="liquid-glass-subtle p-4 md:p-6">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-foreground">
                  {t("app.dashboard.appointmentsPerDay")}
                </h3>
              </div>
              {appointmentsChartData.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  {t("app.dashboard.noAppointments")}
                </p>
              ) : (
                <ChartContainer
                  config={{
                    total: { label: "Total", color: "hsl(200, 80%, 50%)" },
                    confirmados: { label: "Confirmados", color: "hsl(142, 72%, 40%)" },
                  }}
                  className="h-[220px] w-full"
                >
                  <BarChart data={appointmentsChartData} margin={{ left: 0, right: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                    <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="total" fill="hsl(200, 80%, 50%)" radius={[4, 4, 0, 0]} name="Total" />
                    <Bar
                      dataKey="confirmados"
                      fill="hsl(142, 72%, 40%)"
                      radius={[4, 4, 0, 0]}
                      name="Confirmados"
                    />
                  </BarChart>
                </ChartContainer>
              )}
            </Card>
          )}

          <Card className="liquid-glass-subtle p-4 md:p-6">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">
                {t("app.dashboard.conversationsPerDay")}
              </h3>
            </div>
            {!chatMetrics?.dailyBreakdown || chatMetrics.dailyBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                {t("app.dashboard.noConversations")}
              </p>
            ) : (
              <ChartContainer
                config={{ conversations: { label: "Conversas", color: "hsl(45, 93%, 47%)" } }}
                className="h-[220px] w-full"
              >
                <LineChart data={chatMetrics.dailyBreakdown} margin={{ left: 0, right: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => (v ? String(v).slice(5) : "")}
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="conversations"
                    stroke="hsl(45, 93%, 47%)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ChartContainer>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
