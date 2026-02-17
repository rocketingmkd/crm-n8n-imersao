const http = require("http");
const fs = require("fs");
const os = require("os");
const { execSync } = require("child_process");

const PORT = parseInt(process.env.PORT || "3001", 10);
const HOST_PROC = process.env.HOST_PROC || "/host/proc";
const N8N_API_URL = process.env.N8N_API_URL || "";
const N8N_API_KEY = process.env.N8N_API_KEY || "";

// Histórico em memória (última hora, um ponto a cada 5 min)
const historyMax = 12;
const history = [];

function readHostLoadavg() {
  try {
    const raw = fs.readFileSync(`${HOST_PROC}/loadavg`, "utf8");
    return raw.split(/\s+/).slice(0, 3).map(Number);
  } catch {
    return null;
  }
}

function readHostMeminfo() {
  try {
    const raw = fs.readFileSync(`${HOST_PROC}/meminfo`, "utf8");
    const lines = raw.split("\n").reduce((acc, line) => {
      const m = line.match(/^(\w+):\s+(\d+)/);
      if (m) acc[m[1]] = parseInt(m[2], 10);
      return acc;
    }, {});
    const total = (lines.MemTotal || 0) * 1024;
    const free = (lines.MemFree || 0) * 1024 + (lines.MemAvailable || 0) * 1024;
    const available = (lines.MemAvailable || lines.MemFree || 0) * 1024;
    return { total, free: available, used: total - available };
  } catch {
    return null;
  }
}

function getCpuPercent() {
  const hostLoad = readHostLoadavg();
  const numCpus = os.cpus().length;
  if (hostLoad && hostLoad[0] != null) {
    const load = hostLoad[0];
    return Math.min(100, Math.round((load / numCpus) * 100));
  }
  const load = os.loadavg()[0];
  return Math.min(100, Math.round((load / numCpus) * 100));
}

function getMemory() {
  const host = readHostMeminfo();
  if (host) {
    const usedMb = Math.round(host.used / 1024 / 1024);
    const totalMb = Math.round(host.total / 1024 / 1024);
    const percent = totalMb > 0 ? Math.round((host.used / host.total) * 100) : 0;
    return { usedMb, totalMb, percent };
  }
  const total = os.totalmem();
  const free = os.freemem();
  const used = total - free;
  return {
    usedMb: Math.round(used / 1024 / 1024),
    totalMb: Math.round(total / 1024 / 1024),
    percent: total > 0 ? Math.round((used / total) * 100) : 0,
  };
}

function getDisk() {
  try {
    const out = execSync("df -k /", { encoding: "utf8", timeout: 5000 });
    const line = out.trim().split("\n")[1];
    if (!line) return null;
    const parts = line.split(/\s+/);
    const totalK = parseInt(parts[1], 10);
    const usedK = parseInt(parts[2], 10);
    const totalGb = totalK / 1024 / 1024;
    const usedGb = usedK / 1024 / 1024;
    const percent = totalK > 0 ? Math.round((usedK / totalK) * 100) : 0;
    return { usedGb, totalGb, percent };
  } catch {
    return null;
  }
}

async function getN8nWorkers() {
  const empty = { active: 0, idle: 0, busy: 0, total: 0 };
  if (!N8N_API_URL || !N8N_API_KEY) return empty;
  try {
    const res = await fetch(`${N8N_API_URL.replace(/\/$/, "")}/api/v1/executions?limit=5`, {
      headers: { "X-N8N-API-KEY": N8N_API_KEY },
    });
    if (!res.ok) return empty;
    const data = await res.json();
    const running = (data.data || []).filter((e) => e.status === "running").length;
    return {
      active: running,
      idle: Math.max(0, 2 - running),
      busy: running,
      total: 2,
    };
  } catch {
    return empty;
  }
}

function collectMetrics() {
  const cpu = getCpuPercent();
  const memory = getMemory();
  let disk = getDisk();
  if (!disk) disk = { usedGb: 0, totalGb: 0, percent: 0 };
  return { cpu, memory, disk };
}

function getHistory() {
  return history.slice(-historyMax).map((h) => ({
    time: h.time,
    cpu: h.cpu,
    memory: h.memory,
  }));
}

// Atualiza histórico a cada 5 minutos (e na primeira requisição)
let lastHistoryUpdate = 0;
const HISTORY_INTERVAL_MS = 5 * 60 * 1000;

function maybePushHistory(metrics) {
  const now = Date.now();
  if (now - lastHistoryUpdate >= HISTORY_INTERVAL_MS) {
    lastHistoryUpdate = now;
    const t = new Date();
    history.push({
      time: t.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      cpu: metrics.cpu,
      memory: metrics.memory.percent,
    });
    if (history.length > historyMax) history.shift();
  }
}

const server = http.createServer(async (req, res) => {
  if (req.method !== "GET" || (req.url !== "/" && req.url !== "/api/observability" && req.url !== "/health")) {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
    return;
  }

  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  try {
    const metrics = collectMetrics();
    maybePushHistory(metrics);
    const n8nWorkers = await getN8nWorkers();

    const payload = {
      metrics: {
        cpu: { percent: metrics.cpu },
        memory: metrics.memory,
        disk: metrics.disk,
        n8nWorkers,
      },
      history: getHistory(),
    };

    res.writeHead(200, {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    });
    res.end(JSON.stringify(payload));
  } catch (err) {
    console.error(err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: String(err.message) }));
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Observability API listening on port ${PORT}`);
});
