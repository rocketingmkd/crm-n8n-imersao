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

### 1.1 Criar o Dockerfile (sem extensão)

- Entre no Cursor na pasta do projeto (onde estão `package.json`, `vite.config.*`)
- Novo → Documento de Texto → renomeie para `Dockerfile`

Conteúdo do **Dockerfile**:

```dockerfile
FROM nginx:alpine
COPY dist /usr/share/nginx/html
EXPOSE 80
```

- Usa um Nginx leve, copia a pasta `dist/` e expõe a porta 80.

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
3. Arraste a pasta **dist** e o arquivo **Dockerfile** do seu PC para essa pasta

---

## 5 — Build da imagem Docker

No terminal da VPS (Termius):

```bash
cd /var/lib/docker/volumes/seuprojeto-volume/_data
docker build -t seuprojeto:latest .
```

Se terminou sem erro, a imagem foi criada.

---

## 6 — Rodar com Traefik + HTTPS

Subdomínio de exemplo: **seuprojeto.seudominio.com**

Comando **docker run**:

```bash
docker run -d \
  --name seuprojeto-container \
  -p 80 \
  -l traefik.enable=true \
  -l 'traefik.http.routers.seuprojeto.rule=Host(`seuprojeto.seudominio.com`)' \
  -l traefik.http.routers.seuprojeto.entrypoints=websecure \
  -l traefik.http.routers.seuprojeto.tls.certresolver=myresolver \
  seuprojeto:latest
```

- `-p 80` → Traefik enxerga o container
- Labels → Traefik + HTTPS + Let's Encrypt

**Sem Traefik?** Use `-p 8080:80` e acesse via `http://SEU_IP:8080`.

---

## 7 — Criar DNS na Cloudflare

No painel DNS:

| Campo | Valor |
|-------|--------|
| Tipo | A |
| Nome | seuprojeto (ou subdomínio desejado) |
| Aponta para | 203.0.113.10 (seu IP real) |
| TTL | 300 |

Clique em **Adicionar registro**.

---

## 8 — Testar

- No terminal: `ping seuprojeto.seudominio.com` → deve retornar seu IP
- No navegador: `https://seuprojeto.seudominio.com`

Se o HTTPS não subir de primeira: aguarde 1–2 minutos e atualize a página.

---

## 9 — Manutenção básica

| Ação | Comando |
|------|---------|
| Ver containers | `docker ps` |
| Parar | `docker stop seuprojeto-container` |
| Iniciar | `docker start seuprojeto-container` |
| Remover | `docker rm -f seuprojeto-container` |
| Atualizar | Novo build + novo `docker run` |
