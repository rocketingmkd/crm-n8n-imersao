import { useState, useEffect } from "react";
import { Bot, Sparkles, Save, Loader2, Edit, X, Clock, MessageSquare, Smile, Plus, Trash2, Bell, FileQuestion, Zap, BarChart3, BookOpen, Upload, FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlanGuard } from "@/components/PlanGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LimitAlert } from "@/components/LimitAlert";
import { useAuth } from "@/hooks/useAuth";
import { usePlanFeatures } from "@/hooks/usePlanFeatures";
import { supabase } from "@/lib/supabase";
import { supabase as supabaseClient } from "@/integrations/supabase/client";
import { obterNomeTabelaConversas } from "@/lib/conversas";
import { toast } from "sonner";
import { useChatMetrics } from "@/hooks/useChatMetrics";
import { DatePicker } from "@/components/ui/date-picker";
import { endOfDay, startOfDay, subDays } from "date-fns";

// ─── Types ───────────────────────────────────────────────
interface AgentConfig {
  id?: string;
  nome_agente: string;
  personality: string;
  pause_duration_seconds: number;
  customer_pause_duration_seconds: number;
  greeting_message: string;
  closing_message: string;
  chave_openai?: string | null;
  reminder_1_minutes: number;
  reminder_2_minutes: number;
  reminder_3_minutes: number;
  follow_up_1_minutes: number;
  follow_up_2_minutes: number;
  follow_up_3_minutes: number;
  qualification_questions: any;
  confirmation_email_html?: string | null;
}

function dbRowToAgentConfig(row: Record<string, unknown>): AgentConfig {
  const num = (v: unknown, def: number) => (v != null && !Number.isNaN(Number(v)) ? Number(v) : def);
  return {
    ...row,
    id: row.id as string | undefined,
    nome_agente: (row.nome_agente as string) ?? "Assistente Virtual",
    personality: (row.personalidade as string) ?? "profissional",
    pause_duration_seconds: num(row.pausa_segundos, 1800),
    customer_pause_duration_seconds: num(row.pausa_cliente_segundos, 300),
    greeting_message: (row.mensagem_boas_vindas as string) ?? "",
    closing_message: (row.mensagem_encerramento as string) ?? "",
    chave_openai: (row.chave_openai as string | null) ?? null,
    reminder_1_minutes: num(row.lembrete_1_minutos, 15),
    reminder_2_minutes: num(row.lembrete_2_minutos, 60),
    reminder_3_minutes: num(row.lembrete_3_minutos, 1440),
    follow_up_1_minutes: num(row.followup_1_minutos, 60),
    follow_up_2_minutes: num(row.followup_2_minutos, 1440),
    follow_up_3_minutes: num(row.followup_3_minutos, 4320),
    qualification_questions: row.perguntas_qualificacao ?? [],
    confirmation_email_html: (row.email_confirmacao_html as string | null) ?? null,
  } as AgentConfig;
}

const personalityLabels: Record<string, string> = {
  profissional: "Profissional",
  amigavel: "Amigável",
  formal: "Formal",
  descontraido: "Descontraído",
  empatico: "Empático",
  tecnico: "Técnico",
  criativo: "Criativo",
  consultivo: "Consultivo",
  motivador: "Motivador",
  didatico: "Didático",
};

// ─── Conhecimento Tab Component ──────────────────────────
function ConhecimentoTab() {
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

  const loadDocuments = async () => {
    if (!organization?.identificador) return;
    try {
      setIsLoadingDocuments(true);
      const { data, error } = await supabaseClient.from("documentos").select('*').eq('metadata->>organizacao', organization.identificador);
      if (error) throw error;
      const uniqueDocuments = data ? Array.from(new Map(data.map(doc => [doc.titulo, doc])).values()) : [];
      setDocuments(uniqueDocuments);
      const res = await checkLimit("max_arquivos_conhecimento");
      setLimitInfo({ current: res.current, max: res.max });
    } catch (error: any) {
      console.error("Erro ao carregar documentos:", error);
      setDocuments([]);
    } finally {
      setIsLoadingDocuments(false);
    }
  };

  useEffect(() => { loadDocuments(); }, [organization?.identificador]);

  const handleViewDocumentDetails = async (doc: any) => {
    if (!organization?.identificador) return;
    try {
      setIsLoadingDocumentContent(true);
      const { data, error } = await supabaseClient.from("documentos").select('*').eq('metadata->>organizacao', organization.identificador).eq('titulo', doc.titulo);
      if (error) throw error;
      const combinedContent = data?.map(row => row.content ?? row.conteudo ?? "").filter(c => c.trim()).join("\n\n");
      setDocumentToView({ ...doc, conteudo: combinedContent, pageCount: data?.length || 0 });
    } catch (error: any) {
      toast.error("Erro ao carregar conteúdo do documento");
    } finally {
      setIsLoadingDocumentContent(false);
    }
  };

  const handleDeleteDocument = async () => {
    if (!documentToDelete || !organization?.identificador) return;
    try {
      setIsDeletingDocument(true);
      const response = await fetch(`${import.meta.env.VITE_N8N_WEBHOOK_URL}rag-deletar-unico`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableName: "documentos", titulo: documentToDelete.titulo, organizacao: organization.identificador, organizationId: organization.id, organizationName: organization.nome }),
      });
      if (!response.ok) throw new Error("Erro ao deletar documento");
      toast.success("Documento deletado com sucesso!");
      await loadDocuments();
    } catch (error: any) {
      toast.error(error.message || "Erro ao deletar documento");
    } finally {
      setIsDeletingDocument(false);
      setDocumentToDelete(null);
    }
  };

  const handleDeleteAll = async () => {
    if (!organization?.identificador) return;
    try {
      setIsDeletingAll(true);
      const response = await fetch(`${import.meta.env.VITE_N8N_WEBHOOK_URL}rag-deletar-tudo`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableName: "documentos", organizacao: organization.identificador, organizationId: organization.id, organizationName: organization.nome }),
      });
      if (!response.ok) throw new Error("Erro ao deletar documentos");
      toast.success("Todos os documentos foram deletados com sucesso!");
      await loadDocuments();
    } catch (error: any) {
      toast.error(error.message || "Erro ao deletar documentos");
    } finally {
      setIsDeletingAll(false);
      setShowDeleteAllDialog(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") { toast.error("Apenas arquivos PDF são permitidos"); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("Arquivo muito grande. Máximo 10MB"); return; }
    setSelectedFile(file);
    setCustomFileName(file.name.replace(/\.pdf$/i, ''));
    setShowFileNameDialog(true);
  };

  const handleConfirmFileName = () => {
    if (!customFileName.trim()) { toast.error("Por favor, digite um nome para o arquivo"); return; }
    setShowFileNameDialog(false);
  };

  const handleCancelFileSelection = () => {
    setSelectedFile(null); setCustomFileName(""); setShowFileNameDialog(false);
    const fileInput = document.getElementById("pdf-upload") as HTMLInputElement;
    if (fileInput) fileInput.value = "";
  };

  const handleUpload = async () => {
    if (!selectedFile || !customFileName.trim() || !organization) return;
    const limitCheck = await checkLimit("max_arquivos_conhecimento");
    if (limitCheck.max != null && limitCheck.current >= limitCheck.max) {
      toast.error(`Limite de arquivos atingido (${limitCheck.current}/${limitCheck.max}).`);
      return;
    }
    try {
      setIsUploading(true);
      const fileBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(selectedFile);
      });
      const response = await fetch(`${import.meta.env.VITE_N8N_WEBHOOK_URL}rag-cliente`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file: fileBase64, fileName: `${customFileName}.pdf`, fileSize: selectedFile.size, mimeType: selectedFile.type,
          uploadedBy: profile?.nome_completo || "Usuário", uploadedAt: new Date().toISOString(), titulo: customFileName,
          organization: { id: organization.id, nome: organization.nome, identificador: organization.identificador, ativo: organization.ativo, url_logo: organization.url_logo, criado_em: organization.criado_em },
        }),
      });
      if (!response.ok) throw new Error("Erro ao enviar arquivo");
      toast.success("Base de conhecimento atualizada com sucesso!");
      setSelectedFile(null); setCustomFileName("");
      const fileInput = document.getElementById("pdf-upload") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
      await loadDocuments();
    } catch (error: any) {
      toast.error(error.message || "Erro ao processar arquivo");
    } finally {
      setIsUploading(false);
    }
  };

  const atLimit = limitInfo != null && limitInfo.max != null && limitInfo.current >= limitInfo.max;

  return (
    <div className="space-y-6">
      {/* Upload */}
      <Card className="card-luxury">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5 text-accent" /> Upload de Documentos</CardTitle>
          <CardDescription>Envie documentos PDF para treinar seu agente de IA com informações específicas da sua empresa</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {limitInfo != null && limitInfo.max != null && (
            <LimitAlert current={limitInfo.current} max={limitInfo.max} limitName="arquivos na base de conhecimento" />
          )}
          <div className={atLimit ? "opacity-60 pointer-events-none space-y-4" : "space-y-4"}>
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-accent/50 transition-colors">
              <input id="pdf-upload" type="file" accept="application/pdf" onChange={handleFileSelect} className="hidden" disabled={atLimit} />
              <label htmlFor={atLimit ? undefined : "pdf-upload"} className={atLimit ? "cursor-not-allowed" : "cursor-pointer"}>
                <div className="flex flex-col items-center gap-3">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/10"><FileText className="h-8 w-8 text-accent" /></div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{atLimit ? "Limite de arquivos atingido" : "Clique para selecionar um arquivo PDF"}</p>
                    <p className="text-xs text-muted-foreground mt-1">{atLimit ? `Usando ${limitInfo?.current ?? 0} de ${limitInfo?.max ?? 0} arquivos.` : "Máximo 10MB por arquivo"}</p>
                  </div>
                </div>
              </label>
            </div>
            {selectedFile && !showFileNameDialog && (
              <div className="bg-accent/5 border border-accent/20 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-accent" />
                    <div><p className="text-sm font-medium text-foreground">{customFileName}</p><p className="text-xs text-muted-foreground">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p></div>
                  </div>
                  <Button onClick={handleCancelFileSelection} variant="ghost" size="sm">Remover</Button>
                </div>
              </div>
            )}
            <Button onClick={handleUpload} disabled={atLimit || !selectedFile || isUploading} className="w-full gap-2" size="lg">
              {isUploading ? <><Loader2 className="h-5 w-5 animate-spin" /> Processando...</> : <><Upload className="h-5 w-5" /> Subir Base de Conhecimento</>}
            </Button>
          </div>
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-foreground mb-2">ℹ️ Como funciona?</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Envie documentos em PDF sobre sua empresa, procedimentos, políticas, etc.</li>
              <li>• O Agente de IA usará essas informações para responder perguntas dos clientes</li>
              <li>• Quanto mais informações você fornecer, mais preciso será o agente</li>
              <li>• O processamento pode levar alguns minutos</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Documentos */}
      {isLoadingDocuments ? (
        <Card className="card-luxury"><CardContent className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-accent" /></CardContent></Card>
      ) : documents.length > 0 ? (
        <div className="space-y-6 animate-fade-in-up">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-foreground flex items-center gap-2"><BookOpen className="h-6 w-6 text-accent" /> Base de Conhecimento</h3>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-accent/10 text-accent border-accent/20">{documents.length} {documents.length === 1 ? 'documento' : 'documentos'}</Badge>
              <Button variant="destructive" size="sm" onClick={() => setShowDeleteAllDialog(true)} className="gap-2"><Trash2 className="h-4 w-4" /> Excluir Tudo</Button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map((doc, index) => (
              <Card key={doc.id || index} className="group card-luxury hover:border-accent/50 hover:shadow-xl hover:shadow-accent/10 transition-all duration-300 overflow-hidden">
                <CardContent className="p-0">
                  <div className="p-5">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="flex-shrink-0 mt-0.5">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-accent/20 to-accent/5"><FileText className="h-5 w-5 text-accent" /></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-foreground text-base leading-tight line-clamp-2 mb-2 group-hover:text-accent transition-colors">{doc.titulo || "Documento sem título"}</h4>
                        {(doc.created_at || doc.createdAt || doc.created) && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span>{new Date(doc.created_at || doc.createdAt || doc.created).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                          </div>
                        )}
                      </div>
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setDocumentToDelete(doc); }} className="h-8 w-8 flex-shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                    <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-4"></div>
                    <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleViewDocumentDetails(doc); }} disabled={isLoadingDocumentContent} className="w-full gap-2 h-9 text-accent border-accent/30 hover:bg-accent/10 hover:border-accent font-medium">
                      {isLoadingDocumentContent ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando...</> : <><BookOpen className="h-3.5 w-3.5" /> Ver conteúdo</>}
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
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent/5 mb-4"><FileText className="h-10 w-10 text-muted-foreground" /></div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Nenhum documento ainda</h3>
            <p className="text-sm text-muted-foreground max-w-sm">Faça upload do primeiro PDF para começar a construir a base de conhecimento.</p>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <Dialog open={showFileNameDialog} onOpenChange={setShowFileNameDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nome do Documento</DialogTitle><DialogDescription>Digite um nome para identificar este documento na base de conhecimento.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="fileName">Nome do Arquivo</Label>
              <Input id="fileName" value={customFileName} onChange={(e) => setCustomFileName(e.target.value)} placeholder="Ex: Manual da Empresa" onKeyDown={(e) => { if (e.key === 'Enter') handleConfirmFileName(); }} autoFocus />
            </div>
            {selectedFile && (
              <div className="bg-secondary/30 rounded-lg p-3 text-sm">
                <p className="text-muted-foreground"><strong>Arquivo original:</strong> {selectedFile.name}</p>
                <p className="text-muted-foreground"><strong>Tamanho:</strong> {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelFileSelection}>Cancelar</Button>
            <Button onClick={handleConfirmFileName} disabled={!customFileName.trim()}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!documentToView} onOpenChange={() => setDocumentToView(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-accent" /> {documentToView?.titulo || "Documento"}</DialogTitle></DialogHeader>
          <div className="flex-1 overflow-y-auto">
            <div className="bg-secondary/30 border border-border rounded-lg p-6">
              {documentToView?.conteudo ? <pre className="text-sm text-foreground whitespace-pre-wrap font-sans leading-relaxed">{documentToView.conteudo}</pre> : (
                <div className="text-center py-12 text-muted-foreground"><FileText className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>Nenhum conteúdo disponível.</p></div>
              )}
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDocumentToView(null)}>Fechar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!documentToDelete} onOpenChange={() => setDocumentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja excluir o documento <strong>"{documentToDelete?.titulo}"</strong>? Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingDocument}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteDocument} disabled={isDeletingDocument} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeletingDocument ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deletando...</> : "Deletar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle className="flex items-center gap-2 text-destructive"><Trash2 className="h-5 w-5" /> Excluir Toda a Base de Conhecimento</AlertDialogTitle>
            <AlertDialogDescription><strong className="text-destructive">ATENÇÃO:</strong> Todos os {documents.length} documentos serão permanentemente removidos. Esta ação é <strong>IRREVERSÍVEL</strong>.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingAll}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAll} disabled={isDeletingAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeletingAll ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deletando tudo...</> : <><Trash2 className="mr-2 h-4 w-4" /> Sim, excluir tudo</>}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────
export default function AgentIA({ embedded = false }: { embedded?: boolean }) {
  const { profile, organization } = useAuth();
  const { hasFeature } = usePlanFeatures();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [totalTokens, setTotalTokens] = useState<number>(0);
  const [totalCost, setTotalCost] = useState<number>(0);
  const [isLoadingTokens, setIsLoadingTokens] = useState(true);

  const [conversationsToday, setConversationsToday] = useState<number>(0);
  const [responseRate, setResponseRate] = useState<number>(0);
  const [qualifiedLeads, setQualifiedLeads] = useState<number>(0);
  const [avgResponseTime, setAvgResponseTime] = useState<number>(0);
  const [avgConversationTime, setAvgConversationTime] = useState<number>(0);
  const [totalMessages, setTotalMessages] = useState<number>(0);
  const [messagesPerConversation, setMessagesPerConversation] = useState<number>(0);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  type AnalyticsPeriod = "today" | "7d" | "30d" | "90d" | "custom";
  const [analyticsPeriod, setAnalyticsPeriod] = useState<AnalyticsPeriod>("7d");
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");

  const analyticsRange = (() => {
    const end = endOfDay(new Date());
    if (analyticsPeriod === "today") {
      return { start: startOfDay(new Date()), end };
    }
    if (analyticsPeriod === "7d") return { start: startOfDay(subDays(new Date(), 6)), end };
    if (analyticsPeriod === "30d") return { start: startOfDay(subDays(new Date(), 29)), end };
    if (analyticsPeriod === "90d") return { start: startOfDay(subDays(new Date(), 89)), end };
    if (analyticsPeriod === "custom" && customStart && customEnd) {
      const start = startOfDay(new Date(customStart + "T00:00:00"));
      const endDate = endOfDay(new Date(customEnd + "T23:59:59"));
      return { start, end: endDate };
    }
    return { start: startOfDay(subDays(new Date(), 6)), end };
  })();

  const { data: chatMetrics, isLoading: isLoadingChatMetrics } = useChatMetrics({
    start: analyticsRange.start,
    end: analyticsRange.end,
  });

  const [reminder1Value, setReminder1Value] = useState(15);
  const [reminder1Unit, setReminder1Unit] = useState<'minutos' | 'horas' | 'dias'>('minutos');
  const [reminder2Value, setReminder2Value] = useState(1);
  const [reminder2Unit, setReminder2Unit] = useState<'minutos' | 'horas' | 'dias'>('horas');
  const [reminder3Value, setReminder3Value] = useState(1);
  const [reminder3Unit, setReminder3Unit] = useState<'minutos' | 'horas' | 'dias'>('dias');

  const [followUp1Value, setFollowUp1Value] = useState(1);
  const [followUp1Unit, setFollowUp1Unit] = useState<'minutos' | 'horas' | 'dias'>('horas');
  const [followUp2Value, setFollowUp2Value] = useState(1);
  const [followUp2Unit, setFollowUp2Unit] = useState<'minutos' | 'horas' | 'dias'>('dias');
  const [followUp3Value, setFollowUp3Value] = useState(3);
  const [followUp3Unit, setFollowUp3Unit] = useState<'minutos' | 'horas' | 'dias'>('dias');

  const [config, setConfig] = useState<AgentConfig>({
    nome_agente: "Assistente Virtual", personality: "profissional",
    pause_duration_seconds: 1800, customer_pause_duration_seconds: 300,
    greeting_message: "Olá! Sou o assistente virtual da empresa. Como posso ajudá-lo hoje?",
    closing_message: "Foi um prazer atendê-lo! Se precisar de algo mais, estou à disposição.",
    chave_openai: null, reminder_1_minutes: 15, reminder_2_minutes: 60, reminder_3_minutes: 1440,
    follow_up_1_minutes: 60, follow_up_2_minutes: 1440, follow_up_3_minutes: 4320, qualification_questions: [],
  });
  const [editConfig, setEditConfig] = useState<AgentConfig>(config);

  useEffect(() => { loadConfig(); loadTotalTokens(); }, [profile?.id_organizacao]);
  useEffect(() => { loadStats(analyticsRange.start, analyticsRange.end); }, [profile?.id_organizacao, organization?.identificador, analyticsRange.start.toISOString(), analyticsRange.end.toISOString(), chatMetrics]);

  const secondsToMinutes = (s: number | null | undefined): number => { const n = Number(s); return Number.isFinite(n) ? Math.round(n / 60) : 0; };
  const minutesToSeconds = (m: number): number => m * 60;
  const minutesToUnit = (min: number, unit: 'minutos' | 'horas' | 'dias'): number => {
    if (unit === 'horas') return Math.round(min / 60);
    if (unit === 'dias') return Math.round(min / 1440);
    return min;
  };
  const unitToMinutes = (v: number, unit: 'minutos' | 'horas' | 'dias'): number => {
    if (unit === 'horas') return v * 60;
    if (unit === 'dias') return v * 1440;
    return v;
  };
  const formatReminderDisplay = (minutes: number | null | undefined): string => {
    const m = Number(minutes); const min = Number.isFinite(m) && m >= 0 ? m : 0;
    if (min < 60) return `${min} ${min === 1 ? 'minuto' : 'minutos'}`;
    if (min < 1440) { const h = Math.round(min / 60); return `${h} ${h === 1 ? 'hora' : 'horas'}`; }
    const d = Math.round(min / 1440); return `${d} ${d === 1 ? 'dia' : 'dias'}`;
  };

  useEffect(() => {
    if (!isEditing) return;
    const detect = (m: number): 'minutos' | 'horas' | 'dias' => { if (m % 1440 === 0) return 'dias'; if (m % 60 === 0) return 'horas'; return 'minutos'; };
    const u1 = detect(editConfig.reminder_1_minutes); setReminder1Unit(u1); setReminder1Value(minutesToUnit(editConfig.reminder_1_minutes, u1));
    const u2 = detect(editConfig.reminder_2_minutes); setReminder2Unit(u2); setReminder2Value(minutesToUnit(editConfig.reminder_2_minutes, u2));
    const u3 = detect(editConfig.reminder_3_minutes); setReminder3Unit(u3); setReminder3Value(minutesToUnit(editConfig.reminder_3_minutes, u3));
    const f1 = detect(editConfig.follow_up_1_minutes); setFollowUp1Unit(f1); setFollowUp1Value(minutesToUnit(editConfig.follow_up_1_minutes, f1));
    const f2 = detect(editConfig.follow_up_2_minutes); setFollowUp2Unit(f2); setFollowUp2Value(minutesToUnit(editConfig.follow_up_2_minutes, f2));
    const f3 = detect(editConfig.follow_up_3_minutes); setFollowUp3Unit(f3); setFollowUp3Value(minutesToUnit(editConfig.follow_up_3_minutes, f3));
  }, [isEditing, editConfig.reminder_1_minutes, editConfig.reminder_2_minutes, editConfig.reminder_3_minutes, editConfig.follow_up_1_minutes, editConfig.follow_up_2_minutes, editConfig.follow_up_3_minutes]);

  const loadConfig = async () => {
    if (!profile?.id_organizacao) return;
    try {
      setIsLoading(true);
      const { data, error } = await supabase.from("config_agente_ia").select("*").eq("id_organizacao", profile.id_organizacao).single();
      if (error && error.code !== "PGRST116") throw error;
      const { data: gs } = await supabase.from("configuracoes_globais").select("chave_openai").single();
      if (data) { const m = dbRowToAgentConfig({ ...data, chave_openai: gs?.chave_openai ?? (data as any).chave_openai ?? null }); setConfig(m); setEditConfig(m); }
    } catch (e) { console.error("Erro ao carregar configurações:", e); toast.error("Erro ao carregar configurações"); }
    finally { setIsLoading(false); }
  };

  const loadTotalTokens = async () => {
    if (!profile?.id_organizacao) return;
    try { setIsLoadingTokens(true); const { data, error } = await supabase.from("uso_tokens").select("total_tokens, custo_reais").eq("id_organizacao", profile.id_organizacao); if (error) throw error; setTotalTokens(data?.reduce((s, r: any) => s + (r.total_tokens || 0), 0) || 0); setTotalCost(data?.reduce((s, r: any) => s + (r.custo_reais || 0), 0) || 0); }
    catch { setTotalTokens(0); setTotalCost(0); }
    finally { setIsLoadingTokens(false); }
  };

  const loadStats = async (periodStart: Date, periodEnd: Date) => {
    if (!profile?.id_organizacao) return;
    try {
      setIsLoadingStats(true);
      if (chatMetrics) {
        setConversationsToday(chatMetrics.conversationsToday);
        setTotalMessages(chatMetrics.totalMessages);
      }
      if (!organization?.identificador) { setIsLoadingStats(false); return; }
      const tableName = await obterNomeTabelaConversas(supabase, organization.identificador);
      if (!tableName) { setIsLoadingStats(false); return; }
      const startStr = periodStart.toISOString().slice(0, 19);
      const endStr = periodEnd.toISOString().slice(0, 19);
      let allMessages: any[] = [];
      const { data: data1, error: err1 } = await (supabase as any)
        .from(tableName)
        .select("id, message, data, session_id")
        .gte("data", startStr)
        .lte("data", endStr)
        .order("data", { ascending: true });
      if (!err1 && data1?.length) {
        allMessages = data1;
      } else if (err1?.code === "42703") {
        const { data: data2, error: err2 } = await (supabase as any)
          .from(tableName)
          .select("id, message, data, id_sessao")
          .gte("data", startStr)
          .lte("data", endStr)
          .order("data", { ascending: true });
        if (!err2 && data2?.length) allMessages = data2.map((m: any) => ({ ...m, session_id: m.id_sessao ?? m.session_id }));
      }
      if (!allMessages.length) {
        setMessagesPerConversation(0);
        setResponseRate(0);
        setAvgResponseTime(0);
        setAvgConversationTime(0);
        setIsLoadingStats(false);
        return;
      }
      const sessionMessages: Record<string, any[]> = {};
      allMessages.forEach((m: any) => {
        const sid = m.session_id ?? m.id_sessao ?? "";
        if (!sessionMessages[sid]) sessionMessages[sid] = [];
        sessionMessages[sid].push(m);
      });
      setMessagesPerConversation(Object.keys(sessionMessages).length > 0 ? Math.round(allMessages.length / Object.keys(sessionMessages).length) : 0);
      let responded = 0;
      const rTimes: number[] = [];
      const cDurations: number[] = [];
      Object.values(sessionMessages).forEach((msgs: any[]) => {
        msgs.sort((a, b) => new Date((a.data ?? "").toString()).getTime() - new Date((b.data ?? "").toString()).getTime());
        let hasU = false, hasA = false;
        if (msgs.length > 0) {
          const d = (new Date(msgs[msgs.length - 1].data).getTime() - new Date(msgs[0].data).getTime()) / 60000;
          if (d > 0 && d < 1440) cDurations.push(d);
        }
        for (let i = 0; i < msgs.length; i++) {
          if (msgs[i].message?.role === "user" || msgs[i].message?.from === "user") {
            hasU = true;
            for (let j = i + 1; j < msgs.length; j++) {
              if (msgs[j].message?.role === "assistant" || msgs[j].message?.from === "assistant" || msgs[j].message?.from === "system") {
                hasA = true;
                const m = (new Date(msgs[j].data).getTime() - new Date(msgs[i].data).getTime()) / 60000;
                if (m > 0 && m < 60) rTimes.push(m);
                break;
              }
            }
          }
        }
        if (hasU && hasA) responded++;
      });
      const withUser = Object.values(sessionMessages).filter((ms: any[]) =>
        ms.some((m: any) => m.message?.role === "user" || m.message?.from === "user")
      ).length;
      setResponseRate(withUser > 0 ? Math.round((responded / withUser) * 100) : 0);
      setAvgResponseTime(rTimes.length > 0 ? Math.round((rTimes.reduce((s, t) => s + t, 0) / rTimes.length) * 10) / 10 : 0);
      setAvgConversationTime(cDurations.length > 0 ? Math.round((cDurations.reduce((s, t) => s + t, 0) / cDurations.length) * 10) / 10 : 0);
      const { data: ql } = await supabase.from("clientes_followup").select("id").eq("id_organizacao", profile.id_organizacao).in("situacao", ["qualificado", "agendado", "concluido"]);
      setQualifiedLeads(ql?.length || 0);
    } catch {
      setMessagesPerConversation(0);
      setResponseRate(0);
      setAvgResponseTime(0);
      setAvgConversationTime(0);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const handleEdit = () => { setEditConfig(config); setIsEditing(true); };
  const handleCancel = () => { setEditConfig(config); setIsEditing(false); };
  const handleSave = async () => {
    if (!profile?.id_organizacao) { toast.error("Erro: organização não identificada"); return; }
    try {
      setIsSaving(true);
      const d = {
        id_organizacao: profile.id_organizacao, nome_agente: editConfig.nome_agente, personalidade: editConfig.personality,
        pausa_segundos: editConfig.pause_duration_seconds, pausa_cliente_segundos: editConfig.customer_pause_duration_seconds,
        mensagem_boas_vindas: editConfig.greeting_message, mensagem_encerramento: editConfig.closing_message,
        lembrete_1_minutos: editConfig.reminder_1_minutes, lembrete_2_minutos: editConfig.reminder_2_minutes, lembrete_3_minutos: editConfig.reminder_3_minutes,
        followup_1_minutos: editConfig.follow_up_1_minutes, followup_2_minutos: editConfig.follow_up_2_minutes, followup_3_minutos: editConfig.follow_up_3_minutes,
        perguntas_qualificacao: editConfig.qualification_questions,
      };
      if (config.id) { const { error } = await supabase.from("config_agente_ia")// @ts-ignore
        .update(d).eq("id", config.id); if (error) throw error; }
      else { const { data, error } = await supabase.from("config_agente_ia")// @ts-ignore
        .insert(d).select().single(); if (error) throw error; if (data) { const m = dbRowToAgentConfig({ ...data, chave_openai: config.chave_openai ?? null }); setConfig(m); setEditConfig(m); setIsEditing(false); toast.success("Configurações salvas!"); return; } }
      setConfig(editConfig); setIsEditing(false); toast.success("Configurações salvas!");
    } catch { toast.error("Erro ao salvar configurações"); } finally { setIsSaving(false); }
  };

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-screen"><div className="text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div><p className="text-muted-foreground">Carregando configurações...</p></div></div>
  );

  const EditSaveButtons = () => !isEditing ? (
    <Button onClick={handleEdit} variant="outline" className="gap-2"><Edit className="h-4 w-4" /> Editar</Button>
  ) : (
    <div className="flex gap-2">
      <Button onClick={handleCancel} variant="outline" className="gap-2"><X className="h-4 w-4" /> Cancelar</Button>
      <Button onClick={handleSave} disabled={isSaving} className="gap-2">{isSaving ? <><Loader2 className="h-4 w-4 animate-spin" /> Salvando...</> : <><Save className="h-4 w-4" /> Salvar</>}</Button>
    </div>
  );

  const TimeInput = ({ label, value, unit, onValueChange, onUnitChange }: { label: string; value: number; unit: 'minutos' | 'horas' | 'dias'; onValueChange: (v: number) => void; onUnitChange: (u: 'minutos' | 'horas' | 'dias') => void; }) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input type="number" min="1" value={value} onChange={(e) => onValueChange(parseInt(e.target.value) || 1)} className="w-24" />
        <Select value={unit} onValueChange={(v: 'minutos' | 'horas' | 'dias') => onUnitChange(v)}><SelectTrigger className="flex-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="minutos">Minutos</SelectItem><SelectItem value="horas">Horas</SelectItem><SelectItem value="dias">Dias</SelectItem></SelectContent></Select>
      </div>
    </div>
  );

  const hasBaseConhecimento = hasFeature('base_conhecimento');

  const wrapperClass = embedded ? "space-y-6" : "space-y-6 p-4 md:p-6 lg:p-8";

  return (
    <PlanGuard feature="atendimento_inteligente">
      <div className={wrapperClass}>
        {/* Header - only show when not embedded */}
        {!embedded && (
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10"><Bot className="h-6 w-6 text-accent" /></div>
                <h1 className="font-display text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-foreground">Agente de IA Virtual</h1>
              </div>
              <Badge className="bg-accent/10 text-accent border-accent/20"><Sparkles className="h-3 w-3 mr-1" /> Premium</Badge>
            </div>
            <p className="text-base md:text-lg text-muted-foreground">{isEditing ? "Editando configurações do assistente virtual" : "Configurações do seu assistente virtual"}</p>
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="atendimento" className="space-y-6">
          <TabsList className="flex w-full max-w-4xl flex-wrap gap-1">
            <TabsTrigger value="atendimento" className="gap-2 text-xs sm:text-sm"><Bot className="h-4 w-4" /> Atendimento</TabsTrigger>
            <TabsTrigger value="lembretes" className="gap-2 text-xs sm:text-sm"><Bell className="h-4 w-4" /> Lembretes</TabsTrigger>
            <TabsTrigger value="followup" className="gap-2 text-xs sm:text-sm"><Clock className="h-4 w-4" /> Follow Up</TabsTrigger>
            <TabsTrigger value="qualificacao" className="gap-2 text-xs sm:text-sm"><FileQuestion className="h-4 w-4" /> Qualificação</TabsTrigger>
            {hasBaseConhecimento && (
              <TabsTrigger value="conhecimento" className="gap-2 text-xs sm:text-sm"><BookOpen className="h-4 w-4" /> Conhecimento</TabsTrigger>
            )}
            <TabsTrigger value="analytics" className="gap-2 text-xs sm:text-sm"><BarChart3 className="h-4 w-4" /> Analytics</TabsTrigger>
          </TabsList>

          {/* ═══ Tab 1: Configurações do Atendimento ═══ */}
          <TabsContent value="atendimento">
            <Card className="card-luxury p-6 animate-fade-in-up">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold flex items-center gap-2"><Bot className="h-5 w-5 text-accent" /> Configurações do Atendimento</h2>
                <EditSaveButtons />
              </div>
              {!isEditing ? (
                <>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2"><div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><Bot className="h-4 w-4" /><span className="font-medium">Nome do Agente</span></div><p className="text-lg font-semibold text-foreground pl-6">{config.nome_agente}</p></div>
                    <div className="space-y-2"><div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><Smile className="h-4 w-4" /><span className="font-medium">Personalidade</span></div><p className="text-lg font-semibold text-foreground pl-6">{personalityLabels[config.personality] || config.personality}</p></div>
                    <div className="space-y-2"><div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><Clock className="h-4 w-4" /><span className="font-medium">Tempo de Pausa</span></div><p className="text-lg font-semibold text-foreground pl-6">{secondsToMinutes(config.pause_duration_seconds)} minutos</p><p className="text-xs text-muted-foreground pl-6">Pausa quando atendente humano assume</p></div>
                    <div className="space-y-2"><div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><Clock className="h-4 w-4" /><span className="font-medium">Pausa por Solicitação</span></div><p className="text-lg font-semibold text-foreground pl-6">{secondsToMinutes(config.customer_pause_duration_seconds)} minutos</p><p className="text-xs text-muted-foreground pl-6">Pausa quando cliente solicita atendimento humano</p></div>
                  </div>
                  <div className="mt-8 space-y-6">
                    <div className="space-y-3"><div className="flex items-center gap-2 text-sm text-muted-foreground"><MessageSquare className="h-4 w-4" /><span className="font-medium">Mensagem de Saudação</span></div><div className="bg-accent/5 border border-accent/20 rounded-lg p-4"><p className="text-sm text-foreground leading-relaxed">{config.greeting_message}</p></div></div>
                    <div className="space-y-3"><div className="flex items-center gap-2 text-sm text-muted-foreground"><MessageSquare className="h-4 w-4" /><span className="font-medium">Mensagem de Finalização</span></div><div className="bg-accent/5 border border-accent/20 rounded-lg p-4"><p className="text-sm text-foreground leading-relaxed">{config.closing_message}</p></div></div>
                  </div>
                </>
              ) : (
                <div className="space-y-6">
                  <div className="space-y-2"><Label>Nome do Agente de IA *</Label><Input placeholder="Ex: Sofia, Assistente Virtual" value={editConfig.nome_agente} onChange={(e) => setEditConfig({ ...editConfig, nome_agente: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Personalidade *</Label><Select value={editConfig.personality} onValueChange={(v) => setEditConfig({ ...editConfig, personality: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(personalityLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-2"><Label>Tempo de Pausa (minutos) *</Label><Input type="number" min="1" max="1440" value={secondsToMinutes(editConfig.pause_duration_seconds)} onChange={(e) => setEditConfig({ ...editConfig, pause_duration_seconds: minutesToSeconds(parseInt(e.target.value) || 30) })} /><p className="text-xs text-muted-foreground">Tempo de pausa quando atendente humano assumir</p></div>
                  <div className="space-y-2"><Label>Pausa por Solicitação (minutos) *</Label><Input type="number" min="1" max="1440" value={secondsToMinutes(editConfig.customer_pause_duration_seconds)} onChange={(e) => setEditConfig({ ...editConfig, customer_pause_duration_seconds: minutesToSeconds(parseInt(e.target.value) || 5) })} /><p className="text-xs text-muted-foreground">Tempo de pausa quando cliente solicitar atendimento humano</p></div>
                  <div className="space-y-2"><Label>Mensagem de Saudação *</Label><Textarea rows={4} value={editConfig.greeting_message} onChange={(e) => setEditConfig({ ...editConfig, greeting_message: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Mensagem de Finalização *</Label><Textarea rows={4} value={editConfig.closing_message} onChange={(e) => setEditConfig({ ...editConfig, closing_message: e.target.value })} /></div>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* ═══ Tab 2: Lembretes ═══ */}
          <TabsContent value="lembretes">
            <Card className="card-luxury p-6 animate-fade-in-up">
              <div className="flex items-center justify-between mb-6"><h2 className="text-xl font-semibold flex items-center gap-2"><Bell className="h-5 w-5 text-accent" /> Lembretes de Agendamento</h2><EditSaveButtons /></div>
              <p className="text-sm text-muted-foreground mb-6">Configure quando os lembretes serão enviados antes do agendamento</p>
              {!isEditing ? (
                <div className="grid gap-4 md:grid-cols-3">
                  {[{ l: "1º Lembrete", v: config.reminder_1_minutes }, { l: "2º Lembrete", v: config.reminder_2_minutes }, { l: "3º Lembrete", v: config.reminder_3_minutes }].map((r) => (
                    <div key={r.l} className="space-y-2 p-4 rounded-lg bg-accent/5 border border-accent/20"><span className="text-sm font-medium text-muted-foreground">{r.l}</span><p className="text-lg font-semibold text-foreground">{formatReminderDisplay(r.v)} antes</p></div>
                  ))}
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-3">
                  <TimeInput label="1º Lembrete" value={reminder1Value} unit={reminder1Unit} onValueChange={(v) => { setReminder1Value(v); setEditConfig({ ...editConfig, reminder_1_minutes: unitToMinutes(v, reminder1Unit) }); }} onUnitChange={(u) => { setReminder1Unit(u); setEditConfig({ ...editConfig, reminder_1_minutes: unitToMinutes(reminder1Value, u) }); }} />
                  <TimeInput label="2º Lembrete" value={reminder2Value} unit={reminder2Unit} onValueChange={(v) => { setReminder2Value(v); setEditConfig({ ...editConfig, reminder_2_minutes: unitToMinutes(v, reminder2Unit) }); }} onUnitChange={(u) => { setReminder2Unit(u); setEditConfig({ ...editConfig, reminder_2_minutes: unitToMinutes(reminder2Value, u) }); }} />
                  <TimeInput label="3º Lembrete" value={reminder3Value} unit={reminder3Unit} onValueChange={(v) => { setReminder3Value(v); setEditConfig({ ...editConfig, reminder_3_minutes: unitToMinutes(v, reminder3Unit) }); }} onUnitChange={(u) => { setReminder3Unit(u); setEditConfig({ ...editConfig, reminder_3_minutes: unitToMinutes(reminder3Value, u) }); }} />
                </div>
              )}
            </Card>
          </TabsContent>

          {/* ═══ Tab 3: Follow Up ═══ */}
          <TabsContent value="followup">
            <Card className="card-luxury p-6 animate-fade-in-up">
              <div className="flex items-center justify-between mb-6"><h2 className="text-xl font-semibold flex items-center gap-2"><Clock className="h-5 w-5 text-accent" /> Configurações de Follow Up</h2><EditSaveButtons /></div>
              <p className="text-sm text-muted-foreground mb-6">Configure quando os follow ups serão enviados após a última mensagem não respondida</p>
              {!isEditing ? (
                <div className="grid gap-4 md:grid-cols-3">
                  {[{ l: "1º Follow Up", v: config.follow_up_1_minutes }, { l: "2º Follow Up", v: config.follow_up_2_minutes }, { l: "3º Follow Up", v: config.follow_up_3_minutes }].map((f) => (
                    <div key={f.l} className="space-y-2 p-4 rounded-lg bg-accent/5 border border-accent/20"><span className="text-sm font-medium text-muted-foreground">{f.l}</span><p className="text-lg font-semibold text-foreground">{formatReminderDisplay(f.v)}</p><p className="text-xs text-muted-foreground">após a última mensagem não respondida</p></div>
                  ))}
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-3">
                  <TimeInput label="1º Follow Up" value={followUp1Value} unit={followUp1Unit} onValueChange={(v) => { setFollowUp1Value(v); setEditConfig({ ...editConfig, follow_up_1_minutes: unitToMinutes(v, followUp1Unit) }); }} onUnitChange={(u) => { setFollowUp1Unit(u); setEditConfig({ ...editConfig, follow_up_1_minutes: unitToMinutes(followUp1Value, u) }); }} />
                  <TimeInput label="2º Follow Up" value={followUp2Value} unit={followUp2Unit} onValueChange={(v) => { setFollowUp2Value(v); setEditConfig({ ...editConfig, follow_up_2_minutes: unitToMinutes(v, followUp2Unit) }); }} onUnitChange={(u) => { setFollowUp2Unit(u); setEditConfig({ ...editConfig, follow_up_2_minutes: unitToMinutes(followUp2Value, u) }); }} />
                  <TimeInput label="3º Follow Up" value={followUp3Value} unit={followUp3Unit} onValueChange={(v) => { setFollowUp3Value(v); setEditConfig({ ...editConfig, follow_up_3_minutes: unitToMinutes(v, followUp3Unit) }); }} onUnitChange={(u) => { setFollowUp3Unit(u); setEditConfig({ ...editConfig, follow_up_3_minutes: unitToMinutes(followUp3Value, u) }); }} />
                </div>
              )}
            </Card>
          </TabsContent>

          {/* ═══ Tab 4: Qualificação ═══ */}
          <TabsContent value="qualificacao">
            <Card className="card-luxury p-6 animate-fade-in-up">
              <div className="flex items-center justify-between mb-6"><h2 className="text-xl font-semibold flex items-center gap-2"><FileQuestion className="h-5 w-5 text-accent" /> Perguntas de Qualificação</h2><EditSaveButtons /></div>
              <p className="text-sm text-muted-foreground mb-6">Perguntas feitas pelo agente para qualificar leads automaticamente</p>
              {!isEditing ? (
                config.qualification_questions?.length > 0 ? (
                  <div className="space-y-3">{config.qualification_questions.map((q: string, i: number) => (
                    <div key={i} className="flex items-start gap-3 p-4 rounded-lg bg-accent/5 border border-accent/20"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/20 text-xs font-bold text-accent">{i + 1}</span><p className="text-sm text-foreground">{q}</p></div>
                  ))}</div>
                ) : <p className="text-muted-foreground italic">Nenhuma pergunta configurada.</p>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-end"><Button type="button" variant="outline" size="sm" onClick={() => setEditConfig({ ...editConfig, qualification_questions: [...(editConfig.qualification_questions || []), ""] })}><Plus className="h-4 w-4 mr-2" /> Adicionar Pergunta</Button></div>
                  <div className="space-y-3">
                    {editConfig.qualification_questions?.map((q: string, i: number) => (
                      <div key={i} className="flex gap-2">
                        <Input value={q} onChange={(e) => { const nq = [...(editConfig.qualification_questions || [])]; nq[i] = e.target.value; setEditConfig({ ...editConfig, qualification_questions: nq }); }} placeholder="Digite a pergunta..." />
                        <Button type="button" variant="ghost" size="icon" onClick={() => { const nq = [...(editConfig.qualification_questions || [])]; nq.splice(i, 1); setEditConfig({ ...editConfig, qualification_questions: nq }); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    ))}
                    {(!editConfig.qualification_questions || editConfig.qualification_questions.length === 0) && <p className="text-sm text-muted-foreground italic">Nenhuma pergunta adicionada.</p>}
                  </div>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* ═══ Tab 5: Conhecimento (condicional) ═══ */}
          {hasBaseConhecimento && (
            <TabsContent value="conhecimento">
              <ConhecimentoTab />
            </TabsContent>
          )}

          {/* ═══ Tab 6: Analytics ═══ */}
          <TabsContent value="analytics" className="space-y-6">
            <Card className="card-luxury p-6 animate-fade-in-up border-accent/20">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10"><Zap className="h-6 w-6 text-accent" /></div><div><h3 className="text-lg font-semibold text-foreground">Consumo de Tokens</h3><p className="text-sm text-muted-foreground">Total acumulado da organização</p></div></div>
                <Badge className="bg-accent/10 text-accent border-accent/20">IA</Badge>
              </div>
              <div className="bg-accent/5 rounded-lg p-6 border border-accent/20">
                {isLoadingTokens ? <div className="flex items-center justify-center py-4"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div> : (
                  <div className="grid grid-cols-2 gap-6">
                    <div className="text-center"><p className="text-3xl md:text-4xl font-bold text-accent mb-2">{totalTokens.toLocaleString('pt-BR')}</p><p className="text-sm text-muted-foreground">tokens consumidos</p></div>
                    <div className="text-center border-l border-accent/20 pl-6"><p className="text-3xl md:text-4xl font-bold text-success mb-2">{totalCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 8 })}</p><p className="text-sm text-muted-foreground">custo total (R$)</p></div>
                  </div>
                )}
              </div>
            </Card>

            {/* Filtro de período */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground mr-1">Período:</span>
              {([
                { value: "today" as const, label: "Hoje" },
                { value: "7d" as const, label: "7 dias" },
                { value: "30d" as const, label: "1 mês" },
                { value: "90d" as const, label: "3 meses" },
                { value: "custom" as const, label: "Período" },
              ]).map((opt) => (
                <Button
                  key={opt.value}
                  type="button"
                  variant={analyticsPeriod === opt.value ? "default" : "outline"}
                  size="sm"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setAnalyticsPeriod(opt.value); }}
                >
                  {opt.label}
                </Button>
              ))}
              {analyticsPeriod === "custom" && (
                <div className="flex flex-wrap items-center gap-2 ml-2">
                  <DatePicker
                    value={customStart}
                    onChange={setCustomStart}
                    placeholder="Data inicial"
                    className="w-40"
                  />
                  <DatePicker
                    value={customEnd}
                    onChange={setCustomEnd}
                    placeholder="Data final"
                    className="w-40"
                  />
                </div>
              )}
            </div>

            <div className="grid gap-4 md:gap-6 grid-cols-2 md:grid-cols-3 lg:grid-cols-6 animate-fade-in-up">
              {[
                { label: "Conversas no período", value: chatMetrics?.periodConversations ?? conversationsToday, loading: isLoadingStats || isLoadingChatMetrics, sub: analyticsPeriod === "today" ? "Hoje" : analyticsPeriod === "7d" ? "Últimos 7 dias" : analyticsPeriod === "30d" ? "Último mês" : analyticsPeriod === "90d" ? "Últimos 3 meses" : customStart && customEnd ? `${customStart} a ${customEnd}` : "" },
                { label: "Taxa de Resposta", value: `${responseRate}%`, loading: isLoadingStats, color: "text-success", sub: "Conversas respondidas" },
                { label: "Tempo de Resposta", value: avgResponseTime > 0 ? `${avgResponseTime}min` : '0min', loading: isLoadingStats, sub: "Média de resposta" },
                { label: "Tempo de Conversa", value: avgConversationTime > 0 ? `${avgConversationTime}min` : '0min', loading: isLoadingStats, sub: "Duração média" },
                { label: "Leads Qualificados", value: qualifiedLeads, loading: isLoadingStats, color: "text-accent" },
                { label: "Mensagens/Conversa", value: messagesPerConversation, loading: isLoadingStats, sub: "Média por conversa" },
              ].map((item) => (
                <div key={item.label} className="card-luxury p-4">
                  <p className="text-sm text-muted-foreground mb-2">{item.label}</p>
                  {item.loading ? <div className="flex items-center gap-2"><Loader2 className="h-5 w-5 animate-spin text-accent" /><span className="text-2xl font-bold">...</span></div>
                    : <p className={`text-2xl font-bold ${item.color || 'text-foreground'}`}>{item.value}</p>}
                  {item.sub && <p className="text-xs text-muted-foreground mt-1">{item.sub}</p>}
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </PlanGuard>
  );
}
