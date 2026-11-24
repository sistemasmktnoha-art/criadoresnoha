import { useMemo } from "react";
import { normalizeSearch } from "@/lib/utils";
import { useApp } from "@/context/AppContext";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { AddInfluencerDialog } from "@/components/AddInfluencerDialog";
import { ExportInfluencersDialog } from "@/components/ExportInfluencersDialog";
import { InfluencerCard } from "@/components/InfluencerCard";
import { NICHES, LOCATIONS } from "@/types";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 20;

export default function Influencers() {
  const { influencers, campaigns, getCampaignsForInfluencer } = useApp();

  const destaqueRanks = useMemo(() => {
    const uniqueCounts = [...new Set(
      influencers.map((i) => i.deliveryExceededCount || 0).filter((c) => c > 0)
    )].sort((a, b) => b - a);
    const map = new Map<string, 1 | 2 | 3>();
    influencers.forEach((inf) => {
      const count = inf.deliveryExceededCount || 0;
      if (count === 0) return;
      const rank = uniqueCounts.indexOf(count) + 1;
      if (rank >= 1 && rank <= 3) map.set(inf.id, rank as 1 | 2 | 3);
    });
    return map;
  }, [influencers]);
  const [searchParams, setSearchParams] = useSearchParams();

  // All filter/page state is synced to the URL so returning via browser
  // back (navigate(-1)) restores the exact same view.
  const search = searchParams.get("q") || "";
  const nicheFilter = searchParams.get("niche") || "all";
  const locationFilter = searchParams.get("location") || "all";
  const followersFilter = searchParams.get("followers") || "all";
  const campaignFilter = searchParams.get("campaign") || "all";
  const genderFilter = searchParams.get("gender") || "all";
  const characteristicFilter = searchParams.get("characteristic") || "all";
  const statusFilter = searchParams.get("status") || "all";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);

  function updateParam(key: string, value: string, resetPage = true) {
    const next = new URLSearchParams(searchParams);
    const emptyValues = ["", "all"];
    if (emptyValues.includes(value)) next.delete(key);
    else next.set(key, value);
    if (resetPage) next.delete("page");
    setSearchParams(next, { replace: false });
  }

  const setSearch = (v: string) => updateParam("q", v);
  const setNicheFilter = (v: string) => updateParam("niche", v);
  const setLocationFilter = (v: string) => updateParam("location", v);
  const setFollowersFilter = (v: string) => updateParam("followers", v);
  const setCampaignFilter = (v: string) => updateParam("campaign", v);
  const setGenderFilter = (v: string) => updateParam("gender", v);
  const setCharacteristicFilter = (v: string) => updateParam("characteristic", v);
  const setPage = (v: number) => {
    const next = new URLSearchParams(searchParams);
    if (v <= 1) next.delete("page");
    else next.set("page", String(v));
    setSearchParams(next, { replace: false });
  };

  const allCharacteristics = useMemo(() => {
    const set = new Set<string>();
    influencers.forEach(i => (i.characteristics || []).forEach(c => set.add(c)));
    return Array.from(set).sort();
  }, [influencers]);

  const filtered = useMemo(() => {
    return influencers.filter((i) => {
      if (search) {
        const q = normalizeSearch(search);
        const hay = [i.name, i.fullName || "", i.username].map(normalizeSearch);
        if (!hay.some((h) => h.includes(q))) return false;
      }

      if (statusFilter === "active" && !i.isActive) return false;
      if (statusFilter === "inactive" && i.isActive) return false;
      if (nicheFilter !== "all" && !i.niche.split(", ").includes(nicheFilter)) return false;
      if (locationFilter !== "all" && i.location !== locationFilter) return false;
      if (followersFilter === "micro" && i.followers >= 50000) return false;
      if (followersFilter === "medio" && (i.followers < 50000 || i.followers >= 200000)) return false;
      if (followersFilter === "macro" && i.followers < 200000) return false;
      if (campaignFilter !== "all") {
        const inCampaign = getCampaignsForInfluencer(i.id).some((c) => c.id === campaignFilter);
        if (!inCampaign) return false;
      }
      if (genderFilter !== "all" && i.gender !== genderFilter) return false;
      if (characteristicFilter !== "all" && !(i.characteristics || []).includes(characteristicFilter)) return false;
      return true;
    });
  }, [influencers, search, statusFilter, nicheFilter, locationFilter, followersFilter, campaignFilter, genderFilter, characteristicFilter, getCampaignsForInfluencer]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePageNum = Math.min(page, totalPages);
  const paginated = filtered.slice((safePageNum - 1) * PAGE_SIZE, safePageNum * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Influenciadores</h1>
          <p className="text-sm text-muted-foreground">Todos os creators cadastrados ({influencers.length})</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportInfluencersDialog influencers={influencers} />
          <AddInfluencerDialog />
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar influenciador..."
          className="pl-10"
        />
      </div>

      {/* Regional Summary */}
      <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-8 gap-2">
        {(() => {
          const items = LOCATIONS.filter(l => l !== "Indefinido")
            .map((loc) => ({ loc, count: influencers.filter((i) => i.location === loc).length }))
            .sort((a, b) => b.count - a.count);
          const getTierClass = (count: number) => {
            if (count >= 20) return "bg-emerald-50 border-emerald-200 text-emerald-800";
            if (count > 10) return "bg-amber-50 border-amber-200 text-amber-800";
            return "bg-red-50 border-red-200 text-red-800";
          };
          return items.map(({ loc, count }) => (
            <button
              key={loc}
              onClick={() => setLocationFilter(locationFilter === loc ? "all" : loc)}
              className={`rounded-lg border px-2 py-2 text-center transition-colors cursor-pointer ${
                locationFilter === loc
                  ? "bg-primary text-primary-foreground border-primary"
                  : `${getTierClass(count)} hover:opacity-80`
              }`}
            >
              <p className="text-lg font-bold leading-none">{count}</p>
              <p className="text-xs mt-1 leading-tight truncate">{loc}</p>
            </button>
          ));
        })()}
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Status</label>
          <Select value={statusFilter} onValueChange={(v) => updateParam("status", v)}>

            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="inactive">Inativos</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Nicho</label>
          <Select value={nicheFilter} onValueChange={setNicheFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Nicho" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {NICHES.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Região</label>
          <Select value={locationFilter} onValueChange={setLocationFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Região" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {LOCATIONS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Tamanho</label>
          <Select value={followersFilter} onValueChange={setFollowersFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Tamanho" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="micro">Micro (&lt;50K)</SelectItem>
              <SelectItem value="medio">Médio (50K-200K)</SelectItem>
              <SelectItem value="macro">Macro (&gt;200K)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Gênero</label>
          <Select value={genderFilter} onValueChange={setGenderFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Gênero" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="feminino">Feminino</SelectItem>
              <SelectItem value="masculino">Masculino</SelectItem>
              <SelectItem value="outro">Outro</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Campanha</label>
          <Select value={campaignFilter} onValueChange={setCampaignFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Campanha" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {campaigns.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Estilo</label>
          <Select value={characteristicFilter} onValueChange={setCharacteristicFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Estilo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {allCharacteristics.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            Nenhum influenciador encontrado
          </div>
        ) : (
          paginated.map((inf) => <InfluencerCard key={inf.id} influencer={inf} destaqueRank={destaqueRanks.get(inf.id)} />)
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            disabled={safePageNum <= 1}
            onClick={() => setPage(safePageNum - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {safePageNum} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            disabled={safePageNum >= totalPages}
            onClick={() => setPage(safePageNum + 1)}
          >
            Próxima
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}