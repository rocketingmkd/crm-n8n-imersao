import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Plus, Pencil, Power, PowerOff, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Organization {
  id: string; name: string; slug: string; is_active: boolean; created_at: string; settings: any;
}

export default function Organizations() {
  const [searchQuery, setSearchQuery] = useState("");
  const [toggleOrgId, setToggleOrgId] = useState<string | null>(null);
  const [deleteOrgId, setDeleteOrgId] = useState<string | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: organizations, isLoading } = useQuery<Organization[]>({
    queryKey: ["super-admin-organizations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("organizations").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ orgId, newStatus }: { orgId: string; newStatus: boolean }) => {
      const { error } = await supabase.from("organizations").update({ is_active: newStatus }).eq("id", orgId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["super-admin-organizations"] }); toast.success("Status atualizado!"); setToggleOrgId(null); },
    onError: () => { toast.error("Erro ao atualizar status"); },
  });

  const deleteOrganization = useMutation({
    mutationFn: async (orgId: string) => {
      const { error } = await supabase.from("organizations").delete().eq("id", orgId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["super-admin-organizations"] }); toast.success("Organização excluída!"); setDeleteOrgId(null); },
    onError: () => { toast.error("Erro ao excluir organização"); },
  });

  const filteredOrganizations = organizations?.filter((org) =>
    org.name.toLowerCase().includes(searchQuery.toLowerCase()) || org.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Empresas</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie todas as empresas cadastradas</p>
        </div>
        <Button onClick={() => navigate("/super-admin/organizations/new")} className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-pink" size="default">
          <Plus className="mr-2 h-4 w-4" />
          Nova Empresa
        </Button>
      </div>

      <Card className="border-border">
        <CardContent className="pt-5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar por nome ou slug..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredOrganizations?.map((org) => (
          <Card key={org.id} className="border-border hover:border-primary/30 transition-all">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-foreground text-base">{org.name}</CardTitle>
                  <CardDescription className="text-xs mt-0.5">{org.slug}</CardDescription>
                </div>
                <Badge variant={org.is_active ? "default" : "secondary"} className={org.is_active ? "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20" : ""}>
                  {org.is_active ? "Ativa" : "Inativa"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-[10px] text-muted-foreground mb-3">
                Criada em {new Date(org.created_at).toLocaleDateString("pt-BR")}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => navigate(`/super-admin/organizations/${org.id}/edit`)} className="flex-1 text-xs">
                  <Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar
                </Button>
                <Button variant="outline" size="sm" onClick={() => setToggleOrgId(org.id)} className="text-xs">
                  {org.is_active ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setDeleteOrgId(org.id)} className="text-xs text-destructive hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {(!filteredOrganizations || filteredOrganizations.length === 0) && (
        <Card className="border-border">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground text-sm">
              {searchQuery ? "Nenhuma empresa encontrada" : "Nenhuma empresa cadastrada ainda"}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Toggle Dialog */}
      <AlertDialog open={toggleOrgId !== null} onOpenChange={() => setToggleOrgId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Ação</AlertDialogTitle>
            <AlertDialogDescription>
              {organizations?.find((o) => o.id === toggleOrgId)?.is_active
                ? "Desativar esta empresa impedirá o acesso de todos os usuários."
                : "Ativar esta empresa permitirá o acesso de todos os usuários."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { const org = organizations?.find((o) => o.id === toggleOrgId); if (org) toggleStatus.mutate({ orgId: org.id, newStatus: !org.is_active }); }} className="bg-primary text-primary-foreground hover:bg-primary/90">
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteOrgId !== null} onOpenChange={() => setDeleteOrgId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" /> Excluir Empresa
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p className="font-semibold text-destructive">⚠️ ATENÇÃO: Esta ação é irreversível!</p>
              <p>Ao excluir "<strong className="text-foreground">{organizations?.find((o) => o.id === deleteOrgId)?.name}</strong>", todos os dados serão apagados.</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Todos os usuários/perfis</li>
                <li>Todos os clientes</li>
                <li>Todos os compromissos</li>
                <li>Configurações do Agent IA</li>
                <li>Instâncias WhatsApp</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteOrgId) deleteOrganization.mutate(deleteOrgId); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              <Trash2 className="mr-2 h-4 w-4" /> Sim, Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
