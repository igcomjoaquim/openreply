import { type NextRequest } from "next/server";
import { getPrisma } from "@/lib/db/client";
import { checkPassword, issueVerify, json, newSession, normEmail, preflight, publicUser, tooMany } from "@/lib/destravando/conta";

export const runtime = "nodejs";
export const OPTIONS = preflight;

export async function POST(req: NextRequest) {
  if (tooMany(req, "entrar", 20, 900_000)) return json(req, { error: "Muitas tentativas. Espere uns minutos ou use Esqueci a senha." }, 429);
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const email = normEmail(b.email), pw = typeof b.password === "string" ? b.password : "";
  const u = email ? await getPrisma().dtvUser.findUnique({ where: { email } }) : null;
  if (!u || !(await checkPassword(pw, u.passwordHash))) return json(req, { error: "E-mail ou senha não conferem." }, 401);
  // ainda não confirmou o e-mail: manda (ou reaproveita) o código e o app abre a tela do código
  if (!u.emailVerifiedAt) { const st = await issueVerify(u); return json(req, { verify: true, email: u.email, mail: st, error: "Confirme o seu e-mail com o código que mandamos." }, 403); }
  await getPrisma().dtvUser.update({ where: { id: u.id }, data: { lastSeenAt: new Date() } });
  return json(req, { token: await newSession(u.id), user: publicUser(u), progress: u.progress ?? null, progressAt: u.progressAt });
}
