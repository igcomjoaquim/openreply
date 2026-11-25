import type { LessonRow } from "@/lib/licao/summary";

/** Jeito de jogo na página do aluno: XP, nível, medalhas e a trilha de fases. */

type Entry = { score?: number; max?: number; data?: Record<string, unknown> | null };

const LEVELS = [
  { xp: 0, name: "Iniciante" },
  { xp: 40, name: "Curioso" },
  { xp: 100, name: "Ouvinte" },
  { xp: 180, name: "Fofoqueiro" },
  { xp: 280, name: "Tagarela" },
  { xp: 400, name: "Contador de histórias" },
  { xp: 550, name: "Mestre da fofoca" },
  { xp: 750, name: "Quase nativo" },
  { xp: 1000, name: "Lenda" },
];

export type Badge = { icon: string; name: string; desc: string; got: boolean };
export type Game = {
  xp: number;
  level: number;
  levelName: string;
  nextName: string | null;
  toNext: number | null;
  pctInLevel: number;
  badges: Badge[];
};

function entries(progress: unknown): Record<string, Entry> {
  return (progress ?? {}) as Record<string, Entry>;
}

/** Semana do ano (segunda a domingo) para contar semanas seguidas. */
function weekIndex(d: Date): number {
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  return Math.floor(monday.getTime() / (7 * 86_400_000));
}

export function gameOf(rows: LessonRow[]): Game {
  const graded = rows.filter((r) => r.graded);
  let xp = 0;
  let perfectStage = false;
  let threeStars = false;
  let goldenSpeech = false;
  let sharpEar = false;
  let comboBest = 0;
  let bonusBest = 0;
  for (const r of graded) {
    const p = entries(r.graded!.progress);
    const combo = Number(p.combo?.data?.bonus) || 0;
    const bonus = Number(p.bonus?.data?.right) || 0;
    xp += r.graded!.score.pts + 10 + combo + bonus * 2;
    comboBest = Math.max(comboBest, Number(p.combo?.data?.best) || 0);
    bonusBest = Math.max(bonusBest, bonus);
    if (r.graded!.score.pct >= 90) threeStars = true;
    const full = (k: string) => (Number(p[k]?.max) || 0) > 0 && Number(p[k]?.score) === Number(p[k]?.max);
    if (Object.keys(p).some(full)) perfectStage = true;
    if (full("shadowing")) goldenSpeech = true;
    if (full("dictation") && full("gossip")) sharpEar = true;
  }
  const weeks = [...new Set(graded.map((r) => weekIndex(r.graded!.finishedAt)))].sort((a, b) => a - b);
  let run = 0;
  let bestRun = 0;
  weeks.forEach((w, i) => {
    run = i > 0 && w === weeks[i - 1] + 1 ? run + 1 : 1;
    bestRun = Math.max(bestRun, run);
  });
  const late = rows.slice(1).filter((r) => !r.graded).length;

  let level = 0;
  LEVELS.forEach((l, i) => {
    if (xp >= l.xp) level = i;
  });
  const next = LEVELS[level + 1] ?? null;
  const from = LEVELS[level].xp;

  return {
    xp,
    level: level + 1,
    levelName: LEVELS[level].name,
    nextName: next?.name ?? null,
    toNext: next ? next.xp - xp : null,
    pctInLevel: next ? Math.round(((xp - from) / (next.xp - from)) * 100) : 100,
    badges: [
      { icon: "🎒", name: "Primeira lição", desc: "Concluiu a primeira lição", got: graded.length >= 1 },
      { icon: "⭐", name: "Fase perfeita", desc: "Fez uma fase com todos os pontos", got: perfectStage },
      { icon: "🌟", name: "Lição 3 estrelas", desc: "90% ou mais numa lição", got: threeStars },
      { icon: "🗣️", name: "Fala de ouro", desc: "Shadowing todo certo", got: goldenSpeech },
      { icon: "👂", name: "Ouvido afiado", desc: "Ditado e fofoca perfeitos na mesma lição", got: sharpEar },
      { icon: "🔥", name: "Combo x5", desc: "5 acertos seguidos", got: comboBest >= 5 },
      { icon: "⚡", name: "Relâmpago", desc: "5 acertos na rodada bônus", got: bonusBest >= 5 },
      { icon: "📅", name: "3 semanas seguidas", desc: "Fez lição 3 semanas sem parar", got: bestRun >= 3 },
      { icon: "🏆", name: "5 lições", desc: "Concluiu 5 lições", got: graded.length >= 5 },
      { icon: "⏰", name: "Em dia", desc: "3 lições feitas e nenhuma atrasada", got: graded.length >= 3 && late === 0 },
    ],
  };
}

export function starsOf(pct: number): number {
  return pct >= 90 ? 3 : pct >= 60 ? 2 : 1;
}
