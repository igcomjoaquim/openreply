import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Academia — Inglês com Joaquim: plataforma 100% prática. Teste de nivelamento
 * só de ouvir e falar → treino do dia (Cenas, Fofoca, Shadowing, Real Time,
 * Meus erros) nos 13 temas do A1, com 3 variações cada. Roda no navegador
 * (public/academia) e usa o conteúdo e os áudios da Aprender.
 */
const HTML = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#F4EBDD">
<link rel="manifest" href="/academia/app/manifest.webmanifest">
<link rel="icon" type="image/png" sizes="96x96" href="/academia/app/icon-96.png">
<link rel="apple-touch-icon" href="/academia/app/apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="Destravando">
<meta name="application-name" content="Destravando">
<title>Destravando — Inglês com Joaquim</title>
<meta name="description" content="Treine inglês ouvindo e falando: teste de nível, cenas reais, fofoca, shadowing e Real Time.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&family=Caveat:wght@700&display=swap">
<link rel="stylesheet" href="/aprender/app.css?v=3">
<link rel="stylesheet" href="/academia/app.css?v=20">
<link rel="stylesheet" href="/academia/premium.css?v=25">
</head><body><div id="app"><p class="boot">Carregando…</p></div>
<script>window.__v=39</script><script src="/academia/app.js?v=63"></script></body></html>`;

// Desde 26/11/2026 a Academia mora no Cloudflare Pages (destravando.inglescomjoaquim.com).
// O HTML acima continua aqui porque scripts/build-destravando.mjs lê ele pra montar o site.
void HTML;
export function GET() {
  // homework é só dos alunos particulares; o Destravando (público) fica separado. aprender.… é tratado no proxy.ts.
  return new NextResponse("Not found", { status: 404 });
}
