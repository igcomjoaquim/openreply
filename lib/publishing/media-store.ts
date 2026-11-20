import { randomBytes } from "node:crypto";
import path from "node:path";
import { getBaseUrl } from "@/lib/env";

/**
 * Files waiting to be published live on the web service's disk (a Railway
 * volume mounted at MEDIA_DIR). Meta downloads them by public URL, so each file
 * gets an unguessable random name; there is no listing route.
 */

export const MEDIA_EXTENSIONS = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  mp4: "video/mp4",
  mov: "video/quicktime",
} as const;

export type MediaExtension = keyof typeof MEDIA_EXTENSIONS;

const NAME_PATTERN = /^[a-f0-9]{32}\.(jpg|jpeg|mp4|mov)$/;

/** 1 GB: Instagram's own ceiling for Reels. */
export const MAX_MEDIA_BYTES = 1024 * 1024 * 1024;

export function getMediaDir(): string {
  return process.env.MEDIA_DIR ?? path.join(process.cwd(), ".media");
}

export function isValidMediaName(name: string): boolean {
  return NAME_PATTERN.test(name);
}

export function isMediaExtension(ext: string): ext is MediaExtension {
  return Object.prototype.hasOwnProperty.call(MEDIA_EXTENSIONS, ext);
}

export function newMediaName(ext: MediaExtension): string {
  return `${randomBytes(16).toString("hex")}.${ext}`;
}

export function mediaPath(name: string): string {
  if (!isValidMediaName(name)) throw new Error("Invalid media name");
  return path.join(getMediaDir(), name);
}

export function mediaContentType(name: string): string {
  const ext = name.split(".").pop() as MediaExtension;
  return MEDIA_EXTENSIONS[ext];
}

export function mediaKind(name: string): "IMAGE" | "VIDEO" {
  return mediaContentType(name).startsWith("video/") ? "VIDEO" : "IMAGE";
}

/** Public URL Meta fetches. PUBLIC_MEDIA_BASE_URL overrides the app URL. */
export function mediaUrl(name: string): string {
  const base = (process.env.PUBLIC_MEDIA_BASE_URL ?? getBaseUrl()).replace(
    /\/$/,
    ""
  );
  return `${base}/api/media/${name}`;
}

/** Same secret the cron routes use. */
export function isAuthorizedServiceRequest(header: string | null): boolean {
  const secret = process.env.CRON_SECRET || process.env.NEXTAUTH_SECRET;
  return Boolean(secret) && header === `Bearer ${secret}`;
}
