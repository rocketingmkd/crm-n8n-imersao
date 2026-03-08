import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface HistoricoContatoRow {
  id: string;
  id_contato: string;
  id_organizacao: string;
  criado_em: string;
  criado_por: string | null;
  conteudo: string;
}

export function useHistoricoContato(idContato: string | null) {
  return useQuery({
    queryKey: ['historico-contato', idContato],
    queryFn: async () => {
      if (!idContato) return [];
      const { data, error } = await supabase
        .from('historico_contatos')
        .select('*')
        .eq('id_contato', idContato)
        .order('criado_em', { ascending: false });

      if (error) throw error;
      return data as HistoricoContatoRow[];
    },
    enabled: !!idContato,
  });
}

export function useAdicionarHistoricoContato() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id_contato: string;
      id_organizacao: string;
      conteudo: string;
      criado_por?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('historico_contatos')
        .insert({
          id_contato: params.id_contato,
          id_organizacao: params.id_organizacao,
          conteudo: params.conteudo.trim(),
          criado_por: params.criado_por ?? null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as HistoricoContatoRow;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['historico-contato', variables.id_contato] });
    },
  });
}
