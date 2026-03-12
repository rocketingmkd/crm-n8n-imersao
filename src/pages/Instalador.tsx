import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/contexts/ThemeContext";
import LanguageSelector from "@/components/LanguageSelector";
import { AppLogo } from "@/components/AppLogo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Server, Database, Key, FileArchive, Download, Lock, ArrowLeft, CheckCircle2, HelpCircle, ListOrdered, ExternalLink, Monitor, Apple, ChevronRight, Sun, Moon, Sparkles } from "lucide-react";
import loginBg from "@/assets/login-bg.jpg";
import loginBgVideo from "@/assets/login-bg-video.mp4";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { APP_VERSION } from "@/lib/version";

const SENHA_INSTALADOR = import.meta.env.VITE_SENHA_INSTALADOR ?? "";

function LabelComTooltip({ htmlFor, children, tooltip }: { htmlFor?: string; children: React.ReactNode; tooltip: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Label htmlFor={htmlFor}>{children}</Label>
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" className="inline-flex text-muted-foreground hover:text-foreground cursor-help">
            <HelpCircle className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-[280px] text-xs">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

export default function Instalador() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [autenticado, setAutenticado] = useState(false);
  const [senhaDigitada, setSenhaDigitada] = useState("");
  const [erroSenha, setErroSenha] = useState(false);

  const [plataforma, setPlataforma] = useState<"windows" | "mac">("mac");
  const [fonteProjeto, setFonteProjeto] = useState<"github" | "zip">("github");
  const [githubRepo, setGithubRepo] = useState("");
  const [supabaseUrl, setSupabaseUrl] = useState("");
  const [supabaseKey, setSupabaseKey] = useState("");
  const [supabaseProjectId, setSupabaseProjectId] = useState("");
  const [n8nWebhookUrl, setN8nWebhookUrl] = useState("");
  const [vpsIp, setVpsIp] = useState("");
  const [vpsUser, setVpsUser] = useState("root");
  const [vpsPassword, setVpsPassword] = useState("");
  const [vpsSshKey, setVpsSshKey] = useState("");
  const [dominio, setDominio] = useState("");
  const [emailLetsEncrypt, setEmailLetsEncrypt] = useState("");
  const [nomeContainer, setNomeContainer] = useState("flowatend");
  const [redeDocker, setRedeDocker] = useState("web");
  const [modoDocker, setModoDocker] = useState<"standalone" | "swarm">("standalone");
  const [certResolver, setCertResolver] = useState("letsencryptresolver");

  const [passoAtual, setPassoAtual] = useState(1);
  const TOTAL_PASSOS = 6;

  // Extrai apenas IP/host e usuário se o usuário colar "ssh root@69.62.89.76"
  const normalizeVpsInput = (ip: string, user: string) => {
    const trimmed = ip.trim();
    const ipMatch = trimmed.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
    if (trimmed.includes("@")) {
      const atParts = trimmed.split("@");
      const lastPart = atParts[atParts.length - 1];
      const hostMatch = lastPart.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}|[a-zA-Z0-9.-]+)/);
      const extractedUser = atParts[0].replace(/^ssh\s+/i, "").trim() || user;
      return {
        ip: hostMatch ? hostMatch[1] : (ipMatch ? ipMatch[1] : trimmed),
        user: extractedUser || "root",
      };
    }
    if (trimmed.toLowerCase().startsWith("ssh ")) {
      const rest = trimmed.slice(4).trim();
      if (rest.includes("@")) {
        const [u, h] = rest.split("@");
        const hostMatch = h.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
        return { ip: hostMatch ? hostMatch[1] : h.split(/\s/)[0], user: u || user };
      }
    }
    return { ip: ipMatch ? ipMatch[1] : trimmed, user: user || "root" };
  };

  const handleVerificarSenha = () => {
    if (senhaDigitada === SENHA_INSTALADOR) {
      setAutenticado(true);
      setErroSenha(false);
    } else {
      setErroSenha(true);
      toast.error(t('installer.wrongPassword'));
    }
  };

  const gerarScriptBash = () => {
    const { ip: normalizedIp, user: normalizedUser } = normalizeVpsInput(vpsIp, vpsUser);
    const usaSshKey = !!vpsSshKey?.trim();
    const sshAuth = usaSshKey
      ? `# Usando chave SSH
SSH_CMD() { ssh "\$@"; }
SCP_CMD() { scp "\$@"; }
SSH_KEY_PATH="\${HOME}/.ssh/flowatend_install_key"
mkdir -p "\$(dirname "\$SSH_KEY_PATH")"
cat > "\$SSH_KEY_PATH" << 'SSHEOF'
${vpsSshKey.trim()}
SSHEOF
chmod 600 "\$SSH_KEY_PATH"
SSH_OPTS="-i \$SSH_KEY_PATH"
SCP_OPTS="-i \$SSH_KEY_PATH"
`
      : `# Usando senha (requer sshpass: apt install sshpass / brew install sshpass)
export SSHPASS='${vpsPassword.replace(/'/g, "'\"'\"'")}'
SSH_CMD() { export SSHPASS; sshpass -e ssh -o PreferredAuthentications=password,keyboard-interactive "\$@"; }
SCP_CMD() { export SSHPASS; sshpass -e scp -o PreferredAuthentications=password,keyboard-interactive "\$@"; }
SSH_OPTS=""
SCP_OPTS=""
`;

    const net = redeDocker?.trim() || "web";
    const isSwarm = modoDocker === "swarm";

    let dockerRunCmd: string;
    if (dominio) {
      if (isSwarm) {
        dockerRunCmd = `docker service create --name ${nomeContainer} --network ${net} --label traefik.enable=true --label traefik.docker.network=${net} --label 'traefik.http.routers.${nomeContainer}.rule=Host(\\\`${dominio}\\\`)' --label traefik.http.routers.${nomeContainer}.entrypoints=websecure --label traefik.http.routers.${nomeContainer}.tls.certresolver=${certResolver} --label traefik.http.routers.${nomeContainer}.service=${nomeContainer} --label traefik.http.services.${nomeContainer}.loadbalancer.server.port=80 ${nomeContainer}:latest`;
      } else {
        dockerRunCmd = `docker run -d --name ${nomeContainer} --network ${net} -p 80 -l traefik.enable=true -l traefik.docker.network=${net} -l 'traefik.http.routers.${nomeContainer}.rule=Host(\\\`${dominio}\\\`)' -l traefik.http.routers.${nomeContainer}.entrypoints=websecure -l traefik.http.routers.${nomeContainer}.tls.certresolver=${certResolver} ${nomeContainer}:latest`;
      }
    } else {
      if (isSwarm) {
        dockerRunCmd = `docker service create --name ${nomeContainer} -p 8080:80 ${nomeContainer}:latest`;
      } else {
        dockerRunCmd = `docker run -d --name ${nomeContainer} -p 8080:80 ${nomeContainer}:latest`;
      }
    }

    const dockerStopCmd = isSwarm
      ? `echo "Removendo servico anterior (se existir)..."
docker service rm \$CONTAINER_NAME 2>/dev/null || true
sleep 5`
      : `docker stop \$CONTAINER_NAME 2>/dev/null || true
docker rm \$CONTAINER_NAME 2>/dev/null || true`;

    const script = `#!/bin/bash
# FlowAtend - Instalador automático para VPS
# Gerado em ${new Date().toLocaleString("pt-BR")}
# Execute: bash flowatend-install.sh

set -e
RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
NC='\\033[0m'

echo -e "\${GREEN}=== FlowAtend - Instalador Automático ===\${NC}"

# Instalar dependências se não existirem
install_if_missing() {
  local cmd=\$1
  shift
  if ! command -v \$cmd >/dev/null 2>&1; then
    echo -e "\${YELLOW}Instalando \$cmd...\${NC}"
    "\$@" || { echo -e "\${RED}Falha ao instalar \$cmd\${NC}"; exit 1; }
  fi
}

if [[ "\$(uname -s)" == "Darwin" ]]; then
  command -v brew >/dev/null 2>&1 || { echo -e "\${YELLOW}Instalando Homebrew...\${NC}"; NONINTERACTIVE=1 /bin/bash -c "\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"; }
  install_if_missing node brew install node
  install_if_missing git brew install git
  install_if_missing unzip brew install unzip
  ${usaSshKey ? "" : `install_if_missing sshpass brew install sshpass`}
else
  if command -v apt-get >/dev/null 2>&1; then
    sudo apt-get update -qq 2>/dev/null || true
    command -v node >/dev/null 2>&1 || { echo -e "\${YELLOW}Instalando Node.js...\${NC}"; curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash - && sudo apt-get install -y nodejs; }
    command -v git >/dev/null 2>&1 || { echo -e "\${YELLOW}Instalando Git...\${NC}"; sudo apt-get install -y git; }
    command -v unzip >/dev/null 2>&1 || { echo -e "\${YELLOW}Instalando unzip...\${NC}"; sudo apt-get install -y unzip; }
    ${usaSshKey ? "" : `command -v sshpass >/dev/null 2>&1 || { echo -e "\${YELLOW}Instalando sshpass...\${NC}"; sudo apt-get install -y sshpass; }`}
  elif command -v yum >/dev/null 2>&1; then
    command -v node >/dev/null 2>&1 || { echo -e "\${YELLOW}Instalando Node.js...\${NC}"; curl -fsSL https://rpm.nodesource.com/setup_lts.sh | sudo bash - && sudo yum install -y nodejs; }
    command -v git >/dev/null 2>&1 || { echo -e "\${YELLOW}Instalando Git...\${NC}"; sudo yum install -y git unzip; }
    ${usaSshKey ? "" : `command -v sshpass >/dev/null 2>&1 || { echo -e "\${YELLOW}Instalando sshpass...\${NC}"; sudo yum install -y sshpass; }`}
  else
    echo -e "\${RED}Node.js e Git são obrigatórios. Instale manualmente: https://nodejs.org e https://git-scm.com\${NC}"; exit 1;
  fi
fi

# Verificar dependências
command -v node >/dev/null 2>&1 || { echo -e "\${RED}Node.js não encontrado.\${NC}"; exit 1; }
command -v git >/dev/null 2>&1 || { echo -e "\${RED}Git não encontrado.\${NC}"; exit 1; }

# Configurações
VPS_IP="${normalizedIp}"
VPS_USER="${normalizedUser}"
REPO="${githubRepo || "https://github.com/flowgrammers/imersao.git"}"
DEPLOY_DIR="/tmp/flowatend-deploy-\$\$"
CONTAINER_NAME="${nomeContainer}"

${sshAuth}

# 1. Clonar ou extrair projeto
echo -e "\${GREEN}[1/5] Obtendo projeto...\${NC}"
mkdir -p "\$DEPLOY_DIR"
if [[ "${fonteProjeto}" == "github" ]]; then
  git clone --depth 1 "\$REPO" "\$DEPLOY_DIR" || { echo -e "\${RED}Falha ao clonar repositório\${NC}"; exit 1; }
else
  echo -e "\${YELLOW}Coloque o ZIP do projeto em ~/flowatend.zip e execute novamente.\${NC}"
  if [ ! -f "\${HOME}/flowatend.zip" ]; then
    echo -e "\${RED}Arquivo ~/flowatend.zip não encontrado.\${NC}"
    exit 1
  fi
  unzip -o "\${HOME}/flowatend.zip" -d "\$DEPLOY_DIR"
  # Entrar na pasta extraída (pode estar em subpasta)
  if [ -d "\$DEPLOY_DIR/imersao" ]; then
    mv "\$DEPLOY_DIR/imersao"/* "\$DEPLOY_DIR/" 2>/dev/null || true
  fi
fi

# 2. Build
echo -e "\${GREEN}[2/5] Instalando dependências e fazendo build...\${NC}"
cd "\$DEPLOY_DIR"
npm install
cat > .env << ENVEOF
VITE_SUPABASE_URL=${supabaseUrl}
VITE_SUPABASE_PUBLISHABLE_KEY=${supabaseKey}
VITE_SUPABASE_PROJECT_ID=${supabaseProjectId}
VITE_N8N_WEBHOOK_URL=${n8nWebhookUrl}
ENVEOF
npm run build

# 3. Criar Dockerfile e config Nginx (SPA - corrige 404)
echo -e "\${GREEN}[3/5] Preparando Docker...\${NC}"
cat > "\$DEPLOY_DIR/nginx-default.conf" << 'NGINXEOF'
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }
}
NGINXEOF
cat > "\$DEPLOY_DIR/Dockerfile" << 'DOCKEREOF'
FROM nginx:alpine
COPY dist /usr/share/nginx/html
COPY nginx-default.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
DOCKEREOF

# 4. Enviar para VPS
echo -e "\${GREEN}[4/5] Enviando para VPS (\$VPS_IP)...\${NC}"
REMOTE_DIR="/tmp/flowatend-\$\$"
if ! SSH_CMD \$SSH_OPTS -o StrictHostKeyChecking=no -o ConnectTimeout=15 \$VPS_USER@\$VPS_IP "echo ok" 2>/dev/null; then
  echo -e "\${RED}Erro: Não foi possível conectar na VPS.\${NC}"
  echo -e "\${YELLOW}Verifique: senha/chave corretas, usuário (\$VPS_USER), IP (\$VPS_IP), porta 22 aberta.\${NC}"
  echo -e "\${YELLOW}Hostinger: use chave SSH na aba VPS (autenticação por senha pode estar desativada).\${NC}"
  exit 1
fi
SSH_CMD \$SSH_OPTS -o StrictHostKeyChecking=no -o ConnectTimeout=15 \$VPS_USER@\$VPS_IP "mkdir -p \$REMOTE_DIR"
SCP_CMD \$SCP_OPTS -o StrictHostKeyChecking=no -o ConnectTimeout=15 -r "\$DEPLOY_DIR/dist" "\$DEPLOY_DIR/Dockerfile" "\$DEPLOY_DIR/nginx-default.conf" "\$VPS_USER@\$VPS_IP:\$REMOTE_DIR/"

# 5. Build e run na VPS
echo -e "\${GREEN}[5/5] Iniciando container na VPS...\${NC}"
SSH_CMD \$SSH_OPTS -o StrictHostKeyChecking=no \$VPS_USER@\$VPS_IP << REMOTEEOF
cd \$REMOTE_DIR
${dockerStopCmd}
docker rmi \$CONTAINER_NAME:latest 2>/dev/null || true
docker build -t \$CONTAINER_NAME:latest .
${dockerRunCmd}
rm -rf \$REMOTE_DIR
echo "Container \$CONTAINER_NAME iniciado!"
REMOTEEOF

# Limpar
rm -rf "\$DEPLOY_DIR"
${usaSshKey ? `rm -f "\$SSH_KEY_PATH"` : ""}

echo -e "\${GREEN}=== Instalação concluída! ===\${NC}"
${dominio ? `echo -e "Acesse: https://${dominio}"` : `echo -e "Acesse: http://${normalizedIp}:8080"`}
`;
    return script;
  };

  const gerarScriptPowerShell = () => {
    const { ip: normalizedIp, user: normalizedUser } = normalizeVpsInput(vpsIp, vpsUser);
    const usaSshKey = !!vpsSshKey?.trim();
    const sshKeyPath = "$env:USERPROFILE\\.ssh\\flowatend_install_key";
    const remoteDir = "/tmp/flowatend-" + (Math.random().toString(36).slice(2, 9));
    const deployDir = "$env:TEMP\\flowatend-deploy-" + (Math.random().toString(36).slice(2, 9));

    const net = redeDocker?.trim() || "web";
    const isSwarm = modoDocker === "swarm";

    let dockerRunCmd: string;
    if (dominio) {
      if (isSwarm) {
        dockerRunCmd = `docker service create --name ${nomeContainer} --network ${net} --label traefik.enable=true --label traefik.docker.network=${net} --label 'traefik.http.routers.${nomeContainer}.rule=Host(\\\`${dominio}\\\`)' --label traefik.http.routers.${nomeContainer}.entrypoints=websecure --label traefik.http.routers.${nomeContainer}.tls.certresolver=${certResolver} --label traefik.http.routers.${nomeContainer}.service=${nomeContainer} --label traefik.http.services.${nomeContainer}.loadbalancer.server.port=80 ${nomeContainer}:latest`;
      } else {
        dockerRunCmd = `docker run -d --name ${nomeContainer} --network ${net} -p 80 -l traefik.enable=true -l traefik.docker.network=${net} -l 'traefik.http.routers.${nomeContainer}.rule=Host(\\\`${dominio}\\\`)' -l traefik.http.routers.${nomeContainer}.entrypoints=websecure -l traefik.http.routers.${nomeContainer}.tls.certresolver=${certResolver} ${nomeContainer}:latest`;
      }
    } else {
      if (isSwarm) {
        dockerRunCmd = `docker service create --name ${nomeContainer} -p 8080:80 ${nomeContainer}:latest`;
      } else {
        dockerRunCmd = `docker run -d --name ${nomeContainer} -p 8080:80 ${nomeContainer}:latest`;
      }
    }

    const dockerStopCmd = isSwarm
      ? `echo "Removendo servico anterior (se existir)..."
docker service rm ${nomeContainer} 2>/dev/null || true
sleep 5`
      : `docker stop ${nomeContainer} 2>/dev/null || true
docker rm ${nomeContainer} 2>/dev/null || true`;

    const sshOpts = usaSshKey ? `-i "${sshKeyPath}"` : "";
    const scpOpts = usaSshKey ? `-i "${sshKeyPath}"` : "";

    return `# FlowAtend - Instalador para Windows (PowerShell)
# Gerado em ${new Date().toLocaleString("pt-BR")}
# Execute: .\\flowatend-install.ps1
# Requer: Node.js, Git, OpenSSH (Windows 10+) e Docker na VPS

$ErrorActionPreference = "Stop"

Write-Host "=== FlowAtend - Instalador Automático ===" -ForegroundColor Green

# Instalar dependências se não existirem (usa winget - Windows 10/11)
function Install-IfMissing {
    param([string]$Command, [string]$WingetId, [string]$ChocoId = "")
    if (-not (Get-Command $Command -ErrorAction SilentlyContinue)) {
        Write-Host "Instalando $Command..." -ForegroundColor Yellow
        if (Get-Command winget -ErrorAction SilentlyContinue) {
            winget install --id $WingetId -e --accept-package-agreements --accept-source-agreements 2>$null
        } elseif (Get-Command choco -ErrorAction SilentlyContinue) {
            choco install $ChocoId -y 2>$null
        } else {
            Write-Host "$Command nao encontrado. Instale: https://nodejs.org (Node) ou https://git-scm.com (Git)" -ForegroundColor Red
            exit 1
        }
    }
}

Install-IfMissing "node" "OpenJS.NodeJS.LTS" "nodejs-lts"
Install-IfMissing "git" "Git.Git" "git"

# Garantir que node e npm estejam no PATH
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "Node.js nao encontrado apos instalacao. Feche e reabra o PowerShell, ou reinicie o computador." -ForegroundColor Red
    exit 1
}
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "Git nao encontrado apos instalacao. Feche e reabra o PowerShell." -ForegroundColor Red
    exit 1
}

$VPS_IP = "${normalizedIp}"
$VPS_USER = "${normalizedUser}"
$REPO = "${githubRepo || "https://github.com/flowgrammers/imersao.git"}"
$DEPLOY_DIR = "${deployDir}"
$CONTAINER_NAME = "${nomeContainer}"
$REMOTE_DIR = "${remoteDir}"

${usaSshKey ? `# Configurar chave SSH
$sshDir = "$env:USERPROFILE\\.ssh"
if (-not (Test-Path $sshDir)) { New-Item -ItemType Directory -Path $sshDir -Force | Out-Null }
$keyB64 = "${btoa(unescape(encodeURIComponent(vpsSshKey.trim())))}"
[System.IO.File]::WriteAllText("${sshKeyPath}", [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($keyB64)))
icacls "${sshKeyPath}" /inheritance:r /grant:r "$env:USERNAME:R"
` : ""}

# 1. Obter projeto
Write-Host "[1/5] Obtendo projeto..." -ForegroundColor Green
New-Item -ItemType Directory -Path $DEPLOY_DIR -Force | Out-Null
Push-Location $DEPLOY_DIR
try {
    if ("${fonteProjeto}" -eq "github") {
        git clone --depth 1 $REPO .
        if ($LASTEXITCODE -ne 0) { throw "Falha ao clonar" }
    } else {
        $zipPath = "$env:USERPROFILE\\flowatend.zip"
        if (-not (Test-Path $zipPath)) { throw "Arquivo $zipPath nao encontrado. Coloque o ZIP do projeto la." }
        Expand-Archive -Path $zipPath -DestinationPath . -Force
        if (Test-Path ".\\imersao") { Copy-Item ".\\imersao\\*" . -Recurse -Force }
    }

    # 2. Build
    Write-Host "[2/5] Instalando dependencias e fazendo build..." -ForegroundColor Green
    npm install
    @"
VITE_SUPABASE_URL=${supabaseUrl}
VITE_SUPABASE_PUBLISHABLE_KEY=${supabaseKey}
VITE_SUPABASE_PROJECT_ID=${supabaseProjectId}
VITE_N8N_WEBHOOK_URL=${n8nWebhookUrl}
"@ | Out-File -FilePath ".env" -Encoding utf8
    npm run build

    # 3. Dockerfile + Nginx config (SPA - corrige 404)
    Write-Host "[3/5] Preparando Docker..." -ForegroundColor Green
    @"
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;
    location / {
        try_files \`$uri \`$uri/ /index.html;
    }
}
"@ | Out-File -FilePath "nginx-default.conf" -Encoding utf8
    @"
FROM nginx:alpine
COPY dist /usr/share/nginx/html
COPY nginx-default.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
"@ | Out-File -FilePath "Dockerfile" -Encoding utf8

    # 4. Enviar para VPS
    Write-Host "[4/5] Enviando para VPS ($VPS_IP)..." -ForegroundColor Green
    ssh ${sshOpts} $VPS_USER@$VPS_IP "mkdir -p $REMOTE_DIR"
    scp ${scpOpts} -r dist Dockerfile nginx-default.conf "$VPS_USER@$VPS_IP:$REMOTE_DIR/"

    # 5. Build e run na VPS
    Write-Host "[5/5] Iniciando container na VPS..." -ForegroundColor Green
    $remoteScript = @"
cd $REMOTE_DIR
${dockerStopCmd}
docker rmi $nomeContainer:latest 2>/dev/null || true
docker build -t $nomeContainer:latest .
${dockerRunCmd}
rm -rf $REMOTE_DIR
echo Container $nomeContainer iniciado!
"@
    echo $remoteScript | ssh ${sshOpts} $VPS_USER@$VPS_IP "bash -s"

    Write-Host "=== Instalacao concluida! ===" -ForegroundColor Green
    if ("${dominio}") { Write-Host "Acesse: https://${dominio}" } else { Write-Host "Acesse: http://$VPS_IP:8080" }
} finally {
    Pop-Location
    Remove-Item -Path $DEPLOY_DIR -Recurse -Force -ErrorAction SilentlyContinue
    ${usaSshKey ? `Remove-Item -Path "${sshKeyPath}" -Force -ErrorAction SilentlyContinue` : ""}
}
`;
  };

  const gerarScriptNode = () => {
    return `// FlowAtend - Instalador Node.js (cross-platform)
// Execute: node flowatend-install.js
// Requer: npm install ssh2 scp2 extract-zip antes da primeira execução

const config = {
  githubRepo: "${githubRepo || "https://github.com/flowgrammers/imersao.git"}",
  supabaseUrl: "${supabaseUrl}",
  supabaseKey: "${supabaseKey}",
  supabaseProjectId: "${supabaseProjectId}",
  n8nWebhookUrl: "${n8nWebhookUrl}",
  vpsIp: "${vpsIp}",
  vpsUser: "${vpsUser}",
  vpsPassword: "${vpsPassword}",
  vpsSshKey: ${vpsSshKey?.trim() ? `\`${vpsSshKey.replace(/`/g, "\\`")}\`` : "null"},
  dominio: "${dominio}",
  nomeContainer: "${nomeContainer}",
};

console.log("Configuração:", JSON.stringify({ ...config, vpsPassword: "***", vpsSshKey: config.vpsSshKey ? "***" : null }, null, 2));
console.log("\\nPara executar a instalação completa, use o script bash (Linux/Mac) ou siga o guia em documentacao/INSTALACAO_VPS.md");
`;
  };

  const handleDownloadScript = () => {
    if (!vpsIp || !vpsUser) {
      toast.error("Preencha IP e usuário da VPS");
      return;
    }
    if (!vpsSshKey?.trim() && !vpsPassword) {
      toast.error("Informe a senha ou chave SSH da VPS");
      return;
    }
    if (!supabaseUrl || !supabaseKey || !supabaseProjectId) {
      toast.error("Preencha os dados do Supabase");
      return;
    }
    if (!n8nWebhookUrl?.trim()) {
      toast.error("Preencha o Webhook n8n");
      return;
    }
    if (plataforma === "windows" && !vpsSshKey?.trim()) {
      toast.error(t("installer.windowsRequiresKey"));
      return;
    }
    const script = plataforma === "mac" ? gerarScriptBash() : gerarScriptPowerShell();
    const ext = plataforma === "mac" ? "sh" : "ps1";
    const blob = new Blob([script], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `flowatend-install.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(plataforma === "mac" ? t("installer.runMac") : t("installer.runWindows"));
  };

  const handleDownloadConfig = () => {
    const config = {
      supabaseUrl,
      supabaseKey,
      supabaseProjectId,
      n8nWebhookUrl,
      vpsIp,
      vpsUser,
      dominio,
      emailLetsEncrypt,
      nomeContainer,
    };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "flowatend-install-config.json";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Configuração baixada!");
  };

  const isDark = theme === "dark";

  if (!autenticado) {
    return (
      <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          poster={loginBg}
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src={loginBgVideo} type="video/mp4" />
        </video>
        <div className={isDark ? "absolute inset-0 bg-black/50" : "absolute inset-0 bg-white/60 backdrop-blur-sm"} />

        <div className="fixed top-4 right-4 z-50 flex items-center gap-1">
          <LanguageSelector />
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className={`h-9 w-9 rounded-full backdrop-blur-md border transition-colors ${
              isDark
                ? "bg-white/10 border-white/20 text-white/70 hover:text-white hover:bg-white/20"
                : "bg-black/10 border-black/10 text-foreground/70 hover:text-foreground hover:bg-black/15"
            }`}
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>

        <div className="relative z-10 w-full max-w-[440px] mx-4">
          <div className={`relative rounded-3xl backdrop-blur-2xl shadow-2xl p-8 sm:p-10 space-y-6 ${
            isDark
              ? "border border-white/10 bg-white/5 shadow-black/40"
              : "border border-black/5 bg-white/70 shadow-black/10"
          }`}>
            <div className={`absolute inset-0 rounded-3xl pointer-events-none ${
              isDark
                ? "shadow-[inset_0_0_30px_-8px_rgba(255,255,255,0.15)]"
                : "shadow-[inset_0_0_30px_-8px_rgba(0,0,0,0.05)]"
            }`} />

            <div className="relative space-y-3 text-center">
              <div className="flex justify-center">
                <AppLogo variant="platform" height={64} />
              </div>
              <h2 className={`text-lg font-semibold ${isDark ? "text-white" : "text-foreground"}`}>{t('installer.title')}</h2>
              <p className={`text-sm ${isDark ? "text-white/60" : "text-foreground/60"}`}>
                {t('installer.restricted')}
              </p>
              <div className={`flex items-center justify-center gap-1.5 text-xs ${isDark ? "text-white/30" : "text-foreground/30"}`}>
                <Sparkles className="h-3 w-3" />
                <span>{t('installer.enterPassword')}</span>
                <Sparkles className="h-3 w-3" />
              </div>
            </div>

            <div className="relative space-y-4">
              <div className="relative">
                <Lock className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 ${isDark ? "text-white/40" : "text-foreground/40"}`} />
                <Input
                  id="senha"
                  type="password"
                  placeholder={t('installer.passwordPlaceholder')}
                  value={senhaDigitada}
                  onChange={(e) => { setSenhaDigitada(e.target.value); setErroSenha(false); }}
                  onKeyDown={(e) => e.key === "Enter" && handleVerificarSenha()}
                  className={`h-12 pl-11 pr-4 rounded-xl backdrop-blur-sm focus-visible:ring-primary/50 ${
                    isDark
                      ? "bg-white/5 border-white/10 text-white placeholder:text-white/40"
                      : "bg-black/5 border-black/10 text-foreground placeholder:text-foreground/40"
                  } ${erroSenha ? "border-red-500" : ""}`}
                />
              </div>
              {erroSenha && <p className="text-xs text-red-500">{t('installer.wrongPassword')}</p>}

              <Button
                onClick={handleVerificarSenha}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-primary/70 text-primary-foreground hover:from-primary/90 hover:to-primary/60 shadow-lg shadow-primary/25 font-semibold"
              >
                {t('installer.access')}
              </Button>
              <Button
                variant="ghost"
                onClick={() => navigate("/")}
                className={`w-full gap-2 ${isDark ? "text-white/70 hover:text-white hover:bg-white/10" : "text-foreground/70 hover:text-foreground hover:bg-black/10"}`}
              >
                <ArrowLeft className="h-4 w-4" /> {t('common.back')}
              </Button>
            </div>
          </div>

          <p className={`text-center text-[10px] mt-6 ${isDark ? "text-white/30" : "text-foreground/30"}`}>
            © {new Date().getFullYear()} FlowAtend v{APP_VERSION}
          </p>
        </div>
      </div>
    );
  }

  const validarPasso = (passo: number): { ok: boolean; msg?: string } => {
    if (passo === 3) {
      if (fonteProjeto === "github" && !githubRepo?.trim()) return { ok: false, msg: t("installer.validation.githubRepo") };
    }
    if (passo === 4) {
      if (!supabaseUrl?.trim()) return { ok: false, msg: t("installer.validation.supabaseUrl") };
      if (!supabaseKey?.trim()) return { ok: false, msg: t("installer.validation.supabaseKey") };
      if (!supabaseProjectId?.trim()) return { ok: false, msg: t("installer.validation.supabaseProjectId") };
      if (!n8nWebhookUrl?.trim()) return { ok: false, msg: t("installer.validation.n8nWebhook") };
    }
    if (passo === 5) {
      if (dominio?.trim() && !emailLetsEncrypt?.trim()) return { ok: false, msg: t("installer.validation.emailLetsEncrypt") };
      if (!vpsIp?.trim()) return { ok: false, msg: t("installer.validation.vpsIp") };
      if (!vpsUser?.trim()) return { ok: false, msg: t("installer.validation.vpsUser") };
      if (plataforma === "windows") {
        if (!vpsSshKey?.trim()) return { ok: false, msg: t("installer.windowsRequiresKey") };
      } else {
        if (!vpsSshKey?.trim() && !vpsPassword) return { ok: false, msg: t("installer.validation.vpsAuth") };
      }
    }
    return { ok: true };
  };

  const avancarPasso = () => {
    const { ok, msg } = validarPasso(passoAtual);
    if (!ok) {
      toast.error(msg);
      return;
    }
    if (passoAtual < TOTAL_PASSOS) setPassoAtual((p) => p + 1);
  };

  const irParaPasso = (targetId: number) => {
    if (targetId <= passoAtual) {
      setPassoAtual(targetId);
      return;
    }
    for (let p = passoAtual + 1; p <= targetId; p++) {
      const { ok, msg } = validarPasso(p);
      if (!ok) {
        toast.error(msg);
        return;
      }
    }
    setPassoAtual(targetId);
  };

  const passoPodeAvançar = validarPasso(passoAtual).ok;

  const steps = [
    { id: 1, label: t("installer.stepLabel1"), icon: Database },
    { id: 2, label: t("installer.stepLabel2"), icon: Monitor },
    { id: 3, label: t("installer.stepLabel3"), icon: FileArchive },
    { id: 4, label: t("installer.stepLabel4"), icon: Key },
    { id: 5, label: t("installer.stepLabel5"), icon: Server },
    { id: 6, label: t("installer.stepLabel6"), icon: Download },
  ];

  return (
    <TooltipProvider>
    <div className="relative min-h-screen overflow-hidden">
      <video autoPlay loop muted playsInline poster={loginBg} className="absolute inset-0 w-full h-full object-cover">
        <source src={loginBgVideo} type="video/mp4" />
      </video>
      <div className={isDark ? "absolute inset-0 bg-black/50" : "absolute inset-0 bg-white/60 backdrop-blur-sm"} />

      <div className="fixed top-4 right-4 z-50 flex items-center gap-1">
        <LanguageSelector />
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className={`h-9 w-9 rounded-full backdrop-blur-md border transition-colors ${
            isDark ? "bg-white/10 border-white/20 text-white/70 hover:text-white" : "bg-black/10 border-black/10 text-foreground/70 hover:text-foreground"
          }`}
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>

      <div className="relative z-10 min-h-screen p-4 md:p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Server className="h-8 w-8 text-primary" />
              {t('installer.title')}
            </h1>
            <p className="text-muted-foreground mt-1">
              {t('installer.subtitle')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate("/")} className="gap-2">
              <ArrowLeft className="h-4 w-4" /> {t('common.back')}
            </Button>
          </div>
        </div>

        {/* Stepper: bolinhas */}
        <div className="flex items-center justify-between gap-1">
          {steps.map((s, i) => (
            <div key={s.id} className="flex items-center flex-1">
              <button
                type="button"
                onClick={() => irParaPasso(s.id)}
                className={`flex flex-col items-center gap-1 group ${
                  passoAtual >= s.id ? "cursor-pointer" : "cursor-default opacity-60"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                    passoAtual > s.id
                      ? "bg-primary text-primary-foreground"
                      : passoAtual === s.id
                        ? "ring-2 ring-primary ring-offset-2 ring-offset-background bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {passoAtual > s.id ? <CheckCircle2 className="h-5 w-5" /> : s.id}
                </div>
                <span className={`text-xs hidden sm:block max-w-[4rem] text-center truncate ${passoAtual === s.id ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                  {s.label}
                </span>
              </button>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 rounded ${passoAtual > s.id ? "bg-primary" : "bg-muted"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Conteúdo do passo atual */}
        {passoAtual === 1 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              {t('installer.supabaseSteps')}
            </CardTitle>
            <CardDescription>
              {t('installer.supabaseStepsDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <ol className="list-decimal list-inside space-y-3 text-muted-foreground">
              <li>
                <span className="font-medium text-foreground">Criar conta e projeto</span> — Acesse{" "}
                <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-primary underline hover:no-underline">supabase.com</a>
                , faça login e clique em <strong>New Project</strong>. Preencha nome, senha do banco e região. Aguarde 1–2 minutos.
              </li>
              <li>
                <span className="font-medium text-foreground">Instalar o banco</span> — No dashboard, vá em <strong>SQL Editor</strong> → <strong>New query</strong>.
                Copie todo o conteúdo do arquivo <code className="rounded bg-muted px-1.5 py-0.5 text-xs">supabase/instalar_banco_de_dados.sql</code> do projeto, cole no editor e clique em <strong>Run</strong>.
              </li>
              <li>
                <span className="font-medium text-foreground">Criar Super Admin</span> — Vá em <strong>Authentication</strong> → <strong>Users</strong> → <strong>Add user</strong>.
                Crie um usuário com e-mail e senha. Copie o <strong>UUID</strong> gerado. No SQL Editor, execute:
                <pre className="mt-2 rounded-lg bg-muted p-3 text-xs overflow-x-auto font-mono">{`INSERT INTO perfis (id, nome_completo, funcao, super_admin, ativo)
VALUES ('COLE-O-UUID-AQUI', 'Seu Nome', 'admin', true, true);`}</pre>
              </li>
              <li>
                <span className="font-medium text-foreground">Pegar URL, chave e Project ID</span> — Vá em <strong>Project Settings</strong> (ícone engrenagem) → <strong>API</strong>.
                Copie: <strong>Project URL</strong>, <strong>anon public</strong> (em Project API keys) e <strong>Project ID</strong> (em General ou na URL do projeto).
              </li>
              <li>
                <span className="font-medium text-foreground">Deploy das Edge Functions</span> — No terminal, com Supabase CLI instalado: <code className="rounded bg-muted px-1.5 py-0.5 text-xs">supabase functions deploy criar-organizacao --project-ref SEU_PROJECT_ID --no-verify-jwt</code> (e o mesmo para <code className="rounded bg-muted px-1.5 py-0.5 text-xs">gerenciar-usuarios-organizacao</code> e <code className="rounded bg-muted px-1.5 py-0.5 text-xs">atualizar-organizacao</code>). Veja <code className="rounded bg-muted px-1.5 py-0.5 text-xs">documentacao/INSTALACAO_BANCO.md</code>.
              </li>
            </ol>
            <p className="text-xs text-muted-foreground pt-2 border-t border-border/50">
              {t('installer.afterSteps')}
            </p>
            <Button onClick={avancarPasso} className="mt-4 gap-2">
              {t('installer.stepDone')} <ChevronRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
        )}

        {passoAtual === 2 && (
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              {t("installer.platform")}
            </CardTitle>
            <CardDescription>{t("installer.platformDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Selecione o sistema operacional do <strong>seu computador</strong> (onde vai rodar o script). O script faz o build localmente e envia para a VPS.
            </p>
            <div className="flex gap-4 flex-wrap">
              <label
                className={`flex items-center gap-2 cursor-pointer rounded-lg border-2 px-4 py-3 transition-colors ${
                  plataforma === "windows" ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                }`}
              >
                <input type="radio" checked={plataforma === "windows"} onChange={() => setPlataforma("windows")} className="sr-only" />
                <Monitor className="h-5 w-5" />
                <div>
                  <span className="font-medium">{t("installer.platformWindows")}</span>
                  <p className="text-xs text-muted-foreground">Gera um .ps1 (PowerShell). Requer chave SSH.</p>
                </div>
              </label>
              <label
                className={`flex items-center gap-2 cursor-pointer rounded-lg border-2 px-4 py-3 transition-colors ${
                  plataforma === "mac" ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                }`}
              >
                <input type="radio" checked={plataforma === "mac"} onChange={() => setPlataforma("mac")} className="sr-only" />
                <Apple className="h-5 w-5" />
                <div>
                  <span className="font-medium">{t("installer.platformMac")}</span>
                  <p className="text-xs text-muted-foreground">Gera um .sh (Bash). Aceita senha ou chave SSH.</p>
                </div>
              </label>
            </div>
            <Button onClick={avancarPasso} className="mt-4 gap-2">
              {t('installer.stepDone')} <ChevronRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
        )}

        {passoAtual === 3 && (
            <Card>
              <CardHeader>
                <CardTitle>{t('installer.projectSource')}</CardTitle>
                <CardDescription>{t('installer.projectSourceDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  O script precisa do codigo-fonte do FlowAtend para fazer o build (<code className="rounded bg-muted px-1.5 py-0.5 text-xs">npm install</code> + <code className="rounded bg-muted px-1.5 py-0.5 text-xs">npm run build</code>) no seu computador antes de enviar para a VPS.
                </p>
                <div className="flex gap-4 flex-wrap">
                  <label className={`flex items-center gap-2 cursor-pointer rounded-lg border-2 px-4 py-3 transition-colors text-sm ${
                    fonteProjeto === "github" ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                  }`}>
                    <input type="radio" checked={fonteProjeto === "github"} onChange={() => setFonteProjeto("github")} className="sr-only" />
                    <div>
                      <span className="font-medium">{t('installer.github')}</span>
                      <p className="text-xs text-muted-foreground">Clona automaticamente via git clone</p>
                    </div>
                  </label>
                  <label className={`flex items-center gap-2 cursor-pointer rounded-lg border-2 px-4 py-3 transition-colors text-sm ${
                    fonteProjeto === "zip" ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                  }`}>
                    <input type="radio" checked={fonteProjeto === "zip"} onChange={() => setFonteProjeto("zip")} className="sr-only" />
                    <div>
                      <span className="font-medium">{t('installer.zip')}</span>
                      <p className="text-xs text-muted-foreground">Usa arquivo ZIP local (~&#x2F;flowatend.zip)</p>
                    </div>
                  </label>
                </div>
                {fonteProjeto === "github" && (
                  <div className="space-y-2">
                    <LabelComTooltip
                      htmlFor="githubRepo"
                      tooltip="No GitHub, abra o repositorio e clique em Code → copie a URL HTTPS."
                    >
                      {t('installer.repoUrl')}
                    </LabelComTooltip>
                    <Input
                      id="githubRepo"
                      placeholder="https://github.com/usuario/flowatend.git"
                      value={githubRepo}
                      onChange={(e) => setGithubRepo(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">Deixe em branco para usar o repositorio padrao Flowgrammers. Se o repo for privado, o git pedira credenciais durante a execucao.</p>
                  </div>
                )}
                {fonteProjeto === "zip" && (
                  <Alert>
                    <AlertDescription className="text-xs">
                      {plataforma === "mac"
                        ? "Coloque o ZIP do projeto em ~/flowatend.zip (pasta pessoal do usuario). O script descompacta automaticamente."
                        : "Coloque o ZIP em C:\\Users\\SeuUsuario\\flowatend.zip. O script descompacta automaticamente."}
                    </AlertDescription>
                  </Alert>
                )}
                <Button onClick={avancarPasso} className="mt-4 gap-2" disabled={!passoPodeAvançar}>
                  {t('installer.stepDone')} <ChevronRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
        )}

        {passoAtual === 4 && (
            <Card>
              <CardHeader>
                <CardTitle>{t('installer.supabase')}</CardTitle>
                <CardDescription>{t('installer.supabaseDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert className="border-primary/30 bg-primary/5">
                  <Database className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    <p className="font-medium mb-1">Onde encontrar esses dados?</p>
                    <p className="text-muted-foreground">
                      No <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="text-primary underline hover:no-underline">Supabase Dashboard</a>, clique no seu projeto → <strong>Project Settings</strong> (icone engrenagem) → <strong>API</strong>.
                      Os 3 primeiros campos estao nessa pagina. O Webhook do n8n voce encontra no seu painel n8n.
                    </p>
                  </AlertDescription>
                </Alert>
                <div className="space-y-2">
                  <LabelComTooltip
                    htmlFor="supabaseUrl"
                    tooltip="Onde encontrar: Supabase Dashboard → Project Settings → API → Project URL. Para que serve: URL do backend (banco, auth, storage) usado pelo app."
                  >
                    {t('installer.url')}
                  </LabelComTooltip>
                  <Input id="supabaseUrl" placeholder="https://xxx.supabase.co" value={supabaseUrl} onChange={(e) => setSupabaseUrl(e.target.value)} />
                  <p className="text-xs text-muted-foreground">Project Settings → API → <strong>Project URL</strong>. Ex: https://abcdefg.supabase.co</p>
                </div>
                <div className="space-y-2">
                  <LabelComTooltip
                    htmlFor="supabaseKey"
                    tooltip="Chave publica (anon) do Supabase. Segura para expor no frontend."
                  >
                    {t('installer.publicKey')}
                  </LabelComTooltip>
                  <Input id="supabaseKey" placeholder="eyJ..." value={supabaseKey} onChange={(e) => setSupabaseKey(e.target.value)} type="password" />
                  <p className="text-xs text-muted-foreground">Project Settings → API → Project API keys → <strong>anon public</strong>. Comeca com &quot;eyJ...&quot;</p>
                </div>
                <div className="space-y-2">
                  <LabelComTooltip
                    htmlFor="supabaseProjectId"
                    tooltip="Identificador unico do projeto. Encontrado na URL ou em General settings."
                  >
                    {t('installer.projectId')}
                  </LabelComTooltip>
                  <Input id="supabaseProjectId" placeholder="abcdefghijkl" value={supabaseProjectId} onChange={(e) => setSupabaseProjectId(e.target.value)} />
                  <p className="text-xs text-muted-foreground">Project Settings → General → <strong>Reference ID</strong>. Tambem aparece na URL: supabase.com/dashboard/project/<strong>ESTE_ID</strong></p>
                </div>
                <div className="space-y-2">
                  <LabelComTooltip
                    htmlFor="n8nWebhookUrl"
                    tooltip="URL base do webhook do n8n. Usado para automacoes do FlowAtend."
                  >
                    {t('installer.n8nWebhook')}
                  </LabelComTooltip>
                  <Input id="n8nWebhookUrl" placeholder="https://seu-n8n.com/webhook/..." value={n8nWebhookUrl} onChange={(e) => setN8nWebhookUrl(e.target.value)} required />
                  <p className="text-xs text-muted-foreground">No n8n, crie um no Webhook → copie a <strong>URL de producao</strong>. Ex: https://n8n.seudominio.com/webhook/</p>
                </div>
                <Button onClick={avancarPasso} className="mt-4 gap-2" disabled={!passoPodeAvançar}>
                  {t('installer.stepDone')} <ChevronRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
        )}

        {passoAtual === 5 && (
            <Card>
              <CardHeader>
                <CardTitle>{t('installer.vpsServer')}</CardTitle>
                <CardDescription>{t('installer.vpsCredentials')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert className="border-primary/30 bg-primary/5">
                  <Server className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    <p className="font-medium mb-1">Conexao SSH</p>
                    <p className="text-muted-foreground">
                      O script conecta via SSH na sua VPS, envia os arquivos (dist + Dockerfile), faz o build da imagem Docker e inicia o container.
                      Voce precisa do <strong>IP</strong>, <strong>usuario</strong> e <strong>senha ou chave SSH</strong> da VPS. Sao os mesmos dados que usa no Termius/terminal para acessar o servidor.
                    </p>
                  </AlertDescription>
                </Alert>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <LabelComTooltip
                      htmlFor="vpsIp"
                      tooltip="IP do servidor. Mesmo que usa para ssh root@IP."
                    >
                      {t('installer.serverIp')}
                    </LabelComTooltip>
                    <Input id="vpsIp" placeholder="203.0.113.10 ou ssh root@IP" value={vpsIp} onChange={(e) => setVpsIp(e.target.value)} />
                    <p className="text-xs text-muted-foreground">Voce pode colar <code className="rounded bg-muted px-1 text-xs">ssh root@69.62.89.76</code> direto, o sistema extrai o IP e usuario.</p>
                  </div>
                  <div className="space-y-2">
                    <LabelComTooltip
                      htmlFor="vpsUser"
                      tooltip="Usuario SSH. Normalmente 'root' em VPS."
                    >
                      {t('installer.sshUser')}
                    </LabelComTooltip>
                    <Input id="vpsUser" placeholder="root" value={vpsUser} onChange={(e) => setVpsUser(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <LabelComTooltip
                    htmlFor="vpsPassword"
                    tooltip="Senha SSH. Requer sshpass instalado. Se a VPS usa apenas chave SSH, deixe em branco."
                  >
                    {t('installer.sshPassword')}
                  </LabelComTooltip>
                  <Input id="vpsPassword" type="password" placeholder="Senha do servidor" value={vpsPassword} onChange={(e) => setVpsPassword(e.target.value)} />
                  <p className="text-xs text-muted-foreground">Se sua VPS (ex: Hostinger) desabilita autenticacao por senha, use a chave SSH abaixo.</p>
                </div>
                <div className="space-y-2">
                  <LabelComTooltip
                    tooltip="Chave privada SSH. Mais segura que senha. Cole o conteudo completo do arquivo de chave."
                  >
                    {t('installer.sshKey')}
                  </LabelComTooltip>
                  <textarea
                    className="w-full min-h-[120px] rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono text-xs"
                    placeholder="-----BEGIN OPENSSH PRIVATE KEY-----&#10;...&#10;-----END OPENSSH PRIVATE KEY-----"
                    value={vpsSshKey}
                    onChange={(e) => setVpsSshKey(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Arquivo <code className="rounded bg-muted px-1 text-xs">~/.ssh/id_rsa</code> ou <code className="rounded bg-muted px-1 text-xs">~/.ssh/id_ed25519</code>.
                    Na Hostinger: VPS → SSH Keys → copie a chave privada. Cole o conteudo completo incluindo BEGIN e END.
                  </p>
                </div>
                <div className="space-y-2">
                  <LabelComTooltip htmlFor="dominio" tooltip="Subdominio apontando para o IP da VPS. Opcional: sem dominio, acessa via IP:8080.">
                    {t('installer.domain')}
                  </LabelComTooltip>
                  <Input id="dominio" placeholder="app.seudominio.com" value={dominio} onChange={(e) => setDominio(e.target.value)} />
                  <p className="text-xs text-muted-foreground">
                    Opcional. Sem dominio, o app fica em <code className="rounded bg-muted px-1 text-xs">http://IP:8080</code>. Com dominio, o Traefik gera HTTPS automatico via Let&apos;s Encrypt.
                  </p>
                  {dominio?.trim() && (
                    <div className="space-y-2 mt-2">
                      <Label htmlFor="emailLetsEncrypt">{t('installer.emailLetsEncrypt')}</Label>
                      <Input id="emailLetsEncrypt" type="email" placeholder="seu@email.com" value={emailLetsEncrypt} onChange={(e) => setEmailLetsEncrypt(e.target.value)} />
                      <p className="text-xs text-muted-foreground">{t('installer.emailLetsEncryptDesc')}</p>
                    </div>
                  )}
                  <Alert className="mt-3">
                    <ListOrdered className="h-4 w-4" />
                    <AlertDescription asChild>
                      <div className="space-y-2 text-xs mt-1">
                        <p className="font-medium">Configurar domínio com Cloudflare</p>
                        <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground">
                          <li><strong className="text-foreground">Acesse o painel</strong> — <a href="https://dash.cloudflare.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">dash.cloudflare.com</a> e selecione seu domínio.</li>
                          <li><strong className="text-foreground">Vá em DNS</strong> — Menu lateral → &quot;Registros DNS&quot;</li>
                          <li><strong className="text-foreground">Adicione um registro</strong> — Clique em &quot;Adicionar registro&quot;</li>
                          <li><strong className="text-foreground">Configure o registro tipo A</strong>: Nome = subdomínio (ex: <code>app</code>), Conteúdo = IP da VPS, Proxy = <strong>Cinza</strong> (apenas DNS)</li>
                          <li><strong className="text-foreground">Com proxy cinza (DNS apenas)</strong> — o script instala Traefik e Let&apos;s Encrypt na VPS. Preencha o e-mail abaixo.</li>
                          <li><strong className="text-foreground">Aguarde a propagação</strong> e informe o domínio acima (ex: app.seudominio.com)</li>
                        </ol>
                        <p className="text-muted-foreground pt-1 border-t">Com Traefik na VPS, o script configura HTTPS automático com Let&apos;s Encrypt.</p>
                      </div>
                    </AlertDescription>
                  </Alert>
                </div>
                <div className="space-y-2">
                  <LabelComTooltip
                    htmlFor="nomeContainer"
                    tooltip="Onde encontrar: Nome que você escolhe para o container. Para que serve: Nome do container Docker na VPS. Use o padrão 'flowatend' ou personalize se tiver múltiplas instâncias."
                  >
                    {t('installer.containerName')}
                  </LabelComTooltip>
                  <Input id="nomeContainer" placeholder="flowatend" value={nomeContainer} onChange={(e) => setNomeContainer(e.target.value)} />
                </div>
                {dominio?.trim() && (
                  <>
                    <div className="space-y-3">
                      <LabelComTooltip
                        tooltip="Como saber: rode 'docker service ls' na VPS. Se listar servicos (traefik, n8n, portainer), e Swarm. Se der erro ou vazio, e Standalone."
                      >
                        Modo Docker
                      </LabelComTooltip>
                      <div className="flex gap-4 flex-wrap">
                        <label
                          className={`flex items-center gap-2 cursor-pointer rounded-lg border-2 px-4 py-3 transition-colors text-sm ${
                            modoDocker === "standalone" ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                          }`}
                        >
                          <input type="radio" checked={modoDocker === "standalone"} onChange={() => setModoDocker("standalone")} className="sr-only" />
                          <Server className="h-4 w-4" />
                          <div>
                            <span className="font-medium">Standalone</span>
                            <p className="text-xs text-muted-foreground">docker run &mdash; Docker simples, sem orquestrador</p>
                          </div>
                        </label>
                        <label
                          className={`flex items-center gap-2 cursor-pointer rounded-lg border-2 px-4 py-3 transition-colors text-sm ${
                            modoDocker === "swarm" ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                          }`}
                        >
                          <input type="radio" checked={modoDocker === "swarm"} onChange={() => setModoDocker("swarm")} className="sr-only" />
                          <Server className="h-4 w-4" />
                          <div>
                            <span className="font-medium">Swarm</span>
                            <p className="text-xs text-muted-foreground">docker service &mdash; Portainer + Swarm (mais comum em VPS com n8n)</p>
                          </div>
                        </label>
                      </div>
                      <Alert>
                        <HelpCircle className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          <p className="font-medium mb-1">Como descobrir?</p>
                          <p className="text-muted-foreground">Na VPS, rode <code className="rounded bg-muted px-1 text-xs">docker service ls</code>.</p>
                          <ul className="mt-1 space-y-0.5 text-muted-foreground">
                            <li>Se listar servicos como <code className="rounded bg-muted px-1 text-xs">traefik_traefik</code>, <code className="rounded bg-muted px-1 text-xs">n8n_n8n</code> → escolha <strong>Swarm</strong></li>
                            <li>Se der erro ou nao listar nada → escolha <strong>Standalone</strong></li>
                          </ul>
                          <p className="text-muted-foreground mt-1">Se voce seguiu o setup da Imersao Flowgrammers (Hostinger + Portainer + n8n), provavelmente e <strong>Swarm</strong>.</p>
                        </AlertDescription>
                      </Alert>
                    </div>
                    <div className="space-y-2">
                      <LabelComTooltip
                        htmlFor="certResolver"
                        tooltip="Nome do certificado resolver configurado no Traefik. E o nome que aparece em --certificatesresolvers.NOME.acme nos args do Traefik."
                      >
                        Cert Resolver (Traefik)
                      </LabelComTooltip>
                      <Input id="certResolver" placeholder="letsencryptresolver" value={certResolver} onChange={(e) => setCertResolver(e.target.value)} />
                      <Alert>
                        <HelpCircle className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          <p className="font-medium mb-1">Como descobrir?</p>
                          <div className="space-y-1 text-muted-foreground">
                            <p>Rode na VPS (substitua <code className="rounded bg-muted px-1 text-xs">traefik_traefik</code> pelo nome do seu servico Traefik):</p>
                            <code className="block rounded bg-muted px-2 py-1 text-xs">docker service inspect traefik_traefik --format {`'{{json .Spec.TaskTemplate.ContainerSpec.Args}}'`} | tr , &apos;\n&apos; | grep certif</code>
                            <p>Procure por <code className="rounded bg-muted px-1 text-xs">--certificatesresolvers.<strong>NOME</strong>.acme</code>. O <strong>NOME</strong> e o que vai aqui.</p>
                            <p>No setup Flowgrammers, normalmente e <strong>letsencryptresolver</strong>.</p>
                          </div>
                        </AlertDescription>
                      </Alert>
                    </div>
                    <div className="space-y-2">
                      <LabelComTooltip
                        htmlFor="redeDocker"
                        tooltip="O container FlowAtend precisa estar na mesma rede Docker que o Traefik para receber trafego HTTPS."
                      >
                        Rede Docker (Traefik)
                      </LabelComTooltip>
                      <Input id="redeDocker" placeholder={modoDocker === "swarm" ? "ricneves" : "web"} value={redeDocker} onChange={(e) => setRedeDocker(e.target.value)} />
                      <Alert>
                        <HelpCircle className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          <p className="font-medium mb-1">Como descobrir a rede?</p>
                          {modoDocker === "swarm" ? (
                            <div className="space-y-1 text-muted-foreground">
                              <p>Rode na VPS:</p>
                              <code className="block rounded bg-muted px-2 py-1 text-xs">docker service inspect traefik_traefik --format {`'{{json .Spec.TaskTemplate.Networks}}'`}</code>
                              <p>O resultado mostra o ID da rede. Depois rode <code className="rounded bg-muted px-1 text-xs">docker network ls</code> para ver o nome correspondente.</p>
                              <p>Normalmente a rede overlay se chama como o usuario/stack (ex: <strong>ricneves</strong>, <strong>traefik_default</strong>).</p>
                            </div>
                          ) : (
                            <div className="space-y-1 text-muted-foreground">
                              <p>Rode na VPS:</p>
                              <code className="block rounded bg-muted px-2 py-1 text-xs">docker network ls</code>
                              <p>Procure a rede bridge onde o Traefik esta (normalmente <strong>web</strong> ou <strong>traefik_default</strong>).</p>
                              <p>Confirme com: <code className="rounded bg-muted px-1 text-xs">docker inspect traefik --format {`'{{json .NetworkSettings.Networks}}'`}</code></p>
                            </div>
                          )}
                        </AlertDescription>
                      </Alert>
                    </div>
                  </>
                )}
                <Button onClick={avancarPasso} className="mt-4 gap-2" disabled={!passoPodeAvançar}>
                  {t('installer.stepDone')} <ChevronRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
        )}

        {passoAtual === 6 && (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              {t('installer.generateScript')}
            </CardTitle>
            <CardDescription>
              {plataforma === "mac" ? t('installer.scriptInfoMac') : t('installer.scriptInfoWindows')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert className="border-primary/30 bg-primary/5">
              <ListOrdered className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <p className="font-medium mb-1">O que o script faz?</p>
                <ol className="list-decimal list-inside space-y-0.5 text-muted-foreground">
                  <li>Clona o repositorio (ou descompacta o ZIP)</li>
                  <li>Instala dependencias (<code className="rounded bg-muted px-1 text-xs">npm install</code>) e faz o build (<code className="rounded bg-muted px-1 text-xs">npm run build</code>)</li>
                  <li>Cria o Dockerfile e config do Nginx (SPA com try_files)</li>
                  <li>Envia os arquivos para a VPS via SCP</li>
                  <li>Faz o <code className="rounded bg-muted px-1 text-xs">docker build</code> e inicia o container {modoDocker === "swarm" ? "(docker service create)" : "(docker run)"} com labels do Traefik</li>
                </ol>
              </AlertDescription>
            </Alert>

            <div className="rounded-lg border p-4 space-y-3">
              <p className="text-sm font-medium">Resumo da configuracao</p>
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <span>Plataforma:</span><span className="font-medium text-foreground">{plataforma === "mac" ? "Mac/Linux (.sh)" : "Windows (.ps1)"}</span>
                <span>Modo Docker:</span><span className="font-medium text-foreground">{modoDocker === "swarm" ? "Swarm (docker service)" : "Standalone (docker run)"}</span>
                <span>Container:</span><span className="font-medium text-foreground">{nomeContainer}</span>
                {dominio ? <><span>Dominio:</span><span className="font-medium text-foreground">{dominio} (HTTPS via Traefik)</span></> : <><span>Acesso:</span><span className="font-medium text-foreground">http://{vpsIp || "IP"}:8080</span></>}
                {dominio && <><span>Rede Docker:</span><span className="font-medium text-foreground">{redeDocker}</span></>}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button onClick={handleDownloadScript} className="gap-2" size="lg">
                <Download className="h-4 w-4" />
                {plataforma === "mac" ? t('installer.downloadMac') : t('installer.downloadWindows')}
              </Button>
              <Button variant="outline" onClick={handleDownloadConfig} className="gap-2">
                {t('installer.downloadConfig')}
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Alert>
                <ListOrdered className="h-4 w-4" />
                <AlertDescription asChild>
                  <div className="space-y-2 text-xs mt-1">
                    <p className="font-medium">Como executar no Mac/Linux</p>
                    <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                      <li>Abra o <strong>Terminal</strong></li>
                      <li><code className="rounded bg-muted px-1 text-xs">cd ~/Downloads</code> (ou onde salvou)</li>
                      <li><code className="rounded bg-muted px-1 text-xs">chmod +x flowatend-install.sh</code></li>
                      <li><code className="rounded bg-muted px-1 text-xs">bash flowatend-install.sh</code></li>
                      <li>Aguarde a instalacao (5-10 min na primeira vez)</li>
                    </ol>
                  </div>
                </AlertDescription>
              </Alert>
              <Alert>
                <ListOrdered className="h-4 w-4" />
                <AlertDescription asChild>
                  <div className="space-y-2 text-xs mt-1">
                    <p className="font-medium">Como executar no Windows</p>
                    <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                      <li>Abra o <strong>PowerShell como Administrador</strong></li>
                      <li><code className="rounded bg-muted px-1 text-xs">Set-ExecutionPolicy Bypass -Scope Process</code></li>
                      <li><code className="rounded bg-muted px-1 text-xs">cd ~\Downloads</code></li>
                      <li><code className="rounded bg-muted px-1 text-xs">.\flowatend-install.ps1</code></li>
                      <li>Aguarde a instalacao (5-10 min na primeira vez)</li>
                    </ol>
                  </div>
                </AlertDescription>
              </Alert>
            </div>

            {dominio && (
              <Alert>
                <HelpCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  <p className="font-medium mb-1">Apos a instalacao</p>
                  <ul className="space-y-0.5 text-muted-foreground">
                    <li>Acesse <strong>https://{dominio}</strong> no navegador</li>
                    <li>Se aparecer erro de certificado, aguarde 1-2 minutos (o Let&apos;s Encrypt esta gerando o certificado)</li>
                    <li>Se persistir, verifique: DNS apontando para o IP correto, Cloudflare em modo &quot;DNS only&quot; (cinza), e Traefik rodando na VPS</li>
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
        )}
      </div>
      </div>
    </div>
    </TooltipProvider>
  );
}
