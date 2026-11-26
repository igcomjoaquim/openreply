import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/dashboard", "/automations", "/logs", "/settings", "/scheduled", "/feed", "/alunos"];

function hasSessionCookie(request: NextRequest): boolean {
  return (
    request.cookies.has("authjs.session-token") ||
    request.cookies.has("__Secure-authjs.session-token") ||
    request.cookies.has("next-auth.session-token") ||
    request.cookies.has("__Secure-next-auth.session-token")
  );
}

const DESTRAVANDO = "https://destravando.inglescomjoaquim.com";
/** Caminho antigo no aprender. → caminho no destravando. (raiz antiga = trilha; /academia = raiz nova). */
const DESTRAVANDO_PATHS: Record<string, string> = {
  "/": "/aprender/",
  "/aprender": "/aprender/",
  "/aprender/": "/aprender/",
  "/academia": "/",
  "/academia/": "/",
};

function migrationPage(target: string): string {
  const dest = JSON.stringify(DESTRAVANDO + target);
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Destravando — Inglês com Joaquim</title><meta name="robots" content="noindex"></head><body style="font-family:system-ui,sans-serif;background:#E6D3BC;color:#3b2a1a;display:grid;place-items:center;min-height:100vh;margin:0;text-align:center"><p>Mudamos de endereço: agora é <b>destravando.inglescomjoaquim.com</b><br>Levando o seu progresso…</p><script>(function(){var d={},u=${dest};try{for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(/^(aprender|academia):/.test(k))d[k]=localStorage.getItem(k);}}catch(e){}var s=JSON.stringify(d);if(s!=="{}"){try{u+="#migrar="+btoa(unescape(encodeURIComponent(s)));}catch(e){}}location.replace(u);})();</script><noscript><a href=${dest}>Abrir o Destravando</a></noscript></body></html>`;
}

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // homework.inglescomjoaquim.com: a raiz do endereço é a tela das lições.
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
  if (pathname === "/" && host.toLowerCase().startsWith("homework.")) {
    return NextResponse.rewrite(new URL("/licao", request.url));
  }
  // aprender.inglescomjoaquim.com mudou pra destravando.inglescomjoaquim.com (Cloudflare Pages, 26/11/2026).
  // A página leva o progresso salvo no aparelho (localStorage é por endereço) e redireciona.
  const lowerHost = host.toLowerCase();
  // Só o aprender.… (endereço público antigo). homework.… é dos alunos particulares e não leva pro Destravando.
  const isOldAcademy = DESTRAVANDO_PATHS[pathname] !== undefined && lowerHost.startsWith("aprender.");
  if (isOldAcademy) {
    return new NextResponse(migrationPage(DESTRAVANDO_PATHS[pathname] + request.nextUrl.search), {
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
    });
  }
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  const isLogin = pathname === "/login";
  const isAuthenticated = hasSessionCookie(request);

  if (isProtected && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isLogin && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/aprender",
    "/academia",
    "/dashboard/:path*",
    "/automations/:path*",
    "/logs/:path*",
    "/settings/:path*",
    "/scheduled/:path*",
    "/feed/:path*",
    "/alunos/:path*",
    "/login",
  ],
};
