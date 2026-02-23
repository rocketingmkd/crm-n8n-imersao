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
import { BarChart3, AlertTriangle, CheckCircle2, Filter, ChevronLeft, ChevronRight } from "lucide-react";
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

function UsageCell({ current, max, label }: { current: number; max: number | null; label: string }) {
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
      {atLimit && " (limite)"}
      {nearLimit && !atLimit && " (próximo)"}
    </span>
  );
}

function AlertBadges({ row }: { row: OrgRow }) {
  const alerts: string[] = [];
  if (row.max_usuarios != null && row.uso_usuarios >= row.max_usuarios) alerts.push("Usuários");
  if (row.max_contatos != null && row.uso_contatos >= row.max_contatos) alerts.push("Clientes");
  if (row.max_arquivos != null && row.uso_arquivos >= row.max_arquivos) alerts.push("Arquivos BC");
  if (row.max_mensagens != null && row.uso_mensagens >= row.max_mensagens) alerts.push("Mensagens");

  const near: string[] = [];
  if (row.max_usuarios != null && row.uso_usuarios >= row.max_usuarios * LIMIT_THRESHOLD && row.uso_usuarios < row.max_usuarios) near.push("Usuários");
  if (row.max_contatos != null && row.uso_contatos >= row.max_contatos * LIMIT_THRESHOLD && row.uso_contatos < row.max_contatos) near.push("Clientes");
  if (row.max_arquivos != null && row.uso_arquivos >= row.max_arquivos * LIMIT_THRESHOLD && row.uso_arquivos < row.max_arquivos) near.push("Arquivos BC");
  if (row.max_mensagens != null && row.uso_mensagens >= row.max_mensagens * LIMIT_THRESHOLD && row.uso_mensagens < row.max_mensagens) near.push("Mensagens");

  if (alerts.length === 0 && near.length === 0) {
    return <CheckCircle2 className="h-4 w-4 text-green-600" aria-label="Dentro dos limites" />;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {alerts.map((a) => (
        <Badge key={a} variant="destructive" className="text-xs">
          <AlertTriangle className="h-3 w-3 mr-0.5" /> {a}
        </Badge>
      ))}
      {near.map((n) => (
        <Badge key={n} variant="secondary" className="text-xs text-amber-700 border-amber-500/50">
          {n} próximo
        </Badge>
      ))}
    </div>
  );
}

export default function Relatorios() {
  const [selectedOrg, setSelectedOrg] = useState<string>("all");
  const [page, setPage] = useState(1);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["super-admin-relatorios-uso"],
    queryFn: async (): Promise<OrgRow[]> => {
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
        supabase.from("documentos").select("id, metadados, titulo"),
      ]);

      if (eOrgs || ePlans) throw new Error(eOrgs?.message || ePlans?.message);
      if (eContatos) throw eContatos;
      if (ePerfis) throw ePerfis;
      if (eDocs) throw eDocs;

      const planMap = new Map(
        (plans || []).map((p: any) => [
          p.id_plano,
          {
            nome_plano: p.nome_plano,
            max_mensagens: p.max_mensagens_whatsapp_mes ?? null,
            max_usuarios: p.max_usuarios ?? null,
            max_contatos: p.max_contatos ?? null,
            max_arquivos: p.max_arquivos_conhecimento ?? null,
          },
        ])
      );

      const countByOrg = (arr: { id_organizacao?: string }[] | null) => {
        const m: Record<string, number> = {};
        (arr || []).forEach((r) => {
          const id = r.id_organizacao;
          if (id) m[id] = (m[id] || 0) + 1;
        });
        return m;
      };
      const contatosPorOrg = countByOrg(contatos);
      const perfisPorOrg = countByOrg(perfis);

      const filesByIdentificador: Record<string, Set<string>> = {};
      (documentos || []).forEach((d: any) => {
        const org = d.metadados?.organizacao;
        if (!org) return;
        if (!filesByIdentificador[org]) filesByIdentificador[org] = new Set();
        const fileKey = (d.titulo && d.titulo.trim()) || String(d.id ?? "");
        filesByIdentificador[org].add(fileKey);
      });
      const docsPorIdentificador: Record<string, number> = {};
      Object.entries(filesByIdentificador).forEach(([org, set]) => {
        docsPorIdentificador[org] = set.size;
      });

      const usoMensagensPorOrg = await fetchContagemMensagensPorOrg(
        supabase,
        (orgs || []).map((o: any) => ({ id: o.id, identificador: o.identificador ?? null })),
        { since: primeiroDiaDoMesAtual() }
      );

      return (orgs || []).map((org: any) => {
        const plan = org.plano_assinatura ? planMap.get(org.plano_assinatura) : null;
        return {
          id: org.id,
          nome: org.nome,
          identificador: org.identificador || "",
          plano_assinatura: org.plano_assinatura,
          nome_plano: plan?.nome_plano ?? "—",
          max_mensagens: plan?.max_mensagens ?? null,
          max_usuarios: plan?.max_usuarios ?? null,
          max_contatos: plan?.max_contatos ?? null,
          max_arquivos: plan?.max_arquivos ?? null,
          uso_mensagens: usoMensagensPorOrg[org.id] ?? 0,
          uso_usuarios: perfisPorOrg[org.id] || 0,
          uso_contatos: contatosPorOrg[org.id] || 0,
          uso_arquivos: docsPorIdentificador[org.identificador] || 0,
        };
      });
    },
  });

  const filteredRows = useMemo(() => {
    if (selectedOrg === "all") return rows;
    return rows.filter((r) => r.id === selectedOrg);
  }, [rows, selectedOrg]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedRows = filteredRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="page-header">
          <h1>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/10">
              <BarChart3 className="h-4 w-4 text-teal-500" />
            </div>
            Relatórios de Consumo
          </h1>
          <p>Uso atual vs. limites do plano. Alertas quando próximo ou no limite.</p>
        </div>
        <div className="flex items-center gap-1.5 min-w-0 shrink-0">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          <Select value={selectedOrg} onValueChange={handleOrgChange}>
            <SelectTrigger className="h-9 text-xs w-[200px]">
              <SelectValue placeholder="Todas as empresas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as empresas</SelectItem>
              {rows.map((o) => (
                <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Uso por empresa</CardTitle>
          <CardDescription>
            Mensagens contadas das tabelas dinâmicas de conversas (mês atual). Demais limites em tempo real.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold">Empresa</TableHead>
                <TableHead className="font-semibold">Plano</TableHead>
                <TableHead className="font-semibold">Mensagens</TableHead>
                <TableHead className="font-semibold">Usuários</TableHead>
                <TableHead className="font-semibold">Clientes</TableHead>
                <TableHead className="font-semibold">Arquivos (BC)</TableHead>
                <TableHead className="font-semibold text-right">Alertas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    Nenhuma empresa encontrada.
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
                      <UsageCell current={row.uso_mensagens} max={row.max_mensagens} label="Mensagens WhatsApp/mês" />
                    </TableCell>
                    <TableCell>
                      <UsageCell current={row.uso_usuarios} max={row.max_usuarios} label="Usuários" />
                    </TableCell>
                    <TableCell>
                      <UsageCell current={row.uso_contatos} max={row.max_contatos} label="Clientes" />
                    </TableCell>
                    <TableCell>
                      <UsageCell current={row.uso_arquivos} max={row.max_arquivos} label="Arquivos na base de conhecimento" />
                    </TableCell>
                    <TableCell className="text-right">
                      <AlertBadges row={row} />
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
                {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filteredRows.length)} de {filteredRows.length}
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
