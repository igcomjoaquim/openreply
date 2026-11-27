import { prisma } from "@/lib/db/client";
import { getCurrentWorkspaceContext } from "@/lib/workspace-access";

export const dynamic = "force-dynamic";

const DAY = 86_400_000;
function ago(d: Date | null): string {
  if (!d) return "—";
  const days = Math.floor((Date.now() - d.getTime()) / DAY);
  return days <= 0 ? "hoje" : days === 1 ? "ontem" : `há ${days} dias`;
}

/** 🔓 Leads e alunos do Destravando (produto público). Separado dos alunos particulares do homework. */
export default async function DestravandoLeadsPage() {
  const context = await getCurrentWorkspaceContext();
  if (!context) return null;
  const users = await prisma.dtvUser.findMany({ orderBy: { createdAt: "desc" }, take: 500 });
  const total = await prisma.dtvUser.count();
  const now = Date.now();
  const ativos7 = users.filter((u) => u.lastSeenAt && now - u.lastSeenAt.getTime() < 7 * DAY).length;
  const hoje = users.filter((u) => now - u.createdAt.getTime() < DAY).length;
  const optin = users.filter((u) => u.marketingOk).length;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">🔓 Destravando · leads e alunos</h1>
          <p className="text-sm text-muted">Quem se cadastrou na plataforma pública. Os alunos particulares ficam em Students.</p>
        </div>
        <a href="/api/destravando/leads" className="rounded-md bg-surface border border-border px-4 py-2 text-sm font-medium">⬇️ Baixar planilha (CSV)</a>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[["Cadastros", total], ["Novos hoje", hoje], ["Treinaram em 7 dias", ativos7], ["Aceitam novidades", optin]].map(([k, v]) => (
          <div key={String(k)} className="rounded-xl border border-border bg-surface p-4"><div className="text-sm text-muted">{k}</div><div className="text-2xl font-semibold">{v}</div></div>
        ))}
      </div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left">
            <tr>{["Nome", "E-mail", "WhatsApp", "Gênero", "Idade", "Cidade/UF", "Objetivo", "Como conheceu", "Achava · Teste", "Novidades", "Cadastro", "Último acesso"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-border">
                <td className="px-3 py-2">{u.name}</td>
                <td className="px-3 py-2">{u.email}</td>
                <td className="px-3 py-2">{u.whatsapp ? <a className="underline" href={`https://wa.me/${u.whatsapp.replace(/\D/g, "").replace(/^(?!55)/, "55")}`} target="_blank" rel="noreferrer">{u.whatsapp}</a> : "—"}</td>
                <td className="px-3 py-2">{u.gender ?? "—"}</td>
                <td className="px-3 py-2">{u.ageRange ?? "—"}</td>
                <td className="px-3 py-2">{[u.city, u.state].filter(Boolean).join("/") || "—"}</td>
                <td className="px-3 py-2">{u.goal ?? "—"}</td>
                <td className="px-3 py-2">{u.howFound ?? "—"}</td>
                <td className="px-3 py-2">{(u.selfLevel ?? "—") + " · " + (u.testLevel ?? "—")}</td>
                <td className="px-3 py-2">{u.marketingOk ? "✅" : "—"}</td>
                <td className="px-3 py-2">{ago(u.createdAt)}</td>
                <td className="px-3 py-2">{ago(u.lastSeenAt)}</td>
              </tr>
            ))}
            {!users.length && <tr><td colSpan={12} className="px-3 py-6 text-center text-muted">Ainda ninguém se cadastrou.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
