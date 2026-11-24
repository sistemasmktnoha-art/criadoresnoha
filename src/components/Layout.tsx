import { Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Megaphone, Menu, X, FileText, MessageSquare, Briefcase, Tag, LogOut, Users, Lightbulb, Repeat, Crown, Inbox, Lock, Truck, ListChecks, Search, Settings, HelpCircle } from "lucide-react";
import { useState, useMemo, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/context/AppContext";
import { Input } from "@/components/ui/input";
import { normalizeSearch } from "@/lib/utils";

const navItems = [
  { label: "Painel", path: "/", icon: LayoutDashboard },
  { label: "Tarefas", path: "/tasks", icon: ListChecks },
  { label: "Influenciadores", path: "/influencers", icon: Users },
  { label: "Campanhas", path: "/campaigns", icon: Megaphone },
  { label: "Recorrências", path: "/recurrences", icon: Repeat },
  { label: "Envios", path: "/envios", icon: Truck },
  { label: "Cupons", path: "/coupons", icon: Tag },
  { label: "Embaixadores", path: "/ambassadors", icon: Crown },
  { label: "Insights", path: "/insights", icon: Lightbulb },
  { label: "Ajuda / FAQ", path: "/faq", icon: HelpCircle },
];

const backofficeItems = [
  { label: "Caixa de Entrada", path: "/inbox", icon: Inbox, locked: false },
  { label: "Info Fiscal", path: "/backoffice/fiscal", icon: FileText, locked: false },
  { label: "Modelos de Texto", path: "/backoffice/messages", icon: MessageSquare, locked: false },
  
];

type SearchHit = {
  id: string;
  label: string;
  sub?: string;
  icon: typeof Users;
  path: string;
  group: string;
};

export function Layout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { shipments, tasks, influencers, campaigns } = useApp();
  const [pendingIdeasCount, setPendingIdeasCount] = useState(0);

  useEffect(() => {
    let active = true;
    async function loadPending() {
      const { count } = await supabase
        .from("inbox_submissions")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");
      if (active) setPendingIdeasCount(count ?? 0);
    }
    loadPending();
    const channel = supabase
      .channel("inbox-submissions-badge")
      .on("postgres_changes", { event: "*", schema: "public", table: "inbox_submissions" }, () => loadPending())
      .subscribe();
    window.addEventListener("focus", loadPending);
    return () => {
      active = false;
      window.removeEventListener("focus", loadPending);
      supabase.removeChannel(channel);
    };
  }, []);
  const pendingShipmentsCount = shipments.filter((s) => !s.delivered).length;
  const todayStr = new Date().toISOString().split("T")[0];
  const todayTasksCount = tasks.filter((t) => !t.completed && t.deadline <= todayStr).length;

  const [globalQuery, setGlobalQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const results = useMemo<SearchHit[]>(() => {
    const q = normalizeSearch(globalQuery);
    if (!q || q.length < 2) return [];
    const hits: SearchHit[] = [];
    for (const inf of influencers) {
      if (normalizeSearch(inf.name).includes(q) || normalizeSearch(inf.username).includes(q)) {
        hits.push({ id: `inf-${inf.id}`, label: inf.name, sub: `@${inf.username}`, icon: Users, path: `/influencer/${inf.id}`, group: "Influenciadores" });
      }
    }
    for (const c of campaigns) {
      if (normalizeSearch(c.name).includes(q)) {
        hits.push({ id: `camp-${c.id}`, label: c.name, sub: "Campanha", icon: Megaphone, path: `/campaign/${c.id}`, group: "Campanhas" });
      }
    }
    for (const t of tasks) {
      if (normalizeSearch(t.title).includes(q) || normalizeSearch(t.description || "").includes(q)) {
        hits.push({ id: `task-${t.id}`, label: t.title, sub: t.completed ? "Concluída" : `Prazo ${t.deadline}`, icon: ListChecks, path: t.link || "/tasks", group: "Tarefas" });
      }
    }
    for (const s of shipments) {
      const inf = influencers.find((i) => i.id === s.influencerId);
      if (normalizeSearch(s.description).includes(q) || normalizeSearch(inf?.name || "").includes(q) || normalizeSearch(s.trackingCode || "").includes(q)) {
        hits.push({ id: `ship-${s.id}`, label: s.description || "Envio", sub: `${inf?.name || "—"} · ${s.unit}`, icon: Truck, path: "/envios", group: "Envios" });
      }
    }
    return hits.slice(0, 30);
  }, [globalQuery, influencers, campaigns, tasks, shipments]);

  const groupedResults = useMemo(() => {
    const map = new Map<string, SearchHit[]>();
    for (const r of results) {
      if (!map.has(r.group)) map.set(r.group, []);
      map.get(r.group)!.push(r);
    }
    return Array.from(map.entries());
  }, [results]);

  function pick(r: SearchHit) {
    setGlobalQuery("");
    setSearchFocused(false);
    navigate(r.path);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/login");
  }


  return (
    <div className="flex min-h-screen w-full">
      {open && (
        <div
          className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 flex h-full w-56 flex-col border-r border-border bg-sidebar transition-transform duration-200 lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-2 border-b border-border px-5 py-5">
          <span className="text-lg font-bold tracking-tight text-foreground">NOHA</span>
          <span className="text-xs font-medium text-muted-foreground">Creators</span>
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-3">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            const badge =
              item.path === "/envios" && pendingShipmentsCount > 0 ? pendingShipmentsCount :
              item.path === "/tasks" && todayTasksCount > 0 ? todayTasksCount : 0;
            const badgeColor = item.path === "/envios"
              ? "bg-amber-500 text-white"
              : "bg-primary text-primary-foreground";
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-sidebar-accent text-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
                }`}
              >
                <item.icon className="h-4 w-4" />
                <span className="flex-1">{item.label}</span>
                {badge > 0 && (
                  <span className={`flex h-5 min-w-5 items-center justify-center rounded-full ${badgeColor} text-[10px] font-bold px-1`}>
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}

          <div className="mt-4 mb-1 flex items-center gap-2 px-3">
            <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Backoffice</span>
          </div>
          {backofficeItems.map((item) => {
            if (item.locked) {
              return (
                <div
                  key={item.label}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground/50 cursor-not-allowed"
                  title="Em construção"
                >
                  <item.icon className="h-4 w-4" />
                  <span className="flex-1">{item.label}</span>
                  <Lock className="h-3 w-3" />
                </div>
              );
            }
            const active = location.pathname === item.path;
            const showBadge = item.path === "/inbox" && pendingIdeasCount > 0;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-sidebar-accent text-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
                }`}
              >
                <item.icon className="h-4 w-4" />
                <span className="flex-1">{item.label}</span>
                {showBadge && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground px-1">
                    {pendingIdeasCount}
                  </span>
                )}
              </Link>
            );
          })}

          <Link
            to="/settings"
            onClick={() => setOpen(false)}
            className={`mt-auto flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-medium transition-colors ${
              location.pathname.startsWith("/settings")
                ? "bg-sidebar-accent text-primary"
                : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
            }`}
          >
            <Settings className="h-3.5 w-3.5" />
            <span className="flex-1">Configurações</span>
          </Link>
        </nav>

        <div className="border-t border-border p-4 space-y-2">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-destructive transition-colors w-full"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sair
          </button>
          <a
            href="https://noha.store"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-primary transition-colors block"
          >
            noha.store ↗
          </a>
          <a
            href="https://cadastroparceirosnoha.base44.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-primary transition-colors block"
          >
            Formulário de Cadastro ↗
          </a>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center gap-4 border-b border-border px-4 lg:px-6">
          <button
            onClick={() => setOpen(!open)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground lg:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <div className="flex-1 flex justify-center px-2">
            <div ref={searchBoxRef} className="relative w-full max-w-xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={globalQuery}
                onChange={(e) => { setGlobalQuery(e.target.value); setSearchFocused(true); }}
                onFocus={() => setSearchFocused(true)}
                placeholder="Buscar em toda a plataforma (influenciadores, campanhas, tarefas, envios)..."
                className="h-9 pl-9 text-sm"
              />
              {searchFocused && globalQuery.trim().length >= 2 && (
                <div className="absolute left-0 right-0 top-full mt-1 z-50 max-h-[60vh] overflow-y-auto rounded-md border border-border bg-popover shadow-lg">
                  {groupedResults.length === 0 ? (
                    <p className="px-3 py-4 text-xs text-muted-foreground text-center">Nenhum resultado encontrado.</p>
                  ) : (
                    groupedResults.map(([group, items]) => (
                      <div key={group} className="py-1">
                        <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{group}</p>
                        {items.map((r) => (
                          <button
                            key={r.id}
                            onClick={() => pick(r)}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent transition-colors"
                          >
                            <r.icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="flex-1 truncate">{r.label}</span>
                            {r.sub && <span className="text-[11px] text-muted-foreground truncate max-w-[40%]">{r.sub}</span>}
                          </button>
                        ))}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

        </header>
        <main className="flex-1 overflow-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
