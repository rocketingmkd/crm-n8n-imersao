import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

type Agendamento = Database['public']['Tables']['agendamentos']['Row'];
type AgendamentoInsert = Database['public']['Tables']['agendamentos']['Insert'];
type AgendamentoUpdate = Database['public']['Tables']['agendamentos']['Update'];

export function useAgendamentos(data?: Date) {
  return useQuery({
    queryKey: ['agendamentos', data?.toISOString()],
    queryFn: async () => {
      let query = supabase
        .from('agendamentos')
        .select('*')
        .order('data', { ascending: true })
        .order('hora', { ascending: true });

      if (data) {
        const dataStr = data.toISOString().split('T')[0];
        query = query.eq('data', dataStr);
      }

      const { data: resultado, error } = await query;

      if (error) throw error;
      return resultado as Agendamento[];
    },
  });
}

export function useAgendamentosPorPeriodo(dataInicio: Date, dataFim: Date) {
  return useQuery({
    queryKey: ['agendamentos', 'periodo', dataInicio.toISOString(), dataFim.toISOString()],
    queryFn: async () => {
      const inicioStr = dataInicio.toISOString().split('T')[0];
      const fimStr = dataFim.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('agendamentos')
        .select('*')
        .gte('data', inicioStr)
        .lte('data', fimStr)
        .order('data', { ascending: true })
        .order('hora', { ascending: true });

      if (error) throw error;
      return data as Agendamento[];
    },
  });
}

export function useCriarAgendamento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (agendamento: AgendamentoInsert) => {
      console.log('📝 Dados enviados para Supabase:', agendamento);

      const { data, error } = await supabase
        .from('agendamentos')
        .insert(agendamento)
        .select()
        .single();

      if (error) throw error;

      console.log('💾 Dados gravados no Supabase:', data);
      console.log('🔍 Verificar timezone:', {
        enviado_inicio: agendamento.inicio,
        gravado_inicio: data.inicio,
        enviado_fim: agendamento.fim,
        gravado_fim: data.fim
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] });
    },
  });
}

export function useAtualizarAgendamento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...update }: AgendamentoUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('agendamentos')
        .update(update)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] });
    },
  });
}

export function useExcluirAgendamento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('agendamentos')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] });
    },
  });
}

// Aliases de compatibilidade para migração gradual
export const useAppointments = useAgendamentos;
export const useAppointmentsByDateRange = useAgendamentosPorPeriodo;
export const useCreateAppointment = useCriarAgendamento;
export const useUpdateAppointment = useAtualizarAgendamento;
export const useDeleteAppointment = useExcluirAgendamento;
