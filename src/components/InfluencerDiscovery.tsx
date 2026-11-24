import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Search,
  RefreshCw,
  User,
  Star,
  Shield,
  AlertTriangle,
  MessageCircle,
  ExternalLink,
  BookmarkPlus,
  CheckCircle2,
  Sparkles,
  Instagram,
  Heart,
  Baby,
  MapPin,
  Briefcase,
  Users,
  Lightbulb,
  Palette,
  Trash2,
  Store,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useApp } from "@/context/AppContext";
import { LOCATIONS } from "@/types";
import { instagramProfileUrl } from "@/lib/utils";

interface PersonalInsights {
  apparentRelationshipStatus?: string;
  apparentlyHasChildren?: string;
  estimatedAgeRange?: string;
  lifestyle?: string;
  locationDetails?: string;
  educationOrProfession?: string;
  socialCircle?: string;
}

interface DiscoveredProfile {
  username: string;
  name: string;
  profileUrl: string;
  estimatedFollowers: string;
  niche: string;
  secondaryNiches: string[];
  brandFitScore: number;
  brandFitReason: string;
  contentStyle: string;
  aestheticLevel: string;
  audienceProfile: string;
  brandsIdentified: string[];
  personalInsights: PersonalInsights;
  campaignInsights: string[];
  strengths: string[];
  risks: string[];
  suggestedApproach: string;
}

type SearchType = "pessoa" | "loja";

export default function InfluencerDiscovery() {
  const [gender, setGender] = useState("");
  const [region, setRegion] = useState("");
  const [searchType, setSearchType] = useState<SearchType>("pessoa");
  const [loading, setLoading] = useState(false);
  const [profiles, setProfiles] = useState<DiscoveredProfile[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const { addIdeaDeposit } = useApp();

  async function handleDiscover() {
    if (searchType === "pessoa" && !gender) {
      toast({
        title: "Campo obrigatório",
        description: "Selecione o gênero.",
        variant: "destructive",
      });
      return;
    }
    if (!region) {
      toast({
        title: "Campo obrigatório",
        description: "Selecione a região.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setSavedIds(new Set());
    setDeletedIds(new Set());

    try {
      const { data, error } = await supabase.functions.invoke("discover-influencers", {
        body: {
          gender: searchType === "loja" ? "loja" : gender,
          region,
          searchType,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const newProfiles = data.profiles || [];
      setProfiles(newProfiles);

      if (newProfiles.length === 0) {
        toast({
          title: "Nenhum resultado",
          description: "A busca não retornou perfis. Tente outra região ou configuração.",
        });
      } else {
        toast({
          description: `${newProfiles.length} perfis encontrados!`,
        });
      }
    } catch (err: any) {
      console.error("Discovery error:", err);
      toast({
        title: "Erro",
        description: err.message || "Falha ao buscar perfis",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  function handleSaveAsIdea(profile: DiscoveredProfile) {
    addIdeaDeposit({
      author: "IA Discovery",
      link: instagramProfileUrl(profile.profileUrl || profile.username),
      type: "influenciador",
      observation: `[IA] ${profile.name || profile.username} — ${profile.niche} | Fit: ${profile.brandFitScore}/10 | ${profile.contentStyle} | ${profile.brandFitReason}`,
    });
    setSavedIds((prev) => new Set(prev).add(profile.username));
    toast({ description: `@${profile.username} salvo na Caixa de Entrada!` });
  }

  function handleDelete(username: string) {
    setDeletedIds((prev) => new Set(prev).add(username));
    toast({ description: `Sugestão @${username} removida.` });
  }

  function getFitColor(score: number) {
    if (score >= 8) return "text-green-600 bg-green-500/10";
    if (score >= 5) return "text-yellow-600 bg-yellow-500/10";
    return "text-red-600 bg-red-500/10";
  }

  const visibleProfiles = profiles.filter((p) => !deletedIds.has(p.username));

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="space-y-1.5 flex-1">
              <label className="text-xs text-muted-foreground font-medium">Tipo de busca</label>
              <Select value={searchType} onValueChange={(v: SearchType) => { setSearchType(v); if (v === "loja") setGender(""); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pessoa">
                    <span className="flex items-center gap-1.5"><User className="h-3 w-3" /> Pessoa</span>
                  </SelectItem>
                  <SelectItem value="loja">
                    <span className="flex items-center gap-1.5"><Store className="h-3 w-3" /> Loja / Marca</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {searchType === "pessoa" && (
              <div className="space-y-1.5 flex-1">
                <label className="text-xs text-muted-foreground font-medium">Gênero *</label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar gênero..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="feminino">Feminino</SelectItem>
                    <SelectItem value="masculino">Masculino</SelectItem>
                    <SelectItem value="ambos">Ambos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5 flex-1">
              <label className="text-xs text-muted-foreground font-medium">Região *</label>
              <Select value={region} onValueChange={setRegion}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar região..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {LOCATIONS.filter((l) => l !== "Indefinido").map((loc) => (
                    <SelectItem key={loc} value={loc}>
                      {loc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleDiscover} disabled={loading} className="gap-2 shrink-0">
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {loading ? "Buscando..." : "Gerar Sugestões"}
            </Button>
          </div>

          {loading && (
            <div className="mt-4 p-4 rounded-lg bg-muted/50 text-center">
              <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
              <p className="text-sm text-muted-foreground">
                Buscando perfis no Instagram e analisando com IA...
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Isso pode levar até 30 segundos
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Empty state */}
      {!loading && visibleProfiles.length === 0 && profiles.length === 0 && (
        <div className="py-16 text-center">
          <Search className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">
            Selecione os filtros e clique em "Gerar Sugestões"
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            A IA buscará perfis reais de criadores no Instagram compatíveis com a NOHA Shoes
          </p>
        </div>
      )}

      {/* Results */}
      {visibleProfiles.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {visibleProfiles.length} perfis sugeridos — clique em "Salvar" para depositar na caixa de entrada
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            {visibleProfiles.map((profile) => {
              const isSaved = savedIds.has(profile.username);
              return (
                <Card
                  key={profile.username}
                  className={`transition-colors ${isSaved ? "border-green-500/40 bg-green-500/5" : "hover:border-primary/20"}`}
                >
                  <CardContent className="p-4 space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-orange-400 p-0.5 shrink-0">
                          <div className="rounded-full bg-card p-1.5">
                            <Instagram className="h-4 w-4 text-foreground" />
                          </div>
                        </div>
                        <div className="min-w-0">
                          <a
                            href={instagramProfileUrl(profile.profileUrl || profile.username)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-semibold hover:underline flex items-center gap-1"
                          >
                            @{profile.username}
                            <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
                          </a>
                          {profile.name && (
                            <p className="text-xs text-muted-foreground truncate">{profile.name}</p>
                          )}
                        </div>
                      </div>
                      <Badge className={`text-xs shrink-0 ${getFitColor(profile.brandFitScore)}`}>
                        <Star className="h-3 w-3 mr-0.5" />
                        {profile.brandFitScore}/10
                      </Badge>
                    </div>

                    {/* Niches & Followers */}
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="default" className="text-[10px]">
                        {profile.niche}
                      </Badge>
                      {profile.secondaryNiches?.map((n) => (
                        <Badge key={n} variant="outline" className="text-[10px]">
                          {n}
                        </Badge>
                      ))}
                      {profile.estimatedFollowers && (
                        <Badge variant="secondary" className="text-[10px]">
                          <User className="h-2.5 w-2.5 mr-0.5" />
                          {profile.estimatedFollowers}
                        </Badge>
                      )}
                    </div>

                    {/* Content Style */}
                    <p className="text-xs">
                      <span className="font-medium text-foreground">Estilo:</span>{" "}
                      <span className="text-muted-foreground">{profile.contentStyle}</span>
                    </p>

                    {/* Aesthetic Level */}
                    {profile.aestheticLevel && (
                      <p className="text-xs">
                        <span className="font-medium text-foreground flex items-center gap-1 inline-flex"><Palette className="h-3 w-3" /> Estética:</span>{" "}
                        <span className="text-muted-foreground">{profile.aestheticLevel}</span>
                      </p>
                    )}

                    {/* Brand Fit Reason */}
                    <p className="text-xs text-muted-foreground italic">
                      {profile.brandFitReason}
                    </p>

                    {/* Audience */}
                    {profile.audienceProfile && (
                      <p className="text-xs">
                        <span className="font-medium text-foreground">Audiência:</span>{" "}
                        <span className="text-muted-foreground">{profile.audienceProfile}</span>
                      </p>
                    )}

                    {/* Brands */}
                    {profile.brandsIdentified?.length > 0 && (
                      <div className="text-xs">
                        <span className="font-medium text-foreground">Marcas identificadas: </span>
                        <span className="text-muted-foreground">
                          {profile.brandsIdentified.join(", ")}
                        </span>
                      </div>
                    )}

                    {/* Personal Insights */}
                    {profile.personalInsights && (
                      <div className="space-y-1 pt-1 border-t border-border">
                        <p className="text-xs font-medium text-foreground flex items-center gap-1">
                          <Users className="h-3 w-3" /> Perfil Pessoal
                        </p>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px]">
                          {profile.personalInsights.apparentRelationshipStatus && profile.personalInsights.apparentRelationshipStatus !== "Não identificado" && (
                            <div className="flex items-center gap-1">
                              <Heart className="h-2.5 w-2.5 text-muted-foreground" />
                              <span className="text-muted-foreground">{profile.personalInsights.apparentRelationshipStatus}</span>
                            </div>
                          )}
                          {profile.personalInsights.apparentlyHasChildren && profile.personalInsights.apparentlyHasChildren !== "Não identificado" && (
                            <div className="flex items-center gap-1">
                              <Baby className="h-2.5 w-2.5 text-muted-foreground" />
                              <span className="text-muted-foreground">Filhos: {profile.personalInsights.apparentlyHasChildren}</span>
                            </div>
                          )}
                          {profile.personalInsights.estimatedAgeRange && (
                            <div className="flex items-center gap-1">
                              <User className="h-2.5 w-2.5 text-muted-foreground" />
                              <span className="text-muted-foreground">{profile.personalInsights.estimatedAgeRange}</span>
                            </div>
                          )}
                          {profile.personalInsights.locationDetails && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-2.5 w-2.5 text-muted-foreground" />
                              <span className="text-muted-foreground">{profile.personalInsights.locationDetails}</span>
                            </div>
                          )}
                          {profile.personalInsights.educationOrProfession && (
                            <div className="flex items-center gap-1 col-span-2">
                              <Briefcase className="h-2.5 w-2.5 text-muted-foreground" />
                              <span className="text-muted-foreground">{profile.personalInsights.educationOrProfession}</span>
                            </div>
                          )}
                        </div>
                        {profile.personalInsights.lifestyle && (
                          <p className="text-[10px] text-muted-foreground">{profile.personalInsights.lifestyle}</p>
                        )}
                        {profile.personalInsights.socialCircle && (
                          <p className="text-[10px] text-muted-foreground italic">{profile.personalInsights.socialCircle}</p>
                        )}
                      </div>
                    )}

                    {/* Campaign Insights */}
                    {profile.campaignInsights?.length > 0 && (
                      <div className="space-y-0.5 pt-1 border-t border-border">
                        <p className="text-xs font-medium text-foreground flex items-center gap-1">
                          <Lightbulb className="h-3 w-3" /> Ideias de Campanha
                        </p>
                        {profile.campaignInsights.map((c, i) => (
                          <p key={i} className="text-[10px] text-muted-foreground">• {c}</p>
                        ))}
                      </div>
                    )}

                    {/* Strengths */}
                    {profile.strengths?.length > 0 && (
                      <div className="space-y-0.5">
                        {profile.strengths.map((s, i) => (
                          <div key={i} className="flex items-start gap-1.5 text-xs">
                            <Shield className="h-3 w-3 text-green-500 shrink-0 mt-0.5" />
                            <span className="text-muted-foreground">{s}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Risks */}
                    {profile.risks?.length > 0 && (
                      <div className="space-y-0.5">
                        {profile.risks.map((r, i) => (
                          <div key={i} className="flex items-start gap-1.5 text-xs">
                            <AlertTriangle className="h-3 w-3 text-yellow-500 shrink-0 mt-0.5" />
                            <span className="text-muted-foreground">{r}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Approach */}
                    {profile.suggestedApproach && (
                      <div className="flex items-start gap-1.5 text-xs pt-1 border-t border-border">
                        <MessageCircle className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{profile.suggestedApproach}</span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="pt-2 border-t border-border flex gap-2">
                      <Button
                        variant={isSaved ? "secondary" : "default"}
                        size="sm"
                        className="flex-1 gap-2 text-xs h-8"
                        disabled={isSaved}
                        onClick={() => handleSaveAsIdea(profile)}
                      >
                        {isSaved ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5" /> Salvo
                          </>
                        ) : (
                          <>
                            <BookmarkPlus className="h-3.5 w-3.5" /> Salvar como Ideia
                          </>
                        )}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs text-destructive hover:text-destructive gap-1"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir sugestão?</AlertDialogTitle>
                            <AlertDialogDescription>
                              O perfil @{profile.username} será removido da lista de sugestões.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(profile.username)}>
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}