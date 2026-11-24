import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db/client";
import { isAuthorizedServiceRequest } from "@/lib/publishing/media-store";
import { lessonFileUrl, lessonPageUrl } from "@/lib/licao/urls";

export const runtime = "nodejs";

/**
 * Lições feitas pelos alunos (para a rotina das aulas salvar no Drive/Notion
 * e escrever a correção). ?since=ISO (padrão: últimos 2 dias); ?pending=1 só
 * as que ainda não têm correção.
 */
export async function GET(request: NextRequest) {
  if (!isAuthorizedServiceRequest(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sinceParam = request.nextUrl.searchParams.get("since");
  const since = sinceParam ? new Date(sinceParam) : new Date(Date.now() - 2 * 86400_000);
  if (Number.isNaN(since.getTime())) {
    return NextResponse.json({ error: "Invalid since" }, { status: 400 });
  }
  const pendingOnly = request.nextUrl.searchParams.get("pending") === "1";
  const attempts = await getPrisma().lessonAttempt.findMany({
    where: { updatedAt: { gte: since }, ...(pendingOnly ? { finishedAt: { not: null }, reviewedAt: null } : {}) },
    orderBy: { updatedAt: "desc" },
    take: 100,
    include: {
      lesson: { include: { student: true, attempts: { where: { finishedAt: { not: null } }, select: { id: true, finishedAt: true } } } },
      recordings: { orderBy: { createdAt: "asc" } },
    },
  });
  return NextResponse.json({
    attempts: attempts.map((a) => ({
      id: a.id,
      student: a.lesson.student.name,
      notionId: a.lesson.student.notionId,
      link: lessonPageUrl(a.lesson.student.slug),
      lessonDate: a.lesson.date,
      lessonTitle: a.lesson.title,
      startedAt: a.createdAt,
      updatedAt: a.updatedAt,
      finishedAt: a.finishedAt,
      reviewedAt: a.reviewedAt,
      /** Feita de novo só para treinar (a nota que vale é a primeira terminada). */
      practice: a.lesson.attempts.some((o) => o.id !== a.id && o.finishedAt && (!a.finishedAt || o.finishedAt < a.finishedAt)),
      progress: a.progress,
      recordings: a.recordings.map((r) => ({
        step: r.step,
        transcript: r.transcript,
        seconds: r.seconds,
        url: lessonFileUrl(r.fileName),
        fileName: r.fileName,
      })),
    })),
  });
}
