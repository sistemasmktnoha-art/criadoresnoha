import { InstagramHandle } from "@/components/InstagramHandle";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { UserPlus, Instagram, Loader2, AlertCircle, Check } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Influencer } from "@/types";
import { NicheMultiSelect } from "@/components/NicheMultiSelect";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { catalogSelectOptions, parseInstagramUsername } from "@/lib/utils";
import { InfluencerAvatar } from "@/components/InfluencerAvatar";
import { ProfilePhotoUpload } from "@/components/ProfilePhotoUpload";

export function AddInfluencerDialog() {
  const { addInfluencer, influencers, catalogs } = useApp();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [draft, setDraft] = useState<Omit<Influencer, "id" | "addedAt" | "rating" | "totalRatings"> | null>(null);

  const [instagramUrl, setInstagramUrl] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [followers, setFollowers] = useState("");
  const [profilePic, setProfilePic] = useState("");
  const [niches, setNiches] = useState<string[]>([]);
  const [location, setLocation] = useState("");
  const [gender, setGender] = useState("feminino");
  const [contact, setContact] = useState("");
  const [notes, setNotes] = useState("");

  async function handleFetchProfile() {
    if (!instagramUrl.trim()) return;
    setLoading(true);
    setFetchError("");

    const parsed = parseInstagramUsername(instagramUrl);
    if (!parsed) {
      setLoading(false);
      toast({
        description: "Busca falhou. Você pode inserir os dados manualmente.",
        variant: "destructive",
      });
      return;
    }
    setUsername(parsed);

    try {
      const { data, error } = await supabase.functions.invoke("scrape-instagram", {
        body: { username: parsed },
      });

      if (error) throw error;

      if (data?.success) {
        setName(data.name || parsed);
        setProfilePic(data.profilePic || "");
        setFollowers(String(data.followers));
        setFetched(true);
        toast({ title: "Perfil encontrado", description: `@${parsed} carregado com sucesso` });
      } else {
        throw new Error(data?.error || "Erro ao buscar perfil");
      }
    } catch (err: unknown) {
      console.error("Fetch profile error:", err);
      const message = "Busca falhou. Você pode inserir os dados manualmente.";
      setFetched(false);
      setFetchError(message);
      toast({
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  function handleReview() {
    if (!name || !username) return;
    // Check for duplicate username
    const normalizedUsername = username.toLowerCase().replace(/^@/, "");
    const existing = influencers.find(
      (i) => i.username.toLowerCase().replace(/^@/, "") === normalizedUsername
    );
    if (existing) {
      toast({
        title: "Perfil já cadastrado",
        description: `@${normalizedUsername} já consta no banco de cadastros como "${existing.name}".`,
        variant: "destructive",
      });
      return;
    }
    setDraft({
      name,
      username,
      instagramUrl: `https://www.instagram.com/${username.replace(/^@/, "")}/`,
      profilePic,
      followers: parseInt(followers) || 0,
      niche: niches.join(", "),
      location,
      gender,
      isActive: true,
      notes,
      contact,
    });
  }

  function handleConfirm() {
    if (!draft) return;
    addInfluencer(draft);
    resetForm();
    setOpen(false);
    toast({ description: `${draft.name} foi cadastrado com sucesso.` });
  }

  function resetForm() {
    setInstagramUrl("");
    setFetched(false);
    setFetchError("");
    setName("");
    setUsername("");
    setFollowers("");
    setProfilePic("");
    setNiches([]);
    setLocation("");
    setGender("feminino");
    setContact("");
    setNotes("");
    setDraft(null);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <UserPlus className="h-4 w-4" />
          Adicionar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{draft ? "Revisar cadastro" : "Novo Influenciador"}</DialogTitle>
        </DialogHeader>

        {!draft ? (
          <div className="space-y-4">
            {/* Instagram URL */}
            <div className="space-y-3">
              <Label className="text-xs text-muted-foreground">Link do Instagram</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Instagram className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={instagramUrl}
                    onChange={(e) => setInstagramUrl(e.target.value)}
                    placeholder="https://instagram.com/usuario"
                    className="pl-10"
                  />
                </div>
                <Button variant="secondary" onClick={handleFetchProfile} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar"}
                </Button>
              </div>
              {fetchError && (
                <div className="flex items-start gap-2 rounded-md bg-muted p-2">
                  <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">{fetchError}</p>
                </div>
              )}
            </div>

            <div className="space-y-4 pt-2">
              {fetched && (
                <div className="flex items-center gap-3 rounded-lg bg-secondary/50 p-3">
                  <InfluencerAvatar name={name || username} src={profilePic} className="h-12 w-12" />
                  <div>
                    <p className="font-medium text-sm">{name}</p>
                    <p className="text-xs text-muted-foreground">
                      <InstagramHandle username={username} />
                      {parseInt(followers) > 0 && ` · ${parseInt(followers).toLocaleString("pt-BR")} seguidores`}
                    </p>
                  </div>
                </div>
              )}

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Nome</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Seguidores</Label>
                    <Input value={followers} onChange={(e) => setFollowers(e.target.value)} type="number" />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs text-muted-foreground">Nome de usuário</Label>
                    <Input value={username} onChange={(e) => setUsername(e.target.value.replace(/^@/, "").trim())} placeholder="@usuario" />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <ProfilePhotoUpload name={name || username} src={profilePic} onUploaded={setProfilePic} />
                    <Label className="text-xs text-muted-foreground">URL da Foto</Label>
                    <Input value={profilePic} onChange={(e) => setProfilePic(e.target.value)} type="url" placeholder="https://..." />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs text-muted-foreground">Nichos (até 3)</Label>
                    <NicheMultiSelect value={niches} onChange={setNiches} max={3} options={catalogs.categories} searchable />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Localização</Label>
                    <Select value={location} onValueChange={setLocation}>
                      <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                      <SelectContent>
                        {[...new Set([location, ...catalogs.locations].filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR")).map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Gênero</Label>
                    <Select value={gender} onValueChange={setGender}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {catalogSelectOptions(gender, catalogs.genders).map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Contato</Label>
                    <Input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="email@exemplo.com" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Observações</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Notas sobre o influenciador..."
                    rows={2}
                  />
                </div>

                <Button onClick={handleReview} className="w-full gap-2">
                  <Check className="h-4 w-4" />
                  Revisar cadastro
                </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-dashed border-border bg-muted/40 p-4 space-y-4">
              <p className="text-sm font-semibold flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                Confira os dados antes de concluir
              </p>

              <div className="flex items-center gap-3">
                <InfluencerAvatar name={draft.name} src={draft.profilePic} className="h-12 w-12" />
                <div>
                  <p className="font-medium text-sm">{draft.name}</p>
                  <p className="text-xs text-muted-foreground">
                    <InstagramHandle username={draft.username} url={draft.instagramUrl} />
                    {draft.followers > 0 && ` · ${draft.followers.toLocaleString("pt-BR")} seguidores`}
                  </p>
                </div>
              </div>

              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <p><span className="text-muted-foreground">Localização:</span> {draft.location || "—"}</p>
                <p><span className="text-muted-foreground">Gênero:</span> {draft.gender}</p>
                <p><span className="text-muted-foreground">Contato:</span> {draft.contact || "—"}</p>
                <p><span className="text-muted-foreground">Nichos:</span> {draft.niche || "—"}</p>
              </div>

              {draft.notes && (
                <div className="text-sm">
                  <p className="text-muted-foreground">Observações:</p>
                  <p className="whitespace-pre-wrap">{draft.notes}</p>
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setDraft(null)}>
                Voltar para edição
              </Button>
              <Button className="flex-1 gap-2" onClick={handleConfirm}>
                <Check className="h-4 w-4" />
                Concluir Adição
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
