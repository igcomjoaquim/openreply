/**
 * Publica a lição de um aluno no link fixo dele (/licao/<slug>).
 *
 *   npx tsx scripts/licao-publicar.ts --aluno "Maria" --notion <id-da-ficha> \
 *     --data 2026-11-24 --titulo "Lição de 24/11" --conteudo licao.json [--slug maria-a1b2c3] [--local]
 *
 * No licao.json os áudios são caminhos de arquivos (relativos ao próprio json),
 * ex.: "audio": "ditado.mp3". O script sobe cada um e troca pelo nome no
 * servidor. Imprime o link fixo do aluno (sempre o mesmo para ele).
 *
 * --turma "Turma 1": aluno de turma/dupla (rode uma vez por integrante, cada um com o próprio --aluno/--slug).
 * --substituir <id-da-lição>: troca o conteúdo de uma lição já publicada (só se ninguém concluiu).
 *
 * Lê OPENREPLY_URL e CRON_SECRET do .env (o segredo nunca é impresso).
 */
import { createReadStream, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { loadConfig } from "./lib/openreply-api";

function args(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (!k.startsWith("--")) throw new Error(`Argumento inesperado: ${k}`);
    const v = argv[i + 1];
    if (v === undefined || v.startsWith("--")) out[k.slice(2)] = "true";
    else { out[k.slice(2)] = v; i++; }
  }
  return out;
}

async function main() {
  const a = args(process.argv.slice(2));
  for (const req of ["aluno", "data", "titulo", "conteudo"]) {
    if (!a[req]) throw new Error(`Falta --${req}`);
  }
  const { baseUrl, secret } = loadConfig(a.local === "true");
  const jsonPath = path.resolve(a.conteudo);
  const dir = path.dirname(jsonPath);
  const content = JSON.parse(readFileSync(jsonPath, "utf8"));

  const uploaded = new Map<string, string>();
  async function up(file: string): Promise<string> {
    if (/^[a-f0-9]{32}\.(mp3|m4a)$/.test(file)) return file;
    const full = path.resolve(dir, file);
    if (uploaded.has(full)) return uploaded.get(full)!;
    const ext = path.extname(full).slice(1).toLowerCase();
    if (ext !== "mp3" && ext !== "m4a") throw new Error(`Áudio precisa ser mp3 ou m4a: ${file}`);
    const size = statSync(full).size;
    const res = await fetch(`${baseUrl}/api/licao-admin/audio?ext=${ext}`, {
      method: "POST",
      headers: { authorization: `Bearer ${secret}`, "content-length": String(size) },
      body: Readable.toWeb(createReadStream(full)) as unknown as BodyInit,
      duplex: "half",
    } as RequestInit);
    const body = (await res.json()) as { name?: string; error?: string };
    if (!res.ok || !body.name) throw new Error(`Falha ao subir ${file}: ${body.error ?? res.status}`);
    uploaded.set(full, body.name);
    return body.name;
  }

  content.dictation.audio = await up(content.dictation.audio);
  content.gossip.audio = await up(content.gossip.audio);
  for (const s of content.shadowing) {
    s.audio = await up(s.audio);
    s.slow = await up(s.slow);
  }

  if (a.substituir) {
    const r = await fetch(`${baseUrl}/api/licao-admin/lessons/${encodeURIComponent(a.substituir)}`, {
      method: "PUT",
      headers: { authorization: `Bearer ${secret}`, "content-type": "application/json" },
      body: JSON.stringify({ title: a.titulo, content }),
    });
    const out = await r.json();
    if (!r.ok) {
      console.error("Erro:", JSON.stringify(out));
      process.exit(1);
    }
    console.log(`Lição ${a.substituir} substituída (${uploaded.size} áudios novos).`);
    return;
  }

  const res = await fetch(`${baseUrl}/api/licao-admin/lessons`, {
    method: "POST",
    headers: { authorization: `Bearer ${secret}`, "content-type": "application/json" },
    body: JSON.stringify({
      studentName: a.aluno,
      slug: a.slug,
      notionId: a.notion,
      group: a.turma,
      date: a.data,
      title: a.titulo,
      content,
    }),
  });
  const body = (await res.json()) as { url?: string; slug?: string; error?: string; issues?: unknown; missing?: string[] };
  if (!res.ok) {
    console.error("Erro:", body.error, JSON.stringify(body.issues ?? body.missing ?? "", null, 1));
    process.exit(1);
  }
  console.log(`Lição publicada (${uploaded.size} áudios).`);
  console.log(`Link fixo do aluno: ${body.url}`);
  console.log(`Slug: ${body.slug}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
