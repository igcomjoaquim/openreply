import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/db/client";
import { attemptForToken } from "@/lib/licao/attempts";

export const runtime = "nodejs";

const bodySchema = z.object({
  token: z.string(),
  step: z.string().regex(/^[a-z0-9_-]{1,30}$/),
  score: z.number().min(0).max(100),
  max: z.number().min(0).max(100),
  /** Respostas do passo (texto escrito, transcrição, lacunas…). Pequeno. */
  data: z.unknown().optional(),
  finished: z.boolean().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const raw = await request.text();
  if (raw.length > 60_000) return NextResponse.json({ error: "Too large" }, { status: 413 });
  let json: unknown = null;
  try {
    json = JSON.parse(raw);
  } catch {
    /* invalid */
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });
  const attempt = await attemptForToken(id, parsed.data.token);
  if (!attempt) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { step, score, max, data, finished } = parsed.data;
  // Junta no banco (jsonb ||) para duas partes salvas ao mesmo tempo não se apagarem.
  const entry = JSON.stringify({ [step]: { score, max, data: data ?? null } });
  await getPrisma().$executeRaw`UPDATE "LessonAttempt" SET "progress" = "progress" || ${entry}::jsonb, "updatedAt" = ${new Date()} WHERE "id" = ${id}`;
  if (finished && !attempt.finishedAt) {
    await getPrisma().lessonAttempt.update({ where: { id }, data: { finishedAt: new Date() } });
  }
  return NextResponse.json({ ok: true });
}
