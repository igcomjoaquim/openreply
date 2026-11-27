import { createHash, randomBytes, randomInt, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { NextResponse, type NextRequest } from "next/server";
import nodemailer from "nodemailer";
import { getPrisma } from "@/lib/db/client";

/** 🔓 Destravando: contas dos alunos (produto público). Login com e-mail + senha, sessão por token. */
const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;
const SESSION_DAYS = 180;

const ORIGINS = [/^https:\/\/destravando\.inglescomjoaquim\.com$/, /^https:\/\/([a-z0-9-]+\.)?destravando-b9b\.pages\.dev$/, /^http:\/\/localhost:\d+$/];
export function cors(req: NextRequest, res: NextResponse): NextResponse {
  const o = req.headers.get("origin") ?? "";
  if (ORIGINS.some((r) => r.test(o))) {
    res.headers.set("Access-Control-Allow-Origin", o);
    res.headers.set("Vary", "Origin");
    res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
  }
  res.headers.set("Cache-Control", "no-store");
  return res;
}
export function json(req: NextRequest, body: unknown, status = 200): NextResponse {
  return cors(req, NextResponse.json(body, { status }));
}
export function preflight(req: NextRequest): NextResponse {
  return cors(req, new NextResponse(null, { status: 204 }));
}

export function normEmail(e: unknown): string | null {
  if (typeof e !== "string") return null;
  const v = e.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) && v.length <= 200 ? v : null;
}
export function clean(v: unknown, max = 120): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim().replace(/\s+/g, " ");
  return s ? s.slice(0, max) : null;
}

export async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(pw, salt, 64);
  return "s1$" + salt.toString("hex") + "$" + key.toString("hex");
}
export async function checkPassword(pw: string, stored: string): Promise<boolean> {
  const [v, s, k] = stored.split("$");
  if (v !== "s1" || !s || !k) return false;
  const key = await scrypt(pw, Buffer.from(s, "hex"), 64);
  const want = Buffer.from(k, "hex");
  return want.length === key.length && timingSafeEqual(want, key);
}
const sha = (t: string) => createHash("sha256").update(t).digest("hex");

export async function newSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await getPrisma().dtvSession.create({ data: { userId, tokenHash: sha(token), expiresAt: new Date(Date.now() + SESSION_DAYS * 86_400_000) } });
  return token;
}
export async function userFrom(req: NextRequest) {
  const h = req.headers.get("authorization") ?? "";
  const token = h.startsWith("Bearer ") ? h.slice(7).trim() : "";
  if (!token) return null;
  const s = await getPrisma().dtvSession.findUnique({ where: { tokenHash: sha(token) }, include: { user: true } });
  if (!s || s.expiresAt < new Date()) return null;
  return { session: s, user: s.user };
}
export async function dropSession(req: NextRequest) {
  const h = req.headers.get("authorization") ?? "";
  const token = h.startsWith("Bearer ") ? h.slice(7).trim() : "";
  if (token) await getPrisma().dtvSession.deleteMany({ where: { tokenHash: sha(token) } });
}

export function publicUser(u: { id: string; email: string; name: string }) {
  return { id: u.id, email: u.email, name: u.name };
}

// ---- "Esqueci a senha": código de 6 números por e-mail ----
export function newCode(): { code: string; hash: string } {
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  return { code, hash: sha(code) };
}
export const codeHash = sha;

export async function sendCode(to: string, name: string, code: string): Promise<void> {
  const subject = `${code} é o seu código do Destravando`;
  const text = `Oi, ${name.split(" ")[0]}!\n\nSeu código pra criar uma senha nova no Destravando é:\n\n${code}\n\nEle vale 20 minutos. Se não foi você que pediu, é só ignorar este e-mail.\n\nBora destravar? 🔓\nThiago · Inglês com Joaquim`;
  const html = `<div style="font-family:system-ui,sans-serif;font-size:16px;color:#2B211B;max-width:480px"><p>Oi, ${escapeHtml(name.split(" ")[0])}!</p><p>Seu código pra criar uma senha nova no <b>Destravando</b> é:</p><p style="font-size:34px;font-weight:800;letter-spacing:6px;background:#FFD21F;display:inline-block;padding:8px 16px;border-radius:12px">${code}</p><p>Ele vale <b>20 minutos</b>. Se não foi você que pediu, é só ignorar este e-mail.</p><p>Bora destravar? 🔓<br>Thiago · Inglês com Joaquim</p></div>`;
  const from = process.env.DESTRAVANDO_EMAIL_FROM ?? (process.env.DESTRAVANDO_RESEND_KEY ? "Destravando <nao-responda@destravando.inglescomjoaquim.com>" : process.env.EMAIL_FROM) ?? "Destravando <nao-responda@destravando.inglescomjoaquim.com>";
  // Chave própria do Destravando (domínio destravando.inglescomjoaquim.com no Resend). A RESEND_API_KEY é a do login do painel: não mexer.
  const key = process.env.DESTRAVANDO_RESEND_KEY ?? process.env.RESEND_API_KEY;
  if (process.env.DESTRAVANDO_RESEND_KEY || (!process.env.EMAIL_SERVER && key)) {
    const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ from, to, subject, text, html }) });
    if (!r.ok) console.error("[destravando] resend", r.status, (await r.text().catch(() => "")).slice(0, 300));
    if (!r.ok) throw new Error("resend " + r.status);
    return;
  }
  if (process.env.EMAIL_SERVER) {
    await nodemailer.createTransport(process.env.EMAIL_SERVER).sendMail({ from, to, subject, text, html });
    return;
  }
  throw new Error("sem servidor de e-mail configurado");
}
function escapeHtml(s: string) { return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string); }

// ---- limite simples por IP (evita robô tentando senha) ----
const hits = new Map<string, number[]>();
export function tooMany(req: NextRequest, key: string, max: number, windowMs: number): boolean {
  const ip = (req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "?";
  const k = key + "|" + ip, now = Date.now();
  const arr = (hits.get(k) ?? []).filter((t) => now - t < windowMs);
  arr.push(now); hits.set(k, arr);
  if (hits.size > 5000) hits.clear();
  return arr.length > max;
}
