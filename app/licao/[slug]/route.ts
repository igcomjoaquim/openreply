import { NextRequest, NextResponse } from "next/server";
import { autoResetDemo, isDemoStudent } from "@/lib/licao/demo";
import { getPrisma } from "@/lib/db/client";
import { HTML_HEADERS, cookieHeader, dayMonth, esc, monthLabel, page } from "@/lib/licao/html";
import { SKILLS, type Skill, studentLessons } from "@/lib/licao/summary";
import { spDay } from "@/lib/licao/streak";
import { STATUS_TABLE, gameOf, starsOf, statusOf } from "@/lib/licao/game";
import { reforcoIndex, studentDrill } from "@/lib/licao/drill";
import { skillPhases } from "@/lib/licao/skills";
import { studentStreak } from "@/lib/licao/streak";

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
  if (isDemoStudent(student.name)) await autoResetDemo(student.id);
  const rows = await studentLessons(student.id);
  // ?professor=1: o Thiago olhando pelo painel — nada conta e não grava o código no navegador
  const prof = _request.nextUrl.searchParams.get("professor") === "1";
  const q = prof ? "?professor=1" : "";
  const base = `/licao/${student.slug}`;
  const newest = rows[0];
  // Novo painel de status/medalhas/trajetória (Thiago 26/11): primeiro só no Aluno Teste (?novo=1 força)
  const NEW = true;
  const demoClean = true; // liberado pra todos 27/11 (Thiago: "atualiza tudo em todas as lições"); // 🧹 clean + evolução como principal (Thiago 27/11) — Aluno Teste primeiro // liberado pra todos em 26/11 (Thiago: "Libera pra todos")

  let hero = `<div class="hero-card"><p>A sua primeira lição ainda não chegou. Ela aparece aqui depois da próxima aula. 😉</p></div>`;
  if (newest) {
    const state = newest.graded
      ? `<span class="pill ok">✅ Feita · ${newest.graded.score.pct}%</span>`
      : newest.started ? `<span class="pill">⏳ Começou</span>` : `<span class="pill new">🆕 Nova</span>`;
    const cta = newest.graded ? "Ver meu feedback →" : newest.started ? "Continuar →" : "Começar →";
    const content = ((await getPrisma().lesson.findUnique({ where: { id: newest.id }, select: { content: true } }))?.content ?? {}) as { minutes?: number; review?: unknown; scene?: unknown };
    const minutes = Number(content.minutes) || 25;
    const parts = 8 + (content.review ? 1 : 0) + (content.scene ? 1 : 0);
    const doneParts = Math.min(parts, newest.partsDone);
    const where = !newest.graded && newest.started
      ? `<span class="hero-prog"><span class="small">${doneParts >= parts ? "Todas as fases feitas: falta só tocar em <b>Concluir</b> 🏁" : `Você parou na <b>fase ${doneParts + 1} de ${parts}</b>`}</span><span class="level-bar"><i style="width:${Math.round((doneParts / parts) * 100)}%"></i></span></span>`
      : "";
    hero = `<a class="hero-card" href="${base}/${newest.id}${q}">
  <span class="hero-top"><span class="eyebrow">${NEW ? "📌 Lição de casa · obrigatória" : "📌 Lição mais nova"}</span>${state}</span>
  <b class="hero-title">${esc(newest.title)}</b>
  ${newest.subject ? `<span class="hero-subject">📚 ${esc(newest.subject)}</span>` : ""}
  <span class="small">Aula de ${dayMonth(newest.date)} · ${parts} fases · uns ${minutes} minutos</span>
  ${where}
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

  // ---- jeito de jogo: nível, trilha de fases e medalhas ----
  // 🎯 Treinar meus erros (opcional, sem nota): só no painel novo por enquanto
  const drill = NEW ? await studentDrill(student.id, /^aluno teste/i.test(student.name.trim())) : null;
  const game = gameOf(rows, drill ? drill.mastered : undefined);
  // 🔥 ofensiva: dias seguidos estudando (lição, treino dos erros ou extra)
  const st = await studentStreak(student.id);
  const streakCard = rows.length
    ? `<section class="streak-card${st.today ? " on" : ""}"><span class="streak-fire">🔥</span><span class="streak-txt"><b>${st.days} ${st.days === 1 ? "dia seguido" : "dias seguidos"}</b><span class="small">${st.days === 0 ? "Comece hoje: faça uma fase, um treino ou uma extra." : st.today ? "Hoje já contou! Volte amanhã pra não perder a ofensiva." : "Faça qualquer coisa hoje (uma fase, um treino ou uma extra) pra não perder!"}${st.best > st.days ? ` · recorde: ${st.best}` : ""}</span></span></section>`
    : "";
  const levelCard = rows.length
    ? `<section class="lvl-card"><div class="lvl-top"><span class="lvl-badge">Nível ${game.level}</span><b>${esc(game.levelName)}</b><span class="xp">${game.xp} XP</span></div>
<div class="level-bar"><i style="width:${game.pctInLevel}%"></i></div>
<p class="small">${game.nextName ? `Faltam <b>${game.toNext} XP</b> para o nível ${game.level + 1} — ${esc(game.nextName)}. Cada lição dá XP; combos e a rodada bônus dão extra.` : "Você chegou no nível máximo! 🏆"}</p>${NEW ? `
<details class="how"><summary>❓ O que é o nível e como eu subo?</summary>
<p class="small">O <b>nível</b> mostra o quanto você já treinou. Ele <b>só sobe, nunca cai</b>: cada XP que você ganha fica com você.</p>
<ul class="small"><li>✅ Concluir uma lição: <b>+10 XP</b></li><li>⭐ Cada ponto que você faz nas fases: <b>+1 XP</b> (uma lição inteira dá uns 50)</li><li>🔥 Cada combo (3+ acertos seguidos): <b>+1 XP</b></li><li>⚡ Cada acerto na rodada bônus do fim: <b>+2 XP</b></li>${drill ? "<li>🎯 Cada erro corrigido no Treinar (opcional): <b>+3 XP</b></li>" : ""}</ul>
<ol class="ladder">${game.levels.map((l, i) => `<li class="${i + 1 === game.level ? "here" : i + 1 < game.level ? "past" : ""}"><b>${i + 1}. ${esc(l.name)}</b><span>${l.xp} XP</span></li>`).join("")}</ol></details>` : ""}</section>`
    : "";
  // 📊 status de desempenho: sobe e desce (diferente do nível)
  const status = statusOf(rows);
  const statusCard = NEW && rows.length
    ? `<section class="status-card ${status.tone}"><span class="eyebrow">📊 Seu status agora</span><b class="status-name">${status.icon} ${esc(status.name)}</b><p class="small">${esc(status.why)}</p><p class="status-next">👉 ${esc(status.next)}</p>
<details class="how"><summary>❓ Como funciona o status?</summary><p class="small">O status mostra <b>como você está indo agora</b>: ele <b>sobe e desce</b> conforme a nota das suas 3 últimas lições e se tem lição atrasada.</p><ul class="small">${STATUS_TABLE.map((t) => `<li>${t.icon} <b>${esc(t.name)}</b>: ${esc(t.rule)}</li>`).join("")}</ul></details></section>`
    : "";
  const statusMini = rows.length ? `<section class="card status-mini ${status.tone}"><b>${status.icon} ${esc(status.name)}</b>${status.avg !== null ? `<span>média ${status.avg}% nas últimas lições</span>` : ""}</section>` : "";
  const trailItems = rows.slice().reverse();
  const nextId = rows.find((r) => !r.graded)?.id;
  const trail = rows.length
    ? `<section class="card"><h2>🗺️ Sua trilha</h2><div class="trail">${trailItems
        .map((r, i) => {
          const st = r.graded ? starsOf(r.graded.score.pct) : 0;
          const cls = r.graded ? "done" : r.id === nextId ? "next" : "todo";
          const stars = r.graded ? ["", "⭐", "⭐⭐", "⭐⭐⭐"][st] : r.id === nextId ? "▶" : "🔸";
          return `<a class="node ${cls}" href="${base}/${r.id}${q}"><span class="dot">${i + 1}</span><span class="nstars">${stars}</span><span class="ndate">${dayMonth(r.date)}</span></a>`;
        })
        .join('<span class="link"></span>')}</div></section>`
    : "";
  const got = game.badges.filter((b) => b.got).length;
  const badges = rows.length
    ? `<section class="card"><h2>🏅 Medalhas <span class="small">${got} de ${game.badges.length}</span></h2><div class="badges">${game.badges
        .map((b) => NEW
          ? `<div class="badge ${b.got ? "got" : ""}"><span class="bi">${b.got ? b.icon : "🔒"}</span><b>${esc(b.name)}</b><span class="small">${b.got ? "✅ Conquistada!" : esc(b.how)}</span>${b.got ? "" : `<span class="b-bar"><i style="width:${Math.round((b.have / b.need) * 100)}%"></i></span><span class="b-count">${b.have} de ${b.need}</span>`}</div>`
          : `<div class="badge ${b.got ? "got" : ""}" title="${esc(b.desc)}"><span class="bi">${b.got ? b.icon : "🔒"}</span><b>${esc(b.name)}</b><span class="small">${esc(b.desc)}</span></div>`)
        .join("")}</div></section>`
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

  // 📊 trajetória: cada lição com a matéria e a nota, da mais antiga pra mais nova
  const trajectory = NEW && rows.length
    ? `<section class="card"><h2>📊 Sua trajetória</h2><p class="small">Cada linha é uma lição: o que você estudou e a nota que tirou. Dá pra ver se você está subindo! 📈</p>${rows
        .slice()
        .reverse()
        .map((r) => {
          const pct = r.graded ? r.graded.score.pct : null;
          const stars = pct === null ? "" : ["", "⭐", "⭐⭐", "⭐⭐⭐"][starsOf(pct)];
          return `<a class="traj-row" href="${base}/${r.id}${q}"><span class="traj-date">${dayMonth(r.date)}</span><span class="traj-main"><b>${esc(r.subject || r.title)}</b><span class="traj-bar"><i style="width:${pct ?? 0}%"></i></span></span><span class="traj-pct">${pct === null ? (r.started ? "⏳" : "—") : `${pct}% ${stars}`}</span></a>`;
        })
        .join("")}</section>`
    : "";

  const byMonth = new Map<string, string[]>();
  for (const r of rows) {
    const label = monthLabel(r.date);
    const old = r.id !== newest?.id;
    const status = r.graded
      ? `✅ ${r.graded.score.pct}%`
      : old ? (r.started ? "⏳ ficou no meio" : "❌ não fez") : r.started ? "⏳ no meio" : "🆕 nova";
    const link = r.graded ? "ver" : old ? "fazer agora" : r.started ? "continuar" : "começar";
    const li = `<a class="hist-row" href="${base}/${r.id}${q}"><span class="hist-date">${dayMonth(r.date)}</span><span class="hist-title">${esc(r.title)}${r.subject ? `<span class="hist-sub">📚 ${esc(r.subject)}</span>` : ""}</span><span class="hist-status">${status}</span><span class="hist-link">${link} →</span></a>`;
    byMonth.set(label, [...(byMonth.get(label) ?? []), li]);
  }
  const history = rows.length
    ? `<section class="card"><h2>🗂️ Minhas lições</h2>${[...byMonth.entries()].map(([m, items]) => `<h3 class="month">${m}</h3>${items.join("")}`).join("")}</section>`
    : "";

  const demo = /^aluno teste/i.test(student.name.trim());
  const resetBox = demo
    ? `<section class="card demo-reset"><h2>🧪 Aluno de demonstração</h2><p class="small">A lição nova volta a ficar zerada sozinha 20 minutos depois que a pessoa para de mexer. Pra zerar na hora, toque aqui (as lições antigas continuam).</p><form method="post" action="/api/licao/${student.slug}/reset"><button class="btn" type="submit">🔄 Zerar a lição nova</button></form>${_request.nextUrl.searchParams.has("zerado") ? `<p class="msg good">✅ Pronto, a lição nova está zerada.</p>` : ""}</section>`
    : "";
  const header = `<div class="bar"><div class="bar-row"><span class="brand"><span>Inglês com Joaquim</span></span><a class="small" href="/licao?sair=1">Não é você?</a></div></div>
  ${prof ? `<div class="viewnote">👀 <b>Modo professor:</b> você está vendo como ${esc(student.name)} vê. Nada do que você fizer aqui conta.</div>` : ""}
  <header><span class="hand">Hi, ${esc(student.name)}! 👋</span><h1>Minhas lições</h1></header>`;
  // 📱 Menu de abas (Thiago 26/11: "tem que ficar organizado, com menu"): barra fixa embaixo igual app
  const chips = rows.length
    ? `<a class="chips" href="#progresso" data-go="progresso"><span>${status.icon} ${esc(status.name)}</span>${demoClean ? "" : `<span>⭐ Nível ${game.level} · ${esc(game.levelName)}</span>`}<span>🏅 ${got} de ${game.badges.length}</span><span class="chips-go">ver meu progresso →</span></a>`
    : "";
  // ponto fraco (média das 3 últimas lições) pra começar o treino por ele
  const skAcc: Partial<Record<Skill, number[]>> = {};
  rows.filter((r) => r.graded).slice(0, 3).forEach((r) => SKILLS.forEach((k) => { const v = r.graded!.score.skills[k]; if (typeof v === "number") (skAcc[k] ??= []).push(v); }));
  const weakSkill = (Object.entries(skAcc) as [Skill, number[]][]).map(([k, v]) => [k, v.reduce((a, b) => a + b, 0) / v.length] as const).sort((a, b) => a[1] - b[1])[0]?.[0] ?? null;
  const homeworkPending = !!newest && !newest.graded;
  const drillLeft = drill ? drill.total - drill.mastered : 0;
  const drillCard = drill
    ? `<a class="extra-card" href="#treinar" data-go="treinar"><span class="extra-tag">✨ EXTRA · opcional · não vale nota</span><b>🎯 Treinar meus erros</b><span class="small">${drill.total === 0 ? "Quando você concluir lições, os seus erros aparecem aqui pra treinar." : drillLeft === 0 ? "🎉 Você corrigiu todos os seus erros! Volte depois da próxima lição." : `<b>${drillLeft} ${drillLeft === 1 ? "erro" : "erros"}</b> das lições que você já fez, pra treinar quando quiser.`}${homeworkPending ? " <b>Faça primeiro a lição de casa 👆</b>" : ""}</span><span class="extra-go">Treinar →</span></a>`
    : "";
  const drillPane = drill
    ? `<section class="extra-head"><span class="extra-tag">✨ EXTRA · opcional · não vale nota</span><h2>🎯 Treinar meus erros</h2>${demoClean ? `<p class="small">O que você errou nas lições, pra treinar até acertar.</p>` : `<p class="small">Aqui você treina <b>o que errou nas lições que já concluiu</b>. <b>Não é lição de casa</b>: é um extra pra quem quer treinar mais. Não muda nota nenhuma, mas dá XP e conta pros 🔥 dias seguidos.</p>`}${homeworkPending ? (demoClean ? `<p class="extra-warn">📌 Primeiro a lição de casa · <a href="#inicio" data-go="inicio">Ir pra lição →</a></p>` : `<p class="extra-warn">📌 Você ainda tem a <b>lição de casa</b> pra fazer. Ela é a prioridade! <a href="#inicio" data-go="inicio">Ir pra lição →</a></p>`) : ""}</section><div id="drill-app"></div>
<script>window.DRILL=${JSON.stringify({ slug: student.slug, prof, weak: weakSkill, today: spDay(), items: drill.items, wa: _request.nextUrl.searchParams.get("whats") !== "0", clean: demoClean, reforco: _request.nextUrl.searchParams.get("reforco") !== "0" ? reforcoIndex().map((r) => ({ id: r.id, title: r.title })) : [] }).replace(/</g, "\\u003c")};</script><script src="/licao/treinar.js?v=8" defer></script>`
    : "";
  // 🎚️ Seus níveis por habilidade (Thiago 27/11: "o aluno precisa ter a perspectiva da próxima fase") — Aluno Teste primeiro
  const sks = await skillPhases(student.id, undefined, /^aluno teste/i.test(student.name.trim()) ? (() => { const n = Number(_request.nextUrl.searchParams.get("nivel")); return n >= 1 && n <= 4 ? n : undefined; })() : undefined); // liberado pra todos 27/11
  const dots = (n: number) => "●●●●".slice(0, n) + "○○○○".slice(0, 4 - n);
  const niveisCard = sks
    ? `<section class="card niveis"><h2>🎚️ Seus níveis</h2><p class="small">🌱 → 🌿 → 🌳 → 🍎 · vá bem em 2 lições e evolua. Toque pra ver cada um.</p>
${sks.map((x) => { const f = x.fases[x.phase - 1], n = x.fases[x.phase]; return `<details class="nv-row"><summary><span class="nv-lab">${esc(x.label)}</span><span class="nv-cur">${f.icon} ${esc(f.name)}</span><span class="nv-dots">${dots(x.phase)}</span></summary>
<ol class="nv-steps">${x.fases.map((p, k) => `<li class="${k + 1 < x.phase ? "done" : k + 1 === x.phase ? "cur" : ""}"><b>${p.icon} ${esc(p.name)}</b><span>${esc(p.desc)}</span></li>`).join("")}</ol>
<p class="small">${n ? `Pra evoluir pra ${n.icon} ${esc(n.name)}: ${esc(x.rule.replace(/ em 2 lições seguidas/, ""))} em 2 lições.${x.streak ? " Falta 1! 🔥" : ""}` : "🏆 Evolução máxima!"}</p></details>`; }).join("")}</section>`
    : "";
  const tabs: [string, string, string, string][] = [
    ["inicio", "🏠", "Início", `${hero}${lateBox}${drillCard}${streakCard}${chips}`],
    ...(drill ? [["treinar", "🎯", "Treinar", drillPane] as [string, string, string, string]] : []),
    ["progresso", "📊", "Progresso", demoClean ? `${statusMini}${niveisCard}${trajectory}` : `${statusCard}${niveisCard}${levelCard}${trajectory}${progress}`],
    ["medalhas", "🏅", "Medalhas", badges || `<section class="card"><p class="small">As medalhas aparecem depois da sua primeira lição. 😉</p></section>`],
    ["licoes", "🗂️", "Lições", `${trail}${history}`],
  ];
  const body = NEW
    ? `<div class="wrap home tabbed">
  ${header}
  ${tabs.map(([id, , , html], i) => `<div class="pane${i === 0 ? " on" : ""}" data-pane="${id}">${html}</div>`).join("")}
  ${resetBox}
  <footer>Falou, validou! 🚀</footer>
</div>
<div class="menu-tip" id="menu-tip" hidden><b>👇 Novo! O seu menu fica aqui embaixo</b><span>Toque nos botões pra ver o seu 📊 progresso, as 🏅 medalhas, o 🎯 treino dos seus erros e 🗂️ todas as lições.</span><button type="button" id="menu-tip-ok">Entendi 👍</button></div>
<nav class="tabbar">${tabs.map(([id, icon, name], i) => `<a href="#${id}" data-go="${id}"${i === 0 ? ' class="on"' : ""}><span class="ti">${icon}${id === "treinar" && drillLeft > 0 ? `<span class="tb-badge">${drillLeft > 99 ? "99+" : drillLeft}</span>` : ""}</span><span class="tl">${name}</span></a>`).join("")}</nav>
<script>(function(){var K="licao-menu-visto-v1",tip=document.getElementById("menu-tip"),bar=document.querySelector(".tabbar");try{if(localStorage.getItem(K))return;}catch(e){}
tip.hidden=false;bar.classList.add("pulse");function ok(){tip.hidden=true;bar.classList.remove("pulse");try{localStorage.setItem(K,"1")}catch(e){}}
document.getElementById("menu-tip-ok").addEventListener("click",ok);bar.addEventListener("click",ok);})();</script>
<script>(function(){var ids=${JSON.stringify(tabs.map((t) => t[0]))};function show(id){if(ids.indexOf(id)<0)id=ids[0];document.querySelectorAll("[data-pane]").forEach(function(p){p.classList.toggle("on",p.dataset.pane===id)});document.querySelectorAll(".tabbar a").forEach(function(a){a.classList.toggle("on",a.dataset.go===id)});}
document.documentElement.classList.add("js");document.addEventListener("click",function(e){var a=e.target.closest("[data-go]");if(!a)return;e.preventDefault();var id=a.dataset.go;if(location.hash!=="#"+id)history.pushState(null,"",location.pathname+location.search+"#"+id);show(id);window.scrollTo(0,0);});
window.addEventListener("popstate",function(){show(location.hash.slice(1))});show(location.hash.slice(1));})();</script>`
    : `<div class="wrap home">
  ${header}
  ${hero}
  ${lateBox}
  ${streakCard}
  ${levelCard}
  ${trail}
  ${progress}
  ${badges}
  ${history}
  ${resetBox}
  <footer>Falou, validou! 🚀</footer>
</div>`;
  return new NextResponse(page(`Lições — ${student.name}`, body), { headers: prof ? HTML_HEADERS : { ...HTML_HEADERS, "Set-Cookie": cookieHeader(student.slug) } });
}
