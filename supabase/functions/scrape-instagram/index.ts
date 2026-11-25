import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.23.8";
import { createClient } from "npm:@supabase/supabase-js@2";
import { requireUser } from "../_shared/auth.ts";

// Instagram CDN links expire; copy the photo into permanent public storage.
async function persistProfilePic(url: string, username: string): Promise<string> {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`download ${res.status}`);
    const type = res.headers.get("content-type") || "image/jpeg";
    if (!type.startsWith("image/")) throw new Error("not an image");
    const bytes = new Uint8Array(await res.arrayBuffer());
    const ext = type.includes("png") ? "png" : type.includes("webp") ? "webp" : "jpg";
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const path = `instagram/${username.replace(/[^a-zA-Z0-9._-]/g, "")}-${Date.now()}.${ext}`;
    const { error } = await admin.storage.from("app-media").upload(path, bytes, { contentType: type, upsert: true });
    if (error) throw error;
    return admin.storage.from("app-media").getPublicUrl(path).data.publicUrl;
  } catch (e) {
    console.error("persistProfilePic failed:", e);
    return url;
  }
}

const RequestSchema = z.object({
  username: z.string().trim().min(1).max(300),
});

const APIFY_URL = "https://api.apify.com/v2";

function extractInstagramUsername(input: string): string | null {
  const cleaned = input.trim();
  const urlMatch = cleaned.match(/^(?:https?:\/\/)?(?:www\.)?instagram\.com\/([a-zA-Z0-9._]+)(?:[/?#].*)?$/i);
  const candidate = urlMatch?.[1] ?? cleaned.replace(/^@/, "");
  return /^[a-zA-Z0-9._]+$/.test(candidate) ? candidate : null;
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function fetchInstagramProfile(username: string, apifyApiKey: string) {
  return fetch(`${APIFY_URL}/acts/apify~instagram-profile-scraper/run-sync-get-dataset-items`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apifyApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ usernames: [username] }),
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (req.method !== "POST") {
    return jsonResponse({ error: "Método não permitido." }, 405);
  }
  const denied = await requireUser(req);
  if (denied) return denied;

  try {
    const parsedBody = RequestSchema.safeParse(await req.json());
    if (!parsedBody.success) {
      return jsonResponse({ error: "Informe uma URL ou nome de usuário válido do Instagram." }, 400);
    }

    const username = extractInstagramUsername(parsedBody.data.username);
    if (!username) {
      return jsonResponse({ error: "Não foi possível extrair um nome de usuário válido." }, 400);
    }

    const apifyApiKey = Deno.env.get("APIFY_API_KEY");
    if (!apifyApiKey) {
      return jsonResponse({ error: "A conexão com a Apify não está configurada." }, 500);
    }

    const apiResponse = await fetchInstagramProfile(username, apifyApiKey);

    if (!apiResponse.ok) {
      const details = await apiResponse.text();
      console.error(`Apify Instagram request failed [${apiResponse.status}]: ${details}`);
      return jsonResponse({
        error: "A Apify não conseguiu carregar este perfil.",
        status: apiResponse.status,
      }, apiResponse.status >= 400 && apiResponse.status < 500 ? apiResponse.status : 502);
    }

    const responseJson = await apiResponse.json();
    const items = Array.isArray(responseJson) ? responseJson : responseJson?.data;
    const profile = Array.isArray(items) ? items[0] : null;
    const followers = Number(profile?.followersCount);
    const profilePic = profile?.profilePicUrlHD || profile?.profilePicUrl;
    const name = typeof profile?.fullName === "string" ? profile.fullName : "";

    if (!Number.isFinite(followers) || typeof profilePic !== "string" || !profilePic) {
      console.error("Apify Instagram response is missing required profile fields");
      return jsonResponse({ error: "A Apify retornou dados incompletos para este perfil." }, 502);
    }

    return jsonResponse({
      success: true,
      username,
      followers,
      profilePic: await persistProfilePic(profilePic, username),
      name,
    }, 200);
  } catch (e) {
    console.error("scrape-instagram Apify error:", e);
    return jsonResponse({ error: "Não foi possível consultar os dados do perfil no momento." }, 500);
  }
});
