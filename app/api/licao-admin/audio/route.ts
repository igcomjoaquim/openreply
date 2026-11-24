import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedServiceRequest } from "@/lib/publishing/media-store";
import { isLessonAudioExt, newLessonFile } from "@/lib/licao/files";
import { saveBody } from "@/lib/licao/stream";

export const runtime = "nodejs";

/** Sobe um áudio da lição (corpo = arquivo, ?ext=mp3|m4a). Devolve o nome. */
export async function POST(request: NextRequest) {
  if (!isAuthorizedServiceRequest(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const ext = (request.nextUrl.searchParams.get("ext") ?? "").toLowerCase();
  if (ext !== "mp3" && ext !== "m4a") {
    return NextResponse.json({ error: "ext must be mp3 or m4a" }, { status: 400 });
  }
  if (!request.body || !isLessonAudioExt(ext)) {
    return NextResponse.json({ error: "Empty body" }, { status: 400 });
  }
  const name = newLessonFile(ext);
  try {
    const size = await saveBody(request.body, name);
    return NextResponse.json({ name, size });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Upload failed" }, { status: 400 });
  }
}
