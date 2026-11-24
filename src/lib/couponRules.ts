import type { CampaignParticipant, Coupon } from "@/types";

export function hasApprovedContact(p: CampaignParticipant): boolean {
  return p.selectionStatus === "aprovado" &&
    ["aguardando_retorno", "retornou", "nao_retornou"].includes(p.contactStatus);
}

export function optionalCouponCode(value: string | null | undefined): string | null {
  return value?.trim().toUpperCase() || null;
}

export function isCouponActive(c: Coupon, today: string): boolean {
  return Boolean(optionalCouponCode(c.code)) && c.validUntil >= today && (!c.startDate || c.startDate <= today);
}