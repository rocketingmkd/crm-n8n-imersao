import { Calendar, Users, Clock, TrendingUp, Activity, CheckCircle2, MessageSquare, MessagesSquare, UserCheck, ListTodo, BarChart3 } from "lucide-react";
import KPICard from "@/components/KPICard";
import { Card } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import DashboardTarefas from "@/components/DashboardTarefas";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAppointments, useCreateAppointment, useAgendamentosPorPeriodo } from "@/hooks/useAppointments";
import { useContacts, useCreateContact } from "@/hooks/useContacts";
import { useTiposAtendimento } from "@/hooks/useTiposAtendimento";
import { useEntityLabel } from "@/hooks/useEntityLabel";
import { useChatMetrics } from "@/hooks/useChatMetrics";
import { useTarefas } from "@/hooks/useTarefas";
import { usePlanFeatures } from "@/hooks/usePlanFeatures";
import { formatTime, isToday } from "@/lib/dateUtils";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useForm, Controller } from "react-hook-form";

interface AppointmentFormData {
  start_date: string;
  start_time: string;
  end_date: string;
  end_time: string;
  id_contato: string;
  type: string;
  observations: string;
}

interface PatientFormData {
  nome: string;
  email: string;
  telefone: string;
  situacao: 'ativo' | 'inativo';
  observacoes: string;
}

export default function Dashboard() {
  const { data: allAppointments = [], isLoading: loadingAppointments } = useAppointments();
  const { data: contacts = [], isLoading: loadingContacts } = useContacts();
  const { data: tiposAtendimento = [] } = useTiposAtendimento();
  const { data: chatMetrics, isLoading: loadingChats } = useChatMetrics();
  const { features } = usePlanFeatures();
  const { profile } = useAuth();
  const createAppointment = useCreateAppointment();
  const createContact = useCreateContact();
  const { singular, plural, s } = useEntityLabel();
  const { data: tarefas = [] } = useTarefas();

  // Verificar recursos do plano
  const hasAgendamento = features.agendamento_automatico;
  const hasBaseConhecimento = features.base_conhecimento;

  // Aba ativa (controlado para não sair do Analytics ao clicar nos filtros)
  const [activeTab, setActiveTab] = useState<string>('tarefas');

  // Analytics period filter
  type AnalyticsPeriod = 'today' | '7d' | '30d' | '90d';
  const [analyticsPeriod, setAnalyticsPeriod] = useState<AnalyticsPeriod>('7d');

  const today = new Date();
  const analyticsRange = (() => {
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const start = new Date(end);
    if (analyticsPeriod === 'today') start.setDate(end.getDate());
    else if (analyticsPeriod === '7d') start.setDate(end.getDate() - 7);
    else if (analyticsPeriod === '30d') start.setDate(end.getDate() - 30);
    else start.setDate(end.getDate() - 90);
    return { start, end };
  })();
  const { data: appointmentsInPeriod = [], isLoading: loadingAppointmentsPeriod } = useAgendamentosPorPeriodo(analyticsRange.start, analyticsRange.end);

  const periodLabel =
    analyticsPeriod === 'today' ? 'Hoje' :
    analyticsPeriod === '7d' ? 'Últimos 7 dias' :
    analyticsPeriod === '30d' ? 'Último mês' : 'Últimos 3 meses';

  const contatosConcluidosNoPeriodo = contacts.filter((c) => {
    if ((c as { status_kanban?: string }).status_kanban !== 'concluido') return false;
    const criado = (c as { criado_em?: string }).criado_em;
    if (!criado) return true;
    const d = new Date(criado);
    return d >= analyticsRange.start && d <= analyticsRange.end;
  }).length;
  // Contatos que "entraram" no Kanban no período (criados no período)
  const totalContatosNoPeriodoKanban = contacts.filter((c) => {
    const criado = (c as { criado_em?: string }).criado_em;
    if (!criado) return false;
    const d = new Date(criado);
    return d >= analyticsRange.start && d <= analyticsRange.end;
  }).length;
  // Taxa de confirmação pelo Kanban: concluídos / contatos que entraram no período
  const taxaConfirmacaoKanban = totalContatosNoPeriodoKanban > 0
    ? Math.round((contatosConcluidosNoPeriodo / totalContatosNoPeriodoKanban) * 100)
    : 0;

  const agendadosNoPeriodo = appointmentsInPeriod.length;
  const confirmadosNoPeriodo = appointmentsInPeriod.filter((a) => a.situacao === 'confirmado').length;

  // Modals state
  const [isTodayModalOpen, setIsTodayModalOpen] = useState(false);
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [isReportsModalOpen, setIsReportsModalOpen] = useState(false);

  // Forms
  const appointmentForm = useForm<AppointmentFormData>();

  const patientForm = useForm<PatientFormData>({
    defaultValues: {
      situacao: 'ativo',
    },
  });

  // Filtrar compromissos de hoje usando inicio
  const todayAppointments = allAppointments.filter(apt => {
    if (apt.inicio) {
      return isToday(apt.inicio);
    }
    return apt.data === today.toISOString().split('T')[0];
  });

  // Estatísticas
  const activeContacts = contacts.filter(c => c.situacao === 'ativo').length;
  const confirmedToday = todayAppointments.filter(apt => apt.situacao === 'confirmado').length;
  const totalInteractions = contacts.reduce((sum, c) => sum + (c.total_interacoes || 0), 0);

  // Submit handlers
  const onSubmitAppointment = async (data: AppointmentFormData) => {
    if (!profile?.id_organizacao) {
      toast.error('Erro: organização não identificada');
      return;
    }

    try {
      await createAppointment.mutateAsync({
        data: data.start_date,
        hora: data.start_time,
        inicio: `${data.start_date}T${data.start_time}:00-03:00`,
        fim: `${data.end_date}T${data.end_time}:00-03:00`,
        id_contato: data.id_contato,
        nome_contato: contacts.find(c => c.id === data.id_contato)?.nome || contacts.find(c => c.id === data.id_contato)?.telefone || '',
        tipo: data.type,
        situacao: 'pendente',
        observacoes: data.observations,
        id_organizacao: profile.id_organizacao,
      });

      toast.success('Compromisso criado com sucesso!');
      setIsAppointmentModalOpen(false);
      appointmentForm.reset();
    } catch (error: any) {
      console.error('Erro ao criar compromisso:', error);
      toast.error(error.message || 'Erro ao criar compromisso');
    }
  };

  const onSubmitPatient = async (data: PatientFormData) => {
    if (!profile?.id_organizacao) {
      toast.error('Erro: organização não identificada');
      return;
    }

    try {
      await createContact.mutateAsync({
        nome: data.nome,
        email: data.email,
        telefone: data.telefone,
        situacao: data.situacao,
        observacoes: data.observacoes || null,
        id_organizacao: profile.id_organizacao,
        total_interacoes: 0,
      });

      toast.success(`${singular} cadastrado com sucesso!`);
      setIsPatientModalOpen(false);
      patientForm.reset();
    } catch (error: any) {
      console.error('Erro ao criar contato:', error);
      toast.error(error.message || `Erro ao cadastrar ${s}`);
    }
  };

  const isLoading = loadingAppointments || loadingContacts || loadingChats || loadingAppointmentsPeriod;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8 p-4 md:p-6 lg:p-8">
      {/* Welcome Header */}
      <div className="animate-fade-in">
        <h1 className="font-display text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-foreground mb-2">
          Bem-vindo, {profile?.nome_completo || 'Usuário'}
        </h1>
        <p className="text-base md:text-lg text-muted-foreground">
          {hasAgendamento 
            ? 'Seu dia está organizado. Aqui está sua visão geral.'
            : 'Acompanhe suas métricas de atendimento em tempo real.'}
        </p>
      </div>

      {/* Quick Actions - MOVIDAS PARA O TOPO */}
      <div className="grid gap-4 sm:gap-5 md:gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-4 animate-fade-in-up">
        {hasAgendamento ? (
          <>
            <button 
              onClick={() => setIsTodayModalOpen(true)}
              className="card-luxury group p-5 md:p-6 text-left transition-all duration-300 hover:shadow-xl hover:scale-105 hover:border-primary/50 bg-gradient-to-br from-background to-primary/5"
            >
              <div className="mb-3 md:mb-4 flex h-11 w-11 md:h-12 md:w-12 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 group-hover:from-primary/30 group-hover:to-primary/20 transition-all duration-300 shadow-md">
                <Clock className="h-5 w-5 md:h-6 md:w-6 text-primary" />
              </div>
              <h3 className="mb-1.5 md:mb-2 font-semibold text-foreground group-hover:text-primary transition-colors">Hoje</h3>
              <p className="text-sm text-muted-foreground">Ver compromissos de hoje</p>
            </button>

            <button 
              onClick={() => setIsAppointmentModalOpen(true)}
              className="card-luxury group p-5 md:p-6 text-left transition-all duration-300 hover:shadow-xl hover:scale-105 hover:border-primary/50 bg-gradient-to-br from-background to-primary/5"
            >
              <div className="mb-3 md:mb-4 flex h-11 w-11 md:h-12 md:w-12 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 group-hover:from-primary/30 group-hover:to-primary/20 transition-all duration-300 shadow-md">
                <Calendar className="h-5 w-5 md:h-6 md:w-6 text-primary" />
              </div>
              <h3 className="mb-1.5 md:mb-2 font-semibold text-foreground group-hover:text-primary transition-colors">Novo Compromisso</h3>
              <p className="text-sm text-muted-foreground">Agende um novo atendimento</p>
            </button>
          </>
        ) : (
          <>
            <button 
              onClick={() => setIsReportsModalOpen(true)}
              className="card-luxury group p-5 md:p-6 text-left transition-all duration-300 hover:shadow-xl hover:scale-105 hover:border-primary/50 bg-gradient-to-br from-background to-primary/5"
            >
              <div className="mb-3 md:mb-4 flex h-11 w-11 md:h-12 md:w-12 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 group-hover:from-primary/30 group-hover:to-primary/20 transition-all duration-300 shadow-md">
                <MessageSquare className="h-5 w-5 md:h-6 md:w-6 text-primary" />
              </div>
              <h3 className="mb-1.5 md:mb-2 font-semibold text-foreground group-hover:text-primary transition-colors">Atendimentos</h3>
              <p className="text-sm text-muted-foreground">Ver métricas detalhadas</p>
            </button>

            <button 
              onClick={() => window.location.href = '/app/agent-ia'}
              className="card-luxury group p-5 md:p-6 text-left transition-all duration-300 hover:shadow-xl hover:scale-105 hover:border-primary/50 bg-gradient-to-br from-background to-primary/5"
            >
              <div className="mb-3 md:mb-4 flex h-11 w-11 md:h-12 md:w-12 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 group-hover:from-primary/30 group-hover:to-primary/20 transition-all duration-300 shadow-md">
                <Activity className="h-5 w-5 md:h-6 md:w-6 text-primary" />
              </div>
              <h3 className="mb-1.5 md:mb-2 font-semibold text-foreground group-hover:text-primary transition-colors">Configurar Assistente Virtual</h3>
              <p className="text-sm text-muted-foreground">Ajuste seu atendimento IA</p>
            </button>
          </>
        )}

        <button 
          onClick={() => setIsPatientModalOpen(true)}
          className="card-luxury group p-5 md:p-6 text-left transition-all duration-300 hover:shadow-xl hover:scale-105 hover:border-primary/50 bg-gradient-to-br from-background to-primary/5"
        >
          <div className="mb-3 md:mb-4 flex h-11 w-11 md:h-12 md:w-12 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 group-hover:from-primary/30 group-hover:to-primary/20 transition-all duration-300 shadow-md">
            <Users className="h-5 w-5 md:h-6 md:w-6 text-primary" />
          </div>
          <h3 className="mb-1.5 md:mb-2 font-semibold text-foreground group-hover:text-primary transition-colors">Adicionar Contato</h3>
          <p className="text-sm text-muted-foreground">Cadastre um novo contato</p>
        </button>

        <button 
          onClick={() => setIsReportsModalOpen(true)}
          className="card-luxury group p-5 md:p-6 text-left transition-all duration-300 hover:shadow-xl hover:scale-105 hover:border-primary/50 bg-gradient-to-br from-background to-primary/5"
        >
          <div className="mb-3 md:mb-4 flex h-11 w-11 md:h-12 md:w-12 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 group-hover:from-primary/30 group-hover:to-primary/20 transition-all duration-300 shadow-md">
            <TrendingUp className="h-5 w-5 md:h-6 md:w-6 text-primary" />
          </div>
          <h3 className="mb-1.5 md:mb-2 font-semibold text-foreground group-hover:text-primary transition-colors">Ver Relatórios</h3>
          <p className="text-sm text-muted-foreground">Analise suas métricas</p>
        </button>
      </div>

      {/* ═══ Tabbed Content ═══ */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="animate-fade-in-up">
        <TabsList className="w-full sm:w-auto h-10 liquid-glass-subtle p-1">
          <TabsTrigger value="tarefas" className="gap-2 text-sm px-4">
            <ListTodo className="h-4 w-4" />
            Minhas Tarefas
          </TabsTrigger>
          {hasAgendamento && (
            <TabsTrigger value="agenda" className="gap-2 text-sm px-4">
              <Calendar className="h-4 w-4" />
              Agenda do Dia
            </TabsTrigger>
          )}
          <TabsTrigger value="analytics" className="gap-2 text-sm px-4">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* ═══ Tab: Minhas Tarefas ═══ */}
        <TabsContent value="tarefas" className="mt-4">
          <DashboardTarefas />

        </TabsContent>

        {/* ═══ Tab: Agenda do Dia ═══ */}
        {hasAgendamento && (
          <TabsContent value="agenda" className="mt-4">
            <div className="liquid-glass p-4 md:p-6 lg:p-8">
              <div className="flex items-center justify-between mb-4 md:mb-6">
                <div>
                  <h2 className="font-display text-xl md:text-2xl font-semibold text-foreground mb-2 flex items-center gap-2">
                    <Calendar className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                    Agenda de Hoje
                  </h2>
                  <p className="text-sm md:text-base text-muted-foreground">
                    {new Date().toLocaleDateString("pt-BR", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.href = '/app/agenda'}
                  className="hidden sm:flex gap-2"
                >
                  Ver Agenda Completa
                </Button>
              </div>

              {todayAppointments.length === 0 ? (
                <div className="text-center py-12 bg-gradient-to-br from-primary/5 to-transparent rounded-lg border border-dashed border-primary/20">
                  <Calendar className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-lg font-medium text-foreground mb-2">Nenhum compromisso hoje</p>
                  <p className="text-sm text-muted-foreground mb-4">Aproveite para descansar ou planejar sua semana</p>
                  <Button
                    variant="outline"
                    onClick={() => setIsAppointmentModalOpen(true)}
                    className="gap-2"
                  >
                    <Calendar className="h-4 w-4" />
                    Agendar Compromisso
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 md:space-y-4">
                  {todayAppointments
                    .sort((a, b) => {
                      const timeA = a.inicio ? new Date(a.inicio).getTime() : (a as any).hora;
                      const timeB = b.inicio ? new Date(b.inicio).getTime() : (b as any).hora;
                      return timeA > timeB ? 1 : -1;
                    })
                    .map((appointment, index) => {
                      const displayTime = appointment.inicio 
                        ? formatTime(appointment.inicio)
                        : (appointment as any).hora;
                      const [hours, minutes] = displayTime.split(":");
                      
                      return (
                        <div
                          key={appointment.id}
                          onClick={() => window.location.href = '/app/agenda'}
                          className="group flex flex-col sm:flex-row sm:items-center gap-3 md:gap-4 liquid-glass-subtle p-4 md:p-5 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] cursor-pointer"
                          style={{ animationDelay: `${0.1 * index}s` }}
                        >
                          <div className="flex h-16 w-16 md:h-20 md:w-20 shrink-0 flex-col items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 group-hover:from-primary/30 group-hover:to-primary/20 transition-all duration-300">
                            <span className="text-xs font-medium text-primary">{hours}</span>
                            <span className="text-2xl md:text-3xl font-bold text-primary">{minutes}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-foreground truncate text-base md:text-lg mb-1">{appointment.nome_contato}</h4>
                            <p className="text-sm text-muted-foreground">{appointment.tipo}</p>
                            {appointment.observacoes && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{appointment.observacoes}</p>
                            )}
                          </div>
                          <div
                            className={`self-start sm:self-center rounded-full px-4 md:px-5 py-2 text-xs font-medium whitespace-nowrap transition-all duration-300 ${
                              appointment.situacao === "confirmado"
                                ? "bg-success/10 text-success border border-success/20"
                                : appointment.situacao === "pendente"
                                ? "bg-primary/10 text-primary border border-primary/20"
                                : "bg-muted text-muted-foreground border border-border"
                            }`}
                          >
                            {appointment.situacao === "confirmado" ? "Confirmado" : appointment.situacao === "pendente" ? "Pendente" : "Concluído"}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </TabsContent>
        )}

        {/* ═══ Tab: Analytics ═══ */}
        <TabsContent value="analytics" className="mt-4 space-y-6">
          {/* Period Filter - type="button" evita submit e mantém a aba Analytics */}
          <div className="flex items-center gap-2 flex-wrap">
            {([
              { value: 'today' as const, label: 'Hoje' },
              { value: '7d' as const, label: 'Últimos 7 dias' },
              { value: '30d' as const, label: 'Último mês' },
              { value: '90d' as const, label: 'Últimos 3 meses' },
            ]).map((opt) => (
              <Button
                key={opt.value}
                type="button"
                variant={analyticsPeriod === opt.value ? 'default' : 'outline'}
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setAnalyticsPeriod(opt.value);
                }}
                className="text-xs"
              >
                {opt.label}
              </Button>
            ))}
          </div>

          {/* KPI Grid - todos respeitam o filtro de período */}
          <div className="grid gap-4 sm:gap-5 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <div className="cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-xl"
              onClick={() => setIsReportsModalOpen(true)}>
              <KPICard
                title="Conversas"
                value={
                  analyticsPeriod === 'today' ? (chatMetrics?.conversationsToday ?? 0) :
                  analyticsPeriod === '7d' ? (chatMetrics?.conversationsThisWeek ?? 0) :
                  analyticsPeriod === '30d' ? (chatMetrics?.conversationsThisMonth ?? 0) :
                  (chatMetrics?.conversationsLast90d ?? 0)
                }
                change={
                  analyticsPeriod === 'today' ? `${chatMetrics?.messagesToday ?? 0} mensagens` :
                  analyticsPeriod === '7d' ? `${chatMetrics?.messagesThisWeek ?? 0} mensagens` :
                  analyticsPeriod === '30d' ? `${chatMetrics?.messagesThisMonth ?? 0} mensagens` :
                  `${chatMetrics?.messagesLast90d ?? 0} mensagens`
                }
                changeType="positive"
                icon={MessageSquare}
                description={periodLabel}
              />
            </div>
            <div className="cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-xl"
              onClick={() => setIsReportsModalOpen(true)}>
              <KPICard
                title="Mensagens"
                value={
                  analyticsPeriod === 'today' ? (chatMetrics?.messagesToday ?? 0) :
                  analyticsPeriod === '7d' ? (chatMetrics?.messagesThisWeek ?? 0) :
                  analyticsPeriod === '30d' ? (chatMetrics?.messagesThisMonth ?? 0) :
                  (chatMetrics?.messagesLast90d ?? 0)
                }
                changeType="positive"
                icon={Activity}
                description={`Volume de mensagens · ${periodLabel}`}
              />
            </div>

            {hasAgendamento && (
              <>
                <div className="cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-xl"
                  onClick={() => setIsTodayModalOpen(true)}>
                  <KPICard
                    title={analyticsPeriod === 'today' ? 'Compromissos Hoje' : 'Compromissos no período'}
                    value={analyticsPeriod === 'today' ? todayAppointments.length : appointmentsInPeriod.length}
                    change={`${analyticsPeriod === 'today' ? confirmedToday : confirmadosNoPeriodo} confirmados`}
                    changeType="positive"
                    icon={Calendar}
                    description={periodLabel}
                  />
                </div>
                <div className="cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-xl"
                  onClick={() => window.location.href = '/app/clientes/crm'}>
                  <KPICard
                    title="Taxa de Confirmação"
                    value={`${taxaConfirmacaoKanban}%`}
                    change={`${contatosConcluidosNoPeriodo} concluídos / ${totalContatosNoPeriodoKanban} no Kanban`}
                    changeType="positive"
                    icon={CheckCircle2}
                    description={`Kanban · ${periodLabel}`}
                  />
                </div>
                <div className="cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-xl"
                  onClick={() => window.location.href = '/app/clientes/crm'}>
                  <KPICard
                    title="Concluídos (Kanban)"
                    value={contatosConcluidosNoPeriodo}
                    change="status concluído"
                    changeType="positive"
                    icon={UserCheck}
                    description={`Kanban · ${periodLabel}`}
                  />
                </div>
              </>
            )}

            {/* Tarefas (Kanban de tarefas) */}
            <div className="cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-xl"
              onClick={() => setActiveTab('tarefas')}>
              <KPICard
                title="Tarefas"
                value={tarefas.length}
                change={`${tarefas.filter(t => t.status === 'a_fazer').length} a fazer · ${tarefas.filter(t => t.status === 'feito').length} concluídas`}
                changeType="neutral"
                icon={ListTodo}
                description="Kanban de tarefas"
              />
            </div>

            <div className="cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-xl"
              onClick={() => window.location.href = '/app/clientes/crm'}>
              <KPICard
                title={`${plural} Totais`}
                value={contacts.length}
                change={`${activeContacts} ativos`}
                changeType="positive"
                icon={Users}
                description="Base de contatos"
              />
            </div>
          </div>

          {/* Resumo de Atendimentos (para planos sem agendamento) */}
          {!hasAgendamento && (
            <div className="liquid-glass p-4 md:p-6 lg:p-8">
              <div className="mb-4 md:mb-6">
                <h2 className="font-display text-xl md:text-2xl font-semibold text-foreground mb-2">
                  Resumo de Atendimentos
                </h2>
                <p className="text-sm md:text-base text-muted-foreground">
                  Visão geral das conversas do seu atendimento automatizado
                </p>
              </div>

              <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-3">
                <div className="liquid-glass-subtle p-4 md:p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                      <MessageSquare className="h-5 w-5 text-success" />
                    </div>
                    <h3 className="font-semibold text-foreground">Hoje</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Conversas</span>
                      <span className="font-semibold text-foreground">{chatMetrics?.conversationsToday || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Mensagens</span>
                      <span className="font-semibold text-foreground">{chatMetrics?.messagesToday || 0}</span>
                    </div>
                  </div>
                </div>

                <div className="liquid-glass-subtle p-4 md:p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <TrendingUp className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground">Esta Semana</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Conversas</span>
                      <span className="font-semibold text-foreground">{chatMetrics?.conversationsThisWeek || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Mensagens</span>
                      <span className="font-semibold text-foreground">{chatMetrics?.messagesThisWeek || 0}</span>
                    </div>
                  </div>
                </div>

                <div className="liquid-glass-subtle p-4 md:p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                      <Activity className="h-5 w-5 text-accent" />
                    </div>
                    <h3 className="font-semibold text-foreground">Este Mês</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Conversas</span>
                      <span className="font-semibold text-foreground">{chatMetrics?.conversationsThisMonth || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Mensagens</span>
                      <span className="font-semibold text-foreground">{chatMetrics?.messagesThisMonth || 0}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-border/50">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Geral</p>
                    <p className="text-2xl font-bold text-foreground">
                      {chatMetrics?.totalConversations || 0} conversas
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Total de Mensagens</p>
                    <p className="text-2xl font-bold text-primary">
                      {chatMetrics?.totalMessages || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modal: Compromissos de Hoje */}
      <Dialog open={isTodayModalOpen} onOpenChange={setIsTodayModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Compromissos de Hoje</DialogTitle>
            <DialogDescription>
              {new Date().toLocaleDateString("pt-BR", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {todayAppointments.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">Nenhum compromisso para hoje</p>
              </div>
            ) : (
              todayAppointments
                .sort((a, b) => {
                  const timeA = a.inicio ? new Date(a.inicio).getTime() : (a as any).hora;
                  const timeB = b.inicio ? new Date(b.inicio).getTime() : (b as any).hora;
                  return timeA > timeB ? 1 : -1;
                })
                .map((appointment) => {
                  const displayTime = appointment.inicio 
                    ? formatTime(appointment.inicio)
                    : (appointment as any).hora;
                  
                  return (
                    <div
                      key={appointment.id}
                      className="flex items-center gap-4 rounded-lg border border-border/50 bg-background p-4"
                    >
                      <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-accent/10">
                        <span className="text-xl font-bold text-accent">{displayTime}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-foreground truncate">{appointment.nome_contato}</h4>
                        <p className="text-sm text-muted-foreground">{appointment.tipo}</p>
                      </div>
                      <div
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          appointment.situacao === "confirmado"
                            ? "bg-success/10 text-success"
                            : appointment.situacao === "pendente"
                            ? "bg-accent/10 text-accent"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {appointment.situacao === "confirmado" ? "Confirmado" : appointment.situacao === "pendente" ? "Pendente" : "Concluído"}
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Novo Compromisso */}
      <Dialog open={isAppointmentModalOpen} onOpenChange={setIsAppointmentModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Novo Compromisso</DialogTitle>
            <DialogDescription>
              Agende um novo atendimento para um {s}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={appointmentForm.handleSubmit(onSubmitAppointment as any)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="id_contato">{singular} *</Label>
              <Select
                value={appointmentForm.watch('id_contato')}
                onValueChange={(value) => appointmentForm.setValue('id_contato', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={`Selecione um ${s}`} />
                </SelectTrigger>
                <SelectContent>
                  {contacts.map((contact) => (
                    <SelectItem key={contact.id} value={contact.id}>
                      {contact.nome || contact.telefone || 'Sem nome'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {appointmentForm.formState.errors.id_contato && (
                <p className="text-xs text-red-500">{appointmentForm.formState.errors.id_contato.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Data Início *</Label>
                <Controller
                  name="start_date"
                  control={appointmentForm.control}
                  rules={{ required: "Data é obrigatória" }}
                  render={({ field }) => (
                    <DatePicker
                      id="start_date"
                      value={field.value}
                      onChange={(v) => {
                        field.onChange(v);
                        appointmentForm.setValue("end_date", v);
                      }}
                    />
                  )}
                />
                {appointmentForm.formState.errors.start_date && (
                  <p className="text-xs text-destructive">{appointmentForm.formState.errors.start_date.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="start_time">Hora Início *</Label>
                <Input
                  id="start_time"
                  type="time"
                  {...appointmentForm.register("start_time", { required: "Hora é obrigatória" })}
                />
                {appointmentForm.formState.errors.start_time && (
                  <p className="text-xs text-red-500">{appointmentForm.formState.errors.start_time.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="end_date">Data Fim *</Label>
                <Controller
                  name="end_date"
                  control={appointmentForm.control}
                  rules={{ required: "Data é obrigatória" }}
                  render={({ field }) => (
                    <DatePicker
                      id="end_date"
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
                {appointmentForm.formState.errors.end_date && (
                  <p className="text-xs text-destructive">{appointmentForm.formState.errors.end_date.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="end_time">Hora Fim *</Label>
                <Input
                  id="end_time"
                  type="time"
                  {...appointmentForm.register("end_time", { required: "Hora é obrigatória" })}
                />
                {appointmentForm.formState.errors.end_time && (
                  <p className="text-xs text-red-500">{appointmentForm.formState.errors.end_time.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Tipo de Atendimento *</Label>
              <Controller
                name="type"
                control={appointmentForm.control}
                rules={{ required: "Tipo é obrigatório" }}
                render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger id="type">
                      <SelectValue placeholder={tiposAtendimento.filter(t => t.ativo).length ? "Selecione o tipo" : "Cadastre em Tipos de Atendimento"} />
                    </SelectTrigger>
                    <SelectContent>
                      {tiposAtendimento.filter(t => t.ativo).map((t) => (
                        <SelectItem key={t.id} value={t.nome}>{t.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {appointmentForm.formState.errors.type && (
                <p className="text-xs text-red-500">{appointmentForm.formState.errors.type.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="observations">Observações</Label>
              <Textarea
                id="observations"
                placeholder="Observações adicionais"
                {...appointmentForm.register("observations")}
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAppointmentModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createAppointment.isPending}>
                {createAppointment.isPending ? 'Criando...' : 'Criar Compromisso'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Adicionar Paciente */}
      <Dialog open={isPatientModalOpen} onOpenChange={setIsPatientModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Novo Contato</DialogTitle>
            <DialogDescription>
              Adicione um novo contato ao seu sistema.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={patientForm.handleSubmit(onSubmitPatient as any)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome Completo *</Label>
              <Input
                id="nome"
                placeholder="Ex: João da Silva"
                {...patientForm.register("nome", { required: "Nome é obrigatório" })}
              />
              {patientForm.formState.errors.nome && (
                <p className="text-xs text-red-500">{patientForm.formState.errors.nome.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="exemplo@email.com"
                {...patientForm.register("email")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                type="tel"
                placeholder="(00) 00000-0000"
                {...patientForm.register("telefone")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="situacao">Status *</Label>
              <Select
                value={patientForm.watch('situacao')}
                onValueChange={(value: 'ativo' | 'inativo') => patientForm.setValue('situacao', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                placeholder="Anotações sobre o contato..."
                {...patientForm.register("observacoes")}
                rows={3}
                className="resize-none"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPatientModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createContact.isPending}>
                {createContact.isPending ? 'Criando...' : `Adicionar ${singular}`}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Ver Relatórios */}
      <Dialog open={isReportsModalOpen} onOpenChange={setIsReportsModalOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Relatórios e Estatísticas</DialogTitle>
            <DialogDescription>
              Visão geral do seu {hasAgendamento ? 'empresa' : 'atendimento'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Métricas de Atendimento */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">Métricas de Atendimento</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="rounded-lg border border-border/50 bg-background p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="h-4 w-4 text-accent" />
                    <h4 className="font-semibold text-sm">Hoje</h4>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{chatMetrics?.conversationsToday || 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {chatMetrics?.messagesToday || 0} mensagens
                  </p>
                </div>

                <div className="rounded-lg border border-border/50 bg-background p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-accent" />
                    <h4 className="font-semibold text-sm">Semana</h4>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{chatMetrics?.conversationsThisWeek || 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {chatMetrics?.messagesThisWeek || 0} mensagens
                  </p>
                </div>

                <div className="rounded-lg border border-border/50 bg-background p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="h-4 w-4 text-accent" />
                    <h4 className="font-semibold text-sm">Mês</h4>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{chatMetrics?.conversationsThisMonth || 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {chatMetrics?.messagesThisMonth || 0} mensagens
                  </p>
                </div>

                <div className="rounded-lg border border-border/50 bg-background p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MessagesSquare className="h-4 w-4 text-accent" />
                    <h4 className="font-semibold text-sm">Total</h4>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{chatMetrics?.totalConversations || 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {chatMetrics?.totalMessages || 0} mensagens
                  </p>
                </div>
              </div>
            </div>

            {/* Métricas de Contatos */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">Base de {plural}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border border-border/50 bg-background p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-accent" />
                    <h4 className="font-semibold text-sm">Total de {plural}</h4>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{contacts.length}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {activeContacts} ativos
                  </p>
                </div>

                <div className="rounded-lg border border-border/50 bg-background p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-accent" />
                    <h4 className="font-semibold text-sm">Total de Interações</h4>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{totalInteractions}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Histórico completo
                  </p>
                </div>
              </div>
            </div>

            {/* Métricas de Agenda (se disponível) */}
            {hasAgendamento && (
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">Agenda</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg border border-border/50 bg-background p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-accent" />
                      <h4 className="font-semibold text-sm">Compromissos Hoje</h4>
                    </div>
                    <p className="text-2xl font-bold text-foreground">{todayAppointments.length}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {confirmedToday} confirmados
                    </p>
                  </div>

                  <div className="rounded-lg border border-border/50 bg-background p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="h-4 w-4 text-accent" />
                      <h4 className="font-semibold text-sm">Taxa de Confirmação</h4>
                    </div>
                    <p className="text-2xl font-bold text-foreground">
                      {todayAppointments.length > 0 ? `${Math.round((confirmedToday / todayAppointments.length) * 100)}%` : "0%"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Hoje
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
