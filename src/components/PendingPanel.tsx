import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, FileSearch, Send, ClipboardList } from "lucide-react";
import { useApp } from "@/context/AppContext";

const DAY = 86400000;
const WAIT_DAYS = 3;
const LIMIT = 6;

interface Item {
  key: string;
  name: string;
  campaignId: string;
  campaignName: string;
  detail: string;
  sort: number;
}

function Section({ title, icon, items, empty }: { title: string; icon: React.ReactNode; items: Item[]; empty: string }) {
  const [all, setAll] = useState(false);
  const shown = all ? items : items.slice(0, LIMIT);
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          {icon} {title}
          <Badge variant="secondary" className="ml-auto">{items.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {items.length === 0 && <p className="text-xs text-muted-foreground">{empty}</p>}
        {shown.map((it) => (
          <Link
            key={it.key}
            to={`/campaign/${it.campaignId}?tab=participantes`}
            className="flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-xs hover:bg-muted/50"
          >
            <span className="min-w-0">
              <span className="font-medium block truncate">{it.name}</span>
              <span className="text-muted-foreground block truncate">{it.campaignName}</span>
            </span>
            <span className="shrink-0 text-muted-foreground">{it.detail}</span>
          </Link>
        ))}
        {items.length > LIMIT && (
          <Button variant="ghost" size="sm" className="h-7 w-full text-xs" onClick={() => setAll((v) => !v)}>
            {all ? "Ver menos" : `Ver todos (${items.length})`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function PendingPanel() {
  const { campaigns, influencers } = useApp();

  const { waiting, proposals, briefings } = useMemo(() => {
    const now = Date.now();
    const waiting: Item[] = [];
    const proposals: Item[] = [];
    const briefings: Item[] = [];
    const byId = new Map(influencers.map((i) => [i.id, i]));
    for (const c of campaigns) {
      if (c.status === "finalizada") continue;
      for (const p of c.participants || []) {
        if (p.selectionStatus === "nao_aprovado") continue;
        const inf = byId.get(p.influencerId);
        if (!inf) continue;
        const base = { name: inf.name, campaignId: c.id, campaignName: c.name };
        const at = p.lastContactAt ? new Date(p.lastContactAt).getTime() : null;
        const days = at ? Math.floor((now - at) / DAY) : null;

        if (p.contactStatus === "aguardando_retorno" && (days === null || days > WAIT_DAYS)) {
          waiting.push({ ...base, key: `w-${c.id}-${inf.id}`, detail: days === null ? "sem data" : `há ${days} dias`, sort: days === null ? -1 : days });
        }
        if (p.proposalPending) {
          proposals.push({ ...base, key: `p-${c.id}-${inf.id}`, detail: days === null ? "" : days === 0 ? "hoje" : `há ${days} dias`, sort: days ?? 0 });
        }
        if (p.negotiationStatus === "topou" && (p.briefingStatus || "pendente") === "pendente") {
          briefings.push({ ...base, key: `b-${c.id}-${inf.id}`, detail: p.viaAssessoria ? "via assessoria" : "", sort: 0 });
        }
      }
    }
    waiting.sort((a, b) => b.sort - a.sort);
    proposals.sort((a, b) => b.sort - a.sort);
    return { waiting, proposals, briefings };
  }, [campaigns, influencers]);

  if (!waiting.length && !proposals.length && !briefings.length) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
        <ClipboardList className="h-4 w-4" /> Pendências de contato
      </h2>
      <div className="grid gap-3 md:grid-cols-3">
        <Section title={`Aguardando retorno (+${WAIT_DAYS} dias)`} icon={<Clock className="h-4 w-4" />} items={waiting} empty="Ninguém esperando há mais de 3 dias." />
        <Section title="Propostas para analisar" icon={<FileSearch className="h-4 w-4" />} items={proposals} empty="Nenhuma proposta pendente." />
        <Section title="Briefings a enviar" icon={<Send className="h-4 w-4" />} items={briefings} empty="Nenhum briefing pendente." />
      </div>
    </div>
  );
}
