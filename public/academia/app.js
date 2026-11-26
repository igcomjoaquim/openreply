/* Academia — Inglês com Joaquim.
 * Plataforma 100% prática: teste de nivelamento só de ouvir e falar → treino.
 * Organizada por PROBLEMA (26/11): 👂 Entender o nativo e 🗣️ Falar sem travar.
 * Ouvido: Complete o que ouviu (lacunas, 3 níveis), Fala grudada, Qual você ouviu?, Quantas palavras?, Cenas.
 * Fala: Fofoca (ouvir e recontar), Shadowing, Real Time. 13 temas do A1 em ordem,
 * 3 variações de cada estação por tema. O treino do dia mistura ~70% do tema atual
 * e ~30% de revisão, com mais exercícios da habilidade mais fraca.
 * Conteúdo e áudios vêm da Aprender (/aprender/data, /aprender/audio). Progresso no aparelho. */
(function () {
  "use strict";
  var root = document.getElementById("app");
  var DATA = "/aprender/data/", AUD = "/aprender/audio/";
  var KEY = "academia:v1";
  var Q = new URLSearchParams(location.search);
  var ALL = Q.get("tudo") === "1"; // modo professor: tudo aberto

  // ---------- helpers ----------
  function el(tag, attrs) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      var v = attrs[k];
      if (v == null || v === false) continue;
      if (k === "text") e.textContent = v;
      else if (k === "html") e.innerHTML = v;
      else if (k === "cls") e.className = v;
      else if (k.slice(0, 2) === "on") e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? "" : v);
    }
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (c == null || c === false || c === "") continue;
      if (Array.isArray(c)) c.forEach(function (x) { if (x != null && x !== false && x !== "") e.append(x.nodeType ? x : String(x)); });
      else e.append(c.nodeType ? c : String(c));
    }
    return e;
  }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function plain(s) { return String(s || "").replace(/\*\*?/g, "").replace(/\[\[([^\]]+)\]\]/g, function (_, a) { return a.split("|")[0]; }); }
  function norm(s) {
    return String(s).toLowerCase().replace(/[’‘`´]/g, "'").replace(/\b([ap])\.m\./g, "$1m")
      .replace(/\$\s?(\d)/g, "$1").replace(/[^a-z0-9' ]/g, " ").replace(/\s+/g, " ").trim();
  }
  var NUMW = "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty".split(" ");
  function canon(s) {
    var t = " " + norm(s) + " ";
    var C = [["i'm", "i am"], ["you're", "you are"], ["he's", "he is"], ["she's", "she is"], ["it's", "it is"], ["we're", "we are"], ["they're", "they are"],
      ["isn't", "is not"], ["aren't", "are not"], ["wasn't", "was not"], ["weren't", "were not"], ["don't", "do not"], ["doesn't", "does not"], ["didn't", "did not"],
      ["can't", "can not"], ["cannot", "can not"], ["what's", "what is"], ["where's", "where is"], ["who's", "who is"], ["that's", "that is"], ["there's", "there is"],
      ["let's", "let us"], ["i'll", "i will"], ["gonna", "going to"], ["wanna", "want to"], ["i've", "i have"], ["o'clock", "oclock"], ["ok", "okay"]];
    C.forEach(function (p) { t = t.split(" " + p[0] + " ").join(" " + p[1] + " "); });
    t = t.replace(/ (\d{1,2}) /g, function (m, n) { return NUMW[+n] ? " " + NUMW[+n] + " " : m; });
    return t.replace(/\s+/g, " ").trim();
  }
  function cw(s) { return canon(s).split(" ").filter(Boolean); }
  // palavras como o aluno vê (contração = 1 palavra), sem pontuação solta
  function words(s) { return String(s).split(/\s+/).filter(function (t) { return /[A-Za-z0-9]/.test(t); }); }
  function core(t) { return String(t).replace(/^[^A-Za-z0-9']+|[^A-Za-z0-9']+$/g, "").replace(/[’‘]/g, "'"); }
  // quanto da frase-alvo o aluno falou (0–1), sem ligar pra ordem
  function overlap(target, said) {
    var t = cw(target), s = cw(said || ""), bag = {};
    s.forEach(function (w) { bag[w] = (bag[w] || 0) + 1; });
    var hit = 0; t.forEach(function (w) { if (bag[w]) { hit++; bag[w]--; } });
    return t.length ? hit / t.length : 0;
  }
  function bestOverlap(targets, said) { return Math.max.apply(null, targets.map(function (t) { return overlap(t, said); })); }
  function has(said, x) { var n = " " + canon(said) + " ", c = canon(x); return n.indexOf(" " + c + " ") > -1 || (c.length > 3 && n.indexOf(c) > -1); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function today() { var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function buzz(p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) {} }

  // ---------- progresso ----------
  var S = (function () { try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { return null; } })() || {};
  S.done = S.done || {};     // "est:uid:v" -> {n, best, last}
  S.errors = S.errors || []; // [{uid, kind, en, pt, file}]
  S.days = S.days || []; S.xp = S.xp || 0;
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  function markDay() { var t = today(); if (S.days.indexOf(t) < 0) { S.days.push(t); S.days = S.days.slice(-120); } }
  function streak() {
    var n = 0, d = new Date();
    for (;;) { var iso = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
      if (S.days.indexOf(iso) > -1) { n++; d.setDate(d.getDate() - 1); } else if (n === 0 && iso === today()) { d.setDate(d.getDate() - 1); } else break; }
    return n;
  }
  function dkey(st, uid, v) { return st + ":" + uid + ":" + v; }
  function record(st, uid, v, pct) {
    var k = dkey(st, uid, v), r = S.done[k] || { n: 0, best: 0 };
    r.n++; r.best = Math.max(r.best, pct); r.last = today(); S.done[k] = r;
    S.xp += Math.round(10 + pct * 20); markDay(); persist();
  }
  function addError(e) {
    if (S.errors.some(function (x) { return x.en === e.en; })) return;
    S.errors.push(e); S.errors = S.errors.slice(-60); persist();
  }
  function fixError(en) { S.errors = S.errors.filter(function (x) { return x.en !== en; }); persist(); }

  // ---------- conteúdo ----------
  var INDEX = null, U = {}, TEST = null;
  function j(url) { return fetch(url).then(function (r) { if (!r.ok) throw new Error(url); return r.json(); }); }
  function loadIndex() { return j(DATA + "index.json?v=" + (window.__v || 1)).then(function (x) { INDEX = x.units; return x; }); }
  function loadUnit(uid) { if (U[uid]) return Promise.resolve(U[uid]); return j(DATA + uid + ".json?v=" + (window.__v || 1)).then(function (x) { U[uid] = x; return x; }); }
  function loadTest() { if (TEST) return Promise.resolve(TEST); return j(DATA + "teste.json?v=" + (window.__v || 1)).then(function (x) { TEST = x; return x; }); }
  var OUV = null;
  function loadOuv() { if (OUV) return Promise.resolve(OUV); return j(DATA + "ouvido.json?v=" + (window.__v || 1)).then(function (x) { OUV = x; return x; }, function () { OUV = {}; return OUV; }); }
  var GERAL = { id: "geral", title: "Geral" }; // exercícios que não dependem do tema
  var GLOBAL_ST = { grudada: 1, pares: 1 };
  function af(u, key) { var f = u.audio && u.audio[key]; return f ? AUD + f : null; }
  function uidx(uid) { for (var i = 0; i < INDEX.length; i++) if (INDEX[i].id === uid) return i; return 0; }

  // as 3 variações de cada estação num tema (o que existe de verdade no conteúdo)
  function variations(u, st) {
    if (st === "cena") {
      var a = [];
      if (u.video) a.push({ kind: "video", v: u.video, label: "Vídeo real" });
      if (u.lesson && u.lesson.audio) a.push({ kind: "audio", label: "Só áudio" });
      (u.academia && u.academia.cenas || []).forEach(function (c) { a.push({ kind: "video", v: c, label: "Vídeo real" }); });
      while (a.length < 3) a.push({ kind: "soon", label: "Em breve" });
      return a.slice(0, 3);
    }
    if (st === "fofoca") return (u.gossips || []).slice(0, 3).map(function (g, i) { return { g: g, i: i, label: g.title }; });
    if (st === "shadow") {
      var b = [{ list: (u.homework && u.homework.shadowing || []).map(function (s, k) { return { en: s.en, pt: s.pt, key: "sh" + k }; }), label: "Bloco 1 · devagar" }];
      (u.academia && u.academia.shadowing || []).forEach(function (blk, bi) { b.push({ list: blk.map(function (s, k) { return { en: s.en, pt: s.pt, key: "as" + bi + "_" + k }; }), label: "Bloco " + (bi + 2) + (bi ? " · rápido" : " · normal") }); });
      return b.slice(0, 3);
    }
    if (st === "rt") return (u.realtimes || []).slice(0, 3).map(function (r, i) { return { r: r, i: i, label: r.title }; });
    if (st === "lacuna" || st === "contar") return (u.gossips || []).slice(0, 3).map(function (g, gi) {
      var lines = g.lines.map(function (l, li) { return { raw: l.text, en: plain(l.text), pt: l.pt, file: af(u, "gl" + gi + "_" + li) }; }).filter(function (l) { var n = words(l.en).length; return l.file && n >= 3 && (st === "lacuna" || n <= 12); });
      if (st === "contar") {
        var sh = variations(u, "shadow")[gi];
        (sh ? sh.list : []).forEach(function (x) { if (lines.length < 8) lines.push({ en: x.en, pt: x.pt, file: af(u, x.key) }); });
        return { list: lines.slice(0, 8), label: "Fofoca: " + g.title };
      }
      return { list: lines, label: "Fofoca: " + g.title };
    });
    if (st === "grudada" || st === "pares") return ((OUV && OUV[st]) || []).map(function (b) { return { list: b.items, label: b.title }; });
    return [];
  }
  function playable(x) { return x && x.kind !== "soon"; }

  // ---------- áudio ----------
  var current = null;
  function stopAll() { document.querySelectorAll("audio").forEach(function (a) { try { a.pause(); } catch (e) {} }); if (current) { try { current.pause(); } catch (e) {} } try { speechSynthesis.cancel(); } catch (e) {} }
  function playUrl(url, rate) { stopAll(); var a = new Audio(url); a.playbackRate = rate || 1; current = a; a.play().catch(function () {}); return a; }
  // player grande com contador; opts.max limita quantas vezes ouve (teste)
  function player(url, opts) {
    opts = opts || {};
    var a = new Audio(url); a.preload = "auto"; var plays = 0, slow = false;
    var count = el("span", { cls: "plays", text: opts.max ? "Você pode ouvir " + opts.max + (opts.max === 1 ? " vez" : " vezes") : "Toque no ▶ pra ouvir" });
    var fill = el("i"), bar = el("div", { cls: "pbar" }, fill);
    var play = el("button", { cls: "pbtn", type: "button", "aria-label": "Tocar", text: "▶" });
    a.addEventListener("timeupdate", function () { if (a.duration) fill.style.width = (a.currentTime / a.duration * 100) + "%"; if (opts.onProgress && a.duration) opts.onProgress(a.currentTime / a.duration); });
    a.addEventListener("play", function () { play.textContent = "⏸"; });
    a.addEventListener("pause", function () { play.textContent = "▶"; });
    a.addEventListener("ended", function () {
      plays++; play.textContent = "↺";
      if (opts.max) { var left = opts.max - plays; count.textContent = left > 0 ? "Pode ouvir mais " + left + "x" : "Pronto, agora é com você"; if (left <= 0) play.disabled = true; }
      else count.textContent = "✅ Ouviu " + plays + (plays === 1 ? " vez" : " vezes");
      if (opts.onEnd) opts.onEnd(plays);
    });
    play.onclick = function () { if (a.paused) { stopAll(); current = a; if (a.ended) a.currentTime = 0; a.play().catch(function () {}); } else a.pause(); };
    var tools = el("div", { cls: "ptools" });
    if (!opts.max) {
      bar.onclick = function (e) { var r = bar.getBoundingClientRect(); if (a.duration) a.currentTime = (e.clientX - r.left) / r.width * a.duration; };
      tools.append(el("button", { type: "button", text: "⏪ 5 s", onclick: function () { a.currentTime = Math.max(0, a.currentTime - 5); a.play().catch(function () {}); } }),
        el("button", { type: "button", text: "🐢 0.75×", onclick: function (e) { slow = !slow; a.playbackRate = slow ? 0.75 : 1; e.currentTarget.textContent = slow ? "🐇 1×" : "🐢 0.75×"; e.currentTarget.classList.toggle("sel", slow); } }));
    }
    tools.append(count);
    var box = el("div", { cls: "player" }, el("div", { cls: "prow" }, play, bar), tools);
    box._audio = a;
    return box;
  }

  // ---------- microfone: segurar pra falar (igual WhatsApp); toque rápido = gravar até tocar de novo ----------
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  function talk(onDone, opts) {
    opts = opts || {};
    var idle = opts.label || "🎤 Segure e fale";
    var b = el("button", { cls: "mic ptt", type: "button", text: idle });
    var live = el("p", { cls: "heard", text: "" });
    var wrap = el("div", { cls: "talk" }, b, live);
    if (!SR) {
      b.textContent = "🎤 Este navegador não ouve você";
      b.disabled = true;
      wrap.append(el("p", { cls: "small", text: "Use o Chrome (Android/computador) ou o Safari (iPhone). Por enquanto, fale em voz alta e toque em continuar." }),
        el("button", { cls: "btn ghost", type: "button", text: "Falei em voz alta →", onclick: function () { onDone("", true); } }));
      return wrap;
    }
    var rec = null, finals = "", interim = "", state = "idle", downAt = 0, latch = false;
    function start() {
      if (rec) return; finals = ""; interim = ""; live.textContent = "";
      stopAll();
      rec = new SR(); rec.lang = "en-US"; rec.continuous = true; rec.interimResults = true;
      rec.onresult = function (e) { interim = ""; for (var i = e.resultIndex; i < e.results.length; i++) { if (e.results[i].isFinal) finals += " " + e.results[i][0].transcript; else interim += " " + e.results[i][0].transcript; } live.textContent = (finals + " " + interim).trim(); };
      rec.onend = function () { if (state === "live" && rec) { try { rec.start(); } catch (e) {} } };
      rec.onerror = function (ev) { if (ev.error === "not-allowed" || ev.error === "service-not-allowed") { rec = null; state = "idle"; b.classList.remove("live"); b.textContent = "🎤 Libere o microfone e tente de novo"; } };
      try { rec.start(); } catch (e) {}
      state = "live"; b.classList.add("live"); b.textContent = latch ? "🔴 Falando… toque pra parar" : "🔴 Falando… solte pra terminar"; buzz(35);
    }
    function stop() {
      if (!rec || state !== "live") return; state = "stopping"; buzz([30, 40, 30]);
      b.classList.remove("live"); b.textContent = "⏳ Entendendo…"; b.disabled = true;
      var r = rec; setTimeout(function () { try { r.stop(); } catch (e) {} }, 350);
      setTimeout(function () { rec = null; state = "idle"; latch = false; b.disabled = false; b.textContent = opts.again || "🎤 Falar de novo"; onDone((finals + " " + interim).trim(), false); }, 1300);
    }
    b.addEventListener("pointerdown", function (e) { e.preventDefault(); if (state === "live" && latch) { stop(); return; } if (state !== "idle") return; downAt = Date.now(); latch = false; start(); try { b.setPointerCapture(e.pointerId); } catch (x) {} });
    b.addEventListener("pointerup", function () { if (state !== "live" || latch) return; if (Date.now() - downAt < 350) { latch = true; b.textContent = "🔴 Falando… toque pra parar"; return; } stop(); });
    b.addEventListener("pointercancel", function () { if (state === "live" && !latch) stop(); });
    b.addEventListener("contextmenu", function (e) { e.preventDefault(); });
    b.addEventListener("keydown", function (e) { if (e.key === " " || e.key === "Enter") { e.preventDefault(); if (state === "idle") { latch = true; start(); } else if (state === "live") stop(); } });
    wrap._stop = stop;
    return wrap;
  }

  // ---------- telas ----------
  function screen() { stopAll(); root.innerHTML = ""; window.scrollTo(0, 0); var w = el("main", { cls: "wrap" }); root.append(w); return w; }
  function topBar(back) {
    var s = streak();
    return el("header", { cls: "top" },
      back ? el("button", { cls: "back", type: "button", text: "← Voltar", onclick: back }) : el("span", { cls: "brand", text: "🏋️ Academia" }),
      el("div", { cls: "stats" }, el("span", { cls: "stat fire" + (S.days.indexOf(today()) > -1 ? " lit" : ""), title: "dias seguidos", text: "🔥 " + s }), el("span", { cls: "stat", title: "pontos", text: "⭐ " + S.xp })));
  }
  var SKILLS = {
    entender: { emoji: "👂", name: "Entender", st: "cena", good: "Você entende bem o que ouve.", bad: "Entender o nativo ainda é difícil pra você." },
    repetir: { emoji: "🔁", name: "Pronúncia e ritmo", st: "shadow", good: "Sua pronúncia acompanha bem.", bad: "Repetir frases longas ainda trava." },
    reagir: { emoji: "⚡", name: "Responder rápido", st: "rt", good: "Você responde sem travar.", bad: "Na hora de responder, você trava." },
    recontar: { emoji: "🗣️", name: "Falar com suas palavras", st: "fofoca", good: "Você consegue contar uma história.", bad: "Contar uma história com suas palavras ainda é difícil." }
  };
  var ST = {
    cena: { emoji: "🎬", name: "Cenas", pt: "vídeo real, primeiro só ouvindo", skill: "entender" },
    fofoca: { emoji: "🕵️", name: "Fofoca", pt: "ouça a história e reconte falando", skill: "recontar" },
    shadow: { emoji: "🔁", name: "Shadowing", pt: "repita colado no nativo", skill: "repetir" },
    rt: { emoji: "⚡", name: "Real Time", pt: "passe pro inglês falando, com tempo", skill: "reagir" },
    erros: { emoji: "🧠", name: "Meus erros", pt: "só o que você errou", skill: null },
    lacuna: { emoji: "🧩", name: "Complete o que ouviu", pt: "o nativo fala, você toca nas palavras", skill: "entender" },
    grudada: { emoji: "🔗", name: "Fala grudada", pt: "o que o nativo engole: wanna, whaddaya…", skill: "entender" },
    pares: { emoji: "🎯", name: "Qual você ouviu?", pt: "13 ou 30? live ou leave?", skill: "entender" },
    contar: { emoji: "🔢", name: "Quantas palavras?", pt: "ache onde uma palavra acaba", skill: "entender" }
  };
  var PROB = {
    ouvir: { emoji: "👂", name: "Não entendo o nativo", pt: "Ele fala rápido, engole palavra, e some tudo.", list: ["lacuna", "grudada", "pares", "contar", "cena"] },
    falar: { emoji: "🗣️", name: "Travo na hora de falar", pt: "Você sabe, mas na hora a frase não sai.", list: ["rt", "fofoca", "shadow"] }
  };
  function focusProb() { var s = (S.test && S.test.skills) || {}; if (S.test && S.test.skipped) return "ouvir"; var f = ((s.repetir || 0) + (s.reagir || 0) + (s.recontar || 0)) / 3; return (s.entender || 0) <= f ? "ouvir" : "falar"; }

  // ===== boas-vindas =====
  function welcome() {
    var w = screen();
    var name = el("input", { type: "text", placeholder: "Seu primeiro nome", value: S.name || "", autocomplete: "given-name" });
    w.append(el("section", { cls: "hero" },
      el("span", { cls: "eyebrow", text: "Academia · Inglês com Joaquim" }),
      el("h1", { html: "Aqui você não assiste aula.<br><mark>Você treina.</mark>" }),
      el("p", { text: "Primeiro um teste rápido, só de ouvir e falar: nada de ler, nada de escrever. Ele mostra seu nível e o que mais trava você. Daí a academia monta o seu treino." })),
      el("ul", { cls: "how card" },
        el("li", { text: "👂 Ouvir e reagir" }), el("li", { text: "🔁 Repetir frases" }), el("li", { text: "⚡ Responder rápido" }), el("li", { text: "🗣️ Recontar uma fofoca" }),
        el("li", { cls: "small", text: "⏱️ Uns 10 minutos. Use fone e fique num lugar onde possa falar." })),
      el("label", { text: "Como você se chama?" }), name,
      el("button", { cls: "btn big", type: "button", text: "Começar o teste →", onclick: function () { S.name = name.value.trim(); persist(); runTest(); } }),
      el("button", { cls: "linkish", type: "button", text: "Já sei meu nível: pular o teste e começar do tema 1", onclick: function () { S.name = name.value.trim(); S.test = { skipped: true, band: 0, skills: { entender: 50, repetir: 50, reagir: 50, recontar: 50 }, at: today() }; S.theme = 0; persist(); home(); } }));
  }

  // ===== teste de nivelamento =====
  function runTest() {
    var w = screen();
    w.append(el("p", { cls: "boot", text: "Carregando o teste…" }));
    loadTest().then(function (T) { testFlow(T); }).catch(function () { w.innerHTML = ""; w.append(el("p", { text: "Não consegui carregar o teste. Confira a internet e tente de novo." }), el("button", { cls: "btn", type: "button", text: "Tentar de novo", onclick: runTest })); });
  }
  function testFlow(T) {
    var parts = [
      { key: "listen", skill: "entender", title: "👂 Parte 1 de 4 · Ouvir e reagir", tip: "Ouça e toque na figura certa. Você pode ouvir 2 vezes." },
      { key: "repeat", skill: "repetir", title: "🔁 Parte 2 de 4 · Repetir a frase", tip: "Ouça e repita igualzinho. A frase fica escondida: é só ouvido." },
      { key: "answer", skill: "reagir", title: "⚡ Parte 3 de 4 · Pergunta rápida", tip: "Ouça a pergunta e responda falando, do seu jeito." },
      { key: "retell", skill: "recontar", title: "🗣️ Parte 4 de 4 · Mini fofoca", tip: "Ouça a historinha e reconte com as suas palavras." }
    ];
    var res = { entender: [], repetir: [], reagir: [], recontar: [] };
    var pi = 0, items = [], ii = 0, missStreak = 0;
    function nextPart() {
      if (pi >= parts.length) return finish();
      var P = parts[pi];
      items = (T[P.key] || []).slice().sort(function (a, b) { return a.band - b.band; }); ii = 0; missStreak = 0;
      var w = screen();
      w.append(testHead(P, 0, items.length), el("div", { cls: "card intro" }, el("h2", { text: P.title.replace(/ · /, " — ") }), el("p", { text: P.tip })),
        el("button", { cls: "btn big", type: "button", text: "Vamos →", onclick: nextItem }));
    }
    function testHead(P, i, n) {
      var total = parts.length, pct = Math.round(((pi + (n ? i / n : 0)) / total) * 100);
      return el("div", { cls: "thead" }, el("span", { cls: "eyebrow", text: P.title }), el("div", { cls: "pbar2" }, el("i", { style: "width:" + pct + "%" })));
    }
    function score(ok, band) {
      res[parts[pi].skill].push({ band: band, ok: ok });
      missStreak = ok >= 0.6 ? 0 : missStreak + 1;
      ii++;
      // adaptativo: 2 erros seguidos numa faixa → encerra a parte
      if (missStreak >= 2 || ii >= items.length) { pi++; setTimeout(nextPart, 350); } else setTimeout(nextItem, 350);
    }
    function nextItem() {
      var P = parts[pi], it = items[ii], w = screen();
      w.append(testHead(P, ii, items.length));
      var url = AUD + it.file;
      if (P.key === "listen") {
        var opts = el("div", { cls: "pics" }), picked = false;
        it.options.forEach(function (o, k) {
          opts.append(el("button", { cls: "pic", type: "button", onclick: function (e) { if (picked) return; picked = true; e.currentTarget.classList.add("sel"); score(k === it.answer ? 1 : 0, it.band); } },
            el("span", { cls: "pe", text: o.emoji }), el("span", { text: o.pt })));
        });
        opts.classList.add("locked");
        w.append(el("div", { cls: "card" }, el("h2", { text: it.q }), player(url, { max: 2, onEnd: function () { opts.classList.remove("locked"); } }), opts));
        setTimeout(function () { var b = w.querySelector(".pbtn"); if (b) b.click(); }, 300);
      } else if (P.key === "repeat") {
        var heard = false, p = player(url, { max: 2, onEnd: function () { heard = true; t.classList.remove("locked"); } });
        var t = talk(function (said, manual) { score(manual ? 0.6 : overlap(it.en, said), it.band); }, { label: "🎤 Segure e repita" });
        t.classList.add("locked");
        w.append(el("div", { cls: "card" }, el("h2", { text: "Ouça e repita" }), el("p", { cls: "hidden-line", text: "🙈 frase escondida" }), p, t));
        setTimeout(function () { var b = w.querySelector(".pbtn"); if (b) b.click(); }, 300);
      } else if (P.key === "answer") {
        var t2 = talk(function (said, manual) {
          if (manual) return score(0.6, it.band);
          var groups = it.expect || [], g = groups.filter(function (grp) { return grp.some(function (x) { return has(said, x); }); }).length;
          var enough = cw(said).length >= (it.minWords || 2);
          score((groups.length ? g / groups.length : 1) * (enough ? 1 : 0.5), it.band);
        }, { label: "🎤 Segure e responda" });
        t2.classList.add("locked");
        var p2 = player(url, { max: 2, onEnd: function () { t2.classList.remove("locked"); } });
        w.append(el("div", { cls: "card" }, el("h2", { text: "Responda falando" }), p2, t2));
        setTimeout(function () { var b = w.querySelector(".pbtn"); if (b) b.click(); }, 300);
      } else {
        var t3 = talk(function (said, manual) {
          if (manual) return score(0.6, it.band);
          var k = (it.keywords || []).filter(function (x) { return has(said, x); }).length / Math.max(1, (it.keywords || []).length);
          var enough = cw(said).length >= (it.minWords || 10);
          score(Math.min(1, k * 1.3) * (enough ? 1 : 0.6), it.band);
        }, { label: "🎤 Segure e reconte" });
        t3.classList.add("locked");
        var p3 = player(url, { max: 2, onEnd: function () { t3.classList.remove("locked"); } });
        w.append(el("div", { cls: "card" }, el("h2", { text: it.title || "Mini fofoca" }), el("p", { cls: "small", text: "Pode começar com: \"So, the story is about…\"" }), p3, t3));
      }
      w.append(el("button", { cls: "linkish", type: "button", text: "Não entendi nada — pular", onclick: function () { score(0, it.band); } }));
    }
    function finish() {
      var skills = {}, bands = [];
      Object.keys(res).forEach(function (k) {
        var r = res[k]; if (!r.length) { skills[k] = 0; return; }
        // nível da habilidade = maior faixa em que acertou bem; % = média ponderada pela faixa
        var top = -1; r.forEach(function (x) { if (x.ok >= 0.6) top = Math.max(top, x.band); });
        bands.push(top);
        var sum = 0, wsum = 0; r.forEach(function (x) { var wgt = 1 + x.band; sum += x.ok * wgt; wsum += wgt; });
        skills[k] = Math.round(Math.min(1, (sum / wsum) * 0.6 + ((top + 1) / 4) * 0.4) * 100);
      });
      bands.sort(); var band = Math.max(0, bands[1] != null ? bands[1] : 0); // 2ª menor: não deixa uma habilidade só puxar o nível
      S.test = { band: band, skills: skills, at: today() };
      S.theme = [0, 3, 8, 12][band] || 0;
      markDay(); persist(); result();
    }
    nextPart();
  }
  function weakest() { var s = (S.test && S.test.skills) || {}; var k = Object.keys(SKILLS).sort(function (a, b) { return (s[a] || 0) - (s[b] || 0); }); return k[0]; }
  var BANDS = ["Iniciante (A1 · começo)", "A1 · meio", "A1 · final", "Acima do A1"];
  function result() {
    var w = screen(), T = S.test, wk = weakest();
    w.append(topBar(), el("section", { cls: "hero" },
      el("span", { cls: "eyebrow", text: "Seu resultado" + (S.name ? ", " + S.name : "") }),
      el("h1", { html: "Seu nível: <mark>" + esc(BANDS[T.band]) + "</mark>" }),
      el("p", { text: "Esse é o retrato das 4 habilidades que a gente mediu só ouvindo e falando." })));
    var bars = el("div", { cls: "card skills" });
    Object.keys(SKILLS).forEach(function (k) {
      var v = T.skills[k] || 0, Sk = SKILLS[k];
      bars.append(el("div", { cls: "skill" + (k === wk ? " weak" : "") },
        el("div", { cls: "skrow" }, el("b", { text: Sk.emoji + " " + Sk.name }), el("span", { text: v + "%" })),
        el("div", { cls: "pbar2" }, el("i", { style: "width:" + Math.max(4, v) + "%" })),
        el("p", { cls: "small", text: v >= 60 ? Sk.good : Sk.bad })));
    });
    w.append(bars, el("div", { cls: "card plan" },
      el("span", { cls: "eyebrow", text: "🎯 Seu plano" }),
      el("h2", { text: "Seu foco: " + PROB[focusProb()].emoji + " " + PROB[focusProb()].name.toLowerCase() }),
      el("p", { html: "Todo dia a academia monta um treino de ~10 min com <b>" + ST[SKILLS[wk].st].emoji + " " + ST[SKILLS[wk].st].name + "</b> em dobro, porque é o que mais trava você. Você começa no tema <b>" + (S.theme + 1) + " · " + esc(INDEX[S.theme].title) + "</b>." }),
      el("p", { cls: "small", text: "A nota da fala é automática (reconhecimento de voz): é uma estimativa, não um certificado." })),
      el("button", { cls: "btn big", type: "button", text: "Começar meu treino →", onclick: home }));
  }

  // ===== início =====
  function themeMastery(uid) {
    var n = 0; [0, 1, 2].forEach(function (v) { var r = S.done[dkey("rt", uid, v)]; if (r && r.best >= 0.7) n++; }); return n; // 2 de 3 Real Times bons = domínio
  }
  function themeOpen(i) { return ALL || i <= (S.theme || 0) || (i > 0 && themeMastery(INDEX[i - 1].id) >= 2); }
  function curTheme() { var t = S.theme || 0; while (t < INDEX.length - 1 && themeMastery(INDEX[t].id) >= 2) t++; if (t !== S.theme) { S.theme = t; persist(); } return t; }
  // próxima variação ainda não feita (ou a menos feita)
  function nextVar(st, u) {
    var vs = variations(u, st), best = -1, bestN = 1e9;
    vs.forEach(function (x, v) { if (!playable(x)) return; var r = S.done[dkey(st, u.id, v)]; var n = r ? r.n : 0; if (n < bestN) { bestN = n; best = v; } });
    return best;
  }
  function dailyPlan() {
    var t = curTheme(), uid = INDEX[t].id, wk = weakest(), extra = SKILLS[wk].st;
    // ouvido e fala se alternando; o problema principal ganha um exercício a mais no fim
    var d = new Date().getDate(), ear2 = d % 2 ? "grudada" : "pares";
    var list = [{ st: "cena", uid: uid }, { st: "lacuna", uid: uid }, { st: "rt", uid: uid }, { st: ear2, uid: "geral" }, { st: "fofoca", uid: uid }, { st: "shadow", uid: uid }];
    if (focusProb() === "ouvir") list.push({ st: d % 2 ? "contar" : "lacuna", uid: t > 0 ? INDEX[Math.floor(Math.random() * t)].id : uid, review: t > 0 });
    else list.push({ st: "rt", uid: t > 0 ? INDEX[Math.floor(Math.random() * t)].id : uid, review: t > 0 });
    if (S.errors.length) list.push({ st: "erros" });
    return list;
  }
  function home() {
    if (!S.test) return welcome();
    var w = screen(), t = curTheme(), I = INDEX[t];
    var plan = dailyPlan(), doneToday = (S.dailyDone === today());
    w.append(topBar(),
      el("section", { cls: "hello" }, el("p", { cls: "hand", text: "Bora treinar" + (S.name ? ", " + S.name : "") + "!" }),
        el("div", { cls: "lvl" }, el("span", { cls: "lvl-badge", text: BANDS[S.test.band] }), S.test.skipped ? el("button", { cls: "linkish", type: "button", text: "Fazer o teste de nível", onclick: runTest }) : el("span", { cls: "small", text: "foco: " + PROB[focusProb()].emoji + " " + PROB[focusProb()].name.toLowerCase() }))),
      el("button", { cls: "daily" + (doneToday ? " done" : ""), type: "button", onclick: function () { runDaily(plan); } },
        el("span", { cls: "eyebrow", text: doneToday ? "✅ Treino de hoje feito · quer mais?" : "🏋️ Treino do dia · ~15 min" }),
        el("b", { text: I.emoji + " Tema " + (t + 1) + " · " + I.title }),
        el("span", { cls: "dlist", text: plan.map(function (x) { return ST[x.st].emoji; }).join("  ") }),
        el("span", { cls: "go", text: "Começar →" })));
    // treino livre por problema
    var fp = focusProb(), probs = el("div", { cls: "probs" });
    ["ouvir", "falar"].forEach(function (k) {
      var P = PROB[k];
      probs.append(el("button", { cls: "prob" + (k === fp ? " focus" : ""), type: "button", onclick: function () { probPage(k, t); } },
        el("span", { cls: "pe", text: P.emoji }), el("span", { cls: "pt" }, el("b", { text: P.name }), el("span", { cls: "small", text: P.pt }),
          el("span", { cls: "pl", text: P.list.map(function (st) { return ST[st].emoji; }).join(" ") + "  ·  " + P.list.length + " exercícios" })),
        k === fp ? el("span", { cls: "ptag", text: "seu foco" }) : null));
    });
    var er = el("button", { cls: "station errs" + (S.errors.length ? "" : " off"), type: "button", disabled: !S.errors.length, onclick: function () { runErrors(); } },
      el("span", { cls: "se", text: "🧠" }), el("span", { cls: "tt" }, el("b", { text: "Meus erros" }), el("span", { cls: "small", text: S.errors.length ? S.errors.length + " pra revisar" : "nada por enquanto 🎉" })));
    w.append(el("h2", { cls: "sec", text: "O que mais trava você?" }), probs, er);
    // temas
    var tl = el("ol", { cls: "themes" });
    INDEX.forEach(function (x, i) {
      var open = themeOpen(i), m = themeMastery(x.id);
      tl.append(el("li", { cls: (i === t ? "cur " : "") + (open ? "" : "locked") },
        el("button", { type: "button", disabled: !open, onclick: function () { themePage(i); } },
          el("span", { cls: "te", text: open ? x.emoji : "🔒" }),
          el("span", { cls: "tt" }, el("b", { text: (i + 1) + " · " + x.title }), el("span", { cls: "small", text: x.titlePt + (open ? " · domínio " + Math.min(m, 2) + "/2" : "") })))));
    });
    w.append(el("h2", { cls: "sec", text: "Temas do A1" }), el("p", { cls: "small", text: "O próximo tema abre quando você manda bem em 2 dos 3 Real Times do tema." }), tl,
      el("button", { cls: "linkish", type: "button", text: "Refazer o teste de nível", onclick: runTest }));
  }
  function themePage(i) {
    var I = INDEX[i], w = screen();
    w.append(topBar(home), el("span", { cls: "eyebrow", text: "Tema " + (i + 1) }), el("h1", { text: I.emoji + " " + I.title }), el("p", { cls: "small", text: I.titlePt + " · " + I.grammar }));
    ["ouvir", "falar"].forEach(function (k) { w.append(el("h2", { cls: "sec", text: PROB[k].emoji + " " + PROB[k].name }), stationGrid(k, i)); });
  }
  function stationGrid(k, ti) {
    var box = el("div", { cls: "stations" });
    PROB[k].list.forEach(function (st) {
      var X = ST[st], uid = GLOBAL_ST[st] ? "geral" : INDEX[ti].id;
      box.append(el("button", { cls: "station", type: "button", onclick: function () { pickVar(st, uid, ti); } }, el("span", { cls: "se", text: X.emoji }), el("b", { text: X.name }), el("span", { cls: "small", text: X.pt })));
    });
    return box;
  }
  function probPage(k, ti) {
    var P = PROB[k], w = screen(), I = INDEX[ti];
    w.append(topBar(home), el("span", { cls: "eyebrow", text: "Treino livre · Tema " + (ti + 1) + " · " + I.title }), el("h1", { text: P.emoji + " " + P.name }), el("p", { cls: "small", text: P.pt + " Cada exercício tem 3 variações: errou ou quer mais, faz a próxima." }),
      stationGrid(k, ti), el("p", { cls: "small", text: "Quer outro tema? Escolha lá embaixo no início." }));
  }
  function getUnit(uid) { return loadOuv().then(function () { return uid === "geral" ? GERAL : loadUnit(uid); }); }
  function pickVar(st, uid) {
    var w = screen(); w.append(topBar(home), el("p", { cls: "boot", text: "Carregando…" }));
    getUnit(uid).then(function (u) {
      w.innerHTML = ""; var X = ST[st], i = uidx(uid);
      w.append(topBar(home), el("span", { cls: "eyebrow", text: X.emoji + " " + X.name + (uid === "geral" ? "" : " · Tema " + (i + 1) + " · " + u.title) }), el("h1", { text: "Escolha a variação" }),
        el("p", { cls: "small", text: "Mesmo assunto, situação diferente. Precisa treinar mais? Faça a próxima." }));
      var list = el("div", { cls: "vars" });
      variations(u, st).forEach(function (x, v) {
        var r = S.done[dkey(st, uid, v)], ok = playable(x);
        list.append(el("button", { cls: "var" + (ok ? "" : " off"), type: "button", disabled: !ok, onclick: function () { runStation(st, u, v, home); } },
          el("span", { cls: "vn", text: String(v + 1) }),
          el("span", { cls: "vt" }, el("b", { text: x.label || "Variação " + (v + 1) }), el("span", { cls: "small", text: ok ? (r ? "feito " + r.n + "x · melhor " + Math.round(r.best * 100) + "%" : "nova") : "vídeo chegando" }))));
      });
      w.append(list);
    });
  }

  // ===== treino do dia =====
  function runDaily(plan) {
    var i = 0;
    function next() {
      if (i >= plan.length) { S.dailyDone = today(); persist(); return celebrate(); }
      var x = plan[i++];
      if (x.st === "erros") return runErrors(next, i, plan.length);
      getUnit(x.uid).then(function (u) { var v = nextVar(x.st, u); if (v < 0) return next(); runStation(x.st, u, v, next, { i: i, n: plan.length, review: x.review }); });
    }
    next();
  }
  function celebrate() {
    var w = screen();
    w.append(topBar(), el("section", { cls: "hero center" }, el("div", { cls: "big-emoji", text: "🏆" }), el("h1", { text: "Treino de hoje feito!" }),
      el("p", { text: "🔥 " + streak() + (streak() === 1 ? " dia" : " dias") + " seguidos. Amanhã tem mais, com outras variações." }), el("p", { cls: "hand", text: "Falou, validou! 🚀" })),
      el("button", { cls: "btn big", type: "button", text: "Voltar pro início", onclick: home }));
  }

  // ===== estações =====
  function frame(st, u, v, ctx, onExit) {
    var w = screen(), X = ST[st], i = uidx(u.id);
    w.append(topBar(function () { onExit === home ? home() : (confirm("Sair do treino do dia?") && home()); }));
    w.append(el("div", { cls: "thead" },
      el("span", { cls: "eyebrow", text: (ctx && ctx.n ? "Treino do dia · " + ctx.i + " de " + ctx.n + " · " : "") + X.emoji + " " + X.name + (u.id === "geral" ? "" : " · Tema " + (i + 1) + (ctx && ctx.review ? " (revisão)" : "")) + " · variação " + (v + 1) }),
      ctx && ctx.n ? el("div", { cls: "pbar2" }, el("i", { style: "width:" + Math.round((ctx.i - 1) / ctx.n * 100) + "%" })) : null));
    return w;
  }
  function finishBox(w, st, u, v, pct, next, msg) {
    record(st, u.id, v, pct);
    var good = pct >= 0.7;
    w.append(el("div", { cls: "sheet " + (good ? "good" : "bad") }, el("b", { text: good ? "Mandou bem! " + Math.round(pct * 100) + "%" : "Treino é isso: " + Math.round(pct * 100) + "%" }),
      el("p", { text: msg || (good ? "Bora pra próxima." : "Os que você errou foram pra 🧠 Meus erros. Amanhã eles voltam numa situação nova.") }),
      el("button", { cls: "btn", type: "button", text: next === home ? "Voltar pro início" : "Próximo →", onclick: function () { next(); } })));
    w.lastChild.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  function runStation(st, u, v, next, ctx) {
    if (st === "cena") return stCena(u, v, next, ctx);
    if (st === "fofoca") return stFofoca(u, v, next, ctx);
    if (st === "shadow") return stShadow(u, v, next, ctx);
    if (st === "rt") return stRT(u, v, next, ctx);
    if (st === "lacuna") return stLacuna(u, v, next, ctx);
    if (st === "contar") return stContar(u, v, next, ctx);
    if (st === "grudada") return stGrudada(u, v, next, ctx);
    if (st === "pares") return stPares(u, v, next, ctx);
  }
  // perguntas com alternativas (inglês + botão de ver em PT, porque é A1)
  function mcq(q, onAns) {
    var box = el("div", { cls: "q card" }), done = false;
    var ptBtn = el("button", { cls: "linkish", type: "button", text: "ver em português", onclick: function () { box.classList.toggle("show-pt"); } });
    box.append(el("b", { text: q.q }), q.pt ? el("span", { cls: "q-pt small", text: q.pt }) : null);
    var opts = el("div", { cls: "opts" });
    shuffle(q.options.map(function (o, k) { return k; })).forEach(function (k) {
      opts.append(el("button", { cls: "opt", type: "button", onclick: function (e) {
        if (done) return; done = true; var ok = k === q.answer;
        e.currentTarget.classList.add(ok ? "ok" : "bad");
        if (!ok) opts.querySelectorAll(".opt")[[].slice.call(opts.children).findIndex(function (b) { return b._k === q.answer; })].classList.add("ok");
        buzz(ok ? 20 : [40, 30, 40]); onAns(ok);
      } }, el("span", { text: q.options[k] }), q.optionsPt ? el("span", { cls: "opt-pt", text: q.optionsPt[k] }) : null));
      opts.lastChild._k = k;
    });
    box.append(opts); if (q.pt) box.append(ptBtn);
    return box;
  }
  function quiz(w, qs, after) {
    var ok = 0, n = 0, wrap = el("div", { cls: "quiz" }); w.append(wrap);
    function ask(i) { if (i >= qs.length) return after(ok / Math.max(1, qs.length)); wrap.append(mcq(qs[i], function (good) { n++; if (good) ok++; setTimeout(function () { ask(i + 1); }, 600); })); wrap.lastChild.scrollIntoView({ behavior: "smooth", block: "center" }); }
    ask(0);
  }
  function lockBox(text) { return el("div", { cls: "listen-lock" }, el("span", { text: "🔒" }), el("p", { text: text })); }

  // 🎬 Cenas
  var ytReady = null;
  function loadYT() { if (ytReady) return ytReady; ytReady = new Promise(function (res) { window.onYouTubeIframeAPIReady = function () { res(window.YT); }; document.head.append(el("script", { src: "https://www.youtube.com/iframe_api" })); }); return ytReady; }
  function stCena(u, v, next, ctx) {
    var x = variations(u, "cena")[v], w = frame("cena", u, v, ctx, next);
    if (x.kind === "audio") {
      var A = u.lesson.audio;
      w.append(el("div", { cls: "card" }, el("span", { cls: "eyebrow", text: "🎧 Só áudio · sem imagem nenhuma" }), el("h2", { text: A.title }),
        el("p", { cls: "small", text: "Ouça pelo menos 1 vez inteira. As perguntas só abrem depois." }),
        player(af(u, "lesson"), { onEnd: function (n) { if (n === 1) { lk.remove(); quiz(w, A.questions || [], function (p) { finishBox(w, "cena", u, v, p, next); }); } } })));
      var lk = lockBox("As perguntas abrem depois que você ouvir."); w.append(lk);
      return;
    }
    var V = x.v, holder = el("div"), p = null, watched = false;
    w.append(el("div", { cls: "card" }, el("span", { cls: "eyebrow", text: "🎬 " + (V.source || "YouTube") }), el("h2", { text: V.predict || "O que vai acontecer?" }), el("p", { cls: "small", text: V.context || "" }),
      el("div", { cls: "yt" }, holder),
      el("ol", { cls: "vsteps" }, el("li", { html: "Assista <b>sem legenda</b>, só ouvindo." }), el("li", { html: "As perguntas abrem quando o vídeo terminar." }))));
    var lk2 = lockBox("Assista o trecho inteiro pra liberar as perguntas."); w.append(lk2);
    var skip = el("button", { cls: "linkish", type: "button", text: "O vídeo não abre aqui — liberar as perguntas", onclick: open }); w.append(skip);
    function open() { if (watched) return; watched = true; lk2.remove(); skip.remove(); quiz(w, V.questions || [], function (pq) { vocab(); finishBox(w, "cena", u, v, pq, next); }); }
    function vocab() {
      if (!V.vocab || !V.vocab.length) return;
      var g = el("div", { cls: "vocab-list" });
      V.vocab.forEach(function (it) { g.append(el("div", { cls: "vrow" }, el("b", { text: it[0] }), el("span", { text: it[1] }))); });
      w.append(el("div", { cls: "card" }, el("span", { cls: "eyebrow", text: "📒 Do vídeo pra sua boca" }), g));
    }
    loadYT().then(function (YT) { p = new YT.Player(holder, { videoId: V.youtubeId, playerVars: { start: V.start, end: V.end, controls: 1, rel: 0, playsinline: 1, modestbranding: 1, cc_load_policy: 0, iv_load_policy: 3 }, events: { onStateChange: function (e) { if (e.data === 0) open(); } } }); });
  }

  // 🕵️ Fofoca: ouvir → perguntas → recontar falando
  function stFofoca(u, v, next, ctx) {
    var G = u.gossips[v], w = frame("fofoca", u, v, ctx, next), qScore = 0;
    w.append(el("div", { cls: "card" }, el("span", { cls: "eyebrow", text: "🕵️ Fofoca do Sunset Building" }), el("h2", { text: G.title }),
      el("p", { cls: "small", text: "Ouça a fofoca inteira. Sem texto: é treino de ouvido." }),
      player(af(u, "g" + v), { onEnd: function (n) { if (n === 1) { lk.remove(); quiz(w, G.questions || [], function (p) { qScore = p; retell(); }); } } })));
    var lk = lockBox("As perguntas abrem depois que você ouvir a fofoca."); w.append(lk);
    function retell() {
      var R = G.retell || {}, keys = R.keywords || [];
      var chips = el("div", { cls: "chips" });
      var t = talk(function (said, manual) {
        var hit = manual ? keys.length : keys.filter(function (k) { return has(said, k); }).length;
        chips.innerHTML = ""; keys.forEach(function (k) { var ok = manual || has(said, k); chips.append(el("span", { cls: "kchip" + (ok ? " ok" : ""), text: (ok ? "✓ " : "✗ ") + k })); });
        var enough = manual || cw(said).length >= (R.minWords || 15);
        var p = (Math.min(1, hit / Math.max(1, keys.length) * 1.25) * (enough ? 1 : 0.6)) * 0.7 + qScore * 0.3;
        if (!fin) { fin = true; finishBox(w, "fofoca", u, v, p, next, enough ? null : "Tente falar mais: pelo menos " + (R.minWords || 15) + " palavras. Pode gravar de novo."); }
      }, { label: "🎤 Segure e reconte" });
      var fin = false;
      w.append(el("div", { cls: "card" }, el("span", { cls: "eyebrow", text: "🗣️ Agora você conta" }), el("h2", { text: "Reconte a fofoca falando" }),
        el("p", { cls: "small", text: "Comece com: \"So, the story is about…\" Esqueceu? Ouça de novo lá em cima." }), t, chips));
      w.lastChild.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  // 🔁 Shadowing: frase escondida até ouvir → repetir → nota → frase aparece
  function stShadow(u, v, next, ctx) {
    var B = variations(u, "shadow")[v], w = frame("shadow", u, v, ctx, next), i = 0, total = 0;
    w.append(el("p", { cls: "small", text: B.label + " · " + B.list.length + " frases. Ouça, repita colado. A frase só aparece depois." }));
    function one() {
      if (i >= B.list.length) return finishBox(w, "shadow", u, v, total / B.list.length, next);
      var s = B.list[i], url = af(u, s.key), heard = false, tries = 0;
      var line = el("p", { cls: "sh-line blind", text: s.en }), pt = el("p", { cls: "small hide", text: s.pt });
      var score = el("div", { cls: "sh-score" });
      var t = talk(function (said, manual) {
        tries++; var o = manual ? 0.8 : overlap(s.en, said);
        line.classList.remove("blind"); pt.classList.remove("hide");
        score.innerHTML = ""; score.append(el("b", { text: o >= 0.8 ? "✅ " + Math.round(o * 100) + "%" : o >= 0.5 ? "🟡 " + Math.round(o * 100) + "%" : "🔴 " + Math.round(o * 100) + "%" }),
          el("span", { cls: "small", text: said ? "Ouvi: \"" + said + "\"" : "Não ouvi nada." }));
        if (o < 0.6 && tries === 1) addError({ uid: u.id, kind: "shadow", en: s.en, pt: s.pt, file: url });
        if (o >= 0.6 && tries > 1) fixError(s.en);
        nx.disabled = false; nx._o = Math.max(nx._o || 0, o);
      }, { label: "🎤 Segure e repita" });
      t.classList.add("locked");
      var nx = el("button", { cls: "btn", type: "button", text: "Próxima frase →", disabled: true, onclick: function () { total += nx._o || 0; i++; card.classList.add("past"); nx.remove(); one(); } });
      var card = el("div", { cls: "card sh" }, el("span", { cls: "eyebrow", text: "Frase " + (i + 1) + " de " + B.list.length }), line, pt,
        el("div", { cls: "ptools" }, el("button", { cls: "pbtn sm", type: "button", text: "▶", onclick: function () { var a = playUrl(url); a.onended = function () { heard = true; t.classList.remove("locked"); }; } }),
          el("button", { type: "button", text: "🐢", onclick: function () { var a = playUrl(url, 0.75); a.onended = function () { heard = true; t.classList.remove("locked"); }; } }),
          el("span", { cls: "plays", text: "ouça antes de falar" })), t, score, nx);
      w.append(card); card.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    one();
  }

  // ⚡ Real Time: frase em PT, tempo correndo, fala em inglês
  function stRT(u, v, next, ctx) {
    var R = u.realtimes[v], w = frame("rt", u, v, ctx, next), pairs = R.pairs || [], i = 0, total = 0;
    w.append(el("div", { cls: "card" }, el("h2", { text: R.title }), el("p", { cls: "small", text: "Leia a frase em português e fale em inglês, rápido, como numa conversa. ⏱️ " + pairs.length + " frases." })));
    function one() {
      if (i >= pairs.length) {
        var pct = total / Math.max(1, pairs.length);
        w.append(el("div", { cls: "card" }, el("span", { cls: "eyebrow", text: "🎧 O texto inteiro em inglês" }), player(af(u, "rt" + (v + 1)) || "")));
        return finishBox(w, "rt", u, v, pct, next, pct >= 0.7 ? "Real Time aprovado: conta pro domínio do tema." : null);
      }
      var P = pairs[i], secs = Math.max(6, Math.round(cw(P.en).length * 0.9) + 4), left = secs, timer = null, answered = false;
      var ring = el("span", { cls: "timer", text: left + "s" });
      var res = el("div", { cls: "rt-res" });
      var t = talk(function (said, manual) {
        if (answered && !manual) { /* segunda tentativa: só mostra */ }
        clearInterval(timer);
        var o = manual ? 0.8 : bestOverlap([P.en].concat(P.alt || []), said);
        var late = left <= 0;
        var sc = o * (late ? 0.7 : 1);
        if (!answered) { total += sc; if (o < 0.6) addError({ uid: u.id, kind: "rt", en: P.en, pt: P.pt, file: af(u, "rp" + v + "_" + i) }); }
        else if (o >= 0.6) fixError(P.en);
        answered = true;
        res.innerHTML = "";
        res.append(el("b", { text: (o >= 0.8 ? "✅ " : o >= 0.5 ? "🟡 " : "🔴 ") + Math.round(o * 100) + "%" + (late ? " (passou do tempo)" : "") }),
          el("span", { cls: "small", text: said ? "Você: \"" + said + "\"" : "Não ouvi nada." }),
          el("p", { cls: "model" }, el("button", { cls: "ear", type: "button", text: "🔊", onclick: function () { var f = af(u, "rp" + v + "_" + i0); if (f) playUrl(f); } }), el("span", { text: P.en })));
        nx.disabled = false;
      }, { label: "🎤 Segure e fale em inglês" });
      var i0 = i;
      var nx = el("button", { cls: "btn", type: "button", text: "Próxima →", disabled: true, onclick: function () { clearInterval(timer); i++; card.classList.add("past"); nx.remove(); one(); } });
      var card = el("div", { cls: "card rt" }, el("div", { cls: "skrow" }, el("span", { cls: "eyebrow", text: "Frase " + (i + 1) + " de " + pairs.length }), ring),
        el("p", { cls: "rt-pt", text: P.pt }), t, res, nx);
      w.append(card); card.scrollIntoView({ behavior: "smooth", block: "center" });
      timer = setInterval(function () { left--; ring.textContent = left > 0 ? left + "s" : "⏰"; ring.classList.toggle("late", left <= 3); if (left <= 0) clearInterval(timer); }, 1000);
    }
    one();
  }

  // ===== 👂 OUVIDO =====
  // botões de ouvir: normal, devagar e rápido; destrava a resposta depois da 1ª vez
  function ears(url, onHeard, opts) {
    opts = opts || {};
    var heard = false;
    function go(rate) { var a = playUrl(url, rate); a.onended = function () { if (!heard) { heard = true; onHeard && onHeard(); } }; }
    var row = el("div", { cls: "ears" },
      el("button", { cls: "pbtn sm", type: "button", "aria-label": "Ouvir", text: "▶", onclick: function () { go(opts.rate || 1); } }),
      el("button", { cls: "ear", type: "button", text: "🐢 devagar", onclick: function () { go(0.75); } }),
      opts.fast === false ? null : el("button", { cls: "ear", type: "button", text: "🐇 rápido", onclick: function () { go(1.25); } }));
    setTimeout(function () { go(opts.rate || 1); }, 350);
    return row;
  }
  var CONF = { the: ["a", "that"], a: ["the", "her"], an: ["and", "in"], and: ["an", "in"], "in": ["on", "and"], on: ["in", "at"], at: ["it", "and"], it: ["at", "is"], is: ["it's", "his"], "it's": ["is", "its"],
    "i'm": ["I", "I've"], "don't": ["do", "doesn't"], "do": ["to", "you"], you: ["your", "do"], your: ["you", "you're"], can: ["can't", "could"], "can't": ["can", "cat"], want: ["won't", "went"],
    went: ["want", "when"], what: ["want", "watch"], to: ["do", "two"], go: ["going", "goes"], he: ["she", "his"], she: ["he", "see"], his: ["he's", "is"], this: ["these", "that"], there: ["their", "they"],
    they: ["there", "the"], we: ["were", "with"], was: ["is", "were"], were: ["was", "where"], where: ["were", "wear"], are: ["our", "or"], "for": ["four", "from"], of: ["off", "have"], have: ["has", "of"],
    has: ["have", "his"], my: ["me", "may"], me: ["my", "we"], "with": ["which", "we"], wake: ["work", "walk"], work: ["walk", "wake"], live: ["leave", "life"], "i": ["I'm", "a"], so: ["say", "go"],
    no: ["know", "now"], know: ["no", "now"], now: ["no", "know"], here: ["hear", "her"], her: ["here", "his"], up: ["off", "a"], but: ["bad", "both"], not: ["now", "no"], "doesn't": ["don't", "does"],
    "didn't": ["don't", "did"], "isn't": ["is", "it's"], "i'll": ["I", "all"], "let's": ["let", "less"], "she's": ["she", "sees"], "he's": ["he", "his"], "you're": ["your", "you"], "we're": ["were", "we"] };
  var STOP = { a: 1, i: 1 };
  function pickBlanks(line, n) {
    var toks = line.raw.replace(/\*\*([^*]+)\*\*/g, function (_, x) { return x.split(/\s+/).map(function (y) { return "§" + y; }).join(" "); }).split(/\s+/);
    var cand = [];
    toks.forEach(function (t, i) {
      var star = t.charAt(0) === "§", w = core(t.replace(/^§/, "")), lw = w.toLowerCase();
      if (!w || /^\d/.test(w) || STOP[lw] && !star) return;
      var name = i > 0 && /^[A-Z]/.test(w) && lw !== "i" && lw.indexOf("i'") !== 0;
      if (name) return;
      cand.push({ i: i, w: w, sc: (star ? 5 : 0) + (CONF[lw] ? 3 : 0) + Math.random() * 2 + (w.length > 2 ? 1 : 0) });
    });
    cand.sort(function (a, b) { return b.sc - a.sc; });
    var pick = cand.slice(0, n).sort(function (a, b) { return a.i - b.i; });
    return { toks: toks.map(function (t) { return t.replace(/^§/, ""); }), blanks: pick };
  }
  function distract(w, pool) {
    var lw = w.toLowerCase(), out = (CONF[lw] || []).slice();
    shuffle(pool).forEach(function (p) { if (out.length < 2 && p.toLowerCase() !== lw && out.indexOf(p) < 0 && Math.abs(p.length - w.length) <= 3) out.push(p); });
    ["the", "to", "you"].forEach(function (p) { if (out.length < 2 && p !== lw && out.indexOf(p) < 0) out.push(p); });
    if (/^[A-Z]/.test(w)) out = out.map(function (x) { return x.charAt(0).toUpperCase() + x.slice(1); });
    return out.slice(0, 2);
  }
  var LV = [{ k: 1, name: "🟢 Fácil", tip: "1 lacuna, 3 opções" }, { k: 2, name: "🟡 Médio", tip: "2 lacunas, banco com pegadinhas" }, { k: 3, name: "🔴 Difícil", tip: "você escreve o que ouviu" }];
  function lacLevel() { return S.lacLevel || [1, 1, 2, 3][(S.test && S.test.band) || 0]; }
  function eq(a, b) { return canon(a) === canon(b); }
  function joinS(a, m, b) { return [a, m, b].filter(Boolean).join(" ").replace(/ ([.?!,])/g, "$1"); }

  // 🧩 Complete o que ouviu
  function stLacuna(u, v, next, ctx) {
    var B = variations(u, "lacuna")[v], w = frame("lacuna", u, v, ctx, next), lv = lacLevel(), list = B.list.slice(0, 8), i = 0, total = 0;
    var pool = []; B.list.forEach(function (l) { words(l.en).forEach(function (x) { x = core(x); if (x && pool.indexOf(x) < 0) pool.push(x); }); });
    var lvRow = el("div", { cls: "lvrow" });
    LV.forEach(function (L) { lvRow.append(el("button", { cls: "lvb" + (L.k === lv ? " sel" : ""), type: "button", text: L.name, title: L.tip, onclick: function () { if (L.k === lv) return; S.lacLevel = L.k; persist(); stLacuna(u, v, next, ctx); } })); });
    w.append(el("div", { cls: "card" }, el("h2", { text: B.label }), el("p", { cls: "small", text: "O nativo fala uma frase e algumas palavras somem. Ouça e complete. " + LV[lv - 1].tip + "." }), lvRow));
    function one() {
      if (i >= list.length) return finishBox(w, "lacuna", u, v, total / list.length, next);
      var L = list[i], nb = lv === 1 ? 1 : Math.min(2, Math.max(1, words(L.en).length >= 5 ? 2 : 1)), P = pickBlanks(L, nb), fills = [], done = false;
      var line = el("p", { cls: "lac-line" }), slots = [];
      P.toks.forEach(function (t, ti) {
        var b = P.blanks.filter(function (x) { return x.i === ti; })[0];
        if (!b) { line.append(el("span", { text: t }), " "); return; }
        var pre = t.slice(0, t.indexOf(b.w)), post = t.slice(t.indexOf(b.w) + b.w.length);
        var slot;
        if (lv === 3) { slot = el("input", { cls: "slot-in", type: "text", autocapitalize: "off", autocomplete: "off", spellcheck: "false", size: String(Math.max(3, b.w.length)), "aria-label": "palavra que falta" }); }
        else slot = el("button", { cls: "slot", type: "button", text: "____", onclick: function () { if (done || lv !== 2) return; var k = slots.indexOf(slot); if (fills[k] != null) { bankBtns[fills[k]].disabled = false; fills[k] = null; slot.textContent = "____"; slot.classList.remove("full"); } } });
        slot._ans = b.w; slots.push(slot);
        if (pre) line.append(el("span", { text: pre })); line.append(slot); if (post) line.append(el("span", { text: post })); line.append(" ");
      });
      var answer = el("div", { cls: "lac-ans" }), res = el("div", { cls: "rt-res" }), bankBtns = [];
      var check = el("button", { cls: "btn", type: "button", text: "Conferir", disabled: true, onclick: grade });
      var locked = true;
      function unlock() { locked = false; answer.classList.remove("locked"); }
      if (lv === 1) {
        var b0 = P.blanks[0], opts = shuffle([b0.w].concat(distract(b0.w, pool)));
        opts.forEach(function (o) { answer.append(el("button", { cls: "opt word", type: "button", text: o, onclick: function (e) { if (done || locked) return; slots[0].textContent = o; slots[0].classList.add("full"); fills[0] = o; e.currentTarget.classList.add("sel"); grade(); } })); });
      } else if (lv === 2) {
        var bank = []; P.blanks.forEach(function (b) { bank.push(b.w); distract(b.w, pool).slice(0, 2).forEach(function (d) { if (bank.indexOf(d) < 0) bank.push(d); }); });
        bank = shuffle(bank.slice(0, P.blanks.length + 3));
        bank.forEach(function (o, bi) {
          var bb = el("button", { cls: "opt word", type: "button", text: o, onclick: function () {
            if (done || locked) return; var k = fills.findIndex ? -1 : -1; for (var z = 0; z < slots.length; z++) if (fills[z] == null) { k = z; break; }
            if (k < 0) return; fills[k] = bi; slots[k].textContent = o; slots[k].classList.add("full"); bb.disabled = true;
            check.disabled = fills.filter(function (x) { return x != null; }).length < slots.length;
          } });
          bankBtns.push(bb); answer.append(bb);
        });
        answer.append(check);
      } else {
        slots.forEach(function (sl) { sl.addEventListener("input", function () { check.disabled = slots.some(function (x) { return !x.value.trim(); }); }); sl.addEventListener("keydown", function (e) { if (e.key === "Enter" && !check.disabled) grade(); }); });
        answer.append(check);
      }
      answer.classList.add("locked");
      function grade() {
        if (done) return; done = true; var ok = 0;
        slots.forEach(function (sl, k) {
          var got = lv === 3 ? sl.value.trim() : (lv === 2 ? (fills[k] != null ? bankBtns[fills[k]].textContent : "") : fills[k]);
          var good = eq(got || "", sl._ans);
          if (good) ok++;
          var shown = el("span", { cls: "slot done " + (good ? "ok" : "bad") }, got && !good ? el("s", { text: got }) : null, got && !good ? " " : null, sl._ans);
          sl.replaceWith(shown);
        });
        check.remove(); answer.querySelectorAll("button").forEach(function (b) { b.disabled = true; });
        var pct = ok / slots.length; total += pct; buzz(pct === 1 ? 20 : [40, 30, 40]);
        if (pct < 1) addError({ uid: u.id, kind: "ouvir", en: L.en, pt: L.pt, file: L.file, prompt: P.toks.map(function (t, ti) { var b = P.blanks[0]; return b.i === ti ? t.replace(b.w, "____") : t; }).join(" "), choices: shuffle([P.blanks[0].w].concat(distract(P.blanks[0].w, pool))), answer: P.blanks[0].w });
        res.append(el("b", { text: pct === 1 ? "✅ Pegou tudo!" : pct > 0 ? "🟡 Quase" : "🔴 Essa escapou" }), el("span", { cls: "small", text: L.pt }));
        nx.disabled = false;
      }
      var nx = el("button", { cls: "btn", type: "button", text: "Próxima frase →", disabled: true, onclick: function () { i++; card.classList.add("past"); nx.remove(); one(); } });
      var card = el("div", { cls: "card" }, el("span", { cls: "eyebrow", text: "Frase " + (i + 1) + " de " + list.length }), ears(L.file, unlock), line, answer, res, nx);
      w.append(card); card.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    one();
  }

  // 🔢 Quantas palavras?
  function stContar(u, v, next, ctx) {
    var B = variations(u, "contar")[v], w = frame("contar", u, v, ctx, next), list = B.list, i = 0, ok = 0;
    w.append(el("div", { cls: "card" }, el("h2", { text: B.label }), el("p", { cls: "small", text: "O nativo cola uma palavra na outra. Ouça e diga quantas palavras tem a frase. \"I'm\", \"don't\" e \"it's\" contam como 1." })));
    function one() {
      if (i >= list.length) return finishBox(w, "contar", u, v, ok / list.length, next);
      var L = list[i], ws = words(L.en), n = ws.length, done = false;
      var opts = el("div", { cls: "opts row locked" }), res = el("div", { cls: "rt-res" });
      shuffle([n - 1, n, n + 1].filter(function (x) { return x > 1; })).forEach(function (x) {
        opts.append(el("button", { cls: "opt num", type: "button", text: String(x), onclick: function (e) {
          if (done) return; done = true; var good = x === n; if (good) ok++; e.currentTarget.classList.add(good ? "ok" : "bad"); buzz(good ? 20 : [40, 30, 40]);
          var boxes = el("p", { cls: "wbox" }); ws.forEach(function (t) { boxes.append(el("span", { text: t })); });
          res.append(el("b", { text: good ? "✅ Isso: " + n + " palavras" : "🔴 Eram " + n + " palavras" }), boxes, el("span", { cls: "small", text: L.pt }));
          nx.disabled = false;
        } }));
      });
      var nx = el("button", { cls: "btn", type: "button", text: "Próxima →", disabled: true, onclick: function () { i++; card.classList.add("past"); nx.remove(); one(); } });
      var card = el("div", { cls: "card" }, el("span", { cls: "eyebrow", text: "Frase " + (i + 1) + " de " + list.length }), el("p", { cls: "hidden-line", text: "🙈 frase escondida" }), ears(L.file, function () { opts.classList.remove("locked"); }, { rate: 1.1 }), opts, res, nx);
      w.append(card); card.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    one();
  }

  // 🔗 Fala grudada
  function stGrudada(u, v, next, ctx) {
    var B = variations(GERAL, "grudada")[v], w = frame("grudada", u, v, ctx, next), list = B.list, i = 0, ok = 0;
    w.append(el("div", { cls: "card" }, el("h2", { text: B.label }), el("p", { cls: "small", text: "Nativo não fala \"what do you want to\". Fala \"whaddaya wanna\". Ouça e escolha o que ele quis dizer." })));
    function one() {
      if (i >= list.length) return finishBox(w, "grudada", u, v, ok / list.length, next);
      var it = list[i], url = AUD + it.file, done = false, res = el("div", { cls: "rt-res" });
      var opts = el("div", { cls: "opts locked" });
      shuffle(it.options.map(function (o, k) { return k; })).forEach(function (k) {
        opts.append(el("button", { cls: "opt", type: "button", text: it.options[k], onclick: function (e) {
          if (done) return; done = true; var good = k === it.answer; if (good) ok++; e.currentTarget.classList.add(good ? "ok" : "bad"); buzz(good ? 20 : [40, 30, 40]);
          if (!good) { [].forEach.call(opts.children, function (b) { if (b.textContent === it.options[it.answer]) b.classList.add("ok"); }); addError({ uid: "geral", kind: "ouvir", en: it.options[it.answer], pt: it.pt, file: url, prompt: "🔗 O que ele quis dizer?", choices: it.options.slice(), answer: it.options[it.answer] }); }
          res.append(el("p", { cls: "model" }, el("span", { text: "🔗 " + it.tip })), el("span", { cls: "small", text: "\"" + it.tts + "\" = " + it.pt }));
          nx.disabled = false;
        } }));
      });
      var nx = el("button", { cls: "btn", type: "button", text: "Próxima →", disabled: true, onclick: function () { i++; card.classList.add("past"); nx.remove(); one(); } });
      var card = el("div", { cls: "card" }, el("span", { cls: "eyebrow", text: (i + 1) + " de " + list.length }), ears(url, function () { opts.classList.remove("locked"); }, { fast: false }), opts, res, nx);
      w.append(card); card.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    one();
  }

  // 🎯 Qual você ouviu?
  function stPares(u, v, next, ctx) {
    var B = variations(GERAL, "pares")[v], w = frame("pares", u, v, ctx, next), list = shuffle(B.list), i = 0, ok = 0;
    w.append(el("div", { cls: "card" }, el("h2", { text: B.label }), el("p", { cls: "small", text: "Duas palavras quase iguais. O nativo fala uma delas: qual foi?" })));
    function one() {
      if (i >= list.length) return finishBox(w, "pares", u, v, ok / list.length, next);
      var it = list[i], k = Math.random() < 0.5 ? 0 : 1, url = AUD + it.files[k], done = false, res = el("div", { cls: "rt-res" });
      var opts = el("div", { cls: "opts row locked" });
      it.words.forEach(function (wd, wk) {
        opts.append(el("button", { cls: "opt pair", type: "button", onclick: function (e) {
          if (done) return; done = true; var good = wk === k; if (good) ok++; e.currentTarget.classList.add(good ? "ok" : "bad"); buzz(good ? 20 : [40, 30, 40]);
          if (!good) { opts.children[k].classList.add("ok"); addError({ uid: "geral", kind: "ouvir", en: joinS(it.before, it.words[k], it.after), pt: it.pt[k], file: url, prompt: joinS(it.before, "____", it.after), choices: it.words.slice(), answer: it.words[k] }); }
          res.append(el("b", { text: good ? "✅ Isso! \"" + it.words[k] + "\"" : "🔴 Era \"" + it.words[k] + "\"" }),
            el("div", { cls: "ears" }, el("button", { cls: "ear", type: "button", text: "🔊 " + it.words[0], onclick: function () { playUrl(AUD + it.files[0]); } }), el("button", { cls: "ear", type: "button", text: "🔊 " + it.words[1], onclick: function () { playUrl(AUD + it.files[1]); } })),
            el("span", { cls: "small", text: "Ouça as duas e sinta a diferença." }));
          nx.disabled = false;
        } }, el("b", { text: wd }), el("span", { cls: "small", text: it.pt[wk] })));
      });
      var nx = el("button", { cls: "btn", type: "button", text: "Próxima →", disabled: true, onclick: function () { i++; card.classList.add("past"); nx.remove(); one(); } });
      var card = el("div", { cls: "card" }, el("span", { cls: "eyebrow", text: (i + 1) + " de " + list.length }), el("p", { cls: "lac-line", text: joinS(it.before, "____", it.after) }), ears(url, function () { opts.classList.remove("locked"); }, { fast: false }), opts, res, nx);
      w.append(card); card.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    one();
  }

  // 🧠 Meus erros: refaz o que errou (shadowing e real time)
  function runErrors(next, ci, cn) {
    next = next || home;
    var w = screen(), list = S.errors.slice(0, 6), i = 0, fixed = 0;
    w.append(topBar(home), el("div", { cls: "thead" }, el("span", { cls: "eyebrow", text: (cn ? "Treino do dia · " + ci + " de " + cn + " · " : "") + "🧠 Meus erros" })),
      el("h1", { text: "O que você errou volta aqui" }), el("p", { cls: "small", text: "Acertou? Sai da lista. Errou de novo? Volta outro dia." }));
    function one() {
      if (i >= list.length) {
        markDay(); persist();
        w.append(el("div", { cls: "sheet good" }, el("b", { text: "Revisão feita: " + fixed + " de " + list.length + " saíram da lista" }), el("button", { cls: "btn", type: "button", text: next === home ? "Voltar pro início" : "Próximo →", onclick: function () { next(); } })));
        return;
      }
      var e = list[i], res = el("div", { cls: "rt-res" });
      if (e.kind === "ouvir") {
        var dn = false, op = el("div", { cls: "opts locked" });
        shuffle(e.choices).forEach(function (c) { op.append(el("button", { cls: "opt", type: "button", text: c, onclick: function (ev) {
          if (dn) return; dn = true; var good = eq(c, e.answer); ev.currentTarget.classList.add(good ? "ok" : "bad");
          if (good) { fixError(e.en); fixed++; } res.append(el("b", { text: good ? "✅ Pegou!" : "🔴 Era \"" + e.answer + "\"" }), el("span", { cls: "small", text: e.en + " · " + e.pt })); nx2.disabled = false; } })); });
        var nx2 = el("button", { cls: "btn", type: "button", text: "Próximo →", disabled: true, onclick: function () { i++; card2.classList.add("past"); nx2.remove(); one(); } });
        var card2 = el("div", { cls: "card" }, el("span", { cls: "eyebrow", text: "👂 Ouça de novo · " + (i + 1) + " de " + list.length }), ears(e.file, function () { op.classList.remove("locked"); }), el("p", { cls: "lac-line", text: e.prompt }), op, res, nx2);
        w.append(card2); card2.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      var t = talk(function (said, manual) {
        var o = manual ? 0.8 : overlap(e.en, said);
        res.innerHTML = ""; res.append(el("b", { text: (o >= 0.6 ? "✅ " : "🔴 ") + Math.round(o * 100) + "%" }), el("p", { cls: "model", text: e.en }));
        if (o >= 0.6) { fixError(e.en); fixed++; }
        nx.disabled = false;
      }, { label: e.kind === "rt" ? "🎤 Segure e fale em inglês" : "🎤 Segure e repita" });
      var nx = el("button", { cls: "btn", type: "button", text: "Próximo →", disabled: true, onclick: function () { i++; card.classList.add("past"); nx.remove(); one(); } });
      var card = el("div", { cls: "card" }, el("span", { cls: "eyebrow", text: (e.kind === "rt" ? "⚡ Passe pro inglês" : "🔁 Ouça e repita") + " · " + (i + 1) + " de " + list.length }),
        e.kind === "rt" ? el("p", { cls: "rt-pt", text: e.pt }) : el("div", { cls: "ptools" }, el("button", { cls: "pbtn sm", type: "button", text: "▶", onclick: function () { if (e.file) playUrl(e.file); } }), el("span", { cls: "small", text: e.pt })),
        t, res, nx);
      w.append(card); card.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    one();
  }

  // ---------- início ----------
  loadIndex().then(function () {
    if (Q.get("teste") === "1") return runTest();
    if (Q.get("resultado") === "1" && S.test) return result();
    S.test ? home() : welcome();
  }).catch(function () { root.innerHTML = "<p class='boot'>Não consegui carregar. Confira a internet e recarregue.</p>"; });
})();
