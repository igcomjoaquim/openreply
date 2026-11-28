import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getPrisma } from "@/lib/db/client";
import { escapeHtml, sendMail } from "@/lib/destravando/conta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * ⏰ Lembrete diário por e-mail (Thiago 28/11: "autorizo um serviço separado no Railway que roda uma vez por dia").
 * O serviço "lembrete" do Railway (cron, separado da automação de DM) chama POST aqui com a chave x-cron-key.
 * Manda só pra quem: ainda não treinou hoje, não está de férias, não saiu do lembrete, não recebeu hoje,
 * e treinou nos últimos 7 dias (ou criou a conta há até 3 dias). Ninguém leva e-mail todo dia pra sempre.
 */
const URL_SITE = "https://destravando.inglescomjoaquim.com";
const BASE = URL_SITE + "/api/lembrete-diario"; // passa pelo site (o worker manda pra /api/destravando/lembrete-diario)
const DAY = 86_400_000;
const key = () => process.env.DESTRAVANDO_CRON_KEY ?? "";
const sign = (id: string) => createHmac("sha256", key()).update("sair:" + id).digest("base64url").slice(0, 22);
const isoBR = (d: Date) => d.toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });

type Prog = { days?: unknown; ferias?: unknown };
function streakOf(days: string[], hoje: string): number {
  const set = new Set(days);
  const d = new Date(hoje + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() - 1); // hoje ainda não treinou: conta até ontem
  let n = 0;
  while (set.has(d.toISOString().slice(0, 10))) { n++; d.setUTCDate(d.getUTCDate() - 1); }
  return n;
}

function mensagem(first: string, streak: number, sair: string) {
  const subject = streak >= 2 ? `🔥 ${streak} dias seguidos, ${first}. Vai deixar apagar hoje?` : `${first}, 15 minutinhos hoje? 🔓`;
  const linhaOfensiva = streak >= 2 ? `Você tá com ${streak} dias seguidos. Seria uma pena zerar por causa de 15 minutos, né?` : "Um dia de treino por vez. Hoje conta.";
  const text = `Turubom, ${first}?\n\nPassando só pra lembrar: o seu treino de hoje ainda tá te esperando. São uns 15 minutinhos, menos que um episódio de série.\n\n${linhaOfensiva}\n\nÉ só levantar a bunda do sofá. Ou nem isso: dá pra fazer deitado.\n${URL_SITE}\n\nFalou, validou!\nThiago · Inglês com Joaquim\n\nVai viajar? Marca "Tirar férias" no app: a ofensiva fica guardada e eu paro de te lembrar.\nNão quer mais esses lembretes? ${sair}`;
  const html = `<div style="font-family:system-ui,sans-serif;font-size:16px;line-height:1.5;color:#211A10;max-width:520px"><p>Turubom, ${escapeHtml(first)}?</p><p>Passando só pra lembrar: o seu treino de hoje ainda tá te esperando. São uns <b>15 minutinhos</b>, menos que um episódio de série.</p><p>${streak >= 2 ? "🔥 " : ""}${escapeHtml(linhaOfensiva)}</p><p>É só levantar a bunda do sofá. Ou nem isso: dá pra fazer deitado. 😏</p><p><a href="${URL_SITE}" style="display:inline-block;background:linear-gradient(180deg,#EDC55F,#D4A843 55%,#BF922F);color:#2B2008;font-weight:700;text-decoration:none;padding:12px 22px;border-radius:999px">Treinar agora →</a></p><p style="font-family:Georgia,serif;font-style:italic;color:#6F2A3D">Falou, validou!<br>Thiago · Inglês com Joaquim</p><p style="color:#7F735C;font-size:13px">Vai viajar? Marca <b>Tirar férias</b> no app: a ofensiva fica guardada e eu paro de te lembrar.<br><a href="${sair}" style="color:#7F735C">Não quero mais esses lembretes</a></p></div>`;
  return { subject, text, html };
}

async function cron(req: NextRequest) {
  const got = req.headers.get("x-cron-key") ?? "";
  const k = key();
  if (!k || got.length !== k.length || !timingSafeEqual(Buffer.from(got), Buffer.from(k))) return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  const teste = req.nextUrl.searchParams.get("teste"); // ?teste=email → manda só pra esse e-mail, sem regras (conferir o texto)
  const prisma = getPrisma();
  const hoje = isoBR(new Date());
  const users = await prisma.dtvUser.findMany({
    where: teste ? { email: teste.toLowerCase() } : { reminderOff: false, OR: [{ reminderAt: null }, { reminderAt: { not: hoje } }] },
    select: { id: true, email: true, name: true, progress: true, createdAt: true },
  });
  let enviados = 0, pulados = 0, erros = 0;
  for (const u of users) {
    const p = (u.progress && typeof u.progress === "object" ? u.progress : {}) as Prog;
    const days = Array.isArray(p.days) ? (p.days as unknown[]).filter((x): x is string => typeof x === "string").sort() : [];
    const ferias = Array.isArray(p.ferias) ? (p.ferias as { from?: string; to?: string }[]) : [];
    if (!teste) {
      const ultimo = days[days.length - 1];
      const ativo = ultimo ? Date.parse(hoje) - Date.parse(ultimo) <= 7 * DAY : Date.now() - u.createdAt.getTime() <= 3 * DAY;
      const deFerias = ferias.some((f) => typeof f?.from === "string" && typeof f?.to === "string" && hoje >= f.from && hoje <= f.to);
      if (days.includes(hoje) || deFerias || !ativo) { pulados++; continue; }
    }
    const sair = `${BASE}?sair=${u.id}.${sign(u.id)}`;
    const m = mensagem(u.name.split(" ")[0] || "você", streakOf(days, hoje), sair);
    try {
      await sendMail(u.email, m.subject, m.text, m.html, { "List-Unsubscribe": `<${sair}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" });
      if (!teste) await prisma.dtvUser.update({ where: { id: u.id }, data: { reminderAt: hoje } });
      enviados++;
    } catch (e) {
      erros++;
      console.error("[destravando] lembrete", String(e).slice(0, 200));
    }
    await new Promise((r) => setTimeout(r, 600)); // Resend: no máx. ~2 por segundo
  }
  console.log(`[destravando] lembrete ${hoje}: enviados ${enviados}, pulados ${pulados}, erros ${erros}`);
  return NextResponse.json({ hoje, enviados, pulados, erros });
}

/** Link "não quero mais esses lembretes" do e-mail (GET = clique; POST com sair = botão de descadastro do Gmail). */
async function sair(req: NextRequest) {
  const v = req.nextUrl.searchParams.get("sair") ?? "";
  const [id, sig] = v.split(".");
  const ok = !!id && !!sig && !!key() && sig === sign(id);
  if (ok) await getPrisma().dtvUser.update({ where: { id }, data: { reminderOff: true } }).catch(() => null);
  const msg = ok ? "Pronto! Você não recebe mais os lembretes por e-mail. Sua conta e seu progresso continuam iguais. 😉" : "Esse link não funcionou. Me chama no botão “Achou um problema?” dentro do app.";
  return new NextResponse(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Destravando</title><div style="font-family:system-ui,sans-serif;max-width:480px;margin:60px auto;padding:0 20px;font-size:17px;line-height:1.5;color:#211A10"><p>${msg}</p><p><a href="${URL_SITE}">Voltar pro Destravando →</a></p></div>`, { headers: { "content-type": "text/html; charset=utf-8" } });
}
// GET só mostra o botão (antivírus de e-mail abre links sozinho e tiraria a pessoa sem ela querer)
export async function GET(req: NextRequest) {
  const v = escapeHtml(req.nextUrl.searchParams.get("sair") ?? "");
  return new NextResponse(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Destravando</title><div style="font-family:system-ui,sans-serif;max-width:480px;margin:60px auto;padding:0 20px;font-size:17px;line-height:1.5;color:#211A10"><p>Quer parar de receber os lembretes diários por e-mail? Sua conta e seu progresso continuam iguais.</p><form method="post" action="?sair=${v}"><button style="font-size:17px;padding:12px 22px;border-radius:999px;border:0;background:#6F2A3D;color:#fff;font-weight:700">Parar os lembretes</button></form><p><a href="${URL_SITE}">Não, voltar pro Destravando →</a></p></div>`, { headers: { "content-type": "text/html; charset=utf-8" } });
}
export async function POST(req: NextRequest) { return req.nextUrl.searchParams.get("sair") ? sair(req) : cron(req); }
