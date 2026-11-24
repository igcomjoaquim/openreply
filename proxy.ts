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

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // homework.inglescomjoaquim.com: a raiz do endereço é a tela das lições.
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
  if (pathname === "/" && host.toLowerCase().startsWith("homework.")) {
    return NextResponse.rewrite(new URL("/licao", request.url));
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
