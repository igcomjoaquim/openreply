import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db/client";
import { markActiveDay, studentStreak } from "@/lib/licao/streak";

export const runtime = "nodejs";

type Params = { params: Promise<{ slug: string }> };

/**
 * 🔥 Ofensiva: o aluno treinou hoje (treino dos erros, lição extra, ou revendo a lição já feita).
 * Marca o dia na tentativa mais recente da lição e devolve a ofensiva atualizada.
 * O link já é o código pessoal do aluno, então quem chega aqui é ele.
 */
export async function POST(request: NextRequest, { params }: Params) {
  const { slug } = await params;
  const body = (await request.json().catch(() => ({}))) as { lessonId?: string };
  if (typeof body.lessonId !== "string") return NextResponse.json({ error: "lessonId required" }, { status: 400 });
  const prisma = getPrisma();
  const lesson = await prisma.lesson.findUnique({ where: { id: body.lessonId }, include: { student: true } });
  if (!lesson || lesson.student.slug !== slug) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const att = await prisma.lessonAttempt.findFirst({ where: { lessonId: lesson.id }, orderBy: [{ finishedAt: { sort: "asc", nulls: "last" } }, { updatedAt: "desc" }], select: { id: true } });
  if (att) await markActiveDay(att.id);
  return NextResponse.json({ streak: await studentStreak(lesson.studentId) });
}
