import { NextRequest, NextResponse } from "next/server";
import { createWriteStream } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as NodeWebReadableStream } from "node:stream/web";
import {
  MAX_MEDIA_BYTES,
  getMediaDir,
  isAuthorizedServiceRequest,
  isMediaExtension,
  mediaPath,
  newMediaName,
} from "@/lib/publishing/media-store";

export const runtime = "nodejs";

/**
 * Upload one file for a scheduled post. The raw file is the request body
 * (streamed to disk, never buffered) and `?ext=` gives its type. Returns the
 * random name used to reference it when scheduling.
 */
export async function POST(request: NextRequest) {
  if (!isAuthorizedServiceRequest(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ext = (request.nextUrl.searchParams.get("ext") ?? "").toLowerCase();
  if (!isMediaExtension(ext)) {
    return NextResponse.json(
      { error: "ext must be jpg, jpeg, mp4 or mov" },
      { status: 400 }
    );
  }
  if (!request.body) {
    return NextResponse.json({ error: "Empty body" }, { status: 400 });
  }

  await mkdir(getMediaDir(), { recursive: true });
  const name = newMediaName(ext);
  const target = mediaPath(name);

  let size = 0;
  const limit = new Transform({
    transform(chunk: Buffer, _enc, callback) {
      size += chunk.length;
      if (size > MAX_MEDIA_BYTES) {
        callback(new Error("File too large"));
        return;
      }
      callback(null, chunk);
    },
  });

  try {
    await pipeline(
      Readable.fromWeb(request.body as unknown as NodeWebReadableStream),
      limit,
      createWriteStream(target)
    );
  } catch (error) {
    await rm(target, { force: true });
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (size === 0) {
    await rm(target, { force: true });
    return NextResponse.json({ error: "Empty body" }, { status: 400 });
  }

  return NextResponse.json({ name, size });
}
