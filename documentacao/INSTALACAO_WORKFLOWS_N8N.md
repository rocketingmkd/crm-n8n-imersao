# Instalação dos Workflows n8n — FlowAtend

Guia completo para importar e configurar todos os workflows n8n do FlowAtend.

---

## Pré-requisitos

- n8n rodando (self-hosted ou cloud) com acesso ao painel
- Supabase configurado com o banco instalado (`instalar_banco_de_dados.sql`)
- UAZAPI configurado (servidor WhatsApp)
- Redis disponível (usado para debounce e pausa de agente)
- Chave da API OpenAI

---

## 1. Configurar Credenciais no n8n

Antes de importar os workflows, crie as seguintes credenciais em **Settings → Credentials**:

| Nome da Credencial | Tipo | Onde obter |
|---------------------|------|-----------|
| **Supabase Flow Atend** | Supabase | URL + Service Role Key do projeto Supabase |
| **Postgres FlowAtend** | PostgreSQL | Host, porta, database, user e password do Supabase (Connection Pooling) |
| **OpenAI** | OpenAI API | Chave em [platform.openai.com](https://platform.openai.com/api-keys) |
| **Redis** | Redis | Host, porta e senha do Redis |
| **n8n API** | n8n API | Settings → API → Create API Key |
| **Uazapi (Header Auth)** | HTTP Header Auth | Header: `admintoken`, Value: token admin do UAZAPI |
| **SMTP Flowgrammers** | SMTP | Dados do servidor SMTP (para e-mails de confirmação de agendamento) |

> **Dica:** Use exatamente esses nomes nas credenciais. Os workflows referenciam por nome.

---

## 2. Configurar Variáveis no n8n

Vá em **Settings → Variables** e crie:

| Variável | Exemplo | Descrição |
|----------|---------|-----------|
| `servidorUAZAPI` | `server1` | Subdomínio do servidor UAZAPI |
| `urlN8N` | `https://n8n.seudominio.com/` | URL base do n8n (com barra no final) |
| `projectId` | `abc123` | ID do projeto no n8n (para organizar workflows) |
| `urlBasePrd` | `https://n8n.seudominio.com/webhook/` | URL base de produção dos webhooks |

---

## 3. Ordem de Importação

Os workflows têm dependências entre si. Importe na ordem abaixo para evitar erros.

### Fase 1 — Sub-workflows (base)

Esses são chamados por outros workflows. Importe primeiro.

| # | Arquivo | Webhook/Trigger | Descrição |
|---|---------|----------------|-----------|
| 1 | `sub-workflows-atend/buscarDadosWorkflow.json` | Execute Workflow Trigger | Busca dados da instância, agente IA, organização e contato |
| 2 | `sub-workflows-atend/verificarETratarPausaAgente.json` | Execute Workflow Trigger | Verifica/aplica pausa do agente via Redis |
| 3 | `sub-workflows-atend/classificarMensagem.json` | Execute Workflow Trigger | Classifica tipo de mensagem (texto, áudio, imagem, doc) |
| 4 | `sub-workflows-atend/debounceMensagens.json` | Execute Workflow Trigger | Agrupa mensagens seguidas via Redis |
| 5 | `sub-workflows-atend/tratarRetornoAgente.json` | Execute Workflow Trigger | Limpa artefatos do output da IA |
| 6 | `sub-workflows-atend/calcularERegistrarTokens.json` | Execute Workflow Trigger | Estima tokens e registra custo em `uso_tokens` |
| 7 | `sub-workflows-atend/responderComAudio.json` | Execute Workflow Trigger | Text-to-speech via ElevenLabs + envio UAZAPI |
| 8 | `sub-workflows-atend/responderTextoQuebrado.json` | Execute Workflow Trigger | Quebra resposta longa em mensagens naturais |
| 9 | `sub-workflows-atend/insereFollowUPCliente.json` | Execute Workflow Trigger | Gerencia fila de follow-up |
| 10 | `sub-workflows-atend/escalarAtendimentoHumanoEResumirConversa.json` | Execute Workflow Trigger | Escala para humano e resume conversa com IA |
| 11 | `sub-workflows-atend/enviarMensagemComoHumano.json` | POST `/enviar-mensagem-como-humano` | Endpoint para operador enviar mensagem pelo WhatsApp |

### Fase 2 — APIs

| # | Arquivo | Webhook | Descrição |
|---|---------|---------|-----------|
| 12 | `apis/agenda/gestaoAgendaAPI.json` | POST `/gestao-agenda` | CRUD completo de agendamentos |
| 13 | `apis/agenda/criarAgendaAPI.json` | POST `/criar-agenda` | Notifica lead via WhatsApp sobre agendamento criado |
| 14 | `apis/rag/inserirArquivosRAGAPI.json` | POST `/rag-cliente` | Upload PDF → embeddings → Supabase vector store |
| 15 | `apis/rag/excluirArquivoRAGAPI.json` | POST `/rag-deletar-unico` | Exclui documento da base de conhecimento |
| 16 | `apis/rag/excluirArquivoPorOrganizacaoAPI.json` | POST `/rag-deletar-tudo` | Exclui todos documentos de uma organização |
| 17 | `apis/whatsapp/iniciarInstanciaWhatsappAPI.json` | POST `/criar-instancia-cliente` | Cria instância WhatsApp no UAZAPI |
| 18 | `apis/whatsapp/gerarQRCodeWhatsappAPI.json` | POST `/gerar-qrcode` | Gera QR Code para conectar WhatsApp |
| 19 | `apis/whatsapp/setarWebhookInstanciaWhatsappAPI.json` | POST `/configurar-webhook` | Configura webhook da instância no UAZAPI |
| 20 | `apis/whatsapp/validarStatusConexaoWhatsappAPI.json` | POST `/verificar-conexao` | Verifica status de conexão WhatsApp |
| 21 | `apis/whatsapp/listarInstanciasWhatsappAPI.json` | POST `/listar-instancia` | Lista instâncias WhatsApp da organização |
| 22 | `apis/whatsapp/apagarInstanciaWhatsappAPI.json` | POST `/apagar-instancia` | Remove instância do UAZAPI e Supabase |
| 23 | `apis/whatsapp/pausarAgenteAPI.json` | POST `/pausar-agente` | Pausa agente IA (takeover humano) |
| 24 | `apis/whatsapp/ativarAgenteAPI.json` | POST `/remover-pausa-agente` | Reativa agente IA |
| 25 | `apis/whatsapp/listarPausaAgenteAPI.json` | POST `/lista-pausa-agente` | Verifica se agente está pausado |
| 26 | `apis/servidor/observabilidadeServidorWorkersAPI.json` | GET `/observability-standalone` | Métricas CPU/RAM/Disco/Workers |
| 27 | `apis/servidor/insightsAPI.json` | GET `/insights` | Stats de workflows e execuções |
| 28 | `apis/servidor/gestaoVPSAPI.json` | POST `/gestao-vps-completa` | Comandos remotos de gestão n8n |

### Fase 3 — Skeletons (templates de atendimento)

| # | Arquivo | Webhook | Plano |
|---|---------|---------|-------|
| 29 | `skeletons/flowAtendBasic.json` | POST `/basic` | Plano A — Atendimento básico |
| 30 | `skeletons/flowAtendIntermediate.json` | POST `/intermediate` | Plano B — Atendimento + RAG |
| 31 | `skeletons/flowAtendAdvanced.json` | POST `/advanced` | Plano C — Atendimento + RAG + Agendamento |

> **Importante:** Os skeletons são templates. Não ative-os diretamente — eles são clonados automaticamente pelo workflow de instalação (item 32) quando uma nova organização é criada.

### Fase 4 — Instalador de workflows

| # | Arquivo | Webhook | Descrição |
|---|---------|---------|-----------|
| 32 | `apis/workflows/instalarWorkflowDoClienteAPI.json` | POST `/criacao-fluxo` | Clona skeleton por plano, personaliza e ativa para o cliente |

### Fase 5 — Crons (agendados)

| # | Arquivo | Trigger | Descrição |
|---|---------|---------|-----------|
| 33 | `crons/enviarLembrete.json` | Cron (1 min) | Envia lembretes de agendamentos (15min, 60min, 24h antes) |
| 34 | `crons/dispararFollowUP.json` | Cron (30 min) | Dispara follow-up automático (até 3 tentativas) |

### Fase 6 — Utilitários (opcional)

| # | Arquivo | Trigger | Descrição |
|---|---------|---------|-----------|
| 35 | `utilitarios/PRD Creator - Lovable.json` | Form | Gera PRD via LLM + Google Docs (requer OpenRouter + Google OAuth2) |

---

## 4. Como Importar um Workflow

1. No n8n, clique em **Add workflow** (ou `+`)
2. Clique nos **três pontinhos** (`...`) no canto superior direito → **Import from file**
3. Selecione o arquivo `.json` da pasta `n8n/`
4. O workflow será importado com todos os nodes
5. **Revise as credenciais** — clique em cada node que mostra ⚠️ e selecione a credencial correspondente
6. Salve o workflow

> **Atenção:** Ao importar, os nodes de credencial podem ficar com erro (ícone vermelho). Basta abrir cada node e selecionar a credencial que você criou no passo 1.

---

## 5. Ativar Workflows

Após importar e configurar as credenciais:

- **Webhooks** (APIs): Ative o toggle no canto superior direito. O webhook só funciona quando o workflow está ativo.
- **Crons**: Ative apenas quando quiser que os agendamentos e follow-ups rodem automaticamente.
- **Sub-workflows**: Não precisam estar ativos — são chamados diretamente por outros workflows.
- **Skeletons**: **Não ative** — são templates usados pelo instalador.

---

## 6. Credenciais por Workflow

### Supabase Flow Atend
Usado por: gestaoAgendaAPI, criarAgendaAPI, inserirArquivosRAGAPI, apagarInstanciaWhatsappAPI, enviarLembrete, dispararFollowUP, buscarDadosWorkflow, calcularERegistrarTokens, insereFollowUPCliente, escalarAtendimentoHumanoEResumirConversa, instalarWorkflowDoClienteAPI

### Postgres FlowAtend
Usado por: excluirArquivoRAGAPI, excluirArquivoPorOrganizacaoAPI, escalarAtendimentoHumanoEResumirConversa, dispararFollowUP, skeletons

### OpenAI
Usado por: inserirArquivosRAGAPI (embeddings), enviarLembrete, dispararFollowUP, escalarAtendimentoHumanoEResumirConversa, responderTextoQuebrado, skeletons (agente IA)

### Redis
Usado por: pausarAgenteAPI, ativarAgenteAPI, listarPausaAgenteAPI, verificarETratarPausaAgente, debounceMensagens, escalarAtendimentoHumanoEResumirConversa

### n8n API
Usado por: observabilidadeServidorWorkersAPI, insightsAPI, gestaoVPSAPI, instalarWorkflowDoClienteAPI

### Uazapi (Header Auth)
Usado por: observabilidadeServidorWorkersAPI, insightsAPI, iniciarInstanciaWhatsappAPI, listarInstanciasWhatsappAPI

### SMTP Flowgrammers
Usado por: gestaoAgendaAPI (confirmação de agendamento por e-mail)

---

## 7. Fluxo de Atendimento — Como Funciona

```
Mensagem WhatsApp → UAZAPI → Webhook n8n (skeleton)
  → buscarDadosWorkflow (dados da org/contato)
  → verificarETratarPausaAgente (checar Redis)
  → classificarMensagem (texto/áudio/imagem/doc)
  → debounceMensagens (agrupar mensagens rápidas)
  → Agente IA (OpenAI GPT-4o + tools)
  → calcularERegistrarTokens (registrar custo)
  → tratarRetornoAgente (limpar output)
  → responderTextoQuebrado ou responderComAudio
  → insereFollowUPCliente (fila de follow-up)
```

**Escalação para humano:** Quando o agente identifica necessidade, chama `escalarAtendimentoHumanoEResumirConversa` que notifica o admin, pausa o agente e resume a conversa.

---

## 8. Verificação Final

Após importar todos os workflows:

- [ ] Todas as credenciais estão configuradas e sem erro
- [ ] Variáveis `servidorUAZAPI`, `urlN8N`, `projectId`, `urlBasePrd` estão preenchidas
- [ ] Webhooks das APIs estão ativos (toggle ON)
- [ ] Testar o health check: acessar `GET /webhook/observability-standalone` no navegador — deve retornar JSON com métricas
- [ ] Skeletons **não** estão ativos (são templates)
- [ ] Crons ativados conforme necessidade
