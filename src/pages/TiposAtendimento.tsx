import { useState } from "react";
import { useTiposAtendimento, useCriarTipoAtendimento, useAtualizarTipoAtendimento, useExcluirTipoAtendimento, type TipoAtendimento } from "@/hooks/useTiposAtendimento";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ListTodo, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function TiposAtendimento({ embedded = false }: { embedded?: boolean }) {
  const { data: tipos = [], isLoading } = useTiposAtendimento();
  const criar = useCriarTipoAtendimento();
  const atualizar = useAtualizarTipoAtendimento();
  const excluir = useExcluirTipoAtendimento();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TipoAtendimento | null>(null);
  const [nome, setNome] = useState("");
  const [ativo, setAtivo] = useState(true);

  const openCreate = () => {
    setEditing(null);
    setNome("");
    setAtivo(true);
    setDialogOpen(true);
  };

  const openEdit = (row: TipoAtendimento) => {
    setEditing(row);
    setNome(row.nome);
    setAtivo(row.ativo);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nomeTrim = nome.trim();
    if (!nomeTrim) {
      toast.error("Informe o nome do tipo de atendimento.");
      return;
    }
    try {
      if (editing) {
        await atualizar.mutateAsync({ id: editing.id, nome: nomeTrim, ativo });
        toast.success("Tipo atualizado.");
      } else {
        await criar.mutateAsync({ nome: nomeTrim, ativo });
        toast.success("Tipo cadastrado.");
      }
      setDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
    }
  };

  const handleDelete = async (row: TipoAtendimento) => {
    if (!confirm(`Excluir "${row.nome}"?`)) return;
    try {
      await excluir.mutateAsync(row.id);
      toast.success("Tipo excluído.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir.");
    }
  };

  return (
    <div className={embedded ? "space-y-6" : "container max-w-4xl py-6 space-y-6"}>
      {!embedded && (
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ListTodo className="h-7 w-7 text-primary" />
            Tipos de Atendimento
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Cadastre os tipos de atendimento usados na Agenda e no Dashboard (ex.: Consulta, Retorno, Exame).
          </p>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-base">Lista de tipos</CardTitle>
            <CardDescription>Estes tipos aparecem ao criar compromissos.</CardDescription>
          </div>
          <Button onClick={openCreate} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Novo tipo
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : tipos.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Nenhum tipo cadastrado. Clique em &quot;Novo tipo&quot; para adicionar.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="w-[100px]">Ativo</TableHead>
                  <TableHead className="w-[120px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tipos.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.nome}</TableCell>
                    <TableCell>
                      <span className={row.ativo ? "text-green-600" : "text-muted-foreground"}>
                        {row.ativo ? "Sim" : "Não"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(row)} title="Editar">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(row)}
                        title="Excluir"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar tipo" : "Novo tipo de atendimento"}</DialogTitle>
            <DialogDescription>
              {editing ? "Altere o nome ou o status ativo." : "Informe o nome do tipo (ex.: Consulta, Retorno)."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Consulta, Retorno, Exame"
                required
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch id="ativo" checked={ativo} onCheckedChange={setAtivo} />
              <Label htmlFor="ativo">Ativo (aparece na lista ao agendar)</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={criar.isPending || atualizar.isPending}>
                {(criar.isPending || atualizar.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {editing ? "Salvar" : "Cadastrar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
