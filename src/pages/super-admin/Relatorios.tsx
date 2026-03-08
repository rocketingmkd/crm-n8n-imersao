import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { fetchContagemMensagensPorOrg, primeiroDiaDoMesAtual } from "@/lib/conversas";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { BarChart3, AlertTriangle, CheckCircle2, Filter, ChevronLeft, ChevronRight, MessageSquare, Users, FileText, UserCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface OrgRow {
  id: string;
  nome: string;
  identificador: string;
  plano_assinatura: string | null;
  nome_plano: string;
  max_mensagens: number | null;
  max_usuarios: number | null;
  max_contatos: number | null;
  max_arquivos: number | null;
  uso_mensagens: number;
  uso_usuarios: number;
  uso_contatos: number;
  uso_arquivos: number;
}

const LIMIT_THRESHOLD = 0.8;
const PAGE_SIZE = 10;

function UsageCell({ current, max, label, limitText, nearText }: { current: number; max: number | null; label: string; limitText: string; nearText: string }) {
  if (max == null) {
    return <span className="text-muted-foreground">{current} / ∞</span>;
  }
  const pct = max > 0 ? current / max : 0;
  const atLimit = current >= max;
  const nearLimit = pct >= LIMIT_THRESHOLD && !atLimit;
  return (
    <span
      className={cn(atLimit && "text-destructive font-medium", nearLimit && "text-amber-600 font-medium")}
      title={label}
    >
      {current} / {max}
      {atLimit && ` ${limitText}`}
      {nearLimit && !atLimit && ` ${nearText}`}
    </span>
  );
}

function AlertBadges({ row, t }: { row: OrgRow; t: (k: string) => string }) {
  const labels: Record<string, string> = { users: t("superAdmin.reports.users"), clients: t("superAdmin.reports.clients"), filesBc: t("superAdmin.reports.filesBc"), messages: t("superAdmin.reports.messages") };
  const alerts: string[] = [];
  if (row.max_usuarios != null && row.uso_usuarios >= row.max_usuarios) alerts.push(labels.users);
  if (row.max_contatos != null && row.uso_contatos >= row.max_contatos) alerts.push(labels.clients);
  if (row.max_arquivos != null && row.uso_arquivos >= row.max_arquivos) alerts.push(labels.filesBc);
  if (row.max_mensagens != null && row.uso_mensagens >= row.max_mensagens) alerts.push(labels.messages);

  const near: string[] = [];
  if (row.max_usuarios != null && row.uso_usuarios >= row.max_usuarios * LIMIT_THRESHOLD && row.uso_usuarios < row.max_usuarios) near.push(labels.users);
  if (row.max_contatos != null && row.uso_contatos >= row.max_contatos * LIMIT_THRESHOLD && row.uso_contatos < row.max_contatos) near.push(labels.clients);
  if (row.max_arquivos != null && row.uso_arquivos >= row.max_arquivos * LIMIT_THRESHOLD && row.uso_arquivos < row.max_arquivos) near.push(labels.filesBc);
  if (row.max_mensagens != null && row.uso_mensagens >= row.max_mensagens * LIMIT_THRESHOLD && row.uso_mensagens < row.max_mensagens) near.push(labels.messages);

  if (alerts.length === 0 && near.length === 0) {
    return <CheckCircle2 className="h-4 w-4 text-green-600" aria-label={t("superAdmin.reports.withinLimits")} />;
  }
  const nearSuffix = ` ${t("superAdmin.reports.near")}`;
  return (
    <div className="flex flex-wrap gap-1">
      {alerts.map((a) => (
        <Badge key={a} variant="destructive" className="text-xs">
          <AlertTriangle className="h-3 w-3 mr-0.5" /> {a}
        </Badge>
      ))}
      {near.map((n) => (
        <Badge key={n} variant="secondary" className="text-xs text-amber-700 border-amber-500/50">
          {n}{nearSuffix}
        </Badge>
      ))}
    </div>
  );
}

export default function Relatorios() {
  const { t } = useTranslation();
  const [selectedOrg, setSelectedOrg] = useState<string>("all");
  const [page, setPage] = useState(1);

  const { data: rows = [], isLoading, isError, error } = useQuery({
    queryKey: ["super-admin-relatorios-uso"],
    queryFn: async (): Promise<OrgRow[]> => {
      try {
        const [
          { data: orgs, error: eOrgs },
          { data: plans, error: ePlans },
          { data: contatos, error: eContatos },
          { data: perfis, error: ePerfis },
          { data: documentos, error: eDocs },
        ] = await Promise.all([
          supabase.from("organizacoes").select("id, nome, identificador, plano_assinatura").order("nome"),
          supabase.from("planos_assinatura").select("id_plano, nome_plano, max_mensagens_whatsapp_mes, max_usuarios, max_contatos, max_arquivos_conhecimento"),
          supabase.from("contatos").select("id_organizacao"),
          supabase.from("perfis").select("id_organizacao").eq("super_admin", false),
          supabase.from("documentos").select("id, metadata, titulo"),
        ]);

        if (eOrgs) throw new Error(eOrgs.message);
        if (ePlans) throw new Error(ePlans.message);
        if (eContatos) throw new Error(eContatos.message);
        if (ePerfis) throw new Error(ePerfis.message);
        if (eDocs) throw new Error(eDocs.message);

        const planMap = new Map<string, { nome_plano: string; max_mensagens: number | null; max_usuarios: number | null; max_contatos: number | null; max_arquivos: number | null }>();
        (plans || []).forEach((p: any) => {
          if (p && p.id_plano) {
            planMap.set(p.id_plano, {
              nome_plano: p.nome_plano ?? "—",
              max_mensagens: p.max_mensagens_whatsapp_mes ?? null,
              max_usuarios: p.max_usuarios ?? null,
              max_contatos: p.max_contatos ?? null,
              max_arquivos: p.max_arquivos_conhecimento ?? null,
            });
          }
        });

        const countByOrg = (arr: { id_organizacao?: string }[] | null) => {
          const m: Record<string, number> = {};
          (arr || []).forEach((r) => {
            const id = r?.id_organizacao;
            if (id) m[id] = (m[id] || 0) + 1;
          });
          return m;
        };
        const contatosPorOrg = countByOrg(contatos);
        const perfisPorOrg = countByOrg(perfis);

        const filesByIdentificador: Record<string, Set<string>> = {};
        (documentos || []).forEach((d: any) => {
          const org = d?.metadata?.organizacao ?? d?.metadados?.organizacao;
          if (!org) return;
          if (!filesByIdentificador[org]) filesByIdentificador[org] = new Set();
          const fileKey = (d?.titulo && String(d.titulo).trim()) || String(d?.id ?? "");
          filesByIdentificador[org].add(fileKey);
        });
        const docsPorIdentificador: Record<string, number> = {};
        Object.entries(filesByIdentificador).forEach(([org, set]) => {
          docsPorIdentificador[org] = set.size;
        });

        let usoMensagensPorOrg: Record<string, number> = {};
        try {
          const orgList = (orgs || []).map((o: any) => ({ id: o?.id, identificador: o?.identificador ?? null }));
          usoMensagensPorOrg = await Promise.race([
            fetchContagemMensagensPorOrg(supabase, orgList, { since: primeiroDiaDoMesAtual() }),
            new Promise<Record<string, number>>((_, reject) =>
              setTimeout(() => reject(new Error("timeout")), 5000)
            ),
          ]);
        } catch (_err) {
          // Não bloqueia: mantém zero para todas as orgs
        }

        return (orgs || []).map((org: any) => {
          const plan = org?.plano_assinatura ? planMap.get(org.plano_assinatura) : null;
          return {
            id: org?.id ?? "",
            nome: org?.nome ?? "",
            identificador: org?.identificador ?? "",
            plano_assinatura: org?.plano_assinatura ?? null,
            nome_plano: plan?.nome_plano ?? "—",
            max_mensagens: plan?.max_mensagens ?? null,
            max_usuarios: plan?.max_usuarios ?? null,
            max_contatos: plan?.max_contatos ?? null,
            max_arquivos: plan?.max_arquivos ?? null,
            uso_mensagens: usoMensagensPorOrg[org?.id] ?? 0,
            uso_usuarios: perfisPorOrg[org?.id] ?? 0,
            uso_contatos: contatosPorOrg[org?.id] ?? 0,
            uso_arquivos: docsPorIdentificador[org?.identificador] ?? 0,
          };
        });
      } catch (err) {
        console.error("[Relatorios] Erro na query:", err);
        throw err;
      }
    },
    retry: 0,
    staleTime: 60_000,
  });

  const filteredRows = useMemo(() => {
    if (selectedOrg === "all") return rows;
    return rows.filter((r) => r.id === selectedOrg);
  }, [rows, selectedOrg]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedRows = filteredRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const totalMensagens = useMemo(() => filteredRows.reduce((s, r) => s + r.uso_mensagens, 0), [filteredRows]);
  const totalUsuarios = useMemo(() => filteredRows.reduce((s, r) => s + r.uso_usuarios, 0), [filteredRows]);
  const totalClientes = useMemo(() => filteredRows.reduce((s, r) => s + r.uso_contatos, 0), [filteredRows]);
  const totalArquivos = useMemo(() => filteredRows.reduce((s, r) => s + r.uso_arquivos, 0), [filteredRows]);
  const empresasComAlerta = useMemo(() => filteredRows.filter((r) => (r.max_usuarios != null && r.uso_usuarios >= r.max_usuarios) || (r.max_contatos != null && r.uso_contatos >= r.max_contatos) || (r.max_arquivos != null && r.uso_arquivos >= r.max_arquivos) || (r.max_mensagens != null && r.uso_mensagens >= r.max_mensagens)).length, [filteredRows]);

  // Reset page when filter changes
  const handleOrgChange = (value: string) => {
    setSelectedOrg(value);
    setPage(1);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <div className="page-header">
          <h1>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/10">
              <BarChart3 className="h-4 w-4 text-teal-500" />
            </div>
            {t("superAdmin.reports.title")}
          </h1>
          <p>{t("superAdmin.reports.subtitle")}</p>
        </div>
        <Card className="border-destructive/50">
          <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
            <AlertTriangle className="h-12 w-12 text-destructive" />
            <p className="text-center text-muted-foreground">{t("superAdmin.reports.loadError")}</p>
            <p className="text-center text-sm text-muted-foreground max-w-md">{error instanceof Error ? error.message : String(error)}</p>
            <Button variant="outline" onClick={() => window.location.reload()}>{t("superAdmin.reports.retry")}</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="page-header">
          <h1>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/10">
              <BarChart3 className="h-4 w-4 text-teal-500" />
            </div>
            {t("superAdmin.reports.title")}
          </h1>
          <p>{t("superAdmin.reports.subtitle")}</p>
        </div>
        <div className="flex items-center gap-1.5 min-w-0 shrink-0">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          <Select value={selectedOrg} onValueChange={handleOrgChange}>
            <SelectTrigger className="h-9 text-xs w-[200px]">
              <SelectValue placeholder={t("superAdmin.reports.allCompanies")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("superAdmin.reports.allCompanies")}</SelectItem>
              {rows.map((o) => (
                <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Resumo em cards (sem gráficos para garantir carregamento estável) */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="border-border">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <MessageSquare className="h-4 w-4 text-blue-500" />
              <span className="text-xs font-medium">{t("superAdmin.reports.messagesMonth")}</span>
            </div>
            <p className="text-2xl font-bold tabular-nums">{totalMensagens.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{t("superAdmin.reports.messagesHint")}</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <UserCircle className="h-4 w-4 text-teal-500" />
              <span className="text-xs font-medium">{t("superAdmin.reports.users")}</span>
            </div>
            <p className="text-2xl font-bold tabular-nums">{totalUsuarios.toLocaleString("pt-BR")}</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Users className="h-4 w-4 text-violet-500" />
              <span className="text-xs font-medium">{t("superAdmin.reports.clients")}</span>
            </div>
            <p className="text-2xl font-bold tabular-nums">{totalClientes.toLocaleString("pt-BR")}</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <FileText className="h-4 w-4 text-amber-500" />
              <span className="text-xs font-medium">{t("superAdmin.reports.filesBc")}</span>
            </div>
            <p className="text-2xl font-bold tabular-nums">{totalArquivos.toLocaleString("pt-BR")}</p>
          </CardContent>
        </Card>
      </div>
      <Card className="border-border">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium">{t("superAdmin.reports.companiesWithAlert")}</span>
            </div>
            <span className={cn("text-lg font-bold tabular-nums", empresasComAlerta > 0 ? "text-destructive" : "text-muted-foreground")}>{empresasComAlerta} {t("superAdmin.reports.paginationOf")} {filteredRows.length}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("superAdmin.reports.usageByCompany")}</CardTitle>
          <CardDescription>
            {t("superAdmin.reports.usageTableDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold">{t("superAdmin.reports.company")}</TableHead>
                <TableHead className="font-semibold">{t("superAdmin.reports.plan")}</TableHead>
                <TableHead className="font-semibold">{t("superAdmin.reports.messages")}</TableHead>
                <TableHead className="font-semibold">{t("superAdmin.reports.users")}</TableHead>
                <TableHead className="font-semibold">{t("superAdmin.reports.clients")}</TableHead>
                <TableHead className="font-semibold">{t("superAdmin.reports.filesBc")}</TableHead>
                <TableHead className="font-semibold text-right">{t("superAdmin.reports.alerts")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    {t("superAdmin.reports.noCompaniesFound")}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.nome}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{row.nome_plano}</Badge>
                    </TableCell>
                    <TableCell>
                      <UsageCell current={row.uso_mensagens} max={row.max_mensagens} label={t("superAdmin.reports.messagesWhatsappMonth")} limitText={t("superAdmin.reports.limit")} nearText={t("superAdmin.reports.near")} />
                    </TableCell>
                    <TableCell>
                      <UsageCell current={row.uso_usuarios} max={row.max_usuarios} label={t("superAdmin.reports.users")} limitText={t("superAdmin.reports.limit")} nearText={t("superAdmin.reports.near")} />
                    </TableCell>
                    <TableCell>
                      <UsageCell current={row.uso_contatos} max={row.max_contatos} label={t("superAdmin.reports.clients")} limitText={t("superAdmin.reports.limit")} nearText={t("superAdmin.reports.near")} />
                    </TableCell>
                    <TableCell>
                      <UsageCell current={row.uso_arquivos} max={row.max_arquivos} label={t("superAdmin.reports.filesKnowledgeBase")} limitText={t("superAdmin.reports.limit")} nearText={t("superAdmin.reports.near")} />
                    </TableCell>
                    <TableCell className="text-right">
                      <AlertBadges row={row} t={t} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {filteredRows.length > PAGE_SIZE && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-muted-foreground">
                {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filteredRows.length)} {t("superAdmin.reports.paginationOf")} {filteredRows.length}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground px-2">
                  {safePage} / {totalPages}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
