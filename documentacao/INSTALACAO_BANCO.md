# Instalação do Banco de Dados — FlowAtend

Este guia explica como instalar o banco de dados completo do FlowAtend em um projeto Supabase limpo.

---

## Pré-requisitos

- Projeto criado no [Supabase](https://supabase.com)
- Acesso ao **SQL Editor** do dashboard
- (Opcional) [Supabase CLI](https://supabase.com/docs/guides/cli) para deploy das edge functions

---

## Estrutura de arquivos

```
supabase/
├── install_banco_completo.sql   ← Execute este arquivo UMA VEZ
├── INSTALACAO.md                ← Este guia
├── functions/                   ← Edge Functions (Deno)
│   ├── create-organization/
│   │   └── index.ts
│   ├── manage-organization-users/
│   │   └── index.ts
│   └── update-organization/
│       └── index.ts
└── migrations/                  ← Histórico de migrations (não execute manualmente)
```

---

## Passo a Passo

### 1. Instalar o banco de dados

1. Abra o **SQL Editor** no dashboard do Supabase
2. Copie e cole **todo** o conteúdo de `supabase/install_banco_completo.sql`
3. Clique em **Run**
4. Verifique se não houve erros no output

> **Atenção:** Este arquivo deve ser executado **apenas uma vez** em um banco limpo.
> Se já houver tabelas existentes, use as migrations individuais em `supabase/migrations/`.

---

### 2. Habilitar a extensão `vector` (se necessário)

O arquivo de instalação tenta habilitar a extensão `vector` automaticamente.
Se encontrar erro, habilite manualmente:

1. Vá em **Database → Extensions**
2. Procure por `vector` e ative

---

### 3. Criar o primeiro Super Admin

Após instalar o banco, crie o super admin pelo **SQL Editor**:

```sql
-- 1. Primeiro crie o usuário pelo painel Supabase:
--    Authentication → Users → Add user
--    Anote o UUID gerado.

-- 2. Execute este SQL substituindo os valores:
INSERT INTO perfis (id, nome_completo, funcao, super_admin, ativo)
VALUES (
  'UUID-DO-USUARIO-AQUI',   -- UUID do usuário criado no Auth
  'Seu Nome Aqui',
  'admin',
  true,
  true
);
```

> O super admin **não** deve ter `id_organizacao` vinculado.

---

### 4. Configurar as Configurações Globais

No **SQL Editor**, personalize a plataforma:

```sql
UPDATE configuracoes_globais
SET
  nome_plataforma          = 'FlowAtend',
  whatsapp_suporte         = '5511999999999',
  chave_openai             = 'sk-...',
  url_logo_plataforma      = 'https://seu-dominio.com/logo.png',
  url_logo_plataforma_escuro = 'https://seu-dominio.com/logo-dark.png'
WHERE id = '00000000-0000-0000-0000-000000000001';
```

---

### 5. Deploy das Edge Functions

#### Via Supabase CLI

```bash
# Instalar Supabase CLI
npm install -g supabase

# Login
supabase login

# Link ao projeto (use o Project ID do dashboard)
supabase link --project-ref SEU_PROJECT_ID

# Deploy de todas as functions
supabase functions deploy criar-organizacao
supabase functions deploy gerenciar-usuarios-organizacao
supabase functions deploy atualizar-organizacao
```

#### Configurar "Verify JWT" nas Edge Functions

No dashboard Supabase:
1. Vá em **Edge Functions**
2. Para `criar-organizacao`: desative **Verify JWT** (a função valida manualmente)
3. Para `gerenciar-usuarios-organizacao` e `atualizar-organizacao`: idem

---

### 6. Configurar variáveis de ambiente do frontend

Crie um arquivo `.env` na raiz do projeto:

```env
VITE_SUPABASE_URL=https://SEU_PROJECT_ID.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...  (anon key)
VITE_SUPABASE_PROJECT_ID=SEU_PROJECT_ID

# Webhooks n8n
VITE_N8N_WEBHOOK_URL=https://seu-n8n.com/webhook/
```

---

### 7. Configurar Storage (logos e avatares)

Os buckets `organization-logos` (logos das empresas) e `avatars` (fotos dos usuários) são criados automaticamente pelo script SQL.
Verifique em **Storage** que os buckets existem e estão como **Public**. Se o upload de foto em "Minha conta" falhar, confira se o bucket `avatars` existe e se as políticas de Storage (INSERT para authenticated na pasta do usuário) estão ativas.

---

## Tabelas criadas

| Tabela | Descrição |
|--------|-----------|
| `organizacoes` | Empresas clientes (raiz multi-tenant) |
| `perfis` | Usuários com função e organização |
| `contatos` | Contatos/clientes das organizações |
| `historico_contatos` | Linhas de histórico por cliente (CRM) |
| `agendamentos` | Agendamentos com início/fim ISO8601 |
| `configuracoes` | Configurações por organização |
| `config_agente_ia` | Personalidade e config do agente IA |
| `instancias_whatsapp` | Instâncias WhatsApp por organização |
| `horarios_trabalho` | Horários de atendimento por usuário |
| `planos_assinatura` | Definição dos planos e limites |
| `uso_tokens` | Consumo de tokens de IA |
| `configuracoes_globais` | Config global da plataforma |
| `documentos` | Base de conhecimento (RAG) |
| `clientes_followup` | Follow-up de clientes via n8n |
| `model_costs` | Custos por modelo LLM (input/output em USD + cotação do dólar) |

---

## Migrations (banco já instalado)

Se você já tem o banco instalado e precisa apenas de novas tabelas, execute as migrations em `supabase/migrations/` no SQL Editor:

| Arquivo | Descrição |
|---------|-----------|
| `20250217_historico_contatos.sql` | Tabela de histórico do cliente (linhas adicionáveis no card do CRM) |

---

## Convenções de nomenclatura

Todo o banco usa **snake_case em Português Brasileiro**:

- Tabelas: `organizacoes`, `perfis`, `contatos`
- Colunas: `id_organizacao`, `nome_completo`, `criado_em`
- Enums: `ativo/inativo`, `confirmado/pendente/concluido/cancelado`
- Funções: `profissional/assistente/admin`

---

## Troubleshooting

### "relation does not exist"
A extensão `vector` pode não estar ativa. Ative em **Database → Extensions**.

### "permission denied"
Verifique se o RLS está configurado corretamente. As policies dependem das funções `is_user_super_admin()` e `get_user_organization_id()`.

### Edge function retorna 401
Desative **Verify JWT** na edge function pelo dashboard.

### Tabelas de conversas (`*_conversas`)
Essas tabelas são criadas dinamicamente pelo n8n ao cadastrar uma organização. Não são incluídas no install pois dependem do `codigo` de cada organização.

---

## Migrations (banco já instalado)

Se você já tem o banco instalado e precisa apenas de novas tabelas, execute as migrations em `supabase/migrations/` no SQL Editor:

- **`20250217_historico_contatos.sql`** — Tabela de histórico do cliente (linhas adicionáveis no card do CRM)
