import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { normalizeSearch } from "@/lib/utils";
import { NICHES } from "@/types";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { useMemo, useState } from "react";

interface Props {
  value: string[];
  onChange: (value: string[]) => void;
  max?: number;
  options?: string[];
  searchable?: boolean;
}

export function NicheMultiSelect({ value, onChange, max = 3, options = NICHES, searchable = false }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const sortedOptions = useMemo(
    () => [...new Set([...value, ...options])].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [options, value],
  );
  const filteredOptions = useMemo(() => {
    const query = normalizeSearch(search);
    return query ? sortedOptions.filter((niche) => normalizeSearch(niche).includes(query)) : sortedOptions;
  }, [search, sortedOptions]);

  function toggle(niche: string) {
    if (value.includes(niche)) {
      onChange(value.filter((v) => v !== niche));
    } else if (value.length < max) {
      onChange([...value, niche]);
    }
  }

  function remove(niche: string) {
    onChange(value.filter((v) => v !== niche));
  }

  return (
    <Popover open={open} onOpenChange={(nextOpen) => { setOpen(nextOpen); if (!nextOpen) setSearch(""); }}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="w-full justify-between h-auto min-h-9 text-xs font-normal"
        >
          <div className="flex flex-wrap gap-1">
            {value.length === 0 && <span className="text-muted-foreground">Selecionar nichos</span>}
            {value.map((v) => (
              <Badge key={v} variant="secondary" className="text-[10px] gap-1 px-1.5">
                {v}
                <X
                  className="h-2.5 w-2.5 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(v);
                  }}
                />
              </Badge>
            ))}
          </div>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        {searchable && (
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar categoria..."
              className="h-8 pl-8 text-xs"
              autoFocus
            />
          </div>
        )}
        <p className="text-[10px] text-muted-foreground mb-1.5 px-1">
          Máximo {max} nichos ({value.length}/{max})
        </p>
        <div className="space-y-0.5 max-h-48 overflow-y-auto">
          {filteredOptions.length === 0 && (
            <p className="px-2 py-4 text-center text-xs text-muted-foreground">Nenhuma categoria encontrada</p>
          )}
          {filteredOptions.map((niche) => {
            const selected = value.includes(niche);
            const disabled = !selected && value.length >= max;
            return (
              <Button
                type="button"
                variant="ghost"
                key={niche}
                onClick={() => toggle(niche)}
                disabled={disabled}
                className={`h-auto w-full justify-start gap-2 rounded px-2 py-1.5 text-xs font-normal ${
                  selected ? "bg-primary/10 text-foreground" : disabled ? "opacity-40 cursor-not-allowed" : "hover:bg-secondary text-foreground"
                }`}
              >
                <div className={`flex h-3.5 w-3.5 items-center justify-center rounded-sm border ${selected ? "bg-primary border-primary" : "border-muted-foreground/30"}`}>
                  {selected && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                </div>
                {niche}
              </Button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
