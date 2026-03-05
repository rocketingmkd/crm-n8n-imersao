import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// Base do webhook n8n (evita CORS em dev ao usar proxy)
const n8nBase = process.env.VITE_N8N_WEBHOOK_URL || "https://webhook.agentes-n8n.com.br/webhook/";
const n8nOrigin = new URL(n8nBase.replace(/\/?$/, "/")).origin;
const n8nPath = new URL(n8nBase).pathname.replace(/\/?$/, "/");

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      // Em dev, chamadas a /api/n8n-proxy/* são enviadas ao webhook n8n (evita CORS)
      "/api/n8n-proxy": {
        target: n8nOrigin,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/n8n-proxy/, n8nPath),
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
