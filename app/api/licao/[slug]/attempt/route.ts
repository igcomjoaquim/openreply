import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db/client";

export const runtime = "nodejs";

type Params = { params: Promise<{ slug: string }> };

/**
 * Começa (ou retoma) uma lição do aluno. O navegador guarda {id, token};
 * mandando os dois de volta, recebe o progresso salvo.
 */
export async function POST(request: NextRequest, { params }: Params) {
  const { slug } = await params;
  const body = (await request.json().catch(() => ({}))) as { lessonId?: string; id?: string; token?: string };
  if (typeof body.lessonId !== "string") return NextResponse.json({ error: "lessonId required" }, { status: 400 });
  const prisma = getPrisma();
  const lesson = await prisma.lesson.findUnique({ where: { id: body.lessonId }, include: { student: true } });
  if (!lesson || lesson.student.slug !== slug) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (body.id && body.token) {
    const existing = await prisma.lessonAttempt.findUnique({ where: { id: body.id } });
    if (existing && existing.token === body.token && existing.lessonId === lesson.id && !existing.finishedAt) {
      return NextResponse.json({ id: existing.id, token: existing.token, progress: existing.progress, review: existing.review });
    }
  }
  const attempt = await prisma.lessonAttempt.create({
    data: { lessonId: lesson.id, token: randomBytes(24).toString("hex") },
  });
  return NextResponse.json({ id: attempt.id, token: attempt.token, progress: {}, review: null });
}
