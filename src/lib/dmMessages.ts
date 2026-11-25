import type { Campaign, CampaignParticipant, Coupon, Influencer, MessageTemplate } from "@/types";

export type Scenario = "novo" | "recorrente";
export type Deal = "permuta" | "pagamento" | "permuta_e_pagamento";

export interface PastPartnership {
  campaignName: string;
  deal: Deal | null;
  date: string;
}

export interface MessageContext {
  nome: string;
  campanha: string;
  prazo: string;
  cupom: string;
  desconto: string;
  produto: string;
  scenario: Scenario;
  deal: Deal;
  history: PastPartnership[];
}

const firstName = (full: string) => (full || "").trim().split(/\s+/)[0] || "";

function fmtDate(iso?: string) {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}` : iso;
}

/** Campanhas anteriores em que o influenciador topou participar. */
export function getHistory(influencerId: string, campaigns: Campaign[], currentCampaignId?: string): PastPartnership[] {
  const out: PastPartnership[] = [];
  for (const c of campaigns) {
    if (c.id === currentCampaignId) continue;
    const p = (c.participants || []).find((x) => x.influencerId === influencerId);
    if (!p) continue;
    const worked =
      p.negotiationStatus === "topou" ||
      (p.contactStatus === "retornou" && p.negotiationStatus !== "nao_topou" && p.materialStatus === "publicado") ||
      (c.contents || []).some((ct) => ct.influencerId === influencerId);
    if (!worked) continue;
    const neg = p.negotiationType && p.negotiationType !== "nao_se_aplica" ? (p.negotiationType as Deal) : null;
    out.push({ campaignName: c.name, deal: neg, date: c.startDate || c.createdAt || "" });
  }
  return out.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
}

export function buildContext(
  inf: Influencer,
  campaign: Campaign | undefined,
  participant: CampaignParticipant | undefined,
  coupons: Coupon[],
  campaigns: Campaign[],
): MessageContext {
  const history = getHistory(inf.id, campaigns, campaign?.id);
  const today = new Date().toISOString().slice(0, 10);
  const coupon = coupons.find(
    (c) => c.influencerId === inf.id && c.isActive && c.code && (!c.validUntil || c.validUntil >= today),
  );
  const neg = participant?.negotiationType;
  return {
    nome: firstName(inf.name),
    campanha: campaign?.name || "",
    prazo: fmtDate(campaign?.deadline),
    cupom: coupon?.code || "",
    desconto: coupon ? String(coupon.discountPercent) : "",
    produto: participant?.chosenProduct || "",
    scenario: history.length > 0 || inf.isAmbassador ? "recorrente" : "novo",
    deal: neg && neg !== "nao_se_aplica" ? (neg as Deal) : "permuta",
    history,
  };
}

export const DEAL_LABEL: Record<Deal, string> = {
  permuta: "Permuta",
  pagamento: "Pagamento",
  permuta_e_pagamento: "Permuta + pagamento",
};

function dealLine(deal: Deal, produto: string) {
  const prod = produto ? ` (${produto})` : "";
  if (deal === "permuta") return `Seria uma parceria em permuta: enviamos peças da Noha${prod} para você criar o conteúdo.`;
  if (deal === "pagamento") return "Seria uma parceria com pagamento pela criação do conteúdo, e a gente alinha o valor por aqui.";
  return `Seria uma parceria com permuta${prod} e pagamento pela criação do conteúdo. A gente alinha os valores por aqui.`;
}

function lastWork(ctx: MessageContext) {
  const last = ctx.history[0];
  if (!last) return "";
  const how = last.deal === "pagamento" ? " em pagamento" : last.deal === "permuta_e_pagamento" ? " em permuta e pagamento" : last.deal === "permuta" ? " em permuta" : "";
  return `Lembro com carinho da nossa parceria${last.campaignName ? ` na campanha "${last.campaignName}"` : ""}${how}. `;
}

export interface SmartTemplate {
  id: string;
  title: string;
  category: string;
  /** Cenário sugerido por padrão. */
  suggestFor?: Scenario;
  render: (ctx: MessageContext) => string;
}

export const SMART_TEMPLATES: SmartTemplate[] = [
  {
    id: "smart-convite",
    title: "Convite para a campanha (adapta ao histórico)",
    category: "Campanha",
    render: (ctx) => {
      const camp = ctx.campanha ? `a campanha "${ctx.campanha}"` : "uma nova campanha";
      const intro =
        ctx.scenario === "recorrente"
          ? `Oi, ${ctx.nome}! Tudo bem? 💛\n\n${lastWork(ctx)}Estamos preparando ${camp} e queria muito ter você de novo com a gente!`
          : `Oi, ${ctx.nome}! Tudo bem? 😊\n\nAqui é da Noha Shoes. A gente acompanha o seu conteúdo e acha que tem tudo a ver com a marca! Estamos preparando ${camp} e queria te convidar para fazer parte.`;
      const extras = [
        ctx.cupom ? `🏷️ Seu cupom: ${ctx.cupom}${ctx.desconto ? ` (${ctx.desconto}% de desconto)` : ""}` : "",
      ].filter(Boolean).join("\n");
      return `${intro}\n\n${dealLine(ctx.deal, ctx.produto)}${extras ? `\n\n${extras}` : ""}\n\nTem interesse? Se sim, te passo todos os detalhes! 🥰`;
    },
  },
  {
    id: "smart-followup",
    title: "Follow-up (sem retorno)",
    category: "Follow-up",
    render: (ctx) =>
      `Oi, ${ctx.nome}! Tudo bem? 😊\n\nPassando para saber se você viu minha mensagem sobre ${ctx.campanha ? `a campanha "${ctx.campanha}"` : "a parceria com a Noha"}. Ainda dá tempo de participar e ficaria muito feliz em ter você com a gente! Se não tiver interesse agora, sem problemas, é só me avisar. 💛`,
  },
  {
    id: "smart-briefing",
    title: "Confirmação e próximos passos",
    category: "Campanha",
    render: (ctx) =>
      `Oi, ${ctx.nome}! Que bom que você topou! 🎉\n\nCampanha: ${ctx.campanha || "—"}\n${ctx.produto ? `Produto: ${ctx.produto}\n` : ""}${ctx.cupom ? `Seu cupom: ${ctx.cupom}${ctx.desconto ? ` (${ctx.desconto}% OFF)` : ""}\n` : ""}\nVou te enviar o briefing e combinar o envio das peças. Pode me confirmar o endereço de entrega? 📦`,
  },
  {
    id: "smart-prazo",
    title: "Cobrança de conteúdo",
    category: "Follow-up",
    render: (ctx) =>
      `Oi, ${ctx.nome}! Tudo bem? 😊\n\nPassando para saber como está o conteúdo da campanha${ctx.campanha ? ` "${ctx.campanha}"` : ""}. Precisa de alguma coisa da nossa parte? Se já tiver o material, pode mandar para aprovação! 📸`,
  },
  {
    id: "smart-obrigado",
    title: "Agradecimento pós-campanha",
    category: "Pós-campanha",
    render: (ctx) =>
      `Oi, ${ctx.nome}! 💛\n\nObrigada pela parceria${ctx.campanha ? ` na campanha "${ctx.campanha}"` : ""}! O conteúdo ficou incrível. Vamos adorar trabalhar com você de novo em breve!`,
  },
];

/** Aplica {variavel} de modelos salvos pelo usuário; variáveis desconhecidas ficam como estão. */
export function renderUserTemplate(t: MessageTemplate, ctx: MessageContext): string {
  const map: Record<string, string> = {
    nome: ctx.nome, campanha: ctx.campanha, prazo: ctx.prazo, cupom: ctx.cupom,
    desconto: ctx.desconto, produto: ctx.produto,
  };
  return t.body.replace(/\{([^{}]+)\}/g, (ph, v: string) => map[v.trim().toLowerCase()] || ph);
}

export function whatsappUrl(phone: string | undefined, text: string): string | null {
  const digits = (phone || "").replace(/\D/g, "");
  if (digits.length < 10) return null;
  const full = digits.length <= 11 ? `55${digits}` : digits;
  return `https://wa.me/${full}?text=${encodeURIComponent(text)}`;
}

export function instagramUrl(inf: Influencer): string {
  return inf.instagramUrl || `https://www.instagram.com/${(inf.username || "").replace(/^@/, "")}/`;
}
