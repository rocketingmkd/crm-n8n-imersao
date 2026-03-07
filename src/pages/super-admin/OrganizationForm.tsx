import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Save, Upload, X, Workflow, Loader2, MessageSquare, Check, XCircle, Clock, Users, UserPlus, Trash2, Building2, Image, Zap, AlertTriangle, Link2Off } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
import {
  Avatar, AvatarFallback, AvatarImage,
} from "@/components/ui/avatar";

interface OrganizationFormData {
  name: string;
  contact_email: string;
  rotulo_entidade: string;
  rotulo_entidade_plural: string;
  adminEmail: string;
  adminPassword: string;
  adminFullName: string;
  ativo: boolean;
  plano_assinatura: 'plano_a' | 'plano_b' | 'plano_c' | 'plano_d';
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  profissional: "Profissional",
  assistente: "Assistente",
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30",
  profissional: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
  assistente: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
};

export default function OrganizationForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [isCreatingWorkflow, setIsCreatingWorkflow] = useState(false);
  const [isConfiguringWebhook, setIsConfiguringWebhook] = useState(false);
  const [isDisconnectingInstance, setIsDisconnectingInstance] = useState(false);
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("info");
  const [newUserForm, setNewUserForm] = useState({
    nome_completo: "",
    email: "",
    password: "",
    role: "profissional" as "admin" | "profissional" | "assistente",
  });

  const {
    register, handleSubmit, formState: { errors }, reset, setValue, watch,
  } = useForm<OrganizationFormData>({
    defaultValues: {
      ativo: true,
      plano_assinatura: 'plano_a',
      rotulo_entidade: 'Cliente',
      rotulo_entidade_plural: 'Clientes',
    },
  });

  const isActive = watch("ativo");
  const subscriptionPlan = watch("plano_assinatura");

  const { data: plans = [] } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('planos_assinatura')
        .select('*')
        .order('id_plano', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const currentPlan = useMemo(() => plans.find(p => p.id_plano === subscriptionPlan), [plans, subscriptionPlan]);
  const maxUsers = currentPlan?.max_usuarios ?? null;
  const isSingleUserPlan = maxUsers === 1;

  // Upload de logo para Supabase Storage
  const uploadLogo = async (file: File, orgId: string): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${orgId}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;
    const bucketName = 'organization-logos';

    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(b => b.name === bucketName);

    if (!bucketExists) {
      const { error: createErr } = await supabase.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: 2 * 1024 * 1024,
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml'],
      });
      if (createErr && !createErr.message?.includes('already exists')) {
        throw new Error(`Não foi possível criar o bucket de logos. Erro: ${createErr.message}`);
      }
    }

    const { error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, { cacheControl: '3600', upsert: true });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { toast.error('Imagem muito grande. Máximo 2MB.'); return; }
      if (!file.type.startsWith('image/')) { toast.error('Apenas imagens são permitidas.'); return; }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => { setLogoFile(null); setLogoPreview(null); };

  const handleConfigureWebhook = async () => {
    if (!whatsappInstance) { toast.error("Nenhuma instância WhatsApp encontrada"); return; }
    try {
      setIsConfiguringWebhook(true);
      const payload = {
        instanceId: whatsappInstance.id_instancia,
        token: whatsappInstance.token,
        instanceName: whatsappInstance.nome_instancia,
        adminField01: (whatsappInstance as any).campo_admin_01,
        phone: (whatsappInstance as any).telefone,
        organizationId: id,
        organizationName: organization?.nome,
      };
      const response = await fetch(`${import.meta.env.VITE_N8N_WEBHOOK_URL}configurar-webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) { const error = await response.json(); throw new Error(error.message || "Erro ao configurar webhook"); }
      const result = await response.json();
      const webhookData = Array.isArray(result) ? result[0] : result;
      if (webhookData && webhookData.url) {
        const { error: updateError } = await supabase.from("instancias_whatsapp").update({ url_webhook: webhookData.url }).eq("id", whatsappInstance.id);
        if (updateError) { toast.error("Webhook configurado mas erro ao salvar no banco: " + updateError.message); }
        else {
          toast.success("Webhook configurado com sucesso!");
          setActiveTab("whatsapp");
          await refetchWhatsapp();
        }
      } else { toast.success("Webhook configurado!"); setActiveTab("whatsapp"); }
    } catch (error: any) { toast.error(error.message || "Erro ao configurar webhook"); }
    finally { setIsConfiguringWebhook(false); }
  };

  const handleDisconnectInstance = async () => {
    if (!whatsappInstance || !id) return;
    try {
      setIsDisconnectingInstance(true);
      setShowDisconnectDialog(false);
      const webhookBase = import.meta.env.VITE_N8N_WEBHOOK_URL || "https://webhook.agentes-n8n.com.br/webhook/";
      const payload = {
        instanceId: whatsappInstance.id_instancia,
        token: whatsappInstance.token,
        instanceName: whatsappInstance.nome_instancia,
        adminField01: (whatsappInstance as any).campo_admin_01,
        phone: (whatsappInstance as any).telefone ?? (whatsappInstance as any).phone ?? "",
        organizationId: id,
        organizationName: organization?.nome ?? "",
      };
      const response = await fetch(`${webhookBase.replace(/\/?$/, "/")}apagar-instancia`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || "Erro ao apagar instância no servidor");
      }
      const { error: deleteError } = await supabase.from("instancias_whatsapp").delete().eq("id", whatsappInstance.id);
      if (deleteError) {
        toast.error("Instância apagada no servidor, mas falha ao remover no banco: " + deleteError.message);
        return;
      }
      await refetchWhatsapp();
      toast.success("Instância desconectada com sucesso. Conexão do WhatsApp removida.");
    } catch (error: any) {
      toast.error(error.message || "Erro ao desconectar instância");
    } finally {
      setIsDisconnectingInstance(false);
    }
  };

  const handleCreateWorkflow = async () => {
    if (!id) { toast.error("ID da organização não encontrado"); return; }
    try {
      setIsCreatingWorkflow(true);
      const { data: orgData, error: orgError } = await supabase.from("organizacoes").select("*").eq("id", id).single();
      if (orgError) throw orgError;
      const { data: agentData } = await supabase.from("config_agente_ia").select("*").eq("id_organizacao", id).single();
      const { data: whatsappData } = await supabase.from("instancias_whatsapp").select("*").eq("id_organizacao", id).single();
      const { data: settingsData } = await supabase.from("configuracoes").select("*").eq("id_organizacao", id).single();
      const { data: profilesData } = await supabase.from("perfis").select("*").eq("id_organizacao", id);

      const planNumberMap: Record<string, number> = { 'plano_a': 1, 'plano_b': 2, 'plano_c': 3, 'plano_d': 4 };
      const payload = {
        organization: orgData, agent_ia_config: agentData || null, whatsapp_instance: whatsappData || null,
        settings: settingsData || null, profiles: profilesData || [], plan_number: planNumberMap[orgData?.plano_assinatura] || 1,
        timestamp: new Date().toISOString(),
      };
      const response = await fetch(`${import.meta.env.VITE_N8N_WEBHOOK_URL}criacao-fluxo`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      if (!response.ok) { const error = await response.json(); throw new Error(error.message || "Erro ao criar workflow"); }
      toast.success("Workflow criado com sucesso!");
    } catch (error: any) { toast.error(error.message || "Erro ao criar workflow"); }
    finally { setIsCreatingWorkflow(false); }
  };

  const { data: organization } = useQuery({
    queryKey: ["organization", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase.from("organizacoes").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
    enabled: isEditing,
  });

  const { data: whatsappInstance, isLoading: isLoadingWhatsapp, refetch: refetchWhatsapp } = useQuery({
    queryKey: ["whatsapp-instance", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase.from("instancias_whatsapp").select("*").eq("id_organizacao", id).single();
      if (error && error.code !== "PGRST116") console.error("Erro ao buscar instância WhatsApp:", error);
      return data || null;
    },
    enabled: isEditing,
  });

  const { data: orgUsers = [], refetch: refetchUsers } = useQuery({
    queryKey: ["org-users", id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await (supabase as any)
        .from("perfis")
        .select("id, nome_completo, funcao, ativo, criado_em, url_avatar")
        .eq("id_organizacao", id)
        .eq("super_admin", false)
        .order("criado_em", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isEditing,
  });

  const isUserLimitReached = maxUsers !== null && orgUsers.length >= maxUsers;

  useEffect(() => {
    if (organization) {
      reset({
        name: organization.nome, contact_email: organization.email_contato || "",
        rotulo_entidade: organization.rotulo_entidade || 'Cliente',
        rotulo_entidade_plural: organization.rotulo_entidade_plural || 'Clientes',
        ativo: organization.ativo,
        plano_assinatura: (organization.plano_assinatura || 'plano_a') as OrganizationFormData['plano_assinatura'],
        adminEmail: "", adminPassword: "", adminFullName: "",
      });
      setCurrentLogoUrl(organization.url_logo);
    }
  }, [organization, reset]);

  const saveMutation = useMutation({
    mutationFn: async (data: OrganizationFormData) => {
      let logoUrl = currentLogoUrl;
      if (logoFile && id) {
        try {
          setUploadingLogo(true);
          logoUrl = await uploadLogo(logoFile, id);
          toast.success('Logo enviado com sucesso!');
        } catch (error) { toast.error('Erro ao enviar logo'); throw error; }
        finally { setUploadingLogo(false); }
      }

      if (isEditing) {
        const { error } = await supabase.from('organizacoes').update({
          nome: data.name, email_contato: data.contact_email || null,
          rotulo_entidade: data.rotulo_entidade || 'Cliente', rotulo_entidade_plural: data.rotulo_entidade_plural || 'Clientes',
          ativo: data.ativo, url_logo: logoUrl, plano_assinatura: data.plano_assinatura,
        }).eq('id', id);
        if (error) throw error;
      } else {
        const { data: result, error } = await supabase.functions.invoke('criar-organizacao', {
          body: {
            organizationName: data.name, adminEmail: data.adminEmail, adminPassword: data.adminPassword,
            adminFullName: data.adminFullName, isActive: data.ativo, subscriptionPlan: data.plano_assinatura,
          },
        });
        if (error) {
          const body = await (error as any).context?.json?.().catch(() => null);
          throw new Error(body?.error || error.message || "Erro ao criar organização");
        }
        const newOrgId = result?.organization?.id || result?.organizationId || result?.organization_id;
        if (logoFile && newOrgId) {
          try {
            setUploadingLogo(true);
            const newLogoUrl = await uploadLogo(logoFile, newOrgId);
            await supabase.from('organizacoes').update({ url_logo: newLogoUrl }).eq('id', newOrgId);
          } catch { toast.error('Organização criada, mas houve erro ao enviar o logo.'); }
          finally { setUploadingLogo(false); }
        }
      }
    },
    onSuccess: () => { toast.success(isEditing ? "Organização atualizada com sucesso!" : "Organização criada com sucesso!"); navigate("/super-admin/organizations"); },
    onError: (error: any) => { toast.error(error.message || "Erro ao salvar organização"); },
  });

  const invokeFunction = async (body: object) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error("Sessão expirada. Faça login novamente.");
    const url = `${import.meta.env.VITE_SUPABASE_URL || "https://detsacgocmirxkgjusdf.supabase.co"}/functions/v1/gerenciar-usuarios-organizacao`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.access_token}`,
        "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "",
      },
      body: JSON.stringify(body),
    });
    let result: any = {};
    try { result = await res.json(); } catch {}
    if (!res.ok) throw new Error(result?.error || result?.message || `Erro HTTP ${res.status}`);
    if (result?.error) throw new Error(result.error);
    return result;
  };

  const handleAddUser = async () => {
    if (!newUserForm.nome_completo || !newUserForm.email || !newUserForm.password) { toast.error("Preencha todos os campos"); return; }
    if (!id) { toast.error("Empresa não encontrada"); return; }
    if (isUserLimitReached) { toast.error(`Limite de ${maxUsers} usuários atingido para este plano`); return; }
    try {
      toast.loading("Criando usuário...", { id: "create-user" });
      await invokeFunction({ action: "create", organizationId: id, userData: { fullName: newUserForm.nome_completo, email: newUserForm.email, password: newUserForm.password, role: isSingleUserPlan ? "admin" : newUserForm.role } });
      toast.success("Usuário criado com sucesso!", { id: "create-user" });
      setIsAddUserModalOpen(false);
      setNewUserForm({ nome_completo: "", email: "", password: "", role: "profissional" });
      refetchUsers();
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar usuário", { id: "create-user" });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      toast.loading("Deletando usuário...", { id: "delete-user" });
      await invokeFunction({ action: "delete", userId });
      toast.success("Usuário deletado com sucesso!", { id: "delete-user" });
      setUserToDelete(null);
      refetchUsers();
    } catch (error: any) {
      toast.error(error.message || "Erro ao deletar usuário", { id: "delete-user" });
    }
  };

  const onSubmit = (data: OrganizationFormData) => saveMutation.mutate(data);

  return (
    <div className="space-y-6 min-h-screen p-4 md:p-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/super-admin/organizations")} className="text-primary hover:bg-primary/10">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            {isEditing ? "Editar Organização" : "Nova Organização"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isEditing ? "Gerencie as configurações da empresa" : "Crie uma nova empresa e seu administrador"}
          </p>
        </div>
        <Button
          type="button"
          onClick={handleSubmit(onSubmit)}
          disabled={saveMutation.isPending || uploadingLogo}
          className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-md"
        >
          <Save className="mr-2 h-4 w-4" />
          {uploadingLogo ? "Enviando..." : saveMutation.isPending ? "Salvando..." : isEditing ? "Salvar" : "Criar"}
        </Button>
      </div>

      {isEditing ? (
        /* ═══ EDITING: Tabs Layout ═══ */
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="w-full flex flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="info" className="flex-1 min-w-[120px] gap-1.5 text-xs sm:text-sm">
              <Building2 className="h-4 w-4" /> Informações
            </TabsTrigger>
            <TabsTrigger value="logo" className="flex-1 min-w-[100px] gap-1.5 text-xs sm:text-sm">
              <Image className="h-4 w-4" /> Logo
            </TabsTrigger>
            <TabsTrigger value="workflows" className="flex-1 min-w-[120px] gap-1.5 text-xs sm:text-sm">
              <Zap className="h-4 w-4" /> Automações
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className="flex-1 min-w-[110px] gap-1.5 text-xs sm:text-sm">
              <MessageSquare className="h-4 w-4" /> WhatsApp
            </TabsTrigger>
            <TabsTrigger value="users" className="flex-1 min-w-[100px] gap-1.5 text-xs sm:text-sm">
              <Users className="h-4 w-4" /> Usuários
              <Badge variant="outline" className="ml-1 text-[10px] h-5 px-1.5">{orgUsers.length}</Badge>
            </TabsTrigger>
          </TabsList>

          {/* ═══ TAB: Informações ═══ */}
          <TabsContent value="info">
            <form onSubmit={handleSubmit(onSubmit)}>
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    Informações da Empresa
                  </CardTitle>
                  <CardDescription>Dados básicos e configurações da empresa</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div>
                    <Label htmlFor="name">Nome da Empresa *</Label>
                    <Input id="name" {...register("name", { required: "Nome é obrigatório" })} placeholder="Ex: Empresa São Paulo" className="mt-1.5" />
                    {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
                  </div>

                  <div>
                    <Label htmlFor="contact_email">E-mail de Contato</Label>
                    <Input id="contact_email" type="email" {...register("contact_email")} placeholder="contato@empresa.com" className="mt-1.5" />
                    <p className="text-xs text-muted-foreground mt-1">E-mail usado para envio de confirmações de agendamento</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="rotulo_entidade">Como chama seus clientes? (singular)</Label>
                      <Input id="rotulo_entidade" {...register("rotulo_entidade")} placeholder="Ex: Paciente, Cliente, Aluno" className="mt-1.5" />
                    </div>
                    <div>
                      <Label htmlFor="rotulo_entidade_plural">Plural</Label>
                      <Input id="rotulo_entidade_plural" {...register("rotulo_entidade_plural")} placeholder="Ex: Pacientes, Clientes, Alunos" className="mt-1.5" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="plano_assinatura">Pacote de Assinatura *</Label>
                    <select
                      id="plano_assinatura"
                      {...register("plano_assinatura", { required: "Plano é obrigatório" })}
                      className="w-full h-10 px-3 rounded-xl bg-background/60 backdrop-blur-sm border border-input text-foreground focus:border-primary focus:ring-1 focus:ring-primary"
                    >
                      {plans.map((plan) => (
                        <option key={plan.id_plano} value={plan.id_plano}>
                          {plan.nome_plano} - R$ {plan.preco_mensal?.toFixed(2)}/mês
                        </option>
                      ))}
                    </select>

                    {currentPlan && (
                      <div className="mt-3 p-4 rounded-xl liquid-glass-subtle">
                        <p className="text-sm text-foreground mb-3">{currentPlan.descricao_plano}</p>
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-primary uppercase tracking-wide">Recursos Inclusos:</p>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { key: 'atendimento_inteligente', label: 'Atendimento Inteligente' },
                              { key: 'agendamento_automatico', label: 'Agendamento Automático' },
                              { key: 'lembretes_automaticos', label: 'Lembretes Automáticos' },
                              { key: 'confirmacao_email', label: 'Confirmação por Email' },
                              { key: 'base_conhecimento', label: 'Base de Conhecimento' },
                              { key: 'relatorios_avancados', label: 'Relatórios Avançados' },
                              { key: 'integracao_whatsapp', label: 'Integração WhatsApp' },
                              { key: 'multi_usuarios', label: 'Múltiplos Usuários' },
                              { key: 'personalizacao_agente', label: 'Personalização do Agente' },
                              { key: 'analytics', label: 'Analytics' },
                            ].filter(f => (currentPlan as any)[f.key]).map(f => (
                              <div key={f.key} className="flex items-center gap-2 text-xs text-foreground">
                                <Check className="h-3 w-3 text-primary" />
                                <span>{f.label}</span>
                              </div>
                            ))}
                          </div>
                          <div className="mt-3 pt-3 border-t border-border/50">
                            <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">Limites:</p>
                            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                              <div><span className="font-medium">Agendamentos/mês:</span> {currentPlan.max_agendamentos_mes || 'Ilimitado'}</div>
                              <div><span className="font-medium">Mensagens/mês:</span> {currentPlan.max_mensagens_whatsapp_mes || 'Ilimitado'}</div>
                              <div><span className="font-medium">Usuários:</span> {currentPlan.max_usuarios || 'Ilimitado'}</div>
                              <div><span className="font-medium">Clientes:</span> {currentPlan.max_contatos ?? 'Ilimitado'}</div>
                              <div><span className="font-medium">Arquivos (BC):</span> {(currentPlan as any).max_arquivos_conhecimento ?? 'Ilimitado'}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl liquid-glass-subtle">
                    <div className="space-y-0.5">
                      <Label htmlFor="ativo">Empresa Ativa</Label>
                      <p className="text-xs text-muted-foreground">Empresas inativas não podem acessar o sistema</p>
                    </div>
                    <Switch id="ativo" checked={isActive} onCheckedChange={(checked) => setValue("ativo", checked)} />
                  </div>
                </CardContent>
              </Card>
            </form>
          </TabsContent>

          {/* ═══ TAB: Logo ═══ */}
          <TabsContent value="logo">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Image className="h-5 w-5 text-primary" />
                  Logo da Empresa
                </CardTitle>
                <CardDescription>Faça upload do logo que aparecerá no sistema da empresa</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {(logoPreview || currentLogoUrl) && (
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      <img
                        src={logoPreview || currentLogoUrl || ''}
                        alt="Logo"
                        className="h-24 w-24 object-contain rounded-xl border border-border bg-muted/50 p-3"
                      />
                      {logoPreview && (
                        <button type="button" onClick={removeLogo} className="absolute -top-2 -right-2 rounded-full bg-destructive p-1 text-destructive-foreground hover:bg-destructive/90">
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{logoPreview ? 'Novo logo (não salvo)' : 'Logo atual'}</p>
                      <p className="text-xs text-muted-foreground">{logoPreview ? 'Clique em "Salvar" para aplicar' : 'Faça upload para substituir'}</p>
                    </div>
                  </div>
                )}

                <div>
                  <label
                    htmlFor="logo"
                    className="flex cursor-pointer items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted/30 px-6 py-12 text-center transition-colors hover:border-primary/50 hover:bg-muted/50"
                  >
                    <Upload className="h-8 w-8 text-primary" />
                    <div>
                      <span className="text-sm font-medium text-foreground block">Clique para fazer upload</span>
                      <span className="text-xs text-muted-foreground">PNG, JPG ou SVG. Máximo 2MB. Recomendado: 200x200px</span>
                    </div>
                  </label>
                  <input id="logo" type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ TAB: Automações ═══ */}
          <TabsContent value="workflows">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Automações e Workflows
                </CardTitle>
                <CardDescription>Configure fluxos de trabalho automatizados para esta empresa</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-6 rounded-xl liquid-glass-subtle text-center">
                  <Workflow className="h-12 w-12 mx-auto mb-4 text-primary" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">Criar Workflow Automatizado</h3>
                  <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                    Gera automaticamente os fluxos de atendimento, agendamento e notificação para esta empresa no n8n
                  </p>
                  <Button
                    type="button"
                    onClick={handleCreateWorkflow}
                    disabled={isCreatingWorkflow}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-md px-8"
                  >
                    {isCreatingWorkflow ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Criando Workflow...</>
                    ) : (
                      <><Workflow className="mr-2 h-4 w-4" /> Criar Workflow</>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ TAB: WhatsApp ═══ */}
          <TabsContent value="whatsapp">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Instância WhatsApp
                </CardTitle>
                <CardDescription>Informações de conexão do WhatsApp desta empresa</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingWhatsapp ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span className="ml-2 text-muted-foreground">Carregando...</span>
                  </div>
                ) : whatsappInstance ? (
                  <div className="space-y-5">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-foreground font-medium">Status:</span>
                      {whatsappInstance.situacao === 'conectado' ? (
                        <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"><Check className="h-3 w-3 mr-1" /> Conectado</Badge>
                      ) : whatsappInstance.situacao === 'pendente' ? (
                        <Badge variant="outline" className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"><Clock className="h-3 w-3 mr-1" /> Aguardando</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-destructive/15 text-destructive border-destructive/30"><XCircle className="h-3 w-3 mr-1" /> {whatsappInstance.situacao}</Badge>
                      )}
                    </div>

                    <div className="grid gap-3 p-4 rounded-xl liquid-glass-subtle">
                      {[
                        { label: "Nome da Instância", value: whatsappInstance.nome_instancia },
                        { label: "Empresa", value: (whatsappInstance as any).campo_admin_01 },
                        { label: "Telefone", value: (whatsappInstance as any).telefone, mono: true },
                        { label: "Instance ID", value: whatsappInstance.id_instancia, mono: true, small: true },
                        { label: "Token", value: whatsappInstance.token, mono: true, small: true },
                        { label: "Criado em", value: new Date(whatsappInstance.criado_em).toLocaleString('pt-BR') },
                      ].map((item) => (
                        <div key={item.label} className="flex items-center justify-between border-b border-border/30 pb-2 last:border-0 last:pb-0">
                          <span className="text-sm text-muted-foreground">{item.label}:</span>
                          <span className={`text-sm ${item.mono ? 'font-mono' : ''} ${item.small ? 'text-xs text-muted-foreground break-all max-w-[200px] text-right' : 'text-foreground'}`}>{item.value}</span>
                        </div>
                      ))}
                    </div>

                    {(whatsappInstance as any).url_webhook && (
                      <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
                        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                          <Workflow className="h-4 w-4 text-primary" /> Webhook Configurado
                        </h4>
                        <div className="bg-muted/50 rounded-lg p-2 border border-border/50">
                          <p className="text-xs font-mono text-foreground break-all">{(whatsappInstance as any).url_webhook}</p>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-primary">
                          <Check className="h-3 w-3" /> Webhook ativo e recebendo eventos
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button
                        type="button"
                        onClick={handleConfigureWebhook}
                        disabled={isConfiguringWebhook || isDisconnectingInstance || whatsappInstance.situacao !== 'conectado'}
                        className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        {isConfiguringWebhook ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Configurando Webhook...</>
                        ) : (
                          <><Workflow className="mr-2 h-4 w-4" /> {(whatsappInstance as any).url_webhook ? 'Reconfigurar Webhook' : 'Configurar Webhook'}</>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        disabled={isConfiguringWebhook || isDisconnectingInstance}
                        onClick={() => setShowDisconnectDialog(true)}
                      >
                        {isDisconnectingInstance ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Desconectando...</>
                        ) : (
                          <><Link2Off className="mr-2 h-4 w-4" /> Desconectar</>
                        )}
                      </Button>
                    </div>
                    <AlertDialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
                      <AlertDialogContent>
                        <AlertDialogTitle>Desconectar instância WhatsApp?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Isso removerá a conexão do WhatsApp desta empresa. A instância será apagada no servidor e no sistema. O cliente precisará conectar novamente se quiser usar o WhatsApp.
                        </AlertDialogDescription>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={(e) => { e.preventDefault(); handleDisconnectInstance(); }}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Desconectar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <MessageSquare className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-foreground font-medium">Nenhuma instância WhatsApp conectada</p>
                    <p className="text-sm text-muted-foreground mt-1">O cliente ainda não conectou o WhatsApp</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ TAB: Usuários ═══ */}
          <TabsContent value="users">
            <Card className="border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      Usuários da Empresa
                    </CardTitle>
                    <CardDescription>
                      {orgUsers.length} usuário{orgUsers.length !== 1 ? 's' : ''} cadastrado{orgUsers.length !== 1 ? 's' : ''}
                      {maxUsers !== null && <span className="ml-1">· Limite: {maxUsers}</span>}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {isUserLimitReached && (
                      <Badge variant="outline" className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-xs gap-1">
                        <AlertTriangle className="h-3 w-3" /> Limite atingido
                      </Badge>
                    )}
                    <Button
                      type="button"
                      onClick={() => {
                        if (isUserLimitReached) {
                          toast.error(`Limite de ${maxUsers} usuários atingido. Atualize o plano para adicionar mais.`);
                          return;
                        }
                        if (isSingleUserPlan) {
                          setNewUserForm(prev => ({ ...prev, role: "admin" }));
                        }
                        setIsAddUserModalOpen(true);
                      }}
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                      disabled={isUserLimitReached}
                    >
                      <UserPlus className="h-4 w-4 mr-2" /> Adicionar
                    </Button>
                  </div>
                </div>

                {/* Progress bar for user limit */}
                {maxUsers !== null && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>{orgUsers.length} de {maxUsers} usuários</span>
                      <span>{Math.round((orgUsers.length / maxUsers) * 100)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${orgUsers.length >= maxUsers ? 'bg-destructive' : orgUsers.length >= maxUsers * 0.8 ? 'bg-amber-500' : 'bg-primary'}`}
                        style={{ width: `${Math.min((orgUsers.length / maxUsers) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {orgUsers.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-foreground font-medium">Nenhum usuário cadastrado</p>
                    <p className="text-sm text-muted-foreground mt-1">Adicione usuários para que possam acessar o sistema</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {orgUsers.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-4 rounded-xl liquid-glass-subtle transition-all hover:shadow-md">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={(user as any).url_avatar || undefined} alt={user.nome_completo} />
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                              {user.nome_completo?.charAt(0).toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-semibold text-foreground">{user.nome_completo}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className={`text-[10px] ${ROLE_COLORS[user.funcao] || ''}`}>
                                {ROLE_LABELS[user.funcao] || user.funcao}
                              </Badge>
                              <Badge variant="outline" className={`text-[10px] ${user.ativo ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' : 'text-muted-foreground'}`}>
                                {user.ativo ? 'Ativo' : 'Inativo'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <Button type="button" variant="ghost" size="icon" onClick={() => setUserToDelete(user.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        /* ═══ CREATING: Sequential Cards ═══ */
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Informações da Empresa</CardTitle>
              <CardDescription>Dados básicos da empresa</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Nome da Empresa *</Label>
                <Input id="name" {...register("name", { required: "Nome é obrigatório" })} placeholder="Ex: Empresa São Paulo" className="mt-1.5" />
                {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="plano_assinatura">Pacote de Assinatura *</Label>
                <select
                  id="plano_assinatura"
                  {...register("plano_assinatura", { required: "Plano é obrigatório" })}
                  className="w-full h-10 px-3 rounded-xl bg-background/60 backdrop-blur-sm border border-input text-foreground focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  {plans.map((plan) => (
                    <option key={plan.id_plano} value={plan.id_plano}>{plan.nome_plano} - R$ {plan.preco_mensal?.toFixed(2)}/mês</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="ativo">Empresa Ativa</Label>
                  <p className="text-xs text-muted-foreground">Empresas inativas não podem acessar o sistema</p>
                </div>
                <Switch id="ativo" checked={isActive} onCheckedChange={(checked) => setValue("ativo", checked)} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <CardTitle>Administrador da Organização</CardTitle>
              <CardDescription>Criar usuário admin para gerenciar a empresa</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="adminFullName">Nome Completo *</Label>
                <Input id="adminFullName" {...register("adminFullName", { required: "Nome completo é obrigatório" })} placeholder="ric neves" className="mt-1.5" />
                {errors.adminFullName && <p className="text-xs text-destructive mt-1">{errors.adminFullName.message}</p>}
              </div>
              <div>
                <Label htmlFor="adminEmail">Email *</Label>
                <Input id="adminEmail" type="email" {...register("adminEmail", { required: "Email é obrigatório" })} placeholder="admin@empresa.com" className="mt-1.5" />
                {errors.adminEmail && <p className="text-xs text-destructive mt-1">{errors.adminEmail.message}</p>}
              </div>
              <div>
                <Label htmlFor="adminPassword">Senha *</Label>
                <Input id="adminPassword" type="password" {...register("adminPassword", { required: "Senha é obrigatória", minLength: { value: 6, message: "Mínimo 6 caracteres" } })} placeholder="Mínimo 6 caracteres" className="mt-1.5" />
                {errors.adminPassword && <p className="text-xs text-destructive mt-1">{errors.adminPassword.message}</p>}
              </div>
            </CardContent>
          </Card>
        </form>
      )}

      {/* Modal Adicionar Usuário */}
      <Dialog open={isAddUserModalOpen} onOpenChange={setIsAddUserModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Novo Usuário</DialogTitle>
            <DialogDescription>Crie um novo usuário para acessar esta empresa</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="user_nome_completo">Nome Completo *</Label>
              <Input id="user_nome_completo" placeholder="ric neves" value={newUserForm.nome_completo} onChange={(e) => setNewUserForm({ ...newUserForm, nome_completo: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user_email">Email *</Label>
              <Input id="user_email" type="email" placeholder="usuario@email.com" value={newUserForm.email} onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user_password">Senha *</Label>
              <Input id="user_password" type="password" placeholder="Mínimo 6 caracteres" value={newUserForm.password} onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })} />
            </div>
            {isSingleUserPlan ? (
              <div className="space-y-2">
                <Label>Função</Label>
                <p className="text-sm text-muted-foreground py-2">Este plano permite apenas 1 usuário (Administrador).</p>
                <Input readOnly value="Administrador" className="bg-muted" />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="user_role">Função *</Label>
                <Select value={newUserForm.role} onValueChange={(value: any) => setNewUserForm({ ...newUserForm, role: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="profissional">Profissional</SelectItem>
                    <SelectItem value="assistente">Assistente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddUserModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleAddUser}>Criar Usuário</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog Deletar Usuário */}
      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar Usuário</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja deletar este usuário? Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => userToDelete && handleDeleteUser(userToDelete)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
