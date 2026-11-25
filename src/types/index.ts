export interface RatingEntry {
  id: string;
  author: string;
  rating: number;
  reason: string;
  createdAt: string;
}

export interface Influencer {
  id: string;
  /** Nome de exibição (usado como nome principal na plataforma) */
  name: string;
  /** Nome completo (usado em buscas e documentos) */
  fullName?: string;
  username: string;
  /** URL completa do perfil no Instagram */
  instagramUrl?: string;
  profilePic: string;
  followers: number;
  niche: string;
  location: string;
  gender: string;
  rating: number;
  totalRatings: number;
  isActive: boolean;
  notes: string;
  /** Legado: contato genérico — manter sincronizado com email/whatsapp */
  contact: string;
  whatsapp?: string;
  email?: string;
  addedAt: string;
  cpf?: string;
  cnpj?: string;
  /** Legado: texto livre de pagamento (preservado para retrocompatibilidade) */
  paymentData?: string;
  paymentBank?: string;
  paymentAgency?: string;
  paymentAccount?: string;
  paymentAccountType?: "fisica" | "juridica";
  paymentPix?: string;
  /** Legado: endereço em texto livre */
  shippingAddress?: string;
  addressStreet?: string;
  addressNumber?: string;
  addressComplement?: string;
  addressNeighborhood?: string;
  addressZip?: string;
  addressCity?: string;
  addressState?: string;
  /** Espaço para recebimento de encomendas */
  addressReceptionSpace?: "portaria_24h" | "sem_portaria_com_espaco" | "sem_portaria_sem_espaco";
  birthDate?: string;

  isAmbassador?: boolean;
  ambassadorStartDate?: string;
  ambassadorEndDate?: string;
  ambassadorCommission?: number;
  ambassadorBenefits?: string;
  ambassadorProductsPerMonth?: number;
  ambassadorReportDoneMonths?: string[];
  ambassadorProductDoneMonths?: string[];
  /** Month-by-month product status: key = "YYYY-MM", value = status */
  ambassadorProductMonthlyStatus?: Record<string, "pendente" | "retirado" | "enviado">;
  /** Month-by-month commission payment status: key = "YYYY-MM", value = status */
  ambassadorCommissionMonthlyStatus?: Record<string, "pendente" | "programada" | "paga">;
  // Delivery evaluation stats (accumulated from campaign ratings)
  deliveryOnTimeCount?: number;
  deliveryLateCount?: number;
  deliveryLowCount?: number;
  deliveryGoodCount?: number;
  deliveryExceededCount?: number;
  // Characteristics / tags
  characteristics?: string[];
  // Rating history
  ratingHistory?: RatingEntry[];
  // IDs de outros influenciadores vinculados (parentesco, relacionamento, etc.)
  linkedInfluencerIds?: string[];
}

// === Campaign Participant (influencer in a campaign) ===

export type ContactStatus = "nao_iniciado" | "aguardando_retorno" | "retornou" | "nao_retornou" | "rp";
export type DeliveryType = "visita_loja" | "envio_casa";
export type NegotiationStatus = "pendente" | "em_negociacao" | "topou" | "nao_topou";
export type BriefingStatus = "pendente" | "enviado" | "nao_se_aplica";
export type MaterialStatus = "pendente" | "enviado" | "aguardando_aprovacao" | "aprovado" | "agendado" | "publicado" | "nao_se_aplica";

export type SelectionStatus = "pendente" | "aprovado" | "nao_aprovado";

export interface DirectorNote {
  id: string;
  author: string;
  text: string;
  createdAt: string;
}

export const DIRECTOR_AUTHORS = ["Lilla", "Duda", "Clara", "João", "Gustavo", "Simon"] as const;

export interface CampaignParticipant {
  influencerId: string;
  selectionStatus?: SelectionStatus;
  selectionRejectionReason?: string;
  contactStatus: ContactStatus;
  deliveryType: DeliveryType | null;
  managerNotified: boolean;
  storeUnit?: string;
  storeProduct?: string;
  storeVisitDone?: boolean;
  chosenProduct: string;
  shippingAddress: string;
  shippingName: string;
  shippingRequested?: boolean;
  negotiationStatus: NegotiationStatus;
  negotiationCondition: string;
  negotiationType?: "permuta" | "pagamento" | "permuta_e_pagamento" | "nao_se_aplica";
  negotiationPaymentAmount?: number;
  negotiationProductCount?: number;
  negotiationProductCost?: number;
  negotiationBudget?: string;
  paidByFranchisee?: boolean;
  briefingStatus?: BriefingStatus;
  materialStatus: MaterialStatus;
  publishCollaboration: boolean;
  scheduledDate: string;
  notes?: string;
  directorNotes?: DirectorNote[];
  paymentScheduled?: boolean;
  campaignRating?: number;
  campaignRatingReason?: string;
  campaignDeliveryOnTime?: boolean;
  campaignDeliveryLevel?: "baixo" | "bom" | "superou_expectativas";
  /** Data/hora do último contato registrado (ISO). Usado no painel de pendências. */
  lastContactAt?: string;
  /** Proposta recebida e ainda não analisada. */
  proposalPending?: boolean;
  /** Contato feito por meio da assessoria do creator. */
  viaAssessoria?: boolean;
}

export interface FileAttachment {
  id: string;
  name: string;
  type: string;
  url: string;
  size: number;
}

export interface CampaignMaterial {
  id: string;
  name: string;
  type: "briefing" | "card" | "texto";
  content: string;
  link?: string;
  files: FileAttachment[];
  createdAt: string;
}

export interface ContentMetrics {
  likes: number;
  comments: number;
  views: number;
  shares: number;
  impressions?: number;
  accountsReached?: number;
  saves?: number;
}

export interface ContentMetricsSnapshot {
  date: string;
  metrics: ContentMetrics;
}

export interface Campaign {
  id: string;
  name: string;
  description: string;
  objective: string;
  status: "a_iniciar" | "em_andamento" | "finalizada";
  startDate: string;
  deadline: string;
  influencerIds: string[];
  participants: CampaignParticipant[];
  contents: CampaignContent[];
  materials: CampaignMaterial[];
  createdAt: string;
  coverImage?: string;
  coverImagePosition?: number;
  targetInfluencers?: number | null;
}

export interface CampaignContent {
  id: string;
  influencerId: string;
  description: string;
  url: string;
  files: FileAttachment[];
  status: "aguardando_aprovacao" | "aguardando_ajuste" | "aprovado";
  submittedAt: string;
  metrics?: ContentMetrics;
  metricsHistory?: ContentMetricsSnapshot[];
  reviewClosed?: boolean;
  nextUpdateDate?: string;
}

export type NegotiationType = "permuta" | "pagamento" | "permuta_e_pagamento";

export const STORE_UNITS = [
  "Noha Conselheiro",
  "Noha Recife",
  "Noha RioMar Recife",
  "Noha Caruaru",
  "Noha Fortaleza",
  "Noha Rosa e Silva",
  "Noha Goiânia",
  "Noha Balneário",
  "Noha Natal Shopping",
  "Noha Midway Mall",
  "Noha Maceió",
  "Noha Aracaju",
  "Noha Plaza Casa Forte",
];

export interface Coupon {
  id: string;
  influencerId: string;
  code: string | null;
  discountPercent: number;
  startDate?: string;
  validUntil: string;
  isActive: boolean;
  monthlySales?: Record<string, number>;
  notifiedExpiry?: boolean;
}

// === Recurrence (long-term partnerships) ===

export interface RecurrenceMonthDelivery {
  month: string;
  deliverables: string;
  agreementType: "permuta" | "pago" | "permuta_e_pago";
  paymentAmount: number;
  productCount: number;
  productCost?: number;
  notes: string;
  paymentDone?: boolean;
  productCollected?: boolean;
  contentLink?: string;
}

export interface Recurrence {
  id: string;
  influencerId: string;
  title: string;
  startMonth: string;
  endMonth: string;
  months: RecurrenceMonthDelivery[];
  status: "ativa" | "pausada" | "encerrada";
  createdAt: string;
}

// === Shipments (Envios) ===

export const SHIPMENT_REQUESTERS = ["Lilla", "Duda", "Clara", "Simon", "João", "Gustavo"] as const;

export const SHIPMENT_UNITS = [
  "Conselheiro", "Rosa e Silva", "Shopping Recife", "Plaza Casa Forte",
  "RioMar Recife", "Fortaleza", "Caruaru", "Natal", "Maceió",
  "Aracaju", "Goiânia", "Joinville", "Balneário",
] as const;

export type ShippingMethod = "pac" | "sedex" | "motoboy";

export interface Shipment {
  id: string;
  requestedBy: string;
  description: string;
  unit: string;
  requestDate: string;
  responsiblePerson: string;
  influencerId: string;
  campaignId?: string;
  shippingMethod?: ShippingMethod;
  trackingCode?: string;
  delivered: boolean;
  deliveredAt?: string;
  deliveredTrackingCode?: string;
  createdAt: string;
}

export const NICHES = [
  "Moda", "Lifestyle", "Esportes", "Turismo", "Tecnologia",
  "Casa e Decoração", "Família", "Fitness", "Gastronomia",
  "Beleza", "Negócios", "Humor", "Viagens", "Saúde",
  "Entretenimento", "Educação", "Games", "Finanças", "Review", "Outros",
];

export const LOCATIONS = [
  "Recife", "Natal", "Aracaju", "Maceió", "Fortaleza", "Caruaru",
  "Balneário", "Joinville", "Goiânia", "São Paulo", "Salvador",
  "Teresina", "Campina Grande", "João Pessoa", "Brasília", "Rio de Janeiro", "Indefinido",
];

// === Idea Inbox ===

export const IDEA_AUTHORS = [
  "Lilla", "Duda Santos", "Duda Mello", "Alice", "Samantha", "Ruan",
  "Sofia", "Raquel", "André", "Márcio", "Jéssica", "Carlos",
  "Amanda", "Milena", "Gustavo", "João", "Clara", "Simon",
] as const;

export const IDEA_EVALUATORS = ["Clara", "Duda", "Simon", "João", "Gustavo"] as const;

export interface IdeaDeposit {
  id: string;
  author: string;
  link: string;
  type: "influenciador" | "conteudo";
  observation?: string;
  status: "aguardando_avaliacao" | "aprovado" | "reprovado";
  evaluatedBy?: string;
  createdAt: string;
}

// === Inbox Submissions (formulário externo via webhook) ===

export interface InboxSubmissionRawData {
  instagram?: string;
  tiktok?: string;
  nome_completo?: string;
  nome_exibicao?: string;
  data_nascimento?: string;
  cpf?: string;
  possui_cnpj?: string;
  email?: string;
  telefone?: string;
  cep?: string;
  rua_avenida?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  ponto_referencia?: string;
  possui_portaria?: string;
  alguem_para_receber?: string;
  titular_pagamento?: string;
  cpf_cnpj_titular?: string;
  tipo_chave_pix?: string;
  chave_pix?: string;
  [key: string]: unknown;
}

export interface InboxSubmission {
  id: string;
  created_at: string;
  status: "pending" | "converted" | "merged";
  raw_data: InboxSubmissionRawData;
}

// === Tasks ===

export interface Task {
  id: string;
  title: string;
  description: string;
  /** YYYY-MM-DD */
  deadline: string;
  completed: boolean;
  completedAt?: string;
  createdAt: string;
  /** Unique key when auto-generated; undefined for manual tasks */
  source?: string;
  /** Optional internal link */
  link?: string;
}

export interface MessageTemplate {
  id: string;
  title: string;
  category: string;
  body: string;
}
