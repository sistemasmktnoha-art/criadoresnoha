import { hasApprovedContact, optionalCouponCode } from "@/lib/couponRules";
import { normalizeSearch, parseLocalDate } from "@/lib/utils";
import { useMemo, useState } from "react";
import { useApp } from "@/context/AppContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tag, Percent, Calendar, User, Pencil, Trash2, DollarSign, TrendingUp, MapPin, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Coupon, LOCATIONS } from "@/types";

const MONTH_NAMES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function formatMonthLabel(m: string) {
  const [year, month] = m.split("-");
  return `${MONTH_NAMES[parseInt(month) - 1]}/${year}`;
}

function buildMonthKey(month: string, year: string) {
  return `${year}-${month}`;
}

function MonthYearPicker({ month, year, onMonthChange, onYearChange, className }: {
  month: string; year: string;
  onMonthChange: (m: string) => void;
  onYearChange: (y: string) => void;
  className?: string;
}) {
  return (
    <div className={`flex gap-1 ${className || ""}`}>
      <Select value={month} onValueChange={onMonthChange}>
        <SelectTrigger className="h-7 text-[10px] w-[80px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          {MONTH_NAMES.map((name, i) => (
            <SelectItem key={i} value={String(i + 1).padStart(2, "0")}>{name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        className="h-7 text-[10px] w-[70px]"
        type="number"
        value={year}
        onChange={(e) => onYearChange(e.target.value)}
        min={2020}
        max={2099}
      />
    </div>
  );
}

function getDaysUntilExpiry(validUntil: string): number {
  const now = new Date();
  const end = parseLocalDate(validUntil);
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export default function Coupons() {
  const { coupons, influencers, updateCoupon, deleteCoupon, campaigns } = useApp();
  const { toast } = useToast();
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [discount, setDiscount] = useState("");
  const [startDate, setStartDate] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [filterMonth, setFilterMonth] = useState("01");
  const [filterYear, setFilterYear] = useState("2026");
  const [salesMonth, setSalesMonth] = useState<string>("all");
  const [editingSalesId, setEditingSalesId] = useState<string | null>(null);
  const [salesValue, setSalesValue] = useState("");
  const [editSalesMonth, setEditSalesMonth] = useState("01");
  const [editSalesYear, setEditSalesYear] = useState("2026");
  const [editingSalesMode, setEditingSalesMode] = useState<"add" | "edit">("add");

  const computedSalesMonth = salesMonth === "all" ? "all" : buildMonthKey(filterMonth, filterYear);

  const enriched = useMemo(() => {
    return coupons.filter((c) => c.isActive || !c.code?.trim() || campaigns.some((campaign) => campaign.status !== "finalizada" && campaign.participants?.some((p) => p.influencerId === c.influencerId && hasApprovedContact(p)))).map((c) => {
      const inf = influencers.find((i) => i.id === c.influencerId);
      const sales = c.monthlySales || {};
      const totalSales = Object.values(sales).reduce((s, v) => s + v, 0);
      const filteredSales = computedSalesMonth === "all" ? totalSales : (sales[computedSalesMonth] || 0);
      return { ...c, influencerName: inf?.name || "—", influencerUsername: inf?.username || "", influencerLocation: inf?.location || "Indefinido", totalSales, filteredSales };
    });
  }, [coupons, influencers, computedSalesMonth, campaigns]);

  const filtered = useMemo(() => {
    const byStatus = filter === "active" ? enriched.filter((c) => c.isActive) : filter === "inactive" ? enriched.filter((c) => !c.isActive) : enriched;
    if (!searchTerm.trim()) return byStatus;
    const q = normalizeSearch(searchTerm);
    return byStatus.filter((c) =>
      normalizeSearch(c.code || "").includes(q) ||
      normalizeSearch(c.influencerName).includes(q) ||
      normalizeSearch(c.influencerUsername).includes(q) ||
      normalizeSearch(c.influencerLocation).includes(q)
    );
  }, [enriched, filter, searchTerm]);

  const activeCount = enriched.filter((c) => c.isActive).length;
  const inactiveCount = enriched.length - activeCount;

  // Regional panel
  const regionStats = useMemo(() => {
    const stats: Record<string, { active: number; inactive: number }> = {};
    for (const c of enriched) {
      const loc = c.influencerLocation || "Indefinido";
      if (!stats[loc]) stats[loc] = { active: 0, inactive: 0 };
      if (c.isActive) stats[loc].active++;
      else stats[loc].inactive++;
    }
    return Object.entries(stats).sort((a, b) => (b[1].active + b[1].inactive) - (a[1].active + a[1].inactive));
  }, [enriched]);

  function startEdit(c: Coupon) {
    setEditingId(c.id);
    setCode(c.code || "");
    setDiscount(String(c.discountPercent));
    setStartDate(c.startDate || "");
    setValidUntil(c.validUntil);
  }

  function cancelEdit() {
    setEditingId(null);
    setCode("");
    setDiscount("");
    setStartDate("");
    setValidUntil("");
  }

  function handleSave(c: Coupon) {
    if (code.trim() && (!discount.trim() || !validUntil)) {
      toast({ title: "Campos obrigatórios", description: "Preencha todos os campos.", variant: "destructive" });
      return;
    }
    const today = new Date().toISOString().split("T")[0];
    updateCoupon({
      ...c,
      code: optionalCouponCode(code),
      discountPercent: Number(discount),
      startDate: startDate || undefined,
      validUntil,
      isActive: Boolean(code.trim()) && validUntil >= today && (!startDate || startDate <= today),
    });
    toast({ title: "Cupom atualizado", description: `Cupom ${code.toUpperCase()} editado.` });
    cancelEdit();
  }

  function handleDelete(id: string, couponCode: string) {
    if (confirm(`Deseja excluir o cupom ${couponCode}?`)) {
      deleteCoupon(id);
      toast({ title: "Cupom excluído", description: `Cupom ${couponCode} removido.` });
    }
  }

  function startSalesEdit(c: Coupon) {
    setEditingSalesId(c.id);
    setSalesValue("");
    setEditingSalesMode("add");
    const now = new Date();
    setEditSalesMonth(String(now.getMonth() + 1).padStart(2, "0"));
    setEditSalesYear(String(now.getFullYear()));
  }

  function saveSales(c: Coupon) {
    const key = buildMonthKey(editSalesMonth, editSalesYear);
    if (!key || !salesValue.trim()) {
      toast({ title: "Preencha mês e valor", variant: "destructive" });
      return;
    }
    const val = parseFloat(salesValue.replace(",", "."));
    if (isNaN(val)) {
      toast({ title: "Valor inválido", variant: "destructive" });
      return;
    }
    let newVal: number;
    if (editingSalesMode === "edit") {
      newVal = val;
    } else {
      const existingVal = (c.monthlySales || {})[key] || 0;
      newVal = existingVal + val;
    }
    const updated = { ...c, monthlySales: { ...(c.monthlySales || {}), [key]: newVal } };
    updateCoupon(updated);
    toast({ description: `Venda de ${formatMonthLabel(key)} atualizada.` });
    setEditingSalesId(null);
    setSalesValue("");
    setEditingSalesMode("add");
  }

  const filterBtn = (value: "all" | "active" | "inactive", label: string, count: number) => (
    <button
      onClick={() => setFilter(value)}
      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${filter === value ? "bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:bg-secondary"}`}
    >
      {label} ({count})
    </button>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Cupons</h1>
        <p className="text-sm text-muted-foreground">Gerencie cupons de desconto dos creators</p>
      </div>

      {/* Regional Panel */}
      {regionStats.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <MapPin className="h-4 w-4" /> Cupons por Região
            </h3>
            <div className="flex flex-wrap gap-2">
              {regionStats.map(([loc, stats]) => (
                <div key={loc} className="rounded-lg border border-border px-3 py-1.5 text-xs">
                  <span className="font-medium">{loc}</span>
                  <span className="ml-2 text-emerald-600">{stats.active} ativo{stats.active !== 1 ? "s" : ""}</span>
                  <span className="ml-1 text-muted-foreground">/ {stats.inactive} inativo{stats.inactive !== 1 ? "s" : ""}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-[220px] flex-1 sm:max-w-xs">
          <Input className="h-8 text-xs" placeholder="Buscar cupom ou creator..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="flex gap-2">
          {filterBtn("all", "Todos", enriched.length)}
          {filterBtn("active", "Ativos", activeCount)}
          {filterBtn("inactive", "Inativos", inactiveCount)}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Vendas:</Label>
          <Select value={salesMonth} onValueChange={setSalesMonth}>
            <SelectTrigger className="h-8 w-[120px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo período</SelectItem>
              <SelectItem value="specific">Por mês</SelectItem>
            </SelectContent>
          </Select>
          {salesMonth === "specific" && (
            <MonthYearPicker
              month={filterMonth}
              year={filterYear}
              onMonthChange={setFilterMonth}
              onYearChange={setFilterYear}
              className="flex"
            />
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <Tag className="mx-auto h-8 w-8 mb-2 opacity-40" />
          <p>Nenhum cupom encontrado</p>
          <p className="text-xs mt-1">Adicione cupons na página de cada influenciador</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => {
            if (!c.code?.trim() && editingId !== c.id) return <Card key={c.id}><CardContent className="p-4 space-y-2"><Badge variant="secondary">Sem cupom</Badge><p className="text-sm">{c.influencerName}</p><Button variant="ghost" size="sm" onClick={() => startEdit(c)}>Editar</Button></CardContent></Card>;
            const daysLeft = getDaysUntilExpiry(c.validUntil);
            return (
              <Card key={c.id} className={!c.isActive ? "opacity-60" : ""}>
                <CardContent className="p-4 space-y-2">
                  {editingId === c.id ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Código (opcional)</Label>
                          <Input value={code} onChange={(e) => setCode(e.target.value)} className="h-8 text-xs" />
                        </div>
                        <div>
                          <Label className="text-xs">Desconto (%)</Label>
                          <Input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} className="h-8 text-xs" />
                        </div>
                        <div>
                          <Label className="text-xs">Início</Label>
                          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-8 text-xs" />
                        </div>
                        <div>
                          <Label className="text-xs">Validade</Label>
                          <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className="h-8 text-xs" />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="text-xs" onClick={() => handleSave(c)}>Salvar</Button>
                        <Button size="sm" variant="ghost" className="text-xs" onClick={cancelEdit}>Cancelar</Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <code className="rounded bg-secondary px-2 py-0.5 text-sm font-bold">{c.code}</code>
                        <Badge variant={c.isActive ? "default" : "secondary"}>
                          {c.isActive ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Percent className="h-3 w-3" />
                          {c.discountPercent}%
                        </span>
                        {c.startDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            De {parseLocalDate(c.startDate).toLocaleDateString("pt-BR")}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Até {parseLocalDate(c.validUntil).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                      {c.isActive && daysLeft >= 0 && (
                        <div className="flex items-center gap-1 text-xs">
                          <Clock className="h-3 w-3" />
                          <span className={daysLeft <= 7 ? "text-amber-600 font-medium" : "text-muted-foreground"}>
                            {daysLeft === 0 ? "Expira hoje" : `${daysLeft} dia${daysLeft !== 1 ? "s" : ""} para expirar`}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <User className="h-3 w-3" />
                        {c.influencerName} {c.influencerUsername && `(@${c.influencerUsername})`}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {c.influencerLocation}
                      </div>

                      {/* Sales display */}
                      <div className="rounded-md border border-border p-2 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                            <TrendingUp className="h-3 w-3" />
                            {computedSalesMonth === "all" ? "Total vendido" : `Vendas ${formatMonthLabel(computedSalesMonth)}`}
                          </span>
                          <span className="text-sm font-bold text-primary">
                            R$ {c.filteredSales.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        {computedSalesMonth === "all" && c.totalSales > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(c.monthlySales || {}).filter(([, v]) => v > 0).map(([m, v]) => (
                              <span key={m} className="rounded bg-secondary px-1.5 py-0.5 text-[10px] inline-flex items-center gap-1">
                                {formatMonthLabel(m)}: R$ {v.toLocaleString("pt-BR")}
                                <button
                                  className="ml-0.5 hover:text-primary"
                                  title="Editar valor"
                                  onClick={() => {
                                    const [y, mo] = m.split("-");
                                    setEditingSalesId(c.id);
                                    setEditSalesMonth(mo);
                                    setEditSalesYear(y);
                                    setSalesValue(String(v));
                                    setEditingSalesMode("edit");
                                  }}
                                >
                                  <Pencil className="h-2.5 w-2.5" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}

                        {editingSalesId === c.id ? (
                          <div className="flex items-end gap-2 pt-1">
                            <MonthYearPicker
                              month={editSalesMonth}
                              year={editSalesYear}
                              onMonthChange={setEditSalesMonth}
                              onYearChange={setEditSalesYear}
                            />
                            <div className="flex-1">
                              <Input
                                className="h-7 text-[10px]"
                                placeholder="Valor (R$)"
                                value={salesValue}
                                onChange={(e) => setSalesValue(e.target.value)}
                              />
                            </div>
                            <Button size="sm" className="h-7 text-[10px]" onClick={() => saveSales(c)}>OK</Button>
                            <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => setEditingSalesId(null)}>✕</Button>
                          </div>
                        ) : (
                          <Button variant="ghost" size="sm" className="h-6 text-[10px] w-full gap-1" onClick={() => startSalesEdit(c)}>
                            <DollarSign className="h-3 w-3" />
                            Registrar venda mensal
                          </Button>
                        )}
                      </div>

                      <div className="flex items-center gap-1 pt-1">
                        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => startEdit(c)}>
                          <Pencil className="h-3 w-3" />
                          Editar
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 text-destructive" onClick={() => handleDelete(c.id, c.code || "Sem cupom")}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
