import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Instagram, MessageCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useApp } from "@/context/AppContext";
import type { Campaign } from "@/types";
import { SMART_TEMPLATES, buildContext, renderUserTemplate, whatsappUrl, instagramUrl } from "@/lib/dmMessages";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  campaign: Campaign;
  ids: string[];
}

const AUTO = "auto";

export function BatchMessagesDialog({ open, onOpenChange, campaign, ids }: Props) {
  const { influencers, coupons, campaigns, messageTemplates } = useApp();
  const [templateId, setTemplateId] = useState(AUTO);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const userTemplates = useMemo(() => messageTemplates ?? [], [messageTemplates]);

  useEffect(() => { setEdits({}); }, [templateId, open]);

  const rows = useMemo(() => {
    return ids.flatMap((id) => {
      const inf = influencers.find((i) => i.id === id);
      const p = campaign.participants.find((x) => x.influencerId === id);
      if (!inf || !p) return [];
      const ctx = buildContext(inf, campaign, p, coupons, campaigns);
      const chosen = templateId === AUTO ? (p.viaAssessoria ? "smart-assessoria-convite" : "smart-convite") : templateId;
      const smart = SMART_TEMPLATES.find((t) => t.id === chosen);
      const user = userTemplates.find((t) => t.id === chosen);
      const text = smart ? smart.render(ctx) : user ? renderUserTemplate(user, ctx) : "";
      return [{ inf, p, ctx, text }];
    });
  }, [ids, influencers, campaign, coupons, campaigns, templateId, userTemplates]);

  const textOf = (id: string, def: string) => edits[id] ?? def;

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
    toast({ title: "Mensagem copiada!" });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[88vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Mensagens para {rows.length} participante{rows.length === 1 ? "" : "s"}</DialogTitle>
          <DialogDescription>
            Cada mensagem já vem com o nome, o histórico e o tipo de parceria de cada pessoa. Edite se precisar e copie ou abra a conversa.
          </DialogDescription>
        </DialogHeader>

        <Select value={templateId} onValueChange={setTemplateId}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={AUTO}>Automático (convite, ou convite de assessoria quando for via assessoria)</SelectItem>
            {SMART_TEMPLATES.map((t) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
            {userTemplates.map((t) => <SelectItem key={t.id} value={t.id}>{t.title} (meu modelo)</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {rows.map(({ inf, p, ctx, text }) => {
            const t = textOf(inf.id, text);
            const wa = whatsappUrl(inf.whatsapp || inf.contact, t);
            return (
              <div key={inf.id} className="rounded-md border p-2.5 space-y-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-sm font-medium">{inf.name}</span>
                  <Badge variant={ctx.scenario === "recorrente" ? "default" : "secondary"} className="text-[10px]">
                    {ctx.scenario === "recorrente" ? "Já trabalhamos" : "Primeiro contato"}
                  </Badge>
                  {p.viaAssessoria && <Badge variant="outline" className="text-[10px]">Via assessoria</Badge>}
                </div>
                <Textarea
                  value={t}
                  onChange={(e) => setEdits((prev) => ({ ...prev, [inf.id]: e.target.value }))}
                  rows={6}
                  className="text-xs"
                />
                <div className="flex flex-wrap justify-end gap-1.5">
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => copy(t)}>
                    <Copy className="h-3 w-3" /> Copiar
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" asChild>
                    <a href={instagramUrl(inf)} target="_blank" rel="noreferrer" onClick={() => navigator.clipboard.writeText(t)}>
                      <Instagram className="h-3 w-3" /> Copiar e abrir Instagram
                    </a>
                  </Button>
                  {wa ? (
                    <Button size="sm" className="h-7 text-xs gap-1" asChild>
                      <a href={wa} target="_blank" rel="noreferrer"><MessageCircle className="h-3 w-3" /> WhatsApp</a>
                    </Button>
                  ) : (
                    <Button size="sm" className="h-7 text-xs gap-1" disabled title="Sem WhatsApp cadastrado">
                      <MessageCircle className="h-3 w-3" /> Sem WhatsApp
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
