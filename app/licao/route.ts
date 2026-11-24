import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db/client";
import { COOKIE, HTML_HEADERS, cookieHeader, esc, page, publicUrl } from "@/lib/licao/html";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function form(error: string, value: string) {
  return page(
    "Minhas lições",
    `<div class="wrap login">
  <span class="brand"><span>Inglês com Joaquim</span></span>
  <h1>Minhas lições</h1>
  <p>Digite o seu código. É só na primeira vez: depois, este celular lembra de você.</p>
  <form method="get" action="/licao" class="login-form">
    <label for="codigo">Seu código</label>
    <input id="codigo" name="codigo" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="EX.: MARIA-A1B2C3" value="${esc(value)}" required>
    ${error ? `<p class="msg bad">${esc(error)}</p>` : ""}
    <button class="btn" type="submit">Entrar</button>
  </form>
  <p class="small">Não sabe o seu código? Ele está no documento "▶️ COMECE AQUI" da sua pasta no Drive, ou peça pro seu professor.</p>
</div>`
  );
}

/**
 * licao.inglescomjoaquim.com: o aluno digita o código uma vez; o navegador
 * guarda e das próximas vezes vai direto para as lições dele.
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  if (q.has("sair")) {
    return new NextResponse(form("", ""), { headers: { ...HTML_HEADERS, "Set-Cookie": cookieHeader(null) } });
  }
  const typed = (q.get("codigo") ?? "").trim();
  const candidate = (typed || request.cookies.get(COOKIE)?.value || "").toLowerCase().replace(/\s+/g, "");
  if (candidate && /^[a-z0-9-]{3,40}$/.test(candidate)) {
    const student = await getPrisma().student.findUnique({ where: { slug: candidate } });
    if (student) {
      const res = NextResponse.redirect(publicUrl(request, `/licao/${student.slug}`), 303);
      res.headers.set("Set-Cookie", cookieHeader(student.slug));
      return res;
    }
  }
  return new NextResponse(form(typed ? "Código não encontrado. Confira e tente de novo." : "", typed), { headers: HTML_HEADERS });
}
