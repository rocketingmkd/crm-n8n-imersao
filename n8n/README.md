# Workflows n8n – API de Observabilidade via Webhook

Esta pasta contém os JSON dos fluxos n8n que expõem a **API de Observabilidade** (CPU, RAM, disco, workers) via **webhook**, para o painel **Super Admin → Observabilidade**.

## Arquivos

| Arquivo | Descrição |
|--------|-----------|
| **observability-webhook.json** | Webhook GET que **chama a API Node** (container `observability-api`). Use quando a API estiver rodando em Docker junto do n8n. |
| **observability-webhook-standalone.json** | Webhook GET que **coleta métricas no próprio n8n** (node Execute Command). Só funciona em n8n self-hosted com Execute Command habilitado; **não disponível no n8n Cloud**. |

## Como importar no n8n

1. Abra o n8n (editor).
2. **Menu (três pontinhos)** → **Import from File** (ou **Import from URL**).
3. Escolha o `.json` desejado.
4. Ajuste o que for necessário (ver abaixo) e ative o workflow.

## 1. observability-webhook.json (recomendado)

- **Trigger:** Webhook GET no path `observability`.
- **Fluxo:** Webhook → HTTP Request para a API Node → Respond to Webhook.

**O que ajustar:**

- No node **"Chamar API Observability"**, altere a **URL** para onde a sua API de observabilidade está rodando, por exemplo:
  - Mesma rede Docker: `http://observability-api:3001/api/observability`
  - Mesmo host (Docker): `http://host.docker.internal:3001/api/observability`
  - Outro servidor: `https://seu-dominio.com/api/observability`

**URL do webhook no n8n:**

- Produção: `https://seu-n8n.com/webhook/observability` (ou o path que você definiu).
- Teste: a URL exata aparece no node Webhook após salvar/ativar.

No frontend, use no `.env`:

```env
VITE_OBSERVABILITY_API_URL=https://seu-n8n.com/webhook/observability
```

## 2. observability-webhook-standalone.json

- **Trigger:** Webhook GET no path `observability-standalone`.
- **Fluxo:** Webhook → Execute Command (script Node que gera o JSON) → Code (parse) → Respond to Webhook.

**Requisitos:**

- n8n **self-hosted** (não Cloud).
- **Execute Command** habilitado (em n8n 2.0+ pode estar desativado por padrão).
- O comando roda **dentro do container/processo do n8n** (métricas desse ambiente, não necessariamente do host).

**URL do webhook:**

- Ex.: `https://seu-n8n.com/webhook/observability-standalone`

No frontend:

```env
VITE_OBSERVABILITY_API_URL=https://seu-n8n.com/webhook/observability-standalone
```

## Formato da resposta (ambos os fluxos)

O webhook deve responder com **JSON** no formato esperado pelo painel:

```json
{
  "metrics": {
    "cpu": { "percent": 3 },
    "memory": { "usedMb": 1385, "totalMb": 3920, "percent": 33 },
    "disk": { "usedGb": 25.16, "totalGb": 48.3, "percent": 52 },
    "n8nWorkers": { "active": 2, "idle": 1, "busy": 1, "total": 2 }
  },
  "history": [
    { "time": "21:18", "cpu": 3, "memory": 33 }
  ]
}
```

- O fluxo **observability-webhook** usa exatamente o que a API Node retorna.
- O fluxo **observability-webhook-standalone** gera `metrics` no Execute Command e devolve `history: []` (gráfico da última hora fica vazio até você implementar histórico).

## Resumo

- **Prefira** `observability-webhook.json` com a **API Node** (`observability-api`) rodando na VPS (métricas do host, histórico, opção de n8n workers).
- Use `observability-webhook-standalone.json` só se quiser tudo dentro do n8n, em self-hosted, com Execute Command habilitado.
