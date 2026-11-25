import { NextResponse } from "next/server";

export const dynamic = "force-static";

/**
 * aprender.inglescomjoaquim.com — a trilha A1 para aprender sozinho, no
 * estilo das aulas do Inglês com Joaquim. Tudo roda no navegador
 * (public/aprender): conteúdo em data/uXX.json, áudios em audio/,
 * progresso guardado no próprio aparelho.
 */
const HTML = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#E6D3BC">
<title>Aprender — Inglês com Joaquim</title>
<meta name="description" content="Aprenda inglês sozinho, do zero ao A1, no método do Inglês com Joaquim: vídeo real, fofoca, chunks, lição de casa e Real Time.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Inter:wght@400;500;600;700&family=Caveat:wght@700&display=swap">
<link rel="stylesheet" href="/aprender/app.css?v=2">
</head><body><div id="app"><p class="boot">Carregando…</p></div>
<script>window.__v=2</script><script src="/aprender/app.js?v=2"></script></body></html>`;

export function GET() {
  return new NextResponse(HTML, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=60" } });
}
