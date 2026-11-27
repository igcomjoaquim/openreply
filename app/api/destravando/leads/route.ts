import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/db/client";

export const runtime = "nodejs";

/** 📋 Leads do Destravando em CSV (abre no Excel/Google Planilhas). Só pra quem está logado no painel. */
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Entre no painel." }, { status: 401 });
  const rows = await getPrisma().dtvUser.findMany({ orderBy: { createdAt: "desc" } });
  const cols = ["Cadastro", "Nome", "E-mail", "WhatsApp", "Gênero", "Idade", "Estado", "Cidade", "Objetivo", "Como conheceu", "Nível que achava", "Nível do teste", "Aceita novidades", "Último acesso"];
  const q = (v: unknown) => '"' + String(v ?? "").replace(/"/g, '""') + '"';
  const d = (x: Date | null) => (x ? x.toISOString().slice(0, 16).replace("T", " ") : "");
  const lines = [cols.map(q).join(";")].concat(rows.map((r) => [d(r.createdAt), r.name, r.email, r.whatsapp, r.gender, r.ageRange, r.state, r.city, r.goal, r.howFound, r.selfLevel, r.testLevel, r.marketingOk ? "sim" : "não", d(r.lastSeenAt)].map(q).join(";")));
  return new NextResponse("﻿" + lines.join("\n"), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="leads-destravando.csv"', "Cache-Control": "no-store" } });
}
