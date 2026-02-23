import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Converte o identificador da organização no nome da tabela de conversas
 * gerada pelo n8n: {identificador}_conversas (hífens viram underscores,
 * e remove sufixo numérico tipo timestamp se existir).
 */
export function identificadorParaTabela(identificador: string): string {
  const parts = identificador.split("-");
  if (parts.length > 1) {
    const lastPart = parts[parts.length - 1];
    if (/^\d{10,}$/.test(lastPart)) {
      parts.pop();
    }
  }
  return parts.join("_") + "_conversas";
}

export interface OrgParaContagem {
  id: string;
  identificador: string | null;
}

/**
 * Conta mensagens por organização a partir das tabelas dinâmicas
 * {identificador}_conversas no Supabase (criadas pelo n8n).
 * Retorna um mapa id_organizacao -> quantidade.
 * Se since for passado, considera apenas registros com data >= since (coluna "data").
 */
export async function fetchContagemMensagensPorOrg(
  client: SupabaseClient,
  orgs: OrgParaContagem[],
  options?: { since?: Date }
): Promise<Record<string, number>> {
  const result: Record<string, number> = {};
  const sinceISO = options?.since?.toISOString();

  await Promise.all(
    orgs.map(async (org) => {
      if (!org.identificador?.trim()) {
        result[org.id] = 0;
        return;
      }
      const tableName = identificadorParaTabela(org.identificador.trim());
      try {
        let query = (client as any).from(tableName).select("id", { count: "exact", head: true });
        if (sinceISO) {
          query = query.gte("data", sinceISO);
        }
        const { count, error } = await query;
        if (error) {
          if (error.code === "42P01" || error.message?.includes("does not exist")) {
            result[org.id] = 0;
            return;
          }
          console.warn(`[conversas] Erro ao contar mensagens em ${tableName}:`, error);
          result[org.id] = 0;
          return;
        }
        result[org.id] = count ?? 0;
      } catch (e) {
        console.warn(`[conversas] Exceção ao contar em ${tableName}:`, e);
        result[org.id] = 0;
      }
    })
  );

  return result;
}

/**
 * Retorna o primeiro dia do mês atual em ISO (00:00:00).
 */
export function primeiroDiaDoMesAtual(): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}
