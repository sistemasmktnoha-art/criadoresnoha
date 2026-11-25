// Chamada ao Gemini (API do Google AI Studio, formato compatível com OpenAI).
// Segredos no Supabase: GEMINI_API_KEY (obrigatório) e GEMINI_MODEL (opcional).
export const AI_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
export const AI_MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-3.8-flash";
