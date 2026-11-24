import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db/client";
import { isAuthorizedServiceRequest } from "@/lib/publishing/media-store";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

/** Apaga uma tentativa (ex.: o teste do professor antes de liberar pro aluno). */
export async function DELETE(request: NextRequest, { params }: Params) {
  if (!isAuthorizedServiceRequest(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const res = await getPrisma().lessonAttempt.deleteMany({ where: { id } });
  return NextResponse.json({ deleted: res.count });
}
