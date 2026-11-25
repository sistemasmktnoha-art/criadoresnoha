import { InstagramHandle } from "@/components/InstagramHandle";
import { GenerateMessageDialog } from "@/components/GenerateMessageDialog";
import React, { useState, useCallback, useMemo, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import jsPDF from "jspdf";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { uploadDataUrlToAppMedia } from "@/lib/mediaStorage";
import { instagramProfileUrl, normalizeSearch, parseLocalDate } from "@/lib/utils";
import { RichTextEditor } from "@/components/RichTextEditor";

function computeCampaignStatus(startDate: string, deadline: string): "a_iniciar" | "em_andamento" | "finalizada" {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  if (startDate) {
    const start = parseLocalDate(startDate);
    if (now < start) return "a_iniciar";
  }
  if (deadline) {
    const end = parseLocalDate(deadline);
    if (now > end) return "em_andamento"; // don't auto-finalize
  }
  if (startDate) return "em_andamento";
  return "a_iniciar";
}

const CAMPAIGN_COVER_WIDTH = 1024;
function optimizeCampaignCover(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onerror = () => reject(new Error("Formato de imagem inválido."));
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, CAMPAIGN_COVER_WIDTH / Math.max(img.width, img.height));
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Não foi possível processar a capa."));
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.86));
    };
    img.src = dataUrl;
  });
}
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ArrowLeft,
  Calendar,
  Target,
  Users,
  Phone,
  Package,
  Handshake,
  FileImage,
  FileCheck,
  Send,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Copy,
  Upload,
  Download,
  File,
  Edit,
  DollarSign,
  BarChart3,
  ChevronDown,
  Instagram,
  Search,
  FileDown,
  AlertCircle,
  ExternalLink,
  Heart,
  MessageCircle,
  Eye,
  Share2,
  Trophy,
  Loader2,
  Store,
  ShieldCheck,
  MapPin,
  Bookmark,
  Save,
  Ban,
  CalendarClock,
  Sparkles,
  Pencil,
  Lock as LockIcon,
} from "lucide-react";

import {
  Campaign,
  CampaignParticipant,
  ContactStatus,
  DeliveryType,
  NegotiationStatus,
  BriefingStatus,
  MaterialStatus,
  SelectionStatus,
  CampaignMaterial,
  ContentMetrics,
  ContentMetricsSnapshot,
  DirectorNote,
  LOCATIONS,
} from "@/types";
import { useToast } from "@/hooks/use-toast";
import { StarRating } from "@/components/StarRating";

const CONTACT_LABELS: Record<ContactStatus, { label: string; color: string }> = {
  nao_iniciado: { label: "Não iniciado", color: "bg-muted text-muted-foreground" },
  aguardando_retorno: { label: "Aguardando retorno", color: "bg-amber-100 text-amber-800" },
  retornou: { label: "Retornou", color: "bg-emerald-100 text-emerald-800" },
  nao_retornou: { label: "Não retornou", color: "bg-red-100 text-red-800" },
  rp: { label: "RP", color: "bg-purple-100 text-purple-800" },
};

const NEGOTIATION_LABELS: Record<NegotiationStatus, { label: string; color: string }> = {
  pendente: { label: "Pendente", color: "bg-muted text-muted-foreground" },
  em_negociacao: { label: "Em negociação", color: "bg-background text-foreground border-border" },
  topou: { label: "Topou", color: "bg-emerald-100 text-emerald-800" },
  nao_topou: { label: "Não topou", color: "bg-red-100 text-red-800" },
};

const MATERIAL_LABELS: Record<MaterialStatus, { label: string; color: string }> = {
  pendente: { label: "Pendente", color: "bg-muted text-muted-foreground" },
  enviado: { label: "Enviado", color: "bg-blue-100 text-blue-800" },
  aguardando_aprovacao: { label: "Aguardando aprovação", color: "bg-amber-100 text-amber-800" },
  aprovado: { label: "Aprovado", color: "bg-emerald-100 text-emerald-800" },
  agendado: { label: "Agendado", color: "bg-purple-100 text-purple-800" },
  publicado: { label: "Entrega finalizada", color: "bg-[#556b2f] text-white" },
  nao_se_aplica: { label: "Não se aplica", color: "bg-slate-200 text-slate-700" },
};

const BRIEFING_LABELS: Record<BriefingStatus, { label: string; color: string }> = {
  pendente: { label: "Pendente", color: "bg-muted text-muted-foreground" },
  enviado: { label: "Enviado", color: "bg-blue-100 text-blue-800" },
  nao_se_aplica: { label: "Não se aplica", color: "bg-slate-200 text-slate-700" },
};

const BRIEFING_CARD_LABELS: Record<BriefingStatus, { label: string; color: string }> = {
  pendente: { label: "aguardando briefing", color: "bg-amber-100 text-amber-800 border-amber-300" },
  enviado: { label: "Briefing enviado ✅", color: "bg-[hsl(80,40%,90%)] text-[hsl(80,40%,25%)] border-[hsl(80,40%,60%)]" },
  nao_se_aplica: { label: "Não se aplica", color: "bg-muted text-muted-foreground border-border" },
};

function getParticipantCost(participant: CampaignParticipant) {
  if (participant.paidByFranchisee) return 0;
  const productTotal = participant.negotiationProductCost || 0;
  return (participant.negotiationPaymentAmount || 0) + productTotal;
}

const STATUS_CONFIG = {
  a_iniciar: { label: "A iniciar", color: "text-chart-2" },
  em_andamento: { label: "Em andamento", color: "text-amber-600" },
  finalizada: { label: "Finalizada", color: "text-emerald-600" },
};

const REJECTION_REASONS = [
  "Fora do orçamento",
  "Não faz o perfil da campanha, mas vamos considerar para uma próxima",
  "Não faz o perfil da marca, pode remover do sistema",
  "Outro",
] as const;

const COMMENT_PALETTES = ["note-pastel-sky", "note-pastel-amber", "note-pastel-violet", "note-pastel-teal"];

function commentPalette(author: string): string {
  const normalizedAuthor = normalizeSearch(author);
  if (normalizedAuthor === "lilla") return "note-pastel-rose";
  if (normalizedAuthor === "clara") return "note-pastel-green";
  const index = Math.abs(Array.from(normalizedAuthor).reduce((sum, char) => sum + char.charCodeAt(0), 0)) % COMMENT_PALETTES.length;
  return COMMENT_PALETTES[index];
}

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  // Active tab lives in the URL (?tab=) so it survives saves, data syncs and reloads.
  const CAMPAIGN_TABS = ["geral", "conteudos", "participantes", "materiais"];
  const tabParam = searchParams.get("tab") || "";
  const activeTab = CAMPAIGN_TABS.includes(tabParam) ? tabParam : (sessionStorage.getItem(`campaign-tab-${id}`) || "geral");
  const setActiveTab = (tab: string) => {
    try { sessionStorage.setItem(`campaign-tab-${id}`, tab); } catch { /* ignore */ }
    setSearchParams((prev) => { const next = new URLSearchParams(prev); next.set("tab", tab); return next; }, { replace: true });
  };
  const { campaigns, influencers, updateCampaign, deleteCampaign, rateInfluencer, updateInfluencer, shipments, storeUnits, teamMembers } = useApp();
  const { user } = useAuth();
  const { toast } = useToast();
  const campaign = campaigns.find((c) => c.id === id);

  const [msgFor, setMsgFor] = useState<string | null>(null);
  const [materialDialogOpen, setMaterialDialogOpen] = useState(false);
  const [editingMatId, setEditingMatId] = useState<string | null>(null);
  const [contentDialogOpen, setContentDialogOpen] = useState(false);
  const [addInfluencerDialogOpen, setAddInfluencerDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [matName, setMatName] = useState("");
  const [matType, setMatType] = useState<CampaignMaterial["type"]>("briefing");
  const [matContent, setMatContent] = useState("");
  const [matLink, setMatLink] = useState("");
  const [ctUrl, setCtUrl] = useState("");
  const [ctInfluencerId, setCtInfluencerId] = useState("");
  const [negotiationFilter, setNegotiationFilter] = useState<"todos" | "topou" | "nao_topou" | "em_negociacao" | "aguardando_aprovacao" | "sem_retorno" | "material_pendente" | "concluidos">("todos");
  const [regionFilter, setRegionFilter] = useState<string>("todos");
  const [addInfluencerSearch, setAddInfluencerSearch] = useState("");
  const [addInfluencerRegionFilter, setAddInfluencerRegionFilter] = useState("todos");
  const [selectedInfluencerIds, setSelectedInfluencerIds] = useState<string[]>([]);
  const [budgetEditing, setBudgetEditing] = useState<Record<string, boolean>>({});
  const [budgetDraft, setBudgetDraft] = useState<Record<string, string>>({});
  const [justifyingId, setJustifyingId] = useState<string | null>(null);
  const [justifyText, setJustifyText] = useState("");
  const [pendingRejectId, setPendingRejectId] = useState<string | null>(null);
  const [pendingRejectText, setPendingRejectText] = useState("");
  const [pendingRejectOption, setPendingRejectOption] = useState<string>("");
  const [participantSearch, setParticipantSearch] = useState("");

  const [editingJustificationId, setEditingJustificationId] = useState<string | null>(null);
  const [editJustificationText, setEditJustificationText] = useState("");
  const [scrapingMetrics, setScrapingMetrics] = useState(false);
  // Director notes state
  const [noteText, setNoteText] = useState<Record<string, string>>({});
  const [noteAuthor, setNoteAuthor] = useState<Record<string, string>>({});
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteText, setEditNoteText] = useState("");
  // Finalization rating state
  const [finalizationOpen, setFinalizationOpen] = useState(false);
  const [finalizationRatings, setFinalizationRatings] = useState<Record<string, number>>({});
  const [finalizationReasons, setFinalizationReasons] = useState<Record<string, string>>({});
  const [finalizationDeliveryOnTime, setFinalizationDeliveryOnTime] = useState<Record<string, boolean>>({});
  const [finalizationDeliveryLevel, setFinalizationDeliveryLevel] = useState<Record<string, string>>({});
  // Content metrics editing
  const [editingMetricsId, setEditingMetricsId] = useState<string | null>(null);
  const [metricsForm, setMetricsForm] = useState<Record<string, number>>({});
  const [updatingMetricsId, setUpdatingMetricsId] = useState<string | null>(null);
  // Fila de conflitos de vínculo ao adicionar influenciadores (parceiro já está na campanha)
  const [linkConflicts, setLinkConflicts] = useState<{ infId: string; partnerId: string }[]>([]);
  const [updateMetricsForm, setUpdateMetricsForm] = useState<Record<string, number>>({});
  // Cover photo
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverEditorOpen, setCoverEditorOpen] = useState(false);
  const [pendingCoverImage, setPendingCoverImage] = useState("");
  const [pendingCoverPosition, setPendingCoverPosition] = useState(50);
  // Schedule update date
  const [schedulingUpdateId, setSchedulingUpdateId] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState("");
  // AI analysis
  const [aiAnalysisLoading, setAiAnalysisLoading] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<string | null>(null);

  // Auto-open finalization dialog from query param
  useEffect(() => {
    if (searchParams.get("finalize") === "true" && campaign) {
      setFinalizationOpen(true);
      setSearchParams((prev) => { const next = new URLSearchParams(prev); next.delete("finalize"); return next; }, { replace: true });
    }
  }, [searchParams, campaign]);

  // Eligible participants for rating: approved + retornou + topou
  const eligibleForRating = useMemo(() => {
    if (!campaign) return [];
    return (campaign.participants || []).filter((p) => {
      const status = p.selectionStatus || "pendente";
      return (
        status !== "nao_aprovado" &&
        p.contactStatus !== "nao_retornou" &&
        p.negotiationStatus === "topou"
      );
    });
  }, [campaign]);

  // Top 3 creators by content performance (must be before early return)
  const topCreators = useMemo(() => {
    const cts = campaign?.contents || [];
    const contentsByInfluencer = new Map<string, { totalScore: number; bestContent: typeof cts[0] | null }>();
    for (const ct of cts) {
      const m = ct.metrics;
      if (!m) continue;
      const score = (m.likes || 0) + (m.comments || 0) * 3 + (m.views || 0) * 0.1 + (m.shares || 0) * 5;
      const existing = contentsByInfluencer.get(ct.influencerId);
      if (!existing || score > existing.totalScore) {
        contentsByInfluencer.set(ct.influencerId, { totalScore: score, bestContent: ct });
      }
    }
    return Array.from(contentsByInfluencer.entries())
      .sort((a, b) => b[1].totalScore - a[1].totalScore)
      .slice(0, 3)
      .map(([infId, data]) => ({ influencerId: infId, ...data }));
  }, [campaign?.contents]);

  if (!campaign) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground">Campanha não encontrada</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/campaigns")}>
          Voltar
        </Button>
      </div>
    );
  }

  function handleFinalizeCampaign() {
    const updatedParticipants = campaign!.participants.map((p) => {
      const rating = finalizationRatings[p.influencerId];
      if (rating) {
        return {
          ...p,
          campaignRating: rating,
          campaignRatingReason: rating < 3 ? (finalizationReasons[p.influencerId] || "") : undefined,
          campaignDeliveryOnTime: finalizationDeliveryOnTime[p.influencerId],
          campaignDeliveryLevel: finalizationDeliveryLevel[p.influencerId] as "baixo" | "bom" | "superou_expectativas" | undefined,
        };
      }
      return p;
    });
    // Apply ratings + delivery stats to influencer global profiles
    for (const p of updatedParticipants) {
      if (p.campaignRating && p.campaignRating > 0) {
        const reason = p.campaignRatingReason || (p.campaignDeliveryLevel ? `Nível de entrega: ${p.campaignDeliveryLevel === "superou_expectativas" ? "Superou expectativas" : p.campaignDeliveryLevel === "bom" ? "Bom" : "Baixo"}` : "");
        rateInfluencer(p.influencerId, p.campaignRating, `Campanha: ${campaign!.name}`, reason);
      }
      // Update delivery stats
      if (p.campaignDeliveryOnTime !== undefined || p.campaignDeliveryLevel) {
        const inf = influencers.find((i) => i.id === p.influencerId);
        if (inf) {
          const patch: Partial<typeof inf> = {};
          if (p.campaignDeliveryOnTime === true) patch.deliveryOnTimeCount = (inf.deliveryOnTimeCount || 0) + 1;
          if (p.campaignDeliveryOnTime === false) patch.deliveryLateCount = (inf.deliveryLateCount || 0) + 1;
          if (p.campaignDeliveryLevel === "baixo") patch.deliveryLowCount = (inf.deliveryLowCount || 0) + 1;
          if (p.campaignDeliveryLevel === "bom") patch.deliveryGoodCount = (inf.deliveryGoodCount || 0) + 1;
          if (p.campaignDeliveryLevel === "superou_expectativas") patch.deliveryExceededCount = (inf.deliveryExceededCount || 0) + 1;
          updateInfluencer({ ...inf, ...patch });
        }
      }
    }
    updateCampaign({ ...campaign!, status: "finalizada", participants: updatedParticipants });
    setFinalizationOpen(false);
    setFinalizationRatings({});
    setFinalizationReasons({});
    setFinalizationDeliveryOnTime({});
    setFinalizationDeliveryLevel({});
    toast({ description: "Campanha finalizada com avaliações registradas!" });
  }

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
        reader.onload = () => resolve(String(reader.result || ""));
        reader.readAsDataURL(file);
      });

      const optimizedCover = await optimizeCampaignCover(dataUrl);
      setPendingCoverImage(optimizedCover);
      setPendingCoverPosition(campaign.coverImagePosition ?? 50);
      setCoverEditorOpen(true);
    } catch (error) {
      console.error("Erro ao atualizar capa da campanha:", error);
      toast({
        description: "Não foi possível atualizar a capa da campanha.",
        variant: "destructive",
      });
    } finally {
      e.target.value = "";
    }
  }

  function openCoverEditor() {
    if (!campaign.coverImage) return;
    setPendingCoverImage(campaign.coverImage);
    setPendingCoverPosition(campaign.coverImagePosition ?? 50);
    setCoverEditorOpen(true);
  }

  async function saveCover() {
    if (!pendingCoverImage || !user) return;
    setCoverUploading(true);
    try {
      const coverUrl = pendingCoverImage.startsWith("data:")
        ? await uploadDataUrlToAppMedia({
            userId: user.id,
            folder: "campaign-covers",
            dataUrl: pendingCoverImage,
            entityId: campaign.id,
          })
        : pendingCoverImage;
      update({ coverImage: coverUrl, coverImagePosition: pendingCoverPosition });
      setCoverEditorOpen(false);
      toast({ description: "Capa e enquadramento atualizados." });
    } catch (error) {
      console.error("Erro ao salvar capa da campanha:", error);
      toast({ description: "Não foi possível atualizar a capa da campanha.", variant: "destructive" });
    } finally {
      setCoverUploading(false);
    }
  }

  function removeCover() {
    update({ coverImage: undefined, coverImagePosition: undefined });
    setCoverEditorOpen(false);
    setPendingCoverImage("");
    toast({ description: "Capa removida." });
  }

  function saveContentMetrics(contentId: string) {
    const updatedContents = contents.map((ct) => {
      if (ct.id !== contentId) return ct;
      const newMetrics = {
        likes: metricsForm.likes || 0,
        comments: metricsForm.comments || 0,
        views: metricsForm.views || 0,
        shares: metricsForm.shares || 0,
        impressions: metricsForm.impressions || 0,
        accountsReached: metricsForm.accountsReached || 0,
        saves: metricsForm.saves || 0,
      };
      return { ...ct, metrics: newMetrics };
    });
    update({ contents: updatedContents });
    setEditingMetricsId(null);
    toast({ description: "Métricas salvas!" });
  }

  function saveContentMetricsUpdate(contentId: string) {
    const updatedContents = contents.map((ct) => {
      if (ct.id !== contentId) return ct;
      const newSnapshot = {
        date: new Date().toISOString().split("T")[0],
        metrics: {
          likes: updateMetricsForm.likes || 0,
          comments: updateMetricsForm.comments || 0,
          views: updateMetricsForm.views || 0,
          shares: updateMetricsForm.shares || 0,
          impressions: updateMetricsForm.impressions || 0,
          accountsReached: updateMetricsForm.accountsReached || 0,
          saves: updateMetricsForm.saves || 0,
        },
      };
      // Garante uma linha-base: se ainda não há histórico mas já existem métricas
      // iniciais salvas, elas viram o primeiro snapshot para que o crescimento
      // possa ser calculado já no primeiro update.
      const existing = ct.metricsHistory || [];
      const base = existing.length === 0 && ct.metrics
        ? [{ date: (ct.submittedAt || new Date().toISOString()).split("T")[0], metrics: ct.metrics }]
        : existing;
      const last = base[base.length - 1];
      // Se o update foi feito no mesmo dia do último snapshot, substitui em vez de duplicar
      const history = last && last.date === newSnapshot.date && base.length > 1
        ? [...base.slice(0, -1), newSnapshot]
        : [...base, newSnapshot];
      return { ...ct, metrics: newSnapshot.metrics, metricsHistory: history };
    });
    update({ contents: updatedContents });
    setUpdatingMetricsId(null);
    toast({ description: "Update de métricas salvo!" });
  }

  function update(patch: Partial<Campaign>) {
    updateCampaign({ ...campaign!, ...patch });
  }

  function updateParticipant(influencerId: string, patch: Partial<CampaignParticipant>) {
    const participants = campaign!.participants.map((p) =>
      p.influencerId === influencerId ? { ...p, ...patch } : p
    );
    update({ participants });
  }

  function handleContentStatus(contentId: string, newStatus: "aguardando_aprovacao" | "aguardando_ajuste" | "aprovado") {
    const updatedContents = (campaign!.contents || []).map((ct) =>
      ct.id === contentId ? { ...ct, status: newStatus } : ct
    );
    update({ contents: updatedContents });
  }

  async function addContent() {
    if (!ctUrl || !ctInfluencerId) return;
    setScrapingMetrics(true);

    let metrics: ContentMetrics = { likes: 0, comments: 0, views: 0, shares: 0 };

    try {
      const { data, error } = await supabase.functions.invoke("scrape-instagram-content", {
        body: { url: ctUrl },
      });
      if (data?.success && data?.metrics) {
        metrics = data.metrics;
      }
    } catch (e) {
      console.error("Error scraping metrics:", e);
    }

    const newContent = {
      id: Date.now().toString(),
      influencerId: ctInfluencerId,
      description: "",
      url: ctUrl,
      files: [] as import("@/types").FileAttachment[],
      status: "aprovado" as const,
      submittedAt: new Date().toISOString().split("T")[0],
      metrics,
    };
    update({ contents: [...(campaign!.contents || []), newContent] });
    setCtUrl("");
    setCtInfluencerId("");
    setContentDialogOpen(false);
    setScrapingMetrics(false);
    toast({ description: "Conteúdo adicionado com métricas extraídas!" });
  }

  function deleteContent(contentId: string) {
    update({ contents: (campaign!.contents || []).filter((ct) => ct.id !== contentId) });
    toast({ description: "Conteúdo removido." });
  }

  function handleDeleteCampaign() {
    deleteCampaign(campaign!.id);
    navigate("/campaigns");
    toast({ description: "Campanha excluída." });
  }

  function addMaterial() {
    if (!matName) return;
    const existing = campaign!.materials || [];
    if (editingMatId) {
      const updated = existing.map((m) =>
        m.id === editingMatId
          ? { ...m, name: matName, type: matType, content: matContent, link: matLink || undefined }
          : m
      );
      update({ materials: updated });
    } else {
      const mat: CampaignMaterial = {
        id: Date.now().toString(),
        name: matName,
        type: matType,
        content: matContent,
        link: matLink || undefined,
        files: [],
        createdAt: new Date().toISOString().split("T")[0],
      };
      update({ materials: [...existing, mat] });
    }
    setMatName("");
    setMatType("briefing");
    setMatContent("");
    setMatLink("");
    setEditingMatId(null);
    setMaterialDialogOpen(false);
  }

  function startEditMaterial(mat: CampaignMaterial) {
    setEditingMatId(mat.id);
    setMatName(mat.name);
    setMatType(mat.type);
    setMatContent(mat.content);
    setMatLink(mat.link || "");
    setMaterialDialogOpen(true);
  }

  function deleteMaterial(matId: string) {
    update({ materials: (campaign!.materials || []).filter((m) => m.id !== matId) });
  }

  const participants = campaign.participants || [];
  const contents = campaign.contents || [];
  const materials = campaign.materials || [];
  const getInf = (infId: string) => influencers.find((i) => i.id === infId);
  const activeParticipants = participants.filter((p) => getInf(p.influencerId));
  const alreadyInCampaignIds = new Set(campaign.influencerIds);
  const availableInfluencers = influencers.filter((i) => !alreadyInCampaignIds.has(i.id));

  const stripHtmlText = (html: string = "") =>
    html.replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|li)>/gi, "\n").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
  const hasBudgetForAnalysis = (p: CampaignParticipant) =>
    p.negotiationStatus === "em_negociacao" && stripHtmlText(p.negotiationBudget || "") !== "";
  const budgetAnalysisParticipants = activeParticipants
    .filter((p) => (p.selectionStatus || "pendente") !== "nao_aprovado")
    .filter(hasBudgetForAnalysis);
  const budgetAnalysisCount = budgetAnalysisParticipants.length;
  const budgetAnalysisRegions = Array.from(
    budgetAnalysisParticipants.reduce((map, p) => {
      const loc = getInf(p.influencerId)?.location || "—";
      map.set(loc, (map.get(loc) || 0) + 1);
      return map;
    }, new Map<string, number>())
  ).sort((a, b) => b[1] - a[1]);

  // topCreators already defined above early return

  function buildNewParticipant(infId: string) {
    return {
      influencerId: infId,
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

  function addInfluencersToCampaign(ids: string[]) {
    // Detecta conflitos: algum vinculado do candidato já está na campanha
    const conflicts: { infId: string; partnerId: string }[] = [];
    const okIds: string[] = [];
    for (const infId of ids) {
      const cand = influencers.find((i) => i.id === infId);
      const partnerId = (cand?.linkedInfluencerIds || []).find((l) => campaign.influencerIds.includes(l));
      if (partnerId) conflicts.push({ infId, partnerId });
      else okIds.push(infId);
    }
    if (okIds.length > 0) {
      update({
        influencerIds: [...campaign.influencerIds, ...okIds],
        participants: [...(campaign.participants || []), ...okIds.map(buildNewParticipant)],
      });
    }
    setAddInfluencerDialogOpen(false);
    setSelectedInfluencerIds([]);
    setAddInfluencerSearch("");
    if (conflicts.length > 0) {
      setLinkConflicts(conflicts);
    } else {
      toast({ description: `${okIds.length} influenciador${okIds.length > 1 ? "es" : ""} vinculado${okIds.length > 1 ? "s" : ""}!` });
    }
  }

  function resolveLinkConflict(action: "add" | "replace" | "cancel") {
    const current = linkConflicts[0];
    if (!current) return;
    if (action !== "cancel") {
      const removals = action === "replace" ? [current.partnerId] : [];
      update({
        influencerIds: [...campaign.influencerIds.filter((id) => !removals.includes(id)), current.infId],
        participants: [...(campaign.participants || []).filter((p) => !removals.includes(p.influencerId)), buildNewParticipant(current.infId)],
        contents: contents.filter((ct) => !removals.includes(ct.influencerId)),
      });
      toast({ description: action === "replace" ? "Vinculado à campanha (parceiro substituído)!" : "Influenciador vinculado!" });
    }
    setLinkConflicts((prev) => prev.slice(1));
  }

  function toggleInfluencerSelection(infId: string) {
    setSelectedInfluencerIds((prev) =>
      prev.includes(infId) ? prev.filter((id) => id !== infId) : [...prev, infId]
    );
  }

  function removeInfluencerFromCampaign(infId: string) {
    update({
      influencerIds: campaign.influencerIds.filter((id) => id !== infId),
      participants: (campaign.participants || []).filter((p) => p.influencerId !== infId),
      contents: contents.filter((ct) => ct.influencerId !== infId),
    });
    toast({ description: "Influenciador desvinculado." });
  }

  function exportToPDF() {
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const ML = 14;
    const MR = 14;
    const innerW = pageW - ML - MR;

    // === Palette (soft, harmonious) ===
    const INK: [number, number, number] = [38, 36, 32];
    const MUTED: [number, number, number] = [120, 116, 108];
    const FAINT: [number, number, number] = [170, 165, 155];
    const LINE: [number, number, number] = [228, 222, 210];
    const CARD_BG: [number, number, number] = [252, 250, 246];
    const ACCENT: [number, number, number] = [184, 134, 60]; // amber/gold
    const ACCENT_SOFT: [number, number, number] = [245, 232, 207];
    const GREEN: [number, number, number] = [22, 142, 96];
    const AMBER: [number, number, number] = [200, 130, 18];
    const RED: [number, number, number] = [200, 55, 55];
    const PURPLE: [number, number, number] = [128, 90, 200];
    const BLUE: [number, number, number] = [45, 110, 200];
    const ORANGE: [number, number, number] = [218, 96, 32];

    const setFill = (c: [number, number, number]) => doc.setFillColor(c[0], c[1], c[2]);
    const setStroke = (c: [number, number, number]) => doc.setDrawColor(c[0], c[1], c[2]);
    const setColor = (c: [number, number, number]) => doc.setTextColor(c[0], c[1], c[2]);

    let y = 0;

    function checkPage(needed = 10) {
      if (y + needed > pageH - 14) { doc.addPage(); drawPageChrome(); y = 14; }
    }

    function drawPageChrome() {
      // Thin top accent bar
      setFill(ACCENT);
      doc.rect(0, 0, pageW, 3, "F");
      setFill(ACCENT_SOFT);
      doc.rect(0, 3, pageW, 1, "F");
    }

    const ap = activeParticipants.filter((p) => (p.selectionStatus || "pendente") !== "nao_aprovado");
    const retornou = ap.filter((p) => p.contactStatus === "retornou").length;
    const contactPending = ap.filter((p) => p.contactStatus === "nao_iniciado" || p.contactStatus === "aguardando_retorno").length;
    const naoRetornou = ap.filter((p) => p.contactStatus === "nao_retornou").length;
    const gerenciadosRP = ap.filter((p) => p.contactStatus === "rp").length;
    const reprovadosCount = activeParticipants.filter((p) => p.selectionStatus === "nao_aprovado").length;
    const topou = ap.filter((p) => p.negotiationStatus === "topou").length;
    const emNegociacao = ap.filter((p) => p.negotiationStatus === "em_negociacao").length;
    const naoTopou = ap.filter((p) => p.negotiationStatus === "nao_topou").length;
    const permuta = ap.filter((p) => p.negotiationStatus === "topou" && (!p.negotiationType || p.negotiationType === "permuta")).length;
    const pago = ap.filter((p) => p.negotiationStatus === "topou" && (p.negotiationType === "pagamento" || p.negotiationType === "permuta_e_pagamento")).length;
    const aguardandoAprovacao = ap.filter((p) => (p.selectionStatus || "pendente") === "pendente").length;
    const aguardandoOrcamento = ap.filter((p) => p.negotiationStatus === "em_negociacao" && !!(p.negotiationBudget && p.negotiationBudget.replace(/<[^>]*>/g, "").trim() !== "")).length;
    const visitaLoja = ap.filter((p) => p.deliveryType === "visita_loja");
    const envioCasa = ap.filter((p) => p.deliveryType === "envio_casa");
    const visitasFeitas = visitaLoja.filter((p) => p.storeVisitDone).length;
    const visitasPendentes = visitaLoja.length - visitasFeitas;
    const visitasComunicadas = visitaLoja.filter((p) => p.managerNotified).length;
    const visitasComunicarPend = visitaLoja.length - visitasComunicadas;
    const concluidosPDF = ap.filter((p) => p.materialStatus === "publicado");
    const estimatedCost = ap.reduce((sum, p) => p.negotiationStatus === "topou" ? sum + getParticipantCost(p) : sum, 0);

    // === Page 1 ===
    drawPageChrome();

    // Hero band
    const heroH = 46;
    setFill(CARD_BG);
    doc.rect(0, 4, pageW, heroH, "F");
    // Accent vertical bar on the left
    setFill(ACCENT);
    doc.rect(ML, 10, 2.2, heroH - 12, "F");

    setColor(INK);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text(campaign.name, ML + 7, 22);

    const statusLabel = STATUS_CONFIG[campaign.status].label;
    // Status pill
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    const pillText = statusLabel.toUpperCase();
    const pillW = doc.getTextWidth(pillText) + 8;
    setFill(ACCENT);
    doc.roundedRect(ML + 7, 27, pillW, 6, 3, 3, "F");
    setColor([255, 255, 255]);
    doc.text(pillText, ML + 11, 31.2);

    setColor(MUTED);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const now = new Date();
    const dateStr = `Extraído em ${now.toLocaleDateString("pt-BR")} às ${now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
    doc.text(dateStr, ML + 7 + pillW + 4, 31.2);

    if (campaign.description) {
      doc.setFontSize(9);
      setColor([90, 86, 80]);
      const descLines = doc.splitTextToSize(campaign.description, innerW - 10);
      const visible = descLines.slice(0, 2);
      visible.forEach((line: string, i: number) => doc.text(line, ML + 7, 40 + i * 4.5));
    }

    y = 4 + heroH + 8;

    // === Section: KPIs ===
    function sectionTitle(label: string) {
      checkPage(10);
      setColor(ACCENT);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text(label.toUpperCase(), ML, y);
      const w = doc.getTextWidth(label.toUpperCase());
      setStroke(LINE);
      doc.setLineWidth(0.3);
      doc.line(ML + w + 3, y - 1.2, pageW - MR, y - 1.2);
      y += 5;
    }

    function kpiCard(x: number, w: number, h: number, value: string, label: string, color: [number, number, number], sub?: string) {
      setFill([255, 255, 255]);
      setStroke(LINE);
      doc.setLineWidth(0.3);
      doc.roundedRect(x, y, w, h, 2, 2, "FD");
      // top color accent
      setFill(color);
      doc.roundedRect(x, y, w, 1.6, 1, 1, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      setColor(color);
      doc.text(value, x + 4, y + 12);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      setColor(MUTED);
      const lines = doc.splitTextToSize(label, w - 6);
      lines.slice(0, 2).forEach((l: string, i: number) => doc.text(l, x + 4, y + 17 + i * 3.2));
      if (sub) {
        setColor(FAINT);
        doc.setFontSize(7);
        doc.text(sub, x + 4, y + h - 2.5);
      }
    }

    sectionTitle("Painel geral");
    const gap = 3;
    const kCols = 6;
    const kW = (innerW - gap * (kCols - 1)) / kCols;
    const kH = 26;
    const kpis: Array<[string, string, [number, number, number], string?]> = [
      [String(ap.length), "perfis ativos", INK],
      [String(retornou), "retornaram", GREEN],
      [String(contactPending), "aguardando retorno", AMBER],
      [String(naoRetornou), "não retornaram", RED],
      [String(gerenciadosRP), "gerenciados por RP", PURPLE],
      [String(reprovadosCount), "perfis reprovados", RED],
    ];
    kpis.forEach((k, i) => kpiCard(ML + i * (kW + gap), kW, kH, k[0], k[1], k[2]));
    y += kH + gap;

    const kpis2: Array<[string, string, [number, number, number], string?]> = [
      [String(topou), "toparam", GREEN],
      [String(emNegociacao), "em negociação", AMBER],
      [String(naoTopou), "não toparam", RED],
      [String(visitaLoja.length), "visita em loja", BLUE],
      [String(envioCasa.length), "envio para casa", PURPLE],
      [`R$ ${estimatedCost.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, "custo estimado", ACCENT, "soma das condições"],
    ];
    kpis2.forEach((k, i) => kpiCard(ML + i * (kW + gap), kW, kH, k[0], k[1], k[2], k[3]));
    y += kH + gap;

    const kpis3: Array<[string, string, [number, number, number], string?]> = [
      [String(concluidosPDF.length), "concluídos", [85, 107, 47], "entrega finalizada"],
    ];
    kpis3.forEach((k, i) => kpiCard(ML + i * (kW + gap), kW, kH, k[0], k[1], k[2], k[3]));
    y += kH + 6;

    // Highlight strip: aguardando
    const stripH = 14;
    setFill(ACCENT_SOFT);
    setStroke(ACCENT);
    doc.setLineWidth(0.3);
    doc.roundedRect(ML, y, innerW, stripH, 2, 2, "FD");
    setColor([110, 75, 20]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("AGUARDANDO AÇÃO", ML + 4, y + 5.5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    setColor(INK);
    doc.text(`${aguardandoAprovacao} aguardando aprovação de perfil  •  ${aguardandoOrcamento} aguardando validação de orçamento  •  ${permuta} permuta · ${pago} com pagamento`, ML + 4, y + 11);
    y += stripH + 6;

    // Visitas resumo (se houver)
    if (visitaLoja.length > 0) {
      setColor(MUTED);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(`Visitas em loja: ${visitasFeitas} realizadas · ${visitasPendentes} pendentes  •  ${visitasComunicadas} comunicadas · ${visitasComunicarPend} a comunicar`, ML, y);
      y += 6;
    }

    // === Distribuição por região ===
    const regionMap = new Map<string, number>();
    ap.forEach((p) => {
      const inf = getInf(p.influencerId);
      const loc = inf?.location || "—";
      regionMap.set(loc, (regionMap.get(loc) || 0) + 1);
    });
    const regions = Array.from(regionMap.entries()).sort((a, b) => b[1] - a[1]);

    if (regions.length > 0) {
      sectionTitle("Distribuição por região");
      const total = ap.length || 1;
      const maxCount = regions[0][1];
      // Two columns to compress space
      const colGap = 8;
      const colW = (innerW - colGap) / 2;
      const rowH = 6.2;
      const half = Math.ceil(regions.length / 2);
      const colHeights = [half, regions.length - half];
      const blockH = Math.max(colHeights[0], colHeights[1]) * rowH + 2;
      checkPage(blockH);
      regions.forEach(([loc, count], i) => {
        const col = i < half ? 0 : 1;
        const row = i < half ? i : i - half;
        const xBase = ML + col * (colW + colGap);
        const ry = y + row * rowH;
        setColor(INK);
        doc.setFontSize(8.5);
        doc.setFont("helvetica", "normal");
        doc.text(loc, xBase, ry + 3.2);
        const barX = xBase + 28;
        const barW = colW - 28 - 22;
        setFill([240, 236, 228]);
        doc.roundedRect(barX, ry, barW, 3.6, 1, 1, "F");
        const pct = count / maxCount;
        setFill(ACCENT);
        doc.roundedRect(barX, ry, Math.max(2, barW * pct), 3.6, 1, 1, "F");
        setColor(MUTED);
        doc.setFontSize(7.5);
        doc.text(`${count} (${Math.round((count / total) * 100)}%)`, barX + barW + 2, ry + 3);
      });
      y += blockH + 4;
    }

    // === Participantes (table) ===
    sectionTitle("Participantes");

    // Legend
    const legend: Array<[string, [number, number, number]]> = [
      ["Topou", GREEN], ["Em negociação", AMBER], ["Não topou", RED], ["Pendente", FAINT], ["RP", PURPLE], ["Concluídos", [85, 107, 47]],
    ];
    let lx = ML;
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    legend.forEach(([label, c]) => {
      setFill(c);
      doc.circle(lx + 1.5, y - 1.3, 1.3, "F");
      setColor(MUTED);
      doc.text(label, lx + 4, y);
      lx += 4 + doc.getTextWidth(label) + 6;
    });
    y += 5;

    // Sort within region by negotiation status
    const negOrder: Record<string, number> = { topou: 1, em_negociacao: 2, pendente: 3, nao_topou: 4 };
    const sortWithinRegion = (a: typeof ap[number], b: typeof ap[number]) => {
      const oa = negOrder[a.negotiationStatus] || 5;
      const ob = negOrder[b.negotiationStatus] || 5;
      if (oa !== ob) return oa - ob;
      const na = getInf(a.influencerId)?.name || "";
      const nb = getInf(b.influencerId)?.name || "";
      return na.localeCompare(nb);
    };

    // Separate concluded participants
    const activeForRegion = ap.filter((p) => p.materialStatus !== "publicado");

    // Group participants by region, sort regions by size desc
    const byRegion = new Map<string, typeof ap>();
    activeForRegion.forEach((p) => {
      const inf = getInf(p.influencerId);
      const loc = inf?.location || "—";
      if (!byRegion.has(loc)) byRegion.set(loc, [] as typeof ap);
      byRegion.get(loc)!.push(p);
    });
    const regionGroups = Array.from(byRegion.entries())
      .map(([loc, list]) => [loc, [...list].sort(sortWithinRegion)] as const)
      .sort((a, b) => b[1].length - a[1].length);

    // Table header
    const colName = innerW * 0.38;
    const colContato = innerW * 0.22;
    const colNeg = innerW * 0.20;
    const colMat = innerW * 0.20;
    const headerH = 7;

    function drawTableHeader() {
      checkPage(headerH + 6);
      setFill(CARD_BG);
      doc.rect(ML, y, innerW, headerH, "F");
      setColor(MUTED);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      let cx = ML + 6;
      doc.text("INFLUENCIADOR", cx, y + 4.6); cx += colName;
      doc.text("CONTATO", cx, y + 4.6); cx += colContato;
      doc.text("NEGOCIAÇÃO", cx, y + 4.6); cx += colNeg;
      doc.text("MATERIAL", cx, y + 4.6);
      y += headerH;
      setStroke(LINE);
      doc.setLineWidth(0.2);
      doc.line(ML, y, ML + innerW, y);
    }

    const rowHeight = 8.2;

    function drawParticipantRow(p: typeof ap[number], idx: number, dotColor?: [number, number, number]) {
      const inf = getInf(p.influencerId);
      if (!inf) return;
      checkPage(rowHeight + 2);
      if (idx % 2 === 1) {
        setFill([250, 248, 244]);
        doc.rect(ML, y, innerW, rowHeight, "F");
      }
      // status dot
      let dot: [number, number, number] = dotColor || FAINT;
      if (!dotColor) {
        if (p.negotiationStatus === "topou") dot = GREEN;
        else if (p.negotiationStatus === "em_negociacao") dot = AMBER;
        else if (p.negotiationStatus === "nao_topou") dot = RED;
        if (p.contactStatus === "rp") dot = PURPLE;
      }
      setFill(dot);
      doc.circle(ML + 3, y + rowHeight / 2, 1.4, "F");

      // name
      setColor(INK);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      const nameMax = colName - 12;
      let nm = inf.name;
      while (doc.getTextWidth(nm) > nameMax && nm.length > 4) nm = nm.slice(0, -1);
      if (nm !== inf.name) nm = nm.slice(0, -1) + "…";
      const igUrl = instagramProfileUrl(inf.instagramUrl || inf.username);
      doc.textWithLink(nm, ML + 7, y + 4.6, { url: igUrl });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      setColor(MUTED);
      doc.textWithLink(`@${inf.username}`, ML + 7, y + 7.6, { url: igUrl });

      let xx = ML + 6 + colName;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      setColor(INK);
      doc.text(CONTACT_LABELS[p.contactStatus].label, xx, y + 5.4); xx += colContato;
      doc.text(NEGOTIATION_LABELS[p.negotiationStatus].label, xx, y + 5.4); xx += colNeg;
      doc.text(MATERIAL_LABELS[p.materialStatus].label, xx, y + 5.4);

      y += rowHeight;
      setStroke(LINE);
      doc.setLineWidth(0.15);
      doc.line(ML, y, ML + innerW, y);
    }

    // Concluded section
    if (concluidosPDF.length > 0) {
      checkPage(14 + headerH);
      setFill([85, 107, 47]);
      doc.roundedRect(ML, y, innerW, 8, 2, 2, "F");
      setColor([255, 255, 255]);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("CONCLUÍDOS", ML + 4, y + 5.4);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      const cnt = `${concluidosPDF.length} ${concluidosPDF.length === 1 ? "influenciador" : "influenciadores"}`;
      doc.text(cnt, pageW - MR - doc.getTextWidth(cnt) - 4, y + 5.4);
      y += 10;

      drawTableHeader();

      concluidosPDF.forEach((p, idx) => drawParticipantRow(p, idx, [85, 107, 47]));
      y += 4;
    }

    regionGroups.forEach(([loc, list]) => {
      // Region section header
      checkPage(14 + headerH);
      setFill(ACCENT_SOFT);
      doc.roundedRect(ML, y, innerW, 8, 2, 2, "F");
      setColor([110, 75, 20]);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(loc.toUpperCase(), ML + 4, y + 5.4);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      const cnt = `${list.length} ${list.length === 1 ? "influenciador" : "influenciadores"}`;
      doc.text(cnt, pageW - MR - doc.getTextWidth(cnt) - 4, y + 5.4);
      y += 10;

      drawTableHeader();

      list.forEach((p, idx) => drawParticipantRow(p, idx));
      y += 4;
    });

    // Footer (date + page nº) on every page
    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      setColor(FAINT);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.text(`${campaign.name}  ·  ${now.toLocaleDateString("pt-BR")} ${now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`, ML, pageH - 6);
      const pg = `Página ${i} de ${pages}`;
      doc.text(pg, pageW - MR - doc.getTextWidth(pg), pageH - 6);
    }

    doc.save(`campanha-${campaign.name.toLowerCase().replace(/\s+/g, "-")}.pdf`);
    toast({ description: "PDF exportado com sucesso!" });
  }

  function exportBudgetAnalysisPDF() {
    const stripHtml = stripHtmlText;

    const awaiting = budgetAnalysisParticipants;

    if (awaiting.length === 0) {
      toast({ description: "Nenhum perfil aguardando validação de orçamento." });
      return;
    }

    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const ML = 15, MR = 15;
    let y = 18;

    const PRIMARY: [number, number, number] = [180, 130, 60];
    const NEUTRAL: [number, number, number] = [55, 65, 81];
    const MUTED: [number, number, number] = [120, 120, 120];
    const ORANGE: [number, number, number] = [234, 88, 12];
    const LINK: [number, number, number] = [37, 99, 235];

    function checkPage(needed = 10) {
      if (y + needed > pageH - 14) { doc.addPage(); y = 18; }
    }

    // Header / title
    doc.setFillColor(255, 247, 237);
    doc.roundedRect(ML, y - 8, pageW - ML - MR, 26, 3, 3, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(20, 20, 20);
    doc.text("Análise de Orçamento", ML + 5, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(NEUTRAL[0], NEUTRAL[1], NEUTRAL[2]);
    doc.text(campaign.name, ML + 5, y + 6);
    const now = new Date();
    doc.setFontSize(8);
    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    doc.text(`Extraído em ${now.toLocaleDateString("pt-BR")} às ${now.toLocaleTimeString("pt-BR")}`, ML + 5, y + 12);
    y += 24;

    // Summary
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(ORANGE[0], ORANGE[1], ORANGE[2]);
    doc.text(`${awaiting.length}`, ML, y);
    const totW = doc.getTextWidth(`${awaiting.length}`);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(NEUTRAL[0], NEUTRAL[1], NEUTRAL[2]);
    doc.text(`perfis aguardando validação de orçamento`, ML + totW + 2, y);
    y += 6;

    // Region breakdown
    const regionMap = new Map<string, number>();
    awaiting.forEach((p) => {
      const inf = getInf(p.influencerId);
      const loc = inf?.location || "—";
      regionMap.set(loc, (regionMap.get(loc) || 0) + 1);
    });
    const regions = Array.from(regionMap.entries()).sort((a, b) => b[1] - a[1]);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    doc.text("POR REGIÃO:", ML, y);
    y += 4;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(NEUTRAL[0], NEUTRAL[1], NEUTRAL[2]);
    const regionText = regions.map(([loc, c]) => `${loc}: ${c}`).join("   •   ");
    const regionLines = doc.splitTextToSize(regionText, pageW - ML - MR);
    regionLines.forEach((line: string) => {
      checkPage(5); doc.text(line, ML, y); y += 4;
    });
    y += 6;

    // Each profile card
    awaiting.forEach((p, idx) => {
      const inf = getInf(p.influencerId);
      if (!inf) return;
      const budget = stripHtml(p.negotiationBudget || "");
      const condition = p.negotiationCondition ? stripHtml(p.negotiationCondition) : "";
      const budgetLines = doc.splitTextToSize(budget, pageW - ML - MR - 10);
      const conditionLines = condition ? doc.splitTextToSize(`Condição: ${condition}`, pageW - ML - MR - 10) : [];
      const notes = p.directorNotes || [];
      const noteLines: string[] = [];
      notes.forEach((n) => {
        const txt = `${n.author} (${new Date(n.createdAt).toLocaleDateString("pt-BR")}): ${stripHtml(n.text)}`;
        doc.splitTextToSize(txt, pageW - ML - MR - 10).forEach((l: string) => noteLines.push(l));
      });
      const notesBlockH = noteLines.length ? noteLines.length * 4 + 6 : 0;
      const cardH = 30 + budgetLines.length * 4 + conditionLines.length * 4 + notesBlockH + 6;
      checkPage(cardH + 4);

      // card background
      doc.setDrawColor(230, 230, 230);
      doc.setFillColor(252, 252, 250);
      doc.roundedRect(ML, y, pageW - ML - MR, cardH, 3, 3, "FD");

      // index circle
      doc.setFillColor(ORANGE[0], ORANGE[1], ORANGE[2]);
      doc.circle(ML + 6, y + 7, 4, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text(`${idx + 1}`, ML + 6, y + 8.6, { align: "center" });

      // name + username
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(20, 20, 20);
      doc.textWithLink(inf.name, ML + 14, y + 8, { url: instagramProfileUrl(inf.instagramUrl || inf.username) });

      // Instagram link
      const handle = `@${inf.username.replace(/^@/, "")}`;
      const handleW = doc.getTextWidth(inf.name) + 14 + 4;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(LINK[0], LINK[1], LINK[2]);
      doc.textWithLink(handle, ML + handleW, y + 8, { url: instagramProfileUrl(inf.instagramUrl || inf.username) });

      // meta line
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
      const meta = [
        inf.location || "—",
        inf.niche || "",
        inf.followers ? `${inf.followers.toLocaleString("pt-BR")} seguidores` : "",
        inf.rating ? `★ ${inf.rating.toFixed(1)} (${inf.totalRatings || 0})` : "Sem avaliação",
      ].filter(Boolean).join("   •   ");
      doc.text(meta, ML + 14, y + 14);

      // negotiation type
      if (p.negotiationType) {
        const typeLabel = p.negotiationType === "permuta" ? "Permuta"
          : p.negotiationType === "pagamento" ? "Pagamento"
          : p.negotiationType === "permuta_e_pagamento" ? "Permuta + Pagamento" : "—";
        doc.setFont("helvetica", "bold");
        doc.setTextColor(NEUTRAL[0], NEUTRAL[1], NEUTRAL[2]);
        doc.text(`Tipo: ${typeLabel}`, ML + 14, y + 19);
      }

      // budget block
      let by = y + 24;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(ORANGE[0], ORANGE[1], ORANGE[2]);
      doc.text("ORÇAMENTO:", ML + 5, by);
      by += 4;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(30, 30, 30);
      budgetLines.forEach((line: string) => { doc.text(line, ML + 5, by); by += 4; });

      if (conditionLines.length > 0) {
        by += 1;
        doc.setFontSize(8);
        doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
        conditionLines.forEach((line: string) => { doc.text(line, ML + 5, by); by += 4; });
      }

      if (noteLines.length > 0) {
        by += 3;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(NEUTRAL[0], NEUTRAL[1], NEUTRAL[2]);
        doc.text("COMENTÁRIOS:", ML + 5, by);
        by += 4;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(60, 60, 60);
        noteLines.forEach((line: string) => { doc.text(line, ML + 5, by); by += 4; });
      }

      y += cardH + 4;
    });

    // Footer
    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`${campaign.name} · Análise de orçamento · pág. ${i}/${pages}`, ML, pageH - 6);
    }

    doc.save(`orcamento-${campaign.name.toLowerCase().replace(/\s+/g, "-")}.pdf`);
    toast({ description: "PDF de análise de orçamento exportado!" });
  }

  return (
    <div className="space-y-6">
      {/* Cover Image */}
      {campaign.coverImage && (
        <div className="relative w-full overflow-hidden rounded-xl aspect-[1024/400] bg-secondary/40">
          <img
            src={campaign.coverImage}
            alt="Capa"
            className="h-full w-full rounded-xl object-cover"
            style={{ objectPosition: `50% ${Math.min(100, Math.max(0, campaign.coverImagePosition ?? 50))}%` }}
          />
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{campaign.name}</h1>
            <Badge variant="outline" className={STATUS_CONFIG[campaign.status].color}>
              {STATUS_CONFIG[campaign.status].label}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{campaign.description}</p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" size="sm" className="gap-2 border-primary text-primary hover:bg-primary/10" onClick={exportBudgetAnalysisPDF}>
            <FileText className="h-4 w-4" /> Análise orçamento ({budgetAnalysisCount})
          </Button>
          <label className="cursor-pointer" title="Dimensão visível: 1024×400px">
            <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
            <Button variant="outline" size="sm" className="gap-2 pointer-events-none" asChild>
              <span><Upload className="h-4 w-4" /> {coverUploading ? "..." : "Capa (1024×400)"}</span>
            </Button>
          </label>
          {campaign.coverImage && (
            <Button variant="outline" size="sm" className="gap-2" onClick={openCoverEditor}>
              <FileImage className="h-4 w-4" /> Ajustar capa
            </Button>
          )}
          {campaign.coverImage && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" /> Remover capa
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remover a capa?</AlertDialogTitle>
                  <AlertDialogDescription>A campanha ficará sem imagem de capa até que uma nova seja adicionada.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={removeCover}>Remover capa</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button variant="outline" size="sm" className="gap-2" onClick={exportToPDF}>
            <FileDown className="h-4 w-4" /> Exportar PDF
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="gap-2">
                <Trash2 className="h-4 w-4" /> Excluir
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir campanha?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. A campanha "{campaign.name}" será removida permanentemente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteCampaign}>Excluir</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Dialog open={coverEditorOpen} onOpenChange={(open) => { if (!coverUploading) setCoverEditorOpen(open); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Ajustar enquadramento da capa</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <Label htmlFor="cover-position">Posição vertical</Label>
                <span className="text-muted-foreground">{pendingCoverPosition}%</span>
              </div>
              <Slider
                id="cover-position"
                value={[pendingCoverPosition]}
                onValueChange={(value) => setPendingCoverPosition(value[0] ?? 50)}
                min={0}
                max={100}
                step={1}
                aria-label="Posição vertical da capa"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Card de campanhas</p>
                <div className="aspect-square w-32 overflow-hidden rounded-lg bg-secondary/40">
                  <img src={pendingCoverImage} alt="Prévia no card" className="h-full w-full object-cover" style={{ objectPosition: `50% ${pendingCoverPosition}%` }} />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Topo da campanha</p>
                <div className="aspect-[1024/400] w-full overflow-hidden rounded-lg bg-secondary/40">
                  <img src={pendingCoverImage} alt="Prévia no topo" className="h-full w-full object-cover" style={{ objectPosition: `50% ${pendingCoverPosition}%` }} />
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setCoverEditorOpen(false)} disabled={coverUploading}>Cancelar</Button>
              <Button onClick={saveCover} disabled={coverUploading} className="gap-2">
                {coverUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Salvar capa
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-secondary">
          <TabsTrigger value="geral">Geral</TabsTrigger>
          <TabsTrigger value="conteudos">Conteúdos ({contents.length})</TabsTrigger>
          <TabsTrigger value="participantes">Contatos ({activeParticipants.length})</TabsTrigger>
          <TabsTrigger value="materiais">Materiais ({materials.length})</TabsTrigger>
        </TabsList>

        {/* === TAB GERAL === */}
        <TabsContent value="geral" className="mt-4 space-y-4">
          {/* Progress bar */}
          {campaign.startDate && campaign.deadline && (() => {
            const start = parseLocalDate(campaign.startDate).getTime();
            const end = parseLocalDate(campaign.deadline).getTime();
            const now = Date.now();
            const total = end - start;
            const elapsed = now - start;
            const pct = total > 0 ? Math.min(100, Math.max(0, Math.round((elapsed / total) * 100))) : 0;
            const daysLeft = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
            const isEnding = daysLeft <= 7 && daysLeft > 0;
            const isOverdue = now > end;
            return (
              <Card>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{parseLocalDate(campaign.startDate).toLocaleDateString("pt-BR")}</span>
                    <span className={`font-medium ${isOverdue ? "text-destructive" : isEnding ? "text-amber-600" : ""}`}>
                      {isOverdue ? "Encerrada" : daysLeft === 0 ? "Encerra hoje" : `${daysLeft} dia${daysLeft > 1 ? "s" : ""} restante${daysLeft > 1 ? "s" : ""}`}
                    </span>
                    <span>{parseLocalDate(campaign.deadline).toLocaleDateString("pt-BR")}</span>
                  </div>
                  <Progress
                    value={pct}
                    className={`h-2 ${isOverdue ? "[&>div]:bg-destructive" : isEnding ? "[&>div]:bg-amber-500" : "[&>div]:bg-primary"}`}
                  />
                </CardContent>
              </Card>
            );
          })()}

          {/* Quick stats */}
          {(() => {
            const totalContacts = activeParticipants.length;
            const totalParticipants = participants.filter((p) => p.negotiationStatus === "topou").length;
            const conversionRate = totalContacts > 0 ? ((totalParticipants / totalContacts) * 100).toFixed(1) : "0";
            return (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Card>
                    <CardContent className="p-3 text-center">
                      <p className="text-2xl font-bold">{totalContacts}</p>
                      <p className="text-xs text-muted-foreground">Contatos</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 text-center">
                      <p className="text-2xl font-bold text-emerald-600">{totalParticipants}</p>
                      <p className="text-xs text-muted-foreground">Participantes</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 text-center">
                      <p className="text-2xl font-bold">{contents.length}</p>
                      <p className="text-xs text-muted-foreground">Conteúdos</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 text-center">
                      <p className="text-2xl font-bold">{materials.length}</p>
                      <p className="text-xs text-muted-foreground">Materiais</p>
                    </CardContent>
                  </Card>
                </div>
                <p className="text-xs text-muted-foreground text-center -mt-1">
                  Você fez <span className="font-medium text-foreground">{totalContacts}</span> contato{totalContacts !== 1 ? "s" : ""} e converteu <span className="font-medium text-emerald-600">{totalParticipants}</span>. Taxa de conversão: <span className="font-medium text-foreground">{conversionRate}%</span>
                </p>
              </>
            );
          })()}

          {/* Campaign info card */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-sm">Informações da Campanha</h3>
                <Button
                  variant={isEditing ? "default" : "outline"}
                  size="sm"
                  className="gap-2 h-7 text-xs"
                  onClick={() => setIsEditing(!isEditing)}
                >
                  <Edit className="h-3 w-3" />
                  {isEditing ? "Concluir" : "Editar"}
                </Button>
              </div>

              {isEditing ? (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Nome</Label>
                    <Input value={campaign.name} onChange={(e) => update({ name: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Descrição</Label>
                    <Textarea value={campaign.description} onChange={(e) => update({ description: e.target.value })} rows={3} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Instruções adicionais</Label>
                    <RichTextEditor value={campaign.objective} onChange={(html) => update({ objective: html })} placeholder="Instruções adicionais para a campanha..." />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Data inicial</Label>
                      <Input type="date" className="h-8 text-xs" value={campaign.startDate} onChange={(e) => {
                        const newStart = e.target.value;
                        const patch: Partial<Campaign> = { startDate: newStart };
                        if (campaign.status !== "finalizada") {
                          patch.status = computeCampaignStatus(newStart, campaign.deadline);
                        }
                        update(patch);
                      }} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Data de término</Label>
                      <Input type="date" className="h-8 text-xs" value={campaign.deadline} onChange={(e) => {
                        const newEnd = e.target.value;
                        const patch: Partial<Campaign> = { deadline: newEnd };
                        if (campaign.status !== "finalizada") {
                          patch.status = computeCampaignStatus(campaign.startDate, newEnd);
                        }
                        update(patch);
                      }} />
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Status atual: <Badge variant="outline" className={`ml-1 ${STATUS_CONFIG[campaign.status].color}`}>{STATUS_CONFIG[campaign.status].label}</Badge>
                    <span className="ml-2 italic">(definido automaticamente pelas datas)</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Status</p>
                      <Badge variant="outline" className={`mt-1 ${STATUS_CONFIG[campaign.status].color}`}>
                        {STATUS_CONFIG[campaign.status].label}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Início</p>
                      <p className="mt-1 font-medium">{campaign.startDate ? parseLocalDate(campaign.startDate).toLocaleDateString("pt-BR") : "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Término</p>
                      <p className="mt-1 font-medium">{campaign.deadline ? parseLocalDate(campaign.deadline).toLocaleDateString("pt-BR") : "—"}</p>
                    </div>
                  </div>
                  {campaign.objective && (
                    <div>
                      <p className="text-xs text-muted-foreground">Instruções adicionais</p>
                      <div className="mt-1 text-sm prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: campaign.objective }} />
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Region breakdown */}
          {(() => {
            const regionData: Record<string, { green: number; red: number; gray: number }> = {};
            for (const loc of LOCATIONS) {
              regionData[loc] = { green: 0, red: 0, gray: 0 };
            }
            for (const p of participants) {
              const inf = getInf(p.influencerId);
              if (!inf) continue;
              const loc = inf.location || "Indefinido";
              if (!regionData[loc]) regionData[loc] = { green: 0, red: 0, gray: 0 };
              const isGreen = p.contactStatus === "retornou" && p.negotiationStatus === "topou";
              const isRed = p.negotiationStatus === "nao_topou" || p.selectionStatus === "nao_aprovado";
              if (isGreen) regionData[loc].green++;
              else if (isRed) regionData[loc].red++;
              else regionData[loc].gray++;
            }
            const entries = Object.entries(regionData)
              .sort((a, b) => (b[1].green + b[1].red + b[1].gray) - (a[1].green + a[1].red + a[1].gray));
            return (
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    Contatos por região
                  </h3>
                  {entries.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Nenhum contato adicionado ainda.</p>
                  ) : (
                    <div className="flex flex-wrap gap-4">
                      {entries.map(([region, data]) => {
                        const total = data.green + data.red + data.gray;
                        return (
                          <div key={region} className="text-[11px] leading-relaxed border-l-2 border-muted pl-2">
                            <p className="font-semibold text-foreground mb-0.5">{region}</p>
                            <p className="text-muted-foreground">Total: <span className="font-medium text-foreground">{total}</span></p>
                            <p className="text-emerald-600">Toparam: <span className="font-medium">{data.green}</span></p>
                            <p className="text-red-500">Não toparam: <span className="font-medium">{data.red}</span></p>
                            <p className="text-muted-foreground">Pendentes: <span className="font-medium">{data.gray}</span></p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })()}

          {/* Confirmed participants */}
          {(() => {
            const confirmed = participants.filter((p) => {
              const inf = getInf(p.influencerId);
              return inf && p.contactStatus === "retornou" && p.negotiationStatus === "topou";
            });
            if (confirmed.length === 0) return null;
            return (
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Influenciadores confirmados ({confirmed.length})
                  </h3>
                  <div className="space-y-2">
                    {confirmed.map((p) => {
                      const inf = getInf(p.influencerId)!;
                      return (
                        <div key={p.influencerId} className="flex items-center gap-3 rounded-lg bg-secondary/50 p-2.5">
                          <img src={inf.profilePic} alt="" className="h-8 w-8 rounded-full object-cover" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{inf.name}</p>
                            <p className="text-xs text-muted-foreground"><InstagramHandle username={inf.username} url={inf.instagramUrl} /></p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">{p.negotiationCondition || "Permuta"}</p>
                            <Badge variant="outline" className={`text-[10px] ${BRIEFING_LABELS[p.briefingStatus || "pendente"].color}`}>
                              Briefing: {BRIEFING_LABELS[p.briefingStatus || "pendente"].label}
                            </Badge>
                            <Badge variant="outline" className={`text-[10px] ${MATERIAL_LABELS[p.materialStatus].color}`}>
                              {MATERIAL_LABELS[p.materialStatus].label}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })()}

        </TabsContent>


        {/* === TAB CONTEÚDOS === */}
        <TabsContent value="conteudos" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Dialog open={contentDialogOpen} onOpenChange={setContentDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" /> Adicionar Conteúdo
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Adicionar Conteúdo Publicado</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Influenciador</Label>
                    <Select value={ctInfluencerId} onValueChange={setCtInfluencerId}>
                      <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                      <SelectContent>
                        {campaign.influencerIds.map((infId) => {
                          const inf = getInf(infId);
                          return inf ? (
                            <SelectItem key={inf.id} value={inf.id}>{inf.name}</SelectItem>
                          ) : null;
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Link do conteúdo no Instagram</Label>
                    <Input value={ctUrl} onChange={(e) => setCtUrl(e.target.value)} placeholder="https://www.instagram.com/reel/..." />
                    <p className="text-[10px] text-muted-foreground">As métricas (curtidas, comentários, visualizações) serão extraídas automaticamente</p>
                  </div>
                  <Button onClick={addContent} className="w-full" disabled={scrapingMetrics || !ctUrl || !ctInfluencerId}>
                    {scrapingMetrics ? (
                      <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Extraindo métricas...</>
                    ) : (
                      "Adicionar Conteúdo"
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {contents.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhum conteúdo adicionado</p>
          ) : (
            <div className="space-y-2">
              {contents.map((ct) => {
                const ctInf = getInf(ct.influencerId);
                const m = ct.metrics;
                return (
                  <Card key={ct.id}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <img src={ctInf?.profilePic || ""} alt="" className="h-8 w-8 rounded-full object-cover" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{ctInf?.name}</p>
                          <p className="text-xs text-muted-foreground"><InstagramHandle username={ctInf?.username} url={ctInf?.instagramUrl} /></p>
                          {ct.submittedAt && (
                            <p className="text-[10px] text-muted-foreground mt-1">Adicionado em {ct.submittedAt}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {ct.url && (
                            <a href={ct.url} target="_blank" rel="noopener noreferrer">
                              <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs">
                                <ExternalLink className="h-3 w-3" /> Ver conteúdo
                              </Button>
                            </a>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive"
                            onClick={() => deleteContent(ct.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      {/* Metrics display */}
                      {m && (
                        <div className="flex flex-wrap gap-3">
                          {m.likes > 0 && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Heart className="h-3 w-3" /> {m.likes.toLocaleString("pt-BR")}</span>}
                          {m.comments > 0 && <span className="flex items-center gap-1 text-xs text-muted-foreground"><MessageCircle className="h-3 w-3" /> {m.comments.toLocaleString("pt-BR")}</span>}
                          {(m.views || 0) > 0 && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Eye className="h-3 w-3" /> {(m.views || 0).toLocaleString("pt-BR")}</span>}
                          {(m.shares || 0) > 0 && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Share2 className="h-3 w-3" /> {(m.shares || 0).toLocaleString("pt-BR")}</span>}
                          {(m.impressions || 0) > 0 && <span className="flex items-center gap-1 text-xs text-muted-foreground"><BarChart3 className="h-3 w-3" /> {(m.impressions || 0).toLocaleString("pt-BR")} imp.</span>}
                          {(m.accountsReached || 0) > 0 && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Users className="h-3 w-3" /> {(m.accountsReached || 0).toLocaleString("pt-BR")} alcance</span>}
                          {(m.saves || 0) > 0 && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Bookmark className="h-3 w-3" /> {(m.saves || 0).toLocaleString("pt-BR")} salvos</span>}
                        </div>
                      )}

                      {/* Metrics history with % diff and estimation */}
                      {(ct.metricsHistory || []).length > 0 && (
                        <div className="rounded-md bg-secondary/50 p-3 space-y-2">
                          <p className="text-[10px] font-semibold text-muted-foreground">Histórico de updates</p>
                          {/* Initial metrics (first recorded) */}
                          {(() => {
                            const initialMetrics = ct.metricsHistory![0];
                            const latestMetrics = ct.metricsHistory![ct.metricsHistory!.length - 1];
                            const pctDiff = (curr: number, initial: number) => {
                              if (initial === 0) return curr > 0 ? "+∞" : "—";
                              const pct = ((curr - initial) / initial) * 100;
                              return pct > 0 ? `+${pct.toFixed(1)}%` : pct < 0 ? `${pct.toFixed(1)}%` : "—";
                            };
                            const absDiff = (curr: number, old: number) => {
                              const d = curr - old;
                              return d > 0 ? `+${d.toLocaleString("pt-BR")}` : d < 0 ? d.toLocaleString("pt-BR") : "—";
                            };
                            // Calculate estimation for next interval
                            const daysBetween = ct.metricsHistory!.length >= 2
                              ? Math.max(1, Math.round((parseLocalDate(latestMetrics.date).getTime() - parseLocalDate(ct.metricsHistory![ct.metricsHistory!.length - 2].date).getTime()) / (1000 * 60 * 60 * 24)))
                              : 30;
                            const estimate = (key: keyof typeof latestMetrics.metrics) => {
                              if (ct.metricsHistory!.length < 2) return "—";
                              const prev = ct.metricsHistory![ct.metricsHistory!.length - 2].metrics;
                              const growth = (latestMetrics.metrics[key] || 0) - (prev[key] || 0);
                              const est = (latestMetrics.metrics[key] || 0) + growth;
                              return est > 0 ? est.toLocaleString("pt-BR") : "—";
                            };

                            return (
                              <>
                                {ct.metricsHistory!.map((snap, idx) => {
                                  const prev = idx === 0 ? null : ct.metricsHistory![idx - 1];
                                  return (
                                    <div key={idx} className="text-[10px] text-muted-foreground border-l-2 border-muted pl-2">
                                      <span className="font-semibold text-foreground">{snap.date}</span>
                                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-0.5">
                                        <span>❤️ {snap.metrics.likes.toLocaleString("pt-BR")} {prev && <span className={`font-medium ${snap.metrics.likes > (prev.metrics.likes || 0) ? "text-emerald-600" : snap.metrics.likes < (prev.metrics.likes || 0) ? "text-red-500" : ""}`}>({absDiff(snap.metrics.likes, prev.metrics.likes || 0)})</span>}</span>
                                        <span>💬 {snap.metrics.comments.toLocaleString("pt-BR")} {prev && <span className={`font-medium ${snap.metrics.comments > (prev.metrics.comments || 0) ? "text-emerald-600" : snap.metrics.comments < (prev.metrics.comments || 0) ? "text-red-500" : ""}`}>({absDiff(snap.metrics.comments, prev.metrics.comments || 0)})</span>}</span>
                                        <span>👁 {(snap.metrics.views || 0).toLocaleString("pt-BR")} {prev && <span className={`font-medium ${(snap.metrics.views || 0) > (prev.metrics.views || 0) ? "text-emerald-600" : (snap.metrics.views || 0) < (prev.metrics.views || 0) ? "text-red-500" : ""}`}>({absDiff(snap.metrics.views || 0, prev.metrics.views || 0)})</span>}</span>
                                        {(snap.metrics.shares || 0) > 0 && <span>🔗 {(snap.metrics.shares || 0).toLocaleString("pt-BR")}</span>}
                                      </div>
                                    </div>
                                  );
                                })}
                                {/* Overall growth summary */}
                                <div className="border-t border-border pt-2 mt-2">
                                  <p className="text-[10px] font-semibold text-foreground mb-1">Crescimento total (inicial → atual)</p>
                                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[10px]">
                                    <span>❤️ {pctDiff(latestMetrics.metrics.likes, initialMetrics.metrics.likes)}</span>
                                    <span>💬 {pctDiff(latestMetrics.metrics.comments, initialMetrics.metrics.comments)}</span>
                                    <span>👁 {pctDiff(latestMetrics.metrics.views || 0, initialMetrics.metrics.views || 0)}</span>
                                  </div>
                                </div>
                                {/* Estimation for next interval */}
                                {ct.metricsHistory!.length >= 2 && (
                                  <div className="border-t border-border pt-2">
                                    <p className="text-[10px] font-semibold text-foreground mb-1">Estimativa para ~{daysBetween} dias</p>
                                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[10px] text-muted-foreground">
                                      <span>❤️ ~{estimate("likes")}</span>
                                      <span>💬 ~{estimate("comments")}</span>
                                      <span>👁 ~{estimate("views")}</span>
                                    </div>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      )}

                      {/* Review closed badge */}
                      {ct.reviewClosed && (
                        <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground">
                          <Ban className="h-3 w-3 mr-1" /> Revisão encerrada
                        </Badge>
                      )}

                      {/* Next update date badge */}
                      {ct.nextUpdateDate && !ct.reviewClosed && (
                        <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                          <CalendarClock className="h-3 w-3 mr-1" /> Próximo update: {parseLocalDate(ct.nextUpdateDate).toLocaleDateString("pt-BR")}
                        </Badge>
                      )}

                      {/* Schedule update date form */}
                      {schedulingUpdateId === ct.id && (
                        <div className="rounded-md border border-blue-200 p-3 space-y-2">
                          <p className="text-xs font-medium">Agendar próximo update</p>
                          <Input type="date" className="h-7 text-xs" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} />
                          <div className="flex gap-2 justify-end">
                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSchedulingUpdateId(null)}>Cancelar</Button>
                            <Button size="sm" className="h-7 text-xs" onClick={() => {
                              if (!scheduleDate) return;
                              const updatedContents = contents.map((c) => c.id === ct.id ? { ...c, nextUpdateDate: scheduleDate } : c);
                              update({ contents: updatedContents });
                              setSchedulingUpdateId(null);
                              setScheduleDate("");
                              toast({ description: `Update agendado para ${parseLocalDate(scheduleDate).toLocaleDateString("pt-BR")}` });
                            }}>Agendar</Button>
                          </div>
                        </div>
                      )}

                      {/* Edit metrics */}
                      {editingMetricsId === ct.id && (
                        <div className="rounded-md border border-border p-3 space-y-2">
                          <p className="text-xs font-medium">Editar métricas</p>
                          <div className="grid grid-cols-4 gap-2">
                            {[["likes", "Curtidas"], ["comments", "Comentários"], ["views", "Visualizações"], ["shares", "Compartilhamentos"], ["impressions", "Impressões"], ["accountsReached", "Contas alcançadas"], ["saves", "Salvos"]].map(([key, label]) => (
                              <div key={key} className="space-y-0.5">
                                <Label className="text-[10px]">{label}</Label>
                                <Input className="h-7 text-xs" type="number" value={metricsForm[key] || ""} onChange={(e) => setMetricsForm((p) => ({ ...p, [key]: parseInt(e.target.value) || 0 }))} />
                              </div>
                            ))}
                          </div>
                          <div className="flex gap-2 justify-end">
                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingMetricsId(null)}>Cancelar</Button>
                            <Button size="sm" className="h-7 text-xs" onClick={() => saveContentMetrics(ct.id)}>Salvar</Button>
                          </div>
                        </div>
                      )}

                      {/* Update metrics (new snapshot) */}
                      {updatingMetricsId === ct.id && (
                        <div className="rounded-md border border-primary/30 p-3 space-y-2">
                          <p className="text-xs font-medium">Novo update de métricas</p>
                          <div className="grid grid-cols-4 gap-2">
                            {[["likes", "Curtidas"], ["comments", "Comentários"], ["views", "Visualizações"], ["shares", "Compartilhamentos"], ["impressions", "Impressões"], ["accountsReached", "Contas alcançadas"], ["saves", "Salvos"]].map(([key, label]) => (
                              <div key={key} className="space-y-0.5">
                                <Label className="text-[10px]">{label}</Label>
                                <Input className="h-7 text-xs" type="number" value={updateMetricsForm[key] || ""} onChange={(e) => setUpdateMetricsForm((p) => ({ ...p, [key]: parseInt(e.target.value) || 0 }))} />
                              </div>
                            ))}
                          </div>
                          <div className="flex gap-2 justify-end">
                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setUpdatingMetricsId(null)}>Cancelar</Button>
                            <Button size="sm" className="h-7 text-xs" onClick={() => saveContentMetricsUpdate(ct.id)}>Salvar update</Button>
                          </div>
                        </div>
                      )}

                      {/* Action buttons */}
                      {editingMetricsId !== ct.id && updatingMetricsId !== ct.id && schedulingUpdateId !== ct.id && !ct.reviewClosed && (
                        <div className="flex gap-2 flex-wrap">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={() => {
                              setEditingMetricsId(ct.id);
                              setMetricsForm({
                                likes: m?.likes || 0,
                                comments: m?.comments || 0,
                                views: m?.views || 0,
                                shares: m?.shares || 0,
                                impressions: m?.impressions || 0,
                                accountsReached: m?.accountsReached || 0,
                                saves: m?.saves || 0,
                              });
                            }}
                          >
                            <Edit className="h-3 w-3" /> Editar métricas
                          </Button>
                          {m && (m.likes > 0 || m.comments > 0 || (m.views || 0) > 0) && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs gap-1"
                              onClick={() => {
                                setUpdatingMetricsId(ct.id);
                                setUpdateMetricsForm({
                                  likes: m?.likes || 0,
                                  comments: m?.comments || 0,
                                  views: m?.views || 0,
                                  shares: m?.shares || 0,
                                  impressions: m?.impressions || 0,
                                  accountsReached: m?.accountsReached || 0,
                                  saves: m?.saves || 0,
                                });
                              }}
                            >
                              <BarChart3 className="h-3 w-3" /> Fazer update
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={() => {
                              setSchedulingUpdateId(ct.id);
                              setScheduleDate(ct.nextUpdateDate || "");
                            }}
                          >
                            <CalendarClock className="h-3 w-3" /> Agendar update
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
                            onClick={() => {
                              if (confirm("Encerrar revisão deste conteúdo? Não será possível adicionar mais updates.")) {
                                const updatedContents = contents.map((c) => c.id === ct.id ? { ...c, reviewClosed: true } : c);
                                update({ contents: updatedContents });
                                toast({ description: "Revisão encerrada." });
                              }
                            }}
                          >
                            <Ban className="h-3 w-3" /> Encerrar revisão
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* AI Analysis button & result */}
          {contents.length > 0 && (
            <div className="space-y-3">
              <Button
                variant="outline"
                className="gap-2"
                disabled={aiAnalysisLoading}
                onClick={async () => {
                  setAiAnalysisLoading(true);
                  setAiAnalysisResult(null);
                  try {
                    const contentData = contents.map((ct) => {
                      const ctInf = getInf(ct.influencerId);
                      return {
                        influencer: ctInf?.name || "Desconhecido",
                        username: ctInf?.username || "",
                        followers: ctInf?.followers || 0,
                        url: ct.url,
                        initialMetrics: ct.metricsHistory?.[0]?.metrics || ct.metrics || {},
                        latestMetrics: ct.metrics || {},
                        historyLength: ct.metricsHistory?.length || 0,
                        history: (ct.metricsHistory || []).map((h) => ({ date: h.date, ...h.metrics })),
                      };
                    });
                    const { data, error } = await supabase.functions.invoke("generate-insights", {
                      body: {
                        type: "campaign_content_analysis",
                        campaignName: campaign.name,
                        contents: contentData,
                      },
                    });
                    if (error) throw error;
                    setAiAnalysisResult(data?.analysis || "Não foi possível gerar a análise.");
                  } catch (e) {
                    console.error("AI analysis error:", e);
                    toast({ description: "Erro ao gerar análise. Tente novamente.", variant: "destructive" });
                  } finally {
                    setAiAnalysisLoading(false);
                  }
                }}
              >
                {aiAnalysisLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Gerar análise
              </Button>
              {aiAnalysisResult && (
                <Card>
                  <CardContent className="p-4">
                    <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                      <Sparkles className="h-4 w-4 text-primary" /> Análise de desempenho
                    </h3>
                    <div className="text-sm text-muted-foreground whitespace-pre-wrap">{aiAnalysisResult}</div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        {/* === TAB PARTICIPANTES === */}
        <TabsContent value="participantes" className="mt-4 space-y-3">
          {/* Mini Dashboard */}
          {activeParticipants.length > 0 && (() => {
            const ap = activeParticipants.filter((p) => (p.selectionStatus || "pendente") !== "nao_aprovado");
            const contactPending = ap.filter((p) => p.contactStatus === "nao_iniciado" || p.contactStatus === "aguardando_retorno").length;
            const retornou = ap.filter((p) => p.contactStatus === "retornou").length;
            const naoRetornou = ap.filter((p) => p.contactStatus === "nao_retornou").length;
            const gerenciadosRP = ap.filter((p) => p.contactStatus === "rp").length;
            const reprovadosCount = activeParticipants.filter((p) => p.selectionStatus === "nao_aprovado").length;
            const emNegociacao = ap.filter((p) => p.negotiationStatus === "em_negociacao").length;
            const aguardandoOrcamento = budgetAnalysisCount;
            const aguardandoAprovacao = ap.filter((p) => (p.selectionStatus || "pendente") === "pendente").length;
            const topou = ap.filter((p) => p.negotiationStatus === "topou").length;
            const naoTopou = ap.filter((p) => p.negotiationStatus === "nao_topou").length;
            const permuta = ap.filter((p) => p.negotiationStatus === "topou" && (!p.negotiationType || p.negotiationType === "permuta")).length;
            const pago = ap.filter((p) => p.negotiationStatus === "topou" && (p.negotiationType === "pagamento" || p.negotiationType === "permuta_e_pagamento")).length;
            const estimatedCost = ap.reduce((sum, p) => {
              if (p.negotiationStatus !== "topou") return sum;
              return sum + getParticipantCost(p);
            }, 0);
            const visitaLoja = ap.filter((p) => p.deliveryType === "visita_loja").length;
            const envioCasa = ap.filter((p) => p.deliveryType === "envio_casa").length;
            const visitasFeitas = ap.filter((p) => p.deliveryType === "visita_loja" && p.storeVisitDone).length;
            const visitasPendentes = ap.filter((p) => p.deliveryType === "visita_loja" && !p.storeVisitDone).length;
            const visitasComunicadas = ap.filter((p) => p.deliveryType === "visita_loja" && p.managerNotified).length;
            const visitasComunicarPend = ap.filter((p) => p.deliveryType === "visita_loja" && !p.managerNotified).length;
            const concluidosCount = ap.filter((p) => p.materialStatus === "publicado").length;

            return (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <Card>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <Phone className="h-3 w-3" /> Contato
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-bold text-emerald-600">{retornou}</span>
                      <span className="text-xs text-muted-foreground">retornaram</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-bold text-amber-600">{contactPending}</span>
                      <span className="text-xs text-muted-foreground">pendentes</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-bold text-destructive">{naoRetornou}</span>
                      <span className="text-xs text-muted-foreground">não retornaram</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-bold text-purple-600">{gerenciadosRP}</span>
                      <span className="text-xs text-muted-foreground">gerenciados por RP</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-bold text-destructive">{reprovadosCount}</span>
                      <span className="text-xs text-muted-foreground">reprovados</span>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <Handshake className="h-3 w-3" /> Negociação
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-bold text-emerald-600">{topou}</span>
                      <span className="text-xs text-muted-foreground">toparam</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-bold text-amber-600">{emNegociacao}</span>
                      <span className="text-xs text-muted-foreground">em negociação</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-bold text-destructive">{naoTopou}</span>
                      <span className="text-xs text-muted-foreground">não toparam</span>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <Package className="h-3 w-3" /> Tipo
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-bold">{permuta}</span>
                      <span className="text-xs text-muted-foreground">permuta</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-bold">{pago}</span>
                      <span className="text-xs text-muted-foreground">com pagamento</span>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <Store className="h-3 w-3" /> Entrega
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-bold text-blue-600">{visitaLoja}</span>
                      <span className="text-xs text-muted-foreground">visita loja</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-bold text-purple-600">{envioCasa}</span>
                      <span className="text-xs text-muted-foreground">envio casa</span>
                    </div>
                    {visitaLoja > 0 && (
                      <div className="mt-1 pt-1 border-t border-border space-y-0.5">
                        <p className="text-[10px] text-muted-foreground">
                          Realizadas: <span className="font-semibold text-emerald-600">{visitasFeitas}</span> · Pend.: <span className="font-semibold text-amber-600">{visitasPendentes}</span>
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          Comunic.: <span className="font-semibold text-emerald-600">{visitasComunicadas}</span> · Pend.: <span className="font-semibold text-amber-600">{visitasComunicarPend}</span>
                        </p>
                      </div>
                    )}
                    <div className="mt-1 pt-1 border-t border-border">
                      <p className="text-[10px] text-muted-foreground">
                        Concluídos: <span className="font-semibold text-[#556b2f]">{concluidosCount}</span>
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <Clock className="h-3 w-3" /> Aguardando
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-bold text-amber-600">{aguardandoAprovacao}</span>
                      <span className="text-xs text-muted-foreground">aprovação</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-bold text-orange-600">{aguardandoOrcamento}</span>
                      <span className="text-xs text-muted-foreground">validação orçamento</span>
                    </div>
                    {(() => {
                      const regions = budgetAnalysisRegions;
                      return (
                        <>
                          {regions.length > 0 && (
                            <div className="mt-1 pt-1 border-t border-border space-y-0.5">
                              <p className="text-[10px] text-muted-foreground leading-tight">
                                {regions.map(([loc, c]) => (
                                  <span key={loc} className="mr-2 whitespace-nowrap">
                                    <span className="font-semibold text-orange-600">{c}</span> {loc}
                                  </span>
                                ))}
                              </p>
                            </div>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-2 h-7 w-full text-[11px] gap-1 border-orange-300 text-orange-700 hover:bg-orange-50"
                            onClick={exportBudgetAnalysisPDF}
                          >
                            <FileText className="h-3 w-3" />
                            Solicitar análise de orçamento
                          </Button>
                        </>
                      );
                    })()}
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <DollarSign className="h-3 w-3" /> Custo Estimado
                    </div>
                    <p className="text-lg font-bold text-primary">
                      {estimatedCost > 0
                        ? `R$ ${estimatedCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                        : "R$ 0"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">baseado nas condições</p>
                  </CardContent>
                </Card>
              </div>
            );
          })()}

          {/* Filter + Add influencer */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex gap-1 flex-wrap items-center">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={participantSearch}
                  onChange={(e) => setParticipantSearch(e.target.value)}
                  placeholder="Buscar influenciador..."
                  className="h-7 pl-8 text-xs w-48"
                />
              </div>
              {(["todos", "topou", "nao_topou", "em_negociacao", "aguardando_aprovacao", "sem_retorno", "material_pendente", "concluidos"] as const).map((f) => {
                const labels: Record<string, string> = { todos: "Todos", topou: "Topou", nao_topou: "Não topou", em_negociacao: "Em negociação", aguardando_aprovacao: "Aguardando aprovação", sem_retorno: "Sem retorno", material_pendente: "Material pendente", concluidos: "Concluídos" };
                return (
                  <Button
                    key={f}
                    variant={negotiationFilter === f ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setNegotiationFilter(f)}
                  >
                    {labels[f]}
                  </Button>
                );
              })}
              <Select value={regionFilter} onValueChange={setRegionFilter}>
                <SelectTrigger className="h-7 w-auto min-w-[120px] text-xs gap-1">
                  <MapPin className="h-3 w-3" />
                  <SelectValue placeholder="Região" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas regiões</SelectItem>
                  {LOCATIONS.map((loc) => (
                    <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Dialog open={addInfluencerDialogOpen} onOpenChange={(v) => { setAddInfluencerDialogOpen(v); if (!v) { setSelectedInfluencerIds([]); setAddInfluencerSearch(""); setAddInfluencerRegionFilter("todos"); } }}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" /> Vincular Influenciador
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Vincular Influenciadores à Campanha</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={addInfluencerSearch}
                        onChange={(e) => setAddInfluencerSearch(e.target.value)}
                        placeholder="Buscar por nome ou @..."
                        className="pl-10"
                      />
                    </div>
                    <Select value={addInfluencerRegionFilter} onValueChange={setAddInfluencerRegionFilter}>
                      <SelectTrigger className="w-[140px] text-xs">
                        <MapPin className="h-3 w-3 mr-1" />
                        <SelectValue placeholder="Região" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todas regiões</SelectItem>
                        {LOCATIONS.map((loc) => (
                          <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedInfluencerIds.length > 0 && (
                    <div className="flex items-center justify-between rounded-md bg-secondary/50 px-3 py-2">
                      <span className="text-xs text-muted-foreground">{selectedInfluencerIds.length} selecionado{selectedInfluencerIds.length > 1 ? "s" : ""}</span>
                      <Button size="sm" className="h-7 text-xs gap-1" onClick={() => addInfluencersToCampaign(selectedInfluencerIds)}>
                        <Plus className="h-3 w-3" /> Vincular selecionados
                      </Button>
                    </div>
                  )}
                  <div className="max-h-60 overflow-y-auto space-y-1">
                    {(() => {
                      const filtered = influencers.filter((inf) => {
                        if (addInfluencerRegionFilter !== "todos" && inf.location !== addInfluencerRegionFilter) return false;
                        if (!addInfluencerSearch) return true;
                        const q = normalizeSearch(addInfluencerSearch);
                        return normalizeSearch(inf.name).includes(q) || normalizeSearch(inf.username).includes(q);
                      });
                      if (filtered.length === 0) {
                        return <p className="text-sm text-muted-foreground py-4 text-center">Nenhum influenciador encontrado.</p>;
                      }
                      return filtered.map((inf) => {
                        const alreadyAdded = alreadyInCampaignIds.has(inf.id);
                        const isSelected = selectedInfluencerIds.includes(inf.id);
                        return (
                          <button
                            key={inf.id}
                            disabled={alreadyAdded}
                            className={`flex w-full items-center gap-3 rounded-md p-2 transition-colors ${alreadyAdded ? "opacity-40 cursor-not-allowed" : isSelected ? "bg-primary/10 ring-1 ring-primary/30" : "hover:bg-secondary/50"}`}
                            onClick={() => !alreadyAdded && toggleInfluencerSelection(inf.id)}
                          >
                            <Checkbox checked={isSelected || alreadyAdded} disabled={alreadyAdded} className="pointer-events-none" />
                            <img src={inf.profilePic} alt="" className="h-8 w-8 rounded-full object-cover" />
                            <div className="text-left flex-1">
                              <p className="text-sm font-medium">{inf.name}</p>
                              <p className="text-xs text-muted-foreground"><InstagramHandle username={inf.username} url={inf.instagramUrl} /> · {inf.location || "—"}</p>
                            </div>
                            {alreadyAdded && (
                              <Badge variant="secondary" className="text-[10px]">Já vinculado</Badge>
                            )}
                          </button>
                        );
                      });
                    })()}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {activeParticipants.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhum influenciador vinculado</p>
          )}

          {(() => {
            const GROUPS = [
              { id: "concluidos", label: "Concluídos", cardCls: "border-[#556b2f] bg-[#d6ddc8]" },
              { id: "topou", label: "Topou", cardCls: "border-green-300 bg-green-50/70" },
              { id: "em_negociacao", label: "Em negociação", cardCls: "border-yellow-300 bg-yellow-50/70" },
              { id: "rp", label: "Gerenciados por RP", cardCls: "border-purple-300 bg-purple-50/70" },
              { id: "pendente", label: "Pendente", cardCls: "border-gray-300 bg-gray-50/70" },
              { id: "nao_topou", label: "Não topou", cardCls: "border-red-300 bg-red-50/70" },
            ] as const;
            const groupOrder: Record<string, number> = { concluidos: 0, topou: 1, em_negociacao: 2, rp: 3, pendente: 4, nao_topou: 5 };
            const getGroup = (p: typeof participants[number]): "concluidos" | "topou" | "em_negociacao" | "rp" | "pendente" | "nao_topou" => {
              if (p.materialStatus === "publicado") return "concluidos";
              if (p.contactStatus === "rp") return "rp";
              if (p.negotiationStatus === "topou") return "topou";
              if (p.negotiationStatus === "em_negociacao") return "em_negociacao";
              if (p.negotiationStatus === "nao_topou") return "nao_topou";
              return "pendente";
            };

            const sortedVisible = [...participants]
              .filter((p) => (p.selectionStatus || "pendente") !== "nao_aprovado")
              .filter((p) => {
                if (negotiationFilter === "todos") return true;
                if (negotiationFilter === "topou") return p.negotiationStatus === "topou" && p.materialStatus !== "publicado";
                if (negotiationFilter === "nao_topou") return p.negotiationStatus === "nao_topou";
                if (negotiationFilter === "em_negociacao") return p.negotiationStatus === "em_negociacao";
                if (negotiationFilter === "aguardando_aprovacao") {
                  const pendingSelection = (p.selectionStatus || "pendente") === "pendente";
                  const pendingBudget = p.negotiationStatus === "em_negociacao" && !!(p.negotiationBudget && p.negotiationBudget.replace(/<[^>]*>/g, "").trim() !== "");
                  const pendingMaterial = p.materialStatus === "aguardando_aprovacao";
                  return pendingSelection || pendingBudget || pendingMaterial;
                }
                if (negotiationFilter === "sem_retorno") return p.contactStatus === "nao_retornou";
                if (negotiationFilter === "material_pendente") return p.negotiationStatus === "topou" && p.materialStatus === "pendente";
                if (negotiationFilter === "concluidos") return p.materialStatus === "publicado";
                return true;
              })
              .filter((p) => {
                if (regionFilter === "todos") return true;
                const inf = getInf(p.influencerId);
                return inf?.location === regionFilter;
              })
              .filter((p) => {
                if (!participantSearch.trim()) return true;
                const q = normalizeSearch(participantSearch);
                const inf = getInf(p.influencerId);
                return normalizeSearch(inf?.name || "").includes(q) || normalizeSearch(inf?.username || "").includes(q);
              })
              .sort((a, b) => {
                const ga = getGroup(a), gb = getGroup(b);
                if (ga !== gb) return groupOrder[ga] - groupOrder[gb];
                // Secondary sort within each group
                const intraOrder = (p: typeof participants[number]): number => {
                  if (ga === "topou") {
                    return 0;
                  }
                  if (ga === "em_negociacao") {
                    // aguardando validação de orçamento (com orçamento alocado) acima
                    const hasBudget = !!(p.negotiationBudget && p.negotiationBudget.replace(/<[^>]*>/g, "").trim() !== "");
                    return hasBudget ? 0 : 1;
                  }
                  if (ga === "pendente") {
                    // Order: iniciar contato, aguardando retorno, aguardando aprovação, sem retorno
                    const sel = p.selectionStatus || "pendente";
                    if (sel === "aprovado" && p.contactStatus === "nao_iniciado") return 0;
                    if (p.contactStatus === "aguardando_retorno") return 1;
                    if (sel === "pendente") return 2;
                    if (p.contactStatus === "nao_retornou") return 3;
                    return 4;
                  }
                  return 0;
                };
                return intraOrder(a) - intraOrder(b);
              });

            let lastGroup: string | null = null;
            return sortedVisible.map((p) => {
              const gId = getGroup(p);
              const gMeta = GROUPS.find((g) => g.id === gId)!;
              const headerEl = gId !== lastGroup
                ? (
                  <div key={`hdr-${gId}`} className="flex items-center gap-2 pt-4 pb-1">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {gMeta.label} ({sortedVisible.filter((x) => getGroup(x) === gId).length})
                    </h3>
                  </div>
                )
                : null;
              lastGroup = gId;
              const inf = getInf(p.influencerId);
              if (!inf) return headerEl;
              const negoCfg = NEGOTIATION_LABELS[p.negotiationStatus];
              const isFinalized = p.materialStatus === "publicado" || p.materialStatus === "nao_se_aplica";
              const isAwaitingApproval = p.materialStatus === "aguardando_aprovacao";
              const isMaterialApproved = p.materialStatus === "aprovado";
              const isNoReturn = p.contactStatus === "nao_retornou";
              const briefingCardLabel = BRIEFING_CARD_LABELS[p.briefingStatus || "pendente"];
              const hasComments = !!(p.notes && p.notes.trim()) || (p.directorNotes && p.directorNotes.length > 0);
              const cardCls = isAwaitingApproval
                ? "border-yellow-400 bg-yellow-200/80"
                : isMaterialApproved
                ? "border-orange-400 bg-orange-200/80"
                : gMeta.cardCls;

              return (
              <React.Fragment key={p.influencerId}>
              {headerEl}
              <Collapsible>
                <Card className={cardCls}>


                  <CardContent className="p-0">
                    <div className="flex items-center gap-3 p-4">
                      <img src={inf.profilePic} alt={inf.name} className="h-10 w-10 rounded-full object-cover" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm truncate">{inf.name}</p>
                          {hasComments && (
                            <span title="Tem observações" className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-sky-100 text-sky-700 border border-sky-300 shrink-0">
                              <MessageCircle className="h-3 w-3" />
                            </span>
                          )}
                          <Badge variant="secondary" className="text-[10px] gap-1 shrink-0">
                            <MapPin className="h-2.5 w-2.5" /> {inf.location || "—"}
                          </Badge>
                          {p.contactStatus === "rp" && (
                            <Badge variant="outline" className="text-[10px] bg-purple-100 text-purple-800 border-purple-300 flex items-center gap-1 font-bold">
                              RP
                            </Badge>
                          )}
                          {p.contactStatus === "nao_retornou" && (
                            <Badge variant="outline" className="text-[10px] bg-zinc-200 text-zinc-700 border-zinc-400 flex items-center gap-1 font-semibold">
                              Sem retorno
                            </Badge>
                          )}
                          {(p.selectionStatus || "pendente") !== "aprovado" && (
                            <Badge variant="outline" className="text-[10px] bg-amber-100 text-amber-800 border-amber-300 flex items-center gap-1">
                              Aguardando aprovação
                            </Badge>
                          )}
                          {(p.selectionStatus === "aprovado") && p.contactStatus === "nao_iniciado" && (
                            <Badge variant="outline" className="text-[10px] bg-blue-100 text-blue-800 border-blue-300 flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              Iniciar contato
                            </Badge>
                          )}
                          {p.contactStatus === "aguardando_retorno" && (
                            <Badge variant="outline" className="text-[10px] bg-orange-500 text-white border-orange-600 flex items-center gap-1 font-bold">
                              <Phone className="h-3 w-3" />
                              Aguardando retorno
                            </Badge>
                          )}
                          {p.deliveryType === "visita_loja" && p.negotiationStatus === "topou" && !p.managerNotified && !p.storeVisitDone && (
                            <Badge variant="outline" className="text-[10px] bg-orange-100 text-orange-800 border-orange-300 flex items-center gap-1 font-semibold">
                              📣 Comunicar visita
                            </Badge>
                          )}
                          {p.deliveryType === "visita_loja" && p.negotiationStatus === "topou" && p.managerNotified && !p.storeVisitDone && (
                            <Badge variant="outline" className="text-[10px] bg-blue-100 text-blue-800 border-blue-300 flex items-center gap-1 font-semibold">
                              ⏳ Aguardando visita
                            </Badge>
                          )}
                          {p.negotiationStatus === "topou" && p.materialStatus === "pendente" && (
                            <Badge variant="outline" className="text-[10px] bg-yellow-100 text-yellow-800 border-yellow-400 flex items-center gap-1">
                              <FileImage className="h-3 w-3" />
                              Material pendente
                            </Badge>
                          )}
                          {isAwaitingApproval && (
                            <Badge variant="outline" className="text-[10px] bg-yellow-300 text-yellow-900 border-yellow-500 flex items-center gap-1 font-semibold">
                              <FileCheck className="h-3 w-3" />
                              Material pendente de aprovação
                            </Badge>
                          )}
                          {isMaterialApproved && (
                            <Badge variant="outline" className="text-[10px] bg-orange-300 text-orange-900 border-orange-500 flex items-center gap-1 font-semibold">
                              <Send className="h-3 w-3" />
                              Aguardando publicação
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground"><InstagramHandle username={inf.username} url={inf.instagramUrl} /></p>
                      </div>
                      {p.negotiationStatus === "topou" && (
                        <Badge variant="outline" className={`text-[10px] shrink-0 ${briefingCardLabel.color}`}>
                          {briefingCardLabel.label}
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={(e) => { e.stopPropagation(); setMsgFor(p.influencerId); }}
                        title="Gerar mensagem (DM/WhatsApp)"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={(e) => { e.stopPropagation(); navigate(`/influencer/${inf.id}`); }}
                        title="Ver cadastro"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                      <Badge variant="outline" className={`text-xs ${negoCfg.color}`}>
                        {negoCfg.label}
                      </Badge>
                      {p.negotiationStatus === "em_negociacao" && p.negotiationBudget && p.negotiationBudget.replace(/<[^>]*>/g, "").trim() !== "" && (
                        <Badge variant="outline" className="text-[10px] bg-orange-100 text-orange-800 border-orange-300 shrink-0">
                          Aguardando validação de orçamento
                        </Badge>
                      )}
                      {isFinalized && (
                        <Badge variant="outline" className={`text-xs flex items-center gap-1 ${p.materialStatus === "publicado" ? "bg-[#556b2f] text-white border-[#556b2f]" : "bg-slate-200 text-slate-700 border-slate-400"}`}>
                          <CheckCircle2 className="h-3 w-3" />
                          {p.materialStatus === "nao_se_aplica" ? "Não se aplica" : "Entrega finalizada"}
                        </Badge>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Desvincular influenciador?</AlertDialogTitle>
                            <AlertDialogDescription>
                              {inf.name} será removido(a) desta campanha. Deseja continuar?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => removeInfluencerFromCampaign(p.influencerId)}>Desvincular</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <ChevronDown className="h-4 w-4 transition-transform duration-200 [[data-state=open]_&]:rotate-180" />
                        </Button>
                      </CollapsibleTrigger>
                    </div>

                    <CollapsibleContent>
                      <div className="px-4 pb-4 pt-0 space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6 xl:grid-cols-8">
                          {/* Seleção */}
                          <div className="space-y-2 rounded-lg border border-border p-3">
                            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                              <ShieldCheck className="h-3 w-3" /> Seleção
                            </div>
                            <Select
                              value={p.selectionStatus || "pendente"}
                              onValueChange={(v: SelectionStatus) => {
                                if (v === "nao_aprovado") {
                                  // Require justification before applying rejection
                                  setPendingRejectId(p.influencerId);
                                  setPendingRejectText(p.selectionRejectionReason || "");
                                  return;
                                }
                                const patch: Partial<CampaignParticipant> = { selectionStatus: v };
                                patch.selectionRejectionReason = "";
                                updateParticipant(p.influencerId, patch);
                              }}
                            >
                              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pendente">Pendente</SelectItem>
                                <SelectItem value="aprovado">Aprovado</SelectItem>
                                <SelectItem value="nao_aprovado">Não aprovado</SelectItem>
                              </SelectContent>
                            </Select>

                          </div>

                          <div className="space-y-2 rounded-lg border border-border p-3">
                            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                              <Phone className="h-3 w-3" /> Contato
                            </div>
                            <Select
                              value={p.contactStatus}
                              onValueChange={(v: ContactStatus) => updateParticipant(p.influencerId, { contactStatus: v })}
                            >
                              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="nao_iniciado">Não iniciado</SelectItem>
                                <SelectItem value="aguardando_retorno">Aguardando retorno</SelectItem>
                                <SelectItem value="retornou">Retornou</SelectItem>
                                <SelectItem value="nao_retornou">Não retornou</SelectItem>
                                <SelectItem value="rp">RP (Relações Públicas)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Entrega */}
                          <div className="space-y-2 rounded-lg border border-border p-3">
                            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                              <Package className="h-3 w-3" /> Entrega
                            </div>
                            <Select
                              value={p.deliveryType || "none"}
                              onValueChange={(v) => updateParticipant(p.influencerId, { deliveryType: v === "none" ? null : v as DeliveryType })}
                            >
                              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Não definido</SelectItem>
                                <SelectItem value="visita_loja">Visita em loja</SelectItem>
                                <SelectItem value="envio_casa">Envio para casa</SelectItem>
                              </SelectContent>
                            </Select>

                            {p.deliveryType === "visita_loja" && (
                              <div className="space-y-1.5 pt-1">
                                <Select
                                  value={p.storeUnit || "none"}
                                  onValueChange={(v) => updateParticipant(p.influencerId, { storeUnit: v === "none" ? "" : v })}
                                >
                                  <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Unidade de retirada" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">Selecionar unidade...</SelectItem>
                                    {storeUnits.map((unit) => (
                                      <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Input
                                  className="h-7 text-xs"
                                  placeholder="Produto retirado"
                                  value={p.storeProduct || ""}
                                  onChange={(e) => updateParticipant(p.influencerId, { storeProduct: e.target.value })}
                                />
                                <label className="flex items-center gap-2 pt-1 cursor-pointer">
                                  <Checkbox
                                    checked={p.managerNotified}
                                    onCheckedChange={(v) => updateParticipant(p.influencerId, { managerNotified: !!v })}
                                  />
                                  <span className="text-xs text-muted-foreground">Visita comunicada</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <Checkbox
                                    checked={p.storeVisitDone || false}
                                    onCheckedChange={(v) => updateParticipant(p.influencerId, { storeVisitDone: !!v })}
                                  />
                                  <span className="text-xs text-muted-foreground">Visita realizada</span>
                                </label>
                              </div>
                            )}

                            {p.deliveryType === "envio_casa" && (
                              <div className="space-y-1.5 pt-1">
                                <Input
                                  className="h-7 text-xs"
                                  placeholder="Produto escolhido"
                                  value={p.chosenProduct}
                                  onChange={(e) => updateParticipant(p.influencerId, { chosenProduct: e.target.value })}
                                />
                                <Input
                                  className="h-7 text-xs"
                                  placeholder="Numeração"
                                  value={p.shippingName}
                                  onChange={(e) => updateParticipant(p.influencerId, { shippingName: e.target.value })}
                                />
                                {!shipments.find(
                                  (s) => s.influencerId === p.influencerId && s.campaignId === campaign!.id && !s.delivered
                                ) && (
                                  <Input
                                    className="h-7 text-xs"
                                    placeholder="Endereço"
                                    value={p.shippingAddress}
                                    onChange={(e) => updateParticipant(p.influencerId, { shippingAddress: e.target.value })}
                                  />
                                )}
                                {(() => {
                                  const linkedShipment = shipments.find(
                                    (s) => s.influencerId === p.influencerId && s.campaignId === campaign!.id
                                  );
                                  if (linkedShipment) {
                                    return (
                                      <Dialog>
                                        <DialogTrigger asChild>
                                          <Button variant="outline" size="sm" className="w-full h-7 text-xs gap-1.5 mt-1">
                                            <Package className="h-3 w-3" /> Acompanhar envio
                                          </Button>
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-md">
                                          <DialogHeader>
                                            <DialogTitle>Detalhes do Envio</DialogTitle>
                                          </DialogHeader>
                                          <div className="space-y-2 text-sm">
                                            <p><span className="text-muted-foreground">Solicitante:</span> {linkedShipment.requestedBy}</p>
                                            <p><span className="text-muted-foreground">Produto:</span> {linkedShipment.description}</p>
                                            <p><span className="text-muted-foreground">Unidade:</span> {linkedShipment.unit}</p>
                                            <p><span className="text-muted-foreground">Data:</span> {parseLocalDate(linkedShipment.requestDate).toLocaleDateString("pt-BR")}</p>
                                            <p><span className="text-muted-foreground">Responsável:</span> {linkedShipment.responsiblePerson}</p>
                                            <p><span className="text-muted-foreground">Rastreio:</span> {linkedShipment.trackingCode || "Pendente"}</p>
                                            <p><span className="text-muted-foreground">Status:</span> {linkedShipment.delivered ? "Entregue" : "Em andamento"}</p>
                                          </div>
                                        </DialogContent>
                                      </Dialog>
                                    );
                                  }
                                  const inf = getInf(p.influencerId);
                                  return (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="w-full h-7 text-xs gap-1.5 mt-1"
                                      onClick={() => navigate(`/envios?campaignId=${campaign!.id}&influencerId=${p.influencerId}&product=${encodeURIComponent(p.chosenProduct || "")}`)}
                                    >
                                      <Plus className="h-3 w-3" /> Registrar envio
                                    </Button>
                                  );
                                })()}
                              </div>
                            )}
                          </div>

                          {/* Negociação */}
                          <div className="space-y-2 rounded-lg border border-border p-3 lg:col-span-2">
                            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                              <Handshake className="h-3 w-3" /> Negociação
                            </div>
                            <Select
                              value={p.negotiationStatus}
                              onValueChange={(v: NegotiationStatus) => updateParticipant(p.influencerId, { negotiationStatus: v, ...(v !== "em_negociacao" ? { negotiationBudget: undefined } : {}) })}
                            >
                              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pendente">Pendente</SelectItem>
                                <SelectItem value="em_negociacao">Em negociação</SelectItem>
                                <SelectItem value="topou">Topou</SelectItem>
                                <SelectItem value="nao_topou">Não topou</SelectItem>
                              </SelectContent>
                            </Select>

                            {p.negotiationStatus === "topou" && (
                              <>
                                <Select
                                  value={p.negotiationType || "permuta"}
                                  onValueChange={(v: "permuta" | "pagamento" | "permuta_e_pagamento" | "nao_se_aplica") => updateParticipant(p.influencerId, { negotiationType: v, ...(v === "nao_se_aplica" ? { paidByFranchisee: false, negotiationPaymentAmount: 0, negotiationProductCost: 0, negotiationProductCount: 0 } : {}) })}
                                >
                                  <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Tipo" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="permuta">Permuta</SelectItem>
                                    <SelectItem value="pagamento">Pagamento</SelectItem>
                                    <SelectItem value="permuta_e_pagamento">Permuta + Pagamento</SelectItem>
                                    <SelectItem value="nao_se_aplica">Não se aplica</SelectItem>
                                  </SelectContent>
                                </Select>

                                {(p.negotiationType === "permuta" || p.negotiationType === "pagamento" || p.negotiationType === "permuta_e_pagamento") && (
                                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                                    <Checkbox
                                      checked={p.paidByFranchisee || false}
                                      onCheckedChange={(v) => updateParticipant(p.influencerId, { paidByFranchisee: !!v, ...(v ? { negotiationProductCost: 0, negotiationPaymentAmount: 0 } : {}) })}
                                    />
                                    <span className="text-muted-foreground">Pago pelo franqueado</span>
                                  </label>
                                )}

                                {(!p.negotiationType || p.negotiationType === "permuta" || p.negotiationType === "permuta_e_pagamento") && (
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                      <Label className="text-[10px] text-muted-foreground">Qtd. produtos</Label>
                                      <Input
                                        className="h-7 text-xs"
                                        type="number"
                                        min="0"
                                        placeholder="0"
                                        value={p.negotiationProductCount || ""}
                                        onChange={(e) => updateParticipant(p.influencerId, { negotiationProductCount: parseInt(e.target.value, 10) || 0 })}
                                      />
                                    </div>
                                    {!p.paidByFranchisee && (
                                      <div className="space-y-1">
                                        <Label className="text-[10px] text-muted-foreground">Custo total (R$)</Label>
                                        <Input
                                          className="h-7 text-xs"
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          placeholder="0,00"
                                          value={p.negotiationProductCost || ""}
                                          onChange={(e) => updateParticipant(p.influencerId, { negotiationProductCost: parseFloat(e.target.value) || 0 })}
                                        />
                                      </div>
                                    )}
                                  </div>
                                )}

                                {(p.negotiationType === "pagamento" || p.negotiationType === "permuta_e_pagamento") && !p.paidByFranchisee && (
                                  <div className="space-y-1">
                                    <Label className="text-[10px] text-muted-foreground">Valor acordado (R$)</Label>
                                    <Input
                                      className="h-7 text-xs"
                                      type="number"
                                      placeholder="0,00"
                                      value={p.negotiationPaymentAmount || ""}
                                      onChange={(e) => updateParticipant(p.influencerId, { negotiationPaymentAmount: parseFloat(e.target.value) || 0 })}
                                    />
                                  </div>
                                )}

                                <Input
                                  className="h-7 text-xs"
                                  placeholder="Observação da negociação"
                                  value={p.negotiationCondition}
                                  onChange={(e) => updateParticipant(p.influencerId, { negotiationCondition: e.target.value })}
                                />

                                {(p.negotiationType === "pagamento" || p.negotiationType === "permuta_e_pagamento") && !p.paidByFranchisee && (
                                  <label className="flex items-center gap-2 text-xs cursor-pointer pt-1">
                                    <Checkbox
                                      checked={p.paymentScheduled || false}
                                      onCheckedChange={(v) => updateParticipant(p.influencerId, { paymentScheduled: !!v })}
                                    />
                                    <span className="text-muted-foreground">Pagamento agendado</span>
                                  </label>
                                )}
                              </>
                            )}

                            {p.negotiationStatus === "em_negociacao" && (() => {
                              const isEditing = !!budgetEditing[p.influencerId];
                              const hasBudget = !!(p.negotiationBudget && p.negotiationBudget.replace(/<[^>]*>/g, "").trim() !== "");
                              if (!hasBudget && !isEditing) {
                                return (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={() => {
                                      setBudgetDraft((d) => ({ ...d, [p.influencerId]: "" }));
                                      setBudgetEditing((s) => ({ ...s, [p.influencerId]: true }));
                                    }}
                                  >
                                    Inserir orçamento
                                  </Button>
                                );
                              }
                              if (isEditing) {
                                return (
                                  <div className="space-y-1">
                                    <Label className="text-[10px] text-muted-foreground">Orçamento</Label>
                                    <RichTextEditor
                                      value={budgetDraft[p.influencerId] ?? ""}
                                      onChange={(html) => setBudgetDraft((d) => ({ ...d, [p.influencerId]: html }))}
                                      placeholder="Descreva o orçamento"
                                    />
                                    <div className="flex gap-1 pt-1">
                                      <Button
                                        type="button"
                                        size="sm"
                                        className="h-7 text-xs"
                                        onClick={() => {
                                          const v = budgetDraft[p.influencerId] ?? "";
                                          const isEmpty = v.replace(/<[^>]*>/g, "").trim() === "";
                                          updateParticipant(p.influencerId, { negotiationBudget: isEmpty ? undefined : v });
                                          setBudgetEditing((s) => ({ ...s, [p.influencerId]: false }));
                                        }}
                                      >
                                        Salvar
                                      </Button>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 text-xs"
                                        onClick={() => setBudgetEditing((s) => ({ ...s, [p.influencerId]: false }))}
                                      >
                                        Cancelar
                                      </Button>
                                    </div>
                                  </div>
                                );
                              }
                              return (
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-[10px] text-muted-foreground">Orçamento</Label>
                                    <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-wider text-muted-foreground/70">
                                      <LockIcon className="h-2.5 w-2.5" /> Bloqueado
                                    </span>
                                  </div>
                                  <div className="flex items-start gap-1">
                                    <div
                                      className="flex-1 text-xs px-3 py-2 rounded-md bg-secondary/40 border-l-2 border-l-primary/40 break-words whitespace-pre-wrap select-text cursor-default [&_*]:!leading-snug [&_*:not(h1):not(h2):not(h3)]:!text-xs [&_h1]:!text-base [&_h1]:!font-bold [&_h2]:!text-sm [&_h2]:!font-semibold [&_h3]:!text-xs [&_h3]:!font-semibold"
                                      dangerouslySetInnerHTML={{ __html: p.negotiationBudget ?? "" }}
                                    />

                                    <Button
                                      type="button"
                                      size="icon"
                                      variant="ghost"
                                      className="h-7 w-7"
                                      onClick={() => {
                                        setBudgetDraft((d) => ({ ...d, [p.influencerId]: p.negotiationBudget ?? "" }));
                                        setBudgetEditing((s) => ({ ...s, [p.influencerId]: true }));
                                      }}
                                      title="Editar orçamento"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      type="button"
                                      size="icon"
                                      variant="ghost"
                                      className="h-7 w-7"
                                      onClick={async () => {
                                        const profileUrl = instagramProfileUrl(inf.instagramUrl || inf.username);
                                        const headerHtml = `<p><strong>${inf.name}</strong> (@${inf.username})</p><p>Região: ${inf.location || "—"}</p><p>Perfil: <a href="${profileUrl}" target="_blank" rel="noopener noreferrer">${profileUrl}</a></p><p><strong>Orçamento:</strong></p>`;
                                        const html = headerHtml + (p.negotiationBudget ?? "");
                                        const plain = `${inf.name} (@${inf.username})\nRegião: ${inf.location || "—"}\nPerfil: ${profileUrl}\n\nOrçamento:\n${(p.negotiationBudget ?? "").replace(/<br\s*\/?>(?!\n)/gi, "\n").replace(/<\/(p|div|li)>/gi, "\n").replace(/<[^>]*>/g, "").trim()}`;
                                        try {
                                          if (navigator.clipboard && (window as any).ClipboardItem) {
                                            await navigator.clipboard.write([
                                              new (window as any).ClipboardItem({
                                                "text/html": new Blob([html], { type: "text/html" }),
                                                "text/plain": new Blob([plain], { type: "text/plain" }),
                                              }),
                                            ]);
                                          } else {
                                            await navigator.clipboard.writeText(plain);
                                          }
                                          toast({ description: "Orçamento copiado!" });
                                        } catch {
                                          toast({ description: "Não foi possível copiar.", variant: "destructive" });
                                        }
                                      }}
                                      title="Copiar com formatação"
                                    >
                                      <Copy className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      type="button"
                                      size="icon"
                                      variant="ghost"
                                      className="h-7 w-7 text-destructive"
                                      onClick={() => updateParticipant(p.influencerId, { negotiationBudget: undefined })}
                                      title="Excluir orçamento"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>

                          {p.negotiationStatus === "topou" && (
                            <div className={`space-y-2 rounded-lg border p-3 ${p.briefingStatus === "enviado" ? "border-[hsl(80,40%,70%)] bg-[hsl(80,40%,95%)]" : p.briefingStatus === "nao_se_aplica" ? "border-muted bg-muted/70" : "border-border"}`}>
                              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                <FileText className="h-3 w-3" /> Briefing
                              </div>
                              <Select
                                value={p.briefingStatus || "pendente"}
                                onValueChange={(v: BriefingStatus) => updateParticipant(p.influencerId, { briefingStatus: v })}
                              >
                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pendente">Pendente</SelectItem>
                                  <SelectItem value="enviado">Enviado</SelectItem>
                                  <SelectItem value="nao_se_aplica">Não se aplica</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          {/* Material */}
                          <div className="space-y-2 rounded-lg border border-border p-3 sm:col-span-2 lg:col-span-2 xl:col-span-3">
                            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                              <FileImage className="h-3 w-3" /> Material
                            </div>
                            <Select
                              value={p.materialStatus}
                              onValueChange={(v: MaterialStatus) => updateParticipant(p.influencerId, { materialStatus: v })}
                            >
                              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                              <SelectItem value="pendente">Pendente</SelectItem>
                                <SelectItem value="aguardando_aprovacao">Aguardando aprovação</SelectItem>
                                <SelectItem value="aprovado">Aprovado</SelectItem>
                                <SelectItem value="agendado">Agendado</SelectItem>
                                <SelectItem value="publicado">Publicado ✅</SelectItem>
                                <SelectItem value="nao_se_aplica">Não se aplica</SelectItem>
                              </SelectContent>
                            </Select>

                            {p.materialStatus === "agendado" && (
                              <Input
                                className="h-7 text-xs"
                                type="datetime-local"
                                value={p.scheduledDate}
                                onChange={(e) => updateParticipant(p.influencerId, { scheduledDate: e.target.value })}
                              />
                            )}

                            <div className="space-y-2 pt-2">
                              <Label className="text-xs font-medium">Observações gerais</Label>
                              {/* Existing notes */}
                              {(p.directorNotes || []).map((note) => {
                                return (
                                <div key={note.id} className={`rounded-md border p-2 space-y-1 ${commentPalette(note.author)}`}>
                                  {editingNoteId === note.id ? (
                                    <div className="space-y-2">
                                      <Textarea
                                        value={editNoteText}
                                        onChange={(e) => setEditNoteText(e.target.value)}
                                        className="min-h-[40px] text-xs"
                                      />
                                      <div className="flex gap-2 justify-end">
                                        <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setEditingNoteId(null)}>Cancelar</Button>
                                        <Button
                                          size="sm"
                                          className="h-6 text-[10px]"
                                          disabled={!editNoteText.trim()}
                                          onClick={() => {
                                            const updated = (p.directorNotes || []).map((n) =>
                                              n.id === note.id ? { ...n, text: editNoteText.trim() } : n
                                            );
                                            updateParticipant(p.influencerId, { directorNotes: updated });
                                            setEditingNoteId(null);
                                          }}
                                        >Salvar</Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-semibold text-foreground">{note.author}</span>
                                        <span className="text-[10px] text-muted-foreground">{parseLocalDate(note.createdAt).toLocaleDateString("pt-BR")}</span>
                                      </div>
                                      <p className="text-xs text-foreground/80 whitespace-pre-wrap break-words">{note.text}</p>
                                      <div className="flex gap-1 justify-end">
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-6 text-[10px] gap-1"
                                          onClick={() => { setEditingNoteId(note.id); setEditNoteText(note.text); }}
                                        >
                                          <Edit className="h-2.5 w-2.5" /> Editar
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-6 text-[10px] text-destructive gap-1"
                                          onClick={() => {
                                            const updated = (p.directorNotes || []).filter((n) => n.id !== note.id);
                                            updateParticipant(p.influencerId, { directorNotes: updated });
                                          }}
                                        >
                                          <Trash2 className="h-2.5 w-2.5" /> Excluir
                                        </Button>
                                      </div>
                                    </>
                                  )}
                                </div>
                                );
                              })}
                              {/* New note input */}
                              <div className="space-y-1.5">
                                <Select
                                  value={noteAuthor[p.influencerId] || ""}
                                  onValueChange={(v) => setNoteAuthor((prev) => ({ ...prev, [p.influencerId]: v }))}
                                >
                                  <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Quem observou?" /></SelectTrigger>
                                  <SelectContent>
                                    {teamMembers.map((name) => (
                                      <SelectItem key={name} value={name}>{name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Textarea
                                  placeholder="Escrever observação..."
                                  value={noteText[p.influencerId] || ""}
                                  onChange={(e) => setNoteText((prev) => ({ ...prev, [p.influencerId]: e.target.value }))}
                                  className="min-h-[50px] text-xs"
                                />
                                <div className="flex justify-end">
                                  <Button
                                    size="sm"
                                    className="h-7 text-xs"
                                    disabled={!(noteText[p.influencerId] || "").trim() || !(noteAuthor[p.influencerId])}
                                    onClick={() => {
                                      const newNote: DirectorNote = {
                                        id: Date.now().toString(),
                                        author: noteAuthor[p.influencerId],
                                        text: (noteText[p.influencerId] || "").trim(),
                                        createdAt: new Date().toISOString(),
                                      };
                                      const updated = [...(p.directorNotes || []), newNote];
                                      updateParticipant(p.influencerId, { directorNotes: updated });
                                      setNoteText((prev) => ({ ...prev, [p.influencerId]: "" }));
                                    }}
                                  >
                                    Enviar
                                  </Button>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 pt-1">
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={p.publishCollaboration}
                                  onCheckedChange={(v) => updateParticipant(p.influencerId, { publishCollaboration: v })}
                                />
                                <span className="text-xs text-muted-foreground">Collab c/ marca</span>
                              </div>
                              <a
                                href={instagramProfileUrl(inf?.instagramUrl || inf?.username)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors ml-auto"
                              >
                                <Instagram className="h-3.5 w-3.5" />
                                Ver perfil
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </CardContent>
                </Card>
              </Collapsible>
              </React.Fragment>
            );
            });
          })()}
          {/* Não aprovados */}
          {(() => {
            const rejected = participants.filter((p) => (p.selectionStatus) === "nao_aprovado");
            if (rejected.length === 0) return null;
            return (
              <div className="mt-6 space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
                  <XCircle className="h-4 w-4" /> Não aprovados ({rejected.length})
                </h3>
                {rejected.map((p) => {
                  const inf = getInf(p.influencerId);
                  if (!inf) return null;
                  const hasJustification = !!p.selectionRejectionReason;
                  const isJustifying = justifyingId === p.influencerId;
                  const isEditingJustification = editingJustificationId === p.influencerId;

                  if (!hasJustification) {
                    // Card sem justificativa — mostra botão "Justificar"
                    return (
                      <Card key={p.influencerId} className="border-red-400 bg-red-100/80">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <img src={inf.profilePic} alt={inf.name} className="h-10 w-10 rounded-full object-cover" />
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm truncate">{inf.name}</p>
                              <p className="text-xs text-muted-foreground"><InstagramHandle username={inf.username} url={inf.instagramUrl} /></p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => updateParticipant(p.influencerId, { selectionStatus: "pendente", selectionRejectionReason: "" })}
                            >
                              Reavaliar
                            </Button>
                            {!isJustifying ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => { setJustifyingId(p.influencerId); setJustifyText(""); }}
                              >
                                Justificar
                              </Button>
                            ) : null}
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-destructive"
                              onClick={() => removeInfluencerFromCampaign(p.influencerId)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          {p.negotiationBudget && stripHtmlText(p.negotiationBudget).trim() && (
                            <div className="mt-3 rounded-lg border border-red-200 bg-white/70 p-3">
                              <Label className="text-xs font-medium text-muted-foreground">Orçamento registrado</Label>
                              <div
                                className="mt-1 text-xs leading-relaxed [&_mark]:rounded [&_mark]:px-0.5"
                                dangerouslySetInnerHTML={{ __html: p.negotiationBudget }}
                              />
                            </div>
                          )}
                          {(p.directorNotes || []).length > 0 && (
                            <div className="mt-3 rounded-lg border border-red-200 bg-white/70 p-3 space-y-2">
                              <Label className="text-xs font-medium text-muted-foreground">Comentários</Label>
                              {(p.directorNotes || []).map((n) => (
                                <div key={n.id} className="text-xs">
                                  <span className="font-semibold">{n.author}</span>
                                  <span className="text-muted-foreground"> · {new Date(n.createdAt).toLocaleDateString("pt-BR")}</span>
                                  <p className="whitespace-pre-wrap">{n.text}</p>
                                </div>
                              ))}
                            </div>
                          )}
                          {isJustifying && (
                            <div className="mt-3 space-y-2">
                              <Textarea
                                placeholder="Informe a justificativa..."
                                value={justifyText}
                                onChange={(e) => setJustifyText(e.target.value)}
                                className="min-h-[60px] text-xs"
                                autoFocus
                              />
                              <div className="flex gap-2 justify-end">
                                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setJustifyingId(null)}>
                                  Cancelar
                                </Button>
                                <Button
                                  size="sm"
                                  className="h-7 text-xs"
                                  disabled={!justifyText.trim()}
                                  onClick={() => {
                                    updateParticipant(p.influencerId, { selectionRejectionReason: justifyText.trim() });
                                    setJustifyingId(null);
                                    setJustifyText("");
                                  }}
                                >
                                  Salvar
                                </Button>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  }

                  // Card com justificativa — expansível
                  return (
                    <Collapsible key={p.influencerId}>
                      <Card className="border-red-400 bg-red-100/80">
                        <CardContent className="p-0">
                          <div className="flex items-center gap-3 p-4">
                            <img src={inf.profilePic} alt={inf.name} className="h-10 w-10 rounded-full object-cover" />
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm truncate">{inf.name}</p>
                              <p className="text-xs text-muted-foreground"><InstagramHandle username={inf.username} url={inf.instagramUrl} /></p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => updateParticipant(p.influencerId, { selectionStatus: "pendente", selectionRejectionReason: "" })}
                            >
                              Reavaliar
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-destructive"
                              onClick={() => removeInfluencerFromCampaign(p.influencerId)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <ChevronDown className="h-4 w-4 transition-transform duration-200 [[data-state=open]_&]:rotate-180" />
                              </Button>
                            </CollapsibleTrigger>
                          </div>
                          <CollapsibleContent>
                            <div className="px-4 pb-4 space-y-2">
                              <Label className="text-xs font-medium text-muted-foreground">Justificativa</Label>
                              {isEditingJustification ? (
                                <div className="space-y-2">
                                  <Textarea
                                    value={editJustificationText}
                                    onChange={(e) => setEditJustificationText(e.target.value)}
                                    className="min-h-[60px] text-xs"
                                  />
                                  <div className="flex gap-2 justify-end">
                                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingJustificationId(null)}>
                                      Cancelar
                                    </Button>
                                    <Button
                                      size="sm"
                                      className="h-7 text-xs"
                                      disabled={!editJustificationText.trim()}
                                      onClick={() => {
                                        updateParticipant(p.influencerId, { selectionRejectionReason: editJustificationText.trim() });
                                        setEditingJustificationId(null);
                                      }}
                                    >
                                      Salvar
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-start gap-2">
                                  <p className="text-xs text-muted-foreground italic flex-1 whitespace-pre-wrap">{p.selectionRejectionReason}</p>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 text-xs gap-1 shrink-0"
                                    onClick={() => {
                                      setEditingJustificationId(p.influencerId);
                                      setEditJustificationText(p.selectionRejectionReason || "");
                                    }}
                                  >
                                    <Edit className="h-3 w-3" /> Editar
                                  </Button>
                                </div>
                              )}

                              {/* Orçamento preservado */}
                              {p.negotiationBudget && stripHtmlText(p.negotiationBudget).trim() && (
                                <div className="rounded-lg border border-red-200 bg-white/70 p-3">
                                  <Label className="text-xs font-medium text-muted-foreground">Orçamento registrado</Label>
                                  <div
                                    className="mt-1 text-xs leading-relaxed [&_mark]:rounded [&_mark]:px-0.5"
                                    dangerouslySetInnerHTML={{ __html: p.negotiationBudget }}
                                  />
                                </div>
                              )}

                              {/* Comentários preservados */}
                              {(p.directorNotes || []).length > 0 && (
                                <div className="rounded-lg border border-red-200 bg-white/70 p-3 space-y-2">
                                  <Label className="text-xs font-medium text-muted-foreground">Comentários</Label>
                                  {(p.directorNotes || []).map((n) => (
                                    <div key={n.id} className="text-xs">
                                      <span className="font-semibold">{n.author}</span>
                                      <span className="text-muted-foreground"> · {new Date(n.createdAt).toLocaleDateString("pt-BR")}</span>
                                      <p className="whitespace-pre-wrap">{n.text}</p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </CollapsibleContent>
                        </CardContent>
                      </Card>
                    </Collapsible>
                  );
                })}
              </div>
            );
          })()}
        </TabsContent>
        <TabsContent value="materiais" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Dialog
              open={materialDialogOpen}
              onOpenChange={(o) => {
                setMaterialDialogOpen(o);
                if (!o) {
                  setEditingMatId(null);
                  setMatName("");
                  setMatType("briefing");
                  setMatContent("");
                  setMatLink("");
                }
              }}
            >
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2" onClick={() => setEditingMatId(null)}>
                  <Plus className="h-4 w-4" /> Novo Material
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>{editingMatId ? "Editar Material" : "Novo Material"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Nome</Label>
                    <Input value={matName} onChange={(e) => setMatName(e.target.value)} placeholder="Ex: Briefing da campanha" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Tipo</Label>
                    <Select value={matType} onValueChange={(v: CampaignMaterial["type"]) => setMatType(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="briefing">Briefing</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                        <SelectItem value="texto">Texto de campanha</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Conteúdo</Label>
                    <Textarea value={matContent} onChange={(e) => setMatContent(e.target.value)} rows={4} placeholder="Detalhes do material..." />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Link (opcional)</Label>
                    <Input value={matLink} onChange={(e) => setMatLink(e.target.value)} placeholder="https://..." />
                  </div>
                  <Button onClick={addMaterial} className="w-full">{editingMatId ? "Salvar alterações" : "Adicionar"}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {materials.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhum material adicionado</p>
          ) : (
            <div className="space-y-3">
              {materials.map((mat) => (
                <Card key={mat.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <p className="font-medium text-sm">{mat.name}</p>
                          <Badge variant="outline" className="text-[10px]">
                            {mat.type === "briefing" ? "Briefing" : mat.type === "card" ? "Card" : "Texto"}
                          </Badge>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">{mat.content}</p>
                        {mat.link && (
                          <a href={mat.link} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                            <ExternalLink className="h-3 w-3" /> {mat.link}
                          </a>
                        )}
                        <p className="mt-2 text-[10px] text-muted-foreground">{mat.createdAt}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => startEditMaterial(mat)}
                          title="Editar material"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => {
                            navigator.clipboard.writeText(mat.content);
                            toast({ description: "Copiado!" });
                          }}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive"
                          onClick={() => deleteMaterial(mat.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {msgFor && (() => {
        const mi = influencers.find((i) => i.id === msgFor);
        const mp = campaign.participants.find((x) => x.influencerId === msgFor);
        return mi ? (
          <GenerateMessageDialog open onOpenChange={(o) => { if (!o) setMsgFor(null); }} influencer={mi} campaign={campaign} participant={mp} />
        ) : null;
      })()}

      {/* Finalization Rating Dialog */}
      <Dialog open={finalizationOpen} onOpenChange={setFinalizationOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              Finalizar Campanha
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Avalie a experiência com cada influenciador participante antes de finalizar.
          </p>
          <div className="space-y-4 mt-2">
            {eligibleForRating.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum participante elegível para avaliação.</p>
            ) : (
              eligibleForRating.map((p) => {
                const inf = influencers.find((i) => i.id === p.influencerId);
                if (!inf) return null;
                const currentRating = finalizationRatings[p.influencerId] || 0;
                return (
                  <div key={p.influencerId} className="rounded-lg border border-border p-3 space-y-3">
                    <div className="flex items-center gap-3">
                      <img src={inf.profilePic} alt="" className="h-8 w-8 rounded-full object-cover" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{inf.name}</p>
                        <p className="text-xs text-muted-foreground"><InstagramHandle username={inf.username} url={inf.instagramUrl} /></p>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Avaliação geral</Label>
                      <StarRating
                        rating={currentRating}
                        onRate={(r) => setFinalizationRatings((prev) => ({ ...prev, [p.influencerId]: r }))}
                        size={20}
                      />
                    </div>
                    {currentRating > 0 && currentRating < 3 && (
                      <div className="space-y-1">
                        <Label className="text-xs text-destructive font-medium">O que houve de errado?</Label>
                        <Textarea
                          placeholder="Descreva o motivo da avaliação baixa..."
                          value={finalizationReasons[p.influencerId] || ""}
                          onChange={(e) => setFinalizationReasons((prev) => ({ ...prev, [p.influencerId]: e.target.value }))}
                          className="min-h-[50px] text-xs"
                        />
                      </div>
                    )}
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Entregou no prazo?</Label>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant={finalizationDeliveryOnTime[p.influencerId] === true ? "default" : "outline"}
                          className="h-7 text-xs"
                          onClick={() => setFinalizationDeliveryOnTime((prev) => ({ ...prev, [p.influencerId]: true }))}
                        >
                          Sim
                        </Button>
                        <Button
                          size="sm"
                          variant={finalizationDeliveryOnTime[p.influencerId] === false ? "default" : "outline"}
                          className="h-7 text-xs"
                          onClick={() => setFinalizationDeliveryOnTime((prev) => ({ ...prev, [p.influencerId]: false }))}
                        >
                          Não
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Nível da entrega</Label>
                      <div className="flex gap-2">
                        {[["baixo", "Baixo"], ["bom", "Bom"], ["superou_expectativas", "Superou expectativas"]].map(([val, label]) => (
                          <Button
                            key={val}
                            size="sm"
                            variant={finalizationDeliveryLevel[p.influencerId] === val ? "default" : "outline"}
                            className="h-7 text-xs"
                            onClick={() => setFinalizationDeliveryLevel((prev) => ({ ...prev, [p.influencerId]: val }))}
                          >
                            {label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setFinalizationOpen(false)}>Cancelar</Button>
            <Button onClick={handleFinalizeCampaign} className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Finalizar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mandatory justification dialog for "Não aprovado" */}
      {/* Link conflict dialog (parceiro já está na campanha) */}
      <Dialog open={linkConflicts.length > 0} onOpenChange={(o) => { if (!o) setLinkConflicts([]); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Parceiro já está na campanha</DialogTitle>
          </DialogHeader>
          {linkConflicts[0] && (() => {
            const cand = influencers.find((i) => i.id === linkConflicts[0].infId);
            const partner = influencers.find((i) => i.id === linkConflicts[0].partnerId);
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
                  <strong>{cand?.name || "O influenciador selecionado"}</strong> está vinculado(a) a <strong>{partner?.name || "este perfil"}</strong>, que já participa desta campanha. O que deseja fazer?
                  {linkConflicts.length > 1 && <span className="block mt-1">({linkConflicts.length} conflitos para resolver)</span>}
                </p>
                <div className="flex flex-col gap-2">
                  <Button size="sm" onClick={() => resolveLinkConflict("add")}>Adicionar mesmo assim</Button>
                  <Button size="sm" variant="outline" onClick={() => resolveLinkConflict("replace")}>
                    Substituir {partner ? `(${partner.name})` : "parceiro"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => resolveLinkConflict("cancel")}>Cancelar</Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={!!pendingRejectId} onOpenChange={(o) => { if (!o) { setPendingRejectId(null); setPendingRejectText(""); setPendingRejectOption(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Motivo da reprovação</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Selecione o motivo da reprovação deste perfil.
            </p>
            <div className="space-y-2">
              {REJECTION_REASONS.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => { setPendingRejectOption(reason); if (reason !== "Outro") setPendingRejectText(""); }}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                    pendingRejectOption === reason
                      ? "border-destructive bg-destructive/10 text-foreground"
                      : "border-border hover:bg-accent"
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>
            {pendingRejectOption === "Outro" && (
              <Textarea
                autoFocus
                placeholder="Descreva o motivo da reprovação..."
                value={pendingRejectText}
                onChange={(e) => setPendingRejectText(e.target.value)}
                className="min-h-[90px] text-sm"
              />
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => { setPendingRejectId(null); setPendingRejectText(""); setPendingRejectOption(""); }}>
                Cancelar
              </Button>
              <Button
                disabled={!pendingRejectOption || (pendingRejectOption === "Outro" && !pendingRejectText.trim())}
                onClick={() => {
                  if (!pendingRejectId) return;
                  const reason = pendingRejectOption === "Outro" ? pendingRejectText.trim() : pendingRejectOption;
                  updateParticipant(pendingRejectId, {
                    selectionStatus: "nao_aprovado",
                    selectionRejectionReason: reason,
                  });
                  setPendingRejectId(null);
                  setPendingRejectText("");
                  setPendingRejectOption("");
                }}
              >
                Confirmar reprovação
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

