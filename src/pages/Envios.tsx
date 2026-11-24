import { useState, useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { Shipment, ShippingMethod, SHIPMENT_REQUESTERS } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Package, Truck, CheckCircle2, Trash2, Edit, Search, ChevronsUpDown, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSearchParams } from "react-router-dom";
import { cn, normalizeSearch, parseLocalDate } from "@/lib/utils";

const SHIPPING_METHOD_LABELS: Record<ShippingMethod, string> = {
  pac: "PAC",
  sedex: "Sedex",
  motoboy: "Motoboy",
};

export default function Envios() {
  const { shipments, addShipment, updateShipment, deleteShipment, influencers, campaigns, storeUnits } = useApp();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingShipment, setEditingShipment] = useState<Shipment | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [infPopoverOpen, setInfPopoverOpen] = useState(false);
  const [confirmDeliverId, setConfirmDeliverId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("pendentes");

  const prefillCampaignId = searchParams.get("campaignId") || "";
  const prefillInfluencerId = searchParams.get("influencerId") || "";
  const prefillProduct = searchParams.get("product") || "";

  const [form, setForm] = useState({
    requestedBy: "",
    description: prefillProduct,
    unit: "",
    requestDate: new Date().toISOString().split("T")[0],
    responsiblePerson: "",
    influencerId: prefillInfluencerId,
    campaignId: prefillCampaignId,
    shippingMethod: "" as string,
    trackingCode: "",
  });

  function resetForm() {
    setForm({
      requestedBy: "", description: "", unit: "",
      requestDate: new Date().toISOString().split("T")[0],
      responsiblePerson: "", influencerId: "", campaignId: "", shippingMethod: "", trackingCode: "",
    });
    setEditingShipment(null);
  }

  function openNew() {
    resetForm();
    setForm((f) => ({
      ...f,
      description: prefillProduct,
      influencerId: prefillInfluencerId,
      campaignId: prefillCampaignId,
    }));
    setDialogOpen(true);
  }

  function openEdit(s: Shipment) {
    setEditingShipment(s);
    setForm({
      requestedBy: s.requestedBy,
      description: s.description,
      unit: s.unit,
      requestDate: s.requestDate,
      responsiblePerson: s.responsiblePerson,
      influencerId: s.influencerId,
      campaignId: s.campaignId || "",
      shippingMethod: s.shippingMethod || "",
      trackingCode: s.trackingCode || "",
    });
    setDialogOpen(true);
  }

  function handleSave() {
    const required = form.requestedBy && form.description && form.unit && form.requestDate && form.responsiblePerson && form.influencerId && form.shippingMethod;
    if (!required) {
      toast({ variant: "destructive", description: "Preencha todos os campos obrigatórios." });
      return;
    }
    if (editingShipment) {
      updateShipment({
        ...editingShipment,
        ...form,
        shippingMethod: form.shippingMethod as ShippingMethod,
        campaignId: form.campaignId || undefined,
        trackingCode: form.shippingMethod === "motoboy" ? undefined : (form.trackingCode || undefined),
      });
      toast({ description: "Envio atualizado!" });
    } else {
      addShipment({
        requestedBy: form.requestedBy,
        description: form.description,
        unit: form.unit,
        requestDate: form.requestDate,
        responsiblePerson: form.responsiblePerson,
        influencerId: form.influencerId,
        campaignId: form.campaignId || undefined,
        shippingMethod: form.shippingMethod as ShippingMethod,
        trackingCode: form.shippingMethod === "motoboy" ? undefined : (form.trackingCode || undefined),
        delivered: false,
      });
      toast({ description: "Envio registrado!" });
    }
    setDialogOpen(false);
    resetForm();
  }

  function handleConfirmDelivered() {
    if (!confirmDeliverId) return;
    const s = shipments.find((sh) => sh.id === confirmDeliverId);
    if (s) {
      updateShipment({
        ...s,
        delivered: true,
        deliveredAt: new Date().toISOString(),
        deliveredTrackingCode: s.trackingCode || s.deliveredTrackingCode,
      });
      toast({ description: "Envio marcado como entregue!" });
    }
    setConfirmDeliverId(null);
  }

  const applySearch = (list: Shipment[]) => {
    if (!searchTerm) return list;
    const q = normalizeSearch(searchTerm);
    return list.filter((s) => {
      const inf = influencers.find((i) => i.id === s.influencerId);
      return (
        normalizeSearch(s.description).includes(q) ||
        normalizeSearch(s.requestedBy).includes(q) ||
        normalizeSearch(s.unit).includes(q) ||
        normalizeSearch(inf?.name || "").includes(q) ||
        normalizeSearch(s.trackingCode || "").includes(q) ||
        normalizeSearch(s.deliveredTrackingCode || "").includes(q)
      );
    });
  };

  const pendingShipments = useMemo(() => applySearch(shipments.filter((s) => !s.delivered)), [shipments, searchTerm, influencers]);
  const deliveredShipments = useMemo(() => applySearch(shipments.filter((s) => s.delivered)), [shipments, searchTerm, influencers]);

  const getInf = (id: string) => influencers.find((i) => i.id === id);
  const getCamp = (id?: string) => campaigns.find((c) => c.id === id);
  const selectedInfName = form.influencerId ? getInf(form.influencerId)?.name : undefined;

  function renderShipmentCard(s: Shipment) {
    const inf = getInf(s.influencerId);
    const camp = getCamp(s.campaignId);
    return (
      <Card key={s.id} className={s.delivered ? "opacity-60" : ""}>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {inf && <img src={inf.profilePic} alt="" className="h-8 w-8 rounded-full object-cover ring-2 ring-border shrink-0" />}
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{inf?.name || "—"}</p>
                <p className="text-[11px] text-muted-foreground">{s.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {!s.delivered && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(s)}>
                  <Edit className="h-3.5 w-3.5" />
                </Button>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir envio?</AlertDialogTitle>
                    <AlertDialogDescription>Esta ação não poderá ser desfeita.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => { deleteShipment(s.id); toast({ description: "Envio excluído." }); }}>
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
            <p><span className="text-muted-foreground">Solicitante:</span> {s.requestedBy}</p>
            <p><span className="text-muted-foreground">Unidade:</span> {s.unit}</p>
            <p><span className="text-muted-foreground">Responsável:</span> {s.responsiblePerson}</p>
            <p><span className="text-muted-foreground">Data:</span> {parseLocalDate(s.requestDate).toLocaleDateString("pt-BR")}</p>
            {s.shippingMethod && (
              <p><span className="text-muted-foreground">Método:</span> {SHIPPING_METHOD_LABELS[s.shippingMethod] || s.shippingMethod}</p>
            )}
            {camp && <p className="col-span-2"><span className="text-muted-foreground">Campanha:</span> {camp.name}</p>}
          </div>

          <div className="flex items-center gap-2 pt-1">
            {s.delivered ? (
              <Badge variant="outline" className="text-[10px] bg-emerald-100 text-emerald-800 border-emerald-300">
                <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" /> Entregue
              </Badge>
            ) : s.shippingMethod === "motoboy" ? (
              <Badge variant="outline" className="text-[10px] bg-blue-100 text-blue-800 border-blue-300">
                <Truck className="h-2.5 w-2.5 mr-0.5" /> Motoboy
              </Badge>
            ) : !s.trackingCode ? (
              <Badge variant="outline" className="text-[10px] bg-amber-100 text-amber-800 border-amber-300">
                <Truck className="h-2.5 w-2.5 mr-0.5" /> Rastreio pendente
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] font-mono">{s.trackingCode}</Badge>
            )}
            {!s.delivered && (
              <Button variant="outline" size="sm" className="h-6 text-[10px] ml-auto gap-1" onClick={() => setConfirmDeliverId(s.id)}>
                <CheckCircle2 className="h-3 w-3" /> Entregue
              </Button>
            )}
          </div>
          {s.delivered && (s.deliveredAt || s.deliveredTrackingCode) && (
            <div className="rounded-md border border-border bg-secondary/40 px-2 py-1 text-[11px] text-muted-foreground">
              {s.deliveredAt && <span>Entregue em {new Date(s.deliveredAt).toLocaleDateString("pt-BR")}</span>}
              {s.deliveredTrackingCode && (
                <span>{s.deliveredAt ? " · " : ""}Rastreio: <span className="font-mono text-foreground">{s.deliveredTrackingCode}</span></span>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Envios</h1>
          <p className="text-sm text-muted-foreground">Monitore todas as solicitações de envio</p>
        </div>
        <Button className="gap-2" onClick={openNew}>
          <Plus className="h-4 w-4" /> Novo Envio
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input className="pl-8 h-9" placeholder="Buscar envio..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pendentes">
            Pendentes {pendingShipments.length > 0 && <Badge variant="secondary" className="ml-1.5 text-[10px] h-5 px-1.5">{pendingShipments.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="finalizadas">
            Entregas finalizadas {deliveredShipments.length > 0 && <Badge variant="secondary" className="ml-1.5 text-[10px] h-5 px-1.5">{deliveredShipments.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pendentes">
          {pendingShipments.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">Nenhum envio pendente</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {pendingShipments.map(renderShipmentCard)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="finalizadas">
          {deliveredShipments.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">Nenhuma entrega finalizada</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {deliveredShipments.map(renderShipmentCard)}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Confirm delivery dialog */}
      <AlertDialog open={!!confirmDeliverId} onOpenChange={(open) => { if (!open) setConfirmDeliverId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar entrega?</AlertDialogTitle>
            <AlertDialogDescription>
              O envio será movido para a aba "Entregas finalizadas". Deseja confirmar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelivered}>Confirmar entrega</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* New/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingShipment ? "Editar Envio" : "Novo Envio"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Quem está solicitando *</Label>
              <Select value={form.requestedBy} onValueChange={(v) => setForm((f) => ({ ...f, requestedBy: v }))}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                <SelectContent>
                  {SHIPMENT_REQUESTERS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">O que está sendo solicitado *</Label>
              <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Ex: Sandália Nuvem Nude - 37" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Unidade de origem *</Label>
              <Select value={form.unit} onValueChange={(v) => setForm((f) => ({ ...f, unit: v }))}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                <SelectContent>
                  {storeUnits.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Data da solicitação *</Label>
              <Input type="date" className="h-9" value={form.requestDate} onChange={(e) => setForm((f) => ({ ...f, requestDate: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Responsável pelo envio *</Label>
              <Input value={form.responsiblePerson} onChange={(e) => setForm((f) => ({ ...f, responsiblePerson: e.target.value }))} placeholder="Nome do colaborador" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Para quem será enviado *</Label>
              <Popover open={infPopoverOpen} onOpenChange={setInfPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="h-9 w-full justify-between font-normal">
                    {selectedInfName || "Selecionar influenciador..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar influenciador..." />
                    <CommandList>
                      <CommandEmpty>Nenhum encontrado.</CommandEmpty>
                      <CommandGroup>
                        {influencers.map((i) => (
                          <CommandItem
                            key={i.id}
                            value={i.name}
                            onSelect={() => {
                              setForm((f) => ({ ...f, influencerId: i.id }));
                              setInfPopoverOpen(false);
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", form.influencerId === i.id ? "opacity-100" : "opacity-0")} />
                            <img src={i.profilePic} alt="" className="h-5 w-5 rounded-full object-cover mr-2" />
                            {i.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Campanha vinculada</Label>
              <Select value={form.campaignId || "none"} onValueChange={(v) => setForm((f) => ({ ...f, campaignId: v === "none" ? "" : v }))}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {campaigns.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Método de envio *</Label>
              <Select value={form.shippingMethod} onValueChange={(v) => setForm((f) => ({ ...f, shippingMethod: v, trackingCode: v === "motoboy" ? "" : f.trackingCode }))}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pac">PAC</SelectItem>
                  <SelectItem value="sedex">Sedex</SelectItem>
                  <SelectItem value="motoboy">Motoboy</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.shippingMethod !== "motoboy" && (
              <div className="space-y-1">
                <Label className="text-xs">Código de rastreio</Label>
                <Input value={form.trackingCode} onChange={(e) => setForm((f) => ({ ...f, trackingCode: e.target.value }))} placeholder="Opcional" />
              </div>
            )}
            <Button onClick={handleSave} className="w-full">
              {editingShipment ? "Salvar alterações" : "Registrar envio"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
