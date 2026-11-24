import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Inbox, Send, User, Lightbulb, Link as LinkIcon, Eye, ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { supabase } from "@/integrations/supabase/client";

type Step = "form" | "preview" | "success";

const DEPOSIT_UNITS = [
  "Escritório",
  "Noha Conselheiro",
  "Noha Rosa e Silva",
  "Shopping Recife",
  "RioMar Recife",
  "Plaza Casa Forte",
  "Fortaleza",
  "Caruaru",
  "Midway Mall",
  "Natal Shopping",
  "Campina Grande",
  "João Pessoa",
  "Aracaju",
  "Maceió",
  "Goiânia",
  "Salvador",
  "Continental",
  "Villa Lobos",
  "Plaza Sul",
  "Joinville",
  "Balneário",
] as const;

export default function PublicInbox() {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("form");
  const [submitting, setSubmitting] = useState(false);

  const [authorName, setAuthorName] = useState("");
  const [authorUnit, setAuthorUnit] = useState("");
  const [link, setLink] = useState("");
  const [ideaType, setIdeaType] = useState<"influenciador" | "conteudo">("influenciador");
  const [observation, setObservation] = useState("");

  function resetForm() {
    setAuthorName("");
    setAuthorUnit("");
    setLink("");
    setIdeaType("influenciador");
    setObservation("");
    setStep("form");
  }

  const author = authorName.trim() + (authorUnit ? ` (${authorUnit})` : "");

  function handlePreview() {
    if (!authorName.trim() || !authorUnit || !link) {
      toast({ title: "Campos obrigatórios", description: "Informe seu nome, unidade e o link.", variant: "destructive" });
      return;
    }
    setStep("preview");
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("submit-public-idea", {
        body: { author, link, type: ideaType, observation: observation || undefined },
      });

      if (error) throw error;

      setStep("success");
    } catch (err) {
      console.error(err);
      toast({ title: "Erro ao enviar", description: "Tente novamente em instantes.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Toaster />

      {/* Header */}
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="mx-auto max-w-lg flex items-center gap-2">
          <span className="text-lg font-bold tracking-tight text-foreground">NOHA</span>
          <span className="text-xs font-medium text-muted-foreground">Creators</span>
          <span className="mx-2 text-border">|</span>
          <span className="text-sm text-muted-foreground">Caixa de Entrada</span>
        </div>
      </header>

      <main className="flex-1 flex items-start justify-center px-4 py-8">
        <div className="w-full max-w-lg space-y-6">

          {/* FORM STEP */}
          {step === "form" && (
            <>
              <div className="text-center space-y-1">
                <Inbox className="mx-auto h-8 w-8 text-primary" />
                <h1 className="text-xl font-bold tracking-tight text-foreground">Depositar Ideia</h1>
                <p className="text-sm text-muted-foreground">
                  Sugira um influenciador ou ideia de conteúdo para a equipe avaliar.
                </p>
              </div>

              <Card>
                <CardContent className="p-5 space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Seu nome *</Label>
                    <Input
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                      placeholder="Digite seu nome..."
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Unidade *</Label>
                    <Select value={authorUnit} onValueChange={setAuthorUnit}>
                      <SelectTrigger><SelectValue placeholder="Selecionar unidade..." /></SelectTrigger>
                      <SelectContent>
                        {DEPOSIT_UNITS.map((unit) => (
                          <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Link *</Label>
                    <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://instagram.com/..." />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Tipo</Label>
                    <Select value={ideaType} onValueChange={(v: "influenciador" | "conteudo") => setIdeaType(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="influenciador">Influenciador</SelectItem>
                        <SelectItem value="conteudo">Ideia de Conteúdo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Observação (opcional)</Label>
                    <Textarea value={observation} onChange={(e) => setObservation(e.target.value)} rows={3} placeholder="Alguma observação sobre a ideia..." />
                  </div>

                  <Button onClick={handlePreview} className="w-full gap-2">
                    <Eye className="h-4 w-4" /> Pré-visualizar
                  </Button>
                </CardContent>
              </Card>
            </>
          )}

          {/* PREVIEW STEP */}
          {step === "preview" && (
            <>
              <div className="text-center space-y-1">
                <Eye className="mx-auto h-8 w-8 text-primary" />
                <h1 className="text-xl font-bold tracking-tight text-foreground">Confirmar Envio</h1>
                <p className="text-sm text-muted-foreground">Revise os dados antes de enviar.</p>
              </div>

              <Card>
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    {ideaType === "influenciador" ? (
                      <Badge variant="outline" className="text-xs bg-amber-100 text-amber-800 border-amber-300">
                        <User className="h-3 w-3 mr-1" /> Influenciador
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs bg-stone-100 text-stone-600 border-stone-300">
                        <Lightbulb className="h-3 w-3 mr-1" /> Conteúdo
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Depositado por</p>
                    <p className="text-sm font-medium">{author}</p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Link</p>
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-sm text-primary hover:underline break-all"
                    >
                      <LinkIcon className="h-3 w-3 shrink-0" />
                      {link}
                    </a>
                  </div>

                  {observation && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Observação</p>
                      <p className="text-sm italic text-muted-foreground">{observation}</p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" onClick={() => setStep("form")} className="flex-1 gap-2">
                      <ArrowLeft className="h-4 w-4" /> Voltar
                    </Button>
                    <Button onClick={handleSubmit} disabled={submitting} className="flex-1 gap-2">
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Enviar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* SUCCESS STEP */}
          {step === "success" && (
            <div className="text-center space-y-4 py-12">
              <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
              <h1 className="text-xl font-bold tracking-tight text-foreground">Ideia Enviada!</h1>
              <p className="text-sm text-muted-foreground">
                Sua sugestão foi depositada na caixa de entrada e será avaliada pela equipe.
              </p>
              <Button onClick={resetForm} variant="outline" className="gap-2">
                <Inbox className="h-4 w-4" /> Depositar outra ideia
              </Button>
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-border py-4 text-center">
        <a
          href="https://noha.store"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          noha.store ↗
        </a>
      </footer>
    </div>
  );
}