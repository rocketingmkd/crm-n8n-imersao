# API de Observabilidade (VPS + Portainer)

API que lê **CPU**, **RAM**, **disco** e (opcional) **workers n8n** do seu servidor para o painel **Super Admin → Observabilidade**.

Funciona na **Hostinger VPS** com **Portainer**: rode como um container Docker com acesso às métricas do **host** (sua VPS).

---

## Como pegar as informações no Portainer

### 1. Subir a API no Portainer

**Opção A – Usando o repositório (build no Portainer)**

1. No Portainer: **Stacks** → **Add stack**.
2. Nome: `observability`.
3. Em **Build method** escolha **Repository** (ou **Upload** se for colar o `docker-compose`).
4. Se usar repositório: URL do seu repositório Git (pasta `observability-api` ou repo só dessa API). Em **Compose path** use `observability-api/docker-compose.yml` (ou o path onde está o compose).
5. Ou **Web editor**: cole o conteúdo do `docker-compose.yml` abaixo (ajustando `build: .` se precisar).

**Opção B – Build local + push para registro**

Na sua máquina, na pasta do projeto:

```bash
cd observability-api
docker build -t observability-api:latest .
# Se usar registry (ex.: Docker Hub ou da Hostinger):
# docker tag observability-api:latest seu-registry/observability-api:latest
# docker push seu-registry/observability-api:latest
```

No Portainer: **Stacks** → **Add stack** → **Web editor** e use o `docker-compose.yml` (trocando `build: .` por `image: seu-registry/observability-api:latest` se tiver feito push).

**Exemplo de stack (Web editor) – build na pasta atual**

Se você fizer upload da pasta ou clonar o repo no servidor e o compose estiver em `observability-api/docker-compose.yml`:

```yaml
services:
  observability-api:
    build: ./observability-api
    image: observability-api:latest
    container_name: observability-api
    restart: unless-stopped
    ports:
      - "3001:3001"
    environment:
      - PORT=3001
      # Opcional: n8n
      # - N8N_API_URL=http://n8n:5678
      # - N8N_API_KEY=sua_api_key
    volumes:
      - /proc:/host/proc:ro
```

Depois: **Deploy the stack**.

---

### 2. Métricas do HOST (sua VPS)

- **CPU e RAM**: a API lê do **host** quando você monta o `/proc` do host no container:
  - `volumes: - /proc:/host/proc:ro`
  - Assim, CPU e memória são da VPS, não só do container.
- **Disco**: hoje a API usa `df /` **dentro** do container. O valor pode ser do sistema de arquivos do container. Para disco da VPS você pode:
  - Montar o diretório que quer monitorar (ex.: `/var/lib` ou `/`) em um path do container e no futuro a API pode usar esse path no `df`, ou
  - Usar um endpoint próprio no host que rode `df` e exponha o resultado (a API já está pronta para consumir o formato do frontend).

---

### 3. Porta e firewall (Hostinger VPS)

- A API escuta na porta **3001** (alterável com `PORT` no env do container).
- No painel da Hostinger (ou firewall da VPS), libere a porta **3001** se for acessar de fora (ex.: `http://IP_DA_VPS:3001`).
- Se o frontend e a API estiverem no mesmo servidor, use no frontend a URL interna (ex.: `http://observability-api:3001` ou `http://localhost:3001`) ou um proxy reverso (Nginx) em um mesmo domínio.

---

### 4. n8n (opcional)

Para preencher **workers n8n** no painel:

1. No n8n: **Settings** → **API** → crie uma API key.
2. No stack da observability-api, adicione:
   - `N8N_API_URL`: URL do n8n (ex.: `http://n8n:5678` se estiver no mesmo Docker; ou `https://n8n.seudominio.com`).
   - `N8N_API_KEY`: a API key.
3. Rede: se a API e o n8n estiverem na mesma rede Docker, use o nome do serviço (ex.: `n8n`) na URL.

Se não configurar, os números de workers ficam em 0 (o painel continua funcionando para CPU, RAM e disco).

---

### 5. Frontend (painel)

No `.env` do projeto do frontend (imersao):

```env
# Se a API estiver no mesmo servidor atrás de um proxy (ex.: Nginx em /api/observability):
VITE_OBSERVABILITY_API_URL=/api/observability

# Ou URL direta da API (ex.: mesma VPS, porta 3001):
# VITE_OBSERVABILITY_API_URL=http://IP_DA_VPS:3001/api/observability

# Ou com domínio:
# VITE_OBSERVABILITY_API_URL=https://api.seudominio.com/observability
```

Depois, acesse **Super Admin → Observabilidade** no app; os dados virão da API rodando na sua VPS.

---

## Variáveis de ambiente

| Variável           | Obrigatória | Descrição                                      |
|--------------------|------------|-------------------------------------------------|
| `PORT`             | Não        | Porta HTTP (padrão: 3001)                      |
| `HOST_PROC`        | Não        | Path do /proc do host (padrão: /host/proc)      |
| `N8N_API_URL`      | Não        | URL base do n8n (ex.: http://n8n:5678)          |
| `N8N_API_KEY`      | Não        | API key do n8n                                 |

---

## Endpoints

- `GET /` ou `GET /api/observability` – JSON com `metrics` e `history` (formato esperado pelo frontend).
- `GET /health` – `{ "ok": true }` para health check (ex.: Portainer ou load balancer).

---

## Teste rápido (sem Docker)

```bash
cd observability-api
node index.js
# Abra http://localhost:3001/api/observability
```

Com `/proc` do host (Linux):

```bash
sudo node index.js
# Ou: HOST_PROC=/host/proc quando /proc estiver montado em /host/proc
```

Assim você confirma que a API está lendo CPU, RAM e disco antes de subir no Portainer.
