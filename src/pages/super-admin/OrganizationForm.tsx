import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Save, Upload, X, Workflow, Sparkles, Loader2, MessageSquare, Check, XCircle, Clock, Users, UserPlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [newUserForm, setNewUserForm] = useState({
    nome_completo: "",
    email: "",
    password: "",
    role: "profissional" as "admin" | "profissional" | "assistente",
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
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
  
  // Carregar planos disponíveis
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

  // Upload de logo para Supabase Storage
  const uploadLogo = async (file: File, orgId: string): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${orgId}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;
    const bucketName = 'organization-logos';

    // Garantir que o bucket existe (cria se não existir)
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(b => b.name === bucketName);

    if (!bucketExists) {
      console.log(`Bucket '${bucketName}' não existe, criando...`);
      const { error: createErr } = await supabase.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: 2 * 1024 * 1024,
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml'],
      });
      if (createErr && !createErr.message?.includes('already exists')) {
        console.error('Erro ao criar bucket:', createErr);
        throw new Error(`Não foi possível criar o bucket de logos. Erro: ${createErr.message}`);
      }
    }

    const { error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (error) {
      console.error('Erro ao fazer upload:', error);
      throw error;
    }

    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return publicUrl;
  };

  // Handle logo file selection
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validar tamanho (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Imagem muito grande. Máximo 2MB.');
        return;
      }

      // Validar tipo
      if (!file.type.startsWith('image/')) {
        toast.error('Apenas imagens são permitidas.');
        return;
      }

      setLogoFile(file);
      
      // Preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
  };

  const handleConfigureWebhook = async () => {
    if (!whatsappInstance) {
      toast.error("Nenhuma instância WhatsApp encontrada");
      return;
    }

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

      console.log("Configurando webhook, payload:", payload);

      const response = await fetch(`${import.meta.env.VITE_N8N_WEBHOOK_URL}configurar-webhook`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao configurar webhook");
      }

      const result = await response.json();
      console.log("Resultado configurar webhook:", result);

      // Processar resposta (pode ser array ou objeto)
      const webhookData = Array.isArray(result) ? result[0] : result;

      if (webhookData && webhookData.url) {
        // Salvar URL do webhook no banco (apenas webhook_url existe atualmente)
        const { error: updateError } = await supabase
          .from("instancias_whatsapp")
          .update({
            url_webhook: webhookData.url,
          })
          .eq("id", whatsappInstance.id);

        if (updateError) {
          console.error("Erro ao salvar webhook:", updateError);
          toast.error("Webhook configurado mas erro ao salvar no banco: " + updateError.message);
        } else {
          console.log("Webhook URL salva com sucesso!");
          toast.success("Webhook configurado com sucesso!");
          // Recarregar dados da instância
          window.location.reload();
        }
      } else {
        toast.success("Webhook configurado!");
      }
    } catch (error: any) {
      console.error("Erro ao configurar webhook:", error);
      toast.error(error.message || "Erro ao configurar webhook");
    } finally {
      setIsConfiguringWebhook(false);
    }
  };

  const handleCreateWorkflow = async () => {
    if (!id) {
      toast.error("ID da organização não encontrado");
      return;
    }

    try {
      setIsCreatingWorkflow(true);

      // Buscar todos os dados da organização
      const { data: orgData, error: orgError } = await supabase
        .from("organizacoes")
        .select("*")
        .eq("id", id)
        .single();

      if (orgError) throw orgError;

      // Buscar configuração do Agent IA
      const { data: agentData, error: agentError } = await supabase
        .from("config_agente_ia")
        .select("*")
        .eq("id_organizacao", id)
        .single();

      // Buscar instância WhatsApp
      const { data: whatsappData, error: whatsappError } = await supabase
        .from("instancias_whatsapp")
        .select("*")
        .eq("id_organizacao", id)
        .single();

      // Buscar configurações gerais
      const { data: settingsData, error: settingsError } = await supabase
        .from("configuracoes")
        .select("*")
        .eq("id_organizacao", id)
        .single();

      // Buscar perfis (usuários) da organização
      const { data: profilesData, error: profilesError } = await supabase
        .from("perfis")
        .select("*")
        .eq("id_organizacao", id);

      // Mapear plano para número
      // plano_a = 1 (atendimento)
      // plano_b = 2 (atendimento + conhecimento)
      // plano_c = 3 (completo)
      // plano_d = 4 (enterprise)
      const planNumberMap: Record<string, number> = {
        'plano_a': 1,
        'plano_b': 2,
        'plano_c': 3,
        'plano_d': 4,
      };
      const planNumber = planNumberMap[orgData?.plano_assinatura] || 1;

      // Montar payload com TODAS as informações
      const payload = {
        organization: orgData,
        agent_ia_config: agentData || null,
        whatsapp_instance: whatsappData || null,
        settings: settingsData || null,
        profiles: profilesData || [],
        plan_number: planNumber,
        timestamp: new Date().toISOString(),
      };

      console.log("Enviando dados para criação de workflow:", payload);

      // Chamar webhook
      const response = await fetch(`${import.meta.env.VITE_N8N_WEBHOOK_URL}criacao-fluxo`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao criar workflow");
      }

      const result = await response.json();
      console.log("Resultado da criação de workflow:", result);

      toast.success("Workflow criado com sucesso!");
    } catch (error: any) {
      console.error("Erro ao criar workflow:", error);
      toast.error(error.message || "Erro ao criar workflow");
    } finally {
      setIsCreatingWorkflow(false);
    }
  };

  // Buscar organização (se editando)
  const { data: organization } = useQuery({
    queryKey: ["organization", id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("organizacoes")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: isEditing,
  });

  // Buscar instância WhatsApp (se editando)
  const { data: whatsappInstance, isLoading: isLoadingWhatsapp } = useQuery({
    queryKey: ["whatsapp-instance", id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("instancias_whatsapp")
        .select("*")
        .eq("id_organizacao", id)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Erro ao buscar instância WhatsApp:", error);
      }
      return data || null;
    },
    enabled: isEditing,
  });

  // Carregar usuários da organização
  const { data: orgUsers = [], refetch: refetchUsers } = useQuery({
    queryKey: ["org-users", id],
    queryFn: async () => {
      if (!id) return [];

      const { data, error } = await supabase
        .from("perfis")
        .select("id, nome_completo, funcao, ativo, criado_em")
        .eq("id_organizacao", id)
        .eq("super_admin", false)
        .order("criado_em", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: isEditing,
  });


  // Preencher form ao editar
  useEffect(() => {
    if (organization) {
      reset({
        name: organization.nome,
        contact_email: organization.email_contato || "",
        rotulo_entidade: organization.rotulo_entidade || 'Cliente',
        rotulo_entidade_plural: organization.rotulo_entidade_plural || 'Clientes',
        ativo: organization.ativo,
        plano_assinatura: (organization.plano_assinatura || 'plano_a') as OrganizationFormData['plano_assinatura'],
        adminEmail: "",
        adminPassword: "",
        adminFullName: "",
      });
      setCurrentLogoUrl(organization.url_logo);
    }
  }, [organization, reset]);

  // Criar/Atualizar organização
  const saveMutation = useMutation({
    mutationFn: async (data: OrganizationFormData) => {
      console.log("🔍 Iniciando saveMutation...");
      console.log("🔍 isEditing:", isEditing);
      
      // Obter sessão atualizada (getUser força atualização do token)
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !currentUser) {
        console.error("❌ Erro ao obter usuário:", userError);
        throw new Error("Sessão expirada. Por favor, faça logout e login novamente.");
      }

      // Obter sessão atualizada
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      console.log("🔍 Session completa:", JSON.stringify(session, null, 2));
      console.log("🔍 SessionError:", sessionError);
      console.log("🔍 Access Token presente:", !!session?.access_token);
      console.log("🔍 Access Token (primeiros 50 chars):", session?.access_token?.substring(0, 50) + '...');
      console.log("🔍 User ID:", session?.user?.id);
      console.log("🔍 User Email:", session?.user?.email);
      
      if (sessionError || !session || !session.access_token) {
        console.error("❌ Erro ao obter sessão:", sessionError);
        throw new Error("Sessão expirada. Por favor, faça logout e login novamente.");
      }

      let logoUrl = currentLogoUrl;

      // Upload do logo se houver arquivo novo (ao editar)
      if (logoFile && id) {
        try {
          setUploadingLogo(true);
          logoUrl = await uploadLogo(logoFile, id);
          toast.success('Logo enviado com sucesso!');
        } catch (error) {
          console.error('Erro ao fazer upload do logo:', error);
          toast.error('Erro ao enviar logo');
          throw error;
        } finally {
          setUploadingLogo(false);
        }
      }

      if (isEditing) {
        const { error } = await supabase
          .from('organizacoes')
          .update({
            nome: data.name,
            email_contato: data.contact_email || null,
            rotulo_entidade: data.rotulo_entidade || 'Cliente',
            rotulo_entidade_plural: data.rotulo_entidade_plural || 'Clientes',
            ativo: data.ativo,
            url_logo: logoUrl,
            plano_assinatura: data.plano_assinatura,
          })
          .eq('id', id);

        if (error) throw error;
      } else {
        // Chamar Edge Function para criar
        console.log("📞 Chamando Edge Function criar-organizacao...");
        console.log("📞 URL:", `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/criar-organizacao`);
        console.log("📞 VITE_SUPABASE_URL:", import.meta.env.VITE_SUPABASE_URL);
        console.log("📞 Access Token presente:", !!session.access_token);
        console.log("📞 Access Token (primeiros 50 chars):", session.access_token.substring(0, 50) + '...');
        console.log("📞 Payload:", {
          organizationName: data.name,
          adminEmail: data.adminEmail,
          adminFullName: data.adminFullName,
          isActive: data.ativo,
          subscriptionPlan: data.plano_assinatura,
        });
        
        // Verificar se a chave pública está disponível
        const apikey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        if (!apikey) {
          throw new Error("Chave de API do Supabase não configurada");
        }
        
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/criar-organizacao`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${session.access_token}`,
              "apikey": apikey,
            },
            body: JSON.stringify({
              organizationName: data.name,
              adminEmail: data.adminEmail,
              adminPassword: data.adminPassword,
              adminFullName: data.adminFullName,
              isActive: data.ativo,
              subscriptionPlan: data.plano_assinatura,
            }),
          }
        );

        console.log("📞 Response status:", response.status);
        console.log("📞 Response statusText:", response.statusText);
        
        const result = await response.json();
        console.log("📞 Response body:", result);

        if (!response.ok) {
          console.error("❌ Erro na resposta:", result);
          throw new Error(result.error || "Erro ao criar organização");
        }
        
        console.log("✅ Organização criada com sucesso!");

        // Upload do logo para a organização recém-criada
        const newOrgId = result.organizationId || result.organization_id || result.id;
        if (logoFile && newOrgId) {
          try {
            setUploadingLogo(true);
            const newLogoUrl = await uploadLogo(logoFile, newOrgId);
            await supabase
              .from('organizacoes')
              .update({ url_logo: newLogoUrl })
              .eq('id', newOrgId);
            toast.success('Logo enviado com sucesso!');
          } catch (logoErr) {
            console.error('Erro ao fazer upload do logo:', logoErr);
            toast.error('Organização criada, mas houve erro ao enviar o logo.');
          } finally {
            setUploadingLogo(false);
          }
        }
      }
    },
    onSuccess: () => {
      toast.success(
        isEditing
          ? "Organização atualizada com sucesso!"
          : "Organização criada com sucesso!"
      );
      navigate("/super-admin/organizations");
    },
    onError: (error: any) => {
      console.error("Erro ao salvar organização:", error);
      toast.error(error.message || "Erro ao salvar organização");
    },
  });

  // Adicionar usuário
  const handleAddUser = async () => {
    if (!newUserForm.nome_completo || !newUserForm.email || !newUserForm.password) {
      toast.error("Preencha todos os campos");
      return;
    }

    if (!id) {
      toast.error("Empresa não encontrada");
      return;
    }

    try {
      toast.loading("Criando usuário...", { id: "create-user" });

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error("Erro ao obter sessão:", sessionError);
        throw new Error("Sessão expirada. Por favor, faça login novamente.");
      }

      // Chamar Edge Function
      const apikey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      if (!apikey) {
        throw new Error("Chave de API do Supabase não configurada");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gerenciar-usuarios-organizacao`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
            "apikey": apikey,
          },
          body: JSON.stringify({
            action: "create",
            organizationId: id,
            userData: {
              fullName: newUserForm.nome_completo,
              email: newUserForm.email,
              password: newUserForm.password,
              role: newUserForm.role,
            },
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao criar usuário");
      }

      toast.success("Usuário criado com sucesso!", { id: "create-user" });
      setIsAddUserModalOpen(false);
      setNewUserForm({
        nome_completo: "",
        email: "",
        password: "",
        role: "profissional",
      });
      refetchUsers();
    } catch (error: any) {
      console.error("Erro ao criar usuário:", error);
      toast.error(error.message || "Erro ao criar usuário", { id: "create-user" });
    }
  };

  // Deletar usuário
  const handleDeleteUser = async (userId: string) => {
    try {
      toast.loading("Deletando usuário...", { id: "delete-user" });

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error("Erro ao obter sessão:", sessionError);
        throw new Error("Sessão expirada. Por favor, faça login novamente.");
      }

      // Chamar Edge Function
      const apikey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      if (!apikey) {
        throw new Error("Chave de API do Supabase não configurada");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gerenciar-usuarios-organizacao`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
            "apikey": apikey,
          },
          body: JSON.stringify({
            action: "delete",
            userId: userId,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao deletar usuário");
      }

      toast.success("Usuário deletado com sucesso!", { id: "delete-user" });
      setUserToDelete(null);
      refetchUsers();
    } catch (error: any) {
      console.error("Erro ao deletar usuário:", error);
      toast.error(error.message || "Erro ao deletar usuário", { id: "delete-user" });
    }
  };

  const onSubmit = (data: OrganizationFormData) => {
    saveMutation.mutate(data);
  };

  return (
    <div className="space-y-6 min-h-screen p-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/super-admin/organizations")}
          className="text-primary hover:text-primary-foreground hover:bg-primary/20"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {isEditing ? "Editar Organização" : "Nova Organização"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isEditing
              ? "Atualize as informações da organização"
              : "Crie uma nova empresa e seu administrador"}
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Organization Info */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Informações da Empresa</CardTitle>
            <CardDescription>
              Dados básicos da empresa
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">
                Nome da Empresa *
              </Label>
              <Input
                id="name"
                {...register("name", { required: "Nome é obrigatório" })}
                placeholder="Ex: Empresa São Paulo"
                className="mt-1.5"
              />
              {errors.name && (
                <p className="text-xs text-destructive mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="contact_email">
                E-mail de Contato
              </Label>
              <Input
                id="contact_email"
                type="email"
                {...register("contact_email")}
                placeholder="contato@empresa.com"
                className="mt-1.5"
              />
              <p className="text-xs text-muted-foreground mt-1">
                E-mail usado para envio de confirmações de agendamento
              </p>
            </div>

            {/* Label da Entidade */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="rotulo_entidade">
                  Como chama seus clientes? (singular)
                </Label>
                <Input
                  id="rotulo_entidade"
                  {...register("rotulo_entidade")}
                  placeholder="Ex: Paciente, Cliente, Aluno"
                  className="mt-1.5"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Usado em botões, labels e mensagens
                </p>
              </div>
              <div>
                <Label htmlFor="rotulo_entidade_plural">
                  Plural
                </Label>
                <Input
                  id="rotulo_entidade_plural"
                  {...register("rotulo_entidade_plural")}
                  placeholder="Ex: Pacientes, Clientes, Alunos"
                  className="mt-1.5"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Forma plural do nome
                </p>
              </div>
            </div>

            {/* Plano de Assinatura */}
            <div className="space-y-2">
              <Label htmlFor="plano_assinatura">
                Pacote de Assinatura *
              </Label>
              <select
                id="plano_assinatura"
                {...register("plano_assinatura", { required: "Plano é obrigatório" })}
                className="w-full h-10 px-3 rounded-md bg-input border border-border text-foreground focus:border-primary focus:ring-1 focus:ring-primary"
              >
                {plans.map((plan) => (
                  <option key={plan.id_plano} value={plan.id_plano}>
                    {plan.nome_plano} - R$ {plan.preco_mensal?.toFixed(2)}/mês
                  </option>
                ))}
              </select>
              {errors.plano_assinatura && (
                <p className="text-xs text-destructive mt-1">{errors.plano_assinatura.message}</p>
              )}
              
              {/* Descrição do Plano Selecionado */}
              {subscriptionPlan && plans.find(p => p.id_plano === subscriptionPlan) && (
                <div className="mt-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-sm text-foreground mb-3">
                    {plans.find(p => p.id_plano === subscriptionPlan)?.descricao_plano}
                  </p>
                  
                  {/* Recursos do Plano */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-primary uppercase tracking-wide">
                      Recursos Inclusos:
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {plans.find(p => p.id_plano === subscriptionPlan)?.atendimento_inteligente && (
                        <div className="flex items-center gap-2 text-xs text-foreground">
                          <Check className="h-3 w-3 text-primary" />
                          <span>Atendimento Inteligente</span>
                        </div>
                      )}
                      {plans.find(p => p.id_plano === subscriptionPlan)?.agendamento_automatico && (
                        <div className="flex items-center gap-2 text-xs text-foreground">
                          <Check className="h-3 w-3 text-primary" />
                          <span>Agendamento Automático</span>
                        </div>
                      )}
                      {plans.find(p => p.id_plano === subscriptionPlan)?.lembretes_automaticos && (
                        <div className="flex items-center gap-2 text-xs text-foreground">
                          <Check className="h-3 w-3 text-primary" />
                          <span>Lembretes Automáticos</span>
                        </div>
                      )}
                      {plans.find(p => p.id_plano === subscriptionPlan)?.confirmacao_email && (
                        <div className="flex items-center gap-2 text-xs text-foreground">
                          <Check className="h-3 w-3 text-primary" />
                          <span>Confirmação por Email</span>
                        </div>
                      )}
                      {plans.find(p => p.id_plano === subscriptionPlan)?.base_conhecimento && (
                        <div className="flex items-center gap-2 text-xs text-foreground">
                          <Check className="h-3 w-3 text-primary" />
                          <span>Base de Conhecimento</span>
                        </div>
                      )}
                      {plans.find(p => p.id_plano === subscriptionPlan)?.relatorios_avancados && (
                        <div className="flex items-center gap-2 text-xs text-foreground">
                          <Check className="h-3 w-3 text-primary" />
                          <span>Relatórios Avançados</span>
                        </div>
                      )}
                      {plans.find(p => p.id_plano === subscriptionPlan)?.integracao_whatsapp && (
                        <div className="flex items-center gap-2 text-xs text-foreground">
                          <Check className="h-3 w-3 text-primary" />
                          <span>Integração WhatsApp</span>
                        </div>
                      )}
                      {plans.find(p => p.id_plano === subscriptionPlan)?.multi_usuarios && (
                        <div className="flex items-center gap-2 text-xs text-foreground">
                          <Check className="h-3 w-3 text-primary" />
                          <span>Múltiplos Usuários</span>
                        </div>
                      )}
                      {plans.find(p => p.id_plano === subscriptionPlan)?.personalizacao_agente && (
                        <div className="flex items-center gap-2 text-xs text-foreground">
                          <Check className="h-3 w-3 text-primary" />
                          <span>Personalização do Agente</span>
                        </div>
                      )}
                      {plans.find(p => p.id_plano === subscriptionPlan)?.analytics && (
                        <div className="flex items-center gap-2 text-xs text-foreground">
                          <Check className="h-3 w-3 text-primary" />
                          <span>Analytics</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Limites do Plano */}
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">
                        Limites:
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        <div>
                          <span className="font-medium">Agendamentos/mês:</span>{' '}
                          {plans.find(p => p.id_plano === subscriptionPlan)?.max_agendamentos_mes || 'Ilimitado'}
                        </div>
                        <div>
                          <span className="font-medium">Mensagens/mês:</span>{' '}
                          {plans.find(p => p.id_plano === subscriptionPlan)?.max_mensagens_whatsapp_mes || 'Ilimitado'}
                        </div>
                        <div>
                          <span className="font-medium">Usuários:</span>{' '}
                          {plans.find(p => p.id_plano === subscriptionPlan)?.max_usuarios || 'Ilimitado'}
                        </div>
                        <div>
                          <span className="font-medium">Clientes:</span>{' '}
                          {plans.find(p => p.id_plano === subscriptionPlan)?.max_contatos ?? 'Ilimitado'}
                        </div>
                        <div>
                          <span className="font-medium">Arquivos (BC):</span>{' '}
                          {(plans.find(p => p.id_plano === subscriptionPlan) as any)?.max_arquivos_conhecimento ?? 'Ilimitado'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="ativo">
                  Empresa Ativa
                </Label>
                <p className="text-xs text-muted-foreground">
                Empresas inativas não podem acessar o sistema
                </p>
              </div>
              <Switch
                id="ativo"
                checked={isActive}
                onCheckedChange={(checked) => setValue("ativo", checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Logo Upload (only when editing) */}
        {isEditing && (
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Logo da Empresa</CardTitle>
              <CardDescription>
                Faça upload do logo que aparecerá no sistema da empresa
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {(logoPreview || currentLogoUrl) && (
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <img
                      src={logoPreview || currentLogoUrl || ''}
                      alt="Logo"
                      className="h-20 w-20 object-contain rounded-lg border border-border bg-muted p-2"
                    />
                    {logoPreview && (
                      <button
                        type="button"
                        onClick={removeLogo}
                        className="absolute -top-2 -right-2 rounded-full bg-destructive p-1 text-destructive-foreground hover:bg-destructive/90"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-foreground">
                      {logoPreview ? 'Novo logo (não salvo)' : 'Logo atual'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {logoPreview
                        ? 'Clique em "Atualizar" para salvar'
                        : 'Faça upload de uma nova imagem para substituir'}
                    </p>
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="logo">
                  {currentLogoUrl ? 'Alterar Logo' : 'Adicionar Logo'}
                </Label>
                <div className="mt-2">
                  <label
                    htmlFor="logo"
                    className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/50 px-4 py-8 text-center transition-colors hover:border-primary/50 hover:bg-muted"
                  >
                    <Upload className="h-5 w-5 text-primary" />
                    <span className="text-sm text-foreground">
                      Clique para fazer upload ou arraste uma imagem
                    </span>
                  </label>
                  <input
                    id="logo"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  PNG, JPG ou SVG. Máximo 2MB. Recomendado: 200x200px
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Admin Info (only when creating) */}
        {!isEditing && (
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Administrador da Organização</CardTitle>
              <CardDescription>
                Criar usuário admin para gerenciar a empresa
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="adminFullName">
                  Nome Completo *
                </Label>
                <Input
                  id="adminFullName"
                  {...register("adminFullName", {
                    required: !isEditing && "Nome completo é obrigatório",
                  })}
                  placeholder="Ex: Dr. João Silva"
                  className="mt-1.5"
                />
                {errors.adminFullName && (
                  <p className="text-xs text-destructive mt-1">
                    {errors.adminFullName.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="adminEmail">
                  Email *
                </Label>
                <Input
                  id="adminEmail"
                  type="email"
                  {...register("adminEmail", {
                    required: !isEditing && "Email é obrigatório",
                  })}
                  placeholder="admin@empresa.com"
                  className="mt-1.5"
                />
                {errors.adminEmail && (
                  <p className="text-xs text-destructive mt-1">{errors.adminEmail.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="adminPassword">
                  Senha *
                </Label>
                <Input
                  id="adminPassword"
                  type="password"
                  {...register("adminPassword", {
                    required: !isEditing && "Senha é obrigatória",
                    minLength: {
                      value: 6,
                      message: "Senha deve ter no mínimo 6 caracteres",
                    },
                  })}
                  placeholder="Mínimo 6 caracteres"
                  className="mt-1.5"
                />
                {errors.adminPassword && (
                  <p className="text-xs text-destructive mt-1">
                    {errors.adminPassword.message}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Workflow Section (only when editing) */}
        {isEditing && (
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Automações e Workflows</CardTitle>
              <CardDescription>
                Configure fluxos de trabalho automatizados para esta empresa
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                type="button"
                onClick={handleCreateWorkflow}
                disabled={isCreatingWorkflow}
                className="gradient-pink text-primary-foreground shadow-pink"
              >
                {isCreatingWorkflow ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando Workflow...
                  </>
                ) : (
                  <>
                    <Workflow className="mr-2 h-4 w-4" />
                    Criar Workflow
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* WhatsApp Instance Info (only when editing) */}
        {isEditing && (
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                Instância WhatsApp
              </CardTitle>
              <CardDescription>
                Informações de conexão do WhatsApp desta empresa
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingWhatsapp ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="ml-2 text-muted-foreground">Carregando...</span>
                </div>
              ) : whatsappInstance ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-foreground">Status:</span>
                    {whatsappInstance.situacao === 'conectado' ? (
                      <span className="flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/30 rounded-full text-green-600 dark:text-green-400 text-sm font-medium">
                        <Check className="h-4 w-4" />
                        Conectado
                      </span>
                    ) : whatsappInstance.situacao === 'pendente' ? (
                      <span className="flex items-center gap-2 px-3 py-1 bg-yellow-500/10 border border-yellow-500/30 rounded-full text-yellow-600 dark:text-yellow-400 text-sm font-medium">
                        <Clock className="h-4 w-4" />
                        Aguardando
                      </span>
                    ) : (
                      <span className="flex items-center gap-2 px-3 py-1 bg-destructive/10 border border-destructive/30 rounded-full text-destructive text-sm font-medium">
                        <XCircle className="h-4 w-4" />
                        {whatsappInstance.situacao}
                      </span>
                    )}
                  </div>

                  <div className="grid gap-3">
                    <div className="flex items-center justify-between border-b border-border pb-2">
                      <span className="text-sm text-muted-foreground">Nome da Instância:</span>
                      <span className="text-sm font-mono text-foreground">{whatsappInstance.nome_instancia}</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-border pb-2">
                      <span className="text-sm text-muted-foreground">Empresa:</span>
                      <span className="text-sm text-foreground">{(whatsappInstance as any).campo_admin_01}</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-border pb-2">
                      <span className="text-sm text-muted-foreground">Telefone:</span>
                      <span className="text-sm font-mono text-foreground">{(whatsappInstance as any).telefone}</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-border pb-2">
                      <span className="text-sm text-muted-foreground">Instance ID:</span>
                      <span className="text-xs font-mono text-muted-foreground">{whatsappInstance.id_instancia}</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-border pb-2">
                      <span className="text-sm text-muted-foreground">Token:</span>
                      <span className="text-xs font-mono text-muted-foreground break-all">
                        {whatsappInstance.token}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-b border-border pb-2">
                      <span className="text-sm text-muted-foreground">Criado em:</span>
                      <span className="text-sm text-foreground">
                        {new Date(whatsappInstance.criado_em).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Atualizado em:</span>
                      <span className="text-sm text-foreground">
                        {new Date(whatsappInstance.atualizado_em).toLocaleString('pt-BR')}
                      </span>
                    </div>
                  </div>

                  {(whatsappInstance as any).url_webhook && (
                    <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-3">
                      <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Workflow className="h-4 w-4" />
                        Webhook Configurado
                      </h4>
                      <div className="space-y-2">
                        <span className="text-xs text-muted-foreground block">URL do Webhook:</span>
                        <div className="bg-muted rounded p-2 border border-border">
                          <p className="text-xs font-mono text-foreground break-all">
                            {(whatsappInstance as any).url_webhook}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-primary">
                          <Check className="h-3 w-3" />
                          <span>Webhook ativo e recebendo eventos</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t border-border">
                    <Button
                      type="button"
                      onClick={handleConfigureWebhook}
                      disabled={isConfiguringWebhook}
                      className="w-full gradient-pink text-primary-foreground shadow-pink"
                    >
                      {isConfiguringWebhook ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Configurando Webhook...
                        </>
                      ) : (
                        <>
                          <Workflow className="mr-2 h-4 w-4" />
                          {(whatsappInstance as any).url_webhook ? 'Reconfigurar Webhook' : 'Configurar Webhook'}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 text-primary mx-auto mb-3" />
                  <p className="text-foreground text-sm">
                    Nenhuma instância WhatsApp conectada
                  </p>
                  <p className="text-muted-foreground text-xs mt-1">
                    O cliente ainda não conectou o WhatsApp
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Usuários da Organização (only when editing) */}
        {isEditing && (
          <Card className="border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Usuários da Empresa
                  </CardTitle>
                  <CardDescription>
                    Gerencie os usuários que têm acesso a esta empresa
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(true)}
                  className="gradient-pink text-primary-foreground shadow-pink"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Adicionar Usuário
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {orgUsers.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-primary mx-auto mb-3" />
                  <p className="text-foreground text-sm">
                    Nenhum usuário cadastrado
                  </p>
                  <p className="text-muted-foreground text-xs mt-1">
                    Adicione usuários para que possam acessar o sistema
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {orgUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-4 bg-muted/50 border border-border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                          <span className="font-semibold text-primary">
                            {user.nome_completo?.charAt(0).toUpperCase() || 'U'}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {user.nome_completo}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground capitalize">
                              {user.funcao === 'admin' ? 'Administrador' : 
                               user.funcao === 'profissional' ? 'Profissional' : 'Assistente'}
                            </span>
                            <span className="text-primary">•</span>
                            <span className={`text-xs ${user.ativo ? 'text-primary' : 'text-muted-foreground'}`}>
                              {user.ativo ? 'Ativo' : 'Inativo'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setUserToDelete(user.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/super-admin/organizations")}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={saveMutation.isPending || uploadingLogo}
            className="gradient-pink text-primary-foreground shadow-pink"
          >
            <Save className="mr-2 h-4 w-4" />
            {uploadingLogo
              ? "Enviando logo..."
              : saveMutation.isPending
              ? "Salvando..."
              : isEditing
              ? "Atualizar"
              : "Criar Organização"}
          </Button>
        </div>
      </form>

      {/* Modal Adicionar Usuário */}
      <Dialog open={isAddUserModalOpen} onOpenChange={setIsAddUserModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Novo Usuário</DialogTitle>
            <DialogDescription>
              Crie um novo usuário para acessar esta empresa
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="user_nome_completo">Nome Completo *</Label>
              <Input
                id="user_nome_completo"
                placeholder="Ex: Dr. João Silva"
                value={newUserForm.nome_completo}
                onChange={(e) => setNewUserForm({ ...newUserForm, nome_completo: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="user_email">Email *</Label>
              <Input
                id="user_email"
                type="email"
                placeholder="usuario@email.com"
                value={newUserForm.email}
                onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="user_password">Senha *</Label>
              <Input
                id="user_password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={newUserForm.password}
                onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="user_role">Função *</Label>
              <Select
                value={newUserForm.role}
                onValueChange={(value: any) => setNewUserForm({ ...newUserForm, role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="profissional">Profissional</SelectItem>
                  <SelectItem value="assistente">Assistente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddUserModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleAddUser}>
              Criar Usuário
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog Deletar Usuário */}
      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar Usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar este usuário? Esta ação não pode ser desfeita.
              O usuário perderá acesso ao sistema imediatamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => userToDelete && handleDeleteUser(userToDelete)}
              className="bg-red-600 hover:bg-red-700"
            >
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
