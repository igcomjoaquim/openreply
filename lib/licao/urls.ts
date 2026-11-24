import { getBaseUrl } from "@/lib/env";

function base(): string {
  return (process.env.LICAO_BASE_URL ?? process.env.PUBLIC_MEDIA_BASE_URL ?? getBaseUrl()).replace(/\/$/, "");
}

export function lessonPageUrl(slug: string): string {
  return `${base()}/licao/${slug}`;
}

export function lessonFileUrl(name: string): string {
  return `${base()}/api/licao/file/${name}`;
}
