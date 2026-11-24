// Descoberta de influenciadores (Firecrawl + IA) desativada nesta versão.
// Para reativar: criar conta no Firecrawl, definir o segredo FIRECRAWL_API_KEY e restaurar a lógica de busca.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  return new Response(
    JSON.stringify({ error: "A busca automática de influenciadores está desativada nesta versão." }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
