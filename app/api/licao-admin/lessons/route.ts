import { randomBytes } from "node:crypto";
import { stat } from "node:fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/db/client";
import { isAuthorizedServiceRequest } from "@/lib/publishing/media-store";
import { lessonAudioNames, lessonContentSchema, makeSlug } from "@/lib/licao/content";
import { lessonFilePath } from "@/lib/licao/files";
import { lessonPageUrl } from "@/lib/licao/urls";

export const runtime = "nodejs";

const bodySchema = z.object({
  studentName: z.string().min(1),
  /** Link já existente do aluno; sem isso, procura pelo notionId ou cria um. */
  slug: z.string().regex(/^[a-z0-9-]{3,40}$/).optional(),
  notionId: z.string().optional(),
  /** Turma/dupla (ex.: "Turma 1"); cada integrante é publicado como um aluno. */
  group: z.string().min(1).max(60).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  title: z.string().min(1),
  content: lessonContentSchema,
});

/**
 * Lista todas as lições (para conferência da rotina): aluno, link, data e se os
 * áudios da lição existem no volume.
 */
export async function GET(request: NextRequest) {
  if (!isAuthorizedServiceRequest(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const lessons = await getPrisma().lesson.findMany({ include: { student: true }, orderBy: { createdAt: "desc" } });
  const out = [];
  for (const l of lessons) {
    const parsed = lessonContentSchema.safeParse(l.content);
    const raw = l.content as { gossip?: { audio?: string } } | null;
    const gossipAudio = raw?.gossip?.audio ?? null;
    let gossipAudioOk = false;
    if (gossipAudio) {
      try {
        await stat(lessonFilePath(gossipAudio));
        gossipAudioOk = true;
      } catch {
        gossipAudioOk = false;
      }
    }
    out.push({
      id: l.id,
      student: l.student.name,
      slug: l.student.slug,
      date: l.date,
      title: l.title,
      createdAt: l.createdAt,
      valid: parsed.success,
      gossipAudio,
      gossipAudioOk,
      url: `${lessonPageUrl(l.student.slug)}/${l.id}`,
    });
  }
  return NextResponse.json({ lessons: out });
}

/** Publica uma lição nova: ela passa a ser a que o link do aluno abre. */
export async function POST(request: NextRequest) {
  if (!isAuthorizedServiceRequest(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid lesson", issues: parsed.error.issues }, { status: 400 });
  }
  const { studentName, slug, notionId, group, date, title, content } = parsed.data;

  const missing: string[] = [];
  for (const name of lessonAudioNames(content)) {
    try {
      await stat(lessonFilePath(name));
    } catch {
      missing.push(name);
    }
  }
  if (missing.length) {
    return NextResponse.json({ error: "Audio not uploaded", missing }, { status: 400 });
  }

  const prisma = getPrisma();
  let student = slug
    ? await prisma.student.findUnique({ where: { slug } })
    : notionId
      ? await prisma.student.findFirst({ where: { notionId, name: studentName } })
      : null;
  if (slug && !student) {
    return NextResponse.json({ error: "Unknown slug" }, { status: 404 });
  }
  if (!student) {
    student = await prisma.student.create({
      data: { name: studentName, notionId, group, slug: makeSlug(studentName, randomBytes(3).toString("hex")) },
    });
  } else if (student.name !== studentName || (notionId && student.notionId !== notionId) || (group && student.group !== group)) {
    student = await prisma.student.update({
      where: { id: student.id },
      data: { name: studentName, notionId: notionId ?? student.notionId, group: group ?? student.group },
    });
  }

  const lesson = await prisma.lesson.create({
    data: { studentId: student.id, date, title, content },
  });
  return NextResponse.json({ lessonId: lesson.id, slug: student.slug, url: lessonPageUrl(student.slug) });
}
