import Link from "next/link";
import { prisma } from "@/lib/db/client";
import { getCurrentWorkspaceContext } from "@/lib/workspace-access";
import { scoreOf } from "@/lib/licao/summary";

export const dynamic = "force-dynamic";

/** Ordem e nome de cada parte da lição (igual ao site das lições). */
const STEPS: [string, string][] = [
  ["review", "0 · Revisão relâmpago"],
  ["dictation", "1 · Ditado"],
  ["scene", "2 · Cena real"],
  ["gossip", "3 · Fofoca — só ouvir"],
  ["shadowing", "4 · Shadowing"],
  ["retell", "5 · Reconto da fofoca"],
  ["story", "6 · Fofoca escrita (lacunas)"],
  ["read", "7 · Leitura em voz alta"],
  ["writing", "8 · Writing"],
  ["realtime", "9 · Real Time"],
];
const HIDDEN = new Set(["done", "combo", "_days", "bonus"]);

type Wrong = { said?: string; right?: string; why?: string };
type StepData = {
  answer?: string;
  text?: string;
  transcript?: string;
  answers?: string[];
  sentences?: { en: string; pct: number }[];
  wrongs?: Wrong[];
  missed?: string[];
  skipped?: boolean;
};
type Entry = { score?: number; max?: number; data?: StepData };
type Review = {
  summary?: string;
  writing?: Wrong[];
  speaking?: Wrong[];
  pronunciation?: { title?: string; tip?: string; words?: string[] }[];
};

function dm(date: string): string {
  const [, m, d] = date.split("-");
  return `${Number(d)}/${m}`;
}
function when(d: Date): string {
  return d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}
function fileUrl(name: string): string {
  return `/api/licao/file/${encodeURIComponent(name)}`;
}

/**
 * Painel do professor: TODAS as respostas de um aluno, lição por lição —
 * o que escreveu, o que o site entendeu da fala, os erros e as gravações (pra ouvir e mostrar na aula).
 */
export default async function StudentAnswersPage({ params }: { params: Promise<{ slug: string }> }) {
  const context = await getCurrentWorkspaceContext();
  if (!context) return null;
  const { slug } = await params;

  const student = await prisma.student.findUnique({
    where: { slug },
    include: {
      lessons: {
        orderBy: { createdAt: "desc" },
        include: { attempts: { orderBy: { createdAt: "asc" }, include: { recordings: { orderBy: { createdAt: "asc" } } } } },
      },
    },
  });
  if (!student) {
    return (
      <div className="space-y-3">
        <Link href="/alunos" className="text-sm text-accent hover:underline">← Voltar pros alunos</Link>
        <p className="text-sm text-muted">Aluno não encontrado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link href="/alunos" className="text-sm text-accent hover:underline">← Voltar pros alunos</Link>
        <h1 className="text-xl font-semibold">🎧 Respostas de {student.name}</h1>
        <p className="text-sm text-muted">
          Código {student.slug.toUpperCase()} · tudo o que o aluno mandou em cada lição: o que escreveu, o que o site entendeu da fala, os
          erros e as gravações (toque ▶ pra ouvir — dá pra mostrar na aula).
        </p>
      </div>

      {student.lessons.length === 0 && <p className="text-sm text-muted">Nenhuma lição ainda.</p>}

      {student.lessons.map((lesson) => {
        const attempts = lesson.attempts.filter((a) => Object.keys((a.progress as object) ?? {}).length > 0 || a.recordings.length > 0);
        const firstDone = lesson.attempts.filter((a) => a.finishedAt).sort((a, b) => a.finishedAt!.getTime() - b.finishedAt!.getTime())[0];
        return (
          <section key={lesson.id} className="space-y-3 rounded-2xl border border-border p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-semibold">
                {lesson.title} <span className="text-sm font-normal text-muted">· aula de {dm(lesson.date)}</span>
              </h2>
              <a href={`/licao/${student.slug}/${lesson.id}?professor=1`} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-accent hover:underline">
                Abrir a lição →
              </a>
            </div>
            {attempts.length === 0 && <p className="text-sm text-muted">Ainda não começou esta lição.</p>}
            {attempts.map((a) => {
              const progress = (a.progress ?? {}) as Record<string, Entry>;
              const review = (a.review ?? null) as Review | null;
              const score = a.finishedAt ? scoreOf(a.progress) : null;
              const label = a.finishedAt ? (firstDone && a.id === firstDone.id ? "✅ Concluída (vale a nota)" : "🔁 Refez pra treinar") : "⏳ Em andamento";
              const extraKeys = Object.keys(progress).filter((k) => !HIDDEN.has(k) && !STEPS.some(([s]) => s === k));
              return (
                <div key={a.id} className="space-y-3 rounded-xl border border-border bg-surface p-3">
                  <p className="text-sm">
                    <b>{label}</b>
                    <span className="text-muted">
                      {" "}· começou {when(a.createdAt)}
                      {a.finishedAt ? ` · concluiu ${when(a.finishedAt)}` : ""}
                      {score ? ` · nota ${score.pct}%` : ""}
                    </span>
                  </p>

                  {review?.summary && (
                    <div className="rounded-lg bg-accent/10 p-3 text-sm">
                      <b>📝 Correção enviada ao aluno:</b> {review.summary}
                    </div>
                  )}

                  {STEPS.map(([key, name]) => {
                    const e = progress[key];
                    const recs = a.recordings.filter((r) => r.step === key);
                    if (!e && !recs.length) return null;
                    const d = e?.data ?? {};
                    const said = d.answer ?? d.text;
                    return (
                      <div key={key} className="space-y-1.5 border-t border-border pt-2 text-sm">
                        <p className="font-semibold">
                          {name}{" "}
                          {e && typeof e.score === "number" && (
                            <span className="font-normal text-muted tabular-nums">· {e.score}/{e.max ?? "?"} pts</span>
                          )}
                          {d.skipped && <span className="ml-1 text-warning">· pulou</span>}
                        </p>
                        {said && <p>✍️ <span className="text-muted">Escreveu:</span> {said}</p>}
                        {d.answers && d.answers.length > 0 && (
                          <p>✍️ <span className="text-muted">Lacunas:</span> {d.answers.map((x, i) => `${i + 1}) ${x}`).join(" · ")}</p>
                        )}
                        {typeof d.transcript === "string" && d.transcript && (
                          <p>🎤 <span className="text-muted">O site entendeu:</span> “{d.transcript}”</p>
                        )}
                        {d.sentences && (
                          <ul className="list-inside list-disc text-xs">
                            {d.sentences.map((s, i) => (
                              <li key={i}>{s.en} — <b>{s.pct}%</b></li>
                            ))}
                          </ul>
                        )}
                        {d.missed && d.missed.length > 0 && <p className="text-xs text-muted">Faltou ler/entender: {d.missed.join(", ")}</p>}
                        {d.wrongs && d.wrongs.length > 0 && (
                          <ul className="space-y-0.5 text-xs">
                            {d.wrongs.map((w, i) => (
                              <li key={i}>
                                ❌ <span className="line-through opacity-80">{w.said}</span>
                                {w.right ? <> → ✅ <b>{w.right}</b></> : null}
                                {w.why ? <span className="text-muted"> · {w.why}</span> : null}
                              </li>
                            ))}
                          </ul>
                        )}
                        {recs.map((r) => (
                          <div key={r.id} className="space-y-1 rounded-lg bg-surface-hover p-2">
                            <audio controls preload="none" src={fileUrl(r.fileName)} className="h-9 w-full" />
                            <p className="text-xs text-muted">
                              🎙️ {r.seconds}s · {when(r.createdAt)}
                              {r.transcript ? ` · “${r.transcript}”` : " · (sem texto: ouça o áudio)"}
                            </p>
                          </div>
                        ))}
                      </div>
                    );
                  })}

                  {extraKeys.length > 0 && (
                    <div className="border-t border-border pt-2 text-xs text-muted">
                      ➕ Também fez: {extraKeys.map((k) => `${k} (${progress[k]?.score ?? 0}/${progress[k]?.max ?? 0})`).join(" · ")}
                    </div>
                  )}

                  {review && ((review.writing?.length ?? 0) + (review.speaking?.length ?? 0) > 0) && (
                    <div className="space-y-0.5 border-t border-border pt-2 text-xs">
                      <p className="font-semibold">📝 Erros que a correção apontou</p>
                      {[...(review.writing ?? []), ...(review.speaking ?? [])].map((w, i) => (
                        <p key={i}>
                          ❌ <span className="line-through opacity-80">{w.said}</span> → ✅ <b>{w.right}</b>
                          {w.why ? <span className="text-muted"> · {w.why}</span> : null}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
