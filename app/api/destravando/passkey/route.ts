import { randomBytes } from "node:crypto";
import { type NextRequest } from "next/server";
import { generateAuthenticationOptions, generateRegistrationOptions, verifyAuthenticationResponse, verifyRegistrationResponse } from "@simplewebauthn/server";
import { getPrisma } from "@/lib/db/client";
import { json, newSession, preflight, publicUser, tooMany, userFrom } from "@/lib/destravando/conta";
import { b64u, putChallenge, rpOf, takeChallenge } from "@/lib/destravando/passkey";

export const runtime = "nodejs";
export const OPTIONS = preflight;

/**
 * 🔐 Entrar com Face ID / digital.
 * POST { etapa: "ativar-opcoes" }            (logado)  → opções pra criar a chave neste aparelho
 * POST { etapa: "ativar", resposta, device } (logado)  → guarda a chave
 * POST { etapa: "entrar-opcoes" }                      → opções pra entrar (qualquer chave do site)
 * POST { etapa: "entrar", id, resposta }               → confere e já entra (token + progresso)
 */
export async function POST(req: NextRequest) {
  const rp = rpOf(req);
  if (!rp) return json(req, { error: "Face ID só funciona pelo site do Destravando." }, 400);
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const p = getPrisma();
  const etapa = String(b.etapa ?? "");

  if (etapa === "ativar-opcoes" || etapa === "ativar") {
    const me = await userFrom(req);
    if (!me) return json(req, { error: "Entre de novo." }, 401);
    if (etapa === "ativar-opcoes") {
      const ja = await p.dtvPasskey.findMany({ where: { userId: me.user.id, rpId: rp.rpID } });
      const opts = await generateRegistrationOptions({
        rpName: "Destravando", rpID: rp.rpID, userID: me.user.id, userName: me.user.email, userDisplayName: me.user.name,
        attestationType: "none", excludeCredentials: ja.map((k) => ({ id: b64u.dec(k.credId), type: "public-key" as const })),
        authenticatorSelection: { residentKey: "required", userVerification: "preferred", authenticatorAttachment: "platform" },
      });
      putChallenge("reg:" + me.user.id, opts.challenge, me.user.id);
      return json(req, { opts });
    }
    const c = takeChallenge("reg:" + me.user.id);
    if (!c) return json(req, { error: "Demorou demais. Tente de novo." }, 400);
    try {
      const v = await verifyRegistrationResponse({ response: b.resposta as never, expectedChallenge: c.ch, expectedOrigin: rp.origin, expectedRPID: rp.rpID, requireUserVerification: false });
      if (!v.verified || !v.registrationInfo) return json(req, { error: "Não deu certo. Tente de novo." }, 400);
      const ri = v.registrationInfo;
      const tr = (b.resposta as { response?: { transports?: string[] } })?.response?.transports;
      await p.dtvPasskey.upsert({
        where: { credId: b64u.enc(ri.credentialID) },
        create: { userId: me.user.id, credId: b64u.enc(ri.credentialID), publicKey: b64u.enc(ri.credentialPublicKey), counter: ri.counter, transports: tr ? tr.join(",") : null, rpId: rp.rpID, device: String(b.device ?? "").slice(0, 80) || null },
        update: { publicKey: b64u.enc(ri.credentialPublicKey), counter: ri.counter },
      });
      return json(req, { ok: true });
    } catch (e) { console.error("[destravando] passkey ativar", String(e).slice(0, 200)); return json(req, { error: "Não deu certo. Tente de novo." }, 400); }
  }

  if (etapa === "entrar-opcoes") {
    if (tooMany(req, "passkey", 30, 900_000)) return json(req, { error: "Muitas tentativas. Espere uns minutos." }, 429);
    const opts = await generateAuthenticationOptions({ rpID: rp.rpID, userVerification: "preferred", allowCredentials: [] });
    const id = randomBytes(12).toString("base64url");
    putChallenge("auth:" + id, opts.challenge);
    return json(req, { id, opts });
  }

  if (etapa === "entrar") {
    const c = takeChallenge("auth:" + String(b.id ?? ""));
    if (!c) return json(req, { error: "Demorou demais. Tente de novo." }, 400);
    const r = b.resposta as { id?: string } | undefined;
    const k = r?.id ? await p.dtvPasskey.findUnique({ where: { credId: r.id }, include: { user: true } }) : null;
    if (!k || k.rpId !== rp.rpID) return json(req, { error: "Esse Face ID não está ligado a nenhuma conta. Entre com e-mail e senha e ative de novo." }, 400);
    try {
      const v = await verifyAuthenticationResponse({ response: r as never, expectedChallenge: c.ch, expectedOrigin: rp.origin, expectedRPID: rp.rpID, requireUserVerification: false,
        authenticator: { credentialID: b64u.dec(k.credId), credentialPublicKey: b64u.dec(k.publicKey), counter: k.counter, transports: k.transports ? (k.transports.split(",") as never) : undefined } });
      if (!v.verified) return json(req, { error: "Não deu certo. Tente de novo." }, 400);
      await p.dtvPasskey.update({ where: { id: k.id }, data: { counter: v.authenticationInfo.newCounter, lastUsedAt: new Date() } });
      await p.dtvUser.update({ where: { id: k.userId }, data: { lastSeenAt: new Date(), emailVerifiedAt: k.user.emailVerifiedAt ?? new Date() } });
      return json(req, { token: await newSession(k.userId), user: publicUser(k.user), progress: k.user.progress ?? null, progressAt: k.user.progressAt });
    } catch (e) { console.error("[destravando] passkey entrar", String(e).slice(0, 200)); return json(req, { error: "Não deu certo. Tente de novo." }, 400); }
  }
  return json(req, { error: "Etapa inválida." }, 400);
}
