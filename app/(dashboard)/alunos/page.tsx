import { prisma } from "@/lib/db/client";
import { getCurrentWorkspaceContext } from "@/lib/workspace-access";
import { scoreOf, SKILLS, type Skill } from "@/lib/licao/summary";
import { AutoRefresh } from "../scheduled/client-parts";

export const dynamic = "force-dynamic";

const SKILL_LABEL: Record<Skill, string> = { ouvir: "🎧 Ouvir", falar: "🎤 Falar", ler: "📖 Ler", escrever: "✍️ Escrever" };
const DAY = 86_400_000;

type Row = {
  name: string;
  group: string | null;
  code: string;
  slug: string;
  demo: boolean;
  lessonId: string | null;
  lessonDate: string | null;
  daysSince: number | null;
  state: "done" | "started" | "new" | "none";
  pct: number | null;
  skills: Partial<Record<Skill, number>>;
  focus: { skill: Skill; avg: number } | null;
  waitingReview: number;
  history: number[];
  late: number;
};

function nowMs(): number {
  return Date.now();
}

function dm(date: string): string {
  const [, m, d] = date.split("-");
  return `${Number(d)}/${m}`;
}

/**
 * Painel do professor: todos os alunos numa tela — quem fez a lição mais nova,
 * a nota, a habilidade mais fraca e há quantos dias está sem fazer.
 */
export default async function StudentsPanelPage() {
  const context = await getCurrentWorkspaceContext();
  if (!context) return null;

  const students = await prisma.student.findMany({
    orderBy: { name: "asc" },
    include: {
      lessons: {
        orderBy: { createdAt: "desc" },
        include: { attempts: { select: { progress: true, finishedAt: true, reviewedAt: true, createdAt: true } } },
      },
    },
  });

  const now = nowMs();
  const rows: Row[] = students.map((s) => {
    const graded = s.lessons
      .map((l) => {
        const first = l.attempts.filter((a) => a.finishedAt).sort((a, b) => a.finishedAt!.getTime() - b.finishedAt!.getTime())[0];
        return first ? { lesson: l, score: scoreOf(first.progress), first } : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
    const newest = s.lessons[0] ?? null;
    const newestGraded = newest ? graded.find((g) => g.lesson.id === newest.id) : undefined;
    const started = newest ? newest.attempts.some((a) => Object.keys((a.progress as object) ?? {}).length > 0) : false;
    const recent = graded.slice(0, 3);
    let focus: Row["focus"] = null;
    for (const k of SKILLS) {
      const vals = recent.map((g) => g.score.skills[k]).filter((v): v is number => typeof v === "number");
      if (!vals.length) continue;
      const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
      if (!focus || avg < focus.avg) focus = { skill: k, avg };
    }
    const waitingReview = s.lessons.reduce(
      (n, l) => n + (l.attempts.some((a) => a.finishedAt && !a.reviewedAt) && !l.attempts.some((a) => a.reviewedAt) ? 1 : 0),
      0
    );
    return {
      name: s.name,
      group: s.group,
      code: s.slug.toUpperCase(),
      slug: s.slug,
      demo: /^aluno teste/i.test(s.name.trim()),
      lessonId: newest?.id ?? null,
      lessonDate: newest?.date ?? null,
      daysSince: newest ? Math.floor((now - newest.createdAt.getTime()) / DAY) : null,
      state: !newest ? "none" : newestGraded ? "done" : started ? "started" : "new",
      pct: newestGraded ? newestGraded.score.pct : null,
      skills: newestGraded ? newestGraded.score.skills : {},
      focus,
      waitingReview,
      history: graded.slice(0, 6).map((g) => g.score.pct).reverse(),
      late: s.lessons.slice(1).filter((l) => !l.attempts.some((a) => a.finishedAt)).length,
    };
  });

  const real = rows.filter((r) => !r.demo && r.state !== "none");
  const order = { new: 0, started: 1, done: 2, none: 3 } as const;
  const sorted = [...rows].sort(
    (a, b) =>
      Number(a.demo) - Number(b.demo) ||
      order[a.state] - order[b.state] ||
      (b.daysSince ?? 0) - (a.daysSince ?? 0) ||
      a.name.localeCompare(b.name)
  );
  const done = real.filter((r) => r.state === "done");
  const avg = done.length ? Math.round(done.reduce((a, r) => a + (r.pct ?? 0), 0) / done.length) : null;
  const pending = real.filter((r) => r.state !== "done");
  // Quem lembrar: lição mais nova parada há 2+ dias, ou alguma lição antiga sem fazer
  const remind = real.filter((r) => (r.state !== "done" && (r.daysSince ?? 0) >= 2) || r.late > 0);

  return (
    <div className="space-y-6">
      <AutoRefresh seconds={60} />
      <p className="text-sm text-muted">
        A lição mais nova de cada aluno no site das lições (homework.inglescomjoaquim.com). Quem ainda não fez aparece primeiro.
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Alunos no site" value={String(real.length)} />
        <Stat label="Fizeram a última" value={String(done.length)} tone="success" />
        <Stat label="Ainda não fizeram" value={String(pending.length)} tone={pending.length ? "warning" : undefined} />
        <Stat label="Nota média" value={avg === null ? "—" : `${avg}%`} />
      </div>

      {remind.length > 0 && (
        <div className="space-y-2 rounded-2xl border border-warning/40 bg-warning/5 p-4">
          <p className="text-sm font-semibold">📲 Quem lembrar hoje ({remind.length})</p>
          <p className="text-xs text-muted">
            Toque em &quot;Lembrar&quot;: o WhatsApp abre com a mensagem pronta. Escolha o aluno e envie.
          </p>
          {remind.map((r) => (
            <div key={`rem-${r.slug}`} className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2">
              <span className="text-sm">
                <b>{r.name}</b>{" "}
                <span className="text-muted">· {reason(r)}</span>
              </span>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(reminderText(r))}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
              >
                Lembrar
              </a>
            </div>
          ))}
        </div>
      )}

      {rows.length === 0 ? (
        <p className="text-sm text-muted">Nenhum aluno no site ainda. A rotina cria o aluno na primeira lição.</p>
      ) : (
        <div className="space-y-2">
          {blocks(sorted).map((b) =>
            b.group ? (
              <div key={`g-${b.group}`} className="space-y-2 rounded-2xl border border-border p-3">
                <p className="px-1 text-sm font-semibold">
                  👥 {b.group}{" "}
                  <span className="font-normal text-muted">
                    · {b.rows.filter((r) => r.state === "done").length} de {b.rows.length} fizeram
                  </span>
                </p>
                {b.rows.map((r) => card(r))}
              </div>
            ) : (
              card(b.rows[0])
            )
          )}
        </div>
      )}
    </div>
  );
}

function reason(r: Row): string {
  const parts: string[] = [];
  if (r.state === "new" && (r.daysSince ?? 0) >= 2) parts.push(`não abriu a lição de ${r.lessonDate ? dm(r.lessonDate) : "—"} (${r.daysSince} dias)`);
  if (r.state === "started" && (r.daysSince ?? 0) >= 2) parts.push(`parou no meio da lição de ${r.lessonDate ? dm(r.lessonDate) : "—"}`);
  if (r.late > 0) parts.push(r.late === 1 ? "1 lição atrasada" : `${r.late} lições atrasadas`);
  return parts.join(" · ");
}

function reminderText(r: Row): string {
  const first = r.name.split(" ")[0];
  const date = r.lessonDate ? dm(r.lessonDate) : "";
  const body =
    r.state === "started"
      ? `Vi que você começou a lição de ${date} e parou no meio. Bora terminar? Falta pouco! 💪`
      : r.state === "new"
        ? `A sua lição de ${date} ainda está te esperando 😉 Leva uns 20 minutinhos.`
        : `Você tem ${r.late === 1 ? "1 lição atrasada" : `${r.late} lições atrasadas`} no site. Quando der, recupera lá! 😉`;
  return `Oi, ${first}! ${body}\n\n👉 homework.inglescomjoaquim.com\n🔑 Seu código: ${r.code}\n\nFalou, validou! 🚀`;
}

/** Junta os integrantes de cada turma/dupla num bloco, na posição do primeiro. */
function blocks(rows: Row[]): { group: string | null; rows: Row[] }[] {
  const out: { group: string | null; rows: Row[] }[] = [];
  const seen = new Map<string, { group: string | null; rows: Row[] }>();
  for (const r of rows) {
    if (!r.group) {
      out.push({ group: null, rows: [r] });
      continue;
    }
    const g = seen.get(r.group);
    if (g) g.rows.push(r);
    else {
      const b = { group: r.group, rows: [r] };
      seen.set(r.group, b);
      out.push(b);
    }
  }
  return out;
}

function card(r: Row) {
  return (
            <div
              key={r.slug}
              className={`rounded-xl border p-4 ${
                r.state === "done" ? "border-border bg-surface" : r.state === "none" ? "border-border" : "border-warning/40 bg-warning/5"
              } ${r.demo ? "opacity-70" : ""}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold">
                    {r.name} {r.demo && <span className="ml-1 rounded-full bg-surface-hover px-2 py-0.5 text-xs text-muted">demonstração</span>}
                  </p>
                  <p className="text-xs text-muted">
                    Código {r.code}
                    {r.lessonDate ? ` · lição de ${dm(r.lessonDate)}` : ""}
                    {r.daysSince !== null ? ` · publicada há ${r.daysSince === 0 ? "menos de 1 dia" : `${r.daysSince} dia${r.daysSince > 1 ? "s" : ""}`}` : ""}
                  </p>
                </div>
                <StateBadge state={r.state} pct={r.pct} days={r.daysSince} />
              </div>

              {(r.state === "done" || r.focus || r.history.length > 1) && (
                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
                  {r.state === "done" &&
                    SKILLS.filter((k) => typeof r.skills[k] === "number").map((k) => (
                      <span key={k} className="tabular-nums">
                        {SKILL_LABEL[k]} <b>{r.skills[k]}%</b>
                      </span>
                    ))}
                  {r.focus && (
                    <span className="rounded-full bg-accent/15 px-2 py-0.5 font-semibold text-accent">
                      🎯 foco: {SKILL_LABEL[r.focus.skill]} ({r.focus.avg}%)
                    </span>
                  )}
                  {r.history.length > 1 && <span className="text-muted tabular-nums">últimas notas: {r.history.map((p) => `${p}%`).join(" → ")}</span>}
                  {r.waitingReview > 0 && !r.demo && <span className="text-warning">✍️ correção da rotina pendente</span>}
                </div>
              )}

              <div className="mt-3 flex flex-wrap gap-3 text-xs">
                <a href={`/alunos/${r.slug}`} className="rounded-lg bg-accent px-3 py-1.5 font-semibold text-white hover:opacity-90">
                  🎧 Ver todas as respostas e áudios
                </a>
                <a href={`/licao/${r.slug}?professor=1`} target="_blank" rel="noopener noreferrer" className="font-semibold text-accent hover:underline">
                  Ver como o aluno vê →
                </a>
                {r.state === "done" && r.lessonId && (
                  <a href={`/licao/${r.slug}/${r.lessonId}?professor=1`} target="_blank" rel="noopener noreferrer" className="font-semibold text-accent hover:underline">
                    Ver respostas e feedback →
                  </a>
                )}
              </div>
            </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "success" | "warning" }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : ""}`}>
        {value}
      </p>
    </div>
  );
}

function StateBadge({ state, pct, days }: { state: Row["state"]; pct: number | null; days: number | null }) {
  const late = days !== null && days >= 3;
  const map = {
    done: { text: `✅ Fez · ${pct ?? 0}%`, cls: "bg-success/15 text-success" },
    started: { text: late ? `⏳ Parou no meio · ${days} dias` : "⏳ Começou", cls: "bg-warning/15 text-warning" },
    new: { text: late ? `❌ Não fez · ${days} dias` : "🆕 Ainda não abriu", cls: late ? "bg-error/15 text-error" : "bg-warning/15 text-warning" },
    none: { text: "Sem lição ainda", cls: "bg-surface-hover text-muted" },
  } as const;
  const m = map[state];
  return <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${m.cls}`}>{m.text}</span>;
}
