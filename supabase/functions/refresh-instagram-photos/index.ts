// One-off maintenance: replace expired Instagram CDN photos with permanent copies.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const IG = /cdninstagram|fbcdn/;
const GATEWAY = "https://api.apify.com/v2";
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

async function store(url: string, username: string): Promise<string | null> {
  try {
    const r = await fetch(url);
    const type = r.headers.get("content-type") || "";
    if (!r.ok || !type.startsWith("image/")) return null;
    const ext = type.includes("png") ? "png" : type.includes("webp") ? "webp" : "jpg";
    const path = `instagram/${username.replace(/[^a-zA-Z0-9._-]/g, "")}-${Date.now()}.${ext}`;
    const { error } = await admin.storage.from("app-media").upload(path, new Uint8Array(await r.arrayBuffer()), { contentType: type, upsert: true });
    if (error) return null;
    return admin.storage.from("app-media").getPublicUrl(path).data.publicUrl;
  } catch { return null; }
}

const clean = (u: string) => String(u || "").replace(/^@/, "").replace(/^.*instagram\.com\//i, "").split(/[/?#]/)[0].toLowerCase();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const { limit = 40 } = await req.json().catch(() => ({}));
  const { data: rows, error } = await admin.from("app_data").select("id, data").eq("data_key", "influencers");
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  const stats = { direct: 0, apify: 0, failed: 0, remaining: 0 };
  let budget = limit;
  for (const row of rows ?? []) {
    const list = Array.isArray(row.data) ? row.data as any[] : [];
    const todo = list.filter((i) => IG.test(i?.profilePic || "") && i?.username);
    const batch = todo.slice(0, budget);
    budget -= batch.length;
    stats.remaining += todo.length - batch.length;
    const needApify: any[] = [];
    for (const inf of batch) {
      const url = await store(inf.profilePic, clean(inf.username));
      if (url) { inf.profilePic = url; stats.direct++; } else needApify.push(inf);
    }
    if (needApify.length) {
      // One single Apify run for the whole batch.
      const res = await fetch(`${GATEWAY}/acts/apify~instagram-profile-scraper/run-sync-get-dataset-items`, {
        method: "POST",
        headers: { Authorization: `Bearer ${Deno.env.get("APIFY_API_KEY")}`, "Content-Type": "application/json" },
        body: JSON.stringify({ usernames: needApify.map((i) => clean(i.username)) }),
      });
      const items = res.ok ? await res.json() : [];
      if (!res.ok) console.error("apify", res.status, await res.text());
      const byUser = new Map((Array.isArray(items) ? items : []).map((p: any) => [String(p.username || "").toLowerCase(), p]));
      for (const inf of needApify) {
        const p: any = byUser.get(clean(inf.username));
        const pic = p?.profilePicUrlHD || p?.profilePicUrl;
        const url = pic ? await store(pic, clean(inf.username)) : null;
        if (url) { inf.profilePic = url; stats.apify++; }
        else { inf.profilePic = ""; stats.failed++; } // clear dead link so initials show
      }
    }
    if (batch.length) await admin.from("app_data").update({ data: list, updated_at: new Date().toISOString() }).eq("id", row.id);
  }
  return new Response(JSON.stringify(stats), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
