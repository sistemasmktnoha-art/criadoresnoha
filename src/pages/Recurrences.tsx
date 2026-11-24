import { InstagramHandle } from "@/components/InstagramHandle";
import { useState, useMemo } from "react";
import { normalizeSearch } from "@/lib/utils";
import { useApp } from "@/context/AppContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, ChevronDown, ChevronUp, Edit, DollarSign, Package, Calendar, Search, MapPin, Link as LinkIcon } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Recurrence, RecurrenceMonthDelivery, LOCATIONS } from "@/types";
import { useToast } from "@/hooks/use-toast";

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function generateMonths(start: string, end: string): RecurrenceMonthDelivery[] {
  const months: RecurrenceMonthDelivery[] = [];
  if (!start || !end) return months;
  const [sy, sm] = start.split("-").map(Number);
  const [ey, em] = end.split("-").map(Number);
  let y = sy, m = sm;
  while (y < ey || (y === ey && m <= em)) {
    months.push({
      month: `${y}-${String(m).padStart(2, "0")}`,
      deliverables: "", agreementType: "permuta", paymentAmount: 0, productCount: 1, notes: "",
    });
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return months;
}

function formatMonth(m: string) {
  const [y, mo] = m.split("-").map(Number);
  return `${MONTH_NAMES[mo - 1]} ${y}`;
}

const STATUS_CFG = {
  ativa: { label: "Ativa", color: "bg-emerald-100 text-emerald-800" },
  pausada: { label: "Pausada", color: "bg-amber-100 text-amber-800" },
  encerrada: { label: "Finalizada", color: "bg-muted text-muted-foreground" },
};

const AGREEMENT_LABELS = {
  permuta: "Permuta", pago: "Pagamento", permuta_e_pago: "Permuta + Pagamento",
};

export default function Recurrences() {
  const { recurrences, influencers, addRecurrence, updateRecurrence, deleteRecurrence } = useApp();
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [infId, setInfId] = useState("");
  const [startMonth, setStartMonth] = useState("");
  const [endMonth, setEndMonth] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingMonthKey, setEditingMonthKey] = useState<string | null>(null);
  const [infSearch, setInfSearch] = useState("");
  const [regionFilter, setRegionFilter] = useState("all");

  // Region stats for active recurrences
  const regionStats = useMemo(() => {
    const stats: Record<string, number> = {};
    for (const rec of recurrences.filter((r) => r.status === "ativa")) {
      const inf = influencers.find((i) => i.id === rec.influencerId);
      const loc = inf?.location || "Indefinido";
      stats[loc] = (stats[loc] || 0) + 1;
    }
    return Object.entries(stats).sort((a, b) => b[1] - a[1]);
  }, [recurrences, influencers]);

  // Filter recurrences by region
  const filteredRecurrences = useMemo(() => {
    if (regionFilter === "all") return recurrences;
    return recurrences.filter((rec) => {
      const inf = influencers.find((i) => i.id === rec.influencerId);
      return (inf?.location || "Indefinido") === regionFilter;
    });
  }, [recurrences, influencers, regionFilter]);

  // Group by region
  const groupedByRegion = useMemo(() => {
    const groups: Record<string, typeof filteredRecurrences> = {};
    for (const rec of filteredRecurrences) {
      const inf = influencers.find((i) => i.id === rec.influencerId);
      const loc = inf?.location || "Indefinido";
      if (!groups[loc]) groups[loc] = [];
      groups[loc].push(rec);
    }
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredRecurrences, influencers]);

  function handleCreate() {
    if (!title || !infId || !startMonth || !endMonth) return;
    const months = generateMonths(startMonth, endMonth);
    if (months.length === 0) {
      toast({ description: "Período inválido.", variant: "destructive" });
      return;
    }
    addRecurrence({ title, influencerId: infId, startMonth, endMonth, months, status: "ativa" });
    setTitle(""); setInfId(""); setStartMonth(""); setEndMonth("");
    setDialogOpen(false);
    toast({ description: "Recorrência criada!" });
  }

  function updateMonth(recId: string, monthKey: string, patch: Partial<RecurrenceMonthDelivery>) {
    const rec = recurrences.find((r) => r.id === recId);
    if (!rec) return;
    updateRecurrence({
      ...rec, months: rec.months.map((m) => (m.month === monthKey ? { ...m, ...patch } : m)),
    });
  }

  function getInf(id: string) { return influencers.find((i) => i.id === id); }

  const monthOptions = (() => {
    const opts: { value: string; label: string }[] = [];
    const start = new Date(2026, 0, 1);
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth() + 24, 1);
    let d = start;
    while (d <= end) {
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      opts.push({ value: val, label: formatMonth(val) });
      d = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    }
    return opts;
  })();

  const totalCost = (rec: Recurrence) =>
    rec.months.reduce((s, m) => s + m.paymentAmount + (m.productCost || 0), 0);

  function renderRecurrence(rec: Recurrence) {
    const inf = getInf(rec.influencerId);
    const expanded = expandedId === rec.id;
    const cfg = STATUS_CFG[rec.status];
    const cost = totalCost(rec);

    return (
      <Card key={rec.id}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setExpandedId(expanded ? null : rec.id)}>
            <img src={inf?.profilePic || "/placeholder.svg"} alt="" className="h-10 w-10 rounded-full object-cover border-2 border-border" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm truncate">{rec.title}</h3>
                <Badge className={`text-[10px] ${cfg.color}`}>{cfg.label}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {inf?.name || "Influenciador removido"}
                {inf?.location && <span className="ml-1">· {inf.location}</span>}
                {" · "}{formatMonth(rec.startMonth)} → {formatMonth(rec.endMonth)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-xs text-muted-foreground">{rec.months.length} meses</p>
                {cost > 0 && <p className="text-xs font-medium text-primary">R$ {cost.toLocaleString("pt-BR")}</p>}
              </div>
              <Select value={rec.status} onValueChange={(v: Recurrence["status"]) => updateRecurrence({ ...rec, status: v })}>
                <SelectTrigger className="h-7 w-[110px] text-xs" onClick={(e) => e.stopPropagation()}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativa">Ativa</SelectItem>
                  <SelectItem value="pausada">Pausada</SelectItem>
                  <SelectItem value="encerrada">Finalizada</SelectItem>
                </SelectContent>
              </Select>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={(e) => e.stopPropagation()}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir recorrência?</AlertDialogTitle>
                    <AlertDialogDescription>"{rec.title}" será removida permanentemente.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => { deleteRecurrence(rec.id); toast({ description: "Recorrência excluída." }); }}>Excluir</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </div>
          </div>

          {expanded && (
            <div className="mt-4 border-t border-border pt-4 space-y-3">
              {rec.months.map((m) => {
                const isEditingThis = editingMonthKey === `${rec.id}-${m.month}`;
                return (
                  <div key={m.month} className="rounded-lg border border-border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        {formatMonth(m.month)}
                      </h4>
                      <Button
                        size="sm" variant={isEditingThis ? "default" : "ghost"} className="h-6 text-xs gap-1"
                        onClick={() => setEditingMonthKey(isEditingThis ? null : `${rec.id}-${m.month}`)}
                      >
                        <Edit className="h-3 w-3" /> {isEditingThis ? "Concluir" : "Editar"}
                      </Button>
                    </div>

                    {isEditingThis ? (
                      <div className="space-y-2">
                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground">Entregas esperadas</Label>
                          <Input className="h-7 text-xs" placeholder="Ex: 2 Reels + 4 Stories" value={m.deliverables}
                            onChange={(e) => updateMonth(rec.id, m.month, { deliverables: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground">Tipo de acordo</Label>
                            <Select value={m.agreementType}
                              onValueChange={(v: RecurrenceMonthDelivery["agreementType"]) => updateMonth(rec.id, m.month, { agreementType: v })}>
                              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="permuta">Permuta</SelectItem>
                                <SelectItem value="pago">Pagamento</SelectItem>
                                <SelectItem value="permuta_e_pago">Permuta + Pago</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {(m.agreementType === "pago" || m.agreementType === "permuta_e_pago") && (
                            <div className="space-y-1">
                              <Label className="text-[10px] text-muted-foreground">Valor (R$)</Label>
                              <Input className="h-7 text-xs" type="number" value={m.paymentAmount || ""}
                                onChange={(e) => updateMonth(rec.id, m.month, { paymentAmount: Number(e.target.value) })} />
                            </div>
                          )}
                          {(m.agreementType === "permuta" || m.agreementType === "permuta_e_pago") && (
                            <div className="space-y-1">
                              <Label className="text-[10px] text-muted-foreground">Qtd produtos</Label>
                              <Input className="h-7 text-xs" type="number" value={m.productCount || ""}
                                onChange={(e) => updateMonth(rec.id, m.month, { productCount: Number(e.target.value) })} />
                            </div>
                          )}
                        </div>
                        {(m.agreementType === "permuta" || m.agreementType === "permuta_e_pago") && (
                          <div className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground">Custo do produto (R$)</Label>
                            <Input className="h-7 text-xs" type="number" placeholder="0,00" value={m.productCost || ""}
                              onChange={(e) => updateMonth(rec.id, m.month, { productCost: Number(e.target.value) || 0 })} />
                          </div>
                        )}
                        <div className="flex flex-wrap gap-4 pt-1">
                          {(m.agreementType === "pago" || m.agreementType === "permuta_e_pago") && (
                            <label className="flex items-center gap-2 text-xs cursor-pointer">
                              <Checkbox checked={m.paymentDone || false}
                                onCheckedChange={(v) => updateMonth(rec.id, m.month, { paymentDone: !!v })} />
                              <span className="text-muted-foreground">Pagamento realizado</span>
                            </label>
                          )}
                          {(m.agreementType === "permuta" || m.agreementType === "permuta_e_pago") && (
                            <label className="flex items-center gap-2 text-xs cursor-pointer">
                              <Checkbox checked={m.productCollected || false}
                                onCheckedChange={(v) => updateMonth(rec.id, m.month, { productCollected: !!v })} />
                              <span className="text-muted-foreground">Produto retirado</span>
                            </label>
                          )}
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground">Observações</Label>
                          <Textarea className="text-xs min-h-[40px]" value={m.notes}
                            onChange={(e) => updateMonth(rec.id, m.month, { notes: e.target.value })} rows={1} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground">Link do conteúdo</Label>
                          <Input className="h-7 text-xs" placeholder="https://..." value={m.contentLink || ""}
                            onChange={(e) => updateMonth(rec.id, m.month, { contentLink: e.target.value })} />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div>
                          <p className="text-muted-foreground">Entregas</p>
                          <p className="font-medium">{m.deliverables || "—"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Acordo</p>
                          <p className="font-medium">{AGREEMENT_LABELS[m.agreementType]}</p>
                        </div>
                        {(m.agreementType === "pago" || m.agreementType === "permuta_e_pago") && (
                          <div>
                            <p className="text-muted-foreground flex items-center gap-1"><DollarSign className="h-3 w-3" />Valor</p>
                            <p className="font-medium">
                              R$ {m.paymentAmount.toLocaleString("pt-BR")}
                              {m.paymentDone && <span className="ml-1 text-emerald-600">✓ Pago</span>}
                            </p>
                          </div>
                        )}
                        {(m.agreementType === "permuta" || m.agreementType === "permuta_e_pago") && (
                          <div>
                            <p className="text-muted-foreground flex items-center gap-1"><Package className="h-3 w-3" />Produtos</p>
                            <p className="font-medium">
                              {m.productCount}
                              {(m.productCost || 0) > 0 && ` (R$ ${m.productCost!.toLocaleString("pt-BR")})`}
                              {m.productCollected && <span className="ml-1 text-emerald-600">✓ Retirado</span>}
                            </p>
                          </div>
                        )}
                        {m.notes && (
                          <div className="col-span-full">
                            <p className="text-muted-foreground">Obs</p>
                            <p className="font-medium">{m.notes}</p>
                          </div>
                        )}
                        {m.contentLink && (
                          <div className="col-span-full">
                            <a href={m.contentLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline">
                              <LinkIcon className="h-3 w-3" /> {m.contentLink}
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Recorrências</h1>
          <p className="text-sm text-muted-foreground">Parcerias de médio e longo prazo</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Nova Recorrência</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Nova Recorrência</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Título</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Parceria mensal Stories" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Influenciador</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={infSearch} onChange={(e) => setInfSearch(e.target.value)} placeholder="Buscar por nome ou @..." className="pl-10" />
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1 rounded-md border border-input p-1">
                  {(() => {
                    const filtered = influencers.filter((inf) => {
                      if (!infSearch) return true;
                      const q = normalizeSearch(infSearch);
                      return normalizeSearch(inf.name).includes(q) || normalizeSearch(inf.username).includes(q);
                    });
                    if (filtered.length === 0) return <p className="text-xs text-muted-foreground py-2 text-center">Nenhum encontrado.</p>;
                    return filtered.map((inf) => (
                      <button key={inf.id} type="button"
                        className={`flex w-full items-center gap-2 rounded-md p-2 text-left transition-colors ${infId === inf.id ? "bg-primary/10 ring-1 ring-primary/30" : "hover:bg-secondary/50"}`}
                        onClick={() => { setInfId(inf.id); setInfSearch(""); }}>
                        <img src={inf.profilePic} alt="" className="h-7 w-7 rounded-full object-cover" />
                        <div>
                          <p className="text-xs font-medium">{inf.name}</p>
                          <p className="text-[10px] text-muted-foreground"><InstagramHandle username={inf.username} url={inf.instagramUrl} /> · {inf.location || "—"}</p>
                        </div>
                      </button>
                    ));
                  })()}
                </div>
                {infId && (() => {
                  const sel = influencers.find((i) => i.id === infId);
                  return sel ? <p className="text-xs text-muted-foreground">Selecionado: <span className="font-medium text-foreground">{sel.name}</span></p> : null;
                })()}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Mês início</Label>
                  <Select value={startMonth} onValueChange={setStartMonth}>
                    <SelectTrigger><SelectValue placeholder="Início" /></SelectTrigger>
                    <SelectContent>{monthOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Mês fim</Label>
                  <Select value={endMonth} onValueChange={setEndMonth}>
                    <SelectTrigger><SelectValue placeholder="Fim" /></SelectTrigger>
                    <SelectContent>{monthOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleCreate} className="w-full">Criar Recorrência</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Region stats */}
      {regionStats.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <MapPin className="h-4 w-4" /> Recorrências ativas por Região
            </h3>
            <div className="flex flex-wrap gap-2">
              {regionStats.map(([loc, count]) => (
                <Badge key={loc} variant="outline" className="text-xs cursor-pointer hover:bg-secondary"
                  onClick={() => setRegionFilter(regionFilter === loc ? "all" : loc)}>
                  {loc}: <span className="font-bold ml-1">{count}</span>
                  {regionFilter === loc && " ✕"}
                </Badge>
              ))}
              {regionFilter !== "all" && (
                <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => setRegionFilter("all")}>Limpar filtro</Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {(() => {
        const activeRecs = filteredRecurrences.filter((r) => r.status !== "encerrada");
        const finalizedRecs = filteredRecurrences.filter((r) => r.status === "encerrada");
        const groupByRegion = (list: typeof filteredRecurrences) => {
          const groups: Record<string, typeof filteredRecurrences> = {};
          for (const rec of list) {
            const inf = influencers.find((i) => i.id === rec.influencerId);
            const loc = inf?.location || "Indefinido";
            if (!groups[loc]) groups[loc] = [];
            groups[loc].push(rec);
          }
          return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
        };
        const renderList = (list: typeof filteredRecurrences) => {
          if (list.length === 0) {
            return <p className="py-12 text-center text-sm text-muted-foreground">Nenhuma recorrência</p>;
          }
          return (
            <div className="space-y-6">
              {groupByRegion(list).map(([region, recs]) => (
                <div key={region} className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5" /> {region} ({recs.length})
                  </h3>
                  <div className="space-y-4">
                    {recs.map((rec) => renderRecurrence(rec))}
                  </div>
                </div>
              ))}
            </div>
          );
        };
        return (
          <Tabs defaultValue="ativas">
            <TabsList>
              <TabsTrigger value="ativas">Ativas ({activeRecs.length})</TabsTrigger>
              <TabsTrigger value="finalizadas">Finalizadas ({finalizedRecs.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="ativas" className="mt-4">{renderList(activeRecs)}</TabsContent>
            <TabsContent value="finalizadas" className="mt-4">{renderList(finalizedRecs)}</TabsContent>
          </Tabs>
        );
      })()}
    </div>
  );
}
