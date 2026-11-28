import { type NextRequest } from "next/server";
import { json, preflight, publicUser, userFrom, viaOf } from "@/lib/destravando/conta";

export const runtime = "nodejs";
export const OPTIONS = preflight;

export async function GET(req: NextRequest) {
  const s = await userFrom(req);
  if (!s) return json(req, { error: "Entre de novo.", via: viaOf(req) }, 401);
  return json(req, { user: publicUser(s.user) });
}
