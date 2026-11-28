import type { NextRequest } from "next/server";

/** 🔐 Face ID / digital (passkey). O "rpID" é o domínio do site: oficial ou o de teste. */
const DOMINIOS = ["destravando.inglescomjoaquim.com", "teste.destravando-b9b.pages.dev"];
export function rpOf(req: NextRequest): { rpID: string; origin: string } | null {
  const o = req.headers.get("origin") ?? "";
  try { const h = new URL(o).hostname; if (DOMINIOS.includes(h)) return { rpID: h, origin: `https://${h}` }; } catch {}
  return null;
}
// desafios guardados por 5 minutos (um servidor só no Railway)
const CH = new Map<string, { ch: string; until: number; userId?: string }>();
export function putChallenge(key: string, ch: string, userId?: string) {
  const now = Date.now(); for (const [k, v] of CH) if (v.until < now) CH.delete(k);
  CH.set(key, { ch, until: now + 5 * 60_000, userId });
}
export function takeChallenge(key: string) { const v = CH.get(key); CH.delete(key); return v && v.until > Date.now() ? v : null; }
export const b64u = {
  enc: (u: Uint8Array) => Buffer.from(u).toString("base64url"),
  dec: (s: string) => new Uint8Array(Buffer.from(s, "base64url")),
};
