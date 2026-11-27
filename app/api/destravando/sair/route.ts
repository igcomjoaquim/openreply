import { type NextRequest } from "next/server";
import { dropSession, json, preflight } from "@/lib/destravando/conta";

export const runtime = "nodejs";
export const OPTIONS = preflight;

export async function POST(req: NextRequest) {
  await dropSession(req);
  return json(req, { ok: true });
}
