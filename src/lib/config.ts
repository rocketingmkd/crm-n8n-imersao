// Configurações públicas do projeto
export const config = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || "https://detsacgocmirxkgjusdf.supabase.co",
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_FdFCGKtrLAgQPRuzoW8IWA__30t116t",
  n8nWebhookUrl: import.meta.env.VITE_N8N_WEBHOOK_URL || "https://webhook.agentes-n8n.com.br/webhook/",
  supabaseProjectId: import.meta.env.VITE_SUPABASE_PROJECT_ID || "detsacgocmirxkgjusdf",
  /** URL do endpoint de observabilidade do servidor (CPU, RAM, disco, workers n8n). Pode ser path ex: /api/observability ou URL completa. */
  observabilityApiUrl: import.meta.env.VITE_OBSERVABILITY_API_URL || "",
};
