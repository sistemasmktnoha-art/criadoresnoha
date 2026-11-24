import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const API_TOKEN = Deno.env.get('INFLUENCERS_API_TOKEN')!;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function getToken(req: Request): string | null {
  const auth = req.headers.get('Authorization');
  if (auth?.toLowerCase().startsWith('bearer ')) return auth.slice(7).trim();
  const headerToken = req.headers.get('x-api-key');
  if (headerToken) return headerToken.trim();
  const url = new URL(req.url);
  return url.searchParams.get('token');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const token = getToken(req);
  if (!token || token !== API_TOKEN) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { data, error } = await supabase
    .from('app_data')
    .select('data')
    .eq('data_key', 'influencers');

  if (error) {
    console.error('influencers-feed query failed:', error.message);
    return json({ error: 'Query failed', details: error.message }, 500);
  }

  const influencers: Array<Record<string, unknown>> = [];
  for (const row of data ?? []) {
    if (Array.isArray(row.data)) influencers.push(...(row.data as Array<Record<string, unknown>>));
  }

  const result = influencers
    .filter((i) => i && typeof i === 'object')
    .map((i) => {
      const username = typeof i.username === 'string' ? i.username.replace(/^@/, '').trim() : '';
      return {
        display_name: typeof i.name === 'string' ? i.name : '',
        username,
        profile_url: username ? `https://www.instagram.com/${username}` : '',
      };
    });

  return json({ count: result.length, influencers: result });
});
