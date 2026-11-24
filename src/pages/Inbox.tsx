import { InstagramHandle } from "@/components/InstagramHandle";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useApp } from "@/context/AppContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Inbox,
  ChevronDown,
  ChevronUp,
  UserPlus,
  Link2,
  Instagram,
  MapPin,
  CreditCard,
  User,
  RefreshCw,
  Search,
  Loader2,
  Check,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { normalizeSearch, parseInstagramUsername, maskCNPJ, parseLocalDate } from "@/lib/utils";
import { InboxSubmission, InboxSubmissionRawData, Influencer, LOCATIONS } from "@/types";

function txt(v: unknown): string {
  return typeof v === "string" ? v.trim() : v == null ? "" : String(v);
}

/** Busca um valor no raw_data testando variações de nome de campo (sem acento/pontuação). */
function pick(d: InboxSubmissionRawData, ...keys: string[]): string {
  const wanted = keys.map((k) => normalizeSearch(k));
  for (const [rawKey, value] of Object.entries(d || {})) {
    if (wanted.includes(normalizeSearch(rawKey))) {
      const v = txt(value);
      if (v) return v;
    }
  }
  return "";
}

/** Converte datas em vários formatos para "YYYY-MM-DD" (formato usado no perfil). */
function normalizeBirthDate(value: string): string | undefined {
  const v = txt(value);
  if (!v) return undefined;
  const iso = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const br = v.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/);
  if (br) {
    const day = br[1].padStart(2, "0");
    const month = br[2].padStart(2, "0");
    let year = br[3];
    if (year.length === 2) year = Number(year) > 30 ? `19${year}` : `20${year}`;
    return `${year}-${month}-${day}`;
  }
  const parsed = new Date(v);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, "0");
    const dd = String(parsed.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  }
  return undefined;
}

function isNegativeAnswer(value: string): boolean {
  const n = normalizeSearch(value);
  return n === "nao" || n === "no" || n.startsWith("naopossui") || n.startsWith("naotenho");
}

/** Extrai o CNPJ do formulário: número formatado quando existir, senão "Não possui". */
function extractCnpj(d: InboxSubmissionRawData): string | undefined {
  const candidates = [
    pick(d, "cnpj", "numero_cnpj", "cnpj_numero", "qual_cnpj", "cnpj_empresa", "numero_do_cnpj"),
    pick(d, "possui_cnpj", "tem_cnpj", "cnpj_possui"),
  ].filter(Boolean);

  for (const c of candidates) {
    const digits = c.replace(/\D/g, "");
    if (digits.length === 14) return maskCNPJ(digits);
    if (digits.length >= 11) return c;
  }
  // Fallback: CPF/CNPJ do titular quando tem 14 dígitos
  const titular = pick(d, "cpf_cnpj_titular");
  const titularDigits = titular.replace(/\D/g, "");
  if (titularDigits.length === 14) return maskCNPJ(titularDigits);

  if (candidates.some((c) => isNegativeAnswer(c))) return "Não possui";
  return candidates[0] || undefined;
}


function guessLocation(cidade?: string): string {
  const c = normalizeSearch(txt(cidade));
  if (!c) return "Indefinido";
  const found = LOCATIONS.find((l) => normalizeSearch(l) === c);
  return found || "Indefinido";
}

function mapReception(possuiPortaria?: string): Influencer["addressReceptionSpace"] | undefined {
  const p = normalizeSearch(txt(possuiPortaria));
  if (!p) return undefined;
  if (p.includes("24") || p.startsWith("sim")) return "portaria_24h";
  if (p.includes("espaco") || p.includes("encomenda")) return "sem_portaria_com_espaco";
  return "sem_portaria_sem_espaco";
}

function buildPaymentNotes(d: InboxSubmissionRawData): string | undefined {
  const lines: string[] = [];
  if (txt(d.titular_pagamento)) lines.push(`Titular: ${txt(d.titular_pagamento)}`);
  if (txt(d.cpf_cnpj_titular)) lines.push(`CPF/CNPJ do titular: ${txt(d.cpf_cnpj_titular)}`);
  if (txt(d.tipo_chave_pix)) lines.push(`Tipo de chave Pix: ${txt(d.tipo_chave_pix)}`);
  return lines.length ? lines.join("\n") : undefined;
}

/** Campos do raw_data mapeados para o formato oficial de influenciador. */
function mapSubmissionToInfluencer(d: InboxSubmissionRawData): Partial<Influencer> {
  const instagram = pick(d, "instagram", "perfil_instagram", "instagram_url");
  const username = instagram ? parseInstagramUsername(instagram) : "";
  const cnpj = extractCnpj(d);
  const titularDigits = pick(d, "cpf_cnpj_titular").replace(/\D/g, "");
  const isCnpj = titularDigits.length > 11 || (!!cnpj && cnpj !== "Não possui");


  const extraNotes: string[] = [];
  if (txt(d.tiktok)) extraNotes.push(`TikTok: ${txt(d.tiktok)}`);
  if (txt(d.ponto_referencia)) extraNotes.push(`Ponto de referência: ${txt(d.ponto_referencia)}`);
  if (txt(d.alguem_para_receber)) extraNotes.push(`Alguém para receber: ${txt(d.alguem_para_receber)}`);
  const payment = buildPaymentNotes(d);
  if (payment) extraNotes.push(payment);

  return {
    name: txt(d.nome_exibicao) || txt(d.nome_completo) || (username ? `@${username}` : "Sem nome"),
    fullName: txt(d.nome_completo) || undefined,
    username,
    email: txt(d.email) || undefined,
    whatsapp: txt(d.telefone) || undefined,
    contact: txt(d.email) || txt(d.telefone) || "",
    birthDate: normalizeBirthDate(pick(d, "data_nascimento", "data_de_nascimento", "nascimento", "aniversario", "birth_date", "birthdate")),
    cpf: pick(d, "cpf") || undefined,
    cnpj: cnpj || undefined,

    location: guessLocation(txt(d.cidade)),
    addressStreet: txt(d.rua_avenida) || undefined,
    addressNumber: txt(d.numero) || undefined,
    addressComplement: txt(d.complemento) || undefined,
    addressNeighborhood: txt(d.bairro) || undefined,
    addressZip: txt(d.cep) || undefined,
    addressCity: txt(d.cidade) || undefined,
    addressState: txt(d.estado) || undefined,
    addressReceptionSpace: mapReception(txt(d.possui_portaria)),
    paymentPix: txt(d.chave_pix) || undefined,
    paymentAccountType: isCnpj ? "juridica" : "fisica",
    paymentData: payment,
    notes: extraNotes.join("\n") || "",
  };
}

function buildCreateDraft(mapped: Partial<Influencer>): Omit<Influencer, "id" | "addedAt" | "rating" | "totalRatings"> {
  return {
    name: mapped.name || "Sem nome",
    fullName: mapped.fullName,
    username: mapped.username || "",
    profilePic: "",
    followers: 0,
    niche: "",
    location: mapped.location || "Indefinido",
    gender: "outro",
    isActive: true,
    notes: mapped.notes || "",
    contact: mapped.contact || "",
    whatsapp: mapped.whatsapp,
    email: mapped.email,
    cpf: mapped.cpf,
    cnpj: mapped.cnpj,
    birthDate: mapped.birthDate,
    paymentPix: mapped.paymentPix,
    paymentAccountType: mapped.paymentAccountType,
    paymentData: mapped.paymentData,
    addressStreet: mapped.addressStreet,
    addressNumber: mapped.addressNumber,
    addressComplement: mapped.addressComplement,
    addressNeighborhood: mapped.addressNeighborhood,
    addressZip: mapped.addressZip,
    addressCity: mapped.addressCity,
    addressState: mapped.addressState,
    addressReceptionSpace: mapped.addressReceptionSpace,
  };
}

export default function InboxPage() {
  const { influencers, addInfluencer, updateInfluencer } = useApp();
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<InboxSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [mergeTarget, setMergeTarget] = useState<InboxSubmission | null>(null);
  const [working, setWorking] = useState<string | null>(null);
  const [review, setReview] = useState<{
    submissionId: string;
    mode: "create" | "merge";
    values: Partial<Influencer>;
    target?: Influencer;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("inbox_submissions")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Erro ao carregar cadastros", description: error.message, variant: "destructive" });
    } else {
      setSubmissions((data || []) as unknown as InboxSubmission[]);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel("inbox_submissions_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "inbox_submissions" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  async function markStatus(id: string, status: "converted" | "merged") {
    const { error } = await supabase.from("inbox_submissions").update({ status }).eq("id", id);
    if (error) throw new Error(error.message);
    setSubmissions((prev) => prev.filter((s) => s.id !== id));
  }

  function startCreateReview(sub: InboxSubmission) {
    const mapped = mapSubmissionToInfluencer(sub.raw_data);
    setReview({ submissionId: sub.id, mode: "create", values: buildCreateDraft(mapped) });
    setExpandedId(sub.id);
  }

  function startMergeReview(sub: InboxSubmission, target: Influencer) {
    const m = mapSubmissionToInfluencer(sub.raw_data);
    const merged: Influencer = {
      ...target,
      name: m.name || target.name,
      fullName: m.fullName || target.fullName,
      username: m.username || target.username,
      email: m.email || target.email,
      whatsapp: m.whatsapp || target.whatsapp,
      contact: m.contact || target.contact,
      birthDate: m.birthDate || target.birthDate,
      cpf: m.cpf || target.cpf,
      cnpj: m.cnpj || target.cnpj,
      paymentPix: m.paymentPix || target.paymentPix,
      paymentAccountType: m.paymentAccountType || target.paymentAccountType,
      paymentData: m.paymentData || target.paymentData,
      addressStreet: m.addressStreet || target.addressStreet,
      addressNumber: m.addressNumber || target.addressNumber,
      addressComplement: m.addressComplement || target.addressComplement,
      addressNeighborhood: m.addressNeighborhood || target.addressNeighborhood,
      addressZip: m.addressZip || target.addressZip,
      addressCity: m.addressCity || target.addressCity,
      addressState: m.addressState || target.addressState,
      addressReceptionSpace: m.addressReceptionSpace || target.addressReceptionSpace,
      notes: [target.notes, m.notes].filter(Boolean).join("\n"),
    };
    setReview({ submissionId: sub.id, mode: "merge", target, values: merged });
    setExpandedId(sub.id);
    setMergeTarget(null);
  }

  function updateReviewValues(patch: Partial<Influencer>) {
    setReview((prev) => prev && { ...prev, values: { ...prev.values, ...patch } });
  }

  function cancelReview() {
    setReview(null);
  }

  async function commitReview() {
    if (!review) return;
    setWorking(review.submissionId);
    try {
      if (review.mode === "create") {
        const v = review.values;
        addInfluencer({
          name: v.name || "Sem nome",
          fullName: v.fullName,
          username: v.username || "",
          profilePic: v.profilePic || "",
          followers: v.followers ?? 0,
          niche: v.niche || "",
          location: v.location || "Indefinido",
          gender: (v.gender as Influencer["gender"]) || "outro",
          isActive: true,
          notes: v.notes || "",
          contact: v.contact || "",
          whatsapp: v.whatsapp,
          email: v.email,
          cpf: v.cpf,
          cnpj: v.cnpj,
          birthDate: v.birthDate,
          paymentPix: v.paymentPix,
          paymentAccountType: v.paymentAccountType,
          paymentData: v.paymentData,
          addressStreet: v.addressStreet,
          addressNumber: v.addressNumber,
          addressComplement: v.addressComplement,
          addressNeighborhood: v.addressNeighborhood,
          addressZip: v.addressZip,
          addressCity: v.addressCity,
          addressState: v.addressState,
          addressReceptionSpace: v.addressReceptionSpace,
        });
        await markStatus(review.submissionId, "converted");
        toast({ description: `${v.name} foi cadastrado com sucesso.` });
      } else {
        updateInfluencer(review.values as Influencer);
        await markStatus(review.submissionId, "merged");
        toast({ description: `Dados associados ao perfil de ${review.values.name}.` });
      }
      setReview(null);
    } catch (e) {
      toast({
        title: review.mode === "create" ? "Não foi possível cadastrar" : "Não foi possível associar",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setWorking(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Inbox className="h-6 w-6" />
            Caixa de Entrada
          </h1>
          <p className="text-sm text-muted-foreground">
            Cadastros recebidos pelo formulário externo, aguardando processamento
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{submissions.length} pendente(s)</Badge>
          <Button variant="outline" size="sm" className="gap-2" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Atualizar
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">
          <Loader2 className="mx-auto h-6 w-6 animate-spin mb-2" />
          <p className="text-sm">Carregando cadastros...</p>
        </div>
      ) : submissions.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <Inbox className="mx-auto h-8 w-8 mb-2 opacity-40" />
          <p>Nenhum cadastro pendente</p>
          <p className="text-xs mt-1">Novos envios do formulário aparecem aqui automaticamente</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {submissions.map((sub) => (
            <SubmissionCard
              key={sub.id}
              sub={sub}
              expanded={expandedId === sub.id}
              busy={working === sub.id}
              review={review}
              onToggle={() => setExpandedId(expandedId === sub.id ? null : sub.id)}
              onStartCreate={() => startCreateReview(sub)}
              onStartMerge={() => setMergeTarget(sub)}
              onCommit={commitReview}
              onCancel={cancelReview}
              onChange={updateReviewValues}
            />
          ))}
        </div>
      )}

      <AssociateDialog
        submission={mergeTarget}
        influencers={influencers}
        onClose={() => setMergeTarget(null)}
        onReviewMerge={startMergeReview}
      />
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string }) {
  if (!txt(value)) return null;
  return (
    <p className="text-sm">
      <span className="text-muted-foreground">{label}: </span>
      <span className="font-medium break-words">{txt(value)}</span>
    </p>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: typeof User; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5" /> {title}
      </p>
      <div className="grid gap-1 sm:grid-cols-2">{children}</div>
    </div>
  );
}

function SubmissionCard({
  sub,
  expanded,
  busy,
  review,
  onToggle,
  onStartCreate,
  onStartMerge,
  onCommit,
  onCancel,
  onChange,
}: {
  sub: InboxSubmission;
  expanded: boolean;
  busy: boolean;
  review: { submissionId: string; mode: "create" | "merge"; values: Partial<Influencer>; target?: Influencer } | null;
  onToggle: () => void;
  onStartCreate: () => void;
  onStartMerge: () => void;
  onCommit: () => void;
  onCancel: () => void;
  onChange: (patch: Partial<Influencer>) => void;
}) {
  const d = sub.raw_data || {};
  const username = txt(d.instagram) ? parseInstagramUsername(txt(d.instagram)) : "";
  const title = txt(d.nome_exibicao) || txt(d.nome_completo) || (username ? `@${username}` : "Cadastro sem nome");
  const isReviewing = review?.submissionId === sub.id;

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <button className="w-full text-left flex items-start justify-between gap-3" onClick={onToggle}>
          <div className="min-w-0">
            <p className="font-medium truncate">{title}</p>
            <p className="text-xs text-muted-foreground truncate">
              {username ? <InstagramHandle username={username} /> : "sem instagram"}
              {txt(d.cidade) ? ` · ${txt(d.cidade)}${txt(d.estado) ? `/${txt(d.estado)}` : ""}` : ""}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Recebido em{" "}
              {new Date(sub.created_at).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
          {expanded ? (
            <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
        </button>

        {isReviewing && review ? (
          <ReviewPanel review={review} busy={busy} onCommit={onCommit} onCancel={onCancel} onChange={onChange} />
        ) : (
          expanded && (
            <div className="space-y-4 pt-2 border-t border-border">
              <Section title="Redes e dados pessoais" icon={Instagram}>
                <Field label="Instagram" value={txt(d.instagram)} />
                <Field label="TikTok" value={txt(d.tiktok)} />
                <Field label="Nome completo" value={txt(d.nome_completo)} />
                <Field label="Nome de exibição" value={txt(d.nome_exibicao)} />
                <Field
                  label="Data de nascimento"
                  value={(() => {
                    const iso = normalizeBirthDate(pick(d, "data_nascimento", "data_de_nascimento", "nascimento", "aniversario", "birth_date", "birthdate"));
                    return iso ? parseLocalDate(iso).toLocaleDateString("pt-BR") : "";
                  })()}
                />
                <Field label="CPF" value={txt(d.cpf)} />
                <Field label="CNPJ" value={extractCnpj(d) || ""} />

                <Field label="E-mail" value={txt(d.email)} />
                <Field label="Telefone" value={txt(d.telefone)} />
              </Section>

              <Section title="Endereço" icon={MapPin}>
                <Field label="CEP" value={txt(d.cep)} />
                <Field label="Rua/Avenida" value={txt(d.rua_avenida)} />
                <Field label="Número" value={txt(d.numero)} />
                <Field label="Complemento" value={txt(d.complemento)} />
                <Field label="Bairro" value={txt(d.bairro)} />
                <Field label="Cidade" value={txt(d.cidade)} />
                <Field label="Estado" value={txt(d.estado)} />
                <Field label="Ponto de referência" value={txt(d.ponto_referencia)} />
                <Field label="Portaria" value={txt(d.possui_portaria)} />
                <Field label="Alguém para receber" value={txt(d.alguem_para_receber)} />
              </Section>

              <Section title="Pagamento" icon={CreditCard}>
                <Field label="Titular" value={txt(d.titular_pagamento)} />
                <Field label="CPF/CNPJ do titular" value={txt(d.cpf_cnpj_titular)} />
                <Field label="Tipo de chave Pix" value={txt(d.tipo_chave_pix)} />
                <Field label="Chave Pix" value={txt(d.chave_pix)} />
              </Section>
            </div>
          )
        )}

        {!isReviewing && (
          <div className="flex items-center gap-2 pt-1 flex-wrap">
            <Button size="sm" className="gap-2" onClick={onStartCreate} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Criar Novo Influenciador
            </Button>
            <Button size="sm" variant="outline" className="gap-2" onClick={onStartMerge} disabled={busy}>
              <Link2 className="h-4 w-4" /> Associar a Existente
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ReviewPanel({
  review,
  busy,
  onCommit,
  onCancel,
  onChange,
}: {
  review: { submissionId: string; mode: "create" | "merge"; values: Partial<Influencer>; target?: Influencer };
  busy: boolean;
  onCommit: () => void;
  onCancel: () => void;
  onChange: (patch: Partial<Influencer>) => void;
}) {
  const v = review.values;
  return (
    <div className="mt-4 rounded-lg border border-dashed border-border bg-muted/40 p-4 space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <p className="text-sm font-semibold flex items-center gap-2">
            <Check className="h-4 w-4 text-primary" />
            {review.mode === "create" ? "Revisar novo influenciador" : "Revisar vínculo com existente"}
          </p>
          <p className="text-xs text-muted-foreground">
            Confira os dados abaixo e faça ajustes manuais, se necessário, antes de concluir.
          </p>
        </div>
        {review.mode === "merge" && review.target && (
          <Badge variant="secondary" className="shrink-0">
            Vincular a {review.target.name}
          </Badge>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs text-muted-foreground">Nome de exibição</Label>
          <Input value={v.name || ""} onChange={(e) => onChange({ name: e.target.value })} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs text-muted-foreground">Nome completo</Label>
          <Input value={v.fullName || ""} onChange={(e) => onChange({ fullName: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">@username</Label>
          <Input value={v.username || ""} onChange={(e) => onChange({ username: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Contato</Label>
          <Input value={v.contact || ""} onChange={(e) => onChange({ contact: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">E-mail</Label>
          <Input value={v.email || ""} onChange={(e) => onChange({ email: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">WhatsApp / Telefone</Label>
          <Input value={v.whatsapp || ""} onChange={(e) => onChange({ whatsapp: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">CPF</Label>
          <Input value={v.cpf || ""} onChange={(e) => onChange({ cpf: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">CNPJ</Label>
          <Input value={v.cnpj || ""} onChange={(e) => onChange({ cnpj: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Data de nascimento</Label>
          <Input
            type="date"
            value={v.birthDate || ""}
            onChange={(e) => onChange({ birthDate: e.target.value || undefined })}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Localização</Label>
          <Select value={v.location || "Indefinido"} onValueChange={(val) => onChange({ location: val })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LOCATIONS.map((l) => (
                <SelectItem key={l} value={l}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Gênero</Label>
          <Select
            value={v.gender || "outro"}
            onValueChange={(val) => onChange({ gender: val as Influencer["gender"] })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="feminino">Feminino</SelectItem>
              <SelectItem value="masculino">Masculino</SelectItem>
              <SelectItem value="outro">Outro</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs text-muted-foreground">Rua / Avenida</Label>
          <Input value={v.addressStreet || ""} onChange={(e) => onChange({ addressStreet: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Número</Label>
          <Input value={v.addressNumber || ""} onChange={(e) => onChange({ addressNumber: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Complemento</Label>
          <Input value={v.addressComplement || ""} onChange={(e) => onChange({ addressComplement: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Bairro</Label>
          <Input value={v.addressNeighborhood || ""} onChange={(e) => onChange({ addressNeighborhood: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Cidade</Label>
          <Input value={v.addressCity || ""} onChange={(e) => onChange({ addressCity: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Estado</Label>
          <Input value={v.addressState || ""} onChange={(e) => onChange({ addressState: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">CEP</Label>
          <Input value={v.addressZip || ""} onChange={(e) => onChange({ addressZip: e.target.value })} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs text-muted-foreground">Chave Pix</Label>
          <Input value={v.paymentPix || ""} onChange={(e) => onChange({ paymentPix: e.target.value })} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Observações</Label>
        <Textarea
          value={v.notes || ""}
          onChange={(e) => onChange({ notes: e.target.value })}
          rows={3}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-2">
        <Button size="sm" className="gap-2" onClick={onCommit} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Concluir Adição
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel} disabled={busy}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}

function AssociateDialog({
  submission,
  influencers,
  onClose,
  onReviewMerge,
}: {
  submission: InboxSubmission | null;
  influencers: Influencer[];
  onClose: () => void;
  onReviewMerge: (sub: InboxSubmission, target: Influencer) => void;
}) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    setQuery("");
    setSelectedId(null);
  }, [submission?.id]);

  const results = useMemo(() => {
    const q = normalizeSearch(query);
    const list = q
      ? influencers.filter(
          (i) =>
            normalizeSearch(i.name).includes(q) ||
            normalizeSearch(i.fullName || "").includes(q) ||
            normalizeSearch(i.username).includes(q) ||
            normalizeSearch(i.email || "").includes(q)
        )
      : influencers;
    return list.slice(0, 30);
  }, [query, influencers]);

  const selected = influencers.find((i) => i.id === selectedId) || null;

  return (
    <Dialog open={!!submission} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Associar a influenciador existente</DialogTitle>
          <DialogDescription>
            Os dados recebidos vão preencher as informações do perfil selecionado. Você poderá revisar tudo antes de concluir.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por nome, @ ou e-mail..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="max-h-72 overflow-y-auto space-y-1 pr-1">
          {results.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Nenhum influenciador encontrado</p>
          ) : (
            results.map((i) => (
              <button
                key={i.id}
                onClick={() => setSelectedId(i.id)}
                className={`w-full text-left rounded-md border px-3 py-2 transition-colors ${
                  selectedId === i.id ? "border-primary bg-accent" : "border-transparent hover:bg-muted"
                }`}
              >
                <p className="text-sm font-medium truncate">{i.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  <InstagramHandle username={i.username} url={i.instagramUrl} />
                  {i.email ? ` · ${i.email}` : ""}
                </p>
              </button>
            ))
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            disabled={!selected || !submission}
            onClick={() => submission && selected && onReviewMerge(submission, selected)}
          >
            Revisar e concluir
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
