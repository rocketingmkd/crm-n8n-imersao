# CLAUDE.md — FlowAtend

Contexto e convenções do projeto para uso pelo Claude Code.

---

## O que é o projeto

**FlowAtend** é uma plataforma SaaS multi-tenant de gestão inteligente para empresas de atendimento (clínicas, consultórios, serviços). Inclui agenda, CRM de contatos, kanban, agente de IA configurável, base de conhecimento (RAG), integrações com WhatsApp e um painel de super admin completo com observabilidade do servidor n8n.

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18 + TypeScript + Vite (SWC) |
| Estilo | Tailwind CSS 3 + shadcn/ui + Radix UI |
| Ícones | Lucide React |
| Gráficos | Recharts |
| Formulários | React Hook Form + Zod |
| Server state | TanStack React Query v5 |
| Roteamento | React Router DOM v6 |
| Backend/DB | Supabase (PostgreSQL + Auth + Realtime) |
| Automação | n8n (webhooks externos) |
| Notificações | Sonner (toasts) |
| Drag & Drop | dnd-kit |
| Build | Vite, porta dev 8080 |

---

## Comandos

```bash
# Instalar dependências
npm install   # ou bun install

# Desenvolvimento
npm run dev   # servidor em localhost:8080

# Build de produção
npm run build

# Lint
npm run lint

# Preview do build
npm run preview
```

---

## Estrutura de pastas

```
src/
├── App.tsx                    # Rotas principais (React Router) + AplicadorCores
├── components/
│   ├── ui/                    # Componentes shadcn/ui
│   ├── Layout.tsx             # Sidebar/nav para usuários de org
│   ├── SuperAdminLayout.tsx   # Sidebar/nav do super admin
│   ├── AppLogo.tsx            # Logo whitelabel (variant="org"|"platform") + fallback onError
│   ├── ProtectedRoute.tsx     # Requer usuário autenticado
│   ├── SuperAdminRoute.tsx    # Requer super_admin = true
│   ├── OrgRoute.tsx           # Requer id_organizacao preenchido
│   ├── PlanGuard.tsx          # Verifica feature/limite do plano
│   ├── LimitAlert.tsx         # Alerta de limite do plano
│   ├── SupportButton.tsx      # Botão WhatsApp suporte (configuracoes_globais)
│   └── KPICard.tsx
├── contexts/
│   ├── AuthContext.tsx        # Auth state global (Supabase)
│   └── ThemeContext.tsx       # light/dark (persiste em localStorage, padrão: dark)
├── hooks/
│   ├── useAuth.ts             # Export do AuthContext
│   ├── useContatos.ts         # CRUD de contatos (React Query) ← principal
│   ├── useAgendamentos.ts     # CRUD de agendamentos (React Query) ← principal
│   ├── useRotuloEntidade.ts   # Rótulo configurável do contato (singular/plural)
│   ├── useContacts.ts         # Re-export de useContatos (compatibilidade)
│   ├── useAppointments.ts     # Re-export de useAgendamentos (compatibilidade)
│   ├── useEntityLabel.ts      # Re-export de useRotuloEntidade (compatibilidade)
│   ├── usePlanFeatures.ts     # Features e limites do plano
│   ├── useChatMetrics.ts      # Métricas de conversas (tabelas dinâmicas)
│   ├── useObservability.ts    # Métricas CPU/RAM/Disco/Workers (polling 5s)
│   ├── useN8nInsights.ts      # Workflows e execuções n8n (polling 60s)
│   └── useCoresPataforma.ts   # Cor primária da UI (busca DB + aplica CSS vars)
├── lib/
│   ├── config.ts              # Todas as variáveis de ambiente (VER ABAIXO)
│   ├── supabase.ts            # Cliente Supabase
│   ├── utils.ts               # cn(), formatPhoneNumber(), resolverUrlImagem()
│   └── dateUtils.ts
├── pages/
│   ├── auth/                  # Login, Register, ForgotPassword
│   ├── Dashboard.tsx          # /app/dashboard
│   ├── Agenda.tsx             # /app/agenda
│   ├── CRM.tsx                # /app/clientes/crm
│   ├── Kanban.tsx             # /app/clientes/kanban
│   ├── AgentIA.tsx            # /app/agent-ia
│   ├── Conhecimento.tsx       # /app/conhecimento (RAG)
│   ├── Integrations.tsx       # /app/integrations
│   ├── Observability.tsx      # /super-admin/observability
│   └── super-admin/
│       ├── Dashboard.tsx      # /super-admin/dashboard
│       ├── Organizations.tsx  # /super-admin/organizations
│       ├── OrganizationForm.tsx
│       ├── Plans.tsx
│       ├── TokenUsage.tsx
│       ├── N8nInsights.tsx    # /super-admin/insights
│       ├── GestaoVps.tsx      # /super-admin/gestao-vps
│       └── Settings.tsx
├── types/
│   ├── auth.ts                # Organization, Profile, SignUpData
│   └── database.ts            # Tipos espelho do banco (manual)
└── integrations/supabase/
    ├── client.ts
    └── types.ts               # Tipos gerados do Supabase
n8n/                           # Workflows n8n (JSONs para importar)
supabase/
├── instalar_banco_de_dados.sql  # Instala todo o banco UMA VEZ (banco limpo)
├── INSTALACAO.md                # Guia de instalação passo a passo
└── functions/                   # Edge Functions (Deno)
    ├── criar-organizacao/
    ├── gerenciar-usuarios-organizacao/
    └── atualizar-organizacao/
```

---

## Variáveis de ambiente

Definidas em `.env` (não versionado). Todas têm fallbacks hardcoded em `src/lib/config.ts`.

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_SUPABASE_PROJECT_ID=

VITE_N8N_WEBHOOK_URL=              # Base webhooks n8n
VITE_GESTAO_VPS_WEBHOOK_URL=       # Comandos de gestão VPS (fallback: base+gestao-vps-completa)
```

**Nunca commitar o `.env` com credenciais reais.**

---

## Autenticação e roles

### Fluxo
- `signIn` → Supabase Auth → carrega `perfil` e `organizacao`
- `signUp` → cria usuário + organização + perfil + configurações
- Sessão persiste via Supabase localStorage

### Roles
| Role | Acesso |
|------|--------|
| `super_admin = true` | `/super-admin/*` (sem organização vinculada) |
| `admin` | Acesso total à organização em `/app/*` |
| `profissional` / `assistente` | Acesso limitado conforme features do plano |

### Guards de rota
- `ProtectedRoute` — requer usuário autenticado
- `SuperAdminRoute` — requer `super_admin = true`
- `OrgRoute` — requer `id_organizacao` preenchido
- `PlanGuard` — verifica feature/limite do plano antes de renderizar

---

## Banco de dados (Supabase)

### Instalação
Execute `supabase/instalar_banco_de_dados.sql` **uma única vez** em um projeto Supabase limpo.
Siga o guia em `supabase/INSTALACAO.md`.

### Funções SQL auxiliares
| Função | Descrição |
|--------|-----------|
| `obter_id_organizacao_usuario()` | Retorna o `id_organizacao` do usuário autenticado |
| `usuario_e_super_admin()` | Retorna `true` se o usuário autenticado é super admin |
| `trigger_atualizado_em()` | Atualiza `atualizado_em` automaticamente em updates |

### Tabelas principais

| Tabela | Descrição |
|--------|-----------|
| `organizacoes` | Empresas clientes (raiz multi-tenant) |
| `perfis` | Usuários com função e organização |
| `contatos` | Contatos/clientes das organizações |
| `agendamentos` | Agendamentos com início/fim ISO8601 |
| `configuracoes` | Configurações por organização |
| `config_agente_ia` | Personalidade e config do agente IA |
| `instancias_whatsapp` | Instâncias WhatsApp por organização |
| `horarios_trabalho` | Horários de atendimento por usuário |
| `planos_assinatura` | Definição dos planos e limites |
| `uso_tokens` | Consumo de tokens de IA |
| `configuracoes_globais` | Config global da plataforma (whitelabel) |
| `documentos` | Base de conhecimento (RAG, pgvector) |
| `clientes_followup` | Follow-up de clientes via n8n |
| `{identificador}_conversas` | Tabelas dinâmicas de chat por organização (criadas pelo n8n) |

### configuracoes_globais — campos importantes
| Campo | Descrição | Padrão |
|-------|-----------|--------|
| `nome_plataforma` | Nome exibido no header e browser | `FlowAtend` |
| `whatsapp_suporte` | Número WhatsApp do suporte (botão flutuante) | — |
| `chave_openai` | API Key OpenAI global | — |
| `chave_elevenlabs` | API Key ElevenLabs para síntese de voz | — |
| `cor_primaria` | Cor primária da UI em hex (`#RRGGBB`) | `#D9156C` |
| `url_logo_plataforma` | Logo para fundo escuro | — |
| `url_logo_plataforma_escuro` | Logo para fundo claro | — |

### Convenções de nomenclatura do banco

Todo o banco usa **snake_case em Português Brasileiro**:

- Tabelas: `organizacoes`, `perfis`, `contatos`
- Colunas: `id_organizacao`, `nome_completo`, `criado_em`
- Enum values: `ativo/inativo`, `confirmado/pendente/concluido/cancelado`, `profissional/assistente/admin`
- Identificador único da org: coluna `identificador` (URL-safe, ex: `minha-empresa-1700000000000`)

### Enum values importantes

| Campo | Valores |
|-------|---------|
| `contatos.situacao` | `ativo` / `inativo` |
| `agendamentos.situacao` | `confirmado` / `pendente` / `concluido` / `cancelado` |
| `perfis.funcao` | `admin` / `profissional` / `assistente` |
| `instancias_whatsapp.situacao` | `pendente` / `conectado` / `desconectado` / `erro` |
| `contatos.status_kanban` | `novo_contato` / `qualificado` / `em_atendimento` / `agendado` / `aguardando_confirmacao` / `concluido` |

### Planos
Quatro planos: `plano_a`, `plano_b`, `plano_c`, `plano_d`.
Cada um tem features booleanas (`atendimento_inteligente`, `integracao_whatsapp`, etc.) e limites numéricos (`max_contatos`, `max_usuarios`, etc.). `null` = ilimitado.

---

## Integração com n8n

Toda comunicação com n8n é via HTTP POST para webhooks. O frontend **nunca chama a API do n8n diretamente** — usa sempre webhooks configurados no `config.ts`.

### Webhooks
| Chave em config | Propósito |
|-----------------|-----------|
| `n8nWebhookUrl` | Webhook genérico |
| `observabilityApiUrl` | CPU, RAM, Disco, Workers n8n em tempo real |
| `n8nInsightsUrl` | Total de workflows, execuções, taxa de falha, tempo médio |
| `gestaoVpsWebhookUrl` | Comandos de gestão: `/workflows`, `/cleanup`, `/execute <nome>`, `/activate <nome>`, `/deactivate <nome>`, `/executions <nome>`, `/backup` |

### Protocolo de comandos (GestaoVps)
```json
// Request
{ "message": { "text": "/activate Nome Do Workflow" } }

// Response (JSON)
{ "retorno": "✅ Workflow ativado" }
// ou
{ "retorno": "❌ Workflow não encontrado" }
```

Respostas que começam com `❌` são tratadas como erro. Qualquer resposta HTTP (mesmo 4xx) indica que o n8n está online para fins de health check.

### Workflows n8n disponíveis (pasta `n8n/`)
- `Webhoooks de Administração.json` — criação de orgs e workflows
- `Instalação do Banco de Dados.json` — provisiona tabelas dinâmicas por org
- `Classificação Mensagem.json` — roteamento de mensagens recebidas
- `Debounce.json` — agrupa mensagens antes de processar
- `Atendimento - Básico.json` — atendimento simples via WhatsApp
- `Atendimento - Intermediáro (RAG + Atendimento).json` — atendimento com RAG
- `Atendimento - Completo (RAG + Agendamento).json` — atendimento com RAG + agendamento
- `Gestão de Agendas.json` — CRUD de agendamentos via n8n
- `Criar Agenda.json` — criação de agendamento por mensagem
- `Envio Lembrete.json` — lembretes automáticos de agendamentos
- `Disparo de Follow Up.json` — follow-up automático de clientes
- `Insere Followup Cliente.json` — insere cliente na fila de follow-up
- `Gestao de Tokens.json` — contabiliza tokens OpenAI por org
- `Gestao VPS - COMPLETA.json` — gestão de workflows via comandos
- `Error - Gestao VPS.json` — tratamento de erros da gestão VPS
- `Observabilidade em tempo real.json` — métricas do servidor
- `Observability API (Webhook).json` — webhook de observabilidade
- `Observability API (standalone - Execute Command + n8n Workers).json`
- `Insights API (Workflows + Executions).json` — insights de execuções n8n

---

## Padrões de código

### Componentes
- Functional components com TypeScript
- Hooks em arquivos separados em `src/hooks/`
- Formulários com React Hook Form + Zod
- State server com React Query (mutations + queries separados)

### Estilo
- Tailwind CSS com `cn()` para classes condicionais
- Componentes UI reutilizáveis em `src/components/ui/` (shadcn)
- Dark mode via classe no `<html>` (padrão: dark)
- Nunca usar `style={{}}` inline — sempre Tailwind

### Alias de import
```typescript
import { Button } from "@/components/ui/button";  // @ = src/
```

### Toasts
```typescript
import { toast } from "sonner";
toast.success("Mensagem");
toast.error("Erro");
```

### Dados assíncronos
- Sempre usar React Query para dados de servidor
- `useQuery` para leitura, `useMutation` para escrita
- Invalidar queries após mutations

---

## Funcionalidades por área

### Área de Organização (`/app/*`)
| Rota | Funcionalidade |
|------|---------------|
| `/app/dashboard` | KPIs, agenda do dia, ações rápidas |
| `/app/agenda` | Calendário mês/semana/dia, CRUD agendamentos |
| `/app/clientes/crm` | Lista de contatos, busca, status |
| `/app/clientes/kanban` | Board visual de estágios do contato |
| `/app/agent-ia` | Nome, personalidade e configuração do chatbot IA |
| `/app/conhecimento` | Upload de PDFs para base de conhecimento (RAG) |
| `/app/integrations` | WhatsApp oficial/não-oficial, webhooks |

### Área Super Admin (`/super-admin/*`)
| Rota | Funcionalidade |
|------|---------------|
| `/super-admin/dashboard` | Estatísticas globais + gráficos de tokens |
| `/super-admin/organizations` | CRUD de empresas |
| `/super-admin/plans` | Visualização de planos |
| `/super-admin/token-usage` | Consumo de tokens por org |
| `/super-admin/observability` | CPU, RAM, Disco, Workers n8n (tempo real) |
| `/super-admin/insights` | Workflows, execuções, falhas, tempo médio |
| `/super-admin/gestao-vps` | Gerenciar workflows n8n remotamente |
| `/super-admin/settings` | Configurações globais (whitelabel, cores, chaves de API, logos) |

---

## GestaoVps — detalhes de implementação

O módulo mais complexo do super admin. Envia comandos para o webhook n8n.

### Features implementadas
- **Health check** — ping no mount, manual via botão, mostra latência
- **Listar workflows** — tabela paginada com busca por nome e filtro por status
- **Ações inline** — ativar/desativar/executar diretamente na tabela (atualização otimista)
- **Seleção múltipla** — checkboxes + ativar/desativar em lote (`Promise.allSettled`)
- **Exportar CSV** — com BOM (UTF-8, compatível com Excel)
- **Cleanup com confirmação** — AlertDialog antes de excluir permanentemente
- **Execuções visuais** — tenta parsear JSON estruturado, fallback para texto
- **Backup** — download de `.tar.gz` com timestamp do último backup
- **Histórico de ações** — log da sessão, colapsável, últimas 50 entradas

---

## AppLogo — logo whitelabel

```tsx
// Logo da organização (usa organization.url_logo)
<AppLogo variant="org" />

// Logo da plataforma (usa configuracoes_globais.url_logo_plataforma)
<AppLogo variant="platform" />
```

- Suporta URLs do Google Drive (convertidas automaticamente via `resolverUrlImagem()`)
- Fallback automático para o logo padrão em caso de erro de carregamento (`onError`)

---

## resolverUrlImagem — URLs de imagem

```typescript
import { resolverUrlImagem } from "@/lib/utils";

const src = resolverUrlImagem(url) ?? defaultSrc;
```

Converte URLs do Google Drive para formato direto compatível com `<img src>`:
- `https://lh3.google.com/u/0/d/FILE_ID` → `https://drive.google.com/uc?export=view&id=FILE_ID`
- `https://drive.google.com/file/d/FILE_ID/view` → mesmo
- Qualquer outra URL passa sem alteração

---

## useCoresPataforma — cor primária dinâmica

```typescript
import { useCoresPataforma, aplicarCorPrimaria } from "@/hooks/useCoresPataforma";

// No App.tsx (via AplicadorCores): aplica a cor do DB no boot
useCoresPataforma();

// Para preview ao vivo (ex: Settings.tsx):
aplicarCorPrimaria('#D9156C', isDark);
```

Aplica as CSS variables `--primary`, `--accent`, `--ring`, `--sidebar-primary`, `--sidebar-ring`, `--sidebar-accent` e `--sidebar-accent-foreground` via `document.documentElement.style.setProperty()`.

---

## useRotuloEntidade — entidade configurável

```typescript
const { singular, plural, s, p } = useRotuloEntidade();
// singular = "Cliente" (ou valor customizado da org)
// plural   = "Clientes"
// s/p = lowercase de singular/plural
```

---

## Convenções de nomenclatura

- **Arquivos de página**: PascalCase (`Dashboard.tsx`, `GestaoVps.tsx`)
- **Hooks**: camelCase com prefixo `use` (`useObservability.ts`, `useContatos.ts`)
- **Componentes UI**: PascalCase
- **Variáveis de estado React**: camelCase PT descritivas
- **Funções de ação**: prefixo `run` (`runWorkflows`, `runBulkAction`, `runBackup`)
- **Tipos locais**: PascalCase (`WorkflowItem`, `LogEntry`, `StatusFilter`)
- **Campos de DB**: snake_case PT (`id_organizacao`, `nome_completo`, `criado_em`)
- **Identificador único de org**: campo `identificador` (URL-safe, único, com timestamp)

---

## O que não fazer

- Não commitar `.env` com credenciais
- Não chamar a API do n8n diretamente — usar apenas os webhooks em `config.ts`
- Não criar novos arquivos de componente sem necessidade real
- Não adicionar comentários em código autoexplicativo
- Não adicionar error handling para cenários impossíveis
- Não usar `style={{}}` inline — usar Tailwind
- Não criar abstrações prematuras para uso único
- Não usar nomes em inglês para campos de banco — tudo em PT snake_case
- Não executar migrations individuais — usar `instalar_banco_de_dados.sql` em banco limpo
