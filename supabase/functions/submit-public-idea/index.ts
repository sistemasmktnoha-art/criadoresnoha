import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { author, link, type, observation } = await req.json();

    if (!author || !link) {
      return new Response(JSON.stringify({ error: "author e link são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const newIdea = {
      id: Date.now().toString(),
      author,
      link,
      type: type || "influenciador",
      observation: observation || undefined,
      status: "aguardando_avaliacao",
      createdAt: new Date().toISOString(),
    };

    // Find all users that have ideaDeposits data
    const { data: rows, error: fetchError } = await supabaseAdmin
      .from("app_data")
      .select("id, user_id, data")
      .eq("data_key", "ideaDeposits");

    if (fetchError) {
      console.error("Fetch error:", fetchError);
      return new Response(JSON.stringify({ error: "Erro ao buscar dados" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (rows && rows.length > 0) {
      // Append the new idea to each user's ideaDeposits
      for (const row of rows) {
        const existing = Array.isArray(row.data) ? row.data : [];
        const updated = [newIdea, ...existing];
        await supabaseAdmin
          .from("app_data")
          .update({ data: updated, updated_at: new Date().toISOString() })
          .eq("id", row.id);
      }
    } else {
      // No existing ideaDeposits rows — find any user and create the entry
      const { data: anyRow } = await supabaseAdmin
        .from("app_data")
        .select("user_id")
        .limit(1)
        .maybeSingle();

      if (anyRow) {
        await supabaseAdmin.from("app_data").insert({
          user_id: anyRow.user_id,
          data_key: "ideaDeposits",
          data: [newIdea],
          updated_at: new Date().toISOString(),
        });
      }
    }

    return new Response(JSON.stringify({ success: true, idea: newIdea }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
