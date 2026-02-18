import { useQuery } from "@tanstack/react-query";
import { config } from "@/lib/config";

export interface ObservabilityMetrics {
  cpu: { percent: number };
  memory: { usedMb: number; totalMb: number; percent: number };
  disk: { usedGb: number; totalGb: number; percent: number };
  n8nWorkers: {
    active: number;
    idle: number;
    busy: number;
    total: number;
  };
}

export interface WorkerInfo {
  name: string;
  id: string;
  status: string;
  averageLoad: number;
  freeMemoryGb: number;
  totalMemoryGb: number;
  uptime: string;
  arch: string;
  n8nVersion: string;
  currentJobs: number;
  cpuUsage: number;
  memoryUsage: number;
  hostMemory: {
    totalGb: number;
    freeGb: number;
  };
  processMemory: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
  };
  networkInterfaces: string[];
}

export interface ObservabilityHistoryPoint {
  time: string;
  cpu: number;
  memory: number;
}

export type ObservabilityResponse = {
  metrics: ObservabilityMetrics;
  workers: WorkerInfo[];
  history: ObservabilityHistoryPoint[];
};

const OBSERVABILITY_URL = "https://webhook.agentes-n8n.com.br/webhook/observability-standalone";
const FETCH_TIMEOUT_MS = 25_000;

let activeController: AbortController | null = null;

function getObservabilityUrl(): string {
  const envUrl = config.observabilityApiUrl?.trim();
  if (envUrl && (envUrl.startsWith("http://") || envUrl.startsWith("https://"))) {
    return envUrl;
  }
  return OBSERVABILITY_URL;
}

async function fetchObservability(): Promise<ObservabilityResponse> {
  if (activeController) {
    activeController.abort();
  }

  const controller = new AbortController();
  activeController = controller;

  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const url = getObservabilityUrl();

    const res = await fetch(url, { signal: controller.signal });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
    }

    const data = await res.json();

    if (!data || typeof data.metrics !== "object") {
      throw new Error("Resposta inválida: esperado { metrics, workers, history }");
    }

    const now = new Date();
    const defaultHistory = Array.from({ length: 12 }, (_, i) => {
      const t = new Date(now.getTime() - (11 - i) * 5 * 60 * 1000);
      return {
        time: t.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        cpu: data.metrics.cpu?.percent ?? 0,
        memory: data.metrics.memory?.percent ?? 0,
      };
    });

    return {
      metrics: data.metrics,
      workers: Array.isArray(data.workers) ? data.workers : [],
      history: Array.isArray(data.history) && data.history.length > 0 ? data.history : defaultHistory,
    };
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("Requisição cancelada (timeout ou nova requisição)");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
    if (activeController === controller) {
      activeController = null;
    }
  }
}

export const REFRESH_OPTIONS = [
  { label: "15s", value: 15_000 },
  { label: "30s", value: 30_000 },
  { label: "60s", value: 60_000 },
  { label: "2min", value: 120_000 },
] as const;

export type RefreshInterval = (typeof REFRESH_OPTIONS)[number]["value"];

export function useObservability(intervalMs: RefreshInterval = 30_000) {
  return useQuery<ObservabilityResponse>({
    queryKey: ["observability"],
    queryFn: fetchObservability,
    refetchInterval: intervalMs,
    retry: 1,
    retryDelay: 5_000,
    staleTime: 10_000,
    gcTime: 60_000,
  });
}

export { getObservabilityUrl };
