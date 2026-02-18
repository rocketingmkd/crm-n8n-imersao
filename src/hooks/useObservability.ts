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

function mockMetrics(): ObservabilityMetrics {
  return {
    cpu: { percent: 3 },
    memory: { usedMb: 1385, totalMb: 3920, percent: 33 },
    disk: { usedGb: 25.16, totalGb: 48.3, percent: 52 },
    n8nWorkers: { active: 1, idle: 1, busy: 0, total: 1 },
  };
}

function mockWorkers(): WorkerInfo[] {
  return [
    {
      name: "worker-1d704988005f",
      id: "1d704988005f",
      status: "online",
      averageLoad: 0.12,
      freeMemoryGb: 0.54,
      totalMemoryGb: 1,
      uptime: "0d 3h 17m 8s",
      arch: "x64 (linux)",
      n8nVersion: "2.8.3",
      currentJobs: 0,
      cpuUsage: 3,
      memoryUsage: 46,
      hostMemory: { totalGb: 15.61, freeGb: 12.56 },
      processMemory: { rss: 387.52, heapTotal: 280.25, heapUsed: 272.52 },
      networkInterfaces: ["127.0.0.1 (internal)", "10.0.1.75", "172.18.0.15"],
    },
    {
      name: "worker-a8b3c42e001a",
      id: "a8b3c42e001a",
      status: "online",
      averageLoad: 0.45,
      freeMemoryGb: 0.32,
      totalMemoryGb: 1,
      uptime: "1d 12h 5m 22s",
      arch: "x64 (linux)",
      n8nVersion: "2.8.3",
      currentJobs: 2,
      cpuUsage: 18,
      memoryUsage: 68,
      hostMemory: { totalGb: 15.61, freeGb: 10.22 },
      processMemory: { rss: 412.10, heapTotal: 310.50, heapUsed: 295.88 },
      networkInterfaces: ["127.0.0.1 (internal)", "10.0.1.76", "172.18.0.16"],
    },
    {
      name: "worker-f9e7d21b003c",
      id: "f9e7d21b003c",
      status: "online",
      averageLoad: 0.02,
      freeMemoryGb: 0.78,
      totalMemoryGb: 1,
      uptime: "0d 1h 44m 11s",
      arch: "x64 (linux)",
      n8nVersion: "2.8.3",
      currentJobs: 0,
      cpuUsage: 1,
      memoryUsage: 22,
      hostMemory: { totalGb: 15.61, freeGb: 13.90 },
      processMemory: { rss: 210.30, heapTotal: 180.10, heapUsed: 165.40 },
      networkInterfaces: ["127.0.0.1 (internal)", "10.0.1.77"],
    },
  ];
}

function mockHistory(): ObservabilityHistoryPoint[] {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const t = new Date(now.getTime() - (11 - i) * 5 * 60 * 1000);
    return {
      time: t.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      cpu: 2 + Math.random() * 4,
      memory: 32 + Math.random() * 4,
    };
  });
}

function getObservabilityUrl(): string {
  const url = config.observabilityApiUrl.trim();
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${typeof window !== "undefined" ? window.location.origin : ""}${url.startsWith("/") ? url : `/${url}`}`;
}

async function fetchObservability(): Promise<ObservabilityResponse> {
  const url = getObservabilityUrl();
  if (!url) {
    return {
      metrics: mockMetrics(),
      workers: mockWorkers(),
      history: mockHistory(),
    };
  }

  console.log("[observability] fetching:", url);

  const res = await fetch(url, { mode: "cors" });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Servidor de observabilidade respondeu ${res.status}: ${text || res.statusText}`);
  }
  const data = await res.json();
  if (!data || typeof data.metrics !== "object") {
    throw new Error("Resposta inválida do servidor: esperado { metrics, history }");
  }
  return {
    metrics: data.metrics,
    workers: Array.isArray(data.workers) ? data.workers : [],
    history: Array.isArray(data.history) ? data.history : mockHistory(),
  };
}

export const REFRESH_OPTIONS = [
  { label: "5s", value: 5_000 },
  { label: "10s", value: 10_000 },
  { label: "15s", value: 15_000 },
  { label: "30s", value: 30_000 },
] as const;

export type RefreshInterval = (typeof REFRESH_OPTIONS)[number]["value"];

export function useObservability(intervalMs: RefreshInterval = 30_000) {
  const url = getObservabilityUrl();
  return useQuery({
    queryKey: ["observability", url],
    queryFn: fetchObservability,
    enabled: true,
    refetchInterval: url ? intervalMs : false,
    refetchOnWindowFocus: true,
    retry: 2,
    staleTime: 0,
  });
}

export function isObservabilityConfigured(): boolean {
  return getObservabilityUrl().length > 0;
}
