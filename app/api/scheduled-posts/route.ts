import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedServiceRequest } from "@/lib/publishing/media-store";
import {
  ScheduleError,
  createScheduledPost,
  listScheduledPosts,
  schedulePostSchema,
} from "@/lib/publishing/schedule";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET(request: NextRequest) {
  if (!isAuthorizedServiceRequest(request.headers.get("authorization"))) {
    return unauthorized();
  }
  const all = request.nextUrl.searchParams.get("all") === "1";
  return NextResponse.json({ posts: await listScheduledPosts(all) });
}

export async function POST(request: NextRequest) {
  if (!isAuthorizedServiceRequest(request.headers.get("authorization"))) {
    return unauthorized();
  }
  const parsed = schedulePostSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ") },
      { status: 400 }
    );
  }
  try {
    const post = await createScheduledPost(parsed.data);
    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    if (error instanceof ScheduleError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
