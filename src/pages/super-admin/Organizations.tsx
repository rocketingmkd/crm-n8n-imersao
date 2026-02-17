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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Organization {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
  settings: any;
}

export default function Organizations() {
  const [searchQuery, setSearchQuery] = useState("");
  const [toggleOrgId, setToggleOrgId] = useState<string | null>(null);
  const [deleteOrgId, setDeleteOrgId] = useState<string | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Buscar organizações
  const { data: organizations, isLoading } = useQuery<Organization[]>({
    queryKey: ["super-admin-organizations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Toggle status da organização
  const toggleStatus = useMutation({
    mutationFn: async ({ orgId, newStatus }: { orgId: string; newStatus: boolean }) => {
      const { error } = await supabase
        .from("organizations")
        .update({ is_active: newStatus })
        .eq("id", orgId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin-organizations"] });
      toast.success("Status atualizado com sucesso!");
      setToggleOrgId(null);
    },
    onError: (error) => {
      console.error("Erro ao atualizar status:", error);
      toast.error("Erro ao atualizar status da organização");
    },
  });

  // Deletar organização
  const deleteOrganization = useMutation({
    mutationFn: async (orgId: string) => {
      const { error } = await supabase
        .from("organizations")
        .delete()
        .eq("id", orgId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin-organizations"] });
      toast.success("Organização e todos os dados relacionados excluídos com sucesso!");
      setDeleteOrgId(null);
    },
    onError: (error) => {
      console.error("Erro ao excluir organização:", error);
      toast.error("Erro ao excluir organização");
    },
  });

  // Filtrar organizações pela busca
  const filteredOrganizations = organizations?.filter((org) =>
    org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    org.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96 bg-black">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-pink-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-black min-h-screen p-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Empresas</h1>
          <p className="text-gray-400 mt-1">
            Gerencie todas as empresas cadastradas
          </p>
        </div>
        <Button
          onClick={() => navigate("/super-admin/organizations/new")}
          className="bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white shadow-lg shadow-pink-500/50 hover:shadow-pink-500/70 transition-all duration-200 hover:scale-105"
          size="lg"
        >
          <Plus className="mr-2 h-5 w-5" />
          Nova Clínica
        </Button>
      </div>

      {/* Search */}
      <Card className="border-pink-500/30 bg-black/80 backdrop-blur-xl">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-pink-500" />
            <Input
              placeholder="Buscar por nome ou slug..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-black/60 border-pink-500/30 text-white placeholder:text-gray-400/50"
            />
          </div>
        </CardContent>
      </Card>

      {/* Organizations List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredOrganizations?.map((org) => (
          <Card
            key={org.id}
            className="border-pink-500/30 bg-black/80 backdrop-blur-xl hover:border-pink-600/50 transition-all"
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-white">{org.name}</CardTitle>
                  <CardDescription className="text-gray-400 mt-1">
                    {org.slug}
                  </CardDescription>
                </div>
                <Badge
                  variant={org.is_active ? "default" : "destructive"}
                  className={
                    org.is_active
                      ? "bg-pink-600/20 text-pink-300 hover:bg-pink-600/30"
                      : "bg-gray-600/20 text-gray-300 hover:bg-gray-600/30"
                  }
                >
                  {org.is_active ? "Ativa" : "Inativa"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-gray-400 mb-4">
                Criada em {new Date(org.created_at).toLocaleDateString("pt-BR")}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/super-admin/organizations/${org.id}/edit`)}
                  className="flex-1 border-pink-600/30 text-pink-300 hover:bg-pink-800/30 hover:text-pink-100"
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setToggleOrgId(org.id)}
                  className={`border-pink-600/30 ${
                    org.is_active
                      ? "text-red-300 hover:bg-red-900/30 hover:text-red-100"
                      : "text-pink-300 hover:bg-pink-900/30 hover:text-pink-100"
                  }`}
                >
                  {org.is_active ? (
                    <PowerOff className="h-4 w-4" />
                  ) : (
                    <Power className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeleteOrgId(org.id)}
                  className="border-red-600/30 text-red-300 hover:bg-red-900/30 hover:text-red-100"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {(!filteredOrganizations || filteredOrganizations.length === 0) && (
        <Card className="border-pink-500/30 bg-black/80 backdrop-blur-xl">
          <CardContent className="py-12 text-center">
            <p className="text-gray-400">
              {searchQuery
                ? "Nenhuma organização encontrada com esse termo"
                : "Nenhuma organização cadastrada ainda"}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Toggle Status Dialog */}
      <AlertDialog open={toggleOrgId !== null} onOpenChange={() => setToggleOrgId(null)}>
        <AlertDialogContent className="bg-black border-pink-500/30">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              Confirmar Ação
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              {organizations?.find((o) => o.id === toggleOrgId)?.is_active
                ? "Desativar esta organização impedirá o acesso de todos os usuários vinculados."
                : "Ativar esta organização permitirá o acesso de todos os usuários vinculados."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-black/60 text-gray-300 hover:bg-black/80 border-pink-500/30">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const org = organizations?.find((o) => o.id === toggleOrgId);
                if (org) {
                  toggleStatus.mutate({
                    orgId: org.id,
                    newStatus: !org.is_active,
                  });
                }
              }}
              className="bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700"
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Organization Dialog */}
      <AlertDialog open={deleteOrgId !== null} onOpenChange={() => setDeleteOrgId(null)}>
        <AlertDialogContent className="bg-black border-red-800/30">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-100 flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Excluir Organização
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400 space-y-2">
              <p className="font-semibold text-red-400">
                ⚠️ ATENÇÃO: Esta ação é irreversível!
              </p>
              <p>
                Ao excluir a organização "<strong className="text-white">{organizations?.find((o) => o.id === deleteOrgId)?.name}</strong>", 
                os seguintes dados serão permanentemente apagados:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Todos os usuários/perfis da organização</li>
                <li>Todos os pacientes/clientes</li>
                <li>Todos os compromissos/agendamentos</li>
                <li>Configurações do Agent IA</li>
                <li>Instâncias WhatsApp</li>
                <li>Horários de trabalho</li>
                <li>Todas as demais configurações</li>
              </ul>
              <p className="font-semibold text-red-400 mt-4">
                Tem certeza que deseja continuar?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-black/60 text-gray-300 hover:bg-black/80 border-pink-500/30">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteOrgId) {
                  deleteOrganization.mutate(deleteOrgId);
                }
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Sim, Excluir Tudo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

