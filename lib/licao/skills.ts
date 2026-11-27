import { getPrisma } from "@/lib/db/client";
import { EAR_PHASES, EAR_RULE, earPhaseOf } from "@/lib/licao/ear";

/**
 * 🎚️ FASES DE TODAS AS HABILIDADES (Thiago 27/11: "todas as habilidades têm fase; o aluno sempre sabe em que fase
 * está e o que falta pra subir — isso incentiva"). Quando ele vai bem em 2 lições seguidas, a próxima fica mais difícil.
 * Cena (ouvido) está em ear.ts; aqui: ditado, fofoca, reconto e writing.
 */
export type SkillKey = "cena" | "ditado" | "fofoca" | "lacunas" | "reconto" | "leitura" | "writing" | "realtime";
export type Fase = { icon: string; name: string; desc: string };
export type SkillPhase = { key: SkillKey; label: string; phase: number; streak: number; fases: Fase[]; rule: string };

const NAMES = [
  { icon: "🌱", name: "Sementinha" },
  { icon: "🌿", name: "Plantinha" },
  { icon: "🌳", name: "Árvore" },
  { icon: "🍎", name: "Árvore com frutos" },
];
function fases(descs: string[]): Fase[] {
  return NAMES.map((n, i) => ({ ...n, desc: descs[i] }));
}

export const SKILLS_CFG: { key: Exclude<SkillKey, "cena">; label: string; step: string; rule: string; fases: Fase[] }[] = [
  { key: "ditado", label: "✍️ Ditado", step: "dictation", rule: "Acerte 80% do ditado em 2 lições seguidas",
    fases: fases(["pode usar o 🐢 devagar", "sem o 🐢 devagar", "frases mais longas e emendadas", "velocidade normal, ouvindo no máximo 2 vezes"]) },
  { key: "fofoca", label: "🕵️ Fofoca", step: "gossip", rule: "Acerte 80% da fofoca em 2 lições seguidas",
    fases: fases(["ouve quantas vezes quiser", "no máximo 5 escutas", "no máximo 3 escutas", "no máximo 2 escutas"]) },
  { key: "lacunas", label: "🧩 Lacunas", step: "story", rule: "Acerte 80% das lacunas em 2 lições seguidas",
    fases: fases(["com o quadro de vocabulário e a dica", "sem o quadro de vocabulário", "sem a dica da primeira letra", "sem quadro, sem dica e ouvindo no máximo 2 vezes"]) },
  { key: "reconto", label: "🎤 Reconto", step: "retell", rule: "Tire 4 de 5 no reconto em 2 lições seguidas",
    fases: fases(["fale 30 s, com as perguntas de apoio", "fale 45 s", "fale 1 minuto", "1 minuto, sem as perguntas de apoio"]) },
  { key: "leitura", label: "🗣️ Leitura", step: "read", rule: "Tire 4 de 5 na leitura em 2 lições seguidas",
    fases: fases(["as palavras ficam verdes enquanto você lê", "o verde só aparece no fim", "no ritmo natural, sem arrastar", "ritmo natural e 90% entendido"]) },
  { key: "writing", label: "📝 Writing", step: "writing", rule: "Tire 4 de 5 no writing em 2 lições seguidas",
    fases: fases(["35 palavras", "50 palavras", "70 palavras", "100 palavras, sem as ideias-guia"]) },
  { key: "realtime", label: "⚡ Real Time", step: "realtime", rule: "Tire 4 de 5 no Real Time em 2 lições seguidas",
    fases: fases(["com o mini vocabulário", "sem o mini vocabulário", "usando todas as estruturas", "sem vocabulário, falando pelo menos 20 s"]) },
];

/** Fases de todas as habilidades do aluno. force (Aluno Teste) = mostra todas numa fase pra demonstrar. */
export async function skillPhases(studentId: string, exceptLessonId?: string, force?: number): Promise<SkillPhase[]> {
  const lessons = await getPrisma().lesson.findMany({
    where: { studentId, ...(exceptLessonId ? { id: { not: exceptLessonId } } : {}) },
    orderBy: { date: "asc" },
    select: { attempts: { where: { finishedAt: { not: null } }, orderBy: { finishedAt: "asc" }, take: 1, select: { progress: true } } },
  });
  const out: SkillPhase[] = [];
  const ear = await earPhaseOf(studentId, exceptLessonId);
  out.push({ key: "cena", label: "🎧 Ouvido", phase: force ?? ear.phase, streak: ear.streak, rule: EAR_RULE,
    fases: EAR_PHASES.map((p) => ({ icon: p.icon, name: p.name, desc: p.seg })) });
  for (const c of SKILLS_CFG) {
    let phase = 1, streak = 0;
    for (const l of lessons) {
      const e = ((l.attempts[0]?.progress ?? {}) as Record<string, { score?: number; max?: number }>)[c.step];
      if (!e || !e.max) continue;
      if ((e.score ?? 0) / e.max >= 0.8) { streak++; if (streak >= 2 && phase < 4) { phase++; streak = 0; } }
      else streak = 0;
    }
    out.push({ key: c.key, label: c.label, phase: force ?? phase, streak, rule: c.rule, fases: c.fases });
  }
  return out;
}
