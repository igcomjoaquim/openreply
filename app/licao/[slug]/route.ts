import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db/client";
import { HTML_HEADERS, cookieHeader, dayMonth, esc, monthLabel, page } from "@/lib/licao/html";
import { SKILLS, type Skill, studentLessons } from "@/lib/licao/summary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

const SKILL_LABEL: Record<Skill, string> = { ouvir: "🎧 Ouvir", falar: "🎤 Falar", ler: "📖 Ler", escrever: "✍️ Escrever" };

/** O que fazer quando a habilidade é a mais fraca. */
const SKILL_TIP: Record<Skill, string> = {
  ouvir: "Antes de responder, ouça o ditado e a cena mais uma vez, pausando frase por frase. Quando as frases emendam é que o ouvido treina.",
  falar: "Faça o shadowing de novo, 3 minutos por dia: ouça a frase, repita igualzinho e grave. É o que mais destrava a fala.",
  ler: "Leia a fofoca em voz alta duas vezes antes de completar as lacunas. Ler em voz alta treina a leitura e a pronúncia juntas.",
  escrever: "Escreva 3 frases sobre o seu dia usando a gramática da lição. Pode ser no bloco de notas do celular mesmo.",
};

/** Linha pequena com a evolução de uma habilidade (0–100%). */
function spark(values: number[]): string {
  const w = 120, h = 32, pad = 4;
  if (values.length === 0) return "";
  const x = (i: number) => (values.length === 1 ? w / 2 : pad + (i * (w - 2 * pad)) / (values.length - 1));
  const lo = Math.max(0, Math.min(...values) - 15), hi = Math.min(100, Math.max(...values) + 5);
  const y = (v: number) => h - pad - ((v - lo) / Math.max(1, hi - lo)) * (h - 2 * pad);
  const pts = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const last = values.length - 1;
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true">
<line x1="0" x2="${w}" y1="${h - pad}" y2="${h - pad}" class="spark-grid"/>
${values.length > 1 ? `<polyline points="${pts}" class="spark-line"/>` : ""}
<circle cx="${x(last).toFixed(1)}" cy="${y(values[last]).toFixed(1)}" r="3.5" class="spark-dot"/></svg>`;
}

/**
 * Página do aluno: a lição nova em destaque, a evolução das 4 habilidades e
 * todas as lições anteriores, por mês.
 */
export async function GET(_request: NextRequest, { params }: Params) {
  const { slug } = await params;
  const student = /^[a-z0-9-]{3,40}$/.test(slug) ? await getPrisma().student.findUnique({ where: { slug } }) : null;
  if (!student) {
    return new NextResponse(page("Minhas lições", `<div class="wrap"><p class="loading">Código não encontrado. <a href="/licao?sair=1">Digitar o código de novo</a></p></div>`), { status: 404, headers: HTML_HEADERS });
  }
  const rows = await studentLessons(student.id);
  // ?professor=1: o Thiago olhando pelo painel — nada conta e não grava o código no navegador
  const prof = _request.nextUrl.searchParams.get("professor") === "1";
  const q = prof ? "?professor=1" : "";
  const base = `/licao/${student.slug}`;
  const newest = rows[0];

  let hero = `<div class="hero-card"><p>A sua primeira lição ainda não chegou. Ela aparece aqui depois da próxima aula. 😉</p></div>`;
  if (newest) {
    const state = newest.graded
      ? `<span class="pill ok">✅ Feita · ${newest.graded.score.pct}%</span>`
      : newest.started ? `<span class="pill">⏳ Começou</span>` : `<span class="pill new">🆕 Nova</span>`;
    const cta = newest.graded ? "Ver meu feedback →" : newest.started ? "Continuar →" : "Começar →";
    const minutes = Number(((await getPrisma().lesson.findUnique({ where: { id: newest.id }, select: { content: true } }))?.content as { minutes?: number })?.minutes) || 25;
    hero = `<a class="hero-card" href="${base}/${newest.id}${q}">
  <span class="hero-top"><span class="eyebrow">📌 Lição mais nova</span>${state}</span>
  <b class="hero-title">${esc(newest.title)}</b>
  <span class="small">Aula de ${dayMonth(newest.date)} · uns ${minutes} minutos</span>
  <span class="hero-cta">${cta}</span>
</a>`;
  }

  // Lições antigas que ficaram pra trás (a mais nova não conta: ela ainda está no prazo)
  const late = rows.slice(1).filter((r) => !r.graded);
  const lateBox = late.length
    ? `<section class="late"><span class="eyebrow">⏰ Ficou pra trás</span><b>${late.length === 1 ? "Você tem 1 lição atrasada" : `Você tem ${late.length} lições atrasadas`}</b><p class="small">Faça primeiro a lição mais nova. Depois, se der, recupere estas — cada uma treina o que vimos naquela aula.</p>${late
        .map((r) => `<a class="hist-row" href="${base}/${r.id}${q}"><span class="hist-date">${dayMonth(r.date)}</span><span class="hist-title">${esc(r.title)}</span><span class="hist-status">${r.started ? "⏳ no meio" : "❌ não fez"}</span><span class="hist-link">fazer →</span></a>`)
        .join("")}</section>`
    : "";

  const graded = rows.filter((r) => r.graded).slice().reverse(); // da mais antiga para a mais nova
  let progress = "";
  if (graded.length) {
    const lines = SKILLS.map((k) => {
      const vals = graded.map((r) => r.graded!.score.skills[k]).filter((v): v is number => typeof v === "number");
      if (!vals.length) return "";
      const lastV = vals[vals.length - 1];
      const delta = vals.length > 1 ? lastV - vals[vals.length - 2] : 0;
      const d = vals.length > 1 ? `<span class="delta ${delta >= 0 ? "up" : "down"}">${delta >= 0 ? "▲" : "▼"} ${Math.abs(delta)}</span>` : `<span class="delta"></span>`;
      return `<div class="skill-row"><span>${SKILL_LABEL[k]}</span><b>${lastV}%</b>${spark(vals)}${d}</div>`;
    }).join("");
    // habilidade mais fraca: média das 3 últimas lições
    const recent = graded.slice(-3);
    const avg = (k: Skill) => {
      const v = recent.map((r) => r.graded!.score.skills[k]).filter((x): x is number => typeof x === "number");
      return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null;
    };
    const ranked = SKILLS.map((k) => [k, avg(k)] as const).filter((x): x is readonly [Skill, number] => x[1] !== null).sort((a, b) => a[1] - b[1]);
    const weak = ranked[0];
    const linesMarked = weak ? lines.replace(`<span>${SKILL_LABEL[weak[0]]}</span>`, `<span>${SKILL_LABEL[weak[0]]}<span class="tag-focus">foco</span></span>`).replace(`<div class="skill-row"><span>${SKILL_LABEL[weak[0]]}<span class="tag-focus">`, `<div class="skill-row weak"><span>${SKILL_LABEL[weak[0]]}<span class="tag-focus">`) : lines;
    const focus = weak
      ? `<section class="focus"><span class="eyebrow">🎯 Seu foco agora</span><b class="big-skill">${SKILL_LABEL[weak[0]]} · ${recent.length > 1 ? "média " : ""}${weak[1]}%</b><p>É a habilidade que está mais difícil pra você${recent.length > 1 ? " nas últimas " + recent.length + " lições" : ""}. ${SKILL_TIP[weak[0]]}</p></section>`
      : "";
    progress = `${focus}<section class="card"><h2>📈 Sua evolução</h2><p class="small">Cada ponto é uma lição. A setinha compara com a lição anterior.</p>${linesMarked}</section>`;
  }

  const byMonth = new Map<string, string[]>();
  for (const r of rows) {
    const label = monthLabel(r.date);
    const old = r.id !== newest?.id;
    const status = r.graded
      ? `✅ ${r.graded.score.pct}%`
      : old ? (r.started ? "⏳ ficou no meio" : "❌ não fez") : r.started ? "⏳ no meio" : "🆕 nova";
    const link = r.graded ? "ver" : old ? "fazer agora" : r.started ? "continuar" : "começar";
    const li = `<a class="hist-row" href="${base}/${r.id}${q}"><span class="hist-date">${dayMonth(r.date)}</span><span class="hist-title">${esc(r.title)}</span><span class="hist-status">${status}</span><span class="hist-link">${link} →</span></a>`;
    byMonth.set(label, [...(byMonth.get(label) ?? []), li]);
  }
  const history = rows.length
    ? `<section class="card"><h2>🗂️ Minhas lições</h2>${[...byMonth.entries()].map(([m, items]) => `<h3 class="month">${m}</h3>${items.join("")}`).join("")}</section>`
    : "";

  const demo = /^aluno teste/i.test(student.name.trim());
  const resetBox = demo
    ? `<section class="card demo-reset"><h2>🧪 Aluno de demonstração</h2><p class="small">Depois de mostrar a lição pra alguém, zere aqui pra ela voltar a ficar nova (as lições antigas continuam).</p><form method="post" action="/api/licao/${student.slug}/reset"><button class="btn" type="submit">🔄 Zerar a lição nova</button></form>${_request.nextUrl.searchParams.has("zerado") ? `<p class="msg good">✅ Pronto, a lição nova está zerada.</p>` : ""}</section>`
    : "";
  const body = `<div class="wrap home">
  <div class="bar"><div class="bar-row"><span class="brand"><span>Inglês com Joaquim</span></span><a class="small" href="/licao?sair=1">Não é você?</a></div></div>
  ${prof ? `<div class="viewnote">👀 <b>Modo professor:</b> você está vendo como ${esc(student.name)} vê. Nada do que você fizer aqui conta.</div>` : ""}
  <header><span class="hand">Hi, ${esc(student.name)}! 👋</span><h1>Minhas lições</h1></header>
  ${hero}
  ${lateBox}
  ${progress}
  ${history}
  ${resetBox}
  <footer>Falou, validou! 🚀</footer>
</div>`;
  return new NextResponse(page(`Lições — ${student.name}`, body), { headers: prof ? HTML_HEADERS : { ...HTML_HEADERS, "Set-Cookie": cookieHeader(student.slug) } });
}
