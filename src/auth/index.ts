// Seleciona o provider de autenticacao conforme a configuracao do Supabase.
import { isSupabaseConfigured } from '@/lib/supabase';
import { localAuthProvider } from './localAuth';
import { supabaseAuthProvider } from './supabaseAuth';
import type { AuthProvider } from './types';

export const auth: AuthProvider = isSupabaseConfigured ? supabaseAuthProvider : localAuthProvider;
export const authMode = auth.mode;
export * from './types';
