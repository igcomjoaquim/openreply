import { randomBytes } from "node:crypto";
import path from "node:path";
import { getMediaDir } from "@/lib/publishing/media-store";

/**
 * Áudios das lições (os da lição e as gravações dos alunos) ficam no mesmo
 * volume dos posts, numa pasta própria. Nomes aleatórios, sem listagem.
 */

export const LESSON_AUDIO_TYPES = {
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  mp4: "audio/mp4",
  webm: "audio/webm",
  ogg: "audio/ogg",
} as const;

export type LessonAudioExt = keyof typeof LESSON_AUDIO_TYPES;

const NAME = /^[a-f0-9]{32}\.(mp3|m4a|mp4|webm|ogg)$/;

/** 25 MB: uma gravação de poucos minutos fica bem abaixo disso. */
export const MAX_LESSON_AUDIO_BYTES = 25 * 1024 * 1024;

export function lessonDir(): string {
  return path.join(getMediaDir(), "licao");
}

export function isLessonAudioExt(ext: string): ext is LessonAudioExt {
  return Object.prototype.hasOwnProperty.call(LESSON_AUDIO_TYPES, ext);
}

export function isValidLessonFile(name: string): boolean {
  return NAME.test(name);
}

export function newLessonFile(ext: LessonAudioExt): string {
  return `${randomBytes(16).toString("hex")}.${ext}`;
}

export function lessonFilePath(name: string): string {
  if (!isValidLessonFile(name)) throw new Error("Invalid lesson file name");
  return path.join(lessonDir(), name);
}

export function lessonFileType(name: string): string {
  const ext = name.split(".").pop() as LessonAudioExt;
  return LESSON_AUDIO_TYPES[ext];
}

/** Tipo do navegador (audio/webm;codecs=opus, audio/mp4…) -> extensão. */
export function extFromMime(mime: string): LessonAudioExt | null {
  const base = mime.split(";")[0].trim().toLowerCase();
  if (base === "audio/webm" || base === "video/webm") return "webm";
  if (base === "audio/mp4" || base === "video/mp4" || base === "audio/x-m4a") return "m4a";
  if (base === "audio/ogg") return "ogg";
  if (base === "audio/mpeg") return "mp3";
  return null;
}
