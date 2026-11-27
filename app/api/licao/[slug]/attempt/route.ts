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
  // O navegador perdeu {id, token} (abriu o link por outro app/navegador, limpou dados…):
  // retoma a tentativa não terminada com mais partes feitas, em vez de começar do zero.
  // O link já é o código pessoal do aluno, então quem chega aqui é ele.
  const open = await prisma.lessonAttempt.findMany({
    where: { lessonId: lesson.id, finishedAt: null },
    orderBy: { updatedAt: "desc" },
    take: 20,
  });
  const parts = (p: unknown) =>
    p && typeof p === "object" ? Object.keys(p as Record<string, unknown>).filter((k) => k !== "combo" && !k.startsWith("_") && !/^(treino|extra)\d/.test(k)).length : 0;
  const best = open.reduce<(typeof open)[number] | null>((acc, a) => (!acc || parts(a.progress) > parts(acc.progress) ? a : acc), null);
  if (best) {
    return NextResponse.json({ id: best.id, token: best.token, progress: best.progress, review: best.review });
  }
  const attempt = await prisma.lessonAttempt.create({
    data: { lessonId: lesson.id, token: randomBytes(24).toString("hex") },
  });
  return NextResponse.json({ id: attempt.id, token: attempt.token, progress: {}, review: null });
}
