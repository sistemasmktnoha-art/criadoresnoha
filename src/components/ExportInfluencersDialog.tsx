import { useMemo, useState } from "react";
import jsPDF from "jspdf";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, FileDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NICHES, LOCATIONS, type Influencer } from "@/types";
import { toast } from "@/hooks/use-toast";
import { instagramProfileUrl } from "@/lib/utils";

const GENDERS = [
  { value: "feminino", label: "Feminino" },
  { value: "masculino", label: "Masculino" },
  { value: "outro", label: "Outro" },
];

const SIZES = [
  { value: "micro", label: "Micro (<50K)" },
  { value: "medio", label: "Médio (50K-200K)" },
  { value: "macro", label: "Macro (>200K)" },
];

function matchSize(followers: number, size: string) {
  if (size === "micro") return followers < 50000;
  if (size === "medio") return followers >= 50000 && followers < 200000;
  return followers >= 200000;
}

function CheckGroup({
  title,
  options,
  selected,
  onToggle,
}: {
  title: string;
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
        {options.map((o) => (
          <label key={o.value} className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox checked={selected.includes(o.value)} onCheckedChange={() => onToggle(o.value)} />
            <span className="truncate">{o.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

export function ExportInfluencersDialog({ influencers }: { influencers: Influencer[] }) {
  const [open, setOpen] = useState(false);
  const [locs, setLocs] = useState<string[]>([]);
  const [genders, setGenders] = useState<string[]>([]);
  const [niches, setNiches] = useState<string[]>([]);
  const [sizes, setSizes] = useState<string[]>([]);
  const [onlyActive, setOnlyActive] = useState(true);

  const toggle = (setter: React.Dispatch<React.SetStateAction<string[]>>) => (v: string) =>
    setter((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));

  const filtered = useMemo(() => {
    return influencers.filter((i) => {
      if (onlyActive && !i.isActive) return false;
      if (locs.length && !locs.includes(i.location)) return false;
      if (genders.length && !genders.includes(i.gender)) return false;
      if (niches.length && !(i.niche || "").split(", ").some((n) => niches.includes(n))) return false;
      if (sizes.length && !sizes.some((s) => matchSize(i.followers || 0, s))) return false;
      return true;
    });
  }, [influencers, locs, genders, niches, sizes, onlyActive]);

  function buildFilterLine() {
    const parts: string[] = [];
    if (locs.length) parts.push(`Regiões: ${locs.join(", ")}`);
    if (genders.length) parts.push(`Gênero: ${genders.join(", ")}`);
    if (niches.length) parts.push(`Nichos: ${niches.join(", ")}`);
    if (sizes.length) parts.push(`Tamanho: ${sizes.map((s) => SIZES.find((x) => x.value === s)?.label).join(", ")}`);
    if (onlyActive) parts.push("Somente ativos");
    return parts.length ? parts.join(" | ") : "Todos os influenciadores";
  }

  function exportPDF() {
    if (!filtered.length) {
      toast({ title: "Nenhum influenciador encontrado", description: "Ajuste os filtros e tente novamente." });
      return;
    }
    const doc = new jsPDF();
    const pageH = doc.internal.pageSize.getHeight();
    const now = new Date();
    let y = 18;

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Lista de Influenciadores", 14, y);
    y += 7;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(110);
    doc.text(`Extraído em ${now.toLocaleDateString("pt-BR")} às ${now.toLocaleTimeString("pt-BR")}`, 14, y);
    y += 5;
    const filterLines = doc.splitTextToSize(buildFilterLine(), 182) as string[];
    doc.text(filterLines, 14, y);
    y += filterLines.length * 4 + 3;
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text(`Total: ${filtered.length}`, 14, y);
    y += 8;

    const byRegion = new Map<string, Influencer[]>();
    filtered.forEach((i) => {
      const key = i.location || "Indefinido";
      if (!byRegion.has(key)) byRegion.set(key, []);
      byRegion.get(key)!.push(i);
    });
    const regions = [...byRegion.entries()].sort((a, b) => b[1].length - a[1].length);

    const newPageIfNeeded = (needed = 8) => {
      if (y + needed > pageH - 14) {
        doc.addPage();
        y = 18;
      }
    };

    regions.forEach(([region, list]) => {
      newPageIfNeeded(14);
      doc.setFillColor(245, 240, 230);
      doc.rect(12, y - 5, 186, 8, "F");
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(120, 80, 20);
      doc.text(`${region} (${list.length})`, 14, y);
      y += 9;
      doc.setTextColor(0);

      list
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach((inf) => {
          newPageIfNeeded();
          doc.setFontSize(10);
          doc.setFont("helvetica", "bold");
          doc.text(inf.name, 16, y);
          const nameW = doc.getTextWidth(inf.name);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(20, 80, 180);
          const handle = `@${(inf.username || "").replace(/^@/, "")}`;
          doc.textWithLink(handle, 18 + nameW, y, { url: instagramProfileUrl(inf.instagramUrl || inf.username) });
          doc.setTextColor(110);
          doc.text(inf.location || "-", 150, y);
          doc.setTextColor(0);
          y += 6;
        });
      y += 3;
    });

    doc.save(`influenciadores-${now.toISOString().slice(0, 10)}.pdf`);
    setOpen(false);
  }

  function exportCSV() {
    if (!filtered.length) {
      toast({ title: "Nenhum influenciador encontrado", description: "Ajuste os filtros e tente novamente." });
      return;
    }
    const rows = [
      ["Nome", "Usuário", "Link do perfil", "Região", "Seguidores", "Nicho", "Gênero"],
      ...filtered.map((i) => [
        i.name,
        `@${(i.username || "").replace(/^@/, "")}`,
        instagramProfileUrl(i.instagramUrl || i.username),
        i.location || "",
        String(i.followers || 0),
        i.niche || "",
        i.gender || "",
      ]),
    ];
    const csv = "\uFEFF" + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `influenciadores-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileDown className="h-4 w-4" />
          Exportar lista
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Exportar lista de influenciadores</DialogTitle>
          <DialogDescription>
            Selecione os filtros desejados. Sem seleção, todos são incluídos.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[55vh] pr-4">
          <div className="space-y-5">
            <CheckGroup
              title="Região"
              options={LOCATIONS.map((l) => ({ value: l, label: l }))}
              selected={locs}
              onToggle={toggle(setLocs)}
            />
            <CheckGroup title="Gênero" options={GENDERS} selected={genders} onToggle={toggle(setGenders)} />
            <CheckGroup title="Tamanho" options={SIZES} selected={sizes} onToggle={toggle(setSizes)} />
            <CheckGroup
              title="Nicho"
              options={NICHES.map((n) => ({ value: n, label: n }))}
              selected={niches}
              onToggle={toggle(setNiches)}
            />
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={onlyActive} onCheckedChange={(v) => setOnlyActive(!!v)} />
              Somente influenciadores ativos
            </label>
          </div>
        </ScrollArea>

        <DialogFooter className="flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <span className="text-sm text-muted-foreground">{filtered.length} influenciador(es) selecionado(s)</span>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={exportCSV}>
              <Download className="h-4 w-4" />
              Excel (CSV)
            </Button>
            <Button className="gap-2" onClick={exportPDF}>
              <FileDown className="h-4 w-4" />
              PDF
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
