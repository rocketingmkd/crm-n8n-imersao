# Setup Completo: Lovable + GitHub + Cursor + Claude Code + Supabase

Lovable e Cursor apontam para o **mesmo repositório do GitHub**. O fluxo é:

```
Lovable ──┐
          ├── GitHub (repositório único) ── Cursor + Claude Code
Supabase ─┘
```

Você edita no Lovable (visual) ou no Cursor (código), ambos fazem push/pull para o mesmo repo. O Supabase é o backend compartilhado.

---

## Pré-requisitos

| Ferramenta | Link |
|-----------|------|
| Conta Lovable | [lovable.dev](https://lovable.dev) |
| Conta GitHub | [github.com](https://github.com) |
| Conta Supabase | [supabase.com](https://supabase.com) |
| Cursor instalado | [cursor.sh](https://cursor.sh) |
| Node.js 18+ | [nodejs.org](https://nodejs.org) |

---

## 1 — Criar projeto no Lovable e conectar ao GitHub

1. Acesse [lovable.dev](https://lovable.dev) → **New Project**
2. Dê um nome (ex: `flowatend`) → **Create**
3. Com o projeto aberto, clique no ícone do **GitHub** no canto superior direito
4. Clique em **Connect to GitHub** e autorize o acesso à sua conta
5. O Lovable cria automaticamente um repositório no seu GitHub com o código do projeto

**Verificar:**
- Acesse [github.com](https://github.com) — o repositório deve aparecer com um commit inicial
- Anote a URL do repositório: `https://github.com/seu-usuario/nome-do-repo`

> A partir daqui, qualquer mudança feita no Lovable é automaticamente enviada para esse repositório.

---

## 2 — Clonar o repositório no Cursor

O Cursor vai trabalhar no **mesmo repositório** que o Lovable criou.

1. No GitHub, abra o repositório → **Code → HTTPS** → copie a URL

2. No seu computador, clone o repositório:

```bash
git clone https://github.com/seu-usuario/nome-do-repo.git
cd nome-do-repo
```

3. Abra no Cursor:

```bash
cursor .
```

Ou: **File → Open Folder** → selecione a pasta clonada.

4. Instale as dependências:

```bash
npm install
```

---

## 3 — Configurar variáveis de ambiente

Crie o arquivo `.env` na raiz do projeto (nunca suba este arquivo para o GitHub):

```env
VITE_SUPABASE_URL=https://SEU_PROJECT_ID.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
VITE_SUPABASE_PROJECT_ID=SEU_PROJECT_ID

VITE_N8N_WEBHOOK_URL=https://seu-n8n.com/webhook/
VITE_GESTAO_VPS_WEBHOOK_URL=https://seu-n8n.com/webhook/gestao-vps-completa
```

> As chaves ficam em: Supabase Dashboard → **Project Settings → API**

Teste rodando localmente:

```bash
npm run dev
# Acesse http://localhost:8080
```

---

## 4 — Instalar o Claude Code no Cursor

O Claude Code é uma CLI da Anthropic que roda direto no terminal do Cursor.

**Instalar:**

```bash
npm install -g @anthropic-ai/claude-code
```

**Configurar a API Key:**

1. Acesse [console.anthropic.com](https://console.anthropic.com) → **API Keys → Create Key**
2. Copie a chave gerada

3. No terminal do Cursor, configure a variável de ambiente:

```bash
# macOS/Linux — adicione ao ~/.zshrc ou ~/.bashrc
export ANTHROPIC_API_KEY="sk-ant-..."

# Aplique imediatamente
source ~/.zshrc
```

**Usar o Claude Code:**

```bash
# No terminal do Cursor, dentro da pasta do projeto
claude
```

O Claude Code abre uma sessão interativa com contexto completo do projeto — lê arquivos, edita código, roda comandos e entende o CLAUDE.md do repositório.

> O arquivo `CLAUDE.md` na raiz do projeto contém as instruções e convenções específicas do FlowAtend. O Claude Code lê esse arquivo automaticamente a cada sessão.

---

## 5 — Criar projeto no Supabase e instalar o banco

1. Acesse [supabase.com](https://supabase.com) → **New Project**
2. Preencha nome, senha do banco e região → **Create new project**
3. Aguarde a inicialização (1-2 minutos)

**Instalar o banco:**

4. Vá em **SQL Editor → New query**
5. Abra `supabase/instalar_banco_de_dados.sql` no Cursor, copie todo o conteúdo
6. Cole no SQL Editor e clique em **Run**
7. Confirme que as tabelas aparecem em **Table Editor**

**Criar o Super Admin:**

8. Vá em **Authentication → Users → Add user**
   - Preencha e-mail e senha → **Create user**
   - Copie o UUID gerado

9. No **SQL Editor**, execute:

```sql
INSERT INTO perfis (id, nome_completo, funcao, super_admin, ativo)
VALUES (
  'COLE-O-UUID-AQUI',
  'Seu Nome',
  'admin',
  true,
  true
);
```

---

## 6 — Deploy das Edge Functions

```bash
# Instalar Supabase CLI (macOS)
brew install supabase/tap/supabase

# Login
supabase login

# Deploy das 3 funções (--no-verify-jwt obrigatório)
supabase functions deploy criar-organizacao --project-ref SEU_PROJECT_ID --no-verify-jwt
supabase functions deploy gerenciar-usuarios-organizacao --project-ref SEU_PROJECT_ID --no-verify-jwt
supabase functions deploy atualizar-organizacao --project-ref SEU_PROJECT_ID --no-verify-jwt
```

> O `--no-verify-jwt` é necessário — as funções fazem a verificação de autenticação internamente usando o service role.

---

## 7 — Fluxo de trabalho: Lovable ↔ Cursor no mesmo repo

Como Lovable e Cursor usam o mesmo repositório, siga esta ordem para evitar conflitos:

**Antes de editar no Cursor — sempre faça pull:**

```bash
git pull origin main
```

**Depois de editar no Cursor — faça push:**

```bash
git add nome-do-arquivo.tsx
git commit -m "feat: descrição da mudança"
git push origin main
```

O Lovable reflete automaticamente os pushes do Cursor.

**Se editar no Lovable** e quiser continuar no Cursor:

```bash
git pull origin main
```

> Evite editar o mesmo arquivo nos dois ao mesmo tempo — escolha uma ferramenta por sessão de trabalho.

---

## 8 — Acessar como Super Admin

1. Acesse o app em `http://localhost:8080`
2. Faça login com o e-mail e senha criados no passo 5
3. Você será redirecionado para `/super-admin/dashboard`

A partir daí, crie organizações em **Empresas → Nova Organização**.
