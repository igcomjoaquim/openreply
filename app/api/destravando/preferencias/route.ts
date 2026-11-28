import { type NextRequest } from "next/server";
import { getPrisma } from "@/lib/db/client";
import { json, preflight, userFrom } from "@/lib/destravando/conta";

export const runtime = "nodejs";
export const OPTIONS = preflight;

/** 👤 Aba "Você": preferências da conta (por enquanto, o lembrete diário por e-mail). */
export async function GET(req: NextRequest) {
  const me = await userFrom(req);
  if (!me) return json(req, { error: "Entre de novo." }, 401);
  const pushes = await getPrisma().dtvPush.count({ where: { userId: me.user.id } });
  return json(req, { emailLembrete: !me.user.reminderOff, novidades: me.user.marketingOk, aparelhosComNotificacao: pushes });
}
export async function POST(req: NextRequest) {
  const me = await userFrom(req);
  if (!me) return json(req, { error: "Entre de novo." }, 401);
  const b = (await req.json().catch(() => ({}))) as { emailLembrete?: boolean; novidades?: boolean };
  const data: { reminderOff?: boolean; marketingOk?: boolean } = {};
  if (typeof b.emailLembrete === "boolean") data.reminderOff = !b.emailLembrete;
  if (typeof b.novidades === "boolean") data.marketingOk = b.novidades;
  const u = await getPrisma().dtvUser.update({ where: { id: me.user.id }, data });
  return json(req, { ok: true, emailLembrete: !u.reminderOff, novidades: u.marketingOk });
}
