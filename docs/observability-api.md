# API de Observabilidade do Servidor

Para a tela **Super Admin → Observabilidade** exibir dados reais (CPU, RAM, disco, workers n8n), o servidor precisa expor um endpoint HTTP que retorne o seguinte JSON.

## Variável de ambiente

No `.env` do frontend:

```env
VITE_OBSERVABILITY_API_URL=/api/observability
```

Ou URL completa se o endpoint estiver em outro host:

```env
VITE_OBSERVABILITY_API_URL=https://seu-servidor.com/api/observability
```

## Contrato da API

**Método:** `GET`  
**Headers:** `Accept: application/json`

**Resposta esperada (200):**

```json
{
  "metrics": {
    "cpu": { "percent": 3 },
    "memory": {
      "usedMb": 1385,
      "totalMb": 3920,
      "percent": 33
    },
    "disk": {
      "usedGb": 25.16,
      "totalGb": 48.3,
      "percent": 52
    },
    "n8nWorkers": {
      "active": 2,
      "idle": 1,
      "busy": 1,
      "total": 2
    }
  },
  "history": [
    { "time": "21:18", "cpu": 3, "memory": 33 },
    { "time": "21:23", "cpu": 5, "memory": 34 }
  ]
}
```

- `metrics`: valores atuais (CPU %, RAM MB/%, disco GB/%, workers n8n).
- `history`: array de pontos da última hora para o gráfico; `time` em formato legível (ex: "HH:mm"), `cpu` e `memory` em percentual.

## Exemplo em Node.js (servidor)

O endpoint pode ser implementado no seu backend (Express, Fastify, etc.) lendo métricas do SO e, se aplicável, da API do n8n:

```js
// Exemplo mínimo: Express
const os = require('os');

app.get('/api/observability', (req, res) => {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMb = Math.round((totalMem - freeMem) / 1024 / 1024);
  const totalMb = Math.round(totalMem / 1024 / 1024);
  const memoryPercent = Math.round((100 * (totalMem - freeMem)) / totalMem);

  res.json({
    metrics: {
      cpu: { percent: Math.min(100, Math.round(os.loadavg()[0] * 25)) },
      memory: { usedMb, totalMb, percent: memoryPercent },
      disk: { usedGb: 25, totalGb: 48, percent: 52 },
      n8nWorkers: { active: 2, idle: 1, busy: 1, total: 2 }
    },
    history: [] // preencher com histórico se tiver
  });
});
```

Para CPU mais preciso use `os.cpus()` ou um pacote como `node-os-utils`. Para disco, use `node-disk-info` ou similar. Para workers n8n, consulte a API do n8n (ex: status dos workers).
