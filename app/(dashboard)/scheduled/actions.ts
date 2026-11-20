"use server";

import { refresh } from "next/cache";
import { prisma } from "@/lib/db/client";
import { getCurrentWorkspaceContext } from "@/lib/workspace-access";
import {
  approveScheduledPost,
  cancelScheduledPost,
  ScheduleError,
} from "@/lib/publishing/schedule";

async function runOnOwnedPost(
  id: string,
  action: (id: string) => Promise<unknown>
): Promise<{ error?: string }> {
  const context = await getCurrentWorkspaceContext();
  if (!context) return { error: "Unauthorized" };

  const owned = await prisma.scheduledPost.findFirst({
    where: { id, instagramAccount: { workspaceId: context.workspaceId } },
    select: { id: true },
  });
  if (!owned) return { error: "Not found" };

  try {
    await action(id);
  } catch (error) {
    if (error instanceof ScheduleError) return { error: error.message };
    throw error;
  }
  refresh();
  return {};
}

export async function cancelScheduledPostAction(id: string) {
  return runOnOwnedPost(id, cancelScheduledPost);
}

export async function approveScheduledPostAction(id: string) {
  return runOnOwnedPost(id, approveScheduledPost);
}
