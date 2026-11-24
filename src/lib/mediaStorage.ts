import { supabase } from "@/integrations/supabase/client";

const MEDIA_BUCKET = "app-media";

export function optimizeProfileImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) { reject(new Error("Selecione um arquivo de imagem.")); return; }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Formato de imagem inválido."));
      img.onload = () => {
        const scale = Math.min(1, 1024 / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("Não foi possível processar a imagem.")); return; }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/webp", 0.85));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function mimeToExtension(mimeType: string): string {
  const normalized = mimeType.toLowerCase();
  if (normalized.includes("jpeg") || normalized.includes("jpg")) return "jpg";
  if (normalized.includes("png")) return "png";
  if (normalized.includes("webp")) return "webp";
  if (normalized.includes("gif")) return "gif";
  if (normalized.includes("svg")) return "svg";
  return "bin";
}

function sanitizeExtension(ext: string): string {
  return ext.replace(/[^a-z0-9]/gi, "").toLowerCase() || "bin";
}

function dataUrlToBytes(dataUrl: string): { bytes: Uint8Array; mimeType: string } {
  const match = dataUrl.match(/^data:(.*?);base64,(.*)$/);
  if (!match) {
    throw new Error("Formato de imagem inválido.");
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

export async function uploadDataUrlToAppMedia(params: {
  userId: string;
  folder: "influencers" | "campaign-covers";
  dataUrl: string;
  entityId?: string;
}): Promise<string> {
  const { userId, folder, dataUrl, entityId } = params;
  const { bytes, mimeType } = dataUrlToBytes(dataUrl);
  const extension = sanitizeExtension(mimeToExtension(mimeType));
  const safeEntity = (entityId || crypto.randomUUID()).replace(/[^a-zA-Z0-9_-]/g, "");
  const path = `${userId}/${folder}/${safeEntity}-${Date.now()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(path, bytes, {
      contentType: mimeType,
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Falha no upload da imagem: ${uploadError.message}`);
  }

  const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) {
    throw new Error("Não foi possível gerar a URL da imagem.");
  }

  return data.publicUrl;
}
