import { NextRequest, NextResponse } from "next/server";
import { autoResetDemo, isDemoStudent } from "@/lib/licao/demo";
import { getPrisma } from "@/lib/db/client";
import { HTML_HEADERS, dayMonth, page } from "@/lib/licao/html";
import { gradedAttempt } from "@/lib/licao/summary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string; lessonId: string }> };

/**
 * Uma lição. Ainda não feita: o aluno faz (e retoma de onde parou). Já feita:
 * mostra as respostas e o feedback da primeira vez (a que vale nota); com
 * ?refazer=1 o aluno faz de novo só para treinar.
 */
export async function GET(request: NextRequest, { params }: Params) {
  const { slug, lessonId } = await params;
  const prisma = getPrisma();
  const lesson = /^[a-z0-9]{10,40}$/.test(lessonId)
    ? await prisma.lesson.findUnique({ where: { id: lessonId }, include: { student: true } })
    : null;
  if (!lesson || lesson.student.slug !== slug) {
    return new NextResponse(page("Lição", `<div class="wrap"><p class="loading">Lição não encontrada. <a href="/licao/${slug.replace(/[^a-z0-9-]/g, "")}">Voltar para as minhas lições</a></p></div>`), { status: 404, headers: HTML_HEADERS });
  }
  if (isDemoStudent(lesson.student.name)) await autoResetDemo(lesson.studentId);
  const practice = request.nextUrl.searchParams.get("refazer") === "1";
  const graded = practice ? null : await gradedAttempt(lesson.id);
  const prev = await previousMistakes(lesson.studentId, lesson.id, lesson.createdAt);
  const data = {
    slug,
    student: lesson.student.name,
    lessonId: lesson.id,
    date: lesson.date,
    dateLabel: dayMonth(lesson.date),
    title: lesson.title,
    content: lesson.content,
    mode: graded ? "view" : practice ? "practice" : "do",
    preview: request.nextUrl.searchParams.get("professor") === "1",
    view: graded ? { progress: graded.progress, review: graded.review } : null,
    prev,
  };
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  const body = `<div class="wrap" id="app"><p class="loading">Carregando a sua lição…</p></div>
<script id="lesson-data" type="application/json">${json}</script>
<script src="/licao/app.js?v=15"></script>`;
  return new NextResponse(page(`${lesson.title} — ${lesson.student.name}`, body), { headers: HTML_HEADERS });
}

type Fix = { said: string; right: string; why: string };

/**
 * Os erros que o aluno cometeu na lição anterior (respostas que a página marcou
 * + a correção do professor), para a lição nova começar por eles.
 */
async function previousMistakes(studentId: string, lessonId: string, createdAt: Date) {
  const prisma = getPrisma();
  const before = await prisma.lesson.findFirst({
    where: { studentId, id: { not: lessonId }, createdAt: { lt: createdAt } },
    orderBy: { createdAt: "desc" },
    select: { id: true, date: true },
  });
  if (!before) return null;
  const att = await gradedAttempt(before.id);
  if (!att) return null;
  const items: Fix[] = [];
  const add = (w: unknown) => {
    const f = w as Partial<Fix> | null;
    if (f && typeof f.right === "string" && f.right && typeof f.said === "string") {
      items.push({ said: f.said, right: f.right, why: typeof f.why === "string" ? f.why : "" });
    }
  };
  const review = (att.review ?? {}) as { writing?: unknown[]; speaking?: unknown[] };
  [...(review.writing ?? []), ...(review.speaking ?? [])].forEach(add);
  for (const step of Object.values((att.progress ?? {}) as Record<string, { data?: { wrongs?: unknown[] } }>)) {
    // só erros de estrutura (frases que ele falou/escreveu); alternativas e lacunas são da história daquela lição
    (step?.data?.wrongs ?? [])
      .filter((w) => {
        const said = (w as Partial<Fix> | null)?.said ?? "";
        return typeof said === "string" && !/marcou "|^escreveu "|^[^"]{1,60}: "/.test(said);
      })
      .forEach(add);
  }
  const seen = new Set<string>();
  const unique = items.filter((f) => {
    const k = f.right.toLowerCase().replace(/[^a-z' ]/g, "").trim();
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  return unique.length ? { dateLabel: dayMonth(before.date), items: unique.slice(0, 5) } : null;
}
