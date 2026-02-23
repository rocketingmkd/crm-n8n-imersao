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
import { BarChart3, AlertTriangle, CheckCircle2 } from "lucide-react";
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

function UsageCell({
  current,
  max,
  label,
}: {
  current: number;
  max: number | null;
  label: string;
}) {
  if (max == null) {
    return <span className="text-muted-foreground">{current} / ∞</span>;
  }
  const pct = max > 0 ? current / max : 0;
  const atLimit = current >= max;
  const nearLimit = pct >= LIMIT_THRESHOLD && !atLimit;
  return (
    <span
      className={cn(
        atLimit && "text-destructive font-medium",
        nearLimit && "text-amber-600 font-medium"
      )}
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
    return <CheckCircle2 className="h-4 w-4 text-green-600" title="Dentro dos limites" />;
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
        supabase.from("documentos").select("metadados"),
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

      const countByOrg = (arr: { id_organizacao?: string }[] | null, key: "id_organizacao" = "id_organizacao") => {
        const m: Record<string, number> = {};
        (arr || []).forEach((r) => {
          const id = r[key];
          if (id) m[id] = (m[id] || 0) + 1;
        });
        return m;
      };
      const contatosPorOrg = countByOrg(contatos);
      const perfisPorOrg = countByOrg(perfis);

      const docsPorIdentificador: Record<string, number> = {};
      (documentos || []).forEach((d: { metadados?: { organizacao?: string } }) => {
        const id = d.metadados?.organizacao;
        if (id) docsPorIdentificador[id] = (docsPorIdentificador[id] || 0) + 1;
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <BarChart3 className="h-7 w-7 text-primary" />
          Relatórios por empresa
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Uso atual vs. limites do plano para cada empresa. Indicação quando está próximo ou no limite.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Uso por empresa</CardTitle>
          <CardDescription>
            Mensagens: contagem sob demanda (ex.: integração n8n). Demais limites conferidos em tempo real.
          </CardDescription>
        </CardHeader>
        <CardContent>
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
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    Nenhuma empresa cadastrada.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.nome}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {row.nome_plano}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <UsageCell
                        current={row.uso_mensagens}
                        max={row.max_mensagens}
                        label="Mensagens WhatsApp/mês"
                      />
                    </TableCell>
                    <TableCell>
                      <UsageCell
                        current={row.uso_usuarios}
                        max={row.max_usuarios}
                        label="Usuários"
                      />
                    </TableCell>
                    <TableCell>
                      <UsageCell
                        current={row.uso_contatos}
                        max={row.max_contatos}
                        label="Clientes"
                      />
                    </TableCell>
                    <TableCell>
                      <UsageCell
                        current={row.uso_arquivos}
                        max={row.max_arquivos}
                        label="Arquivos na base de conhecimento"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <AlertBadges row={row} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
