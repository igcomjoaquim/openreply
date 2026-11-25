/* Aprender — Inglês com Joaquim.
 * Trilha A1 para estudar sozinho, no método das aulas: cada matéria tem 6 fases
 * (Aula → Lição de casa → Fofoca 1 → Fofoca 2 → Real Time 1 → Real Time 2) que
 * destravam em sequência. Tudo roda no navegador: conteúdo em data/, áudios em
 * audio/, progresso e repetição espaçada guardados no aparelho (localStorage). */
(function () {
  "use strict";
  var root = document.getElementById("app");
  var BASE = "/aprender/";
  var KEY = "aprender:v1";
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var Q = new URLSearchParams(location.search);
  var ALL = Q.get("tudo") === "1"; // modo professor: tudo destravado

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
  function rich(s) { return esc(s || "").replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\*(.+?)\*/g, "<i>$1</i>"); }
  function plain(s) { return String(s || "").replace(/\*\*?/g, "").replace(/\[\[([^\]]+)\]\]/g, function (_, a) { return a.split("|")[0]; }); }
  function norm(s) {
    return String(s).toLowerCase().replace(/[’‘`´]/g, "'").replace(/\b([ap])\.m\./g, "$1m")
      .replace(/\$\s?(\d)/g, "$1").replace(/[^a-z0-9' ]/g, " ").replace(/\s+/g, " ").trim();
  }
  // contrações e números escritos contam igual: I'm = I am, 7 = seven
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
  function words(s) { return norm(s).split(" ").filter(Boolean); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function today() { var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function addDays(iso, n) { var d = new Date(iso + "T12:00:00"); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }
  function daysBetween(a, b) { return Math.round((new Date(b + "T12:00:00") - new Date(a + "T12:00:00")) / 86400000); }

  // ---------- progresso (no aparelho) ----------
  var S = (function () { try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { return null; } })() || {};
  S.phases = S.phases || {}; S.xp = S.xp || 0; S.cards = S.cards || {}; S.medals = S.medals || {}; S.days = S.days || [];
  S.best = S.best || { combo: 0 }; S.resume = S.resume || {};
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  function markDay() {
    var t = today(); if (S.days.indexOf(t) < 0) { S.days.push(t); S.days = S.days.slice(-400); }
  }
  function streak() {
    var t = today(), n = 0, d = S.days.indexOf(t) > -1 ? t : addDays(t, -1);
    while (S.days.indexOf(d) > -1) { n++; d = addDays(d, -1); }
    return n;
  }

  // ---------- repetição espaçada (caixas de Leitner) ----------
  // Erro → volta já na próxima fase (e na revisão de hoje). Cada acerto na revisão empurra: 1, 3, 7, 14, 30 dias. Errou de novo → caixa 0.
  var GAPS = [1, 3, 7, 14, 30, 60];
  // card: {id, kind:"tr"|"mcq"|"word", pt, en, alt, q, options, answer, why, unit, from, box, due, wrong, seen}
  function addCard(c, wrong) {
    var old = S.cards[c.id];
    if (old) { if (c.qPt) old.qPt = c.qPt; if (c.optionsPt) old.optionsPt = c.optionsPt;
      if (wrong) { old.box = 0; old.due = today(); old.wrong = (old.wrong || 0) + 1; old.lastWrong = today(); }
      return;
    }
    c.box = wrong ? 0 : 1; c.due = wrong ? today() : addDays(today(), 3); c.wrong = wrong ? 1 : 0; c.seen = today();
    if (wrong) c.lastWrong = today();
    S.cards[c.id] = c;
  }
  function reviewResult(c, ok) {
    var card = S.cards[c.id]; if (!card) return;
    if (ok) { card.box = Math.min(GAPS.length - 1, (card.box || 0) + 1); card.due = addDays(today(), GAPS[card.box]); }
    else { card.box = 0; card.due = addDays(today(), 1); card.wrong = (card.wrong || 0) + 1; card.lastWrong = today(); }
    card.last = today();
  }
  function dueCards(max) {
    var t = today();
    return Object.keys(S.cards).map(function (k) { return S.cards[k]; })
      .filter(function (c) { return c.due <= t; })
      .sort(function (a, b) { return (a.box - b.box) || (b.wrong - a.wrong) || (a.due < b.due ? -1 : 1); })
      .slice(0, max || 999);
  }

  // ---------- sons 8-bit (originais, gerados na hora) ----------
  var SFX = (function () {
    var ctx = null, on = true;
    try { on = localStorage.getItem("aprender:som") !== "0"; } catch (e) {}
    function c() { if (!ctx) { var A = window.AudioContext || window.webkitAudioContext; if (!A) return null; try { ctx = new A(); } catch (e) { return null; } } if (ctx.state === "suspended") { try { ctx.resume(); } catch (e) {} } return ctx; }
    function tone(f, t0, d, type, vol) { var x = c(); if (!x) return; var o = x.createOscillator(), g = x.createGain(), t = x.currentTime + t0; o.type = type || "square"; o.frequency.setValueAtTime(f, t); g.gain.setValueAtTime(vol || 0.07, t); g.gain.exponentialRampToValueAtTime(0.0008, t + d); o.connect(g); g.connect(x.destination); o.start(t); o.stop(t + d + 0.03); }
    function seq(n, st, type, vol) { if (!on) return; n.forEach(function (f, i) { if (f) tone(f, i * st, st * 0.95, type, vol); }); }
    return {
      ok: function () { seq([784, 1047], 0.07, "square", 0.06); },
      bad: function () { if (!on) return; tone(330, 0, 0.12, "triangle", 0.09); tone(247, 0.12, 0.2, "triangle", 0.09); },
      combo: function (n) { var b = 523 * Math.pow(1.0595, Math.min(n, 12) * 2); seq([b, b * 1.26, b * 1.5], 0.05, "square", 0.06); },
      tick: function () { seq([784], 0.06, "triangle", 0.09); },
      go: function () { seq([1047, 1568], 0.06, "square", 0.06); },
      tap: function () { seq([660], 0.03, "triangle", 0.05); },
      win: function () { seq([392, 523, 659, 784, 0, 659, 784, 0, 1047, 1047, 1047], 0.1); },
      unlock: function () { seq([523, 659, 784, 1047, 1319], 0.07, "square", 0.06); },
      isOn: function () { return on; },
      toggle: function () { on = !on; try { localStorage.setItem("aprender:som", on ? "1" : "0"); } catch (e) {} if (on) seq([659, 988], 0.07); return on; },
    };
  })();
  function confetti() {
    if (reduce) return;
    var cv = el("canvas", { cls: "confetti" }); document.body.append(cv);
    var W = cv.width = innerWidth, H = cv.height = innerHeight, g = cv.getContext("2d"), cols = ["#FFD21F", "#7A2E3A", "#2E7D4F", "#C49A6C", "#ffffff"], ps = [];
    for (var i = 0; i < 140; i++) ps.push({ x: Math.random() * W, y: -20 - Math.random() * H * 0.5, vx: (Math.random() - 0.5) * 3, vy: 2 + Math.random() * 4, r: 4 + Math.random() * 5, a: Math.random() * 6, c: cols[i % cols.length] });
    var t0 = performance.now();
    (function draw(t) { g.clearRect(0, 0, W, H); ps.forEach(function (p) { p.x += p.vx; p.y += p.vy; p.a += 0.1; g.save(); g.translate(p.x, p.y); g.rotate(p.a); g.fillStyle = p.c; g.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); g.restore(); }); if (t - t0 < 3000) requestAnimationFrame(draw); else cv.remove(); })(t0);
  }

  // ---------- áudio ----------
  var player = new Audio();
  function audioUrl(unit, key) { var f = unit && unit.audio && unit.audio[key]; return f ? BASE + "audio/" + f : null; }
  function voice(t, slow) {
    try { var u = new SpeechSynthesisUtterance(plain(t)); u.lang = "en-US"; u.rate = slow ? 0.7 : 0.9; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) {}
  }
  // toca o mp3 da frase se existir; senão, a voz do celular
  function say(unit, key, text, slow) {
    var url = audioUrl(unit, key);
    if (url) { try { speechSynthesis.cancel(); } catch (e) {} player.src = url; player.playbackRate = slow ? 0.75 : 1; player.play().catch(function () { voice(text, slow); }); }
    else voice(text, slow);
  }
  function ear(unit, key, text, label) {
    return el("button", { cls: "ear", type: "button", "aria-label": "Ouvir", text: label || "🔊", onclick: function (e) { e.stopPropagation(); say(unit, key, text); } });
  }
  // player grande: ▶ / ⏪ 5 s / 🐢 0.75× e um contador de quantas vezes ouviu
  function bigPlayer(url, opts) {
    opts = opts || {};
    var a = new Audio(url); a.preload = "auto";
    var plays = 0, slow = false;
    var count = el("span", { cls: "plays", text: opts.goal ? (opts.goal === 1 ? "Toque no ▶ pra ouvir" : "Ouviu 0 de " + opts.goal + " vezes") : "" });
    var fill = el("i"), bar = el("div", { cls: "pbar" }, fill);
    var play = el("button", { cls: "pbtn", type: "button", "aria-label": "Tocar", text: "▶" });
    a.addEventListener("timeupdate", function () { if (a.duration) fill.style.width = (a.currentTime / a.duration * 100) + "%"; });
    a.addEventListener("play", function () { play.textContent = "⏸"; });
    a.addEventListener("pause", function () { play.textContent = "▶"; });
    a.addEventListener("ended", function () {
      play.textContent = "↺"; plays++; if (opts.goal) count.textContent = plays >= opts.goal ? "✅ Ouviu " + plays + (plays === 1 ? " vez" : " vezes") : "Ouviu " + plays + " de " + opts.goal + " vezes";
      if (opts.onPlays) opts.onPlays(plays);
    });
    play.onclick = function () { if (a.paused) { if (a.ended) a.currentTime = 0; a.play().catch(function () {}); } else a.pause(); };
    bar.onclick = function (e) { var r = bar.getBoundingClientRect(); if (a.duration) a.currentTime = (e.clientX - r.left) / r.width * a.duration; };
    var box = el("div", { cls: "player" },
      el("div", { cls: "prow" }, play, bar),
      el("div", { cls: "ptools" },
        el("button", { type: "button", text: "⏪ 5 s", onclick: function () { a.currentTime = Math.max(0, a.currentTime - 5); a.play().catch(function () {}); } }),
        el("button", { type: "button", text: "🐢 0.75×", onclick: function (e) { slow = !slow; a.playbackRate = slow ? 0.75 : 1; e.currentTarget.textContent = slow ? "🐇 1×" : "🐢 0.75×"; e.currentTarget.classList.toggle("sel", slow); } }),
        count));
    box._audio = a;
    return box;
  }

  // ---------- reconhecimento de fala ----------
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  /* Botão de gravar: contagem 3-2-1 → 🔴 FALE AGORA → toque para parar. onDone(texto). */
  function micButton(onText, onDone, label, auto) {
    var b = el("button", { cls: "mic", type: "button", text: label || "🎤 Gravar" });
    var rec = null, finals = "", interim = "", live = false, stopping = false;
    function stop() { if (!rec || stopping) return; stopping = true; b.disabled = true; b.textContent = "⏳ Entendendo…"; try { rec.stop(); } catch (e) {} setTimeout(end, 2500); }
    function end() {
      if (!rec) return; var t = (finals + " " + interim).trim(); rec = null; live = false; stopping = false;
      b.disabled = false; b.classList.remove("live"); b.textContent = "🎤 Gravar de novo"; onDone(t);
    }
    b.onclick = function () {
      if (live) { stop(); return; }
      if (rec) return;
      finals = ""; interim = "";
      rec = new SR(); rec.lang = "en-US"; rec.continuous = true; rec.interimResults = true;
      var quiet = null;
      rec.onresult = function (e) { interim = ""; for (var i = e.resultIndex; i < e.results.length; i++) { if (e.results[i].isFinal) finals += " " + e.results[i][0].transcript; else interim += " " + e.results[i][0].transcript; } onText((finals + " " + interim).trim());
        if (auto && live) { clearTimeout(quiet); quiet = setTimeout(function () { if (live && finals.trim()) stop(); }, 1600); } };
      var restarts = 0;
      rec.onend = function () { if (!rec) return; if (!stopping && restarts++ < 15) { try { rec.start(); } catch (e) {} } else { stopping = true; end(); } };
      rec.onerror = function (ev) { if (ev.error === "not-allowed" || ev.error === "service-not-allowed") { live = false; rec = null; b.disabled = false; b.textContent = "🎤 Gravar"; onDone(null, "blocked"); } };
      b.disabled = true;
      try { rec.start(); } catch (e) {}
      var n = 3; b.classList.add("counting");
      (function tick() {
        if (!rec) { b.classList.remove("counting"); return; }
        if (n === 0) { b.classList.remove("counting"); b.disabled = false; live = true; b.classList.add("live"); b.textContent = auto ? "🔴 FALE AGORA!" : "🔴 FALE AGORA! (toque para parar)"; SFX.go(); return; }
        b.textContent = "Prepare-se… " + n; n--; SFX.tick(); setTimeout(tick, 650);
      })();
    };
    b._stop = stop;
    return b;
  }

  // ---------- estado da tela ----------
  var INDEX = null, UNITS = {};
  function loadIndex() { return fetch(BASE + "data/index.json?v=" + (window.__v || 1)).then(function (r) { return r.json(); }).then(function (j) { INDEX = j; return j; }); }
  function loadUnit(id) {
    if (UNITS[id]) return Promise.resolve(UNITS[id]);
    return fetch(BASE + "data/" + id + ".json?v=" + (window.__v || 1)).then(function (r) { return r.json(); }).then(function (u) { UNITS[id] = u; return u; });
  }
  var PHASES = [
    { key: "aula", icon: "🎬", name: "Aula", desc: "Vídeo, áudio e as frases novas" },
    { key: "licao", icon: "🏠", name: "Lição de casa", desc: "O desafio: prove que aprendeu" },
    { key: "fofoca1", icon: "🕵️", name: "Fofoca 1", desc: "Ouvir e entender" },
    { key: "fofoca2", icon: "🕵️", name: "Fofoca 2", desc: "Outra fofoca, mesma matéria" },
    { key: "rt1", icon: "⚡", name: "Real Time 1", desc: "Do português direto pro inglês" },
    { key: "rt2", icon: "⚡", name: "Real Time 2", desc: "Fechando a matéria" },
  ];
  function pkey(uid, k) { return uid + ":" + k; }
  function isDone(uid, k) { return !!S.phases[pkey(uid, k)]; }
  function unitDone(uid) { return PHASES.every(function (p) { return isDone(uid, p.key); }); }
  function unitOpen(i) { return ALL || i === 0 || unitDone(INDEX.units[i - 1].id); }
  function phaseOpen(i, j) { return ALL || (unitOpen(i) && (j === 0 || isDone(INDEX.units[i].id, PHASES[j - 1].key))); }
  function current() {
    for (var i = 0; i < INDEX.units.length; i++) for (var j = 0; j < PHASES.length; j++) if (!isDone(INDEX.units[i].id, PHASES[j].key)) return { i: i, j: j };
    return null;
  }
  function stars(pct) { return pct >= 0.9 ? 3 : pct >= 0.6 ? 2 : 1; }
  function starText(n) { return ["☆☆☆", "⭐☆☆", "⭐⭐☆", "⭐⭐⭐"][n]; }
  var LEVELS = [[0, "Iniciante"], [60, "Curioso"], [160, "Ouvinte"], [300, "Fofoqueiro"], [480, "Tagarela"], [700, "Contador de histórias"], [960, "Mestre da fofoca"], [1260, "Quase A2"], [1600, "A1 completo 🏆"]];
  function level() { var l = 0; LEVELS.forEach(function (x, i) { if (S.xp >= x[0]) l = i; }); var nx = LEVELS[l + 1]; return { n: l + 1, name: LEVELS[l][1], next: nx ? nx[1] : null, toNext: nx ? nx[0] - S.xp : 0, pct: nx ? Math.round((S.xp - LEVELS[l][0]) / (nx[0] - LEVELS[l][0]) * 100) : 100 }; }

  // ---------- medalhas ----------
  var MEDALS = [
    { id: "primeira", icon: "🎒", name: "Primeiro passo", desc: "Terminou a primeira fase" },
    { id: "materia", icon: "📗", name: "Matéria fechada", desc: "Terminou todas as fases de uma matéria" },
    { id: "perfeita", icon: "⭐", name: "Fase perfeita", desc: "3 estrelas numa fase" },
    { id: "combo5", icon: "🔥", name: "Combo x5", desc: "5 acertos seguidos" },
    { id: "combo10", icon: "☄️", name: "Combo x10", desc: "10 acertos seguidos" },
    { id: "revisao", icon: "🔁", name: "Não esqueço", desc: "Fez uma revisão de erros" },
    { id: "ofensiva3", icon: "📅", name: "3 dias seguidos", desc: "Estudou 3 dias sem parar" },
    { id: "ofensiva7", icon: "🗓️", name: "7 dias seguidos", desc: "Uma semana inteira" },
    { id: "fofoqueiro", icon: "🕵️", name: "Fofoqueiro oficial", desc: "Terminou 6 fofocas" },
    { id: "realtime", icon: "⚡", name: "Tradutor relâmpago", desc: "Terminou 6 Real Times" },
    { id: "metade", icon: "🧭", name: "Meio caminho", desc: "Metade do A1" },
    { id: "a1", icon: "🏆", name: "A1 completo", desc: "Terminou a trilha inteira" },
  ];
  function grant(id) { if (S.medals[id]) return null; S.medals[id] = today(); return MEDALS.filter(function (m) { return m.id === id; })[0]; }
  function checkMedals(extra) {
    var got = [], keys = Object.keys(S.phases), push = function (m) { if (m) got.push(m); };
    if (keys.length) push(grant("primeira"));
    if (INDEX.units.some(function (u) { return unitDone(u.id); })) push(grant("materia"));
    if (keys.some(function (k) { return S.phases[k].stars === 3; })) push(grant("perfeita"));
    if (S.best.combo >= 5) push(grant("combo5"));
    if (S.best.combo >= 10) push(grant("combo10"));
    if (extra === "revisao") push(grant("revisao"));
    var st = streak(); if (st >= 3) push(grant("ofensiva3")); if (st >= 7) push(grant("ofensiva7"));
    if (keys.filter(function (k) { return /fofoca/.test(k); }).length >= 6) push(grant("fofoqueiro"));
    if (keys.filter(function (k) { return /:rt/.test(k); }).length >= 6) push(grant("realtime"));
    var doneUnits = INDEX.units.filter(function (u) { return unitDone(u.id); }).length;
    if (doneUnits >= Math.ceil(INDEX.units.length / 2)) push(grant("metade"));
    if (doneUnits === INDEX.units.length) push(grant("a1"));
    return got;
  }

  // =====================================================================
  //  TELA 1 — A TRILHA
  // =====================================================================
  function topBar(extra) {
    var lv = level(), st = streak();
    return el("div", { cls: "top" },
      el("span", { cls: "brand", text: "Inglês com Joaquim" }),
      el("span", { cls: "stats" },
        el("span", { cls: "stat fire" + (S.days.indexOf(today()) > -1 ? " lit" : ""), title: "Ofensiva: dias seguidos estudando", text: "🔥 " + st }),
        el("span", { cls: "stat", title: "XP", text: "⭐ " + S.xp }),
        el("button", { cls: "stat sound", type: "button", "aria-label": "Som", text: SFX.isOn() ? "🔊" : "🔇", onclick: function (e) { e.currentTarget.textContent = SFX.toggle() ? "🔊" : "🔇"; } })),
      extra || null);
  }

  function home(scrollToCur) {
    if (location.hash && location.hash !== "#") history.replaceState(null, "", location.pathname + location.search);
    if (!S.name) return onboarding();
    var cur = current(), U = INDEX.units, lv = level();
    var doneUnits = U.filter(function (u) { return unitDone(u.id); }).length;
    var donePhases = Object.keys(S.phases).length, totalPhases = U.length * PHASES.length;
    var pct = Math.round(donePhases / totalPhases * 100);
    var wrap = el("div", { cls: "wrap trail-page" });
    wrap.append(topBar());

    // boas-vindas + onde estou na trajetória
    var hello = el("section", { cls: "hello" },
      el("span", { cls: "hand", text: "Hi, " + S.name + "! 👋" }),
      el("h1", { text: cur ? "Sua trilha até o A1" : "Você completou o A1! 🏆" }),
      el("div", { cls: "journey" },
        el("div", { cls: "jbar" }, el("i", { style: "width:" + pct + "%" })),
        el("div", { cls: "jlabels" },
          el("span", { html: "<b>" + pct + "%</b> do A1" }),
          el("span", { text: cur ? "Matéria " + (cur.i + 1) + " de " + U.length + " · faltam " + (U.length - doneUnits) : "13 de 13 matérias" }))),
      el("div", { cls: "lvl" }, el("span", { cls: "lvl-badge", text: "Nível " + lv.n }), el("b", { text: lv.name }),
        el("span", { cls: "small", text: lv.next ? "faltam " + lv.toNext + " XP para " + lv.next : "nível máximo!" })));
    wrap.append(hello);

    // revisão espaçada de hoje
    var due = dueCards();
    if (due.length) {
      var wrongN = due.filter(function (c) { return c.lastWrong; }).length;
      wrap.append(el("section", { cls: "review-card" },
        el("div", null, el("b", { text: "🔁 Revisão de hoje: " + due.length + (due.length === 1 ? " item" : " itens") }),
          el("p", { cls: "small", text: wrongN ? wrongN + " são coisas que você errou. Revisar no dia certo é o que faz não esquecer." : "Coisas que você aprendeu e que o cérebro está começando a esquecer. Bora relembrar!" })),
        el("button", { cls: "btn yellow", type: "button", text: "Revisar agora", onclick: function () { go("#/revisao"); } })));
    }

    // próxima fase em destaque
    if (cur) {
      var u = U[cur.i], p = PHASES[cur.j], rs = S.resume[pkey(u.id, p.key)];
      wrap.append(el("a", { cls: "next-card", href: "#/u/" + u.id + "/" + p.key },
        el("span", { cls: "eyebrow", text: rs ? "⏸ Você pausou no meio · passo " + (rs.i + 1) + " de " + rs.n : cur.j === 0 ? "📌 Hoje você vai aprender" : "📌 Continue de onde parou" }),
        el("b", { cls: "next-title", text: cur.j === 0 ? u.today : p.icon + " " + p.name + " · " + u.emoji + " " + u.title }),
        el("span", { cls: "small", text: "Matéria " + (cur.i + 1) + " · " + u.grammar }),
        el("span", { cls: "btn big", text: rs ? "Continuar de onde parei ▶" : cur.j === 0 && !donePhases ? "Começar ▶" : "Continuar ▶" })));
    }

    // a trilha: cada matéria com as 6 fases em zigue-zague
    var trail = el("div", { cls: "trail" });
    U.forEach(function (u, i) {
      var open = unitOpen(i), done = unitDone(u.id), isCur = cur && cur.i === i;
      var head = el("div", { cls: "unit-head" + (done ? " done" : "") + (open ? "" : " locked") },
        el("span", { cls: "unit-n", text: done ? "✓" : String(i + 1) }),
        el("div", null, el("b", { text: u.emoji + " " + u.title }), el("span", { cls: "small", text: u.titlePt + " · " + u.grammar })));
      var sec = el("section", { cls: "unit" + (open ? "" : " locked") + (isCur ? " cur" : ""), id: "unit-" + u.id }, head);
      if (!open) {
        sec.append(el("p", { cls: "small lock-why", text: "🔒 Destrava quando você terminar a matéria " + i + "." }));
        if (u.canDo && u.canDo.length) sec.append(el("p", { cls: "small soon", text: "Aqui você vai: " + u.canDo.join(" · ").toLowerCase() }));
      } else {
        var path = el("div", { cls: "path" });
        PHASES.forEach(function (p, j) {
          var o = phaseOpen(i, j), d = S.phases[pkey(u.id, p.key)], here = cur && cur.i === i && cur.j === j;
          var node = el(o ? "a" : "span", { cls: "node" + (d ? " done" : "") + (here ? " here" : "") + (o ? "" : " locked"), href: o ? "#/u/" + u.id + "/" + p.key : null, style: "--x:" + [0, 1, 2, 1, 0, -1][j] },
            here ? el("span", { cls: "bubble", text: S.resume[pkey(u.id, p.key)] ? "⏸ PAUSADO" : j === 0 ? "COMEÇAR" : "AQUI" }) : (S.resume[pkey(u.id, p.key)] ? el("span", { cls: "bubble", text: "⏸" }) : null),
            el("span", { cls: "disc", text: d ? p.icon : o ? p.icon : "🔒" }),
            el("span", { cls: "nname", text: p.name }),
            d ? el("span", { cls: "nstars", text: starText(d.stars) }) : null);
          path.append(node);
        });
        sec.append(path);
        if (done && u.canDo) sec.append(el("p", { cls: "can-now", text: "✅ Agora você consegue: " + u.canDo.join(" · ").toLowerCase() }));
      }
      trail.append(sec);
    });
    wrap.append(el("h2", { cls: "sec-title", text: "🗺️ A trilha do A1" }), trail);

    // medalhas
    var mg = el("div", { cls: "medals" });
    MEDALS.forEach(function (m) { var got = !!S.medals[m.id]; mg.append(el("div", { cls: "medal" + (got ? " got" : ""), title: m.desc }, el("span", { cls: "mi", text: got ? m.icon : "🔒" }), el("b", { text: m.name }), el("span", { cls: "small", text: m.desc }))); });
    wrap.append(el("h2", { cls: "sec-title", text: "🏅 Medalhas · " + Object.keys(S.medals).length + " de " + MEDALS.length }), mg);

    // o que já errou (transparência)
    var cards = Object.keys(S.cards).map(function (k) { return S.cards[k]; });
    if (cards.length) {
      var hard = cards.filter(function (c) { return c.wrong; }).sort(function (a, b) { return b.wrong - a.wrong; }).slice(0, 5);
      var mem = el("section", { cls: "memory" }, el("h2", { cls: "sec-title", text: "🧠 Sua memória" }),
        el("p", { cls: "small", text: cards.length + " frases e palavras guardadas · " + cards.filter(function (c) { return c.box >= 3; }).length + " já firmes na memória · " + cards.filter(function (c) { return c.box === 0; }).length + " pra reforçar" }));
      if (hard.length) {
        var ul = el("ul", { cls: "hard" });
        hard.forEach(function (c) { ul.append(el("li", null, el("span", { cls: "said", text: c.pt || c.q || "" }), el("b", { text: c.en || (c.options ? c.options[c.answer] : "") }), el("span", { cls: "small", text: "errou " + c.wrong + "× · " + (c.from || "") }))); });
        mem.append(el("p", { cls: "small", html: "<b>Onde você mais erra:</b>" }), ul);
      }
      wrap.append(mem);
    }
    wrap.append(el("footer", null, el("span", { cls: "hand", text: "Falou, validou! 🚀" }),
      el("p", { cls: "small", html: 'Método Inglês com Joaquim · <a href="#/sobre">como funciona</a> · <button class="linkish" type="button" id="rename">trocar nome</button>' })));
    root.replaceChildren(wrap);
    var rn = document.getElementById("rename"); if (rn) rn.onclick = function () { S.name = ""; persist(); onboarding(); };
    if (scrollToCur && cur) { var t = document.getElementById("unit-" + U[cur.i].id); if (t && cur.i > 0) setTimeout(function () { t.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" }); }, 250); }
  }

  function onboarding() {
    var inp = el("input", { type: "text", placeholder: "Seu nome", autocomplete: "given-name", maxlength: "24" });
    var go1 = function () { var v = inp.value.trim(); if (!v) { inp.focus(); return; } S.name = v.slice(0, 24); persist(); SFX.go(); home(); };
    inp.addEventListener("keydown", function (e) { if (e.key === "Enter") go1(); });
    root.replaceChildren(el("div", { cls: "wrap onboard" },
      el("span", { cls: "brand", text: "Inglês com Joaquim" }),
      el("h1", { text: "Aprenda inglês sozinho, do zero ao A1." }),
      el("p", { html: "Do mesmo jeito das minhas aulas: <b>inglês de verdade</b> (vídeo de nativo), <b>fofoca</b>, chunks, lição de casa e <b>Real Time</b>. Cada matéria tem 6 fases curtinhas (uns 5 minutos cada) que vão destravando. Pode pausar quando quiser, e o que você errar volta pra revisão." }),
      el("ol", { cls: "how" },
        el("li", { html: "🎬 <b>Aula</b> — vídeo real, áudio e as frases novas (tudo com tradução)" }),
        el("li", { html: "🏠 <b>Lição de casa</b> — o desafio: ligar, ouvir, montar e falar" }),
        el("li", { html: "🕵️ <b>2 fofocas</b> — ouvir, entender e responder" }),
        el("li", { html: "⚡ <b>2 Real Times</b> — português direto pro inglês" }),
        el("li", { html: "🔁 <b>Revisão espaçada</b> — seus erros voltam até grudar" })),
      el("label", { text: "Como você quer ser chamado?", for: "nm" }), inp,
      el("button", { cls: "btn big", type: "button", text: "Bora começar! 🚀", onclick: go1 }),
      el("p", { cls: "small", text: "Seu progresso fica salvo neste celular." })));
    inp.id = "nm"; setTimeout(function () { inp.focus(); }, 300);
  }

  function about() {
    root.replaceChildren(el("div", { cls: "wrap about" }, topBar(),
      el("a", { cls: "back", href: "#", text: "← Voltar pra trilha" }),
      el("h1", { text: "Como funciona" }),
      el("p", { html: "A trilha tem <b>13 matérias</b>, do primeiro <i>hello</i> até contar o que aconteceu no fim de semana. É o mesmo caminho do A1 das aulas particulares." }),
      el("p", { html: "Cada matéria segue o <b>ciclo do método</b>: <b>matéria nova → lição de casa → fofoca 1 → fofoca 2 → Real Time 1 → Real Time 2</b>. Só destrava a próxima quando você termina a anterior." }),
      el("p", { html: "Tudo é <b>fofoca</b>: os vizinhos do <b>Sunset Building</b> (Tony, o fofoqueiro do 101; Jenny, a vizinha nova; Carlos e o cachorro Max; Rosa, a síndica) aparecem em todas as matérias. Assim o vocabulário volta sempre." }),
      el("p", { html: "<b>Repetição espaçada:</b> cada erro vira um cartão. Ele volta já na próxima fase; acertou, volta em 3 dias, depois 7, 14, 30. Errou de novo, volta pro começo. Toda fase começa revisando o que venceu." }),
      el("p", { html: "Os vídeos são cenas reais do YouTube (desenhos, vlogs, BBC). Primeiro <b>sem legenda</b>; depois, se precisar, <b>0.75×</b>; no fim, de novo na velocidade normal." }),
      el("p", { html: "Tudo em inglês tem a <b>tradução em português</b> do lado. Cada fase leva uns <b>5 minutos</b>. Precisa parar? Toque em <b>⏸ Pausar</b>: quando voltar, você continua do mesmo ponto." }),
      el("p", { cls: "hand", text: "Falou, validou! 🚀" })));
  }

  // =====================================================================
  //  TELA 2 — UMA FASE (passos um de cada vez, estilo jogo)
  // =====================================================================
  var R = null; // fase rodando
  function runPhase(uid, pk) {
    var ui = INDEX.units.map(function (u) { return u.id; }).indexOf(uid), pj = PHASES.map(function (p) { return p.key; }).indexOf(pk);
    if (ui < 0 || pj < 0) { home(); return; }
    if (!phaseOpen(ui, pj)) { home(true); return; }
    root.replaceChildren(el("div", { cls: "wrap" }, el("p", { cls: "boot", text: "Carregando a fase…" })));
    loadUnit(uid).then(function (U) {
      var steps = buildSteps(U, pk, ui), rs = S.resume[pkey(uid, pk)], revN = 0;
      if (rs && rs.n !== steps.length) rs = null; // a fase mudou desde a pausa
      // revisão espaçada no começo de toda fase (o que venceu hoje, até 3)
      var due = rs ? [] : dueCards(3);
      if (due.length && (pk !== "aula" || ui > 0)) { var rv = reviewSteps(due, true); revN = rv.length; steps.unshift.apply(steps, rv); }
      startRunner({ unit: U, ui: ui, pk: pk, phase: PHASES[pj], steps: steps, revN: revN }, rs);
    }).catch(function () { root.replaceChildren(el("div", { cls: "wrap" }, el("p", { cls: "boot", html: 'Não consegui carregar. Confira a internet e <a href="">tente de novo</a>.' }))); });
  }

  function startRunner(cfg, rs) {
    R = { cfg: cfg, i: 0, pts: 0, max: 0, combo: 0, best: 0, wrongs: [], startXp: S.xp };
    if (rs) { R.i = rs.i; R.pts = rs.pts; R.max = rs.max; R.combo = rs.combo || 0; R.best = rs.best || 0; R.wrongs = rs.wrongs || []; }
    var bar = el("i"), stage = el("div", { cls: "stage" }), foot = el("div", { cls: "foot" });
    var comboEl = el("span", { cls: "combo" });
    var head = el("div", { cls: "phead" },
      el("button", { cls: "x pause", type: "button", "aria-label": "Pausar e continuar depois", text: "⏸ Pausar", onclick: function () { stopMedia(); saveResume(); toast(cfg.pk === "revisao" ? "Tudo bem! A revisão fica pra depois." : "⏸ Pausado! Quando voltar, você continua deste ponto."); go("#"); } }),
      el("div", { cls: "pbar2" }, bar), comboEl);
    var title = el("div", { cls: "ptitle", text: cfg.pk === "revisao" ? "🔁 Revisão espaçada" : cfg.phase.icon + " " + cfg.phase.name + " · " + cfg.unit.emoji + " " + cfg.unit.title });
    root.replaceChildren(el("div", { cls: "wrap run" }, head, title, stage, foot));
    R.bar = bar; R.stage = stage; R.foot = foot; R.comboEl = comboEl;
    window.scrollTo(0, 0);
    if (rs && rs.i > 0) toast("▶ Continuando de onde você parou");
    nextStep();
  }
  // pausa: guarda o passo atual da fase (sem a revisão do começo)
  function saveResume() {
    if (!R || R.cfg.pk === "revisao" || R.done) return;
    var n = R.cfg.steps.length - (R.cfg.revN || 0), i = Math.max(0, R.i - (R.cfg.revN || 0));
    var k = pkey(R.cfg.unit.id, R.cfg.pk);
    if (i <= 0 && !R.max) { delete S.resume[k]; persist(); return; }
    S.resume[k] = { i: Math.min(i, n - 1), n: n, pts: R.pts, max: R.max, combo: R.combo, best: R.best, wrongs: R.wrongs.slice(-12), at: today() };
    persist();
  }
  function toast(t) {
    var d = el("div", { cls: "toast", role: "status", text: t }); document.body.append(d);
    setTimeout(function () { d.classList.add("out"); }, 2600); setTimeout(function () { d.remove(); }, 3200);
  }
  window.addEventListener("pagehide", function () { saveResume(); });
  document.addEventListener("visibilitychange", function () { if (document.hidden) saveResume(); });
  function stopMedia() { try { player.pause(); } catch (e) {} try { speechSynthesis.cancel(); } catch (e) {} document.querySelectorAll("audio").forEach(function (a) { a.pause(); }); if (R && R.cleanup) { R.cleanup(); R.cleanup = null; } }
  function progress() { R.bar.style.width = Math.round(R.i / R.cfg.steps.length * 100) + "%"; }
  function nextStep() {
    stopMedia();
    if (R.i >= R.cfg.steps.length) { finishPhase(); return; }
    progress();
    var st = R.cfg.steps[R.i];
    R.stage.replaceChildren(); R.foot.replaceChildren();
    R.stage.classList.remove("in"); void R.stage.offsetWidth; R.stage.classList.add("in");
    st(R.stage, R.foot);
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  }
  function advance() { R.i++; if (R.i < R.cfg.steps.length) saveResume(); nextStep(); }
  function contBtn(label, fn) { var b = el("button", { cls: "btn big", type: "button", text: label || "Continuar", onclick: function () { SFX.tap(); (fn || advance)(); } }); return b; }
  function score(ok, max) { R.pts += ok; R.max += max; }
  function hit(ok) {
    if (ok) { R.combo++; R.best = Math.max(R.best, R.combo); if (R.combo >= 3) { SFX.combo(R.combo); R.comboEl.textContent = "🔥 x" + R.combo; R.comboEl.classList.remove("pop"); void R.comboEl.offsetWidth; R.comboEl.classList.add("pop"); } else SFX.ok(); }
    else { R.combo = 0; R.comboEl.textContent = ""; SFX.bad(); }
  }
  // folha de resposta (verde/vermelha) com botão Continuar
  function sheet(ok, title, body, onNext) {
    var s = el("div", { cls: "sheet " + (ok ? "good" : "bad") }, el("b", { text: title }), body || null, contBtn("Continuar", onNext));
    R.foot.replaceChildren(s);
    setTimeout(function () { var b = s.querySelector(".btn"); if (b) b.focus(); }, 50);
  }
  var GOOD = ["Isso! 🎉", "Brabo! 🔥", "Mandou bem!", "Perfeito!", "Nativo que lute! 😎", "Acertou!"];
  var BAD = ["Quase!", "Ops, não foi dessa vez", "Errar faz parte 💪", "Calma, vai voltar na revisão"];
  function uname(U) { return "Matéria " + (U.n + 1) + " · " + U.title; }

  // ---------- tipos de passo ----------
  function stInfo(title, html, opts) {
    opts = opts || {};
    return function (stage, foot) {
      stage.append(el("div", { cls: "card info" }, opts.eyebrow ? el("span", { cls: "eyebrow", text: opts.eyebrow }) : null, el("h2", { text: title }), el("div", { cls: "info-body", html: html }), opts.extra || null));
      foot.append(contBtn(opts.btn || "Continuar"));
    };
  }
  // pergunta de alternativas, uma por tela
  function stMcq(U, item, label, cardFrom, opts) {
    opts = opts || {};
    return function (stage, foot) {
      var chosen = null, order = shuffle(item.options.map(function (_, k) { return k; }));
      var box = el("div", { cls: "opts" }), opt = item.optionsPt || [];
      order.forEach(function (k) {
        box.append(el("button", { cls: "opt", type: "button", onclick: function (e) {
          if (box.classList.contains("locked")) return; SFX.tap();
          [].forEach.call(box.children, function (b) { b.classList.remove("sel"); }); e.currentTarget.classList.add("sel"); chosen = k; check.disabled = false;
        } }, el("span", { text: item.options[k] }), opt[k] ? el("small", { cls: "opt-pt", text: opt[k] }) : null));
      });
      var trBtn = opt.length ? el("button", { cls: "linkish trbtn", type: "button", text: "🇧🇷 Não entendi as opções — traduzir", onclick: function () { box.classList.add("show-pt"); trBtn.remove(); } }) : null;
      var check = el("button", { cls: "btn big", type: "button", text: "Conferir", disabled: true, onclick: function () {
        if (chosen == null) return; box.classList.add("locked");
        var ok = chosen === item.answer;
        [].forEach.call(box.children, function (b, idx) { var k = order[idx]; if (k === item.answer) b.classList.add("ok"); else if (k === chosen) b.classList.add("bad"); });
        hit(ok); score(ok ? 1 : 0, 1);
        if (!opts.noCard) addCard({ id: "q:" + U.id + ":" + label + ":" + norm(item.q).slice(0, 40), kind: "mcq", unit: U.id, from: cardFrom, q: item.q, options: item.options, answer: item.answer, qPt: item.pt || "", optionsPt: item.optionsPt || null }, !ok);
        if (!ok) R.wrongs.push({ said: item.options[chosen], right: item.options[item.answer], why: item.q });
        sheet(ok, ok ? pick(GOOD) : pick(BAD), ok ? null : el("p", null, "Resposta certa: ", el("b", { text: item.options[item.answer] }), opt[item.answer] ? el("span", { cls: "small", text: " (" + opt[item.answer] + ")" }) : null));
      } });
      stage.append(el("div", { cls: "card" }, opts.eyebrow ? el("span", { cls: "eyebrow", text: opts.eyebrow }) : null, el("h2", { cls: "q", html: rich(item.q) }),
        item.pt ? el("p", { cls: "q-pt", text: "🇧🇷 " + item.pt }) : null, opts.media || null, box, trBtn));
      foot.append(check);
    };
  }
  // tradução PT → EN com banco de palavras (ou teclado)
  function stTranslate(U, item, cardFrom, opts) {
    opts = opts || {};
    return function (stage, foot) {
      var target = plain(item.en);
      var toks = target.split(/\s+/).filter(Boolean);
      var pool = toks.slice();
      // distratores: palavras de outras respostas da mesma matéria
      (opts.distract || []).forEach(function (w) { if (pool.length < toks.length + 3 && pool.map(norm).indexOf(norm(w)) < 0) pool.push(w); });
      pool = shuffle(pool);
      var built = el("div", { cls: "built", "aria-live": "polite" }), bank = el("div", { cls: "bank" });
      var typing = false, ta = el("textarea", { cls: "typed", rows: "2", placeholder: "Escreva em inglês…", autocapitalize: "sentences", spellcheck: "false", hidden: true });
      function refresh() { check.disabled = typing ? !ta.value.trim() : !built.children.length; }
      pool.forEach(function (w) {
        var chip = el("button", { cls: "chip", type: "button", text: w, onclick: function () {
          if (chip.parentNode === bank) { built.append(chip); } else { bank.append(chip); } SFX.tap(); refresh();
        } });
        bank.append(chip);
      });
      var micB = null;
      if (opts.mic && SR) {
        micB = micButton(function (t) { if (!typing) toggle.click(); ta.value = t; refresh(); }, function (t, err) {
          if (err === "blocked" || !t) { if (!typing) toggle.click(); return; }
          if (!typing) toggle.click(); ta.value = t; refresh(); check.click();
        }, "🎤 Falar", true);
        R.cleanup = function () { if (micB._stop) micB._stop(); };
      }
      var toggle = el("button", { cls: "linkish", type: "button", text: "⌨️ Prefiro digitar", onclick: function () {
        typing = !typing; ta.hidden = !typing; built.hidden = typing; bank.hidden = typing; toggle.textContent = typing ? "🧩 Usar as palavras" : "⌨️ Prefiro digitar"; if (typing) ta.focus(); refresh();
      } });
      var check = el("button", { cls: "btn big", type: "button", text: "Conferir", disabled: true, onclick: function () {
        var said = typing ? ta.value : [].map.call(built.children, function (c) { return c.textContent; }).join(" ");
        var acc = [target].concat(item.alt || []).map(canon);
        var ok = acc.indexOf(canon(said)) > -1;
        bank.classList.add("locked"); built.classList.add("locked"); ta.disabled = true;
        if (micB) micB.disabled = true;
        if (!ok && opts.mic) { var tw = words(target), sw = words(said), hn = tw.filter(function (w) { return sw.indexOf(w) > -1; }).length; if (hn / tw.length >= 0.8) ok = true; } // fala: aceita quase igual
        hit(ok); score(ok ? 1 : 0, 1);
        if (!opts.noCard) addCard({ id: "t:" + U.id + ":" + norm(item.pt).slice(0, 40) + "|" + norm(target).slice(0, 40), kind: "tr", unit: U.id, from: cardFrom, pt: item.pt, en: target, alt: item.alt || [] }, !ok);
        if (!ok) R.wrongs.push({ said: said, right: target, why: item.pt });
        say(U, opts.audioKey, target);
        sheet(ok, ok ? pick(GOOD) : pick(BAD), el("div", null, el("p", null, ok ? "" : "Certo: ", el("b", { text: target }), " ", ear(U, opts.audioKey, target)), opts.listen && item.pt ? el("p", { cls: "small", text: "🇧🇷 " + item.pt }) : null));
      } });
      ta.addEventListener("input", refresh);
      var prompt = opts.listen
        ? el("div", { cls: "listen-q" }, el("button", { cls: "bigear", type: "button", text: "🔊", "aria-label": "Ouvir", onclick: function () { say(U, opts.audioKey, target); } }),
            el("button", { cls: "bigear slow", type: "button", text: "🐢", "aria-label": "Ouvir devagar", onclick: function () { say(U, opts.audioKey, target, true); } }))
        : el("h2", { cls: "q pt", text: item.pt });
      stage.append(el("div", { cls: "card" }, el("span", { cls: "eyebrow", text: opts.eyebrow || "✍️ Passe pro inglês" }),
        opts.title ? el("p", { cls: "small", html: opts.title }) : null, prompt, opts.hint ? el("p", { cls: "small", html: opts.hint }) : null,
        micB ? el("div", { cls: "mic-row" }, micB, el("span", { cls: "small", text: "fale a frase toda ou monte abaixo 👇" })) : null, built, bank, ta, toggle));
      foot.append(check);
      if (opts.listen) setTimeout(function () { say(U, opts.audioKey, target); }, 350);
    };
  }
  // ordenar pedaços
  function stOrder(U, parts, cardFrom) {
    return function (stage, foot) {
      var target = parts.join(" ");
      return stTranslate(U, { pt: "Monte a frase na ordem certa:", en: target }, cardFrom, { eyebrow: "🧩 Coloque em ordem", hint: "Toque nos pedaços na ordem certa.", chunks: parts })(stage, foot);
    };
  }
  // lacunas com banco de palavras
  function stGaps(U, text, bankWords, label, cardFrom) {
    return function (stage, foot) {
      var answers = [], i = 0, MAXG = 4;
      // corta o texto: só até a 4ª lacuna (A1: curto)
      var ls = String(text).split("\n"), keep = [], g = 0;
      for (var li = 0; li < ls.length && g < MAXG; li++) { keep.push(ls[li]); g += (ls[li].match(/\[\[/g) || []).length; }
      var seen = 0; text = keep.join("\n").replace(/\[\[([^\]]+)\]\]/g, function (m, a) { return ++seen <= MAXG ? m : a.split("|")[0]; });
      if (bankWords && bankWords.length) { var need = []; text.replace(/\[\[([^\]]+)\]\]/g, function (_, a) { need.push(a.split("|")[0]); }); var extra = bankWords.filter(function (w) { return need.map(norm).indexOf(norm(w)) < 0; }).slice(0, 2); bankWords = need.concat(extra); }
      var html = rich(text).replace(/\n/g, "<br>").replace(/\[\[([^\]]+)\]\]/g, function (_, a) { answers.push(a.split("|").map(function (x) { return x.trim(); })); return '<input class="gap" data-i="' + (i++) + '" autocomplete="off" autocapitalize="off" spellcheck="false" size="7">'; });
      var tx = el("div", { cls: "gaptext", html: html });
      var inputs = [].slice.call(tx.querySelectorAll("input.gap")), focused = inputs[0];
      inputs.forEach(function (inp, k) {
        inp.addEventListener("focus", function () { focused = inp; });
        inp.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); if (inputs[k + 1]) inputs[k + 1].focus(); else inp.blur(); } });
        inp.addEventListener("input", refresh);
      });
      var words = shuffle((bankWords && bankWords.length ? bankWords : answers.map(function (a) { return a[0]; })).slice());
      var bank = el("div", { cls: "bank" });
      words.forEach(function (w) { bank.append(el("button", { cls: "chip", type: "button", text: w, onclick: function () { var t = focused && !focused.value ? focused : inputs.filter(function (x) { return !x.value; })[0]; if (!t) return; t.value = w; SFX.tap(); var nx = inputs.filter(function (x) { return !x.value; })[0]; if (nx) { focused = nx; nx.classList.add("next"); } refresh(); } })); });
      function refresh() { inputs.forEach(function (x) { x.classList.toggle("filled", !!x.value); x.classList.remove("next"); }); check.disabled = inputs.some(function (x) { return !x.value.trim(); }); }
      var check = el("button", { cls: "btn big", type: "button", text: "Conferir", disabled: true, onclick: function () {
        var ok = 0;
        inputs.forEach(function (inp, k) {
          var g = answers[k].map(canon).indexOf(canon(inp.value)) > -1; inp.disabled = true;
          inp.classList.add(g ? "ok" : "bad"); if (g) ok++;
          else {
            inp.after(el("span", { cls: "fix", text: " ✓ " + answers[k][0] }));
            var ctx = (inp.closest("p") || tx).textContent.replace(/\s+/g, " ").trim().slice(0, 90);
            addCard({ id: "g:" + U.id + ":" + label + ":" + k, kind: "gap", unit: U.id, from: cardFrom, pt: "Complete: " + ctx.replace(/✓.*$/, "…"), en: answers[k][0], alt: answers[k].slice(1) }, true);
            R.wrongs.push({ said: inp.value, right: answers[k][0], why: label });
          }
        });
        bank.classList.add("locked");
        R.combo = ok === inputs.length ? R.combo + ok : 0; if (ok === inputs.length) SFX.ok(); else SFX.bad();
        score(ok, inputs.length);
        sheet(ok === inputs.length, ok === inputs.length ? pick(GOOD) + " " + ok + " de " + inputs.length : "Você acertou " + ok + " de " + inputs.length, ok === inputs.length ? null : el("p", { cls: "small", text: "Os erros foram pra sua revisão: eles voltam na próxima fase." }));
      } });
      stage.append(el("div", { cls: "card" }, el("span", { cls: "eyebrow", text: "📝 Complete" }), el("p", { cls: "small", text: "Toque numa lacuna e depois na palavra (ou digite)." }), tx, bank));
      foot.append(check);
    };
  }
  // ditado: ouvir e escrever
  function stDictation(U, text, cardFrom) {
    return function (stage, foot) {
      var url = audioUrl(U, "dict");
      var ta = el("textarea", { rows: "3", placeholder: "Escreva aqui o que você ouviu…", autocapitalize: "sentences", spellcheck: "false" });
      var out = el("div", { cls: "painted", hidden: true });
      var check = el("button", { cls: "btn big", type: "button", text: "Conferir", disabled: true, onclick: function () {
        var pool = words(ta.value), hitN = 0, tot = 0, miss = [];
        out.replaceChildren();
        plain(text).split(/(\s+)/).forEach(function (tok) {
          if (/^\s+$/.test(tok)) { out.append(tok); return; }
          var w = norm(tok), sp = el("span", { text: tok });
          if (w) { tot++; var ok = w.split(" ").every(function (p) { return pool.indexOf(p) > -1; }); if (ok) { w.split(" ").forEach(function (p) { pool.splice(pool.indexOf(p), 1); }); hitN++; sp.className = "hit"; } else { sp.className = "miss"; miss.push(tok.replace(/[^\w'-]/g, "")); } }
          out.append(sp);
        });
        out.hidden = false; ta.disabled = true;
        var pct = tot ? hitN / tot : 0, pts = Math.round(pct * 3);
        score(pts, 3); if (pct >= 0.85) SFX.ok(); else SFX.bad();
        if (pct < 0.85) addCard({ id: "d:" + U.id, kind: "tr", unit: U.id, from: cardFrom, pt: "Ditado: escreva o que ouvir", en: plain(text), audio: "dict" }, true);
        var tr = el("div", { cls: "say" });
        miss.filter(function (w, k, a) { return w && a.indexOf(w) === k; }).slice(0, 6).forEach(function (w) { tr.append(el("button", { type: "button", text: "🔊 " + w, onclick: function () { voice(w, true); } })); });
        sheet(pct >= 0.85, "Você pegou " + Math.round(pct * 100) + "% das palavras", miss.length ? el("div", null, el("p", { cls: "small", text: "Em vermelho, o que escapou. Toque e ouça:" }), tr) : null);
      } });
      ta.addEventListener("input", function () { check.disabled = words(ta.value).length < 3; });
      stage.append(el("div", { cls: "card" }, el("span", { cls: "eyebrow", text: "🎧 Ditado" }), el("h2", { text: "Ouça e escreva tudo" }),
        el("p", { cls: "small", text: "Ouça quantas vezes quiser. Use ⏪ e 🐢 se precisar." }), url ? bigPlayer(url) : el("button", { cls: "btn", type: "button", text: "🔊 Ouvir", onclick: function () { voice(text); } }), ta, out));
      foot.append(check);
    };
  }
  // falar (shadowing / reconto / opinião / real time). check(text) → {pts, max, ok, msg, chips}
  function stSpeak(U, cfg) {
    return function (stage, foot) {
      var tr = el("div", { cls: "transcript", text: "O que você falar aparece aqui." }), msg = el("p", { cls: "msg", hidden: true });
      var ta = el("textarea", { rows: "4", placeholder: "Escreva em inglês…", autocapitalize: "sentences", spellcheck: "false", hidden: true });
      var tries = 0, lastText = "";
      function judge(t, final) {
        var r = cfg.check(t || "");
        if (cfg.live && !final) cfg.live(t);
        if (!final) return;
        lastText = t;
        if (r.ok) {
          score(r.pts, r.max); hit(true);
          sheet(true, r.title || pick(GOOD), r.body || null);
        } else {
          tries++;
          msg.hidden = false; msg.textContent = r.msg || "Tente de novo.";
          if (tries >= 2 && !foot.querySelector(".skip")) foot.append(el("button", { cls: "linkish skip", type: "button", text: "Não estou conseguindo — ver a resposta e seguir", onclick: function () {
            score(Math.min(r.pts || 0, Math.floor(r.max / 2)), r.max); hit(false);
            (r.missing || []).forEach(function (m) { R.wrongs.push(m); });
            if (cfg.onFail) cfg.onFail(lastText);
            sheet(false, "Tudo bem! Olha como fica:", r.body || (cfg.model ? el("p", null, el("b", { text: cfg.model })) : null));
          } }));
        }
      }
      var top = el("div", { cls: "card" }, el("span", { cls: "eyebrow", text: cfg.eyebrow || "🎤 Fale" }), el("h2", { html: cfg.title }), cfg.body || null);
      stage.append(top);
      if (SR) {
        var mic = micButton(function (t) { tr.textContent = t || "…"; if (cfg.live) cfg.live(t); }, function (t, err) {
          if (err === "blocked") { msg.hidden = false; msg.textContent = "O microfone está bloqueado. Libere no cadeado ao lado do endereço — ou escreva."; return; }
          if (!t) { msg.hidden = false; msg.textContent = "Não ouvi nada. Fale mais alto e perto do celular, depois de aparecer 🔴."; return; }
          tr.textContent = t; judge(t, true);
        }, cfg.micLabel);
        top.append(el("p", { cls: "hint", text: "Toque em Gravar, espere o 3-2-1 e fale quando aparecer 🔴. Toque de novo para parar." }), mic, tr, msg);
        R.cleanup = function () { if (mic._stop) mic._stop(); };
      } else top.append(el("p", { cls: "warn", text: "Seu navegador não reconhece a fala. Escreva a resposta (no Chrome do Android ou no Safari do iPhone dá pra falar)." }), msg);
      var write = el("button", { cls: "linkish", type: "button", text: SR ? "⌨️ Prefiro escrever" : "", onclick: function () { ta.hidden = false; send.hidden = false; write.remove(); ta.focus(); } });
      var send = el("button", { cls: "btn", type: "button", text: "Conferir o que escrevi", hidden: true, onclick: function () { if (!ta.value.trim()) return; judge(ta.value, true); } });
      if (!SR) { ta.hidden = false; send.hidden = false; }
      top.append(ta, send, SR ? write : null);
    };
  }
  function keysHit(text, keys) { var n = " " + canon(text) + " "; return keys.map(function (k) { return k.any.some(function (x) { return n.indexOf(" " + canon(x) + " ") > -1 || n.indexOf(canon(x)) > -1; }); }); }
  function chipsOf(keys, got) { var d = el("div", { cls: "chips" }); keys.forEach(function (k, i) { d.append(el("span", { cls: "kchip" + (got[i] ? " ok" : ""), text: (got[i] ? "✓ " : "✗ ") + k.name })); }); return d; }

  // vídeo do YouTube (trecho), com capa e botões grandes
  var ytReady = null;
  function loadYT() { if (ytReady) return ytReady; ytReady = new Promise(function (res) { window.onYouTubeIframeAPIReady = function () { res(window.YT); }; document.head.append(el("script", { src: "https://www.youtube.com/iframe_api" })); }); return ytReady; }
  function stVideo(U, V, first) {
    return function (stage, foot) {
      var holder = el("div"), wrapv = el("div", { cls: "yt" }, holder), p = null, slow = false, n = 0;
      var cc = false;
      var count = el("span", { cls: "plays", text: "Assistiu 0 vezes" });
      function withP(fn) { if (p && p.playVideo) { fn(p); return; } loadYT().then(function (YT) { p = new YT.Player(holder, { videoId: V.youtubeId, playerVars: { start: V.start, end: V.end, controls: 1, rel: 0, playsinline: 1, modestbranding: 1, cc_load_policy: 0, iv_load_policy: 3 }, events: { onReady: function () { fn(p); }, onStateChange: function (e) { if (e.data === 0) { n++; count.textContent = "Assistiu " + n + (n === 1 ? " vez" : " vezes"); if (n >= 1) cont.disabled = false; } } } }); }); }
      var steps = el("ol", { cls: "vsteps" },
        el("li", { html: "1ª e 2ª vez: <b>sem legenda</b>, só ouvindo e olhando." }),
        el("li", { html: "Não entendeu? Use <b>🐢 0.75×</b> quantas vezes quiser." }),
        el("li", { html: "No fim, assista <b>de novo na velocidade normal</b>." }));
      var ctrl = el("div", { cls: "ptools" },
        el("button", { type: "button", text: "▶ Assistir", onclick: function () { withP(function (x) { x.seekTo(V.start, true); x.playVideo(); }); } }),
        el("button", { type: "button", text: "🐢 0.75×", onclick: function (e) { slow = !slow; e.currentTarget.textContent = slow ? "🐇 1×" : "🐢 0.75×"; e.currentTarget.classList.toggle("sel", slow); withP(function (x) { x.setPlaybackRate(slow ? 0.75 : 1); }); } }),
        count);
      var cont = contBtn("Já assisti — continuar →");
      cont.disabled = true;
      var skip = el("button", { cls: "linkish", type: "button", text: "O vídeo não abre aqui — seguir mesmo assim", onclick: advance });
      if (first) stage.append(todayBand(U));
      stage.append(el("div", { cls: "card" }, el("span", { cls: "eyebrow", text: "🎬 Inglês de verdade · " + (V.source || "YouTube") }),
        el("h2", { text: V.predict || "O que você acha que vai acontecer?" }), el("p", { cls: "small", text: V.context || "" }), wrapv, ctrl, steps));
      foot.append(cont, skip);
      setTimeout(function () { withP(function () {}); }, 50);
      R.cleanup = function () { try { if (p && p.pauseVideo) p.pauseVideo(); } catch (e) {} };
    };
  }
  function stVocab(U, list, title) {
    return function (stage, foot) {
      var g = el("div", { cls: "vocab" });
      list.forEach(function (v) { g.append(el("button", { cls: "vw", type: "button", onclick: function () { voice(v[0]); } }, el("b", { text: "🔊 " + v[0] }), el("span", { text: v[1] }))); });
      stage.append(el("div", { cls: "card" }, el("span", { cls: "eyebrow", text: "📒 Vocabulário" }), el("h2", { text: title }), el("p", { cls: "small", text: "Toque pra ouvir. Leia em voz alta." }), g));
      foot.append(contBtn());
    };
  }
  function stChunk(U, ch, ci) {
    return function (stage, foot) {
      var ex = el("ul", { cls: "examples" });
      ch.examples.forEach(function (t, k) { ex.append(el("li", null, ear(U, "ex" + ci + "_" + k, t), el("span", { html: " " + rich(t) }))); });
      var kind = { vocab: "📒 vocabulário", grammar: "🧱 gramática", mix: "🧩 misto" }[ch.type] || "";
      stage.append(el("div", { cls: "card chunk" }, el("span", { cls: "eyebrow", text: "Chunk " + (ci + 1) + " de " + U.lesson.chunks.length + " · " + kind }),
        el("h2", { cls: "chunk-en", html: rich(ch.chunk) }), el("p", { cls: "chunk-pt", text: "= " + ch.pt }),
        ch.tip ? el("p", { cls: "tip", html: "💡 " + rich(ch.tip) }) : null, el("p", { cls: "small", text: "Tirado da fofoca. Toque no 🔊, ouça e repita em voz alta:" }), ex));
      foot.append(contBtn("Entendi →"));
      setTimeout(function () { say(U, "ex" + ci + "_0", ch.examples[0]); }, 400);
    };
  }
  function stGrammar(U, G) {
    return function (stage, foot) {
      var t = el("table", { cls: "gram" });
      G.rows.forEach(function (r) { t.append(el("tr", null, el("td", { html: rich(r[0]) }), el("td", { text: r[1] }))); });
      stage.append(el("div", { cls: "card" }, el("span", { cls: "eyebrow", text: "🧱 Gramática de uso" }), el("h2", { text: G.title || "Como funciona" }), t, G.tip ? el("p", { cls: "tip", html: "💡 " + rich(G.tip) }) : null));
      foot.append(contBtn());
    };
  }
  function stRead(U, lines, title) {
    return function (stage, foot) {
      var p = el("div", { cls: "readtext" });
      lines.forEach(function (l) { p.append(el("p", { html: rich(l.text) })); });
      stage.append(el("div", { cls: "card" }, el("span", { cls: "eyebrow", text: "📖 Agora leia" }), el("h2", { text: title }), el("p", { cls: "small", text: "Leia em voz alta. As palavras em negrito são jeitos bem nativos de falar." }), p));
      foot.append(contBtn());
    };
  }

  function reviewDecoys(c) {
    var mine = words(c.en || ""), pool = [];
    Object.keys(S.cards).forEach(function (k) { var o = S.cards[k]; if (o !== c && o.en) plain(o.en).split(/\s+/).forEach(function (w) { if (w && mine.indexOf(norm(w)) < 0) pool.push(w); }); });
    ["you", "is", "the", "my", "are", "I'm", "and", "not"].forEach(function (w) { if (mine.indexOf(norm(w)) < 0) pool.push(w); });
    return shuffle(pool).slice(0, 3);
  }
  // revisão espaçada: cartões que venceram
  function reviewSteps(cards, intro) {
    var out = [];
    if (intro) out.push(stInfo("🔁 Antes: revisão rápida", "Você tem <b>" + cards.length + "</b> " + (cards.length === 1 ? "coisa" : "coisas") + " pra relembrar hoje. " + (cards.some(function (c) { return c.lastWrong; }) ? "Algumas você <b>errou</b> antes — é assim que a gente não deixa esquecer." : "É a repetição espaçada: rever no dia certo faz grudar."), { eyebrow: "Repetição espaçada", btn: "Bora revisar" }));
    cards.forEach(function (c) {
      out.push(function (stage, foot) {
        var tag = el("p", { cls: "review-tag", text: c.lastWrong ? "❌ Você errou isso" + (c.from ? " em " + c.from : "") + (c.wrong > 1 ? " (" + c.wrong + "×)" : "") : "🧠 Você aprendeu isso" + (c.from ? " em " + c.from : "") });
        var fakeU = { id: c.unit, audio: null };
        var inner;
        if (c.kind === "mcq") {
          inner = stMcq(fakeU, { q: c.q, options: c.options, answer: c.answer, pt: c.qPt, optionsPt: c.optionsPt }, "rev", c.from, { eyebrow: "🔁 Revisão", noCard: true });
        } else {
          inner = stTranslate(fakeU, { pt: c.pt, en: c.en, alt: c.alt }, c.from, { eyebrow: "🔁 Revisão", distract: reviewDecoys(c), noCard: true });
        }
        // embrulha para registrar o resultado na caixa de Leitner
        var before = { pts: R.pts, max: R.max, wr: R.wrongs.length };
        inner(stage, foot);
        stage.firstChild.insertBefore(tag, stage.firstChild.firstChild);
        var obs = new MutationObserver(function () {
          var sh = foot.querySelector(".sheet"); if (!sh) return; obs.disconnect();
          var ok = sh.classList.contains("good"); reviewResult(c, ok); persist();
          // a revisão do começo da fase não mexe nas estrelas da fase
          if (R.cfg.pk !== "revisao") { R.pts = before.pts; R.max = before.max; R.wrongs.length = before.wr; }
          sh.append(el("p", { cls: "small", text: ok ? "📈 Volta daqui a " + GAPS[S.cards[c.id].box] + " dias." : "🔁 Volta amanhã pra mais uma chance." }));
        });
        obs.observe(foot, { childList: true, subtree: true });
      });
    });
    return out;
  }

  // ligar os pontos: toque no inglês e depois no português (pairs = [[en, pt, audioKey?]])
  function stMatch(U, pairs, cfg) {
    cfg = cfg || {};
    return function (stage, foot) {
      pairs = pairs.slice(0, 5);
      var left = el("div", { cls: "mcol" }), right = el("div", { cls: "mcol" }), sel = null, got = 0, miss = 0, missed = {};
      var t0 = Date.now(), timer = el("span", { cls: "mtimer", text: "⏱ 0s" });
      var iv = setInterval(function () { timer.textContent = "⏱ " + Math.round((Date.now() - t0) / 1000) + "s"; }, 500);
      R.cleanup = function () { clearInterval(iv); };
      function mk(side, k, txt) {
        var b = el("button", { cls: "mbtn", type: "button", text: txt, onclick: function () {
          if (b.classList.contains("ok")) return;
          if (side === "en") say(U, pairs[k][2], pairs[k][0]);
          if (!sel || sel.side === side) { if (sel) sel.b.classList.remove("sel"); sel = { side: side, k: k, b: b }; b.classList.add("sel"); SFX.tap(); return; }
          if (sel.k === k) {
            got++; b.classList.add("ok"); sel.b.classList.add("ok"); b.classList.remove("sel"); sel.b.classList.remove("sel"); sel = null; SFX.ok();
            if (got === pairs.length) {
              clearInterval(iv);
              var secs = Math.round((Date.now() - t0) / 1000), pts = Math.max(0, pairs.length - miss);
              score(pts, pairs.length); R.combo = miss ? 0 : R.combo + pairs.length; R.best = Math.max(R.best, R.combo);
              Object.keys(missed).forEach(function (j) { var p = pairs[j]; addCard({ id: "t:" + U.id + ":" + norm(p[1]).slice(0, 40) + "|" + norm(p[0]).slice(0, 40), kind: "tr", unit: U.id, from: cfg.from, pt: p[1], en: p[0], alt: [] }, true); R.wrongs.push({ said: "(ligou errado)", right: p[0] + " = " + p[1], why: "ligar" }); });
              sheet(!miss, miss ? "Ligou tudo! " + miss + (miss === 1 ? " erro" : " erros") + " no caminho" : "⚡ Ligou tudo sem errar em " + secs + "s!", miss ? el("p", { cls: "small", text: "Os que você errou foram pra revisão." }) : null);
            }
          } else {
            miss++; missed[sel.k] = 1; missed[k] = 1; var a = sel.b; a.classList.add("no"); b.classList.add("no"); SFX.bad(); R.combo = 0; R.comboEl.textContent = "";
            setTimeout(function () { a.classList.remove("no", "sel"); b.classList.remove("no"); }, 450); sel = null;
          }
        } });
        return b;
      }
      shuffle(pairs.map(function (_, k) { return k; })).forEach(function (k) { left.append(mk("en", k, pairs[k][0])); });
      shuffle(pairs.map(function (_, k) { return k; })).forEach(function (k) { right.append(mk("pt", k, pairs[k][1])); });
      stage.append(el("div", { cls: "card" }, el("div", { cls: "mhead" }, el("span", { cls: "eyebrow", text: cfg.eyebrow || "🔗 Ligue os pares" }), timer),
        el("h2", { text: cfg.title || "Toque no inglês e depois no português" }), el("div", { cls: "match" }, left, right)));
    };
  }
  // card de aprender um chunk (com tradução de tudo)
  function stChunk2(U, ch, ci) {
    return function (stage, foot) {
      var ex = el("ul", { cls: "examples" }), pts = ch.examplesPt || [];
      ch.examples.slice(0, 2).forEach(function (t, k) { ex.append(el("li", null, ear(U, "ex" + ci + "_" + k, t), el("span", null, el("span", { html: " " + rich(t) }), pts[k] ? el("small", { cls: "ex-pt", text: pts[k] }) : null))); });
      stage.append(el("div", { cls: "card chunk" }, el("span", { cls: "eyebrow", text: "✨ Frase nova " + (ci + 1) + " de " + U.lesson.chunks.length }),
        el("h2", { cls: "chunk-en", html: rich(ch.chunk) }), el("p", { cls: "chunk-pt", text: "= " + ch.pt }),
        ch.tip ? el("p", { cls: "tip", html: "💡 " + rich(ch.tip) }) : null, el("p", { cls: "small", text: "Toque no 🔊 e repita em voz alta:" }), ex));
      foot.append(contBtn("Entendi →"));
      setTimeout(function () { say(U, "ex" + ci + "_0", ch.examples[0]); }, 400);
    };
  }
  // ouvir a fofoca/áudio (1 vez basta) + ver o texto com tradução
  function stListen2(U, key, cfg) {
    return function (stage, foot) {
      var url = audioUrl(U, key), cont = contBtn("Ouvi! Bora pras perguntas →");
      cont.disabled = true;
      var tx = el("div", { cls: "transcript-pt", hidden: true });
      (cfg.lines || []).forEach(function (l) { tx.append(el("p", null, el("span", { html: rich(l.text) }), l.pt ? el("small", { text: l.pt }) : null)); });
      var see = el("button", { cls: "linkish", type: "button", text: "📜 Ver o texto com tradução", hidden: true, onclick: function () { tx.hidden = !tx.hidden; see.textContent = tx.hidden ? "📜 Ver o texto com tradução" : "🙈 Esconder o texto"; } });
      var pl = url ? bigPlayer(url, { goal: 1, onPlays: function () { cont.disabled = false; see.hidden = !(cfg.lines || []).length; } }) : el("button", { cls: "btn", type: "button", text: "🔊 Ouvir", onclick: function () { voice(cfg.text); cont.disabled = false; see.hidden = !(cfg.lines || []).length; } });
      var skipL = el("button", { cls: "linkish", type: "button", text: "Não consigo ouvir agora", onclick: function () { cont.disabled = false; see.hidden = !(cfg.lines || []).length; tx.hidden = false; skipL.remove(); } });
      if (cfg.first) stage.append(todayBand(U));
      stage.append(el("div", { cls: "card" }, el("span", { cls: "eyebrow", text: cfg.eyebrow || "🎧 Ouça" }), el("h2", { html: cfg.title }), cfg.intro ? el("p", { html: cfg.intro }) : null, pl, see, tx, skipL));
      foot.append(cont);
      R.cleanup = function () { if (pl._audio) pl._audio.pause(); };
    };
  }

  function todayBand(U) { return el("div", { cls: "today-band" }, el("span", { cls: "eyebrow", text: "🎯 " + U.emoji + " " + U.title }), el("p", { html: rich(U.today) })); }
  // pedaços do chunk que dá pra marcar no texto ("Where are you from?" → "Where are you from")
  function chunkVariants(ch) {
    return plain(ch.chunk).split(/\s*\/\s*|\s+—\s+/).map(function (v) { return v.replace(/…|\.\.\./g, "").replace(/[?!.,\s]+$/, "").trim(); }).filter(function (v) { return v.length >= 2; });
  }
  function hlRegex(vars) {
    vars = vars.slice().sort(function (a, b) { return b.length - a.length; }).map(function (v) { return esc(v).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); });
    return vars.length ? new RegExp("(^|[^A-Za-z&#;0-9])(" + vars.join("|") + ")(?=[^A-Za-z0-9]|$)", "gi") : null;
  }
  function hl(text, re) { var h = esc(plain(text)); return re ? h.replace(re, function (m, a, b) { return a + "<mark>" + b + "</mark>"; }) : h; }
  // o texto do áudio com o que a gente vai ensinar MARCADO
  function stReadHL(U) {
    return function (stage, foot) {
      var L = U.lesson, all = []; L.chunks.forEach(function (c) { all = all.concat(chunkVariants(c)); });
      var re = hlRegex(all), box = el("div", { cls: "readhl" });
      L.audio.lines.forEach(function (l) { box.append(el("p", null, el("span", { html: hl(l.text, re) }), l.pt ? el("small", { cls: "rpt", text: l.pt }) : null)); });
      var url = audioUrl(U, "lesson"), pl = url ? bigPlayer(url, {}) : null;
      var tbtn = el("button", { cls: "linkish", type: "button", text: "🇧🇷 Mostrar a tradução", onclick: function () { box.classList.toggle("show-pt"); tbtn.textContent = box.classList.contains("show-pt") ? "🙈 Esconder a tradução" : "🇧🇷 Mostrar a tradução"; } });
      stage.append(el("div", { cls: "card" }, el("span", { cls: "eyebrow", text: "📖 Agora leia ouvindo" }), el("h2", { text: L.audio.title }),
        el("p", { cls: "small", html: "O que está <mark>marcado</mark> é o que você vai aprender hoje. Ouça de novo lendo junto." }), pl, box, tbtn));
      foot.append(contBtn("Bora tirar do contexto →"));
      R.cleanup = function () { if (pl && pl._audio) pl._audio.pause(); };
    };
  }
  // tira UMA frase do contexto: a fala em que ela apareceu, o que significa e uma pergunta direta
  function stSpotlight(U, ch, ci) {
    return function (stage, foot) {
      var L = U.lesson, vars = chunkVariants(ch), re = hlRegex(vars);
      var line = null;
      (ch.examples || []).some(function (e) { var ne = norm(e); return L.audio.lines.some(function (l) { if (norm(l.text).indexOf(ne) > -1) { line = l; return true; } }); });
      if (!line) L.audio.lines.some(function (l) { if (re && hl(l.text, re).indexOf("<mark>") > -1) { line = l; return true; } });
      var ev = plain(ch.chunk).split(/\s+\/\s+/), pv = String(ch.pt).split(/\s+\/\s+/);
      var en1 = first(plain(ch.chunk)), pt1 = first(ch.pt);
      if (ev.length > 1 && ev.length === pv.length) { en1 = first(ev[ev.length - 1]); pt1 = first(pv[pv.length - 1]); }
      var others = shuffle(L.chunks.filter(function (c, k) { return k !== ci; }).map(function (c) { return first(plain(c.chunk)); })).slice(0, 2);
      var opts = shuffle([en1].concat(others)), done = false;
      var ob = el("div", { cls: "opts" });
      opts.forEach(function (o) {
        ob.append(el("button", { cls: "opt", type: "button", text: o, onclick: function (e) {
          if (done) return; done = true; ob.classList.add("locked");
          var ok = o === en1; e.currentTarget.classList.add(ok ? "ok" : "bad");
          if (!ok) [].forEach.call(ob.children, function (b) { if (b.textContent === en1) b.classList.add("ok"); });
          hit(ok); score(ok ? 1 : 0, 1); voice(en1);
          addCard({ id: "t:" + U.id + ":" + norm(pt1).slice(0, 40) + "|" + norm(en1).slice(0, 40), kind: "tr", unit: U.id, from: uname(U), pt: pt1, en: en1, alt: [] }, !ok);
          if (!ok) R.wrongs.push({ said: o, right: en1, why: pt1 });
          sheet(ok, ok ? pick(GOOD) : pick(BAD), ok ? null : el("p", null, "«" + pt1 + "» = ", el("b", { text: en1 })));
        } }));
      });
      var quote = line ? el("div", { cls: "ctx-quote" },
        el("button", { cls: "ear", type: "button", text: "🔊", "aria-label": "Ouvir", onclick: function () { voice(plain(line.text)); } }),
        el("div", null, el("span", { cls: "ctx-en", html: hl(line.text, re) }), line.pt ? el("small", { text: line.pt }) : null)) : null;
      var ex = (ch.examples || []).filter(function (e) { return !line || norm(line.text).indexOf(norm(e)) < 0; })[0], exPt = ex ? (ch.examplesPt || [])[ch.examples.indexOf(ex)] : null;
      stage.append(el("div", { cls: "card spot" },
        el("span", { cls: "eyebrow", text: "🔦 Tirando do contexto · " + (ci + 1) + " de " + L.chunks.length }),
        line ? el("p", { cls: "small", text: "Lembra? Na fofoca, alguém disse:" }) : null, quote,
        el("div", { cls: "spot-learn" }, el("h2", { cls: "chunk-en", html: rich(ch.chunk) }), el("p", { cls: "chunk-pt", text: "= " + ch.pt }),
          ch.tip ? el("p", { cls: "tip", html: "💡 " + rich(ch.tip) }) : null,
          ex ? el("p", { cls: "small" }, ear(U, "ex" + ci + "_" + ch.examples.indexOf(ex), ex), " Outro exemplo: ", el("b", { text: ex }), exPt ? " — " + exPt : "") : null),
        el("div", { cls: "spot-q" }, el("b", { text: "👉 Rapidinho: como se diz «" + pt1 + "»?" }), ob)));
      setTimeout(function () { if (line) voice(plain(line.text)); }, 350);
    };
  }

  // ---------- monta os passos de cada fase ----------
  function lessonQuestions(U, qs, label, from, eyebrow) { return (qs || []).map(function (q) { return stMcq(U, q, label, from, { eyebrow: eyebrow }); }); }
  function allAnswers(U) { var a = []; (U.lesson.chunks || []).forEach(function (c) { (c.practice || []).forEach(function (p) { plain(p.en).split(/\s+/).forEach(function (w) { a.push(w); }); }); }); return a; }
  function distractors(U, en) { var mine = words(en); return shuffle(allAnswers(U).filter(function (w) { return mine.indexOf(norm(w)) < 0 && norm(w); })).slice(0, 3); }

  function first(t) { return String(t).split(/\s+\/\s+|\s+—\s+/)[0].trim(); }
  function chunkPairs(U) { return U.lesson.chunks.map(function (c, ci) { return [first(plain(c.chunk)), first(c.pt)]; }); }
  function buildSteps(U, pk, ui) {
    var from = uname(U), L = U.lesson, H = U.homework, st = [], CH = L.chunks;
    if (pk === "aula") {
      // 1) CONTEXTO primeiro: vídeo de verdade, a fofoca e o texto com o que vamos ensinar marcado
      if (U.video) st.push(stVideo(U, U.video, true));
      st.push(stListen2(U, "lesson", { first: !U.video, eyebrow: "🎧 A fofoca de hoje", title: esc(L.audio.title), intro: "Só ouça, <b>sem ler</b>. Entender pouco agora é normal: daqui a pouco a gente destrincha tudo.", text: L.audio.lines.map(function (l) { return l.text; }).join(" ") }));
      if (L.audio.questions && L.audio.questions[0]) st.push(stMcq(U, L.audio.questions[0], "audio", from + " (áudio)", { eyebrow: "❓ Pegou a ideia?" }));
      st.push(stReadHL(U));
      // 2) TIRAR DO CONTEXTO: cada frase marcada vira explicação + pergunta direta
      CH.forEach(function (ch, ci) { st.push(stSpotlight(U, ch, ci)); });
      st.push(stMatch(U, chunkPairs(U), { from: from, title: "Ligue cada frase nova ao que ela significa" }));
      [0, 2].forEach(function (ci) { var ch = CH[ci]; if (ch && ch.practice && ch.practice[0]) st.push(stTranslate(U, ch.practice[0], from, { eyebrow: "✍️ Agora você: passe pro inglês", audioKey: "pr" + ci + "_0", distract: distractors(U, ch.practice[0].en) })); });
    } else if (pk === "licao") {
      st.push(stInfo("🏠 O desafio", "Agora é a prova de fogo: <b>sem os exemplos na tela</b>. Ouvir, montar, completar e falar. Os erros voltam na revisão até grudar.", { eyebrow: "Matéria " + (ui + 1) + " · " + U.title, btn: "Aceito o desafio 💪" }));
      var sp = CH.map(function (ch) { var ps = (ch.practice || []).slice().sort(function (a, b) { return plain(a.en).length - plain(b.en).length; }); return ps[0] ? [plain(ps[0].en), ps[0].pt] : null; }).filter(Boolean);
      st.push(stMatch(U, sp.length >= 3 ? sp : chunkPairs(U), { from: from + " (lição)", eyebrow: "🔗 Valendo tempo!", title: "Ligue cada frase à tradução, rápido!" }));
      [1, 3].forEach(function (ci) { var ch = CH[ci]; if (ch && ch.practice && ch.practice[1]) st.push(stTranslate(U, ch.practice[1], from + " (lição)", { eyebrow: "🎧 Ouça e monte", title: "Ouça e monte a frase que você ouviu", listen: true, audioKey: "pr" + ci + "_1", distract: distractors(U, ch.practice[1].en) })); });
      if (H.gaps) st.push(stGaps(U, H.gaps, H.gapsWords, "lição", from + " (lição)"));
      (H.order || []).slice(0, 2).forEach(function (parts, k) { var pt = (H.orderPt || [])[k]; st.push(stTranslate(U, { pt: pt || "Monte a frase na ordem certa", en: parts.join(" ") }, from + " (lição)", { eyebrow: "🧩 Coloque em ordem", distract: [] })); });
      [0, 4, 2].forEach(function (ci) { var ch = CH[ci], p = ch && ch.practice && ch.practice[2]; if (p && st.length < 9) st.push(stTranslate(U, p, from + " (lição)", { eyebrow: "🗣️ Fale em inglês", mic: true, audioKey: "pr" + ci + "_2", distract: distractors(U, p.en) })); });
    } else if (pk === "fofoca1" || pk === "fofoca2") {
      var G = U.gossips[pk === "fofoca1" ? 0 : 1], gk = pk === "fofoca1" ? "g0" : "g1", gname = pk === "fofoca1" ? "fofoca 1" : "fofoca 2";
      st.push(stListen2(U, gk, { eyebrow: "🕵️ " + (pk === "fofoca1" ? "Fofoca 1" : "Fofoca 2") + " no Sunset Building", title: esc(G.title), intro: "Ouça a fofoca. Tente pegar <b>quem</b>, <b>o quê</b> e <b>qual foi o problema</b>.", lines: G.lines, text: G.lines.map(function (l) { return l.text; }).join(" ") }));
      (G.questions || []).slice(0, 3).forEach(function (q) { st.push(stMcq(U, q, gk, from + " (" + gname + ")", { eyebrow: "❓ O que aconteceu?" })); });
      var gl = G.lines.filter(function (l) { return l.pt && plain(l.text).split(/\s+/).length <= 9; }).slice(0, 4);
      if (gl.length >= 3) st.push(stMatch(U, gl.map(function (l) { return [plain(l.text), l.pt]; }), { from: from + " (" + gname + ")", title: "Quem disse o quê? Ligue cada frase à tradução" }));
      if (G.read) st.push(stGaps(U, G.read, null, gk + "-read", from + " (" + gname + ")"));
      if (G.opinion) st.push(stSpeak(U, {
        eyebrow: "💬 E você?", title: rich(G.opinion.q), micLabel: "🎤 Responder",
        body: el("p", { cls: "q-pt", text: "🇧🇷 " + G.opinion.pt + (G.opinion.starter ? " · Comece com: " + G.opinion.starter : "") }),
        check: function (t) { var n = words(t).length; return { ok: n >= 3, pts: n >= 6 ? 2 : 1, max: 2, msg: "Responda com uma frase (pelo menos 3 palavras).", title: pick(GOOD) + " Falou, validou!" }; },
      }));
    } else if (pk === "rt1" || pk === "rt2") {
      var ri = pk === "rt1" ? 0 : 1, T = U.realtimes[ri], P = T.pairs || [];
      st.push(stInfo("⚡ " + esc(T.title), "<p class='rt-pt'>" + esc(T.pt) + "</p><p>Você vai passar essa história pro inglês <b>frase por frase</b>, <b>falando</b> 🎤 (ou montando). Sem tradutor! Travou? Fale <i>let me see…</i> e siga.</p>", { eyebrow: "Real Time · Matéria " + (ui + 1), btn: "Valendo! ⚡" }));
      if (P.length) P.slice(0, 6).forEach(function (pr, k) { st.push(stTranslate(U, pr, from + " (Real Time)", { eyebrow: "⚡ Real Time · frase " + (k + 1) + " de " + Math.min(6, P.length), mic: true, audioKey: "rp" + ri + "_" + k, distract: distractors(U, pr.en) })); });
      else st.push(stSpeak(U, { eyebrow: "⚡ Real Time", title: esc(T.title), body: el("p", { cls: "rt-pt", text: T.pt }), model: T.model, check: function (t) { var got = keysHit(t, T.keys), n = got.filter(Boolean).length; return { ok: n >= Math.ceil(T.keys.length * 0.5), pts: Math.min(5, 1 + n), max: 5, body: chipsOf(T.keys, got), msg: "Tente usar: " + T.keys.filter(function (k, i) { return !got[i]; }).map(function (k) { return k.name; }).join(", ") }; } }));
    }
    return st;
  }

  // ---------- fim da fase ----------
  var CHEER = { 3: ["Perfeito! Falou, validou! 🚀", "Brabo demais! 🔥", "Gabaritou! Nativo que lute. 😎"], 2: ["Muito bom! Dá pra chegar nas 3 estrelas.", "Mandou bem! Os errinhos foram pra revisão."], 1: ["Passou! Errar faz parte: os erros voltam na revisão.", "Calma, ninguém nasce falando. Bora pra próxima!"] };
  function finishPhase() {
    var c = R.cfg, pct = R.max ? R.pts / R.max : 1, s = stars(pct), k = pkey(c.unit.id, c.pk), old = S.phases[k];
    var firstTime = !old; R.done = true; delete S.resume[k];
    var gain = firstTime ? R.pts + 10 + Math.max(0, R.best - 2) : Math.round(R.pts / 2);
    S.xp += gain; markDay();
    if (!old || s > old.stars) S.phases[k] = { stars: s, pct: Math.round(pct * 100), at: today() };
    S.best.combo = Math.max(S.best.combo, R.best);
    var medals = checkMedals();
    persist();
    R.bar.style.width = "100%";
    var pi = PHASES.map(function (p) { return p.key; }).indexOf(c.pk);
    var nextP = PHASES[pi + 1], nextU = !nextP && INDEX.units[c.ui + 1];
    var box = el("div", { cls: "card result" },
      el("span", { cls: "res-stars", text: starText(s) }),
      el("h2", { text: c.phase.icon + " " + c.phase.name + " completa!" }),
      el("p", { text: pick(CHEER[s]) }),
      el("div", { cls: "xp-gain" },
        el("div", null, el("b", { text: "+" + gain + " XP" }), el("span", { text: firstTime ? "nesta fase" : "treino" })),
        el("div", null, el("b", { text: Math.round(pct * 100) + "%" }), el("span", { text: "de acerto" })),
        el("div", null, el("b", { text: "x" + R.best }), el("span", { text: "maior combo" }))),
      !nextP && firstTime ? el("div", { cls: "unit-clear" }, el("b", { text: "🎉 Matéria " + (c.ui + 1) + " fechada!" }), el("p", { text: "Agora você consegue: " + (c.unit.canDo || []).join(" · ").toLowerCase() + "." }), nextU ? el("p", { html: "🔓 Destravou: <b>" + esc(nextU.emoji + " " + nextU.title) + "</b>" }) : el("p", { html: "<b>🏆 Você completou o A1!</b>" })) : null,
      R.wrongs.length ? el("div", { cls: "wr" }, el("b", { text: "🔁 " + R.wrongs.length + (R.wrongs.length === 1 ? " erro foi" : " erros foram") + " pra sua revisão" }), el("p", { cls: "small", text: "Eles voltam no começo da próxima fase. Acertou? Volta em 3 dias, depois 7, 14, 30 — até grudar." }),
        el.apply(null, ["ul", null].concat(R.wrongs.slice(0, 4).map(function (w) { return /^\(/.test(w.said || "") ? el("li", null, "faltou: ", el("b", { text: w.right })) : el("li", null, el("span", { cls: "said", text: w.said || "—" }), " → ", el("b", { text: w.right })); })))) : el("p", { cls: "small", text: "Nenhum erro! 🎯" }),
      medals.length ? el("div", { cls: "new-medals" }, medals.map(function (m) { return el("span", { cls: "nm", text: m.icon + " " + m.name }); })) : null);
    R.stage.replaceChildren(box);
    R.foot.replaceChildren(
      nextP ? el("a", { cls: "btn big", href: "#/u/" + c.unit.id + "/" + nextP.key, text: "Próxima: " + nextP.icon + " " + nextP.name + " ▶" }) : nextU ? el("a", { cls: "btn big", href: "#/u/" + nextU.id + "/aula", text: "Próxima matéria: " + nextU.emoji + " " + nextU.title + " ▶" }) : null,
      el("a", { cls: "btn ghost", href: "#", text: "🗺️ Voltar pra trilha" }));
    if (s === 3 || !nextP) { SFX.win(); confetti(); } else SFX.unlock();
  }

  // revisão avulsa (da trilha)
  function runReview() {
    var due = dueCards(10);
    if (!due.length) { home(); return; }
    var steps = reviewSteps(due, false);
    steps.unshift(stInfo("🔁 Revisão de hoje", "São <b>" + due.length + "</b> itens. Os que você errou aparecem com <b>❌</b>. Acertou? Ele volta mais tarde. Errou? Volta amanhã.", { eyebrow: "Repetição espaçada", btn: "Começar" }));
    R = null;
    startRunner({ unit: { id: "rev", emoji: "🔁", title: "Revisão", audio: null }, ui: -1, pk: "revisao", phase: { icon: "🔁", name: "Revisão" }, steps: steps });
    var orig = finishPhase;
    R.finishOverride = true;
  }

  // ---------- rotas (#/u/u03/aula, #/revisao, #/sobre) ----------
  function go(h) { if (location.hash === h) route(); else location.hash = h; }
  function route() {
    var h = location.hash.replace(/^#\/?/, "");
    var m = h.match(/^u\/(u\d\d)\/(\w+)$/);
    if (m) { runPhase(m[1], m[2]); return; }
    if (h === "revisao") { runReview(); return; }
    if (h === "sobre") { about(); return; }
    stopMedia(); home(true);
  }
  // fim de uma revisão avulsa: guarda a ofensiva e volta pra trilha
  var _finish = finishPhase;
  finishPhase = function () {
    if (R && R.cfg.pk === "revisao") {
      markDay(); S.xp += R.pts; var md = checkMedals("revisao"); persist();
      R.bar.style.width = "100%";
      R.stage.replaceChildren(el("div", { cls: "card result" }, el("span", { cls: "res-stars", text: "🧠" }), el("h2", { text: "Revisão feita!" }),
        el("p", { text: "Você acertou " + R.pts + " de " + R.max + ". +" + R.pts + " XP. Os que você errou voltam amanhã." }),
        md.length ? el("div", { cls: "new-medals" }, md.map(function (x) { return el("span", { cls: "nm", text: x.icon + " " + x.name }); })) : null));
      R.foot.replaceChildren(el("a", { cls: "btn big", href: "#", text: "🗺️ Voltar pra trilha" }));
      SFX.win(); return;
    }
    _finish();
  };
  window.addEventListener("hashchange", route);
  loadIndex().then(route).catch(function () { root.replaceChildren(el("p", { cls: "boot", text: "Não consegui carregar a trilha. Confira a internet e recarregue." })); });
})();
