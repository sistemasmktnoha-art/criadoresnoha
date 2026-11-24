import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MEDIA_BUCKET = "app-media";
const DEFAULT_LIMIT = 30;

type InfluencerRecord = {
  id?: string;
  profilePic?: string;
  [key: string]: unknown;
};

type CampaignRecord = {
  id?: string;
  coverImage?: string;
  [key: string]: unknown;
};

function isDataUrl(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("data:image/");
}

function mimeToExtension(mimeType: string): string {
  const normalized = mimeType.toLowerCase();
  if (normalized.includes("jpeg") || normalized.includes("jpg")) return "jpg";
  if (normalized.includes("png")) return "png";
  if (normalized.includes("webp")) return "webp";
  if (normalized.includes("gif")) return "gif";
  return "bin";
}

function dataUrlToBytes(dataUrl: string): { bytes: Uint8Array; mimeType: string } {
  const match = dataUrl.match(/^data:(.*?);base64,(.*)$/);
  if (!match) {
    throw new Error("invalid_data_url");
  }

  const mimeType = match[1] || "application/octet-stream";
  const base64 = match[2];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return { bytes, mimeType };
}

async function uploadImageDataUrl(params: {
  supabaseAdmin: ReturnType<typeof createClient>;
  userId: string;
  folder: "influencers" | "campaign-covers";
  entityId: string;
  dataUrl: string;
}): Promise<string> {
  const { supabaseAdmin, userId, folder, entityId, dataUrl } = params;
  const { bytes, mimeType } = dataUrlToBytes(dataUrl);
  const extension = mimeToExtension(mimeType).replace(/[^a-z0-9]/gi, "") || "bin";
  const safeEntity = entityId.replace(/[^a-zA-Z0-9_-]/g, "") || crypto.randomUUID();
  const path = `${userId}/${folder}/${safeEntity}-${Date.now()}.${extension}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from(MEDIA_BUCKET)
    .upload(path, bytes, {
      contentType: mimeType,
      upsert: true,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data } = supabaseAdmin.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) {
    throw new Error("public_url_failed");
  }

  return data.publicUrl;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "backend_not_configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) {
      return new Response(JSON.stringify({ error: "missing_auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !authData?.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = authData.user.id;
    const body = await req.json().catch(() => ({}));
    const limit = Math.max(1, Math.min(100, Number(body?.limit) || DEFAULT_LIMIT));

    const { data: rows, error: readError } = await supabaseAdmin
      .from("app_data")
      .select("id, data_key, data")
      .eq("user_id", userId)
      .in("data_key", ["influencers", "campaigns"]);

    if (readError) {
      return new Response(JSON.stringify({ error: readError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let converted = 0;
    let pending = 0;

    const influencersRow = rows?.find((r) => r.data_key === "influencers");
    if (influencersRow && Array.isArray(influencersRow.data)) {
      const nextInfluencers = [...(influencersRow.data as InfluencerRecord[])];
      let influencersChanged = false;

      for (let i = 0; i < nextInfluencers.length; i += 1) {
        const inf = nextInfluencers[i];
        const profilePic = inf?.profilePic;

        if (isDataUrl(profilePic)) {
          if (converted < limit) {
            try {
              const publicUrl = await uploadImageDataUrl({
                supabaseAdmin,
                userId,
                folder: "influencers",
                entityId: inf.id || crypto.randomUUID(),
                dataUrl: profilePic,
              });
              nextInfluencers[i] = { ...inf, profilePic: publicUrl };
              converted += 1;
              influencersChanged = true;
            } catch (uploadErr) {
              console.error("Failed to migrate influencer image", inf.id, uploadErr);
            }
          } else {
            pending += 1;
          }
        }
      }

      if (influencersChanged) {
        await supabaseAdmin
          .from("app_data")
          .update({ data: nextInfluencers, updated_at: new Date().toISOString() })
          .eq("id", influencersRow.id)
          .eq("user_id", userId);
      }
    }

    const campaignsRow = rows?.find((r) => r.data_key === "campaigns");
    if (campaignsRow && Array.isArray(campaignsRow.data)) {
      const nextCampaigns = [...(campaignsRow.data as CampaignRecord[])];
      let campaignsChanged = false;

      for (let i = 0; i < nextCampaigns.length; i += 1) {
        const campaign = nextCampaigns[i];
        const coverImage = campaign?.coverImage;

        if (isDataUrl(coverImage)) {
          if (converted < limit) {
            try {
              const publicUrl = await uploadImageDataUrl({
                supabaseAdmin,
                userId,
                folder: "campaign-covers",
                entityId: campaign.id || crypto.randomUUID(),
                dataUrl: coverImage,
              });
              nextCampaigns[i] = { ...campaign, coverImage: publicUrl };
              converted += 1;
              campaignsChanged = true;
            } catch (uploadErr) {
              console.error("Failed to migrate campaign image", campaign.id, uploadErr);
            }
          } else {
            pending += 1;
          }
        }
      }

      if (campaignsChanged) {
        await supabaseAdmin
          .from("app_data")
          .update({ data: nextCampaigns, updated_at: new Date().toISOString() })
          .eq("id", campaignsRow.id)
          .eq("user_id", userId);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        converted,
        hasMore: pending > 0,
        pending,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("migrate-media-base64 error", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "internal_error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
