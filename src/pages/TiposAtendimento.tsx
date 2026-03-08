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
import { useTranslation } from "react-i18next";

export default function TiposAtendimento({ embedded = false }: { embedded?: boolean }) {
  const { t } = useTranslation();
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
      toast.error(t('app.tiposAtendimento.informName'));
      return;
    }
    try {
      if (editing) {
        await atualizar.mutateAsync({ id: editing.id, nome: nomeTrim, ativo });
        toast.success(t('app.tiposAtendimento.typeUpdated'));
      } else {
        await criar.mutateAsync({ nome: nomeTrim, ativo });
        toast.success(t('app.tiposAtendimento.typeCreated'));
      }
      setDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('app.tiposAtendimento.errorSave'));
    }
  };

  const handleDelete = async (row: TipoAtendimento) => {
    if (!confirm(t('app.tiposAtendimento.deleteConfirm', { name: row.nome }))) return;
    try {
      await excluir.mutateAsync(row.id);
      toast.success(t('app.tiposAtendimento.typeDeleted'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('app.tiposAtendimento.errorDelete'));
    }
  };

  return (
    <div className={embedded ? "space-y-6" : "container max-w-4xl py-6 space-y-6"}>
      {!embedded && (
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ListTodo className="h-7 w-7 text-primary" />
            {t('app.tiposAtendimento.title')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('app.tiposAtendimento.subtitle')}
          </p>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-base">{t('app.tiposAtendimento.listTitle')}</CardTitle>
            <CardDescription>{t('app.tiposAtendimento.listDesc')}</CardDescription>
          </div>
          <Button onClick={openCreate} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            {t('app.tiposAtendimento.new')}
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : tipos.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              {t('app.tiposAtendimento.noTypes')}. {t('app.tiposAtendimento.addFirst')}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('app.tiposAtendimento.name')}</TableHead>
                  <TableHead className="w-[100px]">{t('app.tiposAtendimento.active')}</TableHead>
                  <TableHead className="w-[120px] text-right">{t('app.tiposAtendimento.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tipos.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.nome}</TableCell>
                    <TableCell>
                      <span className={row.ativo ? "text-green-600" : "text-muted-foreground"}>
                        {row.ativo ? t('app.tiposAtendimento.yes') : t('app.tiposAtendimento.no')}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(row)} title={t('app.tiposAtendimento.edit')}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(row)}
                        title={t('app.tiposAtendimento.delete')}
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
            <DialogTitle>{editing ? t('app.tiposAtendimento.edit') + " " + t('app.tiposAtendimento.name').toLowerCase() : t('app.tiposAtendimento.new') + " " + t('app.tiposAtendimento.name').toLowerCase()}</DialogTitle>
            <DialogDescription>
              {editing ? t('app.tiposAtendimento.dialogEditDesc') : t('app.tiposAtendimento.dialogCreateDesc')}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">{t('app.tiposAtendimento.nameRequired')}</Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder={t('app.tiposAtendimento.namePlaceholder')}
                required
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch id="ativo" checked={ativo} onCheckedChange={setAtivo} />
              <Label htmlFor="ativo">{t('app.tiposAtendimento.activeHint')}</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={criar.isPending || atualizar.isPending}>
                {(criar.isPending || atualizar.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {editing ? t('app.tiposAtendimento.save') : t('app.tiposAtendimento.register')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
