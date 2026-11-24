import { useState, useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { Task } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, Edit, CheckCircle2, ListChecks, Zap, ArrowRight } from "lucide-react";
import { parseLocalDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

function todayStr() { return new Date().toISOString().split("T")[0]; }

export default function Tasks() {
  const { tasks, addTask, updateTask, deleteTask, toggleTaskComplete } = useApp();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [form, setForm] = useState({ title: "", description: "", deadline: todayStr() });

  const activeTasks = useMemo(
    () => tasks.filter((t) => !t.completed).sort((a, b) => a.deadline.localeCompare(b.deadline)),
    [tasks]
  );
  const doneTasks = useMemo(
    () => tasks.filter((t) => t.completed).sort((a, b) => (b.completedAt || "").localeCompare(a.completedAt || "")),
    [tasks]
  );

  function openNew() {
    setEditing(null);
    setForm({ title: "", description: "", deadline: todayStr() });
    setDialogOpen(true);
  }

  function openEdit(t: Task) {
    setEditing(t);
    setForm({ title: t.title, description: t.description, deadline: t.deadline });
    setDialogOpen(true);
  }

  function save() {
    if (!form.title.trim() || !form.deadline) {
      toast({ description: "Informe título e prazo.", variant: "destructive" });
      return;
    }
    if (editing) {
      updateTask({ ...editing, title: form.title.trim(), description: form.description.trim(), deadline: form.deadline });
      toast({ description: "Tarefa atualizada." });
    } else {
      addTask({ title: form.title.trim(), description: form.description.trim(), deadline: form.deadline });
      toast({ description: "Tarefa criada." });
    }
    setDialogOpen(false);
  }

  function renderTask(t: Task) {
    const today = todayStr();
    const isOverdue = !t.completed && t.deadline < today;
    const isToday = !t.completed && t.deadline === today;
    return (
      <Card
        key={t.id}
        className={`${isOverdue ? "border-destructive/40 bg-destructive/5" : isToday ? "border-amber-300 bg-amber-50/40" : ""}`}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Checkbox
              checked={t.completed}
              onCheckedChange={() => toggleTaskComplete(t.id)}
              className="mt-0.5"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className={`text-sm font-semibold ${t.completed ? "line-through text-muted-foreground" : ""}`}>{t.title}</p>
                {t.source && (
                  <Badge variant="outline" className="text-[10px] gap-1 bg-blue-50 text-blue-700 border-blue-200">
                    <Zap className="h-2.5 w-2.5" /> auto
                  </Badge>
                )}
                {isOverdue && <Badge variant="outline" className="text-[10px] bg-red-100 text-red-700 border-red-300">Atrasada</Badge>}
                {isToday && <Badge variant="outline" className="text-[10px] bg-amber-100 text-amber-800 border-amber-300">Hoje</Badge>}
              </div>
              {t.description && <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-wrap">{t.description}</p>}
              <p className="text-[11px] text-muted-foreground mt-1">
                Prazo: {parseLocalDate(t.deadline).toLocaleDateString("pt-BR")}
                {t.completed && t.completedAt && ` · concluída em ${new Date(t.completedAt).toLocaleDateString("pt-BR")}`}
              </p>
              {t.link && !t.completed && (
                <Link to={t.link}>
                  <Button variant="link" size="sm" className="h-6 px-0 text-xs gap-1">
                    Ir para item <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              )}
            </div>
            <div className="flex gap-1 shrink-0">
              {!t.source && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(t)} title="Editar">
                  <Edit className="h-3.5 w-3.5" />
                </Button>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir tarefa?</AlertDialogTitle>
                    <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteTask(t.id)}>Excluir</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><ListChecks className="h-6 w-6" /> Tarefas</h1>
          <p className="text-sm text-muted-foreground">Tarefas manuais e automatizadas da plataforma</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Nova tarefa</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar tarefa" : "Nova tarefa"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Título</Label>
                <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Descrição</Label>
                <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="min-h-[80px]" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Prazo</Label>
                <Input type="date" value={form.deadline} onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={save}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="ativas">
        <TabsList>
          <TabsTrigger value="ativas">Ativas ({activeTasks.length})</TabsTrigger>
          <TabsTrigger value="concluidas">Concluídas ({doneTasks.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="ativas" className="mt-4 space-y-2">
          {activeTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma tarefa ativa.</p>
          ) : activeTasks.map(renderTask)}
        </TabsContent>
        <TabsContent value="concluidas" className="mt-4 space-y-2">
          {doneTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma tarefa concluída.</p>
          ) : doneTasks.map(renderTask)}
        </TabsContent>
      </Tabs>
    </div>
  );
}
