import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Crown, Check, X, AlertCircle, Pencil, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface PlanConfig {
  id: string;
  id_plano: string;
  nome_plano: string;
  descricao_plano: string | null;
  atendimento_inteligente: boolean;
  agendamento_automatico: boolean;
  lembretes_automaticos: boolean;
  confirmacao_email: boolean;
  base_conhecimento: boolean;
  relatorios_avancados: boolean;
  integracao_whatsapp: boolean;
  multi_usuarios: boolean;
  personalizacao_agente: boolean;
  analytics: boolean;
  max_agendamentos_mes: number | null;
  max_mensagens_whatsapp_mes: number | null;
  max_usuarios: number | null;
  max_contatos: number | null;
  max_arquivos_conhecimento: number | null;
  workflow_id_n8n: string | null;
  preco_mensal: number | null;
  preco_anual: number | null;
}

const MAIN_FEATURES = [
  { key: "atendimento_inteligente", labelKey: "plan.smartService", descKey: "superAdmin.plans.descSmartService" },
  { key: "base_conhecimento", labelKey: "plan.knowledgeBase", descKey: "superAdmin.plans.descKnowledgeBase" },
  { key: "agendamento_automatico", labelKey: "plan.autoScheduling", descKey: "superAdmin.plans.descAutoScheduling" },
] as const;

const SECONDARY_FEATURES = [
  { key: "lembretes_automaticos", labelKey: "plan.autoReminders" },
  { key: "confirmacao_email", labelKey: "plan.emailConfirmation" },
  { key: "relatorios_avancados", labelKey: "plan.advancedReports" },
  { key: "integracao_whatsapp", labelKey: "plan.whatsappIntegration" },
  { key: "multi_usuarios", labelKey: "plan.multiUsers" },
  { key: "personalizacao_agente", labelKey: "plan.agentCustomization" },
  { key: "analytics", labelKey: "plan.analytics" },
] as const;

const QUERY_KEY = ["admin-subscription-plans"] as const;

function emptyPlanForm(plan: PlanConfig) {
  return {
    nome_plano: plan.nome_plano,
    descricao_plano: plan.descricao_plano ?? "",
    atendimento_inteligente: plan.atendimento_inteligente ?? false,
    agendamento_automatico: plan.agendamento_automatico ?? false,
    lembretes_automaticos: plan.lembretes_automaticos ?? false,
    confirmacao_email: plan.confirmacao_email ?? false,
    base_conhecimento: plan.base_conhecimento ?? false,
    relatorios_avancados: plan.relatorios_avancados ?? false,
    integracao_whatsapp: plan.integracao_whatsapp ?? false,
    multi_usuarios: plan.multi_usuarios ?? false,
    personalizacao_agente: plan.personalizacao_agente ?? false,
    analytics: plan.analytics ?? false,
    max_agendamentos_mes: plan.max_agendamentos_mes ?? "",
    max_mensagens_whatsapp_mes: plan.max_mensagens_whatsapp_mes ?? "",
    max_usuarios: plan.max_usuarios ?? "",
    max_contatos: plan.max_contatos ?? "",
    max_arquivos_conhecimento: plan.max_arquivos_conhecimento ?? "",
    workflow_id_n8n: plan.workflow_id_n8n ?? "",
    preco_mensal: plan.preco_mensal ?? "",
    preco_anual: plan.preco_anual ?? "",
  };
}

type PlanFormState = ReturnType<typeof emptyPlanForm>;

export default function Plans() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: plans = [], isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("planos_assinatura")
        .select("*")
        .order("id_plano", { ascending: true });
      if (error) throw error;
      return (data as unknown) as PlanConfig[];
    },
  });

  const updatePlan = useMutation({
    mutationFn: async ({ id, ...payload }: { id: string } & Partial<PlanConfig>) => {
      const update: Record<string, unknown> = { ...payload };
      if (typeof (payload as any).max_agendamentos_mes === "string") {
        const v = (payload as any).max_agendamentos_mes;
        (update as any).max_agendamentos_mes = v === "" || v === null ? null : Number(v);
      }
      if (typeof (payload as any).max_mensagens_whatsapp_mes === "string") {
        const v = (payload as any).max_mensagens_whatsapp_mes;
        (update as any).max_mensagens_whatsapp_mes = v === "" || v === null ? null : Number(v);
      }
      if (typeof (payload as any).max_usuarios === "string") {
        const v = (payload as any).max_usuarios;
        (update as any).max_usuarios = v === "" || v === null ? null : Number(v);
      }
      if (typeof (payload as any).max_contatos === "string") {
        const v = (payload as any).max_contatos;
        (update as any).max_contatos = v === "" || v === null ? null : Number(v);
      }
      if (typeof (payload as any).max_arquivos_conhecimento === "string") {
        const v = (payload as any).max_arquivos_conhecimento;
        (update as any).max_arquivos_conhecimento = v === "" || v === null ? null : Number(v);
      }
      if (typeof (payload as any).preco_mensal === "string") {
        const v = (payload as any).preco_mensal;
        (update as any).preco_mensal = v === "" || v === null ? null : Number(v);
      }
      if (typeof (payload as any).preco_anual === "string") {
        const v = (payload as any).preco_anual;
        (update as any).preco_anual = v === "" || v === null ? null : Number(v);
      }
      const { data, error } = await supabase
        .from("planos_assinatura")
        .update(update)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return (data as unknown) as PlanConfig;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success(t("superAdmin.plans.planUpdated"));
    },
    onError: (err: Error) => {
      toast.error(err.message || t("superAdmin.plans.updateError"));
    },
  });

  const [editingPlan, setEditingPlan] = useState<PlanConfig | null>(null);
  const [form, setForm] = useState<PlanFormState | null>(null);

  useEffect(() => {
    if (editingPlan) setForm(emptyPlanForm(editingPlan));
    else setForm(null);
  }, [editingPlan]);

  const handleSave = async () => {
    if (!editingPlan || !form) return;
    const payload: Partial<PlanConfig> & { id: string } = {
      id: editingPlan.id,
      nome_plano: form.nome_plano.trim(),
      descricao_plano: form.descricao_plano.trim() || null,
      atendimento_inteligente: form.atendimento_inteligente,
      agendamento_automatico: form.agendamento_automatico,
      lembretes_automaticos: form.lembretes_automaticos,
      confirmacao_email: form.confirmacao_email,
      base_conhecimento: form.base_conhecimento,
      relatorios_avancados: form.relatorios_avancados,
      integracao_whatsapp: form.integracao_whatsapp,
      multi_usuarios: form.multi_usuarios,
      personalizacao_agente: form.personalizacao_agente,
      analytics: form.analytics,
      max_agendamentos_mes: form.max_agendamentos_mes === "" ? null : Number(form.max_agendamentos_mes),
      max_mensagens_whatsapp_mes: form.max_mensagens_whatsapp_mes === "" ? null : Number(form.max_mensagens_whatsapp_mes),
      max_usuarios: form.max_usuarios === "" ? null : Number(form.max_usuarios),
      max_contatos: form.max_contatos === "" ? null : Number(form.max_contatos),
      max_arquivos_conhecimento: form.max_arquivos_conhecimento === "" ? null : Number(form.max_arquivos_conhecimento),
      workflow_id_n8n: form.workflow_id_n8n?.trim() || null,
      preco_mensal: form.preco_mensal === "" ? null : Number(form.preco_mensal),
      preco_anual: form.preco_anual === "" ? null : Number(form.preco_anual),
    };
    await updatePlan.mutateAsync(payload);
    setEditingPlan(null);
  };

  const setFormField = <K extends keyof PlanFormState>(key: K, value: PlanFormState[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : null));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
            <Crown className="h-4 w-4 text-amber-500" />
          </div>
          {t("superAdmin.plans.title")}
        </h1>
        <p>{t("superAdmin.plans.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {plans.map((plan, index) => {
          const isPopular = index === 1;
          return (
            <Card
              key={plan.id_plano}
              className={cn(
                "border transition-all hover:shadow-lg hover:shadow-primary/5 hover:border-primary/40",
                isPopular ? "border-primary/50 ring-1 ring-primary/20" : "border-border"
              )}
            >
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Crown className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-foreground text-base">{plan.nome_plano}</CardTitle>
                      <CardDescription className="text-muted-foreground text-xs mt-0.5">
                        {plan.descricao_plano}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isPopular && (
                      <span className="text-[10px] font-semibold uppercase tracking-wider bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                        {t("superAdmin.plans.popular")}
                      </span>
                    )}
                    <Button variant="outline" size="sm" onClick={() => setEditingPlan(plan)}>
                      <Pencil className="h-3.5 w-3.5 mr-1.5" />
                      {t("superAdmin.plans.edit")}
                    </Button>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-border space-y-2">
                  {plan.preco_mensal != null ? (
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-foreground">
                        R$ {Number(plan.preco_mensal).toFixed(2)}
                      </span>
                      <span className="text-sm text-muted-foreground">{t("superAdmin.plans.perMonth")}</span>
                    </div>
                  ) : (
                    <span className="text-base font-semibold text-muted-foreground">{t("superAdmin.plans.onRequest")}</span>
                  )}
                  {plan.preco_anual != null && (
                    <div className="flex items-baseline gap-1 text-sm">
                      <span className="font-semibold text-foreground">
                        R$ {Number(plan.preco_anual).toFixed(2)}
                      </span>
                      <span className="text-muted-foreground">{t("superAdmin.plans.perYear")}</span>
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-5">
                <div className="space-y-2.5">
                  <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                    {t("superAdmin.plans.mainFeatures")}
                  </h3>
                  <div className="space-y-2">
                    {MAIN_FEATURES.map((feature) => {
                      const isEnabled = plan[feature.key as keyof PlanConfig] as boolean;
                      return (
                        <div
                          key={feature.key}
                          className={cn(
                            "flex items-center gap-3 p-2.5 rounded-lg border transition-colors",
                            isEnabled ? "bg-primary/5 border-primary/20" : "bg-muted/30 border-border/50"
                          )}
                        >
                          {isEnabled ? (
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 shrink-0">
                              <Check className="h-3 w-3 text-primary" />
                            </div>
                          ) : (
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-muted shrink-0">
                              <X className="h-3 w-3 text-muted-foreground/40" />
                            </div>
                          )}
                          <div>
                            <p className={cn("text-xs font-medium", isEnabled ? "text-foreground" : "text-muted-foreground/50")}>
                              {t(feature.labelKey)}
                            </p>
                            <p className={cn("text-[10px]", isEnabled ? "text-muted-foreground" : "text-muted-foreground/30")}>
                              {t(feature.descKey)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2.5">
                  <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                    {t("superAdmin.plans.otherFeatures")}
                  </h3>
                  <div className="grid grid-cols-2 gap-1.5">
                    {SECONDARY_FEATURES.map((feature) => {
                      const isEnabled = plan[feature.key as keyof PlanConfig] as boolean;
                      return (
                        <div key={feature.key} className="flex items-center gap-2 py-1">
                          {isEnabled ? (
                            <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                          ) : (
                            <X className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />
                          )}
                          <span className={cn("text-[11px]", isEnabled ? "text-foreground" : "text-muted-foreground/40")}>
                            {t(feature.labelKey)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2.5 pt-4 border-t border-border">
                  <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                    {t("superAdmin.plans.limits")}
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: plan.max_agendamentos_mes, label: t("superAdmin.plans.appointmentsPerMonth") },
                      { value: plan.max_mensagens_whatsapp_mes, label: t("superAdmin.plans.messagesPerMonth") },
                      { value: plan.max_usuarios, label: t("plan.users") },
                      { value: plan.max_contatos, label: t("plan.clients") },
                      { value: plan.max_arquivos_conhecimento, label: t("superAdmin.plans.filesKnowledge") },
                    ].map((limit) => (
                      <div key={limit.label} className="text-center p-2.5 rounded-lg bg-muted/50 border border-border">
                        <p className="text-xl font-bold text-primary">{limit.value ?? "∞"}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{limit.label}</p>
                      </div>
                    ))}
                  </div>
                  {plan.workflow_id_n8n && (
                    <p className="text-[10px] text-muted-foreground mt-2 font-mono">
                      Workflow n8n: {plan.workflow_id_n8n}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Modal Editar Plano */}
      <Dialog open={!!editingPlan} onOpenChange={(open) => !open && setEditingPlan(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("superAdmin.plans.editPlan")}</DialogTitle>
            <DialogDescription>
              {t("superAdmin.plans.editPlanDesc")}
            </DialogDescription>
          </DialogHeader>
          {form && editingPlan && (
            <div className="space-y-5 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("superAdmin.plans.planName")}</Label>
                  <Input
                    value={form.nome_plano}
                    onChange={(e) => setFormField("nome_plano", e.target.value)}
                    placeholder="Ex: Plano Profissional"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("superAdmin.plans.planIdReadonly")}</Label>
                  <Input value={editingPlan.id_plano} disabled className="bg-muted" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("superAdmin.plans.workflowId")}</Label>
                <Input
                  value={form.workflow_id_n8n}
                  onChange={(e) => setFormField("workflow_id_n8n", e.target.value)}
                  placeholder="Ex: 1, abc-123 ou ID do workflow no n8n"
                  className="font-mono text-sm"
                />
                <p className="text-[10px] text-muted-foreground">{t("superAdmin.plans.workflowIdHint")}</p>
              </div>
              <div className="space-y-2">
                <Label>{t("superAdmin.plans.description")}</Label>
                <Textarea
                  value={form.descricao_plano}
                  onChange={(e) => setFormField("descricao_plano", e.target.value)}
                  placeholder="Descrição curta do plano"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">{t("superAdmin.plans.featuresToggle")}</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[...MAIN_FEATURES, ...SECONDARY_FEATURES].map((f) => (
                    <div key={f.key} className="flex items-center justify-between rounded-lg border p-2">
                      <span className="text-xs">{t(f.labelKey)}</span>
                      <Switch
                        checked={!!form[f.key]}
                        onCheckedChange={(v) => setFormField(f.key, v)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">{t("superAdmin.plans.limitsEmpty")}</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <Label className="text-xs">{t("superAdmin.plans.appointmentsPerMonth")}</Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.max_agendamentos_mes === "" ? "" : form.max_agendamentos_mes}
                      onChange={(e) => setFormField("max_agendamentos_mes", e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder="∞"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">{t("superAdmin.plans.messagesPerMonth")}</Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.max_mensagens_whatsapp_mes === "" ? "" : form.max_mensagens_whatsapp_mes}
                      onChange={(e) => setFormField("max_mensagens_whatsapp_mes", e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder="∞"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">{t("plan.users")}</Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.max_usuarios === "" ? "" : form.max_usuarios}
                      onChange={(e) => setFormField("max_usuarios", e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder="∞"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">{t("plan.clients")}</Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.max_contatos === "" ? "" : form.max_contatos}
                      onChange={(e) => setFormField("max_contatos", e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder="∞"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">{t("superAdmin.plans.filesKnowledge")}</Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.max_arquivos_conhecimento === "" ? "" : form.max_arquivos_conhecimento}
                      onChange={(e) => setFormField("max_arquivos_conhecimento", e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder="∞"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("superAdmin.plans.monthlyPrice")}</Label>
                  <Input
                    type="number"
                    step={0.01}
                    min={0}
                    value={form.preco_mensal === "" ? "" : form.preco_mensal}
                    onChange={(e) => setFormField("preco_mensal", e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="Sob consulta"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("superAdmin.plans.annualPrice")}</Label>
                  <Input
                    type="number"
                    step={0.01}
                    min={0}
                    value={form.preco_anual === "" ? "" : form.preco_anual}
                    onChange={(e) => setFormField("preco_anual", e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="Sob consulta"
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPlan(null)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSave} disabled={updatePlan.isPending || !form?.nome_plano?.trim()}>
              {updatePlan.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("superAdmin.plans.saveChanges")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-5 pb-5">
          <div className="flex gap-3">
            <AlertCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-foreground">{t("superAdmin.plans.aboutPlans")}</p>
              <p className="text-xs text-muted-foreground">
                {t("superAdmin.plans.aboutPlansDesc")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
