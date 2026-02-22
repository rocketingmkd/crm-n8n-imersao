import { useMemo, useState } from "react";
import {
  Zap,
  Clock,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  CalendarDays,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  XCircle,
  Activity,
  BarChart3,
  Info,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useN8nInsights,
  isInsightsConfigured,
  REFRESH_OPTIONS,
  type RefreshInterval,
  type WorkflowStat,
  type ExecutionRecord,
} from "@/hooks/useN8nInsights";

type PeriodFilter = "24h" | "7d" | "14d" | "30d" | "90d" | "6m" | "1y";
type Granularity = "day" | "week";
type SortField = "totalExec" | "failedExec" | "failureRate" | "avgRuntimeSec" | "name";
type SortDir = "asc" | "desc";

const PERIOD_OPTIONS: { value: PeriodFilter; label: string; days: number }[] = [
  { value: "24h", label: "Últimas 24 horas", days: 1 },
  { value: "7d", label: "Últimos 7 dias", days: 7 },
  { value: "14d", label: "Últimas 2 semanas", days: 14 },
  { value: "30d", label: "Últimos 30 dias", days: 30 },
  { value: "90d", label: "Últimos 90 dias", days: 90 },
  { value: "6m", label: "6 meses", days: 180 },
  { value: "1y", label: "1 ano", days: 365 },
];

function getDaysAgo(days: number) {
  return new Date(Date.now() - days * 86400000);
}

function formatWeekLabel(d: Date) {
  const start = new Date(d);
  start.setDate(start.getDate() - start.getDay());
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const fmt = (dt: Date) =>
    dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  return `${fmt(start)} - ${fmt(end)}`;
}

function formatDayLabel(d: Date) {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function formatRuntime(sec: number): string {
  if (sec < 1) return `${Math.round(sec * 1000)}ms`;
  if (sec < 60) return `${sec.toFixed(2)}s`;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}m ${s}s`;
}

function buildChartData(
  executions: ExecutionRecord[],
  since: Date,
  granularity: Granularity
) {
  const filtered = executions.filter(
    (e) => e.startedAt && new Date(e.startedAt) >= since
  );

  const buckets: Record<string, { label: string; success: number; failed: number; sortKey: string }> = {};

  filtered.forEach((e) => {
    const d = new Date(e.startedAt);
    let key: string;
    let label: string;

    if (granularity === "week") {
      const ws = new Date(d);
      ws.setDate(ws.getDate() - ws.getDay());
      key = ws.toISOString().split("T")[0];
      label = formatWeekLabel(d);
    } else {
      key = d.toISOString().split("T")[0];
      label = formatDayLabel(d);
    }

    if (!buckets[key]) buckets[key] = { label, success: 0, failed: 0, sortKey: key };
    if (e.status === "success") buckets[key].success++;
    else buckets[key].failed++;
  });

  return Object.values(buckets).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
}

export default function N8nInsights() {
  const [refreshInterval, setRefreshInterval] = useState<RefreshInterval>(60000);
  const [period, setPeriod] = useState<PeriodFilter>("6m");
  const [sortField, setSortField] = useState<SortField>("totalExec");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const { data, isLoading, isFetching } = useN8nInsights(refreshInterval);
  const configured = isInsightsConfigured();

  const periodDays = PERIOD_OPTIONS.find((p) => p.value === period)?.days ?? 180;
  const since = getDaysAgo(periodDays);
  const granularity: Granularity = periodDays <= 30 ? "day" : "week";

  const filteredExec = useMemo(() => {
    if (!data?.executions) return [];
    return data.executions.filter(
      (e) => e.startedAt && new Date(e.startedAt) >= since
    );
  }, [data, since]);

  const filteredStats = useMemo((): WorkflowStat[] => {
    if (!data?.workflows || !data?.executions) return data?.workflows ?? [];

    const wfMap: Record<string, WorkflowStat> = {};
    data.workflows.forEach((w) => {
      wfMap[w.id] = {
        ...w,
        totalExec: 0,
        successExec: 0,
        failedExec: 0,
        runningExec: 0,
        waitingExec: 0,
        failureRate: 0,
        avgRuntimeMs: 0,
        avgRuntimeSec: 0,
      };
    });

    filteredExec.forEach((e) => {
      const wId = String(e.workflowId);
      if (!wfMap[wId]) {
        wfMap[wId] = {
          id: wId,
          name: e.workflowName || `Workflow ${wId}`,
          active: false,
          tags: [],
          totalExec: 0,
          successExec: 0,
          failedExec: 0,
          runningExec: 0,
          waitingExec: 0,
          failureRate: 0,
          avgRuntimeMs: 0,
          avgRuntimeSec: 0,
        };
      }
      const wf = wfMap[wId];
      wf.totalExec++;
      if (e.status === "success") wf.successExec++;
      else if (e.status === "error" || e.status === "failed" || e.status === "crashed") wf.failedExec++;
      else if (e.status === "running") wf.runningExec++;
      else if (e.status === "waiting") wf.waitingExec++;
      if (e.startedAt && e.stoppedAt) {
        const ms = new Date(e.stoppedAt).getTime() - new Date(e.startedAt).getTime();
        if (ms > 0) {
          wf.avgRuntimeMs += ms;
        }
      }
    });

    return Object.values(wfMap)
      .map((w) => {
        const execWithTime = filteredExec.filter(
          (e) => String(e.workflowId) === w.id && e.startedAt && e.stoppedAt
        ).length;
        return {
          ...w,
          failureRate: w.totalExec > 0 ? Math.round((w.failedExec / w.totalExec) * 10000) / 100 : 0,
          avgRuntimeMs: execWithTime > 0 ? Math.round(w.avgRuntimeMs / execWithTime) : 0,
          avgRuntimeSec: execWithTime > 0 ? Math.round(w.avgRuntimeMs / execWithTime / 10) / 100 : 0,
        };
      })
      .filter((w) => w.totalExec > 0);
  }, [data, filteredExec]);

  const sortedWorkflows = useMemo(() => {
    const arr = [...filteredStats];
    arr.sort((a, b) => {
      let cmp = 0;
      if (sortField === "name") cmp = a.name.localeCompare(b.name);
      else cmp = (a[sortField] as number) - (b[sortField] as number);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [filteredStats, sortField, sortDir]);

  const chartData = useMemo(
    () => (data ? buildChartData(data.executions, since, granularity) : []),
    [data, since, granularity]
  );

  const totalExecPeriod = filteredExec.length;
  const successExecPeriod = filteredExec.filter((e) => e.status === "success").length;
  const failedExecPeriod = filteredExec.filter(
    (e) => e.status === "error" || e.status === "failed" || e.status === "crashed"
  ).length;

  let totalRuntime = 0;
  let runtimeCount = 0;
  filteredExec.forEach((e) => {
    if (e.startedAt && e.stoppedAt) {
      const ms = new Date(e.stoppedAt).getTime() - new Date(e.startedAt).getTime();
      if (ms > 0) { totalRuntime += ms; runtimeCount++; }
    }
  });
  const avgRuntimeSec = runtimeCount > 0 ? totalRuntime / runtimeCount / 1000 : 0;

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("desc"); }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDir === "asc" ? (
      <ArrowUp className="h-3 w-3 ml-1 text-primary" />
    ) : (
      <ArrowDown className="h-3 w-3 ml-1 text-primary" />
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const chartConfig = {
    success: { label: "Successful", color: "hsl(160, 60%, 45%)" },
    failed: { label: "Failed", color: "hsl(15, 80%, 55%)" },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Insights
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitoramento de execuções dos workflows n8n
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <Select value={period} onValueChange={(v) => setPeriod(v as PeriodFilter)}>
              <SelectTrigger className="w-[170px] h-8 text-xs">
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
            <RefreshCw className={cn("h-4 w-4 text-muted-foreground", isFetching && "animate-spin")} />
            <Select
              value={String(refreshInterval)}
              onValueChange={(v) => setRefreshInterval(Number(v) as RefreshInterval)}
            >
              <SelectTrigger className="w-[90px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REFRESH_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {!configured && (
        <div className="flex items-center gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-200">
          <Info className="h-4 w-4 shrink-0" />
          <span>
            <code>VITE_N8N_WEBHOOK_URL</code> não configurada. Exibindo dados de demonstração.
          </span>
        </div>
      )}

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Prod. executions</CardTitle>
            <div className="rounded-lg bg-primary/10 p-2"><Zap className="h-4 w-4 text-primary" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totalExecPeriod.toLocaleString("pt-BR")}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {PERIOD_OPTIONS.find((p) => p.value === period)?.label}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Sucesso</CardTitle>
            <div className="rounded-lg bg-green-500/10 p-2"><CheckCircle2 className="h-4 w-4 text-green-500" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{successExecPeriod.toLocaleString("pt-BR")}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalExecPeriod > 0 ? `${((successExecPeriod / totalExecPeriod) * 100).toFixed(1)}%` : "0%"} do total
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Falhas</CardTitle>
            <div className="rounded-lg bg-red-500/10 p-2"><XCircle className="h-4 w-4 text-red-500" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{failedExecPeriod.toLocaleString("pt-BR")}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalExecPeriod > 0 ? `${((failedExecPeriod / totalExecPeriod) * 100).toFixed(1)}%` : "0%"} do total
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Run time (avg.)</CardTitle>
            <div className="rounded-lg bg-blue-500/10 p-2"><Clock className="h-4 w-4 text-blue-500" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{formatRuntime(avgRuntimeSec)}</div>
            <p className="text-xs text-muted-foreground mt-1">Tempo médio de execução</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-base text-foreground flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Execuções por {granularity === "week" ? "semana" : "dia"}
          </CardTitle>
          <CardDescription>
            Successful vs Failed — {PERIOD_OPTIONS.find((p) => p.value === period)?.label}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">
              Sem dados no período selecionado
            </p>
          ) : (
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <BarChart data={chartData} margin={{ left: 0, right: 4 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10 }}
                  interval={0}
                  angle={granularity === "week" ? -15 : 0}
                  textAnchor={granularity === "week" ? "end" : "middle"}
                  height={granularity === "week" ? 60 : 30}
                />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="square"
                  wrapperStyle={{ fontSize: 11 }}
                />
                <Bar
                  dataKey="success"
                  name="Successful"
                  stackId="a"
                  fill="hsl(160, 60%, 45%)"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="failed"
                  name="Failed"
                  stackId="a"
                  fill="hsl(15, 80%, 55%)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* Workflow Breakdown */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-base text-foreground flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Breakdown by workflow
            <Badge variant="outline" className="text-xs ml-2">
              {sortedWorkflows.length}
            </Badge>
          </CardTitle>
          <CardDescription>Detalhes de execução por workflow no período</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {sortedWorkflows.length === 0 ? (
            <div className="py-12 text-center">
              <AlertTriangle className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Nenhum workflow com execuções neste período</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 font-medium text-xs"
                        onClick={() => toggleSort("name")}
                      >
                        Name <SortIcon field="name" />
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 font-medium text-xs ml-auto"
                        onClick={() => toggleSort("totalExec")}
                      >
                        Prod. executions <SortIcon field="totalExec" />
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 font-medium text-xs ml-auto"
                        onClick={() => toggleSort("failedExec")}
                      >
                        Failed prod. executions <SortIcon field="failedExec" />
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 font-medium text-xs ml-auto"
                        onClick={() => toggleSort("failureRate")}
                      >
                        Failure rate <SortIcon field="failureRate" />
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 font-medium text-xs ml-auto"
                        onClick={() => toggleSort("avgRuntimeSec")}
                      >
                        Run time (avg.) <SortIcon field="avgRuntimeSec" />
                      </Button>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedWorkflows.map((wf) => (
                    <TableRow key={wf.id}>
                      <TableCell className="font-medium max-w-[320px] truncate">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "h-2 w-2 rounded-full shrink-0",
                              wf.active ? "bg-green-500" : "bg-muted-foreground/40"
                            )}
                          />
                          {wf.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {wf.totalExec.toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        <span className={wf.failedExec > 0 ? "text-red-500" : ""}>
                          {wf.failedExec.toLocaleString("pt-BR")}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        <span
                          className={cn(
                            wf.failureRate >= 50
                              ? "text-red-500"
                              : wf.failureRate >= 20
                              ? "text-yellow-500"
                              : "text-muted-foreground"
                          )}
                        >
                          {wf.failureRate}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatRuntime(wf.avgRuntimeSec)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
