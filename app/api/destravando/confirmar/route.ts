import { type NextRequest } from "next/server";
import { getPrisma } from "@/lib/db/client";
import { codeHash, json, newSession, normEmail, preflight, publicUser, sendWelcome, tooMany } from "@/lib/destravando/conta";

export const runtime = "nodejs";
export const OPTIONS = preflight;

/** 📩 E-mail + código de 6 números → confirma o e-mail, manda as boas-vindas e já entra. */
export async function POST(req: NextRequest) {
  if (tooMany(req, "confirmar", 20, 900_000)) return json(req, { error: "Muitas tentativas. Peça um código novo daqui a pouco." }, 429);
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const email = normEmail(b.email), code = String(b.code ?? "").replace(/\D/g, "");
  if (!email || code.length !== 6) return json(req, { error: "Digite os 6 números do código." }, 400);
  const p = getPrisma(), u = await p.dtvUser.findUnique({ where: { email } });
  const r = u ? await p.dtvReset.findFirst({ where: { userId: u.id, usedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" } }) : null;
  if (!u || !r) return json(req, { error: "Código vencido. Toque em “Mandar outro código”." }, 400);
  if (r.attempts >= 5) return json(req, { error: "Muitas tentativas com esse código. Toque em “Mandar outro código”." }, 400);
  if (r.codeHash !== codeHash(code)) { await p.dtvReset.update({ where: { id: r.id }, data: { attempts: { increment: 1 } } }); return json(req, { error: "Código errado. Confira no e-mail (o último que chegou)." }, 400); }
  const first = !u.emailVerifiedAt;
  await p.$transaction([
    p.dtvReset.update({ where: { id: r.id }, data: { usedAt: new Date() } }),
    p.dtvUser.update({ where: { id: u.id }, data: { emailVerifiedAt: u.emailVerifiedAt ?? new Date(), lastSeenAt: new Date() } }),
  ]);
  if (first) sendWelcome(u.email, u.name).catch((err) => console.error("[destravando] boas-vindas", String(err).slice(0, 200)));
  return json(req, { token: await newSession(u.id), user: publicUser(u), progress: u.progress ?? null, progressAt: u.progressAt });
}
