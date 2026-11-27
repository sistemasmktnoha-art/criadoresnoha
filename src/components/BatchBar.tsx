import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { MessageSquare, X } from "lucide-react";
import { QUICK_ACTIONS, type QuickActionId } from "@/lib/quickLog";

interface Props {
  visibleIds: string[];
  selected: string[];
  setSelected: (ids: string[]) => void;
  onAction: (id: QuickActionId) => void;
  onGenerate: () => void;
}

export function BatchBar({ visibleIds, selected, setSelected, onAction, onGenerate }: Props) {
  const visibleSelected = visibleIds.filter((id) => selected.includes(id));
  const allChecked = visibleIds.length > 0 && visibleSelected.length === visibleIds.length;
  const count = selected.length;

  return (
    <div className="sticky top-0 z-20 -mx-1 mb-2 rounded-md border bg-background/95 px-3 py-2 shadow-sm backdrop-blur">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-xs cursor-pointer">
          <Checkbox
            checked={allChecked}
            onCheckedChange={(v) => {
              const rest = selected.filter((id) => !visibleIds.includes(id));
              setSelected(v ? [...rest, ...visibleIds] : rest);
            }}
          />
          Selecionar todos os visíveis ({visibleIds.length})
        </label>
        {count > 0 && (
          <>
            <span className="text-xs font-medium">{count} selecionado{count > 1 ? "s" : ""}</span>
            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => setSelected([])}>
              <X className="h-3 w-3" /> Limpar
            </Button>
          </>
        )}
      </div>
      {count > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t pt-2">
          <Button size="sm" className="h-7 text-xs gap-1" onClick={onGenerate}>
            <MessageSquare className="h-3 w-3" /> Gerar mensagens ({count})
          </Button>
          <span className="mx-1 text-xs text-muted-foreground">Registrar para todos:</span>
          {QUICK_ACTIONS.map((a) => (
            <Button key={a.id} size="sm" variant="outline" className="h-7 text-xs" onClick={() => onAction(a.id)}>
              {a.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
