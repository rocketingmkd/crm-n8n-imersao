import { User } from '@supabase/supabase-js';

export interface Organization {
  id: string;
  created_at: string;
  name: string;
  slug: string;
  settings: Record<string, any>;
  is_active: boolean;
  logo_url: string | null;
  contact_email: string | null;
  subscription_plan: string | null;
  plan_features: Record<string, any> | null;
  consultation_duration: number | null;
}

export interface Profile {
  id: string;
  organization_id: string | null; // NULL para super admins
  created_at: string;
  full_name: string;
  role: 'admin' | 'doctor' | 'assistant';
  avatar_url: string | null;
  is_active: boolean;
  is_super_admin: boolean; // TRUE para super admins
}

export interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  organization: Organization | null;
  isSuperAdmin: boolean; // Atalho para profile?.is_super_admin
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

