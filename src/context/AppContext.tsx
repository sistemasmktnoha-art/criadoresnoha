import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Influencer, Campaign, Coupon, Recurrence, IdeaDeposit, Shipment, Task, MessageTemplate, STORE_UNITS as DEFAULT_STORE_UNITS, LOCATIONS, NICHES } from "@/types";
import { mockInfluencers, mockCampaigns } from "@/data/mockData";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import { hasApprovedContact, isCouponActive } from "@/lib/couponRules";

function isInfluencerActive(id: string, campaigns: Campaign[], recurrences: Recurrence[]): boolean {
  const activeInCampaign = campaigns.some(
    (c) =>
      c.status === "em_andamento" &&
      c.participants?.some(
        (p) => p.influencerId === id && p.negotiationStatus === "topou"
      )
  );
  if (activeInCampaign) return true;
  return recurrences.some(
    (r) => r.influencerId === id && r.status === "ativa"
  );
}

interface AppContextType {
  influencers: Influencer[];
  campaigns: Campaign[];
  coupons: Coupon[];
  recurrences: Recurrence[];
  ideaDeposits: IdeaDeposit[];
  shipments: Shipment[];
  tasks: Task[];
  addInfluencer: (inf: Omit<Influencer, "id" | "addedAt" | "rating" | "totalRatings">) => void;
  updateInfluencer: (inf: Influencer) => void;
  deleteInfluencer: (id: string) => void;
  addCampaign: (c: Omit<Campaign, "id" | "createdAt" | "contents">) => void;
  updateCampaign: (c: Campaign) => void;
  deleteCampaign: (id: string) => void;
  rateInfluencer: (id: string, rating: number, author?: string, reason?: string) => void;
  getCampaignsForInfluencer: (id: string) => Campaign[];
  addCoupon: (coupon: Omit<Coupon, "id">) => void;
  updateCoupon: (coupon: Coupon) => void;
  deleteCoupon: (id: string) => void;
  getCouponsForInfluencer: (influencerId: string) => Coupon[];
  /** IDs de influenciadores ativos em campanha (não finalizada) sem cupom ativo */
  couponReminderInfluencerIds: Set<string>;
  addRecurrence: (r: Omit<Recurrence, "id" | "createdAt">) => void;
  updateRecurrence: (r: Recurrence) => void;
  deleteRecurrence: (id: string) => void;
  addIdeaDeposit: (idea: Omit<IdeaDeposit, "id" | "createdAt" | "status">) => void;
  updateIdeaDeposit: (idea: IdeaDeposit) => void;
  deleteIdeaDeposit: (id: string) => void;
  addShipment: (s: Omit<Shipment, "id" | "createdAt">) => void;
  updateShipment: (s: Shipment) => void;
  deleteShipment: (id: string) => void;
  addTask: (t: Omit<Task, "id" | "createdAt" | "completed">) => void;
  updateTask: (t: Task) => void;
  deleteTask: (id: string) => void;
  toggleTaskComplete: (id: string) => void;
  messageTemplates: MessageTemplate[] | null;
  setMessageTemplates: (templates: MessageTemplate[]) => void;
  /** Unidades (lojas) cadastradas — gerenciáveis em Configurações */
  storeUnits: string[];
  setStoreUnits: (units: string[]) => void;
  /** Listas auxiliares (localizações, gêneros, categorias) — gerenciáveis em Configurações */
  catalogs: Catalogs;
  setCatalogs: (c: Catalogs) => void;
  fiscalInfo: FiscalInfo;
  setFiscalInfo: (info: FiscalInfo) => void;
  teamMembers: string[];
  setTeamMembers: (members: string[]) => void;
  loaded: boolean;
}

// Mantém a mesma instância do contexto entre recarregamentos (HMR),
// evitando o erro "useApp must be used within AppProvider" durante o desenvolvimento.
const globalStore = globalThis as unknown as { __nohaAppContext?: React.Context<AppContextType | null> };
const AppContext = globalStore.__nohaAppContext ?? createContext<AppContextType | null>(null);
globalStore.__nohaAppContext = AppContext;

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

const DB_TIMEOUT_MS = 120000;
const DB_RETRY_ATTEMPTS = 3;
const CACHE_PREFIX = "app_data_cache_v2";

type PersistedKey = "influencers" | "campaigns" | "coupons" | "recurrences" | "ideaDeposits" | "shipments" | "tasks" | "messageTemplates" | "storeUnits" | "catalogs" | "fiscalInfo" | "teamMembers";

export interface FiscalInfo {
  companyName: string;
  cnpj: string;
  address: string;
  invoiceEmails: string;
  issRetention: string;
}

export const DEFAULT_FISCAL_INFO: FiscalInfo = {
  companyName: "NOHA SHOES NEGOCIOS E PARTICIPACOES LTDA",
  cnpj: "35.763.121.0001/70",
  address: "Rua Professor Osias Ribeiro, número 105, Boa Viagem, CEP: 51.111-100",
  invoiceEmails: "maria.eduarda@nohashoes.com.br, camilla@nohashoes.com.br e carlos.oliveira@nohashoes.com.br",
  issRetention: "Não temos retenção de ISS — a nota deve ser emitida sem retenções.",
};

export const DEFAULT_TEAM_MEMBERS = ["Lilla", "Duda", "Clara", "João", "Gustavo", "Simon"];

function normalizeFiscalInfo(value: unknown): FiscalInfo {
  const info = value && typeof value === "object" ? value as Partial<FiscalInfo> : {};
  return { ...DEFAULT_FISCAL_INFO, ...info };
}

function normalizeTeamMembers(value: unknown): string[] {
  if (!Array.isArray(value)) return DEFAULT_TEAM_MEMBERS;
  const names = value.map(String).map((name) => name.trim()).filter(Boolean);
  return Array.from(new Set(names));
}

export interface Catalogs { locations: string[]; genders: string[]; categories: string[] }
export const DEFAULT_CATALOGS: Catalogs = {
  locations: [...LOCATIONS],
  genders: ["Feminino", "Masculino", "Outro"],
  categories: [...NICHES],
};
function normalizeCatalogs(v: unknown): Catalogs {
  const c = (v && typeof v === "object" ? v : {}) as Partial<Catalogs>;
  const arr = (x: unknown, d: string[]) => (Array.isArray(x) && x.length ? x.map(String) : d);
  return {
    locations: arr(c.locations, DEFAULT_CATALOGS.locations),
    genders: arr(c.genders, DEFAULT_CATALOGS.genders),
    categories: arr(c.categories, DEFAULT_CATALOGS.categories),
  };
}

function withTimeout<T>(promise: PromiseLike<T>, timeoutMs = DB_TIMEOUT_MS): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("REQUEST_TIMEOUT")), timeoutMs);

    Promise.resolve(promise)
      .then((result) => {
        clearTimeout(timeout);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timeout);
        reject(error);
      });
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getCacheKey(userId: string, key: PersistedKey): string {
  return `${CACHE_PREFIX}:${userId}:${key}`;
}

function loadFromCache<T>(userId: string, key: PersistedKey): T | null {
  try {
    const raw = localStorage.getItem(getCacheKey(userId, key));
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function saveToCache(userId: string, key: PersistedKey, value: unknown) {
  try {
    localStorage.setItem(getCacheKey(userId, key), JSON.stringify(value));
  } catch {
    // no-op
  }
}

function isTransientDataError(error: unknown): boolean {
  const message = String((error as any)?.message || "").toLowerCase();
  return /request_timeout|failed to fetch|network|timeout|5\d\d|connection/i.test(message);
}

async function runLegacyMediaMigration() {
  try {
    for (let pass = 0; pass < 6; pass++) {
      const { data, error } = await supabase.functions.invoke("migrate-media-base64", {
        body: { limit: 40 },
      });

      if (error) {
        console.warn("Falha na migração de mídia legada:", error);
        break;
      }

      if (!data?.hasMore) {
        break;
      }
    }
  } catch (error) {
    console.warn("Migração de mídia legada indisponível:", error);
  }
}

async function loadFromDB(userId: string, key: PersistedKey) {
  try {
    const query = supabase
      .from("app_data")
      .select("data")
      .eq("user_id", userId)
      .eq("data_key", key)
      .maybeSingle();

    const { data, error } = await withTimeout(query, DB_TIMEOUT_MS) as {
      data: { data: unknown } | null;
      error: unknown;
    };

    return { value: data?.data ?? null, error };
  } catch (error) {
    return { value: null, error };
  }
}

async function loadFromDBWithRetry(userId: string, key: PersistedKey) {
  let lastResult: { value: unknown; error: unknown } = { value: null, error: null };

  for (let attempt = 0; attempt < DB_RETRY_ATTEMPTS; attempt++) {
    const result = await loadFromDB(userId, key);
    if (!result.error) return result;

    lastResult = result;
    if (!isTransientDataError(result.error) || attempt === DB_RETRY_ATTEMPTS - 1) {
      return result;
    }

    await sleep(1000 * Math.pow(2, attempt));
  }

  return lastResult;
}

async function saveToDB(userId: string, key: PersistedKey, value: any) {
  saveToCache(userId, key, value);
  try {
    const { error } = await supabase.from("app_data").upsert(
      { user_id: userId, data_key: key, data: value, updated_at: new Date().toISOString() },
      { onConflict: "user_id,data_key" }
    );
    if (error) {
      console.error(`Erro ao salvar ${key}:`, error);
    }
  } catch (error) {
    console.error(`Falha inesperada ao salvar ${key}:`, error);
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [recurrences, setRecurrences] = useState<Recurrence[]>([]);
  const [ideaDeposits, setIdeaDeposits] = useState<IdeaDeposit[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [messageTemplates, setMessageTemplatesState] = useState<MessageTemplate[] | null>(null);
  const [storeUnits, setStoreUnitsState] = useState<string[]>(DEFAULT_STORE_UNITS);
  const [catalogs, setCatalogsState] = useState<Catalogs>(DEFAULT_CATALOGS);
  const [fiscalInfo, setFiscalInfoState] = useState<FiscalInfo>(DEFAULT_FISCAL_INFO);
  const [teamMembers, setTeamMembersState] = useState<string[]>(DEFAULT_TEAM_MEMBERS);
  const [loaded, setLoaded] = useState(false);
  const saveGeneration = useRef(0);
  const loadedRef = useRef(false);
  const userRef = useRef(user);
  const mediaMigrationDoneRef = useRef<Record<string, boolean>>({});
  const writeTokensRef = useRef<Partial<Record<PersistedKey, number>>>({});
  // Tracks keys that the user modified locally so the async DB load
  // does not overwrite them with stale server data.
  const localWritesRef = useRef<Set<PersistedKey>>(new Set());

  useEffect(() => { loadedRef.current = loaded; }, [loaded]);
  useEffect(() => { userRef.current = user; }, [user]);


  useEffect(() => {
    if (!user) {
      setInfluencers([]);
      setCampaigns([]);
      setCoupons([]);
      setRecurrences([]);
      setIdeaDeposits([]);
      setShipments([]);
      setTasks([]);
      setMessageTemplatesState(null);
      setStoreUnitsState(DEFAULT_STORE_UNITS);
      setCatalogsState(DEFAULT_CATALOGS);
      setFiscalInfoState(DEFAULT_FISCAL_INFO);
      setTeamMembersState(DEFAULT_TEAM_MEMBERS);
      setLoaded(false);
      loadedRef.current = false;
      saveGeneration.current = 0;
      writeTokensRef.current = {};
      localWritesRef.current = new Set();
      return;
    }

    // New load cycle for this user → clear pending-write marks.
    localWritesRef.current = new Set();
    writeTokensRef.current = {};


    saveGeneration.current++;
    const loadGen = saveGeneration.current;
    const userId = user.id;

    const cachedInfluencers = loadFromCache<Influencer[]>(userId, "influencers");
    const cachedCampaigns = loadFromCache<Campaign[]>(userId, "campaigns");
    const cachedCoupons = loadFromCache<Coupon[]>(userId, "coupons");
    const cachedRecurrences = loadFromCache<Recurrence[]>(userId, "recurrences");
    const cachedIdeas = loadFromCache<IdeaDeposit[]>(userId, "ideaDeposits");
    const cachedShipments = loadFromCache<Shipment[]>(userId, "shipments");
    const cachedTasks = loadFromCache<Task[]>(userId, "tasks");
    const cachedTemplates = loadFromCache<MessageTemplate[]>(userId, "messageTemplates");
    const cachedUnits = loadFromCache<string[]>(userId, "storeUnits");
    if (cachedUnits && cachedUnits.length) setStoreUnitsState(cachedUnits);
    const cachedCatalogs = loadFromCache<Catalogs>(userId, "catalogs");
    if (cachedCatalogs) setCatalogsState(normalizeCatalogs(cachedCatalogs));
    const cachedFiscalInfo = loadFromCache<FiscalInfo>(userId, "fiscalInfo");
    if (cachedFiscalInfo) setFiscalInfoState(normalizeFiscalInfo(cachedFiscalInfo));
    const cachedTeamMembers = loadFromCache<string[]>(userId, "teamMembers");
    if (cachedTeamMembers) setTeamMembersState(normalizeTeamMembers(cachedTeamMembers));

    // Hydrate from cache for instant UI, but DO NOT mark these as local writes —
    // we want the server data to win on initial load so other devices stay in sync.
    if (cachedInfluencers) setInfluencers(cachedInfluencers);
    if (cachedCampaigns) setCampaigns(cachedCampaigns);
    if (cachedCoupons) setCoupons(cachedCoupons);
    if (cachedRecurrences) setRecurrences(cachedRecurrences);
    if (cachedIdeas) setIdeaDeposits(cachedIdeas);
    if (cachedShipments) setShipments(cachedShipments);
    if (cachedTasks) setTasks(cachedTasks);
    if (cachedTemplates) setMessageTemplatesState(cachedTemplates);

    const hasAnyCache = [
      cachedInfluencers,
      cachedCampaigns,
      cachedCoupons,
      cachedRecurrences,
      cachedIdeas,
      cachedShipments,
      cachedTasks,
    ].some((value) => Array.isArray(value));

    if (hasAnyCache) {
      setLoaded(true);
      loadedRef.current = true;
    }

    async function load() {
      if (!mediaMigrationDoneRef.current[userId]) {
        await runLegacyMediaMigration();
        mediaMigrationDoneRef.current[userId] = true;
      }

      const [infRes, campRes, coupRes, recRes, ideasRes, shipRes, tasksRes, tmplRes, unitsRes, catRes, fiscalRes, teamRes] = await Promise.all([
        loadFromDBWithRetry(userId, "influencers"),
        loadFromDBWithRetry(userId, "campaigns"),
        loadFromDBWithRetry(userId, "coupons"),
        loadFromDBWithRetry(userId, "recurrences"),
        loadFromDBWithRetry(userId, "ideaDeposits"),
        loadFromDBWithRetry(userId, "shipments"),
        loadFromDBWithRetry(userId, "tasks"),
        loadFromDBWithRetry(userId, "messageTemplates"),
        loadFromDBWithRetry(userId, "storeUnits"),
        loadFromDBWithRetry(userId, "catalogs"),
        loadFromDBWithRetry(userId, "fiscalInfo"),
        loadFromDBWithRetry(userId, "teamMembers"),
      ]);

      if (saveGeneration.current !== loadGen) return;

      const errors = {
        influencers: infRes.error,
        campaigns: campRes.error,
        coupons: coupRes.error,
        recurrences: recRes.error,
        ideaDeposits: ideasRes.error,
        shipments: shipRes.error,
        tasks: tasksRes.error,
      };
      const hasAnyError = Object.values(errors).some(Boolean);
      if (hasAnyError) {
        console.warn("Alguns dados falharam ao carregar (carregando o que foi possível):", errors);
      }

      const nextInfluencers = !infRes.error
        ? ((infRes.value as Influencer[] | null) ?? mockInfluencers)
        : (cachedInfluencers ?? mockInfluencers);
      const nextCampaigns = !campRes.error
        ? ((campRes.value as Campaign[] | null) ?? mockCampaigns)
        : (cachedCampaigns ?? mockCampaigns);
      const nextCoupons = !coupRes.error
        ? ((coupRes.value as Coupon[] | null) ?? [])
        : (cachedCoupons ?? []);
      const nextRecurrences = !recRes.error
        ? ((recRes.value as Recurrence[] | null) ?? [])
        : (cachedRecurrences ?? []);
      const nextIdeas = !ideasRes.error
        ? ((ideasRes.value as IdeaDeposit[] | null) ?? [])
        : (cachedIdeas ?? []);
      const nextShipments = !shipRes.error
        ? ((shipRes.value as Shipment[] | null) ?? [])
        : (cachedShipments ?? []);
      const nextTasks = !tasksRes.error
        ? ((tasksRes.value as Task[] | null) ?? [])
        : (cachedTasks ?? []);
      const nextTemplates = !tmplRes.error
        ? (tmplRes.value as MessageTemplate[] | null)
        : (cachedTemplates ?? null);

      const lw = localWritesRef.current;
      if (!lw.has("influencers")) { setInfluencers(nextInfluencers); saveToCache(userId, "influencers", nextInfluencers); }
      if (!lw.has("campaigns")) { setCampaigns(nextCampaigns); saveToCache(userId, "campaigns", nextCampaigns); }
      if (!lw.has("coupons")) { setCoupons(nextCoupons); saveToCache(userId, "coupons", nextCoupons); }
      if (!lw.has("recurrences")) { setRecurrences(nextRecurrences); saveToCache(userId, "recurrences", nextRecurrences); }
      if (!lw.has("ideaDeposits")) { setIdeaDeposits(nextIdeas); saveToCache(userId, "ideaDeposits", nextIdeas); }
      if (!lw.has("shipments")) { setShipments(nextShipments); saveToCache(userId, "shipments", nextShipments); }
      if (!lw.has("tasks")) { setTasks(nextTasks); saveToCache(userId, "tasks", nextTasks); }
      if (!lw.has("messageTemplates")) { setMessageTemplatesState(nextTemplates); if (nextTemplates) saveToCache(userId, "messageTemplates", nextTemplates); }
      if (!lw.has("storeUnits") && !unitsRes.error) {
        const nextUnits = (unitsRes.value as string[] | null) ?? DEFAULT_STORE_UNITS;
        setStoreUnitsState(nextUnits.length ? nextUnits : DEFAULT_STORE_UNITS);
        saveToCache(userId, "storeUnits", nextUnits);
      }
      if (!lw.has("catalogs") && !catRes.error) {
        const nextCat = normalizeCatalogs(catRes.value);
        setCatalogsState(nextCat);
        saveToCache(userId, "catalogs", nextCat);
      }
      if (!lw.has("fiscalInfo") && !fiscalRes.error) {
        const nextFiscalInfo = normalizeFiscalInfo(fiscalRes.value);
        setFiscalInfoState(nextFiscalInfo);
        saveToCache(userId, "fiscalInfo", nextFiscalInfo);
      }
      if (!lw.has("teamMembers") && !teamRes.error) {
        const nextTeamMembers = normalizeTeamMembers(teamRes.value);
        setTeamMembersState(nextTeamMembers);
        saveToCache(userId, "teamMembers", nextTeamMembers);
      }

      setLoaded(true);
      loadedRef.current = true;
    }



    void load();

    // Realtime: sync ALL data_keys from other devices/tabs.
    // We respect localWritesRef so an in-flight local edit is not overwritten.
    const applyRemote = (key: PersistedKey, value: unknown) => {
      if (localWritesRef.current.has(key)) return;
      saveToCache(user.id, key, value);
      switch (key) {
        case "influencers": setInfluencers((value as Influencer[]) || []); break;
        case "campaigns": setCampaigns((value as Campaign[]) || []); break;
        case "coupons": setCoupons((value as Coupon[]) || []); break;
        case "recurrences": setRecurrences((value as Recurrence[]) || []); break;
        case "ideaDeposits": setIdeaDeposits((value as IdeaDeposit[]) || []); break;
        case "shipments": setShipments((value as Shipment[]) || []); break;
        case "tasks": setTasks((value as Task[]) || []); break;
        case "messageTemplates": setMessageTemplatesState((value as MessageTemplate[]) || []); break;
        case "storeUnits": setStoreUnitsState(((value as string[]) || []).length ? (value as string[]) : DEFAULT_STORE_UNITS); break;
        case "catalogs": setCatalogsState(normalizeCatalogs(value)); break;
        case "fiscalInfo": setFiscalInfoState(normalizeFiscalInfo(value)); break;
        case "teamMembers": setTeamMembersState(normalizeTeamMembers(value)); break;
      }
    };

    const channel = supabase
      .channel(`app_data_all_${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_data", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const row = (payload.new as any) || (payload.old as any);
          const key = row?.data_key as PersistedKey | undefined;
          const value = (payload.new as any)?.data;
          if (!key) return;
          if (payload.eventType === "DELETE") return;
          applyRemote(key, value);
        }
      )
      .subscribe();

    // Re-pull from server when user returns to the tab / window.
    const refetch = async () => {
      if (document.visibilityState !== "visible") return;
      // Clear local-writes guard so server data wins on this re-pull.
      localWritesRef.current.clear();
      const keys: PersistedKey[] = ["influencers", "campaigns", "coupons", "recurrences", "ideaDeposits", "shipments", "tasks", "messageTemplates", "storeUnits", "catalogs", "fiscalInfo", "teamMembers"];
      const results = await Promise.all(keys.map((k) => loadFromDBWithRetry(user.id, k)));
      results.forEach((res, idx) => {
        if (res.error) return;
        const k = keys[idx];
        if (localWritesRef.current.has(k)) return;
        applyRemote(k, res.value);
      });
    };
    document.addEventListener("visibilitychange", refetch);
    window.addEventListener("focus", refetch);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener("visibilitychange", refetch);
      window.removeEventListener("focus", refetch);
    };
    // Depend on user.id (stable) instead of user object reference. Supabase
    // emits onAuthStateChange (e.g. TOKEN_REFRESHED) periodically, producing a
    // new user object even when the logged-in user is unchanged. Re-running
    // this effect on every token refresh triggers a full DB reload that races
    // with in-flight saves and overwrites the latest local edits (selection
    // status, director notes, etc.).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const persistKey = useCallback((key: PersistedKey, data: unknown) => {
    const u = userRef.current;
    const token = (writeTokensRef.current[key] || 0) + 1;
    writeTokensRef.current[key] = token;
    localWritesRef.current.add(key);
    if (u && loadedRef.current) {
      void saveToDB(u.id, key, data).finally(() => {
        if (writeTokensRef.current[key] === token) {
          localWritesRef.current.delete(key);
          delete writeTokensRef.current[key];
        }
      });
    }
  }, []);

  const persistInfluencers = useCallback((data: Influencer[]) => {
    persistKey("influencers", data);
  }, [persistKey]);

  const persistCampaigns = useCallback((data: Campaign[]) => {
    persistKey("campaigns", data);
  }, [persistKey]);

  const persistCoupons = useCallback((data: Coupon[]) => {
    persistKey("coupons", data);
  }, [persistKey]);

  const persistRecurrences = useCallback((data: Recurrence[]) => {
    persistKey("recurrences", data);
  }, [persistKey]);

  const persistIdeaDeposits = useCallback((data: IdeaDeposit[]) => {
    persistKey("ideaDeposits", data);
  }, [persistKey]);

  const persistShipments = useCallback((data: Shipment[]) => {
    persistKey("shipments", data);
  }, [persistKey]);

  const persistTasks = useCallback((data: Task[]) => {
    persistKey("tasks", data);
  }, [persistKey]);

  const persistMessageTemplates = useCallback((data: MessageTemplate[]) => {
    persistKey("messageTemplates", data);
  }, [persistKey]);

  const persistStoreUnits = useCallback((data: string[]) => {
    persistKey("storeUnits", data);
  }, [persistKey]);

  const setFiscalInfo = useCallback((info: FiscalInfo) => {
    const next = normalizeFiscalInfo(info);
    setFiscalInfoState(next);
    persistKey("fiscalInfo", next);
  }, [persistKey]);

  const setTeamMembers = useCallback((members: string[]) => {
    const next = normalizeTeamMembers(members);
    setTeamMembersState(next);
    persistKey("teamMembers", next);
  }, [persistKey]);


  const addInfluencer = useCallback((inf: Omit<Influencer, "id" | "addedAt" | "rating" | "totalRatings">) => {
    const newInf: Influencer = {
      ...inf, id: Date.now().toString(), addedAt: new Date().toISOString().split("T")[0], rating: 0, totalRatings: 0,
    };
    setInfluencers((prev) => {
      const next = [newInf, ...prev];
      persistInfluencers(next);
      return next;
    });
  }, [persistInfluencers]);

  const updateInfluencer = useCallback((inf: Influencer) => {
    setInfluencers((prev) => {
      const next = prev.map((i) => (i.id === inf.id ? inf : i));
      persistInfluencers(next);
      return next;
    });
  }, [persistInfluencers]);

  const deleteInfluencer = useCallback((id: string) => {
    setInfluencers((prev) => {
      const next = prev.filter((i) => i.id !== id);
      persistInfluencers(next);
      return next;
    });
  }, [persistInfluencers]);

  const rateInfluencer = useCallback((id: string, newRating: number, author?: string, reason?: string) => {
    setInfluencers((prev) => {
      const next = prev.map((i) => {
        if (i.id !== id) return i;
        const total = i.totalRatings + 1;
        const avg = (i.rating * i.totalRatings + newRating) / total;
        const newEntry = author ? {
          id: Date.now().toString(),
          author,
          rating: newRating,
          reason: reason || "",
          createdAt: new Date().toISOString(),
        } : null;
        return {
          ...i,
          rating: Math.round(avg * 10) / 10,
          totalRatings: total,
          ...(newEntry ? { ratingHistory: [...(i.ratingHistory || []), newEntry] } : {}),
        };
      });
      persistInfluencers(next);
      return next;
    });
  }, [persistInfluencers]);

  const addCampaign = useCallback((c: Omit<Campaign, "id" | "createdAt" | "contents">) => {
    const newC: Campaign = {
      ...c, id: Date.now().toString(), createdAt: new Date().toISOString().split("T")[0],
      contents: [], participants: c.participants || [], materials: c.materials || [],
    };
    setCampaigns((prev) => {
      const next = [newC, ...prev];
      persistCampaigns(next);
      return next;
    });
  }, [persistCampaigns]);

  const updateCampaign = useCallback((c: Campaign) => {
    setCampaigns((prev) => {
      const next = prev.map((camp) => (camp.id === c.id ? c : camp));
      persistCampaigns(next);
      return next;
    });
  }, [persistCampaigns]);

  const deleteCampaign = useCallback((id: string) => {
    setCampaigns((prev) => {
      const next = prev.filter((c) => c.id !== id);
      persistCampaigns(next);
      return next;
    });
  }, [persistCampaigns]);

  const getCampaignsForInfluencer = useCallback(
    (id: string) => campaigns.filter((c) => c.influencerIds.includes(id)),
    [campaigns]
  );

  const addCoupon = useCallback((coupon: Omit<Coupon, "id">) => {
    setCoupons((prev) => {
      const next = [...prev, { ...coupon, id: Date.now().toString() }];
      persistCoupons(next);
      return next;
    });
  }, [persistCoupons]);

  const updateCoupon = useCallback((coupon: Coupon) => {
    setCoupons((prev) => {
      const next = prev.map((c) => (c.id === coupon.id ? coupon : c));
      persistCoupons(next);
      return next;
    });
  }, [persistCoupons]);

  const deleteCoupon = useCallback((id: string) => {
    setCoupons((prev) => {
      const next = prev.filter((c) => c.id !== id);
      persistCoupons(next);
      return next;
    });
  }, [persistCoupons]);

  const getCouponsForInfluencer = useCallback(
    (influencerId: string) => coupons.filter((c) => c.influencerId === influencerId),
    [coupons]
  );

  const addRecurrence = useCallback((r: Omit<Recurrence, "id" | "createdAt">) => {
    const newR: Recurrence = { ...r, id: Date.now().toString(), createdAt: new Date().toISOString().split("T")[0] };
    setRecurrences((prev) => {
      const next = [newR, ...prev];
      persistRecurrences(next);
      return next;
    });
  }, [persistRecurrences]);

  const updateRecurrence = useCallback((r: Recurrence) => {
    setRecurrences((prev) => {
      const next = prev.map((rec) => (rec.id === r.id ? r : rec));
      persistRecurrences(next);
      return next;
    });
  }, [persistRecurrences]);

  const deleteRecurrence = useCallback((id: string) => {
    setRecurrences((prev) => {
      const next = prev.filter((r) => r.id !== id);
      persistRecurrences(next);
      return next;
    });
  }, [persistRecurrences]);

  const addIdeaDeposit = useCallback((idea: Omit<IdeaDeposit, "id" | "createdAt" | "status">) => {
    const newIdea: IdeaDeposit = {
      ...idea, id: Date.now().toString(), createdAt: new Date().toISOString(), status: "aguardando_avaliacao",
    };
    setIdeaDeposits((prev) => {
      const next = [newIdea, ...prev];
      persistIdeaDeposits(next);
      return next;
    });
  }, [persistIdeaDeposits]);

  const updateIdeaDeposit = useCallback((idea: IdeaDeposit) => {
    setIdeaDeposits((prev) => {
      const next = prev.map((i) => (i.id === idea.id ? idea : i));
      persistIdeaDeposits(next);
      return next;
    });
  }, [persistIdeaDeposits]);

  const deleteIdeaDeposit = useCallback((id: string) => {
    setIdeaDeposits((prev) => {
      const next = prev.filter((i) => i.id !== id);
      persistIdeaDeposits(next);
      return next;
    });
  }, [persistIdeaDeposits]);

  const addShipment = useCallback((s: Omit<Shipment, "id" | "createdAt">) => {
    const newS: Shipment = { ...s, id: Date.now().toString(), createdAt: new Date().toISOString() };
    setShipments((prev) => {
      const next = [newS, ...prev];
      persistShipments(next);
      return next;
    });
  }, [persistShipments]);

  const updateShipment = useCallback((s: Shipment) => {
    setShipments((prev) => {
      const next = prev.map((sh) => (sh.id === s.id ? s : sh));
      persistShipments(next);
      return next;
    });
  }, [persistShipments]);

  const deleteShipment = useCallback((id: string) => {
    setShipments((prev) => {
      const next = prev.filter((s) => s.id !== id);
      persistShipments(next);
      return next;
    });
  }, [persistShipments]);

  const addTask = useCallback((t: Omit<Task, "id" | "createdAt" | "completed">) => {
    const newT: Task = { ...t, id: Date.now().toString() + Math.random().toString(36).slice(2, 6), createdAt: new Date().toISOString(), completed: false };
    setTasks((prev) => {
      const next = [newT, ...prev];
      persistTasks(next);
      return next;
    });
  }, [persistTasks]);

  const updateTask = useCallback((t: Task) => {
    setTasks((prev) => {
      const next = prev.map((x) => (x.id === t.id ? t : x));
      persistTasks(next);
      return next;
    });
  }, [persistTasks]);

  const deleteTask = useCallback((id: string) => {
    setTasks((prev) => {
      const next = prev.filter((x) => x.id !== id);
      persistTasks(next);
      return next;
    });
  }, [persistTasks]);

  const toggleTaskComplete = useCallback((id: string) => {
    setTasks((prev) => {
      const next = prev.map((x) =>
        x.id === id ? { ...x, completed: !x.completed, completedAt: !x.completed ? new Date().toISOString() : undefined } : x
      );
      persistTasks(next);
      return next;
    });
  }, [persistTasks]);

  const setMessageTemplates = useCallback((templates: MessageTemplate[]) => {
    setMessageTemplatesState(templates);
    persistMessageTemplates(templates);
  }, [persistMessageTemplates]);

  const setStoreUnits = useCallback((units: string[]) => {
    setStoreUnitsState(units);
    persistStoreUnits(units);
  }, [persistStoreUnits]);

  const setCatalogs = useCallback((c: Catalogs) => {
    setCatalogsState(c);
    persistKey("catalogs", c);
  }, [persistKey]);



  // === Auto-task reconciliation ===
  useEffect(() => {
    if (!loaded) return;
    const todayStr = new Date().toISOString().split("T")[0];
    const addDays = (days: number) => {
      const d = new Date();
      d.setDate(d.getDate() + days);
      return d.toISOString().split("T")[0];
    };

    type Expected = { source: string; title: string; description: string; deadline: string; link?: string };
    const expected: Expected[] = [];

    // Shipments
    for (const s of shipments) {
      if (s.delivered) continue;
      const inf = influencers.find((i) => i.id === s.influencerId);
      const infName = inf?.name || "influenciador";
      const desc = s.description || "produto";
      // Tracking code missing (except motoboy)
      if (s.shippingMethod && s.shippingMethod !== "motoboy" && !s.trackingCode) {
        expected.push({
          source: `shipment:${s.id}:tracking`,
          title: `Adicionar código de rastreio ao envio para ${infName}`,
          description: `Envio referente a "${desc}" (${s.shippingMethod.toUpperCase()}) está sem código de rastreio.`,
          deadline: addDays(2),
          link: `/envios`,
        });
      }
      // Verify delivery based on method
      if (s.shippingMethod) {
        const days = s.shippingMethod === "pac" ? 15 : s.shippingMethod === "sedex" ? 5 : 0;
        expected.push({
          source: `shipment:${s.id}:verificar_entrega`,
          title: `Verificar se o envio para ${infName} foi entregue`,
          description: `Envio "${desc}" via ${s.shippingMethod.toUpperCase()}.`,
          deadline: addDays(days),
          link: `/envios`,
        });
      }
    }

    // Campaign participants: store visits
    for (const c of campaigns) {
      if (c.status === "finalizada") continue;
      for (const p of c.participants || []) {
        if (p.deliveryType !== "visita_loja") continue;
        if (p.negotiationStatus !== "topou") continue;
        const inf = influencers.find((i) => i.id === p.influencerId);
        const infName = inf?.name || "influenciador";
        const unit = p.storeUnit || "unidade";
        if (!p.managerNotified && !p.storeVisitDone) {
          expected.push({
            source: `camp:${c.id}:p:${p.influencerId}:comunicar_visita`,
            title: `Comunicar a visita de ${infName} na ${unit}`,
            description: `Campanha "${c.name}".`,
            deadline: addDays(1),
            link: `/campaign/${c.id}`,
          });
        }
        if (p.managerNotified && !p.storeVisitDone) {
          expected.push({
            source: `camp:${c.id}:p:${p.influencerId}:verificar_visita`,
            title: `Verificar se a visita de ${infName} na ${unit} aconteceu`,
            description: `Campanha "${c.name}".`,
            deadline: addDays(7),
            link: `/campaign/${c.id}`,
          });
        }
      }
    }

    setTasks((prev) => {
      const expectedMap = new Map(expected.map((e) => [e.source, e]));
      const existingSources = new Set(prev.filter((t) => t.source).map((t) => t.source!));
      let changed = false;
      // Remove auto tasks (active) whose source is no longer expected
      let next = prev.filter((t) => {
        if (!t.source) return true;
        if (t.completed) return true;
        if (expectedMap.has(t.source)) return true;
        changed = true;
        return false;
      });
      // Add expected sources not present (active)
      for (const e of expected) {
        const hasActive = next.some((t) => t.source === e.source && !t.completed);
        if (!hasActive) {
          next = [
            {
              id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
              title: e.title,
              description: e.description,
              deadline: e.deadline,
              createdAt: new Date().toISOString(),
              completed: false,
              source: e.source,
              link: e.link,
            },
            ...next,
          ];
          changed = true;
        }
      }
      if (changed) {
        persistTasks(next);
        return next;
      }
      return prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaigns, shipments, influencers, loaded]);


  const derivedInfluencers = useMemo(() => {
    return influencers.map((inf) => {
      // Aggregate all rating sources: individual history entries +
      // campaign finalization ratings. De-dupe campaigns already
      // captured in ratingHistory (matched by author "Campanha: <name>").
      const histRatings = (inf.ratingHistory || []).map((r) => r.rating);
      const historyAuthors = new Set((inf.ratingHistory || []).map((r) => r.author));
      const campRatings: number[] = [];
      for (const c of campaigns) {
        const author = `Campanha: ${c.name}`;
        if (historyAuthors.has(author)) continue;
        for (const p of c.participants || []) {
          if (p.influencerId === inf.id && p.campaignRating && p.campaignRating > 0) {
            campRatings.push(p.campaignRating);
            break;
          }
        }
      }
      const all = [...histRatings, ...campRatings];
      const total = all.length;
      const avg = total > 0 ? all.reduce((a, b) => a + b, 0) / total : 0;
      return {
        ...inf,
        isActive: isInfluencerActive(inf.id, campaigns, recurrences),
        rating: total > 0 ? Math.round(avg * 10) / 10 : inf.rating,
        totalRatings: total > 0 ? total : inf.totalRatings,
      };
    });
  }, [influencers, campaigns, recurrences]);


  const today = new Date().toISOString().split("T")[0];
  const derivedCoupons = useMemo(() => {
    return coupons.map((c) => ({
      ...c,
      isActive: isCouponActive(c, today),
    }));
  }, [coupons, today]);

  const getDerivedCouponsForInfluencer = useCallback(
    (influencerId: string) => derivedCoupons.filter((c) => c.influencerId === influencerId),
    [derivedCoupons]
  );

  // Influencers approved in a current (not finished) campaign
  // whose coupon is missing or inactive — used for coupon reminders.
  const couponReminderInfluencerIds = useMemo(() => {
    const activeIds = new Set<string>();
    for (const c of campaigns) {
      if (c.status === "finalizada") continue;
      for (const p of c.participants || []) {
        if (hasApprovedContact(p)) {
          activeIds.add(p.influencerId);
        }
      }
    }
    const withActiveCoupon = new Set(
      derivedCoupons.filter((c) => c.isActive).map((c) => c.influencerId)
    );
    const result = new Set<string>();
    activeIds.forEach((id) => {
      if (!withActiveCoupon.has(id) && derivedCoupons.some((c) => c.influencerId === id && c.code?.trim())) result.add(id);
    });
    return result;
  }, [campaigns, derivedCoupons]);

  // Campaigns whose start date has already arrived should show as "em andamento"
  const derivedCampaigns = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return campaigns.map((c) => {
      if (c.status !== "a_iniciar" || !c.startDate) return c;
      const [y, m, d] = c.startDate.split("-").map(Number);
      if (!y || !m || !d) return c;
      const start = new Date(y, m - 1, d);
      return start <= today ? { ...c, status: "em_andamento" as const } : c;
    });
  }, [campaigns]);

  return (
    <AppContext.Provider
      value={{
        influencers: derivedInfluencers,
        campaigns: derivedCampaigns,

        coupons: derivedCoupons,
        recurrences,
        ideaDeposits,
        shipments,
        addInfluencer,
        updateInfluencer,
        deleteInfluencer,
        addCampaign,
        updateCampaign,
        deleteCampaign,
        rateInfluencer,
        getCampaignsForInfluencer,
        addCoupon,
        updateCoupon,
        deleteCoupon,
        getCouponsForInfluencer: getDerivedCouponsForInfluencer,
        couponReminderInfluencerIds,
        addRecurrence,
        updateRecurrence,
        deleteRecurrence,
        addIdeaDeposit,
        updateIdeaDeposit,
        deleteIdeaDeposit,
        addShipment,
        updateShipment,
        deleteShipment,
        tasks,
        addTask,
        updateTask,
        deleteTask,
        toggleTaskComplete,
        messageTemplates,
        setMessageTemplates,
        storeUnits,
        setStoreUnits,
        catalogs,
        setCatalogs,
        fiscalInfo,
        setFiscalInfo,
        teamMembers,
        setTeamMembers,
        loaded,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
