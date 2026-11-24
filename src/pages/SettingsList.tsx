import { useState } from "react";
import { ArrowLeft, Check, Pencil, Plus, Store, Trash2, UserCog, X } from "lucide-react";
import { Link, Navigate, useParams } from "react-router-dom";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CatalogManager } from "@/components/CatalogManager";
import { useApp } from "@/context/AppContext";
import { useToast } from "@/hooks/use-toast";

type CatalogKey = "locations" | "genders" | "categories";

const catalogPages: Record<string, { key: CatalogKey; title: string; description: string; singular: string; placeholder: string; searchable?: boolean }> = {
  localizacoes: {
    key: "locations",
    title: "Localizações",
    description: "Opções disponíveis no cadastro e na edição dos influenciadores.",
    singular: "Localização",
    placeholder: "Estado / Cidade",
  },
  generos: {
    key: "genders",
    title: "Gêneros",
    description: "Opções de gênero disponíveis nos perfis de influenciadores.",
    singular: "Opção de gênero",
    placeholder: "Nova opção de gênero",
  },
  categorias: {
    key: "categories",
    title: "Nichos / Categorias",
    description: "Categorias usadas para organizar e segmentar influenciadores.",
    singular: "Categoria",
    placeholder: "Nova categoria ou nicho",
    searchable: true,
  },
};

function SettingsBackHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm" className="-ml-3 w-fit gap-2 text-muted-foreground">
        <Link to="/settings"><ArrowLeft className="h-4 w-4" /> Voltar para Configurações</Link>
      </Button>
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function UnitsSettings() {
  const { storeUnits, setStoreUnits } = useApp();
  const { toast } = useToast();
  const [newUnit, setNewUnit] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [unitToRemove, setUnitToRemove] = useState<string | null>(null);

  function addUnit() {
    const value = newUnit.trim();
    if (!value) return;
    if (storeUnits.some((unit) => unit.toLowerCase() === value.toLowerCase())) {
      toast({ description: "Esta unidade já está cadastrada.", variant: "destructive" });
      return;
    }
    setStoreUnits([...storeUnits, value]);
    setNewUnit("");
    toast({ description: "Unidade adicionada!" });
  }

  function saveEdit(index: number) {
    const value = editingValue.trim();
    if (!value) return;
    const next = [...storeUnits];
    next[index] = value;
    setStoreUnits(next);
    setEditingIndex(null);
    toast({ description: "Unidade atualizada!" });
  }

  function confirmRemove() {
    if (!unitToRemove) return;
    setStoreUnits(storeUnits.filter((unit) => unit !== unitToRemove));
    setUnitToRemove(null);
    toast({ description: "Unidade removida." });
  }

  return (
    <div className="max-w-3xl space-y-6">
      <SettingsBackHeader title="Unidades" description="Unidades usadas em envios, campanhas e visitas em loja." />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Store className="h-4 w-4" /> Gerenciar unidades</CardTitle>
          <CardDescription>Adicione, edite ou remova uma unidade.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input value={newUnit} onChange={(event) => setNewUnit(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") addUnit(); }} placeholder="Nome da nova unidade" />
            <Button onClick={addUnit} className="shrink-0 gap-2"><Plus className="h-4 w-4" /> Adicionar</Button>
          </div>
          <div className="divide-y divide-border overflow-hidden rounded-md border">
            {storeUnits.length === 0 && <p className="p-4 text-sm text-muted-foreground">Nenhuma unidade cadastrada.</p>}
            {storeUnits.map((unit, index) => (
              <div key={`${unit}-${index}`} className="flex min-h-12 items-center gap-2 p-3">
                {editingIndex === index ? (
                  <>
                    <Input value={editingValue} onChange={(event) => setEditingValue(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") saveEdit(index); }} className="h-8 text-sm" autoFocus />
                    <Button size="icon" variant="ghost" onClick={() => saveEdit(index)} aria-label="Salvar unidade"><Check className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => setEditingIndex(null)} aria-label="Cancelar edição"><X className="h-4 w-4" /></Button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm">{unit}</span>
                    <Button size="icon" variant="ghost" onClick={() => { setEditingIndex(index); setEditingValue(unit); }} aria-label={`Editar ${unit}`}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setUnitToRemove(unit)} aria-label={`Remover ${unit}`}><Trash2 className="h-4 w-4" /></Button>
                  </>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <AlertDialog open={!!unitToRemove} onOpenChange={(open) => { if (!open) setUnitToRemove(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover unidade</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja remover “{unitToRemove}”? Registros já salvos com ela não serão alterados.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TeamSettings() {
  const { teamMembers, setTeamMembers } = useApp();
  const { toast } = useToast();
  const [newMember, setNewMember] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null);

  function addMember() {
    const value = newMember.trim();
    if (!value) return;
    if (teamMembers.some((member) => member.toLocaleLowerCase("pt-BR") === value.toLocaleLowerCase("pt-BR"))) {
      toast({ description: "Este membro já está cadastrado.", variant: "destructive" });
      return;
    }
    setTeamMembers([...teamMembers, value]);
    setNewMember("");
    toast({ description: "Membro adicionado!" });
  }

  function saveEdit(index: number) {
    const value = editingValue.trim();
    if (!value) return;
    if (teamMembers.some((member, memberIndex) => memberIndex !== index && member.toLocaleLowerCase("pt-BR") === value.toLocaleLowerCase("pt-BR"))) {
      toast({ description: "Este membro já está cadastrado.", variant: "destructive" });
      return;
    }
    const next = [...teamMembers];
    next[index] = value;
    setTeamMembers(next);
    setEditingIndex(null);
    toast({ description: "Membro atualizado!" });
  }

  function confirmRemove() {
    if (!memberToRemove) return;
    setTeamMembers(teamMembers.filter((member) => member !== memberToRemove));
    setMemberToRemove(null);
    toast({ description: "Membro removido. Comentários anteriores foram preservados." });
  }

  return (
    <div className="max-w-3xl space-y-6">
      <SettingsBackHeader title="Membros da Equipe" description="Pessoas disponíveis para assinar comentários nas campanhas." />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><UserCog className="h-4 w-4" /> Gerenciar membros</CardTitle>
          <CardDescription>Adicione, edite ou remova um nome da lista.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input value={newMember} onChange={(event) => setNewMember(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") addMember(); }} placeholder="Nome do novo membro" />
            <Button onClick={addMember} className="shrink-0 gap-2"><Plus className="h-4 w-4" /> Adicionar</Button>
          </div>
          <div className="divide-y divide-border overflow-hidden rounded-md border">
            {teamMembers.map((member, index) => (
              <div key={`${member}-${index}`} className="flex min-h-12 items-center gap-2 p-3">
                {editingIndex === index ? (
                  <><Input value={editingValue} onChange={(event) => setEditingValue(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") saveEdit(index); }} className="h-8 text-sm" autoFocus /><Button size="icon" variant="ghost" onClick={() => saveEdit(index)} aria-label="Salvar membro"><Check className="h-4 w-4" /></Button><Button size="icon" variant="ghost" onClick={() => setEditingIndex(null)} aria-label="Cancelar edição"><X className="h-4 w-4" /></Button></>
                ) : (
                  <><span className="flex-1 text-sm">{member}</span><Button size="icon" variant="ghost" onClick={() => { setEditingIndex(index); setEditingValue(member); }} aria-label={`Editar ${member}`}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" className="text-destructive" onClick={() => setMemberToRemove(member)} aria-label={`Remover ${member}`}><Trash2 className="h-4 w-4" /></Button></>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <AlertDialog open={!!memberToRemove} onOpenChange={(open) => { if (!open) setMemberToRemove(null); }}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Remover membro</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja remover “{memberToRemove}”? Os comentários já publicados continuarão visíveis.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={confirmRemove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remover</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function SettingsList() {
  const { section } = useParams();
  const { catalogs, setCatalogs } = useApp();
  const { toast } = useToast();

  if (section === "unidades") return <UnitsSettings />;
  if (section === "equipe") return <TeamSettings />;
  const page = section ? catalogPages[section] : undefined;
  if (!page) return <Navigate to="/settings" replace />;

  const items = catalogs[page.key];
  return (
    <div className="max-w-3xl space-y-6">
      <SettingsBackHeader title={page.title} description={page.description} />
      <Card>
        <CardContent className="pt-6">
          <CatalogManager
            items={items}
            singular={page.singular}
            placeholder={page.placeholder}
            searchable={page.searchable}
            onChange={(nextItems) => setCatalogs({ ...catalogs, [page.key]: nextItems })}
            onNotify={(message, destructive) => toast({ description: message, variant: destructive ? "destructive" : "default" })}
          />
        </CardContent>
      </Card>
    </div>
  );
}