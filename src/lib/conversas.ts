import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Converte o identificador da organização no nome da tabela de chat
 * gerada pelo n8n: {identificador}_chats (hífens viram underscores,
 * e remove sufixo numérico tipo timestamp se existir).
 * Os workflows n8n usam sufixo _chats (ex.: clinica_flowgrammers_chats).
 */
export function identificadorParaTabela(identificador: string): string {
  const parts = identificador.split("-");
  if (parts.length > 1) {
    const lastPart = parts[parts.length - 1];
    if (/^\d{10,}$/.test(lastPart)) {
      parts.pop();
    }
  }
  return (parts.join("_") + "_chats").toLowerCase();
}

export interface OrgParaContagem {
  id: string;
  identificador: string | null;
}

/**
 * Conta mensagens por organização a partir das tabelas dinâmicas
 * {identificador}_chats no Supabase (criadas pelo n8n). Tabela tem coluna "data" (timestamp).
 * Retorna um mapa id_organizacao -> quantidade.
 * Se since for passado, considera apenas registros com data >= since.
 * Tenta primeiro _chats; se tabela não existir, tenta _conversas (fallback).
 */
export async function fetchContagemMensagensPorOrg(
  client: SupabaseClient,
  orgs: OrgParaContagem[],
  options?: { since?: Date }
): Promise<Record<string, number>> {
  const result: Record<string, number> = {};
  const sinceStr = options?.since ? options.since.toISOString().slice(0, 10) : null;

  await Promise.all(
    orgs.map(async (org) => {
      if (!org.identificador?.trim()) {
        result[org.id] = 0;
        return;
      }
      const baseName = (() => {
        const parts = org.identificador.trim().split("-");
        if (parts.length > 1 && /^\d{10,}$/.test(parts[parts.length - 1])) parts.pop();
        return parts.join("_").toLowerCase();
      })();
      const tablesToTry = [baseName + "_chats", baseName + "_conversas"];

      for (const tableName of tablesToTry) {
        try {
          let query = (client as any).from(tableName).select("id", { count: "exact" }).limit(1);
          if (sinceStr) query = query.gte("data", sinceStr);
          const { count, error } = await query;
          if (error) {
            if (error.code === "42P01" || error.message?.includes("does not exist")) continue;
            if (sinceStr && (error.code === "42703" || (error.message && /column.*data|data.*column/i.test(error.message)))) {
              const res = await (client as any).from(tableName).select("id", { count: "exact" }).limit(1);
              result[org.id] = res.error ? 0 : Number(res.count ?? 0);
              return;
            }
            continue;
          }
          result[org.id] = count != null ? Number(count) : 0;
          return;
        } catch (_e) {
          continue;
        }
      }
      result[org.id] = 0;
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
