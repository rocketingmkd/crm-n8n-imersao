-- ============================================================
-- FlowAtend — Instalação do Banco de Dados
-- ============================================================
-- Execute este arquivo UMA VEZ em um banco Supabase limpo.
-- Representa o estado final e definitivo do banco de dados.
-- Inclui: tabelas, funções, RLS, storage bucket de logos.
-- ============================================================

-- ============================================================
-- EXTENSÕES
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================================
-- FUNÇÕES AUXILIARES
-- ============================================================

-- Gera identificador URL-friendly a partir de um nome
CREATE OR REPLACE FUNCTION gerar_identificador(name text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  slug text;
BEGIN
  slug := lower(name);
  slug := regexp_replace(slug, '[àáâãäå]', 'a', 'g');
  slug := regexp_replace(slug, '[èéêë]',   'e', 'g');
  slug := regexp_replace(slug, '[ìíîï]',   'i', 'g');
  slug := regexp_replace(slug, '[òóôõö]',  'o', 'g');
  slug := regexp_replace(slug, '[ùúûü]',   'u', 'g');
  slug := regexp_replace(slug, '[ç]',      'c', 'g');
  slug := regexp_replace(slug, '[ñ]',      'n', 'g');
  slug := regexp_replace(slug, '[^a-z0-9\s-]', '', 'g');
  slug := regexp_replace(slug, '[\s]+',    '-', 'g');
  slug := regexp_replace(slug, '-+',       '-', 'g');
  slug := trim(both '-' from slug);
  RETURN slug;
END;
$$;

-- Retorna o id_organizacao do usuário autenticado
CREATE OR REPLACE FUNCTION obter_id_organizacao_usuario()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT id_organizacao
  FROM perfis
  WHERE id = auth.uid();
$$;

-- Verifica se o usuário autenticado é super admin
CREATE OR REPLACE FUNCTION usuario_e_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(super_admin, false)
  FROM perfis
  WHERE id = auth.uid();
$$;

-- Trigger para atualizar atualizado_em automaticamente
CREATE OR REPLACE FUNCTION trigger_atualizado_em()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$;

-- ============================================================
-- TABELA: organizacoes
-- ============================================================

CREATE TABLE IF NOT EXISTS organizacoes (
  id                    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  criado_em             timestamptz DEFAULT now(),
  nome                  text NOT NULL,
  identificador         text NOT NULL UNIQUE,
  dados                 jsonb DEFAULT '{}'::jsonb,
  ativo                 boolean DEFAULT true,
  url_logo              text,
  email_contato         text,
  plano_assinatura      text DEFAULT 'plano_a',
  recursos_plano        jsonb DEFAULT '{}'::jsonb,
  duracao_atendimento   integer,
  rotulo_entidade       text NOT NULL DEFAULT 'Cliente',
  rotulo_entidade_plural text NOT NULL DEFAULT 'Clientes'
);

ALTER TABLE organizacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_acesso_total_organizacoes" ON organizacoes
  USING (usuario_e_super_admin());

CREATE POLICY "usuarios_ver_propria_organizacao" ON organizacoes
  FOR SELECT USING (id = obter_id_organizacao_usuario());

GRANT ALL ON organizacoes TO authenticated;

-- ============================================================
-- TABELA: perfis
-- ============================================================

CREATE TABLE IF NOT EXISTS perfis (
  id              uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  id_organizacao  uuid REFERENCES organizacoes(id) ON DELETE CASCADE,
  criado_em       timestamptz DEFAULT now(),
  nome_completo   text NOT NULL,
  funcao          text NOT NULL DEFAULT 'admin'
                  CHECK (funcao IN ('admin', 'profissional', 'assistente')),
  url_avatar      text,
  ativo           boolean DEFAULT true,
  super_admin     boolean DEFAULT false,
  -- Um super admin não deve ter organização vinculada
  CONSTRAINT perfis_super_admin_sem_org_check CHECK (
    NOT (super_admin = true AND id_organizacao IS NOT NULL)
  )
);

ALTER TABLE perfis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_acesso_total_perfis" ON perfis
  USING (usuario_e_super_admin());

CREATE POLICY "usuarios_ver_perfis_da_org" ON perfis
  FOR SELECT USING (id_organizacao = obter_id_organizacao_usuario());

CREATE POLICY "usuarios_atualizar_proprio_perfil" ON perfis
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "usuarios_criar_perfil_na_org" ON perfis
  FOR INSERT WITH CHECK (id_organizacao = obter_id_organizacao_usuario());

GRANT ALL ON perfis TO authenticated;

-- ============================================================
-- TABELA: contatos
-- ============================================================

CREATE TABLE IF NOT EXISTS contatos (
  id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_organizacao     uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  criado_em          timestamptz DEFAULT now(),
  nome               text,
  email              text,
  telefone           text NOT NULL,
  situacao           text DEFAULT 'ativo' CHECK (situacao IN ('ativo', 'inativo')),
  ultima_interacao   timestamptz,
  total_interacoes   integer DEFAULT 0,
  status_kanban      text DEFAULT 'novo_contato'
                     CHECK (status_kanban IN (
                       'novo_contato', 'qualificado', 'em_atendimento',
                       'agendado', 'aguardando_confirmacao', 'concluido'
                     )),
  observacoes        text,
  resumo             text,
  id_sessao          text
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'contatos' AND column_name = 'tipo_pessoa') THEN
    ALTER TABLE contatos ADD COLUMN tipo_pessoa text DEFAULT 'pf' CHECK (tipo_pessoa IN ('pf', 'pj'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'contatos' AND column_name = 'cpf_cnpj') THEN
    ALTER TABLE contatos ADD COLUMN cpf_cnpj text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'contatos' AND column_name = 'url_foto') THEN
    ALTER TABLE contatos ADD COLUMN url_foto text;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS contatos_id_organizacao_idx ON contatos(id_organizacao);
CREATE INDEX IF NOT EXISTS contatos_status_kanban_idx   ON contatos(status_kanban);
CREATE INDEX IF NOT EXISTS contatos_situacao_idx        ON contatos(situacao);

ALTER TABLE contatos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_acesso_total_contatos" ON contatos
  USING (usuario_e_super_admin());

CREATE POLICY "usuarios_crud_contatos_da_org" ON contatos
  USING (id_organizacao = obter_id_organizacao_usuario())
  WITH CHECK (id_organizacao = obter_id_organizacao_usuario());

GRANT ALL ON contatos TO authenticated;

-- ============================================================
-- TABELA: agendamentos
-- ============================================================

CREATE TABLE IF NOT EXISTS agendamentos (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_organizacao      uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  id_contato          uuid REFERENCES contatos(id) ON DELETE SET NULL,
  criado_em           timestamptz DEFAULT now(),
  data                date NOT NULL,
  hora                text NOT NULL,
  inicio              text,  -- ISO8601 com timezone, ex: 2025-11-25T09:00:00-03:00
  fim                 text,  -- ISO8601 com timezone, ex: 2025-11-25T10:00:00-03:00
  nome_contato        text NOT NULL,
  tipo                text NOT NULL,
  situacao            text DEFAULT 'pendente'
                      CHECK (situacao IN ('confirmado', 'pendente', 'concluido', 'cancelado')),
  notas               text,
  observacoes         text,
  id_sessao           text,
  lembrete_1_enviado  boolean DEFAULT false,
  lembrete_2_enviado  boolean DEFAULT false,
  lembrete_3_enviado  boolean DEFAULT false
);

CREATE INDEX IF NOT EXISTS agendamentos_id_organizacao_idx ON agendamentos(id_organizacao);
CREATE INDEX IF NOT EXISTS agendamentos_data_idx           ON agendamentos(data);
CREATE INDEX IF NOT EXISTS agendamentos_situacao_idx       ON agendamentos(situacao);
CREATE INDEX IF NOT EXISTS agendamentos_id_sessao_idx      ON agendamentos(id_sessao);

ALTER TABLE agendamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_acesso_total_agendamentos" ON agendamentos
  USING (usuario_e_super_admin());

CREATE POLICY "usuarios_crud_agendamentos_da_org" ON agendamentos
  USING (id_organizacao = obter_id_organizacao_usuario())
  WITH CHECK (id_organizacao = obter_id_organizacao_usuario());

GRANT ALL ON agendamentos TO authenticated;

-- ============================================================
-- TABELA: tipos_atendimento (cadastro por organização)
-- ============================================================

CREATE TABLE IF NOT EXISTS tipos_atendimento (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_organizacao   uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  nome             text NOT NULL,
  ativo            boolean DEFAULT true,
  ordem            integer DEFAULT 0,
  criado_em        timestamptz DEFAULT now(),
  atualizado_em    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tipos_atendimento_id_organizacao_idx ON tipos_atendimento(id_organizacao);

CREATE TRIGGER trigger_tipos_atendimento_atualizado_em
  BEFORE UPDATE ON tipos_atendimento
  FOR EACH ROW EXECUTE FUNCTION trigger_atualizado_em();

ALTER TABLE tipos_atendimento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_acesso_total_tipos_atendimento" ON tipos_atendimento
  USING (usuario_e_super_admin());

CREATE POLICY "usuarios_crud_tipos_atendimento_da_org" ON tipos_atendimento
  USING (id_organizacao = obter_id_organizacao_usuario())
  WITH CHECK (id_organizacao = obter_id_organizacao_usuario());

GRANT ALL ON tipos_atendimento TO authenticated;

-- ============================================================
-- TABELA: configuracoes
-- ============================================================

CREATE TABLE IF NOT EXISTS configuracoes (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_organizacao  uuid NOT NULL UNIQUE REFERENCES organizacoes(id) ON DELETE CASCADE,
  criado_em       timestamptz DEFAULT now(),
  nome_empresa    text NOT NULL,
  nome_responsavel text NOT NULL,
  plano_assinatura text,
  renovacao_em    timestamptz
);

ALTER TABLE configuracoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_acesso_total_configuracoes" ON configuracoes
  USING (usuario_e_super_admin());

CREATE POLICY "usuarios_crud_configuracoes_da_org" ON configuracoes
  USING (id_organizacao = obter_id_organizacao_usuario())
  WITH CHECK (id_organizacao = obter_id_organizacao_usuario());

GRANT ALL ON configuracoes TO authenticated;

-- ============================================================
-- TABELA: config_agente_ia
-- ============================================================

CREATE TABLE IF NOT EXISTS config_agente_ia (
  id                          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_organizacao              uuid NOT NULL UNIQUE REFERENCES organizacoes(id) ON DELETE CASCADE,
  criado_em                   timestamptz DEFAULT now(),
  atualizado_em               timestamptz DEFAULT now(),
  nome_agente                 text NOT NULL DEFAULT 'Assistente',
  personalidade               text NOT NULL DEFAULT 'Sou um assistente virtual educado e prestativo.',
  pausa_segundos              integer NOT NULL DEFAULT 5,
  pausa_cliente_segundos      integer DEFAULT 30,
  mensagem_boas_vindas        text NOT NULL DEFAULT 'Olá! Como posso ajudá-lo?',
  mensagem_encerramento       text NOT NULL DEFAULT 'Obrigado pelo contato!',
  chave_openai                text,
  email_confirmacao_html      text,
  followup_1_minutos          integer,
  followup_2_minutos          integer,
  followup_3_minutos          integer,
  lembrete_1_minutos          integer,
  lembrete_2_minutos          integer,
  lembrete_3_minutos          integer,
  perguntas_qualificacao      jsonb
);

CREATE TRIGGER trigger_config_agente_ia_atualizado_em
  BEFORE UPDATE ON config_agente_ia
  FOR EACH ROW EXECUTE FUNCTION trigger_atualizado_em();

ALTER TABLE config_agente_ia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_acesso_total_config_agente_ia" ON config_agente_ia
  USING (usuario_e_super_admin());

CREATE POLICY "usuarios_crud_config_agente_ia_da_org" ON config_agente_ia
  USING (id_organizacao = obter_id_organizacao_usuario())
  WITH CHECK (id_organizacao = obter_id_organizacao_usuario());

GRANT ALL ON config_agente_ia TO authenticated;

-- ============================================================
-- TABELA: instancias_whatsapp
-- ============================================================

CREATE TABLE IF NOT EXISTS instancias_whatsapp (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_organizacao    uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  criado_em         timestamptz DEFAULT now(),
  atualizado_em     timestamptz DEFAULT now(),
  id_instancia      text NOT NULL,
  token             text NOT NULL,
  nome_instancia    text NOT NULL,
  campo_admin_01    text NOT NULL,
  telefone          text NOT NULL,
  webhook_criado    text,
  situacao          text NOT NULL DEFAULT 'pendente'
                    CHECK (situacao IN ('pendente', 'conectado', 'desconectado', 'erro')),
  qr_code           text,
  codigo_pareamento text,
  url_webhook       text
);

CREATE TRIGGER trigger_instancias_whatsapp_atualizado_em
  BEFORE UPDATE ON instancias_whatsapp
  FOR EACH ROW EXECUTE FUNCTION trigger_atualizado_em();

ALTER TABLE instancias_whatsapp ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_acesso_total_instancias_whatsapp" ON instancias_whatsapp
  USING (usuario_e_super_admin());

CREATE POLICY "usuarios_crud_instancias_whatsapp_da_org" ON instancias_whatsapp
  USING (id_organizacao = obter_id_organizacao_usuario())
  WITH CHECK (id_organizacao = obter_id_organizacao_usuario());

GRANT ALL ON instancias_whatsapp TO authenticated;

-- ============================================================
-- TABELA: horarios_trabalho
-- ============================================================

CREATE TABLE IF NOT EXISTS horarios_trabalho (
  id                      uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_organizacao          uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  id_usuario              uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  criado_em               timestamptz DEFAULT now(),
  atualizado_em           timestamptz DEFAULT now(),
  duracao_atendimento     integer DEFAULT 60,

  -- Domingo
  domingo_ativo           boolean DEFAULT false,
  domingo_inicio_trabalho text,
  domingo_fim_trabalho    text,
  domingo_inicio_almoco   text,
  domingo_fim_almoco      text,

  -- Segunda
  segunda_ativo           boolean DEFAULT true,
  segunda_inicio_trabalho text DEFAULT '08:00',
  segunda_fim_trabalho    text DEFAULT '18:00',
  segunda_inicio_almoco   text DEFAULT '12:00',
  segunda_fim_almoco      text DEFAULT '13:00',

  -- Terça
  terca_ativo             boolean DEFAULT true,
  terca_inicio_trabalho   text DEFAULT '08:00',
  terca_fim_trabalho      text DEFAULT '18:00',
  terca_inicio_almoco     text DEFAULT '12:00',
  terca_fim_almoco        text DEFAULT '13:00',

  -- Quarta
  quarta_ativo            boolean DEFAULT true,
  quarta_inicio_trabalho  text DEFAULT '08:00',
  quarta_fim_trabalho     text DEFAULT '18:00',
  quarta_inicio_almoco    text DEFAULT '12:00',
  quarta_fim_almoco       text DEFAULT '13:00',

  -- Quinta
  quinta_ativo            boolean DEFAULT true,
  quinta_inicio_trabalho  text DEFAULT '08:00',
  quinta_fim_trabalho     text DEFAULT '18:00',
  quinta_inicio_almoco    text DEFAULT '12:00',
  quinta_fim_almoco       text DEFAULT '13:00',

  -- Sexta
  sexta_ativo             boolean DEFAULT true,
  sexta_inicio_trabalho   text DEFAULT '08:00',
  sexta_fim_trabalho      text DEFAULT '18:00',
  sexta_inicio_almoco     text DEFAULT '12:00',
  sexta_fim_almoco        text DEFAULT '13:00',

  -- Sábado
  sabado_ativo            boolean DEFAULT false,
  sabado_inicio_trabalho  text,
  sabado_fim_trabalho     text,
  sabado_inicio_almoco    text,
  sabado_fim_almoco       text,

  UNIQUE(id_organizacao, id_usuario)
);

CREATE TRIGGER trigger_horarios_trabalho_atualizado_em
  BEFORE UPDATE ON horarios_trabalho
  FOR EACH ROW EXECUTE FUNCTION trigger_atualizado_em();

ALTER TABLE horarios_trabalho ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_acesso_total_horarios_trabalho" ON horarios_trabalho
  USING (usuario_e_super_admin());

CREATE POLICY "usuarios_crud_horarios_da_org" ON horarios_trabalho
  USING (id_organizacao = obter_id_organizacao_usuario())
  WITH CHECK (id_organizacao = obter_id_organizacao_usuario());

GRANT ALL ON horarios_trabalho TO authenticated;

-- ============================================================
-- TABELA: planos_assinatura
-- ============================================================

CREATE TABLE IF NOT EXISTS planos_assinatura (
  id                        uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_plano                  text NOT NULL UNIQUE,
  nome_plano                text NOT NULL,
  descricao_plano           text,
  -- Features booleanas
  atendimento_inteligente   boolean DEFAULT false,
  agendamento_automatico    boolean DEFAULT false,
  lembretes_automaticos     boolean DEFAULT false,
  confirmacao_email         boolean DEFAULT false,
  base_conhecimento         boolean DEFAULT false,
  relatorios_avancados      boolean DEFAULT false,
  integracao_whatsapp       boolean DEFAULT false,
  multi_usuarios            boolean DEFAULT false,
  personalizacao_agente     boolean DEFAULT false,
  analytics                 boolean DEFAULT false,
  -- Limites numéricos (null = ilimitado)
  max_agendamentos_mes       integer,
  max_mensagens_whatsapp_mes integer,
  max_usuarios               integer,
  max_contatos               integer,
  max_arquivos_conhecimento   integer,
image.png  -- Integração n8n
  workflow_id_n8n            text,
  -- Preços
  preco_mensal               numeric(10,2),
  preco_anual               numeric(10,2),
  criado_em                 timestamptz DEFAULT now(),
  atualizado_em             timestamptz DEFAULT now()
);

ALTER TABLE planos_assinatura ENABLE ROW LEVEL SECURITY;

CREATE POLICY "todos_podem_ver_planos" ON planos_assinatura
  FOR SELECT USING (true);

CREATE POLICY "super_admin_gerencia_planos" ON planos_assinatura
  USING (usuario_e_super_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON planos_assinatura TO authenticated;
GRANT ALL    ON planos_assinatura TO service_role;

-- Dados iniciais dos planos
INSERT INTO planos_assinatura (
  id_plano, nome_plano, descricao_plano,
  atendimento_inteligente, agendamento_automatico, lembretes_automaticos,
  confirmacao_email, base_conhecimento, relatorios_avancados,
  integracao_whatsapp, multi_usuarios, personalizacao_agente, analytics,
  max_agendamentos_mes, max_mensagens_whatsapp_mes, max_usuarios, max_contatos, max_arquivos_conhecimento,
  preco_mensal, preco_anual
) VALUES
  -- Plano A — Atendimento básico
  ('plano_a', 'Plano Starter', 'Atendimento inteligente via WhatsApp',
   true, false, false, false, false, false, true, false, false, false,
   50, 500, 1, 100, NULL,
   97.00, 970.00),
  -- Plano B — + Agendamento
  ('plano_b', 'Plano Profissional', 'Atendimento + Agendamento automático',
   true, true, true, false, true, false, true, false, true, false,
   200, 2000, 3, 500, 50,
   197.00, 1970.00),
  -- Plano C — Completo
  ('plano_c', 'Plano Business', 'Solução completa para empresas',
   true, true, true, true, true, true, true, true, true, true,
   1000, 10000, 10, 2000, 200,
   397.00, 3970.00),
  -- Plano D — Enterprise
  ('plano_d', 'Plano Enterprise', 'Sem limites para grandes operações',
   true, true, true, true, true, true, true, true, true, true,
   NULL, NULL, NULL, NULL, NULL,
   797.00, 7970.00)
ON CONFLICT (id_plano) DO UPDATE SET
  nome_plano                 = EXCLUDED.nome_plano,
  descricao_plano            = EXCLUDED.descricao_plano,
  atendimento_inteligente    = EXCLUDED.atendimento_inteligente,
  agendamento_automatico     = EXCLUDED.agendamento_automatico,
  lembretes_automaticos      = EXCLUDED.lembretes_automaticos,
  confirmacao_email          = EXCLUDED.confirmacao_email,
  base_conhecimento          = EXCLUDED.base_conhecimento,
  relatorios_avancados       = EXCLUDED.relatorios_avancados,
  integracao_whatsapp        = EXCLUDED.integracao_whatsapp,
  multi_usuarios             = EXCLUDED.multi_usuarios,
  personalizacao_agente      = EXCLUDED.personalizacao_agente,
  analytics                  = EXCLUDED.analytics,
  max_agendamentos_mes       = EXCLUDED.max_agendamentos_mes,
  max_mensagens_whatsapp_mes = EXCLUDED.max_mensagens_whatsapp_mes,
  max_usuarios               = EXCLUDED.max_usuarios,
  max_contatos               = EXCLUDED.max_contatos,
  max_arquivos_conhecimento  = EXCLUDED.max_arquivos_conhecimento,
  preco_mensal               = EXCLUDED.preco_mensal,
  preco_anual                = EXCLUDED.preco_anual;

-- Garantir coluna em instalações antigas (compatível com PostgreSQL < 11)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'planos_assinatura' AND column_name = 'max_arquivos_conhecimento'
  ) THEN
    ALTER TABLE planos_assinatura ADD COLUMN max_arquivos_conhecimento integer;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'planos_assinatura' AND column_name = 'workflow_id_n8n'
  ) THEN
    ALTER TABLE planos_assinatura ADD COLUMN workflow_id_n8n text;
  END IF;
END $$;

-- ============================================================
-- TABELA: uso_tokens
-- ============================================================

CREATE TABLE IF NOT EXISTS uso_tokens (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_organizacao  uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  criado_em       timestamptz DEFAULT now(),
  total_tokens    integer NOT NULL DEFAULT 0,
  custo_reais     numeric(15,8) NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS uso_tokens_id_organizacao_idx ON uso_tokens(id_organizacao);
CREATE INDEX IF NOT EXISTS uso_tokens_criado_em_idx      ON uso_tokens(criado_em);

ALTER TABLE uso_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_acesso_total_uso_tokens" ON uso_tokens
  USING (usuario_e_super_admin());

CREATE POLICY "usuarios_ver_uso_tokens_da_org" ON uso_tokens
  FOR SELECT USING (id_organizacao = obter_id_organizacao_usuario());

GRANT SELECT ON uso_tokens TO authenticated;
GRANT ALL    ON uso_tokens TO service_role;

-- ============================================================
-- TABELA: configuracoes_globais
-- ============================================================

CREATE TABLE IF NOT EXISTS configuracoes_globais (
  id                       uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  criado_em                timestamptz DEFAULT now(),
  atualizado_em            timestamptz DEFAULT now(),
  whatsapp_suporte         text,
  email_suporte            text,
  chave_openai             text,
  nome_plataforma          text NOT NULL DEFAULT 'FlowAtend',
  url_logo_plataforma      text,
  url_logo_plataforma_escuro text,
  cor_primaria             text DEFAULT '#D9156C',
  chave_elevenlabs         text,
  id_voz_elevenlabs        text,
  fonte_sistema            text DEFAULT 'inter'
                           CHECK (fonte_sistema IN ('open-sans', 'inter', 'dm-sans', 'plus-jakarta', 'poppins', 'raleway', 'space-grotesk', 'outfit', 'manrope', 'nunito')),
  frase_login              text DEFAULT 'Seu universo de automações espera'
);

CREATE TRIGGER trigger_configuracoes_globais_atualizado_em
  BEFORE UPDATE ON configuracoes_globais
  FOR EACH ROW EXECUTE FUNCTION trigger_atualizado_em();

ALTER TABLE configuracoes_globais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_gerencia_configuracoes_globais" ON configuracoes_globais
  USING (usuario_e_super_admin());

CREATE POLICY "autenticados_podem_ver_configuracoes_globais" ON configuracoes_globais
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Permite leitura pública (ex: logo na página de login, cor da plataforma)
CREATE POLICY "anonimos_podem_ver_configuracoes_globais" ON configuracoes_globais
  FOR SELECT TO anon USING (true);

GRANT SELECT ON configuracoes_globais TO authenticated;
GRANT SELECT ON configuracoes_globais TO anon;
GRANT ALL    ON configuracoes_globais TO service_role;

-- Registro padrão da plataforma
INSERT INTO configuracoes_globais (id, nome_plataforma)
VALUES ('00000000-0000-0000-0000-000000000001', 'FlowAtend')
ON CONFLICT (id) DO NOTHING;

-- Adicionar coluna email_suporte se não existir (instalações já existentes)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'configuracoes_globais' AND column_name = 'email_suporte'
  ) THEN
    ALTER TABLE configuracoes_globais ADD COLUMN email_suporte text;
  END IF;
END $$;

-- View pública para branding (logo, nome, cor) — legível por anon para a tela de login
CREATE OR REPLACE VIEW configuracoes_globais_branding AS
SELECT id, nome_plataforma, url_logo_plataforma, url_logo_plataforma_escuro, cor_primaria
FROM configuracoes_globais
LIMIT 1;

GRANT SELECT ON configuracoes_globais_branding TO anon;
GRANT SELECT ON configuracoes_globais_branding TO authenticated;

-- ============================================================
-- TABELA: mensagens (contagem de mensagens WhatsApp por organização)
-- Para consumo dos planos e relatórios. n8n pode inserir ao enviar mensagem.
-- ============================================================

CREATE TABLE IF NOT EXISTS mensagens (
  id              bigserial PRIMARY KEY,
  id_organizacao  uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  criado_em       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mensagens_id_organizacao_idx ON mensagens(id_organizacao);
CREATE INDEX IF NOT EXISTS mensagens_criado_em_idx ON mensagens(criado_em);

ALTER TABLE mensagens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_acesso_total_mensagens" ON mensagens
  USING (usuario_e_super_admin());

GRANT ALL ON mensagens TO service_role;
GRANT SELECT, INSERT ON mensagens TO authenticated;

-- ============================================================
-- TABELA: documentos (RAG — base de conhecimento geral)
-- Criada pelo n8n. Aqui provisionamos com estrutura compatível.
-- ============================================================

CREATE TABLE IF NOT EXISTS documentos (
  id        bigserial PRIMARY KEY,
  content  text,
  embedding vector(1536),
  metadata jsonb,
  titulo    text
);

ALTER TABLE documentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_acesso_total_documentos" ON documentos
  USING (usuario_e_super_admin());

GRANT ALL ON documentos TO service_role;
GRANT SELECT, INSERT, UPDATE ON documentos TO authenticated;

-- Funções de busca vetorial
CREATE OR REPLACE FUNCTION match_documents_geral(
  query_embedding vector(1536),
  match_count     int,
  filter          jsonb DEFAULT '{}'
)
RETURNS TABLE (
  id          bigint,
  conteudo    text,
  metadados   jsonb,
  similarity  float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    documentos.id,
    documentos.content AS conteudo,
    documentos.metadata AS metadados,
    1 - (documentos.embedding <=> query_embedding) AS similarity
  FROM documentos
  WHERE documentos.metadata @> filter
  ORDER BY documentos.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(1536),
  match_count     int DEFAULT 5,
  filter          jsonb DEFAULT '{}'
)
RETURNS TABLE (
  id          bigint,
  conteudo    text,
  metadados   jsonb,
  similarity  float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM match_documents_geral(query_embedding, match_count, filter);
END;
$$;

CREATE OR REPLACE FUNCTION match_documents_dynamic(
  query_embedding vector(1536),
  table_name      text,
  match_count     int DEFAULT 5,
  filter          jsonb DEFAULT '{}'
)
RETURNS TABLE (
  id          bigint,
  conteudo    text,
  metadados   jsonb,
  similarity  float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY EXECUTE format(
    'SELECT id, conteudo, metadados,
            1 - (embedding <=> $1) AS similarity
     FROM %I
     WHERE metadados @> $2
     ORDER BY embedding <=> $1
     LIMIT $3',
    table_name
  ) USING query_embedding, filter, match_count;
END;
$$;

-- ============================================================
-- TABELA: clientes_followup
-- Criada pelo n8n. Provisionamos a estrutura básica aqui.
-- ============================================================

CREATE TABLE IF NOT EXISTS clientes_followup (
  id                 bigserial PRIMARY KEY,
  id_organizacao     uuid,
  id_sessao          text,
  nome               text,
  numero             text,
  situacao           text,
  followup           text,
  followup1          text,
  followup2          text,
  followup3          text,
  mensagem1          text,
  mensagem2          text,
  mensagem3          text,
  data_envio1        text,
  data_envio2        text,
  data_envio3        text,
  ultima_atividade   text,
  ultima_mensagem_ia text
);

ALTER TABLE clientes_followup ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_acesso_total_followup" ON clientes_followup
  USING (usuario_e_super_admin());

GRANT ALL ON clientes_followup TO service_role;

-- ============================================================
-- STORAGE — Bucket para logos de organizações
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'organization-logos',
  'organization-logos',
  true,
  2097152,
  ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'autenticados_podem_enviar_logos' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "autenticados_podem_enviar_logos" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'organization-logos');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'autenticados_podem_atualizar_logos' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "autenticados_podem_atualizar_logos" ON storage.objects
      FOR UPDATE TO authenticated
      USING (bucket_id = 'organization-logos');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'autenticados_podem_excluir_logos' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "autenticados_podem_excluir_logos" ON storage.objects
      FOR DELETE TO authenticated
      USING (bucket_id = 'organization-logos');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'logos_publicas' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "logos_publicas" ON storage.objects
      FOR SELECT
      USING (bucket_id = 'organization-logos');
  END IF;
END $$;

-- ============================================================
-- STORAGE — Bucket para fotos de perfil (avatares)
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152,
  ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'usuarios_podem_enviar_avatar' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "usuarios_podem_enviar_avatar" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = 'avatars'
        AND (
          (storage.foldername(name))[1] = auth.uid()::text
          OR name LIKE auth.uid()::text || '/%'
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'usuarios_podem_atualizar_avatar' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "usuarios_podem_atualizar_avatar" ON storage.objects
      FOR UPDATE TO authenticated
      USING (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'usuarios_podem_excluir_avatar' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "usuarios_podem_excluir_avatar" ON storage.objects
      FOR DELETE TO authenticated
      USING (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'avatars_publicos' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "avatars_publicos" ON storage.objects
      FOR SELECT
      USING (bucket_id = 'avatars');
  END IF;
END $$;

-- ============================================================
-- STORAGE — Bucket para fotos de clientes (contatos)
-- Caminho: {id_organizacao}/{id_contato}/{filename}
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'client-photos',
  'client-photos',
  true,
  2097152,
  ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'client_photos_insert_org' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "client_photos_insert_org" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = 'client-photos'
        AND (storage.foldername(name))[1] = obter_id_organizacao_usuario()::text
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'client_photos_select' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "client_photos_select" ON storage.objects
      FOR SELECT
      USING (bucket_id = 'client-photos');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'client_photos_update_org' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "client_photos_update_org" ON storage.objects
      FOR UPDATE TO authenticated
      USING (
        bucket_id = 'client-photos'
        AND (storage.foldername(name))[1] = obter_id_organizacao_usuario()::text
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'client_photos_delete_org' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "client_photos_delete_org" ON storage.objects
      FOR DELETE TO authenticated
      USING (
        bucket_id = 'client-photos'
        AND (storage.foldername(name))[1] = obter_id_organizacao_usuario()::text
      );
  END IF;
END $$;

-- ============================================================
-- TRIGGER AUTOMÁTICO DE PERFIL (opcional)
-- Cria perfil básico quando usuário se cadastra via Auth UI
-- ============================================================

CREATE OR REPLACE FUNCTION criar_perfil_ao_registrar()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Só cria perfil se não existir (evita duplicatas no fluxo via edge function)
  INSERT INTO perfis (id, nome_completo, funcao)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'admin'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- ============================================================
-- ANOTAÇÕES / TAREFAS (Dashboard)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.anotacoes_tarefas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_organizacao UUID NOT NULL REFERENCES public.organizacoes(id) ON DELETE CASCADE,
  id_usuario UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  status TEXT NOT NULL DEFAULT 'a_fazer' CHECK (status IN ('a_fazer', 'fazendo', 'feito')),
  data_finalizacao TIMESTAMPTZ,
  notificar BOOLEAN NOT NULL DEFAULT false,
  antecedencia_minutos INTEGER DEFAULT 30 CHECK (antecedencia_minutos IN (30, 60, 120)),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_anotacoes_tarefas_org ON public.anotacoes_tarefas(id_organizacao);
CREATE INDEX idx_anotacoes_tarefas_usuario ON public.anotacoes_tarefas(id_usuario);
CREATE INDEX idx_anotacoes_tarefas_status ON public.anotacoes_tarefas(status);

CREATE TRIGGER set_atualizado_em_anotacoes_tarefas
  BEFORE UPDATE ON public.anotacoes_tarefas
  FOR EACH ROW
  EXECUTE FUNCTION trigger_atualizado_em();

ALTER TABLE public.anotacoes_tarefas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios podem ver tarefas da sua org"
  ON public.anotacoes_tarefas FOR SELECT
  USING (id_organizacao = obter_id_organizacao_usuario());

CREATE POLICY "Usuarios podem criar tarefas na sua org"
  ON public.anotacoes_tarefas FOR INSERT
  WITH CHECK (id_organizacao = obter_id_organizacao_usuario());

CREATE POLICY "Usuarios podem atualizar tarefas da sua org"
  ON public.anotacoes_tarefas FOR UPDATE
  USING (id_organizacao = obter_id_organizacao_usuario());

CREATE POLICY "Usuarios podem deletar tarefas da sua org"
  ON public.anotacoes_tarefas FOR DELETE
  USING (id_organizacao = obter_id_organizacao_usuario());

-- ============================================================
-- FIM DA INSTALAÇÃO
-- ============================================================
-- Próximos passos:
-- 1. Crie o primeiro super admin via SQL (veja INSTALACAO.md)
-- 2. Deploy das edge functions (supabase/functions/)
-- 3. Configure as variáveis de ambiente no .env
-- ============================================================
