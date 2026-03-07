import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { config } from "@/lib/config";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  Server,
  List,
  Trash2,
  Play,
  Power,
  PowerOff,
  History,
  Download,
  Loader2,
  CheckCircle2,
  XCircle,
  FileArchive,
  Search,
  AlertTriangle,
  Wifi,
  WifiOff,
  RefreshCw,
  FileDown,
  ChevronDown,
  ChevronUp,
  Clock,
} from "lucide-react";

const WEBHOOK_URL = config.gestaoVpsWebhookUrl;

const WORKFLOWS_PAGE_SIZES = [10, 20, 50, 100];

type VpsCommand = "workflows" | "cleanup" | "execute" | "activate" | "deactivate" | "executions" | "backup";
type StatusFilter = "all" | "active" | "inactive";

export interface WorkflowItem {
  name: string;
  active: boolean;
}

interface LogEntry {
  id: string;
  timestamp: Date;
  action: string;
  target?: string;
  status: "success" | "error";
  message: string;
}

interface ExecutionEntry {
  id?: string | number;
  status?: string;
  startedAt?: string;
  stoppedAt?: string;
  mode?: string;
  finished?: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseWorkflowsFromRetorno(retorno: string): WorkflowItem[] {
  if (!retorno || typeof retorno !== "string") return [];
  const lines = retorno.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const items: WorkflowItem[] = [];
  for (const line of lines) {
    if (line === "Workflows:" || line === "No workflows.") continue;
    const active = line.startsWith("🟢");
    const name = (line.replace(/^[🟢⚫]\s*/, "").trim() || line).trim();
    if (name) items.push({ name, active });
  }
  return items;
}

function extractWorkflowsList(data: unknown): WorkflowItem[] | null {
  if (Array.isArray(data)) {
    const ok = data.every((w) => w && typeof w === "object" && "name" in w);
    if (ok) return data as WorkflowItem[];
  }
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  if (Array.isArray(o.workflows)) {
    const ok = (o.workflows as unknown[]).every((w) => w && typeof w === "object" && "name" in w);
    if (ok) return o.workflows as WorkflowItem[];
  }
  if (o.data && typeof o.data === "object" && Array.isArray((o.data as Record<string, unknown>).workflows)) {
    return (o.data as Record<string, unknown>).workflows as WorkflowItem[];
  }
  const retorno = o.retorno ?? o.msg ?? o.message;
  if (typeof retorno === "string") {
    try {
      const parsed = JSON.parse(retorno) as Record<string, unknown>;
      if (Array.isArray(parsed.workflows)) return parsed.workflows as WorkflowItem[];
    } catch {
      // não é JSON
    }
    const fromText = parseWorkflowsFromRetorno(retorno);
    if (fromText.length > 0) return fromText;
  }
  return null;
}

function parseExecutions(retorno: string): ExecutionEntry[] | null {
  try {
    const data = JSON.parse(retorno);
    const candidates = Array.isArray(data)
      ? data
      : Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data?.executions)
      ? data.executions
      : null;
    if (
      candidates !== null &&
      (candidates.length === 0 ||
        candidates[0]?.startedAt !== undefined ||
        candidates[0]?.status !== undefined ||
        candidates[0]?.id !== undefined)
    ) {
      return candidates as ExecutionEntry[];
    }
  } catch {
    // not JSON
  }
  return null;
}

function formatDuration(startedAt?: string, stoppedAt?: string): string {
  if (!startedAt || !stoppedAt) return "—";
  const ms = new Date(stoppedAt).getTime() - new Date(startedAt).getTime();
  if (isNaN(ms) || ms < 0) return "—";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

function formatDate(iso?: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "medium" });
  } catch {
    return iso;
  }
}

async function sendCommand(
  command: VpsCommand,
  arg1?: string
): Promise<{ retorno?: string; erroType?: string; workflows?: WorkflowItem[] }> {
  const text = arg1 ? `/${command} ${arg1}` : `/${command}`;
  const res = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: { text } }),
  });

  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");

  if (!res.ok) {
    const body = isJson ? JSON.stringify(await res.json().catch(() => ({}))) : await res.text();
    const detail = body ? ` — ${body}` : "";
    throw new Error(`HTTP ${res.status}${detail}`);
  }

  if (isJson) return res.json();
  return { retorno: await res.text(), erroType: "Message" };
}

async function downloadBackup(): Promise<void> {
  const res = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: { text: "/backup" } }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const data = await res.json();
    throw new Error(data?.retorno || "Backup retornou mensagem de erro.");
  }
  const blob = await res.blob();
  const disposition = res.headers.get("content-disposition");
  const name = disposition?.match(/filename="?([^";]+)"?/)?.[1] || "backup.tar.gz";
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

// ── ActionCard ────────────────────────────────────────────────────────────────

interface ActionCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  loading: boolean;
  result: string | null;
  error: string | null;
  onRun: () => void;
  children?: React.ReactNode;
  buttonLabel?: string;
}

function ActionCard({ title, description, icon, loading, result, error, onRun, children, buttonLabel = "Executar" }: ActionCardProps) {
  return (
    <Card className="border-border overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {icon}
          </div>
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription className="text-xs">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {children}
        <Button onClick={onRun} disabled={loading} className="w-full sm:w-auto">
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          {buttonLabel}
        </Button>
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <pre className="whitespace-pre-wrap break-words">{error}</pre>
          </div>
        )}
        {result && !error && (
          <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3 text-sm text-foreground">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-500" />
            <pre className="whitespace-pre-wrap break-words font-sans">{result}</pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function GestaoVps({ hideHeader = false }: { hideHeader?: boolean }) {
  // ── Workflows list ──────────────────────────────────────────────────────────
  const [workflowsLoading, setWorkflowsLoading] = useState(false);
  const [workflowsResult, setWorkflowsResult] = useState<string | null>(null);
  const [workflowsError, setWorkflowsError] = useState<string | null>(null);
  const [workflowsList, setWorkflowsList] = useState<WorkflowItem[] | null>(null);
  const [workflowsRawRetorno, setWorkflowsRawRetorno] = useState<string | null>(null);
  const [workflowsScreenOpen, setWorkflowsScreenOpen] = useState(false);
  const [workflowsPage, setWorkflowsPage] = useState(1);
  const [workflowsPageSize, setWorkflowsPageSize] = useState(20);
  const [workflowsSearch, setWorkflowsSearch] = useState("");
  const [workflowsFilter, setWorkflowsFilter] = useState<StatusFilter>("all");
  const [rowLoading, setRowLoading] = useState<Record<string, "activate" | "deactivate" | "execute">>({});

  // ── Bulk actions ────────────────────────────────────────────────────────────
  const [selectedWorkflows, setSelectedWorkflows] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState<"activate" | "deactivate" | null>(null);

  // ── Cleanup ─────────────────────────────────────────────────────────────────
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<string | null>(null);
  const [cleanupError, setCleanupError] = useState<string | null>(null);
  const [cleanupConfirmOpen, setCleanupConfirmOpen] = useState(false);

  // ── Execute ─────────────────────────────────────────────────────────────────
  const [executeName, setExecuteName] = useState("");
  const [executeLoading, setExecuteLoading] = useState(false);
  const [executeResult, setExecuteResult] = useState<string | null>(null);
  const [executeError, setExecuteError] = useState<string | null>(null);

  // ── Activate ────────────────────────────────────────────────────────────────
  const [activateName, setActivateName] = useState("");
  const [activateLoading, setActivateLoading] = useState(false);
  const [activateResult, setActivateResult] = useState<string | null>(null);
  const [activateError, setActivateError] = useState<string | null>(null);

  // ── Deactivate ──────────────────────────────────────────────────────────────
  const [deactivateName, setDeactivateName] = useState("");
  const [deactivateLoading, setDeactivateLoading] = useState(false);
  const [deactivateResult, setDeactivateResult] = useState<string | null>(null);
  const [deactivateError, setDeactivateError] = useState<string | null>(null);

  // ── Executions ──────────────────────────────────────────────────────────────
  const [executionsName, setExecutionsName] = useState("");
  const [executionsLoading, setExecutionsLoading] = useState(false);
  const [executionsResult, setExecutionsResult] = useState<string | null>(null);
  const [executionsError, setExecutionsError] = useState<string | null>(null);
  const [executionsStructured, setExecutionsStructured] = useState<ExecutionEntry[] | null>(null);

  // ── Backup ──────────────────────────────────────────────────────────────────
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupError, setBackupError] = useState<string | null>(null);
  const [lastBackupDate, setLastBackupDate] = useState<Date | null>(null);

  // ── Health check ────────────────────────────────────────────────────────────
  const [healthStatus, setHealthStatus] = useState<"idle" | "checking" | "online" | "offline">("idle");
  const [healthLatency, setHealthLatency] = useState<number | null>(null);
  const [lastHealthCheck, setLastHealthCheck] = useState<Date | null>(null);

  // ── Action log ──────────────────────────────────────────────────────────────
  const [actionLog, setActionLog] = useState<LogEntry[]>([]);
  const [logOpen, setLogOpen] = useState(false);

  // ── Core helpers ─────────────────────────────────────────────────────────────

  const addLog = useCallback((entry: Omit<LogEntry, "id" | "timestamp">) => {
    setActionLog((prev) =>
      [{ ...entry, id: crypto.randomUUID(), timestamp: new Date() }, ...prev].slice(0, 50)
    );
  }, []);

  const checkHealth = useCallback(async () => {
    setHealthStatus("checking");
    const start = Date.now();
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 8000);
    try {
      await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: { text: "/ping" } }),
        signal: controller.signal,
      });
      setHealthLatency(Date.now() - start);
      setHealthStatus("online");
    } catch {
      setHealthStatus("offline");
      setHealthLatency(null);
    } finally {
      clearTimeout(tid);
      setLastHealthCheck(new Date());
    }
  }, []);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const run = async (
    command: VpsCommand,
    arg1: string | undefined,
    setLoading: (v: boolean) => void,
    setResult: (v: string | null) => void,
    setError: (v: string | null) => void,
    logLabel?: string
  ) => {
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const data = await sendCommand(command, arg1);
      const msg = data?.retorno ?? "";
      if (data?.erroType === "InvalidInput" || data?.erroType === "Message") {
        setResult(msg || "Comando executado.");
      } else {
        setResult(msg || "OK");
      }
      const isError = msg?.startsWith("❌");
      if (!isError) toast.success("Comando executado");
      else toast.error("Ação falhou");
      if (logLabel) addLog({ action: logLabel, target: arg1, status: isError ? "error" : "success", message: msg || "OK" });
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      setError(err);
      toast.error(err);
      if (logLabel) addLog({ action: logLabel, target: arg1, status: "error", message: err });
    } finally {
      setLoading(false);
    }
  };

  const runWorkflows = async () => {
    setWorkflowsLoading(true);
    setWorkflowsResult(null);
    setWorkflowsError(null);
    setWorkflowsList(null);
    setWorkflowsRawRetorno(null);
    setWorkflowsScreenOpen(false);
    setWorkflowsSearch("");
    setWorkflowsFilter("all");
    setSelectedWorkflows(new Set());
    try {
      const data = await sendCommand("workflows");
      const rawRetorno = (data && typeof data === "object" && "retorno" in data)
        ? String((data as { retorno?: unknown }).retorno ?? "")
        : "";
      const list = extractWorkflowsList(data);

      if (list && list.length > 0) {
        setWorkflowsList(list);
        setWorkflowsPage(1);
        setWorkflowsScreenOpen(true);
      } else if (list && list.length === 0) {
        setWorkflowsList([]);
        setWorkflowsPage(1);
        setWorkflowsScreenOpen(true);
      } else {
        setWorkflowsList([]);
        setWorkflowsRawRetorno(rawRetorno || "Comando executado.");
        setWorkflowsScreenOpen(true);
      }

      const isError = rawRetorno.startsWith("❌");
      if (isError) toast.error("Ação falhou");
      else toast.success("Lista atualizada");
      addLog({
        action: "Listar workflows",
        status: isError ? "error" : "success",
        message: list ? `${list.length} workflow${list.length !== 1 ? "s" : ""}` : rawRetorno || "OK",
      });
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      setWorkflowsError(err);
      setWorkflowsList(null);
      setWorkflowsRawRetorno(null);
      toast.error(err);
      addLog({ action: "Listar workflows", status: "error", message: err });
    } finally {
      setWorkflowsLoading(false);
    }
  };

  const runRowAction = async (workflowName: string, command: "activate" | "deactivate" | "execute") => {
    setRowLoading((prev) => ({ ...prev, [workflowName]: command }));
    try {
      const data = await sendCommand(command, workflowName);
      const msg = data?.retorno ?? "";
      const isError = msg?.startsWith("❌");
      if (isError) {
        toast.error(msg || "Ação falhou");
      } else {
        toast.success(msg || "Comando executado");
        if (command === "activate") {
          setWorkflowsList((prev) =>
            prev ? prev.map((w) => w.name === workflowName ? { ...w, active: true } : w) : prev
          );
        } else if (command === "deactivate") {
          setWorkflowsList((prev) =>
            prev ? prev.map((w) => w.name === workflowName ? { ...w, active: false } : w) : prev
          );
        }
      }
      addLog({
        action: command === "activate" ? "Ativar" : command === "deactivate" ? "Desativar" : "Executar",
        target: workflowName,
        status: isError ? "error" : "success",
        message: msg || "OK",
      });
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      toast.error(err);
      addLog({ action: command, target: workflowName, status: "error", message: err });
    } finally {
      setRowLoading((prev) => {
        const next = { ...prev };
        delete next[workflowName];
        return next;
      });
    }
  };

  const runBulkAction = async (command: "activate" | "deactivate") => {
    if (selectedWorkflows.size === 0) return;
    setBulkLoading(command);
    const names = Array.from(selectedWorkflows);
    const results = await Promise.allSettled(names.map((name) => sendCommand(command, name)));

    let successCount = 0;
    let errorCount = 0;
    const successNames = new Set<string>();

    results.forEach((result, i) => {
      if (result.status === "fulfilled" && !result.value?.retorno?.startsWith("❌")) {
        successCount++;
        successNames.add(names[i]);
      } else {
        errorCount++;
      }
    });

    if (successNames.size > 0) {
      setWorkflowsList((prev) =>
        prev
          ? prev.map((w) => successNames.has(w.name) ? { ...w, active: command === "activate" } : w)
          : prev
      );
    }

    if (successCount > 0) {
      toast.success(`${successCount} workflow${successCount !== 1 ? "s" : ""} ${command === "activate" ? "ativado" : "desativado"}${successCount !== 1 ? "s" : ""}`);
    }
    if (errorCount > 0) toast.error(`${errorCount} falha${errorCount !== 1 ? "s" : ""}`);

    addLog({
      action: command === "activate" ? "Ativar em lote" : "Desativar em lote",
      target: `${names.length} workflows`,
      status: errorCount === 0 ? "success" : successCount === 0 ? "error" : "success",
      message: `${successCount} sucesso${successCount !== 1 ? "s" : ""}, ${errorCount} erro${errorCount !== 1 ? "s" : ""}`,
    });

    setSelectedWorkflows(new Set());
    setBulkLoading(null);
  };

  const runExecutions = async () => {
    setExecutionsLoading(true);
    setExecutionsResult(null);
    setExecutionsError(null);
    setExecutionsStructured(null);
    const target = executionsName.trim() || undefined;
    try {
      const data = await sendCommand("executions", target);
      const msg = data?.retorno ?? "";
      const structured = parseExecutions(msg);
      if (structured) {
        setExecutionsStructured(structured);
      } else {
        setExecutionsResult(msg || "OK");
      }
      const isError = msg?.startsWith("❌");
      if (!isError) toast.success("Comando executado");
      else toast.error("Ação falhou");
      addLog({
        action: "Execuções",
        target,
        status: isError ? "error" : "success",
        message: structured
          ? `${structured.length} execução${structured.length !== 1 ? "ões" : ""}`
          : msg || "OK",
      });
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      setExecutionsError(err);
      toast.error(err);
      addLog({ action: "Execuções", target, status: "error", message: err });
    } finally {
      setExecutionsLoading(false);
    }
  };

  const runBackup = async () => {
    setBackupLoading(true);
    setBackupError(null);
    try {
      await downloadBackup();
      setLastBackupDate(new Date());
      toast.success("Backup baixado com sucesso");
      addLog({ action: "Backup", status: "success", message: "Arquivo .tar.gz baixado" });
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      setBackupError(err);
      toast.error(err);
      addLog({ action: "Backup", status: "error", message: err });
    } finally {
      setBackupLoading(false);
    }
  };

  const exportWorkflowsCsv = () => {
    if (!workflowsList || workflowsList.length === 0) return;
    const rows = [
      ["Nome", "Status"],
      ...workflowsList.map((w) => [w.name, w.active ? "Ativo" : "Inativo"]),
    ];
    const csv = rows.map((r) => r.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `workflows_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado");
    addLog({ action: "Exportar CSV", status: "success", message: `${workflowsList.length} workflows` });
  };

  // ── Derived state ─────────────────────────────────────────────────────────

  const filteredWorkflows = (workflowsList ?? []).filter((w) => {
    const matchSearch = w.name.toLowerCase().includes(workflowsSearch.toLowerCase());
    const matchFilter =
      workflowsFilter === "all" ||
      (workflowsFilter === "active" && w.active) ||
      (workflowsFilter === "inactive" && !w.active);
    return matchSearch && matchFilter;
  });

  const allFilteredSelected =
    filteredWorkflows.length > 0 && filteredWorkflows.every((w) => selectedWorkflows.has(w.name));
  const someFilteredSelected = filteredWorkflows.some((w) => selectedWorkflows.has(w.name));

  // ── JSX ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      {!hideHeader && (
        <div className="page-header">
          <h1>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Server className="h-4 w-4 text-primary" />
            </div>
            Gestão de VPS
          </h1>
          <p>Controle workflows n8n, backup e limpeza via webhook</p>
        </div>
      )}

      {/* Health Check */}
      <Card className="border-border">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg shrink-0",
                  healthStatus === "online"
                    ? "bg-emerald-500/10 text-emerald-600"
                    : healthStatus === "offline"
                    ? "bg-destructive/10 text-destructive"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {healthStatus === "checking" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : healthStatus === "offline" ? (
                  <WifiOff className="h-4 w-4" />
                ) : (
                  <Wifi className="h-4 w-4" />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground flex items-center gap-2 flex-wrap">
                  Status do n8n
                  {healthStatus === "idle" && (
                    <Badge variant="secondary" className="text-xs">Não verificado</Badge>
                  )}
                  {healthStatus === "checking" && (
                    <Badge variant="secondary" className="text-xs">Verificando…</Badge>
                  )}
                  {healthStatus === "online" && (
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs">
                      ● Online
                    </Badge>
                  )}
                  {healthStatus === "offline" && (
                    <Badge variant="destructive" className="text-xs">● Offline</Badge>
                  )}
                  {healthStatus === "online" && healthLatency !== null && (
                    <span className="text-xs font-normal text-muted-foreground">{healthLatency}ms</span>
                  )}
                </p>
                {lastHealthCheck && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Clock className="h-3 w-3" />
                    Verificado às {lastHealthCheck.toLocaleTimeString("pt-BR")}
                  </p>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={checkHealth}
              disabled={healthStatus === "checking"}
              className="gap-1.5"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", healthStatus === "checking" && "animate-spin")} />
              Verificar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Action Cards Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Listar workflows */}
        <Card className="border-border overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <List className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base">Listar workflows</CardTitle>
                <CardDescription className="text-xs">
                  Lista todos os workflows (nome e status ativo/inativo).
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={runWorkflows} disabled={workflowsLoading} className="w-full sm:w-auto">
              {workflowsLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Listar
            </Button>
            {workflowsError && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <pre className="whitespace-pre-wrap break-words">{workflowsError}</pre>
              </div>
            )}
            {workflowsList !== null && workflowsList.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {workflowsList.length} workflow{workflowsList.length !== 1 ? "s" : ""} — veja a tela aberta.
              </p>
            )}
            {workflowsResult && !workflowsError && workflowsList === null && (
              <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3 text-sm text-foreground">
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-500" />
                <pre className="whitespace-pre-wrap break-words font-sans">{workflowsResult}</pre>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cleanup com confirmação */}
        <Card className="border-border overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Trash2 className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base">Cleanup (workflows arquivados)</CardTitle>
                <CardDescription className="text-xs">Lista workflows arquivados e os exclui permanentemente.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="destructive"
              onClick={() => setCleanupConfirmOpen(true)}
              disabled={cleanupLoading}
              className="w-full sm:w-auto"
            >
              {cleanupLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Listar e excluir arquivados
            </Button>
            {cleanupError && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <pre className="whitespace-pre-wrap break-words">{cleanupError}</pre>
              </div>
            )}
            {cleanupResult && !cleanupError && (
              <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3 text-sm text-foreground">
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-500" />
                <pre className="whitespace-pre-wrap break-words font-sans">{cleanupResult}</pre>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Executar */}
        <ActionCard
          title="Executar workflow"
          description="Dispara a execução de um workflow pelo nome."
          icon={<Play className="h-4 w-4" />}
          loading={executeLoading}
          result={executeResult}
          error={executeError}
          onRun={() => run("execute", executeName.trim() || undefined, setExecuteLoading, setExecuteResult, setExecuteError, "Executar")}
          buttonLabel="Executar"
        >
          <div className="space-y-2">
            <Label htmlFor="execute-name">Nome do workflow</Label>
            <Input
              id="execute-name"
              placeholder="Ex: Meu Workflow"
              value={executeName}
              onChange={(e) => setExecuteName(e.target.value)}
              className="font-mono text-sm"
            />
          </div>
        </ActionCard>

        {/* Ativar */}
        <ActionCard
          title="Ativar workflow"
          description="Ativa um workflow pelo nome (fica disponível para execução)."
          icon={<Power className="h-4 w-4" />}
          loading={activateLoading}
          result={activateResult}
          error={activateError}
          onRun={() => run("activate", activateName.trim() || undefined, setActivateLoading, setActivateResult, setActivateError, "Ativar")}
          buttonLabel="Ativar"
        >
          <div className="space-y-2">
            <Label htmlFor="activate-name">Nome do workflow</Label>
            <Input
              id="activate-name"
              placeholder="Ex: Meu Workflow"
              value={activateName}
              onChange={(e) => setActivateName(e.target.value)}
              className="font-mono text-sm"
            />
          </div>
        </ActionCard>

        {/* Desativar */}
        <ActionCard
          title="Desativar workflow"
          description="Desativa um workflow pelo nome (para de ser executado)."
          icon={<PowerOff className="h-4 w-4" />}
          loading={deactivateLoading}
          result={deactivateResult}
          error={deactivateError}
          onRun={() => run("deactivate", deactivateName.trim() || undefined, setDeactivateLoading, setDeactivateResult, setDeactivateError, "Desativar")}
          buttonLabel="Desativar"
        >
          <div className="space-y-2">
            <Label htmlFor="deactivate-name">Nome do workflow</Label>
            <Input
              id="deactivate-name"
              placeholder="Ex: Meu Workflow"
              value={deactivateName}
              onChange={(e) => setDeactivateName(e.target.value)}
              className="font-mono text-sm"
            />
          </div>
        </ActionCard>

        {/* Execuções — card dedicado com display estruturado */}
        <Card className="border-border overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <History className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base">Execuções de um workflow</CardTitle>
                <CardDescription className="text-xs">
                  Lista as execuções recentes de um workflow pelo nome.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="executions-name">Nome do workflow</Label>
              <Input
                id="executions-name"
                placeholder="Ex: Meu Workflow"
                value={executionsName}
                onChange={(e) => setExecutionsName(e.target.value)}
                className="font-mono text-sm"
              />
            </div>
            <Button onClick={runExecutions} disabled={executionsLoading} className="w-full sm:w-auto">
              {executionsLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Listar execuções
            </Button>
            {executionsError && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <pre className="whitespace-pre-wrap break-words">{executionsError}</pre>
              </div>
            )}
            {executionsStructured && !executionsError && (
              <div className="rounded-lg border border-border overflow-auto max-h-56">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-xs font-semibold">Status</TableHead>
                      <TableHead className="text-xs font-semibold">Início</TableHead>
                      <TableHead className="text-xs font-semibold">Duração</TableHead>
                      <TableHead className="text-xs font-semibold">Modo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {executionsStructured.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-4">
                          Nenhuma execução encontrada.
                        </TableCell>
                      </TableRow>
                    ) : (
                      executionsStructured.map((ex, i) => (
                        <TableRow key={ex.id ?? i}>
                          <TableCell>
                            <Badge
                              variant={
                                ex.status === "success"
                                  ? "default"
                                  : ex.status === "error" || ex.status === "crashed"
                                  ? "destructive"
                                  : "secondary"
                              }
                              className={cn(
                                "text-xs",
                                ex.status === "success" &&
                                  "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                              )}
                            >
                              {ex.status ?? "—"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">{formatDate(ex.startedAt)}</TableCell>
                          <TableCell className="text-xs">{formatDuration(ex.startedAt, ex.stoppedAt)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{ex.mode ?? "—"}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
            {executionsResult && !executionsError && !executionsStructured && (
              <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3 text-sm text-foreground">
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-500" />
                <pre className="whitespace-pre-wrap break-words font-sans">{executionsResult}</pre>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Backup */}
        <Card className="border-border overflow-hidden md:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FileArchive className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base">Backup completo</CardTitle>
                <CardDescription className="text-xs">
                  Exporta workflows e credenciais do n8n e baixa um arquivo .tar.gz.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={runBackup} disabled={backupLoading}>
                {backupLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Gerar e baixar backup
              </Button>
              <Badge variant="outline" className="text-xs">Arquivo .tar.gz</Badge>
              {lastBackupDate && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Último: {lastBackupDate.toLocaleTimeString("pt-BR")}
                </span>
              )}
            </div>
            {backupError && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <pre className="whitespace-pre-wrap break-words">{backupError}</pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Webhook info */}
      <Card className="border-border bg-muted/20">
        <CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">
            <strong>Webhook:</strong>{" "}
            <code className="rounded bg-muted px-1 py-0.5">{WEBHOOK_URL}</code>
            {" · "}
            O fluxo n8n &quot;Gestao VPS - COMPLETA&quot; deve estar ativo e acessível.
          </p>
        </CardContent>
      </Card>

      {/* Histórico de ações */}
      <Card className="border-border">
        <CardHeader
          className="pb-2 pt-4 cursor-pointer select-none"
          onClick={() => setLogOpen((v) => !v)}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Histórico de ações da sessão
              {actionLog.length > 0 && (
                <Badge variant="secondary" className="text-xs">{actionLog.length}</Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              {logOpen && actionLog.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs text-muted-foreground hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActionLog([]);
                  }}
                >
                  Limpar
                </Button>
              )}
              {logOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </div>
        </CardHeader>
        {logOpen && (
          <CardContent className="pt-1 pb-4">
            {actionLog.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                Nenhuma ação realizada nesta sessão.
              </p>
            ) : (
              <div className="rounded-lg border border-border overflow-auto max-h-64">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-xs w-[80px]">Horário</TableHead>
                      <TableHead className="text-xs">Ação</TableHead>
                      <TableHead className="text-xs">Destino</TableHead>
                      <TableHead className="text-xs w-[54px] text-center">Status</TableHead>
                      <TableHead className="text-xs">Mensagem</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {actionLog.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="text-xs text-muted-foreground font-mono">
                          {entry.timestamp.toLocaleTimeString("pt-BR")}
                        </TableCell>
                        <TableCell className="text-xs font-medium">{entry.action}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate">
                          {entry.target ?? "—"}
                        </TableCell>
                        <TableCell className="text-center">
                          {entry.status === "success" ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mx-auto" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5 text-destructive mx-auto" />
                          )}
                        </TableCell>
                        <TableCell
                          className="text-xs text-muted-foreground max-w-[200px] truncate"
                          title={entry.message}
                        >
                          {entry.message}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Dialog de listagem de workflows */}
      <Dialog
        open={workflowsScreenOpen}
        onOpenChange={(open) => {
          setWorkflowsScreenOpen(open);
          if (!open) setSelectedWorkflows(new Set());
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between gap-2">
              <DialogTitle className="flex items-center gap-2">
                <List className="h-5 w-5" />
                Workflows
              </DialogTitle>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1.5 shrink-0"
                onClick={exportWorkflowsCsv}
                disabled={!workflowsList || workflowsList.length === 0}
              >
                <FileDown className="h-3.5 w-3.5" />
                Exportar CSV
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            {workflowsList !== null && workflowsList.length > 0 ? (
              (() => {
                const total = filteredWorkflows.length;
                const totalPages = Math.max(1, Math.ceil(total / workflowsPageSize));
                const safePage = Math.min(Math.max(1, workflowsPage), totalPages);
                const start = (safePage - 1) * workflowsPageSize;
                const paginatedWorkflows = filteredWorkflows.slice(start, start + workflowsPageSize);

                return (
                  <>
                    {/* Resumo + busca + filtro */}
                    <div className="space-y-2 mb-3 shrink-0">
                      <p className="text-sm text-muted-foreground">
                        {workflowsList.length} workflow{workflowsList.length !== 1 ? "s" : ""}{" "}
                        ({workflowsList.filter((w) => w.active).length} ativos,{" "}
                        {workflowsList.filter((w) => !w.active).length} inativos)
                        {(workflowsSearch || workflowsFilter !== "all") && (
                          <span className="ml-1 text-primary font-medium">
                            — {total} exibido{total !== 1 ? "s" : ""}
                          </span>
                        )}
                      </p>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <div className="relative flex-1">
                          <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground pointer-events-none" />
                          <Input
                            placeholder="Buscar por nome..."
                            className="pl-8 h-8 text-sm"
                            value={workflowsSearch}
                            onChange={(e) => {
                              setWorkflowsSearch(e.target.value);
                              setWorkflowsPage(1);
                            }}
                          />
                        </div>
                        <div className="flex gap-1 shrink-0">
                          {(["all", "active", "inactive"] as StatusFilter[]).map((f) => (
                            <Button
                              key={f}
                              size="sm"
                              variant={workflowsFilter === f ? "default" : "outline"}
                              className="h-8 text-xs px-3"
                              onClick={() => {
                                setWorkflowsFilter(f);
                                setWorkflowsPage(1);
                              }}
                            >
                              {f === "all" ? "Todos" : f === "active" ? "Ativos" : "Inativos"}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Barra de ações em lote */}
                    {selectedWorkflows.size > 0 && (
                      <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 mb-2 flex-wrap shrink-0">
                        <span className="text-sm font-medium text-primary">
                          {selectedWorkflows.size} selecionado{selectedWorkflows.size !== 1 ? "s" : ""}
                        </span>
                        <div className="flex gap-2 ml-auto flex-wrap">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs text-emerald-600 border-emerald-500/40 hover:bg-emerald-500/10"
                            disabled={!!bulkLoading}
                            onClick={() => runBulkAction("activate")}
                          >
                            {bulkLoading === "activate" ? (
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            ) : (
                              <Power className="h-3 w-3 mr-1" />
                            )}
                            Ativar selecionados
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs text-amber-600 border-amber-500/40 hover:bg-amber-500/10"
                            disabled={!!bulkLoading}
                            onClick={() => runBulkAction("deactivate")}
                          >
                            {bulkLoading === "deactivate" ? (
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            ) : (
                              <PowerOff className="h-3 w-3 mr-1" />
                            )}
                            Desativar selecionados
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={() => setSelectedWorkflows(new Set())}
                          >
                            Limpar seleção
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Tabela */}
                    <div className="rounded-lg border border-border overflow-auto flex-1 min-h-0">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="w-[40px] pl-3">
                              <Checkbox
                                checked={
                                  allFilteredSelected
                                    ? true
                                    : someFilteredSelected
                                    ? "indeterminate"
                                    : false
                                }
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedWorkflows(
                                      new Set(filteredWorkflows.map((w) => w.name))
                                    );
                                  } else {
                                    setSelectedWorkflows(new Set());
                                  }
                                }}
                                disabled={!!bulkLoading}
                              />
                            </TableHead>
                            <TableHead className="font-semibold">Workflow</TableHead>
                            <TableHead className="font-semibold w-[90px]">Status</TableHead>
                            <TableHead className="font-semibold w-[130px] text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedWorkflows.length === 0 ? (
                            <TableRow>
                              <TableCell
                                colSpan={4}
                                className="text-center text-sm text-muted-foreground py-8"
                              >
                                Nenhum workflow encontrado para os filtros aplicados.
                              </TableCell>
                            </TableRow>
                          ) : (
                            paginatedWorkflows.map((w, i) => {
                              const isRowBusy = !!rowLoading[w.name] || !!bulkLoading;
                              return (
                                <TableRow key={`${w.name}-${start + i}`}>
                                  <TableCell className="pl-3">
                                    <Checkbox
                                      checked={selectedWorkflows.has(w.name)}
                                      onCheckedChange={(checked) => {
                                        setSelectedWorkflows((prev) => {
                                          const next = new Set(prev);
                                          if (checked) next.add(w.name);
                                          else next.delete(w.name);
                                          return next;
                                        });
                                      }}
                                      disabled={isRowBusy}
                                    />
                                  </TableCell>
                                  <TableCell
                                    className="font-medium max-w-[280px]"
                                    title={w.name}
                                  >
                                    <span className="block truncate">{w.name}</span>
                                  </TableCell>
                                  <TableCell>
                                    <Badge
                                      variant={w.active ? "default" : "secondary"}
                                      className={
                                        w.active
                                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                          : ""
                                      }
                                    >
                                      {w.active ? "Ativo" : "Inativo"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center justify-end gap-1">
                                      {w.active ? (
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              size="icon"
                                              variant="ghost"
                                              className="h-7 w-7 text-muted-foreground hover:text-amber-600 hover:bg-amber-500/10"
                                              disabled={isRowBusy}
                                              onClick={() => runRowAction(w.name, "deactivate")}
                                            >
                                              {rowLoading[w.name] === "deactivate" ? (
                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                              ) : (
                                                <PowerOff className="h-3.5 w-3.5" />
                                              )}
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent side="top">Desativar</TooltipContent>
                                        </Tooltip>
                                      ) : (
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              size="icon"
                                              variant="ghost"
                                              className="h-7 w-7 text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10"
                                              disabled={isRowBusy}
                                              onClick={() => runRowAction(w.name, "activate")}
                                            >
                                              {rowLoading[w.name] === "activate" ? (
                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                              ) : (
                                                <Power className="h-3.5 w-3.5" />
                                              )}
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent side="top">Ativar</TooltipContent>
                                        </Tooltip>
                                      )}
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                            disabled={isRowBusy}
                                            onClick={() => runRowAction(w.name, "execute")}
                                          >
                                            {rowLoading[w.name] === "execute" ? (
                                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            ) : (
                                              <Play className="h-3.5 w-3.5" />
                                            )}
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="top">Executar</TooltipContent>
                                      </Tooltip>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          )}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Paginação */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border text-sm text-muted-foreground shrink-0">
                      <div className="flex items-center gap-3">
                        <span>
                          Mostrando {total === 0 ? 0 : start + 1}–
                          {Math.min(start + workflowsPageSize, total)} de {total}
                        </span>
                        <Select
                          value={String(workflowsPageSize)}
                          onValueChange={(v) => {
                            setWorkflowsPageSize(Number(v));
                            setWorkflowsPage(1);
                          }}
                        >
                          <SelectTrigger className="w-[100px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {WORKFLOWS_PAGE_SIZES.map((size) => (
                              <SelectItem key={size} value={String(size)}>
                                {size} por página
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={safePage <= 1}
                          onClick={() => setWorkflowsPage(safePage - 1)}
                        >
                          Anterior
                        </Button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                          .filter(
                            (p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1
                          )
                          .reduce<(number | "ellipsis")[]>((acc, p, idx, arr) => {
                            if (idx > 0 && p - (arr[idx - 1] as number) > 1)
                              acc.push("ellipsis");
                            acc.push(p);
                            return acc;
                          }, [])
                          .map((item, idx) =>
                            item === "ellipsis" ? (
                              <span key={`e-${idx}`} className="px-2">
                                …
                              </span>
                            ) : (
                              <Button
                                key={item}
                                variant={item === safePage ? "default" : "outline"}
                                size="sm"
                                className="min-w-[36px]"
                                onClick={() => setWorkflowsPage(item)}
                              >
                                {item}
                              </Button>
                            )
                          )}
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={safePage >= totalPages}
                          onClick={() => setWorkflowsPage(safePage + 1)}
                        >
                          Próximo
                        </Button>
                      </div>
                    </div>
                  </>
                );
              })()
            ) : workflowsList !== null && !workflowsRawRetorno ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Nenhum workflow encontrado.
              </p>
            ) : workflowsList !== null && workflowsRawRetorno ? (
              <div className="space-y-4 py-4">
                <p className="text-sm text-muted-foreground">
                  A resposta do n8n não trouxe a lista de workflows. Atualize o workflow no n8n para
                  retornar o array{" "}
                  <code className="text-xs bg-muted px-1 rounded">workflows</code> ou o texto com
                  🟢/⚫.
                </p>
                <div className="rounded-lg border border-border bg-muted/30 p-3 max-h-40 overflow-auto">
                  <pre className="text-xs whitespace-pre-wrap break-words">{workflowsRawRetorno}</pre>
                </div>
                <Button variant="outline" onClick={runWorkflows} disabled={workflowsLoading}>
                  {workflowsLoading ? "Carregando…" : "Listar novamente"}
                </Button>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      {/* AlertDialog de confirmação do Cleanup */}
      <AlertDialog open={cleanupConfirmOpen} onOpenChange={setCleanupConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirmar exclusão permanente
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                Esta ação vai <strong>listar e excluir permanentemente</strong> todos os workflows
                arquivados no n8n.
              </span>
              <span className="block text-destructive font-medium">
                Os workflows deletados não poderão ser recuperados.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                run(
                  "cleanup",
                  undefined,
                  setCleanupLoading,
                  setCleanupResult,
                  setCleanupError,
                  "Cleanup"
                )
              }
            >
              Sim, excluir arquivados
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
