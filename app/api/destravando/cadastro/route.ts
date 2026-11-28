import { type NextRequest } from "next/server";
import { Prisma } from "@/app/generated/prisma/client";
import { getPrisma } from "@/lib/db/client";
import { clean, hashPassword, issueVerify, json, newSession, normEmail, preflight, publicUser, sendWelcome, tooMany } from "@/lib/destravando/conta";

export const runtime = "nodejs";
export const OPTIONS = preflight;

const GENDERS = ["Mulher", "Homem", "Não-binário", "Prefiro não dizer", "Outro"];
const AGES = ["Até 17", "18 a 24", "25 a 34", "35 a 44", "45 a 54", "55 ou mais"];

/** Cadastro = lead: cria a conta, guarda o progresso do aparelho e manda o código de 6 números.
 *  Só entra depois de confirmar o e-mail (Thiago 28/11: "todo lugar é assim, passa mais credibilidade"). */
export async function POST(req: NextRequest) {
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const email = normEmail(b.email), name = clean(b.name, 80), pw = typeof b.password === "string" ? b.password : "";
  if (!name) return json(req, { error: "Escreva o seu nome." }, 400);
  if (!email) return json(req, { error: "Confira o seu e-mail." }, 400);
  if (pw.length < 6 || pw.length > 100) return json(req, { error: "A senha precisa ter pelo menos 6 caracteres." }, 400);
  if (b.consent !== true) return json(req, { error: "Pra criar a conta, aceite a política de privacidade." }, 400);
  // só conta tentativa válida (quem erra o e-mail não fica bloqueado); 15/h por IP aguenta um Wi-Fi compartilhado
  if (tooMany(req, "cadastro", 15, 3_600_000)) return json(req, { error: "Muitas contas criadas desta conexão. Tente de novo em alguns minutos." }, 429);
  const whatsapp = clean(b.whatsapp, 30)?.replace(/[^\d+]/g, "") || null;
  const gender = GENDERS.includes(String(b.gender)) ? String(b.gender) : clean(b.gender, 40);
  const ageRange = AGES.includes(String(b.ageRange)) ? String(b.ageRange) : null;
  const progress = b.progress && typeof b.progress === "object" ? (b.progress as Prisma.InputJsonValue) : undefined;
  // já se cadastrou mas não confirmou o e-mail: atualiza os dados e manda outro código (não trava quem perdeu o primeiro)
  // transição: só o app novo manda "confirma: true" (o app antigo, ainda aberto em algum celular, segue entrando direto)
  const confirma = b.confirma === true;
  const old = confirma ? await getPrisma().dtvUser.findUnique({ where: { email } }) : null;
  if (old && !old.emailVerifiedAt) {
    // segurança: não troca senha nem dados de uma conta que ninguém confirmou ainda (só manda outro código)
    const st = await issueVerify(old);
    return json(req, { verify: true, email: old.email, mail: st, again: true });
  }
  try {
    const u = await getPrisma().dtvUser.create({
      data: {
        email, name, passwordHash: await hashPassword(pw), whatsapp, gender, ageRange,
        country: clean(b.country, 60), state: clean(b.state, 60), city: clean(b.city, 80), goal: clean(b.goal, 60), howFound: clean(b.howFound, 60),
        selfLevel: clean(b.selfLevel, 40), testLevel: clean(b.testLevel, 40), marketingOk: b.marketingOk === true,
        progress, progressAt: progress ? new Date() : null, lastSeenAt: new Date(),
      },
    });
    if (!confirma) {
      await getPrisma().dtvUser.update({ where: { id: u.id }, data: { emailVerifiedAt: new Date() } });
      sendWelcome(u.email, u.name).catch((err) => console.error("[destravando] boas-vindas", String(err).slice(0, 200)));
      return json(req, { token: await newSession(u.id), user: publicUser(u) });
    }
    // o e-mail de boas-vindas vai depois de confirmar (rota confirmar)
    const st = await issueVerify(u);
    return json(req, { verify: true, email: u.email, mail: st });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return json(req, { error: "Esse e-mail já tem conta. Toque em Entrar.", exists: true }, 409);
    throw e;
  }
}
