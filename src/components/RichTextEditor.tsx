import { useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Bold, Italic, Underline, Strikethrough, Heading1, Heading2, Heading3 } from "lucide-react";

const HIGHLIGHT_COLORS = [
  { name: "Amarelo", color: "#fef08a" },
  { name: "Verde", color: "#bbf7d0" },
  { name: "Azul", color: "#bfdbfe" },
  { name: "Rosa", color: "#fbcfe8" },
  { name: "Roxo", color: "#ddd6fe" },
];

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastEmittedRef = useRef<string>(value || "");

  // Sync external value into editor ONLY when it differs from current DOM content.
  // This avoids resetting the DOM (and caret) on every keystroke when the parent
  // re-renders with the same value we just emitted.
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    const incoming = value || "";
    if (incoming === lastEmittedRef.current) return;
    if (incoming === el.innerHTML) {
      lastEmittedRef.current = incoming;
      return;
    }
    el.innerHTML = incoming;
    lastEmittedRef.current = incoming;
  }, [value]);

  const emit = useCallback(() => {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    lastEmittedRef.current = html;
    onChange(html);
  }, [onChange]);

  const exec = useCallback((command: string, val?: string) => {
    document.execCommand(command, false, val);
    emit();
  }, [emit]);

  const toggleHeading = useCallback((tag: "H1" | "H2" | "H3") => {
    const sel = window.getSelection();
    let target = tag as string;
    if (sel && sel.anchorNode) {
      let node: Node | null = sel.anchorNode;
      while (node && node !== editorRef.current) {
        if ((node as HTMLElement).nodeType === 1 && (node as HTMLElement).tagName === tag) {
          target = "P";
          break;
        }
        node = node.parentNode;
      }
    }
    document.execCommand("formatBlock", false, target);
    emit();
  }, [emit]);

  return (
    <div className="border border-border rounded-md overflow-hidden">
      <div className="flex items-center gap-0.5 p-1 border-b border-border bg-secondary/30 flex-wrap">
        <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => exec("bold")} title="Negrito">
          <Bold className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => exec("italic")} title="Itálico">
          <Italic className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => exec("underline")} title="Sublinhado">
          <Underline className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => exec("strikeThrough")} title="Tachado">
          <Strikethrough className="h-3.5 w-3.5" />
        </Button>
        <div className="w-px h-5 bg-border mx-1" />
        <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => toggleHeading("H1")} title="Título 1">
          <Heading1 className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => toggleHeading("H2")} title="Título 2">
          <Heading2 className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => toggleHeading("H3")} title="Título 3">
          <Heading3 className="h-3.5 w-3.5" />
        </Button>
        <div className="w-px h-5 bg-border mx-1" />
        {HIGHLIGHT_COLORS.map((c) => (
          <button
            key={c.name}
            type="button"
            className="h-5 w-5 rounded border border-border/50 cursor-pointer hover:scale-110 transition-transform"
            style={{ backgroundColor: c.color }}
            onClick={() => exec("hiliteColor", c.color)}
            title={`Grifo ${c.name}`}
          />
        ))}
      </div>
      <div
        ref={(el) => {
          editorRef.current = el;
          if (el && el.innerHTML !== (value || "")) {
            el.innerHTML = value || "";
            lastEmittedRef.current = value || "";
          }
        }}
        contentEditable
        suppressContentEditableWarning
        className="rte-content min-h-[60px] p-2 text-sm outline-none [&_*]:leading-snug [&_p]:text-sm [&_div]:text-sm [&_h1]:text-lg [&_h1]:font-bold [&_h2]:text-base [&_h2]:font-semibold [&_h3]:text-sm [&_h3]:font-semibold"
        onInput={emit}
        data-placeholder={placeholder}
      />
    </div>
  );
}
