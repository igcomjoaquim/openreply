import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db/client";
import { markDrillHit } from "@/lib/licao/drill";
import { markActiveDay, studentStreak } from "@/lib/licao/streak";

export const runtime = "nodejs";

type Params = { params: Promise<{ slug: string }> };

/**
 * 🎯 Treinar meus erros: o aluno acertou um erro hoje. Guarda o dia (2 dias diferentes = erro corrigido)
 * e conta pra 🔥 ofensiva. Não mexe em nota. O link já é o código pessoal do aluno.
 */
export async function POST(request: NextRequest, { params }: Params) {
  const { slug } = await params;
  const body = (await request.json().catch(() => ({}))) as { lessonId?: string; itemId?: string };
  if (typeof body.lessonId !== "string" || typeof body.itemId !== "string" || !/^[a-f0-9]{12}$/.test(body.itemId)) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  const prisma = getPrisma();
  const lesson = await prisma.lesson.findUnique({ where: { id: body.lessonId }, include: { student: true } });
  if (!lesson || lesson.student.slug !== slug) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const ok = await markDrillHit(lesson.id, body.itemId);
  const att = await prisma.lessonAttempt.findFirst({ where: { lessonId: lesson.id, finishedAt: { not: null } }, orderBy: { finishedAt: "asc" }, select: { id: true } });
  if (att) await markActiveDay(att.id);
  return NextResponse.json({ ok, streak: await studentStreak(lesson.studentId) });
}
