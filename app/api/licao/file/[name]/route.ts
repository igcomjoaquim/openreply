import { NextRequest, NextResponse } from "next/server";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { isValidLessonFile, lessonFilePath, lessonFileType } from "@/lib/licao/files";

export const runtime = "nodejs";

type Params = { params: Promise<{ name: string }> };

/** Áudio da lição ou gravação do aluno (nome aleatório). Aceita Range (iPhone). */
export async function GET(request: NextRequest, { params }: Params) {
  const { name } = await params;
  if (!isValidLessonFile(name)) return new NextResponse("Not found", { status: 404 });
  let size: number;
  try {
    const info = await stat(lessonFilePath(name));
    if (!info.isFile()) throw new Error();
    size = info.size;
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
  const headers: Record<string, string> = {
    "Content-Type": lessonFileType(name),
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=86400",
    "X-Robots-Tag": "noindex",
  };
  let start = 0;
  let end = size - 1;
  let status = 200;
  const match = request.headers.get("range")?.match(/^bytes=(\d*)-(\d*)$/);
  if (match && (match[1] || match[2])) {
    if (match[1]) {
      start = Number(match[1]);
      end = match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
    } else {
      start = Math.max(size - Number(match[2]), 0);
    }
    if (start > end || start >= size) {
      return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    }
    status = 206;
    headers["Content-Range"] = `bytes ${start}-${end}/${size}`;
  }
  headers["Content-Length"] = String(end - start + 1);
  const stream = Readable.toWeb(createReadStream(lessonFilePath(name), { start, end })) as unknown as ReadableStream;
  return new NextResponse(stream, { status, headers });
}
