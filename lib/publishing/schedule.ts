import { stat, rm } from "node:fs/promises";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import {
  isValidMediaName,
  mediaKind,
  mediaPath,
} from "@/lib/publishing/media-store";
import { validatePublishInput } from "@/lib/publishing/publish-post";

export const schedulePostSchema = z.object({
  type: z.enum(["REEL", "IMAGE", "CAROUSEL"]),
  media: z.array(z.string()).min(1).max(10),
  caption: z.string().max(2200).default(""),
  publishAt: z.string().datetime({ offset: true }),
  coverName: z.string().optional(),
  thumbOffsetMs: z.number().int().min(0).optional(),
  shareToFeed: z.boolean().optional(),
  /** Instagram username; optional when only one account is connected. */
  username: z.string().optional(),
});

export type SchedulePostRequest = z.infer<typeof schedulePostSchema>;

export class ScheduleError extends Error {}

async function exists(name: string): Promise<boolean> {
  try {
    return (await stat(mediaPath(name))).isFile();
  } catch {
    return false;
  }
}

export async function createScheduledPost(body: SchedulePostRequest) {
  const names = [...body.media, ...(body.coverName ? [body.coverName] : [])];
  for (const name of names) {
    if (!isValidMediaName(name) || !(await exists(name))) {
      throw new ScheduleError(`Unknown media file: ${name}`);
    }
  }

  const media = body.media.map((name) => ({ name, kind: mediaKind(name) }));
  const invalid = validatePublishInput({
    type: body.type,
    media,
    caption: body.caption,
    coverName: body.coverName,
  });
  if (invalid) throw new ScheduleError(invalid);

  const publishAt = new Date(body.publishAt);
  if (publishAt.getTime() < Date.now() - 60_000) {
    throw new ScheduleError("publishAt is in the past");
  }

  const username = body.username?.replace(/^@/, "").toLowerCase();
  const accounts = await prisma.instagramAccount.findMany({
    where: { provider: "META" },
    select: { id: true, username: true },
  });
  const matching = username
    ? accounts.filter((account) => account.username.toLowerCase() === username)
    : accounts;
  if (matching.length !== 1) {
    throw new ScheduleError(
      username
        ? `Instagram account @${username} is not connected`
        : "Pass username: more than one (or no) Instagram account is connected"
    );
  }

  return prisma.scheduledPost.create({
    data: {
      instagramAccountId: matching[0].id,
      type: body.type,
      media,
      caption: body.caption,
      coverName: body.coverName,
      thumbOffsetMs: body.thumbOffsetMs,
      shareToFeed: body.shareToFeed ?? true,
      publishAt,
    },
  });
}

export async function listScheduledPosts(includeOld: boolean) {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60_000);
  return prisma.scheduledPost.findMany({
    where: includeOld
      ? {}
      : {
          OR: [
            { status: { in: ["PENDING", "PUBLISHING"] } },
            { updatedAt: { gte: since } },
          ],
        },
    orderBy: { publishAt: "asc" },
    include: { instagramAccount: { select: { username: true } } },
  });
}

/** Cancels a post that has not been published, deleting its files. */
export async function cancelScheduledPost(id: string) {
  const post = await prisma.scheduledPost.findUnique({ where: { id } });
  if (!post) throw new ScheduleError("Scheduled post not found");

  const removed = await prisma.scheduledPost.deleteMany({
    where: { id, status: { in: ["PENDING", "FAILED"] } },
  });
  if (removed.count !== 1) {
    throw new ScheduleError(`Cannot cancel a post that is ${post.status}`);
  }

  const media = post.media as unknown as { name: string }[];
  const names = media.map((item) => item.name);
  if (post.coverName) names.push(post.coverName);
  for (const name of names) {
    if (isValidMediaName(name)) await rm(mediaPath(name), { force: true });
  }
  return post;
}
