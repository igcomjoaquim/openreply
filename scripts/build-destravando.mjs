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
// 📲 app instalável: o service worker precisa morar na raiz pra valer pro site todo.
// Ele NÃO guarda páginas em cache (assim toda atualização chega na hora); só existe pra o celular oferecer "Instalar".
writeFileSync(join(out, "sw.js"), `self.addEventListener("install", function () { self.skipWaiting(); });
self.addEventListener("activate", function (e) { e.waitUntil(self.clients.claim()); });
self.addEventListener("fetch", function () {});
`);
// política de privacidade na raiz (link do cadastro)
cpSync(join(root, "public/academia/privacidade.html"), join(out, "privacidade.html"));
// 🔐 /api/* do Destravando → servidor do projeto (contas, leads, progresso). O aluno só vê o endereço do Destravando.
writeFileSync(
  join(out, "_worker.js"),
  `const BACK = "https://homework.inglescomjoaquim.com/api/destravando";
export default {
  async fetch(req, env) {
    const u = new URL(req.url);
    if (u.pathname.startsWith("/api/")) {
      const h = new Headers(req.headers);
      h.delete("host"); h.delete("cookie");
      h.set("x-forwarded-for", req.headers.get("cf-connecting-ip") || "");
      h.set("x-dtv-ip", req.headers.get("cf-connecting-ip") || ""); h.set("x-dtv-key", (env && env.DTV_PROXY_KEY) || ""); // o servidor só confia no IP com a chave
      const r = await fetch(BACK + u.pathname.slice(4) + u.search, {
        method: req.method, headers: h, redirect: "manual",
        body: req.method === "GET" || req.method === "HEAD" ? undefined : await req.arrayBuffer(),
      });
      const rh = new Headers(r.headers); rh.set("Cache-Control", "no-store");
      return new Response(r.body, { status: r.status, headers: rh });
    }
    return env.ASSETS.fetch(req);
  },
};
`
);
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
    "/sw.js",
    "  Cache-Control: no-cache",
    "/aprender/audio/*",
    "  Cache-Control: public, max-age=31536000, immutable",
    "/aprender/a2/audio/*",
    "  Cache-Control: public, max-age=31536000, immutable",
    "",
  ].join("\n")
);
console.log("ok:", out);
