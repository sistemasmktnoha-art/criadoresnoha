import { useEffect, useState } from "react";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { deleteFaq, listFaqs, saveFaq, type Faq } from "@/lib/faqs";

export default function AdminFaq() {
  const { toast } = useToast();
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [editing, setEditing] = useState<{ id?: string; question: string; answer: string } | null>(null);
  const [toDelete, setToDelete] = useState<Faq | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () => listFaqs().then(setFaqs).catch(() => toast({ description: "Erro ao carregar FAQ.", variant: "destructive" }));
  useEffect(() => { load(); }, []);

  async function handleSave() {
    if (!editing || !editing.question.trim() || !editing.answer.trim()) {
      toast({ description: "Preencha pergunta e resposta.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const maxOrder = faqs.reduce((m, f) => Math.max(m, f.sort_order), 0);
      await saveFaq({ ...editing, question: editing.question.trim(), answer: editing.answer.trim(), sort_order: maxOrder + 1 });
      toast({ description: editing.id ? "Pergunta atualizada!" : "Pergunta criada!" });
      setEditing(null);
      load();
    } catch {
      toast({ description: "Não foi possível salvar.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    try {
      await deleteFaq(toDelete.id);
      toast({ description: "Pergunta excluída." });
      load();
    } catch {
      toast({ description: "Não foi possível excluir.", variant: "destructive" });
    }
    setToDelete(null);
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm" className="-ml-3 w-fit gap-2 text-muted-foreground">
          <Link to="/settings"><ArrowLeft className="h-4 w-4" /> Voltar para Configurações</Link>
        </Button>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Gerenciar FAQ</h1>
            <p className="mt-1 text-sm text-muted-foreground">Crie, edite e exclua os tópicos exibidos na página de Ajuda.</p>
          </div>
          <Button onClick={() => setEditing({ question: "", answer: "" })} className="gap-2"><Plus className="h-4 w-4" /> Nova pergunta</Button>
        </div>
      </div>
      <Card>
        <CardContent className="divide-y p-0">
          {faqs.length === 0 && <p className="p-4 text-sm text-muted-foreground">Nenhuma pergunta cadastrada.</p>}
          {faqs.map((f) => (
            <div key={f.id} className="flex items-start gap-2 p-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{f.question}</p>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{f.answer}</p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => setEditing({ id: f.id, question: f.question, answer: f.answer })} aria-label={`Editar ${f.question}`}><Pencil className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setToDelete(f)} aria-label={`Excluir ${f.question}`}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editing?.id ? "Editar pergunta" : "Nova pergunta"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="faq-q">Pergunta</Label>
              <Input id="faq-q" value={editing?.question || ""} onChange={(e) => setEditing((p) => p && { ...p, question: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="faq-a">Resposta</Label>
              <Textarea id="faq-a" rows={8} value={editing?.answer || ""} onChange={(e) => setEditing((p) => p && { ...p, answer: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => { if (!o) setToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir pergunta</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir “{toDelete?.question}”?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
