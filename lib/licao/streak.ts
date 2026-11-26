import { getPrisma } from "@/lib/db/client";

/**
 * 🔥 Ofensiva (Thiago 26/11): quantos dias seguidos o aluno estudou no site.
 * Conta como dia de estudo: qualquer parte da lição, treino dos erros ou lição extra
 * (guardados em progress._days, no fuso de São Paulo) e, pra trás, os dias das gravações
 * e das lições concluídas. A ofensiva continua viva até o fim do dia seguinte.
 */

const TZ = "America/Sao_Paulo";

export function spDay(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

function prevDay(day: string): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export type Streak = { days: number; today: boolean; best: number; total: number };

export function streakFrom(daySet: Set<string>, now: Date = new Date()): Streak {
  const today = spDay(now);
  const hasToday = daySet.has(today);
  let cur = hasToday ? today : prevDay(today);
  let days = 0;
  while (daySet.has(cur)) {
    days++;
    cur = prevDay(cur);
  }
  // melhor sequência de todas
  const sorted = [...daySet].sort();
  let best = 0;
  let run = 0;
  let last = "";
  for (const d of sorted) {
    run = last && prevDay(d) === last ? run + 1 : 1;
    best = Math.max(best, run);
    last = d;
  }
  return { days, today: hasToday, best, total: daySet.size };
}

export async function studentStreak(studentId: string): Promise<Streak> {
  const prisma = getPrisma();
  const attempts = await prisma.lessonAttempt.findMany({
    where: { lesson: { studentId } },
    select: { progress: true, finishedAt: true, recordings: { select: { createdAt: true } } },
  });
  const set = new Set<string>();
  for (const a of attempts) {
    const p = (a.progress ?? {}) as Record<string, unknown>;
    const days = p._days;
    if (Array.isArray(days)) for (const d of days) if (typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)) set.add(d);
    if (a.finishedAt) set.add(spDay(a.finishedAt));
    for (const r of a.recordings) set.add(spDay(r.createdAt));
  }
  return streakFrom(set);
}

/** Marca hoje como dia de estudo nesta tentativa (sem repetir o dia). */
export async function markActiveDay(attemptId: string): Promise<void> {
  const day = JSON.stringify(spDay());
  await getPrisma().$executeRaw`UPDATE "LessonAttempt" SET "progress" = jsonb_set("progress", '{_days}', CASE WHEN COALESCE("progress"->'_days', '[]'::jsonb) @> ${day}::jsonb THEN COALESCE("progress"->'_days', '[]'::jsonb) ELSE COALESCE("progress"->'_days', '[]'::jsonb) || ${day}::jsonb END, true) WHERE "id" = ${attemptId}`;
}
