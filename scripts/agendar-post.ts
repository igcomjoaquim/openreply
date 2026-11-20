/**
 * Agenda um post no Instagram pela API do OpenReply.
 *
 *   npx tsx scripts/agendar-post.ts --tipo reel --arquivo video.mp4 \
 *     --legenda-arquivo legenda.txt --quando "2026-11-20 18:30"
 *
 * Opções:
 *   --tipo reel|foto|carrossel
 *   --arquivo <caminho>        (repita para cada item do carrossel, na ordem)
 *   --legenda "<texto>"  ou  --legenda-arquivo <caminho.txt>
 *   --quando "AAAA-MM-DD HH:MM"  (horário de Brasília)
 *   --capa <imagem>            (Reel: capa própria)
 *   --capa-ms <milissegundos>  (Reel: quadro do vídeo usado como capa)
 *   --sem-feed                 (Reel: não aparece na grade do perfil)
 *   --conta <usuario>          (se houver mais de uma conta conectada)
 *   --local                    (usa http://localhost:3000 em vez do Railway)
 *
 * Lê OPENREPLY_URL e CRON_SECRET do .env (o segredo nunca é impresso).
 * PNG, HEIC e WEBP viram JPEG com o `sips` do macOS antes de subir.
 */
import { createReadStream, existsSync, mkdtempSync, readFileSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { loadConfig, brasiliaToIso, formatBrasilia } from "./lib/openreply-api";

type Args = Record<string, string[]>;

function parseArgs(argv: string[]): Args {
  const args: Args = {};
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    if (!key.startsWith("--")) throw new Error(`Argumento inesperado: ${key}`);
    const name = key.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) {
      (args[name] ??= []).push("true");
    } else {
      (args[name] ??= []).push(next);
      i++;
    }
  }
  return args;
}

const TYPES: Record<string, "REEL" | "IMAGE" | "CAROUSEL"> = {
  reel: "REEL",
  foto: "IMAGE",
  imagem: "IMAGE",
  carrossel: "CAROUSEL",
};

const VIDEO_EXT = new Set(["mp4", "mov"]);
const JPEG_EXT = new Set(["jpg", "jpeg"]);
const CONVERT_EXT = new Set(["png", "heic", "webp", "tif", "tiff"]);

let tempDir: string | undefined;

/** Returns a path Instagram accepts: JPEG for images, MP4/MOV for video. */
function prepare(file: string): { file: string; ext: string } {
  if (!existsSync(file)) throw new Error(`Arquivo não encontrado: ${file}`);
  const ext = path.extname(file).slice(1).toLowerCase();
  if (VIDEO_EXT.has(ext) || JPEG_EXT.has(ext)) return { file, ext };
  if (!CONVERT_EXT.has(ext)) {
    throw new Error(`Tipo de arquivo não aceito: ${file} (use jpg, png, mp4 ou mov)`);
  }
  tempDir ??= mkdtempSync(path.join(os.tmpdir(), "agendar-post-"));
  const out = path.join(tempDir, `${path.basename(file, path.extname(file))}-${Date.now()}.jpg`);
  execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "92", file, "--out", out], {
    stdio: "ignore",
  });
  return { file: out, ext: "jpg" };
}

function imageRatioWarning(file: string): string | null {
  try {
    const info = execFileSync("sips", ["-g", "pixelWidth", "-g", "pixelHeight", file]).toString();
    const width = Number(info.match(/pixelWidth: (\d+)/)?.[1]);
    const height = Number(info.match(/pixelHeight: (\d+)/)?.[1]);
    const ratio = width / height;
    if (ratio < 0.8 - 0.01 || ratio > 1.91 + 0.01) {
      return `${path.basename(file)} tem proporção ${width}x${height}; o Instagram aceita de 4:5 (vertical) a 1.91:1`;
    }
  } catch {
    // sips missing: Meta validates anyway.
  }
  return null;
}

async function upload(baseUrl: string, secret: string, file: string, ext: string) {
  const size = statSync(file).size;
  const response = await fetch(`${baseUrl}/api/media?ext=${ext}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/octet-stream",
      "Content-Length": String(size),
    },
    body: Readable.toWeb(createReadStream(file)) as unknown as BodyInit,
    duplex: "half",
  } as RequestInit);
  const data = (await response.json().catch(() => ({}))) as { name?: string; error?: string };
  if (!response.ok || !data.name) {
    throw new Error(`Falha ao subir ${path.basename(file)}: ${data.error ?? response.status}`);
  }
  return data.name;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const type = TYPES[(args.tipo?.[0] ?? "").toLowerCase()];
  if (!type) throw new Error("Use --tipo reel, foto ou carrossel");

  const files = args.arquivo ?? [];
  if (files.length === 0) throw new Error("Passe pelo menos um --arquivo");

  const caption = args["legenda-arquivo"]
    ? readFileSync(args["legenda-arquivo"][0], "utf8").trim()
    : (args.legenda?.[0] ?? "");

  if (!args.quando) throw new Error('Passe --quando "AAAA-MM-DD HH:MM" (horário de Brasília)');
  const publishAt = brasiliaToIso(args.quando[0]);

  if (new Date(publishAt).getTime() < Date.now()) {
    throw new Error("Esse horário já passou");
  }
  const kinds = files.map((file) =>
    VIDEO_EXT.has(path.extname(file).slice(1).toLowerCase()) ? "VIDEO" : "IMAGE"
  );
  if (type === "REEL" && (files.length !== 1 || kinds[0] !== "VIDEO")) {
    throw new Error("Reel leva exatamente um vídeo (mp4 ou mov)");
  }
  if (type === "IMAGE" && (files.length !== 1 || kinds[0] !== "IMAGE")) {
    throw new Error("Foto leva exatamente uma imagem");
  }
  if (type === "CAROUSEL" && (files.length < 2 || files.length > 10)) {
    throw new Error("Carrossel leva de 2 a 10 arquivos");
  }

  const { baseUrl, secret } = loadConfig(Boolean(args.local));

  const prepared = files.map(prepare);
  for (const item of prepared) {
    if (item.ext === "jpg" || item.ext === "jpeg") {
      const warning = imageRatioWarning(item.file);
      if (warning) console.warn(`Aviso: ${warning}`);
    }
  }
  const cover = args.capa ? prepare(args.capa[0]) : undefined;

  console.log(`Subindo ${prepared.length + (cover ? 1 : 0)} arquivo(s) para ${baseUrl} ...`);
  const media: string[] = [];
  for (const item of prepared) {
    media.push(await upload(baseUrl, secret, item.file, item.ext));
    console.log(`  ok ${path.basename(item.file)}`);
  }
  const coverName = cover ? await upload(baseUrl, secret, cover.file, cover.ext) : undefined;

  const response = await fetch(`${baseUrl}/api/scheduled-posts`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      type,
      media,
      caption,
      publishAt,
      coverName,
      thumbOffsetMs: args["capa-ms"] ? Number(args["capa-ms"][0]) : undefined,
      shareToFeed: args["sem-feed"] ? false : undefined,
      username: args.conta?.[0],
    }),
  });
  const data = (await response.json().catch(() => ({}))) as {
    post?: { id: string; publishAt: string };
    error?: string;
  };
  if (!response.ok || !data.post) {
    // Files already uploaded stay orphaned only until the next cancel/cleanup.
    for (const name of [...media, ...(coverName ? [coverName] : [])]) {
      await fetch(`${baseUrl}/api/media/${name}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${secret}` },
      }).catch(() => undefined);
    }
    throw new Error(`Não agendou: ${data.error ?? response.status}`);
  }

  console.log(
    `Agendado! id ${data.post.id} — ${type} sai em ${formatBrasilia(data.post.publishAt)} (Brasília)`
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
