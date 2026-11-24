import { useEffect, useMemo, useState } from "react";
import { HelpCircle, Search } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { normalizeSearch } from "@/lib/utils";
import { listFaqs, type Faq } from "@/lib/faqs";

export default function FaqPage() {
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    listFaqs().then(setFaqs).catch(() => setError("Não foi possível carregar o FAQ.")).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const words = normalizeSearch(query).split(/\s+/).filter(Boolean);
    if (!words.length) return faqs;
    return faqs.filter((f) => {
      const text = normalizeSearch(`${f.question} ${f.answer}`);
      return words.every((w) => text.includes(w));
    });
  }, [faqs, query]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <HelpCircle className="h-6 w-6 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-semibold">Ajuda / FAQ</h1>
          <p className="mt-1 text-sm text-muted-foreground">Encontre respostas para usar a plataforma por conta própria.</p>
        </div>
      </div>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por palavra-chave (ex: campanha, foto, métricas)..." className="h-12 pl-12 text-base" aria-label="Buscar no FAQ" />
      </div>
      {loading && <p className="text-sm text-muted-foreground">Carregando...</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
      {!loading && !error && filtered.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma pergunta encontrada.</p>}
      <Accordion type="multiple" className="rounded-lg border bg-card px-4">
        {filtered.map((f) => (
          <AccordionItem key={f.id} value={f.id} className="last:border-b-0">
            <AccordionTrigger className="text-left">{f.question}</AccordionTrigger>
            <AccordionContent className="whitespace-pre-line text-muted-foreground">{f.answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
