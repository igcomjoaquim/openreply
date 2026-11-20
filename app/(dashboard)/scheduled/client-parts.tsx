"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/provider";
import { approveScheduledPostAction, cancelScheduledPostAction } from "./actions";

/** Keeps statuses fresh while a post is waiting or publishing. */
export function AutoRefresh({ seconds }: { seconds: number }) {
  const router = useRouter();
  useEffect(() => {
    const timer = window.setInterval(() => router.refresh(), seconds * 1000);
    return () => window.clearInterval(timer);
  }, [router, seconds]);
  return null;
}

export function CancelButton({ id }: { id: string }) {
  const { t } = useI18n();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!window.confirm(t("Cancel this post? Its files will be deleted."))) return;
          startTransition(async () => {
            const result = await cancelScheduledPostAction(id);
            setError(result.error ?? null);
          });
        }}
        className="rounded border border-border px-3 py-1.5 text-xs text-muted hover:border-border-hover hover:text-foreground disabled:opacity-50"
      >
        {t("Cancel")}
      </button>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}

export function ApproveButton({ id }: { id: string }) {
  const { t } = useI18n();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!window.confirm(t("Approve this post? It will go live at the scheduled time."))) return;
          startTransition(async () => {
            const result = await approveScheduledPostAction(id);
            setError(result.error ?? null);
          });
        }}
        className="rounded bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover disabled:opacity-50"
      >
        {t("Approve")}
      </button>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}
