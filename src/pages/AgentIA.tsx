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
import { useTranslation } from "react-i18next";
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

const personalityKeys: Record<string, string> = {
  profissional: "personalityProfissional",
  amigavel: "personalityAmigavel",
  formal: "personalityFormal",
  descontraido: "personalityDescontraido",
  empatico: "personalityEmpatico",
  tecnico: "personalityTecnico",
  criativo: "personalityCriativo",
  consultivo: "personalityConsultivo",
  motivador: "personalityMotivador",
  didatico: "personalityDidatico",
};

// ─── Conhecimento Tab Component ──────────────────────────
function ConhecimentoTab() {
  const { t } = useTranslation();
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
      toast.error(t('app.agentIA.errorLoadDoc'));
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
      toast.success(t('app.agentIA.docDeleted'));
      await loadDocuments();
    } catch (error: any) {
      toast.error(error.message || t('app.agentIA.errorDeleteDoc'));
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
      toast.success(t('app.agentIA.allDocsDeleted'));
      await loadDocuments();
    } catch (error: any) {
      toast.error(error.message || t('app.agentIA.errorDeleteDocs'));
    } finally {
      setIsDeletingAll(false);
      setShowDeleteAllDialog(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") { toast.error(t('app.agentIA.onlyPDF')); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error(t('app.agentIA.fileTooBig')); return; }
    setSelectedFile(file);
    setCustomFileName(file.name.replace(/\.pdf$/i, ''));
    setShowFileNameDialog(true);
  };

  const handleConfirmFileName = () => {
    if (!customFileName.trim()) { toast.error(t('app.agentIA.enterFileName')); return; }
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
      toast.error(t('app.agentIA.limitFilesReached', { current: limitCheck.current, max: limitCheck.max }));
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
      toast.success(t('app.agentIA.knowledgeUpdated'));
      setSelectedFile(null); setCustomFileName("");
      const fileInput = document.getElementById("pdf-upload") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
      await loadDocuments();
    } catch (error: any) {
      toast.error(error.message || t('app.agentIA.errorProcessFile'));
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
          <CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5 text-accent" /> {t('app.agentIA.uploadDocs')}</CardTitle>
          <CardDescription>{t('app.agentIA.uploadDocsDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {limitInfo != null && limitInfo.max != null && (
            <LimitAlert current={limitInfo.current} max={limitInfo.max} limitName={t('app.agentIA.limitNameKnowledge')} />
          )}
          <div className={atLimit ? "opacity-60 pointer-events-none space-y-4" : "space-y-4"}>
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-accent/50 transition-colors">
              <input id="pdf-upload" type="file" accept="application/pdf" onChange={handleFileSelect} className="hidden" disabled={atLimit} />
              <label htmlFor={atLimit ? undefined : "pdf-upload"} className={atLimit ? "cursor-not-allowed" : "cursor-pointer"}>
                <div className="flex flex-col items-center gap-3">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/10"><FileText className="h-8 w-8 text-accent" /></div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{atLimit ? t('app.agentIA.limitReached') : t('app.agentIA.clickToSelectPDF')}</p>
                    <p className="text-xs text-muted-foreground mt-1">{atLimit ? t('app.agentIA.usingFiles', { current: limitInfo?.current ?? 0, max: limitInfo?.max ?? 0 }) : t('app.agentIA.max10MB')}</p>
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
                  <Button onClick={handleCancelFileSelection} variant="ghost" size="sm">{t('app.agentIA.remove')}</Button>
                </div>
              </div>
            )}
            <Button onClick={handleUpload} disabled={atLimit || !selectedFile || isUploading} className="w-full gap-2" size="lg">
              {isUploading ? <><Loader2 className="h-5 w-5 animate-spin" /> {t('app.agentIA.processing')}</> : <><Upload className="h-5 w-5" /> {t('app.agentIA.uploadKnowledge')}</>}
            </Button>
          </div>
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-foreground mb-2">ℹ️ {t('app.agentIA.howItWorks')}</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• {t('app.agentIA.howItWorks1')}</li>
              <li>• {t('app.agentIA.howItWorks2')}</li>
              <li>• {t('app.agentIA.howItWorks3')}</li>
              <li>• {t('app.agentIA.howItWorks4')}</li>
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
            <h3 className="text-xl font-semibold text-foreground flex items-center gap-2"><BookOpen className="h-6 w-6 text-accent" /> {t('app.agentIA.knowledgeBase')}</h3>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-accent/10 text-accent border-accent/20">{documents.length} {documents.length === 1 ? t('app.agentIA.document') : t('app.agentIA.documents')}</Badge>
              <Button variant="destructive" size="sm" onClick={() => setShowDeleteAllDialog(true)} className="gap-2"><Trash2 className="h-4 w-4" /> {t('app.agentIA.deleteAll')}</Button>
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
                        <h4 className="font-semibold text-foreground text-base leading-tight line-clamp-2 mb-2 group-hover:text-accent transition-colors">{doc.titulo || t('app.agentIA.noDocTitle')}</h4>
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
                      {isLoadingDocumentContent ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> {t('app.agentIA.loading')}</> : <><BookOpen className="h-3.5 w-3.5" /> {t('app.agentIA.viewContent')}</>}
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
            <h3 className="text-lg font-semibold text-foreground mb-2">{t('app.agentIA.noDocuments')}</h3>
            <p className="text-sm text-muted-foreground max-w-sm">{t('app.agentIA.uploadFirstPDF')}</p>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <Dialog open={showFileNameDialog} onOpenChange={setShowFileNameDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('app.agentIA.docName')}</DialogTitle><DialogDescription>{t('app.agentIA.docNameDesc')}</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="fileName">{t('app.agentIA.fileName')}</Label>
              <Input id="fileName" value={customFileName} onChange={(e) => setCustomFileName(e.target.value)} placeholder={t('app.agentIA.fileNamePlaceholder')} onKeyDown={(e) => { if (e.key === 'Enter') handleConfirmFileName(); }} autoFocus />
            </div>
            {selectedFile && (
              <div className="bg-secondary/30 rounded-lg p-3 text-sm">
                <p className="text-muted-foreground"><strong>{t('app.agentIA.originalFile')}</strong> {selectedFile.name}</p>
                <p className="text-muted-foreground"><strong>{t('app.agentIA.size')}</strong> {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelFileSelection}>{t('app.agentIA.cancel')}</Button>
            <Button onClick={handleConfirmFileName} disabled={!customFileName.trim()}>{t('app.agentIA.confirm')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!documentToView} onOpenChange={() => setDocumentToView(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-accent" /> {documentToView?.titulo || t('app.agentIA.document')}</DialogTitle></DialogHeader>
          <div className="flex-1 overflow-y-auto">
            <div className="bg-secondary/30 border border-border rounded-lg p-6">
              {documentToView?.conteudo ? <pre className="text-sm text-foreground whitespace-pre-wrap font-sans leading-relaxed">{documentToView.conteudo}</pre> : (
                <div className="text-center py-12 text-muted-foreground"><FileText className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>{t('app.agentIA.noContent')}</p></div>
              )}
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDocumentToView(null)}>{t('app.agentIA.close')}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!documentToDelete} onOpenChange={() => setDocumentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>{t('app.agentIA.confirmDelete')}</AlertDialogTitle><AlertDialogDescription>{t('app.agentIA.confirmDeleteDesc', { name: documentToDelete?.titulo })}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingDocument}>{t('app.agentIA.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteDocument} disabled={isDeletingDocument} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeletingDocument ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('app.agentIA.deleting')}</> : t('app.agentIA.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle className="flex items-center gap-2 text-destructive"><Trash2 className="h-5 w-5" /> {t('app.agentIA.deleteAllKnowledge')}</AlertDialogTitle>
            <AlertDialogDescription>{t('app.agentIA.deleteAllWarning', { count: documents.length })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingAll}>{t('app.agentIA.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAll} disabled={isDeletingAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeletingAll ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('app.agentIA.deletingAll')}</> : <><Trash2 className="mr-2 h-4 w-4" /> {t('app.agentIA.yesDeleteAll')}</>}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────
export default function AgentIA({ embedded = false }: { embedded?: boolean }) {
  const { t, i18n } = useTranslation();
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
    if (min < 60) return `${min} ${min === 1 ? t('app.agentIA.minute') : t('app.agentIA.minutePlural')}`;
    if (min < 1440) { const h = Math.round(min / 60); return `${h} ${h === 1 ? t('app.agentIA.hour') : t('app.agentIA.hourPlural')}`; }
    const d = Math.round(min / 1440); return `${d} ${d === 1 ? t('app.agentIA.day') : t('app.agentIA.dayPlural')}`;
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
    } catch (e) { console.error("Erro ao carregar configurações:", e); toast.error(t('app.agentIA.loadError')); }
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
    } catch { toast.error(t('app.agentIA.loadError')); } finally { setIsSaving(false); }
  };

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-screen"><div className="text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div><p className="text-muted-foreground">{t('app.agentIA.loadError')}</p></div></div>
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
                <h1 className="font-display text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-foreground">{t('app.agentIA.headerTitle')}</h1>
              </div>
              <Badge className="bg-accent/10 text-accent border-accent/20"><Sparkles className="h-3 w-3 mr-1" /> Premium</Badge>
            </div>
            <p className="text-base md:text-lg text-muted-foreground">{isEditing ? t('app.agentIA.headerEditing') : t('app.agentIA.headerConfig')}</p>
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="atendimento" className="space-y-6">
          <TabsList className="flex w-full max-w-4xl flex-wrap gap-1">
            <TabsTrigger value="atendimento" className="gap-2 text-xs sm:text-sm"><Bot className="h-4 w-4" /> {t('app.agentIA.tabAtendimento')}</TabsTrigger>
            <TabsTrigger value="lembretes" className="gap-2 text-xs sm:text-sm"><Bell className="h-4 w-4" /> {t('app.agentIA.tabLembretes')}</TabsTrigger>
            <TabsTrigger value="followup" className="gap-2 text-xs sm:text-sm"><Clock className="h-4 w-4" /> {t('app.agentIA.tabFollowUp')}</TabsTrigger>
            <TabsTrigger value="qualificacao" className="gap-2 text-xs sm:text-sm"><FileQuestion className="h-4 w-4" /> {t('app.agentIA.tabQualificacao')}</TabsTrigger>
            {hasBaseConhecimento && (
              <TabsTrigger value="conhecimento" className="gap-2 text-xs sm:text-sm"><BookOpen className="h-4 w-4" /> {t('app.agentIA.tabConhecimento')}</TabsTrigger>
            )}
            <TabsTrigger value="analytics" className="gap-2 text-xs sm:text-sm"><BarChart3 className="h-4 w-4" /> {t('app.agentIA.tabAnalytics')}</TabsTrigger>
          </TabsList>

          {/* ═══ Tab 1: Configurações do Atendimento ═══ */}
          <TabsContent value="atendimento">
            <Card className="card-luxury p-6 animate-fade-in-up">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold flex items-center gap-2"><Bot className="h-5 w-5 text-accent" /> {t('app.agentIA.sectionAtendimento')}</h2>
                <EditSaveButtons />
              </div>
              {!isEditing ? (
                <>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2"><div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><Bot className="h-4 w-4" /><span className="font-medium">{t('app.agentIA.agentName')}</span></div><p className="text-lg font-semibold text-foreground pl-6">{config.nome_agente}</p></div>
                    <div className="space-y-2"><div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><Smile className="h-4 w-4" /><span className="font-medium">{t('app.agentIA.personality')}</span></div><p className="text-lg font-semibold text-foreground pl-6">{personalityKeys[config.personality] ? t(`app.agentIA.${personalityKeys[config.personality]}`) : config.personality}</p></div>
                    <div className="space-y-2"><div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><Clock className="h-4 w-4" /><span className="font-medium">{t('app.agentIA.pauseTime')}</span></div><p className="text-lg font-semibold text-foreground pl-6">{secondsToMinutes(config.pause_duration_seconds)} {t('app.agentIA.minutePlural')}</p><p className="text-xs text-muted-foreground pl-6">{t('app.agentIA.pauseOnHuman')}</p></div>
                    <div className="space-y-2"><div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><Clock className="h-4 w-4" /><span className="font-medium">{t('app.agentIA.pauseOnRequest')}</span></div><p className="text-lg font-semibold text-foreground pl-6">{secondsToMinutes(config.customer_pause_duration_seconds)} {t('app.agentIA.minutePlural')}</p><p className="text-xs text-muted-foreground pl-6">{t('app.agentIA.pauseOnRequestDesc')}</p></div>
                  </div>
                  <div className="mt-8 space-y-6">
                    <div className="space-y-3"><div className="flex items-center gap-2 text-sm text-muted-foreground"><MessageSquare className="h-4 w-4" /><span className="font-medium">{t('app.agentIA.greetingMessage')}</span></div><div className="bg-accent/5 border border-accent/20 rounded-lg p-4"><p className="text-sm text-foreground leading-relaxed">{config.greeting_message}</p></div></div>
                    <div className="space-y-3"><div className="flex items-center gap-2 text-sm text-muted-foreground"><MessageSquare className="h-4 w-4" /><span className="font-medium">{t('app.agentIA.closingMessage')}</span></div><div className="bg-accent/5 border border-accent/20 rounded-lg p-4"><p className="text-sm text-foreground leading-relaxed">{config.closing_message}</p></div></div>
                  </div>
                </>
              ) : (
                <div className="space-y-6">
                  <div className="space-y-2"><Label>{t('app.agentIA.agentNameLabel')}</Label><Input placeholder={t('app.agentIA.agentNamePlaceholder')} value={editConfig.nome_agente} onChange={(e) => setEditConfig({ ...editConfig, nome_agente: e.target.value })} /></div>
                  <div className="space-y-2"><Label>{t('app.agentIA.personality')} *</Label><Select value={editConfig.personality} onValueChange={(v) => setEditConfig({ ...editConfig, personality: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(personalityKeys).map(([k, key]) => <SelectItem key={k} value={k}>{t(`app.agentIA.${key}`)}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-2"><Label>{t('app.agentIA.pauseMinutes')}</Label><Input type="number" min="1" max="1440" value={secondsToMinutes(editConfig.pause_duration_seconds)} onChange={(e) => setEditConfig({ ...editConfig, pause_duration_seconds: minutesToSeconds(parseInt(e.target.value) || 30) })} /><p className="text-xs text-muted-foreground">{t('app.agentIA.pauseOnHumanHint')}</p></div>
                  <div className="space-y-2"><Label>{t('app.agentIA.pauseRequestMinutes')}</Label><Input type="number" min="1" max="1440" value={secondsToMinutes(editConfig.customer_pause_duration_seconds)} onChange={(e) => setEditConfig({ ...editConfig, customer_pause_duration_seconds: minutesToSeconds(parseInt(e.target.value) || 5) })} /><p className="text-xs text-muted-foreground">{t('app.agentIA.pauseRequestHint')}</p></div>
                  <div className="space-y-2"><Label>{t('app.agentIA.greetingMessage')} *</Label><Textarea rows={4} value={editConfig.greeting_message} onChange={(e) => setEditConfig({ ...editConfig, greeting_message: e.target.value })} /></div>
                  <div className="space-y-2"><Label>{t('app.agentIA.closingMessage')} *</Label><Textarea rows={4} value={editConfig.closing_message} onChange={(e) => setEditConfig({ ...editConfig, closing_message: e.target.value })} /></div>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* ═══ Tab 2: Lembretes ═══ */}
          <TabsContent value="lembretes">
            <Card className="card-luxury p-6 animate-fade-in-up">
              <div className="flex items-center justify-between mb-6"><h2 className="text-xl font-semibold flex items-center gap-2"><Bell className="h-5 w-5 text-accent" /> {t('app.agentIA.sectionLembretes')}</h2><EditSaveButtons /></div>
              <p className="text-sm text-muted-foreground mb-6">{t('app.agentIA.sectionLembretesDesc')}</p>
              {!isEditing ? (
                <div className="grid gap-4 md:grid-cols-3">
                  {[{ l: t('app.agentIA.reminder1'), v: config.reminder_1_minutes }, { l: t('app.agentIA.reminder2'), v: config.reminder_2_minutes }, { l: t('app.agentIA.reminder3'), v: config.reminder_3_minutes }].map((r) => (
                    <div key={r.l} className="space-y-2 p-4 rounded-lg bg-accent/5 border border-accent/20"><span className="text-sm font-medium text-muted-foreground">{r.l}</span><p className="text-lg font-semibold text-foreground">{formatReminderDisplay(r.v)} {t('app.agentIA.before')}</p></div>
                  ))}
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-3">
                  <TimeInput label={t('app.agentIA.reminder1')} value={reminder1Value} unit={reminder1Unit} onValueChange={(v) => { setReminder1Value(v); setEditConfig({ ...editConfig, reminder_1_minutes: unitToMinutes(v, reminder1Unit) }); }} onUnitChange={(u) => { setReminder1Unit(u); setEditConfig({ ...editConfig, reminder_1_minutes: unitToMinutes(reminder1Value, u) }); }} />
                  <TimeInput label={t('app.agentIA.reminder2')} value={reminder2Value} unit={reminder2Unit} onValueChange={(v) => { setReminder2Value(v); setEditConfig({ ...editConfig, reminder_2_minutes: unitToMinutes(v, reminder2Unit) }); }} onUnitChange={(u) => { setReminder2Unit(u); setEditConfig({ ...editConfig, reminder_2_minutes: unitToMinutes(reminder2Value, u) }); }} />
                  <TimeInput label={t('app.agentIA.reminder3')} value={reminder3Value} unit={reminder3Unit} onValueChange={(v) => { setReminder3Value(v); setEditConfig({ ...editConfig, reminder_3_minutes: unitToMinutes(v, reminder3Unit) }); }} onUnitChange={(u) => { setReminder3Unit(u); setEditConfig({ ...editConfig, reminder_3_minutes: unitToMinutes(reminder3Value, u) }); }} />
                </div>
              )}
            </Card>
          </TabsContent>

          {/* ═══ Tab 3: Follow Up ═══ */}
          <TabsContent value="followup">
            <Card className="card-luxury p-6 animate-fade-in-up">
              <div className="flex items-center justify-between mb-6"><h2 className="text-xl font-semibold flex items-center gap-2"><Clock className="h-5 w-5 text-accent" /> {t('app.agentIA.sectionFollowUp')}</h2><EditSaveButtons /></div>
              <p className="text-sm text-muted-foreground mb-6">{t('app.agentIA.sectionFollowUpDesc')}</p>
              {!isEditing ? (
                <div className="grid gap-4 md:grid-cols-3">
                  {[{ l: t('app.agentIA.followUp1'), v: config.follow_up_1_minutes }, { l: t('app.agentIA.followUp2'), v: config.follow_up_2_minutes }, { l: t('app.agentIA.followUp3'), v: config.follow_up_3_minutes }].map((f) => (
                    <div key={f.l} className="space-y-2 p-4 rounded-lg bg-accent/5 border border-accent/20"><span className="text-sm font-medium text-muted-foreground">{f.l}</span><p className="text-lg font-semibold text-foreground">{formatReminderDisplay(f.v)}</p><p className="text-xs text-muted-foreground">{t('app.agentIA.afterLastMessage')}</p></div>
                  ))}
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-3">
                  <TimeInput label={t('app.agentIA.followUp1')} value={followUp1Value} unit={followUp1Unit} onValueChange={(v) => { setFollowUp1Value(v); setEditConfig({ ...editConfig, follow_up_1_minutes: unitToMinutes(v, followUp1Unit) }); }} onUnitChange={(u) => { setFollowUp1Unit(u); setEditConfig({ ...editConfig, follow_up_1_minutes: unitToMinutes(followUp1Value, u) }); }} />
                  <TimeInput label={t('app.agentIA.followUp2')} value={followUp2Value} unit={followUp2Unit} onValueChange={(v) => { setFollowUp2Value(v); setEditConfig({ ...editConfig, follow_up_2_minutes: unitToMinutes(v, followUp2Unit) }); }} onUnitChange={(u) => { setFollowUp2Unit(u); setEditConfig({ ...editConfig, follow_up_2_minutes: unitToMinutes(followUp2Value, u) }); }} />
                  <TimeInput label={t('app.agentIA.followUp3')} value={followUp3Value} unit={followUp3Unit} onValueChange={(v) => { setFollowUp3Value(v); setEditConfig({ ...editConfig, follow_up_3_minutes: unitToMinutes(v, followUp3Unit) }); }} onUnitChange={(u) => { setFollowUp3Unit(u); setEditConfig({ ...editConfig, follow_up_3_minutes: unitToMinutes(followUp3Value, u) }); }} />
                </div>
              )}
            </Card>
          </TabsContent>

          {/* ═══ Tab 4: Qualificação ═══ */}
          <TabsContent value="qualificacao">
            <Card className="card-luxury p-6 animate-fade-in-up">
              <div className="flex items-center justify-between mb-6"><h2 className="text-xl font-semibold flex items-center gap-2"><FileQuestion className="h-5 w-5 text-accent" /> {t('app.agentIA.sectionQualificacao')}</h2><EditSaveButtons /></div>
              <p className="text-sm text-muted-foreground mb-6">{t('app.agentIA.sectionQualificacaoDesc')}</p>
              {!isEditing ? (
                config.qualification_questions?.length > 0 ? (
                  <div className="space-y-3">{config.qualification_questions.map((q: string, i: number) => (
                    <div key={i} className="flex items-start gap-3 p-4 rounded-lg bg-accent/5 border border-accent/20"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/20 text-xs font-bold text-accent">{i + 1}</span><p className="text-sm text-foreground">{q}</p></div>
                  ))}</div>
                ) : <p className="text-muted-foreground italic">{t('app.agentIA.noQuestions')}</p>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-end"><Button type="button" variant="outline" size="sm" onClick={() => setEditConfig({ ...editConfig, qualification_questions: [...(editConfig.qualification_questions || []), ""] })}><Plus className="h-4 w-4 mr-2" /> {t('app.agentIA.addQuestion')}</Button></div>
                  <div className="space-y-3">
                    {editConfig.qualification_questions?.map((q: string, i: number) => (
                      <div key={i} className="flex gap-2">
                        <Input value={q} onChange={(e) => { const nq = [...(editConfig.qualification_questions || [])]; nq[i] = e.target.value; setEditConfig({ ...editConfig, qualification_questions: nq }); }} placeholder={t('app.agentIA.questionPlaceholder')} />
                        <Button type="button" variant="ghost" size="icon" onClick={() => { const nq = [...(editConfig.qualification_questions || [])]; nq.splice(i, 1); setEditConfig({ ...editConfig, qualification_questions: nq }); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    ))}
                    {(!editConfig.qualification_questions || editConfig.qualification_questions.length === 0) && <p className="text-sm text-muted-foreground italic">{t('app.agentIA.noQuestionsAdded')}</p>}
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
                <div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10"><Zap className="h-6 w-6 text-accent" /></div><div><h3 className="text-lg font-semibold text-foreground">{t('app.agentIA.tokenConsumption')}</h3><p className="text-sm text-muted-foreground">{t('app.agentIA.tokenTotalOrg')}</p></div></div>
                <Badge className="bg-accent/10 text-accent border-accent/20">IA</Badge>
              </div>
              <div className="bg-accent/5 rounded-lg p-6 border border-accent/20">
                {isLoadingTokens ? <div className="flex items-center justify-center py-4"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div> : (
                  <div className="grid grid-cols-2 gap-6">
                    <div className="text-center"><p className="text-3xl md:text-4xl font-bold text-accent mb-2">{totalTokens.toLocaleString(i18n.language === 'pt-BR' ? 'pt-BR' : i18n.language === 'es' ? 'es' : 'en')}</p><p className="text-sm text-muted-foreground">{t('app.agentIA.tokensConsumed')}</p></div>
                    <div className="text-center border-l border-accent/20 pl-6"><p className="text-3xl md:text-4xl font-bold text-success mb-2">{totalCost.toLocaleString(i18n.language === 'pt-BR' ? 'pt-BR' : i18n.language === 'es' ? 'es' : 'en', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 8 })}</p><p className="text-sm text-muted-foreground">{t('app.agentIA.totalCost')}</p></div>
                  </div>
                )}
              </div>
            </Card>

            {/* Filtro de período */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground mr-1">{t('app.agentIA.period')}</span>
              {([
                { value: "today" as const, labelKey: "periodToday" },
                { value: "7d" as const, labelKey: "period7d" },
                { value: "30d" as const, labelKey: "period30d" },
                { value: "90d" as const, labelKey: "period90d" },
                { value: "custom" as const, labelKey: "periodCustom" },
              ]).map((opt) => (
                <Button
                  key={opt.value}
                  type="button"
                  variant={analyticsPeriod === opt.value ? "default" : "outline"}
                  size="sm"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setAnalyticsPeriod(opt.value); }}
                >
                  {t(`app.agentIA.${opt.labelKey}`)}
                </Button>
              ))}
              {analyticsPeriod === "custom" && (
                <div className="flex flex-wrap items-center gap-2 ml-2">
                  <DatePicker
                    value={customStart}
                    onChange={setCustomStart}
                    placeholder={t('app.agentIA.dateStart')}
                    className="w-40"
                  />
                  <DatePicker
                    value={customEnd}
                    onChange={setCustomEnd}
                    placeholder={t('app.agentIA.dateEnd')}
                    className="w-40"
                  />
                </div>
              )}
            </div>

            <div className="grid gap-4 md:gap-6 grid-cols-2 md:grid-cols-3 lg:grid-cols-6 animate-fade-in-up">
              {[
                { labelKey: "conversationsPeriod", value: chatMetrics?.periodConversations ?? conversationsToday, loading: isLoadingStats || isLoadingChatMetrics, subKey: analyticsPeriod === "today" ? "todayLabel" : analyticsPeriod === "7d" ? "last7days" : analyticsPeriod === "30d" ? "lastMonth" : analyticsPeriod === "90d" ? "last3months" : null, subCustom: customStart && customEnd ? t('app.agentIA.periodRange', { start: customStart, end: customEnd }) : "" },
                { labelKey: "responseRate", value: `${responseRate}%`, loading: isLoadingStats, color: "text-success", subKey: "conversationsResponded" },
                { labelKey: "responseTime", value: avgResponseTime > 0 ? `${avgResponseTime}${t('app.agentIA.minUnit')}` : `0${t('app.agentIA.minUnit')}`, loading: isLoadingStats, subKey: "avgResponse" },
                { labelKey: "conversationTime", value: avgConversationTime > 0 ? `${avgConversationTime}${t('app.agentIA.minUnit')}` : `0${t('app.agentIA.minUnit')}`, loading: isLoadingStats, subKey: "avgDuration" },
                { labelKey: "qualifiedLeads", value: qualifiedLeads, loading: isLoadingStats, color: "text-accent" },
                { labelKey: "messagesPerConv", value: messagesPerConversation, loading: isLoadingStats, subKey: "avgPerConv" },
              ].map((item) => (
                <div key={item.labelKey} className="card-luxury p-4">
                  <p className="text-sm text-muted-foreground mb-2">{t(`app.agentIA.${item.labelKey}`)}</p>
                  {item.loading ? <div className="flex items-center gap-2"><Loader2 className="h-5 w-5 animate-spin text-accent" /><span className="text-2xl font-bold">...</span></div>
                    : <p className={`text-2xl font-bold ${item.color || 'text-foreground'}`}>{item.value}</p>}
                  {(() => { const sub = item.subKey ? t(`app.agentIA.${item.subKey}`) : (item as { subCustom?: string }).subCustom ?? ""; return sub ? <p className="text-xs text-muted-foreground mt-1">{sub}</p> : null; })()}
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </PlanGuard>
  );
}
