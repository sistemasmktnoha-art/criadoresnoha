import jsPDF from "jspdf";
import type { Campaign, CampaignParticipant, Coupon, Influencer } from "@/types";

const DEAL: Record<string, string> = {
  permuta: "Permuta",
  pagamento: "Pagamento",
  permuta_e_pagamento: "Permuta + pagamento",
};

function htmlToText(html = ""): string {
  return html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function fmtDate(iso?: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}

export function generateBriefingPdf(
  campaign: Campaign,
  participant: CampaignParticipant,
  inf: Influencer,
  coupons: Coupon[],
) {
  const doc = new jsPDF();
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 16;
  let y = 0;

  const ensure = (h: number) => {
    if (y + h > H - 16) { doc.addPage(); y = 20; }
  };
  const heading = (t: string) => {
    ensure(12);
    y += 4;
    doc.setFont("helvetica", "bold").setFontSize(12).setTextColor(40, 40, 40);
    doc.text(t, M, y);
    y += 6;
  };
  const para = (t: string, size = 10) => {
    doc.setFont("helvetica", "normal").setFontSize(size).setTextColor(60, 60, 60);
    for (const line of doc.splitTextToSize(t, W - M * 2) as string[]) {
      ensure(5.5);
      doc.text(line, M, y);
      y += 5.2;
    }
    y += 1;
  };
  const row = (label: string, value: string) => {
    if (!value) return;
    ensure(6);
    doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(40, 40, 40);
    doc.text(label, M, y);
    doc.setFont("helvetica", "normal").setTextColor(60, 60, 60);
    const lines = doc.splitTextToSize(value, W - M * 2 - 38) as string[];
    lines.forEach((l, i) => { if (i) ensure(5.5); doc.text(l, M + 38, y); if (i < lines.length - 1) y += 5.2; });
    y += 6;
  };

  // Faixa de topo
  doc.setFillColor(30, 30, 30).rect(0, 0, W, 34, "F");
  doc.setTextColor(255, 255, 255).setFont("helvetica", "bold").setFontSize(20).text("NOHA", M, 17);
  doc.setFont("helvetica", "normal").setFontSize(11).text(`BRIEFING  |  ${campaign.name}`, M, 27);
  y = 46;

  const today = new Date().toISOString().slice(0, 10);
  const coupon = coupons.find(
    (c) => c.influencerId === inf.id && c.isActive && c.code && (!c.validUntil || c.validUntil >= today),
  );

  heading("Para");
  row("Creator", `${inf.name}${inf.username ? `  (@${inf.username.replace(/^@/, "")})` : ""}`);
  row("Produto", participant.chosenProduct || participant.storeProduct || "");
  const neg = participant.negotiationType;
  row("Tipo de parceria", neg && neg !== "nao_se_aplica" ? DEAL[neg] || "" : "");
  if (coupon) {
    row("Cupom", `${coupon.code}${coupon.discountPercent ? `  (${coupon.discountPercent}% de desconto)` : ""}`);
    row("Validade do cupom", fmtDate(coupon.validUntil));
  }
  row("Collab com a marca", participant.publishCollaboration ? "Sim, publicar em collab" : "");

  if (campaign.description?.trim()) { heading("Sobre a campanha"); para(htmlToText(campaign.description)); }
  if (campaign.objective?.trim()) { heading("Objetivo"); para(htmlToText(campaign.objective)); }

  for (const m of (campaign.materials || []).filter((x) => x.type === "briefing")) {
    heading(m.name || "Briefing");
    if (m.content?.trim()) para(htmlToText(m.content));
    if (m.link) para(`Link: ${m.link}`);
    (m.files || []).forEach((f) => para(`Arquivo: ${f.name}`));
  }

  const safe = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "");
  doc.save(`Briefing-${safe(campaign.name)}-${safe(inf.name)}.pdf`);
}
