import { z } from "zod";

/**
 * Formato da lição que a rotina das aulas publica. A página /licao/<slug>
 * monta tudo a partir disto. Lacunas nos textos: [[resposta|outra forma]].
 */

const key = z.object({
  name: z.string().min(1),
  any: z.array(z.string().min(1)).min(1),
});

const mistake = z.object({
  /** Expressão regular (sem barras) procurada no que o aluno falou/escreveu. */
  match: z.string().min(1),
  said: z.string(),
  right: z.string(),
  why: z.string(),
});

const audio = z.string().regex(/^[a-f0-9]{32}\.(mp3|m4a)$/);

/** Pergunta de entendimento com alternativas (answer = índice da certa). */
const choice = z.object({
  q: z.string().min(1),
  options: z.array(z.string().min(1)).min(2).max(4),
  answer: z.number().int().min(0),
  /** A2+: o aluno escreve; acerta se usar pelo menos 60% dos grupos (cada grupo = sinônimos). */
  keys: z.array(z.array(z.string().min(1)).min(1)).optional(),
  /** Resposta-modelo mostrada depois de conferir (A2+). */
  model: z.string().optional(),
  /** Começo de ajuda (A2): "The problem was that…". */
  starter: z.string().optional(),
});

export const lessonContentSchema = z.object({
  /** Nível da lição: muda como o aluno responde as perguntas de entendimento. */
  level: z.enum(["A1", "A2", "B1", "B2"]).default("A2"),
  intro: z.string().default(""),
  minutes: z.number().int().positive().default(25),
  review: z
    .object({
      items: z.array(z.string().min(1)).min(1),
      keys: z.array(key).min(1),
      mistakes: z.array(mistake).default([]),
      minWords: z.number().int().positive().default(10),
    })
    .optional(),
  dictation: z.object({ audio, text: z.string().min(1) }),
  gossip: z.object({
    audio,
    secret: z.string().min(2),
    /** Entendimento da fofoca (Método: What was the problem? / How did they solve it? …). */
    questions: z.array(choice).max(5).default([]),
  }),
  scene: z
    .object({
      youtubeId: z.string().regex(/^[\w-]{6,20}$/),
      start: z.number().int().min(0),
      end: z.number().int().positive(),
      intro: z.string(),
      /** Entendimento (alternativas) ou palavra exata ("… [[resposta]] …"). */
      questions: z.array(z.union([z.string().min(1), choice])).min(1),
    })
    .optional(),
  shadowing: z
    .array(z.object({ en: z.string().min(1), pt: z.string(), audio, slow: audio }))
    .min(1),
  retell: z.object({
    prompts: z.array(z.string().min(1)).min(1),
    minWords: z.number().int().positive().default(35),
    mistakes: z.array(mistake).default([]),
  }),
  story: z.object({
    intro: z.string(),
    vocab: z.array(z.tuple([z.string(), z.string()])).default([]),
    paragraphs: z.array(z.string().min(1)).min(1),
  }),
  readAloud: z.object({ text: z.string().min(1), minWords: z.number().int().positive().default(25) }),
  writing: z.object({
    intro: z.string(),
    prompts: z.array(z.object({ q: z.string(), hint: z.string().default("") })).min(1),
    keys: z.array(key).default([]),
    minWords: z.number().int().positive().default(15),
    mistakes: z.array(mistake).default([]),
  }),
  realtime: z.object({
    vocab: z.string().default(""),
    pt: z.string().min(1),
    model: z.string().min(1),
    keys: z.array(key).min(1),
    minWords: z.number().int().positive().default(15),
    mistakes: z.array(mistake).default([]),
  }),
});

export type LessonContent = z.infer<typeof lessonContentSchema>;

/** Todos os nomes de áudio que a lição usa (para conferir que existem). */
export function lessonAudioNames(content: LessonContent): string[] {
  return [
    content.dictation.audio,
    content.gossip.audio,
    ...content.shadowing.flatMap((s) => [s.audio, s.slow]),
  ];
}

const GAP = /\[\[([^\]]+)\]\]/g;

/** Respostas aceitas de cada lacuna, na ordem. */
export function gapAnswers(text: string): string[][] {
  return [...text.matchAll(GAP)].map((m) => m[1].split("|").map((s) => s.trim()));
}

/** Slug do link: nome sem acento + sufixo aleatório. */
export function makeSlug(name: string, suffix: string): string {
  const base = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24);
  return `${base || "aluno"}-${suffix}`;
}
