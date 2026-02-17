import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/integrations/supabase/types';

type Appointment = Database['public']['Tables']['appointments']['Row'];
type AppointmentInsert = Database['public']['Tables']['appointments']['Insert'];
type AppointmentUpdate = Database['public']['Tables']['appointments']['Update'];

export function useAppointments(date?: Date) {
  return useQuery({
    queryKey: ['appointments', date?.toISOString()],
    queryFn: async () => {
      let query = supabase
        .from('appointments')
        .select('*')
        .order('date', { ascending: true })
        .order('time', { ascending: true });

      if (date) {
        const dateStr = date.toISOString().split('T')[0];
        query = query.eq('date', dateStr);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Appointment[];
    },
  });
}

export function useAppointmentsByDateRange(startDate: Date, endDate: Date) {
  return useQuery({
    queryKey: ['appointments', 'range', startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      const startStr = startDate.toISOString().split('T')[0];
      const endStr = endDate.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .gte('date', startStr)
        .lte('date', endStr)
        .order('date', { ascending: true })
        .order('time', { ascending: true });

      if (error) throw error;
      return data as Appointment[];
    },
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (appointment: AppointmentInsert) => {
      console.log('📝 Dados enviados para Supabase:', appointment);
      
      const { data, error } = await supabase
        .from('appointments')
        .insert(appointment)
        .select()
        .single();

      if (error) throw error;
      
      console.log('💾 Dados gravados no Supabase:', data);
      console.log('🔍 Verificar timezone:', {
        enviado_start: appointment.start_datetime,
        gravado_start: data.start_datetime,
        enviado_end: appointment.end_datetime,
        gravado_end: data.end_datetime
      });
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}

export function useUpdateAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...update }: AppointmentUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('appointments')
        .update(update)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}

export function useDeleteAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}

