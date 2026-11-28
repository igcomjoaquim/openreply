import { type NextRequest } from "next/server";
import { getPrisma } from "@/lib/db/client";
import { json, preflight, userFrom } from "@/lib/destravando/conta";
import { pushUser, vapidPublic } from "@/lib/destravando/push";

export const runtime = "nodejs";
export const OPTIONS = preflight;

/** GET: chave pública (o app precisa dela pra se inscrever). */
export async function GET(req: NextRequest) { return json(req, { key: vapidPublic() }); }

/** POST: inscreve este aparelho. { sub: {endpoint, keys:{p256dh, auth}}, device?, teste? } — teste=true manda uma notificação na hora. */
export async function POST(req: NextRequest) {
  const me = await userFrom(req);
  if (!me) return json(req, { error: "Entre de novo." }, 401);
  const b = (await req.json().catch(() => ({}))) as { sub?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } }; device?: string; teste?: boolean };
  const ep = b.sub?.endpoint, k = b.sub?.keys;
  if (!ep || !/^https:\/\//.test(ep) || ep.length > 1000 || !k?.p256dh || !k?.auth) return json(req, { error: "Inscrição inválida." }, 400);
  await getPrisma().dtvPush.upsert({
    where: { endpoint: ep },
    create: { userId: me.user.id, endpoint: ep, p256dh: k.p256dh, auth: k.auth, device: (b.device ?? "").slice(0, 120) || null },
    update: { userId: me.user.id, p256dh: k.p256dh, auth: k.auth },
  });
  let sent = 0;
  if (b.teste) sent = await pushUser(me.user.id, { title: "🔔 Notificação ligada!", body: `Turubom, ${me.user.name.split(" ")[0]}? Vou te lembrar do treino na hora certa. Falou, validou!`, url: "/?app=1", tag: "boas-vindas" });
  return json(req, { ok: true, sent });
}

/** DELETE: desliga a notificação deste aparelho. { endpoint } */
export async function DELETE(req: NextRequest) {
  const me = await userFrom(req);
  if (!me) return json(req, { error: "Entre de novo." }, 401);
  const b = (await req.json().catch(() => ({}))) as { endpoint?: string };
  if (b.endpoint) await getPrisma().dtvPush.deleteMany({ where: { endpoint: b.endpoint, userId: me.user.id } });
  return json(req, { ok: true });
}
