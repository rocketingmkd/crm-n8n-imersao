# Instalador Automático FlowAtend

O FlowAtend inclui uma página de instalação automática que gera um script para fazer o deploy na sua VPS em poucos passos.

## Acesso

- **URL:** `/instalador` (ex: `https://seu-app.com/instalador`)
- **Senha padrão:** `#flowgrammersInstall2026`

## Como usar

1. Acesse a página `/instalador` no navegador
2. Informe a senha de acesso
3. **Leia e siga o passo a passo do Supabase** — Ele aparece no topo da tela, antes das abas. Você precisa criar o projeto, instalar o banco, criar o Super Admin, pegar URL/chave/Project ID e fazer o deploy das Edge Functions. Só depois preencha os dados.
4. Preencha os dados em três abas:
   - **Projeto:** GitHub (URL do repositório) ou ZIP (coloque `flowatend.zip` na pasta home)
   - **Banco:** URL, chave e Project ID do Supabase; webhooks n8n (opcional)
   - **VPS:** IP, usuário SSH, senha ou chave SSH; domínio (opcional); nome do container
5. Clique em **Baixar script bash (Linux/Mac)**
6. No terminal (Linux ou Mac), execute: `bash flowatend-install.sh`

## O que o script faz

1. Obtém o projeto (clone do GitHub ou extrai do ZIP em `~/flowatend.zip`)
2. Instala dependências e faz o build (`npm install` e `npm run build`)
3. Cria o arquivo `.env` com as variáveis informadas
4. Cria o `Dockerfile`
5. Envia `dist/` e `Dockerfile` para a VPS via SCP
6. Na VPS: executa `docker build` e `docker run`

## Pré-requisitos

- **No seu computador:** Node.js, npm, Git, SSH (e `sshpass` se usar senha)
- **Na VPS:** Docker instalado
- **Opcional:** Traefik configurado para HTTPS com Let's Encrypt

## Autenticação SSH

- **Senha:** Instale `sshpass` (`apt install sshpass` no Linux, `brew install sshpass` no Mac)
- **Chave SSH:** Cole a chave privada no campo; o script cria um arquivo temporário e remove após o uso

## Segurança

- O script contém credenciais em texto. **Não compartilhe** o arquivo gerado
- Após a instalação, exclua o script: `rm flowatend-install.sh`
- Recomenda-se usar chave SSH em vez de senha
