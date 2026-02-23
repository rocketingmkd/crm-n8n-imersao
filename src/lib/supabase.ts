import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://detsacgocmirxkgjusdf.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_FdFCGKtrLAgQPRuzoW8IWA__30t116t";

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Cliente sem tipagem do Cloud — usa tipagem manual em src/types/database.ts
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

