export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export const HTML_HEADERS = {
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex",
};

/** Esqueleto das páginas de lição (fontes + CSS da pasta public/licao). */
export function page(title: string, body: string): string {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow">
<title>${esc(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Patrick+Hand&family=Inter:wght@400;500;600;700&family=Caveat:wght@600;700&display=swap">
<link rel="stylesheet" href="/licao/app.css?v=11">
</head><body>${body}</body></html>`;
}

export const COOKIE = "licao_aluno";

export function cookieHeader(slug: string | null): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return slug
    ? `${COOKIE}=${slug}; Path=/; Max-Age=31536000; SameSite=Lax; HttpOnly${secure}`
    : `${COOKIE}=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly${secure}`;
}

const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

/** "2026-11-24" -> "24/11" */
export function dayMonth(date: string): string {
  const [, m, d] = date.split("-");
  return `${Number(d)}/${m}`;
}

/** "2026-11-24" -> "Novembro 2026" */
export function monthLabel(date: string): string {
  const [y, m] = date.split("-");
  return `${MONTHS[Number(m) - 1]} ${y}`;
}

/** Endereço público (atrás do proxy do Railway, request.url é interno). */
export function publicUrl(request: { headers: Headers; nextUrl: URL }, path: string): URL {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");
  return new URL(path, host ? `${proto}://${host}` : request.nextUrl.origin);
}
