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
  const faceid = await getPrisma().dtvPasskey.count({ where: { userId: me.user.id } });
  return json(req, { emailLembrete: !me.user.reminderOff, novidades: me.user.marketingOk, hora: me.user.reminderHour, fuso: me.user.timezone, aparelhosComNotificacao: pushes, faceid });
}
export async function POST(req: NextRequest) {
  const me = await userFrom(req);
  if (!me) return json(req, { error: "Entre de novo." }, 401);
  const b = (await req.json().catch(() => ({}))) as { emailLembrete?: boolean; novidades?: boolean; hora?: number; fuso?: string };
  const data: { reminderOff?: boolean; marketingOk?: boolean; reminderHour?: number; timezone?: string } = {};
  if (Number.isInteger(b.hora) && (b.hora as number) >= 5 && (b.hora as number) <= 23) data.reminderHour = b.hora as number;
  if (typeof b.fuso === "string" && b.fuso.length < 60) { try { new Intl.DateTimeFormat("en-US", { timeZone: b.fuso }); data.timezone = b.fuso; } catch {} }
  if (typeof b.emailLembrete === "boolean") data.reminderOff = !b.emailLembrete;
  if (typeof b.novidades === "boolean") data.marketingOk = b.novidades;
  const u = await getPrisma().dtvUser.update({ where: { id: me.user.id }, data });
  return json(req, { ok: true, emailLembrete: !u.reminderOff, novidades: u.marketingOk, hora: u.reminderHour });
}
