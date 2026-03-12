# Como subir o FlowAtend em uma VPS

Guia para deploy usando o domínio de exemplo **clinica.seudominio.com**. Sempre que aparecer **SEU_IP** ou **seudominio.com**, troque pelos seus dados reais.

## Pré-requisitos

Se você já fez o setup e tem **Portainer + Traefik + n8n** rodando, você já tem tudo.

| Item | Pra que serve | Onde conseguir |
|------|----------------|----------------|
| Projeto | Código do projeto | Baixar o zip no drive |
| Dockerfile | Ensina o Docker a servir o projeto | Criar (passo abaixo) |
| Termius | Acessar a VPS via terminal | [termius.com](https://termius.com/) |
| Portainer | Gerenciar Docker | `https://SEU_IP:9443` |

*IP fictício usado no guia: 203.0.113.10*

---

## 1 — Preparar o projeto no seu computador

### 1.1 Criar o Dockerfile e config do Nginx

- Entre no Cursor na pasta do projeto (onde estão `package.json`, `vite.config.*`)

**Arquivo `nginx-default.conf`** (para SPA — evita 404 em rotas diretas):

```
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

**Arquivo `Dockerfile`** (sem extensão):

```dockerfile
FROM nginx:alpine
COPY dist /usr/share/nginx/html
COPY nginx-default.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

- Usa um Nginx leve, copia a pasta `dist/` e a config (try_files evita 404 no React Router).

### 1.2 Gerar a pasta dist/

No terminal do projeto:

```bash
npm install
npm run build
# ou
npx vite build
```

Deve surgir a pasta `dist/` com `index.html`, `robots.txt`, `favicon.ico`, `assets/`, etc.

---

## 2 — Acessar a VPS com Termius

- Abra o Termius → **Hosts** → **+ New Host**
- Teste rápido: `docker --version` e `docker ps`  
  Se aparecer Portainer, Traefik e n8n, seguimos.

---

## 3 — Criar um volume no Portainer

1. Abra no navegador: `https://SEU_IP:9443` e faça login no Portainer
2. Menu **Volumes** → **Add volume**
3. Name: `seuprojeto-volume` → **Create**  
  (Pense nisso como um "pendrive" do Docker.)

---

## 4 — Enviar arquivos com Termius

1. Abra o Termius e crie uma **nova sessão SFTP** no seu servidor
2. No painel direito, vá até:  
   `/var/lib/docker/volumes/seuprojeto-volume/_data/`
3. Arraste a pasta **dist**, o arquivo **Dockerfile** e o **nginx-default.conf** do seu PC para essa pasta

---

## 5 — Build da imagem Docker

No terminal da VPS (Termius):

```bash
cd /var/lib/docker/volumes/seuprojeto-volume/_data
docker build -t seuprojeto:latest .
```

Se terminou sem erro, a imagem foi criada.

---

## 6 — Entender o modo Docker da sua VPS

Antes de rodar, você precisa saber se sua VPS usa **Docker Standalone** ou **Docker Swarm**.

### O que é Docker Swarm?

Docker Swarm é o modo de orquestração nativo do Docker. Em vez de rodar containers soltos com `docker run`, você gerencia **serviços** que o Docker distribui, monitora e reinicia automaticamente.

| | **Standalone** (`docker run`) | **Swarm** (`docker service create`) |
|---|---|---|
| Comando para criar | `docker run -d --name app ...` | `docker service create --name app ...` |
| Tipo de rede | bridge (ex: `web`) | overlay (ex: `ricneves`) |
| Reinício automático | Não (precisa de `--restart`) | Sim, o Swarm recria se cair |
| Escalar réplicas | Não | `docker service scale app=3` |
| Labels | `-l chave=valor` | `--label chave=valor` |
| Parar/remover | `docker stop app && docker rm app` | `docker service rm app` |
| Ver em execução | `docker ps` | `docker service ls` |

**Se você seguiu o setup da Imersão Flowgrammers (Hostinger + Portainer + n8n), sua VPS usa Swarm.**

### Como confirmar?

```bash
docker service ls
```

- Se listar serviços como `traefik_traefik`, `n8n_n8n`, `portainer_portainer` → **Swarm**
- Se der erro ou não listar nada → **Standalone**

### Por que importa?

O Traefik precisa estar na **mesma rede** que o FlowAtend para rotear o tráfego e gerar o certificado SSL. Em Swarm, as redes são do tipo overlay e containers criados com `docker run` não conseguem se conectar a elas (erro "not manually attachable"). Por isso, se o Traefik roda em Swarm, o FlowAtend também deve rodar como serviço Swarm.

### Descobrir o nome da rede do Traefik

**Em Swarm:**
```bash
# Ver o nome do serviço Traefik
docker service ls | grep traefik

# Ver a rede (substitua traefik_traefik pelo nome que apareceu)
docker service inspect traefik_traefik --format '{{json .Spec.TaskTemplate.Networks}}'

# Listar todas as redes e encontrar o nome pelo ID
docker network ls
```

**Em Standalone:**
```bash
docker network ls
docker inspect traefik --format '{{json .NetworkSettings.Networks}}'
```

---

## 7 — Rodar com Traefik + HTTPS

Subdomínio de exemplo: **seuprojeto.seudominio.com**

### Opção A — Docker Standalone (docker run)

Use se o Traefik roda como container simples (modo Standalone):

```bash
docker run -d \
  --name seuprojeto-container \
  --network web \
  -p 80 \
  -l traefik.enable=true \
  -l 'traefik.http.routers.seuprojeto.rule=Host(`seuprojeto.seudominio.com`)' \
  -l traefik.http.routers.seuprojeto.entrypoints=websecure \
  -l traefik.http.routers.seuprojeto.tls.certresolver=letsencryptresolver \
  -l traefik.docker.network=web \
  seuprojeto:latest
```

- `--network web` → mesma rede bridge do Traefik

### Opção B — Docker Swarm (docker service create)

Use se o Traefik roda como serviço Swarm (setup Flowgrammers com Portainer):

```bash
docker service create \
  --name seuprojeto \
  --network ricneves \
  --label traefik.enable=true \
  --label traefik.docker.network=ricneves \
  --label 'traefik.http.routers.seuprojeto.rule=Host(`seuprojeto.seudominio.com`)' \
  --label traefik.http.routers.seuprojeto.entrypoints=websecure \
  --label traefik.http.routers.seuprojeto.tls.certresolver=letsencryptresolver \
  --label traefik.http.routers.seuprojeto.service=seuprojeto \
  --label traefik.http.services.seuprojeto.loadbalancer.server.port=80 \
  seuprojeto:latest
```

- `--label traefik.http.services.seuprojeto.loadbalancer.server.port=80` → **obrigatório** em Swarm para o Traefik saber qual porta do container usar
- `--label traefik.http.routers.seuprojeto.service=seuprojeto` → liga o router ao service
- `--network ricneves` → mesma rede overlay do Traefik (troque `ricneves` pelo nome da sua rede)
- Sem `-p 80` → em Swarm com Traefik, não é necessário publicar a porta (o Traefik acessa via rede overlay)

### Sem Traefik?

Use `-p 8080:80` e acesse via `http://SEU_IP:8080`.

---

## 8 — Criar DNS na Cloudflare

No painel DNS:

| Campo | Valor |
|-------|--------|
| Tipo | A |
| Nome | seuprojeto (ou subdomínio desejado) |
| Aponta para | 203.0.113.10 (seu IP real) |
| TTL | 300 |
| Proxy | **Cinza** (DNS only) |

> **Importante:** Deixe o proxy **cinza** (DNS only). Com proxy laranja, a Cloudflare intercepta o tráfego e o Let's Encrypt não consegue validar o certificado na VPS.

Clique em **Adicionar registro**.

---

## 9 — Testar

- No terminal: `ping seuprojeto.seudominio.com` → deve retornar seu IP
- No navegador: `https://seuprojeto.seudominio.com`

Se o HTTPS não subir de primeira: aguarde 1–2 minutos e atualize a página.

**Troubleshooting:**

| Problema | Solução |
|----------|---------|
| Certificado "TRAEFIK DEFAULT CERT" | Traefik não conseguiu gerar o certificado. Verifique: rede correta, DNS apontando para o IP, proxy cinza na Cloudflare, portas 80/443 abertas |
| 404 page not found | Faltou o `nginx-default.conf` com `try_files`. Refaça o build com o Dockerfile atualizado |
| Erro "not manually attachable" | Você está usando `docker run` mas a rede é overlay (Swarm). Use `docker service create` |
| Container não aparece | Confira: `docker ps -a` (Standalone) ou `docker service ls` (Swarm) |

---

## 10 — Manutenção básica

### Standalone (docker run)

| Ação | Comando |
|------|---------|
| Ver containers | `docker ps` |
| Parar | `docker stop seuprojeto-container` |
| Iniciar | `docker start seuprojeto-container` |
| Remover | `docker rm -f seuprojeto-container` |
| Ver logs | `docker logs seuprojeto-container --tail 50` |

### Swarm (docker service)

| Ação | Comando |
|------|---------|
| Ver serviços | `docker service ls` |
| Ver detalhes | `docker service ps seuprojeto` |
| Ver logs | `docker service logs seuprojeto --tail 50` |
| Remover | `docker service rm seuprojeto` |

---

## 11 — Atualizar o FlowAtend

Quando houver uma nova versão do projeto, siga estes passos para atualizar:

### 11.1 — No seu computador

```bash
# 1. Baixar a versão mais recente
cd pasta-do-projeto
git pull origin main
# ou baixe o ZIP atualizado

# 2. Instalar dependências e gerar novo build
npm install
npm run build
```

### 11.2 — Enviar para a VPS

Envie a nova pasta `dist/`, o `Dockerfile` e o `nginx-default.conf` para a VPS (via Termius SFTP ou SCP).

### 11.3 — Rebuild na VPS

**Standalone:**

```bash
cd /var/lib/docker/volumes/seuprojeto-volume/_data

# Parar e remover o container antigo
docker stop seuprojeto-container
docker rm seuprojeto-container

# Rebuild da imagem
docker build -t seuprojeto:latest .

# Rodar novamente (mesmo comando do passo 7A)
docker run -d \
  --name seuprojeto-container \
  --network web \
  -p 80 \
  -l traefik.enable=true \
  -l 'traefik.http.routers.seuprojeto.rule=Host(`seuprojeto.seudominio.com`)' \
  -l traefik.http.routers.seuprojeto.entrypoints=websecure \
  -l traefik.http.routers.seuprojeto.tls.certresolver=letsencryptresolver \
  -l traefik.docker.network=web \
  seuprojeto:latest
```

**Swarm:**

```bash
cd /var/lib/docker/volumes/seuprojeto-volume/_data

# Remover o serviço antigo
docker service rm seuprojeto

# Rebuild da imagem
docker build -t seuprojeto:latest .

# Criar o serviço novamente (mesmo comando do passo 7B)
docker service create \
  --name seuprojeto \
  --network ricneves \
  --label traefik.enable=true \
  --label traefik.docker.network=ricneves \
  --label 'traefik.http.routers.seuprojeto.rule=Host(`seuprojeto.seudominio.com`)' \
  --label traefik.http.routers.seuprojeto.entrypoints=websecure \
  --label traefik.http.routers.seuprojeto.tls.certresolver=letsencryptresolver \
  --label traefik.http.routers.seuprojeto.service=seuprojeto \
  --label traefik.http.services.seuprojeto.loadbalancer.server.port=80 \
  seuprojeto:latest
```

### Usando o Instalador Automático

Se preferir, use o **Instalador Automático** (página `/instalador` do FlowAtend). Ele gera um script que faz tudo automaticamente: clone/build, envio, rebuild e restart. Veja `documentacao/INSTALADOR_AUTOMATICO.md`.
