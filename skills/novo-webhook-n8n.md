Integre um novo webhook n8n ao projeto FlowAtend (frontend + config).

## Tarefa
$ARGUMENTS

## Instruções

1. Leia `src/lib/config.ts` para entender como os webhooks existentes estão configurados — siga exatamente o mesmo padrão.

2. **Passo 1 — Adicionar a variável de ambiente em `src/lib/config.ts`:**
```typescript
export const config = {
  // ... existentes ...
  novoWebhookUrl: import.meta.env.VITE_NOVO_WEBHOOK_URL
    || `${import.meta.env.VITE_N8N_WEBHOOK_URL ?? ''}/nome-do-webhook`,
} as const;
```

3. **Passo 2 — Declarar no `.env` (e no `.env.example` se existir):**
```env
VITE_NOVO_WEBHOOK_URL=https://n8n.agentes-n8n.com.br/webhook/nome-do-webhook
```

4. **Padrão de chamada de webhook no frontend** — sempre via `fetch` com POST:
```typescript
import { config } from "@/lib/config";

const chamarWebhook = async (payload: object) => {
  const response = await fetch(config.novoWebhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`Webhook retornou ${response.status}`);
  return response.json();
};
```

5. **Se o webhook retorna `{ retorno: "..." }`** (padrão GestaoVps), trate assim:
```typescript
const data = await response.json();
if (typeof data?.retorno === 'string' && data.retorno.startsWith('❌')) {
  throw new Error(data.retorno);
}
return data.retorno;
```

6. **Se o webhook é chamado em uma mutation React Query:**
```typescript
import { useMutation } from "@tanstack/react-query";
import { config } from "@/lib/config";
import { toast } from "sonner";

export function useAcaoWebhook() {
  return useMutation({
    mutationFn: async (payload: { campo: string }) => {
      const response = await fetch(config.novoWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => toast.success('Ação realizada com sucesso'),
    onError: (err: Error) => toast.error(err.message),
  });
}
```

7. **Nunca chame a API do n8n diretamente** — sempre via webhook registrado em `config.ts`. Isso garante que a URL é configurável por ambiente.

8. **Health check de webhook** (se necessário, ex: GestaoVps):
```typescript
// Qualquer resposta HTTP indica que o n8n está online — mesmo 4xx
try {
  const res = await fetch(config.novoWebhookUrl, { method: 'POST', ... });
  setOnline(true);
  setLatencia(Date.now() - inicio);
} catch {
  setOnline(false); // só falha se não houver resposta (ECONNREFUSED, timeout)
}
```

9. **Payload padrão n8n** — o n8n espera JSON. Para comandos de texto (ex: GestaoVps):
```json
{ "message": { "text": "/comando argumento" } }
```
Para payloads de dados:
```json
{ "id_organizacao": "uuid", "dados": { ... } }
```

10. Documente o novo webhook em `CLAUDE.md` na seção "Integração com n8n → Webhooks".
