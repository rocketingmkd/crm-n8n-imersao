// Arquivo legado — redireciona para useAgendamentos.ts
export {
  useAgendamentos as useAppointments,
  useAgendamentosPorPeriodo,
  useAgendamentosPorPeriodo as useAppointmentsByDateRange,
  useCriarAgendamento as useCreateAppointment,
  useAtualizarAgendamento as useUpdateAppointment,
  useExcluirAgendamento as useDeleteAppointment,
} from './useAgendamentos';
