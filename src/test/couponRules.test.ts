import { describe, it, expect } from "vitest";
import { hasApprovedContact, optionalCouponCode, isCouponActive } from "@/lib/couponRules";
import type { CampaignParticipant, Coupon } from "@/types";

const participant = (selectionStatus: CampaignParticipant["selectionStatus"], contactStatus: CampaignParticipant["contactStatus"]) => ({ selectionStatus, contactStatus, materialStatus: "pendente", negotiationStatus: "topou" } as CampaignParticipant);

describe("inactive coupon eligibility", () => {
  it("does not treat approval or pending material as having contacted", () => {
    expect(hasApprovedContact(participant("aprovado", "nao_iniciado"))).toBe(false);
  });
  it("requires approval even after contact", () => {
    expect(hasApprovedContact(participant("nao_aprovado", "retornou"))).toBe(false);
    expect(hasApprovedContact(participant("pendente", "aguardando_retorno"))).toBe(false);
  });
  it("allows approved creators only after contact was initiated", () => {
    for (const status of ["aguardando_retorno", "retornou", "nao_retornou"] as const) expect(hasApprovedContact(participant("aprovado", status))).toBe(true);
    expect(hasApprovedContact(participant("aprovado", "rp"))).toBe(false);
  });
});

describe("optional coupons", () => {
  it("stores an empty coupon as null", () => {
    expect(optionalCouponCode(" ")).toBeNull();
    expect(optionalCouponCode(null)).toBeNull();
    expect(optionalCouponCode(" noha10 ")).toBe("NOHA10");
  });
  it("never treats a null coupon as active", () => {
    expect(isCouponActive({ code: null, validUntil: "2026-12-31" } as Coupon, "2026-11-09")).toBe(false);
    expect(isCouponActive({ code: "NOHA10", validUntil: "2026-12-31" } as Coupon, "2026-11-09")).toBe(true);
  });
});