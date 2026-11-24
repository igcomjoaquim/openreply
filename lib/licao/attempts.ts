import { timingSafeEqual } from "node:crypto";
import { getPrisma } from "@/lib/db/client";

export async function latestLesson(slug: string) {
  const prisma = getPrisma();
  const student = await prisma.student.findUnique({ where: { slug } });
  if (!student) return null;
  const lesson = await prisma.lesson.findFirst({ where: { studentId: student.id }, orderBy: { createdAt: "desc" } });
  if (!lesson) return { student, lesson: null };
  return { student, lesson };
}

function sameToken(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** A tentativa só aceita escrita de quem tem o token (o navegador do aluno). */
export async function attemptForToken(id: string, token: unknown) {
  if (typeof token !== "string" || token.length < 16) return null;
  const attempt = await getPrisma().lessonAttempt.findUnique({ where: { id } });
  if (!attempt || !sameToken(attempt.token, token)) return null;
  return attempt;
}
