import { createWriteStream } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as NodeWebReadableStream } from "node:stream/web";
import { MAX_LESSON_AUDIO_BYTES, lessonDir, lessonFilePath } from "./files";

/** Grava o corpo da requisição no volume, com limite de tamanho. */
export async function saveBody(body: ReadableStream<Uint8Array>, name: string): Promise<number> {
  await mkdir(lessonDir(), { recursive: true });
  const target = lessonFilePath(name);
  let size = 0;
  const limit = new Transform({
    transform(chunk: Buffer, _enc, callback) {
      size += chunk.length;
      if (size > MAX_LESSON_AUDIO_BYTES) {
        callback(new Error("File too large"));
        return;
      }
      callback(null, chunk);
    },
  });
  try {
    await pipeline(
      Readable.fromWeb(body as unknown as NodeWebReadableStream),
      limit,
      createWriteStream(target)
    );
  } catch (error) {
    await rm(target, { force: true });
    throw error;
  }
  if (size === 0) {
    await rm(target, { force: true });
    throw new Error("Empty body");
  }
  return size;
}
