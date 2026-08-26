// Cliente Supabase. Criado apenas se as variaveis de ambiente existirem.
// Sem configuracao, o app roda em modo LOCAL (contas locais neste dispositivo),
// mantendo o funcionamento offline-first.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured: boolean = !!(url && key);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, key as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        // Mantido estavel para nao invalidar sessoes durante a troca de branding.
        storageKey: 'fs2-auth',
      },
    })
  : null;
