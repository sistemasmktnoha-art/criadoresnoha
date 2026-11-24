import { normalizeSearch, parseLocalDate } from "@/lib/utils";
import { useState, useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Calendar, Users, CheckCircle2, Clock, TrendingUp, TrendingDown, Lightbulb, Star } from "lucide-react";
import { Campaign } from "@/types";
import { useNavigate } from "react-router-dom";
import { StarRating } from "@/components/StarRating";

const STATUS_CONFIG = {
  a_iniciar: { label: "A iniciar", color: "text-chart-2", icon: Clock },
  em_andamento: { label: "Em andamento", color: "text-warning", icon: Clock },
  finalizada: { label: "Finalizada", color: "text-success", icon: CheckCircle2 },
};

export default function Campaigns() {
  const { campaigns, influencers, addCampaign, updateCampaign } = useApp();
  const navigate = useNavigate();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [deadline, setDeadline] = useState("");
  const [selectedInfluencers, setSelectedInfluencers] = useState<string[]>([]);
  const [influencerQuery, setInfluencerQuery] = useState("");
  const [targetInfluencers, setTargetInfluencers] = useState<string>("");
  const [targetIsUndefined, setTargetIsUndefined] = useState(false);

  const [expandedCampaign, setExpandedCampaign] = useState<string | null>(null);

  // === Historical conversion stats ===
  const historicalStats = useMemo(() => {
    const pastCampaigns = campaigns.filter(
      (c) => c.participants && c.participants.length > 0
    );
    if (pastCampaigns.length === 0) return null;

    let totalContacts = 0;
    let totalConverted = 0;
    const regionMap: Record<string, { total: number; converted: number }> = {};

    for (const camp of pastCampaigns) {
      for (const p of camp.participants) {
        const inf = influencers.find((i) => i.id === p.influencerId);
        const region = inf?.location || "Indefinido";
        if (!regionMap[region]) regionMap[region] = { total: 0, converted: 0 };
        totalContacts++;
        regionMap[region].total++;
        if (p.negotiationStatus === "topou") {
          totalConverted++;
          regionMap[region].converted++;
        }
      }
    }

    const overallRate = totalContacts > 0 ? totalConverted / totalContacts : 0;

    // Best and worst regions (min 2 contacts for relevance)
    const regionEntries = Object.entries(regionMap).filter(([, d]) => d.total >= 2);
    regionEntries.sort((a, b) => b[1].converted / b[1].total - a[1].converted / a[1].total);
    const bestRegion = regionEntries[0];
    const worstRegion = regionEntries[regionEntries.length - 1];

    return {
      overallRate,
      totalContacts,
      totalConverted,
      bestRegion: bestRegion
        ? { name: bestRegion[0], rate: bestRegion[1].converted / bestRegion[1].total, ...bestRegion[1] }
        : null,
      worstRegion:
        worstRegion && worstRegion[0] !== bestRegion?.[0]
          ? { name: worstRegion[0], rate: worstRegion[1].converted / worstRegion[1].total, ...worstRegion[1] }
          : null,
    };
  }, [campaigns, influencers]);

  const targetNum = !targetIsUndefined && targetInfluencers !== "" ? parseInt(targetInfluencers, 10) : null;

  const filteredInfluencers = useMemo(() => {
    const query = normalizeSearch(influencerQuery.trim());
    if (!query) return influencers;
    return influencers.filter((influencer) =>
      normalizeSearch(influencer.name).includes(query) ||
      normalizeSearch(influencer.username).includes(query)
    );
  }, [influencerQuery, influencers]);

  const prediction = useMemo(() => {
    if (!historicalStats || !targetNum || isNaN(targetNum) || targetNum <= 0) return null;
    const { overallRate } = historicalStats;
    if (overallRate <= 0) return null;
    const contactsNeeded = Math.ceil(targetNum / overallRate);
    return { contactsNeeded, ratePercent: Math.round(overallRate * 100) };
  }, [historicalStats, targetNum]);

  function computeStatus(start: string, end: string): Campaign["status"] {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    if (start) {
      const s = parseLocalDate(start);
      if (now < s) return "a_iniciar";
    }
    if (start) return "em_andamento";
    return "a_iniciar";
  }

  function handleCreate() {
    if (!name) return;
    const computedStatus = computeStatus(startDate, deadline);
    addCampaign({
      name,
      description,
      objective: "",
      status: computedStatus,
      startDate,
      deadline,
      influencerIds: selectedInfluencers,
      participants: selectedInfluencers.map((id) => ({
        influencerId: id,
        contactStatus: "nao_iniciado" as const,
        deliveryType: null,
        managerNotified: false,
        chosenProduct: "",
        shippingAddress: "",
        shippingName: "",
        negotiationStatus: "pendente" as const,
        negotiationCondition: "",
        materialStatus: "pendente" as const,
        publishCollaboration: false,
        scheduledDate: "",
      })),
      materials: [],
      targetInfluencers: targetIsUndefined ? null : (targetNum ?? null),
    });
    setName("");
    setDescription("");
    setStartDate("");
    setDeadline("");
    setSelectedInfluencers([]);
    setInfluencerQuery("");
    setTargetInfluencers("");
    setTargetIsUndefined(false);
    setDialogOpen(false);
  }

  function toggleInfluencer(id: string) {
    setSelectedInfluencers((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }

  function handleContentStatus(campaignId: string, contentId: string, newStatus: "aguardando_aprovacao" | "aguardando_ajuste" | "aprovado") {
    const campaign = campaigns.find((c) => c.id === campaignId);
    if (!campaign) return;
    const updatedContents = campaign.contents.map((ct) =>
      ct.id === contentId ? { ...ct, status: newStatus } : ct
    );
    updateCampaign({ ...campaign, contents: updatedContents });
  }

  function renderCampaignList(filtered: Campaign[]) {
    if (filtered.length === 0) {
      return <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma campanha</p>;
    }

    return (
      <div className="space-y-3">
        {filtered.map((c) => {
          const config = STATUS_CONFIG[c.status];
          const infParticipants = influencers.filter((i) => c.influencerIds.includes(i.id));
          const expanded = expandedCampaign === c.id;

          return (
            <Card
              key={c.id}
              className="cursor-pointer transition-colors hover:border-primary/20"
              onClick={() => navigate(`/campaign/${c.id}`)}
            >
              <CardContent className="p-0 flex">
                {c.coverImage && (
                  <div className="shrink-0 overflow-hidden rounded-l-lg aspect-square w-28 sm:w-32 bg-secondary/40">
                    <img
                      src={c.coverImage}
                      alt=""
                      className="h-full w-full object-cover"
                      style={{ objectPosition: `50% ${Math.min(100, Math.max(0, c.coverImagePosition ?? 50))}%` }}
                    />
                  </div>
                )}
                <div className="p-4 flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{c.name}</h3>
                        <Badge variant="outline" className={`text-[10px] ${config.color}`}>
                          {config.label}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{c.description}</p>

                      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {c.deadline ? parseLocalDate(c.deadline).toLocaleDateString("pt-BR") : "Sem prazo"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {infParticipants.length} influenciadores
                        </span>
                      </div>
                    </div>

                    {/* Avatars */}
                    <div className="flex -space-x-2">
                      {infParticipants.slice(0, 4).map((inf) => (
                        <img
                          key={inf.id}
                          src={inf.profilePic}
                          alt={inf.name}
                          className="h-8 w-8 rounded-full border-2 border-card object-cover"
                          title={inf.name}
                        />
                      ))}
                      {infParticipants.length > 4 && (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-card bg-secondary text-xs font-medium">
                          +{infParticipants.length - 4}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Rating preview for finalized campaigns */}
                  {c.status === "finalizada" && (c.participants || []).some(p => p.campaignRating) && (
                    <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
                      {(c.participants || []).filter(p => p.campaignRating).map(p => {
                        const pInf = influencers.find(i => i.id === p.influencerId);
                        if (!pInf) return null;
                        return (
                          <div key={p.influencerId} className="flex items-center gap-1.5 rounded-md bg-secondary/50 px-2 py-1">
                            <img src={pInf.profilePic} alt="" className="h-5 w-5 rounded-full object-cover" />
                            <span className="text-[10px] font-medium truncate max-w-[80px]">{pInf.name}</span>
                            <StarRating rating={p.campaignRating!} readonly size={10} />
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Expanded: contents */}
                  {expanded && c.contents.length > 0 && (
                    <div className="mt-4 border-t border-border pt-4 space-y-2" onClick={(e) => e.stopPropagation()}>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Conteúdos recebidos</p>
                      {c.contents.map((ct) => {
                        const ctInf = influencers.find((i) => i.id === ct.influencerId);
                        return (
                          <div key={ct.id} className="flex items-center gap-3 rounded-lg bg-secondary/50 p-3">
                            <img src={ctInf?.profilePic || ""} alt="" className="h-7 w-7 rounded-full object-cover" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{ctInf?.name}</p>
                              <p className="text-xs text-muted-foreground">{ct.description}</p>
                            </div>
                            {ct.status !== "aprovado" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 gap-1 text-xs text-success"
                                onClick={() => handleContentStatus(c.id, ct.id, "aprovado")}
                              >
                                <CheckCircle2 className="h-3 w-3" />
                                Aprovar
                              </Button>
                            ) : (
                              <Badge variant="default" className="text-[10px]">Aprovado</Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Campanhas</h1>
          <p className="text-sm text-muted-foreground">Gerencie campanhas e conteúdos</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Campanha
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nova Campanha</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Nome</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome da campanha" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Descrição</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Data inicial</Label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Data de término</Label>
                  <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
                </div>
              </div>

              {/* Target influencers + conversion prediction */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Com quantos influenciadores pretende trabalhar nessa campanha?
                </Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min={1}
                    placeholder="Ex: 15"
                    value={targetInfluencers}
                    onChange={(e) => { setTargetInfluencers(e.target.value); setTargetIsUndefined(false); }}
                    disabled={targetIsUndefined}
                    className="w-28"
                  />
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground select-none">
                    <input
                      type="checkbox"
                      checked={targetIsUndefined}
                      onChange={(e) => { setTargetIsUndefined(e.target.checked); if (e.target.checked) setTargetInfluencers(""); }}
                      className="rounded border-border"
                    />
                    Indefinido
                  </label>
                </div>

                {/* Prediction panel — appears when a valid number is entered */}
                {prediction && historicalStats && (
                  <div className="rounded-lg border border-border bg-secondary/40 p-3 space-y-2.5 text-xs">
                    <p className="flex items-center gap-1.5 font-semibold text-foreground">
                      <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                      Estimativa baseada no histórico de conversão
                    </p>
                    <p className="text-muted-foreground leading-relaxed">
                      Com base no histórico das campanhas (taxa de conversão média de{" "}
                      <span className="font-semibold text-foreground">{prediction.ratePercent}%</span>
                      ), para trabalhar com{" "}
                      <span className="font-semibold text-foreground">{targetNum}</span>{" "}
                      influenciadores, você deve realizar cerca de{" "}
                      <span className="font-semibold text-primary">{prediction.contactsNeeded} contatos</span>.
                    </p>
                    {(historicalStats.bestRegion || historicalStats.worstRegion) && (
                      <div className="flex flex-col gap-1 pt-1.5 border-t border-border">
                        {historicalStats.bestRegion && (
                          <p className="flex items-start gap-1.5 text-emerald-600">
                            <TrendingUp className="h-3 w-3 shrink-0 mt-0.5" />
                            <span>
                              <span className="font-semibold">{historicalStats.bestRegion.name}</span> é sua melhor região para conversão —{" "}
                              {Math.round(historicalStats.bestRegion.rate * 100)}% ({historicalStats.bestRegion.converted}/{historicalStats.bestRegion.total} contatos convertidos)
                            </span>
                          </p>
                        )}
                        {historicalStats.worstRegion && (
                          <p className="flex items-start gap-1.5 text-red-500">
                            <TrendingDown className="h-3 w-3 shrink-0 mt-0.5" />
                            <span>
                              <span className="font-semibold">{historicalStats.worstRegion.name}</span> precisa de mais empenho —{" "}
                              {Math.round(historicalStats.worstRegion.rate * 100)}% ({historicalStats.worstRegion.converted}/{historicalStats.worstRegion.total} contatos convertidos)
                            </span>
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {!targetIsUndefined && targetNum && historicalStats && historicalStats.overallRate === 0 && (
                  <p className="text-xs text-muted-foreground italic">
                    Ainda não há histórico de conversões suficiente para gerar uma estimativa.
                  </p>
                )}
                {!targetIsUndefined && targetNum && !historicalStats && (
                  <p className="text-xs text-muted-foreground italic">
                    Nenhuma campanha anterior encontrada para calcular a estimativa.
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Influenciadores participantes</Label>
                <Input
                  placeholder="Buscar influenciador..."
                  className="mb-2"
                  value={influencerQuery}
                  onChange={(e) => setInfluencerQuery(e.target.value)}
                />
                <div className="max-h-40 overflow-y-auto space-y-1 rounded-lg border border-border p-2">
                  {filteredInfluencers.map((inf) => (
                    <label
                      key={inf.id}
                      className="flex cursor-pointer items-center gap-3 rounded-md p-2 hover:bg-secondary/50"
                    >
                      <input
                        type="checkbox"
                        checked={selectedInfluencers.includes(inf.id)}
                        onChange={() => toggleInfluencer(inf.id)}
                        className="rounded border-border"
                      />
                      <img src={inf.profilePic} alt="" className="h-6 w-6 rounded-full object-cover" />
                      <span className="text-sm">{inf.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <Button onClick={handleCreate} className="w-full">Criar Campanha</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {(() => {
        const byDeadlineAsc = (a: typeof campaigns[number], b: typeof campaigns[number]) =>
          (a.deadline || "9999-12-31").localeCompare(b.deadline || "9999-12-31");
        const byStartAsc = (a: typeof campaigns[number], b: typeof campaigns[number]) =>
          (a.startDate || "9999-12-31").localeCompare(b.startDate || "9999-12-31");
        const emAndamento = campaigns.filter((c) => c.status === "em_andamento").sort(byDeadlineAsc);
        const aIniciar = campaigns.filter((c) => c.status === "a_iniciar").sort(byStartAsc);
        const finalizadas = campaigns.filter((c) => c.status === "finalizada");
        return (
          <Tabs defaultValue="em_andamento">
            <TabsList className="bg-secondary">
              <TabsTrigger value="em_andamento">Em andamento ({emAndamento.length})</TabsTrigger>
              <TabsTrigger value="a_iniciar">A iniciar ({aIniciar.length})</TabsTrigger>
              <TabsTrigger value="finalizada">Finalizadas ({finalizadas.length})</TabsTrigger>
              <TabsTrigger value="all">Todas ({campaigns.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="em_andamento" className="mt-4">
              {renderCampaignList(emAndamento)}
            </TabsContent>
            <TabsContent value="a_iniciar" className="mt-4">
              {renderCampaignList(aIniciar)}
            </TabsContent>
            <TabsContent value="finalizada" className="mt-4">
              {renderCampaignList(finalizadas)}
            </TabsContent>
            <TabsContent value="all" className="mt-4">
              {renderCampaignList(campaigns)}
            </TabsContent>
          </Tabs>
        );
      })()}
    </div>
  );
}
