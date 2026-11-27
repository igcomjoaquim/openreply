import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getPrisma } from "@/lib/db/client";

/**
 * 🎬 Banco de trechos de nativos (Thiago 27/11): toda parte de cena (scene.parts) de TODAS as lições de
 * todos os alunos vira um trecho de até ~7 s, marcado com o NÍVEL da lição e o TIPO DE DIFICULDADE de som.
 * Quando o aluno erra uma parte da cena, ele volta nela (aquecimento) e depois recebe trechos NOVOS
 * (de outros vídeos, do nível dele, com a mesma dificuldade) — só acertar um trecho novo conta como corrigido.
 * Cada lição nova de qualquer aluno alimenta o banco sozinha; a rotina semanal completa os tipos que faltam.
 */

import { TIPO_INFO, diffWords, tipoOf, type Tipo } from "@/lib/licao/tipos";
export { TIPO_INFO, diffWords, tipoOf, type Tipo };

export type Trecho = {
  key: string;
  yt: string;
  t: number;
  end: number;
  en: string;
  pt: string;
  options: string[];
  answer: number;
  level: string;
  tipo: Tipo;
  context: string;
  lessonId: string;
  studentId: string;
};

const ORDER: Record<string, number> = { A1: 1, A2: 2, B1: 3, B2: 4 };
export const levelRank = (l: string | undefined) => ORDER[l ?? "A2"] ?? 2;

type Part = { t: number; end: number; en?: string; pt?: string; options: string[]; answer: number };

/** Todos os trechos do banco (partes de cena de todas as lições). */
export async function allTrechos(): Promise<Trecho[]> {
  const lessons = await getPrisma().lesson.findMany({ select: { id: true, studentId: true, content: true } });
  const out: Trecho[] = [];
  const seen = new Set<string>();
  for (const l of lessons) {
    const c = (l.content ?? {}) as { level?: string; scene?: { youtubeId?: string; intro?: string; parts?: Part[] } };
    const sc = c.scene;
    if (!sc?.youtubeId || !Array.isArray(sc.parts)) continue;
    for (const p of sc.parts) {
      const key = `${sc.youtubeId}@${p.t}`;
      if (seen.has(key) || !Array.isArray(p.options)) continue;
      seen.add(key);
      out.push({
        key, yt: sc.youtubeId, t: p.t, end: p.end, en: p.en ?? p.options[p.answer], pt: p.pt ?? "",
        options: p.options, answer: p.answer, level: c.level ?? "A2", tipo: tipoOf(p.options, p.answer),
        context: (sc.intro ?? "").replace(/\s*\/\s*Listen and answer\.?/i, "").replace(/\s*Ouça[^.]*\.?/gi, "").replace(/Ouça sem olhar a tela e responda\.?/i, "").trim(),
        lessonId: l.id, studentId: l.studentId,
      });
    }
  }
  // + trechos que a rotina semanal achou (public/licao/trechos-extra.json: [{yt,t,end,en,pt,options,answer,level,context}])
  try {
    const extra = JSON.parse(readFileSync(join(process.cwd(), "public/licao/trechos-extra.json"), "utf8")) as (Part & { yt: string; level?: string; context?: string })[];
    for (const p of extra) {
      const key = `${p.yt}@${p.t}`;
      if (seen.has(key) || !Array.isArray(p.options)) continue;
      seen.add(key);
      out.push({ key, yt: p.yt, t: p.t, end: p.end, en: p.en ?? p.options[p.answer], pt: p.pt ?? "", options: p.options, answer: p.answer, level: p.level ?? "A2", tipo: tipoOf(p.options, p.answer), context: p.context ?? "", lessonId: "", studentId: "" });
    }
  } catch { /* ainda não tem */ }
  return out;
}

/** Trechos NOVOS pro aluno: outro vídeo (nenhum das lições dele), nível dele ou mais fácil, mesma dificuldade se der. */
export function pickNovos(bank: Trecho[], opts: { tipo: Tipo; level: string; ownYts: Set<string>; n: number; seed: number; not?: Set<string> }): Trecho[] {
  const lv = levelRank(opts.level);
  const ok = bank.filter((x) => !opts.ownYts.has(x.yt) && levelRank(x.level) <= lv && !(opts.not?.has(x.key)));
  const score = (x: Trecho) => (x.tipo === opts.tipo ? 0 : 10) + (lv - levelRank(x.level)); // mesmo tipo e mesmo nível primeiro
  let s = opts.seed;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const ranked = ok.map((x) => ({ x, k: score(x) + rnd() })).sort((a, b) => a.k - b.k).map((r) => r.x);
  const pick: Trecho[] = [], yts = new Set<string>();
  for (const x of ranked) { if (yts.has(x.yt)) continue; pick.push(x); yts.add(x.yt); if (pick.length >= opts.n) break; } // vídeos diferentes
  return pick;
}
