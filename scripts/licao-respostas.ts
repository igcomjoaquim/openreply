/**
 * Lições feitas pelos alunos (para a rotina das aulas).
 *
 *   npx tsx scripts/licao-respostas.ts [--pendentes] [--desde 2026-11-24] [--local]
 *       → imprime JSON: notas por parte, o que o aluno falou (transcrição),
 *         o texto que escreveu e o link de cada gravação.
 *   npx tsx scripts/licao-respostas.ts --apagar-aluno <slug> [--local] → apaga um código sem lição concluída
 *   npx tsx scripts/licao-respostas.ts --apagar <id> [--local]   → apaga uma tentativa (teste)
 *   npx tsx scripts/licao-respostas.ts --corrigir <id> --arquivo correcao.json [--local]
 *       → guarda a correção ({summary, writing[], speaking[], pronunciation[]});
 *         o aluno vê ao voltar no link.
 */
import { readFileSync } from "node:fs";
import { loadConfig } from "./lib/openreply-api";

function args(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    const v = argv[i + 1];
    if (v === undefined || v.startsWith("--")) out[k.slice(2)] = "true";
    else { out[k.slice(2)] = v; i++; }
  }
  return out;
}

async function main() {
  const a = args(process.argv.slice(2));
  const { baseUrl, secret } = loadConfig(a.local === "true");
  const auth = { authorization: `Bearer ${secret}` };
  if (a["apagar-aluno"]) {
    const res = await fetch(`${baseUrl}/api/licao-admin/students/${encodeURIComponent(a["apagar-aluno"])}`, { method: "DELETE", headers: auth });
    console.log(res.ok ? `Código apagado: ${JSON.stringify(await res.json())}` : `Erro ${res.status}: ${await res.text()}`);
    return;
  }
  if (a.apagar) {
    const res = await fetch(`${baseUrl}/api/licao-admin/attempts/${encodeURIComponent(a.apagar)}`, { method: "DELETE", headers: auth });
    console.log(res.ok ? `Apagada: ${JSON.stringify(await res.json())}` : `Erro ${res.status}`);
    return;
  }
  if (a.corrigir) {
    if (!a.arquivo) throw new Error("Falta --arquivo");
    const res = await fetch(`${baseUrl}/api/licao-admin/attempts/${encodeURIComponent(a.corrigir)}/review`, {
      method: "POST",
      headers: { ...auth, "content-type": "application/json" },
      body: readFileSync(a.arquivo, "utf8"),
    });
    console.log(res.ok ? "Correção salva." : `Erro ${res.status}: ${await res.text()}`);
    if (!res.ok) process.exit(1);
    return;
  }
  const q = new URLSearchParams();
  if (a.pendentes === "true") q.set("pending", "1");
  if (a.desde) q.set("since", new Date(`${a.desde}T00:00:00-03:00`).toISOString());
  const res = await fetch(`${baseUrl}/api/licao-admin/attempts?${q}`, { headers: auth });
  if (!res.ok) throw new Error(`Erro ${res.status}`);
  console.log(JSON.stringify(await res.json(), null, 2));
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
