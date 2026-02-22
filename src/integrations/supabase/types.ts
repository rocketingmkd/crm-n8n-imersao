export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      config_agente_ia: {
        Row: {
          nome_agente: string
          mensagem_encerramento: string
          email_confirmacao_html: string | null
          criado_em: string
          pausa_cliente_segundos: number | null
          followup_1_minutos: number | null
          followup_2_minutos: number | null
          followup_3_minutos: number | null
          mensagem_boas_vindas: string
          id: string
          chave_openai: string | null
          id_organizacao: string
          pausa_segundos: number
          personalidade: string
          perguntas_qualificacao: Json | null
          lembrete_1_minutos: number | null
          lembrete_2_minutos: number | null
          lembrete_3_minutos: number | null
          atualizado_em: string
        }
        Insert: {
          nome_agente?: string
          mensagem_encerramento?: string
          email_confirmacao_html?: string | null
          criado_em?: string
          pausa_cliente_segundos?: number | null
          followup_1_minutos?: number | null
          followup_2_minutos?: number | null
          followup_3_minutos?: number | null
          mensagem_boas_vindas?: string
          id?: string
          chave_openai?: string | null
          id_organizacao: string
          pausa_segundos?: number
          personalidade?: string
          perguntas_qualificacao?: Json | null
          lembrete_1_minutos?: number | null
          lembrete_2_minutos?: number | null
          lembrete_3_minutos?: number | null
          atualizado_em?: string
        }
        Update: {
          nome_agente?: string
          mensagem_encerramento?: string
          email_confirmacao_html?: string | null
          criado_em?: string
          pausa_cliente_segundos?: number | null
          followup_1_minutos?: number | null
          followup_2_minutos?: number | null
          followup_3_minutos?: number | null
          mensagem_boas_vindas?: string
          id?: string
          chave_openai?: string | null
          id_organizacao?: string
          pausa_segundos?: number
          personalidade?: string
          perguntas_qualificacao?: Json | null
          lembrete_1_minutos?: number | null
          lembrete_2_minutos?: number | null
          lembrete_3_minutos?: number | null
          atualizado_em?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_ia_config_organization_id_fkey"
            columns: ["id_organizacao"]
            isOneToOne: true
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      agendamentos: {
        Row: {
          criado_em: string
          data: string
          fim: string | null
          id: string
          observacoes: string | null
          id_organizacao: string
          id_contato: string | null
          nome_contato: string
          lembrete_1_enviado: boolean | null
          lembrete_2_enviado: boolean | null
          lembrete_3_enviado: boolean | null
          id_sessao: string | null
          inicio: string | null
          situacao: string | null
          hora: string
          tipo: string
          notas: string | null
        }
        Insert: {
          criado_em?: string
          data: string
          fim?: string | null
          id?: string
          observacoes?: string | null
          id_organizacao: string
          id_contato?: string | null
          nome_contato: string
          lembrete_1_enviado?: boolean | null
          lembrete_2_enviado?: boolean | null
          lembrete_3_enviado?: boolean | null
          id_sessao?: string | null
          inicio?: string | null
          situacao?: string | null
          hora: string
          tipo: string
          notas?: string | null
        }
        Update: {
          criado_em?: string
          data?: string
          fim?: string | null
          id?: string
          observacoes?: string | null
          id_organizacao?: string
          id_contato?: string | null
          nome_contato?: string
          lembrete_1_enviado?: boolean | null
          lembrete_2_enviado?: boolean | null
          lembrete_3_enviado?: boolean | null
          id_sessao?: string | null
          inicio?: string | null
          situacao?: string | null
          hora?: string
          tipo?: string
          notas?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_organization_id_fkey"
            columns: ["id_organizacao"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_contact_id_fkey"
            columns: ["id_contato"]
            isOneToOne: false
            referencedRelation: "contatos"
            referencedColumns: ["id"]
          },
        ]
      }
      bem_estar_conversas: {
        Row: {
          data: string | null
          id: number
          mensagem: Json
          id_sessao: string
        }
        Insert: {
          data?: string | null
          id?: number
          mensagem: Json
          id_sessao: string
        }
        Update: {
          data?: string | null
          id?: number
          mensagem?: Json
          id_sessao?: string
        }
        Relationships: []
      }
      clientes_followup: {
        Row: {
          data_envio1: string | null
          data_envio2: string | null
          data_envio3: string | null
          followup: string | null
          followup1: string | null
          followup2: string | null
          followup3: string | null
          id: number
          mensagem1: string | null
          mensagem2: string | null
          mensagem3: string | null
          nome: string | null
          numero: string | null
          id_organizacao: string | null
          id_sessao: string | null
          situacao: string | null
          ultima_atividade: string | null
          ultima_mensagem_ia: string | null
        }
        Insert: {
          data_envio1?: string | null
          data_envio2?: string | null
          data_envio3?: string | null
          followup?: string | null
          followup1?: string | null
          followup2?: string | null
          followup3?: string | null
          id?: number
          mensagem1?: string | null
          mensagem2?: string | null
          mensagem3?: string | null
          nome?: string | null
          numero?: string | null
          id_organizacao?: string | null
          id_sessao?: string | null
          situacao?: string | null
          ultima_atividade?: string | null
          ultima_mensagem_ia?: string | null
        }
        Update: {
          data_envio1?: string | null
          data_envio2?: string | null
          data_envio3?: string | null
          followup?: string | null
          followup1?: string | null
          followup2?: string | null
          followup3?: string | null
          id?: number
          mensagem1?: string | null
          mensagem2?: string | null
          mensagem3?: string | null
          nome?: string | null
          numero?: string | null
          id_organizacao?: string | null
          id_sessao?: string | null
          situacao?: string | null
          ultima_atividade?: string | null
          ultima_mensagem_ia?: string | null
        }
        Relationships: []
      }
      clinica_flowgrammers_conversas: {
        Row: {
          data: string | null
          id: number
          mensagem: Json
          id_sessao: string
        }
        Insert: {
          data?: string | null
          id?: number
          mensagem: Json
          id_sessao: string
        }
        Update: {
          data?: string | null
          id?: number
          mensagem?: Json
          id_sessao?: string
        }
        Relationships: []
      }
      clinica_teste_conversas: {
        Row: {
          data: string | null
          id: number
          mensagem: Json
          id_sessao: string
        }
        Insert: {
          data?: string | null
          id?: number
          mensagem: Json
          id_sessao: string
        }
        Update: {
          data?: string | null
          id?: number
          mensagem?: Json
          id_sessao?: string
        }
        Relationships: []
      }
      clinica_saude_conversas: {
        Row: {
          data: string | null
          id: number
          mensagem: Json
          id_sessao: string
        }
        Insert: {
          data?: string | null
          id?: number
          mensagem: Json
          id_sessao: string
        }
        Update: {
          data?: string | null
          id?: number
          mensagem?: Json
          id_sessao?: string
        }
        Relationships: []
      }
      documentos: {
        Row: {
          conteudo: string | null
          embedding: string | null
          id: number
          metadados: Json | null
          titulo: string | null
        }
        Insert: {
          conteudo?: string | null
          embedding?: string | null
          id?: number
          metadados?: Json | null
          titulo?: string | null
        }
        Update: {
          conteudo?: string | null
          embedding?: string | null
          id?: number
          metadados?: Json | null
          titulo?: string | null
        }
        Relationships: []
      }
      empresa_digital_conversas: {
        Row: {
          data: string | null
          id: number
          mensagem: Json
          id_sessao: string
        }
        Insert: {
          data?: string | null
          id?: number
          mensagem: Json
          id_sessao: string
        }
        Update: {
          data?: string | null
          id?: number
          mensagem?: Json
          id_sessao?: string
        }
        Relationships: []
      }
      configuracoes_globais: {
        Row: {
          criado_em: string
          id: string
          chave_openai: string | null
          whatsapp_suporte: string | null
          atualizado_em: string
          nome_plataforma: string
          url_logo_plataforma: string | null
          url_logo_plataforma_escuro: string | null
          cor_primaria: string | null
          chave_elevenlabs: string | null
        }
        Insert: {
          criado_em?: string
          id?: string
          chave_openai?: string | null
          whatsapp_suporte?: string | null
          atualizado_em?: string
          nome_plataforma?: string
          url_logo_plataforma?: string | null
          url_logo_plataforma_escuro?: string | null
          cor_primaria?: string | null
          chave_elevenlabs?: string | null
        }
        Update: {
          criado_em?: string
          id?: string
          chave_openai?: string | null
          whatsapp_suporte?: string | null
          atualizado_em?: string
          nome_plataforma?: string
          url_logo_plataforma?: string | null
          url_logo_plataforma_escuro?: string | null
          cor_primaria?: string | null
          chave_elevenlabs?: string | null
        }
        Relationships: []
      }
      lado_digital_conversas: {
        Row: {
          data: string | null
          id: number
          mensagem: Json
          id_sessao: string
        }
        Insert: {
          data?: string | null
          id?: number
          mensagem: Json
          id_sessao: string
        }
        Update: {
          data?: string | null
          id?: number
          mensagem?: Json
          id_sessao?: string
        }
        Relationships: []
      }
      organizacoes: {
        Row: {
          duracao_atendimento: number | null
          email_contato: string | null
          criado_em: string | null
          id: string
          ativo: boolean | null
          url_logo: string | null
          nome: string
          recursos_plano: Json | null
          dados: Json | null
          identificador: string
          plano_assinatura: string | null
          rotulo_entidade: string
          rotulo_entidade_plural: string
        }
        Insert: {
          duracao_atendimento?: number | null
          email_contato?: string | null
          criado_em?: string | null
          id?: string
          ativo?: boolean | null
          url_logo?: string | null
          nome: string
          recursos_plano?: Json | null
          dados?: Json | null
          identificador: string
          plano_assinatura?: string | null
          rotulo_entidade?: string
          rotulo_entidade_plural?: string
        }
        Update: {
          duracao_atendimento?: number | null
          email_contato?: string | null
          criado_em?: string | null
          id?: string
          ativo?: boolean | null
          url_logo?: string | null
          nome?: string
          recursos_plano?: Json | null
          dados?: Json | null
          identificador?: string
          plano_assinatura?: string | null
          rotulo_entidade?: string
          rotulo_entidade_plural?: string
        }
        Relationships: []
      }
      contatos: {
        Row: {
          criado_em: string
          email: string | null
          id: string
          status_kanban: string | null
          ultima_interacao: string | null
          nome: string | null
          observacoes: string | null
          id_organizacao: string
          telefone: string
          resumo: string | null
          id_sessao: string | null
          situacao: string | null
          total_interacoes: number | null
        }
        Insert: {
          criado_em?: string
          email?: string | null
          id?: string
          status_kanban?: string | null
          ultima_interacao?: string | null
          nome?: string | null
          observacoes?: string | null
          id_organizacao: string
          telefone: string
          resumo?: string | null
          id_sessao?: string | null
          situacao?: string | null
          total_interacoes?: number | null
        }
        Update: {
          criado_em?: string
          email?: string | null
          id?: string
          status_kanban?: string | null
          ultima_interacao?: string | null
          nome?: string | null
          observacoes?: string | null
          id_organizacao?: string
          telefone?: string
          resumo?: string | null
          id_sessao?: string | null
          situacao?: string | null
          total_interacoes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_organization_id_fkey"
            columns: ["id_organizacao"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      perfis: {
        Row: {
          url_avatar: string | null
          criado_em: string | null
          nome_completo: string
          id: string
          ativo: boolean | null
          super_admin: boolean | null
          id_organizacao: string | null
          funcao: string
        }
        Insert: {
          url_avatar?: string | null
          criado_em?: string | null
          nome_completo: string
          id: string
          ativo?: boolean | null
          super_admin?: boolean | null
          id_organizacao?: string | null
          funcao?: string
        }
        Update: {
          url_avatar?: string | null
          criado_em?: string | null
          nome_completo?: string
          id?: string
          ativo?: boolean | null
          super_admin?: boolean | null
          id_organizacao?: string | null
          funcao?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["id_organizacao"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracoes: {
        Row: {
          nome_empresa: string
          criado_em: string
          nome_responsavel: string
          id: string
          id_organizacao: string
          plano_assinatura: string | null
          renovacao_em: string | null
        }
        Insert: {
          nome_empresa: string
          criado_em?: string
          nome_responsavel: string
          id?: string
          id_organizacao: string
          plano_assinatura?: string | null
          renovacao_em?: string | null
        }
        Update: {
          nome_empresa?: string
          criado_em?: string
          nome_responsavel?: string
          id?: string
          id_organizacao?: string
          plano_assinatura?: string | null
          renovacao_em?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "settings_organization_id_fkey"
            columns: ["id_organizacao"]
            isOneToOne: true
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      planos_assinatura: {
        Row: {
          agendamento_automatico: boolean | null
          analytics: boolean | null
          atendimento_inteligente: boolean | null
          base_conhecimento: boolean | null
          confirmacao_email: boolean | null
          criado_em: string | null
          id: string
          integracao_whatsapp: boolean | null
          lembretes_automaticos: boolean | null
          max_agendamentos_mes: number | null
          max_mensagens_whatsapp_mes: number | null
          max_contatos: number | null
          max_usuarios: number | null
          multi_usuarios: boolean | null
          personalizacao_agente: boolean | null
          descricao_plano: string | null
          id_plano: string
          nome_plano: string
          preco_anual: number | null
          preco_mensal: number | null
          relatorios_avancados: boolean | null
          atualizado_em: string | null
        }
        Insert: {
          agendamento_automatico?: boolean | null
          analytics?: boolean | null
          atendimento_inteligente?: boolean | null
          base_conhecimento?: boolean | null
          confirmacao_email?: boolean | null
          criado_em?: string | null
          id?: string
          integracao_whatsapp?: boolean | null
          lembretes_automaticos?: boolean | null
          max_agendamentos_mes?: number | null
          max_mensagens_whatsapp_mes?: number | null
          max_contatos?: number | null
          max_usuarios?: number | null
          multi_usuarios?: boolean | null
          personalizacao_agente?: boolean | null
          descricao_plano?: string | null
          id_plano: string
          nome_plano: string
          preco_anual?: number | null
          preco_mensal?: number | null
          relatorios_avancados?: boolean | null
          atualizado_em?: string | null
        }
        Update: {
          agendamento_automatico?: boolean | null
          analytics?: boolean | null
          atendimento_inteligente?: boolean | null
          base_conhecimento?: boolean | null
          confirmacao_email?: boolean | null
          criado_em?: string | null
          id?: string
          integracao_whatsapp?: boolean | null
          lembretes_automaticos?: boolean | null
          max_agendamentos_mes?: number | null
          max_mensagens_whatsapp_mes?: number | null
          max_contatos?: number | null
          max_usuarios?: number | null
          multi_usuarios?: boolean | null
          personalizacao_agente?: boolean | null
          descricao_plano?: string | null
          id_plano?: string
          nome_plano?: string
          preco_anual?: number | null
          preco_mensal?: number | null
          relatorios_avancados?: boolean | null
          atualizado_em?: string | null
        }
        Relationships: []
      }
      uso_tokens: {
        Row: {
          custo_reais: number
          criado_em: string | null
          id: string
          id_organizacao: string
          total_tokens: number
        }
        Insert: {
          custo_reais?: number
          criado_em?: string | null
          id?: string
          id_organizacao: string
          total_tokens?: number
        }
        Update: {
          custo_reais?: number
          criado_em?: string | null
          id?: string
          id_organizacao?: string
          total_tokens?: number
        }
        Relationships: [
          {
            foreignKeyName: "token_usage_organization_id_fkey"
            columns: ["id_organizacao"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      vault_items: {
        Row: {
          category: string | null
          created_at: string | null
          icon_url: string | null
          id: string
          notes: string | null
          password: string | null
          service_name: string
          updated_at: string | null
          username: string | null
          website_url: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          icon_url?: string | null
          id?: string
          notes?: string | null
          password?: string | null
          service_name: string
          updated_at?: string | null
          username?: string | null
          website_url?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          icon_url?: string | null
          id?: string
          notes?: string | null
          password?: string | null
          service_name?: string
          updated_at?: string | null
          username?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      instancias_whatsapp: {
        Row: {
          campo_admin_01: string
          criado_em: string
          id: string
          id_instancia: string
          nome_instancia: string
          id_organizacao: string
          codigo_pareamento: string | null
          telefone: string
          qr_code: string | null
          situacao: string
          token: string
          atualizado_em: string
          webhook_criado: string | null
          url_webhook: string | null
        }
        Insert: {
          campo_admin_01: string
          criado_em?: string
          id?: string
          id_instancia: string
          nome_instancia: string
          id_organizacao: string
          codigo_pareamento?: string | null
          telefone: string
          qr_code?: string | null
          situacao?: string
          token: string
          atualizado_em?: string
          webhook_criado?: string | null
          url_webhook?: string | null
        }
        Update: {
          campo_admin_01?: string
          criado_em?: string
          id?: string
          id_instancia?: string
          nome_instancia?: string
          id_organizacao?: string
          codigo_pareamento?: string | null
          telefone?: string
          qr_code?: string | null
          situacao?: string
          token?: string
          atualizado_em?: string
          webhook_criado?: string | null
          url_webhook?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_instances_organization_id_fkey"
            columns: ["id_organizacao"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      horarios_trabalho: {
        Row: {
          duracao_atendimento: number | null
          criado_em: string | null
          domingo_fim_almoco: string | null
          domingo_fim_trabalho: string | null
          domingo_inicio_almoco: string | null
          domingo_inicio_trabalho: string | null
          domingo_ativo: boolean | null
          id: string
          id_organizacao: string
          quarta_fim_almoco: string | null
          quarta_fim_trabalho: string | null
          quarta_inicio_almoco: string | null
          quarta_inicio_trabalho: string | null
          quarta_ativo: boolean | null
          quinta_fim_almoco: string | null
          quinta_fim_trabalho: string | null
          quinta_inicio_almoco: string | null
          quinta_inicio_trabalho: string | null
          quinta_ativo: boolean | null
          sabado_fim_almoco: string | null
          sabado_fim_trabalho: string | null
          sabado_inicio_almoco: string | null
          sabado_inicio_trabalho: string | null
          sabado_ativo: boolean | null
          segunda_fim_almoco: string | null
          segunda_fim_trabalho: string | null
          segunda_inicio_almoco: string | null
          segunda_inicio_trabalho: string | null
          segunda_ativo: boolean | null
          sexta_fim_almoco: string | null
          sexta_fim_trabalho: string | null
          sexta_inicio_almoco: string | null
          sexta_inicio_trabalho: string | null
          sexta_ativo: boolean | null
          terca_fim_almoco: string | null
          terca_fim_trabalho: string | null
          terca_inicio_almoco: string | null
          terca_inicio_trabalho: string | null
          terca_ativo: boolean | null
          atualizado_em: string | null
          id_usuario: string
        }
        Insert: {
          duracao_atendimento?: number | null
          criado_em?: string | null
          domingo_fim_almoco?: string | null
          domingo_fim_trabalho?: string | null
          domingo_inicio_almoco?: string | null
          domingo_inicio_trabalho?: string | null
          domingo_ativo?: boolean | null
          id?: string
          id_organizacao: string
          quarta_fim_almoco?: string | null
          quarta_fim_trabalho?: string | null
          quarta_inicio_almoco?: string | null
          quarta_inicio_trabalho?: string | null
          quarta_ativo?: boolean | null
          quinta_fim_almoco?: string | null
          quinta_fim_trabalho?: string | null
          quinta_inicio_almoco?: string | null
          quinta_inicio_trabalho?: string | null
          quinta_ativo?: boolean | null
          sabado_fim_almoco?: string | null
          sabado_fim_trabalho?: string | null
          sabado_inicio_almoco?: string | null
          sabado_inicio_trabalho?: string | null
          sabado_ativo?: boolean | null
          segunda_fim_almoco?: string | null
          segunda_fim_trabalho?: string | null
          segunda_inicio_almoco?: string | null
          segunda_inicio_trabalho?: string | null
          segunda_ativo?: boolean | null
          sexta_fim_almoco?: string | null
          sexta_fim_trabalho?: string | null
          sexta_inicio_almoco?: string | null
          sexta_inicio_trabalho?: string | null
          sexta_ativo?: boolean | null
          terca_fim_almoco?: string | null
          terca_fim_trabalho?: string | null
          terca_inicio_almoco?: string | null
          terca_inicio_trabalho?: string | null
          terca_ativo?: boolean | null
          atualizado_em?: string | null
          id_usuario: string
        }
        Update: {
          duracao_atendimento?: number | null
          criado_em?: string | null
          domingo_fim_almoco?: string | null
          domingo_fim_trabalho?: string | null
          domingo_inicio_almoco?: string | null
          domingo_inicio_trabalho?: string | null
          domingo_ativo?: boolean | null
          id?: string
          id_organizacao?: string
          quarta_fim_almoco?: string | null
          quarta_fim_trabalho?: string | null
          quarta_inicio_almoco?: string | null
          quarta_inicio_trabalho?: string | null
          quarta_ativo?: boolean | null
          quinta_fim_almoco?: string | null
          quinta_fim_trabalho?: string | null
          quinta_inicio_almoco?: string | null
          quinta_inicio_trabalho?: string | null
          quinta_ativo?: boolean | null
          sabado_fim_almoco?: string | null
          sabado_fim_trabalho?: string | null
          sabado_inicio_almoco?: string | null
          sabado_inicio_trabalho?: string | null
          sabado_ativo?: boolean | null
          segunda_fim_almoco?: string | null
          segunda_fim_trabalho?: string | null
          segunda_inicio_almoco?: string | null
          segunda_inicio_trabalho?: string | null
          segunda_ativo?: boolean | null
          sexta_fim_almoco?: string | null
          sexta_fim_trabalho?: string | null
          sexta_inicio_almoco?: string | null
          sexta_inicio_trabalho?: string | null
          sexta_ativo?: boolean | null
          terca_fim_almoco?: string | null
          terca_fim_trabalho?: string | null
          terca_inicio_almoco?: string | null
          terca_inicio_trabalho?: string | null
          terca_ativo?: boolean | null
          atualizado_em?: string | null
          id_usuario?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_schedules_organization_id_fkey"
            columns: ["id_organizacao"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_vault_item: {
        Args: {
          p_category?: string
          p_icon_url?: string
          p_notes?: string
          p_password?: string
          p_service_name: string
          p_username?: string
          p_website_url?: string
        }
        Returns: string
      }
      delete_vault_item: { Args: { p_id: string }; Returns: boolean }
      gerar_identificador: { Args: { name: string }; Returns: string }
      get_user_organization_id: { Args: never; Returns: string }
      get_vault_item_by_id: {
        Args: { p_id: string }
        Returns: {
          category: string
          created_at: string
          icon_url: string
          id: string
          notes: string
          password: string
          service_name: string
          updated_at: string
          username: string
          website_url: string
        }[]
      }
      get_vault_items: {
        Args: never
        Returns: {
          category: string
          created_at: string
          icon_url: string
          id: string
          notes: string
          password: string
          service_name: string
          updated_at: string
          username: string
          website_url: string
        }[]
      }
      is_user_super_admin: { Args: never; Returns: boolean }
      match_documents: {
        Args: { filter?: Json; match_count?: number; query_embedding: string }
        Returns: {
          conteudo: string
          id: number
          metadados: Json
          similarity: number
        }[]
      }
      match_documents_dynamic: {
        Args: {
          filter?: Json
          match_count?: number
          query_embedding: string
          table_name: string
        }
        Returns: {
          conteudo: string
          id: number
          metadados: Json
          similarity: number
        }[]
      }
      match_documents_geral: {
        Args: { filter: Json; match_count: number; query_embedding: string }
        Returns: {
          conteudo: string
          id: number
          metadados: Json
          similarity: number
        }[]
      }
      search_vault_items: {
        Args: { p_search_term: string }
        Returns: {
          category: string
          created_at: string
          icon_url: string
          id: string
          notes: string
          password: string
          service_name: string
          updated_at: string
          username: string
          website_url: string
        }[]
      }
      update_vault_item: {
        Args: {
          p_category?: string
          p_icon_url?: string
          p_id: string
          p_notes?: string
          p_password?: string
          p_service_name?: string
          p_username?: string
          p_website_url?: string
        }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
