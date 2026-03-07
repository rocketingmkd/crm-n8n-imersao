import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Server, Database, Key, FileArchive, Download, Lock, ArrowLeft, CheckCircle2, HelpCircle, ListOrdered, ExternalLink } from "lucide-react";
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
  const navigate = useNavigate();
  const [autenticado, setAutenticado] = useState(false);
  const [senhaDigitada, setSenhaDigitada] = useState("");
  const [erroSenha, setErroSenha] = useState(false);

  const [fonteProjeto, setFonteProjeto] = useState<"github" | "zip">("github");
  const [githubRepo, setGithubRepo] = useState("");
  const [supabaseUrl, setSupabaseUrl] = useState("");
  const [supabaseKey, setSupabaseKey] = useState("");
  const [supabaseProjectId, setSupabaseProjectId] = useState("");
  const [n8nWebhookUrl, setN8nWebhookUrl] = useState("");
  const [gestaoVpsWebhookUrl, setGestaoVpsWebhookUrl] = useState("");
  const [vpsIp, setVpsIp] = useState("");
  const [vpsUser, setVpsUser] = useState("root");
  const [vpsPassword, setVpsPassword] = useState("");
  const [vpsSshKey, setVpsSshKey] = useState("");
  const [dominio, setDominio] = useState("");
  const [nomeContainer, setNomeContainer] = useState("flowatend");

  const handleVerificarSenha = () => {
    if (senhaDigitada === SENHA_INSTALADOR) {
      setAutenticado(true);
      setErroSenha(false);
    } else {
      setErroSenha(true);
      toast.error("Senha incorreta");
    }
  };

  const gerarScriptBash = () => {
    const usaSshKey = !!vpsSshKey?.trim();
    const sshAuth = usaSshKey
      ? `# Usando chave SSH
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
SSHPASS="sshpass -p '${vpsPassword.replace(/'/g, "'\\''")}'"
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

# Verificar dependências
command -v node >/dev/null 2>&1 || { echo -e "\${RED}Node.js não encontrado. Instale: https://nodejs.org\${NC}"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo -e "\${RED}npm não encontrado.\${NC}"; exit 1; }
command -v git >/dev/null 2>&1 || { echo -e "\${RED}Git não encontrado. Instale: https://git-scm.com\${NC}"; exit 1; }

${usaSshKey ? "" : `command -v sshpass >/dev/null 2>&1 || { echo -e "\${YELLOW}sshpass não encontrado. Instale: apt install sshpass (Linux) ou brew install sshpass (Mac)\${NC}"; exit 1; }`}

# Configurações
VPS_IP="${vpsIp}"
VPS_USER="${vpsUser}"
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
VITE_GESTAO_VPS_WEBHOOK_URL=${gestaoVpsWebhookUrl}
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
${!usaSshKey ? `\$SSHPASS ` : ""}ssh \$SSH_OPTS \$VPS_USER@\$VPS_IP "mkdir -p \$REMOTE_DIR"
${!usaSshKey ? `\$SSHPASS ` : ""}scp \$SCP_OPTS -r "\$DEPLOY_DIR/dist" "\$DEPLOY_DIR/Dockerfile" \$VPS_USER@\$VPS_IP:\$REMOTE_DIR/

# 5. Build e run na VPS
echo -e "\${GREEN}[5/5] Iniciando container na VPS...\${NC}"
${!usaSshKey ? `\$SSHPASS ` : ""}ssh \$SSH_OPTS \$VPS_USER@\$VPS_IP << REMOTEEOF
cd \$REMOTE_DIR
docker stop $nomeContainer 2>/dev/null || true
docker rm $nomeContainer 2>/dev/null || true
docker build -t $nomeContainer:latest .
${dockerRunCmd}
rm -rf \$REMOTE_DIR
echo "Container $nomeContainer iniciado!"
REMOTEEOF

# Limpar
rm -rf "\$DEPLOY_DIR"
${usaSshKey ? `rm -f "\$SSH_KEY_PATH"` : ""}

echo -e "\${GREEN}=== Instalação concluída! ===\${NC}"
${dominio ? `echo -e "Acesse: https://${dominio}"` : `echo -e "Acesse: http://${vpsIp}:8080"`}
`;
    return script;
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
  gestaoVpsWebhookUrl: "${gestaoVpsWebhookUrl}",
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

  const handleDownloadBash = () => {
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
    const script = gerarScriptBash();
    const blob = new Blob([script], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "flowatend-install.sh";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Script baixado! Execute: bash flowatend-install.sh");
  };

  const handleDownloadConfig = () => {
    const config = {
      supabaseUrl,
      supabaseKey,
      supabaseProjectId,
      n8nWebhookUrl,
      gestaoVpsWebhookUrl,
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Lock className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>Instalador FlowAtend</CardTitle>
                <CardDescription>Área restrita. Informe a senha de acesso.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="senha">Senha</Label>
              <Input
                id="senha"
                type="password"
                placeholder="Digite a senha"
                value={senhaDigitada}
                onChange={(e) => { setSenhaDigitada(e.target.value); setErroSenha(false); }}
                onKeyDown={(e) => e.key === "Enter" && handleVerificarSenha()}
                className={erroSenha ? "border-red-500" : ""}
              />
              {erroSenha && <p className="text-xs text-red-500">Senha incorreta</p>}
            </div>
            <Button onClick={handleVerificarSenha} className="w-full">Acessar</Button>
            <Button variant="ghost" onClick={() => navigate("/")} className="w-full gap-2">
              <ArrowLeft className="h-4 w-4" /> Voltar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <TooltipProvider>
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 p-4 md:p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Server className="h-8 w-8 text-primary" />
              Instalador Automático FlowAtend
            </h1>
            <p className="text-muted-foreground mt-1">
              Gere o script de instalação e faça o deploy na sua VPS em poucos passos.
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate("/")} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
        </div>

        {/* Passo a passo: criar banco no Supabase — FAÇA PRIMEIRO */}
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              Passo a passo: criar o banco no Supabase
            </CardTitle>
            <CardDescription>
              Faça isso primeiro, antes de preencher os dados abaixo. Sem o banco configurado, o app não funcionará.
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
              Depois de concluir os passos acima, preencha a aba <strong>Banco</strong> com os dados copiados.
            </p>
          </CardContent>
        </Card>

        <Tabs defaultValue="projeto" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="projeto" className="gap-2">
              <FileArchive className="h-4 w-4" /> Projeto
            </TabsTrigger>
            <TabsTrigger value="banco" className="gap-2">
              <Database className="h-4 w-4" /> Banco
            </TabsTrigger>
            <TabsTrigger value="vps" className="gap-2">
              <Server className="h-4 w-4" /> VPS
            </TabsTrigger>
          </TabsList>

          <TabsContent value="projeto" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Fonte do Projeto</CardTitle>
                <CardDescription>De onde obter o código do FlowAtend</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" checked={fonteProjeto === "github"} onChange={() => setFonteProjeto("github")} />
                    GitHub (recomendado)
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" checked={fonteProjeto === "zip"} onChange={() => setFonteProjeto("zip")} />
                    Arquivo ZIP
                  </label>
                </div>
                {fonteProjeto === "github" && (
                  <div className="space-y-2">
                    <LabelComTooltip
                      htmlFor="githubRepo"
                      tooltip="Onde encontrar: No GitHub, abra o repositório e clique em Code → copie a URL HTTPS. Para que serve: O script clona este repositório para fazer o build do projeto."
                    >
                      URL do repositório
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
                    Coloque o arquivo flowatend.zip na pasta home (~/) antes de executar o script.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="banco" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Veja o passo a passo completo no topo desta página. Preencha os campos abaixo com os dados do Supabase (Project Settings → API).
            </p>
            <Card>
              <CardHeader>
                <CardTitle>Supabase</CardTitle>
                <CardDescription>Dados do banco de dados (Project Settings → API)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <LabelComTooltip
                    htmlFor="supabaseUrl"
                    tooltip="Onde encontrar: Supabase Dashboard → Project Settings → API → Project URL. Para que serve: URL do backend (banco, auth, storage) usado pelo app."
                  >
                    URL
                  </LabelComTooltip>
                  <Input id="supabaseUrl" placeholder="https://xxx.supabase.co" value={supabaseUrl} onChange={(e) => setSupabaseUrl(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <LabelComTooltip
                    htmlFor="supabaseKey"
                    tooltip="Onde encontrar: Supabase Dashboard → Project Settings → API → Project API keys → anon public. Para que serve: Chave pública para o frontend conectar ao Supabase (segura para expor no navegador)."
                  >
                    Chave pública (anon key)
                  </LabelComTooltip>
                  <Input id="supabaseKey" placeholder="eyJ..." value={supabaseKey} onChange={(e) => setSupabaseKey(e.target.value)} type="password" />
                </div>
                <div className="space-y-2">
                  <LabelComTooltip
                    htmlFor="supabaseProjectId"
                    tooltip="Onde encontrar: Supabase Dashboard → Project Settings → General → Reference ID (ou na URL do projeto). Para que serve: Identificador único do projeto no Supabase."
                  >
                    Project ID
                  </LabelComTooltip>
                  <Input id="supabaseProjectId" placeholder="abcdefghijkl" value={supabaseProjectId} onChange={(e) => setSupabaseProjectId(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <LabelComTooltip
                    htmlFor="n8nWebhookUrl"
                    tooltip="Onde encontrar: No n8n, crie um nó Webhook e copie a URL de produção. Para que serve: Webhook base para automações (WhatsApp, agendamento, etc.). Opcional."
                  >
                    Webhook n8n (opcional)
                  </LabelComTooltip>
                  <Input id="n8nWebhookUrl" placeholder="https://seu-n8n.com/webhook/..." value={n8nWebhookUrl} onChange={(e) => setN8nWebhookUrl(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <LabelComTooltip
                    htmlFor="gestaoVpsWebhookUrl"
                    tooltip="Onde encontrar: Workflow n8n que controla a VPS (ativar/desativar workflows). Para que serve: Usado pelo Super Admin em Gestão de VPS. Opcional."
                  >
                    Webhook Gestão VPS (opcional)
                  </LabelComTooltip>
                  <Input id="gestaoVpsWebhookUrl" placeholder="https://seu-n8n.com/webhook/gestao-vps" value={gestaoVpsWebhookUrl} onChange={(e) => setGestaoVpsWebhookUrl(e.target.value)} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="vps" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Servidor VPS</CardTitle>
                <CardDescription>Credenciais SSH para acesso ao servidor</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <LabelComTooltip
                      htmlFor="vpsIp"
                      tooltip="Onde encontrar: No painel da sua VPS (DigitalOcean, AWS, etc.) ou use o IP que você usa para SSH. Para que serve: Endereço do servidor onde o app será implantado."
                    >
                      IP do servidor
                    </LabelComTooltip>
                    <Input id="vpsIp" placeholder="203.0.113.10" value={vpsIp} onChange={(e) => setVpsIp(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <LabelComTooltip
                      htmlFor="vpsUser"
                      tooltip="Onde encontrar: O usuário que você usa para fazer SSH no servidor (ex: ssh root@IP). Para que serve: Usuário SSH para conectar e enviar os arquivos."
                    >
                      Usuário SSH
                    </LabelComTooltip>
                    <Input id="vpsUser" placeholder="root" value={vpsUser} onChange={(e) => setVpsUser(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <LabelComTooltip
                    htmlFor="vpsPassword"
                    tooltip="Onde encontrar: A senha do usuário SSH (definida ao criar a VPS). Para que serve: Autenticação para SCP/SSH. Requer sshpass instalado. Deixe em branco se usar chave SSH."
                  >
                    Senha SSH (ou deixe em branco para usar chave)
                  </LabelComTooltip>
                  <Input id="vpsPassword" type="password" placeholder="Senha do servidor" value={vpsPassword} onChange={(e) => setVpsPassword(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <LabelComTooltip
                    tooltip="Onde encontrar: Arquivo ~/.ssh/id_rsa ou id_ed25519 (copie o conteúdo completo). Para que serve: Alternativa mais segura à senha. Cole a chave privada completa incluindo BEGIN e END."
                  >
                    Chave SSH privada (alternativa à senha)
                  </LabelComTooltip>
                  <textarea
                    className="w-full min-h-[120px] rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    placeholder="-----BEGIN OPENSSH PRIVATE KEY-----&#10;...&#10;-----END OPENSSH PRIVATE KEY-----"
                    value={vpsSshKey}
                    onChange={(e) => setVpsSshKey(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <LabelComTooltip
                    htmlFor="dominio"
                    tooltip="Onde encontrar: Subdomínio que você configurou no DNS (ex: app.seudominio.com). Para que serve: Se informado e você tiver Traefik na VPS, o script configura HTTPS automático com Let's Encrypt."
                  >
                    Domínio (opcional - para Traefik + HTTPS)
                  </LabelComTooltip>
                  <Input id="dominio" placeholder="app.seudominio.com" value={dominio} onChange={(e) => setDominio(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <LabelComTooltip
                    htmlFor="nomeContainer"
                    tooltip="Onde encontrar: Nome que você escolhe para o container. Para que serve: Nome do container Docker na VPS. Use o padrão 'flowatend' ou personalize se tiver múltiplas instâncias."
                  >
                    Nome do container Docker
                  </LabelComTooltip>
                  <Input id="nomeContainer" placeholder="flowatend" value={nomeContainer} onChange={(e) => setNomeContainer(e.target.value)} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Gerar e baixar script
            </CardTitle>
            <CardDescription>
              O script fará: clone/build → envio para VPS → docker build → docker run
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button onClick={handleDownloadBash} className="gap-2">
              <Download className="h-4 w-4" />
              Baixar script bash (Linux/Mac)
            </Button>
            <Button variant="outline" onClick={handleDownloadConfig} className="gap-2">
              Baixar configuração (JSON)
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
    </TooltipProvider>
  );
}
