import { useState, useEffect } from "react";
import { BookOpen, Sparkles, Upload, Loader2, FileText, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlanGuard } from "@/components/PlanGuard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useAuth } from "@/hooks/useAuth";
import { usePlanFeatures } from "@/hooks/usePlanFeatures";
import { LimitAlert } from "@/components/LimitAlert";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

export default function Conhecimento() {
  const { profile, organization } = useAuth();
  const { checkLimit } = usePlanFeatures();
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [customFileName, setCustomFileName] = useState("");
  const [showFileNameDialog, setShowFileNameDialog] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [limitInfo, setLimitInfo] = useState<{ current: number; max: number | null } | null>(null);
  const [documentToDelete, setDocumentToDelete] = useState<any>(null);
  const [isDeletingDocument, setIsDeletingDocument] = useState(false);
  const [documentToView, setDocumentToView] = useState<any>(null);
  const [isLoadingDocumentContent, setIsLoadingDocumentContent] = useState(false);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  // Carregar documentos da tabela geral filtrados por organização
  const loadDocuments = async () => {
    if (!organization?.identificador) {
      console.log("❌ Organization identificador não encontrado");
      return;
    }

    try {
      setIsLoadingDocuments(true);
      
      console.log("=== DEBUG DOCUMENTOS ===");
      console.log("Organization:", organization.nome);
      console.log("Slug:", organization.identificador);
      console.log("Buscando em: documentos");
      console.log("Filtro: metadados->>'organizacao' =", organization.identificador);
      
      // Buscar documentos da tabela geral filtrados por organização
      const { data, error } = await supabase
        .from("documentos")
        .select('*')
        .eq('metadados->>organizacao', organization.identificador);

      if (error) {
        console.error("❌ Erro ao buscar documentos:", error);
        throw error;
      }

      console.log("✅ Documentos encontrados:", data?.length || 0);
      
      if (data && data.length > 0) {
        console.log("📋 Estrutura do primeiro documento:", Object.keys(data[0]));
        console.log("📄 Primeiro documento:", data[0]);
      }
      
      // Filtrar documentos únicos por título (títulos iguais = mesmo arquivo)
      const uniqueDocuments = data ? Array.from(
        new Map(
          data.map(doc => [
            doc.titulo, // Chave: título do documento
            doc // Valor: documento completo
          ])
        ).values()
      ) : [];
      
      console.log("📚 Documentos únicos (títulos distintos):", uniqueDocuments.length);
      console.log("=======================");
      
      setDocuments(uniqueDocuments);

      // Atualizar estado do limite de arquivos (para desabilitar upload quando no limite)
      const res = await checkLimit("max_arquivos_conhecimento");
      setLimitInfo({ current: res.current, max: res.max });
      
    } catch (error: any) {
      console.error("❌ Erro ao carregar documentos:", error);
      setDocuments([]);
    } finally {
      setIsLoadingDocuments(false);
    }
  };

  // Carregar documentos ao montar componente
  useEffect(() => {
    loadDocuments();
  }, [organization?.identificador]);

  // Função para carregar conteúdo completo de um documento (todas as linhas com o mesmo título)
  const handleViewDocumentDetails = async (doc: any) => {
    if (!organization?.identificador) {
      toast.error("Organização não encontrada");
      return;
    }

    try {
      setIsLoadingDocumentContent(true);
      
      const titulo = doc.titulo;
      
      console.log("🔍 === BUSCAR DETALHES DO DOCUMENTO ===");
      console.log("Documento:", doc);
      console.log("Título:", titulo);
      console.log("Tabela: documentos");
      console.log("Filtro 1: metadados->>'organizacao' =", organization.identificador);
      console.log("Filtro 2: titulo =", titulo);

      // Buscar TODAS as linhas com este título da mesma organização
      const { data, error } = await supabase
        .from("documentos")
        .select('*')
        .eq('metadados->>organizacao', organization.identificador)
        .eq('titulo', titulo);

      console.log("Query executada");
      console.log("Resultado:", data);
      console.log("Erro:", error);

      if (error) {
        console.error("❌ Erro ao buscar conteúdo:", error);
        throw error;
      }

      console.log(`✅ Encontradas ${data?.length || 0} partes para este documento`);

      if (data && data.length > 0) {
        console.log("Primeira parte:", data[0]);
        console.log("Campos disponíveis:", Object.keys(data[0]));
      }

      // Combinar todo o conteúdo (títulos iguais = mesmo arquivo)
      const combinedContent = data
        ?.map(row => row.conteudo || "")
        .filter(content => content.trim())
        .join("\n\n");

      // Criar documento agregado
      const aggregatedDoc = {
        ...doc,
        conteudo: combinedContent,
        pageCount: data?.length || 0
      };

      console.log("📄 Conteúdo combinado:", combinedContent?.length ?? 0, "caracteres");
      console.log("📊 Total de partes:", aggregatedDoc.pageCount);
      console.log("=======================");
      
      setDocumentToView(aggregatedDoc);

    } catch (error: any) {
      console.error("❌ ERRO COMPLETO:", error);
      toast.error("Erro ao carregar conteúdo do documento: " + (error.message || "Erro desconhecido"));
    } finally {
      setIsLoadingDocumentContent(false);
    }
  };

  // Função para apagar documento (todas as partes com o mesmo título)
  const handleDeleteDocument = async () => {
    if (!documentToDelete || !organization?.identificador) return;

    try {
      setIsDeletingDocument(true);

      const titulo = documentToDelete.titulo;

      console.log("🗑️ Deletando documento:");
      console.log("  Tabela: documentos");
      console.log("  Título:", titulo);
      console.log("  Organização:", organization.identificador);

      // Enviar para webhook de deleção
      const payload = {
        tableName: "documentos",
        titulo: titulo,
        organizacao: organization.identificador,
        organizationId: organization.id,
        organizationName: organization.nome,
      };

      console.log("Payload enviado:", payload);

      const response = await fetch(`${import.meta.env.VITE_N8N_WEBHOOK_URL}rag-deletar-unico`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao deletar documento");
      }

      const result = await response.json();
      console.log("Resultado da deleção:", result);

      toast.success("Documento deletado com sucesso!");
      
      // Recarregar lista de documentos
      await loadDocuments();
      
    } catch (error: any) {
      console.error("Erro ao deletar documento:", error);
      toast.error(error.message || "Erro ao deletar documento");
    } finally {
      setIsDeletingDocument(false);
      setDocumentToDelete(null);
    }
  };

  // Função para deletar todos os documentos da organização
  const handleDeleteAll = async () => {
    if (!organization?.identificador) {
      toast.error("Informações da organização não encontradas");
      return;
    }

    try {
      setIsDeletingAll(true);

      console.log("🗑️ Deletando TODOS os documentos da organização");
      console.log("Tabela: documentos");
      console.log("Organização:", organization.identificador);

      const payload = {
        tableName: "documentos",
        organizacao: organization.identificador,
        organizationId: organization.id,
        organizationName: organization.nome,
      };

      console.log("Payload enviado:", payload);

      const response = await fetch(`${import.meta.env.VITE_N8N_WEBHOOK_URL}rag-deletar-tudo`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao deletar documentos");
      }

      const result = await response.json();
      console.log("Resultado da deleção:", result);

      toast.success("Todos os documentos foram deletados com sucesso!");
      
      // Recarregar lista de documentos
      await loadDocuments();
      
    } catch (error: any) {
      console.error("Erro ao deletar todos os documentos:", error);
      toast.error(error.message || "Erro ao deletar documentos");
    } finally {
      setIsDeletingAll(false);
      setShowDeleteAllDialog(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (file.type !== "application/pdf") {
      toast.error("Apenas arquivos PDF são permitidos");
      return;
    }

    // Validar tamanho (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 10MB");
      return;
    }

    // Pegar nome sem extensão
    const fileNameWithoutExtension = file.name.replace(/\.pdf$/i, '');
    
    setSelectedFile(file);
    setCustomFileName(fileNameWithoutExtension);
    setShowFileNameDialog(true);
  };

  const handleConfirmFileName = () => {
    if (!customFileName.trim()) {
      toast.error("Por favor, digite um nome para o arquivo");
      return;
    }
    
    setShowFileNameDialog(false);
    toast.success(`Arquivo "${customFileName}" pronto para upload`);
  };

  const handleCancelFileSelection = () => {
    setSelectedFile(null);
    setCustomFileName("");
    setShowFileNameDialog(false);
    
    // Limpar input
    const fileInput = document.getElementById("pdf-upload") as HTMLInputElement;
    if (fileInput) fileInput.value = "";
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Selecione um arquivo PDF primeiro");
      return;
    }

    if (!customFileName.trim()) {
      toast.error("Por favor, digite um nome para o arquivo");
      return;
    }

    if (!organization) {
      toast.error("Organização não encontrada");
      return;
    }

    const limitCheck = await checkLimit("max_arquivos_conhecimento");
    if (limitCheck.max != null && limitCheck.current >= limitCheck.max) {
      toast.error(`Limite de arquivos na base de conhecimento atingido (${limitCheck.current}/${limitCheck.max}). Faça upgrade do plano.`);
      return;
    }

    try {
      setIsUploading(true);

      // Converter arquivo para base64
      const fileBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          resolve(base64.split(',')[1]); // Remove o prefixo data:application/pdf;base64,
        };
        reader.readAsDataURL(selectedFile);
      });

      // Preparar payload com TODAS as informações da organização
      const payload = {
        // Arquivo
        file: fileBase64,
        fileName: `${customFileName}.pdf`, // Nome customizado + extensão
        fileSize: selectedFile.size,
        mimeType: selectedFile.type,
        uploadedBy: profile?.nome_completo || "Usuário",
        uploadedAt: new Date().toISOString(),
        titulo: customFileName, // Nome customizado para o banco

        // Informações da organização
        organization: {
          id: organization.id,
          nome: organization.nome,
          identificador: organization.identificador,
          ativo: organization.ativo,
          url_logo: organization.url_logo,
          criado_em: organization.criado_em,
        }
      };

      console.log("Enviando arquivo para RAG:", {
        fileName: `${customFileName}.pdf`,
        fileSize: selectedFile.size,
        titulo: customFileName,
        organizationId: organization.id,
        organizationName: organization.nome,
      });

      const response = await fetch(`${import.meta.env.VITE_N8N_WEBHOOK_URL}rag-cliente`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao enviar arquivo");
      }

      const result = await response.json();
      console.log("Resultado do upload:", result);

      toast.success("Base de conhecimento atualizada com sucesso!");
      
      setSelectedFile(null);
      setCustomFileName("");
      
      // Limpar input
      const fileInput = document.getElementById("pdf-upload") as HTMLInputElement;
      if (fileInput) fileInput.value = "";

      // Recarregar lista de documentos (já atualiza limitInfo dentro de loadDocuments)
      await loadDocuments();

    } catch (error: any) {
      console.error("Erro ao enviar arquivo:", error);
      toast.error(error.message || "Erro ao processar arquivo");
    } finally {
      setIsUploading(false);
    }
  };

  const atLimit = limitInfo != null && limitInfo.max != null && limitInfo.current >= limitInfo.max;

  return (
    <PlanGuard feature="base_conhecimento">
      <div className="space-y-6 p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className="animate-fade-in">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
              <BookOpen className="h-6 w-6 text-accent" />
            </div>
            <div>
              <h1 className="font-display text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
                Conhecimento do Agente de IA Virtual
              </h1>
            </div>
          </div>
          <Badge className="bg-accent/10 text-accent border-accent/20">
            <Sparkles className="h-3 w-3 mr-1" />
            IA
          </Badge>
        </div>
        <p className="text-base md:text-lg text-muted-foreground">
          Configure a base de conhecimento do seu agente de IA virtual
        </p>
      </div>

      {/* Upload Section */}
      <Card className="card-luxury">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-accent" />
            Upload de Documentos
          </CardTitle>
          <CardDescription>
            Envie documentos PDF para treinar seu agente de IA virtual com informações específicas da sua empresa
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {limitInfo != null && limitInfo.max != null && (
            <LimitAlert
              current={limitInfo.current}
              max={limitInfo.max}
              limitName="arquivos na base de conhecimento"
            />
          )}
          {/* Área de Upload */}
          <div className={atLimit ? "opacity-60 pointer-events-none space-y-4" : "space-y-4"}>
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-accent/50 transition-colors">
              <input
                id="pdf-upload"
                type="file"
                accept="application/pdf"
                onChange={handleFileSelect}
                className="hidden"
                disabled={atLimit}
              />
              <label htmlFor={atLimit ? undefined : "pdf-upload"} className={atLimit ? "cursor-not-allowed" : "cursor-pointer"}>
                <div className="flex flex-col items-center gap-3">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
                    <FileText className="h-8 w-8 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {atLimit ? "Limite de arquivos atingido" : "Clique para selecionar um arquivo PDF"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {atLimit
                        ? `Você está usando ${limitInfo?.current ?? 0} de ${limitInfo?.max ?? 0} arquivos. Faça upgrade para enviar mais.`
                        : "Máximo 10MB por arquivo"}
                    </p>
                  </div>
                </div>
              </label>
            </div>

            {/* Arquivo Selecionado */}
            {selectedFile && !showFileNameDialog && (
              <div className="bg-accent/5 border border-accent/20 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-accent" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {customFileName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={handleCancelFileSelection}
                    variant="ghost"
                    size="sm"
                  >
                    Remover
                  </Button>
                </div>
              </div>
            )}

            {/* Botão de Upload */}
            <Button
              onClick={handleUpload}
              disabled={atLimit || !selectedFile || isUploading}
              className="w-full gap-2"
              size="lg"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Processando base de conhecimento...
                </>
              ) : (
                <>
                  <Upload className="h-5 w-5" />
                  Subir Base de Conhecimento do Agente de IA
                </>
              )}
            </Button>
          </div>

          {/* Informações */}
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-foreground mb-2">
              ℹ️ Como funciona?
            </h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Envie documentos em PDF sobre sua empresa, procedimentos, políticas, etc.</li>
              <li>• O Agente de IA usará essas informações para responder perguntas dos clientes</li>
              <li>• Quanto mais informações você fornecer, mais preciso será o agente de IA</li>
              <li>• O processamento pode levar alguns minutos</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Documentos */}
      {isLoadingDocuments ? (
        <Card className="card-luxury">
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
          </CardContent>
        </Card>
      ) : documents.length > 0 ? (
        <div className="space-y-6 animate-fade-in-up">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-accent" />
              Base de Conhecimento
            </h3>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-accent/10 text-accent border-accent/20">
                {documents.length} {documents.length === 1 ? 'documento' : 'documentos'}
              </Badge>
              {documents.length > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDeleteAllDialog(true)}
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Excluir Tudo
                </Button>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map((doc, index) => (
              <Card 
                key={doc.id || index} 
                className="group card-luxury hover:border-accent/50 hover:shadow-xl hover:shadow-accent/10 transition-all duration-300 overflow-hidden"
              >
                <CardContent className="p-0">
                  <div className="p-5">
                    {/* Header com título e ações */}
                    <div className="flex items-start gap-3 mb-4">
                      {/* Ícone */}
                      <div className="flex-shrink-0 mt-0.5">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-accent/20 to-accent/5 group-hover:from-accent/30 group-hover:to-accent/10 transition-colors">
                          <FileText className="h-5 w-5 text-accent" />
                        </div>
                      </div>
                      
                      {/* Título e Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-foreground text-base leading-tight line-clamp-2 mb-2 group-hover:text-accent transition-colors">
                          {doc.titulo || "Documento sem título"}
                        </h4>
                        
                        {/* Data */}
                        {(doc.created_at || doc.createdAt || doc.created) && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>
                              {new Date(doc.created_at || doc.createdAt || doc.created).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: 'long',
                                year: 'numeric'
                              })}
                            </span>
                          </div>
                        )}
                        
                        {/* Metadados da organização */}
                        {doc.metadados?.organizacao && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70 mt-1">
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            <span className="truncate">
                              {doc.metadados.organizacao}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {/* Botão de deletar */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDocumentToDelete(doc);
                        }}
                        className="h-8 w-8 flex-shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title="Deletar documento"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {/* Divider sutil */}
                    <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-4"></div>
                    
                    {/* Botão Ver Detalhes */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewDocumentDetails(doc);
                      }}
                      disabled={isLoadingDocumentContent}
                      className="w-full gap-2 h-9 text-accent border-accent/30 hover:bg-accent/10 hover:border-accent transition-all font-medium"
                    >
                      {isLoadingDocumentContent ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Carregando...</span>
                        </>
                      ) : (
                        <>
                          <BookOpen className="h-3.5 w-3.5" />
                          <span>Ver conteúdo</span>
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <Card className="card-luxury border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent/5 mb-4">
              <FileText className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Nenhum documento ainda
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Faça upload do primeiro PDF para começar a construir a base de conhecimento do seu Agent IA.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Dialog para perguntar o nome do arquivo */}
      <Dialog open={showFileNameDialog} onOpenChange={setShowFileNameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nome do Documento</DialogTitle>
            <DialogDescription>
              Digite um nome para identificar este documento na base de conhecimento do Agent IA.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="fileName">Nome do Arquivo</Label>
              <Input
                id="fileName"
                value={customFileName}
                onChange={(e) => setCustomFileName(e.target.value)}
                placeholder="Ex: Manual da Empresa"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleConfirmFileName();
                  }
                }}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Este nome será usado para identificar o documento na sua base de conhecimento.
              </p>
            </div>
            
            {selectedFile && (
              <div className="bg-secondary/30 rounded-lg p-3 text-sm">
                <p className="text-muted-foreground">
                  <strong>Arquivo original:</strong> {selectedFile.name}
                </p>
                <p className="text-muted-foreground">
                  <strong>Tamanho:</strong> {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCancelFileSelection}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmFileName}
              disabled={!customFileName.trim()}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para visualizar conteúdo do documento */}
      <Dialog open={!!documentToView} onOpenChange={() => setDocumentToView(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-accent" />
              {documentToView?.titulo || "Documento"}
            </DialogTitle>
            <DialogDescription>
              Conteúdo extraído do documento PDF
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto">
            <div className="bg-secondary/30 border border-border rounded-lg p-6">
              {documentToView?.conteudo ? (
                <pre className="text-sm text-foreground whitespace-pre-wrap font-sans leading-relaxed">
                  {documentToView.conteudo}
                </pre>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum conteúdo disponível para este documento.</p>
                </div>
              )}
            </div>

            {documentToView?.conteudo && (
              <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                <Sparkles className="h-4 w-4 text-accent" />
                <span>
                  {documentToView.conteudo.length} caracteres indexados
                </span>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDocumentToView(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog para confirmar deleção */}
      <AlertDialog open={!!documentToDelete} onOpenChange={() => setDocumentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o documento <strong>"{documentToDelete?.titulo}"</strong>?
              <br />
              <br />
              Esta ação não pode ser desfeita e o documento será removido permanentemente da base de conhecimento do Agente de IA.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingDocument}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDocument}
              disabled={isDeletingDocument}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingDocument ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deletando...
                </>
              ) : (
                "Deletar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Alert Dialog para confirmar deleção de tudo */}
      <AlertDialog open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Excluir Toda a Base de Conhecimento
            </AlertDialogTitle>
            <AlertDialogDescription>
              <strong className="text-destructive">ATENÇÃO:</strong> Você está prestes a excluir <strong>TODOS os {documents.length} documentos</strong> da base de conhecimento do Agent IA.
              <br />
              <br />
              Esta ação é <strong>IRREVERSÍVEL</strong> e todos os documentos serão permanentemente removidos.
              <br />
              <br />
              Tem certeza que deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingAll}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAll}
              disabled={isDeletingAll}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingAll ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deletando tudo...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Sim, excluir tudo
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </PlanGuard>
  );
}

