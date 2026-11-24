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
    return all.filter(function (w, i) { return w.length >= 4 && STOP.indexOf(w) < 0 && all.indexOf(w) === i; });
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

  function post(url, body) {
    return fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      .then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
  }

  function finish(step, pts, data) {
    if (step.done) return;
    step.done = true; step.score = pts; step.data = data || {};
    absorb(step.data);
    step.sec.classList.add("done");
    step.ptsEl.textContent = pts + "/" + step.max + " pts";
    updateScore();
    var all = steps.every(function (s) { return s.done; });
    if (att && !VIEW) post("/api/licao/attempt/" + att.id + "/progress", { token: att.token, step: step.key, score: pts, max: step.max, data: step.data });
    var i = steps.indexOf(step);
    if (i < steps.length - 1) unlock(steps[i + 1], !step.holdScroll);
    if (all) showConclude(!step.holdScroll);
  }
  function unlock(step, scroll) {
    if (!step.sec.classList.contains("locked")) return;
    step.sec.classList.remove("locked");
    bars[steps.indexOf(step)].classList.add("on");
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
  function updateScore() { scoreEl.textContent = "⭐ " + total() + " pts"; }

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
    this.start = function () {
      return (canRecord ? getMic() : Promise.resolve(null)).then(function (stream) {
        if (stream) {
          var mime = pickMime();
          mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
          mr.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
          mr.start(1000);
        }
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
          rec.onend = function () { if (!stopped) { try { rec.start(); } catch (e) {} } };
          rec.onerror = function () {};
          try { rec.start(); } catch (e) {}
        }
        t0 = Date.now();
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
        // dá um instante pro último pedaço do texto chegar
        return new Promise(function (r) { setTimeout(r, SR ? 600 : 0); }).then(function () {
          interim = interim; cb.onStop(self.text(), secs, blob);
        });
      });
    };
  }
  function upload(stepKey, blob, text, secs) {
    if (!att || !blob || !blob.size) return;
    var url = "/api/licao/attempt/" + att.id + "/recording?token=" + encodeURIComponent(att.token) + "&step=" + encodeURIComponent(stepKey) + "&seconds=" + secs;
    fetch(url, { method: "POST", headers: { "Content-Type": blob.type || "audio/webm", "X-Transcript": encodeURIComponent(text.slice(0, 1500)) }, body: blob }).catch(function () {});
  }

  /* Caixa de gravação de uma parte: botão, tempo, texto ao vivo, mensagens. */
  function recBox(step, opt) {
    var btn = el("button", { cls: "rec", text: "🎙️ Gravar" });
    var tm = el("span", { text: "0 s" }), wc = el("span", { text: "0 palavras" });
    var tr = el("div", { cls: "transcript", html: '<span class="small">O que você falar aparece aqui.</span>' });
    var msg = el("p", { cls: "msg", hidden: "" });
    var box = el("div", { style: "display:flex;flex-direction:column;gap:10px" }, btn, el("div", { cls: "meter" }, tm, wc), tr, msg);
    var sess = null, timer = null, taken = "";
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
      sess = new Session({
        onText: function (t) {
          render(t);
          if (opt.unlockLive && !isPortuguese(t) && ok(t, sess.seconds())) { btn.disabled = true; sess.stop(); }
        },
        onStop: function (t, secs, blob) {
          clearInterval(timer); busy = null; sess = null; btn.disabled = false; btn.classList.remove("live");
          if (SR && isPortuguese(t)) {
            render(taken);
            btn.textContent = "🎙️ Gravar de novo em inglês";
            say(msg, "Parece que você falou em português 🙂 Essa gravação não conta. Fale em inglês, mesmo que errando!");
            return;
          }
          taken = (taken + " " + t).trim(); render(taken);
          upload(step.key, blob, t, secs);
          if (ok(taken, secs)) done(taken, secs);
          else { btn.textContent = "🎙️ Continuar gravando"; say(msg, SR ? opt.hint(taken) : "Grave um pouco mais (pelo menos " + (opt.minSeconds || 20) + " segundos)."); }
        },
      });
      busy = sess; say(msg, "");
      sess.start().then(function () {
        btn.textContent = "⏹️ Parar"; btn.classList.add("live");
        var base = parseInt(tm.textContent, 10) || 0, t0 = Date.now();
        timer = setInterval(function () { tm.textContent = base + Math.round((Date.now() - t0) / 1000) + " s"; }, 500);
      }).catch(function () {
        busy = null; sess = null;
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
      if (sel === right) { ok++; sel.classList.add("ok"); }
      else {
        sel.classList.add("bad"); right.classList.add("ok");
        ws.push({ said: label + ": marcou \"" + sel.textContent + "\"", right: right.textContent, why: q.querySelector(".mcq-q").textContent });
      }
    });
    return { ok: ok, total: qs.length, wrongs: ws };
  }
  function gapCheck(step, box, btn, label, extra) {
    var inputs = [].slice.call(box.querySelectorAll("input.gap"));
    var hasMcq = box.querySelector("li.mcq");
    if (hasMcq && [].some.call(box.querySelectorAll("li.mcq"), function (q) { return !q.querySelector(".mcq-opt.sel"); })) {
      btn.textContent = "Responda todas antes de conferir"; setTimeout(function () { btn.textContent = "Conferir"; }, 1800); return;
    }
    if (inputs.some(function (i) { return !i.value.trim(); })) {
      btn.textContent = "Preencha tudo antes de conferir"; setTimeout(function () { btn.textContent = "Conferir"; }, 1800); return;
    }
    var ok = 0, ws = [], answers = [];
    inputs.forEach(function (i) {
      var opts = i.getAttribute("data-a").split("|").map(function (x) { return x.trim(); });
      var g = opts.map(norm).indexOf(norm(i.value)) > -1;
      answers.push(i.value.trim());
      i.classList.add(g ? "ok" : "bad"); i.disabled = true;
      if (g) ok++;
      else {
        i.after(el("span", { cls: "fix", text: " ✓ " + opts[0] }));
        var ctx = (i.closest("li,p") || box).textContent.replace(/✓.*$/, "").replace(/\s+/g, " ").trim().slice(0, 80);
        ws.push({ said: "escreveu \"" + i.value.trim() + "\"", right: opts[0], why: label + ": " + ctx });
      }
    });
    var total = inputs.length;
    if (hasMcq) { var m = mcqCheck(box, label); ok += m.ok; total += m.total; ws = ws.concat(m.wrongs); }
    btn.disabled = true; btn.textContent = "Você acertou " + ok + " de " + total + (extra || "");
    var gd = ok === total ? [label + ": " + ok + " de " + ok + ". 🎉"] : [];
    finish(step, Math.round(ok / total * step.max), { answers: answers, wrongs: ws, good: gd });
  }

  // ---------- partes ----------
  function section(step, phase) {
    var ptsEl = el("span", { cls: "pts" });
    var sec = el("section", { cls: "step locked" },
      el("h2", null, el("span", { cls: "n", text: steps.length + 1 }), step.title, el("span", { cls: "time", text: step.minutes + " min" }), ptsEl));
    step.sec = sec; step.ptsEl = ptsEl;
    if (phase) app.append(el("div", { cls: "phase", text: phase }));
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
      say(msg, "Você pegou " + Math.round(r.pct * 100) + "% das palavras. Em vermelho: o que faltou ou ficou diferente.", pts >= 3);
      btn.disabled = true; ta.disabled = true;
      finish(step, pts, {
        answer: ta.value.trim(),
        good: r.pct >= 0.85 ? ["Ditado: " + Math.round(r.pct * 100) + "% das palavras, mesmo com as frases emendadas! 🎧"] : [],
        wrongs: r.pct < 0.85 ? [{ said: "Ditado: faltou " + r.miss.slice(0, 5).join(", "), right: "Ouça de novo só esses pedaços", why: "Quando as frases emendam, as palavras pequenas somem. Pause frase por frase." }] : [],
      });
    } });
    sec.append(el("p", { cls: "small", text: n + " frases seguidas, no ritmo normal. Ouça quantas vezes quiser, pause quando precisar, e escreva tudo." }),
      el("audio", { controls: "", preload: "none", src: FILE(C.dictation.audio) }), ta, btn, msg, out);
  }

  function buildGossip() {
    var GQ = C.gossip.questions || [];
    var step = { key: "gossip", title: "Fofoca — só ouvir", minutes: 2 + Math.ceil(GQ.length / 2), max: 2 + GQ.length, skill: "ouvir" };
    var sec = section(step, "2. A fofoca 🕵️");
    var qbox = GQ.length ? el.apply(null, ["ol", { cls: "items" }].concat(GQ.map(mcqEl))) : null;
    var inp = el("input", { type: "text", placeholder: "Palavra secreta", autocomplete: "off", autocapitalize: "off" });
    var msg = el("p", { cls: "msg", hidden: "" }), tries = 0;
    var btn = el("button", { cls: "btn", text: GQ.length ? "Conferir" : "Conferir palavra", onclick: function () {
      var v = norm(inp.value);
      if (v !== norm(C.gossip.secret)) { tries++; say(msg, v ? "Não é essa. Ouça o final do áudio de novo 🎧" : "Escreva a palavra secreta do fim do áudio."); return; }
      if (qbox && [].some.call(qbox.querySelectorAll("li.mcq"), function (q) { return !q.querySelector(".mcq-opt.sel"); })) {
        say(msg, "Palavra certa! 🔑 Agora responda as perguntas sobre a história.", true); return;
      }
      var m = qbox ? mcqCheck(qbox, "Fofoca") : { ok: 0, total: 0, wrongs: [] };
      say(msg, m.total ? "✅ Palavra secreta certa · você entendeu " + m.ok + " de " + m.total + " sobre a história." : "✅ Isso!", true);
      btn.disabled = true; inp.disabled = true;
      finish(step, (tries ? 1 : 2) + m.ok, { wrongs: m.wrongs, good: m.total && m.ok === m.total ? ["Fofoca: entendeu a história toda só de ouvido! 👂"] : [] });
    } });
    sec.append(el("p", { cls: "small", html: "Daqui até a leitura em voz alta, <b>tudo é sobre esta fofoca</b>: ouvir, imitar, recontar, completar e ler." }),
      el("p", { html: "🚫 <b>Não escreva a história.</b> Ouça 2 vezes, sem ler nada. 🔑 No fim tem uma <b>palavra secreta</b>." }),
      el("audio", { controls: "", preload: "none", src: FILE(C.gossip.audio) }),
      qbox ? el("p", { cls: "small", html: "Responda <b>sem ler nada</b>, só com o que você ouviu:" }) : null, qbox,
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
    var box = el.apply(null, ["ol", { cls: "items" }].concat(S.questions.map(function (q) { return typeof q === "string" ? el("li", { html: gapHtml(q) }) : mcqEl(q); })));
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
      wrap, timeline, ctrl, el("p", { cls: "small", html: "Responda só com o que você <b>ouviu</b>:" }), box, btn, show, goOn);
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
      sess = new Session({
        onText: function (t) { judge(t, false); },
        onStop: function (t, secs, blob) { busy = null; sess = null; rec.disabled = false; upload("shadowing-" + (si + 1), blob, t, secs); judge(t, true); },
      });
      busy = sess;
      sess.start().then(function () { rec.textContent = "⏹️ Parar"; rec.classList.add("live"); })
        .catch(function () { busy = null; sess = null; say(msg, "O microfone está bloqueado. Toque no cadeado ao lado do endereço e libere o microfone."); });
    };
    next.onclick = function () {
      if (si < SH.length - 1) { si++; render(); return; }
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
          return n.length >= R.minWords && norm(t).indexOf(secret) > -1 && hits >= Math.min(3, sw.length);
        },
        hint: function (t) { return words(t).length < R.minWords ? "Fale mais um pouco (faltam " + (R.minWords - words(t).length) + " palavras)." : norm(t).indexOf(secret) < 0 ? "Você não falou a palavra secreta 🔑." : "Conte a história da fofoca, em inglês, com as palavras dela."; },
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
    var voc = el("div", { cls: "vocab" }); S.vocab.forEach(function (v) { voc.append(el("b", { text: v[0] }), el("span", { text: v[1] })); });
    var btn = el("button", { cls: "btn", text: "Conferir", onclick: function () { gapCheck(step, box, btn, "Fofoca escrita"); } });
    sec.append(el("p", { cls: "small", html: rich(S.intro) }), S.vocab.length ? voc : null, box, btn);
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
  function showConclude(scroll) {
    concludeSec.hidden = false;
    if (scroll) scrollTo(concludeSec);
  }
  function conclude() {
    var b = concludeSec.querySelector("button");
    b.disabled = true; b.textContent = "Enviando…";
    var done = function () { concludeSec.hidden = true; showResult(true); };
    if (!att) { done(); return; }
    post("/api/licao/attempt/" + att.id + "/progress", { token: att.token, step: "done", score: 0, max: 0, data: {}, finished: true }).then(done);
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
    resultSec.replaceChildren(el("h2", { text: "🎉 Lição completa!" }), el("div", { cls: "big", text: pct + "%" }));
    var rows = el("div", { cls: "rows" });
    steps.forEach(function (s) { rows.append(el("div", null, el("span", { text: s.title.replace(/^[^\wÀ-ú]+/, "") }), el("span", { text: (s.done ? s.score : 0) + " / " + s.max }))); });
    rows.append(el("div", null, el("b", { text: "Total" }), el("b", { text: total() + " / " + T + " pts" })));
    resultSec.append(rows, el("p", { text: "Seus áudios e respostas já foram para o seu professor. Falou, validou! 🚀" }));
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
      (review.writing || []).concat(review.speaking || []).forEach(function (w) { fx.append(el("div", null, el("span", { cls: "said", text: w.said }), el("b", { text: w.right }), el("p", { text: w.why }))); });
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
    wrongs.slice(0, 6).forEach(function (w) { fx2.append(el("div", null, el("span", { cls: "said", text: w.said }), el("b", { text: w.right }), el("p", { text: w.why }))); });
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

  // ---------- montar ----------
  function build() {
    app.replaceChildren();
    scoreEl = el("span", { cls: "score", text: "⭐ 0 pts" });
    var track = el("div", { cls: "track", "aria-hidden": "true" });
    app.append(el("div", { cls: "bar" }, el("div", { cls: "bar-row" }, el("a", { cls: "back", href: "/licao/" + D.slug, text: "← Minhas lições" }), scoreEl), track));
    if (VIEW) app.append(el("div", { cls: "viewnote" }, el("b", { text: "✅ Você já fez esta lição." }), " Aqui estão as suas respostas e o seu feedback. ", el("a", { href: "?refazer=1", text: "🔁 Refazer para treinar" })));
    if (D.mode === "practice") app.append(el("div", { cls: "viewnote" }, el("b", { text: "🔁 Modo treino." }), " Pode fazer de novo à vontade: a nota que vale é a da primeira vez."));
    app.append(el("header", null, el("span", { cls: "hand", text: "Hi, " + D.student + "! 👋" }), el("h1", { text: D.title }),
      el("p", { html: (C.intro ? rich(C.intro) + " " : "") + "Ouça → a fofoca → escreva → fale. Mais ou menos <b>" + C.minutes + " minutos</b>. Pode parar e continuar depois: o link guarda onde você parou." })));
    if (C.review) buildReview();
    buildDictation(); if (C.scene) buildScene();
    // tudo da fofoca em sequência, pro aluno não esquecer a história
    buildGossip(); buildShadowing(); buildRetell(); buildStory(); buildRead();
    buildWriting(); buildRealtime();
    steps.forEach(function () { track.append(el("span")); });
    bars = [].slice.call(track.children);
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
      [].forEach.call(s.sec.querySelectorAll("input,textarea,button"), function (x) { x.disabled = true; });
      var d = s.data || {}, said = d.answer || d.text || d.transcript;
      if (said) s.sec.append(el("div", { cls: "model" }, el("b", { text: d.transcript !== undefined ? "🎤 O que você falou: " : "✍️ O que você escreveu: " }), said));
      if (d.sentences) s.sec.append(el.apply(null, ["ol", { cls: "items" }].concat(d.sentences.map(function (x) { return el("li", null, x.en + " ", el("span", { cls: "small", text: (x.pct >= 95 ? "✅ " : "🔁 ") + x.pct + "%" })); }))));
      s.sec.append(el("p", { cls: "msg good", text: "✅ Você já fez esta parte." }));
      lastDone = i;
    });
    updateScore();
    if (!VIEW && lastDone >= 0 && lastDone < steps.length - 1) { unlock(steps[lastDone + 1], false); scrollTo(steps[lastDone + 1].sec); }
    if (steps.every(function (s) { return s.done; })) { if (VIEW || saved.done) showResult(false); else showConclude(false); }
  }

  build();
  if (VIEW) {
    saved = (D.view && D.view.progress) || {}; review = (D.view && D.view.review) || null;
    steps.forEach(function (s) { if (!saved[s.key]) saved[s.key] = { score: 0, max: s.max, data: { skipped: true } }; });
    restore();
    return;
  }
  var mine = load() || {};
  post("/api/licao/" + D.slug + "/attempt", { lessonId: D.lessonId, id: mine.id, token: mine.token }).then(function (r) {
    if (!r) return;
    att = { id: r.id, token: r.token }; save(att);
    saved = r.progress || {}; review = r.review || null;
    if (Object.keys(saved).length) restore();
  });
})();
