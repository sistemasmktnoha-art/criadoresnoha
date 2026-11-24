import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import jsPDF from "jspdf";
import { ArrowLeft, Building2, Download, Save } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FiscalInfo, useApp } from "@/context/AppContext";
import { useToast } from "@/hooks/use-toast";

function downloadFiscalPDF(info: FiscalInfo) {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Informações Fiscais - NOHA", 15, 20);
  doc.setFontSize(10);
  let y = 35;
  const items = [["Razão Social", info.companyName], ["CNPJ", info.cnpj], ["Endereço Completo", info.address], ["E-mail para envio da NF", info.invoiceEmails], ["Retenção de ISS", info.issRetention]];
  for (const [label, value] of items) {
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, 15, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(value || "—", 175);
    lines.forEach((line: string) => { doc.text(line, 15, y); y += 6; });
    y += 4;
  }
  doc.save("informacoes-fiscais-noha.pdf");
}

export default function BackofficeFiscal() {
  const { fiscalInfo, setFiscalInfo } = useApp();
  const { toast } = useToast();
  const [form, setForm] = useState(fiscalInfo);

  useEffect(() => setForm(fiscalInfo), [fiscalInfo]);

  function update(field: keyof FiscalInfo, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function save() {
    setFiscalInfo(form);
    toast({ description: "Informações fiscais atualizadas!" });
  }

  return (
    <div className="max-w-4xl space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-3 w-fit gap-2 text-muted-foreground">
        <Link to="/settings"><ArrowLeft className="h-4 w-4" /> Voltar para Configurações</Link>
      </Button>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Informações Fiscais</h1>
          <p className="mt-1 text-sm text-muted-foreground">Dados da NOHA para emissão de nota fiscal.</p>
        </div>
        <Button variant="outline" size="sm" className="w-fit gap-2" onClick={() => downloadFiscalPDF(form)}><Download className="h-4 w-4" /> Baixar PDF</Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Building2 className="h-5 w-5 text-primary" /> Dados da empresa</CardTitle>
          <CardDescription>As alterações aparecerão também no acesso Info Fiscal do menu.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Razão Social"><Input value={form.companyName} onChange={(event) => update("companyName", event.target.value)} /></Field>
            <Field label="CNPJ"><Input value={form.cnpj} onChange={(event) => update("cnpj", event.target.value)} /></Field>
          </div>
          <Field label="Endereço Completo"><Textarea value={form.address} onChange={(event) => update("address", event.target.value)} className="min-h-20" /></Field>
          <Field label="E-mail para envio da NF"><Textarea value={form.invoiceEmails} onChange={(event) => update("invoiceEmails", event.target.value)} className="min-h-20" /></Field>
          <Field label="Retenção de ISS"><Textarea value={form.issRetention} onChange={(event) => update("issRetention", event.target.value)} className="min-h-20" /></Field>
          <div className="flex justify-end"><Button onClick={save} className="gap-2"><Save className="h-4 w-4" /> Salvar alterações</Button></div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}
