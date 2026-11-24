import { NextRequest, NextResponse } from "next/server";
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
  const practice = request.nextUrl.searchParams.get("refazer") === "1";
  const graded = practice ? null : await gradedAttempt(lesson.id);
  const data = {
    slug,
    student: lesson.student.name,
    lessonId: lesson.id,
    date: lesson.date,
    dateLabel: dayMonth(lesson.date),
    title: lesson.title,
    content: lesson.content,
    mode: graded ? "view" : practice ? "practice" : "do",
    view: graded ? { progress: graded.progress, review: graded.review } : null,
  };
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  const body = `<div class="wrap" id="app"><p class="loading">Carregando a sua lição…</p></div>
<script id="lesson-data" type="application/json">${json}</script>
<script src="/licao/app.js?v=5"></script>`;
  return new NextResponse(page(`${lesson.title} — ${lesson.student.name}`, body), { headers: HTML_HEADERS });
}
