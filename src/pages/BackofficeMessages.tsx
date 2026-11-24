import { useState, useEffect, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ClipboardPenLine, Copy, Plus, Trash2, MessageSquare, Pencil } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useApp } from "@/context/AppContext";
import type { MessageTemplate } from "@/types";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const DEFAULT_TEMPLATES: MessageTemplate[] = [
  {
    id: "1",
    title: "Primeiro Contato",
    category: "Prospecção",
    body: `Oi, {nome}! Tudo bem? 😊

Somos da Noha Shoes e adoramos o seu conteúdo! Estamos buscando parceiros que combinam com a nossa marca e achamos que você seria incrível.

Gostaríamos de conversar sobre uma possível parceria. Podemos marcar um bate-papo?

Abraços,
Equipe Noha Shoes`,
  },
  {
    id: "2",
    title: "Convite para Nova Campanha",
    category: "Campanha",
    body: `Oi, {nome}! 🎉

Estamos lançando uma nova campanha e gostaríamos muito de contar com você!

📌 Campanha: {campanha}
📅 Prazo: {prazo}
📦 Enviaremos os produtos para criação do conteúdo

Tem interesse? Vamos alinhar os detalhes!

Abraços,
Equipe Noha Shoes`,
  },
  {
    id: "3",
    title: "Cobrança de Conteúdo",
    category: "Follow-up",
    body: `Oi, {nome}! Tudo bem?

Passando para lembrar sobre o conteúdo da campanha "{campanha}" 📸

O prazo de entrega é {prazo} e queremos garantir que tudo saia perfeito! Precisa de algo da nossa parte?

Fico no aguardo!
Equipe Noha Shoes`,
  },
  {
    id: "4",
    title: "Agradecimento pós-campanha",
    category: "Pós-campanha",
    body: `Oi, {nome}! 💛

Queremos agradecer demais pela parceria na campanha "{campanha}"! O conteúdo ficou incrível e estamos muito felizes com o resultado.

Esperamos trabalhar juntos novamente em breve!

Um abraço,
Equipe Noha Shoes`,
  },
  {
    id: "5",
    title: "Envio de Briefing",
    category: "Campanha",
    body: `Oi, {nome}! 📋

Segue o briefing da campanha "{campanha}":

✅ Formato: {formato}
✅ Prazo de entrega: {prazo}
✅ Diretrizes: Usar hashtag #{hashtag} e marcar @nohashoes
✅ Produto: Será enviado para o endereço cadastrado

Qualquer dúvida, estamos à disposição!

Equipe Noha Shoes`,
  },
];

const CATEGORIES = ["Prospecção", "Campanha", "Follow-up", "Pós-campanha", "Outro"];

export default function BackofficeMessages() {
  const { messageTemplates, setMessageTemplates, loaded } = useApp();
  const templates = messageTemplates ?? DEFAULT_TEMPLATES;

  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Outro");
  const [body, setBody] = useState("");
  const [fillTemplate, setFillTemplate] = useState<MessageTemplate | null>(null);
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [deleteTemplate, setDeleteTemplate] = useState<MessageTemplate | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const variables = useMemo(() => {
    if (!fillTemplate) return [];
    return Array.from(new Set(Array.from(fillTemplate.body.matchAll(/\{([^{}]+)\}/g), (match) => match[1].trim()).filter(Boolean)));
  }, [fillTemplate]);

  const filledText = useMemo(() => {
    if (!fillTemplate) return "";
    return fillTemplate.body.replace(/\{([^{}]+)\}/g, (placeholder, variable: string) => variableValues[variable.trim()] || placeholder);
  }, [fillTemplate, variableValues]);

  // One-time seed: if the cloud has no templates yet but legacy localStorage has them,
  // migrate them. Otherwise seed with defaults on first use.
  useEffect(() => {
    if (!loaded || messageTemplates !== null) return;
    try {
      const legacy = localStorage.getItem("noha-templates");
      if (legacy) {
        const parsed = JSON.parse(legacy) as MessageTemplate[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessageTemplates(parsed);
          localStorage.removeItem("noha-templates");
          return;
        }
      }
    } catch {
      // ignore
    }
    setMessageTemplates(DEFAULT_TEMPLATES);
  }, [loaded, messageTemplates, setMessageTemplates]);

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado!", description: "Mensagem copiada para a área de transferência." });
  }

  function handleSave() {
    if (!title || !body) return;
    let updated: MessageTemplate[];
    if (editingId) {
      updated = templates.map((t) => t.id === editingId ? { ...t, title, category, body } : t);
    } else {
      updated = [...templates, { id: Date.now().toString(), title, category, body }];
    }
    setMessageTemplates(updated);
    resetForm();
  }

  function handleEdit(t: MessageTemplate) {
    setEditingId(t.id);
    setTitle(t.title);
    setCategory(t.category);
    setBody(t.body);
    setCreating(true);
    window.requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function handleDelete() {
    if (!deleteTemplate) return;
    setMessageTemplates(templates.filter((template) => template.id !== deleteTemplate.id));
    setDeleteTemplate(null);
    toast({ title: "Modelo excluído", description: "O modelo foi removido com sucesso." });
  }

  function openFillDialog(template: MessageTemplate) {
    setVariableValues({});
    setFillTemplate(template);
  }

  async function copyFilledText() {
    await navigator.clipboard.writeText(filledText);
    toast({ title: "Texto copiado!", description: "O texto final foi enviado para a área de transferência." });
  }

  function resetForm() {
    setCreating(false);
    setEditingId(null);
    setTitle("");
    setCategory("Outro");
    setBody("");
  }

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-3 w-fit gap-2 text-muted-foreground">
        <Link to="/settings"><ArrowLeft className="h-4 w-4" /> Voltar para Configurações</Link>
      </Button>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Modelos de Mensagens</h1>
          <p className="text-sm text-muted-foreground">Templates prontos para comunicação com influenciadores</p>
        </div>
        {!creating && (
          <Button size="sm" className="gap-2" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" />
            Novo Modelo
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Use variáveis como <code className="rounded bg-secondary px-1 py-0.5">{"{nome}"}</code>, <code className="rounded bg-secondary px-1 py-0.5">{"{campanha}"}</code>, <code className="rounded bg-secondary px-1 py-0.5">{"{prazo}"}</code> nos templates.
      </p>

      {creating && (
        <Card ref={formRef} className="scroll-mt-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {editingId ? "Editar modelo" : "Novo modelo"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Título</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Primeiro contato" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Categoria</Label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Mensagem</Label>
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} placeholder="Escreva o template da mensagem..." />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave}>{editingId ? "Atualizar" : "Salvar"}</Button>
              <Button variant="outline" onClick={resetForm}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {templates.map((t) => (
          <Card key={t.id} className="transition-colors hover:border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="rounded-lg bg-secondary p-2 text-primary mt-0.5">
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{t.title}</p>
                      <Badge variant="outline" className="text-[10px]">{t.category}</Badge>
                    </div>
                    <pre className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground font-sans leading-relaxed">
                      {t.body}
                    </pre>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={() => handleCopy(t.body)}>
                    <Copy className="h-3.5 w-3.5" />
                    Copiar
                  </Button>
                  <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={() => openFillDialog(t)}>
                    <ClipboardPenLine className="h-3.5 w-3.5" />
                    Preencher
                  </Button>
                  <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={() => handleEdit(t)}>
                    <Pencil className="h-3.5 w-3.5" />
                    Editar
                  </Button>
                  <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-destructive" onClick={() => setDeleteTemplate(t)}>
                    <Trash2 className="h-3.5 w-3.5" />
                    Excluir
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!fillTemplate} onOpenChange={(open) => { if (!open) setFillTemplate(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Preencher modelo</DialogTitle>
            <DialogDescription>{fillTemplate?.title} — preencha as variáveis sem alterar o modelo original.</DialogDescription>
          </DialogHeader>

          {variables.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {variables.map((variable) => (
                <div key={variable} className="space-y-1.5">
                  <Label htmlFor={`template-variable-${variable}`} className="text-xs text-muted-foreground">
                    {variable.replace(/_/g, " ")}
                  </Label>
                  <Input
                    id={`template-variable-${variable}`}
                    value={variableValues[variable] || ""}
                    onChange={(event) => setVariableValues((current) => ({ ...current, [variable]: event.target.value }))}
                    placeholder={`Preencha ${variable.replace(/_/g, " ")}`}
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Este modelo não possui variáveis entre chaves.</p>
          )}

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Texto final</Label>
            <div className="min-h-40 whitespace-pre-wrap rounded-md border bg-muted/40 p-4 text-sm leading-relaxed" aria-live="polite">
              {filledText}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => void copyFilledText()} className="gap-2"><Copy className="h-4 w-4" /> Copiar Texto</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTemplate} onOpenChange={(open) => { if (!open) setDeleteTemplate(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir modelo</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir “{deleteTemplate?.title}”? Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
