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
  descricao: string;
  genero: "f" | "m" | "";
  cupom: string;
  desconto: string;
  produto: string;
  scenario: Scenario;
  deal: Deal;
  history: PastPartnership[];
}

const SKIP_TITLES = new Set(["chef", "dr", "dra", "prof", "profa", "mª", "ma"]);
const cap = (w: string) =>
  w.normalize("NFKC").split("-").map((x) => (x ? x.charAt(0).toLocaleUpperCase("pt-BR") + x.slice(1).toLocaleLowerCase("pt-BR") : x)).join("-");
/** Primeiro nome com a inicial maiúscula e o resto minúsculo (ignora títulos como Dra., Chef). */
export const firstName = (full: string) => {
  const parts = (full || "").trim().split(/\s+/).filter(Boolean);
  const pick = parts.map((w) => w.normalize("NFKC")).find((w) => !SKIP_TITLES.has(w.toLowerCase().replace(/\.$/, ""))) || parts[0] || "";
  return cap(pick.replace(/[^\p{L}\p{M}'-]/gu, ""));
};

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
    genero: /^f/i.test(inf.gender || "") ? "f" : /^m/i.test(inf.gender || "") ? "m" : "",
    campanha: campaign?.name || "",
    prazo: fmtDate(campaign?.deadline),
    descricao: (campaign?.description || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
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

const REMETENTE = "Ruan";

/** Parágrafo de conceito da campanha. Natal usa o texto oficial; as demais usam a descrição cadastrada. */
function conceito(ctx: MessageContext, comVirgulaAntesDeAqui: boolean) {
  if (/natal/i.test(ctx.campanha)) {
    return `Estamos dando início a nossa campanha mais especial do ano: O Natal Noha.\nNesse ano, queremos mostrar que${comVirgulaAntesDeAqui ? "," : ""} aqui, cada presente é escolhido com intenção. Cada detalhe faz parte da experiência. E cada caixa carrega um pouco de quem presenteia e de quem recebe.`;
  }
  if (ctx.descricao) return `Estamos dando início ${ctx.campanha ? `à campanha ${ctx.campanha}` : "a uma nova campanha"}. ${ctx.descricao}`;
  return `Estamos dando início ${ctx.campanha ? `à campanha ${ctx.campanha}` : "a uma nova campanha"} e queremos muito contar com você.`;
}

const abertura = (ctx: MessageContext) => `Oiee, ${ctx.nome}, tudo bem? Quem fala é ${REMETENTE}, da Noha.`;
const campanhaNome = (ctx: MessageContext) => (/natal/i.test(ctx.campanha) ? "nosso Natal Noha" : ctx.campanha ? `a campanha ${ctx.campanha}` : "a campanha");

export interface SmartTemplate {
  id: string;
  title: string;
  category: string;
  render: (ctx: MessageContext) => string;
}

export const SMART_TEMPLATES: SmartTemplate[] = [
  {
    id: "smart-convite",
    title: "Convite para a campanha (adapta ao histórico)",
    category: "Campanha",
    render: (ctx) => {
      const novo = ctx.scenario === "novo";
      const pago = ctx.deal === "pagamento" || ctx.deal === "permuta_e_pagamento";
      if (novo) {
        return `${abertura(ctx)}\n\nSomos uma marca de calçados e acessórios masculinos, que se inspira na moda e elegância italiana.\n\n${conceito(ctx, false)}\n\nAmaríamos ter você com a gente nessa campanha.\n\nMe conta, como está sua agenda na próxima semana? Topa participar d${/natal/i.test(ctx.campanha) ? "o nosso Natal Noha" : "a nossa campanha"}?`;
      }
      if (pago) {
        return `${abertura(ctx)}\n\n${conceito(ctx, true)}\n\nAmaríamos ter você com a gente novamente, para celebrar essa época tão especial.\n\nMe conta, como está sua agenda na próxima semana? Quais seriam as condições para seguirmos com a parceria?\n\nTamo junto!`;
      }
      return `${abertura(ctx)}\n\n${conceito(ctx, true)}\n\nAmaríamos ter você com a gente novamente, e para celebrar essa época tão especial gostaríamos de te presentear com um Noha, para se presentear, ou, para presentear quem você ama, e compartilhar sua experiência com a sua audiência.\n\nMe conta, como está sua agenda na próxima semana? Topa participar novamente conosco?`;
    },
  },
  {
    id: "smart-whats-primeira",
    title: "Primeira mensagem no WhatsApp (depois do Instagram)",
    category: "Campanha",
    render: (ctx) => {
      const natal = /natal/i.test(ctx.campanha);
      const quando = natal ? "nossa campanha de Natal" : ctx.campanha ? `a campanha ${ctx.campanha}` : "uma nova campanha";
      return `Oiee! Tudo bem? Ruan, do Marketing da Noha, aqui!\nConforme conversamos pelo Instagram, estamos preparando ${quando} e seria muito legal ter você com a gente nessa ação!\nPosso te enviar o briefing pra você entender melhor a proposta? ${natal ? "🎄✨" : "✨"}`;
    },
  },
  {
    id: "smart-assessoria-convite",
    title: "Assessoria: convite (falando com a assessoria)",
    category: "Assessoria",
    render: (ctx) => {
      const novo = ctx.scenario === "novo";
      const pago = ctx.deal === "pagamento" || ctx.deal === "permuta_e_pagamento";
      const dela = ctx.genero === "f" ? "dela" : ctx.genero === "m" ? "dele" : `de ${ctx.nome}`;
      const abertura = "Oiee! Tudo bem? Ruan, do Marketing da Noha, por aqui.";
      const marca = novo ? "Somos uma marca de calçados e acessórios masculinos, que se inspira na moda e elegância italiana.\n\n" : "";
      const quer = novo
        ? `Gostaríamos muito de ter ${ctx.nome} com a gente nessa campanha.`
        : `Amaríamos ter ${ctx.nome} com a gente novamente, para celebrar essa época tão especial.`;
      const final = pago
        ? `Como está a agenda ${dela} na próxima semana? Consigo te enviar o briefing para você montar o orçamento?`
        : `A ideia é presentear ${ctx.nome} com um Noha, para se presentear ou para presentear quem ama, e compartilhar a experiência com a audiência.\n\nComo está a agenda ${dela} na próxima semana? Faz sentido para vocês?`;
      return `${abertura}\n\n${marca}${conceito(ctx, !novo)}\n\n${quer}\n\n${final}\n\nTamo junto!`;
    },
  },
  {
    id: "smart-assessoria-followup",
    title: "Assessoria: follow-up (sem retorno)",
    category: "Assessoria",
    render: (ctx) =>
      `Oiee! Tudo bem? Passando pra retomar nosso convite para ${/natal/i.test(ctx.campanha) ? "o Natal Noha" : ctx.campanha ? `a campanha ${ctx.campanha}` : "a nossa campanha"} com ${ctx.nome}. Conseguiram ver por aí? Ficamos no aguardo, e se for mais fácil, a gente alinha tudo por aqui mesmo! 🎄✨`,
  },
  {
    id: "smart-followup",
    title: "Follow-up (sem retorno)",
    category: "Follow-up",
    render: (ctx) =>
      `Oiee! Tudo bem? Passando pra retomar nosso convite para ${/natal/i.test(ctx.campanha) ? "o Natal Noha" : ctx.campanha ? `a campanha ${ctx.campanha}` : "a nossa campanha"}! Você consegue me passar seu WhatsApp pra facilitar nossa comunicação? 🎄✨`,
  },
  {
    id: "smart-briefing",
    title: "Confirmação e próximos passos",
    category: "Campanha",
    render: (ctx) =>
      `${ctx.nome}, que bom ter você com a gente! 🤍\n\nVou te enviar o briefing d${/natal/i.test(ctx.campanha) ? "o nosso Natal Noha" : "a campanha"} para alinharmos todos os detalhes.${ctx.produto ? `\n\nO produto que separamos para você: ${ctx.produto}.` : ""}${ctx.cupom ? `\n\nSeu cupom exclusivo: ${ctx.cupom}${ctx.desconto ? ` (${ctx.desconto}% de desconto)` : ""}.` : ""}\n\nPode me confirmar o melhor endereço para o envio?\n\nQualquer dúvida, é só chamar.`,
  },
  {
    id: "smart-prazo",
    title: "Cobrança de conteúdo",
    category: "Follow-up",
    render: (ctx) =>
      `Oiee, ${ctx.nome}, tudo bem?\n\nPassando para saber como está o conteúdo d${/natal/i.test(ctx.campanha) ? "o Natal Noha" : "a campanha"}. Se já tiver o material, pode me enviar por aqui para aprovarmos juntos.\n\nSe precisar de qualquer coisa da nossa parte, é só falar.\n\nTamo junto!`,
  },
  {
    id: "smart-obrigado",
    title: "Agradecimento pós-campanha",
    category: "Pós-campanha",
    render: (ctx) =>
      `${ctx.nome}, muito obrigado pela parceria${/natal/i.test(ctx.campanha) ? " no Natal Noha" : ctx.campanha ? ` na campanha ${ctx.campanha}` : ""}. 🤍\n\nO conteúdo ficou lindo e representou exatamente o que queremos transmitir. Foi um prazer ter você com a gente.\n\nVamos adorar celebrar novas histórias juntos.\n\nTamo junto!`,
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
