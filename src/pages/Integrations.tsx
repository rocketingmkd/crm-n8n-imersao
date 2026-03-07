import { MessageSquare, Loader2, QrCode, Copy, Trash2, Smartphone, Wifi, WifiOff, ScanLine, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlanGuard } from "@/components/PlanGuard";
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
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface WhatsAppInstance {
  id: string;
  token: string;
  name: string;
  adminField01: string;
  created: string;
  phone: string;
}

interface DBInstance {
  id: string;
  id_instancia: string;
  token: string;
  nome_instancia: string;
  admin_field_01: string;
  phone: string;
  situacao: string;
  webhook_criado: string | null;
  qr_code: string | null;
  pairing_code: string | null;
}

export default function Integrations({ embedded = false }: { embedded?: boolean }) {
  const { organization, profile } = useAuth();
  const padding = embedded ? "" : "p-4 md:p-6 lg:p-8";
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoadingInstance, setIsLoadingInstance] = useState(true);
  const [showPairingCard, setShowPairingCard] = useState(false);
  const [instanceData, setInstanceData] = useState<WhatsAppInstance | null>(null);
  const [dbInstance, setDbInstance] = useState<DBInstance | null>(null);
  const [formData, setFormData] = useState({
    companyName: "",
    phone: "",
  });
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  const [isListingInstance, setIsListingInstance] = useState(false);
  const [instanceDetails, setInstanceDetails] = useState<any>(null);
  const [isDeletingInstance, setIsDeletingInstance] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Carregar instância existente do banco ao montar o componente
  useEffect(() => {
    console.log("useEffect disparado, organization?.id:", organization?.id);
    if (organization?.id) {
      loadExistingInstance();
    }
  }, [organization?.id]);

  // Debug: monitorar mudanças no dbInstance
  useEffect(() => {
    console.log("dbInstance mudou:", dbInstance);
  }, [dbInstance]);

  // Carregar detalhes da instância automaticamente se já estiver conectado
  useEffect(() => {
    if (dbInstance?.situacao === "conectado" && !instanceDetails) {
      console.log("Instância já conectada, carregando detalhes...");
      handleListInstance();
    }
  }, [dbInstance?.situacao]);

  // Verificar conexão automaticamente a cada 2 segundos quando tiver QR ou Pairing Code
  useEffect(() => {
    if (!dbInstance) return;
    if (dbInstance.situacao === "conectado") return;
    if (!dbInstance.qr_code && !dbInstance.pairing_code) return;

    console.log("Iniciando verificação automática de conexão...");
    setIsCheckingConnection(true);

    const checkConnection = async () => {
      try {
        console.log("Verificando conexão...");
        
        const payload = {
          instanceId: dbInstance.id_instancia,
          token: dbInstance.token,
          instanceName: dbInstance.nome_instancia,
          adminField01: dbInstance.admin_field_01,
          phone: dbInstance.phone,
          organizationId: organization?.id,
          organizationName: organization?.nome,
        };

        const response = await fetch(`${import.meta.env.VITE_N8N_WEBHOOK_URL}verificar-conexao`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          console.log("Erro na verificação:", response.status);
          return;
        }

        const result = await response.json();
        console.log("Resultado da verificação:", result);

        const data = Array.isArray(result) ? result[0] : result;
        
        const isConnected = 
          data.response === "sucesso" || 
          data.connected === true || 
          data.status === "connected" || 
          data.state === "open";

        console.log("isConnected:", isConnected, "data:", data);

        if (isConnected) {
          console.log("✅ WhatsApp conectado com sucesso!");

          const { error: updateError } = await supabase
            .from("instancias_whatsapp")
            .update({ situacao: "conectado" })
            .eq("id", dbInstance.id);

          if (updateError) {
            console.error("Erro ao atualizar status:", updateError);
          } else {
            console.log("Status atualizado no banco para 'conectado'");
          }

          setDbInstance({ ...dbInstance, situacao: "conectado" });
          setIsCheckingConnection(false);
          toast.success("WhatsApp conectado com sucesso! 🎉");
        } else {
          console.log("⏳ Ainda não conectado, continuando verificação...");
        }
      } catch (error) {
        console.error("Erro ao verificar conexão:", error);
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 2000);

    return () => {
      console.log("Limpando interval de verificação");
      clearInterval(interval);
      setIsCheckingConnection(false);
    };
  }, [dbInstance?.id, dbInstance?.situacao, dbInstance?.qr_code, dbInstance?.pairing_code, organization?.id]);

  const loadExistingInstance = async () => {
    if (!organization?.id) {
      console.log("Organization ID não disponível");
      setIsLoadingInstance(false);
      return;
    }

    try {
      setIsLoadingInstance(true);
      console.log("Buscando instância para id_organizacao:", organization.id);
      
      const { data, error } = await supabase
        .from("instancias_whatsapp")
        .select("*")
        .eq("id_organizacao", organization.id)
        .order("criado_em", { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") { // PGRST116 = not found
        console.error("Erro ao buscar instância:", error);
        throw error;
      }

      if (data) {
        console.log("Instância encontrada:", data);
        setDbInstance({
          ...data,
          admin_field_01: data.campo_admin_01 ?? (data as any).admin_field_01,
          phone: data.telefone ?? (data as any).phone ?? "",
        } as any);

        // Converter dados do banco para o formato da interface
        const instance: WhatsAppInstance = {
          id: data.id_instancia,
          token: data.token,
          name: data.nome_instancia,
          adminField01: data.campo_admin_01,
          phone: data.telefone,
          created: data.webhook_criado || data.criado_em,
        };
        
        console.log("Instance data convertida:", instance);
        setInstanceData(instance);
        setShowPairingCard(true);
      } else {
        console.log("Nenhuma instância encontrada no banco");
      }
    } catch (error) {
      console.error("Erro ao carregar instância:", error);
    } finally {
      setIsLoadingInstance(false);
    }
  };

  // Preencher nome da empresa quando abrir o modal
  useEffect(() => {
    if (isModalOpen && organization?.nome) {
      const formattedName = organization.nome
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-");
      
      setFormData((prev) => ({ ...prev, companyName: formattedName }));
    }
  }, [isModalOpen, organization]);

  const handleConnect = () => {
    setIsModalOpen(true);
  };

  const saveToDatabase = async (instance: WhatsAppInstance) => {
    try {
      const { error } = await supabase
        .from("instancias_whatsapp")
        .insert({
          id_organizacao: organization?.id,
          id_instancia: instance.id,
          token: instance.token,
          nome_instancia: instance.name,
          campo_admin_01: instance.adminField01,
          telefone: instance.phone,
          webhook_criado: instance.created,
          situacao: "pendente",
        });

      if (error) throw error;
      
      console.log("Instância salva no banco de dados");
    } catch (error) {
      console.error("Erro ao salvar no banco:", error);
      toast.error("Erro ao salvar configurações");
    }
  };

  const handleSubmit = async () => {
    if (!formData.companyName.trim()) {
      toast.error("Nome da empresa é obrigatório");
      return;
    }

    if (!formData.phone.trim()) {
      toast.error("Telefone é obrigatório");
      return;
    }

    const phoneNumbers = formData.phone.replace(/\D/g, "");
    if (phoneNumbers.length < 10 || phoneNumbers.length > 11) {
      toast.error("Telefone inválido. Use o formato: (11) 98888-8888");
      return;
    }

    try {
      setIsConnecting(true);

      const response = await fetch(`${import.meta.env.VITE_N8N_WEBHOOK_URL}criar-instancia-cliente`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: formData.companyName,
          phone: formData.phone,
          organizationId: organization?.id,
          organizationName: organization?.nome,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao conectar WhatsApp");
      }

      const result = await response.json();
      
      // O webhook retorna um array, pegar o primeiro item
      const instance = Array.isArray(result) ? result[0] : result;
      
      if (!instance || !instance.id) {
        throw new Error("Resposta inválida do servidor");
      }

      // Salvar no banco de dados
      await saveToDatabase(instance);

      // Carregar instância do banco para ter dbInstance (com phone/telefone) para o botão Gerar QR Code
      await loadExistingInstance();

      // Mostrar card de pareamento
      setInstanceData(instance);
      setIsModalOpen(false);
      setShowPairingCard(true);
      setFormData({ companyName: "", phone: "" });

      toast.success("Instância criada com sucesso!");
      
    } catch (error: any) {
      console.error("Erro ao conectar WhatsApp:", error);
      toast.error(error.message || "Erro ao conectar WhatsApp");
    } finally {
      setIsConnecting(false);
    }
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    
    if (numbers.length <= 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
    } else {
      return numbers.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setFormData({ ...formData, phone: formatted });
  };

  const handleDeleteInstance = async () => {
    if (!dbInstance) {
      toast.error("Nenhuma instância encontrada");
      return;
    }

    try {
      setIsDeletingInstance(true);
      
      const payload = {
        instanceId: dbInstance.id_instancia,
        token: dbInstance.token,
        instanceName: dbInstance.nome_instancia,
        adminField01: dbInstance.admin_field_01,
        phone: dbInstance.phone,
        organizationId: organization?.id,
        organizationName: organization?.nome,
      };
      
      console.log("Apagando instância, payload:", payload);
      
      const response = await fetch(`${import.meta.env.VITE_N8N_WEBHOOK_URL}apagar-instancia`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao apagar instância");
      }

      const result = await response.json();
      console.log("Resultado apagar instância:", result);
      
      // Deletar do banco de dados local
      const { error: deleteError } = await supabase
        .from("instancias_whatsapp")
        .delete()
        .eq("id", dbInstance.id);

      if (deleteError) {
        console.error("Erro ao deletar do banco:", deleteError);
        toast.error("Erro ao remover instância do banco de dados");
        return;
      }

      // Limpar estados
      setInstanceDetails(null);
      setDbInstance(null);
      setInstanceData(null);
      setShowPairingCard(false);
      setShowDeleteDialog(false);
      
      toast.success("Instância apagada com sucesso!");
      
    } catch (error: any) {
      console.error("Erro ao apagar instância:", error);
      toast.error(error.message || "Erro ao apagar instância");
    } finally {
      setIsDeletingInstance(false);
    }
  };

  const handleListInstance = async () => {
    if (!dbInstance) {
      toast.error("Nenhuma instância encontrada");
      return;
    }

    try {
      setIsListingInstance(true);
      
      const payload = {
        instanceId: dbInstance.id_instancia,
        token: dbInstance.token,
        instanceName: dbInstance.nome_instancia,
        adminField01: dbInstance.admin_field_01,
        phone: dbInstance.phone,
        organizationId: organization?.id,
        organizationName: organization?.nome,
      };
      
      console.log("Listando instância, payload:", payload);
      
      const response = await fetch(`${import.meta.env.VITE_N8N_WEBHOOK_URL}listar-instancia`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao listar instância");
      }

      const result = await response.json();
      console.log("Resultado listar instância:", result);
      
      // Processar resposta (pode ser array ou objeto)
      const data = Array.isArray(result) ? result[0] : result;
      
      if (data) {
        setInstanceDetails(data);
        toast.success("Instância carregada com sucesso!");
      } else {
        toast.info("Nenhum detalhe retornado");
      }
      
    } catch (error: any) {
      console.error("Erro ao listar instância:", error);
      toast.error(error.message || "Erro ao listar instância");
    } finally {
      setIsListingInstance(false);
    }
  };

  const handleGenerateQRCode = async () => {
    console.log("handleGenerateQRCode chamado");
    console.log("dbInstance atual:", dbInstance);
    console.log("organization:", organization);
    
    if (!dbInstance) {
      console.error("dbInstance está null/undefined");
      toast.error("Nenhuma instância encontrada");
      return;
    }

    try {
      setIsGeneratingQR(true);
      
      const phoneNumber = dbInstance.phone ?? (dbInstance as any).telefone ?? "";
      const payload = {
        instanceId: dbInstance.id_instancia,
        token: dbInstance.token,
        instanceName: dbInstance.nome_instancia,
        adminField01: dbInstance.admin_field_01,
        phone: phoneNumber,
        telefone: phoneNumber,
        organizationId: organization?.id,
        organizationName: organization?.nome,
      };

      if (!phoneNumber) {
        console.warn("Número de telefone não encontrado na instância. Verifique o cadastro.");
      }

      console.log("Payload enviado:", payload);

      const response = await fetch(`${import.meta.env.VITE_N8N_WEBHOOK_URL}gerar-qrcode`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao gerar QR Code");
      }

      const result = await response.json();
      console.log("Resultado do webhook:", result);
      
      // O endpoint pode retornar um array ou objeto direto
      const data = Array.isArray(result) ? result[0] : result;
      
      console.log("Data processada:", data);
      
      // Extrair qrCode e pairingCode (aceita vários formatos de nome)
      const qrCode = data.qrCode || data.qrcode || data.QRCode || null;
      const pairingCode = data.pairCode || data.paircode || data.pairingCode || data.pairing_code || null;
      
      console.log("QR Code extraído:", qrCode);
      console.log("Pairing Code extraído:", pairingCode);
      
      // Processar resposta - pode ter qrCode ou pairingCode
      if (qrCode || pairingCode) {
        // Atualizar no banco de dados
        const { error: updateError } = await supabase
          .from("instancias_whatsapp")
          .update({
            qr_code: qrCode,
            pairing_code: pairingCode,
          })
          .eq("id", dbInstance.id);

        if (updateError) {
          console.error("Erro ao salvar QR/Pairing code:", updateError);
          toast.error("Erro ao salvar código");
        } else {
          console.log("Código salvo no banco com sucesso!");
        }

        // Atualizar estado local
        setDbInstance({
          ...dbInstance,
          qr_code: qrCode,
          pairing_code: pairingCode,
        });

        if (pairingCode) {
          toast.success("Código de pareamento gerado com sucesso!");
        } else if (qrCode) {
          toast.success("QR Code gerado com sucesso!");
        }
      } else {
        console.warn("Resposta do webhook não contém qrCode nem pairingCode");
        toast.info("Processando conexão...");
      }
      
    } catch (error: any) {
      console.error("Erro ao gerar QR Code:", error);
      toast.error(error.message || "Erro ao gerar QR Code");
    } finally {
      setIsGeneratingQR(false);
    }
  };

  // Loading ao carregar instância
  if (isLoadingInstance) {
  return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  // Se tiver detalhes da instância, mostra card detalhado
  if (instanceDetails && dbInstance?.situacao === "conectado") {
    return (
      <div className={`space-y-6 ${padding} animate-fade-in`}>
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <MessageSquare className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-foreground">WhatsApp</h1>
            <p className="text-sm text-muted-foreground">Sua instância está ativa e funcionando</p>
          </div>
          <Badge className="ml-auto bg-success/10 text-success border-success/20 gap-1.5">
            <Wifi className="h-3 w-3" /> Conectado
          </Badge>
        </div>

        <Card className="card-luxury max-w-2xl">
          <div className="p-6 space-y-6">
            {/* Profile Header */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <img
                  src={instanceDetails.profilePicUrl || "/placeholder.svg"}
                  alt={instanceDetails.profileName || "Profile"}
                  className="h-20 w-20 rounded-2xl object-cover border border-border"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/placeholder.svg";
                  }}
                />
                <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-success border-2 border-background">
                  <div className="h-2 w-2 bg-success-foreground rounded-full" />
                </div>
              </div>

              <div className="flex-1 space-y-1">
                <h3 className="text-xl font-bold text-foreground">
                  {instanceDetails.profileName || "WhatsApp"}
                </h3>
                <p className="text-sm text-muted-foreground">{instanceDetails.owner || "N/A"}</p>
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Empresa", value: instanceDetails.adminField01 || instanceData?.adminField01 },
                { label: "Plataforma", value: instanceDetails.plataform || "N/A" },
                { label: "Tipo", value: instanceDetails.isBusiness ? "Business" : "Pessoal" },
                { label: "Telefone", value: instanceDetails.owner || "N/A" },
              ].map((item) => (
                <div key={item.label} className="rounded-xl bg-secondary/30 p-3 space-y-1">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-sm font-semibold text-foreground capitalize">{item.value}</p>
                </div>
              ))}
            </div>

            {/* Delete Button */}
            <div className="pt-2 border-t border-border">
              <Button
                onClick={() => setShowDeleteDialog(true)}
                variant="destructive"
                className="w-full gap-2"
                disabled={isDeletingInstance}
              >
                <Trash2 className="h-4 w-4" />
                Desconectar Instância
              </Button>
            </div>
          </div>
        </Card>

        {/* Delete Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Apagar Instância do WhatsApp?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. A instância <strong>{instanceDetails?.name}</strong> será permanentemente removida.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeletingInstance}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  handleDeleteInstance();
                }}
                disabled={isDeletingInstance}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeletingInstance ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Apagando...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Apagar
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // Tela de pareamento - mostra se já existe instância no banco
  if (showPairingCard && instanceData && dbInstance) {
    const isConnected = dbInstance.situacao === "conectado";

    return (
      <div className={`space-y-6 ${padding} animate-fade-in`}>
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <MessageSquare className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-foreground">WhatsApp</h1>
            <p className="text-sm text-muted-foreground">
              {isConnected ? "Sua instância está conectada" : "Escaneie o QR Code para conectar"}
            </p>
          </div>
          <Badge className={`ml-auto gap-1.5 ${isConnected ? "bg-success/10 text-success border-success/20" : "bg-primary/10 text-primary border-primary/20"}`}>
            {isConnected ? <><Wifi className="h-3 w-3" /> Conectado</> : <><WifiOff className="h-3 w-3" /> Aguardando</>}
          </Badge>
        </div>

        <div className="max-w-3xl mx-auto space-y-6">
          {/* Instance Info Card */}
          <Card className="card-luxury">
            <div className="p-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { label: "Empresa", value: instanceData.adminField01 },
                  { label: "Telefone", value: instanceData.phone },
                  { label: "Instance ID", value: dbInstance.id_instancia, mono: true },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl bg-secondary/30 p-3 space-y-1">
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className={`text-sm font-semibold text-foreground ${item.mono ? "font-mono text-xs" : ""}`}>{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* QR Code / Pairing Section */}
          {!isConnected && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: QR Code Display */}
              <Card className="card-luxury overflow-hidden">
                <div className="p-6 flex flex-col items-center justify-center min-h-[400px]">
                  {dbInstance.qr_code ? (
                    <div className="space-y-4 text-center">
                      {/* Modern QR Code Container */}
                      <div className="relative inline-block">
                        {/* Outer glow ring */}
                        <div className="absolute -inset-3 rounded-3xl bg-gradient-to-br from-primary/20 via-primary/5 to-transparent blur-sm" />
                        {/* Glass container */}
                        <div className="relative rounded-2xl p-1 bg-gradient-to-br from-primary/30 via-primary/10 to-primary/30">
                          <div className="rounded-xl bg-background p-4">
                            <img 
                              src={dbInstance.qr_code} 
                              alt="QR Code do WhatsApp" 
                              className="w-56 h-56 object-contain"
                              style={{ filter: "contrast(1.1)" }}
                            />
                          </div>
                        </div>
                        {/* Corner accents */}
                        <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-primary rounded-tl-xl" />
                        <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-primary rounded-tr-xl" />
                        <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-primary rounded-bl-xl" />
                        <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-primary rounded-br-xl" />
                        {/* Scanning animation */}
                        {isCheckingConnection && (
                          <div className="absolute inset-1 rounded-xl overflow-hidden pointer-events-none">
                            <div className="absolute inset-0 bg-primary/5" />
                            <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/60 to-transparent animate-[scan_2s_ease-in-out_infinite]" />
                          </div>
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground flex items-center justify-center gap-2">
                          <ScanLine className="h-4 w-4 text-primary" /> Escaneie com seu WhatsApp
                        </p>
                        {isCheckingConnection && (
                          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                            <Loader2 className="h-3 w-3 animate-spin text-primary" /> Verificando conexão...
                          </p>
                        )}
                      </div>
                    </div>
                  ) : dbInstance.pairing_code ? (
                    <div className="space-y-5 text-center w-full">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mx-auto">
                        <Link2 className="h-8 w-8 text-primary" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">Código de Pareamento</p>
                        <p className="text-4xl md:text-5xl font-bold text-foreground tracking-[0.3em] font-mono">{dbInstance.pairing_code}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(dbInstance.pairing_code || "");
                          toast.success("Código copiado!");
                        }}
                        className="gap-2 mx-auto"
                      >
                        <Copy className="h-4 w-4" /> Copiar Código
                      </Button>
                      {isCheckingConnection && (
                        <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                          <Loader2 className="h-3 w-3 animate-spin text-primary" /> Verificando conexão...
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4 text-center">
                      <div className="relative inline-block">
                        <div className="absolute -inset-3 rounded-3xl bg-gradient-to-br from-primary/10 to-transparent blur-sm" />
                        <div className="relative rounded-2xl p-1 bg-gradient-to-br from-primary/20 via-transparent to-primary/20">
                          <div className="rounded-xl bg-secondary/30 p-8">
                            <QrCode className="h-40 w-40 text-muted-foreground/30" />
                          </div>
                        </div>
                        <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-muted-foreground/20 rounded-tl-xl" />
                        <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-muted-foreground/20 rounded-tr-xl" />
                        <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-muted-foreground/20 rounded-bl-xl" />
                        <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-muted-foreground/20 rounded-br-xl" />
                      </div>
                      <p className="text-sm text-muted-foreground">Clique em "Gerar QR Code" para começar</p>
                    </div>
                  )}
                </div>
              </Card>

              {/* Right: Instructions + Action */}
              <div className="space-y-4">
                <Card className="card-luxury">
                  <div className="p-5 space-y-4">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      <Smartphone className="h-5 w-5 text-primary" /> Como conectar
                    </h3>
                    <div className="space-y-3">
                      {[
                        "Abra o WhatsApp no seu celular",
                        "Vá em Configurações → Aparelhos conectados → Conectar um aparelho",
                        "Escaneie o QR Code ou insira o código de pareamento",
                      ].map((step, i) => (
                        <div key={i} className="flex gap-3 items-start">
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                            {i + 1}
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed">{step}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>

                <Button
                  onClick={() => {
                    console.log("Botão clicado, dbInstance no momento do clique:", dbInstance);
                    handleGenerateQRCode();
                  }}
                  disabled={isGeneratingQR}
                  size="lg"
                  className="w-full gap-2"
                >
                  {isGeneratingQR ? (
                    <><Loader2 className="h-5 w-5 animate-spin" /> Gerando QR Code...</>
                  ) : (
                    <><QrCode className="h-5 w-5" /> Gerar QR Code</>
                  )}
                </Button>

                {isCheckingConnection && (
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <div className="flex gap-1">
                      <div className="h-1.5 w-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="h-1.5 w-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="h-1.5 w-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                    <span>Aguardando conexão...</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Tela inicial - só mostra se NÃO houver instância no banco
  return (
    <PlanGuard feature="integracao_whatsapp">
      <>
        <div className={`flex items-center justify-center min-h-screen ${padding}`}>
          <div className="text-center space-y-8 max-w-md animate-fade-in">
            {/* Icon with glow */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl scale-150" />
                <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
                  <MessageSquare className="h-12 w-12 text-primary" />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Conecte seu WhatsApp</h1>
              <p className="text-base text-muted-foreground leading-relaxed">
                Integre o WhatsApp da sua empresa e comece a atender seus clientes automaticamente
              </p>
            </div>

            <Button
              onClick={handleConnect}
              size="lg"
              className="gap-2 text-lg px-10 py-6"
            >
              <MessageSquare className="h-5 w-5" />
              Comece por aqui
            </Button>
          </div>
        </div>

        {/* Connection Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" /> Conectar WhatsApp
              </DialogTitle>
              <DialogDescription>
                Preencha os dados abaixo para integrar seu WhatsApp Business
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Nome da Empresa *</Label>
                <Input
                  id="companyName"
                  value={formData.companyName}
                  onChange={(e) =>
                    setFormData({ ...formData, companyName: e.target.value })
                  }
                  placeholder="ex: minha-empresa"
                  disabled={isConnecting}
                />
                <p className="text-xs text-muted-foreground">
                  Será usado como identificador único (sem espaços)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone do WhatsApp *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  placeholder="(11) 98888-8888"
                  disabled={isConnecting}
                  maxLength={15}
                />
                <p className="text-xs text-muted-foreground">
                  Número que será conectado ao WhatsApp Business
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                disabled={isConnecting}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isConnecting}
                className="gap-2"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Conectando...
                  </>
                ) : (
                  <>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Conectar
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    </PlanGuard>
  );
}
