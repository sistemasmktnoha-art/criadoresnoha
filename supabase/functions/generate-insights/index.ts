import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireUser } from "../_shared/auth.ts";
import { AI_URL, AI_MODEL, aiFetch } from "../_shared/ai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const denied = await requireUser(req);
  if (denied) return denied;

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    let body: any = {};
    const rawBody = await req.text();
    if (rawBody.trim()) {
      try {
        body = JSON.parse(rawBody);
      } catch {
        return new Response(JSON.stringify({ error: "Formato de requisição inválido" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Campaign content analysis mode
    if (body.type === "campaign_content_analysis") {
      const { campaignName, contents } = body;

      const analysisPrompt = `Você é um analista de marketing digital especializado em campanhas com influenciadores para a NOHA Shoes, marca brasileira de calçados masculinos.

Analise os dados de desempenho dos conteúdos desta campanha e forneça uma análise APROFUNDADA e INTELIGENTE. Considere:

1. NÃO se limite a números absolutos. Analise a RELAÇÃO entre métricas e número de seguidores (taxa de engajamento relativa).
2. Analise o CRESCIMENTO entre intervalos de updates — quem teve melhor ritmo de crescimento proporcional?
3. Compare o desempenho relativo: um influenciador com 10K seguidores e 500 curtidas performa melhor proporcionalmente que um com 500K e 2000 curtidas.
4. Identifique padrões: quem manteve crescimento consistente? Quem teve picos? Quem estagnou?
5. Recomende quais perfis seriam melhores para campanhas futuras baseado na análise.

Campanha: ${campaignName}

Dados dos conteúdos:
${JSON.stringify(contents, null, 2)}

Responda em português brasileiro, de forma clara e objetiva, usando seções com títulos. Inclua:
- 🏆 Ranking de desempenho (com justificativa)
- 📊 Análise de engajamento relativo (vs seguidores)
- 📈 Análise de crescimento entre intervalos
- 💡 Recomendações para próximas campanhas
- ⚠️ Pontos de atenção`;

      const response = await aiFetch(AI_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GEMINI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: AI_MODEL,
          messages: [
            { role: "user", content: analysisPrompt },
          ],
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Limite de requisições excedido." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error("AI gateway error");
      }

      const data = await response.json();
      const analysis = data.choices?.[0]?.message?.content || "";

      return new Response(JSON.stringify({ analysis }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Default: insights mode
    const today = new Date();
    const dateStr = today.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

    const systemPrompt = `Você é um consultor de marketing digital especializado em moda e lifestyle masculino. Você trabalha para a NOHA Shoes, uma marca brasileira de calçados masculinos modernos (sneakers, botas, sandálias, sapatos casuais).

Sua tarefa é gerar insights diários de oportunidades para campanhas de marketing com influenciadores. Considere:

1. DATAS COMEMORATIVAS próximas (nos próximos 30 dias)
2. FEIRAS E EVENTOS de moda, lifestyle e streetwear no Brasil
3. TENDÊNCIAS atuais em moda masculina e calçados
4. MOMENTOS SAZONAIS (mudanças de estação, volta às aulas, férias, etc.)
5. ACONTECIMENTOS CULTURAIS relevantes (festivais, premiações, eventos esportivos)

Para cada insight, forneça:
- title: Um título claro e objetivo
- description: Uma breve descrição da oportunidade (2-3 frases)
- contentType: Sugestão geral do tipo de conteúdo (reels, stories, carrossel, vídeo, etc.)
- urgency: "urgent" (próximos 7 dias), "soon" (7-15 dias) ou "plan" (15-30 dias)
- category: "data_comemorativa" | "evento" | "tendencia" | "sazonal" | "cultural"
- contentIdeas: Um objeto com ideias específicas de conteúdo para cada canal:
    - instagramFeed: Ideia concreta para post no feed do Instagram
    - instagramStories: Ideia concreta para Stories do Instagram
    - tiktok: Ideia concreta para vídeo no TikTok
    - youtube: Ideia concreta para vídeo no YouTube
    - emailMarketing: Ideia concreta para campanha de e-mail marketing

Gere entre 4 e 6 insights relevantes. Responda APENAS em JSON com a seguinte estrutura:
{
  "insights": [
    {
      "title": "string",
      "description": "string",
      "contentType": "string",
      "urgency": "urgent" | "soon" | "plan",
      "category": "data_comemorativa" | "evento" | "tendencia" | "sazonal" | "cultural",
      "contentIdeas": {
        "instagramFeed": "string",
        "instagramStories": "string",
        "tiktok": "string",
        "youtube": "string",
        "emailMarketing": "string"
      }
    }
  ]
}`;

    const response = await aiFetch(AI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GEMINI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Hoje é ${dateStr}. Gere os insights de oportunidades para campanhas da NOHA Shoes.` },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro ao gerar insights" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1];
    
    const parsed = JSON.parse(jsonStr.trim());

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("insights error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
