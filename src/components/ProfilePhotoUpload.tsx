import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InfluencerAvatar } from "@/components/InfluencerAvatar";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { uploadDataUrlToAppMedia, optimizeProfileImage } from "@/lib/mediaStorage";

export function ProfilePhotoUpload({ name, src, entityId, onUploaded }: {
  name: string; src: string; entityId?: string; onUploaded: (url: string) => void | Promise<void>;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  return <div className="flex items-center gap-3">
    <InfluencerAvatar name={name} src={src} className="h-16 w-16 shrink-0 ring-2 ring-border" />
    <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => input.current?.click()} className="gap-2">
      {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
      {uploading ? "Enviando foto" : "Enviar foto"}
    </Button>
    <input ref={input} type="file" accept="image/*" aria-label="Selecionar foto de perfil" className="hidden" onChange={async (e) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      if (!user) { toast({ title: "Entre na conta para enviar a foto", variant: "destructive" }); return; }
      setUploading(true);
      try {
        const dataUrl = await optimizeProfileImage(file);
        const url = await uploadDataUrlToAppMedia({ userId: user.id, folder: "influencers", entityId, dataUrl });
        await onUploaded(url);
        toast({ title: "Foto enviada" });
      } catch (error) {
        toast({ title: "Falha ao enviar foto", description: error instanceof Error ? error.message : "Tente novamente.", variant: "destructive" });
      } finally { setUploading(false); }
    }} />
  </div>;
}