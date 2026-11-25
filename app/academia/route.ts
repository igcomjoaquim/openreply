import { NextResponse } from "next/server";

export const dynamic = "force-static";

/**
 * Academia — Inglês com Joaquim: plataforma 100% prática. Teste de nivelamento
 * só de ouvir e falar → treino do dia (Cenas, Fofoca, Shadowing, Real Time,
 * Meus erros) nos 13 temas do A1, com 3 variações cada. Roda no navegador
 * (public/academia) e usa o conteúdo e os áudios da Aprender.
 */
const HTML = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#E6D3BC">
<title>Academia — Inglês com Joaquim</title>
<meta name="description" content="Treine inglês ouvindo e falando: teste de nível, cenas reais, fofoca, shadowing e Real Time.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Inter:wght@400;500;600;700&family=Caveat:wght@700&display=swap">
<link rel="stylesheet" href="/aprender/app.css?v=3">
<link rel="stylesheet" href="/academia/app.css?v=1">
</head><body><div id="app"><p class="boot">Carregando…</p></div>
<script>window.__v=4</script><script src="/academia/app.js?v=1"></script></body></html>`;

export function GET() {
  return new NextResponse(HTML, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=60" } });
}
