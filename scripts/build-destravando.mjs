// Monta o site estático do Destravando (destravando.inglescomjoaquim.com) para o Cloudflare Pages.
// Uso: node scripts/build-destravando.mjs  → pasta dist-destravando/
// Raiz = Academia (treino); /aprender = trilha. Mesmos arquivos de public/academia e public/aprender.
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "dist-destravando");

// Progresso vindo do endereço antigo (aprender.inglescomjoaquim.com manda em #migrar=<base64 JSON>).
// Só grava o que ainda não existe aqui, pra nunca apagar progresso novo.
const MIGRAR = `<script>(function(){var h=location.hash;if(h.indexOf("#migrar=")!==0)return;try{var d=JSON.parse(decodeURIComponent(escape(atob(h.slice(8)))));for(var k in d){if(/^(aprender|academia):/.test(k)&&localStorage.getItem(k)===null)localStorage.setItem(k,d[k]);}}catch(e){}history.replaceState(null,"",location.pathname+location.search);})();</script>`;

function html(routeFile) {
  const src = readFileSync(join(root, routeFile), "utf8");
  const m = src.match(/const HTML = `([\s\S]*?)`;/);
  if (!m) throw new Error(`HTML não achado em ${routeFile}`);
  return m[1].replace("<script", MIGRAR + "<script");
}

rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, "aprender"), { recursive: true });
cpSync(join(root, "public/academia"), join(out, "academia"), { recursive: true });
cpSync(join(root, "public/aprender"), join(out, "aprender"), { recursive: true });
writeFileSync(join(out, "index.html"), html("app/academia/route.ts"));
writeFileSync(join(out, "aprender/index.html"), html("app/aprender/route.ts"));
// /academia antigo continua abrindo a Academia
mkdirSync(join(out, "academia"), { recursive: true });
writeFileSync(join(out, "academia/index.html"), html("app/academia/route.ts"));
writeFileSync(
  join(out, "_headers"),
  [
    "/*",
    "  X-Content-Type-Options: nosniff",
    "  Referrer-Policy: strict-origin-when-cross-origin",
    "  Permissions-Policy: microphone=(self)",
    "/",
    "  Cache-Control: public, max-age=60",
    "/index.html",
    "  Cache-Control: public, max-age=60",
    "/aprender/audio/*",
    "  Cache-Control: public, max-age=31536000, immutable",
    "/aprender/a2/audio/*",
    "  Cache-Control: public, max-age=31536000, immutable",
    "",
  ].join("\n")
);
console.log("ok:", out);
