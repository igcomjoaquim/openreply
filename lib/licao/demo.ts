import { getPrisma } from "@/lib/db/client";

const IDLE_MS = 20 * 60_000;

export function isDemoStudent(name: string): boolean {
  return /^aluno teste/i.test(name.trim());
}

function nowMs(): number {
  return Date.now();
}

/**
 * Aluno de demonstração: a lição mais nova volta a ficar zerada sozinha.
 * Apaga as tentativas paradas há mais de 20 min — quem está fazendo agora
 * (ou acabou de ver o feedback) não perde nada; o próximo visitante pega do zero.
 */
export async function autoResetDemo(studentId: string): Promise<void> {
  const prisma = getPrisma();
  const lesson = await prisma.lesson.findFirst({ where: { studentId }, orderBy: { createdAt: "desc" }, select: { id: true } });
  if (!lesson) return;
  await prisma.lessonAttempt.deleteMany({
    where: { lessonId: lesson.id, updatedAt: { lt: new Date(nowMs() - IDLE_MS) } },
  });
}
