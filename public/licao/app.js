/* Lição de casa — Inglês com Joaquim.
 * Monta a lição a partir do JSON da página: ouvir → falar → ler → escrever → falar.
 * Cada parte abre quando a anterior termina; o progresso fica salvo no servidor
 * (e o link do aluno retoma de onde parou). Gravações: MediaRecorder (áudio que
 * vai pra pasta do professor) + reconhecimento de fala do navegador (o texto
 * que confere a fala na hora). */
(function () {
  "use strict";
  var D = JSON.parse(document.getElementById("lesson-data").textContent);
  var C = D.content;
  var app = document.getElementById("app");
  var FILE = function (n) { return "/api/licao/file/" + n; };
  var STORE = "licao:" + D.slug + ":" + D.lessonId + (D.mode === "practice" ? ":treino" : "");
  var VIEW = D.mode === "view";
  // modo professor (link do painel): mostra tudo igual, mas não cria tentativa nem salva nada
  var PREVIEW = !!D.preview;
  var PQ = PREVIEW ? "professor=1" : "";
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- helpers ----------
  function el(tag, attrs) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (k === "text") e.textContent = attrs[k];
      else if (k === "html") e.innerHTML = attrs[k];
      else if (k === "cls") e.className = attrs[k];
      else if (k.slice(0, 2) === "on") e.addEventListener(k.slice(2), attrs[k]);
      else e.setAttribute(k, attrs[k]);
    }
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (c == null || c === false) continue;
      e.append(c && c.nodeType ? c : String(c));
    }
    return e;
  }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  // só **negrito** e *itálico* nos textos da lição
  function rich(s) { return esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\*(.+?)\*/g, "<i>$1</i>"); }
  function norm(s) {
    return String(s).toLowerCase().replace(/\b([ap])\.m\./g, "$1m").replace(/[’`´]/g, "'")
      .replace(/[^a-z0-9' ]/g, " ").replace(/\s+/g, " ").trim();
  }
  function words(s) { return norm(s).split(" ").filter(Boolean); }
  function say(node, txt, good) { node.textContent = txt || ""; node.hidden = !txt; node.className = "msg " + (good ? "good" : "bad"); }
  function speak(t) { try { var u = new SpeechSynthesisUtterance(t); u.lang = "en-US"; u.rate = 0.85; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) {} }
  // 🔊 que fala a palavra/frase em inglês (voz do celular)
  function ear(t, label) { return el("button", { cls: "ear", type: "button", "aria-label": "Ouvir " + t, text: label || "🔊", onclick: function (e) { e.stopPropagation(); speak(t); } }); }
  // controles extras do áudio: voltar 5 s e velocidade 0.75×
  function audioTools(a) {
    var slow = false;
    return el("div", { cls: "a-tools" },
      el("button", { type: "button", text: "⏪ 5 s", onclick: function () { a.currentTime = Math.max(0, a.currentTime - 5); a.play().catch(function () {}); } }),
      el("button", { type: "button", text: "🐢 0.75×", onclick: function (e) { slow = !slow; a.playbackRate = slow ? 0.75 : 1; e.currentTarget.textContent = slow ? "🐇 1×" : "🐢 0.75×"; e.currentTarget.classList.toggle("sel", slow); } }));
  }
  function scrollTo(node) { setTimeout(function () { node.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" }); }, 300); }
  function load() { try { return JSON.parse(localStorage.getItem(STORE) || "null"); } catch (e) { return null; } }
  function save(v) { try { localStorage.setItem(STORE, JSON.stringify(v)); } catch (e) {} }

  // pinta o texto palavra a palavra: verde se o aluno disse/escreveu, vermelho se não
  function paint(node, text, said) {
    var pool = words(said), hit = 0, tot = 0, miss = [];
    node.replaceChildren();
    text.split(/(\s+)/).forEach(function (tok) {
      if (/^\s+$/.test(tok)) { node.append(tok); return; }
      var w = norm(tok), sp = el("span", { text: tok });
      if (w) {
        tot++;
        var parts = w.split(" ");
        if (parts.every(function (p) { return pool.indexOf(p) > -1; })) {
          parts.forEach(function (p) { pool.splice(pool.indexOf(p), 1); });
          hit++; sp.className = "hit";
        } else { sp.className = "miss"; miss.push(tok.replace(/[^\w'-]/g, "")); }
      }
      node.append(sp);
    });
    return { hit: hit, tot: tot, pct: tot ? hit / tot : 0, miss: miss };
  }
  function keysCheck(text, keys, chips) {
    var n = norm(text);
    var got = keys.map(function (k) { return k.any.some(function (x) { return n.indexOf(norm(x)) > -1; }); });
    if (chips) {
      chips.replaceChildren();
      got.forEach(function (g, i) { chips.append(el("span", { cls: "chip" + (g ? " ok" : ""), text: (g ? "✓ " : "✗ ") + keys[i].name })); });
      chips.hidden = false;
    }
    return got;
  }
  // Fala em português não conta: o reconhecimento está em inglês e transforma
  // português em palavras soltas (ou em português mesmo). Se aparecerem palavras
  // típicas do português, a gravação é recusada e o aluno grava de novo em inglês.
  var PT = ("que nao não eu ele ela eles elas voce você de do da dos das para pra com uma um uns umas " +
    "isso esse essa este esta está tá tava estava ontem hoje amanhã muito muita mas porque então entao também tambem " +
    "aqui ali lá onde quando como meu minha seu sua nós gente foi fui tem tinha vai vou fazer falar ser estar " +
    "obrigado obrigada sim né tipo coisa casa trabalho depois agora sempre nunca ainda mais menos bem bom boa").split(" ");
  function ptWords(text) {
    return words(text).filter(function (w) { return PT.indexOf(w) > -1 && ["a", "e", "o"].indexOf(w) < 0; });
  }
  function isPortuguese(text) {
    var w = words(text), p = ptWords(text);
    return w.length > 0 && p.length >= 2 && p.length / w.length >= 0.12;
  }
  function keysHit(text, keys) {
    var n = norm(text);
    return keys.filter(function (k) { return k.any.some(function (x) { return n.indexOf(norm(x)) > -1; }); }).length;
  }
  var STOP = "the a an and but or so to of in on at for is was were it he she they you i we my his her their this that with be have had did didn't don't not no yes".split(" ");
  function storyWords() {
    var all = words((C.story.paragraphs || []).join(" ").replace(/\[\[[^\]]*\]\]/g, " ") + " " + C.readAloud.text);
    return all.filter(function (w, i) { return w.length >= 3 && STOP.indexOf(w) < 0 && all.indexOf(w) === i; });
  }

  function findMistakes(text, list) {
    var n = norm(text);
    return (list || []).filter(function (m) { try { return new RegExp(m.match, "i").test(n); } catch (e) { return false; } })
      .map(function (m) { return { said: m.said, right: m.right, why: m.why }; });
  }

  // ---------- state ----------
  var att = null;           // {id, token}
  var saved = {};           // progress do servidor
  var steps = [];           // definições das partes
  var bars = [];
  var review = null;        // correção do professor (servidor)

  // Internet do celular cai: cada envio tenta de novo (1 s, 3 s, 8 s); o que não
  // foi fica guardado no aparelho e sai quando a conexão volta. Aviso no topo.
  var QKEY = STORE + ":fila", netEl = null;
  function netBanner(on) {
    if (!netEl) { netEl = el("div", { cls: "net-warn", hidden: "", role: "status" }); document.body.append(netEl); }
    netEl.textContent = "📡 Sem internet agora. Pode continuar: suas respostas ficam guardadas e vão sozinhas quando a conexão voltar.";
    netEl.hidden = !on;
  }
  function rawPost(url, body) {
    return fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      .then(function (r) { if (r.status >= 500) throw new Error("server"); return r.ok ? r.json() : null; });
  }
  function post(url, body, tries) {
    tries = tries == null ? 3 : tries;
    return rawPost(url, body).then(function (r) { netBanner(false); flushQueue(); return r; }, function () {
      if (tries < 3) netBanner(true);
      if (tries > 0) return new Promise(function (res) { setTimeout(res, [8000, 3000, 1000][tries - 1] || 1000); }).then(function () { return post(url, body, tries - 1); });
      netBanner(true);
      if (/\/progress$/.test(url)) { var q = queue(); q.push({ url: url, body: body }); setQueue(q); }
      return null;
    });
  }
  function queue() { try { return JSON.parse(localStorage.getItem(QKEY) || "[]"); } catch (e) { return []; } }
  function setQueue(q) { try { if (q.length) localStorage.setItem(QKEY, JSON.stringify(q)); else localStorage.removeItem(QKEY); } catch (e) {} }
  var flushing = false;
  function flushQueue() {
    var q = queue(); if (!q.length || flushing) return; flushing = true;
    var item = q[0];
    rawPost(item.url, item.body).then(function () { setQueue(queue().slice(1)); flushing = false; netBanner(false); flushQueue(); }, function () { flushing = false; });
  }
  window.addEventListener("online", flushQueue);
  setInterval(flushQueue, 15000);

  function finish(step, pts, data) {
    if (step.done) return;
    step.done = true; step.score = pts; step.data = data || {};
    absorb(step.data);
    step.sec.classList.add("done");
    step.ptsEl.textContent = pts + "/" + step.max + " pts";
    updateScore();
    var all = steps.every(function (s) { return s.done; });
    sendStep({ step: step.key, score: pts, max: step.max, data: step.data });
    var i = steps.indexOf(step);
    // não desce sozinho: o aluno lê o resultado com calma e toca quando quiser seguir
    if (i < steps.length - 1) unlock(steps[i + 1], false);
    if (all) showConclude(false);
    var pct = step.max ? pts / step.max : 1, st = stars(pct);
    step.sec.querySelector("h2").append(el("span", { cls: "stars", text: starText(st) }));
    if (!all) { if (st === 3) SFX.stage(); else if (st === 2) SFX.small(); else SFX.oops(); }
    step.sec.append(el("div", { cls: "stage-clear s" + st },
      el("b", { text: (st === 3 ? "🎉 Fase " : st === 2 ? "👏 Fase " : "💪 Fase ") + (i + 1) + " de " + steps.length + " completa!" }),
      el("span", { cls: "stars-big", text: starText(st) }),
      el("span", { cls: "small", text: pick(st === 3 ? CHEER3 : st === 2 ? CHEER2 : CHEER1) })));
    if (!step.holdScroll) {
      var nx = all ? concludeSec : steps.slice(i + 1).filter(function (s) { return !s.done; })[0] || steps.filter(function (s) { return !s.done; })[0];
      if (nx) {
        var label = all ? "Ir para o final 🏁" : "Próxima parte: " + (nx.title || "").replace(/^[^\wÀ-ú]+/, "") + " ↓";
        var go = el("button", { cls: "btn next-part", type: "button", text: label, onclick: function () {
          go.remove(); (nx.sec || nx).scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
        } });
        step.sec.append(go);
      }
    }
  }
  var mapEl = null;
  var delivered = false, hudEl = null, ICON = { review: "🧠", dictation: "✍️", scene: "🎬", gossip: "🕵️", shadowing: "🦜", retell: "🗣️", story: "📖", read: "📢", writing: "📝", realtime: "⚡" };
  function refreshHud() {
    if (!hudEl) return;
    var cur = steps.filter(function (s) { return !s.done && !s.sec.classList.contains("locked"); })[0];
    var doneN = steps.filter(function (s) { return s.done; }).length;
    steps.forEach(function (s, i) {
      var b = bars[i]; if (!b) return;
      b.className = s.done ? "on done" : s === cur ? "on cur" : s.sec.classList.contains("locked") ? "" : "on";
      s.sec.classList.toggle("cur", s === cur && !VIEW && !PREVIEW);
    });
    hudEl.replaceChildren();
    if (VIEW || PREVIEW) { hudEl.hidden = true; return; }
    hudEl.append(cur
      ? el("span", null, el("b", { text: (ICON[cur.key] || "▶") + " Fase " + (steps.indexOf(cur) + 1) + " de " + steps.length }), " · " + cur.title.replace(/^[^\wÀ-ú]+/, ""))
      : el("b", { text: delivered ? "🏆 Lição entregue! Veja seu feedback." : doneN === steps.length ? "🏁 Todas as fases feitas! Falta só concluir." : "" }),
      el("button", { cls: "hud-go", type: "button", text: cur ? "ir ↓" : delivered ? "ver ↓" : "ir ao final ↓", onclick: function () {
        var t = cur ? cur.sec : delivered ? fbSec : concludeSec; if (t) t.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      } }));
  }
  function refreshMap() {
    refreshHud();
    if (!mapEl) return;
    var left = steps.filter(function (s) { return !s.done; }).reduce(function (a, s) { return a + s.minutes; }, 0);
    mapEl.replaceChildren(el("b", { cls: "map-title", text: "Mapa da lição" }));
    var ol = el("ol");
    steps.forEach(function (s) {
      var state = s.done ? "done" : s.sec.classList.contains("locked") ? "locked" : "open";
      ol.append(el("li", { cls: "map-" + state, "data-phase": PHASE[s.key] || "", onclick: function () { if (state !== "locked") s.sec.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" }); } },
        el("span", { cls: "map-dot", text: s.done ? "✓" : state === "locked" ? "🔒" : "•" }),
        el("span", { cls: "map-name", text: s.title.replace(/^[^\wÀ-ú]+/, "") }),
        el("span", { cls: "map-pts", text: s.done ? s.score + "/" + s.max : s.minutes + "′" })));
    });
    mapEl.append(ol, el("p", { cls: "map-foot", text: "⭐ " + total() + " pts" + (left ? " · faltam ~" + left + " min" : " · tudo feito! 🎉") }));
  }
  function unlock(step, scroll) {
    if (!step.sec.classList.contains("locked")) return;
    step.sec.classList.remove("locked");
    bars[steps.indexOf(step)].classList.add("on");
    refreshMap();
    if (scroll) scrollTo(step.sec);
  }
  var wrongs = [], missed = {}, good = [];
  function absorb(data) {
    (data.wrongs || []).forEach(function (w) { wrongs.push(w); });
    (data.good || []).forEach(function (g) { good.push(g); });
    (data.missed || []).forEach(function (w) {
      if (!w) return; var k = w.toLowerCase();
      missed[k] = missed[k] || { w: w, n: 0 }; missed[k].n++;
    });
  }
  var scoreEl;
  function total() { return steps.reduce(function (a, s) { return a + (s.done ? s.score : 0); }, 0); }
  function totalMax() { return steps.reduce(function (a, s) { return a + s.max; }, 0); }
  var lastTotal = 0;
  function updateScore() {
    var t = total(), gained = t - lastTotal; lastTotal = t;
    scoreEl.textContent = "⭐ " + t + " pts";
    refreshMap();
    if (gained > 0 && !reduce) {
      scoreEl.classList.remove("bump"); void scoreEl.offsetWidth; scoreEl.classList.add("bump");
      var plus = el("span", { cls: "plus", text: "+" + gained });
      scoreEl.parentNode.append(plus); setTimeout(function () { plus.remove(); }, 1400);
    }
  }

  // ---------- recorder (MediaRecorder + reconhecimento de fala) ----------
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var canRecord = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
  var micStream = null, busy = null;
  function getMic() {
    if (micStream) return Promise.resolve(micStream);
    return navigator.mediaDevices.getUserMedia({ audio: true }).then(function (s) { micStream = s; return s; });
  }
  function pickMime() {
    var opts = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
    for (var i = 0; i < opts.length; i++) if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(opts[i])) return opts[i];
    return "";
  }
  /* Uma sessão de gravação. cb.onText(texto) a cada pedaço; cb.onStop(texto, segundos). */
  function Session(cb) {
    var self = this, finals = "", interim = "", chunks = [], mr = null, rec = null, t0 = Date.now(), stopped = false;
    this.text = function () { return (finals + " " + interim).trim(); };
    this.seconds = function () { return Math.round((Date.now() - t0) / 1000); };
    var srEnded = null, srEndedResolve = null;
    this.start = function () {
      return (canRecord ? getMic() : Promise.resolve(null)).then(function (stream) {
        var ready = Promise.resolve();
        if (SR) {
          rec = new SR(); rec.lang = "en-US"; rec.continuous = true; rec.interimResults = true;
          rec.onresult = function (e) {
            interim = "";
            for (var i = e.resultIndex; i < e.results.length; i++) {
              if (e.results[i].isFinal) finals += " " + e.results[i][0].transcript;
              else interim += " " + e.results[i][0].transcript;
            }
            cb.onText(self.text());
          };
          srEnded = new Promise(function (r) { srEndedResolve = r; });
          rec.onend = function () { if (!stopped) { try { rec.start(); } catch (e) {} } else if (srEndedResolve) srEndedResolve(); };
          rec.onerror = function () {};
          // só diz "pode falar" quando o reconhecimento já está ouvindo (senão o começo se perde)
          ready = new Promise(function (r) { rec.onstart = function () { r(); }; setTimeout(r, 1500); });
          try { rec.start(); } catch (e) {}
        }
        if (stream) {
          var mime = pickMime();
          mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
          mr.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
          mr.start(1000);
        }
        return ready.then(function () { t0 = Date.now(); return stream; });
      });
    };
    this.stop = function () {
      if (stopped) return Promise.resolve(); stopped = true;
      if (rec) { try { rec.stop(); } catch (e) {} }
      var secs = self.seconds();
      return new Promise(function (resolve) {
        if (!mr || mr.state === "inactive") { resolve(null); return; }
        mr.onstop = function () { resolve(new Blob(chunks, { type: mr.mimeType || "audio/webm" })); };
        try { mr.stop(); } catch (e) { resolve(null); }
      }).then(function (blob) {
        // espera o celular entregar o último pedaço do texto (até 2,5 s)
        var wait = SR && srEnded ? Promise.race([srEnded.then(function () { return new Promise(function (r) { setTimeout(r, 250); }); }), new Promise(function (r) { setTimeout(r, 2500); })]) : Promise.resolve();
        return wait.then(function () {
          interim = interim; cb.onStop(self.text(), secs, blob);
        });
      });
    };
  }
  // contagem 3-2-1 enquanto o microfone liga: o aluno só fala quando já está gravando
  function countdown(b) {
    return new Promise(function (resolve) {
      var n = 3; b.classList.add("counting"); b._cancel = false;
      (function tick() {
        if (b._cancel) { b.classList.remove("counting"); return; }
        if (n === 0) { b.classList.remove("counting"); resolve(); return; }
        b.textContent = "Prepare-se… " + n; n--; SFX.tick();
        setTimeout(tick, 700);
      })();
    });
  }
  // ---------- sons de videogame (8-bit, originais, gerados na hora — sem arquivos) ----------
  var SFX = (function () {
    var ctx = null, on = true;
    try { on = localStorage.getItem("licao_som") !== "0"; } catch (e) {}
    function c() {
      if (!ctx) { var A = window.AudioContext || window.webkitAudioContext; if (!A) return null; try { ctx = new A(); } catch (e) { return null; } }
      if (ctx.state === "suspended") { try { ctx.resume(); } catch (e) {} }
      return ctx;
    }
    function tone(f, t0, d, type, vol) {
      var x = c(); if (!x) return;
      var o = x.createOscillator(), g = x.createGain(), t = x.currentTime + t0;
      o.type = type || "square"; o.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(vol || 0.07, t); g.gain.exponentialRampToValueAtTime(0.0008, t + d);
      o.connect(g); g.connect(x.destination); o.start(t); o.stop(t + d + 0.03);
    }
    function seq(notes, st, type, vol) { if (!on) return; notes.forEach(function (n, i) { if (n) tone(n, i * st, st * 0.95, type, vol); }); }
    return {
      tick: function () { seq([784], 0.06, "triangle", 0.09); },
      go: function () { seq([1047, 1568], 0.06, "square", 0.06); },
      blip: function () { seq([988, 1319], 0.05, "square", 0.05); },
      combo: function (n) { var b = 523 * Math.pow(1.0595, Math.min(n, 12) * 2); seq([b, b * 1.26, b * 1.5], 0.05, "square", 0.06); },
      small: function () { seq([523, 659, 784], 0.08, "triangle", 0.1); },
      stage: function () { seq([523, 659, 784, 1047, 0, 784, 1047], 0.085); },
      oops: function () { if (!on) return; tone(330, 0, 0.12, "triangle", 0.09); tone(247, 0.12, 0.22, "triangle", 0.09); },
      win: function () { seq([392, 523, 659, 784, 0, 659, 784, 0, 1047, 1047, 1047], 0.1); },
      isOn: function () { return on; },
      toggle: function () { on = !on; try { localStorage.setItem("licao_som", on ? "1" : "0"); } catch (e) {} if (on) seq([659, 988], 0.07); return on; },
    };
  })();
  // ---------- combo: acertos seguidos ----------
  var combo = 0, comboBest = 0, comboBonus = 0, comboDirty = false;
  function hit(ok) {
    if (VIEW) return;
    if (!ok) { combo = 0; return; }
    combo++; if (combo > comboBest) comboBest = combo;
    if (combo >= 3) {
      comboBonus++; comboDirty = true; SFX.combo(combo);
      var t = el("div", { cls: "combo-toast", text: "🔥 Combo x" + combo + "!  +1 XP" });
      document.body.append(t); setTimeout(function () { t.remove(); }, 1300);
    }
  }
  function saveCombo() {
    if (!comboDirty || !att || VIEW) return; comboDirty = false;
    post("/api/licao/attempt/" + att.id + "/progress", { token: att.token, step: "combo", score: 0, max: 0, data: { best: comboBest, bonus: comboBonus } });
  }
  // envia uma parte feita; se a lição ainda não conectou, guarda e manda quando conectar
  var pending = [];
  function sendStep(b) {
    if (VIEW || PREVIEW) return Promise.resolve(null);
    if (!att) { pending.push(b); return Promise.resolve(null); }
    b.token = att.token;
    return post("/api/licao/attempt/" + att.id + "/progress", b).then(function (r) { saveCombo(); return r; });
  }
  var CHEER3 = ["Perfeito! Falou, validou! 🚀", "Brabo demais! 🔥", "Gabaritou! Nativo que lute. 😎", "Isso aqui é nível fofoqueiro profissional. 🕵️", "Mandou muito! Bora pra próxima."];
  var CHEER2 = ["Muito bom! Dá pra chegar nas 3 estrelas.", "Quase perfeito! Mais um pouquinho e é 3 estrelas.", "Mandou bem! Os errinhos vão pro seu feedback no final.", "Boa! Seu ouvido tá ficando afiado."];
  var CHEER1 = ["Passou! Treine de novo depois pra ganhar mais estrelas.", "Errar faz parte: é assim que o cérebro aprende. 💪", "Calma, ninguém nasce falando. Bora pra próxima!", "Essa foi difícil mesmo. O feedback no final mostra o caminho."];
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function stars(pct) { return pct >= 0.9 ? 3 : pct >= 0.6 ? 2 : 1; }
  function starText(n) { return ["", "⭐☆☆", "⭐⭐☆", "⭐⭐⭐"][n]; }
  // confete na vitória (canvas simples; respeita "reduzir movimento")
  function confetti() {
    if (reduce) return;
    var cv = el("canvas", { cls: "confetti" }); document.body.append(cv);
    var W = cv.width = innerWidth, H = cv.height = innerHeight, g = cv.getContext("2d"), cols = ["#FFD21F", "#7A2E3A", "#2E7D4F", "#C49A6C", "#ffffff"];
    var ps = []; for (var i = 0; i < 140; i++) ps.push({ x: Math.random() * W, y: -20 - Math.random() * H * 0.5, vx: (Math.random() - 0.5) * 3, vy: 2 + Math.random() * 4, r: 4 + Math.random() * 5, a: Math.random() * 6, c: cols[i % cols.length] });
    var t0 = performance.now();
    (function draw(t) {
      g.clearRect(0, 0, W, H);
      ps.forEach(function (p) { p.x += p.vx; p.y += p.vy; p.a += 0.1; g.save(); g.translate(p.x, p.y); g.rotate(p.a); g.fillStyle = p.c; g.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); g.restore(); });
      if (t - t0 < 3200) requestAnimationFrame(draw); else cv.remove();
    })(t0);
  }
  function upload(stepKey, blob, text, secs) {
    if (!att || !blob || !blob.size) return;
    var url = "/api/licao/attempt/" + att.id + "/recording?token=" + encodeURIComponent(att.token) + "&step=" + encodeURIComponent(stepKey) + "&seconds=" + secs;
    var send = function (n) {
      fetch(url, { method: "POST", headers: { "Content-Type": blob.type || "audio/webm", "X-Transcript": encodeURIComponent(text.slice(0, 1500)) }, body: blob })
        .then(function (r) { if (r.status >= 500) throw 0; }).catch(function () { if (n > 0) setTimeout(function () { send(n - 1); }, n === 2 ? 3000 : 10000); });
    };
    send(2);
  }

  /* Caixa de gravação de uma parte: botão, tempo, texto ao vivo, mensagens. */
  function recBox(step, opt) {
    var btn = el("button", { cls: "rec", text: "🎙️ Gravar" });
    var tm = el("span", { text: "0 s" }), wc = el("span", { text: "0 palavras" });
    var lvl = el("i"), level = el("div", { cls: "level", hidden: "" }, el("span", { text: "🎙️" }), el("div", { cls: "level-bar" }, lvl));
    var meterStop = null;
    function startMeter(stream) {
      if (!stream || !(window.AudioContext || window.webkitAudioContext)) return;
      try {
        var ctx = new (window.AudioContext || window.webkitAudioContext)(), an = ctx.createAnalyser(), buf = new Uint8Array(256), raf = 0;
        an.fftSize = 512; ctx.createMediaStreamSource(stream).connect(an);
        (function tick() {
          an.getByteTimeDomainData(buf);
          var peak = 0; for (var i = 0; i < buf.length; i++) peak = Math.max(peak, Math.abs(buf[i] - 128));
          lvl.style.width = Math.min(100, Math.round(peak / 128 * 260)) + "%";
          raf = requestAnimationFrame(tick);
        })();
        level.hidden = false;
        meterStop = function () { cancelAnimationFrame(raf); try { ctx.close(); } catch (e) {} level.hidden = true; lvl.style.width = "0"; };
      } catch (e) {}
    }
    var tr = el("div", { cls: "transcript", html: '<span class="small">O que você falar aparece aqui.</span>' });
    var msg = el("p", { cls: "msg", hidden: "" });
    var box = el("div", { style: "display:flex;flex-direction:column;gap:10px" },
      el("p", { cls: "hint", text: "🎙️ Toque em Gravar e espere a contagem 3, 2, 1. Quando aparecer 🔴 FALE AGORA, fale em inglês, perto do celular, e toque de novo para parar." }),
      btn, level, el("div", { cls: "meter" }, tm, wc), tr, msg);
    var sess = null, timer = null, taken = "", tries = 0, valve = null;
    function offerValve() {
      if (valve || step.done) return;
      valve = el("button", { cls: "ghost", text: "Não estou conseguindo — liberar e o professor ouve meu áudio", onclick: function () {
        if (step.done) return;
        step.sec.querySelector(".rec").disabled = true; valve.remove();
        say(msg, "🔓 Liberado. Seu professor vai ouvir o que você gravou.", true);
        finish(step, 1, { transcript: taken, forced: true, wrongs: [] });
      } });
      box.append(valve);
    }
    if (!SR) box.insertBefore(el("p", { cls: "warn", text: canRecord ? "Seu navegador grava, mas não mostra o que você fala. Para a correção na hora, abra este link no Chrome (Android) ou no Safari (iPhone)." : "Seu navegador não grava áudio. Abra este link no Chrome (Android) ou no Safari (iPhone)." }), btn);
    if (!SR && !canRecord) {
      box.append(el("button", { cls: "ghost", text: "Não consigo gravar — pular esta parte", onclick: function () { finish(step, 0, { skipped: true }); } }));
    }
    function render(t) {
      tr.textContent = t || "…";
      wc.textContent = words(t).length + " palavras" + (opt.minWords ? " · mínimo " + opt.minWords : "");
      if (opt.live) opt.live(t);
    }
    function ok(t, secs) { return SR ? opt.check(t) : secs >= (opt.minSeconds || 20); }
    function done(t, secs) {
      step.sec.querySelector(".rec").disabled = true;
      btn.textContent = "✅ Áudio enviado"; btn.classList.remove("live");
      var r = opt.score(t, secs, !SR);
      say(msg, r.msg, true);
      finish(step, r.pts, r.data);
    }
    btn.addEventListener("click", function () {
      if (step.done) return;
      if (sess) { btn.disabled = true; sess.stop(); return; }
      if (busy) return;
      var live = false;
      sess = new Session({
        onText: function (t) {
          render(t);
          // só encerra sozinho depois da contagem (o que falou antes ainda conta no texto)
          if (live && opt.unlockLive && !isPortuguese(t) && ok(t, sess.seconds())) { btn.disabled = true; sess.stop(); }
        },
        onStop: function (t, secs, blob) {
          clearInterval(timer); busy = null; sess = null; btn.disabled = false; btn.classList.remove("live");
          if (meterStop) { meterStop(); meterStop = null; }
          if (SR && !t.trim()) {
            upload(step.key, blob, "", secs);
            btn.textContent = "🎙️ Gravar de novo";
            say(msg, secs < 2 ? "Muito rápido! Toque em Gravar, espere a contagem e o 🔴 FALE AGORA, fale, e só depois toque para parar." : "Seu áudio foi gravado, mas a página não entendeu as palavras. Fale um pouco mais alto e devagar, com o celular perto da boca, e grave de novo.");
            if (secs >= 3) { tries++; if (tries >= 3) offerValve(); }
            return;
          }
          if (SR && isPortuguese(t)) {
            render(taken);
            btn.textContent = "🎙️ Gravar de novo em inglês";
            say(msg, "Parece que você falou em português 🙂 Essa gravação não conta. Fale em inglês, mesmo que errando!");
            return;
          }
          taken = (taken + " " + t).trim(); render(taken);
          upload(step.key, blob, t, secs);
          if (ok(taken, secs)) done(taken, secs);
          else {
            btn.textContent = "🎙️ Continuar gravando"; say(msg, SR ? opt.hint(taken) : "Grave um pouco mais (pelo menos " + (opt.minSeconds || 20) + " segundos).");
            if (secs >= 3) tries++;
            if (tries >= 3) offerValve();
          }
        },
      });
      busy = sess; say(msg, "");
      btn.disabled = true; btn.textContent = "⏳ Ligando o microfone…";
      var started = sess.start(), mine = sess;
      Promise.all([started, countdown(btn)]).then(function (r) {
        if (sess !== mine) return; // já terminou
        live = true;
        var stream = r[0];
        btn.disabled = false;
        startMeter(stream);
        btn.textContent = "🔴 FALE AGORA! (toque para parar)"; btn.classList.add("live"); SFX.go();
        if (navigator.vibrate) { try { navigator.vibrate(80); } catch (e) {} }
        var base = parseInt(tm.textContent, 10) || 0, t0 = Date.now();
        timer = setInterval(function () { tm.textContent = base + Math.round((Date.now() - t0) / 1000) + " s"; }, 500);
      }).catch(function () {
        btn._cancel = true; busy = null; sess = null; btn.disabled = false; btn.textContent = "🎙️ Gravar";
        say(msg, "O microfone está bloqueado. Toque no cadeado ao lado do endereço e libere o microfone.");
      });
    });
    return box;
  }

  // ---------- gap exercises ----------
  function gapHtml(text) {
    return rich(text).replace(/\[\[([^\]]+)\]\]/g, function (_, a) { return '<input class="gap" autocomplete="off" autocapitalize="off" spellcheck="false" data-a="' + esc(a) + '">'; });
  }
  // Pergunta de entendimento com alternativas: toca numa, ela fica marcada.
  function mcqEl(item) {
    var li = el("li", { cls: "mcq", "data-answer": String(item.answer) }, el("span", { cls: "mcq-q", html: rich(item.q) }));
    var opts = el("div", { cls: "mcq-opts" });
    // ordem embaralhada (a certa não fica sempre em primeiro); data-k guarda a original
    var order = item.options.map(function (_, k) { return k; });
    for (var i = order.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = order[i]; order[i] = order[j]; order[j] = t; }
    order.forEach(function (k) {
      var o = item.options[k];
      opts.append(el("button", { type: "button", cls: "mcq-opt", "data-k": String(k), text: o, onclick: function (e) {
        if (li.classList.contains("checked")) return;
        [].forEach.call(opts.children, function (b) { b.classList.remove("sel"); });
        e.currentTarget.classList.add("sel");
      } }));
    });
    li.append(opts);
    return li;
  }
  // corrige as alternativas; devolve {ok, total, wrongs} ou null se falta responder
  function mcqCheck(box, label) {
    var qs = [].slice.call(box.querySelectorAll("li.mcq"));
    if (qs.some(function (q) { return !q.querySelector(".mcq-opt.sel"); })) return null;
    var ok = 0, ws = [];
    qs.forEach(function (q) {
      var sel = q.querySelector(".mcq-opt.sel"), right = q.querySelector('.mcq-opt[data-k="' + q.getAttribute("data-answer") + '"]');
      q.classList.add("checked");
      if (sel === right) { ok++; sel.classList.add("ok"); hit(true); }
      else {
        hit(false);
        sel.classList.add("bad"); right.classList.add("ok");
        ws.push({ said: label + ": marcou \"" + sel.textContent + "\"", right: right.textContent, why: q.querySelector(".mcq-q").textContent });
      }
    });
    return { ok: ok, total: qs.length, wrongs: ws };
  }
  // ---------- perguntas de entendimento, por nível ----------
  // A1: guiado — fala a resposta em voz alta e só depois vê as alternativas (sem chute).
  // A2: escreve uma frase curta com um começo de ajuda. B1/B2: escreve livre.
  // Na escrita, acerta se usar as palavras-chave (keys); depois vê a resposta-modelo.
  var LEVEL = String(C.level || "A2").toUpperCase();
  function questionEl(item) {
    if (LEVEL !== "A1" && item.keys && item.keys.length) return openEl(item);
    var li = mcqEl(item);
    if (LEVEL === "A1") {
      var opts = li.querySelector(".mcq-opts"); opts.hidden = true;
      var say1 = el("p", { cls: "hint", text: "🗣️ Primeiro tente responder falando, em voz alta. Depois toque para ver as opções." });
      var reveal = el("button", { type: "button", cls: "ghost reveal", text: "Já falei → ver as opções", onclick: function () { opts.hidden = false; reveal.remove(); say1.remove(); } });
      li.insertBefore(say1, opts); li.insertBefore(reveal, opts);
    }
    return li;
  }
  function openEl(item) {
    var big = LEVEL === "B1" || LEVEL === "B2";
    var attrs = { cls: "open-in", autocomplete: "off", spellcheck: "false", placeholder: big ? "Escreva com as suas palavras, em inglês…" : (item.starter || "Escreva em inglês…") };
    if (big) attrs.rows = "3"; else attrs.type = "text";
    var input = el(big ? "textarea" : "input", attrs);
    if (!big && item.starter) input.value = item.starter + " ";
    var li = el("li", { cls: "open" }, el("span", { cls: "mcq-q", html: rich(item.q) }), input);
    li._item = item;
    return li;
  }
  function answered(q) {
    if (q.classList.contains("mcq")) return !!q.querySelector(".mcq-opt.sel");
    var v = q.querySelector(".open-in").value.trim(), st = (q._item.starter || "").trim();
    return words(v).length >= words(st).length + 2;
  }
  function openCheck(q, label) {
    var it = q._item, inp = q.querySelector(".open-in"), n = norm(inp.value);
    var hits = it.keys.filter(function (g) { return g.some(function (k) { return n.indexOf(norm(k)) > -1; }); }).length;
    var good = hits >= Math.ceil(it.keys.length * 0.6);
    inp.disabled = true; inp.classList.add(good ? "ok" : "bad"); q.classList.add("checked");
    q.append(el("div", { cls: "model-ans " + (good ? "good" : "bad") },
      el("b", { text: good ? "✅ Isso! " : "🔁 Quase. " }), "Uma resposta possível: ", el("i", { text: it.model || it.options[it.answer] })));
    return good ? null : { said: label + ": \"" + inp.value.trim() + "\"", right: it.model || it.options[it.answer], why: it.q };
  }
  // corrige alternativas e respostas escritas; null se ainda falta responder
  function qCheck(box, label) {
    var qs = [].slice.call(box.querySelectorAll("li.mcq, li.open"));
    if (qs.some(function (q) { return !answered(q); })) return null;
    var ok = 0, ws = [];
    var m = mcqCheck(box, label) || { ok: 0, total: 0, wrongs: [] };
    ok += m.ok; ws = ws.concat(m.wrongs);
    qs.filter(function (q) { return q.classList.contains("open"); }).forEach(function (q) { var w = openCheck(q, label); if (w) { ws.push(w); hit(false); } else { ok++; hit(true); } });
    return { ok: ok, total: qs.length, wrongs: ws };
  }
  function unanswered(box) { return [].some.call(box.querySelectorAll("li.mcq, li.open"), function (q) { return !answered(q); }); }

  // Enter numa lacuna: vai pra próxima (na última, confere)
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Enter" || !e.target.classList || !e.target.classList.contains("gap")) return;
    e.preventDefault();
    var sec = e.target.closest(".step"), all = [].slice.call(sec.querySelectorAll("input.gap:not([disabled])")), i = all.indexOf(e.target);
    if (all[i + 1]) all[i + 1].focus(); else { e.target.blur(); }
  });
  // 💡 dica: mostra a primeira letra das lacunas vazias; lacuna com dica vale meio ponto
  function hintBtn(box) {
    var b = el("button", { cls: "ghost hint-btn", type: "button", text: "💡 Dica: ver a primeira letra (vale meio ponto)", onclick: function () {
      [].forEach.call(box.querySelectorAll("input.gap"), function (i) {
        if (i.value.trim() || i.disabled) return;
        var a = i.getAttribute("data-a").split("|")[0].trim();
        i.placeholder = a.charAt(0) + "…" + (a.indexOf(" ") > 0 ? " (" + a.split(" ").length + " palavras)" : ""); i.setAttribute("data-hint", "1");
      });
      b.disabled = true; b.textContent = "💡 Dica na tela: a primeira letra está nas lacunas vazias";
    } });
    return b;
  }
  function gapCheck(step, box, btn, label, extra) {
    var inputs = [].slice.call(box.querySelectorAll("input.gap"));
    var hasMcq = box.querySelector("li.mcq, li.open");
    if (hasMcq && unanswered(box)) {
      btn.textContent = "Responda todas antes de conferir"; setTimeout(function () { btn.textContent = "Conferir"; }, 1800); return;
    }
    if (inputs.some(function (i) { return !i.value.trim(); })) {
      btn.textContent = "Preencha tudo antes de conferir"; setTimeout(function () { btn.textContent = "Conferir"; }, 1800); return;
    }
    var ok = 0, ws = [], answers = [], hinted = 0, right = 0;
    var hb = box.parentNode && box.parentNode.querySelector(".hint-btn"); if (hb) hb.remove();
    inputs.forEach(function (i) {
      var opts = i.getAttribute("data-a").split("|").map(function (x) { return x.trim(); });
      var g = opts.map(norm).indexOf(norm(i.value)) > -1;
      answers.push(i.value.trim());
      i.classList.add(g ? "ok" : "bad"); i.disabled = true; hit(g);
      if (g) { right++; if (i.getAttribute("data-hint")) { ok += 0.5; hinted++; } else ok++; }
      else {
        i.after(el("span", { cls: "fix", text: " ✓ " + opts[0] + " " }, ear(opts[0])));
        var ctx = (i.closest("li,p") || box).textContent.replace(/✓.*$/, "").replace(/\s+/g, " ").trim().slice(0, 80);
        ws.push({ said: "escreveu \"" + i.value.trim() + "\"", right: opts[0], why: label + ": " + ctx });
      }
    });
    var total = inputs.length;
    if (hasMcq) { var m = qCheck(box, label); ok += m.ok; right += m.ok; total += m.total; ws = ws.concat(m.wrongs); }
    btn.disabled = true; btn.textContent = "Você acertou " + right + " de " + total + (hinted ? " (" + hinted + " com dica)" : "") + (extra || "");
    var gd = ok === total ? [label + ": " + total + " de " + total + ". 🎉"] : [];
    var pts = Math.round(ok / total * step.max);
    if (hinted && pts >= step.max) pts = step.max - 1; // dica tira o "perfeito"
    finish(step, pts, { answers: answers, wrongs: ws, good: gd, hints: hinted });
  }

  function ONCE() { return el("p", { cls: "hint", text: "💡 Revise antes de conferir: cada parte você confere uma vez só." }); }

  // ---------- partes ----------
  var PHASE = { review: "falar", dictation: "ouvir", scene: "ouvir", gossip: "fofoca", shadowing: "fofoca", retell: "fofoca", story: "fofoca", read: "fofoca", writing: "escrever", realtime: "falar" };
  function section(step, phase) {
    var ptsEl = el("span", { cls: "pts" });
    var sec = el("section", { cls: "step locked", "data-phase": PHASE[step.key] || "" },
      el("h2", null, el("span", { cls: "n", text: steps.length + 1 }), step.title, el("span", { cls: "time", text: step.minutes + " min" }), ptsEl));
    step.sec = sec; step.ptsEl = ptsEl;
    var n = steps.length;
    if (n) sec.append(el("p", { cls: "lock-note", text: "🔒 Abre quando você terminar a fase " + n + "." }));
    if (phase) app.append(el("div", { cls: "phase", "data-phase": PHASE[step.key] || "", text: phase }));
    app.append(sec);
    steps.push(step);
    return sec;
  }

  function buildReview() {
    var R = C.review, step = { key: "review", title: "Revisão relâmpago", minutes: 1, max: 3, skill: "falar" };
    var sec = section(step, "0. Lembra disso? 🧠");
    var chips = el("div", { cls: "chips", hidden: "" });
    sec.append(el("p", { html: "Frases que você errou nas <b>últimas aulas</b>. Leia em português e <b>fale em inglês</b>, todas de uma vez:" }),
      el.apply(null, ["ol", { cls: "items" }].concat(R.items.map(function (t) { return el("li", { html: rich(t) }); }))),
      recBox(step, {
        minWords: R.minWords, minSeconds: 8,
        check: function (t) { return words(t).length >= R.minWords && keysHit(t, R.keys) >= Math.ceil(R.keys.length / 2); },
        hint: function () { return "Fale todas as frases, em inglês."; },
        score: function (t, s, noText) {
          if (noText) return { pts: 2, msg: "Enviado!", data: { transcript: "" } };
          var g = keysCheck(t, R.keys, chips), ms = findMistakes(t, R.mistakes);
          var pts = Math.round(g.filter(Boolean).length / R.keys.length * 3);
          return { pts: pts, msg: "Enviado! " + pts + "/3 pts", data: { transcript: t, wrongs: ms, good: ms.length || pts < 3 ? [] : ["Revisão: lembrou de tudo das aulas passadas. 🎉"] } };
        },
      }), chips);
  }

  function buildDictation() {
    var step = { key: "dictation", title: "Ditado", minutes: 4, max: 5, skill: "ouvir" };
    var sec = section(step, "1. Ouça 🎧");
    var ta = el("textarea", { placeholder: "Escreva aqui o que você ouviu…" });
    var msg = el("p", { cls: "msg", hidden: "" }), out = el("div", { cls: "readtext", hidden: "" });
    var n = C.dictation.text.split(/[.!?]+\s/).length;
    var btn = el("button", { cls: "btn", text: "Conferir", onclick: function () {
      if (words(ta.value).length < Math.min(12, words(C.dictation.text).length / 2)) { say(msg, "Escreva todas as frases antes de conferir (pode ouvir de novo)."); return; }
      var r = paint(out, C.dictation.text, ta.value); out.hidden = false;
      var pts = Math.round(r.pct * 5);
      if (r.miss.length) {
        var tr = el("div", { cls: "say" }, el("span", { cls: "small", text: "Toque e ouça o que escapou:" }));
        r.miss.filter(function (w, k, a) { return w && a.indexOf(w) === k; }).slice(0, 8).forEach(function (w) { tr.append(ear(w, "🔊 " + w)); });
        out.after(tr);
      }
      say(msg, "Você pegou " + Math.round(r.pct * 100) + "% das palavras. Em vermelho: o que faltou ou ficou diferente.", pts >= 3);
      btn.disabled = true; ta.disabled = true;
      finish(step, pts, {
        answer: ta.value.trim(),
        good: r.pct >= 0.85 ? ["Ditado: " + Math.round(r.pct * 100) + "% das palavras, mesmo com as frases emendadas! 🎧"] : [],
        wrongs: r.pct < 0.85 ? [{ said: "Ditado: faltou " + r.miss.slice(0, 5).join(", "), right: "Ouça de novo só esses pedaços", why: "Quando as frases emendam, as palavras pequenas somem. Pause frase por frase." }] : [],
      });
    } });
    sec.append(el("p", { cls: "small", text: n + " frases seguidas, no ritmo normal. Ouça quantas vezes quiser, pause quando precisar, e escreva tudo." }),
      (function () { var a = el("audio", { controls: "", preload: "none", src: FILE(C.dictation.audio) }); return el("div", { cls: "a-wrap" }, a, audioTools(a)); })(), ta, ONCE(), btn, msg, out);
  }

  function buildGossip() {
    var GQ = C.gossip.questions || [];
    var step = { key: "gossip", title: "Fofoca — só ouvir", minutes: 2 + Math.ceil(GQ.length / 2), max: 2 + GQ.length, skill: "ouvir" };
    var sec = section(step, "2. A fofoca 🕵️");
    var qbox = GQ.length ? el.apply(null, ["ol", { cls: "items" }].concat(GQ.map(questionEl))) : null;
    var inp = el("input", { type: "text", placeholder: "Palavra secreta", autocomplete: "off", autocapitalize: "off", enterkeyhint: "done", onkeydown: function (e) { if (e.key === "Enter") { e.preventDefault(); btn.click(); } } });
    var msg = el("p", { cls: "msg", hidden: "" }), tries = 0;
    var btn = el("button", { cls: "btn", text: GQ.length ? "Conferir" : "Conferir palavra", onclick: function () {
      var v = norm(inp.value);
      if (v !== norm(C.gossip.secret)) { tries++; say(msg, v ? "Não é essa. Ouça o final do áudio de novo 🎧" : "Escreva a palavra secreta do fim do áudio."); return; }
      if (qbox && unanswered(qbox)) {
        say(msg, "Palavra certa! 🔑 Agora responda as perguntas sobre a história.", true); return;
      }
      var m = qbox ? qCheck(qbox, "Fofoca") : { ok: 0, total: 0, wrongs: [] };
      say(msg, m.total ? "✅ Palavra secreta certa · você entendeu " + m.ok + " de " + m.total + " sobre a história." : "✅ Isso!", true);
      btn.disabled = true; inp.disabled = true;
      finish(step, (tries ? 1 : 2) + m.ok, { wrongs: m.wrongs, good: m.total && m.ok === m.total ? ["Fofoca: entendeu a história toda só de ouvido! 👂"] : [] });
    } });
    sec.append(el("p", { cls: "small", html: "Daqui até a leitura em voz alta, <b>tudo é sobre esta fofoca</b>: ouvir, imitar, recontar, completar e ler." }),
      el("p", { html: "🚫 <b>Não escreva a história.</b> Ouça 2 vezes, sem ler nada. 🔑 No fim tem uma <b>palavra secreta</b>." }),
      (function () { var a = el("audio", { controls: "", preload: "none", src: FILE(C.gossip.audio) }); return el("div", { cls: "a-wrap" }, a, audioTools(a)); })(),
      qbox ? el("p", { cls: "small", html: LEVEL === "A1" ? "Responda <b>sem ler nada</b>, só com o que você ouviu:" : "Responda <b>com as suas palavras, em inglês</b>, só com o que você ouviu:" }) : "", qbox || "",
      el("p", { cls: "small", text: "🔑 Palavra secreta:" }), inp, btn, msg);
  }

  var ytReady = null;
  function loadYT() {
    if (ytReady) return ytReady;
    ytReady = new Promise(function (resolve) {
      window.onYouTubeIframeAPIReady = function () { resolve(window.YT); };
      document.head.append(el("script", { src: "https://www.youtube.com/iframe_api" }));
    });
    return ytReady;
  }
  function buildScene() {
    var S = C.scene, step = { key: "scene", title: "🎬 Cena real — tela coberta", minutes: 4, max: Math.max(3, S.questions.length), skill: "ouvir" };
    var sec = section(step);
    var holder = el("div", { id: "ytp" });
    var cover = el("div", { cls: "cover" }, el("div", { cls: "cover-in" }, el("span", { cls: "cover-play", text: "🎧" }), el("span", { text: "Tela coberta — só ouvido" })));
    var wrap = el("div", { cls: "yt-wrap" }, holder, cover);
    var player = null, slow = false;
    function withPlayer(fn) {
      if (player) { fn(player); return; }
      loadYT().then(function (YT) {
        player = new YT.Player(holder, {
          videoId: S.youtubeId, playerVars: { start: S.start, end: S.end, controls: 0, disablekb: 1, rel: 0, playsinline: 1, modestbranding: 1 },
          events: { onReady: function () { try { player.unMute(); player.setVolume(100); } catch (e) {} fn(player); } },
        });
      });
    }
    var len = Math.max(1, S.end - S.start);
    var fill = el("i"), now = el("span", { text: "0:00" }), state = el("span", { cls: "yt-state", text: "Toque em ▶ Tocar" });
    var track = el("div", { cls: "yt-track", title: "Toque para pular para esse ponto" }, fill);
    function mmss(t) { t = Math.max(0, Math.round(t)); return Math.floor(t / 60) + ":" + String(t % 60).padStart(2, "0"); }
    var timeline = el("div", { cls: "yt-time" }, el("div", { cls: "yt-labels" }, state, el("span", null, now, " / " + mmss(len))), track);
    track.addEventListener("click", function (e) {
      var r = track.getBoundingClientRect(), f = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      withPlayer(function (p) { p.seekTo(S.start + f * len, true); p.playVideo(); });
    });
    setInterval(function () {
      if (!player || !player.getCurrentTime) return;
      var cur = player.getCurrentTime() - S.start, f = Math.min(1, Math.max(0, cur / len));
      fill.style.width = (f * 100) + "%"; now.textContent = mmss(Math.min(len, Math.max(0, cur)));
      var st = player.getPlayerState ? player.getPlayerState() : -1;
      state.textContent = st === 1 ? "🔊 Tocando…" : st === 3 ? "⏳ Carregando…" : f >= 0.98 || st === 0 ? "✅ Terminou — toque em ↺ pra ouvir de novo" : "⏸ Pausado";
    }, 250);
    var ctrl = el("div", { cls: "yt-ctrl" },
      el("button", { text: "▶ Tocar", onclick: function () { withPlayer(function (p) { p.playVideo(); }); } }),
      el("button", { text: "⏸ Pausar", onclick: function () { withPlayer(function (p) { p.pauseVideo(); }); } }),
      el("button", { text: "↺ Do começo", onclick: function () { withPlayer(function (p) { p.seekTo(S.start, true); p.playVideo(); }); } }),
      el("button", { text: "🐢 0.75×", onclick: function (e) { slow = !slow; e.target.textContent = slow ? "🐇 1×" : "🐢 0.75×"; withPlayer(function (p) { p.setPlaybackRate(slow ? 0.75 : 1); }); } }));
    var box = el.apply(null, ["ol", { cls: "items" }].concat(S.questions.map(function (q) { return typeof q === "string" ? el("li", { html: gapHtml(q) }) : questionEl(q); })));
    // depois de conferir, a tela NÃO pula pra próxima parte: o aluno precisa ver
    // o botão de assistir com imagem; só segue quando tocar em "Seguir".
    step.holdScroll = true;
    var nextIdx = function () { return steps.indexOf(step) + 1; };
    var goOn = el("button", { cls: "btn", hidden: "", text: "Pronto, vamos para a fofoca →", onclick: function () {
      withPlayer(function (p) { p.pauseVideo(); });
      var nx = steps[nextIdx()]; if (nx) scrollTo(nx.sec); else if (concludeSec) scrollTo(concludeSec);
    } });
    var show = el("button", { cls: "btn yt watch-now", hidden: "", text: "👀 Agora toque aqui e assista COM imagem", onclick: function () {
      cover.remove(); show.hidden = true; goOn.hidden = false;
      withPlayer(function (p) { p.seekTo(S.start, true); p.playVideo(); });
      scrollTo(wrap);
    } });
    var btn = el("button", { cls: "btn", text: "Conferir", onclick: function () {
      gapCheck(step, box, btn, "Cena real", " só de ouvido 👂");
      if (step.done) { show.hidden = false; scrollTo(show); }
    } });
    sec.append(el("p", { html: rich(S.intro) + " Primeiro <b>só ouça</b>: a imagem fica escondida. Ouça 3 vezes (pode usar 0.75× na 2ª)." }),
      wrap, timeline, ctrl, el("p", { cls: "small", html: "Responda só com o que você <b>ouviu</b>:" }), box, box.querySelector("input.gap") ? hintBtn(box) : "", ONCE(), btn, show, goOn);
  }

  function buildShadowing() {
    var SH = C.shadowing, step = { key: "shadowing", title: "Shadowing — ouça e imite", minutes: 3, max: SH.length, skill: "falar" };
    var sec = section(step);
    var si = 0, res = [], miss = [], audio = new Audio(), hl = null, sess = null;
    var count = el("span"), dots = el("div", { cls: "sh-dots" }), text = el("div", { cls: "sh-text" }), pt = el("div", { cls: "sh-pt" });
    var msg = el("p", { cls: "msg", hidden: "" });
    var play = el("button", { cls: "btn", text: "🔊 Ouvir" }), slowB = el("button", { cls: "soft", text: "🐢 Devagar" });
    var rec = el("button", { cls: "rec sh-rec", text: "🎤 Agora você" }), next = el("button", { cls: "btn", hidden: "", text: "Próxima frase →" });
    SH.forEach(function () { dots.append(el("span")); });
    function render() {
      count.textContent = "Frase " + (si + 1) + " de " + SH.length; pt.textContent = SH[si].pt ? "🇧🇷 " + SH[si].pt : "";
      text.replaceChildren(); SH[si].en.split(" ").forEach(function (w, i) { if (i) text.append(" "); text.append(el("span", { text: w })); });
      [].forEach.call(dots.children, function (d, i) { d.className = i === si ? "cur" : res[i] === undefined ? "" : res[i] >= 0.95 ? "ok" : "meh"; });
      rec.disabled = false; rec.textContent = "🎤 Agora você"; next.hidden = true; say(msg, "");
    }
    function playIt(isSlow) {
      var spans = [].slice.call(text.children), lens = spans.map(function (s) { return s.textContent.length + 1; });
      var tot = lens.reduce(function (a, b) { return a + b; }, 0);
      audio.src = FILE(isSlow ? SH[si].slow : SH[si].audio); audio.play().catch(function () {});
      clearInterval(hl);
      hl = setInterval(function () {
        if (!audio.duration) return;
        var f = audio.currentTime / audio.duration, acc = 0;
        spans.forEach(function (s, i) { acc += lens[i] / tot; s.classList.toggle("lit", !audio.paused && f >= acc - lens[i] / tot && f < acc); });
        if (audio.ended) { clearInterval(hl); spans.forEach(function (s) { s.classList.remove("lit"); }); }
      }, 50);
    }
    function judge(said, final) {
      if (final && SR && isPortuguese(said)) {
        rec.textContent = "🎤 Agora você"; rec.classList.remove("live");
        say(msg, "Parece que você falou em português 🙂 Repita a frase em inglês.");
        return;
      }
      var r = paint(text, SH[si].en, said);
      if (r.pct >= 0.999 && sess && !final) { sess.stop(); return; }
      if (!final) return;
      res[si] = SH && said ? r.pct : (SR ? 0 : 1);
      if (!SR) { res[si] = 1; paint(text, SH[si].en, SH[si].en); }
      miss = miss.concat(SR ? r.miss : []);
      var good = res[si] >= 0.95;
      rec.textContent = good ? "✅ Muito bom!" : "🔁 Tentar de novo"; rec.classList.remove("live");
      say(msg, !SR ? "Enviado! (Seu navegador não mostra o texto da fala.)" : good ? "A página entendeu " + Math.round(r.pct * 100) + "% 👏" : "A página entendeu " + Math.round(r.pct * 100) + "%. Treine as palavras em vermelho e tente de novo (ou siga em frente).", good);
      dots.children[si].className = good ? "ok" : "meh";
      next.hidden = false; next.textContent = si < SH.length - 1 ? "Próxima frase →" : "Terminar o shadowing ✅";
    }
    play.onclick = function () { playIt(false); }; slowB.onclick = function () { playIt(true); };
    rec.onclick = function () {
      if (step.done) return;
      if (rec.textContent.indexOf("🔁") === 0) { render(); return; }
      if (sess) { rec.disabled = true; sess.stop(); return; }
      if (busy) return;
      var live = false, mine;
      sess = new Session({
        onText: function (t) { if (live) judge(t, false); },
        onStop: function (t, secs, blob) {
          busy = null; sess = null; rec.disabled = false; upload("shadowing-" + (si + 1), blob, t, secs);
          if (SR && !t.trim()) {
            rec.textContent = "🎙️ Gravar de novo"; rec.classList.remove("live");
            say(msg, secs < 2 ? "Muito rápido! Espere a contagem e o 🔴 FALE AGORA, e só depois fale." : "Seu áudio foi gravado, mas a página não entendeu as palavras. Fale um pouco mais alto e devagar, perto do celular.");
            next.hidden = false; next.textContent = si < SH.length - 1 ? "Pular esta frase →" : "Terminar o shadowing ✅";
            return;
          }
          judge(t, true);
        },
      });
      busy = sess; rec.disabled = true; rec.textContent = "⏳ Ligando o microfone…";
      mine = sess;
      Promise.all([sess.start(), countdown(rec)]).then(function () { if (sess !== mine) return; live = true; rec.disabled = false; rec.textContent = "🔴 FALE AGORA! (toque para parar)"; rec.classList.add("live"); SFX.go(); if (navigator.vibrate) { try { navigator.vibrate(80); } catch (e) {} } })
        .catch(function () { rec._cancel = true; busy = null; sess = null; rec.disabled = false; rec.textContent = "🎙️ Gravar"; say(msg, "O microfone está bloqueado. Toque no cadeado ao lado do endereço e libere o microfone."); });
    };
    next.onclick = function () {
      if (si < SH.length - 1) { si++; render(); playIt(false); return; }
      var pts = res.filter(function (x) { return x >= 0.95; }).length;
      var list = SH.map(function (s, i) { return { en: s.en, pct: Math.round((res[i] || 0) * 100) }; });
      finish(step, pts, { sentences: list, missed: miss, good: pts === SH.length ? ["Shadowing: todas as frases com a pronúncia entendida! 🗣️"] : [] });
      next.hidden = true; rec.disabled = true;
    };
    sec.append(el("div", { cls: "sh-how", html: "<span><b>1.</b> 🔊 Ouça a frase</span><span><b>2.</b> 🎤 Repita igualzinho, no mesmo ritmo</span><span><b>3.</b> ✅ Verde = entendeu você</span>" }),
      el("div", { cls: "sh" }, el("div", { cls: "sh-count" }, count, dots), text, pt, el("div", { cls: "sh-btns" }, play, slowB, rec), msg, next));
    if (!SR && !canRecord) sec.append(el("button", { cls: "ghost", text: "Não consigo gravar — pular esta parte", onclick: function () { finish(step, 0, { skipped: true }); } }));
    render();
  }

  function speakingStep(key, title, minutes, max, skill, phase, intro, R, scoreFn) {
    var step = { key: key, title: title, minutes: minutes, max: max, skill: skill };
    var sec = section(step, phase);
    sec.append.apply(sec, intro);
    sec.append(recBox(step, R));
    return { step: step, sec: sec };
  }

  function buildRetell() {
    var R = C.retell, secret = norm(C.gossip.secret);
    speakingStep("retell", "Reconte a fofoca", 2, 5, "falar", null,
      [el("p", { text: "Aperte o botão e fale, sem pressa:" }), el.apply(null, ["ul", { cls: "q" }].concat(R.prompts.map(function (p) { return el("li", { html: rich(p) }); })))],
      {
        minWords: R.minWords, minSeconds: 30, unlockLive: true,
        check: function (t) {
          var sw = storyWords(), n = words(t), hits = sw.filter(function (w) { return n.indexOf(w) > -1; }).length;
          return n.length >= R.minWords && norm(t).indexOf(secret) > -1 && hits >= Math.min(LEVEL === "A1" ? 2 : 3, sw.length);
        },
        hint: function (t) {
          if (words(t).length < R.minWords) return "Fale mais um pouco (faltam " + (R.minWords - words(t).length) + " palavras).";
          if (norm(t).indexOf(secret) < 0) return "Você não falou a palavra secreta 🔑.";
          var n = words(t), miss = storyWords().filter(function (w) { return n.indexOf(w) < 0; }).slice(0, 6);
          return "Conte o que aconteceu NA FOFOCA, com as palavras dela. Tente usar: " + miss.join(", ") + ".";
        },
        score: function (t, s, noText) {
          if (noText) return { pts: 3, msg: "🔓 Liberado! Seu professor vai ouvir o áudio.", data: { transcript: "" } };
          var used = ["would", "wouldn't", "didn't", "were", "had"].filter(function (w) { return words(t).indexOf(w) > -1; }).length;
          return { pts: Math.min(5, 2 + used), msg: "🔓 Liberado! A leitura e a escrita abriram.", data: { transcript: t, wrongs: findMistakes(t, R.mistakes) } };
        },
      });
  }

  function buildStory() {
    var S = C.story, step = { key: "story", title: "A fofoca escrita", minutes: 3, max: 10, skill: "ler" };
    var sec = section(step);
    var box = el.apply(null, ["div", { cls: "story" }].concat(S.paragraphs.map(function (p) { return el("p", { html: gapHtml(p) }); })));
    var voc = el("div", { cls: "vocab" }); S.vocab.forEach(function (v) { voc.append(el("b", { cls: "tap", text: "🔊 " + v[0], onclick: function () { speak(v[0]); } }), el("span", { text: v[1] })); });
    var btn = el("button", { cls: "btn", text: "Conferir", onclick: function () { gapCheck(step, box, btn, "Fofoca escrita"); } });
    sec.append(el("p", { cls: "small", html: rich(S.intro) }), S.vocab.length ? voc : "", box, box.querySelector("input.gap") ? hintBtn(box) : "", ONCE(), btn);
  }

  function buildRead() {
    var R = C.readAloud, rt = el("div", { cls: "readtext" });
    paint(rt, R.text, ""); [].forEach.call(rt.querySelectorAll(".miss"), function (s) { s.className = ""; });
    speakingStep("read", "🗣️ Leia em voz alta", 1, 5, "ler", null,
      [el("p", { html: "Leia este trecho em voz alta. As palavras que a página entender ficam <b>verdes</b>." }), rt],
      {
        minWords: R.minWords, minSeconds: 15,
        live: function (t) { if (SR) paint(rt, R.text, t); },
        check: function (t) { return words(t).length >= R.minWords; },
        hint: function () { return "Leia o trecho inteiro."; },
        score: function (t, s, noText) {
          if (noText) return { pts: 3, msg: "Enviado! Seu professor vai ouvir.", data: { transcript: "" } };
          var r = paint(rt, R.text, t), pts = Math.max(0, Math.min(5, Math.round((r.pct - 0.5) * 10)));
          return { pts: pts, msg: "Você leu " + Math.round(r.pct * 100) + "% certinho." + (r.miss.length ? " Treine: " + r.miss.slice(0, 6).join(", ") : ""), data: { transcript: t, missed: r.miss } };
        },
      });
  }

  function buildWriting() {
    var W = C.writing, step = { key: "writing", title: "Sua vez de escrever", minutes: 3, max: 5, skill: "escrever" };
    var sec = section(step, "3. Escreva ✍️");
    var ta = el("textarea", { placeholder: "Escreva aqui…" }), chips = el("div", { cls: "chips", hidden: "" }), msg = el("p", { cls: "msg", hidden: "" });
    var btn = el("button", { cls: "btn", text: "Enviar", onclick: function () {
      var t = ta.value;
      if (words(t).length < W.minWords) { say(msg, "Escreva um pouco mais (pelo menos " + W.minWords + " palavras)."); return; }
      var g = W.keys.length ? keysCheck(t, W.keys, chips) : [];
      ta.disabled = true; btn.disabled = true; btn.textContent = "✅ Enviado";
      var used = g.filter(Boolean).length;
      say(msg, "Recebido!" + (W.keys.length ? " Você usou " + used + " de " + W.keys.length + " estruturas." : "") + " Seu professor corrige o texto e a correção aparece aqui.", true);
      var pts = W.keys.length ? Math.min(5, 2 + Math.round(used / W.keys.length * 3)) : 4;
      finish(step, pts, { text: t.trim(), wrongs: findMistakes(t, W.mistakes) });
    } });
    sec.append(el("p", { html: rich(W.intro) }),
      el.apply(null, ["ol", { cls: "items" }].concat(W.prompts.map(function (p) { return el("li", { html: rich(p.q) + (p.hint ? ' <i class="small">' + esc(p.hint) + "</i>" : "") }); }))),
      ta, btn, chips, msg);
  }

  function buildRealtime() {
    var R = C.realtime, chips = el("div", { cls: "chips", hidden: "" }), model = el("div", { cls: "model", hidden: "", html: "<b>Uma resposta possível:</b> " + esc(R.model) });
    var s = speakingStep("realtime", "Real Time — fale em inglês", 2, 5, "falar", "4. Fale de novo 🎤",
      [R.vocab ? el("p", { cls: "small", text: "Mini vocabulário: " + R.vocab }) : "", el("p", { html: "Leia em português e <b>fale direto em inglês</b>, sem escrever:" }), el("p", { cls: "story", html: "<i>" + esc(R.pt) + "</i>" })],
      {
        minWords: R.minWords, minSeconds: 12,
        check: function (t) { return words(t).length >= R.minWords && keysHit(t, R.keys) >= Math.ceil(R.keys.length / 2); },
        hint: function () { return "Fale o texto todo em inglês."; },
        score: function (t, s2, noText) {
          model.hidden = false;
          if (noText) return { pts: 3, msg: "Enviado! Seu professor vai ouvir.", data: { transcript: "" } };
          var g = keysCheck(t, R.keys, chips);
          return { pts: Math.round(g.filter(Boolean).length / R.keys.length * 5), msg: "Você usou " + g.filter(Boolean).length + " de " + R.keys.length + " estruturas.", data: { transcript: t, wrongs: findMistakes(t, R.mistakes) } };
        },
      });
    s.sec.append(chips, model);
  }

  // ---------- concluir ----------
  var concludeSec;
  // ---------- ⚡ rodada bônus: 30 s, português → inglês, com as palavras da lição ----------
  function bonusPairs() {
    var v = (C.story.vocab || []).filter(function (x) { return x[0] && x[1]; }).map(function (x) { return { en: x[0], pt: x[1] }; });
    if (v.length < 3) v = v.concat((C.shadowing || []).filter(function (x) { return x.pt; }).map(function (x) { return { en: x.en, pt: x.pt }; }));
    return v.length >= 3 ? v : [];
  }
  function bonusCard() {
    var pairs = bonusPairs(); if (!pairs.length || VIEW) return null;
    var card = el("div", { cls: "bonus" }, el("b", { cls: "bonus-title", text: "⚡ Rodada bônus (opcional)" }),
      el("p", { cls: "small", text: "30 segundos! Aparece em português, toque na opção certa em inglês. Cada acerto vale 2 XP." }));
    if (saved.bonus && saved.bonus.data) { card.append(el("p", { cls: "msg good", text: "✅ Você fez: acertou " + saved.bonus.data.right + " de " + saved.bonus.data.total + "." })); return card; }
    var go = el("button", { cls: "btn", type: "button", text: "⚡ Começar" });
    card.append(go);
    go.onclick = function () {
      go.remove();
      var order = pairs.slice().sort(function () { return Math.random() - 0.5; }).slice(0, 8), qi = 0, right = 0, left = 30, over = false;
      var bar = el("i"), timeEl = el("span", { text: "30 s" }), q = el("div", { cls: "bonus-q" }), opts = el("div", { cls: "bonus-opts" });
      card.append(el("div", { cls: "bonus-time" }, el("div", { cls: "level-bar" }, bar), timeEl), q, opts);
      bar.style.width = "100%";
      var tmr = setInterval(function () { left--; timeEl.textContent = left + " s"; bar.style.width = Math.max(0, left / 30 * 100) + "%"; if (left <= 0) end(); }, 1000);
      function next() {
        if (qi >= order.length) { end(); return; }
        var it = order[qi], others = pairs.filter(function (x) { return x.en !== it.en; }).sort(function () { return Math.random() - 0.5; }).slice(0, 2);
        var choices = others.concat([it]).sort(function () { return Math.random() - 0.5; });
        q.textContent = "🇧🇷 " + it.pt; opts.replaceChildren();
        choices.forEach(function (c) {
          opts.append(el("button", { cls: "mcq-opt", type: "button", text: c.en, onclick: function (e) {
            if (over) return;
            var good = c.en === it.en;
            e.currentTarget.classList.add(good ? "ok" : "bad");
            if (good) { right++; SFX.blip(); } else SFX.oops();
            hit(good); qi++; setTimeout(next, good ? 250 : 650);
          } }));
        });
      }
      function end() {
        if (over) return; over = true; clearInterval(tmr); opts.replaceChildren();
        q.textContent = (right >= order.length ? "🏆 Gabaritou! " : "⚡ Fim! ") + "Você acertou " + right + " de " + order.length + ". +" + right * 2 + " XP";
        if (right >= order.length) SFX.stage(); else SFX.small();
        saved.bonus = { data: { right: right, total: order.length } };
        sendStep({ step: "bonus", score: 0, max: 0, data: { right: right, total: order.length } });
      }
      next();
    };
    return card;
  }
  function showConclude(scroll) {
    if (!concludeSec.querySelector(".bonus")) { var bc = bonusCard(); if (bc) concludeSec.insertBefore(bc, concludeSec.querySelector("button")); }
    concludeSec.hidden = false;
    if (scroll) scrollTo(concludeSec);
  }
  function conclude() {
    var b = concludeSec.querySelector("button");
    b.disabled = true; b.textContent = "Enviando…";
    var done = function () { concludeSec.hidden = true; delivered = true; refreshHud(); SFX.win(); confetti(); showResult(true); };
    if (PREVIEW) { done(); return; }
    if (!att) { fail(); return; }
    function fail() { b.disabled = false; b.textContent = "📡 Sem internet — toque para tentar de novo"; }
    // primeiro manda o que ficou guardado sem internet; só então entrega a lição
    var q = queue();
    (function drain() {
      if (!q.length) {
        post("/api/licao/attempt/" + att.id + "/progress", { token: att.token, step: "done", score: 0, max: 0, data: {}, finished: true }, 2).then(function (r) { if (r) { setQueue([]); done(); } else fail(); });
        return;
      }
      rawPost(q[0].url, q[0].body).then(function () { q.shift(); setQueue(q.slice()); drain(); }, fail);
    })();
  }

  // ---------- resultado + feedback ----------
  var resultSec, fbSec;
  var PATTERNS = [
    { test: function (w) { return /^s[ptkwlmnc]/i.test(w); }, title: "Palavras que começam com S + consoante", tip: "Parece que entra um \"i\" antes do S (\"iswim\"). Em inglês o S começa direto, sem vogal antes: um \"sss\" de cobra que já emenda na consoante." },
    { test: function (w) { return /ed$/i.test(w); }, title: "O -ED no fim do verbo sumiu", tip: "O -ed é curtinho, quase um \"d\" ou \"t\", mas precisa aparecer: é ele que diz que já aconteceu." },
    { test: function (w) { return /^th/i.test(w); }, title: "O som do TH", tip: "A ponta da língua encosta de leve nos dentes de cima e o ar passa. Não vira \"d\", \"f\" nem \"t\"." },
  ];
  function skills() {
    var out = {};
    steps.forEach(function (s) { out[s.skill] = out[s.skill] || { pts: 0, max: 0 }; out[s.skill].pts += s.done ? s.score : 0; out[s.skill].max += s.max; });
    return out;
  }
  function showResult(scroll) {
    var T = totalMax(), pct = Math.round(total() / T * 100);
    var st = stars(pct / 100), bonusRight = (saved.bonus && saved.bonus.data && Number(saved.bonus.data.right)) || 0;
    var xp = total() + 10 + comboBonus + bonusRight * 2;
    var threes = steps.filter(function (s) { return s.done && stars(s.max ? s.score / s.max : 1) === 3; }).length;
    resultSec.replaceChildren(el("h2", { text: st === 3 ? "🏆 Lição 3 estrelas!" : "🎉 Lição completa!" }),
      el("div", { cls: "res-stars", text: starText(st) }), el("div", { cls: "big", text: pct + "%" }));
    if (D.mode !== "practice") resultSec.append(el("div", { cls: "xp-gain" },
      el("div", null, el("b", { text: "+" + xp + " XP" }), el("span", { text: "nesta lição" })),
      el("div", null, el("b", { text: threes + "/" + steps.length }), el("span", { text: "fases ⭐⭐⭐" })),
      el("div", null, el("b", { text: "x" + comboBest }), el("span", { text: "maior combo" }))));
    var rows = el("div", { cls: "rows" });
    steps.forEach(function (s) { rows.append(el("div", null, el("span", { text: s.title.replace(/^[^\wÀ-ú]+/, "") }), el("span", { text: (s.done ? s.score : 0) + " / " + s.max }))); });
    rows.append(el("div", null, el("b", { text: "Total" }), el("b", { text: total() + " / " + T + " pts" })));
    resultSec.append(rows, el("p", { text: D.mode === "practice" ? "Treino feito! Este não muda a sua nota (a que vale é a da primeira vez)." : "Seus áudios e respostas já foram para o seu professor. Falou, validou! 🚀" }),
      el("div", { cls: "res-links" },
        el("a", { cls: "btn", href: "/licao/" + D.slug + (PQ ? "?" + PQ : ""), text: "🗺️ Ver meu nível e medalhas" }),
        el("a", { cls: "btn ghost-light", href: "?refazer=1" + (PQ ? "&" + PQ : ""), text: "🔁 Refazer pra treinar" })));
    resultSec.hidden = false;
    buildFeedback();
    if (scroll) scrollTo(resultSec);
  }
  function fbCard(title, cls) { var c = el("div", { cls: "fb-card" + (cls ? " " + cls : "") }, el("h3", { text: title })); fbSec.append(c); return c; }
  function buildFeedback() {
    fbSec.replaceChildren(); fbSec.hidden = false;
    var T = totalMax(), pct = Math.round(total() / T * 100), sk = skills();
    var names = { ouvir: "🎧 Ouvir", falar: "🎤 Falar", ler: "📖 Ler", escrever: "✍️ Escrever" };
    var bar = el("div", { cls: "skills" });
    ["ouvir", "falar", "ler", "escrever"].forEach(function (k) {
      if (!sk[k]) return;
      var i = el("i"); i.style.setProperty("--p", Math.round(sk[k].pts / sk[k].max * 100) + "%");
      bar.append(el("div", null, el("span", { text: names[k] }), el("b", { text: sk[k].pts + "/" + sk[k].max }), i));
    });
    var order = Object.keys(sk).map(function (k) { return [k, sk[k].pts / sk[k].max]; }).sort(function (a, b) { return a[1] - b[1]; });
    var weak = { ouvir: "o ouvido", falar: "a fala", ler: "a leitura", escrever: "a escrita" }[order[0][0]];
    var strong = { ouvir: "Seu ouvido está ótimo", falar: "Sua fala está ótima", ler: "Sua leitura está ótima", escrever: "Sua escrita está ótima" }[order[order.length - 1][0]];
    var pats = PATTERNS.filter(function (p) { return Object.keys(missed).some(function (k) { return p.test(missed[k].w); }); });
    fbSec.append(el("div", { cls: "fb-head" },
      el("span", { cls: "hand", text: "Seu feedback, " + D.student + " 💬" }),
      el("h2", { text: D.title + " · " + pct + "%" }), bar,
      el("p", { cls: "verdict", text: strong + ". O que mais precisa de treino agora é " + weak + (pats.length ? ": " + pats.length + " padrão(ões) de pronúncia e " + wrongs.length + " estrutura(s)." : ".") + " Treine só o que está aqui embaixo antes da próxima aula." })));

    if (review && (review.summary || (review.writing || []).length || (review.pronunciation || []).length || (review.speaking || []).length)) {
      var rv = fbCard("📝 Correção do seu professor", "challenge");
      if (review.summary) rv.append(el("p", { text: review.summary }));
      var fx = el("div", { cls: "forgot" });
      (review.writing || []).concat(review.speaking || []).forEach(function (w) { fx.append(el("div", null, el("span", { cls: "said", text: w.said }), el("b", null, w.right + " ", ear(w.right)), el("p", { text: w.why }))); });
      if (fx.children.length) rv.append(fx);
      (review.pronunciation || []).forEach(function (p) { pron(rv, p.title, "professor", p.tip, p.words); });
    }

    var g = fbCard("🏆 Onde você foi muito bem", "good"), ul = el("ul");
    (good.length ? good : ["Você fez a lição inteira: ouviu, falou, leu e escreveu. 👏"]).slice(0, 4).forEach(function (t) { ul.append(el("li", { text: t })); });
    g.append(ul);

    var P = fbCard("🗣️ Pronúncia: o que a página não entendeu");
    P.append(el("p", { cls: "small", text: "Toque no 🔊, ouça e repita 3 vezes." }));
    var used = {};
    pats.forEach(function (p) {
      var ms = Object.keys(missed).map(function (k) { return missed[k]; }).filter(function (m) { return p.test(m.w); });
      ms.forEach(function (m) { used[m.w.toLowerCase()] = 1; });
      pron(P, p.title, "padrão · " + ms.reduce(function (a, m) { return a + m.n; }, 0) + "×", p.tip, ms.slice(0, 4).map(function (m) { return m.w; }));
    });
    Object.keys(missed).map(function (k) { return missed[k]; }).filter(function (m) { return !used[m.w.toLowerCase()]; })
      .sort(function (a, b) { return b.n - a.n; }).slice(0, 4)
      .forEach(function (m) { pron(P, m.w, m.n + "×", "A página não entendeu essa palavra quando você falou. Ouça e repita devagar, depois no ritmo normal.", [m.w]); });
    if (P.querySelectorAll(".pron").length === 0) P.append(el("p", { text: SR ? "A página entendeu tudo o que você falou. 🎉" : "Seu navegador não mostra o texto da fala; seu professor vai ouvir os áudios." }));

    var F = fbCard("🧠 O que você esqueceu"), fx2 = el("div", { cls: "forgot" });
    wrongs.slice(0, 6).forEach(function (w) { fx2.append(el("div", null, el("span", { cls: "said", text: w.said }), el("b", null, w.right + " ", /[a-z]/i.test(w.right) && !/[ãçéêáíóú]|ouça/i.test(w.right) ? ear(w.right) : ""), el("p", { text: w.why }))); });
    F.append(fx2.children.length ? fx2 : el("p", { text: "Nada! Você lembrou de tudo. 🎉" }));

    var sh = steps.filter(function (s) { return s.key === "shadowing"; })[0];
    var tr = fbCard("🔁 Seu treino de 3 minutos antes da próxima aula", "challenge"), ol = el("ol");
    var list = sh && sh.data && sh.data.sentences ? sh.data.sentences.slice().sort(function (a, b) { return a.pct - b.pct; }).slice(0, 3).map(function (x) { return x.en; }) : C.shadowing.slice(0, 3).map(function (x) { return x.en; });
    list.forEach(function (t) { ol.append(el("li", null, t + " ", el("button", { cls: "ghost", text: "🔊", onclick: function () { speak(t); } }))); });
    tr.append(el("p", { text: "Fale estas frases em voz alta, 3 vezes cada. Elas juntam o que você mais precisa treinar." }), ol);
    fbSec.append(el("p", { cls: "small", style: "text-align:center", text: "Seu professor recebeu este feedback. Na próxima aula a gente começa por aqui. Falou, validou! 🚀" }));
  }
  function pron(parent, title, tag, tip, list) {
    var d = el("div", { cls: "pron" }, el("div", { cls: "pron-top" }, el("b", { text: title }), el("span", { cls: "tag", text: tag })), el("p", { text: tip }));
    var sy = el("div", { cls: "say" });
    (list || []).forEach(function (w) { sy.append(el("button", { text: "🔊 " + w, onclick: function () { speak(w); } })); });
    d.append(sy); parent.append(d);
  }

  // ---------- erros da lição anterior (abre a lição; não vale ponto) ----------
  function buildPrev() {
    var sec = el("section", { cls: "prev-fix" },
      el("span", { cls: "eyebrow", text: "🔁 Antes de começar" }),
      el("h2", { text: "Seus erros da lição de " + D.prev.dateLabel }),
      el("p", { cls: "small", text: SR ? "Leia a frase certa e toque em 🎤 para falar em voz alta. Repita até ficar verde." : "Leia cada frase certa em voz alta, 3 vezes." }));
    D.prev.items.forEach(function (f) {
      var row = el("div", { cls: "prev-item" },
        el("span", { cls: "said", text: f.said }),
        el("b", { cls: "right", text: f.right }),
        f.why ? el("p", { cls: "small", text: f.why }) : null);
      var listen = ear(f.right, "🔊 Ouvir");
      listen.className = "btn mini soft-btn";
      if (!SR) row.append(el("div", { cls: "prev-act" }, listen));
      if (SR) {
        var msg = el("span", { cls: "small" }), btn = el("button", { cls: "btn mini", type: "button", text: "🎤 Falar" });
        btn.addEventListener("click", function () {
          var r = new SR(); r.lang = "en-US"; r.interimResults = false; r.maxAlternatives = 3;
          btn.disabled = true; msg.textContent = "⏳ Espere…";
          r.onstart = function () { msg.textContent = "🔴 FALE AGORA!"; };
          r.onresult = function (e) {
            var alts = [].slice.call(e.results[0]).map(function (x) { return x.transcript; });
            var target = words(f.right), best = 0;
            alts.forEach(function (t) { var said = words(t); var hit = target.filter(function (w) { return said.indexOf(w) > -1; }).length; best = Math.max(best, hit / (target.length || 1)); });
            if (best >= 0.8) { row.classList.add("ok"); msg.textContent = "✅ Isso!"; }
            else { msg.textContent = "Quase! A página ouviu: \"" + alts[0] + "\". Tente de novo."; }
          };
          r.onerror = function () { msg.textContent = "Não ouvi. Toque e fale de novo."; };
          r.onend = function () { btn.disabled = false; if (/Espere|FALE AGORA/.test(msg.textContent)) msg.textContent = "Não ouvi. Toque e fale de novo."; };
          try { r.start(); } catch (e) { btn.disabled = false; }
        });
        row.append(el("div", { cls: "prev-act" }, listen, btn, msg));
      }
      sec.append(row);
    });
    app.append(sec);
  }

  // ---------- como jogar (aparece até o aluno tocar em "Entendi") ----------
  function howTo() {
    var seen = false; try { seen = localStorage.getItem("licao_comojogar") === "1"; } catch (e) {}
    if (seen) return;
    var card = el("section", { cls: "howto" },
      el("b", { cls: "howto-title", text: "🎮 Como funciona" }),
      el("ul", null,
        el("li", { html: "🔓 São <b>fases</b>: terminou uma, abre a próxima. A barrinha lá em cima mostra onde você está." }),
        el("li", { html: "⭐ Cada fase vale até <b>3 estrelas</b>. Errou? Faz parte: o erro vira seu treino no final." }),
        el("li", { html: "🔥 Acertos seguidos viram <b>combo</b> e dão XP extra. No fim tem a <b>rodada bônus</b> ⚡." }),
        el("li", { html: "🎤 Nas fases de fala: toque em Gravar, espere o <b>3, 2, 1</b> e fale quando aparecer 🔴." }),
        el("li", { html: "💾 Pode parar quando quiser: o site <b>guarda onde você parou</b>." })),
      el("button", { cls: "btn", type: "button", text: "Entendi, bora! 🚀", onclick: function () {
        try { localStorage.setItem("licao_comojogar", "1"); } catch (e) {}
        SFX.go(); card.remove();
      } }));
    app.append(card);
  }

  // ---------- montar ----------
  function build() {
    app.replaceChildren();
    scoreEl = el("span", { cls: "score", text: "⭐ 0 pts" });
    var soundBtn = el("button", { cls: "sound", type: "button", "aria-label": "Som", text: SFX.isOn() ? "🔊" : "🔇", onclick: function () { soundBtn.textContent = SFX.toggle() ? "🔊" : "🔇"; } });
    var track = el("div", { cls: "track", "aria-hidden": "true" });
    app.append(el("div", { cls: "bar" }, el("div", { cls: "bar-row" }, el("a", { cls: "back", href: "/licao/" + D.slug + (PQ ? "?" + PQ : ""), text: "← Minhas lições" }), el("span", { cls: "bar-right" }, soundBtn, scoreEl)), track));
    if (VIEW) app.append(el("div", { cls: "viewnote" }, el("b", { text: "✅ Você já fez esta lição." }), " Aqui estão as suas respostas e o seu feedback. ", el("a", { href: "?refazer=1" + (PQ ? "&" + PQ : ""), text: "🔁 Refazer para treinar" })));
    if (D.mode === "practice") app.append(el("div", { cls: "viewnote" }, el("b", { text: "🔁 Modo treino." }), " Pode fazer de novo à vontade: a nota que vale é a da primeira vez."));
    app.append(el("header", null, el("span", { cls: "hand", text: "Hi, " + D.student + "! 👋" }), el("h1", { text: D.title }),
      el("p", { html: (C.intro ? rich(C.intro) + " " : "") + "Ouça → a fofoca → escreva → fale. Mais ou menos <b>" + C.minutes + " minutos</b>. Pode parar e continuar depois: o link guarda onde você parou." })));
    if (!VIEW && !PREVIEW) howTo();
    if (D.prev && D.prev.items && D.prev.items.length && !VIEW) buildPrev();
    if (C.review) buildReview();
    buildDictation(); if (C.scene) buildScene();
    // tudo da fofoca em sequência, pro aluno não esquecer a história
    buildGossip(); buildShadowing(); buildRetell(); buildStory(); buildRead();
    buildWriting(); buildRealtime();
    steps.forEach(function (s) { track.append(el("span", { title: s.title, onclick: function () { if (!s.sec.classList.contains("locked")) s.sec.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" }); } })); });
    bars = [].slice.call(track.children);
    hudEl = el("div", { cls: "hud" }); track.after(hudEl);
    // mapa da lição (só em tela larga): partes, o que já fez, pontos e tempo
    mapEl = el("aside", { cls: "lesson-map", "aria-label": "Mapa da lição" });
    document.body.append(mapEl);
    refreshMap();
    concludeSec = el("section", { cls: "conclude", hidden: "" },
      el("h2", { text: "🏁 Você chegou ao fim!" }),
      el("p", { text: "Conferiu tudo? Toque no botão pra entregar a lição ao seu professor e ver a sua nota e o seu feedback." }),
      el("button", { cls: "btn big-btn", text: "✅ Concluir a lição", onclick: conclude }));
    resultSec = el("section", { cls: "result", hidden: "" }); fbSec = el("section", { cls: "fb", hidden: "" });
    app.append(concludeSec, resultSec, fbSec, el("footer", { text: "Falou, validou! 🚀" }));
    unlock(steps[0], false);
  }
  function restore() {
    var lastDone = -1;
    steps.forEach(function (s, i) {
      var p = saved[s.key];
      if (!p) return;
      s.done = true; s.score = p.score; s.data = p.data || {};
      absorb(s.data);
      s.sec.classList.remove("locked"); s.sec.classList.add("done"); bars[i].classList.add("on");
      s.ptsEl.textContent = p.score + "/" + s.max + " pts";
      s.sec.querySelector("h2").append(el("span", { cls: "stars", text: starText(stars(s.max ? p.score / s.max : 1)) }));
      [].forEach.call(s.sec.querySelectorAll("input,textarea,button"), function (x) { x.disabled = true; });
      var d = s.data || {}, said = d.answer || d.text || d.transcript;
      if (said) s.sec.append(el("div", { cls: "model" }, el("b", { text: d.transcript !== undefined ? "🎤 O que você falou: " : "✍️ O que você escreveu: " }), said));
      if (d.sentences) s.sec.append(el.apply(null, ["ol", { cls: "items" }].concat(d.sentences.map(function (x) { return el("li", null, x.en + " ", el("span", { cls: "small", text: (x.pct >= 95 ? "✅ " : "🔁 ") + x.pct + "%" })); }))));
      s.sec.append(el("p", { cls: "msg good", text: "✅ Você já fez esta parte." }));
      lastDone = i;
    });
    if (saved.combo && saved.combo.data) { comboBest = saved.combo.data.best || 0; comboBonus = saved.combo.data.bonus || 0; }
    lastTotal = total(); // sem animação de pontos ao reabrir a lição
    updateScore();
    if (!VIEW && lastDone >= 0 && lastDone < steps.length - 1) { unlock(steps[lastDone + 1], false); scrollTo(steps[lastDone + 1].sec); }
    if (steps.every(function (s) { return s.done; })) { if (VIEW || saved.done) showResult(false); else showConclude(false); }
  }

  // ---------- modo professor: tudo aberto + gabarito ----------
  function gaps(text) { return (text.match(/\[\[([^\]]+)\]\]/g) || []).map(function (m) { return m.slice(2, -2).split("|")[0]; }); }
  function plain(text) { return text.replace(/\[\[([^\]]+)\]\]/g, function (_, a) { return a.split("|")[0]; }).replace(/\*\*?/g, ""); }
  function mcqAns(q) {
    return q.q + " → " + (q.model || q.options[q.answer]) +
      (LEVEL !== "A1" && q.keys ? "  (conta certo se usar: " + q.keys.map(function (g) { return g.join("/"); }).join(" + ") + ")" : "");
  }
  function teacherView() {
    steps.forEach(function (s, i) { s.sec.classList.remove("locked"); bars[i].classList.add("on"); });
    refreshMap();
    var K = {
      review: C.review && ["Respostas esperadas (estruturas): " + C.review.keys.map(function (k) { return k.name; }).join(" · ")],
      dictation: ["Texto do ditado: " + C.dictation.text],
      scene: C.scene && [
        "Trecho: " + Math.floor(C.scene.start / 60) + ":" + String(C.scene.start % 60).padStart(2, "0") + " → " + Math.floor(C.scene.end / 60) + ":" + String(C.scene.end % 60).padStart(2, "0"),
      ].concat(C.scene.questions.map(function (q) { return typeof q === "string" ? plain(q) : mcqAns(q); })),
      gossip: ["Palavra secreta: " + C.gossip.secret.toUpperCase(), "Texto do áudio: " + C.story.paragraphs.map(plain).join(" ")]
        .concat((C.gossip.questions || []).map(mcqAns)),
      shadowing: C.shadowing.map(function (x, k) { return (k + 1) + ". " + x.en; }),
      retell: ["Destrava com: a palavra secreta (" + C.gossip.secret.toUpperCase() + ") + pelo menos " + C.retell.minWords + " palavras + 3 palavras da história."],
      story: ["Lacunas, na ordem: " + gaps(C.story.paragraphs.join(" ")).join(" · ")],
      read: ["Texto: " + C.readAloud.text],
      writing: ["O aluno precisa usar: " + (C.writing.keys || []).map(function (k) { return k.name; }).join(" · "), "O texto dele é corrigido depois pela rotina (aparece no feedback)."],
      realtime: ["Modelo: " + C.realtime.model, "Conta ponto por: " + C.realtime.keys.map(function (k) { return k.name; }).join(" · ")],
    };
    steps.forEach(function (s) {
      var lines = K[s.key]; if (!lines) return;
      var box = el("div", { cls: "teacher-key" }, el("b", { text: "🔑 Gabarito do professor" }));
      lines.forEach(function (t) { box.append(el("p", { text: t })); });
      if (s.key === "scene" && C.scene) box.append(el("a", { href: "https://www.youtube.com/watch?v=" + C.scene.youtubeId + "&t=" + C.scene.start + "s", target: "_blank", rel: "noopener", text: "▶ Abrir a cena no YouTube, já no minuto" }));
      s.sec.append(box);
    });
  }

  build();
  if (VIEW) {
    saved = (D.view && D.view.progress) || {}; review = (D.view && D.view.review) || null;
    steps.forEach(function (s) { if (!saved[s.key]) saved[s.key] = { score: 0, max: s.max, data: { skipped: true } }; });
    restore();
    return;
  }
  if (PREVIEW) {
    app.insertBefore(el("div", { cls: "viewnote" }, el("b", { text: "👀 Modo professor:" }),
      " tudo aberto e com o 🔑 gabarito em cada parte. Pode testar à vontade — nada do que você fizer aqui é salvo nem conta para o aluno."), app.children[1] || null);
    teacherView();
    return;
  }
  var mine = load() || {};
  (function connect() {
    post("/api/licao/" + D.slug + "/attempt", { lessonId: D.lessonId, id: mine.id, token: mine.token }, 2).then(function (r) {
      if (!r) { netBanner(true); setTimeout(connect, 6000); return; }
      att = { id: r.id, token: r.token }; save(att);
      saved = r.progress || {}; review = r.review || null;
      if (pending.length) { pending.splice(0).forEach(sendStep); return; } // fez partes offline: o que está na tela vale
      if (Object.keys(saved).length) restore();
      flushQueue();
    });
  })();
})();
