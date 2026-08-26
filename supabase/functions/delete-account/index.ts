// Edge Function: exclui a conta do usuario autenticado (Auth + dados).
// Requer a service_role key (NUNCA no cliente). Deploy:
//   supabase functions deploy delete-account
//
// O app chama supabase.functions.invoke('delete-account'). As tabelas usam
// ON DELETE CASCADE em auth.users, entao remover o usuario apaga os dados.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'method_not_allowed' }), { status: 405, headers });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace('Bearer ', '');
    if (!jwt) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers });

    const url = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // A funcao descobre o usuario exclusivamente pelo JWT recebido. Nenhum
    // userId arbitrario enviado pelo cliente e aceito.
    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers });
    }

    // ON DELETE CASCADE remove apenas os dados ligados a esse auth.users.id.
    const { error } = await admin.auth.admin.deleteUser(userData.user.id);
    if (error) throw error;

    return new Response(JSON.stringify({ ok: true }), {
      headers,
    });
  } catch {
    return new Response(JSON.stringify({ error: 'delete_failed' }), { status: 500, headers });
  }
});
