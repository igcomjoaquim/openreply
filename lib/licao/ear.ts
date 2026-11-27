import { getPrisma } from "@/lib/db/client";

/**
 * 🎧 FASES DO OUVIDO (Thiago 27/11): o aluno nunca ouve frase por frase — as partes da cena começam com 2–3 frases
 * (~9 s) e vão CRESCENDO conforme ele acerta, até ele ouvir a cena inteira sem pausa. Ele sempre vê em que fase está
 * e o que falta pra subir ("isso incentiva").
 * Sobe de fase: acertar DE PRIMEIRA 4 de 5 partes (80%) em 2 lições seguidas.
 */
export type EarPhase = { phase: number; icon: string; name: string; parts: number; seg: string; streak: number; next: { icon: string; name: string; seg: string } | null };

export const EAR_PHASES = [
  { icon: "🌱", name: "Sementinha", parts: 5, seg: "5 partes de ~9 s, 2 a 3 frases" },
  { icon: "🌿", name: "Plantinha", parts: 4, seg: "4 partes, a 1ª com ~18 s" },
  { icon: "🌳", name: "Árvore", parts: 3, seg: "3 partes de até ~18 s" },
  { icon: "🍎", name: "Árvore com frutos", parts: 0, seg: "a cena inteira, sem pausa" },
];
export const EAR_RULE = "Acerte de primeira pelo menos 4 de 5 partes da cena em 2 lições seguidas";

export async function earPhaseOf(studentId: string, exceptLessonId?: string): Promise<EarPhase> {
  const lessons = await getPrisma().lesson.findMany({
    where: { studentId, ...(exceptLessonId ? { id: { not: exceptLessonId } } : {}) },
    orderBy: { date: "asc" },
    select: { attempts: { select: { progress: true }, orderBy: { createdAt: "asc" } } },
  });
  let phase = 1, streak = 0;
  for (const l of lessons) {
    let parts: { ok: boolean }[] | null = null;
    for (const a of l.attempts) {
      const p = (a.progress ?? {}) as { _partes?: { data?: { parts?: { ok: boolean }[] } } };
      if (p._partes?.data?.parts?.length) { parts = p._partes.data.parts; break; } // a primeira vez é a que vale
    }
    if (!parts) continue;
    const rate = parts.filter((x) => x.ok).length / parts.length;
    if (rate >= 0.8) { streak++; if (streak >= 2 && phase < EAR_PHASES.length) { phase++; streak = 0; } }
    else streak = 0;
  }
  const P = EAR_PHASES[phase - 1], N = EAR_PHASES[phase] ?? null;
  return { phase, icon: P.icon, name: P.name, parts: P.parts, seg: P.seg, streak, next: N ? { icon: N.icon, name: N.name, seg: N.seg } : null };
}
