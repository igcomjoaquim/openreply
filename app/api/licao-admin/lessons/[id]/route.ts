import { stat } from "node:fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/db/client";
import { isAuthorizedServiceRequest } from "@/lib/publishing/media-store";
import { lessonAudioNames, lessonContentSchema } from "@/lib/licao/content";
import { lessonFilePath } from "@/lib/licao/files";
import { isDemoStudent } from "@/lib/licao/demo";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

const bodySchema = z.object({ title: z.string().min(1).optional(), content: lessonContentSchema });

/**
 * Troca o conteúdo de uma lição já publicada (correção antes do aluno fazer).
 * Recusa se alguém já concluiu a lição, pra não mudar o que valeu nota.
 * Exceção: aluno de demonstração (Aluno Teste) — é o modelo que o professor mostra, sempre atualizado.
 */
export async function PUT(request: NextRequest, { params }: Params) {
  if (!isAuthorizedServiceRequest(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid lesson", issues: parsed.error.issues }, { status: 400 });
  }
  const missing: string[] = [];
  for (const name of lessonAudioNames(parsed.data.content)) {
    try {
      await stat(lessonFilePath(name));
    } catch {
      missing.push(name);
    }
  }
  if (missing.length) return NextResponse.json({ error: "Audio not uploaded", missing }, { status: 400 });
  const prisma = getPrisma();
  const lesson = await prisma.lesson.findUnique({ where: { id }, include: { attempts: { select: { finishedAt: true } }, student: { select: { name: true } } } });
  if (!lesson) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!isDemoStudent(lesson.student.name) && lesson.attempts.some((a) => a.finishedAt)) {
    return NextResponse.json({ error: "Already finished by the student" }, { status: 409 });
  }
  await prisma.lesson.update({
    where: { id },
    data: { content: parsed.data.content, ...(parsed.data.title ? { title: parsed.data.title } : {}) },
  });
  return NextResponse.json({ ok: true });
}
