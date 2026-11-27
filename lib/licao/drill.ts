import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getPrisma } from "@/lib/db/client";
import { STEP_SKILL, type Skill } from "@/lib/licao/summary";
import { spDay } from "@/lib/licao/streak";
import { TIPO_INFO, allTrechos, diffWords, pickNovos, tipoOf, type Tipo, type Trecho } from "@/lib/licao/trechos";

/**
 * 🎯 Treinar meus erros (Thiago 26/11): junta o que o aluno errou em TODAS as lições que já concluiu
 * (frases que a página não entendeu no shadowing, palavras que ele não pegou no ditado, erros das fases
 * e da correção do professor). É OPCIONAL e não mexe em nota nenhuma.
 * Cada erro sai da lista quando ele acerta em 2 dias diferentes (guardado em progress._drill da
 * tentativa que vale a nota: { "<id>": ["AAAA-MM-DD", …] }).
 */

export type DrillItem = {
  id: string;
  lessonId: string;
  date: string;
  /** listen = frase com áudio (ouvir e escrever / ouvir e repetir); fix = erro com a forma certa */
  kind: "listen" | "fix" | "scene";
  skill: Skill;
  en: string;
  pt?: string;
  audio?: string;
  slow?: string;
  said?: string;
  why?: string;
  /** dias em que acertou */
  hits: string[];
  /** 📘 regra do banco de reforço que este erro treina (public/licao/reforco/<rule>.json) */
  rule?: string;
  /** onde ele errou ("🎬 Cena de 24/11") */
  where?: string;
  /** 🎬 erro de cena: o trecho que ele errou + trechos NOVOS (outros vídeos, nível dele, mesma dificuldade) */
  scene?: { yt: string; t: number; end: number; options: string[]; answer: number; context: string; tipo: Tipo; tipoNome: string; dica: string; troca: string };
  novos?: { key: string; yt: string; t: number; end: number; en: string; pt: string; options: string[]; answer: number; context: string; level: string }[];
};

/** 📘 Banco de lições de reforço (Thiago 27/11): uma lição por regra, feita uma vez e usada por todos. */
export type RuleInfo = { id: string; title: string; match: { said: string; right: string } };
export function reforcoIndex(): RuleInfo[] {
  try { return JSON.parse(readFileSync(join(process.cwd(), "public/licao/reforco/index.json"), "utf8")) as RuleInfo[]; } catch { return []; }
}
function ruleOf(said: string | undefined, right: string, rules: RuleInfo[]): string | undefined {
  const sd = (said ?? "").toLowerCase(), rt = right.toLowerCase();
  for (const r of rules) {
    try { if (new RegExp(r.match.said).test(sd) && new RegExp(r.match.right).test(rt)) return r.id; } catch { /* regex ruim no banco */ }
  }
  return undefined;
}

export type Drill = { items: DrillItem[]; total: number; mastered: number; pending: number; doneToday: number };

export const MASTER_DAYS = 2;

type Wrong = { said?: string; right?: string; why?: string };
type StepData = { wrongs?: Wrong[]; missed?: string[]; sentences?: { en: string; pct: number }[] };
type Shadow = { en: string; pt?: string; audio: string; slow: string };

function norm(s: string): string {
  return s.toLowerCase().replace(/[’`´]/g, "'").replace(/[^a-z0-9' ]/g, " ").replace(/\s+/g, " ").trim();
}
function idOf(lessonId: string, text: string): string {
  return createHash("sha1").update(lessonId + "|" + norm(text)).digest("hex").slice(0, 12);
}
/** só frases em inglês curtas (nada de instrução em português na "forma certa") */
function goodEnglish(t: string | undefined): t is string {
  if (!t || !/[a-z]/i.test(t) || /[ãçéêáíóúõâ]|ouça|ouvir|pause/i.test(t)) return false;
  const n = norm(t).split(" ").filter(Boolean).length;
  return n >= 1 && n <= 16;
}

export async function studentDrill(studentId: string, demo = false): Promise<Drill> {
  const lessons = await getPrisma().lesson.findMany({
    where: { studentId },
    orderBy: { createdAt: "desc" },
    include: { attempts: { where: { finishedAt: { not: null } }, orderBy: { finishedAt: "asc" }, take: 1, select: { progress: true, review: true } } },
  });
  const today = spDay();
  const rules = reforcoIndex();
  const items: DrillItem[] = [];
  const seen = new Set<string>();
  for (const l of lessons) {
    const att = l.attempts[0];
    if (!att) continue; // só lições concluídas
    const C = (l.content ?? {}) as { shadowing?: Shadow[] };
    const P = (att.progress ?? {}) as Record<string, { data?: StepData } | unknown> & { _drill?: Record<string, string[]> };
    const hitsOf = (id: string) => (Array.isArray(P._drill?.[id]) ? P._drill![id].filter((d) => typeof d === "string") : []);
    const add = (it: Omit<DrillItem, "id" | "lessonId" | "date" | "hits">) => {
      // fora: resposta de interpretação (cena/fofoca), lacuna de 1 palavra sem a frase, anotação e respostas juntas com "/"
      if (it.kind === "fix") {
        const said = (it.said ?? "").trim();
        if (!said || /^\(|^(cena real|fofoca|marcou|escreveu)\b/i.test(said) || /^\(?(cena|fofoca)/i.test(said)) return;
        if (/\s\/\s/.test(it.en) || norm(it.en).split(" ").length < 3) return;
      }
      const key = norm(it.en);
      if (!key || seen.has(key)) return;
      seen.add(key);
      const id = idOf(l.id, it.en);
      const rule = it.kind === "fix" ? ruleOf(it.said, it.en, rules) : undefined;
      items.push({ ...it, id, lessonId: l.id, date: l.date, hits: hitsOf(id), ...(rule ? { rule } : {}) });
    };
    const shadow = C.shadowing ?? [];
    const data = (k: string) => ((P[k] as { data?: StepData } | undefined)?.data ?? {}) as StepData;

    // 🎤 frases que a página não entendeu bem no shadowing
    const pct: Record<string, number> = {};
    for (const s of data("shadowing").sentences ?? []) pct[norm(s.en)] = s.pct;
    // 🎧 palavras que ele não pegou no ditado/fofoca → frases do shadowing que têm essas palavras
    const missed = new Set([...(data("dictation").missed ?? []), ...(data("gossip").missed ?? [])].map(norm).filter((w) => w.length >= 3));
    for (const s of shadow) {
      const p = pct[norm(s.en)];
      const ws = norm(s.en).split(" ");
      const ear = ws.some((w) => missed.has(w));
      if (typeof p === "number" && p < 80) add({ kind: "listen", skill: "falar", en: s.en, pt: s.pt, audio: s.audio, slow: s.slow });
      else if (ear) add({ kind: "listen", skill: "ouvir", en: s.en, pt: s.pt, audio: s.audio, slow: s.slow });
    }
    // ✍️ erros da correção do professor e das fases
    const review = (att.review ?? {}) as { writing?: Wrong[]; speaking?: Wrong[] };
    for (const w of review.writing ?? []) if (goodEnglish(w.right)) add({ kind: "fix", skill: "escrever", en: w.right, said: w.said, why: w.why });
    for (const w of review.speaking ?? []) if (goodEnglish(w.right)) add({ kind: "fix", skill: "falar", en: w.right, said: w.said, why: w.why });
    for (const k of Object.keys(P)) {
      const ws = data(k).wrongs;
      if (!Array.isArray(ws)) continue;
      const skill: Skill = STEP_SKILL[k] === "ouvir" || STEP_SKILL[k] === "ler" ? "escrever" : STEP_SKILL[k] ?? "escrever";
      for (const w of ws) if (goodEnglish(w.right)) add({ kind: "fix", skill, en: w.right, said: w.said, why: w.why });
    }
  }
  // 🎬 ERROS DE CENA (Thiago 27/11): a parte que ele errou de primeira volta como aquecimento, e a prova é um trecho NOVO
  // de outro vídeo de nativo (do nível dele, mesma dificuldade de som). Só acertar o trecho novo conta.
  type Part = { t: number; end: number; en?: string; pt?: string; options: string[]; answer: number };
  const sceneMiss: { l: (typeof lessons)[number]; p: Part; hits: string[]; id: string }[] = [];
  for (const l of lessons) {
    const sc = (l.content as { scene?: { parts?: Part[] } })?.scene;
    const parts = sc?.parts ?? [];
    if (!parts.length) continue;
    const P = (l.attempts[0]?.progress ?? {}) as { _partes?: { data?: { parts?: { i: number; ok: boolean }[] } }; _drill?: Record<string, string[]> };
    let missed = (P._partes?.data?.parts ?? []).filter((x) => !x.ok).map((x) => x.i);
    if (!l.attempts[0]) missed = [];
    if (demo && !missed.length && !sceneMiss.length && !l.attempts[0]) missed = [0]; // Aluno Teste: mostra um exemplo
    for (const i of missed) {
      const p = parts[i]; if (!p) continue;
      const id = idOf(l.id, "cena@" + p.t);
      sceneMiss.push({ l, p, id, hits: Array.isArray(P._drill?.[id]) ? P._drill![id] : [] });
    }
  }
  if (sceneMiss.length) {
    const bank: Trecho[] = await allTrechos();
    const ownYts = new Set(lessons.map((l) => (l.content as { scene?: { youtubeId?: string } })?.scene?.youtubeId).filter(Boolean) as string[]);
    const level = (lessons[0]?.content as { level?: string })?.level ?? "A2";
    const used = new Set<string>();
    for (const m of sceneMiss) {
      const sc = (m.l.content as { scene: { youtubeId: string; intro?: string } }).scene;
      const tipo = tipoOf(m.p.options, m.p.answer);
      const novos = pickNovos(bank, { tipo, level, ownYts, n: 3, seed: parseInt(m.id.slice(0, 6), 16), not: used });
      novos.forEach((x) => used.add(x.key));
      const [a, b] = diffWords(m.p.options[m.p.answer], m.p.options.find((_, k) => k !== m.p.answer) ?? "");
      items.push({
        id: m.id, lessonId: m.l.id, date: m.l.date, hits: m.hits, kind: "scene", skill: "ouvir",
        en: m.p.en ?? m.p.options[m.p.answer], pt: m.p.pt, where: `🎬 Cena de ${m.l.date.slice(8, 10)}/${m.l.date.slice(5, 7)}`,
        scene: { yt: sc.youtubeId, t: m.p.t, end: m.p.end, options: m.p.options, answer: m.p.answer, context: (sc.intro ?? "").replace(/\s*\/\s*Listen and answer\.?/i, "").replace(/\s*Ouça[^.]*\.?/gi, "").trim(), tipo, tipoNome: TIPO_INFO[tipo].nome, dica: TIPO_INFO[tipo].dica, troca: a.length && b.length ? `${a.join(" ")} × ${b.join(" ")}` : "" },
        novos: novos.map((x) => ({ key: x.key, yt: x.yt, t: x.t, end: x.end, en: x.en, pt: x.pt, options: x.options, answer: x.answer, context: x.context, level: x.level })),
      });
    }
  }
  const mastered = items.filter((i) => new Set(i.hits).size >= MASTER_DAYS).length;
  const pending = items.filter((i) => new Set(i.hits).size < MASTER_DAYS && !i.hits.includes(today)).length;
  const doneToday = items.filter((i) => i.hits.includes(today)).length;
  return { items, total: items.length, mastered, pending, doneToday };
}

/** Guarda um acerto de hoje no erro (na tentativa que vale a nota daquela lição). */
export async function markDrillHit(lessonId: string, itemId: string): Promise<boolean> {
  const prisma = getPrisma();
  const att = await prisma.lessonAttempt.findFirst({ where: { lessonId, finishedAt: { not: null } }, orderBy: { finishedAt: "asc" }, select: { id: true } });
  if (!att) return false;
  const day = JSON.stringify(spDay());
  await prisma.$executeRaw`UPDATE "LessonAttempt" SET "progress" = jsonb_set(
      jsonb_set("progress", '{_drill}', COALESCE("progress"->'_drill', '{}'::jsonb), true),
      ARRAY['_drill', ${itemId}::text],
      CASE WHEN COALESCE("progress"->'_drill'->${itemId}::text, '[]'::jsonb) @> ${day}::jsonb
        THEN COALESCE("progress"->'_drill'->${itemId}::text, '[]'::jsonb)
        ELSE COALESCE("progress"->'_drill'->${itemId}::text, '[]'::jsonb) || ${day}::jsonb END,
      true)
    WHERE "id" = ${att.id}`;
  return true;
}
