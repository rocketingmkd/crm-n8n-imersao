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
};
