import { useState } from "react";
import { HardDrive, Laptop, Brain, Workflow, Info, RefreshCw, Server, Wifi, Cpu, MemoryStick, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { useObservability, getObservabilityUrl, REFRESH_OPTIONS, type RefreshInterval, type WorkerInfo } from "@/hooks/useObservability";
import { cn } from "@/lib/utils";

const chartConfig = {
  cpu: { label: "CPU", color: "hsl(25, 95%, 53%)" },
  memory: { label: "Memória", color: "hsl(262, 83%, 58%)" },
};

const workerJobChartConfig = {
  jobs: { label: "Job Count", color: "hsl(0, 72%, 60%)" },
};

const workerCpuChartConfig = {
  cpu: { label: "Processor Usage", color: "hsl(142, 72%, 40%)" },
};

const workerMemChartConfig = {
  memory: { label: "Memory Usage (%)", color: "hsl(40, 90%, 55%)" },
};

function progressBarClass(percent: number) {
  if (percent >= 80) return "[&>div]:bg-destructive";
  if (percent >= 70) return "[&>div]:bg-amber-500";
  return "[&>div]:bg-emerald-500";
}

function WorkerCard({ worker, defaultOpen = false }: { worker: WorkerInfo; defaultOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [jobsOpen, setJobsOpen] = useState(true);
  const [networkOpen, setNetworkOpen] = useState(false);
  const [perfOpen, setPerfOpen] = useState(true);
  const [memOpen, setMemOpen] = useState(true);

  const mockPerfData = Array.from({ length: 30 }, (_, i) => ({
    t: `${String(i).padStart(2, "0")}:00`,
    jobs: i > 20 ? Math.floor(Math.random() * 2) : 0,
    cpu: worker.cpuUsage + (Math.random() - 0.5) * 4,
    memory: worker.memoryUsage + (Math.random() - 0.5) * 6,
  }));

  return (
    <Card className="border-border overflow-hidden">
      {/* Worker Header - sempre visível, clicável para expandir/colapsar */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left bg-card px-4 py-3 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Server className="h-4 w-4 text-primary shrink-0" />
            <span className="font-semibold text-foreground text-sm">{worker.name}</span>
            <span className="text-xs text-muted-foreground">({worker.id})</span>
            <Badge variant={worker.status === "online" ? "default" : "destructive"} className="text-[10px] h-5">
              {worker.status}
            </Badge>
            {worker.currentJobs > 0 && (
              <Badge variant="outline" className="text-[10px] h-5 border-amber-500 text-amber-600 dark:text-amber-400">
                {worker.currentJobs} job(s)
              </Badge>
            )}
          </div>
          {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span><strong className="text-foreground">Load:</strong> {worker.averageLoad}</span>
          <span>|</span>
          <span><strong className="text-foreground">Mem:</strong> {worker.freeMemoryGb}GB / {worker.totalMemoryGb}GB</span>
          <span>|</span>
          <span><strong className="text-foreground">CPU:</strong> {worker.cpuUsage}%</span>
          <span>|</span>
          <span><strong className="text-foreground">Uptime:</strong> {worker.uptime}</span>
        </div>
      </button>

      {isOpen && (
      <>
      <div className="border-t border-border px-4 py-2 bg-muted/20">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          {worker.n8nVersion && <span>n8n-Version: {worker.n8nVersion}</span>}
          <span>Architecture: {worker.arch}</span>
        </div>
      </div>

      <CardContent className="p-0">
        {/* Current Jobs */}
        <div className="border-b border-border">
          <button onClick={() => setJobsOpen(!jobsOpen)} className="flex items-center justify-between w-full px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors">
            <span>Current Jobs ({worker.currentJobs})</span>
            {jobsOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>
          {jobsOpen && (
            <div className="px-4 pb-3 text-sm text-muted-foreground">
              {worker.currentJobs === 0 ? (
                <p className="italic">No current jobs</p>
              ) : (
                <p>{worker.currentJobs} job(s) em execução</p>
              )}
            </div>
          )}
        </div>

        {/* Network Interfaces */}
        {worker.networkInterfaces.length > 0 && (
          <div className="border-b border-border">
            <button onClick={() => setNetworkOpen(!networkOpen)} className="flex items-center justify-between w-full px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors">
              <span className="flex items-center gap-2"><Wifi className="h-3.5 w-3.5" /> Network Interfaces ({worker.networkInterfaces.length})</span>
              {networkOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>
            {networkOpen && (
              <div className="px-4 pb-3 space-y-1">
                {worker.networkInterfaces.map((ni, i) => (
                  <p key={i} className="text-xs text-muted-foreground">IPv4: {ni}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Performance Monitoring */}
        <div className="border-b border-border">
          <button onClick={() => setPerfOpen(!perfOpen)} className="flex items-center justify-between w-full px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors">
            <span className="flex items-center gap-2"><Cpu className="h-3.5 w-3.5" /> Performance Monitoring</span>
            {perfOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>
          {perfOpen && (
            <div className="px-4 pb-4 space-y-4">
              {/* Job Count */}
              <ChartContainer config={workerJobChartConfig} className="h-[120px] w-full">
                <LineChart data={mockPerfData} margin={{ left: 4, right: 4, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" />
                  <XAxis dataKey="t" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} interval={4} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10 }} domain={[0, 5]} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="jobs" name="Job Count" stroke="hsl(0, 72%, 60%)" strokeWidth={2} dot={{ r: 2 }} />
                </LineChart>
              </ChartContainer>

              {/* Processor Usage */}
              <ChartContainer config={workerCpuChartConfig} className="h-[120px] w-full">
                <LineChart data={mockPerfData} margin={{ left: 4, right: 4, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" />
                  <XAxis dataKey="t" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} interval={4} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="cpu" name="Processor Usage" stroke="hsl(142, 72%, 40%)" strokeWidth={2} dot={{ r: 2 }} />
                </LineChart>
              </ChartContainer>

              {/* Memory Usage */}
              <ChartContainer config={workerMemChartConfig} className="h-[120px] w-full">
                <LineChart data={mockPerfData} margin={{ left: 4, right: 4, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" />
                  <XAxis dataKey="t" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} interval={4} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="memory" name="Memory Usage (%)" stroke="hsl(40, 90%, 55%)" strokeWidth={2} dot={{ r: 2 }} />
                </LineChart>
              </ChartContainer>
            </div>
          )}
        </div>

        {/* Memory Monitoring */}
        <div>
          <button onClick={() => setMemOpen(!memOpen)} className="flex items-center justify-between w-full px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors">
            <span className="flex items-center gap-2"><MemoryStick className="h-3.5 w-3.5" /> Memory Monitoring</span>
            {memOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>
          {memOpen && (
            <div className="px-4 pb-4 space-y-3">
              <div>
                <p className="text-xs font-semibold text-foreground mb-1">Host/OS Memory:</p>
                <div className="space-y-0.5 text-xs text-muted-foreground pl-2">
                  <p>Total (os.totalmem): {worker.hostMemory.totalGb}GB</p>
                  <p>Free (os.freemem): {worker.hostMemory.freeGb}GB</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground mb-1">Process Memory:</p>
                <div className="space-y-0.5 text-xs text-muted-foreground pl-2">
                  <p>RSS (process.memoryUsage().rss): {worker.processMemory.rss}MB</p>
                  <p>Heap total (process.memoryUsage().heapTotal): {worker.processMemory.heapTotal}MB</p>
                  <p>Heap used (process.memoryUsage().heapUsed): {worker.processMemory.heapUsed}MB</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
      </>
      )}
    </Card>
  );
}

export default function Observability() {
  const [refreshInterval, setRefreshInterval] = useState<RefreshInterval>(5_000);
  const [allWorkersExpanded, setAllWorkersExpanded] = useState(false);
  const [workerToggleKey, setWorkerToggleKey] = useState(0);
  const { data, isLoading, isFetching, error } = useObservability(refreshInterval);

  const setAllWorkersOpen = (open: boolean) => {
    setAllWorkersExpanded(open);
    setWorkerToggleKey((k) => k + 1);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const apiUrl = getObservabilityUrl();

  if (error) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
          <p className="font-medium">Não foi possível carregar os dados do servidor.</p>
          <p className="mt-1 text-sm">{error instanceof Error ? error.message : "Erro desconhecido."}</p>
          <p className="mt-2 text-xs font-mono break-all">URL: {apiUrl}</p>
        </div>
      </div>
    );
  }

  const { metrics, workers = [], history } = data ?? {
    metrics: {
      cpu: { percent: 0 },
      memory: { usedMb: 0, totalMb: 0, percent: 0 },
      disk: { usedGb: 0, totalGb: 0, percent: 0 },
      n8nWorkers: { active: 0, idle: 0, busy: 0, total: 0 },
    },
    workers: [],
    history: [],
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Observabilidade</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Uso do servidor, memória, CPU e workers do n8n
          </p>
        </div>

        <div className="flex items-center gap-2">
          <RefreshCw className={cn("h-4 w-4 text-muted-foreground", isFetching && "animate-spin text-primary")} />
          <div className="flex items-center rounded-lg border border-border bg-card p-0.5">
            {REFRESH_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setRefreshInterval(opt.value)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                  refreshInterval === opt.value
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cards: CPU, RAM, Disco */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Laptop className="h-4 w-4 text-muted-foreground" />
              Processador (CPU)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{metrics.cpu.percent}%</div>
            <Progress
              value={metrics.cpu.percent}
              className={cn("mt-2 h-2 [&>div]:transition-all", progressBarClass(metrics.cpu.percent))}
            />
            <p className="text-xs text-muted-foreground mt-2">
              Abaixo de 70% está tudo bem. Acima pode indicar automações pesadas.
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Brain className="h-4 w-4 text-muted-foreground" />
              Memória RAM
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{metrics.memory.percent}%</div>
            <p className="text-xs text-muted-foreground">
              {metrics.memory.usedMb.toLocaleString("pt-BR")} / {metrics.memory.totalMb.toLocaleString("pt-BR")} MB
            </p>
            <Progress
              value={metrics.memory.percent}
              className={cn("mt-2 h-2 [&>div]:transition-all", progressBarClass(metrics.memory.percent))}
            />
            <p className="text-xs text-muted-foreground mt-2">
              Se passar de 80%, considere fazer upgrade da VPS.
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-muted-foreground" />
              Armazenamento (Disco)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{metrics.disk.percent}%</div>
            <p className="text-xs text-muted-foreground">
              {metrics.disk.usedGb.toFixed(2)} / {metrics.disk.totalGb.toFixed(2)} GB
            </p>
            <Progress
              value={metrics.disk.percent}
              className={cn("mt-2 h-2 [&>div]:transition-all", progressBarClass(metrics.disk.percent))}
            />
            <p className="text-xs text-muted-foreground mt-2">
              Disco em uso moderado. Fique de olho.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico CPU & RAM última hora + O que é isso? */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-border lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base text-foreground">CPU & RAM (última hora)</CardTitle>
            <CardDescription>Uso do processador e memória ao longo do tempo</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[240px] w-full">
              <LineChart data={history} margin={{ left: 12, right: 12 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="time" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="cpu" name="CPU" stroke="hsl(25, 95%, 53%)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="memory" name="Memória" stroke="hsl(262, 83%, 58%)" strokeWidth={2} dot={false} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base text-foreground flex items-center gap-2">
              <Info className="h-4 w-4 text-muted-foreground" />
              O que é isso?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Este gráfico mostra o uso do processador (laranja) e memória (roxo) na última hora.</p>
            <p><strong className="text-foreground">Dica:</strong> Se a linha subir muito, pode indicar que uma automação está consumindo muitos recursos.</p>
            <p><strong className="text-foreground">Dica:</strong> Automações com muitos dados podem causar picos temporários. Isso é normal.</p>
          </CardContent>
        </Card>
      </div>

      {/* Workers n8n - Seção detalhada */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Workflow className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Workers</h2>
            <Badge variant="outline" className="text-xs">{workers.length} worker(s)</Badge>
          </div>

          {workers.length > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAllWorkersOpen(true)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                <ChevronDown className="h-3 w-3" /> Expandir todos
              </button>
              <span className="text-muted-foreground/40">|</span>
              <button
                onClick={() => setAllWorkersOpen(false)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                <ChevronUp className="h-3 w-3" /> Colapsar todos
              </button>
            </div>
          )}
        </div>

        {workers.length === 0 ? (
          <Card className="border-border">
            <CardContent className="py-8 text-center text-muted-foreground">
              <Workflow className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nenhum worker encontrado.</p>
              <p className="text-xs mt-1">Configure a API key do n8n no workflow para ver os workers.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {workers.map((w, i) => (
              <WorkerCard
                key={`${w.id || i}-${workerToggleKey}`}
                worker={w}
                defaultOpen={workers.length === 1 || allWorkersExpanded}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
