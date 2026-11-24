import { FunctionsHttpError } from "@supabase/supabase-js";

const DEFAULT_MESSAGE = "Não foi possível carregar os dados do perfil. Verifique a URL ou a chave da API.";

type FunctionErrorBody = {
  error?: string;
  status?: number;
  code?: string;
};

export async function getInstagramLookupError(error: unknown): Promise<string> {
  if (!(error instanceof FunctionsHttpError)) return DEFAULT_MESSAGE;

  try {
    const body = await error.context.clone().json() as FunctionErrorBody;
    if (body.status === 429 || body.code === "rapidapi_quota_exceeded") {
      return "O limite mensal de consultas do Instagram foi atingido. Atualize o plano da RapidAPI ou aguarde a renovação da cota.";
    }
    return body.error || DEFAULT_MESSAGE;
  } catch {
    return DEFAULT_MESSAGE;
  }
}