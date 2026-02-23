import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

type Contato = Database['public']['Tables']['contatos']['Row'];
type ContatoInsert = Database['public']['Tables']['contatos']['Insert'];
type ContatoUpdate = Database['public']['Tables']['contatos']['Update'];

export function useContatos() {
  return useQuery({
    queryKey: ['contatos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contatos')
        .select('*')
        .order('criado_em', { ascending: false, nullsFirst: false });

      if (error) throw error;
      return data as Contato[];
    },
  });
}

export function useContato(id: string) {
  return useQuery({
    queryKey: ['contatos', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contatos')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Contato;
    },
    enabled: !!id,
  });
}

export function useCriarContato() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contato: ContatoInsert) => {
      const { data, error } = await supabase
        .from('contatos')
        .insert(contato)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contatos'] });
    },
  });
}

export function useAtualizarContato() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...update }: ContatoUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('contatos')
        .update(update)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contatos'] });
    },
  });
}

export function useExcluirContato() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('contatos')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contatos'] });
    },
  });
}

// Aliases de compatibilidade para migração gradual
export const useContacts = useContatos;
export const useContact = useContato;
export const useCreateContact = useCriarContato;
export const useUpdateContact = useAtualizarContato;
export const useDeleteContact = useExcluirContato;
