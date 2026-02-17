import { HardDrive, Laptop, Brain, Workflow, Info } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { useObservability, isObservabilityConfigured } from "@/hooks/useObservability";
import { config } from "@/lib/config";
import { cn } from "@/lib/utils";

const chartConfig = {
  cpu: {
    label: "CPU",
    color: "hsl(25, 95%, 53%)",
  },
  memory: {
    label: "Memória",
    color: "hsl(262, 83%, 58%)",
  },
};

function progressBarClass(percent: number) {
  if (percent >= 80) return "[&>div]:bg-destructive";
  if (percent >= 70) return "[&>div]:bg-amber-500";
  return "[&>div]:bg-emerald-500";
}

export default function Observability() {
  const { data, isLoading, error } = useObservability();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
          <p className="font-medium">Não foi possível carregar os dados do servidor.</p>
          <p className="mt-1 text-sm">{error instanceof Error ? error.message : "Erro desconhecido."}</p>
          {config.observabilityApiUrl && (
            <p className="mt-2 text-xs">URL configurada: {config.observabilityApiUrl}</p>
          )}
        </div>
      </div>
    );
  }

  const { metrics, history } = data ?? {
    metrics: {
      cpu: { percent: 0 },
      memory: { usedMb: 0, totalMb: 0, percent: 0 },
      disk: { usedGb: 0, totalGb: 0, percent: 0 },
      n8nWorkers: { active: 0, idle: 0, busy: 0, total: 0 },
    },
    history: [],
  };

  const fromServer = isObservabilityConfigured();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Observabilidade</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Uso do servidor, memória, CPU e workers do n8n
        </p>
      </div>

      {!fromServer && (
        <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          <strong>Dados de exemplo.</strong> Para ver os dados reais do servidor, configure no <code className="rounded bg-muted px-1">.env</code> a variável{" "}
          <code className="rounded bg-muted px-1">VITE_OBSERVABILITY_API_URL</code> com a URL do endpoint do seu servidor (ex: <code className="rounded bg-muted px-1">/api/observability</code> ou <code className="rounded bg-muted px-1">https://seu-servidor.com/api/observability</code>).
        </div>
      )}

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
              Seu servidor está tranquilo. A CPU processa todas as tarefas das suas automações. Abaixo de 70% está tudo bem.
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
              A RAM é usada pelas ferramentas para processar dados. Se passar de 80%, considere fazer upgrade da VPS.
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

      {/* n8n Workers */}
      <Card className="border-border">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Workflow className="h-4 w-4 text-muted-foreground" />
            Workers n8n
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Ativos</p>
              <p className="text-xl font-bold text-foreground">{metrics.n8nWorkers.active}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Ociosos</p>
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{metrics.n8nWorkers.idle}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Ocupados</p>
              <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{metrics.n8nWorkers.busy}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-xl font-bold text-foreground">{metrics.n8nWorkers.total}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Workers executam as automações do n8n. Picos temporários ao processar muitos dados são normais.
          </p>
        </CardContent>
      </Card>

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
                <Line
                  type="monotone"
                  dataKey="cpu"
                  name="CPU"
                  stroke="hsl(25, 95%, 53%)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="memory"
                  name="Memória"
                  stroke="hsl(262, 83%, 58%)"
                  strokeWidth={2}
                  dot={false}
                />
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
            <p>
              Este gráfico mostra o uso do processador (laranja) e memória (roxo) na última hora.
            </p>
            <p>
              <strong className="text-foreground">Dica:</strong> Se a linha subir muito, pode indicar que uma automação está consumindo muitos recursos.
            </p>
            <p>
              <strong className="text-foreground">Dica:</strong> Automações com muitos dados podem causar picos temporários. Isso é normal.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
