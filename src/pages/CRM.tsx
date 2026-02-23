import { Search, UserPlus, Mail, Phone, Filter, X, FileText, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { usePlanFeatures } from "@/hooks/usePlanFeatures";
import { LimitAlert } from "@/components/LimitAlert";
import { useContacts, useCreateContact } from "@/hooks/useContacts";
import { useEntityLabel } from "@/hooks/useEntityLabel";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { cn, formatPhoneNumber } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PatientFormData {
  name: string;
  email: string;
  phone: string;
  status: 'ativo' | 'inativo';
  observations: string;
}

type KanbanStatus =
  | "novo_contato"
  | "qualificado"
  | "em_atendimento"
  | "agendado"
  | "aguardando_confirmacao"
  | "concluido"
  | "all";

const kanbanStatuses = [
  { id: "novo_contato", title: "Novo Contato", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  { id: "qualificado", title: "Qualificado", color: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
  { id: "em_atendimento", title: "Em Atendimento", color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
  { id: "agendado", title: "Agendado", color: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20" },
  { id: "aguardando_confirmacao", title: "Aguardando Confirmação", color: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
  { id: "concluido", title: "Concluído", color: "bg-green-500/10 text-green-600 border-green-500/20" },
];

export default function CRM() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<KanbanStatus>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<any | null>(null);
  const [resumoContact, setResumoContact] = useState<any | null>(null);
  const [limitInfo, setLimitInfo] = useState<{ current: number; max: number | null } | null>(null);
  const { data: contacts = [], isLoading } = useContacts();
  const { profile } = useAuth();
  const createContact = useCreateContact();
  const { checkLimit } = usePlanFeatures();
  const { singular, plural, s, p } = useEntityLabel();

  // Verificar limite ao abrir dialog
  useEffect(() => {
    if (isDialogOpen) {
      checkLimit('max_contatos').then(result => {
        setLimitInfo({ current: result.current, max: result.max });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDialogOpen]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<PatientFormData>({
    defaultValues: {
      status: 'ativo',
    },
  });

  const status = watch('status');

  const onSubmit = async (data: PatientFormData) => {
    if (!profile?.id_organizacao) {
      toast.error('Erro: organização não identificada');
      return;
    }

    // Verificar limite antes de criar
    const limitCheck = await checkLimit('max_contatos');
    if (!limitCheck.allowed) {
      toast.error(`Limite de ${limitCheck.max} ${p} atingido! Faça upgrade do seu plano.`);
      return;
    }

    try {
      await createContact.mutateAsync({
        nome: data.name,
        email: data.email,
        telefone: data.phone,
        situacao: data.status,
        observacoes: data.observations || null,
        id_organizacao: profile.id_organizacao,
        total_interacoes: 0,
      });

      toast.success(`${singular} cadastrado com sucesso!`);
      setIsDialogOpen(false);
      reset();
    } catch (error: any) {
      console.error('Erro ao criar contato:', error);
      toast.error(error.message || `Erro ao cadastrar ${s}`);
    }
  };

  // Filtrar contatos pela busca e status
  const filteredContacts = contacts.filter((contact) => {
    const search = searchTerm.toLowerCase();
    const matchesSearch = (
      (contact.nome?.toLowerCase() || "").includes(search) ||
      (contact.email?.toLowerCase() || "").includes(search) ||
      (contact.telefone?.toLowerCase() || "").includes(search)
    );

    const matchesStatus = statusFilter === "all" || contact.status_kanban === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando {p}...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in">
        <div>
          <h1 className="font-display text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-foreground mb-1 md:mb-2">
            CRM
          </h1>
          <p className="text-base md:text-lg text-muted-foreground">
            Gerencie seus {p} com cuidado
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 w-full sm:w-auto">
              <UserPlus className="h-4 w-4" />
              Adicionar {singular}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Novo {singular}</DialogTitle>
              <DialogDescription>
                Adicione um novo {s} ao seu sistema de gestão.
              </DialogDescription>
            </DialogHeader>
            {limitInfo && limitInfo.max && (
              <LimitAlert
                current={limitInfo.current}
                max={limitInfo.max}
                limitName={p}
                onUpgrade={() => {
                  setIsDialogOpen(false);
                  window.dispatchEvent(new CustomEvent('open-plan-modal'));
                }}
              />
            )}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo</Label>
                <Input
                  id="name"
                  placeholder="Ex: João da Silva"
                  {...register('name')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="joao@example.com"
                  {...register('email', {
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Email inválido',
                    },
                  })}
                  className={errors.email ? 'border-red-500' : ''}
                />
                {errors.email && (
                  <p className="text-xs text-red-500">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  placeholder="(11) 98888-8888"
                  {...register('phone')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={status}
                  onValueChange={(value: 'ativo' | 'inativo') =>
                    setValue('status', value)
                  }
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
                <Label htmlFor="observations">Observações</Label>
                <Textarea
                  id="observations"
                  placeholder={`Anotações sobre o ${s}...`}
                  {...register('observations')}
                  rows={3}
                  className="resize-none"
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    reset();
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={createContact.isPending}>
                  {createContact.isPending ? 'Criando...' : `Criar ${singular}`}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search Bar */}
      <div className="relative animate-fade-in-up">
        <Search className="absolute left-3 md:left-4 top-1/2 h-4 w-4 md:h-5 md:w-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={`Buscar ${p} por nome, email ou telefone...`}
          className="pl-10 md:pl-12 h-11 md:h-12 bg-card border-border/50 focus:border-accent text-sm md:text-base"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Filtros por Status */}
      <div className="animate-fade-in-up">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Filtrar por:</span>
          
          <Button
            variant={statusFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("all")}
            className="h-8 text-xs"
          >
            Todos ({contacts.length})
          </Button>

          {kanbanStatuses.map((status) => {
            const count = contacts.filter(p => p.status_kanban === status.id).length;
            return (
              <Button
                key={status.id}
                variant={statusFilter === status.id ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(status.id as KanbanStatus)}
                className={cn(
                  "h-8 text-xs",
                  statusFilter === status.id && status.id === "novo_contato" && "bg-blue-500 hover:bg-blue-600",
                  statusFilter === status.id && status.id === "qualificado" && "bg-purple-500 hover:bg-purple-600",
                  statusFilter === status.id && status.id === "em_atendimento" && "bg-yellow-500 hover:bg-yellow-600",
                  statusFilter === status.id && status.id === "agendado" && "bg-cyan-500 hover:bg-cyan-600",
                  statusFilter === status.id && status.id === "aguardando_confirmacao" && "bg-orange-500 hover:bg-orange-600",
                  statusFilter === status.id && status.id === "concluido" && "bg-green-500 hover:bg-green-600"
                )}
              >
                {status.title} ({count})
              </Button>
            );
          })}

          {statusFilter !== "all" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStatusFilter("all")}
              className="h-8 text-xs gap-1"
            >
              <X className="h-3 w-3" />
              Limpar
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:gap-5 md:gap-6 grid-cols-2 md:grid-cols-4 animate-fade-in-up">
        <div className="liquid-glass-subtle p-3 md:p-4">
          <p className="text-caption mb-1.5 md:mb-2 text-[10px] md:text-xs">Total de {plural}</p>
          <p className="font-display text-xl md:text-2xl lg:text-3xl font-bold text-foreground">
            {contacts.length}
          </p>
        </div>
        <div className="liquid-glass-subtle p-3 md:p-4">
          <p className="text-caption mb-1.5 md:mb-2 text-[10px] md:text-xs">Ativos</p>
          <p className="font-display text-xl md:text-2xl lg:text-3xl font-bold text-success">
            {contacts.filter(c => c.situacao === 'ativo').length}
          </p>
        </div>
        <div className="liquid-glass-subtle p-3 md:p-4">
          <p className="text-caption mb-1.5 md:mb-2 text-[10px] md:text-xs">Inativos</p>
          <p className="font-display text-xl md:text-2xl lg:text-3xl font-bold text-muted-foreground">
            {contacts.filter(c => c.situacao === 'inativo').length}
          </p>
        </div>
        <div className="liquid-glass-subtle p-3 md:p-4">
          <p className="text-caption mb-1.5 md:mb-2 text-[10px] md:text-xs">Total Interações</p>
          <p className="font-display text-xl md:text-2xl lg:text-3xl font-bold text-accent">
            {contacts.reduce((sum, c) => sum + (c.total_interacoes || 0), 0)}
          </p>
        </div>
      </div>

      {/* Patient Cards Grid */}
      {filteredContacts.length === 0 ? (
        <div className="text-center py-12 liquid-glass">
          <UserPlus className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-lg font-medium text-foreground mb-2">
            {searchTerm ? `Nenhum ${s} encontrado` : `Nenhum ${s} cadastrado`}
          </p>
          <p className="text-sm text-muted-foreground">
            {searchTerm ? "Tente buscar com outros termos" : `Adicione seu primeiro ${s} para começar`}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:gap-5 lg:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filteredContacts.map((contact, index) => {
            // Determinar cor baseada no status do kanban
            const getCardColor = () => {
              if (!contact.status_kanban) {
                return {
                  gradient: "from-blue-500/10 via-blue-500/5 to-transparent",
                  border: "border-blue-500/20",
                  avatar: "bg-gradient-to-br from-blue-500/20 to-blue-500/10 text-blue-600",
                  accent: "text-blue-600"
                };
              }
              
              switch (contact.status_kanban) {
                case "novo_contato":
                  return {
                    gradient: "from-blue-500/10 via-blue-500/5 to-transparent",
                    border: "border-blue-500/30",
                    avatar: "bg-gradient-to-br from-blue-500/20 to-blue-500/10 text-blue-600",
                    accent: "text-blue-600"
                  };
                case "qualificado":
                  return {
                    gradient: "from-purple-500/10 via-purple-500/5 to-transparent",
                    border: "border-purple-500/30",
                    avatar: "bg-gradient-to-br from-purple-500/20 to-purple-500/10 text-purple-600",
                    accent: "text-purple-600"
                  };
                case "em_atendimento":
                  return {
                    gradient: "from-yellow-500/10 via-yellow-500/5 to-transparent",
                    border: "border-yellow-500/30",
                    avatar: "bg-gradient-to-br from-yellow-500/20 to-yellow-500/10 text-yellow-600",
                    accent: "text-yellow-600"
                  };
                case "agendado":
                  return {
                    gradient: "from-cyan-500/10 via-cyan-500/5 to-transparent",
                    border: "border-cyan-500/30",
                    avatar: "bg-gradient-to-br from-cyan-500/20 to-cyan-500/10 text-cyan-600",
                    accent: "text-cyan-600"
                  };
                case "aguardando_confirmacao":
                  return {
                    gradient: "from-orange-500/10 via-orange-500/5 to-transparent",
                    border: "border-orange-500/30",
                    avatar: "bg-gradient-to-br from-orange-500/20 to-orange-500/10 text-orange-600",
                    accent: "text-orange-600"
                  };
                case "concluido":
                  return {
                    gradient: "from-green-500/10 via-green-500/5 to-transparent",
                    border: "border-green-500/30",
                    avatar: "bg-gradient-to-br from-green-500/20 to-green-500/10 text-green-600",
                    accent: "text-green-600"
                  };
                default:
                  return {
                    gradient: "from-accent/10 via-accent/5 to-transparent",
                    border: "border-accent/30",
                    avatar: "bg-gradient-to-br from-accent/20 to-accent/10 text-accent",
                    accent: "text-accent"
                  };
              }
            };

            const colors = getCardColor();
            const statusInfo = contact.status_kanban
              ? kanbanStatuses.find(ks => ks.id === contact.status_kanban)
              : null;

            return (
              <div
                key={contact.id}
                onClick={() => setSelectedContact(contact)}
                className={cn(
                  "group relative overflow-hidden rounded-xl border-2 p-5 md:p-6 lg:p-7",
                  "bg-gradient-to-br",
                  colors.gradient,
                  colors.border,
                  "shadow-md hover:shadow-xl transition-all duration-300",
                  "hover:scale-[1.02] hover:-translate-y-1 cursor-pointer",
                  "animate-fade-in-up"
                )}
                style={{ animationDelay: `${0.05 * index}s` }}
              >
                {/* Decorative corner accent */}
                <div className={cn(
                  "absolute top-0 right-0 w-20 h-20 rounded-bl-full opacity-10",
                  colors.gradient.replace("from-", "bg-").split("/")[0] + "/20"
                )} />

                {/* Patient Header */}
                <div className="mb-4 flex items-start justify-between gap-3 relative z-10">
                  <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
                    <div className={cn(
                      "flex h-12 w-12 md:h-14 md:w-14 shrink-0 items-center justify-center rounded-xl font-display text-lg md:text-xl font-bold shadow-lg",
                      colors.avatar
                    )}>
                      {contact.nome
                        ? contact.nome.split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)
                        : "?"
                      }
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-foreground text-base md:text-lg truncate mb-1">
                        {contact.nome || "Sem nome"}
                      </h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={cn(
                            "text-xs font-semibold px-2 py-0.5 rounded-full",
                            contact.situacao === "ativo"
                              ? "bg-green-500/10 text-green-600 border border-green-500/20"
                              : "bg-gray-500/10 text-gray-600 border border-gray-500/20"
                          )}
                        >
                          {contact.situacao === "ativo" ? "Ativo" : "Inativo"}
                        </span>
                        {statusInfo && (
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "text-[10px] h-5 px-2 font-semibold border-2",
                              statusInfo.color
                            )}
                          >
                            {statusInfo.title}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className={cn(
                    "shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold shadow-md",
                    colors.avatar,
                    "border border-white/20"
                  )}>
                    {contact.total_interacoes} {contact.total_interacoes === 1 ? "interação" : "interações"}
                  </div>
                </div>

                {/* Contact Info */}
                <div className="space-y-2.5 border-t border-border/30 pt-4 relative z-10">
                  <div className="flex items-center gap-2.5 p-2 rounded-lg bg-background/50 hover:bg-background/80 transition-colors">
                    <div className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg",
                      colors.avatar.replace("text-", "bg-").replace("/20", "/10").replace("/10", "/10")
                    )}>
                      <Mail className={cn("h-3.5 w-3.5", colors.accent)} />
                    </div>
                    <span className="truncate text-xs md:text-sm text-foreground font-medium flex-1">
                      {contact.email || "Sem email"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 p-2 rounded-lg bg-background/50 hover:bg-background/80 transition-colors">
                    <div className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg",
                      colors.avatar.replace("text-", "bg-").replace("/20", "/10").replace("/10", "/10")
                    )}>
                      <Phone className={cn("h-3.5 w-3.5", colors.accent)} />
                    </div>
                    <span className="text-xs md:text-sm text-foreground font-medium">
                      {formatPhoneNumber(contact.telefone) || "Sem telefone"}
                    </span>
                  </div>

                  {/* Observações */}
                  {contact.observacoes && (
                    <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-background/50 mt-2 border border-border/20">
                      <div className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg shrink-0",
                        colors.avatar.replace("text-", "bg-").replace("/20", "/10").replace("/10", "/10")
                      )}>
                        <FileText className={cn("h-3.5 w-3.5", colors.accent)} />
                      </div>
                      <p className="text-xs md:text-sm text-muted-foreground line-clamp-2 flex-1">
                        {contact.observacoes}
                      </p>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="mt-4 border-t border-border/30 pt-4 relative z-10">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground font-medium">
                        Última interação: {contact.ultima_interacao ? new Date(contact.ultima_interacao).toLocaleDateString('pt-BR') : 'Nunca'}
                      </span>
                    </div>
                    
                    {/* Botão Ver Resumo */}
                    {contact.resumo && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setResumoContact(contact);
                        }}
                        className={cn(
                          "w-full gap-2 text-xs font-semibold border-2 transition-all hover:scale-105",
                          colors.border,
                          "hover:" + colors.border.replace("/30", "/50")
                        )}
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        Ver resumo da conversa
                      </Button>
                    )}
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedContact(contact);
                      }}
                      className={cn(
                        "w-full gap-2 text-xs font-semibold hover:bg-background/80",
                        colors.accent
                      )}
                    >
                      Ver Detalhes →
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Detalhes do Contato */}
      <Dialog open={selectedContact !== null} onOpenChange={() => setSelectedContact(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 font-display text-base font-semibold text-accent">
                {selectedContact?.nome
                  ? selectedContact.nome.split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .toUpperCase()
                  : "?"
                }
              </div>
              {selectedContact?.nome || singular}
            </DialogTitle>
            <DialogDescription>
              Informações completas do {s}
            </DialogDescription>
          </DialogHeader>

          {selectedContact && (
            <div className="space-y-4">
              {/* Status */}
              <div className="flex items-center gap-4">
                <Badge
                  variant="outline"
                  className={selectedContact.situacao === 'ativo' ? 'border-green-500/50 text-green-600' : 'border-gray-500/50 text-gray-600'}
                >
                  {selectedContact.situacao === 'ativo' ? 'Ativo' : 'Inativo'}
                </Badge>
                {selectedContact.status_kanban && (() => {
                  const statusInfo = kanbanStatuses.find(ks => ks.id === selectedContact.status_kanban);
                  return statusInfo ? (
                    <Badge variant="outline" className={statusInfo.color}>
                      {statusInfo.title}
                    </Badge>
                  ) : null;
                })()}
              </div>

              {/* Informações de Contato */}
              <div className="space-y-3 rounded-lg border border-border/50 bg-background p-4">
                <h3 className="text-sm font-semibold text-foreground">Informações de Contato</h3>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">
                      {selectedContact.email || "Sem email"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">
                      {formatPhoneNumber(selectedContact.telefone) || "Sem telefone"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Estatísticas */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border/50 bg-background p-4">
                  <p className="text-xs text-muted-foreground mb-1">Total de Interações</p>
                  <p className="text-2xl font-bold text-accent">{selectedContact.total_interacoes}</p>
                </div>

                <div className="rounded-lg border border-border/50 bg-background p-4">
                  <p className="text-xs text-muted-foreground mb-1">Última Interação</p>
                  <p className="text-sm font-semibold text-foreground">
                    {selectedContact.ultima_interacao
                      ? new Date(selectedContact.ultima_interacao).toLocaleDateString('pt-BR')
                      : 'Nunca'
                    }
                  </p>
                </div>
              </div>

              {/* Observações */}
              {selectedContact.observacoes && (
                <div className="space-y-2 rounded-lg border border-border/50 bg-background p-4">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-sm font-semibold text-foreground">Observações</h3>
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {selectedContact.observacoes}
                  </p>
                </div>
              )}

              {/* Data de Cadastro */}
              <div className="text-xs text-muted-foreground">
                Cadastrado em: {new Date(selectedContact.criado_em).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedContact(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Resumo da Conversa */}
      <Dialog open={resumoContact !== null} onOpenChange={() => setResumoContact(null)}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-accent" />
              Resumo da Conversa
            </DialogTitle>
            <DialogDescription>
              {resumoContact?.nome && `Resumo da conversa com ${resumoContact.nome}`}
            </DialogDescription>
          </DialogHeader>

          {resumoContact && (
            <div className="space-y-4">
              {/* Informações do Contato */}
              <div className="flex items-center gap-3 p-4 rounded-lg bg-accent/5 border border-accent/20">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 font-display text-base font-semibold text-accent">
                  {resumoContact.nome
                    ? resumoContact.nome.split(" ")
                        .map((n: string) => n[0])
                        .join("")
                        .toUpperCase()
                    : "?"
                  }
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{resumoContact.nome || singular}</h3>
                  <p className="text-sm text-muted-foreground">{formatPhoneNumber(resumoContact.telefone)}</p>
                </div>
              </div>

              {/* Resumo */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                  <MessageSquare className="h-4 w-4 text-accent" />
                  <h3 className="text-sm font-semibold text-foreground">Resumo Gerado</h3>
                </div>

                <div className="prose prose-sm max-w-none">
                  <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {resumoContact.resumo}
                  </p>
                </div>
              </div>

              {/* Metadados */}
              <div className="flex items-center gap-4 pt-3 border-t border-border/50 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  <span>Gerado automaticamente</span>
                </div>
                {resumoContact.ultima_interacao && (
                  <div className="flex items-center gap-1">
                    <span>•</span>
                    <span>Última atualização: {new Date(resumoContact.ultima_interacao).toLocaleDateString('pt-BR')}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setResumoContact(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
