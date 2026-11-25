import { InstagramHandle } from "@/components/InstagramHandle";
import { GenerateMessageDialog } from "@/components/GenerateMessageDialog";
import { parseLocalDate } from "@/lib/utils";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "@/components/StarRating";
import { InfluencerCoupons } from "@/components/InfluencerCoupons";
import {
  ArrowLeft, MessageCircle as MessageCircleIcon, Instagram, Mail, MapPin, Users, Calendar, Megaphone, Trash2, Camera, Crown, Award, Plus, X, Edit, Star, Hash, Copy, Repeat, Loader2,
} from "lucide-react";
import { useState, useRef, useMemo, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { NicheMultiSelect } from "@/components/NicheMultiSelect";
import { DIRECTOR_AUTHORS, Campaign, CampaignParticipant } from "@/types";
import { ProfilePhotoUpload } from "@/components/ProfilePhotoUpload";
import { normalizeSearch, parseInstagramUsername, instagramProfileUrl, maskPhone, maskCPF, maskCNPJ, maskCEP, lookupCEP, RECEPTION_SPACE_OPTIONS, catalogSelectOptions } from "@/lib/utils";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { InfluencerAvatar } from "@/components/InfluencerAvatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Link2 } from "lucide-react";

/** Status da participação do influenciador em uma campanha */
function getParticipationStatus(campaign: Campaign, p?: CampaignParticipant): { label: string; className: string } {
  if (p?.selectionStatus === "nao_aprovado") {
    return { label: "Reprovado na seleção", className: "bg-red-100 text-red-800 border-red-300" };
  }
  const published = p?.materialStatus === "publicado";
  if (published) {
    return { label: "Concluíu", className: "bg-emerald-100 text-emerald-800 border-emerald-300" };
  }
  if (p?.contactStatus === "nao_retornou") {
    return { label: "Não concluiu (sem retorno)", className: "bg-orange-100 text-orange-800 border-orange-300" };
  }
  if (campaign.status === "finalizada") {
    return { label: "Não concluiu (campanha encerrada)", className: "bg-orange-100 text-orange-800 border-orange-300" };
  }
  return { label: "Em andamento", className: "bg-blue-100 text-blue-800 border-blue-300" };
}

function formatFollowers(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

export default function InfluencerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { influencers, campaigns: allCampaigns, recurrences, updateInfluencer, deleteInfluencer, rateInfluencer, getCampaignsForInfluencer, updateCampaign, catalogs } = useApp();
  const { user } = useAuth();
  const { toast } = useToast();


  const inf = influencers.find((i) => i.id === id);
  const [editAmbassador, setEditAmbassador] = useState(false);
  const [editNotes, setEditNotes] = useState(false);
  const [notes, setNotes] = useState(inf?.notes || "");
  const [editProfile, setEditProfile] = useState(false);
  const [profileDisplayName, setProfileDisplayName] = useState(inf?.name || "");
  const [profileFullName, setProfileFullName] = useState(inf?.fullName || "");
  const [profileWhatsapp, setProfileWhatsapp] = useState(inf?.whatsapp || "");
  const [profileEmail, setProfileEmail] = useState(inf?.email || (inf?.contact?.includes("@") ? inf.contact : "") || "");
  const [profileLocation, setProfileLocation] = useState(inf?.location || "");
  const [profileGender, setProfileGender] = useState<string>(inf?.gender || "outro");
  const [profileFollowers, setProfileFollowers] = useState(String(inf?.followers || 0));
  const [profilePic, setProfilePic] = useState(inf?.profilePic || "");
  const [profileNiches, setProfileNiches] = useState<string[]>(inf?.niche ? inf.niche.split(", ").filter(Boolean) : []);
  const [profileCpf, setProfileCpf] = useState(inf?.cpf || "");
  const [profileCnpj, setProfileCnpj] = useState(inf?.cnpj || "");
  const [profileBirthDate, setProfileBirthDate] = useState(inf?.birthDate || "");
  const [profileInstagram, setProfileInstagram] = useState(inf?.instagramUrl || (inf?.username ? `https://www.instagram.com/${inf.username}/` : ""));
  const [refreshingIG, setRefreshingIG] = useState(false);

  async function fetchInstagramProfile() {
    const newUsername = parseInstagramUsername(profileInstagram).replace(/^@/, "");
    if (!newUsername) {
      toast({ description: "Informe uma URL válida do Instagram.", variant: "destructive" });
      return;
    }
    setRefreshingIG(true);
    try {
      const { data, error } = await supabase.functions.invoke("scrape-instagram", { body: { username: newUsername } });
      if (error || !data?.success) throw error || new Error("Perfil não encontrado");
      setProfileInstagram(`https://www.instagram.com/${newUsername}/`);
      setProfileFollowers(String(data.followers ?? profileFollowers));
      if (data.name) setProfileDisplayName(data.name);
      if (data.profilePic) setProfilePic(data.profilePic);
      toast({ title: "Perfil encontrado", description: `Dados de @${newUsername} preenchidos.` });
    } catch (error: unknown) {
      console.error("Instagram profile lookup failed:", error);
      toast({ description: "Busca falhou. Você pode inserir os dados manualmente.", variant: "destructive" });
    } finally {
      setRefreshingIG(false);
    }
  }

  // Address (structured)
  const [editAddress, setEditAddress] = useState(false);
  const [addrStreet, setAddrStreet] = useState(inf?.addressStreet || "");
  const [addrNumber, setAddrNumber] = useState(inf?.addressNumber || "");
  const [addrComplement, setAddrComplement] = useState(inf?.addressComplement || "");
  const [addrNeighborhood, setAddrNeighborhood] = useState(inf?.addressNeighborhood || "");
  const [addrZip, setAddrZip] = useState(inf?.addressZip || "");
  const [addrCity, setAddrCity] = useState(inf?.addressCity || "");
  const [addrState, setAddrState] = useState(inf?.addressState || "");
  const [addrReception, setAddrReception] = useState<string>(inf?.addressReceptionSpace || "");
  const [cepLoading, setCepLoading] = useState(false);

  async function handleZipChange(raw: string) {
    const masked = maskCEP(raw);
    setAddrZip(masked);
    if (masked.replace(/\D/g, "").length === 8) {
      setCepLoading(true);
      const found = await lookupCEP(masked);
      setCepLoading(false);
      if (found) {
        setAddrCity(found.city);
        setAddrState(found.state);
        setAddrStreet((prev) => prev || found.street || "");
        setAddrNeighborhood((prev) => prev || found.neighborhood || "");
      }
    }
  }

  // Payment (structured)
  const hasStructuredPayment = !!(inf?.paymentPix || inf?.paymentBank || inf?.paymentAgency || inf?.paymentAccount);
  const hasAnyPayment = hasStructuredPayment || !!inf?.paymentData?.trim();
  const [editPayment, setEditPayment] = useState(false);
  const [payBank, setPayBank] = useState(inf?.paymentBank || "");
  const [payAgency, setPayAgency] = useState(inf?.paymentAgency || "");
  const [payAccount, setPayAccount] = useState(inf?.paymentAccount || "");
  const [payPix, setPayPix] = useState(inf?.paymentPix || "");
  const [payAccountType, setPayAccountType] = useState<"fisica" | "juridica">(inf?.paymentAccountType || "fisica");

  const [ambassadorStart, setAmbassadorStart] = useState(inf?.ambassadorStartDate || "");
  const [ambassadorEnd, setAmbassadorEnd] = useState(inf?.ambassadorEndDate || "");
  const [ambassadorCommission, setAmbassadorCommission] = useState(String(inf?.ambassadorCommission ?? 0));
  const [ambassadorBenefits, setAmbassadorBenefits] = useState(inf?.ambassadorBenefits || "");
  const [ambassadorProducts, setAmbassadorProducts] = useState(String(inf?.ambassadorProductsPerMonth ?? 0));


  // Characteristics
  const [characteristics, setCharacteristics] = useState<string[]>(inf?.characteristics || []);
  const [newCharacteristic, setNewCharacteristic] = useState("");

  // Rating dialog
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingAuthor, setRatingAuthor] = useState("");
  const [ratingReason, setRatingReason] = useState("");

  // Rating history editing
  const [msgOpen, setMsgOpen] = useState(false);
  const [editingRatingId, setEditingRatingId] = useState<string | null>(null);
  const [editRatingValue, setEditRatingValue] = useState(0);
  const [editRatingReason, setEditRatingReason] = useState("");

  // Add to campaign
  const [addToCampaignOpen, setAddToCampaignOpen] = useState(false);
  const [addCampaignSearch, setAddCampaignSearch] = useState("");
  const [addCampaignShowAll, setAddCampaignShowAll] = useState(false);


  // Vínculos (links com outros influenciadores)
  const [linkSearchOpen, setLinkSearchOpen] = useState(false);
  const [linkSearchTerm, setLinkSearchTerm] = useState("");

  // Conflito de vínculo ao adicionar à campanha
  const [linkConflict, setLinkConflict] = useState<{ campaign: Campaign; partnerId: string } | null>(null);

  const location = useLocation();

  // Rola até a seção de cupons quando a URL tem #cupons
  useEffect(() => {
    if (location.hash === "#cupons") {
      const t = setTimeout(() => {
        document.getElementById("cupons")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 150);
      return () => clearTimeout(t);
    }
  }, [location.hash]);

  const creatorDestaqueRank = useMemo((): 1 | 2 | 3 | null => {
    if (!inf) return null;
    const myExceeded = inf.deliveryExceededCount || 0;
    if (myExceeded === 0) return null;
    const uniqueCounts = [...new Set(
      influencers.map((i) => i.deliveryExceededCount || 0).filter((c) => c > 0)
    )].sort((a, b) => b - a);
    const rank = uniqueCounts.indexOf(myExceeded) + 1;
    return rank >= 1 && rank <= 3 ? (rank as 1 | 2 | 3) : null;
  }, [inf, influencers]);

  const allCharacteristics = useMemo(() => {
    const set = new Set<string>();
    influencers.forEach(i => (i.characteristics || []).forEach(c => set.add(c)));
    return Array.from(set).sort();
  }, [influencers]);

  if (!inf) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-muted-foreground">Influenciador não encontrado</p>
        <Button variant="outline" onClick={() => navigate("/")}>Voltar</Button>
      </div>
    );
  }

  const infCampaigns = getCampaignsForInfluencer(inf.id);
  const deliveryOnTime = inf.deliveryOnTimeCount || 0;
  const deliveryLate = inf.deliveryLateCount || 0;
  const totalDeliveryEvals = deliveryOnTime + deliveryLate;

  const infRecurrences = recurrences.filter((r) => r.influencerId === inf.id);
  const activeRecurrences = infRecurrences.filter((r) => r.status === "ativa");
  const MONTH_NAMES_PT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const fmtMonth = (m: string) => {
    const [y, mo] = m.split("-").map(Number);
    return `${MONTH_NAMES_PT[(mo || 1) - 1]}/${y}`;
  };

  const availableCampaignsForAdd = allCampaigns.filter(c =>
    (c.status === "a_iniciar" || c.status === "em_andamento") &&
    !c.influencerIds.includes(inf.id)
  );

  function handleSaveNotes() {
    updateInfluencer({ ...inf, notes });
    setEditNotes(false);
  }

  function addLink(otherId: string) {
    if (!inf || otherId === inf.id) return;
    const other = influencers.find(i => i.id === otherId);
    if (!other) return;
    const myLinks = Array.from(new Set([...(inf.linkedInfluencerIds || []), otherId]));
    const otherLinks = Array.from(new Set([...(other.linkedInfluencerIds || []), inf.id]));
    updateInfluencer({ ...inf, linkedInfluencerIds: myLinks });
    updateInfluencer({ ...other, linkedInfluencerIds: otherLinks });
    setLinkSearchOpen(false);
    setLinkSearchTerm("");
    toast({ title: "Vínculo criado", description: `Vinculado a ${other.name}.` });
  }

  function removeLink(otherId: string) {
    if (!inf) return;
    const other = influencers.find(i => i.id === otherId);
    const myLinks = (inf.linkedInfluencerIds || []).filter(x => x !== otherId);
    updateInfluencer({ ...inf, linkedInfluencerIds: myLinks });
    if (other) {
      const otherLinks = (other.linkedInfluencerIds || []).filter(x => x !== inf.id);
      updateInfluencer({ ...other, linkedInfluencerIds: otherLinks });
    }
    toast({ title: "Vínculo removido" });
  }

  function handleDelete() {
    if (confirm("Deseja remover este influenciador?")) {
      deleteInfluencer(inf.id);
      navigate("/");
    }
  }

  function addCharacteristic(tag: string) {
    const t = tag.trim();
    if (!t || characteristics.length >= 10 || characteristics.includes(t)) return;
    const updated = [...characteristics, t];
    setCharacteristics(updated);
    updateInfluencer({ ...inf, characteristics: updated });
    setNewCharacteristic("");
  }

  function removeCharacteristic(tag: string) {
    const updated = characteristics.filter(c => c !== tag);
    setCharacteristics(updated);
    updateInfluencer({ ...inf, characteristics: updated });
  }

  function handleSubmitRating() {
    if (!ratingValue || !ratingAuthor) return;
    rateInfluencer(inf.id, ratingValue, ratingAuthor, ratingReason);
    setRatingDialogOpen(false);
    setRatingValue(0);
    setRatingAuthor("");
    setRatingReason("");
    toast({ title: "Avaliação registrada!" });
  }

  function handleEditRatingSubmit(ratingId: string) {
    const updated = (inf.ratingHistory || []).map(r =>
      r.id === ratingId ? { ...r, rating: editRatingValue, reason: editRatingReason } : r
    );
    const sum = updated.reduce((s, r) => s + r.rating, 0);
    const avg = updated.length > 0 ? Math.round((sum / updated.length) * 10) / 10 : 0;
    updateInfluencer({ ...inf, ratingHistory: updated, rating: avg, totalRatings: updated.length });
    setEditingRatingId(null);
    toast({ title: "Avaliação atualizada" });
  }

  function handleDeleteRating(ratingId: string) {
    const updated = (inf.ratingHistory || []).filter(r => r.id !== ratingId);
    const sum = updated.reduce((s, r) => s + r.rating, 0);
    const avg = updated.length > 0 ? Math.round((sum / updated.length) * 10) / 10 : 0;
    updateInfluencer({ ...inf, ratingHistory: updated, rating: avg, totalRatings: updated.length });
    toast({ title: "Avaliação removida" });
  }

  function buildNewParticipant() {
    return {
      influencerId: inf!.id,
      contactStatus: "nao_iniciado" as const,
      deliveryType: null,
      managerNotified: false,
      chosenProduct: "",
      shippingAddress: "",
      shippingName: "",
      shippingRequested: false,
      negotiationStatus: "pendente" as const,
      negotiationCondition: "",
      materialStatus: "pendente" as const,
      publishCollaboration: false,
      scheduledDate: "",
    };
  }

  function handleAddToCampaign(campaignId: string) {
    const campaign = allCampaigns.find(c => c.id === campaignId);
    if (!campaign) return;
    // Verifica se algum influenciador vinculado já está na campanha
    const linkedConflictId = (inf.linkedInfluencerIds || []).find(l => campaign.influencerIds.includes(l));
    if (linkedConflictId) {
      setAddToCampaignOpen(false);
      setLinkConflict({ campaign, partnerId: linkedConflictId });
      return;
    }
    confirmAddToCampaign(campaign, null);
  }

  function confirmAddToCampaign(campaign: Campaign, replacePartnerId: string | null) {
    const removals = replacePartnerId ? [replacePartnerId] : [];
    updateCampaign({
      ...campaign,
      influencerIds: [...campaign.influencerIds.filter(id => !removals.includes(id)), inf.id],
      participants: [...(campaign.participants || []).filter(p => !removals.includes(p.influencerId)), buildNewParticipant()],
      contents: (campaign.contents || []).filter(ct => !removals.includes(ct.influencerId)),
    });
    setAddToCampaignOpen(false);
    setLinkConflict(null);
    toast({ title: replacePartnerId ? "Vinculado à campanha (parceiro substituído)!" : "Vinculado à campanha!" });
  }

  const statusLabels: Record<string, string> = {
    a_iniciar: "A iniciar", em_andamento: "Em andamento", finalizada: "Finalizada",
  };

  const ratingReasonPrompt = ratingValue <= 3
    ? "Por que a experiência não foi tão legal?"
    : ratingValue === 4
    ? "Por que a experiência foi boa?"
    : "Por que a experiência foi excelente?";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>
      <Button size="sm" variant="outline" className="gap-1" onClick={() => setMsgOpen(true)}>
        <MessageCircleIcon className="h-4 w-4" /> Gerar mensagem (DM/WhatsApp)
      </Button>
      {msgOpen && inf && <GenerateMessageDialog open onOpenChange={setMsgOpen} influencer={inf} />}

      {/* Header */}
      <div className="flex flex-wrap items-start gap-5">
        <ProfilePhotoUpload name={inf.name} src={inf.profilePic} entityId={inf.id} onUploaded={(url) => {
          setProfilePic(url);
          updateInfluencer({ ...inf, profilePic: url });
        }} />
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">{inf.name}</h1>
            {inf.isAmbassador && <Crown className="h-5 w-5 text-amber-500" />}
            {creatorDestaqueRank && (
              <Badge
                variant="outline"
                className={`text-[10px] flex items-center gap-1 ${
                  creatorDestaqueRank === 1
                    ? "bg-amber-50 text-amber-700 border-amber-400"
                    : creatorDestaqueRank === 2
                    ? "bg-slate-100 text-slate-500 border-slate-400"
                    : "bg-orange-50 text-orange-700 border-orange-400"
                }`}
              >
                <Award className="h-3 w-3" />
                Creator Destaque {creatorDestaqueRank === 1 ? "🥇" : creatorDestaqueRank === 2 ? "🥈" : "🥉"}
              </Badge>
            )}
            <Badge variant={inf.isActive ? "default" : "secondary"}>
              {inf.isActive ? "Ativo" : "Inativo"}
            </Badge>
            {activeRecurrences.length > 0 && (
              <Badge variant="outline" className="text-[10px] flex items-center gap-1 bg-emerald-50 text-emerald-700 border-emerald-300">
                <Repeat className="h-3 w-3" />
                Recorrência ativa{activeRecurrences.length > 1 ? `s (${activeRecurrences.length})` : ""}
              </Badge>
            )}
            <button
              onClick={() => { updateInfluencer({ ...inf, isAmbassador: !inf.isAmbassador }); toast({ title: inf.isAmbassador ? "Embaixador desativado" : "Embaixador ativado!" }); }}
              className={`ml-1 rounded-full p-1.5 transition-colors ${inf.isAmbassador ? "bg-amber-100 text-amber-600 hover:bg-amber-200" : "bg-secondary text-muted-foreground hover:bg-accent"}`}
              title={inf.isAmbassador ? "Remover do programa de embaixadores" : "Adicionar ao programa de embaixadores"}>
              <Crown className="h-4 w-4" />
            </button>
            <a
              href={instagramProfileUrl(inf.instagramUrl || inf.username)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Instagram className="h-3.5 w-3.5" />
              @{inf.username}
            </a>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> {formatFollowers(inf.followers)} seguidores</span>
            {inf.location && <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {inf.location}</span>}
            {inf.whatsapp && <span className="flex items-center gap-1.5">📱 {inf.whatsapp}</span>}
            {(inf.email || (inf.contact?.includes("@") && inf.contact)) && <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> {inf.email || inf.contact}</span>}

            <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Adicionado em {parseLocalDate(inf.addedAt).toLocaleDateString("pt-BR")}</span>
          </div>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex flex-wrap justify-center gap-1">
              {inf.niche ? inf.niche.split(", ").map((n) => (
                <Badge key={n} variant="outline" className="text-xs">{n}</Badge>
              )) : <span className="text-2xl font-bold">—</span>}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Nicho</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{infCampaigns.length}</p>
            <p className="text-xs text-muted-foreground">Campanhas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center gap-1 p-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{inf.rating > 0 ? inf.rating : "—"}</span>
              {inf.rating > 0 && <StarRating rating={inf.rating} readonly size={14} />}
            </div>
            <p className="text-xs text-muted-foreground">{inf.totalRatings} avaliações</p>
            {inf.totalRatings === 0 ? (
              <Badge variant="outline" className="text-[10px] mt-1">Aguardando primeira avaliação</Badge>
            ) : inf.rating >= 4 ? (
              <Badge variant="outline" className="text-[10px] mt-1 bg-emerald-100 text-emerald-800 border-emerald-300">Ótimo para trabalhar</Badge>
            ) : inf.rating >= 3 ? (
              <Badge variant="outline" className="text-[10px] mt-1 bg-amber-100 text-amber-800 border-amber-300">Precisa de atenção</Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] mt-1 bg-red-100 text-red-800 border-red-300">Cuidado extremo</Badge>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Characteristics Tags */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Hash className="h-4 w-4" /> Palavras-chave ({characteristics.length}/10)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {characteristics.map(tag => (
              <Badge key={tag} variant="secondary" className="text-xs gap-1 pr-1">
                {tag}
                <button type="button" className="ml-0.5 hover:text-destructive" onClick={() => removeCharacteristic(tag)} title="Remover"><X className="h-3 w-3" /></button>
              </Badge>
            ))}
            {characteristics.length === 0 && <span className="text-xs text-muted-foreground">Nenhuma palavra-chave adicionada</span>}
          </div>
          {characteristics.length < 10 && (
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  value={newCharacteristic}
                  onChange={(e) => setNewCharacteristic(e.target.value)}
                  placeholder="Adicionar palavra-chave..."
                  className="text-xs"
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCharacteristic(newCharacteristic); } }}
                />
              </div>
              <Button size="sm" variant="outline" className="h-9 text-xs" onClick={() => addCharacteristic(newCharacteristic)} disabled={!newCharacteristic.trim()}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          )}
          {allCharacteristics.length > 0 && (
            <details className="mt-2">
              <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground select-none">
                Lista geral de palavras-chave ({allCharacteristics.length})
              </summary>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {allCharacteristics.map(tag => (
                  <Badge key={tag} variant="outline" className="text-xs cursor-default select-none"
                    onContextMenu={(e) => {
                      e.preventDefault();
                      if (confirm(`Excluir "${tag}" da lista geral? Será removida de todos os influenciadores.`)) {
                        influencers.forEach(i => {
                          if ((i.characteristics || []).includes(tag)) {
                            updateInfluencer({ ...i, characteristics: (i.characteristics || []).filter(c => c !== tag) });
                          }
                        });
                        setCharacteristics(prev => prev.filter(c => c !== tag));
                      }
                    }}
                    title="Clique com botão direito para excluir da lista geral"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </details>
          )}
        </CardContent>
      </Card>

      {/* Delivery stats */}
      {(totalDeliveryEvals > 0 || (inf.deliveryExceededCount || 0) > 0) && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">Histórico de Entregas</h3>
            <div className="flex flex-wrap gap-3">
              {totalDeliveryEvals > 0 && (
                <Badge variant="outline" className={`text-xs ${deliveryOnTime > deliveryLate ? "bg-emerald-100 text-emerald-800 border-emerald-300" : "bg-red-100 text-red-800 border-red-300"}`}>
                  {deliveryOnTime > deliveryLate ? "Costuma entregar no prazo" : "Costuma atrasar a entrega"}
                  <span className="ml-1 opacity-70">({deliveryOnTime}/{totalDeliveryEvals} no prazo)</span>
                </Badge>
              )}
              {(inf.deliveryGoodCount || 0) > 0 && (
                <Badge variant="outline" className="text-xs">{inf.deliveryGoodCount} entrega(s) "bom"</Badge>
              )}
              {(inf.deliveryExceededCount || 0) > 0 && (
                <Badge variant="outline" className="text-xs bg-purple-100 text-purple-800 border-purple-300">
                  {inf.deliveryExceededCount} entrega(s) "superou expectativas"
                </Badge>
              )}
              {(inf.deliveryLowCount || 0) > 0 && (
                <Badge variant="outline" className="text-xs bg-red-100 text-red-800 border-red-300">
                  {inf.deliveryLowCount} entrega(s) "baixo"
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recurrences history */}
      {infRecurrences.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Repeat className="h-4 w-4" /> Histórico de Recorrências ({infRecurrences.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {infRecurrences
              .slice()
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
              .map((rec) => {
                const cfg = rec.status === "ativa"
                  ? { label: "Ativa", color: "bg-emerald-100 text-emerald-800 border-emerald-300" }
                  : rec.status === "pausada"
                  ? { label: "Pausada", color: "bg-amber-100 text-amber-800 border-amber-300" }
                  : { label: "Finalizada", color: "bg-muted text-muted-foreground border-border" };
                const cost = rec.months.reduce((s, m) => s + m.paymentAmount + (m.productCost || 0), 0);
                return (
                  <div key={rec.id} className="rounded-lg border border-border p-3 space-y-1">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="text-sm font-medium">{rec.title}</p>
                      <Badge variant="outline" className={`text-[10px] ${cfg.color}`}>{cfg.label}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {fmtMonth(rec.startMonth)} → {fmtMonth(rec.endMonth)} · {rec.months.length} meses
                      {cost > 0 && ` · R$ ${cost.toLocaleString("pt-BR")}`}
                    </p>
                  </div>
                );
              })}
          </CardContent>
        </Card>
      )}

      {/* Rate */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Avaliar experiência</CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="gap-2" onClick={() => setRatingDialogOpen(true)}>
            <Star className="h-4 w-4" /> Registrar avaliação
          </Button>
        </CardContent>
      </Card>

      {/* Rating History */}
      {(inf.ratingHistory || []).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Histórico de Avaliações ({(inf.ratingHistory || []).length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(inf.ratingHistory || []).slice().reverse().map(entry => (
              <div key={entry.id} className="rounded-lg border border-border p-3 space-y-1">
                {editingRatingId === entry.id ? (
                  <div className="space-y-2">
                    <StarRating rating={editRatingValue} onRate={setEditRatingValue} size={18} />
                    <Textarea value={editRatingReason} onChange={(e) => setEditRatingReason(e.target.value)} className="min-h-[40px] text-xs" />
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setEditingRatingId(null)}>Cancelar</Button>
                      <Button size="sm" className="h-6 text-xs" onClick={() => handleEditRatingSubmit(entry.id)}>Salvar</Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-primary">{entry.author}</span>
                        <StarRating rating={entry.rating} readonly size={12} />
                      </div>
                      <span className="text-[10px] text-muted-foreground">{parseLocalDate(entry.createdAt).toLocaleDateString("pt-BR")}</span>
                    </div>
                    {entry.reason && <p className="text-xs text-muted-foreground">{entry.reason}</p>}
                    <div className="flex gap-1 justify-end">
                      <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1" onClick={() => { setEditingRatingId(entry.id); setEditRatingValue(entry.rating); setEditRatingReason(entry.reason); }}>
                        <Edit className="h-2.5 w-2.5" /> Editar
                      </Button>
                      <Button size="sm" variant="ghost" className="h-6 text-[10px] text-destructive gap-1" onClick={() => handleDeleteRating(entry.id)}>
                        <Trash2 className="h-2.5 w-2.5" /> Excluir
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Edit Profile */}
      <Card>
        <CardHeader className="flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Editar Perfil</CardTitle>
          <Button variant="ghost" size="sm" className="text-xs gap-1" disabled={refreshingIG}
            onClick={() => {
              if (editProfile) {
                const displayName = (profileDisplayName || profileFullName || inf.name).trim();
                const contactCombined = profileEmail || profileWhatsapp || "";
                const newUsername = parseInstagramUsername(profileInstagram).replace(/^@/, "");
                const baseUpdates = {
                  ...inf,
                  name: displayName,
                  fullName: profileFullName.trim() || undefined,
                  whatsapp: profileWhatsapp.trim() || undefined,
                  email: profileEmail.trim() || undefined,
                  contact: contactCombined,
                  location: profileLocation,
                  gender: profileGender,
                  followers: parseInt(profileFollowers) || 0,
                  profilePic,
                  niche: profileNiches.join(", "),
                  cpf: profileCpf, cnpj: profileCnpj,
                  birthDate: profileBirthDate,
                  username: newUsername || inf.username,
                  instagramUrl: newUsername ? `https://www.instagram.com/${newUsername}/` : inf.instagramUrl,
                };
                updateInfluencer(baseUpdates);
                toast({ title: "Perfil atualizado" });
              } else {
                setProfileDisplayName(inf.name);
                setProfileFullName(inf.fullName || "");
                setProfileWhatsapp(inf.whatsapp || "");
                setProfileEmail(inf.email || (inf.contact?.includes("@") ? inf.contact : ""));
                setProfileLocation(inf.location || "");
                setProfileGender(inf.gender || "outro");
                setProfileFollowers(String(inf.followers || 0));
                setProfilePic(inf.profilePic || "");
                setProfileNiches(inf.niche ? inf.niche.split(", ").filter(Boolean) : []);
                setProfileCpf(inf.cpf || "");
                setProfileCnpj(inf.cnpj || "");
                setProfileBirthDate(inf.birthDate || "");
                setProfileInstagram(inf.instagramUrl || instagramProfileUrl(inf.username));
              }
              setEditProfile(!editProfile);
            }}>
            {refreshingIG && <Loader2 className="h-3 w-3 animate-spin" />}
            {editProfile ? "Salvar" : "Editar"}
          </Button>
        </CardHeader>
        <CardContent>
          {editProfile ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1"><Label className="text-xs text-muted-foreground">Nome completo</Label><Input value={profileFullName} onChange={(e) => setProfileFullName(e.target.value)} placeholder="Nome completo" /></div>
              <div className="space-y-1"><Label className="text-xs text-muted-foreground">Nome de exibição</Label><Input value={profileDisplayName} onChange={(e) => setProfileDisplayName(e.target.value)} placeholder="Como aparece na plataforma" /></div>
              <div className="space-y-1"><Label className="text-xs text-muted-foreground">WhatsApp</Label><Input value={profileWhatsapp} onChange={(e) => setProfileWhatsapp(maskPhone(e.target.value))} placeholder="(00) 00000-0000" /></div>
              <div className="space-y-1"><Label className="text-xs text-muted-foreground">Email</Label><Input type="email" value={profileEmail} onChange={(e) => setProfileEmail(e.target.value)} placeholder="email@exemplo.com" /></div>
              <div className="space-y-1"><Label className="text-xs text-muted-foreground">Seguidores</Label><Input type="number" value={profileFollowers} onChange={(e) => setProfileFollowers(e.target.value)} /></div>
              <div className="space-y-1 sm:col-span-2"><ProfilePhotoUpload name={profileDisplayName} src={profilePic} entityId={inf.id} onUploaded={setProfilePic} /><Label className="text-xs text-muted-foreground">URL da Foto</Label><Input type="url" value={profilePic} onChange={(e) => setProfilePic(e.target.value)} placeholder="https://..." /></div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs text-muted-foreground">Instagram (URL ou @usuário)</Label>
                <div className="flex gap-2">
                  <Input value={profileInstagram} onChange={(e) => setProfileInstagram(e.target.value)} placeholder="https://instagram.com/usuario" />
                  <Button type="button" variant="secondary" onClick={() => void fetchInstagramProfile()} disabled={refreshingIG}>
                    {refreshingIG ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar Dados"}
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Localização</Label>
                <Select value={profileLocation} onValueChange={setProfileLocation}>
                  <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>{[...new Set([profileLocation, ...catalogs.locations].filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR")).map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Gênero</Label>
                <Select value={profileGender} onValueChange={setProfileGender}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {catalogSelectOptions(profileGender, catalogs.genders).map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label className="text-xs text-muted-foreground">CPF</Label><Input value={profileCpf} onChange={(e) => setProfileCpf(maskCPF(e.target.value))} placeholder="000.000.000-00" /></div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">CNPJ</Label>
                <Input
                  value={profileCnpj}
                  onChange={(e) => setProfileCnpj(maskCNPJ(e.target.value))}
                  placeholder="00.000.000/0000-00"
                  disabled={profileCnpj === "Não possui"}
                />
                <label className="flex items-center gap-2 pt-1 text-xs text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 accent-primary"
                    checked={profileCnpj === "Não possui"}
                    onChange={(e) => setProfileCnpj(e.target.checked ? "Não possui" : "")}
                  />
                  Não possui CNPJ
                </label>
              </div>
              <div className="space-y-1"><Label className="text-xs text-muted-foreground">Data de Nascimento</Label><Input type="date" value={profileBirthDate} onChange={(e) => setProfileBirthDate(e.target.value)} /></div>
              <div className="space-y-1 sm:col-span-2"><Label className="text-xs text-muted-foreground">Nichos (até 3)</Label><NicheMultiSelect value={profileNiches} onChange={setProfileNiches} max={3} options={catalogs.categories} /></div>
            </div>
          ) : (
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <p><span className="text-muted-foreground">Nome completo:</span> {inf.fullName || "—"}</p>
              <p><span className="text-muted-foreground">Nome de exibição:</span> {inf.name}</p>
              <p><span className="text-muted-foreground">Instagram:</span> <a href={instagramProfileUrl(inf.instagramUrl || inf.username)} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">@{inf.username}</a></p>
              <p><span className="text-muted-foreground">WhatsApp:</span> {inf.whatsapp || "—"}</p>
              <p><span className="text-muted-foreground">Email:</span> {inf.email || (inf.contact?.includes("@") ? inf.contact : "—")}</p>
              <p><span className="text-muted-foreground">CPF:</span> {inf.cpf || "—"}</p>
              <p><span className="text-muted-foreground">CNPJ:</span> {inf.cnpj || "—"}</p>
              <p><span className="text-muted-foreground">Nascimento:</span> {inf.birthDate ? parseLocalDate(inf.birthDate).toLocaleDateString("pt-BR") : "—"}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Endereço para Envio */}
      <Card>
        <CardHeader className="flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <MapPin className="h-4 w-4" /> Endereço para Envio
          </CardTitle>
          <Button variant="ghost" size="sm" className="text-xs"
            onClick={() => {
              if (editAddress) {
                const composed = [
                  addrStreet && `${addrStreet}${addrNumber ? `, ${addrNumber}` : ""}${addrComplement ? ` (${addrComplement})` : ""}`,
                  addrNeighborhood,
                  [addrCity, addrState].filter(Boolean).join(" - "),
                  addrZip && `CEP ${addrZip}`,
                ].filter(Boolean).join(" — ");
                updateInfluencer({
                  ...inf,
                  addressStreet: addrStreet.trim() || undefined,
                  addressNumber: addrNumber.trim() || undefined,
                  addressComplement: addrComplement.trim() || undefined,
                  addressNeighborhood: addrNeighborhood.trim() || undefined,
                  addressZip: addrZip.trim() || undefined,
                  addressCity: addrCity.trim() || undefined,
                  addressState: addrState.trim() || undefined,
                  addressReceptionSpace: (addrReception || undefined) as typeof inf.addressReceptionSpace,
                  shippingAddress: composed || inf.shippingAddress,
                });
                toast({ title: "Endereço atualizado" });
              }
              setEditAddress(!editAddress);
            }}>
            {editAddress ? "Salvar" : (inf.addressStreet || inf.shippingAddress ? "Editar" : "Adicionar")}
          </Button>
        </CardHeader>
        <CardContent>
          {editAddress ? (
            <div className="grid gap-3 sm:grid-cols-6">
              <div className="space-y-1 sm:col-span-4"><Label className="text-xs text-muted-foreground">Rua</Label><Input value={addrStreet} onChange={(e) => setAddrStreet(e.target.value)} /></div>
              <div className="space-y-1 sm:col-span-2"><Label className="text-xs text-muted-foreground">Número</Label><Input value={addrNumber} onChange={(e) => setAddrNumber(e.target.value)} /></div>
              <div className="space-y-1 sm:col-span-3"><Label className="text-xs text-muted-foreground">Complemento</Label><Input value={addrComplement} onChange={(e) => setAddrComplement(e.target.value)} placeholder="Apto, bloco, referência..." /></div>
              <div className="space-y-1 sm:col-span-3"><Label className="text-xs text-muted-foreground">Bairro</Label><Input value={addrNeighborhood} onChange={(e) => setAddrNeighborhood(e.target.value)} /></div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs text-muted-foreground">CEP</Label>
                <Input value={addrZip} onChange={(e) => void handleZipChange(e.target.value)} placeholder="00000-000" inputMode="numeric" />
                {cepLoading && <p className="text-[10px] text-muted-foreground">Buscando endereço...</p>}
              </div>
              <div className="space-y-1 sm:col-span-2"><Label className="text-xs text-muted-foreground">Cidade</Label><Input value={addrCity} onChange={(e) => setAddrCity(e.target.value)} /></div>
              <div className="space-y-1 sm:col-span-2"><Label className="text-xs text-muted-foreground">Estado</Label><Input value={addrState} onChange={(e) => setAddrState(e.target.value.toUpperCase())} placeholder="UF" maxLength={2} /></div>
              <div className="space-y-2 sm:col-span-6">
                <Label className="text-xs text-muted-foreground">Sua residência ou prédio possui portaria?</Label>
                <RadioGroup value={addrReception} onValueChange={setAddrReception} className="gap-2 rounded-lg border border-border p-3">
                  {RECEPTION_SPACE_OPTIONS.map((o) => (
                    <div key={o.value} className="flex items-center gap-2">
                      <RadioGroupItem value={o.value} id={`recep-${o.value}`} />
                      <Label htmlFor={`recep-${o.value}`} className="text-sm font-normal cursor-pointer">{o.label}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            </div>
          ) : (
            (inf.addressStreet || inf.addressCity || inf.shippingAddress) ? (
              <div className="grid gap-1 text-sm sm:grid-cols-2">
                {inf.addressStreet ? (
                  <>
                    <p className="sm:col-span-2"><span className="text-muted-foreground">Endereço:</span> {inf.addressStreet}{inf.addressNumber ? `, ${inf.addressNumber}` : ""}</p>
                    {inf.addressComplement && <p className="sm:col-span-2"><span className="text-muted-foreground">Complemento:</span> {inf.addressComplement}</p>}
                    {inf.addressNeighborhood && <p><span className="text-muted-foreground">Bairro:</span> {inf.addressNeighborhood}</p>}
                    {inf.addressZip && <p><span className="text-muted-foreground">CEP:</span> {inf.addressZip}</p>}
                    {inf.addressCity && <p><span className="text-muted-foreground">Cidade:</span> {inf.addressCity}</p>}
                    {inf.addressState && <p><span className="text-muted-foreground">Estado:</span> {inf.addressState}</p>}
                    {inf.addressReceptionSpace && (
                      <p className="sm:col-span-2"><span className="text-muted-foreground">Recebimento:</span> {RECEPTION_SPACE_OPTIONS.find((o) => o.value === inf.addressReceptionSpace)?.label}</p>
                    )}
                  </>
                ) : (
                  <p className="sm:col-span-2 whitespace-pre-wrap text-secondary-foreground">{inf.shippingAddress}</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum endereço informado.</p>
            )
          )}
        </CardContent>
      </Card>



      {/* Vínculos com outros influenciadores */}
      <Card>
        <CardHeader className="flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Link2 className="h-4 w-4" /> Vínculos
          </CardTitle>
          <Popover open={linkSearchOpen} onOpenChange={(v) => { setLinkSearchOpen(v); if (!v) setLinkSearchTerm(""); }}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="text-xs gap-1">
                <Plus className="h-3 w-3" /> Vincular
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-2" align="end">
              <Input
                autoFocus
                placeholder="Buscar influenciador..."
                value={linkSearchTerm}
                onChange={(e) => setLinkSearchTerm(e.target.value)}
                className="mb-2 h-9"
              />
              <div className="max-h-60 overflow-y-auto">
                {(() => {
                  const linked = new Set(inf.linkedInfluencerIds || []);
                  const term = normalizeSearch(linkSearchTerm);
                  const results = influencers
                    .filter(i => i.id !== inf.id && !linked.has(i.id))
                    .filter(i => !term || normalizeSearch(i.name).includes(term) || normalizeSearch(i.username).includes(term))
                    .slice(0, 30);
                  if (results.length === 0) {
                    return <p className="px-2 py-3 text-xs text-muted-foreground text-center">Nenhum influenciador encontrado.</p>;
                  }
                  return results.map(i => (
                    <button
                      key={i.id}
                      onClick={() => addLink(i.id)}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-secondary transition-colors"
                    >
                      <img src={i.profilePic} alt={i.name} className="h-7 w-7 rounded-full object-cover" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm">{i.name}</p>
                        <p className="truncate text-xs text-muted-foreground"><InstagramHandle username={i.username} url={i.instagramUrl} /></p>
                      </div>
                    </button>
                  ));
                })()}
              </div>
            </PopoverContent>
          </Popover>
        </CardHeader>
        <CardContent>
          {(inf.linkedInfluencerIds || []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum vínculo registrado.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {(inf.linkedInfluencerIds || []).map(lid => {
                const linked = influencers.find(i => i.id === lid);
                if (!linked) return null;
                return (
                  <div key={lid} className="group flex items-center gap-2 rounded-full border bg-secondary/40 py-1 pl-1 pr-2">
                    <Link to={`/influencer/${linked.id}`} className="flex items-center gap-2">
                      <img src={linked.profilePic} alt={linked.name} className="h-6 w-6 rounded-full object-cover" />
                      <span className="text-xs">{linked.name}</span>
                    </Link>
                    <button
                      onClick={() => removeLink(lid)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                      title="Remover vínculo"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Observações</CardTitle>
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => editNotes ? handleSaveNotes() : setEditNotes(true)}>

            {editNotes ? "Salvar" : "Editar"}
          </Button>
        </CardHeader>
        <CardContent>
          {editNotes ? <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            : <p className="text-sm text-secondary-foreground">{inf.notes || "Sem observações."}</p>}
        </CardContent>
      </Card>

      {/* Ambassador Details */}
      {inf.isAmbassador && (
        <Card className="border-amber-300/50">
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-amber-600 flex items-center gap-2"><Crown className="h-4 w-4" /> Programa de Embaixador</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs"
              onClick={() => {
                if (editAmbassador) {
                  updateInfluencer({
                    ...inf, ambassadorStartDate: ambassadorStart, ambassadorEndDate: ambassadorEnd,
                    ambassadorCommission: parseFloat(ambassadorCommission) || 0,
                    ambassadorProductsPerMonth: parseInt(ambassadorProducts) || 0, ambassadorBenefits,
                  });
                  toast({ title: "Informações do embaixador atualizadas" });
                }
                setEditAmbassador(!editAmbassador);
              }}>
              {editAmbassador ? "Salvar" : "Editar"}
            </Button>
          </CardHeader>
          <CardContent>
            {editAmbassador ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1"><Label className="text-xs text-muted-foreground">Início do programa</Label><Input type="date" value={ambassadorStart} onChange={(e) => setAmbassadorStart(e.target.value)} /></div>
                <div className="space-y-1"><Label className="text-xs text-muted-foreground">Fim do programa</Label><Input type="date" value={ambassadorEnd} onChange={(e) => setAmbassadorEnd(e.target.value)} /></div>
                <div className="space-y-1"><Label className="text-xs text-muted-foreground">Comissão (%)</Label><Input type="number" min={0} max={100} value={ambassadorCommission} onChange={(e) => setAmbassadorCommission(e.target.value)} /></div>
                <div className="space-y-1"><Label className="text-xs text-muted-foreground">Produtos por mês</Label><Input type="number" min={0} value={ambassadorProducts} onChange={(e) => setAmbassadorProducts(e.target.value)} /></div>
                <div className="space-y-1 sm:col-span-2"><Label className="text-xs text-muted-foreground">Benefícios</Label><Textarea value={ambassadorBenefits} onChange={(e) => setAmbassadorBenefits(e.target.value)} rows={2} placeholder="Descreva os benefícios..." /></div>
              </div>
            ) : (
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <p><span className="text-muted-foreground">Início:</span> {inf.ambassadorStartDate ? parseLocalDate(inf.ambassadorStartDate).toLocaleDateString("pt-BR") : "—"}</p>
                <p><span className="text-muted-foreground">Fim:</span> {inf.ambassadorEndDate ? parseLocalDate(inf.ambassadorEndDate).toLocaleDateString("pt-BR") : "Indefinido"}</p>
                <p><span className="text-muted-foreground">Comissão:</span> {(inf.ambassadorCommission ?? 0) > 0 ? `${inf.ambassadorCommission}%` : "—"}</p>
                <p><span className="text-muted-foreground">Produtos/mês:</span> {(inf.ambassadorProductsPerMonth ?? 0) > 0 ? inf.ambassadorProductsPerMonth : "—"}</p>
                <p className="sm:col-span-2"><span className="text-muted-foreground">Benefícios:</span> {inf.ambassadorBenefits || "—"}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <InfluencerCoupons influencerId={inf.id} />

      <Card>
        <CardHeader className="flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Dados de pagamento</CardTitle>
          <div className="flex items-center gap-1">
            {hasAnyPayment && !editPayment && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs gap-1"
                onClick={() => {
                  const lines = [`Nome: ${inf.fullName || inf.name}`];
                  if (inf.cpf) lines.push(`CPF: ${inf.cpf}`);
                  if (inf.cnpj) lines.push(`CNPJ: ${inf.cnpj}`);
                  if (hasStructuredPayment) {
                    if (inf.paymentPix) lines.push(`Chave Pix: ${inf.paymentPix}`);
                    if (inf.paymentBank) lines.push(`Banco: ${inf.paymentBank}`);
                    if (inf.paymentAgency) lines.push(`Agência: ${inf.paymentAgency}`);
                    if (inf.paymentAccount) lines.push(`Conta: ${inf.paymentAccount}`);
                    if (inf.paymentAccountType) lines.push(`Tipo de conta: ${inf.paymentAccountType === "fisica" ? "Pessoa Física" : "Pessoa Jurídica"}`);
                  } else if (inf.paymentData) {
                    lines.push(`Dados de pagamento:\n${inf.paymentData}`);
                  }
                  navigator.clipboard.writeText(lines.join("\n"));
                  toast({ title: "Dados copiados!" });
                }}
              >
                <Copy className="h-3.5 w-3.5" /> Copiar
              </Button>
            )}
            {hasAnyPayment && (
              <Button variant="ghost" size="sm" className="text-xs"
                disabled={editPayment && !payPix.trim()}
                onClick={() => {
                  if (editPayment) {
                    if (!payPix.trim()) { toast({ title: "Chave Pix é obrigatória", variant: "destructive" }); return; }
                    updateInfluencer({
                      ...inf,
                      paymentPix: payPix.trim(),
                      paymentBank: payBank.trim() || undefined,
                      paymentAgency: payAgency.trim() || undefined,
                      paymentAccount: payAccount.trim() || undefined,
                      paymentAccountType: payAccountType,
                    });
                    toast({ title: "Dados de pagamento atualizados" });
                  }
                  setEditPayment(!editPayment);
                }}>
                {editPayment ? "Salvar" : "Editar"}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {editPayment || !hasAnyPayment ? (
            editPayment || !hasAnyPayment ? (
              !hasAnyPayment && !editPayment ? (
                <div className="flex flex-col items-start gap-2">
                  <p className="text-sm text-muted-foreground">Nenhum dado de pagamento registrado.</p>
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => setEditPayment(true)}>
                    <Plus className="h-3.5 w-3.5" /> Adicionar dados de pagamento
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1 sm:col-span-2">
                      <Label className="text-xs text-muted-foreground">Chave Pix <span className="text-destructive">*</span></Label>
                      <Input value={payPix} onChange={(e) => setPayPix(e.target.value)} placeholder="CPF/CNPJ, email, telefone ou chave aleatória" />
                    </div>
                    <div className="space-y-1"><Label className="text-xs text-muted-foreground">Código do banco</Label><Input value={payBank} onChange={(e) => setPayBank(e.target.value)} placeholder="Ex: 260 (Nubank)" /></div>
                    <div className="space-y-1"><Label className="text-xs text-muted-foreground">Agência</Label><Input value={payAgency} onChange={(e) => setPayAgency(e.target.value)} placeholder="0001" /></div>
                    <div className="space-y-1"><Label className="text-xs text-muted-foreground">Conta</Label><Input value={payAccount} onChange={(e) => setPayAccount(e.target.value)} placeholder="00000-0" /></div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Tipo de conta</Label>
                      <Select value={payAccountType} onValueChange={(v: "fisica" | "juridica") => setPayAccountType(v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fisica">Pessoa Física</SelectItem>
                          <SelectItem value="juridica">Pessoa Jurídica</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {!hasAnyPayment && (
                    <Button size="sm" onClick={() => {
                      if (!payPix.trim()) { toast({ title: "Chave Pix é obrigatória", variant: "destructive" }); return; }
                      updateInfluencer({
                        ...inf,
                        paymentPix: payPix.trim(),
                        paymentBank: payBank.trim() || undefined,
                        paymentAgency: payAgency.trim() || undefined,
                        paymentAccount: payAccount.trim() || undefined,
                        paymentAccountType: payAccountType,
                      });
                      toast({ title: "Dados de pagamento salvos" });
                      setEditPayment(false);
                    }}>Salvar</Button>
                  )}
                </div>
              )
            ) : null
          ) : (
            <div className="grid gap-1 text-sm sm:grid-cols-2">
              {hasStructuredPayment ? (
                <>
                  {inf.paymentPix && <p className="sm:col-span-2"><span className="text-muted-foreground">Chave Pix:</span> {inf.paymentPix}</p>}
                  {inf.paymentBank && <p><span className="text-muted-foreground">Banco:</span> {inf.paymentBank}</p>}
                  {inf.paymentAgency && <p><span className="text-muted-foreground">Agência:</span> {inf.paymentAgency}</p>}
                  {inf.paymentAccount && <p><span className="text-muted-foreground">Conta:</span> {inf.paymentAccount}</p>}
                  {inf.paymentAccountType && <p><span className="text-muted-foreground">Tipo:</span> {inf.paymentAccountType === "fisica" ? "Pessoa Física" : "Pessoa Jurídica"}</p>}
                </>
              ) : (
                <p className="sm:col-span-2 whitespace-pre-wrap text-secondary-foreground">{inf.paymentData}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>



      {/* Campaigns */}
      <Card>
        <CardHeader className="flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Megaphone className="h-4 w-4" /> Campanhas ({infCampaigns.length})</CardTitle>
          {availableCampaignsForAdd.length > 0 && (
            <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => setAddToCampaignOpen(true)}>
              <Plus className="h-3 w-3" /> Adicionar à campanha
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-2">
          {infCampaigns.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma campanha vinculada.</p> :
            infCampaigns.map((c) => {
              const part = (c.participants || []).find(p => p.influencerId === inf.id);
              const partStatus = getParticipationStatus(c, part);
              return (
                <Link key={c.id} to={`/campaign/${c.id}`}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border p-3 transition-colors hover:bg-secondary/50">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">Prazo: {parseLocalDate(c.deadline).toLocaleDateString("pt-BR")}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge variant="outline" className={`text-[10px] ${partStatus.className}`}>{partStatus.label}</Badge>
                    <Badge variant="outline" className="text-[10px]">{statusLabels[c.status]}</Badge>
                  </div>
                </Link>
              );
            })}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center gap-3 border-t border-border pt-4">
        {inf.cpf && inf.birthDate && inf.shippingAddress ? (
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => {
              const text = `Nome: ${inf.name}\nCPF: ${inf.cpf}\nData de Nascimento: ${inf.birthDate ? parseLocalDate(inf.birthDate).toLocaleDateString("pt-BR") : ""}\nEndereço: ${inf.shippingAddress}`;
              navigator.clipboard.writeText(text);
              toast({ title: "Dados copiados!", description: "CPF, nascimento e endereço copiados para a área de transferência." });
            }}
          >
            <Copy className="h-3.5 w-3.5" /> Copiar dados para envio
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="gap-2" disabled title="Preencha CPF, data de nascimento e endereço para habilitar">
            <Copy className="h-3.5 w-3.5" /> Copiar dados para envio
          </Button>
        )}
        <div className="flex-1" />
        <Button variant="destructive" size="sm" className="gap-2" onClick={handleDelete}>
          <Trash2 className="h-3.5 w-3.5" /> Remover
        </Button>
      </div>

      {/* Link conflict dialog (parceiro já está na campanha) */}
      <Dialog open={!!linkConflict} onOpenChange={(o) => { if (!o) setLinkConflict(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle className="text-base">Parceiro já está na campanha</DialogTitle></DialogHeader>
          {linkConflict && (() => {
            const partner = influencers.find(i => i.id === linkConflict.partnerId);
            return (
              <div className="space-y-3">
                <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                  {partner && <img src={partner.profilePic} alt="" className="h-10 w-10 rounded-full object-cover" />}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{partner?.name || "Parceiro vinculado"}</p>
                    {partner && <p className="text-xs text-muted-foreground"><InstagramHandle username={partner.username} url={partner.instagramUrl} /></p>}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {inf.name} está vinculado(a) a {partner?.name || "este perfil"}, que já participa da campanha <strong>{linkConflict.campaign.name}</strong>. O que deseja fazer?
                </p>
                <div className="flex flex-col gap-2">
                  <Button size="sm" onClick={() => confirmAddToCampaign(linkConflict.campaign, null)}>Adicionar mesmo assim</Button>
                  <Button size="sm" variant="outline" onClick={() => confirmAddToCampaign(linkConflict.campaign, linkConflict.partnerId)}>
                    Substituir {partner ? `(${partner.name})` : "parceiro"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setLinkConflict(null)}>Cancelar</Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Rating Dialog */}
      <Dialog open={ratingDialogOpen} onOpenChange={setRatingDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Avaliar experiência</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Quem está avaliando?</Label>
              <Select value={ratingAuthor} onValueChange={setRatingAuthor}>
                <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                <SelectContent>
                  {DIRECTOR_AUTHORS.map(name => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Avaliação</Label>
              <StarRating rating={ratingValue} onRate={setRatingValue} size={28} />
            </div>
            {ratingValue > 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">{ratingReasonPrompt}</Label>
                <Textarea
                  value={ratingReason}
                  onChange={(e) => setRatingReason(e.target.value)}
                  className="min-h-[60px] text-sm"
                  placeholder="Descreva sua experiência..."
                />
              </div>
            )}
            <Button onClick={handleSubmitRating} disabled={!ratingValue || !ratingAuthor} className="w-full">
              Registrar avaliação
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add to Campaign Dialog */}
      <Dialog open={addToCampaignOpen} onOpenChange={(v) => { setAddToCampaignOpen(v); if (!v) { setAddCampaignSearch(""); setAddCampaignShowAll(false); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Adicionar à campanha</DialogTitle>
          </DialogHeader>
          {(() => {
            const q = normalizeSearch(addCampaignSearch);
            const matches = (c: typeof availableCampaignsForAdd[number]) =>
              !q || normalizeSearch(c.name).includes(q) || normalizeSearch(c.description || "").includes(q);
            const emAndamento = availableCampaignsForAdd.filter(c => c.status === "em_andamento" && matches(c));
            const others = availableCampaignsForAdd.filter(c => c.status !== "em_andamento" && matches(c));
            const visible = addCampaignShowAll
              ? [...emAndamento, ...others]
              : emAndamento;
            const renderItem = (c: typeof availableCampaignsForAdd[number]) => (
              <button
                key={c.id}
                className="flex w-full items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-secondary/50"
                onClick={() => handleAddToCampaign(c.id)}
              >
                <div className="text-left min-w-0">
                  <p className="text-sm font-medium truncate">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{statusLabels[c.status]}</p>
                </div>
                <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
            );
            return (
              <div className="space-y-3">
                <div className="relative">
                  <Input
                    placeholder="Buscar campanha..."
                    value={addCampaignSearch}
                    onChange={(e) => setAddCampaignSearch(e.target.value)}
                    className="h-9"
                  />
                </div>
                {availableCampaignsForAdd.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhuma campanha disponível.</p>
                ) : (
                  <>
                    {!addCampaignShowAll && (
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Em andamento ({emAndamento.length})</p>
                    )}
                    <div className={`space-y-2 ${addCampaignShowAll ? "max-h-[228px] overflow-y-auto pr-1" : ""}`}>
                      {visible.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">Nenhuma campanha encontrada.</p>
                      ) : (
                        visible.map(renderItem)
                      )}
                    </div>
                    {!addCampaignShowAll && others.length > 0 && (
                      <Button variant="outline" size="sm" className="w-full" onClick={() => setAddCampaignShowAll(true)}>
                        Ver todas ({availableCampaignsForAdd.length})
                      </Button>
                    )}
                  </>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

    </div>
  );
}