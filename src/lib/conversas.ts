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

/** Base name para tabela (identificador sem sufixo numérico, hífens → underscores). */
function getBaseName(identificador: string): string {
  const parts = identificador.trim().split("-");
  if (parts.length > 1 && /^\d{10,}$/.test(parts[parts.length - 1])) parts.pop();
  return parts.join("_").toLowerCase();
}

/**
 * Descobre o nome da tabela de conversas (_conversas ou _chats) que existe no banco.
 * Padrão n8n: identificador com hífens vira underscores (ex.: clinica-flowgrammers → clinica_flowgrammers_conversas).
 * Tenta primeiro _conversas; se não existir, tenta _chats.
 */
export async function obterNomeTabelaConversas(
  client: SupabaseClient,
  identificador: string
): Promise<string | null> {
  if (!identificador?.trim()) return null;
  const base = getBaseName(identificador);
  const tablesToTry = [base + "_conversas", base + "_chats"];
  for (const tableName of tablesToTry) {
    const { error } = await (client as any).from(tableName).select("id").limit(1);
    if (!error) return tableName;
    if (error.code === "42P01" || error.message?.includes("does not exist")) continue;
  }
  return null;
}

/**
 * Extrai o texto exibível de um objeto message (JSONB).
 * Suporta content/text/body como string ou objeto com .text.
 */
export function extrairTextoMessage(message: unknown): string {
  if (message == null) return "";
  const m = message as Record<string, unknown>;
  const text = m.content ?? m.text ?? m.body;
  if (typeof text === "string") return text;
  if (typeof text === "object" && text !== null && "text" in (text as object))
    return String((text as Record<string, unknown>).text ?? "");
  return "";
}

/**
 * Indica se a mensagem é do usuário (direita) ou agente/sistema (esquerda).
 * Metadados n8n/LangChain: type "human" = usuário, "ai" = assistente, "tool" = chamada de ferramenta.
 */
export function isMessageFromUser(message: unknown): boolean {
  if (message == null) return false;
  const m = message as Record<string, unknown>;
  const type = m.type as string | undefined;
  const role = (m.role ?? m.from) as string | undefined;
  if (type === "human") return true;
  if (role === "user") return true;
  return false;
}

export type MessageDisplayKind = "user" | "assistant" | "tool";

export interface MessageDisplayInfo {
  kind: MessageDisplayKind;
  text: string;
  toolName?: string;
}

/**
 * Interpreta o JSONB da mensagem para exibição: usuário, assistente ou tool call.
 * Tool calls mostram nome amigável em vez do JSON bruto.
 */
export function getMessageDisplayInfo(message: unknown): MessageDisplayInfo {
  if (message == null)
    return { kind: "assistant", text: "" };
  const m = message as Record<string, unknown>;
  const type = (m.type as string) ?? "";
  const role = (m.role ?? m.from) as string | undefined;
  const name = (m.name as string) ?? "";
  const content = m.content ?? m.text ?? m.body;

  // Tool call: type "tool" ou nome que contém "Tool"
  const isTool =
    type === "tool" ||
    (typeof name === "string" && /tool|Tool/i.test(name)) ||
    (typeof content === "string" && /Calling Tool|tool.*input/i.test(content));
  if (isTool) {
    let toolName = name;
    if (typeof content === "string" && /Calling Tool\s*[-–]\s*([^\s]+)/i.test(content))
      toolName = content.replace(/Calling Tool\s*[-–]\s*([^\s]+).*/i, "$1").trim();
    if (!toolName && typeof content === "string") {
      try {
        const parsed = JSON.parse(content) as Record<string, unknown>;
        toolName = (parsed.name as string) ?? (parsed.tool as string) ?? "Ferramenta";
      } catch {
        toolName = "Ferramenta";
      }
    }
    const friendly = toolName ? formatarNomeFerramenta(toolName) : "Ferramenta";
    return { kind: "tool", text: `Ferramenta: ${friendly}`, toolName: friendly };
  }

  const text = (() => {
    if (typeof content === "string") return content;
    if (typeof content === "object" && content !== null && "text" in (content as object))
      return String((content as Record<string, unknown>).text ?? "");
    return "";
  })();

  // Remove prefixo redundante "Mensagem do Cliente:" se existir
  const cleaned = text.replace(/^Mensagem do Cliente:\s*/i, "").trim();

  if (type === "human" || role === "user")
    return { kind: "user", text: cleaned || text };
  return { kind: "assistant", text: cleaned || text };
}

function formatarNomeFerramenta(name: string): string {
  return name
    .replace(/^Tool[-_\s]+/i, "")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim() || "Ferramenta";
}

export interface SessaoResumida {
  session_id: string;
  lastMessageAt: string;
  lastMessagePreview: string;
  messageCount: number;
}

export interface FetchSessoesResult {
  sessoes: SessaoResumida[];
  tableName: string | null;
  error?: string;
}

/**
 * Lista sessões (conversas) da organização a partir da tabela dinâmica.
 * Estrutura padrão: id, data (timestamp), message (jsonb), session_id (ou id_sessao). Apenas coluna "data".
 */
export async function fetchSessoes(
  client: SupabaseClient,
  identificador: string
): Promise<FetchSessoesResult> {
  const tableName = await obterNomeTabelaConversas(client, identificador);
  if (!tableName) {
    const base = getBaseName(identificador);
    return {
      sessoes: [],
      tableName: null,
      error: `Nenhuma tabela de conversas encontrada. O app procura por "${base}_conversas" ou "${base}_chats". Confira se o identificador da organização está igual ao nome da tabela (ex.: identificador "clinica-flowmgrammers" → tabela clinica_flowmgrammers_conversas). Identificador atual: ${identificador}.`,
    };
  }

  try {
    type Row = { id?: string; message?: unknown; data?: string; session_id?: string; id_sessao?: string };
    let rows: Row[] | null = null;
    let lastError: string | null = null;

    // Tentativa 1: estrutura padrão (id, data, message, session_id)
    const { data: data1, error: err1 } = await (client as any)
      .from(tableName)
      .select("id, message, data, session_id")
      .order("data", { ascending: false });
    if (!err1 && data1 != null) {
      rows = data1;
    } else if (err1) {
      lastError = err1.message || String(err1.code || err1);
    }

    // Tentativa 2: tabela com id_sessao em vez de session_id
    if (rows == null && (err1?.code === "42703" || (err1?.message && /column|does not exist/i.test(err1.message)))) {
      const { data: data2, error: err2 } = await (client as any)
        .from(tableName)
        .select("id, message, data, id_sessao")
        .order("data", { ascending: false });
      if (!err2 && data2 != null) {
        rows = data2.map((r: { id_sessao?: string }) => ({ ...r, session_id: r.id_sessao }));
      } else if (err2) lastError = err2.message || String(err2.code || err2);
    }

    if (rows == null) {
      return {
        sessoes: [],
        tableName,
        error: lastError || "Erro ao ler a tabela de conversas.",
      };
    }
    return { sessoes: agruparSessoes(rows), tableName };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { sessoes: [], tableName, error: msg };
  }
}

function agruparSessoes(
  rows: Array<{ id?: string; message?: unknown; data?: string; session_id?: string; id_sessao?: string }>
): SessaoResumida[] {
  const bySession: Record<
    string,
    { lastMessageAt: string; lastMessagePreview: string; messageCount: number }
  > = {};
  for (const row of rows) {
    const sid = row.session_id ?? row.id_sessao ?? "";
    if (!sid) continue;
    const data = row.data ?? "";
    const preview = getMessageDisplayInfo(row.message).text || extrairTextoMessage(row.message);
    if (!bySession[sid]) {
      bySession[sid] = { lastMessageAt: data, lastMessagePreview: preview, messageCount: 0 };
    }
    bySession[sid].messageCount++;
    if (data > bySession[sid].lastMessageAt) {
      bySession[sid].lastMessageAt = data;
      bySession[sid].lastMessagePreview = preview;
    }
  }
  return Object.entries(bySession)
    .map(([session_id, v]) => ({
      session_id,
      lastMessageAt: v.lastMessageAt,
      lastMessagePreview: v.lastMessagePreview,
      messageCount: v.messageCount,
    }))
    .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
}

export interface MensagemRow {
  id: string;
  message: Record<string, unknown>;
  data: string;
  session_id: string;
}

/**
 * Busca todas as mensagens de uma sessão, ordenadas por data ascendente.
 */
export async function fetchMensagensSessao(
  client: SupabaseClient,
  identificador: string,
  sessionId: string
): Promise<MensagemRow[]> {
  const tableName = await obterNomeTabelaConversas(client, identificador);
  if (!tableName || !sessionId) return [];

  try {
    type Row = { id: string; message?: unknown; data?: string; id_sessao?: string; session_id?: string };
    let list: Row[] = [];

    // Estrutura padrão: id, data, message, session_id (apenas coluna "data")
    const { data: data1, error: err1 } = await (client as any)
      .from(tableName)
      .select("id, message, data, session_id")
      .order("data", { ascending: true });
    if (!err1 && data1 != null) {
      list = data1.filter((r: { session_id?: string }) => (r.session_id ?? "") === sessionId);
    }
    // Fallback: tabela com id_sessao em vez de session_id
    if (list.length === 0 && (err1?.code === "42703" || (err1?.message && /column/i.test(err1.message)))) {
      const { data: data2, error: err2 } = await (client as any)
        .from(tableName)
        .select("id, message, data, id_sessao")
        .order("data", { ascending: true });
      if (!err2 && data2 != null) {
        list = data2
          .filter((r: { id_sessao?: string }) => (r.id_sessao ?? "") === sessionId)
          .map((r: { id_sessao?: string }) => ({ ...r, session_id: r.id_sessao }));
      }
    }
    return list.map((r) => ({
      id: r.id,
      message: (typeof r.message === "object" && r.message !== null ? r.message : {}) as Record<string, unknown>,
      data: r.data ?? "",
      session_id: r.session_id ?? r.id_sessao ?? sessionId,
    }));
  } catch {
    return [];
  }
}

/** Extrai apenas dígitos de uma string (telefone, session_id, etc.). */
function extrairDigitos(s: string): string {
  return (s || "").replace(/\D/g, "");
}

export interface StatsPorSessao {
  total_interacoes: number;
  total_conversas: number;
  ultima_interacao: string | null;
  ultima_mensagem: string | null;
}

/**
 * Busca interações (contagem, última data e última mensagem) por sessão na tabela de conversas.
 * total_conversas = 1 quando há mensagens (uma sessão = uma conversa), 0 caso contrário.
 * ultima_mensagem = texto da última mensagem trocada com o cliente.
 */
export async function fetchInteracoesPorSessao(
  client: SupabaseClient,
  identificador: string
): Promise<Record<string, StatsPorSessao>> {
  const tableName = await obterNomeTabelaConversas(client, identificador);
  if (!tableName) return {};

  try {
    type Row = { data?: string; message?: unknown; session_id?: string; id_sessao?: string };
    let rows: Row[] = [];

    const { data: data1, error: err1 } = await (client as any)
      .from(tableName)
      .select("data, message, session_id")
      .order("data", { ascending: true });
    if (!err1 && data1?.length) {
      rows = data1;
    } else if (err1?.code === "42703" || (err1?.message && /column/i.test(err1.message || ""))) {
      const { data: data2, error: err2 } = await (client as any)
        .from(tableName)
        .select("data, message, id_sessao")
        .order("data", { ascending: true });
      if (!err2 && data2?.length) {
        rows = data2.map((r: { id_sessao?: string }) => ({ ...r, session_id: r.id_sessao }));
      }
    }

    const bySession: Record<string, { count: number; last: string; lastMessage: string }> = {};
    for (const r of rows) {
      const sid = (r.session_id ?? r.id_sessao ?? "").trim();
      if (!sid) continue;
      const key = extrairDigitos(sid) || sid;
      if (!bySession[key]) bySession[key] = { count: 0, last: "", lastMessage: "" };
      bySession[key].count++;
      const d = r.data ?? "";
      if (d > bySession[key].last) {
        bySession[key].last = d;
        bySession[key].lastMessage = extrairTextoMessage(r.message) || getMessageDisplayInfo(r.message).text || "";
      }
    }
    const result: Record<string, StatsPorSessao> = {};
    for (const [key, v] of Object.entries(bySession)) {
      result[key] = {
        total_interacoes: v.count,
        total_conversas: v.count > 0 ? 1 : 0,
        ultima_interacao: v.last || null,
        ultima_mensagem: v.lastMessage?.trim() || null,
      };
    }
    return result;
  } catch {
    return {};
  }
}

/**
 * Obtém chaves de busca para um contato (telefone, id_sessao) para matching com o mapa de interações.
 */
export function chavesContatoParaInteracao(telefone: string | null, idSessao: string | null): string[] {
  const keys: string[] = [];
  const telDig = extrairDigitos(telefone || "");
  if (telDig) {
    keys.push(telDig);
    if (telDig.length <= 11) keys.push("55" + telDig);
  }
  const idDig = extrairDigitos(idSessao || "");
  if (idDig) keys.push(idDig);
  if (idSessao?.trim()) keys.push(idSessao.trim());
  return keys;
}

/**
 * Insere uma mensagem enviada pelo atendente humano na tabela de conversas.
 * Formato: type "ai" / role "assistant" para exibir no lado do bot (esquerda), como resposta do atendente.
 */
export async function inserirMensagemHumano(
  client: SupabaseClient,
  identificador: string,
  sessionId: string,
  texto: string
): Promise<{ error?: string }> {
  const tableName = await obterNomeTabelaConversas(client, identificador);
  if (!tableName || !sessionId || !texto?.trim()) {
    return { error: "Tabela ou sessão não encontrada" };
  }
  const dataIso = new Date().toISOString();
  const message = { type: "ai", role: "assistant", content: texto.trim(), enviado_por_humano: true };
  const { error } = await (client as any)
    .from(tableName)
    .insert({ message, data: dataIso, session_id: sessionId });
  if (error) {
    if (error.code === "42703" && /session_id|column/i.test(error.message || "")) {
      const { error: err2 } = await (client as any)
        .from(tableName)
        .insert({ message, data: dataIso, id_sessao: sessionId });
      if (err2) return { error: err2.message || String(err2) };
    } else {
      return { error: error.message || String(error) };
    }
  }
  return {};
}
