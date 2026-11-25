import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, MessageCircle, Instagram, CalendarPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { useApp } from "@/context/AppContext";
import type { Campaign, CampaignParticipant, Influencer } from "@/types";
import {
  SMART_TEMPLATES, DEAL_LABEL, buildContext, renderUserTemplate, whatsappUrl, instagramUrl,
  type Deal, type Scenario,
} from "@/lib/dmMessages";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  influencer: Influencer;
  campaign?: Campaign;
  participant?: CampaignParticipant;
}

export function GenerateMessageDialog({ open, onOpenChange, influencer, campaign, participant }: Props) {
  const { coupons, campaigns, messageTemplates } = useApp();
  const base = useMemo(
    () => buildContext(influencer, campaign, participant, coupons, campaigns),
    [influencer, campaign, participant, coupons, campaigns],
  );
  const [scenario, setScenario] = useState<Scenario>(base.scenario);
  const [deal, setDeal] = useState<Deal>(base.deal);
  const [templateId, setTemplateId] = useState("smart-convite");
  const [text, setText] = useState("");
  const addDays = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
  const [dFollow, setDFollow] = useState(addDays(3));
  const [dPost, setDPost] = useState((participant?.scheduledDate || campaign?.deadline || "").slice(0, 10));
  const [dShip, setDShip] = useState((campaign?.startDate || "").slice(0, 10));

  useEffect(() => {
    if (open) { setScenario(base.scenario); setDeal(base.deal); }
  }, [open, base.scenario, base.deal]);

  const ctx = useMemo(() => ({ ...base, scenario, deal }), [base, scenario, deal]);
  const userTemplates = messageTemplates ?? [];

  useEffect(() => {
    if (!open) return;
    const smart = SMART_TEMPLATES.find((t) => t.id === templateId);
    if (smart) { setText(smart.render(ctx)); return; }
    const user = userTemplates.find((t) => t.id === templateId);
    if (user) setText(renderUserTemplate(user, ctx));
  }, [open, templateId, ctx]); // eslint-disable-line react-hooks/exhaustive-deps

  const wa = whatsappUrl(influencer.whatsapp || influencer.contact, text);
  const missing = [
    !ctx.campanha && "campanha",
    !ctx.cupom && "cupom",
  ].filter(Boolean) as string[];

  function calUrl(title: string, date: string, details: string) {
    const d = date.replace(/-/g, "");
    const next = new Date(date + "T12:00:00"); next.setDate(next.getDate() + 1);
    const e = next.toISOString().slice(0, 10).replace(/-/g, "");
    const q = new URLSearchParams({ action: "TEMPLATE", text: title, dates: `${d}/${e}`, details });
    return `https://calendar.google.com/calendar/render?${q.toString()}`;
  }
  const who = `${influencer.name} (@${(influencer.username || "").replace(/^@/, "")})`;
  const camp = campaign?.name ? ` · ${campaign.name}` : "";
  const reminders = [
    { label: "Follow-up", date: dFollow, set: setDFollow, title: `Follow-up: ${influencer.name}${camp}`, details: `Retomar contato com ${who}.` },
    { label: "Prazo de postagem", date: dPost, set: setDPost, title: `Postagem: ${influencer.name}${camp}`, details: `Prazo de postagem de ${who}.` },
    { label: "Envio da permuta", date: dShip, set: setDShip, title: `Enviar permuta: ${influencer.name}${camp}`, details: `Enviar peças para ${who}${ctx.produto ? ` (${ctx.produto})` : ""}.` },
  ];

  async function copy() {
    await navigator.clipboard.writeText(text);
    toast({ title: "Mensagem copiada!", description: "É só colar na conversa." });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Mensagem para {influencer.name}</DialogTitle>
          <DialogDescription>
            Preenchida com os dados da campanha e do histórico. Você pode editar antes de copiar.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge variant={scenario === "recorrente" ? "default" : "secondary"}>
            {scenario === "recorrente" ? `Já trabalhamos (${base.history.length}x)` : "Primeiro contato"}
          </Badge>
          {base.history[0] && scenario === "recorrente" && (
            <span className="text-muted-foreground">
              Última: {base.history[0].campaignName}{base.history[0].deal ? ` · ${DEAL_LABEL[base.history[0].deal]}` : ""}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Modelo</Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SMART_TEMPLATES.map((t) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
                {userTemplates.map((t) => <SelectItem key={t.id} value={t.id}>{t.title} (meu modelo)</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Relação</Label>
            <Select value={scenario} onValueChange={(v) => setScenario(v as Scenario)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="novo">Primeiro contato</SelectItem>
                <SelectItem value="recorrente">Já trabalhamos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Tipo de parceria</Label>
            <Select value={deal} onValueChange={(v) => setDeal(v as Deal)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(DEAL_LABEL) as Deal[]).map((d) => <SelectItem key={d} value={d}>{DEAL_LABEL[d]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={11} className="text-sm" />
        {missing.length > 0 && (
          <p className="text-xs text-muted-foreground">Sem {missing.join(" e ")} para este creator; a mensagem foi gerada sem essa parte.</p>
        )}

        <div className="flex flex-wrap gap-2 justify-end">
          <Button variant="outline" onClick={copy}><Copy className="h-4 w-4 mr-1" /> Copiar</Button>
          <Button variant="outline" asChild>
            <a href={instagramUrl(influencer)} target="_blank" rel="noreferrer" onClick={copy}>
              <Instagram className="h-4 w-4 mr-1" /> Copiar e abrir Instagram
            </a>
          </Button>
          {wa ? (
            <Button asChild>
              <a href={wa} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4 mr-1" /> Abrir no WhatsApp</a>
            </Button>
          ) : (
            <Button disabled title="Sem WhatsApp cadastrado"><MessageCircle className="h-4 w-4 mr-1" /> Sem WhatsApp</Button>
          )}
        </div>

        <div className="border-t pt-3 space-y-2">
          <Label className="text-xs flex items-center gap-1"><CalendarPlus className="h-3.5 w-3.5" /> Lembrar no Google Agenda</Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {reminders.map((r) => (
              <div key={r.label} className="space-y-1">
                <p className="text-[11px] text-muted-foreground">{r.label}</p>
                <Input type="date" value={r.date} onChange={(e) => r.set(e.target.value)} className="h-8 text-xs" />
                <Button size="sm" variant="outline" className="w-full h-7 text-xs" disabled={!r.date} asChild={!!r.date}>
                  {r.date ? <a href={calUrl(r.title, r.date, r.details)} target="_blank" rel="noreferrer">Criar lembrete</a> : <span>Criar lembrete</span>}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
