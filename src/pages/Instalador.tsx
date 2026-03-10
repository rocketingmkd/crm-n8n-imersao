import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LanguageSelector from "@/components/LanguageSelector";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Server, Database, Key, FileArchive, Download, Lock, ArrowLeft, CheckCircle2, HelpCircle, ListOrdered, ExternalLink, Monitor, Apple, ChevronRight } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { toast } from "sonner";

const SENHA_INSTALADOR = "#flowgrammersInstall2026";

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
  const [nomeContainer, setNomeContainer] = useState("flowatend");

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
SSH_CMD() { sshpass -e ssh "\$@"; }
SCP_CMD() { sshpass -e scp "\$@"; }
SSH_OPTS=""
SCP_OPTS=""
`;

    const dockerRunCmd = dominio
      ? `docker run -d \\
  --name ${nomeContainer} \\
  -p 80 \\
  -l traefik.enable=true \\
  -l 'traefik.http.routers.${nomeContainer}.rule=Host(\`${dominio}\`)' \\
  -l traefik.http.routers.${nomeContainer}.entrypoints=websecure \\
  -l traefik.http.routers.${nomeContainer}.tls.certresolver=myresolver \\
  ${nomeContainer}:latest`
      : `docker run -d --name ${nomeContainer} -p 8080:80 ${nomeContainer}:latest`;

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

# 3. Criar Dockerfile
echo -e "\${GREEN}[3/5] Preparando Docker...\${NC}"
cat > "\$DEPLOY_DIR/Dockerfile" << 'DOCKEREOF'
FROM nginx:alpine
COPY dist /usr/share/nginx/html
EXPOSE 80
DOCKEREOF

# 4. Enviar para VPS
echo -e "\${GREEN}[4/5] Enviando para VPS (\$VPS_IP)...\${NC}"
REMOTE_DIR="/tmp/flowatend-\$\$"
SSH_CMD \$SSH_OPTS -o StrictHostKeyChecking=no \$VPS_USER@\$VPS_IP "mkdir -p \$REMOTE_DIR"
SCP_CMD \$SCP_OPTS -o StrictHostKeyChecking=no -r "\$DEPLOY_DIR/dist" "\$DEPLOY_DIR/Dockerfile" \$VPS_USER@\$VPS_IP:\$REMOTE_DIR/

# 5. Build e run na VPS
echo -e "\${GREEN}[5/5] Iniciando container na VPS...\${NC}"
SSH_CMD \$SSH_OPTS -o StrictHostKeyChecking=no \$VPS_USER@\$VPS_IP << REMOTEEOF
cd \$REMOTE_DIR
docker stop \$CONTAINER_NAME 2>/dev/null || true
docker rm \$CONTAINER_NAME 2>/dev/null || true
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

    const dockerRunCmd = dominio
      ? `docker run -d --name ${nomeContainer} -p 80 -l traefik.enable=true -l 'traefik.http.routers.${nomeContainer}.rule=Host(\`${dominio}\`)' -l traefik.http.routers.${nomeContainer}.entrypoints=websecure -l traefik.http.routers.${nomeContainer}.tls.certresolver=myresolver ${nomeContainer}:latest`
      : `docker run -d --name ${nomeContainer} -p 8080:80 ${nomeContainer}:latest`;

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

    # 3. Dockerfile
    Write-Host "[3/5] Preparando Docker..." -ForegroundColor Green
    @"
FROM nginx:alpine
COPY dist /usr/share/nginx/html
EXPOSE 80
"@ | Out-File -FilePath "Dockerfile" -Encoding utf8

    # 4. Enviar para VPS
    Write-Host "[4/5] Enviando para VPS ($VPS_IP)..." -ForegroundColor Green
    ssh ${sshOpts} $VPS_USER@$VPS_IP "mkdir -p $REMOTE_DIR"
    scp ${scpOpts} -r dist Dockerfile "$VPS_USER@$VPS_IP:$REMOTE_DIR/"

    # 5. Build e run na VPS
    Write-Host "[5/5] Iniciando container na VPS..." -ForegroundColor Green
    $remoteScript = @"
cd $REMOTE_DIR
docker stop $nomeContainer 2>/dev/null || true
docker rm $nomeContainer 2>/dev/null || true
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

  if (!autenticado) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30 p-4 relative">
        <div className="fixed top-4 right-4 z-50">
          <LanguageSelector />
        </div>
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Lock className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>{t('installer.title')}</CardTitle>
                <CardDescription>{t('installer.restricted')}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="senha">{t('installer.password')}</Label>
              <Input
                id="senha"
                type="password"
                placeholder={t('installer.passwordPlaceholder')}
                value={senhaDigitada}
                onChange={(e) => { setSenhaDigitada(e.target.value); setErroSenha(false); }}
                onKeyDown={(e) => e.key === "Enter" && handleVerificarSenha()}
                className={erroSenha ? "border-red-500" : ""}
              />
              {erroSenha && <p className="text-xs text-red-500">{t('installer.wrongPassword')}</p>}
            </div>
            <Button onClick={handleVerificarSenha} className="w-full">{t('installer.access')}</Button>
            <Button variant="ghost" onClick={() => navigate("/")} className="w-full gap-2">
              <ArrowLeft className="h-4 w-4" /> {t('common.back')}
            </Button>
          </CardContent>
        </Card>
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
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 p-4 md:p-6 relative">
      <div className="fixed top-4 right-4 z-50">
        <LanguageSelector />
      </div>
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
                onClick={() => setPassoAtual(s.id)}
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
          <CardContent>
            <div className="flex gap-4 flex-wrap">
              <label
                className={`flex items-center gap-2 cursor-pointer rounded-lg border-2 px-4 py-3 transition-colors ${
                  plataforma === "windows" ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                }`}
              >
                <input type="radio" checked={plataforma === "windows"} onChange={() => setPlataforma("windows")} className="sr-only" />
                <Monitor className="h-5 w-5" />
                <span>{t("installer.platformWindows")}</span>
              </label>
              <label
                className={`flex items-center gap-2 cursor-pointer rounded-lg border-2 px-4 py-3 transition-colors ${
                  plataforma === "mac" ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                }`}
              >
                <input type="radio" checked={plataforma === "mac"} onChange={() => setPlataforma("mac")} className="sr-only" />
                <Apple className="h-5 w-5" />
                <span>{t("installer.platformMac")}</span>
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
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" checked={fonteProjeto === "github"} onChange={() => setFonteProjeto("github")} />
                    {t('installer.github')}
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" checked={fonteProjeto === "zip"} onChange={() => setFonteProjeto("zip")} />
                    {t('installer.zip')}
                  </label>
                </div>
                {fonteProjeto === "github" && (
                  <div className="space-y-2">
                    <LabelComTooltip
                      htmlFor="githubRepo"
                      tooltip="Onde encontrar: No GitHub, abra o repositório e clique em Code → copie a URL HTTPS. Para que serve: O script clona este repositório para fazer o build do projeto."
                    >
                      {t('installer.repoUrl')}
                    </LabelComTooltip>
                    <Input
                      id="githubRepo"
                      placeholder="https://github.com/usuario/flowatend.git"
                      value={githubRepo}
                      onChange={(e) => setGithubRepo(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">Deixe em branco para usar o repositório padrão Flowgrammers.</p>
                  </div>
                )}
                {fonteProjeto === "zip" && (
                  <p className="text-sm text-muted-foreground">
                    {plataforma === "mac" ? t("installer.zipPathMac") : t("installer.zipPathWindows")}
                  </p>
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
                <p className="text-sm text-muted-foreground">
                  Veja o passo a passo no Passo 1. Preencha os campos abaixo com os dados do Supabase (Project Settings → API).
                </p>
                <div className="space-y-2">
                  <LabelComTooltip
                    htmlFor="supabaseUrl"
                    tooltip="Onde encontrar: Supabase Dashboard → Project Settings → API → Project URL. Para que serve: URL do backend (banco, auth, storage) usado pelo app."
                  >
                    {t('installer.url')}
                  </LabelComTooltip>
                  <Input id="supabaseUrl" placeholder="https://xxx.supabase.co" value={supabaseUrl} onChange={(e) => setSupabaseUrl(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <LabelComTooltip
                    htmlFor="supabaseKey"
                    tooltip="Onde encontrar: Supabase Dashboard → Project Settings → API → Project API keys → anon public. Para que serve: Chave pública para o frontend conectar ao Supabase (segura para expor no navegador)."
                  >
                    {t('installer.publicKey')}
                  </LabelComTooltip>
                  <Input id="supabaseKey" placeholder="eyJ..." value={supabaseKey} onChange={(e) => setSupabaseKey(e.target.value)} type="password" />
                </div>
                <div className="space-y-2">
                  <LabelComTooltip
                    htmlFor="supabaseProjectId"
                    tooltip="Onde encontrar: Supabase Dashboard → Project Settings → General → Reference ID (ou na URL do projeto). Para que serve: Identificador único do projeto no Supabase."
                  >
                    {t('installer.projectId')}
                  </LabelComTooltip>
                  <Input id="supabaseProjectId" placeholder="abcdefghijkl" value={supabaseProjectId} onChange={(e) => setSupabaseProjectId(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <LabelComTooltip
                    htmlFor="n8nWebhookUrl"
                    tooltip="Onde encontrar: No n8n, crie um nó Webhook e copie a URL de produção. Para que serve: Webhook base para automações (WhatsApp, agendamento, etc.). Obrigatório."
                  >
                    {t('installer.n8nWebhook')}
                  </LabelComTooltip>
                  <Input id="n8nWebhookUrl" placeholder="https://seu-n8n.com/webhook/..." value={n8nWebhookUrl} onChange={(e) => setN8nWebhookUrl(e.target.value)} required />
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <LabelComTooltip
                      htmlFor="vpsIp"
                      tooltip="Onde encontrar: No painel da sua VPS (DigitalOcean, AWS, etc.) ou use o IP que você usa para SSH. Para que serve: Endereço do servidor onde o app será implantado."
                    >
                      {t('installer.serverIp')}
                    </LabelComTooltip>
                    <Input id="vpsIp" placeholder="203.0.113.10" value={vpsIp} onChange={(e) => setVpsIp(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <LabelComTooltip
                      htmlFor="vpsUser"
                      tooltip="Onde encontrar: O usuário que você usa para fazer SSH no servidor (ex: ssh root@IP). Para que serve: Usuário SSH para conectar e enviar os arquivos."
                    >
                      {t('installer.sshUser')}
                    </LabelComTooltip>
                    <Input id="vpsUser" placeholder="root" value={vpsUser} onChange={(e) => setVpsUser(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <LabelComTooltip
                    htmlFor="vpsPassword"
                    tooltip="Onde encontrar: A senha do usuário SSH (definida ao criar a VPS). Para que serve: Autenticação para SCP/SSH. Requer sshpass instalado. Deixe em branco se usar chave SSH."
                  >
                    {t('installer.sshPassword')}
                  </LabelComTooltip>
                  <Input id="vpsPassword" type="password" placeholder="Senha do servidor" value={vpsPassword} onChange={(e) => setVpsPassword(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <LabelComTooltip
                    tooltip="Onde encontrar: Arquivo ~/.ssh/id_rsa ou id_ed25519 (copie o conteúdo completo). Para que serve: Alternativa mais segura à senha. Cole a chave privada completa incluindo BEGIN e END."
                  >
                    {t('installer.sshKey')}
                  </LabelComTooltip>
                  <textarea
                    className="w-full min-h-[120px] rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    placeholder="-----BEGIN OPENSSH PRIVATE KEY-----&#10;...&#10;-----END OPENSSH PRIVATE KEY-----"
                    value={vpsSshKey}
                    onChange={(e) => setVpsSshKey(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dominio">{t('installer.domain')}</Label>
                  <Input id="dominio" placeholder="app.seudominio.com" value={dominio} onChange={(e) => setDominio(e.target.value)} />
                  <Alert className="mt-3">
                    <ListOrdered className="h-4 w-4" />
                    <AlertDescription asChild>
                      <div className="space-y-2 text-xs mt-1">
                        <p className="font-medium">Configurar domínio com Cloudflare</p>
                        <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground">
                          <li><strong className="text-foreground">Acesse o painel</strong> — <a href="https://dash.cloudflare.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">dash.cloudflare.com</a> e selecione seu domínio.</li>
                          <li><strong className="text-foreground">Vá em DNS</strong> — Menu lateral → &quot;Registros DNS&quot;</li>
                          <li><strong className="text-foreground">Adicione um registro</strong> — Clique em &quot;Adicionar registro&quot;</li>
                          <li><strong className="text-foreground">Configure o registro tipo A</strong>: Nome = subdomínio (ex: <code>app</code>), Conteúdo = IP da VPS, Proxy = Laranja ou Cinza</li>
                          <li><strong className="text-foreground">Se usar proxy (laranja)</strong> — SSL/TLS → &quot;Completo&quot; ou &quot;Completo (estrito)&quot;</li>
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
          <CardContent className="flex flex-wrap gap-3">
            <Button onClick={handleDownloadScript} className="gap-2">
              <Download className="h-4 w-4" />
              {plataforma === "mac" ? t('installer.downloadMac') : t('installer.downloadWindows')}
            </Button>
            <Button variant="outline" onClick={handleDownloadConfig} className="gap-2">
              {t('installer.downloadConfig')}
            </Button>
          </CardContent>
        </Card>
        )}
      </div>
    </div>
    </TooltipProvider>
  );
}
