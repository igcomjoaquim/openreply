import { randomInt, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getPrisma } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 🎟️ Convites do teste fechado (uso único). Só com a chave do servidor (x-cron-key = DESTRAVANDO_CRON_KEY).
 * GET  → lista os convites e quem usou.
 * POST { quantos } → gera mais convites (máx. 50 por vez).
 * Os códigos ficam só no banco e no painel, nunca no repositório.
 */
const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function autorizado(req: NextRequest) {
  const k = process.env.DESTRAVANDO_CRON_KEY ?? "", got = req.headers.get("x-cron-key") ?? "";
  return !!k && got.length === k.length && timingSafeEqual(Buffer.from(got), Buffer.from(k));
}
async function lista() {
  const p = getPrisma();
  const cs = await p.dtvInvite.findMany({ orderBy: { createdAt: "asc" } });
  const ids = cs.map((c) => c.usedById).filter((x): x is string => !!x && x !== "reservando");
  const us = ids.length ? await p.dtvUser.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }) : [];
  const nome = new Map(us.map((u) => [u.id, u.name]));
  return cs.map((c) => ({ code: c.code, link: `https://destravando.inglescomjoaquim.com/?convite=${c.code}`, usado: c.usedById ? (nome.get(c.usedById) ?? "em uso") : null }));
}
export async function GET(req: NextRequest) {
  if (!autorizado(req)) return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  return NextResponse.json({ convites: await lista() });
}
export async function POST(req: NextRequest) {
  if (!autorizado(req)) return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { quantos?: number };
  const n = Math.max(1, Math.min(50, Math.floor(Number(b.quantos) || 0)));
  const p = getPrisma(), total = await p.dtvInvite.count();
  let feitos = 0;
  for (let t = 0; feitos < n && t < n * 5; t++) {
    const code = "DTV-" + Array.from({ length: 5 }, () => A[randomInt(A.length)]).join("");
    try { await p.dtvInvite.create({ data: { code, label: `Amigo ${total + feitos + 1}` } }); feitos++; } catch { /* repetido: tenta outro */ }
  }
  return NextResponse.json({ feitos, convites: await lista() });
}
