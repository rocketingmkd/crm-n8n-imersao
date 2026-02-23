import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useOrganization } from "@/hooks/useOrganization";

export interface TipoAtendimento {
  id: string;
  id_organizacao: string;
  nome: string;
  ativo: boolean;
  ordem: number;
  criado_em: string;
  atualizado_em: string;
}

const QUERY_KEY = ["tipos-atendimento"] as const;

export function useTiposAtendimento() {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: [...QUERY_KEY, organizationId ?? ""],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await (supabase as any)
        .from("tipos_atendimento")
        .select("*")
        .eq("id_organizacao", organizationId)
        .order("ordem", { ascending: true })
        .order("nome", { ascending: true });
      if (error) throw error;
      return (data ?? []) as TipoAtendimento[];
    },
    enabled: !!organizationId,
  });
}

export function useCriarTipoAtendimento() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async (payload: { nome: string; ativo?: boolean; ordem?: number }) => {
      if (!organizationId) throw new Error("Organização não definida");
      const { data, error } = await (supabase as any)
        .from("tipos_atendimento")
        .insert({
          id_organizacao: organizationId,
          nome: payload.nome.trim(),
          ativo: payload.ativo ?? true,
          ordem: payload.ordem ?? 0,
        })
        .select()
        .single();
      if (error) throw error;
      return data as TipoAtendimento;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useAtualizarTipoAtendimento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      nome,
      ativo,
      ordem,
    }: {
      id: string;
      nome?: string;
      ativo?: boolean;
      ordem?: number;
    }) => {
      const update: Record<string, unknown> = {};
      if (nome !== undefined) update.nome = nome.trim();
      if (ativo !== undefined) update.ativo = ativo;
      if (ordem !== undefined) update.ordem = ordem;
      const { data, error } = await (supabase as any)
        .from("tipos_atendimento")
        .update(update)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as TipoAtendimento;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useExcluirTipoAtendimento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("tipos_atendimento").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
