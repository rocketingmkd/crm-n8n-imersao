import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// Legacy hook — tabela "patients" pode não existir no schema gerado.
// Usa tipagem manual para compatibilidade.

export function usePatients() {
  return useQuery({
    queryKey: ['patients'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('patients')
        .select('*')
        .order('created_at', { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data as any[];
    },
  });
}

export function usePatient(id: string) {
  return useQuery({
    queryKey: ['patients', id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('patients')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!id,
  });
}

export function useCreatePatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (patient: any) => {
      const { data, error } = await (supabase as any)
        .from('patients')
        .insert(patient)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });
}

export function useUpdatePatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...update }: any) => {
      const { data, error } = await (supabase as any)
        .from('patients')
        .update(update)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });
}

export function useDeletePatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('patients')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });
}
