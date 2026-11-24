import { useMemo, useState } from "react";
import { Check, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { normalizeSearch } from "@/lib/utils";

interface CatalogManagerProps {
  items: string[];
  singular: string;
  placeholder: string;
  searchable?: boolean;
  onChange: (items: string[]) => void;
  onNotify: (message: string, destructive?: boolean) => void;
}

const sortItems = (items: string[]) => [...items].sort((a, b) => a.localeCompare(b, "pt-BR"));

export function CatalogManager({ items, singular, placeholder, searchable = false, onChange, onNotify }: CatalogManagerProps) {
  const [newValue, setNewValue] = useState("");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [removing, setRemoving] = useState<string | null>(null);

  const visibleItems = useMemo(() => {
    const sorted = sortItems(items);
    if (!searchable || !search.trim()) return sorted;
    const query = normalizeSearch(search);
    return sorted.filter((item) => normalizeSearch(item).includes(query));
  }, [items, search, searchable]);

  function add() {
    const value = newValue.trim();
    if (!value) return;
    if (items.some((item) => normalizeSearch(item) === normalizeSearch(value))) {
      onNotify(`${singular} já cadastrada.`, true);
      return;
    }
    onChange(sortItems([...items, value]));
    setNewValue("");
    onNotify(`${singular} adicionada com sucesso.`);
  }

  function saveEdit() {
    if (!editing) return;
    const value = editingValue.trim();
    if (!value) return;
    if (items.some((item) => item !== editing && normalizeSearch(item) === normalizeSearch(value))) {
      onNotify(`${singular} já cadastrada.`, true);
      return;
    }
    onChange(sortItems(items.map((item) => item === editing ? value : item)));
    setEditing(null);
    onNotify(`${singular} atualizada com sucesso.`);
  }

  function remove() {
    if (!removing) return;
    onChange(items.filter((item) => item !== removing));
    setRemoving(null);
    onNotify(`${singular} removida. Os perfis existentes não foram alterados.`);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input value={newValue} onChange={(event) => setNewValue(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") add(); }} placeholder={placeholder} />
        <Button onClick={add} className="shrink-0 gap-2"><Plus className="h-4 w-4" /> Adicionar</Button>
      </div>

      {searchable && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar categoria" className="pl-9" />
        </div>
      )}

      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader><TableRow><TableHead>{singular}</TableHead><TableHead className="w-24 text-right">Ações</TableHead></TableRow></TableHeader>
          <TableBody>
            {visibleItems.length === 0 && <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground">Nenhum item encontrado.</TableCell></TableRow>}
            {visibleItems.map((item) => (
              <TableRow key={item}>
                <TableCell>
                  {editing === item ? <Input value={editingValue} onChange={(event) => setEditingValue(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") saveEdit(); }} className="h-8" autoFocus /> : item}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    {editing === item ? (
                      <>
                        <Button size="icon" variant="ghost" onClick={saveEdit} aria-label="Salvar"><Check className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => setEditing(null)} aria-label="Cancelar"><X className="h-4 w-4" /></Button>
                      </>
                    ) : (
                      <>
                        <Button size="icon" variant="ghost" onClick={() => { setEditing(item); setEditingValue(item); }} aria-label={`Editar ${item}`}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setRemoving(item)} aria-label={`Remover ${item}`}><Trash2 className="h-4 w-4" /></Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!removing} onOpenChange={(open) => { if (!open) setRemoving(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover {singular.toLowerCase()}</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja remover “{removing}”? Perfis já salvos com esse valor não serão alterados.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={remove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}