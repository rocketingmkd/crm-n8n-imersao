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

export interface ObservabilityHistoryPoint {
  time: string;
  cpu: number;
  memory: number;
}

/** Formato esperado da API do servidor (GET): { metrics: ObservabilityMetrics, history: ObservabilityHistoryPoint[] } */
export type ObservabilityResponse = {
  metrics: ObservabilityMetrics;
  history: ObservabilityHistoryPoint[];
};

function mockMetrics(): ObservabilityMetrics {
  return {
    cpu: { percent: 3 },
    memory: { usedMb: 1385, totalMb: 3920, percent: 33 },
    disk: { usedGb: 25.16, totalGb: 48.3, percent: 52 },
    n8nWorkers: { active: 2, idle: 1, busy: 1, total: 2 },
  };
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
      history: mockHistory(),
    };
  }
  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    credentials: "same-origin",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Servidor de observabilidade respondeu ${res.status}: ${text || res.statusText}`);
  }
  const data = await res.json();
  if (!data || typeof data.metrics !== "object") {
    throw new Error("Resposta inválida do servidor: esperado { metrics, history }");
  }
  return {
    metrics: data.metrics,
    history: Array.isArray(data.history) ? data.history : mockHistory(),
  };
}

export function useObservability() {
  const url = getObservabilityUrl();
  return useQuery({
    queryKey: ["observability", url],
    queryFn: fetchObservability,
    refetchInterval: url ? 30 * 1000 : false,
  });
}

export function isObservabilityConfigured(): boolean {
  return getObservabilityUrl().length > 0;
}
