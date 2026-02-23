import { useState, useEffect } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Mail, Phone, GripVertical } from "lucide-react";
import { cn, formatPhoneNumber } from "@/lib/utils";
import { toast } from "sonner";

type KanbanStatus =
  | "novo_contato"
  | "qualificado"
  | "em_atendimento"
  | "agendado"
  | "aguardando_confirmacao"
  | "concluido";

interface KanbanCard {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  status_kanban: KanbanStatus;
  criado_em: string;
  id_organizacao: string;
  url_foto?: string | null;
}

interface Column {
  id: KanbanStatus;
  title: string;
  color: string;
}

const columns: Column[] = [
  { id: "novo_contato", title: "Novo Contato", color: "bg-blue-500" },
  { id: "qualificado", title: "Qualificado", color: "bg-purple-500" },
  { id: "em_atendimento", title: "Em Atendimento", color: "bg-yellow-500" },
  { id: "agendado", title: "Agendado", color: "bg-cyan-500" },
  { id: "aguardando_confirmacao", title: "Aguardando", color: "bg-orange-500" },
  { id: "concluido", title: "Concluído", color: "bg-green-500" },
];

function SortableCard({ card }: { card: KanbanCard }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("card-luxury group p-4 mb-3 cursor-move touch-none", isDragging && "opacity-50 scale-105")}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Avatar className="h-8 w-8 shrink-0 rounded-full">
            <AvatarImage src={card.url_foto || undefined} alt={card.nome || ""} className="object-cover" />
            <AvatarFallback className="rounded-full bg-accent/10 text-xs font-semibold text-accent">
              {card.nome ? card.nome.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "?"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-sm truncate">{card.nome || "Sem nome"}</h3>
          </div>
        </div>
        <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
      </div>
      <div className="space-y-2 text-xs">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Mail className="h-3 w-3 shrink-0" />
          <span className="truncate">{card.email || "Sem email"}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Phone className="h-3 w-3 shrink-0" />
          <span className="truncate">{formatPhoneNumber(card.telefone) || "Sem telefone"}</span>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{new Date(card.criado_em).toLocaleDateString('pt-BR')}</span>
      </div>
    </div>
  );
}

function KanbanColumn({ column, cards }: { column: Column; cards: KanbanCard[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div
      ref={setNodeRef}
      className={cn("flex flex-col h-full liquid-glass-subtle p-4 min-w-[280px] max-w-[320px] transition-all", isOver && "ring-2 ring-accent")}
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn("h-3 w-3 rounded-full", column.color)} />
          <h3 className="font-semibold text-sm">{column.title}</h3>
          <Badge variant="secondary" className="ml-1">{cards.length}</Badge>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {cards.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Nenhum card nesta coluna</div>
          ) : (
            cards.map((card) => <SortableCard key={card.id} card={card} />)
          )}
        </SortableContext>
      </div>
    </div>
  );
}

export default function KanbanBoard() {
  const { profile } = useAuth();
  const [cards, setCards] = useState<KanbanCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCard, setActiveCard] = useState<KanbanCard | null>(null);

  useEffect(() => {
    loadContacts();
  }, [profile?.id_organizacao]);

  const loadContacts = async () => {
    if (!profile?.id_organizacao) return;
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("contatos")
        .select("id, nome, email, telefone, status_kanban, criado_em, id_organizacao, url_foto")
        .eq("id_organizacao", profile.id_organizacao)
        .order("criado_em", { ascending: false });
      if (error) throw error;
      setCards((data || []) as KanbanCard[]);
    } catch (error) {
      console.error("Erro ao carregar contatos:", error);
      toast.error("Erro ao carregar contatos");
    } finally {
      setIsLoading(false);
    }
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragStart = (event: DragStartEvent) => {
    setActiveCard(cards.find((c) => c.id === event.active.id) || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) { setActiveCard(null); return; }

    const ac = cards.find((c) => c.id === active.id);
    if (!ac) { setActiveCard(null); return; }

    let newStatus: KanbanStatus | null = null;
    const overCard = cards.find((c) => c.id === over.id);
    if (overCard) {
      newStatus = overCard.status_kanban;
    } else {
      const column = columns.find((col) => col.id === over.id);
      if (column) newStatus = column.id;
    }

    if (newStatus && ac.status_kanban !== newStatus) {
      setCards((prev) => prev.map((card) => card.id === active.id ? { ...card, status_kanban: newStatus } : card));
      try {
        const { error } = await supabase.from("contatos").update({ status_kanban: newStatus }).eq("id", String(active.id));
        if (error) throw error;
        toast.success(`Card movido para ${columns.find(c => c.id === newStatus)?.title}`);
      } catch (error) {
        console.error("Erro ao atualizar status:", error);
        toast.error("Erro ao atualizar status");
        loadContacts();
      }
    }
    setActiveCard(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando contatos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-320px)] min-h-[400px] overflow-x-auto overflow-y-hidden">
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 h-full pb-4">
          {columns.map((column) => (
            <KanbanColumn key={column.id} column={column} cards={cards.filter((card) => card.status_kanban === column.id)} />
          ))}
        </div>
        <DragOverlay>{activeCard ? <SortableCard card={activeCard} /> : null}</DragOverlay>
      </DndContext>
    </div>
  );
}
