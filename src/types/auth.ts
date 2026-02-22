import { User } from '@supabase/supabase-js';

export interface Organization {
  id: string;
  criado_em: string;
  nome: string;
  identificador: string;
  dados: Record<string, any>;
  ativo: boolean;
  url_logo: string | null;
  email_contato: string | null;
  plano_assinatura: string | null;
  recursos_plano: Record<string, any> | null;
  duracao_atendimento: number | null;
  rotulo_entidade: string;
  rotulo_entidade_plural: string;
}

export interface Profile {
  id: string;
  id_organizacao: string | null; // NULL para super admins
  criado_em: string;
  nome_completo: string;
  funcao: 'admin' | 'profissional' | 'assistente';
  url_avatar: string | null;
  ativo: boolean;
  super_admin: boolean; // TRUE para super admins
}

export interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  organization: Organization | null;
  isSuperAdmin: boolean; // Atalho para profile?.super_admin
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (data: SignUpData) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

// Tipo específico para criar super admin
export interface SuperAdminSignUpData {
  email: string;
  password: string;
  fullName: string;
}

// Tipo para criar organização pelo super admin
export interface CreateOrganizationData {
  organizationName: string;
  adminEmail: string;
  adminPassword: string;
  adminFullName: string;
}

export interface SignUpData {
  email: string;
  password: string;
  fullName: string;
  organizationName: string;
}
