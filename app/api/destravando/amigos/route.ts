import { randomBytes } from "node:crypto";
import { type NextRequest } from "next/server";
import { getPrisma } from "@/lib/db/client";
import { json, preflight, tooMany, userFrom } from "@/lib/destravando/conta";
import { pushUser } from "@/lib/destravando/push";

export const runtime = "nodejs";
export const OPTIONS = preflight;

/** 🤝 DESAFIO COM AMIGO: convite por código, ofensiva lado a lado e "cutucar" (notificação no celular do amigo). */
const DAY = 86_400_000;
function hojeDe(tz: string | null): string { try { return new Date().toLocaleDateString("sv-SE", { timeZone: tz || "America/Sao_Paulo" }); } catch { return new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" }); } }
function ofensiva(days: string[], hoje: string, ferias: { from?: string; to?: string }[] = []): number {
  const set = new Set(days), fer = (iso: string) => ferias.some((f) => typeof f?.from === "string" && typeof f?.to === "string" && iso >= f.from && iso <= f.to);
  const d = new Date(hoje + "T12:00:00Z"); if (!set.has(hoje)) d.setUTCDate(d.getUTCDate() - 1);
  let n = 0;
  for (let g = 0; g < 2000; g++) { const iso = d.toISOString().slice(0, 10); if (set.has(iso)) n++; else if (!fer(iso)) break; d.setUTCDate(d.getUTCDate() - 1); }
  return n;
}
const nomeCurto = (n: string) => { const p = n.trim().split(/\s+/); return p.length > 1 ? `${p[0]} ${p[p.length - 1][0]}.` : p[0]; };
type U = { id: string; name: string; progress: unknown; timezone: string | null; lastSeenAt: Date | null };
function resumo(u: U) {
  const p = (u.progress && typeof u.progress === "object" ? u.progress : {}) as { days?: unknown; level?: unknown; ferias?: unknown };
  const days = Array.isArray(p.days) ? (p.days as unknown[]).filter((x): x is string => typeof x === "string") : [];
  const hoje = hojeDe(u.timezone);
  return { id: u.id, nome: nomeCurto(u.name), foguinho: ofensiva(days, hoje, Array.isArray(p.ferias) ? (p.ferias as { from?: string; to?: string }[]) : []), treinouHoje: days.includes(hoje), nivel: typeof p.level === "string" ? p.level.toUpperCase() : "A1", ativo: !!u.lastSeenAt && Date.now() - u.lastSeenAt.getTime() < 14 * DAY };
}
async function meuCodigo(id: string, atual: string | null): Promise<string> {
  if (atual) return atual;
  const p = getPrisma();
  for (let i = 0; i < 5; i++) {
    const c = randomBytes(5).toString("base64url").replace(/[-_]/g, "").slice(0, 6).toUpperCase();
    if (c.length < 6) continue;
    try { await p.dtvUser.update({ where: { id }, data: { inviteCode: c } }); return c; } catch { /* repetido: tenta outro */ }
  }
  throw new Error("sem código");
}
async function lista(meId: string) {
  const p = getPrisma(), sel = { id: true, name: true, progress: true, timezone: true, lastSeenAt: true } as const;
  const fs = await p.dtvFriend.findMany({ where: { OR: [{ aId: meId }, { bId: meId }] }, include: { a: { select: sel }, b: { select: sel } }, orderBy: { createdAt: "asc" } });
  return fs.map((f) => { const outro = f.aId === meId ? f.b : f.a; const euSouA = f.aId === meId; const r = resumo(outro); const hoje = hojeDe(null); return { ...r, jaCutuqueiHoje: (euSouA ? f.pokeA : f.pokeB) === hoje }; })
    .sort((x, y) => y.foguinho - x.foguinho);
}

export async function GET(req: NextRequest) {
  const me = await userFrom(req);
  if (!me) return json(req, { error: "Entre de novo." }, 401);
  const codigo = await meuCodigo(me.user.id, me.user.inviteCode);
  return json(req, { codigo, eu: resumo(me.user), amigos: await lista(me.user.id) });
}

export async function POST(req: NextRequest) {
  const me = await userFrom(req);
  if (!me) return json(req, { error: "Entre de novo." }, 401);
  const raw = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const b = { codigo: typeof raw.codigo === "string" ? raw.codigo : undefined, cutucar: typeof raw.cutucar === "string" ? raw.cutucar : undefined };
  const p = getPrisma();
  if (b.codigo) {
    if (tooMany(req, "amigo", 20, 3_600_000)) return json(req, { error: "Muitas tentativas. Tente daqui a pouco." }, 429);
    const c = String(b.codigo).trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
    const outro = c ? await p.dtvUser.findUnique({ where: { inviteCode: c } }) : null;
    if (!outro) return json(req, { error: "Não achei esse código. Confira com quem te convidou." }, 404);
    if (outro.id === me.user.id) return json(req, { error: "Esse é o seu próprio código 😅" }, 400);
    const [aId, bId] = [me.user.id, outro.id].sort();
    try { await p.dtvFriend.upsert({ where: { aId_bId: { aId, bId } }, create: { aId, bId }, update: {} }); } catch { /* dois toques ao mesmo tempo: já ficou amigo */ }
    pushUser(outro.id, { title: "🤝 Novo parceiro de treino!", body: `${nomeCurto(me.user.name)} entrou no desafio com você. Agora um vê a ofensiva do outro 🔥`, url: "/?ir=amigos", tag: "amigo" }).catch(() => 0);
    return json(req, { ok: true, amigo: nomeCurto(outro.name), amigos: await lista(me.user.id) });
  }
  if (b.cutucar) {
    const f = await p.dtvFriend.findFirst({ where: { OR: [{ aId: me.user.id, bId: b.cutucar }, { aId: b.cutucar, bId: me.user.id }] } });
    if (!f) return json(req, { error: "Vocês não estão no desafio." }, 404);
    const hoje = hojeDe(null), euSouA = f.aId === me.user.id;
    if ((euSouA ? f.pokeA : f.pokeB) === hoje) return json(req, { error: "Você já cutucou hoje. Amanhã tem mais 😏" }, 429);
    await p.dtvFriend.update({ where: { id: f.id }, data: euSouA ? { pokeA: hoje } : { pokeB: hoje } });
    const sent = await pushUser(b.cutucar, { title: `👉 ${nomeCurto(me.user.name)} te cutucou!`, body: "Bora treinar? Falta só você hoje 😏 São 15 minutinhos.", url: "/?ir=treino", badge: 1, tag: "cutucada" });
    return json(req, { ok: true, sent });
  }
  return json(req, { error: "Pedido inválido." }, 400);
}

export async function DELETE(req: NextRequest) {
  const me = await userFrom(req);
  if (!me) return json(req, { error: "Entre de novo." }, 401);
  const b = (await req.json().catch(() => ({}))) as { amigo?: string };
  if (b.amigo) await getPrisma().dtvFriend.deleteMany({ where: { OR: [{ aId: me.user.id, bId: b.amigo }, { aId: b.amigo, bId: me.user.id }] } });
  return json(req, { ok: true, amigos: await lista(me.user.id) });
}
