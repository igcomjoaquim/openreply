import { type NextRequest } from "next/server";
import { getPrisma } from "@/lib/db/client";
import { clean, json, normEmail, preflight, tooMany, userFrom } from "@/lib/destravando/conta";

export const runtime = "nodejs";
export const OPTIONS = preflight;

/** 💬 "Achou um problema? Me conta": guarda a mensagem do aluno (com a tela onde ele estava) pro painel. */
export async function POST(req: NextRequest) {
  if (tooMany(req, "feedback", 12, 10 * 60_000)) return json(req, { error: "Muitas mensagens seguidas. Tenta de novo daqui a pouco." }, 429);
  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return json(req, { error: "bad" }, 400); }
  const text = typeof b.text === "string" ? b.text.trim().slice(0, 3000) : "";
  if (text.length < 2) return json(req, { error: "Escreve o que aconteceu 🙂" }, 400);
  const s = await userFrom(req);
  const ua = req.headers.get("user-agent") ?? "";
  const device = /iPhone|iPad/.test(ua) ? "iPhone/iPad" : /Android/.test(ua) ? "Android" : /Mac/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows" : "outro";
  await getPrisma().dtvFeedback.create({
    data: {
      userId: s?.user.id ?? null,
      name: s?.user.name ?? clean(b.name, 80),
      email: s?.user.email ?? normEmail(b.email),
      screen: clean(b.screen, 200),
      text,
      device,
    },
  });
  return json(req, { ok: true });
}
