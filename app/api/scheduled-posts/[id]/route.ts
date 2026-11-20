import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedServiceRequest } from "@/lib/publishing/media-store";
import {
  ScheduleError,
  approveScheduledPost,
  cancelScheduledPost,
} from "@/lib/publishing/schedule";

export const runtime = "nodejs";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAuthorizedServiceRequest(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  try {
    const post = await cancelScheduledPost(id);
    return NextResponse.json({ canceled: post.id });
  } catch (error) {
    if (error instanceof ScheduleError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}

/** Approves a post so the worker may publish it. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAuthorizedServiceRequest(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  try {
    const post = await approveScheduledPost(id);
    return NextResponse.json({ approved: post.id, approvedAt: post.approvedAt });
  } catch (error) {
    if (error instanceof ScheduleError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
