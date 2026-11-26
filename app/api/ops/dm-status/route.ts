import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { isAuthorizedServiceRequest } from "@/lib/publishing/media-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Diagnóstico das DMs (rotina/sessão principal): status dos últimos dias e erros recentes. */
export async function GET(request: NextRequest) {
  if (!isAuthorizedServiceRequest(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const days = Math.min(30, Number(request.nextUrl.searchParams.get("days") || 3));
  const since = new Date(Date.now() - days * 86400_000);
  const [byStatus, recent, failed, events, accounts] = await Promise.all([
    prisma.dmLog.groupBy({ by: ["status"], where: { createdAt: { gte: since } }, _count: true }),
    prisma.dmLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { createdAt: true, status: true, attempts: true, matchedKeyword: true, errorMessage: true, publicReplyError: true, dmSentAt: true, publicReplySentAt: true },
    }),
    prisma.dmLog.findMany({
      where: { createdAt: { gte: since }, status: "FAILED" },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { createdAt: true, errorMessage: true, matchedKeyword: true, attempts: true },
    }),
    prisma.operationalEvent.findMany({ where: { createdAt: { gte: since } }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.instagramAccount.findMany({ select: { id: true, username: true, tokenExpiresAt: true, updatedAt: true } as never }).catch((e: unknown) => String(e)),
  ]);
  return NextResponse.json({ byStatus, failed, recent, events, accounts });
}
