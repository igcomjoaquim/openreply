import { prisma } from "@/lib/db/client";
import { getI18n } from "@/lib/i18n/server";
import { getCurrentWorkspaceContext } from "@/lib/workspace-access";
import { decryptToken } from "@/lib/meta/oauth";
import { getPublishedMediaPreview } from "@/lib/publishing/graph";
import type { MediaItem } from "@/lib/publishing/publish-post";
import { AutoRefresh, CancelButton } from "./client-parts";

export const dynamic = "force-dynamic";

const TIME_ZONE = "America/Sao_Paulo";

type Preview = { url: string; kind: "IMAGE" | "VIDEO"; poster?: string };

const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-accent/15 text-accent border-accent/20",
  PUBLISHING: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  PUBLISHED: "bg-green-500/15 text-green-400 border-green-500/20",
  FAILED: "bg-red-500/15 text-red-400 border-red-500/20",
};

function thirtyDaysAgo(): Date {
  return new Date(Date.now() - 30 * 24 * 60 * 60_000);
}

async function publishedPreviews(
  accessToken: string,
  mediaId: string
): Promise<Preview[]> {
  try {
    const media = await getPublishedMediaPreview(decryptToken(accessToken), mediaId);
    const items = media.children?.data?.length ? media.children.data : [media];
    return items.flatMap((item): Preview[] => {
      const isVideo = item.media_type === "VIDEO";
      const url = isVideo ? (item.thumbnail_url ?? item.media_url) : item.media_url;
      return url ? [{ url, kind: "IMAGE" }] : [];
    });
  } catch {
    return [];
  }
}

export default async function ScheduledPostsPage() {
  const { t, locale } = await getI18n();
  const context = await getCurrentWorkspaceContext();
  if (!context) return null;

  const since = thirtyDaysAgo();
  const posts = await prisma.scheduledPost.findMany({
    where: {
      instagramAccount: { workspaceId: context.workspaceId },
      OR: [
        { status: { in: ["PENDING", "PUBLISHING"] } },
        { publishAt: { gte: since } },
      ],
    },
    orderBy: { publishAt: "asc" },
    include: { instagramAccount: { select: { username: true, accessToken: true } } },
  });

  const upcoming = posts.filter((p) => p.status === "PENDING" || p.status === "PUBLISHING");
  const done = posts
    .filter((p) => p.status === "PUBLISHED" || p.status === "FAILED")
    .reverse();

  const dateFormat = new Intl.DateTimeFormat(locale === "en" ? "en-US" : locale, {
    timeZone: TIME_ZONE,
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  const typeLabel = { REEL: t("Reel"), IMAGE: t("Photo"), CAROUSEL: t("Carousel") };
  const statusLabel = {
    PENDING: t("Scheduled"),
    PUBLISHING: t("Publishing now"),
    PUBLISHED: t("Published"),
    FAILED: t("Failed"),
  };

  const cards = await Promise.all(
    [...upcoming, ...done].map(async (post) => {
      const media = post.media as unknown as MediaItem[];
      const cover = post.coverName ? `/api/media/${post.coverName}` : undefined;
      const previews: Preview[] =
        post.status === "PUBLISHED" && post.mediaId
          ? await publishedPreviews(post.instagramAccount.accessToken, post.mediaId)
          : media.map((item) => ({
              url: `/api/media/${item.name}`,
              kind: item.kind,
              poster: cover,
            }));
      return { post, previews, cover };
    })
  );
  const byId = new Map(cards.map((card) => [card.post.id, card]));

  function renderPost(id: string) {
    const card = byId.get(id)!;
    const { post, previews, cover } = card;
    return (
      <article key={post.id} className="panel rounded p-4 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-base font-semibold">
            {dateFormat.format(post.publishAt)}
          </span>
          <span className="text-sm text-muted">
            {typeLabel[post.type]} · @{post.instagramAccount.username}
          </span>
          <span
            className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[post.status]}`}
          >
            {statusLabel[post.status]}
          </span>
          <div className="ml-auto flex items-center gap-3">
            {post.permalink && (
              <a
                href={post.permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-accent hover:underline"
              >
                {t("View on Instagram")}
              </a>
            )}
            {(post.status === "PENDING" || post.status === "FAILED") && (
              <CancelButton id={post.id} />
            )}
          </div>
        </div>

        {previews.length > 0 && (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {previews.map((item, index) =>
              item.kind === "VIDEO" ? (
                <video
                  key={index}
                  src={item.url}
                  poster={item.poster}
                  controls
                  preload="metadata"
                  className="h-80 shrink-0 rounded bg-black"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={index}
                  src={item.url}
                  alt=""
                  loading="lazy"
                  className="h-64 shrink-0 rounded border border-border object-cover"
                />
              )
            )}
            {cover && post.status !== "PUBLISHED" && (
              <figure className="shrink-0 space-y-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={cover} alt="" className="h-64 rounded border border-border" />
                <figcaption className="text-xs text-muted">{t("Cover")}</figcaption>
              </figure>
            )}
          </div>
        )}

        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">
            {t("Caption")}
          </p>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {post.caption || t("(no text)")}
          </p>
        </div>

        {post.error && (
          <p className="rounded border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
            {post.error}
          </p>
        )}
      </article>
    );
  }

  return (
    <div className="space-y-8">
      <AutoRefresh seconds={30} />
      <p className="text-sm text-muted">
        {t("Times in Brasília. The page updates every 30 seconds.")}
      </p>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">
          {t("Upcoming")} ({upcoming.length})
        </h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted">{t("No posts scheduled yet.")}</p>
        ) : (
          upcoming.map((post) => renderPost(post.id))
        )}
      </section>

      {done.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">{t("Last 30 days")}</h2>
          {done.map((post) => renderPost(post.id))}
        </section>
      )}
    </div>
  );
}
