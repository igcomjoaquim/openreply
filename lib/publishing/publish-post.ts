import { MetaApiError } from "@/lib/meta/client";
import {
  createMediaContainer,
  getContainerStatus,
  getMediaPermalink,
  publishMediaContainer,
} from "@/lib/publishing/graph";
import { mediaKind, mediaUrl } from "@/lib/publishing/media-store";

export type PostType = "REEL" | "IMAGE" | "CAROUSEL";

export interface MediaItem {
  name: string;
  kind: "IMAGE" | "VIDEO";
}

export interface PublishInput {
  type: PostType;
  media: MediaItem[];
  caption: string;
  coverName?: string | null;
  thumbOffsetMs?: number | null;
  shareToFeed?: boolean;
}

export interface PublishResult {
  containerId: string;
  mediaId: string;
  permalink?: string;
}

export interface PublishOptions {
  sleep?: (ms: number) => Promise<void>;
  /** Max wait for one container to finish processing. */
  containerTimeoutMs?: number;
  pollIntervalMs?: number;
  /** Called with the container id before media_publish is attempted. */
  onContainer?: (containerId: string) => Promise<void> | void;
}

/**
 * Thrown once media_publish may have gone through. The post must not be
 * retried automatically, or it could appear twice on the profile.
 */
export class PublishOutcomeUnknownError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PublishOutcomeUnknownError";
  }
}

const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Validates the shape of a post before anything is sent to Meta. */
export function validatePublishInput(input: PublishInput): string | null {
  const { type, media } = input;
  for (const item of media) {
    if (mediaKind(item.name) !== item.kind) {
      return `File ${item.name} is not a ${item.kind}`;
    }
  }
  if (type === "REEL" && (media.length !== 1 || media[0].kind !== "VIDEO")) {
    return "A Reel takes exactly one video";
  }
  if (type === "IMAGE" && (media.length !== 1 || media[0].kind !== "IMAGE")) {
    return "A photo post takes exactly one image";
  }
  if (type === "CAROUSEL" && (media.length < 2 || media.length > 10)) {
    return "A carousel takes 2 to 10 images or videos";
  }
  if (input.coverName && mediaKind(input.coverName) !== "IMAGE") {
    return "The cover must be an image";
  }
  if (input.caption.length > 2200) {
    return "Caption is longer than 2200 characters";
  }
  if ((input.caption.match(/#[\p{L}\p{N}_]+/gu) ?? []).length > 30) {
    return "Caption has more than 30 hashtags";
  }
  if ((input.caption.match(/@[\w.]+/g) ?? []).length > 20) {
    return "Caption has more than 20 @mentions";
  }
  return null;
}

export async function waitForContainer(
  accessToken: string,
  containerId: string,
  options: PublishOptions = {}
): Promise<void> {
  const sleep = options.sleep ?? defaultSleep;
  const interval = options.pollIntervalMs ?? 5_000;
  const timeout = options.containerTimeoutMs ?? 15 * 60_000;
  let waited = 0;

  for (;;) {
    const { status_code, status } = await getContainerStatus(
      accessToken,
      containerId
    );
    if (status_code === "FINISHED") return;
    if (status_code === "ERROR" || status_code === "EXPIRED") {
      throw new Error(
        `Instagram could not process the media (${status_code}: ${status ?? "no details"})`
      );
    }
    if (status_code === "PUBLISHED") {
      throw new PublishOutcomeUnknownError(
        "Container is already published; check the profile"
      );
    }
    if (waited >= timeout) {
      throw new Error(
        `Instagram is still processing the media after ${Math.round(timeout / 60_000)} min`
      );
    }
    await sleep(interval);
    waited += interval;
  }
}

function itemParams(item: MediaItem): Record<string, string> {
  return item.kind === "VIDEO"
    ? { media_type: "VIDEO", video_url: mediaUrl(item.name) }
    : { image_url: mediaUrl(item.name) };
}

/** Builds the container that will be published (children first for carousels). */
async function buildContainer(
  accessToken: string,
  igUserId: string,
  input: PublishInput,
  options: PublishOptions
): Promise<string> {
  if (input.type === "REEL") {
    const params: Record<string, string> = {
      media_type: "REELS",
      video_url: mediaUrl(input.media[0].name),
      caption: input.caption,
      share_to_feed: String(input.shareToFeed ?? true),
    };
    if (input.coverName) params.cover_url = mediaUrl(input.coverName);
    else if (input.thumbOffsetMs != null)
      params.thumb_offset = String(input.thumbOffsetMs);
    return createMediaContainer(accessToken, igUserId, params);
  }

  if (input.type === "IMAGE") {
    return createMediaContainer(accessToken, igUserId, {
      image_url: mediaUrl(input.media[0].name),
      caption: input.caption,
    });
  }

  const children: string[] = [];
  for (const item of input.media) {
    children.push(
      await createMediaContainer(accessToken, igUserId, {
        ...itemParams(item),
        is_carousel_item: "true",
      })
    );
  }
  for (const child of children) {
    await waitForContainer(accessToken, child, options);
  }
  return createMediaContainer(accessToken, igUserId, {
    media_type: "CAROUSEL",
    children: children.join(","),
    caption: input.caption,
  });
}

/**
 * Creates the container(s), waits for Instagram to process them and
 * publishes. Errors raised before media_publish are safe to retry; once
 * media_publish was attempted a non-API failure becomes
 * PublishOutcomeUnknownError.
 */
export async function publishToInstagram(
  accessToken: string,
  igUserId: string,
  input: PublishInput,
  options: PublishOptions = {}
): Promise<PublishResult> {
  const invalid = validatePublishInput(input);
  if (invalid) throw new Error(invalid);

  const containerId = await buildContainer(
    accessToken,
    igUserId,
    input,
    options
  );
  await options.onContainer?.(containerId);
  await waitForContainer(accessToken, containerId, options);

  let mediaId: string;
  try {
    mediaId = await publishMediaContainer(accessToken, igUserId, containerId);
  } catch (error) {
    // An error answer from Meta means nothing was published. Anything else
    // (timeout, dropped connection) leaves the outcome unknown.
    if (error instanceof MetaApiError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    throw new PublishOutcomeUnknownError(
      `No answer from media_publish (${message}); check the profile`
    );
  }

  let permalink: string | undefined;
  try {
    permalink = await getMediaPermalink(accessToken, mediaId);
  } catch {
    // Published anyway; the link is a nicety.
  }

  return { containerId, mediaId, permalink };
}
