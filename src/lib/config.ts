// Configurações públicas do projeto
const n8nWebhookBase = (import.meta.env.VITE_N8N_WEBHOOK_URL || "https://webhook.agentes-n8n.com.br/webhook/").replace(/\/?$/, "/");

export const config = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || "https://detsacgocmirxkgjusdf.supabase.co",
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_FdFCGKtrLAgQPRuzoW8IWA__30t116t",
  n8nWebhookUrl: n8nWebhookBase,
  supabaseProjectId: import.meta.env.VITE_SUPABASE_PROJECT_ID || "detsacgocmirxkgjusdf",
  /** URL do endpoint de observabilidade (derivada de VITE_N8N_WEBHOOK_URL + observability-standalone) */
  observabilityApiUrl: n8nWebhookBase + "observability-standalone",
  /** URL do webhook n8n insights (derivada de VITE_N8N_WEBHOOK_URL + insights) */
  n8nInsightsUrl: n8nWebhookBase + "insights",
  /** URL do webhook Gestão VPS (comandos: workflows, cleanup, execute, activate, deactivate, executions, backup) */
  gestaoVpsWebhookUrl: import.meta.env.VITE_GESTAO_VPS_WEBHOOK_URL || n8nWebhookBase + "gestao-vps-completa",
  /** Path (sem origem) para pausar/remover/lista pausa - usado no proxy em dev */
  n8nPausarAgentePath: "pausar-agente",
  n8nRemoverPausaAgentePath: "remover-pausa-agente",
  n8nListaPausaAgentePath: "lista-pausa-agente",
  /** URL do webhook n8n para pausar agente (POST: remote_J_id, pausa_segundos) */
  n8nPausarAgenteUrl: n8nWebhookBase + "pausar-agente",
  /** URL do webhook n8n para remover pausa do agente (POST: remote_J_id) */
  n8nRemoverPausaAgenteUrl: n8nWebhookBase + "remover-pausa-agente",
  /** URL do webhook n8n para listar status de pausa (POST: remote_J_id). Retorno [{ propertyName: null }] = ativo. */
  n8nListaPausaAgenteUrl: n8nWebhookBase + "lista-pausa-agente",
  /** Path para enviar mensagem como humano (proxy em dev) */
  n8nEnviarMensagemComoHumanoPath: "enviar-mensagem-como-humano",
  /** URL do webhook n8n para enviar mensagem como humano (POST: mensagem, token, telefone). */
  n8nEnviarMensagemComoHumanoUrl: n8nWebhookBase + "enviar-mensagem-como-humano",
};

/** Em dev usa proxy para evitar CORS; em produção usa a URL completa. */
export function getPausarAgenteUrl(): string {
  if (import.meta.env.DEV) return `/api/n8n-proxy/${config.n8nPausarAgentePath}`;
  return config.n8nPausarAgenteUrl;
}
export function getRemoverPausaAgenteUrl(): string {
  if (import.meta.env.DEV) return `/api/n8n-proxy/${config.n8nRemoverPausaAgentePath}`;
  return config.n8nRemoverPausaAgenteUrl;
}
export function getListaPausaAgenteUrl(): string {
  if (import.meta.env.DEV) return `/api/n8n-proxy/${config.n8nListaPausaAgentePath}`;
  return config.n8nListaPausaAgenteUrl;
}

export function getEnviarMensagemComoHumanoUrl(): string {
  if (import.meta.env.DEV) return `/api/n8n-proxy/${config.n8nEnviarMensagemComoHumanoPath}`;
  return config.n8nEnviarMensagemComoHumanoUrl;
}
