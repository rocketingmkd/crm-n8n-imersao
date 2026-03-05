import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { useContatos } from "@/hooks/useContatos";
import { supabase } from "@/lib/supabase";
import { config, getPausarAgenteUrl, getRemoverPausaAgenteUrl, getListaPausaAgenteUrl } from "@/lib/config";
import {
  fetchSessoes,
  fetchMensagensSessao,
  getMessageDisplayInfo,
  type SessaoResumida,
} from "@/lib/conversas";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { MessageCircle, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

function formatarDataExibicao(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return format(d, "HH:mm", { locale: ptBR });
    const isYesterday = new Date(now);
    isYesterday.setDate(isYesterday.getDate() - 1);
    if (d.toDateString() === isYesterday.toDateString())
      return "Ontem " + format(d, "HH:mm", { locale: ptBR });
    return format(d, "dd/MM HH:mm", { locale: ptBR });
  } catch {
    return iso;
  }
}

function truncar(s: string, max: number): string {
  if (!s?.trim()) return "";
  return s.length <= max ? s : s.slice(0, max) + "…";
}

function labelCliente(sessionId: string, nomePorSessao: Record<string, string>): string {
  const nome = nomePorSessao[sessionId];
  if (nome?.trim()) return nome;
  if (/^\d+$/.test(sessionId) && sessionId.length >= 10)
    return sessionId.replace(/(\d{2})(\d{5})(\d+)/, "($1) $2-$3");
  return sessionId.length > 12 ? sessionId.slice(-8) : sessionId || "Cliente";
}

/** Verifica se o agente está pausado: POST lista-pausa-agente com remote_J_id. Retorno [{ propertyName: null }] = ativo. */
async function fetchAgentePausado(telefone: string): Promise<boolean> {
  const url = getListaPausaAgenteUrl();
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ remote_J_id: telefone }),
  });
  if (!res.ok) return false;
  const data = (await res.json().catch(() => null)) as Array<{ propertyName?: string | null }> | null;
  if (!Array.isArray(data) || data.length === 0) return false;
  const first = data[0];
  return first?.propertyName != null;
}

function BotPausarAtivarButtons({
  sessionId,
  telefone,
  pausaSegundos,
}: {
  sessionId: string;
  telefone: string | null;
  pausaSegundos: number;
}) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState<"pausar" | "ativar" | null>(null);

  const { data: agentPausado, isLoading: loadingStatus } = useQuery({
    queryKey: ["lista-pausa-agente", telefone ?? ""],
    queryFn: () => fetchAgentePausado(telefone!),
    enabled: !!telefone?.trim(),
  });

  const refetchStatus = () => queryClient.invalidateQueries({ queryKey: ["lista-pausa-agente", telefone ?? ""] });

  const handlePausar = async () => {
    if (!telefone?.trim()) {
      toast.error("Telefone do cliente não encontrado para esta conversa.");
      return;
    }
    const url = getPausarAgenteUrl();
    if (!url) {
      toast.info("Configure VITE_N8N_WEBHOOK_URL no .env.");
      return;
    }
    setLoading("pausar");
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          remote_J_id: telefone.trim(),
          pausa_segundos: pausaSegundos,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { retorno?: string; message?: string };
      if (!res.ok) throw new Error(data?.message ?? data?.retorno ?? `Erro ${res.status}`);
      if (data?.retorno !== "ok") throw new Error(data?.retorno ?? "Resposta inválida do webhook.");
      toast.success("Agente pausado.");
      refetchStatus();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const isCorsOrNetwork = /failed to fetch|network error|cors/i.test(msg);
      toast.error(isCorsOrNetwork ? "Falha na requisição (CORS/rede). Em produção, configure CORS no n8n ou use o app em dev com proxy." : msg);
    } finally {
      setLoading(null);
    }
  };

  const handleRemoverPausa = async () => {
    if (!telefone?.trim()) {
      toast.error("Telefone do cliente não encontrado para esta conversa.");
      return;
    }
    const url = getRemoverPausaAgenteUrl();
    if (!url) {
      toast.info("Configure VITE_N8N_WEBHOOK_URL no .env.");
      return;
    }
    setLoading("ativar");
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ remote_J_id: telefone.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as { retorno?: string; message?: string };
      if (!res.ok) throw new Error(data?.message ?? data?.retorno ?? `Erro ${res.status}`);
      if (data?.retorno !== undefined && data.retorno !== "ok") throw new Error(data?.retorno ?? "Resposta inválida do webhook.");
      toast.success("Pausa removida. Agente ativado.");
      refetchStatus();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const isCorsOrNetwork = /failed to fetch|network error|cors/i.test(msg);
      toast.error(isCorsOrNetwork ? "Falha na requisição (CORS/rede). Em produção, configure CORS no n8n ou use o app em dev com proxy." : msg);
    } finally {
      setLoading(null);
    }
  };

  const semTelefone = !telefone?.trim();
  const estaAtivo = agentPausado === false;
  const estaPausado = agentPausado === true;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5"
        disabled={!!loading || semTelefone || loadingStatus || estaPausado}
        onClick={handlePausar}
      >
        <Pause className="h-3.5 w-3.5" />
        Pausar agente
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5"
        disabled={!!loading || semTelefone || loadingStatus || estaAtivo}
        onClick={handleRemoverPausa}
      >
        <Play className="h-3.5 w-3.5" />
        Ativar agente
      </Button>
    </>
  );
}

export default function Conversas() {
  const { organization } = useAuth();
  const identificador = organization?.identificador ?? null;

  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  const { data: contatos = [] } = useContatos();
  // id_sessao = id do contato. Mapeia id, id_sessao e telefone → nome e url_foto.
  const nomePorSessao = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of contatos) {
      const nome = (c as { nome?: string | null }).nome?.trim();
      if (nome) {
        const id = (c as { id?: string | null }).id;
        const idSessao = (c as { id_sessao?: string | null }).id_sessao;
        const telefone = (c as { telefone?: string | null }).telefone;
        if (id) map[id] = nome;
        if (idSessao) map[idSessao] = nome;
        if (telefone) map[telefone] = nome;
      }
    }
    return map;
  }, [contatos]);
  const fotoPorSessao = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of contatos) {
      const urlFoto = (c as { url_foto?: string | null }).url_foto?.trim();
      if (urlFoto) {
        const id = (c as { id?: string | null }).id;
        const idSessao = (c as { id_sessao?: string | null }).id_sessao;
        const telefone = (c as { telefone?: string | null }).telefone;
        if (id) map[id] = urlFoto;
        if (idSessao) map[idSessao] = urlFoto;
        if (telefone) map[telefone] = urlFoto;
      }
    }
    return map;
  }, [contatos]);
  const telefonePorSessao = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of contatos) {
      const telefone = (c as { telefone?: string | null }).telefone?.trim();
      if (telefone) {
        const id = (c as { id?: string | null }).id;
        const idSessao = (c as { id_sessao?: string | null }).id_sessao;
        if (id) map[id] = telefone;
        if (idSessao) map[idSessao] = telefone;
        map[telefone] = telefone;
      }
    }
    return map;
  }, [contatos]);

  const { data: configAgente } = useQuery({
    queryKey: ["config_agente_ia", organization?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("config_agente_ia")
        .select("pausa_segundos")
        .eq("id_organizacao", organization!.id)
        .single();
      if (error) return null;
      return data as { pausa_segundos: number };
    },
    enabled: !!organization?.id,
  });
  const pausaSegundos = configAgente?.pausa_segundos ?? 300;

  const {
    data: fetchResult,
    isLoading: loadingSessoes,
    error: errorSessoes,
  } = useQuery({
    queryKey: ["conversas-sessoes", identificador],
    queryFn: () => fetchSessoes(supabase, identificador!),
    enabled: !!identificador,
  });
  const sessoes = fetchResult?.sessoes ?? [];
  const tabelaConversas = fetchResult?.tableName ?? null;
  const erroConversas = fetchResult?.error ?? (errorSessoes ? String(errorSessoes) : null);

  const { data: mensagens = [], isLoading: loadingMensagens } = useQuery({
    queryKey: ["conversas-mensagens", identificador, selectedSessionId],
    queryFn: () =>
      fetchMensagensSessao(supabase, identificador!, selectedSessionId!),
    enabled: !!identificador && !!selectedSessionId,
  });

  if (!identificador) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <div className="page-header">
          <h1>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <MessageCircle className="h-4 w-4 text-primary" />
            </div>
            Conversas
          </h1>
          <p>Atendimentos e conversas com clientes</p>
        </div>
        <div className="rounded-xl border border-border bg-muted/30 p-8 text-center text-muted-foreground">
          Conversas não disponíveis para esta organização. Configure o identificador da organização.
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 flex flex-col h-[calc(100vh-8rem)]">
      <div className="page-header shrink-0">
        <h1>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <MessageCircle className="h-4 w-4 text-primary" />
          </div>
          Conversas
        </h1>
        <p>Atendimentos e conversas com clientes</p>
      </div>

      <div className="flex-1 min-h-0 flex gap-4 rounded-xl border border-border liquid-glass overflow-hidden">
        {/* Lista de conversas */}
        <aside
          className={cn(
            "w-full md:w-80 shrink-0 flex flex-col border-r border-border bg-muted/20 min-w-0 overflow-hidden",
            selectedSessionId && "hidden md:flex"
          )}
        >
          {loadingSessoes ? (
            <div className="p-4 flex items-center justify-center text-muted-foreground text-sm">
              Carregando conversas...
            </div>
          ) : erroConversas ? (
            <div className="p-4 space-y-2 text-center text-sm">
              <p className="text-destructive font-medium">Erro ao carregar conversas</p>
              <p className="text-muted-foreground break-words">{erroConversas}</p>
              {tabelaConversas && (
                <p className="text-muted-foreground text-xs">Tabela tentada: {tabelaConversas}</p>
              )}
            </div>
          ) : sessoes.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground space-y-2">
              <p>Nenhuma conversa ainda.</p>
              {tabelaConversas && (
                <>
                  <p className="text-xs opacity-80">Tabela: {tabelaConversas}</p>
                  <p className="text-xs opacity-70 max-w-[260px] mx-auto">
                    Se a tabela tem dados e nada aparece, verifique as políticas RLS no Supabase (permitir SELECT para sua organização).
                  </p>
                </>
              )}
            </div>
          ) : (
            <ScrollArea className="flex-1 min-w-0">
              <div className="p-2 space-y-0.5 min-w-0 w-full overflow-x-hidden">
                {sessoes.map((sessao) => (
                  <button
                    key={sessao.session_id}
                    type="button"
                    onClick={() => setSelectedSessionId(sessao.session_id)}
                    className={cn(
                      "w-full rounded-lg p-3 text-left transition-colors grid grid-cols-[auto_1fr_auto] gap-3 items-center min-w-0 max-w-full",
                      selectedSessionId === sessao.session_id
                        ? "bg-primary/10 border border-primary/20"
                        : "hover:bg-muted/50"
                    )}
                  >
                    <Avatar className="h-10 w-10 border border-border">
                      <AvatarImage src={fotoPorSessao[sessao.session_id]} alt="" className="object-cover" />
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                        {labelCliente(sessao.session_id, nomePorSessao)
                          .charAt(0)
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 overflow-hidden">
                      <p className="text-sm font-medium text-foreground truncate">
                        {labelCliente(sessao.session_id, nomePorSessao)}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {truncar(sessao.lastMessagePreview, 40)}
                      </p>
                    </div>
                    <div className="text-[10px] text-muted-foreground whitespace-nowrap text-right shrink-0">
                      {formatarDataExibicao(sessao.lastMessageAt)}
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}
        </aside>

        {/* Thread de mensagens */}
        <section className="flex-1 flex flex-col min-w-0 bg-background/50">
          {!selectedSessionId ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm p-4">
              Selecione uma conversa
            </div>
          ) : (
            <>
              <header className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-border liquid-glass-subtle">
                <button
                  type="button"
                  onClick={() => setSelectedSessionId(null)}
                  className="md:hidden p-1 rounded-lg hover:bg-muted text-muted-foreground"
                  aria-label="Voltar"
                >
                  ←
                </button>
                <Avatar className="h-9 w-9 shrink-0 border border-border">
                  <AvatarImage src={fotoPorSessao[selectedSessionId]} alt="" className="object-cover" />
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                    {labelCliente(selectedSessionId, nomePorSessao)
                      .charAt(0)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {labelCliente(selectedSessionId, nomePorSessao)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {sessoes.find((s) => s.session_id === selectedSessionId)?.messageCount ?? 0} mensagens
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <BotPausarAtivarButtons
                  sessionId={selectedSessionId}
                  telefone={telefonePorSessao[selectedSessionId] ?? null}
                  pausaSegundos={pausaSegundos}
                />
                </div>
              </header>

              {loadingMensagens ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                  Carregando mensagens...
                </div>
              ) : (
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-3">
                    {mensagens.map((msg) => {
                      const info = getMessageDisplayInfo(msg.message);
                      const isUser = info.kind === "user";
                      const isTool = info.kind === "tool";
                      const show = info.text.trim() || isTool;
                      if (!show) return null;
                      return (
                        <div
                          key={msg.id}
                          className={cn(
                            "flex",
                            isUser ? "justify-end" : "justify-start"
                          )}
                        >
                          <div
                            className={cn(
                              "flex max-w-[85%] md:max-w-[75%] gap-2 rounded-2xl px-4 py-2.5",
                              isUser &&
                                "bg-primary text-primary-foreground rounded-br-md shadow-sm",
                              info.kind === "assistant" &&
                                "bg-muted/90 border border-border rounded-bl-md",
                              isTool &&
                                "bg-muted/60 border border-border rounded-bl-md text-muted-foreground"
                            )}
                          >
                            {info.kind === "assistant" && (
                              <span className="shrink-0 mt-0.5 text-base" aria-hidden>🤖</span>
                            )}
                            {isTool && (
                              <span className="shrink-0 mt-0.5 text-base" aria-hidden>🔧</span>
                            )}
                            <div className="min-w-0">
                              <p className="text-sm whitespace-pre-wrap break-words">
                                {info.text || "…"}
                              </p>
                              <p
                                className={cn(
                                  "text-[10px] mt-1",
                                  isUser ? "text-primary-foreground/80" : "text-muted-foreground"
                                )}
                              >
                                {formatarDataExibicao(msg.data)}
                              </p>
                            </div>
                            {isUser && (
                              <span className="shrink-0 mt-0.5 text-base" aria-hidden>👤</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
