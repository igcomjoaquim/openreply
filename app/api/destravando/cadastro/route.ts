import { type NextRequest } from "next/server";
import { Prisma } from "@/app/generated/prisma/client";
import { getPrisma } from "@/lib/db/client";
import { clean, hashPassword, json, newSession, normEmail, preflight, publicUser, sendWelcome, tooMany } from "@/lib/destravando/conta";

export const runtime = "nodejs";
export const OPTIONS = preflight;

const GENDERS = ["Mulher", "Homem", "Não-binário", "Prefiro não dizer", "Outro"];
const AGES = ["Até 17", "18 a 24", "25 a 34", "35 a 44", "45 a 54", "55 ou mais"];

/** Cadastro = lead: cria a conta, já entra e guarda o progresso que estava no aparelho. */
export async function POST(req: NextRequest) {
  if (tooMany(req, "cadastro", 8, 3_600_000)) return json(req, { error: "Muitas tentativas. Tente de novo daqui a pouco." }, 429);
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const email = normEmail(b.email), name = clean(b.name, 80), pw = typeof b.password === "string" ? b.password : "";
  if (!name) return json(req, { error: "Escreva o seu nome." }, 400);
  if (!email) return json(req, { error: "Confira o seu e-mail." }, 400);
  if (pw.length < 6 || pw.length > 100) return json(req, { error: "A senha precisa ter pelo menos 6 caracteres." }, 400);
  if (b.consent !== true) return json(req, { error: "Pra criar a conta, aceite a política de privacidade." }, 400);
  const whatsapp = clean(b.whatsapp, 30)?.replace(/[^\d+]/g, "") || null;
  const gender = GENDERS.includes(String(b.gender)) ? String(b.gender) : clean(b.gender, 40);
  const ageRange = AGES.includes(String(b.ageRange)) ? String(b.ageRange) : null;
  const progress = b.progress && typeof b.progress === "object" ? (b.progress as Prisma.InputJsonValue) : undefined;
  try {
    const u = await getPrisma().dtvUser.create({
      data: {
        email, name, passwordHash: await hashPassword(pw), whatsapp, gender, ageRange,
        state: clean(b.state, 2), city: clean(b.city, 80), goal: clean(b.goal, 60), howFound: clean(b.howFound, 60),
        selfLevel: clean(b.selfLevel, 40), testLevel: clean(b.testLevel, 40), marketingOk: b.marketingOk === true,
        progress, progressAt: progress ? new Date() : null, lastSeenAt: new Date(),
      },
    });
    // boas-vindas por e-mail: se falhar, não atrapalha o cadastro (fica só no log)
    sendWelcome(u.email, u.name).catch((err) => console.error("[destravando] boas-vindas", String(err).slice(0, 200)));
    return json(req, { token: await newSession(u.id), user: publicUser(u) });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return json(req, { error: "Esse e-mail já tem conta. Toque em Entrar.", exists: true }, 409);
    throw e;
  }
}
