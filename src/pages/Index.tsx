import { parseLocalDate } from "@/lib/utils";
import { hasApprovedContact } from "@/lib/couponRules";
import { useMemo, useState, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import { Influencer } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Users, UserCheck, UserX, TrendingUp, Megaphone, ArrowRight, Crown, AlertCircle, Gift, CheckCircle2, Ticket, X, MessageSquare, Truck, Package, Cake, CalendarClock, ListChecks, Copy } from "lucide-react";
import { DashboardCharts } from "@/components/DashboardCharts";
import { PendingPanel } from "@/components/PendingPanel";
import { StarRating } from "@/components/StarRating";
import { Link, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export default function Index() {
  const { influencers, campaigns, coupons, getCampaignsForInfluencer, updateCampaign, updateCoupon, shipments, tasks, toggleTaskComplete, loaded, couponReminderInfluencerIds } = useApp();
  const [rankBy, setRankBy] = useState<"rating" | "campaigns" | "sales">("rating");
  const { toast } = useToast();
  const navigate = useNavigate();

  // Scheduled content update reminders
  const scheduledUpdates = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const reminders: { campaignName: string; campaignId: string; influencerName: string; date: string; contentUrl: string }[] = [];
    for (const c of campaigns) {
      for (const ct of c.contents || []) {
        if (ct.nextUpdateDate && ct.nextUpdateDate <= today && !ct.reviewClosed) {
          const inf = influencers.find((i) => i.id === ct.influencerId);
          reminders.push({
            campaignName: c.name,
            campaignId: c.id,
            influencerName: inf?.name || "—",
            date: ct.nextUpdateDate,
            contentUrl: ct.url,
          });
        }
      }
    }
    return reminders;
  }, [campaigns, influencers]);

  // Dismissed coupon reminders persisted via localStorage
  const [dismissedReminders, setDismissedReminders] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("noha_dismissed_coupon_reminders") || "[]");
    } catch {
      return [];
    }
  });

  const dismissReminder = useCallback((couponId: string) => {
    setDismissedReminders((prev) => {
      const next = [...prev, couponId];
      localStorage.setItem("noha_dismissed_coupon_reminders", JSON.stringify(next));
      return next;
    });
  }, []);

  const stats = useMemo(() => ({
    total: influencers.length,
    active: influencers.filter((i) => i.isActive).length,
    inactive: influencers.filter((i) => !i.isActive).length,
    avgFollowers: influencers.length
      ? Math.round(influencers.reduce((s, i) => s + i.followers, 0) / influencers.length)
      : 0,
  }), [influencers]);

  const getInfluencerSales = useCallback((id: string) => {
    const infCoupons = coupons.filter((c) => c.influencerId === id);
    return infCoupons.reduce((total, c) => {
      const sales = c.monthlySales || {};
      return total + Object.values(sales).reduce((s, v) => s + (v || 0), 0);
    }, 0);
  }, [coupons]);

  const ranking = useMemo(() => {
    const sorted = [...influencers].sort((a, b) => {
      if (rankBy === "rating") return b.rating - a.rating;
      if (rankBy === "sales") return getInfluencerSales(b.id) - getInfluencerSales(a.id);
      return getCampaignsForInfluencer(b.id).length - getCampaignsForInfluencer(a.id).length;
    });
    return sorted.slice(0, 5);
  }, [influencers, rankBy, getCampaignsForInfluencer, getInfluencerSales]);

  // Coupons expiring within 3 days, not yet dismissed or notified
  const expiringCoupons = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const threeDays = new Date(today);
    threeDays.setDate(today.getDate() + 3);
    const threeDaysStr = threeDays.toISOString().split("T")[0];
    return coupons
      .filter((c) =>
        c.code?.trim() && c.validUntil >= todayStr &&
        c.validUntil <= threeDaysStr &&
        !dismissedReminders.includes(c.id) &&
        !c.notifiedExpiry
      )
      .map((c) => {
        const inf = influencers.find((i) => i.id === c.influencerId);
        const daysLeft = Math.ceil(
          (parseLocalDate(c.validUntil).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );
        return { coupon: c, influencer: inf, daysLeft };
      });
  }, [coupons, influencers, dismissedReminders]);

  // Influencers active in ongoing campaigns with inactive/missing coupons
  const inactiveCouponReminders = useMemo(() => {
    return influencers
      .filter((inf) => couponReminderInfluencerIds.has(inf.id))
      .map((inf) => {
        const activeCampaigns = campaigns.filter((c) =>
          c.status !== "finalizada" &&
          (c.participants || []).some((p) =>
            p.influencerId === inf.id &&
            hasApprovedContact(p)
          )
        );
        return { influencer: inf, campaignNames: activeCampaigns.map((c) => c.name) };
      });
  }, [influencers, campaigns, couponReminderInfluencerIds]);

  // Birthday influencers this month
  const birthdayInfluencers = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    return influencers.filter((inf) => {
      if (!inf.birthDate) return false;
      const parts = inf.birthDate.split("-");
      if (parts.length < 2) return false;
      const month = parseInt(parts[1], 10);
      return month === currentMonth;
    }).map((inf) => {
      const day = parseInt(inf.birthDate?.split("-")[2] ?? "0", 10);
      return { ...inf, birthDay: day };
    }).sort((a, b) => a.birthDay - b.birthDay);
  }, [influencers]);

  const statCards = [
    { label: "Total", value: stats.total, icon: Users, color: "text-primary", link: undefined as string | undefined },
    { label: "Ativos", value: stats.active, icon: UserCheck, color: "text-success", link: "/influencers?status=active" },
    { label: "Inativos", value: stats.inactive, icon: UserX, color: "text-muted-foreground", link: "/influencers?status=inactive" },
    { label: "Média Seguidores", value: (stats.avgFollowers / 1000).toFixed(1) + "K", icon: TrendingUp, color: "text-chart-2", link: undefined as string | undefined },
  ];

  // Helper to get current month key e.g. "2026-03"
  function getCurrentMonthKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }

  if (!loaded) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Carregando dados...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Painel</h1>
        <p className="text-sm text-muted-foreground">Gestão de creators Noha Shoes</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => {
          const content = (
            <Card className={s.link ? "transition-colors hover:border-primary/30 cursor-pointer" : ""}>
              <CardContent className="flex items-center gap-4 p-4">
                <div className={`rounded-lg bg-secondary p-2.5 ${s.color}`}>
                  <s.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          );
          return s.link ? (
            <Link key={s.label} to={s.link}>{content}</Link>
          ) : (
            <div key={s.label}>{content}</div>
          );
        })}
      </div>

      {/* Today's Tasks */}
      {(() => {
        const today = new Date().toISOString().split("T")[0];
        const todayTasks = tasks
          .filter((t) => !t.completed && t.deadline <= today)
          .sort((a, b) => a.deadline.localeCompare(b.deadline));
        if (todayTasks.length === 0) return null;
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-amber-600" />
                Tarefas para hoje ({todayTasks.length})
              </h2>
              <Link to="/tasks">
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                  Ver todas <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {todayTasks.slice(0, 9).map((t) => {
                const isOverdue = t.deadline < today;
                return (
                  <Card key={t.id} className={isOverdue ? "border-destructive/40 bg-destructive/5" : "border-amber-300 bg-amber-50/40"}>
                    <CardContent className="p-3">
                      <div className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={false}
                          onChange={() => toggleTaskComplete(t.id)}
                          className="mt-1 h-4 w-4 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{t.title}</p>
                          {t.description && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{t.description}</p>}
                          <p className={`text-[11px] mt-1 ${isOverdue ? "text-destructive font-medium" : "text-amber-700"}`}>
                            {isOverdue ? "Atrasada · " : "Hoje · "}
                            {parseLocalDate(t.deadline).toLocaleDateString("pt-BR")}
                          </p>
                          {t.link && (
                            <Link to={t.link}>
                              <Button variant="link" size="sm" className="h-5 px-0 text-[11px] gap-1">
                                Ir <ArrowRight className="h-2.5 w-2.5" />
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Expiring Coupon Reminders */}
      {expiringCoupons.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
            <Ticket className="h-4 w-4" />
            Cupons prestes a expirar
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {expiringCoupons.map(({ coupon, influencer, daysLeft }) => (
              <Card key={coupon.id} className="border-destructive/30 bg-destructive/5">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      {influencer && (
                        <img src={influencer.profilePic} alt="" className="h-8 w-8 rounded-full object-cover ring-2 ring-border shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{influencer?.name || "Influenciador"}</p>
                        <p className="text-xs text-muted-foreground">
                          Cupom <span className="font-mono font-medium text-foreground">{coupon.code}</span> expira em{" "}
                          <span className="font-bold text-destructive">
                            {daysLeft <= 0 ? "hoje" : `${daysLeft} dia${daysLeft !== 1 ? "s" : ""}`}
                          </span>
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
                      title="Remover lembrete"
                      onClick={() => {
                        if (confirm("Deseja remover este lembrete? Ele não aparecerá novamente para este ciclo.")) {
                          dismissReminder(coupon.id);
                        }
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Envie uma mensagem informando a expiração do cupom</p>
                  </div>
                  <div className="flex gap-2 mt-2">
                    {influencer && (
                      <Link to={`/influencer/${influencer.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full h-7 text-xs gap-1.5">
                          <ArrowRight className="h-3 w-3" /> Ver perfil
                        </Button>
                      </Link>
                    )}
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-7 text-xs gap-1.5"
                      onClick={() => {
                        const text = `Oii! Passando só para te lembrar que o cupom ${coupon.code} expira em ${daysLeft <= 0 ? "hoje" : `${daysLeft} dia${daysLeft !== 1 ? "s" : ""}`} 🤍\n\nEle garante 10%OFF no site e em lojas selecionadas, então pode ser um bom momento para dar aquele refresh para os seus seguidores.\n\nSe quiser, você também pode usar esse textinho de apoio de forma discreta:\n\nÚltimos dias para usar o cupom ${coupon.code} e garantir 10%OFF. Válido até ${parseLocalDate(coupon.validUntil).toLocaleDateString("pt-BR")} no site e nas lojas selecionadas: Recife, Fortaleza, Caruaru, Natal, Maceió, Aracaju, Balneário e Goiânia.`;
                        navigator.clipboard.writeText(text);
                        toast({ description: "Texto de lembrete copiado!" });
                      }}
                    >
                      <Copy className="h-3 w-3" /> Copiar texto
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      className="h-7 text-xs gap-1.5"
                      onClick={() => {
                        updateCoupon({ ...coupon, notifiedExpiry: true });
                        toast({ description: `Notificação marcada como enviada para ${influencer?.name || "influenciador"}.` });
                      }}
                    >
                      <CheckCircle2 className="h-3 w-3" /> Notificado
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Inactive Coupon Reminders (active in campaign) */}
      {inactiveCouponReminders.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
            <Ticket className="h-4 w-4 text-amber-600" />
            Cupons inativos em campanha ({inactiveCouponReminders.length})
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {inactiveCouponReminders.map(({ influencer, campaignNames }) => (
              <Card key={influencer.id} className="border-amber-300 bg-amber-50/60">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <img src={influencer.profilePic} alt="" className="h-8 w-8 rounded-full object-cover ring-2 ring-border shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{influencer.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        Ativo em: {campaignNames.join(", ") || "campanha"}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-amber-700 mt-2">Cupom inativo — crie ou reative o cupom deste creator.</p>
                  <Link to={`/influencer/${influencer.id}#cupons`} className="block mt-2">
                    <Button variant="outline" size="sm" className="w-full h-7 text-xs gap-1.5 border-amber-400 text-amber-800 hover:bg-amber-100">
                      <ArrowRight className="h-3 w-3" /> Criar/reativar cupom
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <PendingPanel />

      {/* Scheduled Content Update Reminders */}
      {scheduledUpdates.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-blue-500" />
            Updates de métricas agendados ({scheduledUpdates.length})
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {scheduledUpdates.map((su, i) => (
              <Card key={i} className="border-blue-200/50 bg-blue-50/30">
                <CardContent className="p-4">
                  <p className="text-sm font-semibold">{su.influencerName}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Campanha: {su.campaignName}</p>
                  <p className="text-xs text-blue-600 mt-1 font-medium">Agendado para {parseLocalDate(su.date).toLocaleDateString("pt-BR")}</p>
                  <Link to={`/campaign/${su.campaignId}?tab=conteudos`}>
                    <Button variant="outline" size="sm" className="w-full mt-2 h-7 text-xs gap-1.5">
                      <ArrowRight className="h-3 w-3" /> Ir para conteúdo
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Birthday Reminders */}
      {birthdayInfluencers.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
            <Cake className="h-4 w-4 text-pink-500" />
            Aniversariantes do mês ({birthdayInfluencers.length})
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {birthdayInfluencers.map((inf) => (
              <Link key={inf.id} to={`/influencer/${inf.id}`}>
                <Card className="transition-colors hover:border-primary/30 cursor-pointer border-pink-200/50">
                  <CardContent className="p-3 flex items-center gap-3">
                    <img src={inf.profilePic} alt="" className="h-9 w-9 rounded-full object-cover ring-2 ring-pink-200" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">{inf.name}</p>
                      <p className="text-xs text-muted-foreground">
                        🎂 Dia {inf.birthDay}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {(() => {
        const today = new Date().toISOString().split("T")[0];
        const activeCampaigns = campaigns.filter(
          (c) => c.status === "em_andamento" || (c.status === "a_iniciar" && c.startDate <= today && c.deadline >= today)
        );
        if (activeCampaigns.length === 0) return null;
        return (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <Megaphone className="h-4 w-4" />
              Campanhas Ativas
            </h2>
             <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
               {activeCampaigns.map((c) => {
                 const start = parseLocalDate(c.startDate).getTime();
                 const end = parseLocalDate(c.deadline).getTime();
                 const now = Date.now();
                 const total = end - start;
                 const elapsed = now - start;
                 const pct = total > 0 ? Math.min(100, Math.max(0, Math.round((elapsed / total) * 100))) : 0;
                 const daysLeft = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
                 const isOverdue = now > end;

                 return (
                 <Card key={c.id} className="transition-colors hover:border-primary/30 overflow-hidden">
                   {c.coverImage && (
                     <div className="h-24 w-full overflow-hidden">
                       <img
                         src={c.coverImage}
                         alt=""
                         className="w-full h-full object-cover"
                         style={{ objectPosition: `50% ${Math.min(100, Math.max(0, c.coverImagePosition ?? 50))}%` }}
                       />
                     </div>
                   )}
                   <CardContent className="p-4">
                     <Link to={`/campaign/${c.id}`}>
                       <div className="flex items-start justify-between gap-2">
                         <div className="min-w-0 flex-1">
                           <p className="font-semibold text-sm truncate">{c.name}</p>
                           <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{(c.description || c.objective || "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim()}</p>
                           <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                             <span>{c.influencerIds.length} influenciador{c.influencerIds.length !== 1 ? "es" : ""}</span>
                             <span>·</span>
                             <span>até {parseLocalDate(c.deadline).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</span>
                           </div>
                           <div className="mt-2 space-y-1">
                             <Progress
                               value={pct}
                               className={`h-1.5 ${isOverdue ? "[&>div]:bg-destructive" : daysLeft <= 7 ? "[&>div]:bg-amber-500" : "[&>div]:bg-primary"}`}
                             />
                             <p className={`text-[10px] ${isOverdue ? "text-destructive" : daysLeft <= 7 ? "text-amber-600" : "text-muted-foreground"}`}>
                               {isOverdue ? "Prazo encerrado" : `${daysLeft} dia${daysLeft !== 1 ? "s" : ""} restante${daysLeft !== 1 ? "s" : ""}`}
                             </p>
                           </div>
                         </div>
                         <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                       </div>
                     </Link>
                     {/* Finalizar button - only when deadline has passed */}
                     {isOverdue && (
                       <div className="mt-3 pt-3 border-t border-border">
                         <Button
                           size="sm"
                           className="w-full gap-2 h-8 text-xs"
                           onClick={(e) => {
                             e.stopPropagation();
                             navigate(`/campaign/${c.id}?finalize=true`);
                           }}
                         >
                           <CheckCircle2 className="h-3.5 w-3.5" />
                           Finalizar campanha
                         </Button>
                       </div>
                     )}
                   </CardContent>
                 </Card>
               );})}
             </div>
          </div>
        );
      })()}

      {/* Pending Shipments */}
      {(() => {
        const pendingShipments = shipments.filter((s) => !s.delivered);
        if (pendingShipments.length === 0) return null;
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Envios em andamento ({pendingShipments.length})
              </h2>
              <Link to="/envios" className="text-xs text-primary hover:underline">Ver todos →</Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {pendingShipments.map((s) => {
                const inf = influencers.find((i) => i.id === s.influencerId);
                const camp = campaigns.find((c) => c.id === s.campaignId);
                return (
                  <Link key={s.id} to="/envios">
                    <Card className="transition-colors hover:border-primary/30 cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          {inf && <img src={inf.profilePic} alt="" className="h-8 w-8 rounded-full object-cover ring-2 ring-border shrink-0" />}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold truncate">{inf?.name || "—"}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{s.description}</p>
                          </div>
                          {s.shippingMethod === "motoboy" ? (
                            <Badge variant="outline" className="text-[10px] shrink-0 bg-blue-100 text-blue-800 border-blue-300">
                              Motoboy
                            </Badge>
                          ) : !s.trackingCode ? (
                            <Badge variant="outline" className="text-[10px] shrink-0 bg-amber-100 text-amber-800 border-amber-300">
                              Rastreio pendente
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] font-mono shrink-0">{s.trackingCode}</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                          <span>{s.unit}</span>
                          <span>·</span>
                          <span>{s.requestedBy}</span>
                          {camp && <><span>·</span><span>{camp.name}</span></>}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Ambassador Preview */}
      {(() => {
        const ambassadors = influencers.filter((i) => i.isAmbassador);
        if (ambassadors.length === 0) return null;

        const now = new Date();
        const currentMonthKey = getCurrentMonthKey();
        const year = now.getFullYear();
        const month = now.getMonth();
        
        // Calculate days for next cycle
        let reportDate = new Date(year, month, 5);
        if (now.getDate() > 5) reportDate = new Date(year, month + 1, 5);
        const daysToReport = Math.ceil((reportDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const nextMonth = new Date(year, month + 1, 1);
        const daysToNextMonth = Math.ceil((nextMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        const withCommission = ambassadors.filter((a) => (a.ambassadorCommission ?? 0) > 0);
        const withProducts = ambassadors.filter((a) => (a.ambassadorProductsPerMonth ?? 0) > 0);

        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <Crown className="h-4 w-4 text-amber-500" />
                Embaixadores ({ambassadors.length})
              </h2>
              <Link to="/ambassadors" className="text-xs text-primary hover:underline">Ver todos →</Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {/* Report Reminder */}
              {withCommission.length > 0 && (
                <Card className="border-amber-300/30">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-amber-600 mb-2">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm font-medium">Report comissionado</span>
                    </div>
                    <div className="space-y-2">
                      {withCommission.map((a) => {
                        return (
                          <div key={a.id} className="flex items-center gap-1.5 min-w-0">
                              <Badge variant="outline" className="text-[10px] shrink-0">{a.name} ({a.ambassadorCommission}%)</Badge>
                          </div>
                        );
                      })}
                    </div>
                    {withCommission.some((a) => !(a.ambassadorReportDoneMonths || []).includes(currentMonthKey)) && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Próximo report em <strong className="text-foreground">{daysToReport} dia{daysToReport !== 1 ? "s" : ""}</strong> (dia 05)
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Product Reminder */}
              {withProducts.length > 0 && (
                <Card className="border-primary/30">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-primary mb-2">
                      <Gift className="h-4 w-4" />
                      <span className="text-sm font-medium">Envio de produtos</span>
                    </div>
                    <div className="space-y-2">
                      {withProducts.map((a) => (
                        <div key={a.id} className="flex items-center gap-1.5 min-w-0">
                          <Badge variant="outline" className="text-[10px] shrink-0">{a.name} ({a.ambassadorProductsPerMonth} prod/mês)</Badge>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Próximo envio em <strong className="text-foreground">{daysToNextMonth} dia{daysToNextMonth !== 1 ? "s" : ""}</strong> (dia 01)
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Ambassadors List */}
              {ambassadors.slice(0, 4).map((a) => (
                <Link key={a.id} to={`/influencer/${a.id}`}>
                  <Card className="transition-colors hover:border-primary/30 cursor-pointer">
                    <CardContent className="flex items-center gap-3 p-3">
                      <img src={a.profilePic} alt="" className="h-8 w-8 rounded-full object-cover ring-2 ring-amber-400" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <p className="text-sm font-medium truncate">{a.name}</p>
                          <Crown className="h-3 w-3 text-amber-500 shrink-0" />
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {a.ambassadorEndDate
                            ? `até ${parseLocalDate(a.ambassadorEndDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}`
                            : "Período indefinido"}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Charts + Ranking */}
      <div className="grid gap-4 lg:grid-cols-1">
        <div>
          <DashboardCharts influencers={influencers} />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ranking</CardTitle>
            <Select value={rankBy} onValueChange={(v: any) => setRankBy(v)}>
              <SelectTrigger className="h-7 w-auto gap-1 border-0 bg-secondary text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rating">Avaliação</SelectItem>
                <SelectItem value="campaigns">Campanhas</SelectItem>
                <SelectItem value="sales">Vendas (Cupom)</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="space-y-3">
            {ranking.map((inf, i) => (
              <Link
                key={inf.id}
                to={`/influencer/${inf.id}`}
                className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-secondary/50"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-xs font-bold text-muted-foreground">
                  {i + 1}
                </span>
                <img src={inf.profilePic} alt="" className="h-8 w-8 rounded-full object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium">{inf.name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {rankBy === "rating" ? (
                      <StarRating rating={inf.rating} readonly size={12} />
                    ) : rankBy === "sales" ? (
                      <span>R$ {getInfluencerSales(inf.id).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                    ) : (
                      <span>{getCampaignsForInfluencer(inf.id).length} campanhas</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
}
