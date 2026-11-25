// Chamada ao Gemini (API do Google AI Studio, formato compatível com OpenAI).
// Segredos no Supabase: GEMINI_API_KEY (obrigatório) e GEMINI_MODEL (opcional).
export const AI_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
export const AI_MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-3.8-flash";

// Se o modelo principal estiver sobrecarregado (503), indisponível (404) ou limitado (429),
// tenta os próximos da lista.
const MODELS = [AI_MODEL, "gemini-3-flash-preview", "gemini-flash-latest"].filter((m, i, a) => a.indexOf(m) === i);

export async function aiFetch(url: string, init: RequestInit): Promise<Response> {
  const body = JSON.parse(String(init.body ?? "{}"));
  let last: Response | null = null;
  for (const model of MODELS) {
    try {
      const res = await fetch(url, {
        ...init,
        body: JSON.stringify({ ...body, model }),
        signal: AbortSignal.timeout(40000),
      });
      if (res.ok) return res;
      last = res;
      if (![404, 429, 500, 503].includes(res.status)) return res;
      console.error(`Gemini ${model} falhou (${res.status}), tentando o próximo modelo`);
    } catch (e) {
      console.error(`Gemini ${model} sem resposta:`, e);
    }
  }
  return last ?? new Response(JSON.stringify({ error: "IA indisponível" }), { status: 503 });
}
