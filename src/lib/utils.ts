import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Normalize a string for accent- and punctuation-insensitive search.
 * Strips accents, lowercases and removes everything that is not a letter
 * or number, so "Duda S." matches "dudasantos", "duda-santos", etc.
 */
export function normalizeSearch(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/** Extract an Instagram username from a URL, @handle or plain username */
export function parseInstagramUsername(input: string): string {
  const cleaned = input.trim();
  const urlMatch = cleaned.match(/^(?:https?:\/\/)?(?:www\.)?instagram\.com\/([a-zA-Z0-9._]+)(?:[/?#].*)?$/i);
  if (urlMatch) return urlMatch[1];
  const atMatch = cleaned.match(/^@([a-zA-Z0-9._]+)$/);
  if (atMatch) return atMatch[1];
  const plainMatch = cleaned.match(/^[a-zA-Z0-9._]+$/);
  if (plainMatch) return cleaned;
  return "";
}

/** Build a canonical, absolute Instagram profile URL from a URL, @handle or username. */
export function instagramProfileUrl(input?: string): string {
  const username = parseInstagramUsername(input || "");
  return `https://www.instagram.com/${username ? `${username}/` : ""}`;
}

/** Build case-insensitive select options while preserving friendly labels. */
export function catalogSelectOptions(current: string, options: string[]): { value: string; label: string }[] {
  const values = new Map<string, string>();
  options.forEach((option) => values.set(option.toLocaleLowerCase("pt-BR"), option));
  if (current && !values.has(current.toLocaleLowerCase("pt-BR"))) {
    values.set(current.toLocaleLowerCase("pt-BR"), current);
  }
  return [...values.entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
}

/**
 * Parse a "YYYY-MM-DD" date string as a LOCAL date (not UTC).
 * Prevents the off-by-one-day issue in negative UTC offsets (e.g. Brazil).
 */
export function parseLocalDate(dateStr: string): Date {
  if (!dateStr) return new Date(NaN);
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/** Mask a Brazilian phone number: (00) 00000-0000 */
export function maskPhone(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** Mask a CPF: 000.000.000-00 */
export function maskCPF(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d{1,2})$/, ".$1-$2");
}

/** Mask a CNPJ: 00.000.000/0000-00 */
export function maskCNPJ(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

/** Mask a Brazilian CEP: 00000-000 */
export function maskCEP(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

export type ReceptionSpace = "portaria_24h" | "sem_portaria_com_espaco" | "sem_portaria_sem_espaco";

export const RECEPTION_SPACE_OPTIONS: { value: ReceptionSpace; label: string }[] = [
  { value: "portaria_24h", label: "Sim, portaria 24 horas" },
  { value: "sem_portaria_com_espaco", label: "Não, mas possui espaço para recebimentos de encomendas" },
  { value: "sem_portaria_sem_espaco", label: "Não possui portaria nem espaço para recebimento de encomendas" },
];

/** Look up a Brazilian CEP via ViaCEP. Returns null when not found. */
export async function lookupCEP(cep: string): Promise<{ city: string; state: string; street?: string; neighborhood?: string } | null> {
  const digits = cep.replace(/\D/g, "");
  if (digits.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.erro) return null;
    return { city: data.localidade || "", state: data.uf || "", street: data.logradouro || "", neighborhood: data.bairro || "" };
  } catch {
    return null;
  }
}
