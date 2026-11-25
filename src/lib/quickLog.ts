import type { CampaignParticipant, DirectorNote } from "@/types";

export type QuickActionId =
  | "briefing_enviado"
  | "via_assessoria"
  | "proposta_recebida"
  | "proposta_analisada"
  | "aguardando_retorno"
  | "respondeu";

export interface QuickAction {
  id: QuickActionId;
  label: string;
  note: string;
}

export const QUICK_ACTIONS: QuickAction[] = [
  { id: "briefing_enviado", label: "Briefing enviado", note: "briefing enviado" },
  { id: "aguardando_retorno", label: "Aguardando retorno", note: "aguardando retorno" },
  { id: "respondeu", label: "Respondeu", note: "respondeu" },
  { id: "via_assessoria", label: "Via assessoria", note: "contato via assessoria" },
  { id: "proposta_recebida", label: "Proposta recebida", note: "proposta recebida, a analisar" },
  { id: "proposta_analisada", label: "Proposta analisada", note: "proposta analisada" },
];

const fmt = (d: Date) =>
  `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;

/** Monta o patch do participante para uma ação rápida (observação + status). */
export function buildQuickPatch(
  p: CampaignParticipant,
  actionId: QuickActionId,
  author: string,
): Partial<CampaignParticipant> {
  const action = QUICK_ACTIONS.find((a) => a.id === actionId)!;
  const now = new Date();
  const note: DirectorNote = {
    id: `${now.getTime()}-${actionId}`,
    author,
    text: `${fmt(now)}: ${action.note}`,
    createdAt: now.toISOString(),
  };
  const patch: Partial<CampaignParticipant> = {
    directorNotes: [...(p.directorNotes || []), note],
  };
  if (actionId !== "proposta_analisada") patch.lastContactAt = now.toISOString();
  switch (actionId) {
    case "briefing_enviado": patch.briefingStatus = "enviado"; break;
    case "aguardando_retorno": patch.contactStatus = "aguardando_retorno"; break;
    case "respondeu": patch.contactStatus = "retornou"; break;
    case "via_assessoria": patch.viaAssessoria = true; break;
    case "proposta_recebida": patch.proposalPending = true; break;
    case "proposta_analisada": patch.proposalPending = false; break;
  }
  return patch;
}
