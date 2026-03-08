# FlowAtend — Gestão Inteligente de Atendimento

Plataforma SaaS multi-tenant para gestão inteligente de empresas de atendimento, desenvolvida pela **Flowgrammers**.

## Sobre

**FlowAtend** é uma solução completa que combina agenda, CRM, kanban, agente de IA com WhatsApp e painel de super admin com observabilidade em tempo real do servidor n8n.

---

## Funcionalidades

### Plataforma (geral)

| Funcionalidade | Descrição |
|----------------|-----------|
| **Sistema multilíngue** | Interface em **Português (pt-BR)**, **Inglês** e **Espanhol**. Seletor de idioma (ícone de globo) no header e na tela de login. Idioma salvo em `localStorage`. |
| **Instalador automático** | Página `/instalador` (senha: `#flowgrammersInstall2026`) gera script bash para deploy na VPS. Passo a passo do Supabase, formulário (projeto, banco, VPS) e download do script. Ver [INSTALADOR_AUTOMATICO.md](./documentacao/INSTALADOR_AUTOMATICO.md). |

### Área da Organização

Funcionalidades disponíveis para usuários de cada organização (empresa/clínica) cadastrada no sistema.

| Módulo | Rota | Descrição |
|--------|------|-----------|
| **Dashboard** | `/app/dashboard` | Painel principal com KPIs, agenda do dia e ações rápidas |
| **Agenda** | `/app/agenda` | Calendário (mês/semana/dia), CRUD de agendamentos, horários de funcionamento |
| **CRM / Clientes** | `/app/clientes/crm` | Gestão de contatos, busca, filtros por status, Kanban visual |
| **Conversas** | `/app/conversas` | Histórico de conversas WhatsApp, envio de mensagens humanas |
| **Configurações** | `/app/configuracoes` | Agente IA, WhatsApp e Tipos de Atendimento (abas) |

#### Dashboard (Organização)
- KPIs: total de clientes, agendamentos do dia, conversas
- Agenda do dia em destaque
- Ações rápidas para cadastrar cliente ou agendamento
- Gráficos de evolução (clientes, agendamentos concluídos)

#### Agenda (Organização)
- Visualização em calendário: mês, semana ou dia
- CRUD completo de agendamentos
- Configuração de horários de funcionamento
- Filtros por profissional e tipo de atendimento
- Integração com fluxo de agendamento via WhatsApp (quando habilitado no plano)

#### CRM / Clientes (Organização)
- Lista de contatos com busca por nome, email ou telefone
- Filtros por status Kanban (Novo Contato, Qualificado, Em Atendimento, Agendado, Aguardando Confirmação, Concluído)
- Cards com: nome, email, telefone, CPF/CNPJ, observações, total de interações, última interação
- Modal de detalhes com edição de dados e foto
- Kanban visual para arrastar contatos entre estágios
- Resumo de conversa (quando gerado pelo agente IA)
- Contagem de interações calculada em tempo real a partir das mensagens na tabela de conversas

#### Conversas (Organização)
- Lista de sessões (conversas) da organização
- Visualização do histórico de mensagens por sessão
- Envio de mensagens pelo atendente humano
- Suporte a emojis no input
- Sessões vinculadas a contatos via telefone ou id_sessao

#### Configurações (Organização)

**Aba Agente de IA**
- Nome e personalidade do agente
- Mensagens de boas-vindas e despedida
- Configuração de follow-ups
- Base de conhecimento: upload de PDFs para RAG
- Analytics de tokens e mensagens

**Aba WhatsApp**
- Conexão com instância WhatsApp (oficial ou não-oficial)
- QR Code ou pairing code para vincular
- Status da conexão em tempo real

**Aba Tipos de Atendimento** (quando o plano inclui agendamento)
- CRUD de tipos de atendimento (ex.: Consulta, Retorno, Avaliação)
- Duração e descrição por tipo

#### Minha Conta (Organização)
- Edição de nome e avatar
- Alteração de senha

---

### Área Super Admin

Funcionalidades exclusivas para usuários com perfil `super_admin`. Acesso em `/super-admin/*`.

| Módulo | Rota | Descrição |
|--------|------|-----------|
| **Visão Geral** | `/super-admin/dashboard` | Estatísticas globais, gráficos de consumo |
| **Empresas** | `/super-admin/organizations` | CRUD de organizações com paginação e busca |
| **Relatórios** | `/super-admin/relatorios` | Uso por organização: usuários, clientes, mensagens, arquivos |
| **Pacotes** | `/super-admin/plans` | Planos de assinatura e limites |
| **Consumos dos Planos** | `/super-admin/token-usage` | Consumo de tokens de IA por organização |
| **Observabilidade** | `/super-admin/observability` | CPU, RAM, disco e workers n8n em tempo real |
| **Gestão de VPS** | `/super-admin/gestao-vps` | Ativar/desativar/executar workflows n8n remotamente |
| **Configs** | `/super-admin/settings` | Configurações globais whitelabel |
| **Minha conta** | `/super-admin/minha-conta` | Perfil do super admin |

#### Visão Geral (Super Admin)
- Total de organizações, usuários, clientes
- Gráficos de consumo de tokens
- Organizações mais ativas
- Seleção de organização para drill-down

#### Empresas (Super Admin)
- Listagem paginada com busca por nome ou identificador
- Criar nova organização (nome, identificador, plano, ativo)
- Editar organização: dados gerais, logo, rótulos de entidade (Cliente/Clientes), plano
- Ativar/desativar organização
- Excluir organização (com confirmação)
- Gerenciar usuários da organização (criar, editar, excluir)

#### Relatórios (Super Admin)
- Tabela de uso por organização: usuários, clientes, mensagens WhatsApp, arquivos de conhecimento
- Comparação com limites do plano (alertas de uso próximo ou acima do limite)
- Filtros e ordenação

#### Pacotes (Super Admin)
- Visualização dos planos de assinatura (plano_a, plano_b, etc.)
- Edição de limites: max_usuarios, max_contatos, max_mensagens_whatsapp_mes, max_agendamentos_mes, max_arquivos_conhecimento
- Descrição e preços dos planos

#### Consumos dos Planos (Super Admin)
- Consumo de tokens de IA por organização
- Período selecionável (mês atual)
- Custo estimado por organização
- Total de mensagens nas tabelas de conversas

#### Observabilidade (Super Admin)
- **Aba Servidor**: CPU, RAM, disco e workers n8n em tempo real (polling ~5s)
- **Aba Monitoramento de Execuções**: workflows, execuções, taxa de falha, tempo médio (N8nInsights)

#### Gestão de VPS (Super Admin)
- Listar workflows do n8n (ativos/inativos)
- Ativar ou desativar workflows remotamente
- Executar workflow manualmente
- Backup e restauração
- Limpeza de execuções antigas
- Log de ações executadas
- Requer webhook `VITE_GESTAO_VPS_WEBHOOK_URL` configurado

#### Configs (Super Admin)
- **Aba Visual**: nome da plataforma, frase de login, logos (claro/escuro) com preview em tempo real, cor primária, fonte do sistema
- **Aba IA & Voz**: chave OpenAI, chave ElevenLabs, ID da voz ElevenLabs
- **Aba Dados de suporte**: WhatsApp e email de suporte
- Configurações aplicadas globalmente (whitelabel)

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18 + TypeScript + Vite (SWC) |
| i18n | i18next + react-i18next (pt-BR, en, es) |
| Estilo | Tailwind CSS 3 + shadcn/ui |
| Server state | TanStack React Query v5 |
| Roteamento | React Router DOM v6 |
| Backend/DB | Supabase (PostgreSQL + Auth + Realtime) |
| Automação | n8n (webhooks) |
| Build | Vite, porta dev 8080 |

---

## Como Executar

```bash
# Instalar dependências
npm install

# Desenvolvimento
npm run dev   # localhost:8080

# Build para produção
npm run build
```

---

## Configuração

Crie um arquivo `.env` na raiz:

```env
VITE_SUPABASE_URL=https://SEU_PROJECT_ID.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...
VITE_SUPABASE_PROJECT_ID=SEU_PROJECT_ID

VITE_N8N_WEBHOOK_URL=https://seu-n8n.com/webhook/
VITE_GESTAO_VPS_WEBHOOK_URL=https://seu-n8n.com/webhook/gestao-vps-completa
```

---

## Instalação do Banco

Execute `supabase/instalar_banco_de_dados.sql` uma única vez em um projeto Supabase limpo.
Veja o guia completo em [documentacao/INSTALACAO_BANCO.md](./documentacao/INSTALACAO_BANCO.md).

---

## Documentação Adicional

| Documento | Conteúdo |
|-----------|----------|
| [INSTALACAO_VPS.md](./documentacao/INSTALACAO_VPS.md) | Guia completo para deploy do sistema em uma VPS (Docker, Traefik, HTTPS) |
| [LOVABLE_CURSOR_GITHUB.md](./documentacao/LOVABLE_CURSOR_GITHUB.md) | Setup Lovable + Cursor + GitHub no mesmo repositório |
| [INSTALACAO_BANCO.md](./documentacao/INSTALACAO_BANCO.md) | Guia de instalação do banco de dados no Supabase |
| [INSTALADOR_AUTOMATICO.md](./documentacao/INSTALADOR_AUTOMATICO.md) | Instalador automático: página `/instalador` que gera script de deploy para VPS |

---

## Arquitetura

- **Multi-tenant**: cada organização tem dados isolados via RLS no Supabase
- **Whitelabel**: nome, logos, cor primária e contato de suporte configuráveis via painel
- **Cor dinâmica**: a cor primária da UI é salva no banco e aplicada via CSS variables no boot
- **Logos flexíveis**: suporte a URLs diretas e URLs do Google Drive (convertidas automaticamente)
- **Entidade configurável**: o rótulo "Cliente/Clientes" é personalizável por organização
- **Banco em Português**: todas as tabelas, colunas e enums em snake_case PT-BR
- **n8n integrado**: automações de atendimento, agendamento, follow-up e RAG via webhooks
- **Multilíngue**: interface traduzida em pt-BR (padrão), inglês e espanhol; idioma persistido em `localStorage`

---

## Licença

Projeto privado e proprietário — **Flowgrammers**.
