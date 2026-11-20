/**
 * Lista os posts agendados (e os publicados/falhos dos últimos 7 dias).
 *
 *   npx tsx scripts/listar-agendados.ts            lista
 *   npx tsx scripts/listar-agendados.ts --todos    lista tudo, sem limite de data
 *   npx tsx scripts/listar-agendados.ts --cancelar <id>
 *   npx tsx scripts/listar-agendados.ts --aprovar <id>
 *   --local  usa http://localhost:3000
 */
import { loadConfig, formatBrasilia } from "./lib/openreply-api";

interface Post {
  id: string;
  type: string;
  status: string;
  publishAt: string;
  caption: string;
  media: { name: string }[];
  error: string | null;
  permalink: string | null;
  approvedAt: string | null;
  instagramAccount: { username: string };
}

const STATUS: Record<string, string> = {
  PENDING: "agendado",
  PUBLISHING: "publicando agora",
  PUBLISHED: "publicado",
  FAILED: "FALHOU",
};

async function main() {
  const argv = process.argv.slice(2);
  const { baseUrl, secret } = loadConfig(argv.includes("--local"));
  const headers = { Authorization: `Bearer ${secret}` };

  const cancelAt = argv.indexOf("--cancelar");
  if (cancelAt !== -1) {
    const id = argv[cancelAt + 1];
    if (!id) throw new Error("Passe o id: --cancelar <id>");
    const response = await fetch(`${baseUrl}/api/scheduled-posts/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers,
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) throw new Error(`Não cancelou: ${data.error ?? response.status}`);
    console.log(`Cancelado: ${id} (arquivos apagados)`);
    return;
  }

  const approveAt = argv.indexOf("--aprovar");
  if (approveAt !== -1) {
    const id = argv[approveAt + 1];
    if (!id) throw new Error("Passe o id: --aprovar <id>");
    const response = await fetch(`${baseUrl}/api/scheduled-posts/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers,
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) throw new Error(`Não aprovou: ${data.error ?? response.status}`);
    console.log(`Aprovado: ${id} — sai no horário marcado (ou em até 1 minuto, se já passou)`);
    return;
  }

  const response = await fetch(
    `${baseUrl}/api/scheduled-posts${argv.includes("--todos") ? "?all=1" : ""}`,
    { headers }
  );
  const data = (await response.json().catch(() => ({}))) as { posts?: Post[]; error?: string };
  if (!response.ok || !data.posts) throw new Error(`Falha ao listar: ${data.error ?? response.status}`);

  if (data.posts.length === 0) {
    console.log("Nenhum post agendado.");
    return;
  }
  for (const post of data.posts) {
    const caption = post.caption.replace(/\s+/g, " ").slice(0, 60);
    const status =
      post.status === "PENDING" && !post.approvedAt
        ? "esperando OK"
        : (STATUS[post.status] ?? post.status);
    console.log(
      `${formatBrasilia(post.publishAt)}  ${post.type.padEnd(8)} ${status.padEnd(16)} @${post.instagramAccount.username}  id ${post.id}`
    );
    console.log(`    ${post.media.length} arquivo(s) · "${caption}${post.caption.length > 60 ? "…" : ""}"`);
    if (post.permalink) console.log(`    ${post.permalink}`);
    else if (post.status === "PENDING") console.log(`    conferir: ${baseUrl}/scheduled#post-${post.id}`);
    if (post.error) console.log(`    erro: ${post.error}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
