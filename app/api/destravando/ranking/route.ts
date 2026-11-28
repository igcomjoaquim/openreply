import { type NextRequest } from "next/server";
import { getPrisma } from "@/lib/db/client";
import { json, preflight, userFrom } from "@/lib/destravando/conta";

export const runtime = "nodejs";
export const OPTIONS = preflight;

/** 🏆 Ranking da semana (XP dos últimos 7 dias, guardado no progresso em xpByDay). Só primeiro nome + inicial. */
function apelido(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (!p.length) return "Aluno";
  return p.length > 1 ? `${p[0]} ${p[p.length - 1][0].toUpperCase()}.` : p[0];
}
export async function GET(req: NextRequest) {
  const s = await userFrom(req);
  if (!s) return json(req, { error: "Entre de novo." }, 401);
  const since = new Date(Date.now() - 8 * 86_400_000);
  const users = await getPrisma().dtvUser.findMany({ where: { progressAt: { gte: since } }, select: { id: true, name: true, progress: true }, take: 2000 });
  const from = new Date(Date.now() - 6 * 86_400_000).toISOString().slice(0, 10);
  const rows = users
    .filter((u) => !/^TESTE\b/i.test(u.name))
    .map((u) => {
      const p = (u.progress ?? {}) as Record<string, unknown>;
      const byDay = (p.xpByDay ?? {}) as Record<string, number>;
      const xp = Object.entries(byDay).reduce((a, [d, v]) => (d >= from && typeof v === "number" ? a + v : a), 0);
      return { id: u.id, n: apelido(u.name), xp };
    })
    .filter((r) => r.xp > 0)
    .sort((a, b) => b.xp - a.xp);
  const pos = rows.findIndex((r) => r.id === s.user.id);
  return json(req, {
    top: rows.slice(0, 10).map((r, i) => ({ pos: i + 1, n: r.n, xp: r.xp, me: r.id === s.user.id })),
    me: pos >= 0 ? { pos: pos + 1, xp: rows[pos].xp } : null,
    total: rows.length,
  });
}
