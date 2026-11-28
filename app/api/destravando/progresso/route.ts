import { type NextRequest } from "next/server";
import type { Prisma } from "@/app/generated/prisma/client";
import { getPrisma } from "@/lib/db/client";
import { clean, json, preflight, userFrom } from "@/lib/destravando/conta";

export const runtime = "nodejs";
export const OPTIONS = preflight;

/** GET: progresso salvo na conta · PUT: guarda o progresso do aparelho (o mais novo vale). */
export async function GET(req: NextRequest) {
  const s = await userFrom(req);
  if (!s) return json(req, { error: "Entre de novo." }, 401);
  return json(req, { progress: s.user.progress ?? null, progressAt: s.user.progressAt });
}
export async function PUT(req: NextRequest) {
  const s = await userFrom(req);
  if (!s) return json(req, { error: "Entre de novo." }, 401);
  const raw = await req.text();
  if (raw.length > 400_000) return json(req, { error: "grande demais" }, 413);
  let b: Record<string, unknown>;
  try { b = JSON.parse(raw); } catch { return json(req, { error: "bad" }, 400); }
  if (!b.progress || typeof b.progress !== "object") return json(req, { error: "bad" }, 400);
  // dois aparelhos: o progresso mais velho não apaga o mais novo (devolve o da conta pro aparelho atrasado)
  const cur = s.user.progress as Record<string, unknown> | null;
  const curAt = cur && typeof cur.savedAt === "number" ? cur.savedAt : 0;
  const newAt = typeof (b.progress as Record<string, unknown>).savedAt === "number" ? ((b.progress as Record<string, unknown>).savedAt as number) : 0;
  if (curAt && newAt && newAt + 1000 < curAt) return json(req, { error: "Tem progresso mais novo na conta.", progress: cur }, 409);
  await getPrisma().dtvUser.update({
    where: { id: s.user.id },
    data: { progress: b.progress as Prisma.InputJsonValue, progressAt: new Date(), lastSeenAt: new Date(), ...(clean(b.testLevel, 40) ? { testLevel: clean(b.testLevel, 40) } : {}), ...(clean(b.selfLevel, 40) ? { selfLevel: clean(b.selfLevel, 40) } : {}) },
  });
  return json(req, { ok: true });
}
