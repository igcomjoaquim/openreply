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
    res.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
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

/** 🎉 E-mail de boas-vindas logo depois do cadastro (Thiago 28/11: aluna esperava um e-mail e não chegava nada). */
export async function sendWelcome(to: string, name: string): Promise<void> {
  const first = name.split(" ")[0];
  const url = "https://destravando.inglescomjoaquim.com";
  const subject = `${first}, sua conta no Destravando está pronta 🔓`;
  const text = `Oi, ${first}!\n\nSua conta no Destravando foi criada. Boas-vindas!\n\nPra entrar de qualquer celular ou computador:\n${url}\nToque em "Entrar" e use este e-mail (${to}) e a senha que você criou.\n\nEsqueceu a senha? Na tela de entrar, toque em "Esqueci a senha" e a gente manda um código por e-mail.\n\n📲 Dica: instale o Destravando no celular pra abrir direto do ícone, em tela cheia, como um app.\niPhone: abra o site no Safari → Compartilhar → Adicionar à Tela de Início.\nAndroid: abra no Chrome → menu ⋮ → Instalar app.\n\nO segredo é a constância: uns 15 minutos por dia de ouvido e fala.\n\nFalou, validou!\nJoaquim · Inglês com Joaquim`;
  const html = `<div style="font-family:system-ui,sans-serif;font-size:16px;line-height:1.5;color:#211A10;max-width:520px"><p>Oi, ${escapeHtml(first)}!</p><p>Sua conta no <b>Destravando</b> foi criada. Boas-vindas! 🎉</p><p>Pra entrar de qualquer celular ou computador, é só abrir o site, tocar em <b>Entrar</b> e usar este e-mail (<b>${escapeHtml(to)}</b>) e a senha que você criou.</p><p><a href="${url}" style="display:inline-block;background:linear-gradient(180deg,#EDC55F,#D4A843 55%,#BF922F);color:#2B2008;font-weight:700;text-decoration:none;padding:12px 22px;border-radius:999px">Abrir o Destravando →</a></p><p style="color:#7F735C;font-size:14px">Esqueceu a senha? Na tela de entrar, toque em <b>Esqueci a senha</b> e a gente manda um código por e-mail.</p><p style="background:#F6EBD3;border-radius:12px;padding:12px 14px;font-size:15px">📲 <b>Instale o Destravando no celular</b> pra abrir direto do ícone, em tela cheia, como um app.<br><b>iPhone:</b> abra o site no Safari → Compartilhar → <i>Adicionar à Tela de Início</i>.<br><b>Android:</b> abra no Chrome → menu ⋮ → <i>Instalar app</i>.</p><p>O segredo é a constância: uns 15 minutos por dia de ouvido e fala.</p><p style="font-family:Georgia,serif;font-style:italic;color:#6F2A3D">Falou, validou!<br>Joaquim · Inglês com Joaquim</p></div>`;
  await sendMail(to, subject, text, html);
}

/** 📩 Código pra confirmar o e-mail (cadastro novo ou login de quem ainda não confirmou). Espera 60 s entre um e outro. */
export async function issueVerify(u: { id: string; email: string; name: string }): Promise<"enviado" | "espera" | "falhou"> {
  const p = getPrisma();
  const recent = await p.dtvReset.count({ where: { userId: u.id, createdAt: { gt: new Date(Date.now() - 60_000) } } });
  const hora = await p.dtvReset.count({ where: { userId: u.id, createdAt: { gt: new Date(Date.now() - 3_600_000) } } });
  if (recent || hora >= 6) return "espera"; // no máx. 1 por minuto e 6 por hora (não lota a caixa de ninguém)
  const { code, hash } = newCode();
  await p.dtvReset.create({ data: { userId: u.id, codeHash: hash, expiresAt: new Date(Date.now() + 30 * 60_000) } });
  try { await sendVerify(u.email, u.name, code); return "enviado"; } catch (e) { console.error("[destravando] e-mail de confirmação falhou", String(e).slice(0, 200)); return "falhou"; }
}
export async function sendVerify(to: string, name: string, code: string): Promise<void> {
  const first = name.split(" ")[0];
  const subject = `${code} é o seu código pra confirmar o e-mail 🔓`;
  const text = `Oi, ${first}!\n\nPra confirmar o seu e-mail e entrar no Destravando, digite este código:\n\n${code}\n\nEle vale 30 minutos. Se não foi você que criou a conta, é só ignorar este e-mail.\n\nFalou, validou!\nJoaquim · Inglês com Joaquim`;
  const html = `<div style="font-family:system-ui,sans-serif;font-size:16px;line-height:1.5;color:#211A10;max-width:480px"><p>Oi, ${escapeHtml(first)}!</p><p>Pra confirmar o seu e-mail e entrar no <b>Destravando</b>, digite este código:</p><p style="font-size:34px;font-weight:800;letter-spacing:6px;background:linear-gradient(180deg,#EDC55F,#D4A843);color:#2B2008;display:inline-block;padding:8px 18px;border-radius:12px">${code}</p><p>Ele vale <b>30 minutos</b>. Se não foi você que criou a conta, é só ignorar este e-mail.</p><p style="font-family:Georgia,serif;font-style:italic;color:#6F2A3D">Falou, validou!<br>Joaquim · Inglês com Joaquim</p></div>`;
  await sendMail(to, subject, text, html);
}

export async function sendCode(to: string, name: string, code: string): Promise<void> {
  const subject = `${code} é o seu código pra criar uma senha nova 🔐`;
  const text = `Oi, ${name.split(" ")[0]}!\n\nSeu código pra criar uma senha nova no Destravando é:\n\n${code}\n\nEle vale 20 minutos. Se não foi você que pediu, é só ignorar este e-mail.\n\nBora destravar? 🔓\nJoaquim · Inglês com Joaquim`;
  const html = `<div style="font-family:system-ui,sans-serif;font-size:16px;color:#2B211B;max-width:480px"><p>Oi, ${escapeHtml(name.split(" ")[0])}!</p><p>Seu código pra criar uma senha nova no <b>Destravando</b> é:</p><p style="font-size:34px;font-weight:800;letter-spacing:6px;background:#FFD21F;display:inline-block;padding:8px 16px;border-radius:12px">${code}</p><p>Ele vale <b>20 minutos</b>. Se não foi você que pediu, é só ignorar este e-mail.</p><p>Bora destravar? 🔓<br>Joaquim · Inglês com Joaquim</p></div>`;
  await sendMail(to, subject, text, html);
}
export async function sendMail(to: string, subject: string, text: string, html: string, headers?: Record<string, string>): Promise<void> {
  const from = process.env.DESTRAVANDO_EMAIL_FROM ?? (process.env.DESTRAVANDO_RESEND_KEY ? "Destravando <nao-responda@destravando.inglescomjoaquim.com>" : process.env.EMAIL_FROM) ?? "Destravando <nao-responda@destravando.inglescomjoaquim.com>";
  // Chave própria do Destravando (domínio destravando.inglescomjoaquim.com no Resend). A RESEND_API_KEY é a do login do painel: não mexer.
  const key = process.env.DESTRAVANDO_RESEND_KEY ?? process.env.RESEND_API_KEY;
  if (process.env.DESTRAVANDO_RESEND_KEY || (!process.env.EMAIL_SERVER && key)) {
    const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ from, to, subject, text, html, ...(headers ? { headers } : {}) }) });
    if (!r.ok) console.error("[destravando] resend", r.status, (await r.text().catch(() => "")).slice(0, 300));
    if (!r.ok) throw new Error("resend " + r.status);
    return;
  }
  if (process.env.EMAIL_SERVER) {
    await nodemailer.createTransport(process.env.EMAIL_SERVER).sendMail({ from, to, subject, text, html, headers });
    return;
  }
  throw new Error("sem servidor de e-mail configurado");
}
export function escapeHtml(s: string) { return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string); }

// ---- limite simples por IP (evita robô tentando senha) ----
const hits = new Map<string, number[]>();
/** De onde veio a chamada (só pra conferir a proteção): "chave" = pelo site com a chave certa. */
export function viaOf(req: NextRequest): string {
  const key = process.env.DESTRAVANDO_PROXY_KEY, sent = req.headers.get("x-dtv-key");
  return !key ? "sem-chave-no-servidor" : sent === key ? "chave" : sent ? "chave-errada" : "sem-chave";
}
/** IP de quem está usando: vindo do site (worker com a chave secreta) vale o x-dtv-ip; chamada direta usa o último x-forwarded-for (posto pelo Railway, não dá pra forjar). */
export function ipOf(req: NextRequest): string {
  const key = process.env.DESTRAVANDO_PROXY_KEY;
  if (key && req.headers.get("x-dtv-key") === key) return req.headers.get("x-dtv-ip")?.trim() || "?";
  const xff = (req.headers.get("x-forwarded-for") ?? "").split(",").map((x) => x.trim()).filter(Boolean);
  // sem a chave configurada no servidor: comportamento antigo
  if (!key) return (req.headers.get("cf-connecting-ip") ?? xff[0] ?? "").trim() || "?";
  // modo rígido (28/11, site oficial já manda a chave): sem chave ou chave errada = chamada direta; vale o IP que o Railway viu (não dá pra forjar)
  return xff[xff.length - 1] || "?";
}
export function tooMany(req: NextRequest, key: string, max: number, windowMs: number): boolean {
  const ip = ipOf(req);
  const k = key + "|" + ip, now = Date.now();
  const arr = (hits.get(k) ?? []).filter((t) => now - t < windowMs);
  arr.push(now); hits.set(k, arr);
  if (hits.size > 5000) hits.clear();
  return arr.length > max;
}
