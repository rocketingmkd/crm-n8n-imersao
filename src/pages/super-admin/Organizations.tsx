import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Plus, Pencil, Power, PowerOff, Search, Trash2, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Organization {
  id: string; name: string; slug: string; is_active: boolean; created_at: string; settings: any;
  subscription_plan?: string | null; contact_email?: string | null;
}

const PAGE_SIZES = [10, 20, 50];

const PLAN_LABELS: Record<string, string> = {
  plano_a: "Atendimento",
  plano_b: "Atendimento + Conhecimento",
};

export default function Organizations() {
  const [searchQuery, setSearchQuery] = useState("");
  const [toggleOrgId, setToggleOrgId] = useState<string | null>(null);
  const [deleteOrgId, setDeleteOrgId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
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

  const filteredOrganizations = useMemo(() => {
    if (!organizations) return [];
    if (!searchQuery.trim()) return organizations;
    const q = searchQuery.toLowerCase();
    return organizations.filter((org) =>
      org.name.toLowerCase().includes(q) || org.id.toLowerCase().includes(q)
    );
  }, [organizations, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredOrganizations.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedOrgs = filteredOrganizations.slice((safePage - 1) * pageSize, safePage * pageSize);

  // Reset page on search
  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Empresas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {organizations?.length ?? 0} empresa{(organizations?.length ?? 0) !== 1 ? "s" : ""} cadastrada{(organizations?.length ?? 0) !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={() => navigate("/super-admin/organizations/new")} className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-pink" size="default">
          <Plus className="mr-2 h-4 w-4" />
          Nova Empresa
        </Button>
      </div>

      {/* Search & Page Size */}
      <Card className="border-border">
        <CardContent className="pt-5 pb-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar por nome ou código da empresa..." value={searchQuery} onChange={(e) => handleSearch(e.target.value)} className="pl-10" />
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
              <span>Exibir</span>
              <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(1); }}>
                <SelectTrigger className="w-[70px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZES.map((s) => (
                    <SelectItem key={s} value={String(s)}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span>por página</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Empresa</TableHead>
                <TableHead className="font-semibold">Código</TableHead>
                <TableHead className="font-semibold">Plano</TableHead>
                <TableHead className="font-semibold">Criada em</TableHead>
                <TableHead className="font-semibold text-center">Status</TableHead>
                <TableHead className="font-semibold text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedOrgs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Building2 className="h-8 w-8" />
                      <p className="text-sm">{searchQuery ? "Nenhuma empresa encontrada" : "Nenhuma empresa cadastrada ainda"}</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedOrgs.map((org) => (
                  <TableRow key={org.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium text-foreground">{org.name}</TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">{org.id.slice(0, 8)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {org.subscription_plan ? (PLAN_LABELS[org.subscription_plan] || org.subscription_plan) : "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(org.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={org.is_active ? "default" : "secondary"} className={org.is_active ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20" : ""}>
                        {org.is_active ? "Ativa" : "Inativa"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => navigate(`/super-admin/organizations/${org.id}/edit`)} title="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setToggleOrgId(org.id)} title={org.is_active ? "Desativar" : "Ativar"}>
                          {org.is_active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteOrgId(org.id)} title="Excluir" className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Footer */}
        {filteredOrganizations.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-border text-sm text-muted-foreground">
            <span>
              Mostrando {((safePage - 1) * pageSize) + 1}–{Math.min(safePage * pageSize, filteredOrganizations.length)} de {filteredOrganizations.length}
            </span>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" disabled={safePage <= 1} onClick={() => setCurrentPage(safePage - 1)}>
                Anterior
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                .reduce<(number | "ellipsis")[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("ellipsis");
                  acc.push(p);
                  return acc;
                }, [])
                .map((item, idx) =>
                  item === "ellipsis" ? (
                    <span key={`e-${idx}`} className="px-2">…</span>
                  ) : (
                    <Button
                      key={item}
                      variant={item === safePage ? "default" : "outline"}
                      size="sm"
                      className="min-w-[36px]"
                      onClick={() => setCurrentPage(item)}
                    >
                      {item}
                    </Button>
                  )
                )}
              <Button variant="outline" size="sm" disabled={safePage >= totalPages} onClick={() => setCurrentPage(safePage + 1)}>
                Próximo
              </Button>
            </div>
          </div>
        )}
      </Card>

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
