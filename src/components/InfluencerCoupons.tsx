import { optionalCouponCode, hasApprovedContact } from "@/lib/couponRules";
import { parseLocalDate } from "@/lib/utils";
import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tag, Plus, Trash2, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Coupon } from "@/types";

interface Props {
  influencerId: string;
}

export function InfluencerCoupons({ influencerId }: Props) {
  const { getCouponsForInfluencer, addCoupon, deleteCoupon, updateCoupon, campaigns } = useApp();
  const { toast } = useToast();
  const allCoupons = getCouponsForInfluencer(influencerId);
  const eligible = campaigns.some((c) => c.status !== "finalizada" && c.participants?.some((p) => p.influencerId === influencerId && hasApprovedContact(p)));
  const coupons = allCoupons.filter((c) => !c.code?.trim() || c.isActive || eligible);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [discount, setDiscount] = useState("");
  const [startDate, setStartDate] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  const today = new Date().toISOString().split("T")[0];

  function resetForm() {
    setCode("");
    setDiscount("");
    setStartDate("");
    setValidUntil("");
    setErrors({});
    setShowForm(false);
    setEditingId(null);
  }

  function startEdit(c: Coupon) {
    setEditingId(c.id);
    setCode(c.code || "");
    setDiscount(String(c.discountPercent));
    setStartDate(c.startDate || "");
    setValidUntil(c.validUntil);
    setErrors({});
    setShowForm(false);
  }

  function handleSubmit() {
    const newErrors: Record<string, boolean> = {};

    if (code.trim() && !discount.trim()) newErrors.discount = true;
    if (code.trim() && !validUntil) newErrors.validUntil = true;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast({ title: "Campos obrigatórios", description: "Preencha todos os campos para salvar o cupom.", variant: "destructive" });
      return;
    }

    if (editingId) {
      const existing = coupons.find((c) => c.id === editingId);
      if (existing) {
        updateCoupon({
          ...existing,
          code: optionalCouponCode(code),
          discountPercent: Number(discount),
          startDate: startDate || undefined,
          validUntil,
          isActive: validUntil >= today && (!startDate || startDate <= today),
        });
        toast({ title: "Cupom atualizado", description: `Cupom ${code.toUpperCase()} editado com sucesso.` });
      }
    } else {
      addCoupon({
        influencerId,
        code: optionalCouponCode(code),
        discountPercent: Number(discount),
        startDate: startDate || undefined,
        validUntil,
        isActive: Boolean(code.trim()),
      });
      toast({ title: "Cupom adicionado", description: `Cupom ${code.toUpperCase()} criado com sucesso.` });
    }
    resetForm();
  }

  function getDaysLeft(until: string) {
    const diff = Math.ceil((new Date(until).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return diff;
  }

  function renderForm() {
    return (
      <div className="rounded-lg border border-border p-3 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Código (opcional)</Label>
            <Input value={code} onChange={(e) => { setCode(e.target.value); setErrors((p) => ({ ...p, code: false })); }} placeholder="NOHA10" className={`h-8 text-xs ${errors.code ? "border-destructive" : ""}`} />
          </div>
          <div>
            <Label className="text-xs">Desconto (%) *</Label>
            <Input type="number" value={discount} onChange={(e) => { setDiscount(e.target.value); setErrors((p) => ({ ...p, discount: false })); }} placeholder="10" className={`h-8 text-xs ${errors.discount ? "border-destructive" : ""}`} />
          </div>
          <div>
            <Label className="text-xs">Início</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-8 text-xs" />
          </div>
          <div>
            <Label className="text-xs">Validade *</Label>
            <Input type="date" value={validUntil} onChange={(e) => { setValidUntil(e.target.value); setErrors((p) => ({ ...p, validUntil: false })); }} className={`h-8 text-xs ${errors.validUntil ? "border-destructive" : ""}`} />
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" className="text-xs" onClick={handleSubmit}>
            {editingId ? "Atualizar" : "Salvar"}
          </Button>
          <Button size="sm" variant="ghost" className="text-xs" onClick={resetForm}>Cancelar</Button>
        </div>
      </div>
    );
  }

  return (
    <Card id="cupons" className="scroll-mt-20">
      <CardHeader className="flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Tag className="h-4 w-4" />
          Cupons ({coupons.length})
        </CardTitle>
        <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => { resetForm(); setShowForm(!showForm); }}>
          <Plus className="h-3 w-3" />
          Adicionar
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {showForm && !editingId && renderForm()}

        {coupons.length === 0 && !showForm && (
          <p className="text-sm text-muted-foreground">Sem cupom</p>
        )}

        {coupons.map((c) => {
          if (!c.code?.trim()) return <Badge key={c.id} variant="secondary">Sem cupom</Badge>;
          const expired = c.validUntil < today;
          const notStarted = c.startDate && c.startDate > today;
          const active = !expired && !notStarted;
          const daysLeft = getDaysLeft(c.validUntil);

          if (editingId === c.id) {
            return <div key={c.id}>{renderForm()}</div>;
          }

          return (
            <div key={c.id} className="flex items-center justify-between rounded-lg border border-border p-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <code className="rounded bg-secondary px-1.5 py-0.5 text-xs font-bold">{c.code}</code>
                  <Badge variant={active ? "default" : "secondary"} className="text-[10px]">
                    {expired ? "Expirado" : notStarted ? "Agendado" : "Ativo"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {c.discountPercent}%
                  {c.startDate && ` · de ${parseLocalDate(c.startDate).toLocaleDateString("pt-BR")}`}
                  {` · até ${parseLocalDate(c.validUntil).toLocaleDateString("pt-BR")}`}
                  {active && daysLeft >= 0 && (
                    <span className={daysLeft <= 7 ? " text-amber-600 font-medium" : ""}>
                      {` · ${daysLeft}d restante${daysLeft !== 1 ? "s" : ""}`}
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => startEdit(c)}>
                  <Pencil className="h-3 w-3" /> Editar
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-destructive" onClick={() => { if (confirm(`Excluir o cupom ${c.code}?`)) deleteCoupon(c.id); }}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
