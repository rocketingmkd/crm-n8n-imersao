import { useQuery } from "@tanstack/react-query";
import { config } from "@/lib/config";

export interface WorkflowStat {
  id: string;
  name: string;
  active: boolean;
  tags: string[];
  totalExec: number;
  successExec: number;
  failedExec: number;
  runningExec: number;
  waitingExec: number;
  failureRate: number;
  avgRuntimeMs: number;
  avgRuntimeSec: number;
}

export interface ExecutionRecord {
  id: string;
  workflowId: string;
  workflowName: string;
  status: string;
  startedAt: string;
  stoppedAt: string;
  finished: boolean;
}

export interface InsightsSummary {
  totalExec: number;
  successExec: number;
  failedExec: number;
  runningExec: number;
  avgRuntimeSec: number;
  totalWorkflows: number;
}

export interface InsightsResponse {
  summary: InsightsSummary;
  workflows: WorkflowStat[];
  executions: ExecutionRecord[];
}

function generateMockData(): InsightsResponse {
  const names = [
    "Atendimento - Completo (RAG + Agendamento)",
    "empresa-flowgrammers",
    "Envio Lembrete",
    "Webhooks de Administração",
    "Gestão de Agendas",
    "Criar Agenda",
  ];

  const now = Date.now();
  const executions: ExecutionRecord[] = [];
  const wfStats: WorkflowStat[] = [];

  names.forEach((name, idx) => {
    const id = String(idx + 1);
    const total = Math.floor(Math.random() * 8000) + 50;
    const failed = Math.floor(total * (Math.random() * 0.4));
    const success = total - failed;
    const avgMs = Math.floor(Math.random() * 800) + 80;

    wfStats.push({
      id,
      name,
      active: Math.random() > 0.2,
      tags: [],
      totalExec: total,
      successExec: success,
      failedExec: failed,
      runningExec: 0,
      waitingExec: 0,
      failureRate: Math.round((failed / total) * 10000) / 100,
      avgRuntimeMs: avgMs,
      avgRuntimeSec: Math.round(avgMs / 10) / 100,
    });

    for (let i = 0; i < Math.min(total, 40); i++) {
      const started = new Date(now - Math.random() * 180 * 86400000);
      const runtime = avgMs + (Math.random() - 0.5) * avgMs;
      const stopped = new Date(started.getTime() + runtime);
      const isFailed = Math.random() < failed / total;
      executions.push({
        id: `${id}-${i}`,
        workflowId: id,
        workflowName: name,
        status: isFailed ? "error" : "success",
        startedAt: started.toISOString(),
        stoppedAt: stopped.toISOString(),
        finished: true,
      });
    }
  });

  wfStats.sort((a, b) => b.totalExec - a.totalExec);

  const totalExec = wfStats.reduce((s, w) => s + w.totalExec, 0);
  const successExec = wfStats.reduce((s, w) => s + w.successExec, 0);
  const failedExec = wfStats.reduce((s, w) => s + w.failedExec, 0);
  const avgRuntimeSec =
    wfStats.length > 0
      ? Math.round(
          (wfStats.reduce((s, w) => s + w.avgRuntimeSec, 0) / wfStats.length) * 100
        ) / 100
      : 0;

  return {
    summary: {
      totalExec,
      successExec,
      failedExec,
      runningExec: 0,
      avgRuntimeSec,
      totalWorkflows: names.length,
    },
    workflows: wfStats,
    executions,
  };
}

async function fetchInsights(): Promise<InsightsResponse> {
  const url = config.n8nInsightsUrl;
  if (!url) return generateMockData();

  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data as InsightsResponse;
  } catch (err) {
    console.error("[useN8nInsights] fetch error, using mock:", err);
    return generateMockData();
  }
}

export type RefreshInterval = 10000 | 30000 | 60000 | 300000;

export const REFRESH_OPTIONS: { value: RefreshInterval; label: string }[] = [
  { value: 10000, label: "10s" },
  { value: 30000, label: "30s" },
  { value: 60000, label: "1 min" },
  { value: 300000, label: "5 min" },
];

export function useN8nInsights(intervalMs: RefreshInterval = 60000) {
  return useQuery<InsightsResponse>({
    queryKey: ["n8n-insights"],
    queryFn: fetchInsights,
    refetchInterval: intervalMs,
    staleTime: 10000,
  });
}

export function isInsightsConfigured() {
  return !!config.n8nInsightsUrl;
}
