import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db/client";
import { isAuthorizedServiceRequest } from "@/lib/publishing/media-store";

export const runtime = "nodejs";

type Params = { params: Promise<{ slug: string }> };

/**
 * Apaga um código de aluno criado por engano (ex.: código único de uma turma).
 * Recusa se alguém já concluiu alguma lição desse código.
 */
export async function DELETE(request: NextRequest, { params }: Params) {
  if (!isAuthorizedServiceRequest(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { slug } = await params;
  const prisma = getPrisma();
  const student = await prisma.student.findUnique({
    where: { slug },
    include: { lessons: { include: { attempts: { select: { finishedAt: true } } } } },
  });
  if (!student) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (student.lessons.some((l) => l.attempts.some((a) => a.finishedAt))) {
    return NextResponse.json({ error: "Has finished lessons" }, { status: 409 });
  }
  await prisma.student.delete({ where: { id: student.id } });
  return NextResponse.json({ deleted: slug });
}
