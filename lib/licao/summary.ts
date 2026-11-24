import { getPrisma } from "@/lib/db/client";

/** Habilidade de cada parte da lição (para as barrinhas de progresso). */
export const STEP_SKILL: Record<string, Skill> = {
  review: "falar",
  dictation: "ouvir",
  gossip: "ouvir",
  scene: "ouvir",
  shadowing: "falar",
  retell: "falar",
  story: "ler",
  read: "ler",
  writing: "escrever",
  realtime: "falar",
};

export type Skill = "ouvir" | "falar" | "ler" | "escrever";
export const SKILLS: Skill[] = ["ouvir", "falar", "ler", "escrever"];

type Entry = { score?: number; max?: number };

export type Score = {
  pts: number;
  max: number;
  pct: number;
  skills: Partial<Record<Skill, number>>;
};

export function scoreOf(progress: unknown): Score {
  const p = (progress ?? {}) as Record<string, Entry>;
  let pts = 0;
  let max = 0;
  const acc: Partial<Record<Skill, { pts: number; max: number }>> = {};
  for (const [step, e] of Object.entries(p)) {
    const s = Number(e?.score) || 0;
    const m = Number(e?.max) || 0;
    pts += s;
    max += m;
    const skill = STEP_SKILL[step];
    if (skill && m > 0) {
      acc[skill] = acc[skill] ?? { pts: 0, max: 0 };
      acc[skill]!.pts += s;
      acc[skill]!.max += m;
    }
  }
  const skills: Partial<Record<Skill, number>> = {};
  for (const k of SKILLS) if (acc[k]) skills[k] = Math.round((acc[k]!.pts / acc[k]!.max) * 100);
  return { pts, max, pct: max ? Math.round((pts / max) * 100) : 0, skills };
}

export type LessonRow = {
  id: string;
  date: string;
  title: string;
  /** Primeira vez que terminou: é a nota que vale. */
  graded: { score: Score; finishedAt: Date } | null;
  /** Começou e não terminou (nenhuma tentativa terminada). */
  started: boolean;
};

/** Lições do aluno, da mais nova para a mais antiga, com a nota que vale. */
export async function studentLessons(studentId: string): Promise<LessonRow[]> {
  const lessons = await getPrisma().lesson.findMany({
    where: { studentId },
    orderBy: { createdAt: "desc" },
    include: { attempts: { orderBy: { createdAt: "asc" }, select: { progress: true, finishedAt: true } } },
  });
  return lessons.map((l) => {
    const done = l.attempts
      .filter((a) => a.finishedAt)
      .sort((a, b) => a.finishedAt!.getTime() - b.finishedAt!.getTime())[0];
    return {
      id: l.id,
      date: l.date,
      title: l.title,
      graded: done ? { score: scoreOf(done.progress), finishedAt: done.finishedAt! } : null,
      started: l.attempts.some((a) => Object.keys((a.progress as object) ?? {}).length > 0),
    };
  });
}

/** Primeira tentativa terminada de uma lição (a que vale nota). */
export async function gradedAttempt(lessonId: string) {
  return getPrisma().lessonAttempt.findFirst({
    where: { lessonId, finishedAt: { not: null } },
    orderBy: { finishedAt: "asc" },
  });
}
