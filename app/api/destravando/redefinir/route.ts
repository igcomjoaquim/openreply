import { type NextRequest } from "next/server";
import { getPrisma } from "@/lib/db/client";
import { codeHash, hashPassword, json, newSession, normEmail, preflight, publicUser, tooMany } from "@/lib/destravando/conta";

export const runtime = "nodejs";
export const OPTIONS = preflight;

/** E-mail + código de 6 números + senha nova → troca a senha, derruba as outras sessões e já entra. */
export async function POST(req: NextRequest) {
  if (tooMany(req, "redefinir", 15, 900_000)) return json(req, { error: "Muitas tentativas. Peça um código novo daqui a pouco." }, 429);
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const email = normEmail(b.email), code = String(b.code ?? "").replace(/\D/g, ""), pw = typeof b.password === "string" ? b.password : "";
  if (!email || code.length !== 6) return json(req, { error: "Confira o código de 6 números." }, 400);
  if (pw.length < 6 || pw.length > 100) return json(req, { error: "A senha precisa ter pelo menos 6 caracteres." }, 400);
  const p = getPrisma(), u = await p.dtvUser.findUnique({ where: { email } });
  const r = u ? await p.dtvReset.findFirst({ where: { userId: u.id, usedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" } }) : null;
  if (!u || !r) return json(req, { error: "Código vencido. Peça um novo." }, 400);
  if (r.attempts >= 5) return json(req, { error: "Muitas tentativas com esse código. Peça um novo." }, 400);
  if (r.codeHash !== codeHash(code)) { await p.dtvReset.update({ where: { id: r.id }, data: { attempts: { increment: 1 } } }); return json(req, { error: "Código errado. Confira no e-mail." }, 400); }
  await p.$transaction([
    p.dtvReset.update({ where: { id: r.id }, data: { usedAt: new Date() } }),
    p.dtvUser.update({ where: { id: u.id }, data: { passwordHash: await hashPassword(pw), lastSeenAt: new Date(), emailVerifiedAt: u.emailVerifiedAt ?? new Date() } }), // o código chegou no e-mail: confirma também
    p.dtvSession.deleteMany({ where: { userId: u.id } }),
  ]);
  return json(req, { token: await newSession(u.id), user: publicUser(u), progress: u.progress ?? null, progressAt: u.progressAt });
}
