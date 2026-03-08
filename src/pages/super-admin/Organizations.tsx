import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Plus, Pencil, Power, PowerOff, Search, Trash2, Building2, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Organization {
  id: string; nome: string; identificador: string; ativo: boolean; criado_em: string; settings: any;
  plano_assinatura?: string | null; email_contato?: string | null;
}

const PAGE_SIZES = [10, 20, 50];

const PLAN_COLORS: Record<string, string> = {
  plano_a: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  plano_b: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
  plano_c: "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30",
  plano_d: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
};

export default function Organizations() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [toggleOrgId, setToggleOrgId] = useState<string | null>(null);
  const [deleteOrgId, setDeleteOrgId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: organizations, isLoading } = useQuery({
    queryKey: ["super-admin-organizations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("organizacoes").select("*").order("criado_em", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: plans = [] } = useQuery({
    queryKey: ["subscription-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("planos_assinatura")
        .select("id_plano, nome_plano")
        .order("id_plano", { ascending: true });
      if (error) throw error;
      return data as { id_plano: string; nome_plano: string }[];
    },
  });

  const planNameById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of plans) map[p.id_plano] = p.nome_plano;
    return map;
  }, [plans]);

  const toggleStatus = useMutation({
    mutationFn: async ({ orgId, newStatus }: { orgId: string; newStatus: boolean }) => {
      const { error } = await supabase.from("organizacoes").update({ ativo: newStatus }).eq("id", orgId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["super-admin-organizations"] }); toast.success(t("superAdmin.organizations.statusUpdated")); setToggleOrgId(null); },
    onError: () => { toast.error(t("superAdmin.organizations.updateError")); },
  });

  const deleteOrganization = useMutation({
    mutationFn: async (orgId: string) => {
      const { error } = await supabase.from("organizacoes").delete().eq("id", orgId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["super-admin-organizations"] }); toast.success(t("superAdmin.organizations.orgDeleted")); setDeleteOrgId(null); },
    onError: () => { toast.error(t("superAdmin.organizations.deleteError")); },
  });

  const filteredOrganizations = useMemo(() => {
    if (!organizations) return [];
    if (!searchQuery.trim()) return organizations;
    const q = searchQuery.toLowerCase();
    return organizations.filter((org) =>
      org.nome.toLowerCase().includes(q) || org.identificador?.toLowerCase().includes(q) || org.id.toLowerCase().includes(q)
    );
  }, [organizations, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredOrganizations.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedOrgs = filteredOrganizations.slice((safePage - 1) * pageSize, safePage * pageSize);

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

  const activeCount = organizations?.filter((o) => o.ativo).length ?? 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="page-header">
          <h1>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
              <Building2 className="h-4 w-4 text-blue-500" />
            </div>
            {t("superAdmin.organizations.title")}
          </h1>
          <p>{t("superAdmin.organizations.subtitle", { count: organizations?.length ?? 0, active: activeCount })}</p>
        </div>
        <Button onClick={() => navigate("/super-admin/organizations/new")} className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-pink" size="default">
          <Plus className="mr-2 h-4 w-4" />
          {t("superAdmin.organizations.newCompany")}
        </Button>
      </div>

      {/* Search & Page Size */}
      <Card className="glass-card">
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder={t("superAdmin.organizations.searchPlaceholder")} value={searchQuery} onChange={(e) => handleSearch(e.target.value)} className="pl-10 h-9" />
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
              <span>{t("superAdmin.organizations.show")}</span>
              <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(1); }}>
                <SelectTrigger className="w-[65px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZES.map((s) => (
                    <SelectItem key={s} value={String(s)}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="font-semibold text-xs">{t("superAdmin.organizations.company")}</TableHead>
                <TableHead className="font-semibold text-xs hidden sm:table-cell">{t("superAdmin.organizations.identifier")}</TableHead>
                <TableHead className="font-semibold text-xs">{t("superAdmin.organizations.plan")}</TableHead>
                <TableHead className="font-semibold text-xs hidden md:table-cell">{t("superAdmin.organizations.createdAt")}</TableHead>
                <TableHead className="font-semibold text-xs text-center">{t("superAdmin.organizations.status")}</TableHead>
                <TableHead className="font-semibold text-xs text-right">{t("superAdmin.organizations.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedOrgs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Building2 className="h-8 w-8 opacity-30" />
                      <p className="text-sm">{searchQuery ? t("superAdmin.organizations.noResults") : t("superAdmin.organizations.noCompanies")}</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedOrgs.map((org) => (
                  <TableRow key={org.id} className="hover:bg-muted/20 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 shrink-0">
                          <Building2 className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <span className="font-medium text-foreground text-sm">{org.nome}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <span className="text-muted-foreground font-mono text-xs">{org.identificador || org.id.slice(0, 8)}</span>
                    </TableCell>
                    <TableCell>
                      {org.plano_assinatura ? (
                        <Badge variant="outline" className={`text-[10px] font-semibold ${PLAN_COLORS[org.plano_assinatura] || "bg-muted/50 text-foreground border-border"}`}>
                          {planNameById[org.plano_assinatura] || org.plano_assinatura}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground text-xs">
                      {new Date(org.criado_em).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={org.ativo ? "default" : "secondary"}
                        className={org.ativo
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20 text-[10px]"
                          : "text-[10px]"
                        }
                      >
                        {org.ativo ? t("superAdmin.dashboard.activeStatus") : t("superAdmin.dashboard.inactiveStatus")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {/* Mobile: dropdown */}
                      <div className="sm:hidden">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/super-admin/organizations/${org.id}/edit`)}>
                              <Pencil className="h-3.5 w-3.5 mr-2" /> {t("superAdmin.organizations.edit")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setToggleOrgId(org.id)}>
                              {org.ativo ? <PowerOff className="h-3.5 w-3.5 mr-2" /> : <Power className="h-3.5 w-3.5 mr-2" />}
                              {org.ativo ? t("superAdmin.organizations.deactivate") : t("superAdmin.organizations.activate")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setDeleteOrgId(org.id)} className="text-destructive focus:text-destructive">
                              <Trash2 className="h-3.5 w-3.5 mr-2" /> {t("superAdmin.organizations.delete")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      {/* Desktop: inline buttons */}
                      <div className="hidden sm:flex justify-end gap-0.5">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/super-admin/organizations/${org.id}/edit`)} title={t("superAdmin.organizations.edit")}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setToggleOrgId(org.id)} title={org.ativo ? t("superAdmin.organizations.deactivate") : t("superAdmin.organizations.activate")}>
                          {org.ativo ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteOrgId(org.id)} title={t("superAdmin.organizations.delete")}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {filteredOrganizations.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-border text-xs text-muted-foreground">
            <span>
              {((safePage - 1) * pageSize) + 1}–{Math.min(safePage * pageSize, filteredOrganizations.length)} de {filteredOrganizations.length}
            </span>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" className="h-7 text-xs" disabled={safePage <= 1} onClick={() => setCurrentPage(safePage - 1)}>
                {t("superAdmin.organizations.previous")}
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
                    <span key={`e-${idx}`} className="px-1.5">…</span>
                  ) : (
                    <Button key={item} variant={item === safePage ? "default" : "outline"} size="sm" className="min-w-[28px] h-7 text-xs" onClick={() => setCurrentPage(item)}>
                      {item}
                    </Button>
                  )
                )}
              <Button variant="outline" size="sm" className="h-7 text-xs" disabled={safePage >= totalPages} onClick={() => setCurrentPage(safePage + 1)}>
                {t("superAdmin.organizations.next")}
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Toggle Dialog */}
      <AlertDialog open={toggleOrgId !== null} onOpenChange={() => setToggleOrgId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("superAdmin.organizations.confirmAction")}</AlertDialogTitle>
            <AlertDialogDescription>
              {organizations?.find((o) => o.id === toggleOrgId)?.ativo
                ? t("superAdmin.organizations.deactivateConfirm")
                : t("superAdmin.organizations.activateConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => { const org = organizations?.find((o) => o.id === toggleOrgId); if (org) toggleStatus.mutate({ orgId: org.id, newStatus: !org.ativo }); }}>
              {t("superAdmin.organizations.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteOrgId !== null} onOpenChange={() => setDeleteOrgId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" /> {t("superAdmin.organizations.deleteCompany")}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p className="font-semibold text-destructive">{t("superAdmin.organizations.deleteWarning")}</p>
              <p>{t("superAdmin.organizations.deleteDescription", { name: organizations?.find((o) => o.id === deleteOrgId)?.nome ?? "" })}</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>{t("superAdmin.organizations.deleteItems")}</li>
                <li>{t("superAdmin.organizations.deleteClients")}</li>
                <li>{t("superAdmin.organizations.deleteAppointments")}</li>
                <li>{t("superAdmin.organizations.deleteAgentConfig")}</li>
                <li>{t("superAdmin.organizations.deleteWhatsapp")}</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteOrgId) deleteOrganization.mutate(deleteOrgId); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              <Trash2 className="mr-2 h-4 w-4" /> {t("superAdmin.organizations.yesDelete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
