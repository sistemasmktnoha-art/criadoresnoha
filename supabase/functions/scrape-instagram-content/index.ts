// Leitura automática de métricas de posts (Firecrawl + IA) desativada nesta versão.
// Devolve métricas zeradas com partial=true, como a função já fazia quando a leitura falhava;
// as métricas podem ser digitadas manualmente no app.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  return new Response(
    JSON.stringify({ success: true, metrics: { likes: 0, comments: 0, views: 0, shares: 0 }, partial: true }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
