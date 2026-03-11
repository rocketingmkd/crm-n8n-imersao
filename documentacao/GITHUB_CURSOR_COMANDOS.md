# Guia: Conectar GitHub no Cursor + Comandos Git (Pull & Push)

Guia prático para conectar sua conta GitHub ao Cursor, clonar o projeto e usar os comandos essenciais do dia a dia.

---

## 1 — Instalar o Git

Antes de tudo, você precisa do Git instalado no computador.

**macOS:**

```bash
# Já vem instalado. Verifique com:
git --version

# Se não tiver, instale via Homebrew:
brew install git
```

**Windows:**

Baixe e instale: https://git-scm.com/download/win

Durante a instalação, marque a opção **"Git from the command line and also from 3rd-party software"**.

**Linux (Ubuntu/Debian):**

```bash
sudo apt update && sudo apt install git
```

---

## 2 — Configurar sua identidade no Git

Abra o terminal (ou terminal do Cursor) e configure seu nome e e-mail. Use o **mesmo e-mail da sua conta GitHub**:

```bash
git config --global user.name "Seu Nome"
git config --global user.email "seu-email@exemplo.com"
```

Verifique se ficou certo:

```bash
git config --global user.name
git config --global user.email
```

---

## 3 — Conectar sua conta GitHub ao Cursor

### Opção A — Via interface do Cursor (recomendado)

1. Abra o **Cursor**
2. Clique no ícone de **engrenagem** (canto inferior esquerdo) → **Settings**
3. Vá em **Accounts** (ou clique no ícone de pessoa no canto inferior esquerdo)
4. Clique em **Sign in with GitHub**
5. O navegador abre pedindo autorização — clique em **Authorize Cursor**
6. Volte ao Cursor — sua conta GitHub aparece conectada

### Opção B — Via terminal (SSH)

Se preferir usar SSH (mais seguro e não pede senha a cada push):

**1. Gere uma chave SSH:**

```bash
ssh-keygen -t ed25519 -C "seu-email@exemplo.com"
```

Pressione Enter em todas as perguntas (aceita os padrões).

**2. Copie a chave pública:**

```bash
# macOS
cat ~/.ssh/id_ed25519.pub | pbcopy

# Windows (Git Bash)
cat ~/.ssh/id_ed25519.pub | clip

# Linux
cat ~/.ssh/id_ed25519.pub
# Copie manualmente o conteúdo exibido
```

**3. Adicione no GitHub:**

1. Acesse https://github.com/settings/keys
2. Clique em **New SSH key**
3. Cole a chave no campo **Key**
4. Dê um título (ex: `Meu Mac - Cursor`)
5. Clique em **Add SSH key**

**4. Teste a conexão:**

```bash
ssh -T git@github.com
# Resposta esperada: "Hi seu-usuario! You've been authenticated..."
```

---

## 4 — Clonar o projeto no Cursor

### Via HTTPS (mais simples):

```bash
git clone https://github.com/seu-usuario/nome-do-repo.git
```

### Via SSH (se configurou a opção B acima):

```bash
git clone git@github.com:seu-usuario/nome-do-repo.git
```

### Abrir no Cursor:

```bash
cd nome-do-repo
cursor .
```

Ou no Cursor: **File → Open Folder** → selecione a pasta clonada.

### Instalar dependências:

```bash
npm install
```

### Rodar o projeto:

```bash
npm run dev
# Acesse http://localhost:8080
```

---

## 5 — Comandos Git essenciais (Pull e Push)

### Verificar o status atual

```bash
# Ver quais arquivos foram modificados/criados
git status
```

---

### Baixar atualizações do GitHub (Pull)

```bash
# Baixar as últimas mudanças do repositório remoto
git pull origin main
```

**Quando usar:** Sempre antes de começar a trabalhar, para garantir que você tem a versão mais recente.

---

### Enviar suas mudanças para o GitHub (Push)

O processo de push tem 3 etapas: **add → commit → push**.

**Passo 1 — Adicionar arquivos modificados:**

```bash
# Adicionar um arquivo específico
git add src/pages/Dashboard.tsx

# Adicionar vários arquivos específicos
git add src/pages/Dashboard.tsx src/hooks/useContatos.ts

# Adicionar todos os arquivos modificados de uma pasta
git add src/pages/

# Adicionar TODOS os arquivos modificados (use com cuidado)
git add .
```

**Passo 2 — Criar o commit (salvar um ponto na história):**

```bash
git commit -m "feat: adicionar filtro de busca no CRM"
```

**Passo 3 — Enviar para o GitHub:**

```bash
git push origin main
```

---

### Exemplo completo do dia a dia

```bash
# 1. Antes de começar, baixe as atualizações
git pull origin main

# 2. Trabalhe no código... faça suas mudanças...

# 3. Veja o que mudou
git status

# 4. Adicione os arquivos que quer enviar
git add src/pages/CRM.tsx src/hooks/useContatos.ts

# 5. Crie o commit com uma mensagem descritiva
git commit -m "feat: adicionar campo de telefone no CRM"

# 6. Envie para o GitHub
git push origin main
```

---

## 6 — Padrão de mensagens de commit

Use prefixos para descrever o tipo da mudança:

| Prefixo | Quando usar | Exemplo |
|---------|------------|---------|
| `feat:` | Nova funcionalidade | `feat: adicionar página de relatórios` |
| `fix:` | Correção de bug | `fix: corrigir filtro de data na agenda` |
| `style:` | Mudança visual (CSS, layout) | `style: ajustar espaçamento do header` |
| `refactor:` | Reorganização de código | `refactor: simplificar lógica do useContatos` |
| `docs:` | Documentação | `docs: atualizar guia de instalação` |
| `chore:` | Tarefas diversas | `chore: atualizar dependências` |

---

## 7 — Comandos úteis extras

```bash
# Ver o histórico de commits
git log --oneline

# Ver diferenças antes de commitar
git diff

# Desfazer mudanças em um arquivo (ANTES do git add)
git checkout -- src/pages/Dashboard.tsx

# Remover um arquivo do staging (DEPOIS do git add, ANTES do commit)
git reset src/pages/Dashboard.tsx

# Ver em qual branch você está
git branch

# Criar uma nova branch
git checkout -b minha-nova-feature

# Trocar de branch
git checkout main

# Mesclar uma branch na main
git checkout main
git pull origin main
git merge minha-nova-feature
git push origin main
```

---

## 8 — Resolvendo problemas comuns

### "Permission denied" ao fazer push

Sua conta GitHub não está autenticada. Soluções:

```bash
# Opção 1: Usar o GitHub CLI para autenticar
brew install gh          # macOS
gh auth login            # Siga as instruções

# Opção 2: Configurar SSH (ver seção 3, Opção B)
```

### "Updates were rejected" ao fazer push

Alguém (ou o Lovable) enviou mudanças antes de você. Faça pull primeiro:

```bash
git pull origin main
# Se houver conflitos, resolva nos arquivos marcados e depois:
git add .
git commit -m "fix: resolver conflitos de merge"
git push origin main
```

### "Please commit your changes or stash them"

Você tem mudanças locais que conflitam com o pull. Opções:

```bash
# Opção 1: Salvar suas mudanças temporariamente
git stash
git pull origin main
git stash pop

# Opção 2: Commitar antes de fazer pull
git add .
git commit -m "wip: mudanças em progresso"
git pull origin main
```

### Cursor não reconhece o Git

Verifique se o Git está no PATH:

```bash
which git
# Deve retornar algo como: /usr/bin/git ou /opt/homebrew/bin/git
```

Se não retornar nada, reinstale o Git e reinicie o Cursor.

---

## Resumo rápido

| Ação | Comando |
|------|---------|
| Baixar atualizações | `git pull origin main` |
| Ver o que mudou | `git status` |
| Adicionar arquivos | `git add arquivo.tsx` |
| Criar commit | `git commit -m "feat: descrição"` |
| Enviar para GitHub | `git push origin main` |
| Ver histórico | `git log --oneline` |
| Ver diferenças | `git diff` |
