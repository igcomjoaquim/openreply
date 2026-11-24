import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db/client";
import { publicUrl } from "@/lib/licao/html";

export const runtime = "nodejs";

type Params = { params: Promise<{ slug: string }> };

/** Só para o aluno de demonstração: apaga o que foi feito na lição mais nova. */
function isDemoStudent(name: string): boolean {
  return /^aluno teste/i.test(name.trim());
}

export async function POST(request: NextRequest, { params }: Params) {
  const { slug } = await params;
  const prisma = getPrisma();
  const student = await prisma.student.findUnique({ where: { slug } });
  if (!student || !isDemoStudent(student.name)) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  const lesson = await prisma.lesson.findFirst({ where: { studentId: student.id }, orderBy: { createdAt: "desc" } });
  if (lesson) await prisma.lessonAttempt.deleteMany({ where: { lessonId: lesson.id } });
  return NextResponse.redirect(publicUrl(request, `/licao/${slug}?zerado=1`), 303);
}
