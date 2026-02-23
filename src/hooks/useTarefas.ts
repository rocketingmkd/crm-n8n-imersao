import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export interface Tarefa {
  id: string;
  id_organizacao: string;
  id_usuario: string;
  titulo: string;
  descricao: string | null;
  status: 'a_fazer' | 'fazendo' | 'feito';
  data_finalizacao: string | null;
  notificar: boolean;
  antecedencia_minutos: number | null;
  criado_em: string;
  atualizado_em: string;
}

export type CriarTarefaInput = {
  titulo: string;
  descricao?: string | null;
  status?: 'a_fazer' | 'fazendo' | 'feito';
  data_finalizacao?: string | null;
  notificar?: boolean;
  antecedencia_minutos?: number | null;
};

const QUERY_KEY = 'anotacoes-tarefas';

export function useTarefas() {
  const { profile } = useAuth();
  const orgId = profile?.id_organizacao;

  return useQuery<Tarefa[]>({
    queryKey: [QUERY_KEY, orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await (supabase as any)
        .from('anotacoes_tarefas')
        .select('*')
        .eq('id_organizacao', orgId)
        .order('criado_em', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
  });
}

export function useCriarTarefa() {
  const qc = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (input: CriarTarefaInput) => {
      if (!profile?.id_organizacao || !profile?.id) throw new Error('Sem organização');
      const { data, error } = await (supabase as any)
        .from('anotacoes_tarefas')
        .insert({
          id_organizacao: profile.id_organizacao,
          id_usuario: profile.id,
          titulo: input.titulo,
          descricao: input.descricao ?? null,
          status: input.status ?? 'a_fazer',
          data_finalizacao: input.data_finalizacao ?? null,
          notificar: input.notificar ?? false,
          antecedencia_minutos: input.antecedencia_minutos ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}

export function useAtualizarTarefa() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Tarefa> & { id: string }) => {
      const { data, error } = await (supabase as any)
        .from('anotacoes_tarefas')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}

export function useDeletarTarefa() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('anotacoes_tarefas')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}
