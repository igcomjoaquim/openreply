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
  S.best = S.best || { combo: 0 };
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
    if (old) {
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
    var count = el("span", { cls: "plays", text: opts.goal ? "Ouviu 0 de " + opts.goal + " vezes" : "" });
    var fill = el("i"), bar = el("div", { cls: "pbar" }, fill);
    var play = el("button", { cls: "pbtn", type: "button", "aria-label": "Tocar", text: "▶" });
    a.addEventListener("timeupdate", function () { if (a.duration) fill.style.width = (a.currentTime / a.duration * 100) + "%"; });
    a.addEventListener("play", function () { play.textContent = "⏸"; });
    a.addEventListener("pause", function () { play.textContent = "▶"; });
    a.addEventListener("ended", function () {
      play.textContent = "↺"; plays++; if (opts.goal) count.textContent = plays >= opts.goal ? "✅ Ouviu " + plays + " vezes" : "Ouviu " + plays + " de " + opts.goal + " vezes";
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
  function micButton(onText, onDone, label) {
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
      rec.onresult = function (e) { interim = ""; for (var i = e.resultIndex; i < e.results.length; i++) { if (e.results[i].isFinal) finals += " " + e.results[i][0].transcript; else interim += " " + e.results[i][0].transcript; } onText((finals + " " + interim).trim()); };
      var restarts = 0;
      rec.onend = function () { if (!rec) return; if (!stopping && restarts++ < 15) { try { rec.start(); } catch (e) {} } else { stopping = true; end(); } };
      rec.onerror = function (ev) { if (ev.error === "not-allowed" || ev.error === "service-not-allowed") { live = false; rec = null; b.disabled = false; b.textContent = "🎤 Gravar"; onDone(null, "blocked"); } };
      b.disabled = true;
      try { rec.start(); } catch (e) {}
      var n = 3; b.classList.add("counting");
      (function tick() {
        if (!rec) { b.classList.remove("counting"); return; }
        if (n === 0) { b.classList.remove("counting"); b.disabled = false; live = true; b.classList.add("live"); b.textContent = "🔴 FALE AGORA! (toque para parar)"; SFX.go(); return; }
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
    { key: "aula", icon: "🎬", name: "Aula", desc: "Vídeo real, áudio, chunks e escrita" },
    { key: "licao", icon: "🏠", name: "Lição de casa", desc: "Ditado, lacunas, frases e fala" },
    { key: "fofoca1", icon: "🕵️", name: "Fofoca 1", desc: "Ouvir, entender e recontar" },
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
      var u = U[cur.i], p = PHASES[cur.j];
      wrap.append(el("a", { cls: "next-card", href: "#/u/" + u.id + "/" + p.key },
        el("span", { cls: "eyebrow", text: cur.j === 0 ? "📌 Hoje você vai aprender" : "📌 Continue de onde parou" }),
        el("b", { cls: "next-title", text: cur.j === 0 ? u.today : p.icon + " " + p.name + " · " + u.emoji + " " + u.title }),
        el("span", { cls: "small", text: "Matéria " + (cur.i + 1) + " · " + u.grammar }),
        el("span", { cls: "btn big", text: cur.j === 0 && !donePhases ? "Começar ▶" : "Continuar ▶" })));
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
            here ? el("span", { cls: "bubble", text: j === 0 ? "COMEÇAR" : "AQUI" }) : null,
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
      el("p", { html: "Do mesmo jeito das minhas aulas: <b>inglês de verdade</b> (vídeo de nativo), <b>fofoca</b>, chunks, lição de casa e <b>Real Time</b>. Cada matéria tem 6 fases que vão destravando — e o que você errar volta pra revisão no dia certo." }),
      el("ol", { cls: "how" },
        el("li", { html: "🎬 <b>Aula</b> — vídeo real + áudio + chunks + escrever" }),
        el("li", { html: "🏠 <b>Lição de casa</b> — fixar o que viu" }),
        el("li", { html: "🕵️ <b>2 fofocas</b> — ouvir, entender e recontar" }),
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
      el("p", { html: "<b>Repetição espaçada:</b> cada erro vira um cartão. Ele volta amanhã; acertou, volta em 3 dias, depois 7, 14, 30. Errou de novo, volta pro começo. Toda fase começa revisando o que venceu." }),
      el("p", { html: "Os vídeos são cenas reais do YouTube (desenhos, vlogs, BBC). Primeiro <b>sem legenda</b>; depois, se precisar, <b>0.75×</b>; no fim, de novo na velocidade normal." }),
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
      var steps = buildSteps(U, pk, ui);
      // revisão espaçada no começo de toda fase (o que venceu hoje, até 5)
      var due = dueCards(5);
      if (due.length && pk !== "aula" || (due.length && pk === "aula" && ui > 0)) steps.unshift.apply(steps, reviewSteps(due, true));
      startRunner({ unit: U, ui: ui, pk: pk, phase: PHASES[pj], steps: steps });
    }).catch(function () { root.replaceChildren(el("div", { cls: "wrap" }, el("p", { cls: "boot", html: 'Não consegui carregar. Confira a internet e <a href="">tente de novo</a>.' }))); });
  }

  function startRunner(cfg) {
    R = { cfg: cfg, i: 0, pts: 0, max: 0, combo: 0, best: 0, wrongs: [], startXp: S.xp };
    var bar = el("i"), stage = el("div", { cls: "stage" }), foot = el("div", { cls: "foot" });
    var comboEl = el("span", { cls: "combo" });
    var head = el("div", { cls: "phead" },
      el("button", { cls: "x", type: "button", "aria-label": "Sair", text: "✕", onclick: function () { if (confirm("Sair da fase? O que você fez nela não fica salvo.")) { stopMedia(); go("#"); } } }),
      el("div", { cls: "pbar2" }, bar), comboEl);
    var title = el("div", { cls: "ptitle", text: cfg.pk === "revisao" ? "🔁 Revisão espaçada" : cfg.phase.icon + " " + cfg.phase.name + " · " + cfg.unit.emoji + " " + cfg.unit.title });
    root.replaceChildren(el("div", { cls: "wrap run" }, head, title, stage, foot));
    R.bar = bar; R.stage = stage; R.foot = foot; R.comboEl = comboEl;
    window.scrollTo(0, 0);
    nextStep();
  }
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
  function advance() { R.i++; nextStep(); }
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
      var box = el("div", { cls: "opts" });
      order.forEach(function (k) {
        box.append(el("button", { cls: "opt", type: "button", text: item.options[k], onclick: function (e) {
          if (box.classList.contains("locked")) return; SFX.tap();
          [].forEach.call(box.children, function (b) { b.classList.remove("sel"); }); e.currentTarget.classList.add("sel"); chosen = k; check.disabled = false;
        } }));
      });
      var check = el("button", { cls: "btn big", type: "button", text: "Conferir", disabled: true, onclick: function () {
        if (chosen == null) return; box.classList.add("locked");
        var ok = chosen === item.answer;
        [].forEach.call(box.children, function (b, idx) { var k = order[idx]; if (k === item.answer) b.classList.add("ok"); else if (k === chosen) b.classList.add("bad"); });
        hit(ok); score(ok ? 1 : 0, 1);
        if (!opts.noCard) addCard({ id: "q:" + U.id + ":" + label + ":" + norm(item.q).slice(0, 40), kind: "mcq", unit: U.id, from: cardFrom, q: item.q, options: item.options, answer: item.answer }, !ok);
        if (!ok) R.wrongs.push({ said: item.options[chosen], right: item.options[item.answer], why: item.q });
        sheet(ok, ok ? pick(GOOD) : pick(BAD), ok ? null : el("p", null, "Resposta certa: ", el("b", { text: item.options[item.answer] })));
      } });
      stage.append(el("div", { cls: "card" }, opts.eyebrow ? el("span", { cls: "eyebrow", text: opts.eyebrow }) : null, el("h2", { cls: "q", html: rich(item.q) }), opts.media || null, box));
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
      var toggle = el("button", { cls: "linkish", type: "button", text: "⌨️ Prefiro digitar", onclick: function () {
        typing = !typing; ta.hidden = !typing; built.hidden = typing; bank.hidden = typing; toggle.textContent = typing ? "🧩 Usar as palavras" : "⌨️ Prefiro digitar"; if (typing) ta.focus(); refresh();
      } });
      var check = el("button", { cls: "btn big", type: "button", text: "Conferir", disabled: true, onclick: function () {
        var said = typing ? ta.value : [].map.call(built.children, function (c) { return c.textContent; }).join(" ");
        var acc = [target].concat(item.alt || []).map(canon);
        var ok = acc.indexOf(canon(said)) > -1;
        bank.classList.add("locked"); built.classList.add("locked"); ta.disabled = true;
        hit(ok); score(ok ? 1 : 0, 1);
        if (!opts.noCard) addCard({ id: "t:" + U.id + ":" + norm(item.pt).slice(0, 40) + "|" + norm(target).slice(0, 40), kind: "tr", unit: U.id, from: cardFrom, pt: item.pt, en: target, alt: item.alt || [] }, !ok);
        if (!ok) R.wrongs.push({ said: said, right: target, why: item.pt });
        say(U, opts.audioKey, target);
        sheet(ok, ok ? pick(GOOD) : pick(BAD), el("p", null, ok ? "" : "Certo: ", el("b", { text: target }), " ", ear(U, opts.audioKey, target)));
      } });
      ta.addEventListener("input", refresh);
      stage.append(el("div", { cls: "card" }, el("span", { cls: "eyebrow", text: opts.eyebrow || "✍️ Passe pro inglês" }),
        el("h2", { cls: "q pt", text: item.pt }), opts.hint ? el("p", { cls: "small", html: opts.hint }) : null, built, bank, ta, toggle));
      foot.append(check);
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
      var answers = [], i = 0;
      var html = rich(text).replace(/\[\[([^\]]+)\]\]/g, function (_, a) { answers.push(a.split("|").map(function (x) { return x.trim(); })); return '<input class="gap" data-i="' + (i++) + '" autocomplete="off" autocapitalize="off" spellcheck="false" size="7">'; });
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
  function stVideo(U, V) {
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
      var cont = contBtn("Já assisti — ir pras perguntas");
      cont.disabled = true;
      var skip = el("button", { cls: "linkish", type: "button", text: "O vídeo não abre aqui — seguir mesmo assim", onclick: advance });
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
  // ouvir o áudio-base / a fofoca (com palavra secreta opcional)
  function stListen(U, key, cfg) {
    return function (stage, foot) {
      var url = audioUrl(U, key), ready = !!cfg.noGate;
      var cont = contBtn(cfg.btn || "Já ouvi — continuar");
      var pl = url ? bigPlayer(url, { goal: cfg.goal || 2, onPlays: function (n) { if (n >= (cfg.goal || 2) - 1) { cont.disabled = false; } } }) : el("button", { cls: "btn", type: "button", text: "🔊 Ouvir", onclick: function () { voice(cfg.text); cont.disabled = false; } });
      cont.disabled = !ready;
      var c = el("div", { cls: "card" }, el("span", { cls: "eyebrow", text: cfg.eyebrow || "🎧 Só ouvir" }), el("h2", { html: cfg.title }), cfg.intro ? el("p", { html: cfg.intro }) : null, pl);
      if (cfg.secret) {
        var inp = el("input", { type: "text", placeholder: "🔑 palavra secreta", autocomplete: "off", autocapitalize: "off", spellcheck: "false" }), m = el("p", { cls: "msg", hidden: true }), tries = 0;
        var chk = el("button", { cls: "btn", type: "button", text: "Conferir", onclick: function () {
          if (norm(inp.value) === norm(cfg.secret)) { inp.disabled = true; chk.disabled = true; m.hidden = false; m.className = "msg good"; m.textContent = "🔑 Isso! Palavra secreta certa."; score(tries ? 1 : 2, 2); hit(true); cont.disabled = false; }
          else { tries++; m.hidden = false; m.className = "msg bad"; m.textContent = inp.value ? "Não é essa. Ouça o final de novo 🎧" : "Escreva a palavra do fim do áudio."; SFX.bad(); }
        } });
        inp.addEventListener("keydown", function (e) { if (e.key === "Enter") chk.click(); });
        c.append(el("p", { cls: "small", text: "No fim do áudio tem uma palavra secreta. Escreva aqui:" }), el("div", { cls: "row" }, inp, chk), m);
        cont.disabled = true;
      }
      stage.append(c); foot.append(cont);
      R.cleanup = function () { if (pl._audio) pl._audio.pause(); };
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
          inner = stMcq(fakeU, { q: c.q, options: c.options, answer: c.answer }, "rev", c.from, { eyebrow: "🔁 Revisão", noCard: true });
        } else {
          inner = stTranslate(fakeU, { pt: c.pt, en: c.en, alt: c.alt }, c.from, { eyebrow: "🔁 Revisão", distract: [], noCard: true });
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

  // ---------- monta os passos de cada fase ----------
  function lessonQuestions(U, qs, label, from, eyebrow) { return (qs || []).map(function (q) { return stMcq(U, q, label, from, { eyebrow: eyebrow }); }); }
  function allAnswers(U) { var a = []; (U.lesson.chunks || []).forEach(function (c) { (c.practice || []).forEach(function (p) { plain(p.en).split(/\s+/).forEach(function (w) { a.push(w); }); }); }); return a; }
  function distractors(U, en) { var mine = words(en); return shuffle(allAnswers(U).filter(function (w) { return mine.indexOf(norm(w)) < 0 && norm(w); })).slice(0, 3); }

  function buildSteps(U, pk, ui) {
    var from = uname(U), L = U.lesson, H = U.homework, st = [];
    if (pk === "aula") {
      st.push(stInfo(U.emoji + " " + U.title, "<p class='today'>" + rich(U.today) + "</p><ul class='cando'>" + (U.canDo || []).map(function (c) { return "<li>✅ " + esc(c) + "</li>"; }).join("") + "</ul><p class='small'>Matéria " + (ui + 1) + " de " + INDEX.units.length + " · " + esc(U.grammar) + "</p>", { eyebrow: "🎯 Hoje você vai aprender", btn: "Bora! ▶" }));
      if (U.video) {
        st.push(stVideo(U, U.video));
        st = st.concat(lessonQuestions(U, U.video.questions, "video", from + " (vídeo)", "🎬 Sobre o vídeo"));
        if (U.video.vocab && U.video.vocab.length) st.push(stVocab(U, U.video.vocab, "Palavras do vídeo"));
      }
      st.push(stListen(U, "lesson", { title: "🎧 " + esc(L.audio.title), intro: "Agora um áudio, <b>sem ler nada</b>. Na 1ª vez é normal entender pouco. Ouça <b>2 vezes</b>.", text: L.audio.lines.map(function (l) { return l.text; }).join(" ") }));
      st = st.concat(lessonQuestions(U, L.audio.questions, "audio", from + " (áudio)", "❓ Entendeu a fofoca?"));
      L.chunks.forEach(function (ch, ci) { st.push(stChunk(U, ch, ci)); });
      st.push(stInfo("✍️ Agora é com você", "Para cada chunk, umas frases em português. <b>Passe pro inglês</b> usando só o que os exemplos ensinaram.", { eyebrow: "Escrever os chunks", btn: "Começar" }));
      L.chunks.forEach(function (ch, ci) { (ch.practice || []).forEach(function (p, k) { st.push(stTranslate(U, p, from, { eyebrow: "✍️ Chunk " + (ci + 1) + ": " + plain(ch.chunk), audioKey: "pr" + ci + "_" + k, distract: distractors(U, p.en) })); }); });
      if (L.grammar) st.push(stGrammar(U, L.grammar));
      st.push(stRead(U, L.audio.lines, "📖 " + L.audio.title));
    } else if (pk === "licao") {
      st.push(stInfo("🏠 Lição de casa", "Tudo aqui é da <b>aula de " + esc(U.title) + "</b>: os mesmos chunks e a mesma fofoca. É assim que fixa.", { eyebrow: "Matéria " + (ui + 1), btn: "Começar" }));
      if (H.dictation) st.push(stDictation(U, H.dictation, from + " (ditado)"));
      if (H.gaps) st.push(stGaps(U, H.gaps, H.gapsWords, "lição", from + " (lição)"));
      (H.order || []).forEach(function (parts) { st.push(stTranslate(U, { pt: "Monte a frase na ordem certa", en: parts.join(" ") }, from + " (lição)", { eyebrow: "🧩 Coloque em ordem", hint: "Toque nos pedaços na ordem certa.", distract: [] })); });
      (H.shadowing || []).forEach(function (s, k) {
        st.push(stSpeak(U, {
          eyebrow: "🦜 Shadowing " + (k + 1) + " de " + H.shadowing.length, title: rich(s.en), micLabel: "🎤 Agora você",
          body: el("div", null, el("p", { cls: "small", text: "🇧🇷 " + s.pt }), el("div", { cls: "ptools" }, el("button", { type: "button", text: "🔊 Ouvir", onclick: function () { say(U, "sh" + k, s.en); } }), el("button", { type: "button", text: "🐢 Devagar", onclick: function () { say(U, "sh" + k, s.en, true); } }))),
          model: s.en,
          check: function (t) { var tw = words(s.en), sw = words(t), h = tw.filter(function (w) { return sw.indexOf(w) > -1; }).length, pct = h / tw.length; return { ok: pct >= 0.7, pts: pct >= 0.95 ? 2 : 1, max: 2, msg: "A página entendeu " + Math.round(pct * 100) + "%. Ouça de novo e repita igualzinho.", title: Math.round(pct * 100) + "% — " + pick(GOOD) }; },
        }));
      });
      if (H.writing) {
        var W = H.writing;
        st.push(function (stage, foot) {
          var ta = el("textarea", { rows: "4", placeholder: "Escreva em inglês…", autocapitalize: "sentences", spellcheck: "false" });
          var check = el("button", { cls: "btn big", type: "button", text: "Enviar", disabled: true, onclick: function () {
            var got = keysHit(ta.value, W.keys), n = got.filter(Boolean).length;
            ta.disabled = true; score(Math.min(3, 1 + n), 3); if (n >= Math.ceil(W.keys.length / 2)) SFX.ok(); else SFX.bad();
            sheet(n >= Math.ceil(W.keys.length / 2), "Você usou " + n + " de " + W.keys.length + " estruturas", el("div", null, chipsOf(W.keys, got), W.model ? el("p", null, "Um exemplo: ", el("i", { text: W.model })) : null));
          } });
          ta.addEventListener("input", function () { check.disabled = words(ta.value).length < (W.minWords || 6); });
          stage.append(el("div", { cls: "card" }, el("span", { cls: "eyebrow", text: "✍️ Writing" }), el("h2", { text: String(W.prompt).replace(/^\s*em portugu[eê]s\s*[:—-]\s*/i, "") }), el("p", { cls: "small", text: "Mínimo " + (W.minWords || 6) + " palavras. Use: " + W.keys.map(function (k) { return k.name; }).join(" · ") }), ta));
          foot.append(check);
        });
      }
    } else if (pk === "fofoca1" || pk === "fofoca2") {
      var G = U.gossips[pk === "fofoca1" ? 0 : 1], gk = pk === "fofoca1" ? "g0" : "g1";
      st.push(stListen(U, gk, { eyebrow: "🕵️ " + (pk === "fofoca1" ? "Fofoca 1" : "Fofoca 2") + " · só ouvir", title: esc(G.title), intro: "🚫 <b>Não leia nada.</b> Ouça 2 vezes. No fim tem uma 🔑 <b>palavra secreta</b>.", secret: G.secret, text: G.lines.map(function (l) { return l.text; }).join(" ") }));
      st = st.concat(lessonQuestions(U, G.questions, gk, from + " (" + (pk === "fofoca1" ? "fofoca 1" : "fofoca 2") + ")", "❓ O que aconteceu?"));
      var gtext = G.lines.map(function (l) { return plain(l.text); }).join(" ");
      st.push(stSpeak(U, {
        eyebrow: "🗣️ Reconte", title: "Conte a fofoca com as suas palavras", micLabel: "🎤 Recontar",
        body: el("div", null, el("p", { html: rich(G.retell.prompt) }), el("p", { cls: "small", text: "Diga a 🔑 palavra secreta e use pelo menos " + (G.retell.minWords || 12) + " palavras. Conectores: and · but · so · then · because" })),
        model: gtext,
        check: function (t) {
          var n = words(t).length, sw = words(t), kw = (G.retell.keywords || []).filter(function (k) { return norm(t).indexOf(norm(k)) > -1; }).length, sec = norm(t).indexOf(norm(G.secret)) > -1;
          var need = Math.min(2, (G.retell.keywords || []).length);
          var ok = n >= (G.retell.minWords || 12) && kw >= need && sec;
          return { ok: ok, pts: ok ? Math.min(4, 2 + kw) : 0, max: 4,
            msg: !sec ? "Faltou a 🔑 palavra secreta." : n < (G.retell.minWords || 12) ? "Fale mais um pouco (" + n + " de " + (G.retell.minWords || 12) + " palavras)." : "Conte o que aconteceu NA fofoca. Tente usar: " + (G.retell.keywords || []).filter(function (k) { return norm(t).indexOf(norm(k)) < 0; }).slice(0, 4).join(", ") + ".",
            title: "🔓 Reconto aceito! " + pick(GOOD) };
        },
      }));
      if (G.read) st.push(stGaps(U, G.read, null, gk + "-read", from + " (" + (pk === "fofoca1" ? "fofoca 1" : "fofoca 2") + ")"));
      if (G.opinion) st.push(stSpeak(U, {
        eyebrow: "💬 E você?", title: rich(G.opinion.q), micLabel: "🎤 Responder",
        body: el("p", { cls: "small", text: "🇧🇷 " + G.opinion.pt + (G.opinion.starter ? " · Comece com: " + G.opinion.starter : "") }),
        check: function (t) { var n = words(t).length; return { ok: n >= 4, pts: n >= 8 ? 2 : 1, max: 2, msg: "Responda com uma frase completa (pelo menos 4 palavras).", title: pick(GOOD) + " Falou, validou!" }; },
      }));
    } else if (pk === "rt1" || pk === "rt2") {
      var T = U.realtimes[pk === "rt1" ? 0 : 1];
      st.push(stInfo("⚡ Real Time", "Um texto em <b>português</b>. Você passa pro <b>inglês</b>, falando ou escrevendo, com tudo que aprendeu até aqui. Sem tradutor! Se travar, use <b>let me see…</b> e siga.", { eyebrow: "Matéria " + (ui + 1) + " · " + U.title, btn: "Ver o texto" }));
      st.push(stSpeak(U, {
        eyebrow: "⚡ " + (pk === "rt1" ? "Real Time 1" : "Real Time 2"), title: esc(T.title), micLabel: "🎤 Falar em inglês",
        body: el("div", null, el("p", { cls: "rt-pt", text: T.pt }), el("p", { cls: "small", text: "Precisa aparecer: " + T.keys.map(function (k) { return k.name; }).join(" · ") })),
        model: T.model,
        check: function (t) {
          var got = keysHit(t, T.keys), n = got.filter(Boolean).length, wc = words(t).length;
          var ok = n >= Math.ceil(T.keys.length * 0.6) && wc >= Math.min(T.minWords || 20, 25);
          var body = el("div", null, chipsOf(T.keys, got), el("p", { cls: "small", text: "Uma versão possível:" }), el("p", { cls: "model" }, el("i", { text: T.model }), " ", el("button", { cls: "ear", type: "button", text: "🔊", onclick: function () { say(U, pk, T.model); } })));
          // estrutura que faltou: volta pra revisão a frase de chunk que treina exatamente ela
          if (!ok) T.keys.forEach(function (k, i) {
            if (got[i]) return;
            var vs = [k.name].concat(k.any || []).map(canon);
            U.lesson.chunks.forEach(function (ch) { (ch.practice || []).forEach(function (pr) {
              var en = canon(plain(pr.en));
              if (vs.some(function (v) { return v && en.indexOf(v) > -1; })) addCard({ id: "t:" + U.id + ":" + norm(pr.pt).slice(0, 40) + "|" + norm(plain(pr.en)).slice(0, 40), kind: "tr", unit: U.id, from: from + " (Real Time)", pt: pr.pt, en: plain(pr.en), alt: pr.alt || [] }, true);
            }); });
          });
          var missing = T.keys.filter(function (k, i) { return !got[i]; }).map(function (k) { return { said: "(faltou no Real Time)", right: k.name, why: T.title }; });
          return { ok: ok, pts: Math.min(5, 1 + n), max: 5, body: body, missing: missing, title: n === T.keys.length ? "⚡ Perfeito! Todas as estruturas!" : "⚡ Real Time feito! " + n + " de " + T.keys.length + " estruturas",
            msg: wc < Math.min(T.minWords || 20, 25) ? "Fale o texto inteiro (" + wc + " palavras até agora)." : "Faltou usar: " + T.keys.filter(function (k, i) { return !got[i]; }).map(function (k) { return k.name; }).join(", ") + ". Tente de novo." };
        },
      }));
    }
    return st;
  }

  // ---------- fim da fase ----------
  var CHEER = { 3: ["Perfeito! Falou, validou! 🚀", "Brabo demais! 🔥", "Gabaritou! Nativo que lute. 😎"], 2: ["Muito bom! Dá pra chegar nas 3 estrelas.", "Mandou bem! Os errinhos foram pra revisão."], 1: ["Passou! Errar faz parte: os erros voltam na revisão.", "Calma, ninguém nasce falando. Bora pra próxima!"] };
  function finishPhase() {
    var c = R.cfg, pct = R.max ? R.pts / R.max : 1, s = stars(pct), k = pkey(c.unit.id, c.pk), old = S.phases[k];
    var firstTime = !old;
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
