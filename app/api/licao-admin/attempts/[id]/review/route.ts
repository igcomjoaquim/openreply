import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/db/client";
import { isAuthorizedServiceRequest } from "@/lib/publishing/media-store";

export const runtime = "nodejs";

const reviewSchema = z.object({
  /** Texto curto que abre a correção ("Sua escrita está ótima…"). */
  summary: z.string().default(""),
  /** Correção do writing: [{ said, right, why }]. */
  writing: z.array(z.object({ said: z.string(), right: z.string(), why: z.string() })).default([]),
  /** Padrões de pronúncia percebidos nas gravações. */
  pronunciation: z.array(z.object({ title: z.string(), tip: z.string(), words: z.array(z.string()) })).default([]),
  /** Erros de estrutura na fala. */
  speaking: z.array(z.object({ said: z.string(), right: z.string(), why: z.string() })).default([]),
});

type Params = { params: Promise<{ id: string }> };

/** Guarda a correção do professor; o aluno vê ao voltar no link. */
export async function POST(request: NextRequest, { params }: Params) {
  if (!isAuthorizedServiceRequest(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const parsed = reviewSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid review", issues: parsed.error.issues }, { status: 400 });
  }
  const prisma = getPrisma();
  const attempt = await prisma.lessonAttempt.findUnique({ where: { id } });
  if (!attempt) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.lessonAttempt.update({ where: { id }, data: { review: parsed.data, reviewedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
