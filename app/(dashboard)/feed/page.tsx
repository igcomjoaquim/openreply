import Link from "next/link";
import { prisma } from "@/lib/db/client";
import { getI18n } from "@/lib/i18n/server";
import { getCurrentWorkspaceContext } from "@/lib/workspace-access";
import { decryptToken } from "@/lib/meta/oauth";
import { getRecentProfileMedia, type ProfileMedia } from "@/lib/publishing/graph";
import type { MediaItem } from "@/lib/publishing/publish-post";
import { AutoRefresh } from "../scheduled/client-parts";

export const dynamic = "force-dynamic";

const TIME_ZONE = "America/Sao_Paulo";

/**
 * Feed preview: the profile grid as it will look, upcoming posts first (newest
 * scheduled at the top left, like Instagram) followed by what is already live.
 */
export default async function FeedPreviewPage() {
  const { t, locale } = await getI18n();
  const context = await getCurrentWorkspaceContext();
  if (!context) return null;

  const accounts = await prisma.instagramAccount.findMany({
    where: { workspaceId: context.workspaceId, provider: "META" },
    select: { id: true, instagramId: true, username: true, accessToken: true },
    orderBy: { username: "asc" },
  });

  const dateFormat = new Intl.DateTimeFormat(locale === "en" ? "en-US" : locale, {
    timeZone: TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  const sections = await Promise.all(
    accounts.map(async (account) => {
      const upcoming = await prisma.scheduledPost.findMany({
        where: { instagramAccountId: account.id, status: { in: ["PENDING", "PUBLISHING"] } },
        orderBy: { publishAt: "desc" },
      });
      let live: ProfileMedia[] = [];
      let liveError = false;
      try {
        live = await getRecentProfileMedia(decryptToken(account.accessToken), account.instagramId, 30);
      } catch {
        liveError = true;
      }
      return { account, upcoming, live, liveError };
    })
  );

  if (sections.length === 0) {
    return <p className="text-sm text-muted">{t("No Instagram account connected.")}</p>;
  }

  return (
    <div className="space-y-10">
      <AutoRefresh seconds={60} />
      <p className="text-sm text-muted">
        {t("How your profile will look. Upcoming posts come first; tap one to check it.")}
      </p>

      {sections.map(({ account, upcoming, live, liveError }) => (
        <section key={account.id} className="mx-auto max-w-xl space-y-3">
          <h2 className="text-base font-semibold">@{account.username}</h2>

          <div className="grid grid-cols-3 gap-0.5">
            {upcoming.map((post) => {
              const media = post.media as unknown as MediaItem[];
              const first = media[0];
              const waiting = post.status === "PENDING" && !post.approvedAt;
              const cover = post.coverName ? `/api/media/${post.coverName}` : null;
              const offset = (post.thumbOffsetMs ?? 0) / 1000;
              return (
                <Link
                  key={post.id}
                  href={`/scheduled#post-${post.id}`}
                  className={`relative block aspect-[3/4] overflow-hidden bg-black ${
                    waiting ? "ring-2 ring-inset ring-yellow-400" : "ring-2 ring-inset ring-accent"
                  }`}
                >
                  {cover || first?.kind !== "VIDEO" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={cover ?? `/api/media/${first?.name}`}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <video
                      src={`/api/media/${first.name}#t=${offset}`}
                      preload="metadata"
                      muted
                      playsInline
                      className="h-full w-full object-cover"
                    />
                  )}
                  <TypeIcon type={post.type === "REEL" ? "REEL" : post.type === "CAROUSEL" ? "CAROUSEL" : null} />
                  <span
                    className={`absolute inset-x-0 bottom-0 px-1.5 py-1 text-[10px] font-semibold leading-tight sm:text-xs ${
                      waiting ? "bg-yellow-400 text-black" : "bg-accent text-white"
                    }`}
                  >
                    {waiting ? t("Waiting for your OK") : t("Scheduled")}
                    <br />
                    {dateFormat.format(post.publishAt)}
                  </span>
                </Link>
              );
            })}

            {live.map((item) => {
              const src = item.media_type === "VIDEO" ? (item.thumbnail_url ?? item.media_url) : item.media_url;
              const type =
                item.media_product_type === "REELS" || item.media_type === "VIDEO"
                  ? "REEL"
                  : item.media_type === "CAROUSEL_ALBUM"
                    ? "CAROUSEL"
                    : null;
              return (
                <a
                  key={item.id}
                  href={item.permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative block aspect-[3/4] overflow-hidden bg-surface"
                >
                  {src && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
                  )}
                  <TypeIcon type={type} />
                </a>
              );
            })}
          </div>

          {upcoming.length === 0 && (
            <p className="text-sm text-muted">{t("No posts scheduled yet.")}</p>
          )}
          {liveError && (
            <p className="text-xs text-red-400">
              {t("Could not load the posts already on Instagram. Try again in a minute.")}
            </p>
          )}
        </section>
      ))}
    </div>
  );
}

function TypeIcon({ type }: { type: "REEL" | "CAROUSEL" | null }) {
  if (!type) return null;
  return (
    <span className="absolute right-1.5 top-1.5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
      {type === "REEL" ? (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-label="Reel">
          <path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86A1 1 0 0 0 8 5.14Z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-label="Carousel">
          <path d="M7 3h11a3 3 0 0 1 3 3v11h-2V6a1 1 0 0 0-1-1H7V3Z" />
          <rect x="3" y="7" width="14" height="14" rx="2" />
        </svg>
      )}
    </span>
  );
}
