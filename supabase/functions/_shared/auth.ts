// Exige usuário logado: evita que chamadas anônimas gastem a cota de IA/Apify.
import { createClient } from "npm:@supabase/supabase-js@2";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

export async function requireUser(req: Request): Promise<Response | null> {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const deny = () => new Response(JSON.stringify({ error: "Não autenticado." }), { status: 401, headers });
  if (!token) return deny();
  const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { auth: { persistSession: false } });
  const { data, error } = await client.auth.getUser(token);
  return error || !data?.user ? deny() : null;
}
