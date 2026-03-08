import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { fetchInteracoesPorSessao } from "@/lib/conversas";
import { useAuth } from "./useAuth";

/** Extrai apenas dígitos para normalização de telefone/session_id */
function extrairDigitos(s: string | null | undefined): string {
  if (!s) return "";
  return s.replace(/\D/g, "");
}

/**
 * Gera chaves de busca para um contato (telefone e id_sessao em vários formatos).
 * session_id no WhatsApp costuma ser 5511999999999 (55 + DDD + número).
 */
function chavesParaContato(telefone: string | null | undefined, idSessao: string | null | undefined): string[] {
  const keys: string[] = [];
  const telDig = extrairDigitos(telefone);
  const sessDig = extrairDigitos(idSessao);
  if (telDig) {
    keys.push(telDig);
    if (telDig.length === 10 || telDig.length === 11) keys.push("55" + telDig);
  }
  if (idSessao) keys.push(idSessao);
  if (sessDig) keys.push(sessDig);
  return keys;
}

export interface InteracaoStats {
  total_interacoes: number;
  total_conversas: number;
  ultima_interacao: string | null;
  ultima_mensagem: string | null;
}

/**
 * Hook que busca interações reais da tabela de conversas e permite
 * obter total_interacoes e ultima_interacao por contato (via telefone/id_sessao).
 * Sobrescreve os valores do banco (contatos.total_interacoes) que podem estar desatualizados.
 */
export function useInteracoesPorContato() {
  const { organization } = useAuth();
  const identificador = organization?.identificador ?? null;

  const { data: mapaInteracoes = {}, isLoading } = useQuery({
    queryKey: ["interacoes-por-sessao", identificador],
    queryFn: () => fetchInteracoesPorSessao(supabase, identificador!),
    enabled: !!identificador,
    staleTime: 30000,
  });

  const getStats = (contact: { telefone?: string | null; id_sessao?: string | null }): InteracaoStats => {
    const keys = chavesParaContato(contact.telefone, contact.id_sessao);
    for (const k of keys) {
      const stats = mapaInteracoes[k];
      if (stats) return stats;
    }
    return { total_interacoes: 0, total_conversas: 0, ultima_interacao: null, ultima_mensagem: null };
  };

  const totalGeral = Object.values(mapaInteracoes).reduce((s, v) => s + v.total_interacoes, 0);

  return { getStats, totalGeral, mapaInteracoes, isLoading };
}
