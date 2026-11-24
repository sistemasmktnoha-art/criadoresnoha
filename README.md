# NOHA Creators

Plataforma de gestão de influenciadores da NOHA Shoes (React + Vite + TypeScript + Tailwind + shadcn/ui), com Supabase próprio.

## Estrutura
- `src/` aplicativo web
- `supabase/functions/` funções de backend (Deno)
- `.env` chaves públicas do Supabase (URL e publishable key)

## Segredos das funções (Supabase → Edge Functions → Secrets)
- `GEMINI_API_KEY` (insights e análise de campanha); `GEMINI_MODEL` opcional
- `APIFY_API_KEY` (foto e seguidores do Instagram)
- `INFLUENCERS_API_TOKEN` (feed `influencers-feed`)
- `RESEND_API_KEY` opcional (e-mail da troca de login)

## Desenvolvimento
```
npm install
npm run dev
```

## Publicação
Site: Vercel (build `npm run build`, saída `dist`). Funções: workflow `Publicar funções no Supabase`
(requer o secret `SUPABASE_ACCESS_TOKEN` no repositório).
