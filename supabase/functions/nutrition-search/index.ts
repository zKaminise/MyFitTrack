// Proxy autenticado para Open Food Facts. Nao usa segredo externo; existe para
// identificar o app com User-Agent, normalizar CORS e manter o provider fora da UI.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const lastRequest = new Map<string, number>();

Deno.serve(async (req) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'method_not_allowed' }), { status: 405, headers });

  try {
    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data } = await admin.auth.getUser(jwt);
    if (!data.user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers });

    const now = Date.now();
    const previous = lastRequest.get(data.user.id) ?? 0;
    if (now - previous < 1200) {
      return new Response(JSON.stringify({ error: 'rate_limited' }), { status: 429, headers });
    }
    lastRequest.set(data.user.id, now);

    const body = await req.json().catch(() => ({}));
    const query = String(body.query ?? '').trim().slice(0, 80);
    if (query.length < 2) return new Response(JSON.stringify({ error: 'invalid_query' }), { status: 400, headers });

    const params = new URLSearchParams({
      action: 'process',
      search_simple: '1',
      search_terms: query,
      json: '1',
      page_size: '20',
      fields: 'code,product_name_pt,product_name,generic_name_pt,brands,serving_size,nutriments',
    });
    const response = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?${params}`, {
      headers: { 'User-Agent': 'MyFitTrack/1.1 (https://myfittrack.gabrielmisao.com.br)' },
    });
    if (!response.ok) throw new Error('provider_failed');
    const json = await response.json();
    return new Response(JSON.stringify({ products: json.products ?? [] }), { headers });
  } catch {
    return new Response(JSON.stringify({ error: 'provider_unavailable' }), { status: 503, headers });
  }
});
