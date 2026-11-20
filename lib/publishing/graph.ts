import { handleResponse } from "@/lib/meta/client";

/**
 * Instagram content publishing calls. Login is the unified (Facebook) login,
 * so everything goes to graph.facebook.com with the system user token.
 */
export function publishGraphBase(): string {
  const version = process.env.META_PUBLISH_GRAPH_API_VERSION ?? "v27.0";
  return `https://graph.facebook.com/${version}`;
}

async function post<T>(
  accessToken: string,
  path: string,
  params: Record<string, string>
): Promise<T> {
  const response = await fetch(`${publishGraphBase()}/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Bearer ${accessToken}`,
    },
    body: new URLSearchParams(params).toString(),
  });
  return handleResponse<T>(response);
}

async function get<T>(
  accessToken: string,
  path: string,
  fields: string
): Promise<T> {
  const response = await fetch(
    `${publishGraphBase()}/${path}?fields=${encodeURIComponent(fields)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  return handleResponse<T>(response);
}

export async function createMediaContainer(
  accessToken: string,
  igUserId: string,
  params: Record<string, string>
): Promise<string> {
  const data = await post<{ id: string }>(
    accessToken,
    `${igUserId}/media`,
    params
  );
  return data.id;
}

export interface ContainerStatus {
  status_code?:
    | "EXPIRED"
    | "ERROR"
    | "FINISHED"
    | "IN_PROGRESS"
    | "PUBLISHED";
  status?: string;
}

export async function getContainerStatus(
  accessToken: string,
  containerId: string
): Promise<ContainerStatus> {
  return get<ContainerStatus>(accessToken, containerId, "status_code,status");
}

export async function publishMediaContainer(
  accessToken: string,
  igUserId: string,
  creationId: string
): Promise<string> {
  const data = await post<{ id: string }>(
    accessToken,
    `${igUserId}/media_publish`,
    { creation_id: creationId }
  );
  return data.id;
}

export async function getMediaPermalink(
  accessToken: string,
  mediaId: string
): Promise<string | undefined> {
  const data = await get<{ permalink?: string }>(
    accessToken,
    mediaId,
    "permalink"
  );
  return data.permalink;
}

export interface PublishedMediaPreview {
  media_type?: string;
  media_url?: string;
  thumbnail_url?: string;
  children?: {
    data?: { media_type?: string; media_url?: string; thumbnail_url?: string }[];
  };
}

/** Thumbnails of a published post, for the scheduled posts page. */
export async function getPublishedMediaPreview(
  accessToken: string,
  mediaId: string
): Promise<PublishedMediaPreview> {
  return get<PublishedMediaPreview>(
    accessToken,
    mediaId,
    "media_type,media_url,thumbnail_url,children{media_type,media_url,thumbnail_url}"
  );
}
