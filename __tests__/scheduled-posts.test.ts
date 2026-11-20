import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma, mockPublish, mockDecrypt } = vi.hoisted(() => ({
  mockPrisma: {
    scheduledPost: {
      updateMany: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
  mockPublish: vi.fn(),
  mockDecrypt: vi.fn(() => "plain-token"),
}));

vi.mock("@/lib/db/client", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/meta/oauth", () => ({ decryptToken: mockDecrypt }));
vi.mock("@/lib/publishing/publish-post", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/publishing/publish-post")>()),
  publishToInstagram: mockPublish,
}));

import { runScheduledPosts, MAX_ATTEMPTS } from "@/lib/publishing/scheduler";
import { PublishOutcomeUnknownError } from "@/lib/publishing/publish-post";

const VID = "c".repeat(32) + ".mp4";

function duePost(overrides: Record<string, unknown> = {}) {
  return {
    id: "p1",
    type: "REEL",
    media: [{ name: VID, kind: "VIDEO" }],
    caption: "Oi",
    coverName: null,
    thumbOffsetMs: null,
    shareToFeed: true,
    attempts: 0,
    instagramAccount: { provider: "META", accessToken: "enc", instagramId: "123" },
    ...overrides,
  };
}

const fetchMock = vi.fn(async () => new Response("{}"));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", fetchMock);
  process.env.NEXTAUTH_URL = "https://app.example.com";
  process.env.CRON_SECRET = "s3cret";
  mockPrisma.scheduledPost.updateMany.mockResolvedValue({ count: 1 });
  mockPrisma.scheduledPost.update.mockResolvedValue({});
});

describe("runScheduledPosts", () => {
  it("claims, publishes, records the result and deletes the hosted file", async () => {
    mockPrisma.scheduledPost.findMany.mockResolvedValue([duePost()]);
    mockPublish.mockResolvedValue({ containerId: "C", mediaId: "M", permalink: "https://ig/x" });

    const result = await runScheduledPosts(new Date("2026-11-20T21:30:00Z"));

    expect(result.published).toBe(1);
    // Claim is conditional on PENDING so a second worker cannot take it.
    expect(mockPrisma.scheduledPost.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "p1", status: "PENDING" },
        data: expect.objectContaining({ status: "PUBLISHING" }),
      })
    );
    expect(mockPublish).toHaveBeenCalledWith(
      "plain-token",
      "123",
      expect.objectContaining({ type: "REEL", caption: "Oi" }),
      expect.any(Object)
    );
    expect(mockPrisma.scheduledPost.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "PUBLISHED", mediaId: "M", permalink: "https://ig/x" }),
      })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      `https://app.example.com/api/media/${VID}`,
      expect.objectContaining({ method: "DELETE", headers: { Authorization: "Bearer s3cret" } })
    );
  });

  it("skips a post another worker already claimed", async () => {
    mockPrisma.scheduledPost.findMany.mockResolvedValue([duePost()]);
    mockPrisma.scheduledPost.updateMany
      .mockResolvedValueOnce({ count: 0 }) // stuck sweep
      .mockResolvedValueOnce({ count: 0 }); // claim lost
    await runScheduledPosts();
    expect(mockPublish).not.toHaveBeenCalled();
  });

  it("puts a failed post back in the queue while attempts remain", async () => {
    mockPrisma.scheduledPost.findMany.mockResolvedValue([duePost({ attempts: 0 })]);
    mockPublish.mockRejectedValue(new Error("rate limited"));
    const result = await runScheduledPosts();
    expect(result.retried).toBe(1);
    expect(mockPrisma.scheduledPost.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "PENDING" }) })
    );
  });

  it("marks FAILED after the last attempt", async () => {
    mockPrisma.scheduledPost.findMany.mockResolvedValue([duePost({ attempts: MAX_ATTEMPTS - 1 })]);
    mockPublish.mockRejectedValue(new Error("still broken"));
    const result = await runScheduledPosts();
    expect(result.failed).toBe(1);
    expect(mockPrisma.scheduledPost.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "FAILED", error: "still broken" } })
    );
  });

  it("never retries when publishing may have happened", async () => {
    mockPrisma.scheduledPost.findMany.mockResolvedValue([duePost()]);
    mockPublish.mockRejectedValue(new PublishOutcomeUnknownError("no answer"));
    const result = await runScheduledPosts();
    expect(result.failed).toBe(1);
    expect(result.retried).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fails posts stuck in PUBLISHING for over an hour", async () => {
    mockPrisma.scheduledPost.findMany.mockResolvedValue([]);
    mockPrisma.scheduledPost.updateMany.mockResolvedValueOnce({ count: 2 });
    const now = new Date("2026-11-20T21:30:00Z");
    const result = await runScheduledPosts(now);
    expect(result.stuck).toBe(2);
    expect(mockPrisma.scheduledPost.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: "PUBLISHING",
          publishingStartedAt: { lt: new Date("2026-11-20T20:30:00Z") },
        },
      })
    );
  });
});
