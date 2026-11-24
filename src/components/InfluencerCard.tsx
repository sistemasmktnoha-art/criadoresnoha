import { Link, useNavigate } from "react-router-dom";
import { Influencer } from "@/types";
import { StarRating } from "./StarRating";
import { MapPin, Users, Crown, Award, Ticket } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/context/AppContext";
import { InfluencerAvatar } from "@/components/InfluencerAvatar";
import { instagramProfileUrl } from "@/lib/utils";

function formatFollowers(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

const destaqueConfig: Record<1 | 2 | 3, { label: string; className: string }> = {
  1: { label: "🥇 Destaque", className: "bg-amber-50 text-amber-700 border-amber-400" },
  2: { label: "🥈 Destaque", className: "bg-slate-100 text-slate-500 border-slate-400" },
  3: { label: "🥉 Destaque", className: "bg-orange-50 text-orange-700 border-orange-400" },
};

export function InfluencerCard({ influencer, destaqueRank }: { influencer: Influencer; destaqueRank?: 1 | 2 | 3 }) {
  const navigate = useNavigate();
  const { couponReminderInfluencerIds, getCouponsForInfluencer } = useApp();
  const needsCoupon = couponReminderInfluencerIds.has(influencer.id);
  return (
    <div
      className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/30 hover:bg-card/80"
    >
      <Link to={`/influencer/${influencer.id}`} aria-label={`Abrir cadastro de ${influencer.name}`}>
        <InfluencerAvatar
          src={influencer.profilePic}
          name={influencer.name}
          className="h-11 w-11 ring-2 ring-border transition-all group-hover:ring-primary/30"
        />
      </Link>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Link to={`/influencer/${influencer.id}`} className="truncate text-sm font-semibold hover:underline">
            {influencer.name}
          </Link>
          {influencer.isAmbassador && <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
          {destaqueRank && (
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 flex items-center gap-0.5 ${destaqueConfig[destaqueRank].className}`}>
              <Award className="h-2.5 w-2.5" />
              {destaqueConfig[destaqueRank].label}
            </Badge>
          )}
          <Badge
            variant={influencer.isActive ? "default" : "secondary"}
            className="text-[10px] px-1.5 py-0"
          >
            {influencer.isActive ? "Ativo" : "Inativo"}
          </Badge>
          {!getCouponsForInfluencer(influencer.id).some((c) => c.code?.trim()) && <Badge variant="secondary" className="text-[10px]">Sem cupom</Badge>}
          {needsCoupon && (
            <button
              type="button"
              title="Cupom inativo — criar ou reativar cupom"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                navigate(`/influencer/${influencer.id}#cupons`);
              }}
              className="inline-flex items-center gap-0.5 rounded-full border border-amber-400 bg-amber-50 px-1.5 py-0 text-[10px] font-medium text-amber-700 hover:bg-amber-100 transition-colors"
            >
              <Ticket className="h-2.5 w-2.5" />
              Cupom inativo
            </button>
          )}
        </div>
        <a
          href={instagramProfileUrl(influencer.instagramUrl || influencer.username)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:text-foreground hover:underline"
        >
          @{influencer.username}
        </a>
      </div>

      <div className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
        <Users className="h-3 w-3" />
        {formatFollowers(influencer.followers)}
      </div>

      <div className="hidden items-center gap-1 text-xs text-muted-foreground md:flex">
        <MapPin className="h-3 w-3" />
        {influencer.location || "—"}
      </div>

      <div className="hidden lg:flex">
        <StarRating rating={influencer.rating} readonly size={14} />
      </div>

      <div className="hidden gap-1 xl:flex flex-wrap">
        {influencer.niche ? influencer.niche.split(", ").map((n) => (
          <Badge key={n} variant="outline" className="text-[10px]">{n}</Badge>
        )) : <Badge variant="outline" className="text-[10px]">—</Badge>}
      </div>
    </div>
  );
}
