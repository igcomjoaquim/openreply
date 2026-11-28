import { prisma } from "@/lib/db/client";
import { getCurrentWorkspaceContext } from "@/lib/workspace-access";

export const dynamic = "force-dynamic";

const DAY = 86_400_000;
function ago(d: Date | null): string {
  if (!d) return "—";
  const days = Math.floor((Date.now() - d.getTime()) / DAY);
  return days <= 0 ? "hoje" : days === 1 ? "ontem" : `há ${days} dias`;
}
function agoStr(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso + "T12:00:00");
  return isNaN(d.getTime()) ? "—" : ago(d);
}
function when(d: Date): string {
  return d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

/** Resumo do progresso guardado na conta (o mesmo objeto do aparelho). */
type P = Record<string, unknown>;
const EVO: [string, string][] = [["ouvido", "🎧"], ["ditado", "✍️"], ["lacunas", "🧩"], ["fofoca", "🕵️"], ["reconto", "🎤"], ["leitura", "🗣️"], ["rt", "⚡"]];
const STAGE = ["", "🌱", "🌿", "🌳", "🍎"];
function resumo(raw: unknown) {
  const p = (raw && typeof raw === "object" ? raw : {}) as P;
  const days = Array.isArray(p.days) ? (p.days as string[]).filter((x) => typeof x === "string").sort() : [];
  // ofensiva: dias seguidos terminando hoje ou ontem
  let streak = 0;
  if (days.length) {
    const set = new Set(days);
    const d = new Date();
    const key = (x: Date) => x.toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
    if (!set.has(key(d))) d.setDate(d.getDate() - 1);
    while (set.has(key(d))) { streak++; d.setDate(d.getDate() - 1); }
  }
  const done = (p.done && typeof p.done === "object" ? p.done : {}) as Record<string, { n?: number }>;
  const fases = Object.values(done).reduce((a, r) => a + (typeof r?.n === "number" ? r.n : 0), 0);
  const evo = (p.evo && typeof p.evo === "object" ? p.evo : {}) as Record<string, { phase?: number }>;
  const evoTxt = EVO.filter(([k]) => evo[k]?.phase).map(([k, e]) => e + (STAGE[evo[k].phase ?? 0] ?? "")).join(" ");
  const nivel = p.level === "a2" ? "A2" : "A1";
  const tema = typeof p.theme === "number" ? p.theme + 1 : 1;
  const temaNome = typeof p.temaNome === "string" ? p.temaNome : "";
  const erros = Array.isArray(p.errors) ? p.errors.length : 0;
  return {
    nivelTema: p.test || fases ? `${nivel} · tema ${tema}${temaNome ? " " + temaNome : ""}` : "ainda não começou",
    xp: typeof p.xp === "number" ? p.xp : 0,
    diasTreinados: days.length,
    streak,
    ultimoTreino: days.length ? agoStr(days[days.length - 1]) : "—",
    fases,
    evoTxt: evoTxt || "—",
    erros,
  };
}

/** 🔓 Leads e alunos do Destravando (produto público). Separado dos alunos particulares do homework. */
export default async function DestravandoLeadsPage() {
  const context = await getCurrentWorkspaceContext();
  if (!context) return null;
  const users = await prisma.dtvUser.findMany({ orderBy: { createdAt: "desc" }, take: 500 });
  const total = await prisma.dtvUser.count();
  const feedbacks = await prisma.dtvFeedback.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  const now = Date.now();
  const ativos7 = users.filter((u) => u.lastSeenAt && now - u.lastSeenAt.getTime() < 7 * DAY).length;
  const hoje = users.filter((u) => now - u.createdAt.getTime() < DAY).length;
  const optin = users.filter((u) => u.marketingOk).length;
  const rows = users.map((u) => ({ u, r: resumo(u.progress) }));
  const treinaram = rows.filter((x) => x.r.fases > 0).length;
  const cell = "px-3 py-2 whitespace-nowrap";
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">🔓 Destravando · alunos, progresso e mensagens</h1>
          <p className="text-sm text-muted">Quem se cadastrou na plataforma pública. Os alunos particulares ficam em Students.</p>
        </div>
        <a href="/api/destravando/leads" className="rounded-md bg-surface border border-border px-4 py-2 text-sm font-medium">⬇️ Baixar planilha (CSV)</a>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {[["Cadastros", total], ["Novos hoje", hoje], ["Já treinaram", treinaram], ["Treinaram em 7 dias", ativos7], ["Aceitam novidades", optin]].map(([k, v]) => (
          <div key={String(k)} className="rounded-xl border border-border bg-surface p-4"><div className="text-sm text-muted">{k}</div><div className="text-2xl font-semibold">{v}</div></div>
        ))}
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">💬 Mensagens dos alunos ({feedbacks.length})</h2>
        {feedbacks.length ? (
          <div className="space-y-2">
            {feedbacks.map((f) => (
              <div key={f.id} className="rounded-xl border border-border bg-surface p-4">
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
                  <span>{when(f.createdAt)}</span>
                  <span className="font-medium">{f.name ?? "Sem nome"}</span>
                  {f.email && <span>{f.email}</span>}
                  {f.device && <span>📱 {f.device}</span>}
                  {f.screen && <span>📍 {f.screen}</span>}
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm">{f.text}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">Ninguém mandou mensagem ainda. O botão “Achou um problema?” fica na lateral de toda tela da plataforma.</p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">📊 Progresso</h2>
        <p className="text-sm text-muted">Evolução: 🎧 ouvido · ✍️ ditado · 🧩 lacunas · 🕵️ fofoca · 🎤 reconto · 🗣️ leitura · ⚡ Real Time, cada uma em 🌱 → 🌿 → 🌳 → 🍎.</p>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left">
              <tr>{["Nome", "Onde está", "Fases feitas", "XP", "Dias treinados", "🔥 Seguidos", "Último treino", "Evolução", "Erros pra rever", "Achava · Teste"].map((h) => <th key={h} className="px-3 py-2 font-medium whitespace-nowrap">{h}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map(({ u, r }) => (
                <tr key={u.id} className="border-t border-border">
                  <td className={cell}>{u.name}</td>
                  <td className={cell}>{r.nivelTema}</td>
                  <td className={cell}>{r.fases}</td>
                  <td className={cell}>{r.xp}</td>
                  <td className={cell}>{r.diasTreinados}</td>
                  <td className={cell}>{r.streak}</td>
                  <td className={cell}>{r.ultimoTreino}</td>
                  <td className={cell}>{r.evoTxt}</td>
                  <td className={cell}>{r.erros}</td>
                  <td className={cell}>{(u.selfLevel ?? "—") + " · " + (u.testLevel ?? "—")}</td>
                </tr>
              ))}
              {!users.length && <tr><td colSpan={10} className="px-3 py-6 text-center text-muted">Ainda ninguém se cadastrou.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">📇 Cadastros</h2>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left">
              <tr>{["Nome", "E-mail", "WhatsApp", "Gênero", "Idade", "Cidade · País", "Objetivo", "Como conheceu", "Novidades", "Cadastro", "Último acesso"].map((h) => <th key={h} className="px-3 py-2 font-medium whitespace-nowrap">{h}</th>)}</tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-border">
                  <td className="px-3 py-2">{u.name}</td>
                  <td className="px-3 py-2">{u.email}</td>
                  <td className="px-3 py-2">{u.whatsapp ? <a className="underline" href={`https://wa.me/${u.whatsapp.startsWith("+") ? u.whatsapp.replace(/\D/g, "") : u.whatsapp.replace(/\D/g, "").replace(/^(?!55)/, "55")}`} target="_blank" rel="noreferrer">{u.whatsapp}</a> : "—"}</td>
                  <td className="px-3 py-2">{u.gender ?? "—"}</td>
                  <td className="px-3 py-2">{u.ageRange ?? "—"}</td>
                  <td className="px-3 py-2">{[[u.city, u.state].filter(Boolean).join("/"), u.country && u.country !== "Brasil" ? u.country : ""].filter(Boolean).join(" · ") || "—"}</td>
                  <td className="px-3 py-2">{u.goal ?? "—"}</td>
                  <td className="px-3 py-2">{u.howFound ?? "—"}</td>
                  <td className="px-3 py-2">{u.marketingOk ? "✅" : "—"}</td>
                  <td className="px-3 py-2">{ago(u.createdAt)}</td>
                  <td className="px-3 py-2">{ago(u.lastSeenAt)}</td>
                </tr>
              ))}
              {!users.length && <tr><td colSpan={11} className="px-3 py-6 text-center text-muted">Ainda ninguém se cadastrou.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
