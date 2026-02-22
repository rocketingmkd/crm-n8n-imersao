-- ============================================================
-- Migração 037: Refatoração completa para português snake_case
-- ============================================================
-- Idempotente: cada operação verifica se já foi aplicada.
-- ORDEM CRÍTICA:
--   Fase 1-2: Renomear tabelas e colunas
--   Fase 3:   DROP dos CHECK constraints antigos (sem ADD ainda)
--   Fase 4:   Migrar dados (active→ativo, connected→conectado…)
--   Fase 5:   ADD dos novos CHECK constraints PT (após dados migrados)
--   Fase 6:   Recriar funções auxiliares
--   Fase 7:   Renomear *_chats → *_conversas
-- ============================================================

-- ============================================================
-- FASE 1: Renomear tabelas
-- ============================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='organizations') THEN
    ALTER TABLE organizations RENAME TO organizacoes; END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='profiles') THEN
    ALTER TABLE profiles RENAME TO perfis; END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='contacts') THEN
    ALTER TABLE contacts RENAME TO contatos; END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='appointments') THEN
    ALTER TABLE appointments RENAME TO agendamentos; END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='settings') THEN
    ALTER TABLE settings RENAME TO configuracoes; END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='agent_ia_config') THEN
    ALTER TABLE agent_ia_config RENAME TO config_agente_ia; END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='whatsapp_instances') THEN
    ALTER TABLE whatsapp_instances RENAME TO instancias_whatsapp; END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='work_schedules') THEN
    ALTER TABLE work_schedules RENAME TO horarios_trabalho; END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='subscription_plan_configs') THEN
    ALTER TABLE subscription_plan_configs RENAME TO planos_assinatura; END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='token_usage') THEN
    ALTER TABLE token_usage RENAME TO uso_tokens; END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='global_settings') THEN
    ALTER TABLE global_settings RENAME TO configuracoes_globais; END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='documents_geral') THEN
    ALTER TABLE documents_geral RENAME TO documentos; END IF;
END $$;

-- ============================================================
-- FASE 2: Renomear colunas — organizacoes
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='organizacoes' AND column_name='created_at') THEN ALTER TABLE organizacoes RENAME COLUMN created_at TO criado_em; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='organizacoes' AND column_name='name') THEN ALTER TABLE organizacoes RENAME COLUMN name TO nome; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='organizacoes' AND column_name='is_active') THEN ALTER TABLE organizacoes RENAME COLUMN is_active TO ativo; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='organizacoes' AND column_name='logo_url') THEN ALTER TABLE organizacoes RENAME COLUMN logo_url TO url_logo; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='organizacoes' AND column_name='contact_email') THEN ALTER TABLE organizacoes RENAME COLUMN contact_email TO email_contato; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='organizacoes' AND column_name='subscription_plan') THEN ALTER TABLE organizacoes RENAME COLUMN subscription_plan TO plano_assinatura; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='organizacoes' AND column_name='plan_features') THEN ALTER TABLE organizacoes RENAME COLUMN plan_features TO recursos_plano; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='organizacoes' AND column_name='service_duration') THEN ALTER TABLE organizacoes RENAME COLUMN service_duration TO duracao_atendimento; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='organizacoes' AND column_name='settings') THEN ALTER TABLE organizacoes RENAME COLUMN settings TO dados; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='organizacoes' AND column_name='slug') THEN ALTER TABLE organizacoes RENAME COLUMN slug TO identificador; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='organizacoes' AND column_name='entity_label') THEN ALTER TABLE organizacoes RENAME COLUMN entity_label TO rotulo_entidade; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='organizacoes' AND column_name='entity_label_plural') THEN ALTER TABLE organizacoes RENAME COLUMN entity_label_plural TO rotulo_entidade_plural; END IF;
END $$;

-- ============================================================
-- FASE 2: Renomear colunas — perfis
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='perfis' AND column_name='organization_id') THEN ALTER TABLE perfis RENAME COLUMN organization_id TO id_organizacao; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='perfis' AND column_name='created_at') THEN ALTER TABLE perfis RENAME COLUMN created_at TO criado_em; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='perfis' AND column_name='full_name') THEN ALTER TABLE perfis RENAME COLUMN full_name TO nome_completo; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='perfis' AND column_name='role') THEN ALTER TABLE perfis RENAME COLUMN role TO funcao; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='perfis' AND column_name='avatar_url') THEN ALTER TABLE perfis RENAME COLUMN avatar_url TO url_avatar; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='perfis' AND column_name='is_active') THEN ALTER TABLE perfis RENAME COLUMN is_active TO ativo; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='perfis' AND column_name='is_super_admin') THEN ALTER TABLE perfis RENAME COLUMN is_super_admin TO super_admin; END IF;
END $$;

-- ============================================================
-- FASE 2: Renomear colunas — contatos
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contatos' AND column_name='organization_id') THEN ALTER TABLE contatos RENAME COLUMN organization_id TO id_organizacao; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contatos' AND column_name='created_at') THEN ALTER TABLE contatos RENAME COLUMN created_at TO criado_em; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contatos' AND column_name='name') THEN ALTER TABLE contatos RENAME COLUMN name TO nome; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contatos' AND column_name='phone') THEN ALTER TABLE contatos RENAME COLUMN phone TO telefone; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contatos' AND column_name='status') THEN ALTER TABLE contatos RENAME COLUMN status TO situacao; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contatos' AND column_name='last_interaction') THEN ALTER TABLE contatos RENAME COLUMN last_interaction TO ultima_interacao; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contatos' AND column_name='total_interactions') THEN ALTER TABLE contatos RENAME COLUMN total_interactions TO total_interacoes; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contatos' AND column_name='kanban_status') THEN ALTER TABLE contatos RENAME COLUMN kanban_status TO status_kanban; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contatos' AND column_name='observations') THEN ALTER TABLE contatos RENAME COLUMN observations TO observacoes; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contatos' AND column_name='summary') THEN ALTER TABLE contatos RENAME COLUMN summary TO resumo; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contatos' AND column_name='session_id') THEN ALTER TABLE contatos RENAME COLUMN session_id TO id_sessao; END IF;
END $$;

-- ============================================================
-- FASE 2: Renomear colunas — agendamentos
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='agendamentos' AND column_name='organization_id') THEN ALTER TABLE agendamentos RENAME COLUMN organization_id TO id_organizacao; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='agendamentos' AND column_name='created_at') THEN ALTER TABLE agendamentos RENAME COLUMN created_at TO criado_em; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='agendamentos' AND column_name='date') THEN ALTER TABLE agendamentos RENAME COLUMN date TO data; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='agendamentos' AND column_name='time') THEN ALTER TABLE agendamentos RENAME COLUMN time TO hora; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='agendamentos' AND column_name='start_datetime') THEN ALTER TABLE agendamentos RENAME COLUMN start_datetime TO inicio; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='agendamentos' AND column_name='end_datetime') THEN ALTER TABLE agendamentos RENAME COLUMN end_datetime TO fim; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='agendamentos' AND column_name='contact_id') THEN ALTER TABLE agendamentos RENAME COLUMN contact_id TO id_contato; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='agendamentos' AND column_name='contact_name') THEN ALTER TABLE agendamentos RENAME COLUMN contact_name TO nome_contato; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='agendamentos' AND column_name='type') THEN ALTER TABLE agendamentos RENAME COLUMN type TO tipo; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='agendamentos' AND column_name='status') THEN ALTER TABLE agendamentos RENAME COLUMN status TO situacao; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='agendamentos' AND column_name='notes') THEN ALTER TABLE agendamentos RENAME COLUMN notes TO notas; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='agendamentos' AND column_name='observations') THEN ALTER TABLE agendamentos RENAME COLUMN observations TO observacoes; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='agendamentos' AND column_name='session_id') THEN ALTER TABLE agendamentos RENAME COLUMN session_id TO id_sessao; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='agendamentos' AND column_name='reminder_1_sent') THEN ALTER TABLE agendamentos RENAME COLUMN reminder_1_sent TO lembrete_1_enviado; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='agendamentos' AND column_name='reminder_2_sent') THEN ALTER TABLE agendamentos RENAME COLUMN reminder_2_sent TO lembrete_2_enviado; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='agendamentos' AND column_name='reminder_3_sent') THEN ALTER TABLE agendamentos RENAME COLUMN reminder_3_sent TO lembrete_3_enviado; END IF;
END $$;

-- ============================================================
-- FASE 2: Renomear colunas — configuracoes
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='configuracoes' AND column_name='organization_id') THEN ALTER TABLE configuracoes RENAME COLUMN organization_id TO id_organizacao; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='configuracoes' AND column_name='created_at') THEN ALTER TABLE configuracoes RENAME COLUMN created_at TO criado_em; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='configuracoes' AND column_name='company_name') THEN ALTER TABLE configuracoes RENAME COLUMN company_name TO nome_empresa; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='configuracoes' AND column_name='owner_name') THEN ALTER TABLE configuracoes RENAME COLUMN owner_name TO nome_responsavel; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='configuracoes' AND column_name='subscription_plan') THEN ALTER TABLE configuracoes RENAME COLUMN subscription_plan TO plano_assinatura; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='configuracoes' AND column_name='subscription_renews_at') THEN ALTER TABLE configuracoes RENAME COLUMN subscription_renews_at TO renovacao_em; END IF;
END $$;

-- ============================================================
-- FASE 2: Renomear colunas — config_agente_ia
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='config_agente_ia' AND column_name='organization_id') THEN ALTER TABLE config_agente_ia RENAME COLUMN organization_id TO id_organizacao; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='config_agente_ia' AND column_name='created_at') THEN ALTER TABLE config_agente_ia RENAME COLUMN created_at TO criado_em; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='config_agente_ia' AND column_name='updated_at') THEN ALTER TABLE config_agente_ia RENAME COLUMN updated_at TO atualizado_em; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='config_agente_ia' AND column_name='agent_name') THEN ALTER TABLE config_agente_ia RENAME COLUMN agent_name TO nome_agente; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='config_agente_ia' AND column_name='personality') THEN ALTER TABLE config_agente_ia RENAME COLUMN personality TO personalidade; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='config_agente_ia' AND column_name='pause_duration_seconds') THEN ALTER TABLE config_agente_ia RENAME COLUMN pause_duration_seconds TO pausa_segundos; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='config_agente_ia' AND column_name='customer_pause_duration_seconds') THEN ALTER TABLE config_agente_ia RENAME COLUMN customer_pause_duration_seconds TO pausa_cliente_segundos; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='config_agente_ia' AND column_name='greeting_message') THEN ALTER TABLE config_agente_ia RENAME COLUMN greeting_message TO mensagem_boas_vindas; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='config_agente_ia' AND column_name='closing_message') THEN ALTER TABLE config_agente_ia RENAME COLUMN closing_message TO mensagem_encerramento; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='config_agente_ia' AND column_name='openai_api_key') THEN ALTER TABLE config_agente_ia RENAME COLUMN openai_api_key TO chave_openai; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='config_agente_ia' AND column_name='confirmation_email_html') THEN ALTER TABLE config_agente_ia RENAME COLUMN confirmation_email_html TO email_confirmacao_html; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='config_agente_ia' AND column_name='follow_up_1_minutes') THEN ALTER TABLE config_agente_ia RENAME COLUMN follow_up_1_minutes TO followup_1_minutos; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='config_agente_ia' AND column_name='follow_up_2_minutes') THEN ALTER TABLE config_agente_ia RENAME COLUMN follow_up_2_minutes TO followup_2_minutos; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='config_agente_ia' AND column_name='follow_up_3_minutes') THEN ALTER TABLE config_agente_ia RENAME COLUMN follow_up_3_minutes TO followup_3_minutos; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='config_agente_ia' AND column_name='reminder_1_minutes') THEN ALTER TABLE config_agente_ia RENAME COLUMN reminder_1_minutes TO lembrete_1_minutos; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='config_agente_ia' AND column_name='reminder_2_minutes') THEN ALTER TABLE config_agente_ia RENAME COLUMN reminder_2_minutes TO lembrete_2_minutos; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='config_agente_ia' AND column_name='reminder_3_minutes') THEN ALTER TABLE config_agente_ia RENAME COLUMN reminder_3_minutes TO lembrete_3_minutos; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='config_agente_ia' AND column_name='qualification_questions') THEN ALTER TABLE config_agente_ia RENAME COLUMN qualification_questions TO perguntas_qualificacao; END IF;
END $$;

-- ============================================================
-- FASE 2: Renomear colunas — instancias_whatsapp
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='instancias_whatsapp' AND column_name='organization_id') THEN ALTER TABLE instancias_whatsapp RENAME COLUMN organization_id TO id_organizacao; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='instancias_whatsapp' AND column_name='created_at') THEN ALTER TABLE instancias_whatsapp RENAME COLUMN created_at TO criado_em; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='instancias_whatsapp' AND column_name='updated_at') THEN ALTER TABLE instancias_whatsapp RENAME COLUMN updated_at TO atualizado_em; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='instancias_whatsapp' AND column_name='instance_id') THEN ALTER TABLE instancias_whatsapp RENAME COLUMN instance_id TO id_instancia; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='instancias_whatsapp' AND column_name='instance_name') THEN ALTER TABLE instancias_whatsapp RENAME COLUMN instance_name TO nome_instancia; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='instancias_whatsapp' AND column_name='admin_field_01') THEN ALTER TABLE instancias_whatsapp RENAME COLUMN admin_field_01 TO campo_admin_01; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='instancias_whatsapp' AND column_name='phone') THEN ALTER TABLE instancias_whatsapp RENAME COLUMN phone TO telefone; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='instancias_whatsapp' AND column_name='webhook_created') THEN ALTER TABLE instancias_whatsapp RENAME COLUMN webhook_created TO webhook_criado; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='instancias_whatsapp' AND column_name='status') THEN ALTER TABLE instancias_whatsapp RENAME COLUMN status TO situacao; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='instancias_whatsapp' AND column_name='pairing_code') THEN ALTER TABLE instancias_whatsapp RENAME COLUMN pairing_code TO codigo_pareamento; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='instancias_whatsapp' AND column_name='webhook_url') THEN ALTER TABLE instancias_whatsapp RENAME COLUMN webhook_url TO url_webhook; END IF;
END $$;

-- ============================================================
-- FASE 2: Renomear colunas — horarios_trabalho
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='horarios_trabalho' AND column_name='organization_id') THEN ALTER TABLE horarios_trabalho RENAME COLUMN organization_id TO id_organizacao; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='horarios_trabalho' AND column_name='user_id') THEN ALTER TABLE horarios_trabalho RENAME COLUMN user_id TO id_usuario; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='horarios_trabalho' AND column_name='created_at') THEN ALTER TABLE horarios_trabalho RENAME COLUMN created_at TO criado_em; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='horarios_trabalho' AND column_name='updated_at') THEN ALTER TABLE horarios_trabalho RENAME COLUMN updated_at TO atualizado_em; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='horarios_trabalho' AND column_name='service_duration') THEN ALTER TABLE horarios_trabalho RENAME COLUMN service_duration TO duracao_atendimento; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='horarios_trabalho' AND column_name='domingo_is_active') THEN ALTER TABLE horarios_trabalho RENAME COLUMN domingo_is_active TO domingo_ativo; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='horarios_trabalho' AND column_name='segunda_is_active') THEN ALTER TABLE horarios_trabalho RENAME COLUMN segunda_is_active TO segunda_ativo; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='horarios_trabalho' AND column_name='terca_is_active') THEN ALTER TABLE horarios_trabalho RENAME COLUMN terca_is_active TO terca_ativo; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='horarios_trabalho' AND column_name='quarta_is_active') THEN ALTER TABLE horarios_trabalho RENAME COLUMN quarta_is_active TO quarta_ativo; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='horarios_trabalho' AND column_name='quinta_is_active') THEN ALTER TABLE horarios_trabalho RENAME COLUMN quinta_is_active TO quinta_ativo; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='horarios_trabalho' AND column_name='sexta_is_active') THEN ALTER TABLE horarios_trabalho RENAME COLUMN sexta_is_active TO sexta_ativo; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='horarios_trabalho' AND column_name='sabado_is_active') THEN ALTER TABLE horarios_trabalho RENAME COLUMN sabado_is_active TO sabado_ativo; END IF;
END $$;

-- ============================================================
-- FASE 2: Renomear colunas — planos_assinatura
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='planos_assinatura' AND column_name='plan_id') THEN ALTER TABLE planos_assinatura RENAME COLUMN plan_id TO id_plano; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='planos_assinatura' AND column_name='plan_name') THEN ALTER TABLE planos_assinatura RENAME COLUMN plan_name TO nome_plano; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='planos_assinatura' AND column_name='plan_description') THEN ALTER TABLE planos_assinatura RENAME COLUMN plan_description TO descricao_plano; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='planos_assinatura' AND column_name='max_contacts') THEN ALTER TABLE planos_assinatura RENAME COLUMN max_contacts TO max_contatos; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='planos_assinatura' AND column_name='price_monthly') THEN ALTER TABLE planos_assinatura RENAME COLUMN price_monthly TO preco_mensal; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='planos_assinatura' AND column_name='price_annual') THEN ALTER TABLE planos_assinatura RENAME COLUMN price_annual TO preco_anual; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='planos_assinatura' AND column_name='created_at') THEN ALTER TABLE planos_assinatura RENAME COLUMN created_at TO criado_em; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='planos_assinatura' AND column_name='updated_at') THEN ALTER TABLE planos_assinatura RENAME COLUMN updated_at TO atualizado_em; END IF;
END $$;

-- ============================================================
-- FASE 2: Renomear colunas — uso_tokens
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='uso_tokens' AND column_name='organization_id') THEN ALTER TABLE uso_tokens RENAME COLUMN organization_id TO id_organizacao; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='uso_tokens' AND column_name='created_at') THEN ALTER TABLE uso_tokens RENAME COLUMN created_at TO criado_em; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='uso_tokens' AND column_name='cost_reais') THEN ALTER TABLE uso_tokens RENAME COLUMN cost_reais TO custo_reais; END IF;
END $$;

-- ============================================================
-- FASE 2: Renomear colunas — configuracoes_globais
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='configuracoes_globais' AND column_name='created_at') THEN ALTER TABLE configuracoes_globais RENAME COLUMN created_at TO criado_em; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='configuracoes_globais' AND column_name='updated_at') THEN ALTER TABLE configuracoes_globais RENAME COLUMN updated_at TO atualizado_em; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='configuracoes_globais' AND column_name='support_whatsapp') THEN ALTER TABLE configuracoes_globais RENAME COLUMN support_whatsapp TO whatsapp_suporte; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='configuracoes_globais' AND column_name='openai_api_key') THEN ALTER TABLE configuracoes_globais RENAME COLUMN openai_api_key TO chave_openai; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='configuracoes_globais' AND column_name='platform_name') THEN ALTER TABLE configuracoes_globais RENAME COLUMN platform_name TO nome_plataforma; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='configuracoes_globais' AND column_name='platform_logo_url') THEN ALTER TABLE configuracoes_globais RENAME COLUMN platform_logo_url TO url_logo_plataforma; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='configuracoes_globais' AND column_name='platform_logo_dark_url') THEN ALTER TABLE configuracoes_globais RENAME COLUMN platform_logo_dark_url TO url_logo_plataforma_escuro; END IF;
END $$;

-- ============================================================
-- FASE 2: Renomear colunas — documentos
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documentos' AND column_name='content') THEN ALTER TABLE documentos RENAME COLUMN content TO conteudo; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documentos' AND column_name='metadata') THEN ALTER TABLE documentos RENAME COLUMN metadata TO metadados; END IF;
END $$;

-- ============================================================
-- FASE 2: Renomear colunas — clientes_followup
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clientes_followup' AND column_name='organization_id') THEN ALTER TABLE clientes_followup RENAME COLUMN organization_id TO id_organizacao; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clientes_followup' AND column_name='sessionid') THEN ALTER TABLE clientes_followup RENAME COLUMN sessionid TO id_sessao; END IF;
END $$;

-- ============================================================
-- FASE 3: DROP dos CHECK constraints com valores EN
-- (SEM adicionar os novos ainda — dados ainda não migrados)
-- ============================================================

DO $$
DECLARE v_con text;
BEGIN
  FOR v_con IN
    SELECT tc.constraint_name FROM information_schema.table_constraints tc
    JOIN information_schema.check_constraints cc USING (constraint_name)
    WHERE tc.table_name='contatos' AND tc.constraint_type='CHECK'
      AND (cc.check_clause LIKE '%active%' OR cc.check_clause LIKE '%inactive%')
  LOOP EXECUTE format('ALTER TABLE contatos DROP CONSTRAINT %I', v_con); END LOOP;
END $$;

DO $$
DECLARE v_con text;
BEGIN
  FOR v_con IN
    SELECT tc.constraint_name FROM information_schema.table_constraints tc
    JOIN information_schema.check_constraints cc USING (constraint_name)
    WHERE tc.table_name='agendamentos' AND tc.constraint_type='CHECK'
      AND (cc.check_clause LIKE '%confirmed%' OR cc.check_clause LIKE '%pending%'
           OR cc.check_clause LIKE '%completed%' OR cc.check_clause LIKE '%cancelled%')
  LOOP EXECUTE format('ALTER TABLE agendamentos DROP CONSTRAINT %I', v_con); END LOOP;
END $$;

DO $$
DECLARE v_con text;
BEGIN
  FOR v_con IN
    SELECT tc.constraint_name FROM information_schema.table_constraints tc
    JOIN information_schema.check_constraints cc USING (constraint_name)
    WHERE tc.table_name='perfis' AND tc.constraint_type='CHECK'
      AND (cc.check_clause LIKE '%professional%' OR cc.check_clause LIKE '%assistant%'
           OR cc.check_clause LIKE '%doctor%')
  LOOP EXECUTE format('ALTER TABLE perfis DROP CONSTRAINT %I', v_con); END LOOP;
END $$;

DO $$
DECLARE v_con text;
BEGIN
  FOR v_con IN
    SELECT tc.constraint_name FROM information_schema.table_constraints tc
    JOIN information_schema.check_constraints cc USING (constraint_name)
    WHERE tc.table_name='instancias_whatsapp' AND tc.constraint_type='CHECK'
      AND (cc.check_clause LIKE '%connected%' OR cc.check_clause LIKE '%disconnected%'
           OR cc.check_clause LIKE '%error%')
  LOOP EXECUTE format('ALTER TABLE instancias_whatsapp DROP CONSTRAINT %I', v_con); END LOOP;
END $$;

-- ============================================================
-- FASE 3.5: Corrigir funções de trigger que referenciam updated_at
-- (coluna já renomeada para atualizado_em na Fase 2)
-- Deve rodar ANTES dos UPDATEs da Fase 4 para evitar erro de campo
-- ============================================================

-- Função genérica reutilizada pelas migrations novas
CREATE OR REPLACE FUNCTION trigger_atualizado_em()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$;

-- Funções específicas antigas (por tabela) que usam NEW.updated_at
-- Corrigidas para NEW.atualizado_em
CREATE OR REPLACE FUNCTION update_whatsapp_instances_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.atualizado_em = timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

DO $$
DECLARE v_func text;
BEGIN
  FOR v_func IN
    SELECT p.proname
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname LIKE '%_updated_at'
      AND p.proname <> 'trigger_atualizado_em'
      AND p.proname <> 'update_whatsapp_instances_updated_at'
  LOOP
    EXECUTE format(
      'CREATE OR REPLACE FUNCTION %I()
       RETURNS trigger LANGUAGE plpgsql AS $f$
       BEGIN
         NEW.atualizado_em = timezone(''utc''::text, now());
         RETURN NEW;
       END;
       $f$', v_func);
  END LOOP;
END $$;

-- ============================================================
-- FASE 4: Migrar dados (valores EN → PT)
-- DEVE vir antes de adicionar os novos CHECK constraints
-- ============================================================

UPDATE contatos SET situacao = 'ativo'   WHERE situacao = 'active';
UPDATE contatos SET situacao = 'inativo' WHERE situacao = 'inactive';

UPDATE agendamentos SET situacao = 'confirmado' WHERE situacao = 'confirmed';
UPDATE agendamentos SET situacao = 'pendente'   WHERE situacao = 'pending';
UPDATE agendamentos SET situacao = 'concluido'  WHERE situacao = 'completed';
UPDATE agendamentos SET situacao = 'cancelado'  WHERE situacao = 'cancelled';

UPDATE perfis SET funcao = 'profissional' WHERE funcao IN ('professional', 'doctor');
UPDATE perfis SET funcao = 'assistente'   WHERE funcao = 'assistant';

UPDATE instancias_whatsapp SET situacao = 'conectado'    WHERE situacao = 'connected';
UPDATE instancias_whatsapp SET situacao = 'desconectado' WHERE situacao = 'disconnected';
UPDATE instancias_whatsapp SET situacao = 'pendente'     WHERE situacao = 'pending';
UPDATE instancias_whatsapp SET situacao = 'erro'         WHERE situacao = 'error';

-- ============================================================
-- FASE 5: ADD dos novos CHECK constraints PT
-- (agora que os dados já foram migrados)
-- ============================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name='contatos' AND constraint_name='contatos_situacao_pt_check') THEN
    ALTER TABLE contatos ADD CONSTRAINT contatos_situacao_pt_check CHECK (situacao IN ('ativo', 'inativo'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name='agendamentos' AND constraint_name='agendamentos_situacao_pt_check') THEN
    ALTER TABLE agendamentos ADD CONSTRAINT agendamentos_situacao_pt_check CHECK (situacao IN ('confirmado', 'pendente', 'concluido', 'cancelado'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name='perfis' AND constraint_name='perfis_funcao_pt_check') THEN
    ALTER TABLE perfis ADD CONSTRAINT perfis_funcao_pt_check CHECK (funcao IN ('admin', 'profissional', 'assistente'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name='instancias_whatsapp' AND constraint_name='instancias_whatsapp_situacao_pt_check') THEN
    ALTER TABLE instancias_whatsapp ADD CONSTRAINT instancias_whatsapp_situacao_pt_check CHECK (situacao IN ('pendente', 'conectado', 'desconectado', 'erro'));
  END IF;
END $$;

-- ============================================================
-- FASE 6: Recriar funções auxiliares com novos nomes de tabela/coluna
-- ============================================================

CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS uuid LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT id_organizacao FROM perfis WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION is_user_super_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT COALESCE(super_admin, false) FROM perfis WHERE id = auth.uid();
$$;

-- trigger_atualizado_em já recriada na Fase 3.5

CREATE OR REPLACE FUNCTION gerar_identificador(name text)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE slug text;
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

-- ============================================================
-- FASE 7: Renomear tabelas *_chats → *_conversas
-- ============================================================

DO $$
DECLARE r RECORD; new_name text;
BEGIN
  FOR r IN
    SELECT table_name FROM information_schema.tables
    WHERE table_schema='public' AND table_name LIKE '%_chats'
  LOOP
    new_name := regexp_replace(r.table_name, '_chats$', '_conversas');
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=new_name) THEN
      EXECUTE format('ALTER TABLE %I RENAME TO %I', r.table_name, new_name);
    END IF;
  END LOOP;
END $$;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT table_name FROM information_schema.tables
    WHERE table_schema='public' AND table_name LIKE '%_conversas'
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name=r.table_name AND column_name='session_id') THEN
      EXECUTE format('ALTER TABLE %I RENAME COLUMN session_id TO id_sessao', r.table_name);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name=r.table_name AND column_name='message') THEN
      EXECUTE format('ALTER TABLE %I RENAME COLUMN message TO mensagem', r.table_name);
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- FIM DA MIGRAÇÃO 037
-- ============================================================
