import { type NextRequest } from "next/server";
import { getPrisma } from "@/lib/db/client";
import { json, newCode, normEmail, preflight, sendCode, tooMany } from "@/lib/destravando/conta";

export const runtime = "nodejs";
export const OPTIONS = preflight;

/** Manda um código de 6 números pro e-mail. Responde igual exista ou não a conta (não entrega quem é aluno). */
export async function POST(req: NextRequest) {
  if (tooMany(req, "esqueci", 6, 3_600_000)) return json(req, { error: "Muitos pedidos. Tente de novo daqui a pouco." }, 429);
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const email = normEmail(b.email);
  if (!email) return json(req, { error: "Confira o seu e-mail." }, 400);
  const p = getPrisma(), u = await p.dtvUser.findUnique({ where: { email } });
  if (u) {
    const recent = await p.dtvReset.count({ where: { userId: u.id, createdAt: { gt: new Date(Date.now() - 60_000) } } });
    if (!recent) {
      const { code, hash } = newCode();
      await p.dtvReset.create({ data: { userId: u.id, codeHash: hash, expiresAt: new Date(Date.now() + 20 * 60_000) } });
      try { await sendCode(u.email, u.name, code); } catch (e) { console.error("[destravando] e-mail do código falhou", e); return json(req, { error: "Não consegui mandar o e-mail agora. Tente de novo em instantes." }, 503); }
    }
  }
  return json(req, { ok: true });
}
