import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db/client";
import { attemptForToken } from "@/lib/licao/attempts";
import { extFromMime, newLessonFile } from "@/lib/licao/files";
import { saveBody } from "@/lib/licao/stream";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

/**
 * Gravação do aluno. Corpo = áudio; ?token=&step=&seconds=; a transcrição
 * (o que o navegador entendeu) vai no cabeçalho X-Transcript, em URI encoding.
 */
export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const q = request.nextUrl.searchParams;
  const attempt = await attemptForToken(id, q.get("token"));
  if (!attempt) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const step = q.get("step") ?? "";
  if (!/^[a-z0-9_-]{1,30}$/.test(step)) return NextResponse.json({ error: "Invalid step" }, { status: 400 });
  const ext = extFromMime(request.headers.get("content-type") ?? "");
  if (!ext || !request.body) return NextResponse.json({ error: "Unsupported audio" }, { status: 400 });
  let transcript = "";
  try {
    transcript = decodeURIComponent(request.headers.get("x-transcript") ?? "").slice(0, 5000);
  } catch {
    transcript = "";
  }
  const seconds = Math.max(0, Math.min(3600, Math.round(Number(q.get("seconds")) || 0)));
  const name = newLessonFile(ext);
  try {
    await saveBody(request.body, name);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Upload failed" }, { status: 400 });
  }
  await getPrisma().lessonRecording.create({ data: { attemptId: id, step, fileName: name, transcript, seconds } });
  return NextResponse.json({ ok: true });
}
