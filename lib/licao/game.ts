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

/** have/need: quanto falta (barrinha). how: como conquistar, em palavras simples. */
export type Badge = { icon: string; name: string; desc: string; got: boolean; have: number; need: number; how: string };
export type Game = {
  /** Nomes e XP de cada nível (pra mostrar a escada inteira). */
  levels: { xp: number; name: string }[];
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
  let bestPct = 0;
  let perfectCount = 0;
  for (const r of graded) {
    const p = entries(r.graded!.progress);
    const combo = Number(p.combo?.data?.bonus) || 0;
    const bonus = Number(p.bonus?.data?.right) || 0;
    xp += r.graded!.score.pts + 10 + combo + bonus * 2;
    comboBest = Math.max(comboBest, Number(p.combo?.data?.best) || 0);
    bonusBest = Math.max(bonusBest, bonus);
    if (r.graded!.score.pct >= 90) threeStars = true;
    bestPct = Math.max(bestPct, r.graded!.score.pct);
    const full = (k: string) => (Number(p[k]?.max) || 0) > 0 && Number(p[k]?.score) === Number(p[k]?.max);
    if (Object.keys(p).some(full)) perfectStage = true;
    perfectCount += Object.keys(p).filter(full).length;
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
    levels: LEVELS,
    badges: [
      { icon: "🎒", name: "Primeira lição", desc: "Concluiu a primeira lição", got: graded.length >= 1, have: Math.min(graded.length, 1), need: 1, how: "Termine uma lição inteira e toque em ✅ Concluir." },
      { icon: "⭐", name: "Fase perfeita", desc: "Fez uma fase com todos os pontos", got: perfectStage, have: Math.min(perfectCount, 1), need: 1, how: "Faça qualquer fase sem perder nenhum ponto (3 estrelas na fase)." },
      { icon: "🌟", name: "Lição 3 estrelas", desc: "90% ou mais numa lição", got: threeStars, have: Math.min(bestPct, 90), need: 90, how: "Tire 90% ou mais numa lição inteira. Sua melhor até agora: " + bestPct + "%." },
      { icon: "🗣️", name: "Fala de ouro", desc: "Shadowing todo certo", got: goldenSpeech, have: goldenSpeech ? 1 : 0, need: 1, how: "No shadowing, faça as 5 frases com a pronúncia entendida (verde em todas)." },
      { icon: "👂", name: "Ouvido afiado", desc: "Ditado e fofoca perfeitos na mesma lição", got: sharpEar, have: sharpEar ? 1 : 0, need: 1, how: "Na mesma lição, acerte o ditado inteiro e todas as perguntas da fofoca." },
      { icon: "🔥", name: "Combo x5", desc: "5 acertos seguidos", got: comboBest >= 5, have: Math.min(comboBest, 5), need: 5, how: "Acerte 5 seguidos sem errar nenhum (lacunas e perguntas contam)." },
      { icon: "⚡", name: "Relâmpago", desc: "5 acertos na rodada bônus", got: bonusBest >= 5, have: Math.min(bonusBest, 5), need: 5, how: "Acerte 5 na rodada bônus ⚡ que aparece no fim da lição." },
      { icon: "📅", name: "3 semanas seguidas", desc: "Fez lição 3 semanas sem parar", got: bestRun >= 3, have: Math.min(bestRun, 3), need: 3, how: "Conclua pelo menos 1 lição por semana, 3 semanas sem pular." },
      { icon: "🏆", name: "5 lições", desc: "Concluiu 5 lições", got: graded.length >= 5, have: Math.min(graded.length, 5), need: 5, how: "Conclua 5 lições." },
      { icon: "⏰", name: "Em dia", desc: "3 lições feitas e nenhuma atrasada", got: graded.length >= 3 && late === 0, have: late === 0 ? Math.min(graded.length, 3) : 0, need: 3, how: late === 0 ? "Conclua 3 lições sem deixar nenhuma atrasada." : "Você tem lição atrasada: recupere ela e depois conclua 3 lições em dia." },
    ],
  };
}

export function starsOf(pct: number): number {
  return pct >= 90 ? 3 : pct >= 60 ? 2 : 1;
}

/** 📊 Status de desempenho (sobe E desce): média das 3 últimas lições + estar em dia. Thiago 26/11 (caso da Carla). */
export type Status = { icon: string; name: string; tone: "fire" | "up" | "ok" | "warn" | "new"; avg: number | null; why: string; next: string };

export const STATUS_TABLE = [
  { icon: "🔥", name: "Em chamas", rule: "média de 85% ou mais nas últimas lições, e nada atrasado" },
  { icon: "🚀", name: "Decolando", rule: "média de 70% a 84%" },
  { icon: "🙂", name: "No ritmo", rule: "média de 50% a 69%" },
  { icon: "⚠️", name: "Precisa acelerar", rule: "média abaixo de 50% ou lição atrasada" },
];

export function statusOf(rows: LessonRow[]): Status {
  const graded = rows.filter((r) => r.graded);
  const late = rows.slice(1).filter((r) => !r.graded);
  if (!graded.length) return { icon: "🌱", name: "Começando", tone: "new", avg: null, why: "Você ainda não concluiu nenhuma lição.", next: "Conclua a sua primeira lição pra ganhar o seu primeiro status." };
  const recent = graded.slice(0, 3);
  const avg = Math.round(recent.reduce((a, r) => a + r.graded!.score.pct, 0) / recent.length);
  const why = `Média ${avg}% ${recent.length > 1 ? "nas suas " + recent.length + " últimas lições" : "na sua última lição"}${late.length ? ` · ${late.length === 1 ? "1 lição atrasada" : late.length + " lições atrasadas"}` : ""}.`;
  if (late.length) return { icon: "⚠️", name: "Precisa acelerar", tone: "warn", avg, why, next: `Recupere a lição atrasada de ${late[late.length - 1].date.slice(8, 10)}/${late[late.length - 1].date.slice(5, 7)} pra voltar a subir.` };
  if (avg >= 85) return { icon: "🔥", name: "Em chamas", tone: "fire", avg, why, next: "Você está no topo! Mantenha 85%+ e as lições em dia pra continuar em chamas." };
  if (avg >= 70) return { icon: "🚀", name: "Decolando", tone: "up", avg, why, next: `Faltam ${85 - avg} pontos de média pra ficar 🔥 Em chamas. Tire 85%+ na próxima lição.` };
  if (avg >= 50) return { icon: "🙂", name: "No ritmo", tone: "ok", avg, why, next: `Faltam ${70 - avg} pontos de média pra 🚀 Decolando. Faça todas as fases (pular fase tira muitos pontos).` };
  return { icon: "⚠️", name: "Precisa acelerar", tone: "warn", avg, why, next: `Faltam ${50 - avg} pontos de média pra 🙂 No ritmo. Faça a lição inteira, sem pular fases, e refaça o que errou nos treinos.` };
}
