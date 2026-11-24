import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const NOTIFY_EMAIL = "camilla@nohashoes.com.br";
const CODE_TTL_MINUTES = 15;

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") || "";

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) return json({ error: "Não autenticado." }, 401);

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const body = await req.json().catch(() => ({}));
    const action = body?.action as string;

    if (action === "request") {
      const newEmail = typeof body.newEmail === "string" ? body.newEmail.trim() : "";
      const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
      if (!newEmail && !newPassword) return json({ error: "Informe um novo e-mail ou uma nova senha." }, 400);
      if (newPassword && newPassword.length < 8) return json({ error: "A senha deve ter ao menos 8 caracteres." }, 400);

      const code = String(Math.floor(100000 + Math.random() * 900000));
      const codeHash = await sha256(code);
      const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60000).toISOString();

      await admin.from("login_change_requests").update({ used: true }).eq("user_id", user.id).eq("used", false);

      const { error: insertError } = await admin.from("login_change_requests").insert({
        user_id: user.id,
        code_hash: codeHash,
        new_email: newEmail || null,
        new_password: newPassword || null,
        expires_at: expiresAt,
      });
      if (insertError) return json({ error: "Não foi possível gerar o código." }, 500);

      const resendKey = Deno.env.get("RESEND_API_KEY");
      if (!resendKey) return json({ error: "Envio de e-mail não configurado." }, 500);

      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "NOHA Creators <onboarding@resend.dev>",
          to: [NOTIFY_EMAIL],
          subject: "Código para alterar o login da plataforma",
          html: `<div style="font-family:Arial,sans-serif">
            <h2>Alteração de login — NOHA Creators</h2>
            <p>Use o código abaixo para confirmar a alteração:</p>
            <p style="font-size:30px;font-weight:bold;letter-spacing:6px">${code}</p>
            <p>O código expira em ${CODE_TTL_MINUTES} minutos.</p>
            ${newEmail ? `<p>Novo e-mail solicitado: <b>${newEmail}</b></p>` : ""}
            ${newPassword ? `<p>Uma nova senha foi solicitada.</p>` : ""}
            <p style="color:#888;font-size:12px">Se não foi você, ignore este e-mail.</p>
          </div>`,
        }),
      });
      if (!resp.ok) {
        console.error("Resend error", await resp.text());
        return json({ error: "Falha ao enviar o e-mail com o código." }, 500);
      }
      return json({ ok: true, sentTo: NOTIFY_EMAIL });
    }

    if (action === "confirm") {
      const code = typeof body.code === "string" ? body.code.trim() : "";
      if (!code) return json({ error: "Informe o código recebido." }, 400);
      const codeHash = await sha256(code);

      const { data: rows } = await admin
        .from("login_change_requests")
        .select("*")
        .eq("user_id", user.id)
        .eq("used", false)
        .order("created_at", { ascending: false })
        .limit(1);

      const reqRow = rows?.[0];
      if (!reqRow) return json({ error: "Nenhuma solicitação pendente." }, 400);
      if (new Date(reqRow.expires_at).getTime() < Date.now()) return json({ error: "Código expirado." }, 400);
      if (reqRow.attempts >= 5) return json({ error: "Muitas tentativas. Solicite um novo código." }, 400);
      if (reqRow.code_hash !== codeHash) {
        await admin.from("login_change_requests").update({ attempts: reqRow.attempts + 1 }).eq("id", reqRow.id);
        return json({ error: "Código inválido." }, 400);
      }

      const attrs: Record<string, string> = {};
      if (reqRow.new_email) attrs.email = reqRow.new_email;
      if (reqRow.new_password) attrs.password = reqRow.new_password;
      const { error: updErr } = await admin.auth.admin.updateUserById(user.id, {
        ...attrs,
        email_confirm: reqRow.new_email ? true : undefined,
      });
      if (updErr) return json({ error: updErr.message }, 400);

      await admin.from("login_change_requests").update({ used: true, new_password: null }).eq("id", reqRow.id);
      return json({ ok: true });
    }

    return json({ error: "Ação inválida." }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: "Erro inesperado." }, 500);
  }
});
