/* 🎯 Treinar meus erros (Thiago 26/11) — OPCIONAL, não vale nota.
   Junta os erros de todas as lições concluídas; começa pelo ponto fraco; cada erro sai da lista
   quando o aluno acerta em 2 dias diferentes. Rodadas curtas de 5 exercícios. */
(function () {
  var D = window.DRILL, root = document.getElementById("drill-app");
  if (!D || !root) return;
  var MASTER = 2, ROUND = 5, today = D.today;
  var SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  var SKILL = { ouvir: "🎧 Ouvir", falar: "🎤 Falar", escrever: "✍️ Escrever", ler: "📖 Ler" };

  function el(tag, o) {
    var e = document.createElement(tag); o = o || {};
    Object.keys(o).forEach(function (k) {
      if (k === "text") e.textContent = o[k]; else if (k === "html") e.innerHTML = o[k];
      else if (k === "cls") e.className = o[k]; else if (k.slice(0, 2) === "on") e.addEventListener(k.slice(2), o[k]);
      else e.setAttribute(k, o[k]);
    });
    for (var i = 2; i < arguments.length; i++) { var c = arguments[i]; if (c != null) e.append(c); }
    return e;
  }
  function norm(s) { return String(s).toLowerCase().replace(/[’`´]/g, "'").replace(/[^a-z0-9' ]/g, " ").replace(/\s+/g, " ").trim(); }
  function words(s) { return norm(s).split(" ").filter(Boolean); }
  function match(said, target) {
    var tw = words(target), pool = words(said), h = 0;
    tw.forEach(function (w) { var k = pool.indexOf(w); if (k > -1) { h++; pool.splice(k, 1); } });
    var extra = pool.length;
    return Math.max(0, (h - extra * 0.5) / (tw.length || 1));
  }
  function FILE(n) { return "/api/licao/file/" + n; }
  function days(it) { var s = {}; it.hits.forEach(function (d) { s[d] = 1; }); return Object.keys(s).length; }
  function mastered(it) { return days(it) >= MASTER; }
  function hitToday(it) { return it.hits.indexOf(today) > -1; }

  var items = D.items;
  function counts() {
    var m = items.filter(mastered).length;
    return { total: items.length, mastered: m, left: items.length - m, todo: items.filter(function (i) { return !mastered(i) && !hitToday(i); }).length };
  }

  // ordem: nunca acertou primeiro, depois o ponto fraco, depois as lições mais novas
  function pick() {
    var pool = items.filter(function (i) { return !mastered(i) && !hitToday(i); });
    pool.sort(function (a, b) {
      return (days(a) - days(b)) || ((b.skill === D.weak) - (a.skill === D.weak)) || (a.date < b.date ? 1 : a.date > b.date ? -1 : 0);
    });
    return pool.slice(0, ROUND);
  }

  function header() {
    var c = counts(), pct = c.total ? Math.round((c.mastered / c.total) * 100) : 0;
    return el("section", { cls: "card drill-count" },
      el("div", { cls: "drill-big" }, el("b", { text: c.left ? String(c.left) : "🎉" }), el("span", { text: c.left ? (c.left === 1 ? "erro pra zerar" : "erros pra zerar") : "Zerou! Nenhum erro pra treinar" })),
      el("div", { cls: "level-bar" }, el("i", { style: "width:" + pct + "%" })),
      D.clean ? el("p", { cls: "small", html: "✅ " + c.mastered + " de " + c.total + " corrigidos · acerte em 2 dias diferentes pra corrigir" }) :
      el("p", { cls: "small", html: "✅ <b>" + c.mastered + " de " + c.total + "</b> corrigidos. Um erro sai da lista quando você acerta ele em <b>2 dias diferentes</b> (pra ter certeza que ficou)." + (D.weak ? " Seu ponto fraco agora é <b>" + SKILL[D.weak] + "</b>: o treino começa por ele." : "") }));
  }

  function home() { homeCore(); var rb = reforcoBox(); if (rb) root.append(rb); }

  // 📘 LIÇÕES DE REFORÇO (Thiago 27/11): cada erro que bate com uma regra do banco abre uma lição NOVA sobre a regra
  // (fofoca nova, frases novas, só ouvir e falar) — feita uma vez e usada por todos os alunos.
  var RULES = D.reforco || [];
  function ruleTitle(id) { var r = RULES.filter(function (x) { return x.id === id; })[0]; return r ? r.title : id; }
  function reforcoBox() {
    if (!RULES.length) return null;
    var by = {};
    items.forEach(function (it) { if (it.rule && !mastered(it) && RULES.some(function (r) { return r.id === it.rule; })) (by[it.rule] = by[it.rule] || []).push(it); });
    var ids = Object.keys(by); if (!ids.length) return null;
    var box = el("section", { cls: "card rf-list" }, el("span", { cls: "extra-tag", text: "📘 NOVO · Corrigir meus erros" }), el("h3", { text: "Você errou isso: vamos acertar de vez" }),
      D.clean ? el("p", { cls: "small", text: "Uma lição curta pra cada regra que você errou." }) : el("p", { cls: "small", text: "Uma lição curtinha pra cada coisa que você errou: a regra explicada, uma fofoca nova cheia dela, escolher o que ouviu e falar. Uns 5 minutos cada. (Os vídeos de inglês de verdade ficam no fim de cada lição.)" }));
    ids.forEach(function (id) {
      var ex = by[id][0];
      box.append(el("div", { cls: "rf-item" },
        el("b", { text: "📘 " + ruleTitle(id) }),
        el("p", { cls: "small rf-err", html: "Você disse <s></s> → o certo é <b></b>" + (by[id].length > 1 ? " (e mais " + (by[id].length - 1) + ")" : "") }),
        el("button", { cls: "btn", type: "button", text: "▶ Corrigir este erro", onclick: function () { runReforco(id, by[id]); } })));
      var last = box.lastChild; last.querySelector("s").textContent = ex.said || "?"; last.querySelector(".rf-err b").textContent = ex.en;
    });
    return box;
  }
  function shuffle(a, seed) { a = a.slice(); var s2 = seed || 7; for (var i = a.length - 1; i > 0; i--) { s2 = (s2 * 9301 + 49297) % 233280; var j = Math.floor(s2 / 233280 * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function playBtn(file, label) {
    var a = new Audio(FILE(file));
    return el("button", { cls: "btn mini", type: "button", text: label || "🔊 Ouvir", onclick: function () { a.currentTime = 0; a.playbackRate = 1; a.play().catch(function () {}); } });
  }
  function runReforco(id, errs) {
    root.replaceChildren(el("section", { cls: "card" }, el("p", { text: "⏳ Abrindo a lição…" })));
    fetch("/licao/reforco/" + id + ".json?v=1").then(function (r) { return r.json(); }).then(function (L) {
      var TOTAL = 5, stepN = 0, wrap = el("div", { cls: "rf-run" });
      var head = el("section", { cls: "card rf-head" }, el("span", { cls: "extra-tag", text: "📘 CORRIGIR MEUS ERROS · opcional" }), el("h2", { text: L.title }),
        el("p", { cls: "small", text: "5 partes curtas. Não vale nota: é pra você nunca mais errar isso. 💪" }));
      root.replaceChildren(head, wrap); toRoot();
      function stepBox(title) { stepN++; var b = el("section", { cls: "card rf-step" }, el("div", { cls: "drill-step" }, el("span", { text: "Parte " + stepN + " de " + TOTAL })), el("h3", { text: title })); wrap.append(b); return b; }
      function goNext(b, fn) { var nb = el("button", { cls: "btn", type: "button", text: stepN < TOTAL ? "Próxima parte →" : "Terminar ✅", onclick: function () { nb.remove(); fn(); } }); b.append(nb); }
      // 1. a regra
      function s1() {
        var b = stepBox("💡 A regra");
        b.append(el("p", { html: L.regra }));
        L.exemplos.forEach(function (e) { b.append(el("div", { cls: "rf-ex" }, playBtn(e.audio, "🔊"), el("div", null, el("b", { text: e.en }), el("p", { cls: "small", text: "🇧🇷 " + e.pt })))); });
        goNext(b, s2); b.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      // 2. ouça a mini-fofoca e complete
      function s2() {
        var b = stepBox("🎧 Ouça a fofoca e complete");
        b.append(el("p", { cls: "small", text: "Uma fofoca nova, cheia dessa regra. Ouça (quantas vezes quiser) e complete o que falta." }), el("audio", { controls: "", preload: "none", src: FILE(L.fofoca.audio) }));
        var txt = el("p", { cls: "story rf-story" });
        L.fofoca.gaps.split(/(\[\[[^\]]+\]\])/).forEach(function (part) {
          var m = part.match(/^\[\[([^\]]+)\]\]$/);
          if (m) txt.append(el("input", { cls: "gap", autocomplete: "off", autocapitalize: "off", spellcheck: "false", "data-a": m[1] })); else txt.append(part);
        });
        var msg = el("p", { cls: "msg", hidden: "" });
        var ck = el("button", { cls: "btn", type: "button", text: "Conferir", onclick: function () {
          var ins = [].slice.call(txt.querySelectorAll("input")); if (ins.some(function (i) { return !i.value.trim(); })) { say(msg, "Complete tudo antes de conferir (pode ouvir de novo)."); return; }
          var ok = 0; ins.forEach(function (i) { var g = norm(i.value) === norm(i.getAttribute("data-a")); i.disabled = true; i.classList.add(g ? "ok" : "bad"); if (g) ok++; else i.after(el("span", { cls: "fix", text: " ✓ " + i.getAttribute("data-a") + " " })); });
          ck.remove(); say(msg, "Você acertou " + ok + " de " + ins.length + "." + (ok === ins.length ? " 👏" : " Ouça de novo olhando as respostas."), ok === ins.length);
          goNext(b, s3);
        } });
        b.append(txt, ck, msg); b.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      // 3. qual você ouviu? (as opções aparecem antes: o ouvido sabe o que procurar)
      function s3() {
        var b = stepBox("👂 Qual você ouviu?"), left = L.ouvir.length;
        b.append(el("p", { cls: "small", text: "Leia as 3 frases, toque em 🔊 e escolha a que ele falou. A diferença é pequena: preste atenção!" }));
        L.ouvir.forEach(function (q, k) {
          var box = el("div", { cls: "rf-q" }, el("div", { cls: "rf-qh" }, el("b", { text: (k + 1) + "." }), playBtn(q.audio, "🔊 Ouvir")));
          var msg = el("p", { cls: "msg", hidden: "" });
          shuffle(q.options.map(function (o, i) { return i; }), k * 31 + id.length).forEach(function (i) {
            var bt = el("button", { cls: "pt-opt", type: "button", text: q.options[i] });
            bt.addEventListener("click", function () {
              if (bt.disabled) return;
              if (i === q.answer) { bt.classList.add("ok"); [].forEach.call(box.querySelectorAll(".pt-opt"), function (o) { o.disabled = true; }); say(msg, "✅ Isso!", true); if (--left === 0) goNext(b, s4); }
              else { bt.classList.add("bad"); bt.disabled = true; say(msg, "❌ Não foi essa. Ouça de novo e tente outra."); }
            });
            box.append(bt);
          });
          box.append(msg); b.append(box);
        });
        b.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      // 4. fale do jeito certo
      function s4() {
        var b = stepBox("🎤 Fale em inglês"), left = L.falar.length;
        b.append(el("p", { cls: "small", text: SpeechRec ? "Leia em português e fale em inglês, usando a regra. Se travar, toque em 👀." : "Leia em português e fale em inglês em voz alta, 3 vezes. Depois confira." }));
        L.falar.forEach(function (f) {
          var msg = el("p", { cls: "msg", hidden: "" }), ans = el("div", { cls: "drill-ans", hidden: "" }, el("b", { text: f.en + " " }), playBtn(f.audio, "🔊"));
          var done = false; function ok() { ans.hidden = false; if (!done) { done = true; if (--left === 0) goNext(b, s5); } }
          var row = el("div", { cls: "rf-q" }, el("p", { html: "🇧🇷 <b></b>" }));
          row.querySelector("b").textContent = f.pt;
          if (SpeechRec) {
            var sp = speakBtn(f.en, msg, function (good, said, p) { if (good) { sp.remove(); ok(); } else say(msg, "A página ouviu: \"" + said + "\" (" + Math.round(p * 100) + "%). Tente de novo ou toque em 👀."); });
            row.append(el("div", { cls: "pt-play" }, sp, el("button", { cls: "ghost", type: "button", text: "👀 Ver a resposta", onclick: function () { ok(); } })));
          } else row.append(el("button", { cls: "btn mini", type: "button", text: "✅ Falei, conferir", onclick: function (e) { e.currentTarget.remove(); ok(); } }));
          row.append(msg, ans); b.append(row);
        });
        b.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      // 5. o seu erro: agora do jeito certo (vale como acerto do dia no Treinar)
      function s5() {
        var b = stepBox("🎯 O seu erro, agora do jeito certo"), left = errs.length;
        b.append(el("p", { cls: "small", text: "Foi isso que você falou na lição. Agora fale do jeito certo: conta como acerto no seu Treinar." }));
        errs.forEach(function (it) {
          var msg = el("p", { cls: "msg", hidden: "" }), right = el("div", { cls: "drill-ans", hidden: "", text: "✅ " + it.en });
          var row = el("div", { cls: "rf-q" }, el("p", { cls: "drill-said", html: "❌ <s></s>" }));
          row.querySelector("s").textContent = it.said || "";
          var done = false; function ok(saveIt) { right.hidden = false; if (saveIt) save(it); if (!done) { done = true; if (--left === 0) finish(); } }
          if (SpeechRec) {
            var sp = speakBtn(it.en, msg, function (good, said, p) { if (good) { sp.remove(); ok(true); } else say(msg, "A página ouviu: \"" + said + "\" (" + Math.round(p * 100) + "%). Tente de novo."); });
            row.append(el("div", { cls: "pt-play" }, sp, el("button", { cls: "ghost", type: "button", text: "👀 Ver (aí não conta)", onclick: function () { ok(false); } })));
          } else row.append(el("button", { cls: "btn mini", type: "button", text: "✅ Falei certo 3 vezes", onclick: function (e) { e.currentTarget.remove(); ok(true); } }));
          row.append(msg, right); b.append(row);
        });
        b.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      function finish() {
        wrap.append(el("section", { cls: "card drill-fin" }, el("b", { text: "🎉 Erro corrigido: " + L.title + "!" }),
          el("p", { cls: "small", text: "Se você acertou o seu erro, ele conta como acerto de hoje. Acerte de novo outro dia e ele sai da sua lista." }),
          el("button", { cls: "btn", type: "button", text: "← Voltar pro Treinar", onclick: home })));
        wrap.lastChild.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      s1();
    }).catch(function () { root.replaceChildren(el("section", { cls: "card" }, el("p", { text: "Não consegui abrir a lição agora. Tente de novo daqui a pouco." }), el("button", { cls: "btn", type: "button", text: "← Voltar", onclick: home }))); });
  }

  function homeCore() {
    var c = counts();
    root.replaceChildren(header());
    if (!c.total) { root.append(el("section", { cls: "card" }, el("p", { text: "Ainda não tem erro pra treinar. Assim que você concluir uma lição, o que você errou aparece aqui. 😉" }))); return; }
    if (!c.left) { root.append(el("section", { cls: "card" }, el("p", { text: "Você corrigiu tudo! 🏆 Depois da próxima lição aparecem erros novos pra treinar." }))); return; }
    if (!c.todo) {
      root.append(el("section", { cls: "card" }, el("b", { text: "✅ Por hoje é isso!" }), el("p", { cls: "small", text: "Você já acertou hoje todos os erros que faltavam. Volte amanhã pra confirmar: aí eles saem da lista. 🔥" })));
      return;
    }
    var n = Math.min(ROUND, c.todo);
    root.append(el("section", { cls: "card drill-start" },
      el("p", { html: D.clean ? "Rodada de <b>" + n + " exercícios</b> · uns 5 min" : "Uma rodada tem <b>" + n + " exercícios</b> (uns 5 minutos): ouvir e escrever, falar do jeito certo e repetir. Faça quantas quiser." }),
      el("button", { cls: "btn", type: "button", text: "▶ Começar a rodada", onclick: function () { run(pick()); } })));
  }

  function save(it) {
    if (hitToday(it)) return;
    it.hits.push(today);
    if (D.prof) return; // modo professor: não grava nada
    fetch("/api/licao/" + D.slug + "/treino", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lessonId: it.lessonId, itemId: it.id }) }).catch(function () {});
  }

  function audioBtns(it, onEnd) {
    var a = new Audio();
    if (onEnd) a.addEventListener("ended", onEnd);
    function go(src, rate) { a.src = FILE(src); a.playbackRate = rate; a.play().catch(function () {}); }
    return el("div", { cls: "tr-play" },
      el("button", { cls: "btn mini", type: "button", text: "🔊 Ouvir", onclick: function () { go(it.audio, 1); } }),
      el("button", { cls: "soft", type: "button", text: "🐢 Devagar", onclick: function () { it.slow ? go(it.slow, 1) : go(it.audio, 0.75); } }));
  }
  // leva a tela direto pro exercício (a barra de cima é fixa)
  function toRoot() { var y = root.getBoundingClientRect().top + window.scrollY - 70; window.scrollTo(0, Math.max(0, y)); }
  function msgEl() { return el("p", { cls: "msg", hidden: "" }); }
  function say(node, txt, good) { node.textContent = txt; node.hidden = false; node.className = "msg " + (good ? "good" : "bad"); }

  // 🎙️ GRAVAÇÃO ESTILO WHATSAPP (Thiago 27/11: "tudo que for de áudio precisa ter esse padrão: gravar, pausar,
  // reouvir, com barrinha"): toca pra gravar (barrinha + tempo) → toca pra finalizar → ouve/pausa a própria voz
  // (barrinha) → 🔁 regravar (até 3x) ou ✅ enviar. A página lê a fala enquanto grava, quando o celular deixa.
  var WA = !!D.wa, MAXSEC = 20, MAXREDO = 3;
  function mm(t) { t = Math.max(0, Math.round(t)); return Math.floor(t / 60) + ":" + String(t % 60).padStart(2, "0"); }
  function waRecorder(target, msg, done) {
    var box = el("div", { cls: "wa-rec" }), redo = 0, stream = null, rec = null, sr = null, chunks = [], heard = [], t0 = 0, tick = null, url = null;
    var recBtn = el("button", { cls: "btn wa-go", type: "button", text: "🎤 Toque pra gravar" });
    var live = el("div", { cls: "wa-live", hidden: "" }, el("div", { cls: "mb-top" }, el("span", { text: "🔴 Gravando…" }), el("span", { cls: "mb-tm", text: "0:00" })), el("div", { cls: "mb-track" }, el("i")), el("p", { cls: "small", text: "Toque no botão de novo pra FINALIZAR ⏹" }));
    var review = el("div", { cls: "wa-review", hidden: "" });
    box.append(recBtn, live, review);
    Object.defineProperty(box, "disabled", { get: function () { return recBtn.disabled; }, set: function (v) { recBtn.disabled = v; } });
    function reset() { review.hidden = true; review.replaceChildren(); recBtn.hidden = false; recBtn.disabled = false; recBtn.textContent = "🎤 Toque pra gravar"; recBtn.classList.remove("live"); }
    function start() {
      if (!navigator.mediaDevices || !window.MediaRecorder) { say(msg, "Seu navegador não grava áudio. Fale em voz alta 3 vezes e toque em 👀 pra conferir."); return; }
      recBtn.disabled = true; recBtn.textContent = "⏳ Abrindo o microfone…";
      navigator.mediaDevices.getUserMedia({ audio: true }).then(function (st) {
        stream = st; chunks = []; heard = [];
        rec = new MediaRecorder(st); rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
        rec.onstop = stopped; rec.start();
        if (SpeechRec) { try { sr = new SpeechRec(); sr.lang = "en-US"; sr.continuous = true; sr.interimResults = false; sr.maxAlternatives = 3;
          sr.onresult = function (e) { for (var k = e.resultIndex; k < e.results.length; k++) if (e.results[k].isFinal) heard.push([].slice.call(e.results[k]).map(function (x) { return x.transcript; })); };
          sr.onerror = function () {}; sr.start(); } catch (e) { sr = null; } }
        t0 = Date.now(); recBtn.disabled = false; recBtn.textContent = "⏹ Toque pra FINALIZAR"; recBtn.classList.add("live"); live.hidden = false; say(msg, "");
        msg.hidden = true;
        var fill = live.querySelector("i"), tm = live.querySelector(".mb-tm");
        tick = setInterval(function () { var s2 = (Date.now() - t0) / 1000; tm.textContent = mm(s2) + " / " + mm(MAXSEC); fill.style.width = Math.min(100, s2 / MAXSEC * 100) + "%"; if (s2 >= MAXSEC) stop(); }, 200);
      }).catch(function () { reset(); say(msg, "O celular não deixou usar o microfone. Libere o microfone pra esta página e tente de novo."); });
    }
    function stop() { clearInterval(tick); recBtn.disabled = true; recBtn.textContent = "⏳ Salvando…"; try { if (sr) sr.stop(); } catch (e) {} setTimeout(function () { try { rec.stop(); } catch (e) {} }, 350); }
    function stopped() {
      try { stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
      live.hidden = true; recBtn.hidden = true; recBtn.classList.remove("live");
      if (url) URL.revokeObjectURL(url);
      url = URL.createObjectURL(new Blob(chunks, { type: (rec && rec.mimeType) || "audio/webm" }));
      // o que a página entendeu (junta as frases, escolhe a melhor alternativa)
      var said = heard.map(function (alts) { return alts[0]; }).join(" "), best = said ? match(said, target) : 0;
      heard.forEach(function (alts) { alts.forEach(function (t) { var p2 = match(t, target); if (p2 > best) { best = p2; said = t; } }); });
      var a = new Audio(url), fill = el("i"), tm = el("span", { cls: "mb-tm", text: "0:00" }), lab = el("span", { text: "🎧 A sua voz" });
      var pl = el("button", { cls: "btn mini", type: "button", text: "▶ Ouvir", onclick: function () { if (a.paused) { a.play().catch(function () {}); } else a.pause(); } });
      a.addEventListener("play", function () { pl.textContent = "⏸ Pausar"; lab.textContent = "🔊 Tocando a sua voz"; });
      a.addEventListener("pause", function () { pl.textContent = "▶ Ouvir"; lab.textContent = "⏸ Pausado"; });
      a.addEventListener("ended", function () { pl.textContent = "▶ Ouvir de novo"; lab.textContent = "✅ Terminou"; fill.style.width = "100%"; });
      a.addEventListener("timeupdate", function () { if (a.duration && isFinite(a.duration)) { fill.style.width = (a.currentTime / a.duration * 100) + "%"; tm.textContent = mm(a.currentTime) + " / " + mm(a.duration); } else tm.textContent = mm(a.currentTime); });
      var left = MAXREDO - redo;
      review.replaceChildren(
        el("div", { cls: "mini-bar" }, el("div", { cls: "mb-top" }, lab, tm), el("div", { cls: "mb-track" }, fill)),
        el("div", { cls: "pt-play" }, pl,
          left > 0 ? el("button", { cls: "soft", type: "button", text: "🔁 Regravar (" + left + ")", onclick: function () { a.pause(); redo++; reset(); start(); } }) : null,
          el("button", { cls: "btn", type: "button", text: "✅ Enviar este áudio", onclick: function () { a.pause(); send(said, best); } })),
        el("p", { cls: "small", text: said ? "📝 A página entendeu: \"" + said + "\"" : "Ouça a sua voz. Ficou bom? Envie. Se não, regrave." }));
      review.hidden = false;
    }
    function send(said, best) {
      review.hidden = true;
      if (!SpeechRec || !said) { done(true, said || "", 1); return; } // sem texto da fala: vale como treino feito
      var good = best >= 0.8;
      done(good, said, best);
      if (!good) { redo = 0; reset(); }
    }
    recBtn.addEventListener("click", function () { if (recBtn.classList.contains("live")) stop(); else start(); });
    return box;
  }

  // 🎤 fala uma vez e confere
  function speakBtn(target, msg, done) {
    if (WA) return waRecorder(target, msg, done);
    var b = el("button", { cls: "btn", type: "button", text: "🎤 Falar" });
    b.addEventListener("click", function () {
      var r = new SpeechRec(); r.lang = "en-US"; r.maxAlternatives = 3; r.interimResults = false;
      var got = false, old = "🎤 Falar";
      b.disabled = true; b.textContent = "⏳ Espere…";
      r.onstart = function () { b.textContent = "🔴 FALE AGORA!"; };
      r.onresult = function (e) {
        got = true;
        var alts = [].slice.call(e.results[0]).map(function (x) { return x.transcript; });
        var best = 0, bestT = alts[0] || "";
        alts.forEach(function (t) { var p = match(t, target); if (p > best) { best = p; bestT = t; } });
        done(best >= 0.8, bestT, best);
      };
      r.onerror = function () {};
      r.onend = function () { b.disabled = false; b.textContent = old; if (!got) say(msg, "Não ouvi. Toque e fale de novo, pertinho do celular."); };
      try { r.start(); } catch (e) { b.disabled = false; }
    });
    return b;
  }

  // ---------- 🎬 erro de CENA: aquecimento no mesmo trecho + prova com trechos NOVOS de outros vídeos ----------
  var ytReady = null;
  function loadYT() {
    if (ytReady) return ytReady;
    ytReady = new Promise(function (res) { if (window.YT && window.YT.Player) { res(window.YT); return; } window.onYouTubeIframeAPIReady = function () { res(window.YT); }; document.head.append(el("script", { src: "https://www.youtube.com/iframe_api" })); });
    return ytReady;
  }
  // um player coberto ("só ouvido") que toca só o pedaço [t, end], com barrinha de tempo
  function clipPlayer(c) {
    var holder = el("div"), cover = el("div", { cls: "cover" }, el("div", { cls: "cover-in" }, el("span", { cls: "cover-play", text: "🎧" }), el("span", { text: "Tela coberta — só ouvido" })));
    var wrap = el("div", { cls: "yt-wrap" }, holder, cover), player = null, stopAt = 0, onEnd = null, heard = false;
    var fill = el("i"), lab = el("span", { text: "Toque em ▶ pra ouvir" }), tm = el("span", { cls: "mb-tm", text: "0:00 / " + mm(c.end - c.t) });
    var bar = el("div", { cls: "mini-bar" }, el("div", { cls: "mb-top" }, lab, tm), el("div", { cls: "mb-track" }, fill));
    function withP(fn) {
      if (player && player.seekTo) { fn(player); return; }
      loadYT().then(function (YT) {
        player = new YT.Player(holder, { videoId: c.yt, playerVars: { start: Math.floor(c.t), controls: 0, disablekb: 1, rel: 0, playsinline: 1, modestbranding: 1 },
          events: { onReady: function () { try { player.unMute(); player.setVolume(100); } catch (e) {} fn(player); } } });
      });
    }
    var iv = setInterval(function () {
      if (!player || !player.getCurrentTime) return;
      var cur = player.getCurrentTime(), st = player.getPlayerState ? player.getPlayerState() : -1, len = Math.max(1, c.end - c.t), d = Math.min(len, Math.max(0, cur - c.t));
      fill.style.width = (d / len * 100) + "%"; tm.textContent = mm(d) + " / " + mm(len);
      if (stopAt && cur >= stopAt) { player.pauseVideo(); stopAt = 0; lab.textContent = "✅ Terminou"; if (!heard) { heard = true; if (onEnd) onEnd(); } }
      else if (stopAt) lab.textContent = st === 1 ? "🔊 Tocando…" : "⏳ Carregando…";
    }, 200);
    function play(rate) { withP(function (p) { p.setPlaybackRate(rate); p.seekTo(Math.max(0, c.t - 0.3), true); p.playVideo(); stopAt = c.end + 0.8; }); }
    var big = el("button", { cls: "btn pt-big pulse", type: "button", text: "▶ Ouvir o trecho", onclick: function () { big.classList.remove("pulse"); play(1); } });
    var slowB = el("button", { cls: "soft", type: "button", text: "🐢 Devagar", onclick: function () { play(0.75); } });
    return { box: el("div", { cls: "clip" }, wrap, big, slowB, bar), whenHeard: function (fn) { onEnd = fn; }, stop: function () { clearInterval(iv); try { player && player.pauseVideo(); } catch (e) {} } };
  }
  // opções aparecem ANTES de ouvir; só dá pra escolher depois de ouvir
  function choose(c, holderMsg, onPick) {
    var box = el("div", { cls: "pt-q" }, el("p", { cls: "pt-qt", html: "👂 <b>Qual destas frases ele fala?</b>" })), tries = 0, heard = false;
    var order = c.options.map(function (_, k) { return k; }); order = shuffle(order, Math.round(c.t * 7) + 3);
    order.forEach(function (k) {
      var b = el("button", { cls: "pt-opt wait", type: "button", text: c.options[k] });
      b.addEventListener("click", function () {
        if (b.disabled) return;
        if (!heard) { say(holderMsg, "🎧 Primeiro ouça o trecho no botão amarelo. Depois escolha."); return; }
        tries++;
        if (k === c.answer) { b.classList.add("ok"); [].forEach.call(box.querySelectorAll(".pt-opt"), function (o) { o.disabled = true; }); onPick(true, tries, null); }
        else { b.classList.add("bad"); b.disabled = true; onPick(false, tries, c.options[k]); }
      });
      box.append(b);
    });
    return { box: box, unlock: function () { heard = true; [].forEach.call(box.querySelectorAll(".pt-opt.wait"), function (o) { o.classList.remove("wait"); }); } };
  }
  function sceneEx(it, box, bar, msg, nextBtn, result) {
    var S = it.scene, nv = (it.novos || []).slice(), clips = [];
    box.append(bar, el("h3", { text: "🎬 Erro de cena: treinar o ouvido" }),
      el("p", { cls: "small", html: "Você errou este trecho na cena. <b>1º</b> você volta nele pra aquecer. <b>2º</b> vem um trecho <b>NOVO</b>, de outro vídeo de nativo, com a mesma dificuldade: <b>é ele que vale</b>." }));
    // 1. aquecimento
    var w = el("div", { cls: "sc-step" }, el("b", { text: "🔁 1. Aquecimento: o trecho que você errou" }), S.context ? el("p", { cls: "small", text: "🎬 " + S.context }) : null);
    var wmsg = msgEl(), cp = clipPlayer(S); clips.push(cp);
    var ch = choose(S, wmsg, function (ok, tries, wrong) {
      if (!ok) { say(wmsg, "❌ Não foi essa. Ouça de novo (pode usar o 🐢) e tente outra."); return; }
      var why = el("div", { cls: "sc-why" }, el("p", { html: "📝 <b>Ele fala:</b> " }), el("p", { cls: "small", html: "<b>" + S.tipoNome + "</b>" + (S.troca ? " · você precisa diferenciar <b></b>" : "") }), el("p", { cls: "small", text: "💡 " + S.dica }));
      why.firstChild.append(it.en); if (S.troca) why.children[1].querySelector("b:last-child").textContent = S.troca;
      say(wmsg, "✅ Isso! Agora vamos ver se o ouvido pegou mesmo, com um trecho que você nunca ouviu.", true);
      w.append(why); prova();
    });
    cp.whenHeard(ch.unlock);
    w.append(el("p", { cls: "small", text: "👀 Leia as 3 frases, depois toque no botão amarelo." }), ch.box, cp.box, wmsg);
    box.append(w, msg, nextBtn);
    // 2. a prova: trecho novo
    var round = 0;
    function prova() {
      var c = nv.shift();
      if (!c) { result(false, "Acabaram os trechos novos por hoje."); return; }
      round++;
      var pmsg = msgEl(), cp2 = clipPlayer(c); clips.push(cp2);
      var p = el("div", { cls: "sc-step sc-new" }, el("b", { text: "🆕 2. A prova: trecho NOVO" + (round > 1 ? " (" + round + "º)" : "") }),
        el("p", { cls: "small", text: "🎬 " + (c.context || "Outro vídeo, com nativo falando.") + " · nível " + c.level }));
      var ch2 = choose(c, pmsg, function (ok, tries) {
        if (!ok) { say(pmsg, "❌ Não foi essa. Ouça de novo e tente outra."); return; }
        var txt = el("p", { cls: "small" }, "📝 " + c.en); p.append(txt);
        if (tries === 1) { say(pmsg, "🎉 Acertou de primeira um trecho que você nunca tinha ouvido! O seu ouvido pegou.", true); clips.forEach(function (x) { x.stop(); }); result(true); }
        else if (nv.length) { say(pmsg, "Quase: você acertou na " + tries + "ª tentativa. Vamos com mais um trecho novo pra confirmar.", false); prova(); }
        else { say(pmsg, "Você chegou lá, mas não de primeira. Esse erro volta outro dia com outro trecho.", false); clips.forEach(function (x) { x.stop(); }); result(false); }
      });
      cp2.whenHeard(ch2.unlock);
      p.append(ch2.box, cp2.box, pmsg);
      box.insertBefore(p, msg); p.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function run(list) {
    var i = 0, right = 0;
    function next() {
      if (i >= list.length) return finish();
      var it = list[i], box = el("section", { cls: "card drill-ex" });
      var bar = el("div", { cls: "drill-step" }, el("span", { text: (i + 1) + " de " + list.length }), el("span", { cls: "drill-from", text: it.where || ("da lição de " + it.date.slice(8, 10) + "/" + it.date.slice(5, 7)) }));
      var nextBtn = el("button", { cls: "btn", type: "button", text: i + 1 < list.length ? "Próximo →" : "Ver resultado →", hidden: "", onclick: function () { i++; next(); } });
      var msg = msgEl();
      function result(ok, extra) {
        if (ok) { right++; save(it); }
        var d = days(it);
        say(msg, ok ? (d >= MASTER ? "✅ Acertou! Esse erro está corrigido e saiu da lista. 🎯" : "✅ Acertou! Acerte de novo outro dia e ele sai da lista.") : "Quase! " + (extra || "") + " Esse volta numa próxima rodada.", ok);
        nextBtn.hidden = false;
      }
      if (it.kind === "scene") { sceneEx(it, box, bar, msg, nextBtn, result); root.replaceChildren(box); toRoot(); return; }
      var listenMode = it.kind === "listen";
      var speak = SpeechRec && (it.skill === "falar") ;
      if (listenMode && !speak) {
        // 🎧 ouça e escreva
        var ta = el("textarea", { rows: "2", placeholder: "Escreva o que ouviu…" });
        var ans = el("p", { cls: "drill-ans", hidden: "" });
        var chk = el("button", { cls: "btn", type: "button", text: "Conferir", onclick: function () {
          if (words(ta.value).length < 2) { say(msg, "Escreva o que ouviu antes de conferir."); return; }
          var p = match(ta.value, it.en); ta.disabled = true; chk.disabled = true;
          ans.hidden = false; ans.textContent = "✅ " + it.en + (it.pt ? "  ·  🇧🇷 " + it.pt : "");
          result(p >= 0.8, "Você pegou " + Math.round(p * 100) + "% das palavras.");
        } });
        box.append(bar, el("h3", { text: "🎧 Ouça e escreva" }), el("p", { cls: "small", text: "Ouça (quantas vezes quiser) e escreva tudo o que ouviu." }), audioBtns(it), ta, chk, ans, msg, nextBtn);
      } else if (listenMode) {
        // 🎤 ouça e repita
        var t = el("div", { cls: "sh-text", text: it.en, style: "filter:blur(6px)" });
        var sb = speakBtn(it.en, msg, function (ok, said, p) { sb.disabled = ok; result(ok, "A página ouviu: \"" + said + "\" (" + Math.round(p * 100) + "%)."); if (!ok) sb.disabled = false; });
        sb.disabled = true;
        box.append(bar, el("h3", { text: "🎤 Ouça e repita" }), el("p", { cls: "small", text: "Ouça a frase; depois ela aparece. Repita igualzinho, no mesmo ritmo." }),
          audioBtns(it, function () { t.style.filter = ""; sb.disabled = false; }), t, sb, msg, nextBtn);
      } else {
        // ❌ erro → forma certa (falando ou escrevendo)
        var rightEl = el("b", { cls: "drill-ans", hidden: "", text: "✅ " + it.en });
        var head = [bar, el("h3", { text: speak ? "🎤 Fale do jeito certo" : "✍️ Escreva do jeito certo" }),
          it.said ? el("p", { cls: "drill-said", html: "❌ <s></s>" }) : null, it.why ? el("p", { cls: "small", text: "💡 " + it.why }) : null];
        if (head[2]) head[2].querySelector("s").textContent = it.said;
        box.append.apply(box, head.filter(Boolean));
        if (speak) {
          var peek = el("button", { cls: "ghost", type: "button", text: "👀 Ver a resposta (aí não conta)", onclick: function () { rightEl.hidden = false; peek.remove(); sp.remove(); result(false, "Leia a forma certa em voz alta 3 vezes."); } });
          var sp = speakBtn(it.en, msg, function (ok, said, p) {
            if (ok) { rightEl.hidden = false; sp.remove(); if (peek.parentNode) peek.remove(); result(true); }
            else say(msg, "A página ouviu: \"" + said + "\" (" + Math.round(p * 100) + "%). Tente de novo ou toque em 👀.");
          });
          box.append(sp, peek, rightEl, msg, nextBtn);
        } else {
          var inp = el("textarea", { rows: "2", placeholder: "Escreva a frase do jeito certo…" });
          var ck = el("button", { cls: "btn", type: "button", text: "Conferir", onclick: function () {
            if (words(inp.value).length < 1) { say(msg, "Escreva antes de conferir."); return; }
            var p = match(inp.value, it.en); inp.disabled = true; ck.disabled = true; rightEl.hidden = false;
            result(p >= 0.9, "Compare com a forma certa.");
          } });
          box.append(inp, ck, rightEl, msg, nextBtn);
        }
      }
      root.replaceChildren(box);
      toRoot();
    }
    function finish() {
      var c = counts();
      root.replaceChildren(header(), el("section", { cls: "card drill-fin" },
        el("b", { text: "🎉 Rodada feita! Você acertou " + right + " de " + list.length + "." }),
        el("p", { cls: "small", text: right ? "Os acertos de hoje contam pros 🔥 dias seguidos e dão XP quando o erro sai da lista. Isso não muda nota nenhuma." : "Errar aqui faz parte: é treino. Esses erros voltam numa próxima rodada." }),
        c.todo ? el("button", { cls: "btn", type: "button", text: "▶ Mais uma rodada", onclick: function () { run(pick()); } }) : el("p", { text: "✅ Por hoje é isso! Volte amanhã pra confirmar o que você acertou." }),
        el("button", { cls: "soft", type: "button", text: "Voltar", onclick: home })));
      toRoot();
    }
    next();
  }
  home();
})();
