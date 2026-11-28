import webpush from "web-push";
import { getPrisma } from "@/lib/db/client";

/** 🔔 Notificação no celular (Web Push). Chaves VAPID nas variáveis do Railway. */
let ready: boolean | null = null;
function setup(): boolean {
  if (ready !== null) return ready;
  const pub = process.env.DESTRAVANDO_VAPID_PUBLIC, priv = process.env.DESTRAVANDO_VAPID_PRIVATE;
  ready = !!(pub && priv);
  if (ready) webpush.setVapidDetails("https://destravando.inglescomjoaquim.com", pub!, priv!);
  return ready;
}
export function vapidPublic(): string | null { return process.env.DESTRAVANDO_VAPID_PUBLIC ?? null; }

export type PushMsg = { title: string; body: string; url?: string; badge?: number; tag?: string };
/** Manda pra todos os aparelhos da pessoa. Apaga inscrição morta (404/410). Devolve quantos chegaram. */
export async function pushUser(userId: string, msg: PushMsg): Promise<number> {
  if (!setup()) return 0;
  const p = getPrisma();
  const subs = await p.dtvPush.findMany({ where: { userId } });
  let ok = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(msg), { TTL: 6 * 3600, urgency: "normal" });
      ok++;
      await p.dtvPush.update({ where: { id: s.id }, data: { lastOkAt: new Date() } });
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await p.dtvPush.delete({ where: { id: s.id } }).catch(() => null);
      else console.error("[destravando] push", code, String(e).slice(0, 160));
    }
  }
  return ok;
}
