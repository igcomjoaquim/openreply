import { prisma } from "@/lib/db/client";
import { decryptToken } from "@/lib/meta/oauth";
import { getBaseUrl } from "@/lib/env";
import {
  PublishOutcomeUnknownError,
  publishToInstagram,
  type MediaItem,
  type PublishOptions,
} from "@/lib/publishing/publish-post";

export const MAX_ATTEMPTS = 3;
export const RETRY_DELAY_MS = 5 * 60_000;
/** A post still PUBLISHING after this long was cut off (worker restart). */
export const STUCK_AFTER_MS = 60 * 60_000;

export interface SchedulerResult {
  published: number;
  failed: number;
  retried: number;
  stuck: number;
}

function errorMessage(error: unknown): string {
  return (error instanceof Error ? error.message : String(error)).slice(0, 1000);
}

/** Removes published files from the web service's volume (best effort). */
export async function deleteHostedMedia(names: string[]): Promise<void> {
  const secret = process.env.CRON_SECRET || process.env.NEXTAUTH_SECRET;
  const base = getBaseUrl().replace(/\/$/, "");
  for (const name of names) {
    try {
      await fetch(`${base}/api/media/${name}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${secret}` },
      });
    } catch (error) {
      console.error("[Publisher] Could not delete media file:", errorMessage(error));
    }
  }
}

/**
 * Publishes every scheduled post whose time has come. Each post is claimed
 * (PENDING -> PUBLISHING) with a conditional update first, so two workers or
 * two overlapping ticks can never publish the same post twice.
 */
export async function runScheduledPosts(
  now: Date = new Date(),
  options: PublishOptions = {}
): Promise<SchedulerResult> {
  const result: SchedulerResult = { published: 0, failed: 0, retried: 0, stuck: 0 };

  const stuck = await prisma.scheduledPost.updateMany({
    where: {
      status: "PUBLISHING",
      publishingStartedAt: { lt: new Date(now.getTime() - STUCK_AFTER_MS) },
    },
    data: {
      status: "FAILED",
      error:
        "Publishing was interrupted (worker restarted). Check the profile before scheduling again.",
    },
  });
  result.stuck = stuck.count;

  const due = await prisma.scheduledPost.findMany({
    where: { status: "PENDING", approvedAt: { not: null }, publishAt: { lte: now } },
    orderBy: { publishAt: "asc" },
    take: 10,
    include: { instagramAccount: true },
  });

  for (const post of due) {
    const claim = await prisma.scheduledPost.updateMany({
      where: { id: post.id, status: "PENDING", approvedAt: { not: null } },
      data: {
        status: "PUBLISHING",
        publishingStartedAt: new Date(),
        attempts: { increment: 1 },
        error: null,
      },
    });
    if (claim.count !== 1) continue;

    const attempt = post.attempts + 1;
    const media = post.media as unknown as MediaItem[];

    try {
      if (post.instagramAccount.provider !== "META") {
        throw new PublishOutcomeUnknownError(
          "Only accounts connected directly through Meta can publish"
        );
      }
      const token = decryptToken(post.instagramAccount.accessToken);
      const published = await publishToInstagram(
        token,
        post.instagramAccount.instagramId,
        {
          type: post.type,
          media,
          caption: post.caption,
          coverName: post.coverName,
          thumbOffsetMs: post.thumbOffsetMs,
          shareToFeed: post.shareToFeed,
        },
        {
          ...options,
          onContainer: async (containerId) => {
            await prisma.scheduledPost.update({
              where: { id: post.id },
              data: { containerId },
            });
          },
        }
      );

      await prisma.scheduledPost.update({
        where: { id: post.id },
        data: {
          status: "PUBLISHED",
          mediaId: published.mediaId,
          permalink: published.permalink ?? null,
          containerId: published.containerId,
          publishedAt: new Date(),
        },
      });
      result.published++;
      console.log(
        `[Publisher] Published ${post.type} ${post.id} -> ${published.permalink ?? published.mediaId}`
      );

      const files = media.map((item) => item.name);
      if (post.coverName) files.push(post.coverName);
      await deleteHostedMedia(files);
    } catch (error) {
      const message = errorMessage(error);
      const retry =
        !(error instanceof PublishOutcomeUnknownError) && attempt < MAX_ATTEMPTS;

      await prisma.scheduledPost.update({
        where: { id: post.id },
        data: retry
          ? {
              status: "PENDING",
              publishAt: new Date(Date.now() + RETRY_DELAY_MS),
              error: `Attempt ${attempt} failed: ${message}`,
            }
          : { status: "FAILED", error: message },
      });
      if (retry) result.retried++;
      else result.failed++;
      console.error(
        `[Publisher] ${retry ? "Will retry" : "Failed"} ${post.id}: ${message}`
      );
    }
  }

  return result;
}
