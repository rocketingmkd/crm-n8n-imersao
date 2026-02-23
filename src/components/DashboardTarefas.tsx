import { useState } from "react";
import { Plus, Trash2, GripVertical, CalendarClock, Bell, BellOff, Loader2, Clock, CheckCircle2, ListTodo } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useTarefas, useCriarTarefa, useAtualizarTarefa, useDeletarTarefa, type Tarefa } from "@/hooks/useTarefas";
import { toast } from "sonner";

const STATUS_CONFIG = {
  a_fazer: { label: "A Fazer", icon: ListTodo, color: "bg-primary/10 text-primary border-primary/20" },
  fazendo: { label: "Fazendo", icon: Clock, color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  feito: { label: "Feito", icon: CheckCircle2, color: "bg-success/10 text-success border-success/20" },
} as const;

const ANTECEDENCIA_OPTIONS = [
  { value: "30", label: "30 minutos antes" },
  { value: "60", label: "1 hora antes" },
  { value: "120", label: "2 horas antes" },
];

function TarefaCard({ tarefa, onEdit, onDelete, onStatusChange }: {
  tarefa: Tarefa;
  onEdit: (t: Tarefa) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: Tarefa['status']) => void;
}) {
  const cfg = STATUS_CONFIG[tarefa.status];
  const isExpired = tarefa.data_finalizacao && new Date(tarefa.data_finalizacao) < new Date() && tarefa.status !== 'feito';

  return (
    <div
      className={`group liquid-glass-subtle p-4 space-y-3 transition-all duration-200 hover:shadow-md cursor-pointer ${isExpired ? 'ring-1 ring-destructive/30' : ''}`}
      onClick={() => onEdit(tarefa)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className={`font-medium text-sm text-foreground leading-snug ${tarefa.status === 'feito' ? 'line-through opacity-60' : ''}`}>
            {tarefa.titulo}
          </p>
          {tarefa.descricao && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{tarefa.descricao}</p>
          )}
        </div>
        <Button
          variant="ghost" size="icon"
          className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive shrink-0"
          onClick={(e) => { e.stopPropagation(); onDelete(tarefa.id); }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {tarefa.data_finalizacao && (
          <Badge variant="outline" className={`text-[10px] gap-1 ${isExpired ? 'border-destructive/40 text-destructive' : 'border-border'}`}>
            <CalendarClock className="h-3 w-3" />
            {new Date(tarefa.data_finalizacao).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </Badge>
        )}
        {tarefa.notificar && (
          <Badge variant="outline" className="text-[10px] gap-1 border-primary/20 text-primary">
            <Bell className="h-3 w-3" />
            {tarefa.antecedencia_minutos === 120 ? '2h' : tarefa.antecedencia_minutos === 60 ? '1h' : '30min'}
          </Badge>
        )}
      </div>

      {/* Quick status change */}
      <div className="flex gap-1.5 pt-1" onClick={(e) => e.stopPropagation()}>
        {(Object.keys(STATUS_CONFIG) as Tarefa['status'][]).map((s) => {
          const c = STATUS_CONFIG[s];
          return (
            <button
              key={s}
              onClick={() => onStatusChange(tarefa.id, s)}
              className={`flex-1 text-[10px] py-1 rounded-lg border transition-all ${
                tarefa.status === s ? c.color + ' font-semibold' : 'border-transparent text-muted-foreground hover:bg-secondary/50'
              }`}
            >
              {c.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function DashboardTarefas() {
  const { data: tarefas = [], isLoading } = useTarefas();
  const criarTarefa = useCriarTarefa();
  const atualizarTarefa = useAtualizarTarefa();
  const deletarTarefa = useDeletarTarefa();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Tarefa | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'kanban' | 'lista'>('kanban');

  // Form state
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [dataFinalizacao, setDataFinalizacao] = useState("");
  const [notificar, setNotificar] = useState(false);
  const [antecedencia, setAntecedencia] = useState("30");

  const resetForm = () => {
    setTitulo(""); setDescricao(""); setDataFinalizacao(""); setNotificar(false); setAntecedencia("30"); setEditingTask(null);
  };

  const openCreate = () => { resetForm(); setIsDialogOpen(true); };

  const openEdit = (t: Tarefa) => {
    setEditingTask(t);
    setTitulo(t.titulo);
    setDescricao(t.descricao || "");
    setDataFinalizacao(t.data_finalizacao ? new Date(t.data_finalizacao).toISOString().slice(0, 16) : "");
    setNotificar(t.notificar);
    setAntecedencia(String(t.antecedencia_minutos || 30));
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!titulo.trim()) { toast.error("Título é obrigatório"); return; }
    try {
      const payload = {
        titulo: titulo.trim(),
        descricao: descricao.trim() || null,
        data_finalizacao: dataFinalizacao ? new Date(dataFinalizacao).toISOString() : null,
        notificar,
        antecedencia_minutos: notificar ? parseInt(antecedencia) : null,
      };
      if (editingTask) {
        await atualizarTarefa.mutateAsync({ id: editingTask.id, ...payload });
        toast.success("Tarefa atualizada!");
      } else {
        await criarTarefa.mutateAsync(payload);
        toast.success("Tarefa criada!");
      }
      setIsDialogOpen(false);
      resetForm();
    } catch {
      toast.error("Erro ao salvar tarefa");
    }
  };

  const handleStatusChange = async (id: string, status: Tarefa['status']) => {
    try {
      await atualizarTarefa.mutateAsync({ id, status });
    } catch {
      toast.error("Erro ao mover tarefa");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deletarTarefa.mutateAsync(deleteId);
      toast.success("Tarefa removida!");
    } catch {
      toast.error("Erro ao remover tarefa");
    } finally {
      setDeleteId(null);
    }
  };

  const columns: Tarefa['status'][] = ['a_fazer', 'fazendo', 'feito'];

  return (
    <div className="liquid-glass p-4 md:p-6 lg:p-8 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <div>
          <h2 className="font-display text-xl md:text-2xl font-semibold text-foreground mb-1 flex items-center gap-2">
            <ListTodo className="h-5 w-5 md:h-6 md:w-6 text-primary" />
            Minhas Tarefas
          </h2>
          <p className="text-sm text-muted-foreground">
            {tarefas.filter(t => t.status !== 'feito').length} pendentes · {tarefas.filter(t => t.status === 'feito').length} concluídas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
            <TabsList className="h-8">
              <TabsTrigger value="kanban" className="text-xs px-3 h-7">Kanban</TabsTrigger>
              <TabsTrigger value="lista" className="text-xs px-3 h-7">Lista</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button onClick={openCreate} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" /> Nova
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : tarefas.length === 0 ? (
        <div className="text-center py-12 bg-gradient-to-br from-primary/5 to-transparent rounded-lg border border-dashed border-primary/20">
          <ListTodo className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-lg font-medium text-foreground mb-2">Nenhuma tarefa ainda</p>
          <p className="text-sm text-muted-foreground mb-4">Crie sua primeira tarefa para organizar suas atividades</p>
          <Button onClick={openCreate} variant="outline" className="gap-2">
            <Plus className="h-4 w-4" /> Criar Tarefa
          </Button>
        </div>
      ) : viewMode === 'kanban' ? (
        /* ═══ Kanban View ═══ */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {columns.map((col) => {
            const cfg = STATUS_CONFIG[col];
            const Icon = cfg.icon;
            const items = tarefas.filter(t => t.status === col);
            return (
              <div key={col} className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-semibold text-foreground">{cfg.label}</span>
                  <Badge variant="outline" className="ml-auto text-[10px] h-5">{items.length}</Badge>
                </div>
                <div className="space-y-2 min-h-[100px]">
                  {items.map((t) => (
                    <TarefaCard
                      key={t.id}
                      tarefa={t}
                      onEdit={openEdit}
                      onDelete={setDeleteId}
                      onStatusChange={handleStatusChange}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ═══ List View ═══ */
        <div className="space-y-2">
          {tarefas.map((t) => (
            <TarefaCard
              key={t.id}
              tarefa={t}
              onEdit={openEdit}
              onDelete={setDeleteId}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}

      {/* ═══ Create/Edit Dialog ═══ */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) { setIsDialogOpen(false); resetForm(); } else setIsDialogOpen(true); }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingTask ? "Editar Tarefa" : "Nova Tarefa"}</DialogTitle>
            <DialogDescription>
              {editingTask ? "Atualize os detalhes da tarefa" : "Adicione uma nova tarefa ao seu quadro"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="titulo">Título *</Label>
              <Input id="titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex: Ligar para fornecedor" autoFocus />
            </div>
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea id="descricao" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Detalhes da tarefa..." rows={3} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="data_finalizacao">Data de Finalização</Label>
              <Input id="data_finalizacao" type="datetime-local" value={dataFinalizacao} onChange={(e) => setDataFinalizacao(e.target.value)} />
            </div>

            {dataFinalizacao && (
              <div className="space-y-4 rounded-xl bg-secondary/30 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {notificar ? <Bell className="h-4 w-4 text-primary" /> : <BellOff className="h-4 w-4 text-muted-foreground" />}
                    <Label htmlFor="notificar" className="text-sm cursor-pointer">Notificar no celular</Label>
                  </div>
                  <Switch id="notificar" checked={notificar} onCheckedChange={setNotificar} />
                </div>
                {notificar && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Avisar com antecedência de:</Label>
                    <Select value={antecedencia} onValueChange={setAntecedencia}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ANTECEDENCIA_OPTIONS.map(o => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>Cancelar</Button>
            <Button onClick={handleSave} disabled={criarTarefa.isPending || atualizarTarefa.isPending}>
              {(criarTarefa.isPending || atualizarTarefa.isPending) ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</> : editingTask ? "Salvar" : "Criar Tarefa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Delete Confirmation ═══ */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tarefa?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deletarTarefa.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
