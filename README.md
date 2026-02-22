# FlowAtend — Gestão Inteligente de Atendimento

Plataforma SaaS multi-tenant para gestão inteligente de empresas de atendimento, desenvolvida pela **Flowgrammers**.

## Sobre

**FlowAtend** é uma solução completa que combina agenda, CRM, kanban, agente de IA com WhatsApp e painel de super admin com observabilidade em tempo real do servidor n8n.

## Funcionalidades

### Área da Organização
- **Dashboard** — KPIs, agenda do dia, ações rápidas
- **Agenda** — Calendário mês/semana/dia, CRUD de agendamentos
- **CRM** — Gestão de contatos, busca, filtros por status
- **Kanban** — Board visual de estágios do contato
- **Agente IA** — Configuração de nome, personalidade, mensagens e follow-ups
- **Base de Conhecimento** — Upload de PDFs para RAG do agente
- **Integrações** — WhatsApp (oficial/não-oficial), webhooks

### Área Super Admin
- **Dashboard** — Estatísticas globais e gráficos de consumo de tokens
- **Empresas** — CRUD completo com paginação e busca
- **Planos** — Visualização dos planos de assinatura
- **Tokens** — Consumo de tokens de IA por organização
- **Observabilidade** — CPU, RAM, disco e workers n8n em tempo real (polling 5s)
- **Insights** — Workflows, execuções, taxa de falha e tempo médio
- **Gestão VPS** — Ativar/desativar/executar workflows n8n remotamente
- **Configurações** — Whitelabel: nome, logos, cor primária, WhatsApp de suporte, chave OpenAI, chave ElevenLabs

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18 + TypeScript + Vite (SWC) |
| Estilo | Tailwind CSS 3 + shadcn/ui |
| Server state | TanStack React Query v5 |
| Roteamento | React Router DOM v6 |
| Backend/DB | Supabase (PostgreSQL + Auth + Realtime) |
| Automação | n8n (webhooks) |
| Build | Vite, porta dev 8080 |

## Como Executar

```bash
# Instalar dependências
npm install

# Desenvolvimento
npm run dev   # localhost:8080

# Build para produção
npm run build
```

## Configuração

Crie um arquivo `.env` na raiz:

```env
VITE_SUPABASE_URL=https://SEU_PROJECT_ID.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...
VITE_SUPABASE_PROJECT_ID=SEU_PROJECT_ID

VITE_N8N_WEBHOOK_URL=https://seu-n8n.com/webhook/
VITE_GESTAO_VPS_WEBHOOK_URL=https://seu-n8n.com/webhook/gestao-vps-completa
```

## Instalação do Banco

Execute `supabase/instalar_banco_de_dados.sql` uma única vez em um projeto Supabase limpo.
Veja o guia completo em `supabase/INSTALACAO.md`.

## Arquitetura

- **Multi-tenant**: cada organização tem dados isolados via RLS no Supabase
- **Whitelabel**: nome, logos, cor primária e contato de suporte configuráveis via painel
- **Cor dinâmica**: a cor primária da UI é salva no banco e aplicada via CSS variables no boot
- **Logos flexíveis**: suporte a URLs diretas e URLs do Google Drive (convertidas automaticamente)
- **Entidade configurável**: o rótulo "Cliente/Clientes" é personalizável por organização
- **Banco em Português**: todas as tabelas, colunas e enums em snake_case PT-BR
- **n8n integrado**: automações de atendimento, agendamento, follow-up e RAG via webhooks

## Licença

Projeto privado e proprietário — **Flowgrammers**.
