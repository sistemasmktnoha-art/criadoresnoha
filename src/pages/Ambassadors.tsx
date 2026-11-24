import { InstagramHandle } from "@/components/InstagramHandle";
import { useMemo, useState } from "react";
import { useApp } from "@/context/AppContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Crown, Percent, Gift, Calendar, AlertCircle, MapPin, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { LOCATIONS, Influencer } from "@/types";
import { normalizeSearch, parseLocalDate } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Ambassadors() {
  const { influencers, updateInfluencer } = useApp();
  const [search, setSearch] = useState("");
  const [selectedAmbassador, setSelectedAmbassador] = useState<Influencer | null>(null);

  const ambassadors = useMemo(() => {
    return influencers
      .filter((i) => i.isAmbassador)
      .filter((i) =>
        !search || normalizeSearch(i.name).includes(normalizeSearch(search)) || normalizeSearch(i.username).includes(normalizeSearch(search))
      );
  }, [influencers, search]);

  const allAmbassadors = useMemo(() => influencers.filter((i) => i.isAmbassador), [influencers]);

  const regionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of allAmbassadors) {
      const loc = a.location || "Indefinido";
      counts[loc] = (counts[loc] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [allAmbassadors]);

  const today = new Date();

  function getDaysUntilReportDay(): number {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    let reportDate = new Date(year, month, 5);
    if (now.getDate() > 5) {
      reportDate = new Date(year, month + 1, 5);
    }
    return Math.ceil((reportDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }

  function getDaysUntilNextMonth(): number {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return Math.ceil((nextMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }

  const daysToReport = getDaysUntilReportDay();
  const daysToNextMonth = getDaysUntilNextMonth();

  // Generate months between start and end (or current month)
  function getMonthRange(inf: Influencer): string[] {
    const start = inf.ambassadorStartDate ? parseLocalDate(inf.ambassadorStartDate) : null;
    const end = inf.ambassadorEndDate ? parseLocalDate(inf.ambassadorEndDate) : null;
    if (!start) return [];
    const months: string[] = [];
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    const limit = end ? new Date(end.getFullYear(), end.getMonth(), 1) : new Date(today.getFullYear(), today.getMonth(), 1);
    while (cursor <= limit) {
      months.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`);
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return months;
  }

  function handleProductStatus(inf: Influencer, month: string, status: "pendente" | "retirado" | "enviado") {
    const current = { ...(inf.ambassadorProductMonthlyStatus || {}) };
    current[month] = status;
    // Also update the done months array
    const doneMonths = new Set(inf.ambassadorProductDoneMonths || []);
    if (status !== "pendente") doneMonths.add(month);
    else doneMonths.delete(month);
    updateInfluencer({ ...inf, ambassadorProductMonthlyStatus: current, ambassadorProductDoneMonths: Array.from(doneMonths) });
    setSelectedAmbassador({ ...inf, ambassadorProductMonthlyStatus: current, ambassadorProductDoneMonths: Array.from(doneMonths) });
  }

  function handleCommissionStatus(inf: Influencer, month: string, status: "pendente" | "programada" | "paga") {
    const current = { ...(inf.ambassadorCommissionMonthlyStatus || {}) };
    current[month] = status;
    updateInfluencer({ ...inf, ambassadorCommissionMonthlyStatus: current });
    setSelectedAmbassador({ ...inf, ambassadorCommissionMonthlyStatus: current });
  }

  function formatMonth(m: string) {
    const [y, mo] = m.split("-");
    const d = new Date(parseInt(y), parseInt(mo) - 1, 1);
    return d.toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Crown className="h-6 w-6 text-amber-500" />
          Embaixadores ({allAmbassadors.length})
        </h1>
        <p className="text-sm text-muted-foreground">Programa de embaixadores Noha Shoes</p>
      </div>

      {regionCounts.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <MapPin className="h-4 w-4" /> Embaixadores por Região
            </h3>
            <div className="flex flex-wrap gap-2">
              {regionCounts.map(([loc, count]) => (
                <Badge key={loc} variant="outline" className="text-xs">
                  {loc}: <span className="font-bold ml-1">{count}</span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Input
        placeholder="Buscar embaixador..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {ambassadors.length === 0 ? (
        <p className="text-sm text-muted-foreground py-10 text-center">
          Nenhum embaixador ativo. Ative a coroa no perfil de um influenciador para adicioná-lo ao programa.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ambassadors.map((inf) => {
            const isExpired = inf.ambassadorEndDate && parseLocalDate(inf.ambassadorEndDate) < today;
            const hasCommission = (inf.ambassadorCommission ?? 0) > 0;
            const hasProducts = (inf.ambassadorProductsPerMonth ?? 0) > 0;

            return (
              <div key={inf.id} onClick={() => setSelectedAmbassador(inf)} className="cursor-pointer">
                <Card className={`transition-colors hover:border-primary/30 ${isExpired ? "opacity-60" : ""}`}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <img src={inf.profilePic} alt="" className="h-10 w-10 rounded-full object-cover ring-2 ring-amber-400" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold text-sm truncate">{inf.name}</p>
                          <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        </div>
                        <p className="text-xs text-muted-foreground"><InstagramHandle username={inf.username} url={inf.instagramUrl} /></p>
                      </div>
                      {isExpired && <Badge variant="destructive" className="text-[10px]">Expirado</Badge>}
                    </div>

                    {inf.location && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {inf.location}
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {inf.ambassadorStartDate
                        ? parseLocalDate(inf.ambassadorStartDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
                        : "—"}
                      {" → "}
                      {inf.ambassadorEndDate
                        ? parseLocalDate(inf.ambassadorEndDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
                        : "Indefinido"}
                    </div>

                    {hasCommission && (
                      <div className="flex items-center gap-1.5 text-xs">
                        <Percent className="h-3 w-3 text-emerald-600" />
                        <span>Comissão: {inf.ambassadorCommission}%</span>
                      </div>
                    )}

                    {hasProducts && (
                      <div className="flex items-center gap-1.5 text-xs">
                        <Gift className="h-3 w-3 text-primary" />
                        <span>{inf.ambassadorProductsPerMonth} produto(s)/mês</span>
                      </div>
                    )}

                    {inf.ambassadorBenefits && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{inf.ambassadorBenefits}</p>
                    )}

                    <div className="space-y-1 pt-1 border-t border-border">
                      {hasCommission && (() => {
                        const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
                        const reportDone = (inf.ambassadorReportDoneMonths || []).includes(currentMonth);
                        const isLate = today.getDate() > 5 && !reportDone;
                        return reportDone ? (
                          <div className="flex items-center gap-1.5 text-[11px] text-emerald-600">
                            <AlertCircle className="h-3 w-3" /> Report enviado este mês
                          </div>
                        ) : (
                          <div className={`flex items-center gap-1.5 text-[11px] ${isLate ? "text-destructive" : "text-amber-600"}`}>
                            <AlertCircle className="h-3 w-3" />
                            {isLate ? "Report atrasado!" : `Enviar report em ${daysToReport} dia${daysToReport !== 1 ? "s" : ""}`}
                          </div>
                        );
                      })()}
                      {hasProducts && (() => {
                        const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
                        const productDone = (inf.ambassadorProductDoneMonths || []).includes(currentMonth);
                        return productDone ? (
                          <div className="flex items-center gap-1.5 text-[11px] text-emerald-600">
                            <Gift className="h-3 w-3" /> Produto solicitado este mês
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-[11px] text-primary">
                            <Gift className="h-3 w-3" />
                            Solicitar envio em {daysToNextMonth} dia{daysToNextMonth !== 1 ? "s" : ""}
                          </div>
                        );
                      })()}
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      )}

      {/* Monthly detail dialog */}
      <Dialog open={!!selectedAmbassador} onOpenChange={(open) => !open && setSelectedAmbassador(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          {selectedAmbassador && (() => {
            const inf = selectedAmbassador;
            const hasCommission = (inf.ambassadorCommission ?? 0) > 0;
            const hasProducts = (inf.ambassadorProductsPerMonth ?? 0) > 0;
            const months = getMonthRange(inf);

            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <img src={inf.profilePic} alt="" className="h-8 w-8 rounded-full object-cover ring-2 ring-amber-400" />
                    {inf.name}
                    <Crown className="h-4 w-4 text-amber-500" />
                    <Button variant="outline" size="sm" className="ml-auto h-7 text-xs gap-1" asChild>
                      <Link to={`/influencer/${inf.id}`}>
                        <ExternalLink className="h-3 w-3" /> Ver perfil
                      </Link>
                    </Button>
                  </DialogTitle>
                </DialogHeader>

                {months.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma data de início definida para gerar o histórico mensal.</p>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 gap-y-1 text-xs items-center">
                      <p className="font-medium text-muted-foreground">Mês</p>
                      {hasProducts && <p className="font-medium text-muted-foreground text-center">Produto</p>}
                      {hasCommission && <p className="font-medium text-muted-foreground text-center">Comissão</p>}
                      {!hasProducts && !hasCommission && <p className="col-span-2 text-muted-foreground">Sem produto ou comissão configurados.</p>}
                    </div>

                    {months.map((m) => {
                      const productStatus = inf.ambassadorProductMonthlyStatus?.[m] || "pendente";
                      const commissionStatus = inf.ambassadorCommissionMonthlyStatus?.[m] || "pendente";
                      return (
                        <div key={m} className="grid grid-cols-[1fr_auto_auto] gap-x-3 gap-y-1 items-center border-b border-border pb-2">
                          <p className="text-xs font-medium">{formatMonth(m)}</p>
                          {hasProducts && (
                            <Select value={productStatus} onValueChange={(v) => handleProductStatus(inf, m, v as any)}>
                              <SelectTrigger className="h-7 text-[11px] w-[110px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pendente">Pendente</SelectItem>
                                <SelectItem value="retirado">Retirado</SelectItem>
                                <SelectItem value="enviado">Enviado</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                          {hasCommission && (
                            <Select value={commissionStatus} onValueChange={(v) => handleCommissionStatus(inf, m, v as any)}>
                              <SelectTrigger className="h-7 text-[11px] w-[110px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pendente">Pendente</SelectItem>
                                <SelectItem value="programada">Programada</SelectItem>
                                <SelectItem value="paga">Paga</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
