import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MetaApiError } from "@/lib/meta/client";
import {
  PublishOutcomeUnknownError,
  publishToInstagram,
  validatePublishInput,
} from "@/lib/publishing/publish-post";
import { brasiliaToIso } from "@/scripts/lib/openreply-api";
import { isValidMediaName, mediaUrl } from "@/lib/publishing/media-store";

const IMG = "a".repeat(32) + ".jpg";
const IMG2 = "b".repeat(32) + ".jpg";
const VID = "c".repeat(32) + ".mp4";

type Call = { url: string; method: string; body: URLSearchParams };

function graphMock(handler: (call: Call) => unknown) {
  const calls: Call[] = [];
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const call = {
      url,
      method: init?.method ?? "GET",
      body: new URLSearchParams((init?.body as string) ?? ""),
    };
    calls.push(call);
    const data = handler(call);
    if (data instanceof Error) throw data;
    return new Response(JSON.stringify(data), {
      status: (data as { error?: unknown }).error ? 400 : 200,
    });
  });
  vi.stubGlobal("fetch", fetchMock);
  return calls;
}

const noSleep = { sleep: async () => {} };

beforeEach(() => {
  process.env.NEXTAUTH_URL = "https://app.example.com";
  delete process.env.PUBLIC_MEDIA_BASE_URL;
});
afterEach(() => vi.unstubAllGlobals());

describe("media names", () => {
  it("accepts only random hex names with a known extension", () => {
    expect(isValidMediaName(IMG)).toBe(true);
    expect(isValidMediaName("../etc/passwd")).toBe(false);
    expect(isValidMediaName("abc.jpg")).toBe(false);
    expect(isValidMediaName("a".repeat(32) + ".png")).toBe(false);
  });

  it("builds the public URL from the app URL", () => {
    expect(mediaUrl(IMG)).toBe(`https://app.example.com/api/media/${IMG}`);
  });
});

describe("validatePublishInput", () => {
  it("checks the shape of each post type", () => {
    const img = { name: IMG, kind: "IMAGE" as const };
    const vid = { name: VID, kind: "VIDEO" as const };
    expect(validatePublishInput({ type: "REEL", media: [vid], caption: "" })).toBeNull();
    expect(validatePublishInput({ type: "REEL", media: [img], caption: "" })).toMatch(/one video/);
    expect(validatePublishInput({ type: "IMAGE", media: [img], caption: "" })).toBeNull();
    expect(validatePublishInput({ type: "CAROUSEL", media: [img], caption: "" })).toMatch(/2 to 10/);
    expect(
      validatePublishInput({ type: "CAROUSEL", media: Array(11).fill(img), caption: "" })
    ).toMatch(/2 to 10/);
    expect(
      validatePublishInput({ type: "IMAGE", media: [{ name: VID, kind: "IMAGE" }], caption: "" })
    ).toMatch(/not a IMAGE/);
  });

  it("enforces Instagram caption limits", () => {
    const img = [{ name: IMG, kind: "IMAGE" as const }];
    const tags = Array.from({ length: 31 }, (_, i) => `#tag${i}`).join(" ");
    expect(validatePublishInput({ type: "IMAGE", media: img, caption: tags })).toMatch(/30 hashtags/);
    expect(validatePublishInput({ type: "IMAGE", media: img, caption: "x".repeat(2201) })).toMatch(/2200/);
  });
});

describe("publishToInstagram", () => {
  it("publishes a Reel: container, wait for FINISHED, media_publish", async () => {
    let polls = 0;
    const calls = graphMock(({ url, method }) => {
      if (method === "POST" && url.endsWith("/123/media")) return { id: "C1" };
      if (url.includes("/C1?")) return { status_code: ++polls < 3 ? "IN_PROGRESS" : "FINISHED" };
      if (url.endsWith("/123/media_publish")) return { id: "M1" };
      if (url.includes("/M1?")) return { permalink: "https://instagram.com/reel/x" };
      throw new Error(`unexpected ${url}`);
    });

    const result = await publishToInstagram(
      "token",
      "123",
      { type: "REEL", media: [{ name: VID, kind: "VIDEO" }], caption: "Oi", thumbOffsetMs: 1500 },
      noSleep
    );

    expect(result).toEqual({ containerId: "C1", mediaId: "M1", permalink: "https://instagram.com/reel/x" });
    expect(calls[0].url).toBe("https://graph.facebook.com/v27.0/123/media");
    expect(Object.fromEntries(calls[0].body)).toEqual({
      media_type: "REELS",
      video_url: `https://app.example.com/api/media/${VID}`,
      caption: "Oi",
      share_to_feed: "true",
      thumb_offset: "1500",
    });
    expect(polls).toBe(3);
    expect(calls.find((c) => c.url.endsWith("media_publish"))?.body.get("creation_id")).toBe("C1");
  });

  it("publishes a carousel: children, then CAROUSEL container with ids in order", async () => {
    let next = 0;
    const calls = graphMock(({ url, method, body }) => {
      if (method === "POST" && url.endsWith("/123/media")) {
        return { id: body.get("media_type") === "CAROUSEL" ? "PARENT" : `K${++next}` };
      }
      if (method === "GET" && /\/(K\d|PARENT)\?/.test(url)) return { status_code: "FINISHED" };
      if (url.endsWith("/media_publish")) return { id: "M2" };
      return { permalink: "https://instagram.com/p/y" };
    });

    await publishToInstagram(
      "token",
      "123",
      {
        type: "CAROUSEL",
        media: [
          { name: IMG, kind: "IMAGE" },
          { name: VID, kind: "VIDEO" },
          { name: IMG2, kind: "IMAGE" },
        ],
        caption: "Carrossel",
      },
      noSleep
    );

    const creates = calls.filter((c) => c.method === "POST" && c.url.endsWith("/media"));
    expect(Object.fromEntries(creates[0].body)).toEqual({
      image_url: `https://app.example.com/api/media/${IMG}`,
      is_carousel_item: "true",
    });
    expect(Object.fromEntries(creates[1].body)).toEqual({
      media_type: "VIDEO",
      video_url: `https://app.example.com/api/media/${VID}`,
      is_carousel_item: "true",
    });
    expect(Object.fromEntries(creates[3].body)).toEqual({
      media_type: "CAROUSEL",
      children: "K1,K2,K3",
      caption: "Carrossel",
    });
  });

  it("stops before publishing when processing fails", async () => {
    const calls = graphMock(({ url, method }) => {
      if (method === "POST") return { id: "C1" };
      if (url.includes("/C1?")) return { status_code: "ERROR", status: "bad codec" };
      throw new Error("unexpected");
    });
    await expect(
      publishToInstagram("t", "123", { type: "REEL", media: [{ name: VID, kind: "VIDEO" }], caption: "" }, noSleep)
    ).rejects.toThrow(/bad codec/);
    expect(calls.some((c) => c.url.endsWith("media_publish"))).toBe(false);
  });

  it("gives up after the processing timeout", async () => {
    graphMock(({ method }) => (method === "POST" ? { id: "C1" } : { status_code: "IN_PROGRESS" }));
    await expect(
      publishToInstagram(
        "t",
        "123",
        { type: "IMAGE", media: [{ name: IMG, kind: "IMAGE" }], caption: "" },
        { ...noSleep, containerTimeoutMs: 20_000, pollIntervalMs: 5_000 }
      )
    ).rejects.toThrow(/still processing/);
  });

  it("an API error on media_publish is a retryable MetaApiError", async () => {
    graphMock(({ url, method }) => {
      if (url.endsWith("media_publish"))
        return { error: { message: "not ready", code: 9007, type: "OAuthException" } };
      if (method === "POST") return { id: "C1" };
      return { status_code: "FINISHED" };
    });
    await expect(
      publishToInstagram("t", "123", { type: "IMAGE", media: [{ name: IMG, kind: "IMAGE" }], caption: "" }, noSleep)
    ).rejects.toBeInstanceOf(MetaApiError);
  });

  it("a dropped connection on media_publish is an unknown outcome", async () => {
    graphMock(({ url, method }) => {
      if (url.endsWith("media_publish")) return new TypeError("fetch failed");
      if (method === "POST") return { id: "C1" };
      return { status_code: "FINISHED" };
    });
    await expect(
      publishToInstagram("t", "123", { type: "IMAGE", media: [{ name: IMG, kind: "IMAGE" }], caption: "" }, noSleep)
    ).rejects.toBeInstanceOf(PublishOutcomeUnknownError);
  });
});

describe("brasiliaToIso", () => {
  it("converts Brasília time (UTC-3) to UTC", () => {
    expect(brasiliaToIso("2026-11-20 18:30")).toBe("2026-11-20T21:30:00.000Z");
    expect(brasiliaToIso("2026-11-20 9:05")).toBe("2026-11-20T12:05:00.000Z");
  });
  it("rejects malformed or impossible dates", () => {
    expect(() => brasiliaToIso("20/11/2026 18:30")).toThrow();
    expect(() => brasiliaToIso("2026-02-31 10:00")).toThrow();
  });
});
