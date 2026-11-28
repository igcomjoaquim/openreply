import { type NextRequest } from "next/server";
import { getPrisma } from "@/lib/db/client";
import { issueVerify, json, normEmail, preflight, tooMany } from "@/lib/destravando/conta";

export const runtime = "nodejs";
export const OPTIONS = preflight;

/** 📩 "Mandar outro código": só pra conta que ainda não confirmou. Responde igual exista ou não (não entrega quem é aluno). */
export async function POST(req: NextRequest) {
  if (tooMany(req, "reenviar", 8, 3_600_000)) return json(req, { error: "Muitos pedidos. Tente de novo daqui a pouco." }, 429);
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const email = normEmail(b.email);
  if (!email) return json(req, { error: "Confira o seu e-mail." }, 400);
  const u = await getPrisma().dtvUser.findUnique({ where: { email } });
  if (u && !u.emailVerifiedAt) {
    const st = await issueVerify(u);
    if (st === "espera") return json(req, { error: "Acabei de mandar um. Espere 1 minutinho e confira o spam também." }, 429);
    if (st === "falhou") return json(req, { error: "Não consegui mandar o e-mail agora. Tente de novo em instantes." }, 503);
  }
  return json(req, { ok: true });
}
