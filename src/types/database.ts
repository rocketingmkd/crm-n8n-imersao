export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      organizacoes: {
        Row: {
          id: string
          criado_em: string
          nome: string
          identificador: string
          dados: Json
          ativo: boolean
          url_logo: string | null
          email_contato: string | null
          plano_assinatura: 'plano_a' | 'plano_b' | 'plano_c' | 'plano_d'
          recursos_plano: Json
          duracao_atendimento: number | null
          rotulo_entidade: string
          rotulo_entidade_plural: string
        }
        Insert: {
          id?: string
          criado_em?: string
          nome: string
          identificador: string
          dados?: Json
          ativo?: boolean
          url_logo?: string | null
          email_contato?: string | null
          plano_assinatura?: 'plano_a' | 'plano_b' | 'plano_c' | 'plano_d'
          recursos_plano?: Json
          duracao_atendimento?: number | null
          rotulo_entidade?: string
          rotulo_entidade_plural?: string
        }
        Update: {
          id?: string
          criado_em?: string
          nome?: string
          identificador?: string
          dados?: Json
          ativo?: boolean
          url_logo?: string | null
          email_contato?: string | null
          plano_assinatura?: 'plano_a' | 'plano_b' | 'plano_c' | 'plano_d'
          recursos_plano?: Json
          duracao_atendimento?: number | null
          rotulo_entidade?: string
          rotulo_entidade_plural?: string
        }
      }
      configuracoes_globais: {
        Row: {
          id: string
          whatsapp_suporte: string | null
          email_suporte: string | null
          chave_openai: string | null
          criado_em: string
          atualizado_em: string
          nome_plataforma: string
          url_logo_plataforma: string | null
          url_logo_plataforma_escuro: string | null
          cor_primaria: string | null
          chave_elevenlabs: string | null
          id_voz_elevenlabs: string | null
        }
        Insert: {
          id?: string
          whatsapp_suporte?: string | null
          email_suporte?: string | null
          chave_openai?: string | null
          criado_em?: string
          atualizado_em?: string
          nome_plataforma?: string
          url_logo_plataforma?: string | null
          url_logo_plataforma_escuro?: string | null
          cor_primaria?: string | null
          chave_elevenlabs?: string | null
          id_voz_elevenlabs?: string | null
        }
        Update: {
          id?: string
          whatsapp_suporte?: string | null
          email_suporte?: string | null
          chave_openai?: string | null
          criado_em?: string
          atualizado_em?: string
          nome_plataforma?: string
          url_logo_plataforma?: string | null
          url_logo_plataforma_escuro?: string | null
          cor_primaria?: string | null
          chave_elevenlabs?: string | null
          id_voz_elevenlabs?: string | null
        }
      }
      perfis: {
        Row: {
          id: string
          id_organizacao: string | null  // NULL para super admins
          criado_em: string
          nome_completo: string
          funcao: 'admin' | 'profissional' | 'assistente'
          url_avatar: string | null
          ativo: boolean
          super_admin: boolean  // TRUE para super admins
        }
        Insert: {
          id: string
          id_organizacao?: string | null  // NULL para super admins
          criado_em?: string
          nome_completo: string
          funcao?: 'admin' | 'profissional' | 'assistente'
          url_avatar?: string | null
          ativo?: boolean
          super_admin?: boolean
        }
        Update: {
          id?: string
          id_organizacao?: string | null
          criado_em?: string
          nome_completo?: string
          funcao?: 'admin' | 'profissional' | 'assistente'
          url_avatar?: string | null
          ativo?: boolean
          super_admin?: boolean
        }
      }
      contatos: {
        Row: {
          id: string
          criado_em: string
          id_organizacao: string
          nome: string
          email: string
          telefone: string
          situacao: 'ativo' | 'inativo'
          ultima_interacao: string | null
          total_interacoes: number
          status_kanban: 'novo_contato' | 'qualificado' | 'em_atendimento' | 'agendado' | 'aguardando_confirmacao' | 'concluido'
          observacoes: string | null
          resumo: string | null
          id_sessao: string | null
          tipo_pessoa: 'pf' | 'pj' | null
          cpf_cnpj: string | null
          url_foto: string | null
        }
        Insert: {
          id?: string
          criado_em?: string
          id_organizacao: string
          nome: string
          email: string
          telefone: string
          situacao?: 'ativo' | 'inativo'
          ultima_interacao?: string | null
          total_interacoes?: number
          status_kanban?: 'novo_contato' | 'qualificado' | 'em_atendimento' | 'agendado' | 'aguardando_confirmacao' | 'concluido'
          observacoes?: string | null
          resumo?: string | null
          id_sessao?: string | null
          tipo_pessoa?: 'pf' | 'pj' | null
          cpf_cnpj?: string | null
          url_foto?: string | null
        }
        Update: {
          id?: string
          criado_em?: string
          id_organizacao?: string
          nome?: string
          email?: string
          telefone?: string
          situacao?: 'ativo' | 'inativo'
          ultima_interacao?: string | null
          total_interacoes?: number
          status_kanban?: 'novo_contato' | 'qualificado' | 'em_atendimento' | 'agendado' | 'aguardando_confirmacao' | 'concluido'
          observacoes?: string | null
          resumo?: string | null
          id_sessao?: string | null
          tipo_pessoa?: 'pf' | 'pj' | null
          cpf_cnpj?: string | null
          url_foto?: string | null
        }
      }
      agendamentos: {
        Row: {
          id: string
          criado_em: string
          id_organizacao: string
          data: string
          hora: string
          inicio: string | null  // TEXT: formato ISO8601 com TZ (2025-11-25T09:00:00-03:00)
          fim: string | null     // TEXT: formato ISO8601 com TZ (2025-11-25T10:00:00-03:00)
          id_contato: string
          nome_contato: string
          tipo: string
          situacao: 'confirmado' | 'pendente' | 'concluido' | 'cancelado'
          notas: string | null
          observacoes: string | null
          id_sessao: string | null
        }
        Insert: {
          id?: string
          criado_em?: string
          id_organizacao: string
          data: string
          hora: string
          inicio?: string | null
          fim?: string | null
          id_contato: string
          nome_contato: string
          tipo: string
          situacao?: 'confirmado' | 'pendente' | 'concluido' | 'cancelado'
          notas?: string | null
          observacoes?: string | null
          id_sessao?: string | null
        }
        Update: {
          id?: string
          criado_em?: string
          id_organizacao?: string
          data?: string
          hora?: string
          inicio?: string | null
          fim?: string | null
          id_contato?: string
          nome_contato?: string
          tipo?: string
          situacao?: 'confirmado' | 'pendente' | 'concluido' | 'cancelado'
          notas?: string | null
          observacoes?: string | null
          id_sessao?: string | null
        }
      }
      configuracoes: {
        Row: {
          id: string
          criado_em: string
          id_organizacao: string
          nome_empresa: string
          nome_responsavel: string
          plano_assinatura: string
          renovacao_em: string | null
        }
        Insert: {
          id?: string
          criado_em?: string
          id_organizacao: string
          nome_empresa: string
          nome_responsavel: string
          plano_assinatura?: string
          renovacao_em?: string | null
        }
        Update: {
          id?: string
          criado_em?: string
          id_organizacao?: string
          nome_empresa?: string
          nome_responsavel?: string
          plano_assinatura?: string
          renovacao_em?: string | null
        }
      }
      config_agente_ia: {
        Row: {
          id: string
          id_organizacao: string
          criado_em: string
          atualizado_em: string
          nome_agente: string
          personalidade: string
          pausa_segundos: number
          pausa_cliente_segundos: number
          mensagem_boas_vindas: string
          mensagem_encerramento: string
          chave_openai: string | null
          email_confirmacao_html: string | null
        }
        Insert: {
          id?: string
          id_organizacao: string
          criado_em?: string
          atualizado_em?: string
          nome_agente?: string
          personalidade?: string
          pausa_segundos?: number
          pausa_cliente_segundos?: number
          mensagem_boas_vindas?: string
          mensagem_encerramento?: string
          chave_openai?: string | null
          email_confirmacao_html?: string | null
        }
        Update: {
          id?: string
          id_organizacao?: string
          criado_em?: string
          atualizado_em?: string
          nome_agente?: string
          personalidade?: string
          pausa_segundos?: number
          pausa_cliente_segundos?: number
          mensagem_boas_vindas?: string
          mensagem_encerramento?: string
          chave_openai?: string | null
          email_confirmacao_html?: string | null
        }
      }
      instancias_whatsapp: {
        Row: {
          id: string
          id_organizacao: string
          criado_em: string
          atualizado_em: string
          id_instancia: string
          token: string
          nome_instancia: string
          campo_admin_01: string
          telefone: string
          webhook_criado: string | null
          situacao: 'pendente' | 'conectado' | 'desconectado' | 'erro'
          qr_code: string | null
          codigo_pareamento: string | null
          url_webhook: string | null
        }
        Insert: {
          id?: string
          id_organizacao: string
          criado_em?: string
          atualizado_em?: string
          id_instancia: string
          token: string
          nome_instancia: string
          campo_admin_01: string
          telefone: string
          webhook_criado?: string | null
          situacao?: 'pendente' | 'conectado' | 'desconectado' | 'erro'
          qr_code?: string | null
          codigo_pareamento?: string | null
          url_webhook?: string | null
        }
        Update: {
          id?: string
          id_organizacao?: string
          criado_em?: string
          atualizado_em?: string
          id_instancia?: string
          token?: string
          nome_instancia?: string
          campo_admin_01?: string
          telefone?: string
          webhook_criado?: string | null
          situacao?: 'pendente' | 'conectado' | 'desconectado' | 'erro'
          qr_code?: string | null
          codigo_pareamento?: string | null
          url_webhook?: string | null
        }
      }
      horarios_trabalho: {
        Row: {
          id: string
          id_organizacao: string
          id_usuario: string
          // Domingo
          domingo_ativo: boolean
          domingo_inicio_trabalho: string | null
          domingo_fim_trabalho: string | null
          domingo_inicio_almoco: string | null
          domingo_fim_almoco: string | null
          // Segunda
          segunda_ativo: boolean
          segunda_inicio_trabalho: string | null
          segunda_fim_trabalho: string | null
          segunda_inicio_almoco: string | null
          segunda_fim_almoco: string | null
          // Terça
          terca_ativo: boolean
          terca_inicio_trabalho: string | null
          terca_fim_trabalho: string | null
          terca_inicio_almoco: string | null
          terca_fim_almoco: string | null
          // Quarta
          quarta_ativo: boolean
          quarta_inicio_trabalho: string | null
          quarta_fim_trabalho: string | null
          quarta_inicio_almoco: string | null
          quarta_fim_almoco: string | null
          // Quinta
          quinta_ativo: boolean
          quinta_inicio_trabalho: string | null
          quinta_fim_trabalho: string | null
          quinta_inicio_almoco: string | null
          quinta_fim_almoco: string | null
          // Sexta
          sexta_ativo: boolean
          sexta_inicio_trabalho: string | null
          sexta_fim_trabalho: string | null
          sexta_inicio_almoco: string | null
          sexta_fim_almoco: string | null
          // Sábado
          sabado_ativo: boolean
          sabado_inicio_trabalho: string | null
          sabado_fim_trabalho: string | null
          sabado_inicio_almoco: string | null
          sabado_fim_almoco: string | null
          // Duração do atendimento em minutos (15-240)
          duracao_atendimento: number | null
          criado_em: string
          atualizado_em: string
        }
        Insert: {
          id?: string
          id_organizacao: string
          id_usuario: string
          // Domingo
          domingo_ativo?: boolean
          domingo_inicio_trabalho?: string | null
          domingo_fim_trabalho?: string | null
          domingo_inicio_almoco?: string | null
          domingo_fim_almoco?: string | null
          // Segunda
          segunda_ativo?: boolean
          segunda_inicio_trabalho?: string | null
          segunda_fim_trabalho?: string | null
          segunda_inicio_almoco?: string | null
          segunda_fim_almoco?: string | null
          // Terça
          terca_ativo?: boolean
          terca_inicio_trabalho?: string | null
          terca_fim_trabalho?: string | null
          terca_inicio_almoco?: string | null
          terca_fim_almoco?: string | null
          // Quarta
          quarta_ativo?: boolean
          quarta_inicio_trabalho?: string | null
          quarta_fim_trabalho?: string | null
          quarta_inicio_almoco?: string | null
          quarta_fim_almoco?: string | null
          // Quinta
          quinta_ativo?: boolean
          quinta_inicio_trabalho?: string | null
          quinta_fim_trabalho?: string | null
          quinta_inicio_almoco?: string | null
          quinta_fim_almoco?: string | null
          // Sexta
          sexta_ativo?: boolean
          sexta_inicio_trabalho?: string | null
          sexta_fim_trabalho?: string | null
          sexta_inicio_almoco?: string | null
          sexta_fim_almoco?: string | null
          // Sábado
          sabado_ativo?: boolean
          sabado_inicio_trabalho?: string | null
          sabado_fim_trabalho?: string | null
          sabado_inicio_almoco?: string | null
          sabado_fim_almoco?: string | null
          // Duração do atendimento em minutos (15-240)
          duracao_atendimento?: number | null
          criado_em?: string
          atualizado_em?: string
        }
        Update: {
          id?: string
          id_organizacao?: string
          id_usuario?: string
          // Domingo
          domingo_ativo?: boolean
          domingo_inicio_trabalho?: string | null
          domingo_fim_trabalho?: string | null
          domingo_inicio_almoco?: string | null
          domingo_fim_almoco?: string | null
          // Segunda
          segunda_ativo?: boolean
          segunda_inicio_trabalho?: string | null
          segunda_fim_trabalho?: string | null
          segunda_inicio_almoco?: string | null
          segunda_fim_almoco?: string | null
          // Terça
          terca_ativo?: boolean
          terca_inicio_trabalho?: string | null
          terca_fim_trabalho?: string | null
          terca_inicio_almoco?: string | null
          terca_fim_almoco?: string | null
          // Quarta
          quarta_ativo?: boolean
          quarta_inicio_trabalho?: string | null
          quarta_fim_trabalho?: string | null
          quarta_inicio_almoco?: string | null
          quarta_fim_almoco?: string | null
          // Quinta
          quinta_ativo?: boolean
          quinta_inicio_trabalho?: string | null
          quinta_fim_trabalho?: string | null
          quinta_inicio_almoco?: string | null
          quinta_fim_almoco?: string | null
          // Sexta
          sexta_ativo?: boolean
          sexta_inicio_trabalho?: string | null
          sexta_fim_trabalho?: string | null
          sexta_inicio_almoco?: string | null
          sexta_fim_almoco?: string | null
          // Sábado
          sabado_ativo?: boolean
          sabado_inicio_trabalho?: string | null
          sabado_fim_trabalho?: string | null
          sabado_inicio_almoco?: string | null
          sabado_fim_almoco?: string | null
          // Duração do atendimento em minutos (15-240)
          duracao_atendimento?: number | null
          criado_em?: string
          atualizado_em?: string
        }
      }
      planos_assinatura: {
        Row: {
          id: string
          id_plano: 'plano_a' | 'plano_b' | 'plano_c' | 'plano_d'
          nome_plano: string
          descricao_plano: string | null
          atendimento_inteligente: boolean
          agendamento_automatico: boolean
          lembretes_automaticos: boolean
          confirmacao_email: boolean
          base_conhecimento: boolean
          relatorios_avancados: boolean
          integracao_whatsapp: boolean
          multi_usuarios: boolean
          personalizacao_agente: boolean
          analytics: boolean
          max_agendamentos_mes: number | null
          max_mensagens_whatsapp_mes: number | null
          max_usuarios: number | null
          max_contatos: number | null
          max_arquivos_conhecimento: number | null
          workflow_id_n8n: string | null
          preco_mensal: number | null
          preco_anual: number | null
          criado_em: string
          atualizado_em: string
        }
        Insert: {
          id?: string
          id_plano: 'plano_a' | 'plano_b' | 'plano_c' | 'plano_d'
          nome_plano: string
          descricao_plano?: string | null
          atendimento_inteligente?: boolean
          agendamento_automatico?: boolean
          lembretes_automaticos?: boolean
          confirmacao_email?: boolean
          base_conhecimento?: boolean
          relatorios_avancados?: boolean
          integracao_whatsapp?: boolean
          multi_usuarios?: boolean
          personalizacao_agente?: boolean
          analytics?: boolean
          max_agendamentos_mes?: number | null
          max_mensagens_whatsapp_mes?: number | null
          max_usuarios?: number | null
          max_contatos?: number | null
          max_arquivos_conhecimento?: number | null
          workflow_id_n8n?: string | null
          preco_mensal?: number | null
          preco_anual?: number | null
          criado_em?: string
          atualizado_em?: string
        }
        Update: {
          id?: string
          id_plano?: 'plano_a' | 'plano_b' | 'plano_c' | 'plano_d'
          nome_plano?: string
          descricao_plano?: string | null
          atendimento_inteligente?: boolean
          agendamento_automatico?: boolean
          lembretes_automaticos?: boolean
          confirmacao_email?: boolean
          base_conhecimento?: boolean
          relatorios_avancados?: boolean
          integracao_whatsapp?: boolean
          multi_usuarios?: boolean
          personalizacao_agente?: boolean
          analytics?: boolean
          max_agendamentos_mes?: number | null
          max_mensagens_whatsapp_mes?: number | null
          max_usuarios?: number | null
          max_contatos?: number | null
          max_arquivos_conhecimento?: number | null
          workflow_id_n8n?: string | null
          preco_mensal?: number | null
          preco_anual?: number | null
          criado_em?: string
          atualizado_em?: string
        }
      }
      uso_tokens: {
        Row: {
          id: string
          id_organizacao: string
          total_tokens: number
          custo_reais: number | null
          criado_em: string
        }
        Insert: {
          id?: string
          id_organizacao: string
          total_tokens?: number
          custo_reais?: number | null
          criado_em?: string
        }
        Update: {
          id?: string
          id_organizacao?: string
          total_tokens?: number
          custo_reais?: number | null
          criado_em?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
