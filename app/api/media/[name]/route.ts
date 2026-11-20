import { NextRequest, NextResponse } from "next/server";
import { createReadStream } from "node:fs";
import { rm, stat } from "node:fs/promises";
import { Readable } from "node:stream";
import {
  isAuthorizedServiceRequest,
  isValidMediaName,
  mediaContentType,
  mediaPath,
} from "@/lib/publishing/media-store";

export const runtime = "nodejs";

type Params = { params: Promise<{ name: string }> };

async function fileSize(name: string): Promise<number | null> {
  if (!isValidMediaName(name)) return null;
  try {
    const info = await stat(mediaPath(name));
    return info.isFile() ? info.size : null;
  } catch {
    return null;
  }
}

function notFound() {
  return new NextResponse("Not found", { status: 404 });
}

/**
 * Public read of a file waiting to be published — Meta's servers fetch it from
 * here. Supports a single byte range, which video downloaders use.
 */
export async function GET(request: NextRequest, { params }: Params) {
  const { name } = await params;
  const size = await fileSize(name);
  if (size === null) return notFound();

  const headers: Record<string, string> = {
    "Content-Type": mediaContentType(name),
    "Accept-Ranges": "bytes",
    "Cache-Control": "no-store",
    "X-Robots-Tag": "noindex",
  };

  let start = 0;
  let end = size - 1;
  let status = 200;
  const range = request.headers.get("range");
  const match = range?.match(/^bytes=(\d*)-(\d*)$/);
  if (match && (match[1] || match[2])) {
    if (match[1]) {
      start = Number(match[1]);
      end = match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
    } else {
      start = Math.max(size - Number(match[2]), 0);
    }
    if (start > end || start >= size) {
      return new NextResponse(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${size}` },
      });
    }
    status = 206;
    headers["Content-Range"] = `bytes ${start}-${end}/${size}`;
  }
  headers["Content-Length"] = String(end - start + 1);

  const stream = Readable.toWeb(
    createReadStream(mediaPath(name), { start, end })
  ) as unknown as ReadableStream;
  return new NextResponse(stream, { status, headers });
}

export async function HEAD(_request: NextRequest, { params }: Params) {
  const { name } = await params;
  const size = await fileSize(name);
  if (size === null) return notFound();
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Content-Type": mediaContentType(name),
      "Content-Length": String(size),
      "Accept-Ranges": "bytes",
    },
  });
}

/** Called by the worker after publishing, and by cancel. */
export async function DELETE(request: NextRequest, { params }: Params) {
  if (!isAuthorizedServiceRequest(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { name } = await params;
  if (!isValidMediaName(name)) return notFound();
  await rm(mediaPath(name), { force: true });
  return NextResponse.json({ deleted: name });
}
