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
  var DATA = "/aprender/data/", AUD = "/aprender/audio/", LVL = "a1";
  var Q = new URLSearchParams(location.search);
  // 👩‍🏫 MODO PROFESSOR (?professor=1): progresso separado (começa como aluno novo), nunca mexe no progresso de verdade
  var PROF = Q.get("professor") === "1";
  function PK(k) { return PROF ? "prof:" + k : k; }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  var KEY = PROF ? "academia:professor" : "academia:v1";
  var ALL = Q.get("tudo") === "1" || (PROF && lsGet("prof:tudo") === "1"); // tudo aberto
  // ✨ tema premium (estética do inglescomjoaquim.com): ?tema=premium liga, ?tema=classico volta
  (function () { var t = Q.get("tema"); try { if (t) localStorage.setItem("destravando:tema", t); t = localStorage.getItem("destravando:tema") || t; } catch (e) {} if (t !== "classico") document.body.classList.add("premium"); })(); // premium é o padrão desde 27/11 (aprovado pelo Thiago)

  // ---------- helpers ----------
  // nunca escrever "null"/"undefined"/"false" na tela: o append nativo transforma isso em texto (achado no pente-fino de 28/11)
  (function () { var nat = Element.prototype.append; if (nat.__dtv) return; var safe = function () { return nat.apply(this, [].filter.call(arguments, function (x) { return x != null && x !== false && x !== ""; })); }; safe.__dtv = true; Element.prototype.append = safe; })();
  // 💡 EXPLICAÇÃO DE CADA EXERCÍCIO (Thiago 29/11: "ele não sabe o que é Real Time"): aparece na 1ª vez, depois só no "O que é isso?"
  var EXPL = {
    aula: ["As frases que você mais vai usar nesse tema, com áudio e tradução.", ["Ouça quantas vezes quiser", "Entenda pela tradução", "Fale em voz alta (ou digite)"], "São as peças que você vai usar na vida real. Sem decoreba: em contexto."],
    cena: ["Um trecho de verdade: série, vlog, entrevista na rua. Nada de áudio de livro.", ["A tela fica coberta: primeiro só ouvindo", "Você responde o que entendeu e completa o pedaço difícil", "Depois assiste com a imagem"], "É assim que o seu ouvido acostuma com o inglês rápido, com sotaque e tudo."],
    fofoca: ["Uma historinha da vizinhança, contada por um nativo. Sim, fofoca. 😏", ["Ouça a história", "Responda umas perguntas rápidas", "Reconte com as suas palavras, gravando"], "Contar com as suas palavras é o que destrava a conversa."],
    shadow: ["Shadowing é repetir colado no nativo, no mesmo ritmo, como se fosse a sombra dele.", ["Ouça a frase", "Repita junto, imitando a musiquinha", "Compare e repita de novo"], "Treina pronúncia, ritmo e o jeito que o nativo emenda as palavras."],
    rt: ["Real Time é responder na hora, como numa conversa de verdade.", ["Aparece uma frase em português", "Você fala em inglês antes do tempo acabar", "Sem tempo de traduzir na cabeça: é aí que destrava"], "Na vida real ninguém espera você montar a frase. Aqui você treina isso."],
    leitura: ["Você lê um trecho em voz alta e as palavras ficam verdes quando saem claras.", ["Toque no microfone", "Leia com calma", "O que ficar sem verde, tente de novo"], "Treina pronúncia clara e confiança pra falar."],
    ditado: ["Você ouve frases emendadas e escreve tudo o que ouviu.", ["Ouça (pode repetir)", "Escreva do jeito que entendeu", "Confira o que escapou"], "Ensina o ouvido a separar as palavras que o nativo gruda."],
    lacuna: ["O nativo fala e falta um pedaço da frase.", ["Ouça", "Toque nas palavras que faltam", "Confira na hora"], "Treina pegar os detalhes que fazem diferença."],
    grudada: ["O que o nativo engole: wanna, gonna, whaddaya…", ["Ouça como ele fala de verdade", "Escolha o que ele quis dizer", "Compare com o jeito escrito"], "Sem isso, o inglês de série parece outra língua."],
    pares: ["Qual você ouviu? 13 ou 30? Live ou leave?", ["Ouça", "Escolha a palavra certa", "Ouça as duas pra sentir a diferença"], "Afina o ouvido pros sons que o brasileiro confunde."],
    contar: ["Quantas palavras tem nessa fala? Parece fácil… até ouvir.", ["Ouça", "Conte as palavras", "Veja onde cada uma acaba"], "Ensina o ouvido a achar onde uma palavra termina e a outra começa."],
    erros: ["O que você errou volta aqui até você acertar.", ["Refaça o que escapou", "Acertou 2 vezes em dias diferentes? Sai da lista"], "Erro não é vergonha: é o mapa do que falta."]
  };
  function explainSt(st, force) {
    var E = EXPL[st], X = ST[st]; if (!E || !X) return;
    S.seenSt = S.seenSt || {}; if (S.seenSt[st] && !force) return; S.seenSt[st] = 1; persist();
    var ol = el("ol", { cls: "ex-how" }); E[1].forEach(function (t) { ol.append(el("li", { text: t })); });
    var card = el("div", { cls: "fb-card ex-card", style: "--stc:" + (STC[st] || "#6F2A3D") }, el("span", { cls: "ex-ic" }, icn(STICN[st] || "alvo")), el("span", { cls: "eyebrow", text: force ? "O que é isso?" : "Primeira vez aqui" }), el("h2", { text: X.name }),
      el("p", { cls: "ex-what", text: E[0] }), el("b", { cls: "ex-sub", text: "Como funciona" }), ol, el("p", { cls: "ex-why" }, el("b", { text: "Por que treinar isso: " }), document.createTextNode(E[2])),
      el("button", { cls: "btn big gold", type: "button", text: "Entendi, bora!", onclick: function () { close(); } }));
    var ov = el("div", { cls: "fb-ov", onclick: function (e) { if (e.target === ov) close(); } }, card);
    function close() { ov.remove(); }
    document.body.append(ov); sheetify(ov, card, close);
  }
  // 🎨 ÍCONES DE TRAÇO (Thiago 29/11: "o mais profissional e sofisticado possível"): emoji fica só no humor
  var SVGA = '<svg viewBox="0 0 24 24" aria-hidden="true">', SVGZ = '</svg>';
  var ICN = {
    fogo: '<path d="M12 21c-4 0-6.5-2.7-6.5-6.2 0-3.6 2.6-5.4 3.6-8.3.5 1.7 1.6 2.8 2.7 3.2-.3-2.6.9-5.3 3.4-6.7-.4 2.9 1.2 4.6 2.6 6.2 1.4 1.6 2.2 3.3 2.2 5.6C20 18.3 16.6 21 12 21z"/>',
    xp: '<path d="M12 3.2l2.5 5.4 5.9.7-4.4 4 1.2 5.8L12 16.2 6.8 19.1 8 13.3l-4.4-4 5.9-.7z"/>',
    som: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
    mudo: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>',
    ajuda: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.3a2.5 2.5 0 1 1 3.4 2.3c-.7.3-1 .8-1 1.5v.4"/><circle cx="12" cy="16.9" r=".6" fill="currentColor"/>',
    pausa: '<rect x="6.5" y="5" width="3.5" height="14" rx="1.2"/><rect x="14" y="5" width="3.5" height="14" rx="1.2"/>',
    check: '<path d="M5 12.5l4.2 4.2L19 7"/>',
    chave: '<circle cx="8" cy="15" r="4"/><path d="M11 12l8-8M16 7l2 2M14 9l2 2"/>',
    cena: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M7 6l2 4M12 6l2 4M17 6l2 4"/>',
    fofoca: '<path d="M4 5h16v10H9l-5 4z"/><path d="M8 9h8M8 12h5"/>',
    repetir: '<path d="M17 3l3 3-3 3"/><path d="M4 11V9a3 3 0 0 1 3-3h13"/><path d="M7 21l-3-3 3-3"/><path d="M20 13v2a3 3 0 0 1-3 3H4"/>',
    raio: '<path d="M13 3L5 13.5h6L10 21l8-10.5h-6z"/>',
    livro: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5"/>',
    lapis: '<path d="M15.5 4.5l4 4L8 20H4v-4z"/><path d="M13.5 6.5l4 4"/>',
    peca: '<path d="M9 3h6v3a2 2 0 1 0 4 0h2v6h-3a2 2 0 1 0 0 4h3v5H3V3h6"/>',
    elo: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    alvo: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
    hash: '<path d="M5 9h15M4 15h15M10 3 8 21M16 3l-2 18"/>',
    revisar: '<path d="M20 12a8 8 0 1 1-2.4-5.7"/><path d="M20.3 3.8v4.7h-4.7"/>'
  };
  function icn(k, cls) { var x = document.createElement("span"); x.className = "icn" + (cls ? " " + cls : ""); x.innerHTML = SVGA + (ICN[k] || "") + SVGZ; return x; }
  // 🎨 uma cor pra cada exercício (paleta própria que conversa com dourado e marsala)
  var STC = { aula: "#B8871F", cena: "#2F6F7A", fofoca: "#C0653B", shadow: "#5F8A64", rt: "#A33352", leitura: "#6D4C7D", ditado: "#3F5E94", lacuna: "#A8742A", grudada: "#2E7A6B", pares: "#8B4F86", contar: "#56708A", erros: "#8E3A52" };
  var STICN = { aula: "chave", cena: "cena", fofoca: "fofoca", shadow: "repetir", rt: "raio", leitura: "livro", ditado: "lapis", lacuna: "peca", grudada: "elo", pares: "alvo", contar: "hash", erros: "revisar" };
  var EMOJI0 = /^(?:[\u{1F000}-\u{1FAFF}\u{2190}-\u{21FF}\u{2300}-\u{23FF}\u{25A0}-\u{25FF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{1F1E6}-\u{1F1FF}][\uFE0F\u200D\u{1F3FB}-\u{1F3FF}]*\s*)+/u;
  function noEmo(t) { var r = String(t).replace(EMOJI0, ""); return r.trim() ? r : t; }
  function el(tag, attrs) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      var v = attrs[k];
      if (v == null || v === false) continue;
      if (k === "text") e.textContent = (tag === "h1" || tag === "h2" || / (eyebrow|sec)( |$)/.test(" " + (attrs.cls || "") + " ")) && !/keep-emo/.test(attrs.cls || "") ? noEmo(v) : v;
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
  // embaralha sempre igual no mesmo dia (pra pausar/continuar cair no mesmo item)
  function dayShuffle(a, salt) {
    var seed = 0, k = today() + salt; for (var z = 0; z < k.length; z++) seed = (seed * 31 + k.charCodeAt(z)) >>> 0;
    a = a.slice(); for (var i = a.length - 1; i > 0; i--) { seed = (seed * 1103515245 + 12345) >>> 0; var j = seed % (i + 1); var t = a[i]; a[i] = a[j]; a[j] = t; } return a;
  }
  function today() { var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  var HAP = null;
  function buzz(p) { try { if (navigator.vibrate) { navigator.vibrate(p); return; }
      if (/iPhone|iPad/.test(navigator.userAgent)) { if (!HAP) { var inp = el("input", { type: "checkbox", switch: true, id: "dtv-hap", tabindex: "-1", "aria-hidden": "true" }); HAP = el("label", { for: "dtv-hap", cls: "hap" }, inp); document.body.append(HAP); } HAP.click(); }
    } catch (e) {} }
  function skel() { return el("div", { cls: "skel", "aria-label": "Carregando" }, el("i"), el("i"), el("i")); }

  // ---------- progresso ----------
  var S = (function () { try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { return null; } })() || {};
  // nível (A1 / A2): cada nível tem o seu conteúdo e o seu ponto na trilha
  // nível (A1 / A2 / B1): cada nível tem a sua pasta em /aprender/<nível>/
  LVL = ["a2", "b1", "b2"].indexOf(S.level) > -1 ? S.level : "a1";
  if (LVL !== "a1") { DATA = "/aprender/" + LVL + "/data/"; AUD = "/aprender/" + LVL + "/audio/"; }
  S.byLevel = S.byLevel || {};
  function setLevel(lv) {
    if (lv === LVL) return;
    S.byLevel[LVL] = { theme: S.theme, daily: S.daily, dailyDone: S.dailyDone, paused: S.paused };
    var B = S.byLevel[lv] || {};
    S.theme = B.theme || 0; S.daily = B.daily || null; S.dailyDone = B.dailyDone || null; S.paused = B.paused || null;
    S.level = lv; persist(); location.reload();
  }
  var A2_READY = true; // liga quando o conteúdo do A2 estiver publicado
  function a2Open() { return A2_READY && (ALL || S.level === "a2" || S.level === "b1" || S.level === "b2" || (S.test && S.test.band >= 3) || S.a1Done); }
  var B1_READY = true; // ✅ B1 e B2 liberados pra todos em 28/11/2026 (Thiago: "pode subir")
  function b1Open() { return B1_READY && (ALL || S.level === "b1" || S.level === "b2" || S.a2Done); }
  var B2_READY = B1_READY; // B1 e B2 ficam prontos juntos
  function b2Open() { return B2_READY && (ALL || S.level === "b2" || S.b1Done); }
  // 🎓 teste final por nível (A1→A2, A2→B1, B1→B2): cada nível guarda a sua tentativa
  var NEXT_LV = { a1: "a2", a2: "b1", b1: "b2" }, DONE_KEY = { a1: "a1Done", a2: "a2Done", b1: "b1Done" };
  var FS = LVL === "a1" ? "finalSave" : "finalSave_" + LVL, FL = LVL === "a1" ? "finalLast" : "finalLast_" + LVL;
  function hasFinal() { return LVL === "a1" || ((LVL === "a2" || LVL === "b1") && B1_READY); }
  var LV_LABEL = { a1: "A1 · Básico", a2: "A2 · Pré-intermediário", b1: "B1 · Intermediário", b2: "B2 · Intermediário superior" };
  S.done = S.done || {};     // "est:uid:v" -> {n, best, last}
  S.errors = S.errors || []; // [{uid, kind, en, pt, file}]
  S.days = S.days || []; S.xp = S.xp || 0;
  // ☁️ sincronização entre aparelhos (pente-fino 28/11): cada gravação leva a hora; no boot, o app compara com a conta antes de mandar qualquer coisa
  var LOCAL_SAVED = S.savedAt || 0, SYNCED = false;
  function persist() { S.savedAt = Date.now(); try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} schedulePush(); }
  function markDay() { var t = today(); if (S.days.indexOf(t) < 0) { S.days.push(t); S.days = S.days.slice(-120); S.litNow = t; } }
  // 🏖️ férias (Thiago 28/11): dias de férias não apagam a ofensiva (nem contam)
  function onVacation(iso) { return (S.ferias || []).some(function (f) { return iso >= f.from && iso <= f.to; }); }
  function streak() {
    var n = 0, d = new Date(), guard = 0;
    for (; guard < 2000; guard++) { var iso = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
      if (S.days.indexOf(iso) > -1) { n++; d.setDate(d.getDate() - 1); } else if (onVacation(iso) || (n === 0 && iso === today())) { d.setDate(d.getDate() - 1); } else break; }
    return n;
  }
  // 🎙️ RECADOS DO JOAQUIM (voz real, gravados 28/11): 1 boas-vindas · 2 terceiro dia · 3 sete dias seguidos · 4 passou de nível · 5 voltou depois de sumir.
  // Aparece na tela inicial no dia do momento (fica o dia todo, toca quando a pessoa quiser); cada um só uma vez (o 5, uma vez por volta).
  var RECADO = { 1: "Boas-vindas do Joaquim", 2: "Terceiro dia! 🎉", 3: "7 dias seguidos! 🔥", 4: "Você passou de nível! 🎓", 5: "Olha quem voltou 👀" };
  function recadoHoje() {
    var t = today(), R = S.recados || (S.recados = {});
    if (R.hoje && R.hoje.d === t) return R.hoje.n;
    var days = (S.days || []).filter(function (x) { return x !== t; }).sort(), n = 0;
    var last = days[days.length - 1], gap = last ? Math.round((new Date(t + "T12:00:00") - new Date(last + "T12:00:00")) / 86400000) : 0;
    var y = new Date(); y.setDate(y.getDate() - 1);
    if (R.pend === 4 && !R[4]) n = 4;
    else if (!days.length && !R[1]) n = 1;
    else if (gap >= 3 && R[5] !== last && !onVacation(isoOf(y))) { n = 5; R[5] = last; }
    else if (days.length === 2 && S.days.indexOf(t) < 0 && !R[2]) n = 2;
    else if (streak() >= 7 && !R[3]) n = 3;
    if (!n) return 0;
    if (n !== 5) R[n] = 1;
    if (n === 4) R.pend = 0;
    R.hoje = { n: n, d: t }; persist();
    return n;
  }
  function recadoCard(n) {
    if (!n) return null;
    return el("div", { cls: "card voz-jq recado" }, el("span", { cls: "eyebrow", text: "🎙️ Recado do Joaquim" }), el("b", { text: RECADO[n] }), player("/academia/voz/recado-" + n + ".mp3", { plain: true }));
  }
  function isoOf(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function brDate(iso) { var p = String(iso).split("-"); return p[2] + "/" + p[1]; }
  function vacationNow() { var t = today(); return (S.ferias || []).filter(function (f) { return t >= f.from && t <= f.to; })[0] || null; }
  function vacationBox() {
    var V = vacationNow();
    if (V) return el("div", { cls: "card vac on" }, el("b", { text: "🏖️ De férias até " + brDate(V.to) }), el("p", { cls: "small", text: "Sua ofensiva de " + streak() + (streak() === 1 ? " dia" : " dias") + " tá guardada. Aproveita! Quer voltar antes? Pode treinar normalmente." }),
      el("button", { cls: "linkish", type: "button", text: "Encerrar as férias agora", onclick: function () { var y = new Date(); y.setDate(y.getDate() - 1); V.to = isoOf(y); if (V.to < V.from) S.ferias = S.ferias.filter(function (x) { return x !== V; }); persist(); home(); } }));
    var form = el("div", { cls: "vac-form", hidden: true }), t1 = new Date(); t1.setDate(t1.getDate() + 1); var t2 = new Date(); t2.setDate(t2.getDate() + 7);
    var a = el("input", { type: "date", value: isoOf(t1), min: today() }), b = el("input", { type: "date", value: isoOf(t2), min: today() }), info = el("p", { cls: "small" });
    function upd() { var n = Math.round((new Date(b.value) - new Date(a.value)) / 86400000) + 1; info.textContent = !a.value || !b.value || n < 1 ? "Escolha as datas." : n > 31 ? "Máximo de 31 dias por vez." : "🏖️ " + n + (n === 1 ? " dia" : " dias") + " de férias: a ofensiva fica guardada."; return n; }
    a.addEventListener("change", upd); b.addEventListener("change", upd); upd();
    form.append(el("div", { cls: "vac-help" },
        el("b", { text: "🏖️ O que são as férias?" }),
        el("p", { text: "Vai viajar, tá numa semana puxada ou só precisa descansar? Marque as datas. Nesses dias a sua ofensiva 🔥 fica congelada: não aumenta, mas também não apaga. Quando voltar, continua de onde parou." }),
        el("p", { text: "Pode tirar até 31 dias por vez. Se quiser treinar no meio das férias, pode: nada muda." }),
        el("p", { cls: "small", text: "☕ Só quer parar uns minutos no meio de um exercício? Não precisa de férias: use o botão ☕ Pausar, no topo de cada exercício. Ele guarda exatamente onde você parou." })),
      el("label", { cls: "fld" }, el("span", { cls: "fld-l", text: "De" }), a), el("label", { cls: "fld" }, el("span", { cls: "fld-l", text: "Até" }), b), info,
      el("button", { cls: "btn", type: "button", text: "Confirmar férias", onclick: function () { var n = upd(); if (n < 1 || n > 31) return; S.ferias = (S.ferias || []).concat([{ from: a.value, to: b.value }]); persist(); notice("🏖️ Férias marcadas! Sua ofensiva fica guardada até " + brDate(b.value) + "."); home(); } }));
    return el("div", { cls: "vac" }, el("button", { cls: "linkish", type: "button", text: "🏖️ Vai viajar ou descansar? Tirar férias sem perder a ofensiva", onclick: function () { form.hidden = !form.hidden; } }), form);
  }
  function dkey(st, uid, v) { return st + ":" + uid + ":" + v; }
  function record(st, uid, v, pct) {
    var k = dkey(st, uid, v), r = S.done[k] || { n: 0, best: 0 };
    r.n++; r.best = Math.max(r.best, pct); r.last = today(); S.done[k] = r;
    S.hist = (S.hist || []).concat([{ d: today(), st: st, p: Math.round(pct * 100) / 100 }]).slice(-40);
    var gain = Math.round(10 + pct * 20); S.xp += gain; S.xpByDay = S.xpByDay || {}; S.xpByDay[today()] = (S.xpByDay[today()] || 0) + gain;
    Object.keys(S.xpByDay).forEach(function (d) { if (d < new Date(Date.now() - 40 * 86400000).toISOString().slice(0, 10)) delete S.xpByDay[d]; });
    markDay(); persist();
  }
  function addError(e) {
    if (S.errors.some(function (x) { return x.en === e.en; })) return;
    S.errors.push(e); S.errors = S.errors.slice(-60); persist();
  }
  function lvlOfUid(uid) { return /^(b2u|geral4)/.test(uid || "") ? "b2" : /^(b1u|geral3)/.test(uid || "") ? "b1" : /^(a2u|geral2)/.test(uid || "") ? "a2" : "a1"; }
  function myErrors() { return S.errors.filter(function (e) { return lvlOfUid(e.uid) === LVL; }); }
  function fixError(en) {
    // erro sai da lista com acerto em 2 dias diferentes (igual ao homework)
    var gone = false;
    S.errors = S.errors.filter(function (x) {
      if (x.en !== en) return true;
      x.okDays = x.okDays || []; if (x.okDays.indexOf(today()) < 0) x.okDays.push(today());
      if (x.okDays.length >= 2) { gone = true; return false; } return true;
    });
    if (gone) S.fixed = (S.fixed || 0) + 1;
    persist(); return gone;
  }

  // ---------- conteúdo ----------
  var INDEX = null, U = {}, TEST = null;
  function j(url) { return fetch(url).then(function (r) { if (!r.ok) throw new Error(url); return r.json(); }); }
  function loadIndex() { return j(DATA + "index.json?v=" + (window.__v || 1)).then(function (x) { INDEX = x.units; return x; }); }
  function loadUnit(uid) { if (U[uid]) return Promise.resolve(U[uid]); return j(DATA + uid + ".json?v=" + (window.__v || 1)).then(function (x) { U[uid] = x; return x; }); }
  function loadTest() { if (TEST) return Promise.resolve(TEST); return j("/aprender/data/teste.json?v=" + (window.__v || 1)).then(function (x) { TEST = x; return x; }); }
  var OUV = null;
  function loadOuv() { if (OUV) return Promise.resolve(OUV); return j(DATA + "ouvido.json?v=" + (window.__v || 1)).then(function (x) { OUV = x; return x; }, function () { OUV = {}; return OUV; }); }
  var GERAL = { id: LVL === "b2" ? "geral4" : LVL === "b1" ? "geral3" : LVL === "a2" ? "geral2" : "geral", title: "Geral" }; // exercícios que não dependem do tema
  var GLOBAL_ST = { grudada: 1, pares: 1 };
  function af(u, key) { var f = u.audio && u.audio[key]; return f ? AUD + f : null; }
  function uidx(uid) { for (var i = 0; i < INDEX.length; i++) if (INDEX[i].id === uid) return i; return 0; }

  // as 3 variações de cada estação num tema (o que existe de verdade no conteúdo)
  function variations(u, st) {
    if (st === "aula") return u.lesson && u.lesson.chunks && u.lesson.chunks.length ? [{ label: "Frases-chave do tema" }] : [];
    if (st === "cena") {
      var a = [];
      function vl(v) { var t = String(v.source || "Vídeo real").replace(/\s*\(.*?\)\s*/g, " ").trim(); return /^[A-Za-zÀ-ú0-9]/.test(t) ? "🎬 " + t : t; }
      if (u.video) a.push({ kind: "video", v: u.video, label: vl(u.video) });
      if (u.lesson && u.lesson.audio) a.push({ kind: "audio", label: "🎧 Só áudio (sem imagem)" });
      (u.academia && u.academia.cenas || []).forEach(function (c) { a.push({ kind: "video", v: c, label: vl(c) }); });
      // Thiago 27/11: a cena tem que ser SEMPRE igual à do homework (em partes). Se o tema tem cena em partes, só elas aparecem.
      var withParts = a.filter(function (x) { return x.kind === "video" && partsOf(x.v); });
      if (withParts.length) a = withParts.map(function (x) { return { kind: "video", v: x.v, label: x.label }; });
      return a.slice(0, 7); // 7 cenas por tema (Thiago 27/11): uma por dia da semana
    }
    if (st === "ditado") return (u.gossips || []).slice(0, 5).map(function (g, i) { return { g: g, i: i, label: "Ditado: " + g.title }; });
    if (st === "leitura") return (u.gossips || []).slice(0, 5).map(function (g, i) { return { g: g, i: i, label: "Leitura: " + g.title }; });
    if (st === "fofoca") return (u.gossips || []).slice(0, 5).map(function (g, i) { return { g: g, i: i, label: g.title }; });
    if (st === "shadow") {
      var b = [{ list: (u.homework && u.homework.shadowing || []).map(function (s, k) { return { en: s.en, pt: s.pt, key: "sh" + k }; }), label: "Bloco 1 · devagar" }];
      (u.academia && u.academia.shadowing || []).forEach(function (blk, bi) { b.push({ list: blk.map(function (s, k) { return { en: s.en, pt: s.pt, key: "as" + bi + "_" + k }; }), label: "Bloco " + (bi + 2) + (bi ? " · ritmo de nativo" : " · normal") }); });
      return b.slice(0, 5);
    }
    if (st === "rt") return (u.realtimes || []).slice(0, 5).map(function (r, i) { return { r: r, i: i, label: r.title }; });
    if (st === "lacuna" || st === "contar") return (u.gossips || []).slice(0, 5).map(function (g, gi) {
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
  // 🔊 iPhone (Thiago 28/11: "do nada o áudio começou a ficar baixo"): depois que o microfone liga, o Safari fica no modo
  // "ligação" e o som sai baixinho. Quando o microfone desliga, volta pro modo "tocar" (navigator.audioSession, iOS 17+).
  var MIC_ON = 0;
  function audioMode(rec) { try { if (navigator.audioSession) navigator.audioSession.type = rec ? "play-and-record" : "playback"; } catch (e) {} }
  function micOn() { MIC_ON++; audioMode(true); }
  function micOff() { MIC_ON = Math.max(0, MIC_ON - 1); if (!MIC_ON) setTimeout(function () { if (!MIC_ON) audioMode(false); }, 150); }
  audioMode(false);
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
    a.addEventListener("error", function () { count.textContent = "⚠️ Não consegui tocar o áudio. Pode seguir."; if (opts.onEnd) opts.onEnd(1); });
    a.addEventListener("pause", function () { play.textContent = "▶"; });
    a.addEventListener("ended", function () {
      plays++; play.textContent = "↺";
      if (opts.max) { var left = opts.max - plays; count.textContent = left > 0 ? "Pode ouvir mais " + left + "x" : "Pronto, agora é com você"; if (left <= 0) play.disabled = true; }
      else count.textContent = "✅ Ouviu " + plays + (plays === 1 ? " vez" : " vezes");
      if (opts.onEnd) opts.onEnd(plays);
    });
    play.onclick = function () { if (a.paused) { stopAll(); if (!MIC_ON) audioMode(false); current = a; if (a.ended) a.currentTime = 0; a.play().catch(function () {}); } else a.pause(); };
    var tools = el("div", { cls: "ptools" });
    if ((!opts.max || opts.tools) && !opts.plain) {
      if (!opts.max) bar.onclick = function (e) { var r = bar.getBoundingClientRect(); if (a.duration) a.currentTime = (e.clientX - r.left) / r.width * a.duration; };
      tools.append(el("button", { type: "button", text: "⏪ 5 s", onclick: function () { a.currentTime = Math.max(0, a.currentTime - 5); a.play().catch(function () {}); } }),
        el("button", { type: "button", text: "🐢 0.75×", onclick: function (e) { slow = !slow; a.playbackRate = slow ? 0.75 : 1; e.currentTarget.textContent = slow ? "🐇 1×" : "🐢 0.75×"; e.currentTarget.classList.toggle("sel", slow); } }));
    }
    tools.append(count);
    var box = el("div", { cls: "player" }, el("div", { cls: "prow" }, play, bar), tools);
    box._audio = a;
    return box;
  }

  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;

  // ---------- telas ----------
  var TALKS = [];
  var BACKING = false, POPPING = false;
  function screen() { stopAll(); TALKS.splice(0).forEach(function (f) { try { f(); } catch (e) {} }); root.innerHTML = ""; window.scrollTo(0, 0);
    var w = el("main", { cls: "wrap " + (BACKING ? "enter-back" : "enter") }); root.append(w); BACKING = false;
    return w; }
  function topBar(back) {
    var s = streak();
    return el("header", { cls: "top" },
      back ? el("button", { cls: "back", type: "button", text: "‹ Voltar", onclick: back }) : el("span", { cls: "brand" }, el("img", { cls: "brand-ic", src: "/academia/app/icon-96.png", alt: "" }), el("span", { text: "Destravando" })),
      el("div", { cls: "stats" },
        CONTA_OK && !PROF ? el("button", { cls: "stat ico-btn", type: "button", "aria-label": "Achou um problema? Me conta", onclick: feedbackOpen }, icn("ajuda")) : null,
        el("span", { cls: "stat fire" + (S.days.indexOf(today()) > -1 ? " lit" : ""), title: "dias seguidos" }, icn("fogo"), el("span", { text: String(s) })), xpStat()));
  }
  // ✨ XP sobe contando quando aumentou desde a última vez que apareceu
  var XP_SHOWN = null;
  function xpStat() {
    var num = el("span", { text: String(S.xp) }), e = el("span", { cls: "stat xp", title: "XP · " + xpLevel().name }, icn("xp"), num), from = XP_SHOWN == null ? S.xp : XP_SHOWN, to = S.xp; XP_SHOWN = to;
    if (to > from) { num.textContent = String(from); e.classList.add("xp-up"); var t0 = null; requestAnimationFrame(function step(t) { if (!t0) t0 = t; var k = Math.min(1, (t - t0) / 700); num.textContent = String(Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3)))); if (k < 1) requestAnimationFrame(step); else setTimeout(function () { e.classList.remove("xp-up"); }, 400); }); }
    return e;
  }
  var SKILLS = {
    entender: { emoji: "👂", name: "Entender", st: "cena", good: "Você entende bem o que ouve.", bad: "Entender o nativo ainda é difícil pra você." },
    repetir: { emoji: "🔁", name: "Pronúncia e ritmo", st: "shadow", good: "Sua pronúncia acompanha bem.", bad: "Repetir frases longas ainda trava." },
    reagir: { emoji: "⚡", name: "Responder rápido", st: "rt", good: "Você responde sem travar.", bad: "Na hora de responder, você trava." },
    recontar: { emoji: "🗣️", name: "Falar com suas palavras", st: "fofoca", good: "Você consegue contar uma história.", bad: "Contar uma história com suas palavras ainda é difícil." },
    ver: { emoji: "🎬", name: "Entender cenas reais", st: "cena", good: "Você pega o que acontece numa cena real.", bad: "Cena real, sem legenda, ainda escapa." },
    ditado: { emoji: "✍️", name: "Ouvir cada palavra", st: "ditado", good: "Você separa bem as palavras que ouve.", bad: "As palavras ainda grudam umas nas outras." }
  };
  var ST = {
    aula: { emoji: "🔑", name: "Frases-chave", pt: "ouça, entenda e já fale as frases do tema", skill: null },
    cena: { emoji: "🎬", name: "Cenas", pt: "vídeo real, primeiro só ouvindo", skill: "entender" },
    fofoca: { emoji: "🕵️", name: "Fofoca", pt: "ouça a história e reconte falando", skill: "recontar" },
    shadow: { emoji: "🔁", name: "Shadowing", pt: "repita colado no nativo", skill: "repetir" },
    rt: { emoji: "⚡", name: "Real Time", pt: "passe pro inglês falando, com tempo", skill: "reagir" },
    erros: { emoji: "🧠", name: "Meus erros", pt: "só o que você errou", skill: null },
    leitura: { emoji: "🗣️", name: "Leia em voz alta", pt: "leia o trecho e as palavras ficam verdes", skill: "repetir" },
    ditado: { emoji: "✍️", name: "Ditado", pt: "ouça frases emendadas e escreva tudo", skill: "entender" },
    lacuna: { emoji: "🧩", name: "Complete o que ouviu", pt: "o nativo fala, você toca nas palavras", skill: "entender" },
    grudada: { emoji: "🔗", name: "Fala grudada", pt: "o que o nativo engole: wanna, whaddaya…", skill: "entender" },
    pares: { emoji: "🎯", name: "Qual você ouviu?", pt: "13 ou 30? live ou leave?", skill: "entender" },
    contar: { emoji: "🔢", name: "Quantas palavras?", pt: "ache onde uma palavra acaba", skill: "entender" }
  };
  var PROB = {
    ouvir: { emoji: "👂", name: "Não entendo o nativo", pt: "Ele fala rápido, engole palavra, e some tudo.", list: ["cena", "ditado", "lacuna", "grudada", "pares", "contar"] },
    falar: { emoji: "🗣️", name: "Travo na hora de falar", pt: "Você sabe, mas na hora a frase não sai.", list: ["rt", "fofoca", "shadow", "leitura"] }
  };
  function focusProb() { var s = (S.test && S.test.skills) || {}; if (S.test && S.test.skipped) return "ouvir"; var f = ((s.repetir || 0) + (s.reagir || 0) + (s.recontar || 0)) / 3, o = ["entender", "ver", "ditado"].filter(function (k) { return s[k] != null; }), e = o.reduce(function (a, k) { return a + s[k]; }, 0) / Math.max(1, o.length); return e <= f ? "ouvir" : "falar"; }

  // ===== boas-vindas =====
  // Thiago 27/11: muita gente compra com inglês zero. 1) a pessoa diz o nível que ACHA que tem,
  // 2) o teste mostra o nível de fato ("ou é coisa da sua cabeça?"), 3) coloca o nome, 4) começa.
  var SELF = [
    { e: "😶", t: "Nível zero", d: "Não sei nada de inglês" },
    { e: "🌱", t: "Sei um pouquinho", d: "Entendo umas palavras soltas" },
    { e: "😬", t: "Sei mais ou menos, mas travo", d: "Entendo algumas coisas, mas na hora de falar não sai" },
    { e: "😎", t: "Domino bem", d: "Não tenho muita dificuldade" }
  ];
  // 🏠 PÁGINA DE ENTRADA (Thiago 27/11): a mesma cara e as mesmas seções do inglescomjoaquim.com, adaptadas à Destravando.
  // Ordem: entende o que é → prévia → quem é o Joaquim → CRIA A CONTA → teste de nível.
  var SITE = "https://inglescomjoaquim.com/images/";
  function startFlow() {
    SFX.go();
    if (CONTA_OK && !ACC && !PROF) return signupScreen(function () { S.test ? home() : welcome(true); }, "Crie sua conta pra começar.");
    S.test ? home() : welcome(true);
  }
  function loginFromLanding() { loginScreen(function () { S.test ? home() : welcome(true); }); }
  function landing() {
    var w = screen(); w.classList.add("land");
    function sec(eyebrow, title, cls) { var x = el("section", { cls: "land-sec " + (cls || "") }, el("span", { cls: "eyebrow", text: eyebrow }), title ? el("h2", { html: title }) : null); return x; }
    function cta(txt) { return el("button", { cls: "btn big gold", type: "button", text: txt || "Quero destravar meu inglês →", onclick: startFlow }); }
    // prévia de verdade (Thiago 28/11: série, autêntico, um pouco difícil e CURTO): Modern Family, ~10 s, tela coberta igual ao treino.
    var DEMO_ID = "2bdNNJqKqT4", D0 = 97.5, D1 = 107.9, heard = false, answered = false, playing = false;
    var dHolder = el("div"), dCover = el("div", { cls: "yt-cover2" }, el("span", { cls: "cv-ic", text: "🎧" }), el("span", { text: "Tela coberta · só ouvido" }));
    var dBox = el("div", { cls: "yt yt-wrap2 land-yt" }, dHolder, dCover), DY = null;
    var opts = el("div", { cls: "pt-q" }), dmsg = el("div", { cls: "small" });
    var DEMO_TX = [["Claire: But I run every day.", "Mas eu corro todo dia."], ["Phil: You really think you can run as fast as me?", "Você acha mesmo que consegue correr tão rápido quanto eu?"], ["Claire: No, Phil. I think I can run much… much faster than you.", "Não, Phil. Eu acho que eu corro muito… muito mais rápido que você."]];
    function demoReveal() {
      var box = el("div", { cls: "said-box land-tx" }, el("b", { text: "🗣️ O que eles falaram:" }));
      DEMO_TX.forEach(function (l) { var k = l[0].indexOf(": "); box.append(el("i", { text: l[0].slice(0, k + 2) + "“" + l[0].slice(k + 2) + "”" }), el("small", { text: l[1] })); });
      dCover.remove(); dmsg.replaceChildren(box, el("button", { cls: "btn ghost", type: "button", text: "🎬 Ver a cena de novo, agora sem a capa", onclick: function () { DY.play(D0, D1, 1); } }));
    }
    [["Que ela corre muito mais rápido que ele", "Much faster than you", true], ["Que os dois correm igual", "As fast as you", false], ["Que ele corre mais rápido que ela", "Faster than me", false]].forEach(function (o) {
      var b = el("button", { cls: "pt-opt wait", type: "button" }, o[0], el("span", { cls: "opt-en", text: o[1] }));
      b.onclick = function () {
        if (!heard) { dmsg.textContent = "🎧 Primeiro toque em ▶ pra ouvir."; return; }
        if (answered) return;
        if (o[2]) { answered = true; b.classList.add("ok"); fb(true); demoReveal(); }
        else { b.classList.add("bad"); b.disabled = true; fb(false); dmsg.textContent = "❌ Não foi essa. Ouça de novo: preste atenção na resposta da Claire."; }
      };
      opts.append(b);
    });
    function demoPlay() {
      if (!DY) DY = ytScene(dHolder, DEMO_ID, D0, D1);
      if (playing) { DY.pause(); playing = false; playB.textContent = "▶ Ouvir de novo"; heroPlay.textContent = "▶"; return; }
      playing = true; playB.classList.remove("pulse"); playB.textContent = "⏸ Pausar"; heroPlay.textContent = "❚❚";
      DY.play(D0, D1, 1, function () { playing = false; heard = true; playB.textContent = "▶ Ouvir de novo"; heroPlay.textContent = "▶"; [].forEach.call(opts.children, function (c) { c.classList.remove("wait"); }); if (!answered) dmsg.textContent = "Agora escolha: o que a Claire acha?"; });
    }
    var playB = el("button", { cls: "btn pt-big pulse", type: "button", text: "▶ Ouvir o trecho", onclick: demoPlay });
    var faq = el("div", { cls: "land-faq" });
    [["Eu sou muito iniciante. Isso funciona pra mim?", "Funciona. O teste de nível mostra por onde você começa, e a trilha vai do zero até conversar com confiança (A1, A2, B1 e B2), um tema por vez. No começo tudo vem com a tradução do lado, sem pressão e sem vergonha."],
     ["Quanto tempo por dia eu preciso?", "Uns 15 minutos. O treino do dia é feito de fases curtas. O que muda o jogo não é o tempo, é a constância: treinar um pouquinho todo dia."],
     ["Preciso marcar horário ou aula ao vivo?", "Não. Você treina no seu tempo, no celular ou no computador, na hora que der."],
     ["E se eu travar ou errar?", "Ótimo, é pra isso que serve. O que você erra vai pro Meus erros e volta em outro dia, numa situação nova, até você acertar. Errar falando vale mais que acertar no silêncio."],
     ["Preciso de alguma coisa?", "De fone, pra ouvir bem, e de microfone, pra falar. O celular já tem os dois."],
     ["É assinatura?", "É. Enquanto a assinatura estiver ativa, você tem a plataforma inteira e o seu progresso fica salvo na sua conta. O pagamento é feito pela Hotmart, com segurança."]].forEach(function (q) {
      faq.append(el("details", null, el("summary", { text: q[0] }), el("p", { text: q[1] })));
    });
    // 🧭 menu com abas, igual ao inglescomjoaquim.com (no celular abre pelo ☰)
    var NAV = [["Como funciona", "como-funciona"], ["Prévia", "previa"], ["O método", "metodo"], ["Quem é o Joaquim", "professor"], ["Assinatura", "assinatura"], ["Dúvidas", "faq"]];
    function go(id) { menu.classList.remove("open"); burger.textContent = "☰ Menu"; var t = document.getElementById(id); if (!t) return; var y = t.getBoundingClientRect().top + window.scrollY - 70, y0 = window.scrollY; window.scrollTo({ top: y, behavior: "smooth" }); setTimeout(function () { if (Math.abs(window.scrollY - y0) < 5) window.scrollTo(0, y); }, 450); }
    var menu = el("nav", { cls: "land-nav" });
    NAV.forEach(function (n) { menu.append(el("button", { type: "button", text: n[0], onclick: function () { go(n[1]); } })); });
    if (!PROF && CONTA_OK) menu.append(el("button", { cls: "nav-login", type: "button", text: "Entrar na minha conta", onclick: function () { menu.classList.remove("open"); loginFromLanding(); } }));
    var burger = el("button", { cls: "land-burger", type: "button", "aria-label": "Abrir menu", text: "☰ Menu", onclick: function () { menu.classList.toggle("open"); burger.textContent = menu.classList.contains("open") ? "✕ Fechar" : "☰ Menu"; } });
    var top = el("header", { cls: "land-top" }, el("img", { cls: "land-logo", src: SITE + "logo.png", alt: "Inglês com Joaquim" }), menu,
      el("div", { cls: "land-top-r" }, PROF || !CONTA_OK ? null : el("button", { cls: "btn sm land-login", type: "button", text: "Entrar", onclick: loginFromLanding }),
        el("button", { cls: "btn gold sm hide-m", type: "button", text: "Começar agora →", onclick: startFlow }), burger));
    // 📸 cartão com a foto do Joaquim e o áudio da prévia (como o cartão do site)
    var heroPlay = el("button", { cls: "hc-play", type: "button", "aria-label": "Ouvir a prévia", text: "▶", onclick: function () { go("previa"); demoPlay(); } });
    var wave = el("span", { cls: "hc-wave" }); for (var wi = 0; wi < 26; wi++) wave.append(el("i", { style: "height:" + (6 + Math.round(Math.abs(Math.sin(wi * 1.7)) * 18)) + "px" }));
    var heroCard = el("div", { cls: "land-hcard" }, el("img", { src: SITE + "profile.png", alt: "Joaquim sorrindo" }),
      el("div", { cls: "hc-tag" }, el("small", { text: "TRECHO DA SÉRIE MODERN FAMILY" }), el("b", { text: "Quem corre mais rápido?" }), el("span", { text: "10 segundos, tela coberta" })),
      el("div", { cls: "hc-bar" }, heroPlay, wave, el("span", { cls: "hc-t", text: "0:10" })),
      el("span", { cls: "hc-badge", text: "Falou, validou!" }));
    // ➖ faixa que corre
    var mq = el("div", { cls: "land-marquee" }), mqIn = el("div", { cls: "mq-in" });
    var MQ = ["Ouvir nativo de verdade", "Falar todo dia", "Cenas reais", "Correção na hora", "Sem decoreba", "No seu nível", "15 minutos por dia", "Falou, validou", "Do zero ao B2", "Chega de travar"];
    for (var mr = 0; mr < 2; mr++) MQ.forEach(function (t) { mqIn.append(el("span", { text: t }), el("i", { text: "✦" })); });
    mq.append(mqIn);
    // 💳 oferta: o que você leva + assinatura
    var oferta = sec("A decisão é sua", "Daqui a alguns meses você pode estar entendendo e falando, ou exatamente onde está hoje", "land-offer");
    oferta.id = "assinatura";
    var leva = el("ul", { cls: "land-check" });
    ["Trilha completa do zero ao B2 (A1, A2, B1 e B2), um tema por vez, com teste final pra passar de nível", "Cenas reais de séries, entrevistas de rua e vlogs, em partes, com Raio-X do som", "Treino de fala todo dia: você grava, se ouve e vê o que a página entendeu", "Ditado, fofoca, shadowing, leitura em voz alta e Real Time", "Meus erros: o que você erra volta até você acertar", "Teste de nível, evolução 🌱🌿🌳🍎 e medalhas", "Tudo no celular ou no computador, no seu tempo, sem hora marcada"].forEach(function (t) { leva.append(el("li", { text: t })); });
    oferta.append(el("div", { cls: "land-offer-card" },
      el("div", { cls: "lo-top" }, el("span", { cls: "eyebrow", text: "O que você leva" }), el("h3", { text: "Destravando · Assinatura" }), leva),
      el("div", { cls: "lo-bottom" }, el("span", { cls: "lo-pill", text: "⚡ Acesso imediato" }), el("small", { text: "Assinatura" }), el("strong", { text: "Treino novo todo dia" }), el("small", { text: "pra destravar de vez" }),
        cta("Quero destravar meu inglês →"), el("p", { cls: "lo-safe", text: "🔒 Pagamento seguro pela Hotmart · valor exibido no checkout" }))),
      el("p", { cls: "small center", text: "Meu compromisso: se você aparecer todo dia e falar em voz alta, você destrava. A parte difícil eu já resolvi." }));
    // ⬇️ barra fixa embaixo (aparece depois do topo e some no fim)
    var bar = el("div", { cls: "land-bar" }, el("button", { cls: "btn big gold", type: "button", text: "Quero destravar meu inglês →", onclick: startFlow }));
    function onScroll() { if (!w.isConnected) { window.removeEventListener("scroll", onScroll); bar.remove(); return; } var y = window.scrollY, end = document.documentElement.scrollHeight - window.innerHeight - 500; bar.classList.toggle("show", y > 520 && y < end); top.classList.toggle("solid", y > 10); }
    window.addEventListener("scroll", onScroll, { passive: true });
    w.append(
      top,
      el("section", { cls: "land-hero" },
        el("span", { cls: "eyebrow", text: "• Destravando · do zero ao B2" }),
        el("h1", { html: "Você estuda inglês há anos e ainda <mark>trava</mark> na hora de ouvir e falar?" }),
        el("p", { html: "A culpa não é sua: é do método que te ensinaram. Na <b>Destravando</b>, você treina o ouvido e a fala <b>todo dia</b>, com nativo de verdade, e valida na prática. Nada de teoria sem fim." }),
        el("p", { cls: "hand", text: "Falou, validou." }),
        cta(),
        el("button", { cls: "btn ghost", type: "button", text: "▶ Ver como funciona", onclick: function () { go("como-funciona"); } }),
        el("div", { cls: "land-badges" }, el("span", { cls: "stars", text: "★★★★★" }), el("span", { text: "Método aprovado por alunos A1–B2" })),
        el("button", { cls: "land-app-link", type: "button", onclick: function () { go("app-celular"); } }, el("img", { src: "/academia/app/icon-96.png", alt: "" }), el("span", null, el("b", { text: "Tem app no celular 📲" }), el("small", { text: "15 min por dia · veja como instalar" }))),
        heroCard),
      mq,
      (function () { var x = sec("O diagnóstico honesto", "O problema não é você. É o método.");
        x.append(el("p", { text: "Te ensinaram a estudar inglês como quem estuda pra prova. Só que fluência não se prova numa folha: se prova no ouvido e na fala. Se algum destes te descreve, presta atenção:" }),
          el("ul", { cls: "land-x" },
            el("li", { text: "Você lê e entende, mas quando o nativo fala rápido, some tudo." }),
            el("li", { text: "Já fez três cursos, tem app no celular, e continua sem conversar." }),
            el("li", { text: "Sabe a regra gramatical, mas monta a frase e ela nunca sai." }),
            el("li", { text: "Tem vergonha de errar, então prefere ficar quieto." }),
            el("li", { text: "Decora listas de palavras que sozinhas não servem pra nada." })),
          el("blockquote", { cls: "land-quote" }, el("p", { text: "“O conhecimento só é validado quando você fala. Enquanto ficar só na teoria, o inglês continua trancado.”" }), el("span", { text: "— Joaquim" })));
        return x; })(),
      (function () { var x = sec("A virada de chave", "Conheça a <mark>Destravando</mark>", "land-dark");
        x.append(el("p", { text: "Uma academia de inglês no seu celular pra fazer o que realmente destrava: ouvir nativo de verdade e falar. Todo. Santo. Dia." }),
          el("div", { cls: "land-cards" },
            el("div", null, el("b", { text: "🎬 Nativo de verdade" }), el("span", { text: "Cenas de séries, entrevistas de rua e vlogs, em partes, com o Raio-X do som." })),
            el("div", null, el("b", { text: "🎙️ Você grava, você fala" }), el("span", { text: "Igual áudio de WhatsApp. É falando que destrava." })),
            el("div", null, el("b", { text: "✅ Correção na hora" }), el("span", { text: "Você vê o que a página entendeu, palavra por palavra." })),
            el("div", null, el("b", { text: "🌱 Progresso que você sente" }), el("span", { text: "Cada habilidade evolui: 🌱 → 🌿 → 🌳 → 🍎." }))),
          cta());
        return x; })(),
      (function () { var x = sec("Como funciona na prática", "Começa uma vez. Treina todo dia.", "land-how"); x.id = "como-funciona";
        // Thiago 28/11: o teste de nível NÃO é do dia a dia (é uma vez, como em qualquer app); o método é o treino diário
        x.append(el("p", { cls: "land-phase", text: "🚀 No começo · uma vez só" }),
          el("ol", { cls: "land-steps" },
            el("li", null, el("i", { text: "01" }), el("b", { text: "Você cria sua conta" }), el("span", { text: "Assim o seu progresso fica salvo e você continua de qualquer aparelho." })),
            el("li", null, el("i", { text: "02" }), el("b", { text: "Descobre o seu nível" }), el("span", { text: "Um teste rápido, como em qualquer app, só pra saber por onde começar. Começando do zero? Pode pular." }))),
          el("p", { cls: "land-phase", text: "🔥 Depois · todo dia, 15 minutos" }),
          el("ol", { cls: "land-steps", start: "3" },
            el("li", null, el("i", { text: "03" }), el("b", { text: "Faz o treino de hoje" }), el("span", { text: "Frases-chave, cena real, ditado, fofoca, shadowing e Real Time, em fases curtas. Ouvido e fala, todo dia." })),
            el("li", null, el("i", { text: "04" }), el("b", { text: "Evolui e valida" }), el("span", { text: "O que você erra volta até acertar, o que você aprende vai pro seu caderno. Falou, validou. Aí vem o próximo tema." }))));
        return x; })(),
      (function () { var x = sec("No seu celular, como app", "Ícone na tela, tela cheia e lembrete do treino", "land-app"); x.id = "app-celular";
        x.append(el("div", { cls: "land-phone" }, el("div", { cls: "lp-screen" }, el("div", { cls: "lp-row" }, el("i"), el("i"), el("i"), el("i")), el("div", { cls: "lp-row" }, el("i"), el("span", { cls: "lp-app" }, el("img", { src: "/academia/app/icon-96.png", alt: "" }), el("small", { text: "Destravando" })), el("i"), el("i")), el("div", { cls: "lp-notif" }, el("b", { text: "🔥 5 dias seguidos, Ana!" }), el("small", { text: "Não deixa a ofensiva apagar hoje." })))),
          el("p", { text: "Não precisa baixar nada de loja: você abre o site no celular e coloca o Destravando na tela de início. Aí ele vira app de verdade." }),
          installSteps(), cta("Criar minha conta e instalar →"));
        return x; })(),
      (function () { var x = sec("Prévia · experimenta agora", "10 segundos de um trecho da série Modern Family. Você entende?", "land-demo"); x.id = "previa";
        x.append(el("p", { cls: "small", text: "A Claire avisou que corre rápido demais pro Phil. Ele se gaba da caminhada que faz toda manhã, e ela responde. Ouça com a tela coberta, sem ler nada, e responda." }),
          dBox, playB, el("p", { cls: "comp-q", text: "❓ O que a Claire acha da corrida dos dois?" }), opts, dmsg,
          el("p", { cls: "small", text: "Achou rápido? É assim que nativo fala. No treino tem série, desenho, talk show, entrevista de rua e vlog, e cada cena vem em partes, com o Raio-X do som, até você entender tudo." }));
        return x; })(),
      (function () { var x = sec("O método por trás", "Não é sorte. É um jeito de ensinar que respeita como o cérebro aprende."); x.id = "metodo";
        x.append(el("div", { cls: "land-cards three" },
          el("div", null, el("b", { text: "Prática antes da teoria" }), el("span", { text: "Você usa primeiro, entende depois. O contrário do que te ensinaram a vida toda." })),
          el("div", null, el("b", { text: "Contexto é tudo" }), el("span", { text: "Nunca palavra solta. Sempre dentro de uma história que faz sentido pra você." })),
          el("div", null, el("b", { text: "Falou, validou" }), el("span", { text: "Não avança sem falar. É o único jeito de transformar o que você sabe em fluência real." }))));
        return x; })(),
      (function () { var x = sec("Você vai soar natural", "Os ingredientes secretos do inglês fluente");
        var g = el("div", { cls: "land-seven" });
        [["Phrasal verbs", "give up, find out, deal with"], ["Conectores", "however, although, so"], ["Fillers", "well, so, I mean…"], ["Marcadores", "to be honest, by the way, anyway"], ["Gírias & idioms", "piece of cake, once in a blue moon"], ["Hesitação natural", "let me see, I guess, how can I say…"], ["Vocabulário de uso", "get the bus, get a cold, get it"]].forEach(function (k, n) {
          g.append(el("div", null, el("i", { text: String(n + 1) }), el("b", { text: k[0] }), el("span", { text: k[1] })));
        });
        x.append(el("p", { text: "Cada fofoca e cada cena planta, sem você perceber, o que separa o “inglês de escola” do inglês que soa como gente de verdade:" }), g);
        return x; })(),
      (function () { var x = sec("Não importa onde você está", "4 níveis, do zero até conversar com confiança");
        x.append(el("div", { cls: "land-levels" },
          el("div", null, el("em", { text: "A1" }), el("b", { text: "Básico · começando do zero" }), el("span", { text: "Se apresentar, falar da rotina, pedir comida. Tudo com tradução do lado, frases curtas e fala lenta." })),
          el("div", null, el("em", { text: "A2" }), el("b", { text: "Pré-intermediário · já entende, mas trava" }), el("span", { text: "Contar o que fez, viajar, dar conselho. Cenas mais rápidas e reconto com as suas palavras." })),
          el("div", null, el("em", { text: "B1" }), el("b", { text: "Intermediário · se vira sozinho" }), el("span", { text: "Contar uma história com detalhe, repassar fofoca, reclamar, combinar planos, dar opinião." })),
          el("div", null, el("em", { text: "B2" }), el("b", { text: "Intermediário superior · conversa com confiança" }), el("span", { text: "Argumentar, negociar, falar de arrependimento e entender nativo falando rápido, sem legenda." }))),
          el("p", { cls: "small", text: "A1, A2, B1 e B2 são os níveis do Quadro Europeu, a régua usada no mundo todo. Não sabe o seu? Sem crise: o teste mostra por onde começar, e cada nível termina com um teste final pra passar pro próximo." }));
        return x; })(),
      (function () { var x = sec("Quem tá do outro lado", null, "land-prof land-wine"); x.id = "professor";
        x.append(el("div", { cls: "land-prof-in" }, el("img", { src: SITE + "profile.png", alt: "Thiago Joaquim, professor de inglês" }),
          el("div", null, el("span", { cls: "small", text: "O professor" }), el("h2", { text: "Oi, eu sou o Joaquim." }))),
          el("p", { text: "Não aprendi idiomas na sala de aula tradicional: aprendi vivendo. Morei 4 anos na Europa, trabalhei em outra língua, errei muito e falei mesmo assim. Foi aí que entendi: fluência não vem de mais teoria, vem de usar." }),
          el("p", { text: "Sou violinista, professor apaixonado e, sinceramente, um chato com uma coisa só: odeio a indústria da enrolação que promete milagre em 3 meses e entrega frustração. Aqui é o oposto: trabalho focado, direto, com resultado que você percebe na primeira conversa." }),
          el("p", { cls: "hand", text: "Se você fala, você valida. Simples assim." }),
          el("div", { cls: "land-stats" }, el("div", null, el("b", { text: "5 idiomas" }), el("span", { text: "aprendidos na prática" })), el("div", null, el("b", { text: "4 anos" }), el("span", { text: "morando na Europa" })), el("div", null, el("b", { text: "A1 → B2+" }), el("span", { text: "alunos destravados" }))));
        return x; })(),
      oferta,
      (function () { var x = sec("Antes de você perguntar", "Perguntas que todo mundo faz"); x.id = "faq"; x.append(faq); return x; })(),
      el("section", { cls: "land-end land-dark" }, el("h2", { html: "Chega de estudar inglês. <mark>Bora treinar.</mark>" }),
        el("p", { text: "Quinze minutos por dia. Nativo de verdade. Sua voz destravando um pouco mais a cada treino." }),
        cta("Quero destravar meu inglês →"),
        PROF || !CONTA_OK ? null : el("button", { cls: "linkish", type: "button", text: "Já tenho conta · Entrar", onclick: loginFromLanding }),
        el("p", { cls: "hand", text: "Falou, validou!" })),
      el("footer", { cls: "land-foot" }, el("img", { src: SITE + "logo.png", alt: "Inglês com Joaquim" }),
        el("p", null, el("a", { href: "https://instagram.com/inglescomjoaquim", target: "_blank", rel: "noopener", text: "Instagram" }), " · ", el("a", { href: "/privacidade.html", text: "Privacidade" }), " · ", el("a", { href: "mailto:contato@inglescomjoaquim.com", text: "Contato" })),
        el("small", { text: "© " + new Date().getFullYear() + " Inglês com Joaquim · Falou, validou." })),
      bar);
    onScroll();
  }
  function welcome(fromLanding) {
    if (!fromLanding && !ACC && !S.self && !(S.testSave && S.testSave.res)) return STANDALONE ? loginFromLanding() : landing();
    if (CONTA_OK && !ACC && !PROF && S.skipAccUntil !== today()) return signupScreen(function () { welcome(true); }, "Crie sua conta pra começar.");
    var w = screen();
    if (S.testSave && S.testSave.res) w.append(el("button", { cls: "paused-card", type: "button", onclick: runTest }, el("span", { cls: "pe", text: "☕" }),
      el("span", { cls: "tt" }, el("b", { text: "Você pausou o teste" }), el("span", { cls: "small", text: "Continua na parte " + (S.testSave.pi + 1) + " de 4" + (S.testSave.ii ? ", pergunta " + (S.testSave.ii + 1) : "") + "." })), el("span", { cls: "go", text: "Continuar →" })));
    var list = el("div", { cls: "self-list" });
    SELF.forEach(function (x, k) {
      list.append(el("button", { cls: "self-opt", type: "button", onclick: function () { S.self = k; persist(); SFX.go(); testIntro(); } },
        el("span", { cls: "pe", text: x.e }), el("span", { cls: "tt" }, el("b", { text: x.t }), el("span", { cls: "small", text: x.d }))));
    });
    w.append(el("section", { cls: "hero" },
      el("span", { cls: "eyebrow", text: "Destravando · Inglês com Joaquim" }),
      el("h1", { html: "Aqui você não assiste aula.<br><mark>Você treina.</mark>" }),
      el("p", { text: "Primeiro, me conta: como está o seu inglês hoje?" })), list);
  }
  function testIntro() {
    var w = screen(), k = S.self || 0;
    w.append(el("header", { cls: "top" }, el("button", { cls: "back", type: "button", text: "‹ Voltar", onclick: welcome })),
      el("section", { cls: "hero" },
        el("span", { cls: "eyebrow", text: "Você marcou: " + SELF[k].e + " " + SELF[k].t }),
        el("h1", { html: k === 0 ? "Bora começar do <mark>zero</mark>, sem pressão." : "Agora vamos ver o seu <mark>nível de fato</mark>." }),
        el("p", { text: k === 0 ? "Começando do zero? Perfeito: a Destravando foi feita pra isso. Você começa no tema 1, com cada frase em áudio e com tradução, e já pratica falando desde o primeiro dia. Se preferir, dá pra fazer o teste também." : k === 3 ? "Bora ver se é isso mesmo ou se é coisa da sua cabeça 😏. O teste vai ficando mais difícil conforme você acerta." : "Um teste rápido, só de ouvir e falar: nada de ler, nada de escrever. Ele mostra o seu nível e o que mais trava você." })),
      k === 0 ? null : el("ul", { cls: "how card" },
        el("li", { text: "👂 Ouvir e reagir" }), el("li", { text: "🎬 Cena real, só ouvindo" }), el("li", { text: "✍️ Ditado com lacunas" }), el("li", { text: "🔁 Repetir frases" }), el("li", { text: "⚡ Responder rápido" }), el("li", { text: "🗣️ Recontar uma fofoca" }),
        el("li", { cls: "small", text: "⏱️ Uns 8 a 10 minutos: é um pouquinho de cada treino do app, e quem acerta pula perguntas. Use fone e fique num lugar onde possa falar." })),
      // 😶 nível zero: o caminho principal é começar do zero (o teste em inglês só assustaria); quem quiser, testa
      k === 0 ? el("button", { cls: "btn big gold", type: "button", text: "Começar do zero, sem teste →", onclick: function () { S.test = { skipped: true, band: 0, skills: { entender: 50, repetir: 50, reagir: 50, recontar: 50 }, at: today() }; S.theme = 0; persist(); nameScreen(home); } }) : null,
      el("button", { cls: k === 0 ? "linkish" : "btn big", type: "button", text: k === 0 ? "Quero fazer o teste mesmo assim" : "Começar o teste →", onclick: runTest }),
      k === 0 ? null : el("button", { cls: "linkish", type: "button", text: "Agora não: pular o teste e começar do tema 1", onclick: function () { S.test = { skipped: true, band: 0, skills: { entender: 50, repetir: 50, reagir: 50, recontar: 50 }, at: today() }; S.theme = 0; persist(); nameScreen(home); } }));
  }
  function nameScreen(after) {
    if (CONTA_OK && !PROF && !ACC && S.skipAccUntil !== today()) return signupScreen(after, "Último passo: crie sua conta pra ver o seu resultado.");
    if (!S.name && ACC && ACC.name) { S.name = String(ACC.name).split(" ")[0]; persist(); }
    if (S.name) return after();
    var w = screen(), name = el("input", { type: "text", placeholder: "Seu primeiro nome", autocomplete: "given-name" });
    function go() { S.name = name.value.trim(); persist(); after(); }
    name.addEventListener("keydown", function (e) { if (e.key === "Enter") go(); });
    w.append(el("section", { cls: "hero center" }, el("div", { cls: "big-emoji", text: "🙌" }), el("h1", { text: "Pronto! Como você se chama?" }), el("p", { text: "Pra eu montar o seu treino." })),
      name, el("button", { cls: "btn big", type: "button", text: "Ver meu resultado →", onclick: go }));
    setTimeout(function () { name.focus(); }, 200);
  }

  // ===== teste de nivelamento =====
  function runTest() {
    var w = screen();
    w.append(skel());
    loadTest().then(function (T) { testFlow(T); }).catch(function () { w.innerHTML = ""; w.append(el("p", { text: "Não consegui carregar o teste. Confira a internet e tente de novo." }), el("button", { cls: "btn", type: "button", text: "Tentar de novo", onclick: runTest })); });
  }
  // acerto mínimo por parte: ouvir (múltipla escolha) 0.6; fala 0.5 (o reconhecimento de voz erra palavras de quem fala bem)
  var PASS = { entender: 0.6, ver: 0.75, ditado: 0.5, repetir: 0.5, reagir: 0.5, recontar: 0.5 };
  // feedback rápido no teste de nível (Thiago 28/11: "o aluno precisa ver na hora o que acertou e o que errou")
  function noSkip() { var x = document.querySelector(".skip-q"); if (x) x.remove(); } // respondeu: some o "pular"
  function testFb(w, good, txt, then) {
    fb(good); noSkip(); w.append(el("div", { cls: "sheet " + (good ? "good" : "bad") }, el("b", { text: good ? "✅ Boa!" : "🟡 Quase." }), el("p", { cls: "small", text: txt })));
    setTimeout(then, good ? 1300 : 2200);
  }
  function topOf(r, k) { var t = -1; (r || []).forEach(function (x) { if (x.ok >= PASS[k]) t = Math.max(t, x.band); }); return t; }
  function testFlow(T) {
    // 🧪 Thiago 28/11: o teste passa por TODOS os treinos do app (cena, ditado com lacunas, fala), bem enxuto
    var parts = [
      { key: "listen", skill: "entender", em: "👂", name: "Ouvir e reagir", tip: "Ouça e toque na figura certa. Você pode ouvir 2 vezes." },
      { key: "cena", skill: "ver", em: "🎬", name: "Cena real", tip: "A tela fica coberta: primeiro só ouvindo. Escolha o que está acontecendo, complete a frase e depois assista sem a tela." },
      { key: "ditado", skill: "ditado", em: "✍️", name: "Ditado com lacunas", tip: "Ouça a frase e toque na palavra que falta em cada espaço." },
      { key: "repeat", skill: "repetir", em: "🔁", name: "Repetir a frase", tip: "Ouça e repita igualzinho. A frase fica escondida: é só ouvido." },
      { key: "answer", skill: "reagir", em: "⚡", name: "Pergunta rápida", tip: "Ouça a pergunta e responda falando, do seu jeito." },
      { key: "retell", skill: "recontar", em: "🗣️", name: "Mini fofoca", tip: "Ouça a historinha e reconte com as suas palavras. É uma só." }
    ];
    parts.forEach(function (P, i) { P.title = P.em + " Parte " + (i + 1) + " de " + parts.length + " · " + P.name; });
    var SV = S.testSave && S.testSave.res ? S.testSave : null;
    var res = SV ? SV.res : {};
    parts.forEach(function (P) { res[P.skill] = res[P.skill] || []; });
    var pi = SV ? SV.pi : 0, items = [], ii = 0, missStreak = 0, scored = false, base = null;
    var resumeT = SV && SV.ii ? { ii: SV.ii, miss: SV.miss || 0 } : null; // pausa volta na pergunta exata
    function saveT() { S.testSave = { res: res, pi: pi, ii: ii, miss: missStreak, date: today() }; persist(); }
    function nextPart() {
      if (pi >= parts.length) return finish();
      var P = parts[pi];
      // começa sempre do mais fácil; quem disse "nível zero"/"um pouquinho" nem vê as perguntas de B1/B2 (Thiago 28/11: "começar mais simples")
      var cap = S.self == null ? 5 : [3, 4, 5, 5][S.self] || 5;
      // ditado usa a 1ª frase de cada faixa e o "repetir" usa a 2ª (a pessoa não vê a mesma frase duas vezes)
      var src = P.key === "ditado" || P.key === "repeat" ? (T.repeat || []).filter(function (x, i, A) { var first = A.findIndex(function (y) { return y.band === x.band; }) === i; return P.key === "ditado" ? first : !first; }) : (T[P.key] || []);
      items = src.filter(function (x) { return x.band <= cap; }).sort(function (a, b) { return a.band - b.band; }); ii = 0; missStreak = 0;
      var lt = topOf(res.entender, "entender");
      // mini fofoca: UMA só, no nível que o ouvido mostrou (1 abaixo)
      if (P.key === "retell") { var rb = Math.max(1, Math.min(cap, lt - 1)), one = items.filter(function (x) { return x.band === rb; })[0] || items[items.length - 1]; items = one ? [one] : []; }
      base = JSON.parse(JSON.stringify(res));
      if (resumeT) { ii = resumeT.ii; missStreak = resumeT.miss; resumeT = null; return nextItem(); }
      // ⚡ Thiago 28/11 ("longo demais" e "sou B2, deu A2"): 1 pergunta por faixa enquanto acerta; as partes de fala
      // começam 2 faixas abaixo do que o ouvido mostrou (as faixas de baixo contam como feitas). Quem "domina bem" já começa o ouvido na faixa 2.
      var start = 0;
      if (P.key === "listen") start = S.self === 3 ? 2 : 0;
      else if (P.key === "retell") start = items[0] ? items[0].band : 0;
      else start = Math.max(0, lt - 1);
      if (!items.length) { pi++; return nextPart(); }
      if (start > 0) { var si = 0; while (si < items.length && items[si].band < start) si++; if (si < items.length) { ii = si; res[P.skill].push({ band: start - 1, ok: 1, credit: true }); } }
      var w = screen();
      w.append(testHead(P, 0, items.length), el("div", { cls: "card intro" }, el("h2", { text: P.title.replace(/ · /, " — ") }), el("p", { text: P.tip })),
        el("button", { cls: "btn big", type: "button", text: "Vamos →", onclick: nextItem }));
    }
    function testHead(P, i, n) {
      var total = parts.length, pct = Math.round(((pi + (n ? i / n : 0)) / total) * 100);
      return el("div", { cls: "thead" }, el("header", { cls: "top" }, el("span", { cls: "brand", text: "🔓 Destravando" }),
          el("button", { cls: "pause", type: "button", text: "Pausar", onclick: function () {
            stopAll(); saveT();
            var w2 = screen();
            w2.append(el("section", { cls: "hero center rest" }, el("div", { cls: "big-emoji", text: "☕" }), el("h1", { text: "Teste pausado." }),
              el("p", { text: "Tudo salvo. Quando voltar, você continua exatamente daqui: parte " + (pi + 1) + " de " + parts.length + "." })),
              el("button", { cls: "btn big", type: "button", text: "Continuar agora →", onclick: runTest }),
              el("button", { cls: "linkish", type: "button", text: "Ir pro início", onclick: function () { S.test ? home() : welcome(); } }));
          } })),
        el("span", { cls: "eyebrow", text: "Teste de nível · " + P.title.replace(/^\S+\s/, "").replace(/Parte \d de \d · /, "") }),
        steps(pi + 1, total, "Parte", parts.map(function (x) { return x.em; })),
        n && i > 0 ? steps(Math.min(i, n), n, "Nível") : (n ? el("p", { cls: "small", text: "Começa fácil e vai subindo. Acertou? Pula pro próximo nível. Errou 2 no mesmo nível? A parte acaba e você não perde nada." }) : null));
    }
    function score(ok, band) {
      if (scored) return; scored = true;
      res[parts[pi].skill].push({ band: band, ok: ok });
      // adaptativo: acertou → pula as outras da mesma faixa; errou → tenta a outra da mesma faixa; errou as 2 → encerra a parte
      if (ok >= PASS[parts[pi].skill]) { missStreak = 0; var j = ii + 1; while (j < items.length && items[j].band <= band) j++; ii = j; }
      else { missStreak++; var j2 = ii + 1; ii = (missStreak >= 2 || j2 >= items.length || items[j2].band !== band) ? items.length : j2; }
      if (ii >= items.length) { pi++; ii = 0; missStreak = 0; saveT(); setTimeout(nextPart, 350); } else { saveT(); setTimeout(nextItem, 350); }
    }
    function nextItem() {
      scored = false;
      var P = parts[pi], it = items[ii], w = screen();
      w.append(testHead(P, it.band + 1, 6)); // progresso por nível (1 a 6): quem acerta pula perguntas

      var url = "/aprender/audio/" + it.file; // o teste de nível mora sempre na pasta do A1, seja qual for o nível do aluno
      if (P.key === "listen") {
        var opts = el("div", { cls: "pics" }), picked = false;
        it.options.forEach(function (o, k) {
          opts.append(el("button", { cls: "pic", type: "button", onclick: function (e) { if (picked) return; picked = true; noSkip(); var g = k === it.answer; e.currentTarget.classList.add(g ? "ok" : "bad"); if (!g) opts.children[it.answer].classList.add("ok"); fb(g); setTimeout(function () { score(g ? 1 : 0, it.band); }, g ? 500 : 1100); } },
            el("span", { cls: "pe", text: o.emoji }), el("span", { text: o.pt })));
        });
        opts.classList.add("locked");
        w.append(el("div", { cls: "card" }, el("h2", { text: it.q }), player(url, { max: 2, onEnd: function () { opts.classList.remove("locked"); } }), opts));
        setTimeout(function () { var b = w.querySelector(".pbtn"); if (b) b.click(); }, 300);
      } else if (P.key === "cena") {
        // 🎬 cena real: ouve com a tela coberta → o que está acontecendo → completa a frase → assiste sem a tela
        var holder = el("div"), cover = el("div", { cls: "yt-cover2" }, el("span", { cls: "cv-ic", text: "🎧" }), el("span", { text: "Tela coberta · só ouvido" }));
        var vbox = el("div", { cls: "yt yt-wrap2" }, holder, cover), qa = el("div"), plays = 0, got = 0;
        var Y = ytScene(holder, it.yt, it.t, it.end, function () {
          qa.replaceChildren(el("div", { cls: "sheet" }, el("b", { text: "😕 O vídeo não abriu aqui." }), el("p", { cls: "small", text: "Pode ser internet ou bloqueador. Sem problema: vamos pra próxima parte." }),
            el("button", { cls: "btn", type: "button", text: "Próxima parte →", onclick: function () { scored = true; pi++; ii = 0; missStreak = 0; saveT(); nextPart(); } })));
        });
        var lb = el("button", { cls: "btn big", type: "button", text: "▶ Ouvir a cena", onclick: function () {
          if (plays >= 2) return; plays++; lb.disabled = true; lb.textContent = "🎧 Ouvindo…";
          Y.play(it.t, it.end, 1, function () { lb.disabled = plays >= 2; lb.textContent = plays >= 2 ? "✅ Ouviu 2 vezes" : "↺ Ouvir de novo (1 vez)"; if (!qa.children.length) askComp(); });
        } });
        function mcq(opts, ans, onDone, gapEl) {
          var box = el("div", { cls: "opts" }), dn = false;
          opts.forEach(function (o, k) { box.append(el("button", { cls: "opt", type: "button", text: o, onclick: function (e) {
            if (dn) return; dn = true; noSkip(); var g = k === ans; if (gapEl) { gapEl.textContent = opts[ans]; gapEl.classList.add(g ? "ok" : "no"); } e.currentTarget.classList.add(g ? "ok" : "bad"); if (!g) box.children[ans].classList.add("ok"); fb(g); if (g) got++; setTimeout(function () { onDone(g); }, g ? 500 : 1000); } })); });
          return box;
        }
        function askComp() {
          qa.append(el("div", { cls: "card" }, el("b", { text: "1️⃣ " + it.q }), mcq(it.options, it.answer, function () { askGap(); })));
        }
        function askGap() {
          var pr = String(it.prompt).split("___"), gEl = el("b", { cls: "x-gap", text: "____" });
          qa.append(el("div", { cls: "card" }, el("b", { text: "2️⃣ Complete o que ele(a) falou:" }), el("p", { cls: "x-line" }, el("span", { text: pr[0] }), gEl, el("span", { text: pr[1] || "" })),
            mcq(it.gopts, it.gans, function () { reveal(); }, gEl)));
        }
        function reveal() {
          var ok3 = got === 2;
          qa.append(el("div", { cls: "sheet " + (ok3 ? "good" : "bad") }, el("b", { text: ok3 ? "✅ Mandou bem nas duas!" : got ? "🟡 Acertou uma das duas." : "🔴 Essa escapou." }),
            el("p", { cls: "small", text: "Ele(a) falou: “" + it.en + "”" + (it.pt ? " · " + it.pt : "") })),
            el("button", { cls: "btn", type: "button", text: "👀 Agora assista sem a tela", onclick: function (e) { cover.remove(); e.currentTarget.remove(); Y.play(it.t, it.end, 1, function () {}); } }),
            el("button", { cls: "btn big", type: "button", text: "Próxima →", onclick: function () { Y.pause(); score(got / 2, it.band); } }));
          lb.remove();
        }
        w.append(el("div", { cls: "card" }, it.intro ? el("p", { cls: "small", text: "🎬 " + it.intro }) : null, vbox, lb), qa);
      } else if (P.key === "ditado") {
        // ✍️ ditado com lacunas: ouve a frase e toca na palavra que falta (1 espaço até o A1; 2 do A2 pra cima)
        var toks = it.en.split(" "), cand = toks.map(function (t, i) { return { i: i, w: (t.match(/[A-Za-z']+/) || [""])[0] }; }).filter(function (x) { return x.w.length >= 3 && x.i > 0; }).sort(function (a, b) { return b.w.length - a.w.length; });
        var gaps = cand.slice(0, it.band >= 3 ? 2 : 1).sort(function (a, b) { return a.i - b.i; }), gi = 0, right = 0;
        var pool = []; (T.repeat || []).concat(T.answer || []).forEach(function (x) { String(x.en || x.q || "").split(/\s+/).forEach(function (t) { var m = (t.match(/[A-Za-z']+/) || [""])[0]; if (m.length >= 3 && pool.indexOf(m) < 0) pool.push(m); }); });
        var line = el("p", { cls: "x-line" }), slots = {};
        toks.forEach(function (t, i) { var g = gaps.filter(function (x) { return x.i === i; })[0]; if (g) { var sl = el("b", { cls: "x-gap", text: t.replace(g.w, "____") }); slots[i] = sl; line.append(sl, " "); } else line.append(el("span", { text: t + " " })); });
        var ob = el("div", { cls: "opts locked" }), msg = el("div");
        function ask() {
          ob.replaceChildren(); if (gi >= gaps.length) return done();
          var g = gaps[gi], opts = shuffle([g.w].concat(distract(g.w, pool).slice(0, 2))), dn = false;
          slots[g.i].classList.add("cur");
          opts.forEach(function (o) { ob.append(el("button", { cls: "opt word", type: "button", text: o, onclick: function (e) {
            if (dn || ob.classList.contains("locked")) return; dn = true; noSkip(); var ok = o.toLowerCase() === g.w.toLowerCase(); if (ok) right++;
            e.currentTarget.classList.add(ok ? "ok" : "bad"); if (!ok) [].forEach.call(ob.children, function (b) { if (b.textContent.toLowerCase() === g.w.toLowerCase()) b.classList.add("ok"); });
            fb(ok); slots[g.i].textContent = toks[g.i]; slots[g.i].classList.remove("cur"); slots[g.i].classList.add(ok ? "ok" : "no"); gi++; setTimeout(ask, ok ? 450 : 1000); } })); });
        }
        function done() { var v = right / gaps.length; msg.append(el("div", { cls: "sheet " + (v >= 1 ? "good" : "bad") }, el("b", { text: v >= 1 ? "✅ Pegou tudo!" : v > 0 ? "🟡 Pegou uma." : "🔴 Essa escapou." }), el("p", { cls: "small", text: it.pt || "" }))); setTimeout(function () { score(v, it.band); }, v >= 1 ? 1200 : 2000); }
        var pd = player(url, { max: 2, onEnd: function () { ob.classList.remove("locked"); } });
        w.append(el("div", { cls: "card" }, el("h2", { text: "Ouça e complete" }), pd, line, ob, msg));
        ask(); setTimeout(function () { var b = w.querySelector(".pbtn"); if (b) b.click(); }, 300);
      } else if (P.key === "repeat") {
        var heard = false, p = player(url, { max: 2, onEnd: function () { heard = true; t.classList.remove("locked"); } });
        var t = talk(function (said, manual) { var v = manual ? 0.6 : overlap(it.en, said); testFb(w, v >= PASS.repetir, "A frase era: “" + it.en + "”", function () { score(v, it.band); }); }, { label: "🎤 Segure e repita" });
        t.classList.add("locked");
        w.append(el("div", { cls: "card" }, el("h2", { text: "Ouça e repita" }), el("p", { cls: "hidden-line", text: "🙈 frase escondida" }), p, t));
        setTimeout(function () { var b = w.querySelector(".pbtn"); if (b) b.click(); }, 300);
      } else if (P.key === "answer") {
        var t2 = talk(function (said, manual) {
          if (manual) return score(0.6, it.band);
          var groups = it.expect || [], g = groups.filter(function (grp) { return grp.some(function (x) { return has(said, x); }); }).length;
          var enough = cw(said).length >= (it.minWords || 2);
          var v2 = (groups.length ? g / groups.length : 1) * (enough ? 1 : 0.5);
          testFb(w, v2 >= PASS.reagir, v2 >= PASS.reagir ? "Respondeu bem a pergunta." : (enough ? "Faltou responder o que foi perguntado." : "Resposta curta demais: tente frases completas."), function () { score(v2, it.band); });
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
          var v3 = Math.min(1, k * 1.3) * (enough ? 1 : 0.6);
          testFb(w, v3 >= PASS.recontar, v3 >= PASS.recontar ? "Contou os pontos principais da história." : "Faltaram partes importantes da história" + (enough ? "." : " e ficou curto."), function () { score(v3, it.band); });
        }, { label: "🎤 Segure e reconte" });
        t3.classList.add("locked");
        var p3 = player(url, { max: 2, onEnd: function () { t3.classList.remove("locked"); } });
        w.append(el("div", { cls: "card" }, el("h2", { text: it.title || "Mini fofoca" }), el("p", { cls: "small", text: "Pode começar com: \"So, the story is about…\"" }), p3, t3));
      }
      w.append(el("button", { cls: "linkish skip-q", type: "button", text: "Não entendi nada — pular", onclick: function () { score(0, it.band); } }));
    }
    function finish() {
      var skills = {}, tops = {};
      Object.keys(res).forEach(function (k) {
        var r = res[k]; if (!r.length) { skills[k] = 0; return; }
        // nível da habilidade = maior faixa em que acertou bem; % = média ponderada pela faixa
        var top = topOf(r, k);
        tops[k] = top;
        var sum = 0, wsum = 0; r.forEach(function (x) { var wgt = 1 + x.band; sum += x.ok * wgt; wsum += wgt; });
        skills[k] = Math.round(Math.min(1, (sum / wsum) * 0.6 + ((top + 1) / 6) * 0.4) * 100);
      });
      // nível = média entre o OUVIDO (a parte mais confiável) e a mediana das 3 partes de FALA, arredondando pra cima.
      // Antes era a 2ª menor das 4: um microfone que entendeu mal no iPhone derrubava um B2 pra A2 (Thiago 28/11).
      function med(a) { a = a.map(function (x) { return x == null ? -1 : x; }).sort(function (x, y) { return x - y; }); return a[Math.floor(a.length / 2)]; }
      var L = med([tops.entender, tops.ver, tops.ditado]), sp = med([tops.repetir, tops.reagir, tops.recontar]);
      var band = Math.max(0, Math.min(5, Math.ceil((Math.max(0, L) + Math.max(0, sp)) / 2)));
      S.test = { band: band, skills: skills, at: today() }; S.testSave = null;
      // faixas: 0–2 A1 · 3 A2 · 4 B1 · 5 B2 (cada nível só entra se já estiver publicado)
      var goLv = band >= 5 && B2_READY ? "b2" : band >= 4 && B1_READY ? "b1" : band >= 3 && A2_READY ? "a2" : "a1";
      var ORD = ["a1", "a2", "b1", "b2"], gi = ORD.indexOf(goLv), LAST = { a1: 12, a2: 13, b1: 14 };
      // níveis abaixo do destino ficam concluídos e abertos (sem perder o plano do dia que já existia lá)
      ORD.slice(0, gi).forEach(function (lv) { S[DONE_KEY[lv]] = true; var B = S.byLevel[lv] || {}; B.theme = Math.max(B.theme || 0, LAST[lv]); S.byLevel[lv] = B; });
      if (goLv !== LVL) {
        S.byLevel[LVL] = { theme: S.theme, daily: S.daily, dailyDone: S.dailyDone, paused: S.paused }; // guarda onde parou no nível atual
        S.level = goLv; S.daily = null; S.dailyDone = null; S.paused = null; S.goA2 = true;
        S.theme = goLv === "a1" ? ([0, 3, 8][band] || 0) : Math.max(0, (S.byLevel[goLv] && S.byLevel[goLv].theme) || 0);
      } else if (goLv === "a1") S.theme = Math.max(S.theme || 0, [0, 3, 8][band] || 0);
      markDay(); persist(); nameScreen(result);
    }
    nextPart();
  }
  function weakest() { var s = (S.test && S.test.skills) || {}; var k = Object.keys(SKILLS).sort(function (a, b) { return (s[a] || 0) - (s[b] || 0); }); return k[0]; }
  var BANDS = ["Iniciante · A1 começo", "A1 · meio", "A1 · final", "A2", "B1", "B2"];
  function selfCompare() {
    if (S.self == null || !S.test || S.test.skipped) return null;
    var me = S.self, real = S.test.band, x = SELF[me];
    var msg = real > me ? "🎉 Você sabe <b>mais do que pensa</b>! O seu ouvido já pega mais coisa do que você imagina." :
      real === me ? "👏 Você se conhece bem: o teste confirmou o que você achou." :
      me === 3 ? "😅 O teste mostrou outra coisa… era coisa da sua cabeça? Calma: entender o nativo é mais difícil do que parece. É exatamente isso que a gente vai destravar." :
      "💪 O teste mostrou um nível um pouco abaixo do que você achou. Normal: na hora de ouvir de verdade, trava. É pra isso que serve o treino.";
    return el("div", { cls: "card self-cmp" }, el("span", { cls: "eyebrow", text: "Você achou x o teste mostrou" }),
      el("div", { cls: "cmp-row" }, el("span", null, el("small", { text: "Você achou" }), el("b", { text: x.e + " " + x.t })), el("span", { cls: "cmp-arrow", text: "→" }), el("span", null, el("small", { text: "O teste mostrou" }), el("b", { text: BANDS[real] }))),
      el("p", { html: msg }));
  }
  function result() {
    if (S.goA2 && S.level && S.level !== "a1") setTimeout(function () { try { SFX.win(); confetti(); } catch (e) {} }, 400);
    var w = screen(), T = S.test, wk = weakest();
    w.append(topBar(), el("section", { cls: "hero" },
      el("span", { cls: "eyebrow", text: "Seu resultado" + (S.name ? ", " + S.name : "") }),
      el("h1", { html: "Seu nível: <mark>" + esc(BANDS[T.band]) + "</mark>" }),
      el("p", { text: "Esse é o retrato das 4 habilidades que a gente mediu só ouvindo e falando." })), selfCompare());
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
      el("p", { html: "Todo dia a Destravando monta um treino de ~15 min, em fases curtas, com um exercício a mais de <b>" + PROB[focusProb()].emoji + " " + esc(PROB[focusProb()].name.toLowerCase()) + "</b>, porque é o que mais trava você. " + (S.goA2 ? (S.level === "a1" ? "Você vai treinar no <b>A1</b>, começando do tema " + (S.theme + 1) + "." : "Você já passou do " + ({ a2: "A1", b1: "A2", b2: "B1" })[S.level] + ": <b>você começa no " + S.level.toUpperCase() + "!</b> 🚀") : "Você começa no tema <b>" + (S.theme + 1) + " · " + esc((INDEX[S.theme] || INDEX[0]).title) + "</b>.") }),
      el("p", { cls: "small", text: "A nota da fala é automática, pelo reconhecimento de voz: é uma estimativa." })),
      el("button", { cls: "btn big", type: "button", text: "Começar meu treino →", onclick: function () { if (S.goA2) { S.goA2 = false; persist(); location.reload(); } else home(); } }));
  }

  // ===== início =====
  function themeMastery(uid) {
    var n = 0; [0, 1, 2, 3, 4].forEach(function (v) { var r = S.done[dkey("rt", uid, v)]; if (r && r.best >= 0.7) n++; }); return n; // 2 de 3 Real Times bons = domínio
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
    // ordem do homework: cena com a cabeça fresca → ditado (respiro) → bloco da fofoca → entrada antes de saída
    var list = [{ st: "cena", uid: uid }, { st: "ditado", uid: uid }, { st: "fofoca", uid: uid }, { st: "lacuna", uid: uid }, { st: "shadow", uid: uid }, { st: "leitura", uid: uid }, { st: "rt", uid: uid }];
    // 🔑 Thiago 28/11 ("minha mãe só sabe hello" + "eu prometo prática, não aula"): tema novo começa pelo aquecimento das FRASES-CHAVE, e nesse dia o treino fica mais curto
    if (!S.done[dkey("aula", uid, 0)]) list = [{ st: "aula", uid: uid }, { st: "cena", uid: uid }, { st: "fofoca", uid: uid }, { st: "shadow", uid: uid }, { st: "rt", uid: uid }];
    if (focusProb() === "ouvir") list.push({ st: ear2, uid: GERAL.id });
    else {
      // Thiago 29/11 ("o 6º parece o 5º"): o extra da fala é sempre um exercício que ainda não está no dia; se todos já estão, vira revisão de tema anterior (com ícone de revisão)
      var falta = ["leitura", "shadow", "rt"].filter(function (k) { return !list.some(function (x) { return x.st === k; }); })[0];
      if (falta) list.push({ st: falta, uid: uid });
      else list.push({ st: "rt", uid: t > 0 ? INDEX[Math.floor(Math.random() * t)].id : uid, review: t > 0 });
    }
    if (myErrors().length) list.push({ st: "erros" });
    return list;
  }
  function home() {
    if (!S.test) return welcome();
    try { syncBadge(); } catch (e) {}
    setTimeout(function () { try { offerFace(); sendTz(); joinInvite(); } catch (e) {} }, 900);
    var fresh = unlockCheck(); if (fresh) return unlockScreen(fresh);
    var w = screen(), t = curTheme(), I = INDEX[t];
    var D = todayPlan(), plan = D.plan, doneToday = (S.dailyDone === today()), roundOver = D.i >= plan.length, resume = D.i > 0 && !roundOver;
    w.append(topBar(),
      el("section", { cls: "hello" }, el("p", { cls: "hand", text: hiLine(doneToday) }),
        el("div", { cls: "lvl" }, el("span", { cls: "lvl-badge", text: LVL === "b2" ? "B2 · intermediário superior" : LVL === "b1" ? "B1 · intermediário" : LVL === "a2" ? "A2 · pré-intermediário" : BANDS[S.test.band] }), S.test.skipped ? el("span", { cls: "small", text: "começando pelo tema 1" }) : el("span", { cls: "small", text: "foco: " + PROB[focusProb()].emoji + " " + PROB[focusProb()].name.toLowerCase() }))),
      recadoCard(recadoHoje()),
      installCard() || pushCard(),
      howTo(),
      streakCard(),
      S.paused ? el("button", { cls: "paused-card", type: "button", onclick: resumePaused }, el("span", { cls: "pe", text: "☕" }),
        el("span", { cls: "tt" }, el("b", { text: "Você pausou: " + ST[S.paused.st].emoji + " " + ST[S.paused.st].name }), el("span", { cls: "small", text: ["erros", "cena", "fofoca"].indexOf(S.paused.st) > -1 ? "Toque pra continuar de onde parou." : "Parou na frase " + (S.paused.i + 1) + ". Toque pra continuar de onde parou." })), el("span", { cls: "go", text: "Continuar →" })) : "",
      el("button", { cls: "daily" + (doneToday ? " done" : ""), type: "button", onclick: function () { if (roundOver) { S.daily = { date: today(), plan: dailyPlan(), i: 0 }; persist(); } runDaily(); } },
        el("span", { cls: "eyebrow", text: doneToday && !resume ? "✅ Treino de hoje feito · quer mais?" : doneToday ? "➕ Treino extra" : "▶️ Treino de hoje · ~15 min" }),
        el("b", { text: "Tema " + (t + 1) + " · " + I.title }),
        el("span", { cls: "dlist" }, plan.map(function (x, k) { return el("span", { cls: (k < D.i && !roundOver ? "dn" : "") + (k === D.i && !roundOver ? " nx" : "") + " dl-ic", style: "--c:" + (STC[x.st] || "#6F2A3D"), title: ST[x.st].name + (x.review ? " (revisão)" : "") }, icn(x.review ? "revisar" : (STICN[x.st] || "alvo"))); })),
        resume ? el("span", { cls: "small", text: "⏸️ Você parou na fase " + (D.i + 1) + " de " + plan.length }) : null,
        el("span", { cls: "go", text: resume ? "Continuar →" : "Começar →" })));
    (function () { var h = w.querySelector("section.hello"), d = w.querySelector("button.daily"), pc = w.querySelector(".paused-card"); if (h && d) { h.after(d); if (pc) h.after(pc); } })();
    // 🗺️ trilha logo abaixo do treino de hoje: o aluno sempre vê onde está e o que falta
    var nDone = 0; INDEX.forEach(function (x) { if (themeMastery(x.id) >= 2) nDone++; });
    var tl = el("div", { cls: "trail" }), XS = [0, 1, 1.6, 1, 0, -1, -1.6, -1], hereNode = null;
    INDEX.forEach(function (x, i) {
      var open = themeOpen(i), m = Math.min(themeMastery(x.id), 2), done = m >= 2, here = i === t && !done;
      var falta = 2 - m;
      var node = el("button", { cls: "tnode" + (done ? " done" : here ? " here" : open ? " open" : " locked"), type: "button", disabled: !open, style: "--x:" + XS[i % XS.length], onclick: function () { themePage(i); } },
        here ? el("span", { cls: "bubble", text: "VOCÊ ESTÁ AQUI" }) : null,
        el("span", { cls: "disc" }, done ? "✓" : open ? x.emoji : "🔒"),
        el("span", { cls: "tlabel" }, el("b", { text: (i + 1) + " · " + x.title }),
          el("span", { cls: "small", text: done ? "dominado ✓" : open ? "falta " + falta + " Real Time" + (falta > 1 ? "s" : "") + " com 70%+" : "abre quando o tema " + i + " estiver dominado" })));
      if (here) hereNode = node;
      tl.append(node);
      if (i < INDEX.length - 1) tl.append(el("span", { cls: "tline" + (done ? " done" : ""), style: "--x:" + ((XS[i % XS.length] + XS[(i + 1) % XS.length]) / 2) }));
    });
    var NX = NEXT_LV[LVL] ? NEXT_LV[LVL].toUpperCase() : "", OKF = S[DONE_KEY[LVL]];
    tl.append(hasFinal() ? el("button", { cls: "tgoal final", type: "button", onclick: runFinal }, el("span", { cls: "disc" }, OKF ? "🎓" : "🏆"), el("b", { text: OKF ? "Teste final: aprovado ✅" : "🎓 Teste final do " + LVL.toUpperCase() }), el("span", { cls: "small", text: OKF ? NX + " liberado" : nDone >= INDEX.length ? "Bora! Quem passa libera o " + NX + " →" : "Recomendado depois do tema " + INDEX.length + " · passe e libere o " + NX }))
      : el("div", { cls: "tgoal" }, el("span", { cls: "disc" }, "🏆"), el("b", { text: nDone >= INDEX.length ? LVL.toUpperCase() + " completo!" : "🏁 Meta: o " + LVL.toUpperCase() + " inteiro" }), el("span", { cls: "small", text: nDone >= INDEX.length ? (LVL === "b2" ? "Você chegou ao topo da trilha. Falou, validou!" : "Próximo nível em breve") : "Faltam " + (INDEX.length - nDone) + " temas pra fechar a trilha" })));
    // depois do treino de hoje: retrospectiva (na semana), treino no fone e desafio com amigos, em linhas compactas
    w.append(el("div", { cls: "extra-rows" }, retroCard(), foneCard(), amigosCard()));
    w.append(myTiles(), el("h2", { cls: "sec", text: "🗺️ Sua trilha do " + LVL.toUpperCase() }),
      el("div", { cls: "trail-head" }, steps(t + 1, INDEX.length, "Tema"), el("p", { cls: "small", text: nDone + " de " + INDEX.length + " temas dominados. Cada tema abre o próximo quando você manda bem (70%+) em 2 Real Times dele." })), tl);
    // ➕ mais treinos: tudo que é opcional fica guardado aqui (menos escolha = mais treino)
    var fp = focusProb(), probs = el("div", { cls: "probs" });
    ["ouvir", "falar"].forEach(function (k) {
      var P = PROB[k];
      probs.append(el("button", { cls: "prob" + (k === fp ? " focus" : ""), type: "button", onclick: function () { probPage(k, t); } },
        el("span", { cls: "pe", text: P.emoji }), el("span", { cls: "pt" }, el("b", { text: P.name }), el("span", { cls: "small", text: P.pt }),
          el("span", { cls: "pl", text: P.list.map(function (st) { return ST[st].emoji; }).join(" ") + "  ·  " + P.list.length + " exercícios" })),
        k === fp ? el("span", { cls: "ptag", text: "seu foco" }) : null));
    });
    var nErr = myErrors().length;
    var er = el("button", { cls: "station errs" + (nErr ? "" : " off"), type: "button", disabled: !nErr, onclick: function () { runErrors(); } },
      el("span", { cls: "se", text: "🧠" }), el("span", { cls: "tt" }, el("b", { text: "Meus erros" }), el("span", { cls: "small", text: nErr ? nErr + " pra revisar" : "nada por enquanto 🎉" })));
    var lvSw = el("div", { cls: "lvsw" });
    [["a1", "A1", "Básico"], ["a2", "A2", "Pré-intermediário"]].concat(B1_READY ? [["b1", "B1", "Intermediário"], ["b2", "B2", "Interm. superior"]] : []).forEach(function (L) {
      var locked = (L[0] === "a2" && !a2Open()) || (L[0] === "b1" && !b1Open()) || (L[0] === "b2" && !b2Open());
      lvSw.append(el("button", { cls: "lvs" + (L[0] === LVL ? " sel" : "") + (locked ? " locked" : ""), type: "button", disabled: locked && L[0] !== LVL,
        onclick: function () { setLevel(L[0]); } }, el("b", { text: (locked ? "🔒 " : "") + L[1] }), el("span", { cls: "small", text: locked ? "passe no teste final do " + (L[0] === "b2" ? "B1" : L[0] === "b1" ? "A2" : "A1") : L[2] })));
    });
    var more = el("details", { cls: "more" }, el("summary", {}, el("span", { text: "➕ Mais treinos" }), el("span", { cls: "small", text: "inglês de verdade, treino livre, meus erros" + (nErr ? " (" + nErr + ")" : "") + ", nível" })),
      el("button", { cls: "station errs", type: "button", onclick: function () { pushNav(); cadernoPage(); } }, el("span", { cls: "se", text: "📒" }), el("span", { cls: "tt" }, el("b", { text: "Meu caderno" }), el("span", { cls: "small", text: "expressões de nativo que você guardou: revise" }))),
      el("button", { cls: "station errs", type: "button", onclick: extrasPage }, el("span", { cls: "se", text: "🎧" }), el("span", { cls: "tt" }, el("b", { text: "Inglês de verdade" }), el("span", { cls: "small", text: "entrevista de rua, série, vlog: ouvir e escolher" }))),
      el("h3", { cls: "sec", text: "O que mais trava você?" }), probs, er,
      el("h3", { cls: "sec", text: "Nível" }), lvSw,
      el("button", { cls: "linkish", type: "button", text: S.test && S.test.skipped ? "📝 Teste de nível (opcional · faz uma vez só, se quiser saber seu nível)" : "📝 Refazer o teste de nível (opcional · só se quiser medir de novo)", onclick: runTest }));
    w.append(more, menuBar("home"));
  }
  // 🔓 tema novo liberado: comemora na hora, não deixa o aluno descobrir sozinho
  function unlockCheck() {
    var ids = INDEX.filter(function (x) { return themeMastery(x.id) >= 2; }).map(function (x) { return x.id; });
    if (!S.mastered) { S.mastered = ids; persist(); return null; }
    var fresh = ids.filter(function (id) { return S.mastered.indexOf(id) < 0; });
    if (!fresh.length) return null;
    ids.forEach(function (id) { if (S.mastered.indexOf(id) < 0) S.mastered.push(id); }); persist();
    return fresh[fresh.length - 1];
  }
  function unlockScreen(uid) {
    var i = uidx(uid), I = INDEX[i], N = INDEX[i + 1], w = screen();
    markDay(); persist(); setTimeout(function () { SFX.win(); confetti(); }, 250);
    w.append(topBar(), el("section", { cls: "hero center unlock" }, el("div", { cls: "big-emoji", text: "🔓" }),
      el("span", { cls: "eyebrow", text: "Tema " + (i + 1) + " dominado" }),
      el("h1", { html: N ? "Liberou o <mark>tema " + (i + 2) + "</mark>!" : "Você dominou <mark>todo o " + LVL.toUpperCase() + "</mark>!" }),
      el("p", { text: "Você mandou bem em " + I.emoji + " " + I.title + "." }),
      N ? el("div", { cls: "card nextph" }, el("span", { cls: "eyebrow", text: "Próximo tema" }), el("b", { text: N.emoji + " " + N.title }), el("span", { cls: "small", text: N.titlePt || "" })) : null,
      el("p", { cls: "hand", text: "🔥 " + streak() + (streak() === 1 ? " dia" : " dias") + " de ofensiva. Falou, validou!" })),
      !N && hasFinal() && !S[DONE_KEY[LVL]] ? el("button", { cls: "btn big", type: "button", text: "🎓 Fazer o teste final do " + LVL.toUpperCase() + " →", onclick: runFinal }) :"",
      el("button", { cls: N || S[DONE_KEY[LVL]] || !hasFinal() ? "btn big" : "linkish", type: "button", text: N ? "Bora pro próximo →" : "Ver minha trilha", onclick: home }));
    buzz([40, 60, 40]);
  }
  // ---------- teste final A1 -> A2 (4 partes x 25 pts; passa com 65 e >= 50% em cada parte) ----------
  var FINAL = null;
  function loadFinal() { if (FINAL) return Promise.resolve(FINAL); return j("/aprender/" + (LVL === "a1" ? "" : LVL + "/") + "data/teste-final.json?v=" + (window.__v || 1)).then(function (x) { FINAL = x; return x; }); }
  function runFinal() {
    var w = screen(); w.append(el("p", { text: "Carregando o teste…" }));
    loadFinal().then(finalIntro).catch(function () { netError(); });
  }
  function finalIntro(F) {
    var w = screen(), SV = S[FS];
    w.append(topBar(home), el("section", { cls: "hero" },
      el("span", { cls: "eyebrow", text: "🎓 Teste final do " + LVL.toUpperCase() }),
      el("h1", { html: "Pronto pro <mark>" + NEXT_LV[LVL].toUpperCase() + "</mark>?" }),
      el("p", { text: "São 4 partes, uns 20 minutos: " + F.parts.map(function (P) { return P.emoji + " " + P.title; }).join(" · ") + ". Dá pra pausar e continuar depois." }),
      el("p", { cls: "small", text: "Pra passar: " + F.passTotal + " de 100 pontos e pelo menos metade em cada parte. Quem passa libera o " + NEXT_LV[LVL].toUpperCase() + "." })),
      S[FL] ? el("div", { cls: "card" }, el("b", { text: "Última tentativa: " + S[FL].total + "/100 " + (S[FL].pass ? "✅" : "") }), el("p", { cls: "small", text: S[FL].date })) : "",
      el("button", { cls: "btn big", type: "button", text: SV ? "Continuar da parte " + (SV.pi + 1) + (SV.ii ? ", questão " + (SV.ii + 1) : "") + " →" : "Começar o teste →", onclick: function () { finalFlow(F); } }),
      SV ? el("button", { cls: "linkish", type: "button", text: "Recomeçar do zero", onclick: function () { S[FS] = null; persist(); finalFlow(F); } }) : "");
  }
  function finalFlow(F) {
    var SV = S[FS], res = SV ? SV.res : {}, pi = SV ? SV.pi : 0, ii = 0, got = [];
    var resumeAt = SV && SV.ii ? { ii: SV.ii, got: SV.got || [] } : null; // pausa volta na questão exata
    function save() { S[FS] = { res: res, pi: pi, ii: ii, got: got.slice(), date: today() }; persist(); }
    var A = LVL === "a1" ? "/aprender/audio/" : AUD; // teste final do A2/B1 mora na pasta do próprio nível
    function head(P, intro) {
      return el("div", { cls: "thead" }, el("header", { cls: "top" }, el("span", { cls: "brand", text: "🎓 Teste final" }),
        el("button", { cls: "pause", type: "button", text: "Pausar", onclick: function () {
          stopAll(); save();
          var w2 = screen();
          w2.append(el("section", { cls: "hero center rest" }, el("div", { cls: "big-emoji", text: "☕" }), el("h1", { text: "Teste pausado." }),
            el("p", { text: "Tudo salvo. Quando voltar, você continua exatamente daqui: parte " + (pi + 1) + " de " + F.parts.length + ", questão " + (ii + 1) + "." })),
            el("button", { cls: "btn big", type: "button", text: "Continuar agora →", onclick: function () { finalFlow(F); } }),
            el("button", { cls: "linkish", type: "button", text: "Ir pro início", onclick: home }));
        } })),
        el("span", { cls: "eyebrow", text: "Teste final · " + P.emoji + " " + P.title }),
        steps(pi + 1, F.parts.length, "Parte", F.parts.map(function (x) { return x.emoji; })),
        !intro && ii < P.items.length ? steps(ii + 1, P.items.length, "Questão") : el("p", { cls: "small", text: P.items.length + " questões nesta parte" }));
    }
    function nextPart() {
      if (pi >= F.parts.length) return finish();
      var P = F.parts[pi]; ii = 0; got = [];
      if (resumeAt) { ii = resumeAt.ii; got = resumeAt.got; resumeAt = null; return nextItem(); }
      var w = screen();
      w.append(head(P, true), el("div", { cls: "card intro" }, el("h2", { text: P.emoji + " Parte " + (pi + 1) + " de " + F.parts.length + " — " + P.title }), el("p", { text: P.tip })),
        el("button", { cls: "btn big", type: "button", text: "Vamos →", onclick: nextItem }));
    }
    function score(v) {
      got.push(Math.max(0, Math.min(1, v))); ii++;
      var P = F.parts[pi];
      if (ii >= P.items.length) { var s = 0; got.forEach(function (x) { s += x; }); res[P.key] = Math.round(s / P.items.length * 25); pi++; ii = 0; got = []; save(); setTimeout(nextPart, 300); }
      else { save(); setTimeout(nextItem, 300); }
    }
    function norm(s) { return String(s || "").toLowerCase().replace(/[^a-z0-9@.]/g, ""); }
    function nextItem() {
      var P = F.parts[pi], it = P.items[ii], w = screen(), done = false;
      function once(v) { if (done) return; done = true; score(v); }
      w.append(head(P));
      if (P.key === "ouvir" || P.key === "ler") {
        var card = el("div", { cls: "card" }, el("h2", { text: it.q }));
        if (it.text) card.append(el("pre", { cls: "final-text", text: it.text }));
        var body = el("div", { cls: "fbody" + (it.audio ? " locked" : "") });
        if (it.type === "mcq") {
          var opts = el("div", { cls: "opts" });
          // embaralha as alternativas (no A1 a certa era sempre a 1ª: dava pra passar no chute)
          it.options.map(function (o, k) { return k; }).sort(function () { return Math.random() - 0.5; }).forEach(function (k) { var o = it.options[k]; opts.append(el("button", { cls: "opt", type: "button", text: o, onclick: function (e) { if (done || opts._ans) return; opts._ans = 1; var g = k === it.answer; e.currentTarget.classList.add(g ? "ok" : "bad"); if (!g) [].forEach.call(opts.children, function (b) { if (b.textContent === it.options[it.answer]) b.classList.add("ok"); }); fb(g); setTimeout(function () { once(g ? 1 : 0); }, g ? 600 : 1300); } })); });
          body.append(opts);
        } else {
          var inp = el("input", { type: "text", cls: "final-in", placeholder: it.digits ? "só números" : "digite aqui", autocomplete: "off", autocapitalize: "off", spellcheck: "false" });
          body.append(inp, el("button", { cls: "btn", type: "button", text: "Confirmar →", onclick: function () { var v = norm(inp.value); if (it.digits) v = v.replace(/\D/g, ""); var g = it.answer.some(function (a) { return norm(a) === v; }); if (inp.disabled) return; inp.disabled = true; fb(g); body.append(el("p", { cls: "small", text: g ? "✅ Isso!" : "🔴 A resposta era: " + it.answer[0] })); setTimeout(function () { once(g ? 1 : 0); }, g ? 600 : 1600); } }));
        }
        if (it.audio) card.append(player(A + it.file, { max: 2, onEnd: function () { body.classList.remove("locked"); } }));
        card.append(body); w.append(card);
        if (it.audio) setTimeout(function () { var b = w.querySelector(".pbtn"); if (b) b.click(); }, 300);
      } else if (it.type === "form") {
        var c2 = el("div", { cls: "card" }, el("h2", { text: it.q })), ins = [];
        it.fields.forEach(function (f) { var i2 = el("input", { type: "text", cls: "final-in", placeholder: f.label, autocomplete: "off" }); ins.push([f, i2]); c2.append(el("label", { cls: "flabel", text: f.label }), i2); });
        c2.append(el("button", { cls: "btn", type: "button", text: "Enviar ficha →", onclick: function () {
          var ok = 0, DAYS = /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i;
          ins.forEach(function (p) { var f = p[0], v = p[1].value.trim(), good = false;
            if (f.kind === "name") good = /^[A-Za-zÀ-ÿ' -]{2,}$/.test(v);
            else if (f.kind === "number") good = /^\d{1,3}$/.test(v) || /^[a-z -]{3,}$/i.test(v);
            else if (f.kind === "phone") good = v.replace(/\D/g, "").length >= 7;
            else if (f.kind === "email") good = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(v);
            else if (f.kind === "day") good = DAYS.test(v);
            else good = /^[A-Za-z][A-Za-z -]{1,}$/.test(v);
            if (good) ok++; });
          once(ok / ins.length);
        } }));
        w.append(c2);
      } else if (it.type === "message") {
        var ta = el("textarea", { cls: "final-ta", rows: 6, placeholder: "Hi Sam! …" }), cnt = el("span", { cls: "small", text: "0 palavras" });
        ta.addEventListener("input", function () { cnt.textContent = cw(ta.value).length + " palavras"; });
        w.append(el("div", { cls: "card" }, el("h2", { text: it.q }), el("ul", {}, it.bullets.map(function (b) { return el("li", { text: b }); })), ta, cnt,
          el("button", { cls: "btn", type: "button", text: "Enviar mensagem →", onclick: function () {
            var t = " " + ta.value.toLowerCase().replace(/[’']/g, "'") + " ", n = cw(ta.value).length;
            var hits = it.checks.filter(function (c) { return (c.any || []).some(function (x) { return t.indexOf(x) > -1; }) || (c.re && new RegExp(c.re).test(t)); }).length;
            var size = n >= it.minWords ? 1 : n / it.minWords;
            once(0.4 * size + 0.6 * (hits / it.checks.length));
          } })));
      } else if (P.key === "repetir") {
        // 🔁 pronúncia: ouvir e repetir igualzinho (frase escondida)
        var c5 = el("div", { cls: "card" }, el("h2", { text: "🔁 Ouça e repita igualzinho" }), el("p", { cls: "hidden-line", text: "🙈 frase escondida" }));
        var t5 = talk(function (said, manual) { once(manual ? 0.5 : overlap(it.en, said)); }, { label: "🎤 Segure e repita" });
        t5.classList.add("locked");
        c5.append(player(A + it.file, { max: 2, onEnd: function () { t5.classList.remove("locked"); } }), t5);
        w.append(c5);
        setTimeout(function () { var b = w.querySelector(".pbtn"); if (b) b.click(); }, 300);
      } else if (P.key === "recontar") {
        // 🗣️ ouvir a historinha e recontar falando
        var c6 = el("div", { cls: "card" }, el("h2", { text: "🗣️ " + (it.title || "Mini fofoca") }), el("p", { cls: "small", text: "Pode começar com: \"So, the story is about…\"" }));
        var t6 = talk(function (said, manual) {
          if (manual) return once(0.5);
          var k = (it.keywords || []).filter(function (x) { return has(said, x); }).length / Math.max(1, (it.keywords || []).length);
          once(Math.min(1, k * 1.3) * (cw(said).length >= (it.minWords || 10) ? 1 : 0.6));
        }, { label: "🎤 Segure e reconte" });
        t6.classList.add("locked");
        c6.append(player(A + it.file, { max: 2, onEnd: function () { t6.classList.remove("locked"); } }), t6);
        w.append(c6);
      } else {
        var c3 = el("div", { cls: "card" }, el("h2", { text: "⚡ " + it.q }));
        if (it.scene) c3.append(el("div", { cls: "final-scene", text: it.scene }));
        function judge(txt) { var groups = it.expect || [], g = groups.filter(function (grp) { return grp.some(function (x) { return has(txt, x); }); }).length; var enough = cw(txt).length >= (it.minWords || 4); return (groups.length ? g / groups.length : 1) * (enough ? 1 : 0.5); }
        // sem microfone: vale metade (o Destravando não tem parte escrita)
        var t4 = talk(function (said, manual) { once(manual ? 0.5 : judge(said)); }, { label: "🎤 Segure e responda" });
        t4.classList.add("locked");
        c3.append(player(A + it.file, { max: 2, onEnd: function () { t4.classList.remove("locked"); } }), t4);
        w.append(c3);
        setTimeout(function () { var b = w.querySelector(".pbtn"); if (b) b.click(); }, 300);
      }
      w.append(el("button", { cls: "linkish", type: "button", text: "Não sei — pular", onclick: function () { once(0); } }));
    }
    function finish() {
      var total = 0, low = [];
      F.parts.forEach(function (P) { var v = res[P.key] || 0; total += v; if (v < 25 * F.passPart / 100) low.push(P); });
      var pass = total >= F.passTotal && !low.length;
      S[FS] = null; S[FL] = { total: total, res: res, pass: pass, date: today() };
      if (pass) { S[DONE_KEY[LVL]] = true; S.recados = S.recados || {}; S.recados.pend = 4; conquista("🎓 Você passou de nível!", "O " + NEXT_LV[LVL].toUpperCase() + " está liberado. Bora!"); setTimeout(function () { SFX.win(); confetti(); }, 300); }
      markDay(); persist();
      var w = screen();
      w.append(topBar(home), el("section", { cls: "hero" + (pass ? " center" : "") },
        pass ? el("div", { cls: "big-emoji", text: "🎓" }) : null,
        el("span", { cls: "eyebrow", text: "Resultado do teste final" }),
        el("h1", { html: pass ? "Você passou: <mark>" + total + "/100</mark>! O " + NEXT_LV[LVL].toUpperCase() + " está liberado 🚀" : "Você fez <mark>" + total + "/100</mark>. Quase lá!" }),
        el("p", { text: pass ? "Mandou bem nas 4 partes. Agora é " + NEXT_LV[LVL].toUpperCase() + "." : "Pra passar precisa de " + F.passTotal + " pontos e pelo menos metade em cada parte. Treine o que está abaixo e tente de novo quando quiser." })));
      var bars = el("div", { cls: "card skills" });
      F.parts.forEach(function (P) { var v = res[P.key] || 0, pct = Math.round(v / 25 * 100), weak = low.indexOf(P) > -1;
        bars.append(el("div", { cls: "skill" + (weak ? " weak" : "") }, el("div", { cls: "skrow" }, el("b", { text: P.emoji + " " + P.title }), el("span", { text: v + "/25" })),
          el("div", { cls: "pbar2" }, el("i", { style: "width:" + Math.max(4, pct) + "%" })), el("p", { cls: "small", text: pct >= 70 ? "Muito bom! ✅" : weak ? "Abaixo do mínimo. " + P.focus : "Ok, mas dá pra melhorar. " + P.focus }))); });
      w.append(pass ? recadoCard(recadoHoje()) : null, pass ? certCard(LVL, total) : null, bars, pass ? el("button", { cls: "btn big", type: "button", text: "Ir pro " + NEXT_LV[LVL].toUpperCase() + " →", onclick: function () { setLevel(NEXT_LV[LVL]); } })
        : el("button", { cls: "btn big", type: "button", text: "Voltar a treinar →", onclick: home }),
        el("p", { cls: "small", text: "A nota da fala é automática, pelo reconhecimento de voz: é uma estimativa." }));
    }
    nextPart();
  }
  function themePage(i) {
    var I = INDEX[i], w = screen();
    w.append(topBar(home), el("span", { cls: "eyebrow", text: "Tema " + (i + 1) }), el("h1", { text: I.emoji + " " + I.title }), el("p", { cls: "small", text: I.titlePt + " · " + I.grammar }),
      el("button", { cls: "station aula-st", type: "button", onclick: function () { pickVar("aula", I.id, i); } }, el("span", { cls: "se", text: "🔑" }), el("b", { text: "Frases-chave do tema" + (S.done[dkey("aula", I.id, 0)] ? " ✅" : "") }), el("span", { cls: "small", text: "aquecimento: ouça, entenda e já fale. Comece por aqui" })));
    ["ouvir", "falar"].forEach(function (k) { w.append(el("h2", { cls: "sec", text: PROB[k].emoji + " " + PROB[k].name }), stationGrid(k, i)); });
  }
  function stationGrid(k, ti) {
    var box = el("div", { cls: "stations" });
    PROB[k].list.forEach(function (st) {
      var X = ST[st], uid = GLOBAL_ST[st] ? GERAL.id : INDEX[ti].id;
      box.append(el("button", { cls: "station", type: "button", onclick: function () { pickVar(st, uid, ti); } }, el("span", { cls: "se", text: X.emoji }), el("b", { text: X.name }), el("span", { cls: "small", text: X.pt })));
    });
    return box;
  }
  function probPage(k, ti) {
    var P = PROB[k], w = screen(), I = INDEX[ti];
    w.append(topBar(home), el("span", { cls: "eyebrow", text: "Treino livre · Tema " + (ti + 1) + " · " + I.title }), el("h1", { text: P.emoji + " " + P.name }), el("p", { cls: "small", text: P.pt + " Cada exercício tem 5 variações: errou ou quer mais, faz a próxima." }),
      stationGrid(k, ti), el("p", { cls: "small", text: "Quer outro tema? Escolha lá embaixo no início." }));
  }
  function getUnit(uid) { return Promise.all([loadOuv(), loadSeven(), loadParts(), loadRef()]).then(function () { return uid === GERAL.id ? GERAL : loadUnit(uid); }); }
  function pickVar(st, uid) {
    var w = screen(); w.append(topBar(home), skel());
    getUnit(uid).catch(function () { netError(); return Promise.reject(); }).then(function (u) {
      w.innerHTML = ""; var X = ST[st], i = uidx(uid);
      w.append(topBar(home), el("span", { cls: "eyebrow", text: X.emoji + " " + X.name + (uid === GERAL.id ? "" : " · Tema " + (i + 1) + " · " + u.title) }), el("h1", { text: "Escolha a variação" }),
        el("p", { cls: "small", text: "Mesmo assunto, situação diferente. Precisa treinar mais? Faça a próxima." }));
      var list = el("div", { cls: "vars" });
      variations(u, st).forEach(function (x, v) {
        var r = S.done[dkey(st, uid, v)], ok = playable(x);
        list.append(el("button", { cls: "var" + (ok ? "" : " off"), type: "button", disabled: !ok, onclick: function () { runStation(st, u, v, function () { pickVar(st, uid); }); } },
          el("span", { cls: "vn", text: String(v + 1) }),
          el("span", { cls: "vt" }, el("b", { text: x.label || "Variação " + (v + 1) }), el("span", { cls: "small", text: ok ? (r ? "feito " + r.n + "x · melhor " + Math.round(r.best * 100) + "%" : "nova") : "vídeo chegando" }))));
      });
      w.append(list);
    });
  }

  // ===== 🎧 Extras com nativo de verdade (vlog, série, entrevista de rua) =====
  // Só ouvir e escolher a palavra (nada de digitar). Banco conferido: aulas-rotinas/extras-banco → academia/extras.json
  var EXTRAS = null;
  function loadExtras() { if (EXTRAS) return Promise.resolve(EXTRAS); return j("/academia/extras.json?v=" + (window.__v || 1)).then(function (x) { EXTRAS = x; return x; }); }
  function gapParts(en) { var m = en.match(/\[\[([^\]]+)\]\]/); if (!m) return null; return { ans: m[1].split("|")[0], before: en.slice(0, m.index), after: en.slice(m.index + m[0].length) }; }
  function cleanLine(en) { return en.replace(/\[\[([^\]]+)\]\]/g, function (_, a) { return a.split("|")[0]; }); }
  function extrasPage() {
    var w = screen(); w.append(topBar(home), skel());
    loadExtras().then(function (L) {
      w.innerHTML = ""; S.extras = S.extras || {};
      w.append(topBar(home), el("span", { cls: "eyebrow", text: "➕ Quer mais?" }), el("h1", { text: "🎧 Inglês de verdade" }),
        el("p", { cls: "small", text: "Trechos reais: entrevista na rua, série, vlog. Você ouve com a tela coberta e escolhe a palavra que ouviu. É difícil mesmo: é o inglês da rua." }));
      var list = el("div", { cls: "vars" });
      L.forEach(function (X) {
        var r = S.extras[X.id];
        list.append(el("button", { cls: "var", type: "button", onclick: function () { stExtra(X); } },
          el("span", { cls: "vn", text: /Série|📺/.test(X.source) ? "📺" : "🎤" }),
          el("span", { cls: "vt" }, el("b", { text: X.title }), el("span", { cls: "small", text: X.source + " · " + (r ? "melhor " + Math.round(r.best * 100) + "%" : X.lines.length + " falas") }))));
      });
      w.append(list, menuBar("nativo"));
    }, netError);
  }
  function stExtra(X) {
    var w = screen(), i = 0, ok = 0, p = null, ready = false, poll = null, cur = null;
    w.append(el("header", { cls: "top" }, el("button", { cls: "back", type: "button", text: "‹ Inglês real", onclick: function () { stopYT(); extrasPage(); } }), el("span", { cls: "brand", text: "🎧 Inglês de verdade" })),
      el("span", { cls: "eyebrow", text: X.source }), el("h1", { text: X.title }), el("p", { cls: "small", text: X.focus }));
    var holder = el("div"), cover = el("div", { cls: "yt-cover" }, el("span", { text: "🙈 Só ouvindo" }));
    var yt = el("div", { cls: "yt covered" }, holder, cover);
    var stage = el("div");
    w.append(el("div", { cls: "card" }, yt), stage);
    function stopYT() { clearInterval(poll); poll = null; try { p && p.pauseVideo(); } catch (e) {} }
    // ⏸ Thiago 28/11: dá pra pausar e continuar o trecho (o ▶ vira ⏸ enquanto toca)
    var pbt = null, halted = false;
    function setPB(t) { if (pbt) pbt.textContent = t; }
    function play(L, rate, resume) { if (!ready) return; stopAll(); try { p.setPlaybackRate(rate || 1); } catch (e) {} if (!resume) p.seekTo(L.t, true); p.playVideo(); halted = false; setPB("⏸"); clearInterval(poll); poll = setInterval(function () { if (!document.body.contains(yt)) { clearInterval(poll); try { p.destroy(); } catch (e) {} return; } if (p.getCurrentTime && p.getCurrentTime() >= L.end) { p.pauseVideo(); clearInterval(poll); poll = null; setPB("↺"); cur && cur(); } }, 200); }
    function toggle(L) { if (poll) { stopYT(); halted = true; setPB("▶"); } else play(L, 1, halted); }
    function one() {
      stage.innerHTML = ""; halted = false;
      if (i >= X.lines.length) return end();
      var L = X.lines[i], g = gapParts(L.en), heard = false;
      var pool = []; X.lines.forEach(function (o) { var q = gapParts(o.en); if (q && q.ans.toLowerCase() !== g.ans.toLowerCase() && pool.indexOf(q.ans) < 0) pool.push(q.ans); });
      (CONF[g.ans.toLowerCase()] || []).forEach(function (c) { if (pool.indexOf(c) < 0) pool.unshift(c); });
      var opts = shuffle([g.ans].concat(shuffle(pool).slice(0, 2)));
      var line = el("p", { cls: "x-line" }, el("span", { text: g.before }), el("b", { cls: "x-gap", text: "____" }), el("span", { text: g.after }));
      var choices = el("div", { cls: "opts locked" }), res = el("div");
      var nx = el("button", { cls: "btn", type: "button", text: i + 1 < X.lines.length ? "Próxima fala →" : "Ver resultado →", disabled: true, onclick: function () { i++; one(); } });
      opts.forEach(function (o) { choices.append(el("button", { cls: "opt", type: "button", text: o, onclick: function (e) {
        if (!nx.disabled) return; var good = o.toLowerCase() === g.ans.toLowerCase(); if (good) ok++;
        e.currentTarget.classList.add(good ? "right" : "wrong"); line.querySelector(".x-gap").textContent = g.ans; line.querySelector(".x-gap").classList.add(good ? "ok" : "no");
        res.append(el("p", { cls: "small", text: (good ? "✅ Isso! " : "🔴 Era \"" + g.ans + "\". ") + "Em português: " + L.pt }));
        nx.disabled = false; fb(good); } })); });
      cur = function () { heard = true; choices.classList.remove("locked"); };
      stage.append(el("div", { cls: "card" }, steps(i + 1, X.lines.length, "Fala"),
        el("div", { cls: "ptools" }, (pbt = el("button", { cls: "pbtn sm", type: "button", "aria-label": "Tocar ou pausar", text: "▶", onclick: function () { toggle(L); } })), el("button", { type: "button", text: "⏪ do começo", onclick: function () { play(L, 1); } }), el("button", { type: "button", text: "🐢", onclick: function () { play(L, 0.75); } }), el("span", { cls: "plays", text: "▶ toca · ⏸ pausa · pode repetir" })),
        line, choices, res, nx));
      window.scrollTo(0, 0);
    }
    function end() {
      stopYT(); S.extras = S.extras || {}; var pct = ok / Math.max(1, X.lines.length), r = S.extras[X.id] || { n: 0, best: 0 };
      r.n++; r.best = Math.max(r.best, pct); S.extras[X.id] = r; markDay(); persist();
      cover.remove(); yt.classList.remove("covered");
      stage.append(el("div", { cls: "sheet " + (pct >= 0.7 ? "good" : "bad") }, el("b", { text: (pct >= 0.7 ? "Mandou bem! " : "Treino é isso: ") + Math.round(pct * 100) + "%" }), el("p", { text: "Agora assista com a imagem e confira tudo o que foi dito." })),
        saidCard(X.lines.map(function (L) { return cleanLine(L.en); })),
        el("button", { cls: "btn big", type: "button", text: "Outra extra →", onclick: extrasPage }), el("button", { cls: "linkish", type: "button", text: "Voltar pro início", onclick: home }));
    }
    loadYT().then(function (YT) { p = new YT.Player(holder, { videoId: X.youtubeId, playerVars: { controls: 0, disablekb: 1, fs: 0, rel: 0, playsinline: 1, modestbranding: 1, cc_load_policy: 0, iv_load_policy: 3 }, events: { onReady: function () { ready = true; } } }); });
    one();
  }

  // ===== treino do dia =====
  // treino do dia: o plano do dia fica salvo; dá pra parar e continuar de onde parou
  function todayPlan() {
    if (!S.daily || S.daily.date !== today()) { S.daily = { date: today(), plan: dailyPlan(), i: 0 }; persist(); }
    return S.daily;
  }
  // 😄 Thiago 28/11: incentivo e humor no tom dele (irreverente, sem discriminação)
  var FUN = [
    "Vai dar tudo certo. É só levantar a bunda do sofá. Ah, você já levantou. 👏",
    "Daqui a pouco você vai comprar pão na padaria lá fora sem precisar do Google Tradutor. 🥖",
    "Quer falar inglês? Então fala. Pensar em inglês calado não conta.",
    "Bora estudar, que você não é a Bruna Marquezine. 💅",
    "Quando der vontade de desistir do inglês, dá uma olhadinha na sua conta bancária. Isso vai te incentivar a continuar. kkkk",
    "Não adianta jogar tudo pro alto, porque você não tem nada pra jogar pro alto. Bora estudar.",
    "Nadou, nadou… vai morrer na praia agora? Bora pra próxima.",
    "Nativo também erra. A diferença é que ele não para de falar.",
    "Ninguém fica fluente lendo apostila deitado. Bora, que você tá no caminho.",
    "Você tá treinando o ouvido que nem academia: dói um pouco, mas amanhã tá mais forte.",
    "Errou? Ótimo. Errar falando vale mais que acertar calado.",
    "Daqui a pouco você vai entender série sem legenda e vai achar que é mágica. Não é: é isso aqui.",
    "15 minutos por dia. Menos que uma série no celular. E rende muito mais.",
    "Inglês não é dom. É repetição com vergonha na cara. 😏",
    "O Tony fofoca, o Max apronta e você aprende. Todo mundo sai ganhando.",
    "Falou, validou. Não falou… ninguém ficou sabendo. 🤫"
  ];
  var CHEER = ["Isso aí! 🔥", "É isso mesmo, continua!", "Mandou bem! 👏", "Tá voando! 🚀", "Olha você falando inglês! 😎", "Perfeito, segue assim!"];
  function fun() { return FUN[Math.floor(Math.random() * FUN.length)]; }
  function restScreen(D, go) {
    var w = screen(), nx = D.plan[D.i], X = ST[nx.st], pct = Math.round(D.i / D.plan.length * 100);
    w.append(topBar(home), el("div", { cls: "thead" }, el("span", { cls: "eyebrow", text: "Treino do dia" }), steps(D.i + 1, D.plan.length, "Próxima: fase", D.plan.map(function (x) { return ST[x.st].emoji; }))),
      el("section", { cls: "hero center rest" }, el("div", { cls: "big-emoji", text: D.plan.length - D.i <= 1 ? "🏁" : pct >= 50 ? "💪" : "☕" }),
        el("h1", { text: D.plan.length - D.i <= 1 ? "Última fase! Só mais um pouquinho." : pct >= 50 ? "Já passou da metade!" : "Respira. Tá indo bem." }),
        el("p", { cls: "hand fun-line", text: fun() }),
        el("p", { cls: "small", text: "Se precisar parar, pode sair: você continua daqui depois." }),
        el("div", { cls: "card nextph" }, el("span", { cls: "eyebrow", text: "Próxima fase" }), el("b", { text: X.emoji + " " + X.name }), el("span", { cls: "small", text: X.pt }))),
      el("button", { cls: "btn big", type: "button", text: "Bora →", onclick: go }),
      el("button", { cls: "linkish", type: "button", text: "Parar por agora", onclick: function () { quitScreen(go); } }));
  }
  var QUIT = ["Nadou, nadou… pra morrer na praia agora?", "É sério que você vai desistir mais uma vez, igual tudo que você faz na vida? 😏", "Para com essa boberice e termina esse treino.", "Para que tá feio! Falta tão pouquinho.", "Nossa, que disparate! Logo agora que tava ficando bom?"];
  function quitScreen(go) {
    var w = screen();
    w.append(el("section", { cls: "hero center rest" }, el("div", { cls: "big-emoji", text: "🫠" }),
        el("h1", { text: QUIT[Math.floor(Math.random() * QUIT.length)] }),
        el("p", { cls: "small", text: "Brincadeira. Se precisar mesmo, pode sair: amanhã (ou daqui a pouco) você continua de onde parou." })),
      el("button", { cls: "btn big", type: "button", text: "Tá bom, vou continuar 💪", onclick: go }),
      el("button", { cls: "linkish", type: "button", text: "Sair mesmo, volto depois", onclick: home }));
  }
  // 👋 saudação da tela inicial no jeito do Thiago ("turubom", "bom dia, flor do dia"); muda conforme a hora e se já treinou
  function hiLine(doneToday) {
    var n = S.name ? S.name.split(" ")[0] : "", h = new Date().getHours();
    if (doneToday) return "Treino feito hoje! Brabo" + (n ? ", " + n : "") + ". 😎";
    if (h < 19) return "Hello" + (n ? ", " + n : "") + "! Vamos praticar?";
    if (h >= 19) return "Hoje você ainda não treinou… depois vai falar pra todo mundo que a minha plataforma não funciona, né? 😏";
    return "Hello" + (n ? ", " + n : "") + "! Vamos praticar?";
  }
  function runDaily() {
    var D = todayPlan(), plan = D.plan, first = true;
    function next() {
      if (!first) { D.i++; persist(); }
      if (D.i >= plan.length) { S.dailyDone = today(); persist(); return celebrate(); }
      if (!first) { first = true; return restScreen(D, function () { first = false; go(); }); }
      first = false; go();
    }
    // fase que não dá pra fazer (sem erros, sem variação): pula sem mostrar "fase concluída"
    function skip() { D.i++; persist(); if (D.i >= plan.length) { S.dailyDone = today(); persist(); return celebrate(); } go(); }
    function go() {
      var i = D.i + 1, x = plan[D.i];
      if (S.paused && S.paused.daily) { S.paused = null; persist(); }
      if (x.st === "erros") { if (!myErrors().length) return skip(); return runErrors(next, i, plan.length); }
      var R0 = RESUME && RESUME.st === x.st ? RESUME : null; RESUME = null;
      getUnit(R0 ? R0.uid : x.uid).then(function (u) {
        // o bloco da fofoca usa a MESMA história (igual ao homework): fofoca → lacunas → leitura
        var v = R0 ? R0.v : (x.st === "lacuna" || x.st === "leitura") && D.fofV != null && D.fofU === u.id && u.gossips && u.gossips[D.fofV] ? D.fofV : nextVar(x.st, u);
        if (x.st === "fofoca" && v >= 0) { D.fofV = v; D.fofU = u.id; persist(); }
        if (v < 0) return skip(); runStation(x.st, u, v, next, { i: i, n: plan.length, review: x.review, startAt: R0 ? R0.i : 0, acc: R0 ? R0.acc : 0 }); }, netError);
    }
    next();
  }
  // 📌📒 Thiago 28/11: no fim do treino, o que GUARDAR (inglês autêntico) vai pro "Meu caderno" pra revisar
  // pouca coisa por dia (Thiago: "muita informação, a pessoa não grava nenhuma") e SEMPRE com exemplo em contexto
  function keepList(u) {
    var out = [];
    ((u.lesson && u.lesson.chunks) || []).slice(0, 5).forEach(function (c) { out.push({ k: c.chunk, pt: c.pt, tag: "🔑 frase-chave", ex: (c.examples || [])[0] || "", exPt: (c.examplesPt || [])[0] || "" }); });
    var seen = [], where = {};
    (u.gossips || []).forEach(function (g) { (g.lines || []).forEach(function (l) { nativeIn(l.text).forEach(function (n) { var lk = n.k.toLowerCase(); if (!where[lk]) where[lk] = l; }); addSeen(seen, nativeIn(l.text)); }); });
    seen.slice(0, 3).forEach(function (n) { var l = where[n.k.toLowerCase()] || {}; out.push({ k: n.k, pt: n.pt, tag: (n.emo || "💬") + " fala de nativo", ex: plain(l.text || ""), exPt: l.pt || "" }); });
    return out;
  }
  function keepRow(x) {
    return el("div", { cls: "keep-row" }, el("mark", { cls: "ck", text: x.k }), el("span", { text: x.pt }),
      x.ex ? el("p", { cls: "keep-ex" }, el("i", { html: hl(x.ex.replace(new RegExp("(" + String(x.k).split(/\s*\/\s*/)[0].replace(/[…]|\.\.\./g, "").trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "i"), "**$1**"), null) }), x.exPt ? el("small", { text: x.exPt }) : null) : null,
      el("small", { cls: "keep-tag", text: (x.ok ? "✅ lembrou " + x.ok + "x · " : "") + (x.tag || "") }));
  }
  function saveKeep(u, list) {
    S.caderno = S.caderno || [];
    list.forEach(function (x) { var lk = String(x.k).toLowerCase(); if (!S.caderno.some(function (c) { return String(c.k).toLowerCase() === lk; })) S.caderno.push({ k: x.k, pt: x.pt, tag: x.tag, ex: x.ex, exPt: x.exPt, uid: u.id, lv: LVL, at: today(), ok: 0 }); });
    persist();
  }
  // 🎯 MISSÃO DA VIDA REAL (1 minuto, fora do app) + compartilhar no WhatsApp: pratica e divulga
  // 🎓 CERTIFICADO pra postar no story (1080×1920), na identidade da marca
  function certCard(lv, total) {
    var cv = el("canvas", { width: "1080", height: "1920", cls: "cert-cv" }), ctx = cv.getContext("2d"), nm = (S.name || (ACC && ACC.name) || "Aluno").split(" ")[0];
    function draw() {
      var g = ctx.createLinearGradient(0, 0, 1080, 1920); g.addColorStop(0, "#FBF7EF"); g.addColorStop(0.55, "#F6E9E4"); g.addColorStop(1, "#F3E4BC"); ctx.fillStyle = g; ctx.fillRect(0, 0, 1080, 1920);
      function blob(x, y, r, c) { var rg = ctx.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, c); rg.addColorStop(1, "rgba(255,255,255,0)"); ctx.fillStyle = rg; ctx.fillRect(x - r, y - r, r * 2, r * 2); }
      blob(880, 300, 420, "rgba(237,197,95,.55)"); blob(180, 1650, 480, "rgba(111,42,61,.22)");
      ctx.textAlign = "center"; ctx.fillStyle = "#A0741F"; ctx.font = "700 40px Inter, sans-serif"; ctx.fillText("CERTIFICADO DE DESTRAVE", 540, 420);
      ctx.fillStyle = "#211A10"; ctx.font = "600 150px Fraunces, Georgia, serif"; ctx.fillText(nm, 540, 720);
      ctx.font = "500 64px Fraunces, Georgia, serif"; ctx.fillText("destravou o", 540, 860);
      ctx.fillStyle = "#6F2A3D"; ctx.font = "italic 700 260px Fraunces, Georgia, serif"; ctx.fillText(lv.toUpperCase(), 540, 1140);
      ctx.fillStyle = "#7F735C"; ctx.font = "500 44px Inter, sans-serif"; ctx.fillText("Teste final · " + total + "/100 · " + brDate(today()) + "/" + today().slice(0, 4), 540, 1270);
      ctx.fillStyle = "#6F2A3D"; ctx.font = "700 96px Caveat, cursive"; ctx.fillText("Falou, validou!", 540, 1480);
      ctx.fillStyle = "#211A10"; ctx.font = "700 44px Inter, sans-serif"; ctx.fillText("🔓 Destravando · Inglês com Joaquim", 540, 1740);
    }
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(draw);
    function blobOut(cb) { cv.toBlob(function (b) { cb(b); }, "image/png"); }
    return el("div", { cls: "card cert" }, el("span", { cls: "eyebrow", text: "🎓 Seu certificado" }), el("p", { cls: "small", text: "Poste no story e marque @inglescomjoaquim. Você merece!" }), cv,
      el("div", { cls: "row2" },
        el("button", { cls: "btn gold", type: "button", text: "📲 Compartilhar", onclick: function () { blobOut(function (b) { var f = new File([b], "destravei-" + lv + ".png", { type: "image/png" }); if (navigator.canShare && navigator.canShare({ files: [f] })) navigator.share({ files: [f], text: "Destravei o " + lv.toUpperCase() + "! 🔓 #destravando" }).catch(function () {}); else { var a = el("a", { href: URL.createObjectURL(b), download: f.name }); document.body.append(a); a.click(); a.remove(); } }); } }),
        el("button", { cls: "btn ghost", type: "button", text: "⬇️ Baixar", onclick: function () { blobOut(function (b) { var a = el("a", { href: URL.createObjectURL(b), download: "destravei-" + lv + ".png" }); document.body.append(a); a.click(); a.remove(); }); } })));
  }
  function missionCard(u) {
    var C = (u.lesson && u.lesson.chunks) || []; if (!C.length) return null;
    var c = C[new Date().getDate() % C.length], k = String(c.chunk).split(/\s*\/\s*/)[0].replace(/[…]|\.\.\./g, "").trim();
    var msg = "Tô treinando inglês todo dia na Destravando 🔓 Hoje aprendi: “" + k + "” (" + c.pt + "). Bora treinar comigo? https://destravando.inglescomjoaquim.com";
    return el("div", { cls: "card mission" }, el("span", { cls: "eyebrow", text: "🎯 Missão da vida real · 1 minuto" }),
      el("h2", { html: "Mande um áudio em inglês pra alguém usando <mark class=\"ck\">" + esc(k) + "</mark>" }),
      el("p", { cls: "small", text: "Pode ser bobo, pode ser curto. O que vale é usar fora daqui. Falou, validou! 😎" }),
      navigator.share ? el("button", { cls: "btn gold", type: "button", text: "📲 Compartilhar", onclick: function () { navigator.share({ text: msg }).catch(function () {}); } })
        : el("a", { cls: "btn gold", href: "https://wa.me/?text=" + encodeURIComponent(msg), target: "_blank", rel: "noopener", text: "📲 Abrir o WhatsApp" }));
  }
  function keepCard(u) {
    var L = keepList(u); if (!L.length) return null; saveKeep(u, L);
    var box = el("div", { cls: "keep-list" });
    L.forEach(function (x) { box.append(keepRow(x)); });
    return el("div", { cls: "card keep" }, el("span", { cls: "eyebrow", text: "📌 Pra guardar e revisar" }), el("h2", { text: "Inglês de verdade de hoje" }),
      el("p", { cls: "small", text: "O nativo usa isso o tempo todo, em série, filme e na rua. Já salvei no seu caderno: revise de vez em quando." }), box,
      el("button", { cls: "btn", type: "button", text: "📒 Abrir meu caderno", onclick: function () { pushNav(); cadernoPage(); } }));
  }
  // 👤 a página do aluno: o que é DELE sempre à mão (Thiago 28/11: "sensação de individualidade e personalização")
  // 🎯 onde você vai chegar (pra quem é competitivo enxergar o futuro)
  function projection() {
    var n = INDEX.length, done = INDEX.filter(function (x) { return themeMastery(x.id) >= 2; }).length, left = n - done;
    var since = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10);
    var act14 = (S.days || []).filter(function (d) { return d >= since; }).length, perWeek = Math.max(3, Math.min(7, Math.round(act14 / 2) || 4));
    var dayPerTheme = done ? Math.max(2, Math.min(6, Math.round((S.days || []).length / done))) : 3;
    function when(pw) { var d = new Date(Date.now() + Math.ceil(left * dayPerTheme / pw * 7) * 86400000); return String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0"); }
    var NX = NEXT_LV[LVL] ? NEXT_LV[LVL].toUpperCase() : null;
    if (!left) return el("div", { cls: "card proj" }, el("span", { cls: "eyebrow", text: "🎯 Onde você vai chegar" }), el("b", { text: "Trilha do " + LVL.toUpperCase() + " completa! " + (NX ? "Faça o teste final e vá pro " + NX + "." : "Você chegou no topo. 🏆") }));
    return el("div", { cls: "card proj" }, el("span", { cls: "eyebrow", text: "🎯 Onde você vai chegar" }),
      el("p", null, "No seu ritmo (" + perWeek + " dias por semana), você fecha o ", el("b", { text: LVL.toUpperCase() }), " lá por ", el("b", { text: when(perWeek) }), NX ? " e já entra no " + NX + "." : "."),
      el("p", { cls: "small", text: "Treinando todo dia: " + when(7) + ". Faltam " + left + " de " + n + " temas. Cada dia conta." }),
      el("div", { cls: "proj-bar" }, el("i", { style: "width:" + Math.max(3, Math.round(done / n * 100)) + "%" })));
  }
  // 📅 lembrete diário na agenda do próprio celular (.ics), sem depender de app nem de notificação
  function reminderBtn() {
    var sel = el("select", { cls: "rem-sel", "aria-label": "Horário do lembrete" }); ["07:00", "08:00", "12:00", "18:00", "19:00", "20:00", "21:00", "22:00"].forEach(function (h) { sel.append(el("option", { value: h, text: h, selected: h === (S.remind || "19:00") ? true : null })); });
    return el("div", { cls: "rem" }, el("span", { cls: "small", text: "📅 Me lembra todo dia às" }), sel, el("button", { cls: "btn sm", type: "button", text: "Pôr na agenda", onclick: function () {
      var hm = sel.value.replace(":", ""), d = new Date(); d.setDate(d.getDate() + 1); var ds = d.getFullYear() + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0");
      var ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Destravando//PT", "BEGIN:VEVENT", "UID:destravando-" + Date.now() + "@inglescomjoaquim.com", "DTSTAMP:" + new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z",
        "DTSTART:" + ds + "T" + hm + "00", "DURATION:PT15M", "RRULE:FREQ=DAILY", "SUMMARY:🔓 Destravando: 15 min de inglês", "DESCRIPTION:Bora treinar! https://destravando.inglescomjoaquim.com", "URL:https://destravando.inglescomjoaquim.com",
        "BEGIN:VALARM", "TRIGGER:PT0M", "ACTION:DISPLAY", "DESCRIPTION:Hora do Destravando! 🔥", "END:VALARM", "END:VEVENT", "END:VCALENDAR"].join("\r\n");
      S.remind = sel.value; persist();
      var a = el("a", { href: URL.createObjectURL(new Blob([ics], { type: "text/calendar" })), download: "destravando-lembrete.ics" }); document.body.append(a); a.click(); a.remove();
      notice("📅 Abriu a agenda? Toque em Adicionar. Todo dia às " + sel.value + " o celular te chama.");
    } }));
  }
  // 🏆 ranking da semana (competitivo tipo a Carla): só com conta; primeiro nome + inicial
  function rankingCard() {
    if (!ACC || !CONTA_OK || PROF) return null;
    var box = el("div", { cls: "card rank" }, el("span", { cls: "eyebrow", text: "🏆 Ranking da semana" }), el("p", { cls: "small", text: "Carregando…" }));
    pushNow(function () { api("ranking", "GET").then(function (r) {
      if (!r || !r.top) { box.remove(); return; }
      var list = el("ol", { cls: "rank-list" });
      r.top.forEach(function (x) { list.append(el("li", { cls: x.me ? "me" : null }, el("span", { text: (x.pos <= 3 ? ["🥇", "🥈", "🥉"][x.pos - 1] : x.pos + "º") + " " + x.n + (x.me ? " (você)" : "") }), el("b", { text: x.xp + " XP" }))); });
      var msg = !r.me ? "Faça o treino de hoje pra entrar no ranking. 🔥" : r.me.pos === 1 ? "Você tá em 1º! Agora é defender o trono. 👑" : (function () { var ahead = r.top[r.me.pos - 2]; return ahead ? "Faltam " + (ahead.xp - r.me.xp + 1) + " XP pra passar " + ahead.n + ". Bora?" : "Você tá em " + r.me.pos + "º de " + r.total + ". Bora subir!"; })();
      box.replaceChildren(el("span", { cls: "eyebrow", text: "🏆 Ranking da semana · XP dos últimos 7 dias" }), el("b", { cls: "rank-msg", text: msg }), list);
    }); });
    return box;
  }
  // 🎙️ SUA VOZ: dia 1 × hoje (prova emocional de progresso). A gravação fica só no aparelho (IndexedDB), nunca vai pro servidor.
  var VOZ_FRASE = "Hi! My name is ___. I'm learning English, and I'm not giving up!";
  function vozDB(fn) { try { var r = indexedDB.open("destravando-voz", 1); r.onupgradeneeded = function () { r.result.createObjectStore("v"); }; r.onsuccess = function () { fn(r.result); }; r.onerror = function () { fn(null); }; } catch (e) { fn(null); } }
  function vozPut(key, blob, cb) { vozDB(function (db) { if (!db) return cb && cb(false); var tx = db.transaction("v", "readwrite"); tx.objectStore("v").put(blob, key); tx.oncomplete = function () { cb && cb(true); }; }); }
  function vozGet(key, cb) { vozDB(function (db) { if (!db) return cb(null); var q = db.transaction("v").objectStore("v").get(key); q.onsuccess = function () { cb(q.result || null); }; q.onerror = function () { cb(null); }; }); }
  function vozCard() {
    var V = S.voz || {}, t = today();
    var dias = V.dia1 ? Math.floor((new Date(t) - new Date(V.dia1)) / 86400000) : 0, pronto = V.dia1 && dias >= 14 && (!V.ultima || Math.floor((new Date(t) - new Date(V.ultima)) / 86400000) >= 14);
    var sub = !V.dia1 ? "Grave 10 segundos hoje. Daqui a 2 semanas você compara e escuta a diferença." : pronto ? "Já faz " + dias + " dias! Grave de novo e compare com o seu dia 1. 🔥" : "Dia 1 guardado. Compare de novo a partir de " + brDate(isoOf(new Date(new Date(V.ultima || V.dia1).getTime() + 14 * 86400000))) + ".";
    return el("button", { cls: "card voz-card" + (pronto ? " ready" : ""), type: "button", onclick: function () { pushNav(); vozPage(); } }, el("b", { text: "🎙️ Sua voz: dia 1 × hoje" }), el("span", { cls: "small", text: sub }));
  }
  function vozPage() {
    var w = screen(), V = S.voz || {}, box = el("div");
    w.append(topBar(home), el("h1", { text: "🎙️ Sua voz" }), el("p", { cls: "small", text: "Leia a frase em voz alta. A gravação fica só no seu celular. Daqui a umas semanas, você vai ouvir a diferença." }),
      el("div", { cls: "card" }, el("span", { cls: "eyebrow", text: "Sua frase" }), el("h2", { text: VOZ_FRASE.replace("___", S.name || "…") })), box, menuBar("prog"));
    function players() {
      box.replaceChildren();
      ["dia1", "hoje"].forEach(function (k) { vozGet(k, function (b) { if (!b) return; var a = el("audio", { controls: true, src: URL.createObjectURL(b) }); box.append(el("div", { cls: "card voz-play" }, el("b", { text: k === "dia1" ? "📼 Dia 1 · " + brDate(V.dia1) : "🆕 Hoje · " + brDate(V.ultima || t()) }), a)); }); });
    }
    function t() { return today(); }
    var key = !V.dia1 ? "dia1" : "hoje", rec = null, chunks = [], btn = el("button", { cls: "btn big", type: "button", text: key === "dia1" ? "🎙️ Gravar meu dia 1" : "🎙️ Gravar de novo e comparar" });
    btn.onclick = function () {
      if (rec && rec.state === "recording") { rec.stop(); return; }
      navigator.mediaDevices.getUserMedia({ audio: true }).then(function (st) {
        micOn(); chunks = []; rec = new MediaRecorder(st); rec.ondataavailable = function (e) { if (e.data.size) chunks.push(e.data); };
        rec.onstop = function () { st.getTracks().forEach(function (x) { x.stop(); }); micOff(); var b = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
          vozPut(key, b, function (ok) { if (!ok) { notice("Não consegui salvar a gravação neste aparelho."); return; } S.voz = S.voz || {}; if (key === "dia1") S.voz.dia1 = today(); else S.voz.ultima = today(); persist(); SFX.win(); if (key === "hoje") confetti(); notice(key === "dia1" ? "📼 Dia 1 guardado! Volte em 2 semanas pra comparar." : "🎧 Agora escute o antes e o depois!"); vozPage(); }); };
        rec.start(); btn.textContent = "⏹️ Parar gravação"; btn.classList.add("live"); setTimeout(function () { if (rec && rec.state === "recording") rec.stop(); }, 15000);
      }).catch(function () { notice("Preciso do microfone pra gravar. Libere nas configurações do navegador."); });
    };
    box.after(btn); players();
  }
  function myTiles() {
    var nC = (S.caderno || []).filter(function (c) { return !c.lv || c.lv === LVL; }).length, nE = myErrors().length;
    function tile(ic, t, sub, fn) { return el("button", { cls: "my-tile", type: "button", onclick: function () { pushNav(); fn(); } }, el("span", { cls: "mt-ic", text: ic }), el("b", { text: t }), el("span", { cls: "small", text: sub })); }
    return el("section", { cls: "my-tiles" }, projection(), vozCard(), el("span", { cls: "eyebrow", text: "👤 Seu espaço" }),
      el("div", { cls: "mt-row" },
        tile("📒", "Meu caderno", nC ? nC + " pra revisar" : "o que você guardar", cadernoPage),
        tile("🧠", "Meus erros", nE ? nE + " pra corrigir" : "nada pendente 🎉", function () { if (nE) runErrors(); else { emptyErrors(); return; home(); } }),
        tile("📊", "Progresso", "nível, medalhas, evolução", progressPage)),
      true ? null : el("div", { cls: "card rem-card" }, el("b", { text: "⏰ Constância é tudo" }), el("p", { cls: "small", text: "Escolha um horário e o seu celular te lembra todo dia. 15 minutos, e o 🔥 não apaga." }), reminderBtn()));
  }
  function cadernoPage() {
    var w = screen(), C = (S.caderno || []).filter(function (c) { return !c.lv || c.lv === LVL; });
    w.append(topBar(home), el("h1", { text: "📒 Meu caderno" }), el("p", { cls: "small", text: "Tudo que você guardou no " + LVL.toUpperCase() + ": inglês autêntico, do jeito que o nativo fala." }));
    if (!C.length) { w.append(emptyBox("Seu caderno ainda está vazio.", "Termine um treino do dia e as expressões mais importantes aparecem aqui, organizadas por dia, com exemplo. Sem decoreba.", "Fazer o treino de hoje →", runDaily), menuBar("prog")); return; }
    w.append(el("button", { cls: "btn big gold", type: "button", text: "🔁 Revisar " + Math.min(10, C.length) + " agora", onclick: function () { revisar(C); } }));
    // organizado por dia: "28/11 · Tema 1 · Hello!"
    var days = {}, order = [];
    C.forEach(function (c) { var k = (c.at || "") + "|" + (c.uid || ""); if (!days[k]) { days[k] = []; order.push(k); } days[k].push(c); });
    order.reverse().forEach(function (k) {
      var at = k.split("|")[0], uid = k.split("|")[1], ti = uidx(uid), T = INDEX[ti], d = at.split("-");
      var card = el("div", { cls: "card keep-day" }, el("span", { cls: "eyebrow", text: "📅 " + (d.length === 3 ? d[2] + "/" + d[1] : at) + (T ? " · Tema " + (ti + 1) + " · " + T.title : "") }));
      var list = el("div", { cls: "keep-list" }); days[k].forEach(function (c) { list.append(keepRow(c)); }); card.append(list); w.append(card);
    });
    w.append(menuBar("prog"));
  }
  function revisar(C) {
    var pick = C.slice().sort(function (a, b) { return (a.ok || 0) - (b.ok || 0) || Math.random() - 0.5; }).slice(0, 10), i = 0, sabia = 0, w = screen();
    w.append(el("header", { cls: "top" }, el("button", { cls: "back", type: "button", text: "‹ Caderno", onclick: cadernoPage })));
    var box = el("div"); w.append(box);
    (function one() {
      box.replaceChildren(); var c = pick[i];
      if (!c) { box.append(el("section", { cls: "hero center" }, el("div", { cls: "big-emoji", text: "📒" }), el("h1", { text: "Revisão feita!" }), el("p", { text: "Você lembrou de " + sabia + " de " + pick.length + ". O que não lembrou volta primeiro na próxima." })), el("button", { cls: "btn big", type: "button", text: "Voltar pro caderno", onclick: cadernoPage })); SFX.win(); return; }
      var ans = el("div", { cls: "rev-ans", hidden: true }, el("mark", { cls: "ck big", text: c.k }), c.ex ? el("p", { cls: "keep-ex" }, el("i", { html: hl(c.ex, null) }), c.exPt ? el("small", { text: c.exPt }) : null) : null,
        el("div", { cls: "row2" }, el("button", { cls: "btn", type: "button", text: "✅ Sabia", onclick: function () { c.ok = (c.ok || 0) + 1; sabia++; persist(); fb(true); i++; one(); } }),
          el("button", { cls: "btn ghost", type: "button", text: "🔁 Ainda não", onclick: function () { c.ok = 0; persist(); i++; one(); } })));
      box.append(el("div", { cls: "card rev-card" }, el("span", { cls: "eyebrow", text: "Revisão " + (i + 1) + " de " + pick.length }), el("p", { cls: "small", text: "Como se diz em inglês? Fale em voz alta e depois confira." }),
        el("h2", { text: c.pt }), el("button", { cls: "btn big", type: "button", text: "👀 Ver em inglês", onclick: function (e) { e.currentTarget.remove(); ans.hidden = false; } }), ans));
    })();
  }
  function celebrate() {
    setTimeout(syncBadge, 300);
    setTimeout(function () { var st = streak(); if ([7, 14, 30, 50, 100, 200, 365].indexOf(st) > -1 && S.conqStreak !== st) { S.conqStreak = st; persist(); conquista("🔥 " + st + " dias seguidos!", "Isso é constância de verdade. Falou, validou!"); } }, 1500);
    var w = screen();
    setTimeout(function () { try { confetti(); SFX.win(); buzz([30, 40, 70]); } catch (e) {} }, 350);
    var VIVA = ["Brabo demais! 🔥", "Nativo que lute. 😎", "Hoje você destravou mais um pouquinho. 🔓", "Tá voando, hein? 🚀", "Isso aqui é constância de gente grande. 🏆"];
    w.append(topBar(), el("section", { cls: "hero center celeb" }, el("div", { cls: "celeb-stage", "aria-hidden": "true" }, el("span", { cls: "cg c1" }), el("span", { cls: "cg c2" }), el("span", { cls: "cg c3" }), el("img", { cls: "celeb-jump", src: "/academia/app/icon-192.png", alt: "" })),
        el("p", { cls: "celeb-viva", text: VIVA[Math.floor(Math.random() * VIVA.length)] }), el("h1", { text: "Treino de hoje feito!" }),
      el("p", { text: "🔥 Ofensiva de " + streak() + (streak() === 1 ? " dia" : " dias") + ". Amanhã tem mais, diferente do de hoje. Volta pra manter o fogo aceso!" }), el("p", { cls: "hand", text: "Falou, validou! 🚀" })),
      bonusCard(), rankingCard(),
      el("button", { cls: "btn big", type: "button", text: "Voltar pro início", onclick: home }));
    var D0 = S.daily && S.daily.plan && S.daily.plan[0]; var kuid = D0 && D0.uid && D0.uid !== GERAL.id ? D0.uid : INDEX[curTheme()].id;
    getUnit(kuid).then(function (u) {
      var k = keepCard(u); if (k && w.isConnected) w.insertBefore(k, w.querySelector(".bonus") || null);
      var mi = missionCard(u); if (mi && w.isConnected) w.insertBefore(mi, w.querySelector(".bonus") || null);
      // 👀 gancho: a fofoca de amanhã (curiosidade traz o aluno de volta)
      var fv = nextVar("fofoca", u), G = fv >= 0 && u.gossips && u.gossips[fv];
      if (G && w.isConnected) w.insertBefore(el("div", { cls: "card teaser" }, el("span", { cls: "eyebrow", text: "👀 Amanhã no Sunset Building" }), el("h2", { text: "“" + G.title + "”" }),
        el("p", { cls: "small", text: "Tem fofoca nova te esperando. Volta amanhã pra saber o que aconteceu (e manter a ofensiva)." })), w.querySelector(".keep") || w.querySelector(".bonus") || null);
    }, function () {});
    SFX.win(); confetti();
  }
  // ⚡ RODADA BÔNUS igual ao homework: 30 s, aparece em português, toca na opção certa em inglês, 2 XP por acerto
  function bonusCard() {
    var card = el("div", { cls: "card bonus" }, el("b", { cls: "bonus-title", text: "⚡ Rodada bônus · opcional" }),
      el("p", { cls: "small", text: "30 segundos! Aparece em português, toque na opção certa em inglês. Cada acerto vale 2 XP." }));
    if (S.bonusDay === today()) { card.append(el("p", { cls: "small", text: "✅ Você já fez a de hoje: acertou " + (S.bonusRight || 0) + "." })); return card; }
    var go = el("button", { cls: "btn", type: "button", text: "⚡ Começar" }); card.append(go);
    go.onclick = function () {
      go.remove();
      getUnit(INDEX[curTheme()].id).then(function (u) {
        var pairs = []; (u.realtimes || []).forEach(function (r) { (r.pairs || []).forEach(function (p) { if (p.en && p.pt && cw(p.en).length <= 9) pairs.push({ en: plain(p.en), pt: p.pt }); }); });
        if (pairs.length < 3) { card.append(el("p", { cls: "small", text: "Hoje não tem rodada bônus pra este tema." })); return; }
        var order = shuffle(pairs).slice(0, 8), qi = 0, right = 0, left = 30, over = false;
        var barI = el("i"), timeEl = el("span", { text: "30 s" }), q = el("p", { cls: "bonus-q" }), opts = el("div", { cls: "pt-q" });
        card.append(el("div", { cls: "bonus-time" }, el("div", { cls: "mb-track" }, barI), timeEl), q, opts); barI.style.width = "100%";
        var tmr = setInterval(function () { if (!timeEl.isConnected) { clearInterval(tmr); over = true; return; } left--; timeEl.textContent = left + " s"; barI.style.width = Math.max(0, left / 30 * 100) + "%"; if (left <= 0) end(); }, 1000);
        function nx() {
          if (qi >= order.length) return end();
          var it = order[qi], others = shuffle(pairs.filter(function (x) { return x.en !== it.en; })).slice(0, 2), ch = shuffle(others.concat([it]));
          q.textContent = it.pt; opts.replaceChildren();
          ch.forEach(function (c) { opts.append(el("button", { cls: "pt-opt", type: "button", text: c.en, onclick: function (e) { if (over) return; var g = c.en === it.en; e.currentTarget.classList.add(g ? "ok" : "bad"); if (!g) [].forEach.call(opts.children, function (b) { if (b.textContent === it.en) b.classList.add("ok"); }); if (g) right++; fb(g); qi++; setTimeout(nx, g ? 250 : 1000); } })); });
        }
        function end() { if (over) return; over = true; clearInterval(tmr); opts.replaceChildren(); q.textContent = (right >= order.length ? "🏆 Gabaritou! " : "⚡ Fim! ") + "Você acertou " + right + " de " + order.length + ". +" + right * 2 + " XP"; S.xp += right * 2; S.bonusDay = today(); S.bonusRight = right; persist(); if (right >= order.length) SFX.stage(); else SFX.small(); }
        nx();
      }, netError);
    };
    return card;
  }

  // ===== estações =====
  function frame(st, u, v, ctx, onExit) {
    var w = screen(), X = ST[st], i = uidx(u.id);
    CURU = u; pushNav();
    CUR = { st: st, uid: u.id, v: v, i: 0, acc: 0, daily: !!(ctx && ctx.n), review: !!(ctx && ctx.review) };
    w.classList.add("st-frame"); w.style.setProperty("--stc", STC[st] || "#6F2A3D");
    w.append(el("header", { cls: "top" },
      el("button", { cls: "back", type: "button", text: "‹ Sair", onclick: function () { if (onExit === home || !CUR) { CUR = null; home(); } else askExit(); } }),
      el("span", { cls: "top-r" }, CONTA_OK && !PROF ? el("button", { cls: "stat ico-btn", type: "button", "aria-label": "Achou um problema? Me conta", onclick: feedbackOpen }, icn("ajuda")) : null,
        el("button", { cls: "pause", type: "button", onclick: pauseNow }, icn("pausa"), el("span", { text: "Pausar" })))));
    w.append(el("div", { cls: "thead" },
      el("div", { cls: "eb-row" }, el("span", { cls: "eyebrow" }, icn(STICN[st] || "alvo", "eb-ic"), el("span", { text: X.name + (u.id === GERAL.id ? "" : " · Tema " + (i + 1) + (ctx && ctx.review ? " · revisão" : "")) })),
        EXPL[st] ? el("button", { cls: "what-btn", type: "button", onclick: function () { explainSt(st, true); } }, icn("ajuda"), el("span", { text: "O que é isso?" })) : null),
      ctx && ctx.n && S.daily ? steps(ctx.i, ctx.n, "Fase", S.daily.plan.map(function (x) { return x.review ? "REV" : ST[x.st].emoji; })) : null,
      lbar(ctx),
      el("p", { cls: "ck-legend", html: 'Fique de olho: o que aparecer <mark class="ck">assim</mark> é inglês de nativo. Guarde!' })));
    setTimeout(function () { if (w.isConnected) explainSt(st); }, 350);
    return w;
  }
  // 🔥 ofensiva: dias seguidos treinando + a semana
  function streakCard() {
    var n = streak(), lit = S.days.indexOf(today()) > -1, row = el("div", { cls: "week" }), d = new Date(), DN = ["D", "S", "T", "Q", "Q", "S", "S"];
    d.setDate(d.getDate() - d.getDay());
    for (var k = 0; k < 7; k++) {
      var iso = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
      var on1 = S.days.indexOf(iso) > -1, vac = onVacation(iso);
      row.append(el("span", { cls: "wd" + (on1 ? " on" : "") + (iso === today() ? " td" : "") }, on1 ? el("i", null, icn("fogo")) : el("i", { text: vac ? "🏖️" : "·" }), el("small", { text: DN[k] })));
      d.setDate(d.getDate() + 1);
    }
    return el("div", { cls: "streak" + (lit ? " lit" : "") }, el("div", { cls: "sk" }, el("span", { cls: "fire" }, icn("fogo")), el("span", { cls: "tt" }, el("b", { text: n + (n === 1 ? " dia" : " dias") + " de ofensiva" }),
      el("span", { cls: "small", text: lit ? "Hoje já tá garantido. Volta amanhã pra não perder!" : vacationNow() ? "Você tá de férias: a ofensiva tá guardada. 🏖️" : n ? "Treine hoje pra não perder a ofensiva!" : "Faça 1 exercício hoje e comece sua ofensiva." }))), row, vacationBox());
  }
  function streakToast(w) {
    if (S.litNow !== today()) return; S.litNow = null; persist();
    var n = streak();
    w.append(el("div", { cls: "toast-streak" }, el("span", { cls: "fire big" }, icn("fogo")), el("b", { text: n === 1 ? "Ofensiva começou!" : n + " dias de ofensiva!" }), el("span", { cls: "small", text: "Volta amanhã pra manter o fogo aceso." })));
  }
  // ☕ pausar em qualquer fase e continuar depois (no ponto exato)
  var CUR = null;
  function startAt(ctx) { return (ctx && ctx.startAt) || 0; }
  function startAcc(ctx) { return (ctx && ctx.acc) || 0; }
  // 📏 barra de previsibilidade (Thiago 28/11): em todo exercício dá pra ver quanto falta, do exercício e do treino do dia
  var LBAR = null;
  function lbar(ctx) {
    var fill = el("i"), txt = el("span", { cls: "lb-t", text: "" }), box = el("div", { cls: "lbar" }, el("div", { cls: "lb-track" }, fill), txt);
    LBAR = { fill: fill, txt: txt, ctx: ctx }; return box;
  }
  function setBar(frac, i, n) {
    if (!LBAR || !LBAR.fill.isConnected) return; frac = Math.max(0, Math.min(1, frac)); var c = LBAR.ctx;
    var tot = c && c.n ? ((c.i - 1) + frac) / c.n : frac; LBAR.fill.style.width = Math.max(3, Math.round(tot * 100)) + "%";
    var left = n ? Math.max(0, n - i) : null;
    LBAR.txt.textContent = (n ? (left === 0 ? "Última! " : left === 1 ? "Falta só 1 · " : frac >= 0.75 ? "Falta pouco · " : "") + Math.min(i + 1, n) + " de " + n + " neste exercício" : "Neste exercício") + (c && c.n ? " · treino " + Math.round(tot * 100) + "%" : "");
  }
  function mark(st, u, v, ctx, i, acc, n) { CUR = { st: st, uid: u.id, v: v, i: i, acc: acc, daily: !!(ctx && ctx.n), review: !!(ctx && ctx.review) }; if (n) setBar(i / n, i, n); }
  function pauseNow() {
    stopAll();
    if (CUR) { S.paused = { st: CUR.st, uid: CUR.uid, v: CUR.v, i: CUR.i, acc: CUR.acc, daily: CUR.daily, review: CUR.review, date: today() }; persist(); }
    pausedScreen();
  }
  function pausedScreen() {
    var w = screen();
    w.append(topBar(), el("section", { cls: "hero center rest" }, el("div", { cls: "big-emoji", text: "☕" }), el("h1", { text: "Pausado." }),
      el("p", { text: "Seu progresso está salvo. Quando voltar, você continua exatamente daqui." })),
      el("button", { cls: "btn big", type: "button", text: "Continuar agora →", onclick: resumePaused }),
      el("button", { cls: "linkish", type: "button", text: "Ir pro início", onclick: home }));
  }
  function resumePaused() {
    var P = S.paused; if (!P) return home();
    S.paused = null; persist();
    var D = S.daily, cur = D && D.date === today() && D.plan[D.i];
    if (P.daily && cur && cur.st === P.st) { RESUME = P; return runDaily(); }
    if (P.st === "erros") return runErrors();
    getUnit(P.uid).then(function (u) { runStation(P.st, u, P.v, function () { pickVar(P.st, P.uid); }, { startAt: P.i, acc: P.acc }); }, netError);
  }
  var RESUME = null;
  function netError() {
    var w = screen();
    w.append(topBar(home), el("section", { cls: "hero center" }, el("div", { cls: "big-emoji", text: "📶" }), el("h1", { text: "Ops, não carregou." }),
      el("p", { text: "Confira a internet e tente de novo. Seu progresso está salvo." })),
      el("button", { cls: "btn big", type: "button", text: "Tentar de novo", onclick: function () { location.reload(); } }),
      el("button", { cls: "linkish", type: "button", text: "Ir pro início", onclick: home }));
  }
  // progresso bonito: bolinhas (feito / agora / falta) + "2 de 5"
  function steps(cur, n, label, emojis) {
    var row = el("div", { cls: "steps" + (emojis ? " emo" : "") });
    for (var k = 1; k <= n; k++) { var em = emojis ? emojis[k - 1] : "", sk = null; for (var q in ST) if (ST[q].emoji === em) { sk = STICN[q]; break; }
      if (em === "REV") sk = "revisar";
      var stk = null; for (var q2 in STICN) if (STICN[q2] === sk) { stk = q2; break; }
      var sp = el("span", { cls: "st" + (k < cur ? " done" : k === cur ? " now" : ""), style: stk && STC[stk] ? "--c:" + STC[stk] : null }); if (sk) sp.append(icn(sk)); else sp.textContent = em; row.append(sp); }
    return el("div", { cls: "progress" }, row, el("span", { cls: "pill", text: (label ? label + " " : "") + cur + " de " + n }));
  }
  // uma fase por tela: limpa tudo abaixo do cabeçalho (barra + título da estação)
  function clearStage(w, keep) { keep = keep == null ? 2 : keep; while (w.children.length > keep) w.lastChild.remove(); stopAll(); window.scrollTo(0, 0); }
  var CHEER3 = ["Perfeito! Falou, validou! 🚀", "Brabo demais! 🔥", "Gabaritou! Nativo que lute. 😎", "Mandou muito! Bora pra próxima."];
  var CHEER2 = ["Muito bom! Dá pra chegar nas 3 estrelas.", "Quase perfeito! Mais um pouquinho.", "Boa! Seu ouvido tá ficando afiado."];
  var CHEER1 = ["Nossa, que disparate! 😂 Brincadeira: o que escapou vai pro 🧠 Meus erros.", "Para que tá feio! 😂 Bora de novo, essa você pega.", "Errar faz parte: é assim que o cérebro aprende. 💪", "Calma, ninguém nasce falando. Bora pra próxima!", "Essa foi difícil mesmo. O que escapou vai pro 🧠 Meus erros."];
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function starsOf(pct) { return pct >= 0.9 ? 3 : pct >= 0.6 ? 2 : 1; }
  function stageClear(pct, msg) {
    var st = starsOf(pct);
    if (st === 3) { SFX.stage(); S.perfect = (S.perfect || 0) + 1; persist(); } else if (st === 2) SFX.small(); else SFX.oops();
    return el("div", { cls: "stage-clear s" + st }, el("b", { text: (st === 3 ? "🎉 " : st === 2 ? "👏 " : "💪 ") + Math.round(pct * 100) + "%" }),
      el("span", { cls: "stars-big", text: ["", "⭐☆☆", "⭐⭐☆", "⭐⭐⭐"][st] }), el("span", { cls: "small", text: msg || pick(st === 3 ? CHEER3 : st === 2 ? CHEER2 : CHEER1) }));
  }
  // ☕ depois de cada fase do treino do dia: pode parar e continuar da PRÓXIMA fase depois
  function restBtn() {
    return el("button", { cls: "linkish rest-btn", type: "button", text: "☕ Descansar e continuar depois", onclick: function () {
      if (S.daily && S.daily.date === today()) { S.daily.i++; if (S.daily.i >= S.daily.plan.length) S.dailyDone = today(); persist(); }
      home(); notice("☕ Pode parar tranquilo! Quando voltar, continua da próxima fase.");
    } });
  }
  function finishBox(w, st, u, v, pct, next, msg, extra) {
    var daily = !!(CUR && CUR.daily);
    record(st, u.id, v, pct); setBar(1, 0, 0); clearStage(w); streakToast(w);
    CUR = null; var pbtn = w.querySelector(".top .pause"); if (pbtn) pbtn.remove();
    if (st === "shadow" && pct >= 0.99) { S.ouro = (S.ouro || 0) + 1; persist(); }
    w.append(stageClear(pct, msg || null));
    (extra || []).forEach(function (x) { if (x) w.append(x); });
    w.append(el("button", { cls: "btn big", type: "button", text: next === home ? "Voltar pro início" : "Próximo →", onclick: function () { next(); } }));
    if (daily && next !== home) w.append(restBtn());
  }
  // 🔑 FRASES-CHAVE: aquecimento prático antes do treino pesado (ouve, entende pela tradução e já fala). Não é aula: é prática guiada.
  function stAula(u, v, next, ctx) {
    var L = u.lesson || {}, CH = L.chunks || [], w = frame("aula", u, v, ctx, next), box = el("div"), step = -1, ok = 0, tot = 0;
    function okText(said, p) { var c = [p.en].concat(p.alt || []); return c.some(function (x) { return norm(x) === norm(said); }) || c.some(function (x) { return overlap(x, said) >= 0.8; }); }
    function ear(key, label) { var f = af(u, key); return f ? el("button", { cls: "ear", type: "button", text: label || "🔊", onclick: function () { playUrl(f); } }) : null; }
    function go() { step++; box.replaceChildren(); window.scrollTo(0, 0); if (step === 0) intro(); else if (step <= CH.length) chunk(step - 1); else if (step === CH.length + 1 && L.grammar) gram(); else end(); }
    function intro() {
      var cd = el("ul", { cls: "aula-can" }); (u.canDo || []).forEach(function (c) { cd.append(el("li", { cls: "ok-li" }, icn("check"), el("span", { text: c }))); });
      box.append(el("div", { cls: "card aula-intro" }, el("span", { cls: "eyebrow", text: "🔑 Frases-chave · " + u.title }), el("h2", { text: u.titlePt || u.title }), el("p", { text: u.today || "" }),
        cd.children.length ? el("b", { text: "No fim, você vai conseguir:" }) : null, cd),
        el("p", { cls: "small", text: "Aquecimento rápido antes do treino: ouça, entenda pela tradução e já fale. Toque no 🔊 quantas vezes quiser." }),
        el("button", { cls: "btn big", type: "button", text: "Bora aquecer →", onclick: go }));
      var vz = null; // (recado por tema saiu: agora são 5 recados por momento, ver recadoHoje)
      if (vz) fetch(vz, { method: "HEAD" }).then(function (r) { if (r.ok && (r.headers.get("content-type") || "").indexOf("audio") > -1 && box.isConnected && step === 0) box.firstChild.after(el("div", { cls: "card voz-jq" }, el("b", { text: "🎙️ Recado do Joaquim" }), player(vz, {}))); }).catch(function () {});
    }
    function chunk(ci) {
      var C = CH[ci], ex = el("div", { cls: "vocab-list" });
      (C.examples || []).forEach(function (e, k) { ex.append(el("div", { cls: "vrow" }, ear("ex" + ci + "_" + k), el("span", null, el("b", { html: hl(e, u) }), el("small", { text: (C.examplesPt || [])[k] || "" })))); });
      var pk = 0, pbox = el("div");
      function prac() {
        pbox.replaceChildren(); var P = (C.practice || [])[pk];
        if (!P) { pbox.append(el("button", { cls: "btn big", type: "button", text: ci + 1 < CH.length ? "Próxima frase-chave →" : (L.grammar ? "Ver o resumo →" : "Ir pro treino →"), onclick: go })); return; }
        var res = el("div", { cls: "rt-res" }), answered = false;
        function judge(said, manual) {
          if (answered) return; answered = true; tot++; var good = manual || okText(said, P); if (good) ok++; fb(good);
          res.replaceChildren(el("b", { text: good ? "✅ Isso!" : "Quase! O certo é:" }), el("p", { cls: "model", text: P.en }), ear("pr" + ci + "_" + pk, "🔊 Ouvir a resposta"),
            el("button", { cls: "btn", type: "button", text: "Próxima →", onclick: function () { pk++; prac(); } }));
        }
        var t = talk(function (said, manual) { judge(said, manual); }, { label: "🎙️ Fale em inglês" });
        var inp = el("input", { type: "text", placeholder: "ou escreva aqui em inglês", autocomplete: "off" });
        var typed = el("button", { cls: "soft", type: "button", text: "Conferir o que escrevi", onclick: function () { if (inp.value.trim()) judge(inp.value, false); } });
        var peek = el("button", { cls: "linkish", type: "button", text: "👀 Não sei: me mostra", onclick: function () { if (!answered) { answered = true; tot++; } res.replaceChildren(el("p", { cls: "model", text: P.en }), ear("pr" + ci + "_" + pk, "🔊 Ouvir"), el("button", { cls: "btn", type: "button", text: "Próxima →", onclick: function () { pk++; prac(); } })); } });
        pbox.append(el("div", { cls: "card rt" }, el("span", { cls: "eyebrow", text: "Sua vez · " + (pk + 1) + " de " + C.practice.length }), el("p", { cls: "rt-pt", text: "Como se diz: “" + P.pt + "”" }), t, el("div", { cls: "aula-type" }, inp, typed), peek, res));
      }
      box.append(el("div", { cls: "card aula-chunk" }, el("span", { cls: "eyebrow", text: "Frase-chave " + (ci + 1) + " de " + CH.length }),
        el("h2", { text: C.chunk }), el("p", { cls: "aula-pt", text: "= " + C.pt }), C.tip ? el("p", { cls: "small tip", text: "💡 " + C.tip }) : null,
        el("b", { text: "Ouça os exemplos:" }), ex), pbox);
      pbox.append(el("button", { cls: "btn big", type: "button", text: "Agora é a sua vez →", onclick: prac }));
    }
    function gram() {
      var G = L.grammar, tb = el("div", { cls: "gram-table" });
      (G.rows || []).forEach(function (r) { tb.append(el("div", { cls: "gram-row" }, el("b", { text: r[0] }), el("span", { text: r[1] }))); });
      box.append(el("div", { cls: "card" }, el("span", { cls: "eyebrow", text: "📐 Resumo: " + (G.title || "como funciona") }), tb, G.tip ? el("p", { cls: "small tip", text: "💡 " + G.tip }) : null),
        el("button", { cls: "btn big", type: "button", text: "Ir pro treino →", onclick: go }));
    }
    function end() { finishBox(w, "aula", u, v, tot ? ok / tot : 1, next, "Aquecido! Agora é usar essas frases no treino."); }
    w.append(box); go();
  }
  function runStation(st, u, v, next, ctx) {
    var vx = variations(u, st)[v];
    if (st !== "cena" && !vx || st === "cena" && !playable(vx)) return next();
    if (st === "aula") return stAula(u, v, next, ctx);
    if (st === "cena") return stCena(u, v, next, ctx);
    if (st === "fofoca") return stFofoca(u, v, next, ctx);
    if (st === "shadow") return stShadow(u, v, next, ctx);
    if (st === "rt") return stRT(u, v, next, ctx);
    if (st === "lacuna") return stLacuna(u, v, next, ctx);
    if (st === "ditado") return stDitado(u, v, next, ctx);
    if (st === "leitura") return stLeitura(u, v, next, ctx);
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
        fb(ok); onAns(ok);
      } }, el("span", { text: q.options[k] }), q.optionsPt ? el("span", { cls: "opt-pt", text: q.optionsPt[k] }) : null));
      opts.lastChild._k = k;
    });
    box.append(opts); if (q.pt) box.append(ptBtn);
    return box;
  }
  function quiz(w, qs, after, replayUrl, extraTop, replayFn) {
    var ok = 0, n = 0;
    function ask(i) {
      if (i >= qs.length) return after(ok / Math.max(1, qs.length));
      clearStage(w);
      var head = el("div", { cls: "qhead" }, steps(i + 1, qs.length, "Pergunta"),
        replayFn ? el("button", { cls: "ear", type: "button", text: "🔊 ouvir de novo", onclick: replayFn }) : replayUrl ? el("button", { cls: "ear", type: "button", text: "🔊 ouvir de novo", onclick: function () { playUrl(replayUrl); } }) : null);
      if (extraTop) head.append(extraTop());
      var nx = el("button", { cls: "btn", type: "button", text: i + 1 < qs.length ? "Próxima pergunta →" : "Continuar →", disabled: true, onclick: function () { ask(i + 1); } });
      w.append(head, el("div", { cls: "quiz" }, mcq(qs[i], function (good) { n++; if (good) ok++; nx.disabled = false; })), nx);
    }
    ask(0);
  }
  function lockBox(text) { return el("div", { cls: "listen-lock" }, el("span", { text: "🔒" }), el("p", { text: text })); }

  // 📜 texto só no FINAL (Thiago 26/11, igual ao homework): primeiro ouve sem ler, depois confere o que foi dito. Só inglês.
  function saidCard(lines, url) {
    if (!lines || !lines.length) return null;
    var box = el("div", { cls: "said" });
    lines.forEach(function (l) { var t = typeof l === "string" ? l : l.text; if (!t) return; box.append(el("p", { html: hl(t, CURU) })); });
    box.append(ckLegend());
    return el("div", { cls: "card" }, el("span", { cls: "eyebrow", text: "📜 O que foi dito: agora pode ler" }),
      el("p", { cls: "small", text: "Ouça de novo acompanhando o texto: é aqui que o ouvido conecta som e palavra." }),
      url ? el("div", { cls: "ears" }, el("button", { cls: "ear", type: "button", text: "🔊 ouvir lendo", onclick: function () { playUrl(url); } })) : "", box);
  }
  // 🎬 Cenas
  var ytReady = null;
  function loadYT() { if (ytReady) return ytReady; ytReady = new Promise(function (res) { window.onYouTubeIframeAPIReady = function () { res(window.YT); }; document.head.append(el("script", { src: "https://www.youtube.com/iframe_api" })); }); return ytReady; }
  function stCena(u, v, next, ctx) {
    var x = variations(u, "cena")[v], w = frame("cena", u, v, ctx, next);
    if (x.kind === "audio") {
      var A = u.lesson.audio;
      w.append(el("div", { cls: "card" }, el("span", { cls: "eyebrow", text: "🎧 Só áudio · sem imagem nenhuma" }), el("h2", { text: A.title }),
        el("p", { cls: "small", text: "Ouça pelo menos 1 vez inteira. As perguntas só abrem depois." }),
        player(af(u, "lesson"), { onEnd: function (n) { if (n === 1) { lk.remove(); w.append(el("button", { cls: "btn", type: "button", text: "Responder as perguntas →", onclick: function () { quiz(w, A.questions || [], function (p) { finishBox(w, "cena", u, v, p, next, null, [saidCard(A.lines, af(u, "lesson"))]); }, af(u, "lesson")); } })); } } })));
      var lk = lockBox("As perguntas abrem depois que você ouvir."); w.append(lk);
      return;
    }
    var V = x.v, XP = partsOf(V);
    if (XP && XP.parts && XP.parts.length >= 3) return stCenaParts(u, v, next, ctx, V, XP);
    var holder = el("div"), p = null, watched = false;
    w.append(el("div", { cls: "card" }, el("span", { cls: "eyebrow", text: "🎬 " + (V.source || "YouTube") }), el("h2", { text: V.predict || "O que vai acontecer?" }), el("p", { cls: "small", text: V.context || "" }),
      el("div", { cls: "yt" }, holder),
      el("ol", { cls: "vsteps" }, el("li", { html: "Assista <b>sem legenda</b>, só ouvindo." }), el("li", { html: "As perguntas abrem quando o vídeo terminar." }))));
    var lk2 = lockBox("Assista o trecho inteiro pra liberar as perguntas."); w.append(lk2);
    var skip = el("button", { cls: "linkish", type: "button", text: "O vídeo não abre aqui — liberar as perguntas", onclick: open }); w.append(skip);
    function open() { if (watched) return; watched = true; lk2.remove(); skip.remove(); w.append(el("button", { cls: "btn", type: "button", text: "Responder as perguntas →", onclick: function () { try { p && p.pauseVideo && p.pauseVideo(); } catch (e) {} quiz(w, V.questions || [], function (pq) { finishBox(w, "cena", u, v, pq, next, null, [vocab()]); }); } })); }
    function vocab() {
      if (!V.vocab || !V.vocab.length) return null;
      var g = el("div", { cls: "vocab-list" });
      V.vocab.forEach(function (it) { g.append(el("div", { cls: "vrow" }, el("b", { text: it[0] }), el("span", { text: it[1] }))); });
      return el("div", { cls: "card" }, el("span", { cls: "eyebrow", text: "📒 Do vídeo pra sua fala" }), g);
    }
    // player só do trecho (máx. 60 s): sem a barra do YouTube; para sozinho no fim e volta pro começo do trecho
    var T0 = V.start || 0, T1 = Math.min(V.end || (T0 + 60), T0 + 60), dur = T1 - T0, ready = false, poll = null, plays = 0;
    var fill = el("i"), bar = el("div", { cls: "pbar" }, fill), time = el("span", { cls: "plays", text: "0:00 / " + fmt(dur) });
    var pb = el("button", { cls: "pbtn", type: "button", "aria-label": "Tocar o trecho", text: "▶", onclick: function () {
      if (!ready) return; var st = p.getPlayerState();
      if (st === 1) { p.pauseVideo(); return; }
      var t = p.getCurrentTime(); if (t < T0 - 1 || t >= T1 - 0.3) p.seekTo(T0, true);
      p.playVideo();
    } });
    function fmt(x) { x = Math.max(0, Math.round(x)); return Math.floor(x / 60) + ":" + String(x % 60).padStart(2, "0"); }
    function tick() {
      if (!document.body.contains(pb)) { clearInterval(poll); try { p.destroy(); } catch (e) {} return; }
      if (!p || !p.getCurrentTime) return; var t = p.getCurrentTime() - T0;
      fill.style.width = Math.min(100, Math.max(0, t / dur * 100)) + "%"; time.textContent = fmt(t) + " / " + fmt(dur);
      if (p.getCurrentTime() >= T1) { p.pauseVideo(); p.seekTo(T0, true); fill.style.width = "100%"; plays++; pb.textContent = "↺"; time.textContent = "✅ Assistiu " + plays + (plays === 1 ? " vez" : " vezes"); open(); }
    }
    w.querySelector(".yt").after(el("div", { cls: "player" }, el("div", { cls: "prow" }, pb, bar), el("div", { cls: "ptools" }, el("span", { cls: "small", text: "🎬 Trecho de " + fmt(dur) }), time)));
    loadYT().then(function (YT) { p = new YT.Player(holder, { videoId: V.youtubeId, playerVars: { start: T0, end: T1, controls: 0, disablekb: 1, fs: 0, rel: 0, playsinline: 1, modestbranding: 1, cc_load_policy: 0, iv_load_policy: 3 }, events: {
      onReady: function () { ready = true; try { p.mute && p.unMute(); } catch (e) {} },
      onStateChange: function (e) { pb.textContent = e.data === 1 ? "⏸" : (plays ? "↺" : "▶"); if (e.data === 1 && !poll) poll = setInterval(tick, 250); if (e.data === 0) { if (p.getCurrentTime() < T1) { plays++; pb.textContent = "↺"; time.textContent = "✅ Assistiu " + plays + (plays === 1 ? " vez" : " vezes"); fill.style.width = "100%"; open(); } else tick(); } } } }); });
  }

  // 🕵️ Fofoca: ouvir (🎧 contador de escutas) → perguntas → recontar falando (gravação estilo WhatsApp)
  function stFofoca(u, v, next, ctx) {
    var G = u.gossips[v], w = frame("fofoca", u, v, ctx, next), qScore = 0, qCheer = null;
    S.fofN = S.fofN || {}; var FK = dkey("fofoca", u.id, v) + "|" + today();
    var MAXL = [0, 0, 5, 3, 2][evoOf("fofoca").phase] || 0, GOAL = MAXL || 5, heardN = S.fofN[FK] || 0, painters = [];
    function counter() {
      var dots = el("span", { cls: "dots" }), txt = el("span");
      function paint() { dots.replaceChildren(); for (var i = 0; i < GOAL; i++) dots.append(el("i", { cls: i < heardN ? "on" : "" })); txt.textContent = MAXL ? (heardN >= MAXL ? "Usou as " + MAXL + " escutas. Agora é com o seu ouvido! 💪" : "Ouviu " + heardN + " de no máximo " + MAXL) : heardN >= GOAL ? "Ouviu " + heardN + " vezes ✅" : "Ouviu " + heardN + " de " + GOAL + " vezes"; }
      painters.push(paint); paint();
      return el("div", { cls: "listen-count" }, el("span", { text: "🎧" }), dots, txt);
    }
    function heardOne() { heardN++; S.fofN = {}; S.fofN[FK] = heardN; persist(); painters.forEach(function (f) { f(); }); }
    function canHear() { return !MAXL || heardN < MAXL; }
    function replay() { if (!canHear()) { notice("🎚️ Na sua fase da Fofoca são no máximo " + MAXL + " escutas."); return; } var a = playUrl(af(u, "g" + v)); a.onended = heardOne; }
    w.append(el("div", { cls: "card" }, evoBadge("fofoca"), el("span", { cls: "eyebrow", text: "🕵️ Fofoca do Sunset Building" }), el("h2", { text: G.title }),
      el("p", { cls: "small", text: "Daqui até o reconto, tudo é sobre esta fofoca: ouvir, entender e recontar." }),
      el("p", { cls: "small", text: MAXL ? "🚫 Não escreva a história. Na sua fase: no máximo " + MAXL + " escutas, sem ler nada. Pode pausar e voltar 5 s. Depois você vai recontar." : "🚫 Não escreva a história. Ouça 5 vezes, sem ler nada: na 1ª você pega a ideia, nas outras você pega os detalhes. Pode pausar e voltar 5 s. Depois você vai recontar." }),
      player(af(u, "g" + v), { max: MAXL ? Math.max(1, MAXL - heardN) : null, tools: true, onEnd: function (n) { heardOne(); if (n === 1) { lk.remove(); w.append(el("button", { cls: "btn", type: "button", text: "Responder as perguntas →", onclick: function () { quiz(w, G.questions || [], function (p) { qScore = p; qCheer = evoCheer("fofoca", p, dkey("fofoca", u.id, v)); retell(); }, null, counter, replay); } })); } } }), counter()));
    var lk = lockBox("Primeiro ouça a fofoca inteira, sem ler nada. As perguntas aparecem quando o áudio terminar."); w.append(lk);
    function retell() {
      clearStage(w);
      var seen = []; G.lines.forEach(function (l) { addSeen(seen, nativeIn(l.text)); });
      var R = G.retell || {}, keys = R.keywords || [], ph = evoOf("reconto").phase, minS = [30, 45, 60, 60][ph - 1];
      var chips = el("div", { cls: "chips" });
      var t = talk(function (said, manual, secs) {
        var hit = manual ? keys.length : keys.filter(function (k) { return has(said, k); }).length;
        chips.innerHTML = ""; keys.forEach(function (k) { var ok = manual || has(said, k); chips.append(el("span", { cls: "kchip" + (ok ? " ok" : ""), text: (ok ? "✓ " : "✗ ") + k })); });
        var enough = manual || (secs || 0) >= minS * 0.9;
        var rp = Math.min(1, hit / Math.max(1, keys.length) * 1.25) * (enough ? 1 : 0.6);
        var p = rp * 0.7 + qScore * 0.3;
        if (!fin) { fin = true; var you = el("div", { cls: "card" }, el("span", { cls: "eyebrow", text: "🗣️ O que você contou" }), el("p", { cls: "small", text: said ? "\"" + said + "\"" : "" }), chips);
          finishBox(w, "fofoca", u, v, p, next, enough ? null : "Da próxima vez, fale mais: pelo menos " + minS + " segundos.", [qCheer, evoCheer("reconto", rp, dkey("fofoca", u.id, v)), you, saidCard(G.lines, af(u, "g" + v)), nativeRecap(seen, "Nessa fofoca tinha:")]); }
      }, { minSecs: minS });
      var fin = false;
      w.append(el("div", { cls: "card" }, evoBadge("reconto"), el("span", { cls: "eyebrow", text: "🗣️ Agora você conta" }), el("h2", { text: "Reconte a fofoca falando" }),
        el("p", { cls: "small", text: "🎧 Antes de recontar, ouça a fofoca 5 vezes, contando as de antes. Pode pausar e voltar 5 s." }), counter(),
        el("p", { cls: "small", html: "Aperte o botão e fale, sem pressa · <b>pelo menos " + (minS >= 60 ? "1 minuto" : minS + " s") + "</b>" + (ph < 4 ? ". Comece com: \"So, the story is about…\"" : "") }),
        el("div", { cls: "ears" }, el("button", { cls: "ear", type: "button", text: "🔊 ouvir a fofoca de novo", onclick: replay })),
        seen.length && ph < 4 ? el("p", { cls: "small", text: "💬 Tente usar: " + seen.slice(0, 3).map(function (x) { return x.k; }).join(", ") }) : null, t));
    }
  }

  // 🔁 Shadowing igual ao homework: frase escondida até ouvir → as palavras acendem junto com o áudio (karaokê)
  // → grava estilo WhatsApp → a frase fica pintada: verde = entendeu você, vermelho = treinar → 🎧 Minha voz pra comparar
  function stShadow(u, v, next, ctx) {
    var B = variations(u, "shadow")[v], w = frame("shadow", u, v, ctx, next), i = startAt(ctx), total = startAcc(ctx), res = [];
    w.append(el("div", { cls: "card" }, el("h2", { text: B.label }),
      el("div", { cls: "sh-how" }, el("span", { html: "<b>1.</b> 🔊 Ouça a frase" }), el("span", { html: "<b>2.</b> 🎙️ Grave repetindo igualzinho" }), el("span", { html: "<b>3.</b> ✅ Verde = entendeu você" }))));
    function one() { mark("shadow", u, v, ctx, i, total, B.list.length);
      if (i >= B.list.length) return finishBox(w, "shadow", u, v, total / B.list.length, next);
      var s = B.list[i], url = af(u, s.key), heard = false, tries = 0, best = 0, hl = null;
      var dots = el("div", { cls: "pt-dots" }); B.list.forEach(function (_, k) { dots.append(el("i", { cls: k < i ? (res[k] >= 0.95 ? "ok" : "meh") : k === i ? "cur" : "", text: String(k + 1) })); });
      var text = el("p", { cls: "sh-line blind", title: "Ouça a frase primeiro" }); clean(s.en).split(" ").forEach(function (wd, k) { if (k) text.append(" "); text.append(el("span", { text: wd })); });
      var pt = el("p", { cls: "small hide", text: s.pt ? s.pt : "" });
      var score = el("div", { cls: "sh-score" });
      function playIt(rate) {
        var spans = [].slice.call(text.children), lens = spans.map(function (x) { return x.textContent.length + 1; }), tot = lens.reduce(function (a, b) { return a + b; }, 0);
        var a = playUrl(url, rate);
        a.onended = a.onerror = function () { if (!heard) { heard = true; text.classList.remove("blind"); text.title = ""; pt.classList.remove("hide"); t.classList.remove("locked"); } };
        clearInterval(hl);
        hl = setInterval(function () {
          if (!a.duration) return; var f = a.currentTime / a.duration, acc = 0;
          spans.forEach(function (x, k) { acc += lens[k] / tot; x.classList.toggle("lit", !a.paused && f >= acc - lens[k] / tot && f < acc); });
          if (a.ended || a.paused && a.currentTime > 0) { clearInterval(hl); spans.forEach(function (x) { x.classList.remove("lit"); }); }
        }, 50);
      }
      var t = talk(function (said, manual) {
        tries++; var o = manual ? 0.8 : overlap(s.en, said);
        text.classList.remove("blind"); pt.classList.remove("hide");
        var pm = manual ? null : paintModel(s.en, said); if (pm) text.replaceChildren(pm.node);
        var good = o >= 0.95; fb(o >= 0.8);
        score.replaceChildren(el("b", { text: (good ? "✅ Muito bom! " : o >= 0.6 ? "🟡 " : "🔴 ") + "A página entendeu " + Math.round(o * 100) + "%" }),
          pm && pm.miss.length ? el("span", { cls: "small miss-list", text: "Treine em vermelho: " + pm.miss.join(", ") }) : null);
        if (o < 0.6 && tries === 1) addError({ uid: u.id, kind: "shadow", en: s.en, pt: s.pt, file: url, said: said });
        if (o >= 0.6 && tries > 1) fixError(s.en);
        best = Math.max(best, o); res[i] = best; dots.children[i].className = best >= 0.95 ? "ok" : "meh";
        nx.hidden = false; nx.textContent = i + 1 < B.list.length ? "Próxima frase →" : "Terminar o shadowing ✅";
      }, { again: "🔁 Tentar de novo", quick: true, onLive: function (txt) { var pm2 = paintModel(s.en, txt); text.classList.remove("blind"); text.replaceChildren(pm2.node); return pm2.miss.length === 0; } });
      t.classList.add("locked");
      var nx = el("button", { cls: "btn", type: "button", hidden: true, onclick: function () { clearInterval(hl); total += best; i++; clearStage(w, 3); one(); } });
      var card = el("div", { cls: "card sh" }, el("div", { cls: "pt-head" }, el("b", { text: "Frase " + (i + 1) + " de " + B.list.length }), dots), text, pt,
        el("div", { cls: "pt-play" }, el("button", { cls: "btn mini", type: "button", text: "🔊 Ouvir", onclick: function () { playIt(1); } }), el("button", { cls: "soft", type: "button", text: "🐢 Devagar", onclick: function () { playIt(0.75); } })),
        t, score, nx);
      w.append(card); window.scrollTo(0, 0);
      setTimeout(function () { playIt(1); }, 300);
    }
    one();
  }

  // 🗣️ LEIA EM VOZ ALTA igual ao homework: um trecho da fofoca; 🌱 verde ao vivo · 🌿 verde só no fim · 🌳 ritmo natural · 🍎 ritmo + 90%
  function stLeitura(u, v, next, ctx) {
    var G = u.gossips[v], w = frame("leitura", u, v, ctx, next), ph = evoOf("leitura").phase;
    var L = G.lines.map(function (l) { return plain(l.text); }), st0 = Math.max(0, Math.floor(L.length / 2) - 1), txt = L.slice(st0, st0 + 3).join(" ");
    var maxS = Math.max(12, Math.round(words(txt).length * 0.6)), rt = el("p", { cls: "sh-line read-txt", html: hl(txt, u) }), res = el("div", { cls: "sh-score" });
    var t = talk(function (said, manual, secs) {
      var pm = manual ? null : paintModel(txt, said); if (pm) rt.replaceChildren(pm.node);
      var tot = words(txt).length, pct = manual ? 0.8 : Math.max(0, (tot - pm.miss.length) / Math.max(1, tot)), sc = pct, extra = "";
      if (ph >= 3 && (secs || 0) > maxS) { sc = Math.max(0, sc - 0.2); extra = " ⏱️ Ficou um pouco devagar: tente no ritmo natural, até uns " + maxS + " s."; }
      if (ph >= 4 && pct < 0.9) { sc = Math.min(sc, 0.6); extra += " 🍎 Na Árvore com frutos a meta é 90% entendido."; }
      fb(sc >= 0.8);
      res.replaceChildren(el("b", { text: "Você leu " + Math.round(pct * 100) + "% certinho." }), pm && pm.miss.length ? el("span", { cls: "small miss-list", text: "Treine: " + pm.miss.slice(0, 6).join(", ") }) : null, extra ? el("span", { cls: "small", text: extra }) : null);
      var oldGo = w.querySelector(".res-go"); if (oldGo) oldGo.remove(); // regravou: um botão só
      w.append(el("button", { cls: "btn big res-go", type: "button", text: "Ver o resultado →", onclick: function () { finishBox(w, "leitura", u, v, sc, next, null, [evoCheer("leitura", sc, dkey("leitura", u.id, v))]); } }));
    }, { onLive: function (all) { if (ph < 2) rt.replaceChildren(paintModel(txt, all).node); } });
    w.append(el("div", { cls: "card" }, evoBadge("leitura"), el("h2", { text: "🗣️ Leia em voz alta" }),
      el("p", { cls: "small", html: ph >= 2 ? "Leia este trecho em voz alta" + (ph >= 3 ? ", <b>no ritmo natural</b>, até uns " + maxS + " s" : "") + ". No fim você vê o que a página entendeu." : "Leia este trecho em voz alta. As palavras que a página entender ficam <b>verdes</b>." }),
      rt, t, res));
  }

  // ✍️ DITADO igual ao homework (listening disfarçado): 3 a 4 frases EMENDADAS da fofoca, escreve tudo, confere palavra por palavra
  function stDitado(u, v, next, ctx) {
    var G = u.gossips[v], w = frame("ditado", u, v, ctx, next), ph = evoOf("ditado").phase;
    var lines = G.lines.map(function (l, li) { return { en: plain(l.text), file: af(u, "gl" + v + "_" + li) }; }).filter(function (l) { var n = words(l.en).length; return l.file && n >= 3 && n <= 14; });
    var want = ph >= 3 ? 4 : 3, start = Math.max(0, Math.min(lines.length - want, (new Date().getDate() + v) % Math.max(1, lines.length - want + 1)));
    var D = lines.slice(start, start + want), full = D.map(function (l) { return l.en; }).join(" "), plays = 0, slow = false;
    var fill = el("i"), bar = el("div", { cls: "mb-track" }, fill), cnt = el("span", { cls: "small" });
    var playB = el("button", { cls: "btn pt-big pulse", type: "button", text: "▶ Ouvir as " + D.length + " frases" });
    function playAll() {
      if (ph >= 4 && plays >= 2) { notice("🍎 No máximo 2 escutas no ditado. Agora escreva o que você pegou! 💪"); return; }
      playB.classList.remove("pulse"); var k = 0; dk0 = 0;
      (function nx() {
        if (k >= D.length) { plays++; cnt.textContent = "🎧 Ouviu " + plays + (plays === 1 ? " vez" : " vezes") + (ph >= 4 ? " de 2" : ""); fill.style.width = "100%"; return; }
        dk0 = k; curA = playUrl(D[k].file, slow ? 0.75 : 1); fill.style.width = (k / D.length * 100) + "%";
        curA.onended = function () { k++; nx(); }; curA.onerror = function () { k++; nx(); };
        seqNext = function (to) { k = to; nx(); };
      })();
    }
    var curA = null, dk0 = 0, seqNext = null;
    playB.onclick = playAll;
    var ta = el("textarea", { cls: "dit-ta", placeholder: "Escreva aqui o que você ouviu…", rows: "4", autocapitalize: "off", spellcheck: "false" });
    var out = el("p", { cls: "sh-line dit-out", hidden: true }), msg = el("div", { cls: "sh-score" });
    var chk = el("button", { cls: "btn", type: "button", text: "Conferir", onclick: function () {
      if (words(ta.value).length < Math.min(8, words(full).length / 2)) { notice("Escreva todas as frases antes de conferir. Pode ouvir de novo."); return; }
      var pm = paintModel(full, ta.value), tot = words(full).length, pct = Math.max(0, (tot - pm.miss.length) / Math.max(1, tot));
      out.replaceChildren(pm.node); out.hidden = false; var dk = ckChips(out.textContent, u); if (dk) out.after(dk); chk.remove(); ta.disabled = true; fb(pct >= 0.85);
      var seenM = {}, miss = pm.miss.filter(function (x) { var k = x.toLowerCase(); if (!x || seenM[k]) return false; seenM[k] = 1; return true; }).slice(0, 8), tr = el("div", { cls: "chips" });
      miss.forEach(function (m) { tr.append(el("button", { cls: "ear", type: "button", text: "🔊 " + m, onclick: function () { try { var q = new SpeechSynthesisUtterance(m); q.lang = "en-US"; q.rate = 0.85; speechSynthesis.cancel(); speechSynthesis.speak(q); } catch (e) {} } })); });
      if (pct < 0.85) D.forEach(function (l) { if (pm.miss.some(function (m) { var c = m.replace(/[^\w']/g, ""); return c && new RegExp("\\b" + c + "\\b", "i").test(l.en); })) addError({ uid: u.id, kind: "shadow", en: l.en, pt: "", file: l.file }); });
      msg.replaceChildren(el("b", { text: "Você pegou " + Math.round(pct * 100) + "% das palavras." }), el("span", { cls: "small", text: "Em vermelho: o que faltou ou ficou diferente." }), miss.length ? el("span", { cls: "small", text: "Toque e ouça o que escapou:" }) : null, miss.length ? tr : null);
      w.append(el("button", { cls: "btn big", type: "button", text: "Ver o resultado →", onclick: function () { finishBox(w, "ditado", u, v, pct, next, null, [evoCheer("ditado", pct, dkey("ditado", u.id, v)), el("div", { cls: "card" }, el("span", { cls: "eyebrow", text: "📜 O texto" }), out.cloneNode(true))]); } }));
    } });
    w.append(el("div", { cls: "card" }, evoBadge("ditado"), el("h2", { text: "✍️ Ditado: " + G.title }),
      el("p", { cls: "small", text: D.length + " frases seguidas, no ritmo normal. Ouça quantas vezes quiser, pause quando precisar" + (ph >= 4 ? ": no máximo 2" : "") + ", e escreva tudo." }),
      el("div", { cls: "pt-play" }, playB,
        el("button", { cls: "soft", type: "button", text: "⏸ Pausar", onclick: function (e) { if (!curA) return; if (curA.paused) { curA.play().catch(function () {}); e.currentTarget.textContent = "⏸ Pausar"; } else { curA.pause(); e.currentTarget.textContent = "▶ Continuar"; } } }),
        el("button", { cls: "soft", type: "button", text: "⏪ Frase anterior", onclick: function () { if (seqNext) { stopAll(); seqNext(Math.max(0, dk0 - 1)); } } }),
        ph === 1 ? el("button", { cls: "soft", type: "button", text: "🐢 0.75×", onclick: function (e) { slow = !slow; e.currentTarget.textContent = slow ? "🐇 1×" : "🐢 0.75×"; } }) : null), bar, cnt),
      el("div", { cls: "card" }, ta, el("p", { cls: "hint", text: "💡 Revise antes de conferir: cada parte você confere uma vez só." }), chk, out, msg));
  }

  // ⚡ Real Time: frase em PT, tempo correndo, fala em inglês
  function stRTTexto(u, v, next, ctx) {
    var R = u.realtimes[v], w = frame("rt", u, v, ctx, next), pairs = R.pairs || [], res = el("div", { cls: "rt-res" });
    var t = talk(function (said, manual, secs) {
      var per = pairs.map(function (P) { return manual ? 0.8 : bestOverlap([P.en].concat(P.alt || []), said); });
      var pct = per.reduce(function (a, b) { return a + b; }, 0) / Math.max(1, per.length), short = !manual && (secs || 0) < 20;
      if (short) pct *= 0.7;
      per.forEach(function (o, k) { if (o < 0.5) addError({ uid: u.id, kind: "rt", en: pairs[k].en, pt: pairs[k].pt, file: af(u, "rp" + v + "_" + k), said: said }); });
      var full = pairs.map(function (P) { return P.en; }).join(" ");
      finishBox(w, "rt", u, v, pct, next, short ? "Da próxima vez, fale pelo menos 20 segundos." : null, [evoCheer("rt", pct, dkey("rt", u.id, v)),
        el("div", { cls: "card" }, el("span", { cls: "eyebrow", text: "🗣️ O que você falou" }), el("p", { cls: "small", text: said ? "\"" + said + "\"" : "" })),
        el("div", { cls: "card" }, el("span", { cls: "eyebrow", text: "💡 Uma resposta possível" }), el("p", { cls: "model" }, manual ? full : paintModel(full, said).node), player(af(u, "rt" + (v + 1)) || ""))]);
    }, { minSecs: 20 });
    w.append(el("div", { cls: "card" }, evoBadge("rt"), el("h2", { text: R.title }),
      el("p", { cls: "small", text: "🍎 O texto inteiro de uma vez. Leia em português e conte tudo em inglês, falando pelo menos 20 segundos." }),
      el("p", { cls: "rt-pt rt-par", text: pairs.map(function (P) { return P.pt; }).join(" ") }), t, res));
  }
  function stRT(u, v, next, ctx) {
    if (evoOf("rt").phase >= 4) return stRTTexto(u, v, next, ctx);
    var R = u.realtimes[v], w = frame("rt", u, v, ctx, next), pairs = R.pairs || [], i = startAt(ctx), total = startAcc(ctx), ph = evoOf("rt").phase, TF = [1, 1, 0.8, 0.65][ph - 1];
    w.append(el("div", { cls: "card" }, evoBadge("rt"), el("h2", { text: R.title }), el("p", { cls: "small", text: "Leia a frase em português e fale em inglês, rápido, como numa conversa. ⏱️ " + pairs.length + " frases." })));
    function one() { mark("rt", u, v, ctx, i, total, pairs.length);
      if (i >= pairs.length) {
        var pct = total / Math.max(1, pairs.length);
        return finishBox(w, "rt", u, v, pct, next, pct >= 0.7 ? "Real Time aprovado: conta pro domínio do tema." : null, [evoCheer("rt", pct, dkey("rt", u.id, v)), el("div", { cls: "card" }, el("span", { cls: "eyebrow", text: "🎧 O texto inteiro em inglês" }), player(af(u, "rt" + (v + 1)) || ""))]);
      }
      var P = pairs[i], secs = Math.max(5, Math.round((Math.round(cw(P.en).length * 0.9) + 4) * TF)), left = secs, timer = null, answered = false;
      var ring = el("span", { cls: "timer", text: left + "s" });
      var res = el("div", { cls: "rt-res" });
      var t = talk(function (said, manual) {
        clearInterval(timer);
        var o = manual ? 0.8 : bestOverlap([P.en].concat(P.alt || []), said);
        var late = left <= 0;
        var sc = o * (late ? 0.7 : 1);
        if (!answered) { total += sc; if (o < 0.6) addError({ uid: u.id, kind: "rt", en: P.en, pt: P.pt, file: af(u, "rp" + v + "_" + i), said: said }); }
        else if (o >= 0.6) fixError(P.en);
        answered = true;
        res.innerHTML = "";
        res.append(el("b", { text: (o >= 0.8 ? "✅ " : o >= 0.5 ? "🟡 " : "🔴 ") + Math.round(o * 100) + "%" + (late ? " · passou do tempo" : "") }),
          el("span", { cls: "small", text: said ? "Você: \"" + said + "\"" : "Não ouvi nada." }),
          el("p", { cls: "model" }, el("button", { cls: "ear", type: "button", "aria-label": "Ouvir o modelo", text: "🔊", onclick: function () { var f = af(u, "rp" + v + "_" + i0); if (f) playUrl(f); } }), manual ? el("span", { text: P.en }) : paintModel(P.en, said).node), ckChips(P.en, u),
          !manual && paintModel(P.en, said).miss.length ? el("span", { cls: "small miss-list", text: "Faltou: " + paintModel(P.en, said).miss.join(", ") }) : null);
        nx.disabled = false;
      }, { onRecEnd: function () { clearInterval(timer); } });
      var i0 = i;
      // 🌱 dica: 2 palavras-chave da frase (some nas fases seguintes)
      var hintW = ph === 1 ? cw(P.en).filter(function (x) { return x.length > 3; }).slice(0, 2) : [];
      var nx = el("button", { cls: "btn", type: "button", text: "Próxima →", disabled: true, onclick: function () { clearInterval(timer); i++; clearStage(w); one(); } });
      var card = el("div", { cls: "card rt" }, el("div", { cls: "skrow" }, steps(i + 1, pairs.length, "Frase"), ring),
        el("p", { cls: "rt-pt", text: P.pt }), hintW.length ? el("p", { cls: "small rt-hint", text: "💡 Dica: " + hintW.join(" · ") }) : null, t, res, nx);
      w.append(card); window.scrollTo(0, 0);
      timer = setInterval(function () { left--; ring.textContent = left > 0 ? left + "s" : "⏰"; ring.classList.toggle("late", left <= 3); if (left <= 0) clearInterval(timer); }, 1000);
    }
    one();
  }

  // ===== 💬 fala de nativo (os 7 P's do A1 — o aluno não vê o nome "7 P's") =====
  var CAT = { pv: "verbo + partícula: o nativo usa no lugar do verbo formal", lk: "liga uma ideia na outra", fi: "palavrinha pra ganhar tempo enquanto pensa", he: "pausa esperta pra pensar sem travar", id: "expressão fixa: não traduz ao pé da letra", dm: "organiza a fala e mostra pra onde ela vai", hf: "palavra-chave: uma palavra, vários usos" };
  var PCAT = { 1: "pv", 2: "lk", 3: "fi", 4: "dm", 5: "id", 6: "he", 7: "hf" };
  var PEMO = { pv: "🚀", lk: "🔗", fi: "💭", dm: "🎯", id: "🎨", he: "⏸️", hf: "⭐" };
  // glossário oficial (ebook 7 P's A1) vem de /aprender/data/sete-ps.json e tem prioridade sobre a lista de reserva abaixo
  var EBOOK = null;
  function loadSeven() { if (EBOOK) return Promise.resolve(EBOOK); return j(DATA + "sete-ps.json?v=" + (window.__v || 1)).then(function (x) { EBOOK = x.map || {}; return EBOOK; }, function () { EBOOK = {}; return EBOOK; }); }
  var SEVEN = {
    "get up": ["levantar (da cama)", "pv"], "wake up": ["acordar", "pv"], "sit down": ["sentar", "pv"], "stand up": ["ficar de pé", "pv"], "go out": ["sair (pra passear)", "pv"], "come back": ["voltar", "pv"],
    "come in": ["entrar", "pv"], "turn on": ["ligar", "pv"], "turn off": ["desligar", "pv"], "pick up": ["pegar, buscar", "pv"], "put down": ["pôr no chão, largar", "pv"], "look at": ["olhar pra", "pv"],
    "listen to": ["escutar", "pv"], "put on": ["vestir, colocar", "pv"], "look for": ["procurar", "pv"], "looked for": ["procurou", "pv"], "woke up": ["acordou", "pv"], "got up": ["levantou", "pv"], "came back": ["voltou", "pv"], "went out": ["saiu", "pv"], "picked up": ["pegou", "pv"], "turned off": ["desligou", "pv"], "turned on": ["ligou", "pv"], "put on": ["vestir, colocar", "pv"],
    "and": ["e", "lk"], "but": ["mas", "lk"], "or": ["ou", "lk"], "because": ["porque", "lk"], "then": ["aí, depois", "lk"], "first": ["primeiro", "lk"], "after that": ["depois disso", "lk"], "this time": ["dessa vez", "lk"],
    "um": ["é…, hum…", "fi"], "uh": ["é…", "fi"], "well": ["bom…", "fi"], "so": ["então…", "fi"], "i mean": ["quer dizer", "fi"], "you know": ["sabe", "fi"], "like": ["tipo", "fi"],
    "let me see": ["deixa eu ver", "he"], "wait": ["pera", "he"], "hmm": ["hum…", "he"], "i guess": ["acho que", "he"], "let's say": ["digamos", "he"],
    "piece of cake": ["moleza", "id"], "a piece of cake": ["moleza", "id"], "break a leg": ["boa sorte! (ao pé da letra: quebre a perna)", "id"], "raining cats and dogs": ["chovendo canivete", "id"], "it's raining cats and dogs": ["tá chovendo canivete", "id"], "no way": ["de jeito nenhum! / não acredito!", "id"], "like a fish": ["que nem peixe (nada muito bem)", "id"], "my bad": ["foi mal", "id"], "day off": ["dia de folga", "id"], "deal": ["fechado!", "id"], "loads of": ["um monte de", "id"],
    "ok": ["tá bom", "dm"], "okay": ["tá bom", "dm"], "now": ["bom, agora…", "dm"], "by the way": ["aliás", "dm"], "guess what": ["adivinha!", "dm"], "actually": ["na verdade", "dm"], "anyway": ["enfim", "dm"], "to be honest": ["pra ser sincero", "dm"], "of course": ["claro", "dm"],
    "you know what": ["sabe de uma coisa?", "dm"], "oh no": ["ai, não!", "dm"], "uh-oh": ["xiii…", "dm"], "oh, i see": ["ah, entendi", "dm"], "see you": ["até mais", "dm"], "wow": ["nossa!", "dm"], "shh": ["psiu!", "dm"],
    "get": ["pegar, conseguir, chegar, ficar", "hf"], "make": ["fazer", "hf"], "take": ["pegar, levar, tomar", "hf"], "go": ["ir", "hf"], "have": ["ter, comer, tomar", "hf"], "do": ["fazer", "hf"], "come": ["vir", "hf"], "put": ["pôr, colocar", "hf"]
  };
  function nativeIn(raw) {
    var out = [], m, re = /\*\*([^*]+)\*\*/g;
    while ((m = re.exec(String(raw || "")))) {
      var k = m[1].trim().replace(/^[,.!?…\s]+|[,.!?…\s]+$/g, ""), lk = k.toLowerCase().replace(/[’‘]/g, "'"), e = EBOOK && EBOOK[lk], g = SEVEN[lk];
      var n = e ? { k: k, pt: e.pt, cat: PCAT[e.p] } : g ? { k: k, pt: g[0], cat: g[1] } : null;
      if (n && !out.some(function (x) { return x.k.toLowerCase() === lk; })) { n.tip = CAT[n.cat]; n.emo = PEMO[n.cat]; out.push(n); }
    }
    return out;
  }
  function nativeChips(list) {
    var box = el("div", { cls: "native" });
    list.forEach(function (n) { box.append(el("p", { cls: "nchip" }, el("b", { text: (n.emo || "💬") + " " + n.k }), el("span", { text: " = " + n.pt }), el("span", { cls: "small", text: " · " + n.tip }))); });
    return box;
  }
  function nativeRecap(seen, title) {
    if (!seen.length) return null;
    return el("div", { cls: "card native-recap" }, el("span", { cls: "eyebrow", text: "💬 Fala de nativo" }), el("h2", { text: title || "Hoje você pegou:" }),
      el("p", { cls: "small", text: "Livro nenhum ensina isso, mas todo nativo fala. Repara que agora você escuta essas palavras." }), nativeChips(seen));
  }
  function addSeen(seen, list) { list.forEach(function (n) { if (!seen.some(function (x) { return x.k.toLowerCase() === n.k.toLowerCase(); })) seen.push(n); }); }

  // ===== 👂 OUVIDO =====
  // botões de ouvir: normal, devagar e rápido; destrava a resposta depois da 1ª vez
  function ears(url, onHeard, opts) {
    opts = opts || {};
    var heard = false;
    var warn = el("span", { cls: "small" });
    function unlock() { if (!heard) { heard = true; onHeard && onHeard(); } }
    var plays = 0;
    function go(rate) {
      if (opts.max && plays >= opts.max) { warn.textContent = "Usou as " + opts.max + " escutas 💪"; return; }
      var a = playUrl(url, rate), counted = false;
      a.addEventListener("playing", function () { if (counted) return; counted = true; plays++; if (opts.max) warn.textContent = plays >= opts.max ? "Última escuta" : "Escuta " + plays + " de " + opts.max; });
      a.onended = unlock; a.onerror = function () { warn.textContent = "⚠️ Não consegui tocar o áudio. Pode seguir."; unlock(); };
    }
    var row = el("div", { cls: "ears" },
      el("button", { cls: "pbtn sm", type: "button", "aria-label": "Ouvir", text: "▶", onclick: function () { go(opts.rate || 1); } }),
      el("button", { cls: "ear", type: "button", text: "🐢 devagar", onclick: function () { go(0.75); } }),
      opts.fast === false ? null : el("button", { cls: "ear", type: "button", text: "🐇 rápido", onclick: function () { go(1.25); } }), warn);
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
      if (name && !star) return;
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
  var LV = [{ k: 1, name: "🟢 Fácil", tip: "1 lacuna, 3 opções" }, { k: 2, name: "🟡 Médio", tip: "até 2 lacunas, banco com pegadinhas" }, { k: 3, name: "🔴 Difícil", tip: "você escreve o que ouviu" }];
  function lacLevel() { return Math.min(3, evoOf("lacunas").phase); }
  function eq(a, b) { return canon(a) === canon(b); }
  function joinS(a, m, b) { return [a, m, b].filter(Boolean).join(" ").replace(/ ([.?!,])/g, "$1"); }

  // 🧩 Complete o que ouviu
  function stLacunaTexto(u, v, next, ctx) {
    var G = u.gossips[v], w = frame("lacuna", u, v, ctx, next), url = af(u, "g" + v), slots = [], done = false;
    var box = el("p", { cls: "lac-text" });
    G.lines.forEach(function (L, li) {
      var P = pickBlanks({ raw: L.text, en: plain(L.text) }, words(plain(L.text)).length >= 6 ? 2 : 1);
      P.toks.forEach(function (t, ti) {
        var b = P.blanks.filter(function (x) { return x.i === ti; })[0];
        if (!b) { box.append(el("span", { text: t }), " "); return; }
        var pre = t.slice(0, t.indexOf(b.w)), post = t.slice(t.indexOf(b.w) + b.w.length);
        var inp = el("input", { cls: "slot-in", type: "text", autocapitalize: "off", autocomplete: "off", spellcheck: "false", size: String(Math.max(3, b.w.length)), "aria-label": "palavra que falta" });
        inp._ans = b.w; inp._line = li; slots.push(inp);
        if (pre) box.append(el("span", { text: pre })); box.append(inp); if (post) box.append(el("span", { text: post })); box.append(" ");
      });
    });
    var res = el("div", { cls: "rt-res" });
    var chk = el("button", { cls: "btn", type: "button", text: "Conferir", onclick: function () {
      if (done) return; if (slots.filter(function (x) { return x.value.trim(); }).length < slots.length / 2) { notice("Preencha as lacunas antes de conferir. Pode ouvir de novo."); return; }
      done = true; var ok = 0, badLines = {};
      slots.forEach(function (sl) { var got = sl.value.trim(), g = eq(got, sl._ans); if (g) ok++; else badLines[sl._line] = 1;
        sl.replaceWith(el("span", { cls: "slot done " + (g ? "ok" : "bad") }, got && !g ? el("s", { text: got }) : null, got && !g ? " " : null, sl._ans)); });
      var pct = ok / Math.max(1, slots.length); fb(pct >= 0.8); chk.remove();
      Object.keys(badLines).forEach(function (li) { addError({ uid: u.id, kind: "shadow", en: plain(G.lines[li].text), pt: G.lines[li].pt || "", file: af(u, "gl" + v + "_" + li) }); });
      res.append(el("b", { text: "Você acertou " + ok + " de " + slots.length + "." }));
      w.append(el("button", { cls: "btn big", type: "button", text: "Ver o resultado →", onclick: function () { finishBox(w, "lacuna", u, v, pct, next, null, [evoCheer("lacunas", pct, dkey("lacuna", u.id, v)), saidCard(G.lines, url)]); } }));
    } });
    w.append(el("div", { cls: "card" }, evoBadge("lacunas"), el("h2", { text: "🧩 " + G.title }),
      el("p", { cls: "small", text: "🍎 O texto inteiro da fofoca. Ouça, no máximo 2 vezes, e escreva as palavras que faltam." }),
      player(url, { max: 2, tools: true })), el("div", { cls: "card" }, box, chk, res));
  }
  function stLacuna(u, v, next, ctx) {
    if (evoOf("lacunas").phase >= 4 && u.gossips && u.gossips[v]) return stLacunaTexto(u, v, next, ctx);
    var B = variations(u, "lacuna")[v], w = frame("lacuna", u, v, ctx, next), lv = lacLevel(), list = B.list.slice(0, 8), i = startAt(ctx), total = startAcc(ctx), seen = [];
    var pool = []; B.list.forEach(function (l) { words(l.en).forEach(function (x) { x = core(x); if (x && pool.indexOf(x) < 0) pool.push(x); }); });
    var ph4 = evoOf("lacunas").phase >= 4;
    w.append(el("div", { cls: "card" }, el("h2", { text: B.label }), el("p", { cls: "small", text: "O nativo fala uma frase e algumas palavras somem. Ouça e complete." + (ph4 ? " Na sua fase: no máximo 2 escutas por frase." : "") })));
    w.firstChild && w.querySelector(".card").prepend(evoBadge("lacunas"));
    function one() { mark("lacuna", u, v, ctx, i, total, list.length);
      if (i >= list.length) return finishBox(w, "lacuna", u, v, total / list.length, next, null, [evoCheer("lacunas", total / list.length, dkey("lacuna", u.id, v)), nativeRecap(seen)]);
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
        var pct = ok / slots.length; total += pct; fb(pct === 1);
        if (pct < 1) addError({ uid: u.id, kind: "ouvir", en: L.en, pt: L.pt, file: L.file, prompt: P.toks.map(function (t, ti) { var b = P.blanks[0]; return b.i === ti ? t.replace(b.w, "____") : t; }).join(" "), choices: shuffle([P.blanks[0].w].concat(distract(P.blanks[0].w, pool))), answer: P.blanks[0].w });
        var nat = nativeIn(L.raw); addSeen(seen, nat);
        res.append(el("b", { text: pct === 1 ? "✅ Pegou tudo!" : pct > 0 ? "🟡 Quase" : "🔴 Essa escapou" }), el("span", { cls: "small", text: L.pt }));
        if (nat.length) res.append(nativeChips(nat));
        nx.disabled = false;
      }
      var nx = el("button", { cls: "btn", type: "button", text: "Próxima frase →", disabled: true, onclick: function () { i++; clearStage(w); one(); } });
      var card = el("div", { cls: "card" }, steps(i + 1, list.length, "Frase"), ears(L.file, unlock, ph4 ? { max: 2, fast: false } : null), line, answer, res, nx);
      w.append(card); window.scrollTo(0, 0);
    }
    one();
  }

  // 🔢 Quantas palavras?
  function stContar(u, v, next, ctx) {
    var B = variations(u, "contar")[v], w = frame("contar", u, v, ctx, next), list = B.list, i = startAt(ctx), ok = startAcc(ctx);
    w.append(el("div", { cls: "card" }, el("h2", { text: B.label }), el("p", { cls: "small", text: "O nativo cola uma palavra na outra. Ouça e diga quantas palavras tem a frase. \"I'm\", \"don't\" e \"it's\" contam como 1." })));
    function one() { mark("contar", u, v, ctx, i, ok, list.length);
      if (i >= list.length) return finishBox(w, "contar", u, v, ok / list.length, next);
      var L = list[i], ws = words(L.en), n = ws.length, done = false;
      var opts = el("div", { cls: "opts row locked" }), res = el("div", { cls: "rt-res" });
      shuffle([n - 1, n, n + 1].filter(function (x) { return x > 1; })).forEach(function (x) {
        opts.append(el("button", { cls: "opt num", type: "button", text: String(x), onclick: function (e) {
          if (done) return; done = true; var good = x === n; if (good) ok++; e.currentTarget.classList.add(good ? "ok" : "bad"); fb(good);
          var boxes = el("p", { cls: "wbox" }); ws.forEach(function (t) { boxes.append(el("span", { text: t })); });
          res.append(el("b", { text: good ? "✅ Isso: " + n + " palavras" : "🔴 Eram " + n + " palavras" }), boxes, el("span", { cls: "small", text: L.pt }));
          nx.disabled = false;
        } }));
      });
      var nx = el("button", { cls: "btn", type: "button", text: "Próxima →", disabled: true, onclick: function () { i++; clearStage(w); one(); } });
      var card = el("div", { cls: "card" }, steps(i + 1, list.length, "Frase"), el("p", { cls: "hidden-line", text: "🙈 frase escondida" }), ears(L.file, function () { opts.classList.remove("locked"); }, { rate: 1.1 }), opts, res, nx);
      w.append(card); window.scrollTo(0, 0);
    }
    one();
  }

  // 🔗 Fala grudada
  function stGrudada(u, v, next, ctx) {
    var B = variations(GERAL, "grudada")[v], w = frame("grudada", u, v, ctx, next), list = B.list, i = startAt(ctx), ok = startAcc(ctx);
    w.append(el("div", { cls: "card" }, el("h2", { text: B.label }), el("p", { cls: "small", text: "Nativo não fala \"what do you want to\". Fala \"whaddaya wanna\". Ouça e escolha o que ele quis dizer." })));
    function one() { mark("grudada", u, v, ctx, i, ok, list.length);
      if (i >= list.length) return finishBox(w, "grudada", u, v, ok / list.length, next);
      var it = list[i], url = AUD + it.file, done = false, res = el("div", { cls: "rt-res" });
      var opts = el("div", { cls: "opts locked" });
      shuffle(it.options.map(function (o, k) { return k; })).forEach(function (k) {
        opts.append(el("button", { cls: "opt", type: "button", text: it.options[k], onclick: function (e) {
          if (done) return; done = true; var good = k === it.answer; if (good) ok++; e.currentTarget.classList.add(good ? "ok" : "bad"); fb(good);
          if (!good) { [].forEach.call(opts.children, function (b) { if (b.textContent === it.options[it.answer]) b.classList.add("ok"); }); addError({ uid: GERAL.id, kind: "ouvir", en: it.options[it.answer], pt: it.pt, file: url, prompt: "🔗 O que ele quis dizer?", choices: it.options.slice(), answer: it.options[it.answer] }); }
          res.append(el("p", { cls: "model" }, el("span", { text: "🔗 " + it.tip })), el("span", { cls: "small", text: "\"" + it.tts + "\" = " + it.pt }));
          nx.disabled = false;
        } }));
      });
      var nx = el("button", { cls: "btn", type: "button", text: "Próxima →", disabled: true, onclick: function () { i++; clearStage(w); one(); } });
      var card = el("div", { cls: "card" }, steps(i + 1, list.length, ""), ears(url, function () { opts.classList.remove("locked"); }, { fast: false }), opts, res, nx);
      w.append(card); window.scrollTo(0, 0);
    }
    one();
  }

  // 🎯 Qual você ouviu?
  function stPares(u, v, next, ctx) {
    var B = variations(GERAL, "pares")[v], w = frame("pares", u, v, ctx, next), list = dayShuffle(B.list, "pares" + v), i = startAt(ctx), ok = startAcc(ctx);
    w.append(el("div", { cls: "card" }, el("h2", { text: B.label }), el("p", { cls: "small", text: "Duas palavras quase iguais. O nativo fala uma delas: qual foi?" })));
    function one() { mark("pares", u, v, ctx, i, ok, list.length);
      if (i >= list.length) return finishBox(w, "pares", u, v, ok / list.length, next);
      var it = list[i], k = Math.random() < 0.5 ? 0 : 1, url = AUD + it.files[k], done = false, res = el("div", { cls: "rt-res" });
      var opts = el("div", { cls: "opts row locked" });
      it.words.forEach(function (wd, wk) {
        opts.append(el("button", { cls: "opt pair", type: "button", onclick: function (e) {
          if (done) return; done = true; var good = wk === k; if (good) ok++; e.currentTarget.classList.add(good ? "ok" : "bad"); fb(good);
          if (!good) { opts.children[k].classList.add("ok"); addError({ uid: GERAL.id, kind: "ouvir", en: joinS(it.before, it.words[k], it.after), pt: it.pt[k], file: url, prompt: joinS(it.before, "____", it.after), choices: it.words.slice(), answer: it.words[k] }); }
          res.append(el("b", { text: good ? "✅ Isso! \"" + it.words[k] + "\"" : "🔴 Era \"" + it.words[k] + "\"" }),
            el("div", { cls: "ears" }, el("button", { cls: "ear", type: "button", text: "🔊 " + it.words[0], onclick: function () { playUrl(AUD + it.files[0]); } }), el("button", { cls: "ear", type: "button", text: "🔊 " + it.words[1], onclick: function () { playUrl(AUD + it.files[1]); } })),
            el("span", { cls: "small", text: "Ouça as duas e sinta a diferença." }));
          nx.disabled = false;
        } }, el("b", { text: wd }), el("span", { cls: "small", text: it.pt[wk] })));
      });
      var nx = el("button", { cls: "btn", type: "button", text: "Próxima →", disabled: true, onclick: function () { i++; clearStage(w); one(); } });
      var card = el("div", { cls: "card" }, steps(i + 1, list.length, ""), el("p", { cls: "lac-line", text: joinS(it.before, "____", it.after) }), ears(url, function () { opts.classList.remove("locked"); }, { fast: false }), opts, res, nx);
      w.append(card); window.scrollTo(0, 0);
    }
    one();
  }

  // 🧠 Meus erros: refaz o que errou (shadowing e real time)
  function runErrors(next, ci, cn) {
    next = next || home;
    Promise.all([loadParts(), loadRef()]).then(function () { errorsFlow(next, ci, cn); }, function () { errorsFlow(next, ci, cn); });
  }
  function errorsFlow(next, ci, cn) {
    var w = screen(), list = myErrors().slice(-6).reverse(), i = 0, fixed = 0, rules = rulesNow();
    CUR = { st: "erros", uid: GERAL.id, v: 0, i: 0, acc: 0, daily: !!cn };
    w.append(el("header", { cls: "top" }, el("button", { cls: "back", type: "button", text: "‹ Sair", onclick: function () { CUR = null; home(); } }), el("button", { cls: "pause", type: "button", text: "Pausar", onclick: pauseNow })),
      el("div", { cls: "thead" }, el("span", { cls: "eyebrow", text: (cn ? "Treino do dia · " : "") + "🧠 Meus erros" }), cn && S.daily ? steps(ci, cn, "Fase", S.daily.plan.map(function (x) { return ST[x.st].emoji; })) : null),
      el("h1", { text: "O que você errou volta aqui" }), el("p", { cls: "small", text: "Acertou em 2 dias diferentes? Sai da lista." }));
    // 📘 a regra por trás do erro (quando o erro bate com uma regra do banco)
    if (rules.length && !cn) rules.forEach(function (R) {
      w.append(el("button", { cls: "station errs rule-card", type: "button", onclick: function () { runRule(R, function () { runErrors(next, ci, cn); }); } },
        el("span", { cls: "se", text: "📘" }), el("span", { cls: "tt" }, el("b", { text: "Corrigir meus erros: " + R.title }), el("span", { cls: "small", text: "Você errou isso: vamos acertar de vez" }))));
    });
    var keep = w.children.length;
    function one() {
      if (i >= list.length) {
        markDay(); persist(); while (w.children.length > keep) w.lastChild.remove(); stopAll(); CUR = null; var pb2 = w.querySelector(".top .pause"); if (pb2) pb2.remove();
        w.append(el("div", { cls: "sheet good" }, el("b", { text: "Revisão feita: acertou " + fixed + " de " + list.length }), el("p", { cls: "small", text: "Cada acerto conta 1 dia. No 2º dia de acerto, o erro sai da lista." }), el("button", { cls: "btn", type: "button", text: next === home ? "Voltar pro início" : "Próximo →", onclick: function () { next(); } })));
        return;
      }
      var e = list[i], res = el("div", { cls: "rt-res" });
      while (w.children.length > keep) w.lastChild.remove(); stopAll(); window.scrollTo(0, 0);
      var nx0 = el("button", { cls: "btn", type: "button", text: "Próximo →", disabled: true, onclick: function () { i++; one(); } });
      if (e.kind === "cena") {
        // 🔁 aquecimento no MESMO trecho → 🆕 prova com trecho NOVO de outro vídeo (só o novo conta)
        var why = el("p", { cls: "small", hidden: true, text: "💡 " + (e.porque || "") + (e.som ? " Soa “" + e.som + "”." : "") });
        var tryN = 0;
        function fresh() {
          var F = freshBit(e, tryN); tryN++;
          if (!F) { res.append(el("b", { text: "✅ Aquecimento feito." })); w.append(res, nx0); nx0.disabled = false; return; }
          w.append(bitCard(F, tryN === 1 ? "🆕 Prova: trecho novo, de outro vídeo" : "🆕 Mais uma: outro trecho novo", function (first) {
            if (first) { fixError(e.en); fixed++; res.replaceChildren(el("b", { text: "✅ Pegou de primeira num vídeo novo!" })); w.append(res, nx0); nx0.disabled = false; }
            else if (tryN < 3) { w.append(el("button", { cls: "btn ghost", type: "button", text: "🆕 Tentar outro trecho novo", onclick: function (ev) { ev.currentTarget.remove(); fresh(); } }), el("button", { cls: "linkish", type: "button", text: "Pular pro próximo erro", onclick: function () { i++; one(); } })); }
            else { res.replaceChildren(el("b", { text: "🟡 Quase. Volta outro dia." })); w.append(res, nx0); nx0.disabled = false; }
          }));
        }
        var warm = bitCard({ yt: e.yt, t: e.t, end: e.end, prompt: e.prompt, options: e.options, answer: e.answer, som: e.som }, "🔁 Aquecimento: o trecho que pegou você", function () { why.hidden = false; fresh(); });
        w.append(el("div", { cls: "card" }, steps(i + 1, list.length, ""), el("span", { cls: "eyebrow", text: "🎬 Erro de cena" })), warm, why);
        return;
      }
      if (e.kind === "ouvir") {
        var dn = false, op = el("div", { cls: "opts locked" });
        shuffle(e.choices).forEach(function (c) { op.append(el("button", { cls: "opt", type: "button", text: c, onclick: function (ev) {
          if (dn) return; dn = true; var good = eq(c, e.answer); ev.currentTarget.classList.add(good ? "ok" : "bad"); fb(good); if (!good) [].forEach.call(op.children, function (b) { if (eq(b.textContent, e.answer)) b.classList.add("ok"); });
          if (good) { fixError(e.en); fixed++; } res.append(el("b", { text: good ? "✅ Pegou!" : "🔴 Era \"" + e.answer + "\"" }), el("span", { cls: "small", text: e.en + " · " + e.pt })); nx0.disabled = false; } })); });
        w.append(el("div", { cls: "card" }, el("span", { cls: "eyebrow", text: "👂 Ouça de novo" }), steps(i + 1, list.length, ""), ears(e.file, function () { op.classList.remove("locked"); }), el("p", { cls: "lac-line", text: e.prompt }), op, res, nx0));
        return;
      }
      var t = talk(function (said, manual) {
        var o = manual ? 0.8 : overlap(e.en, said);
        res.innerHTML = ""; res.append(el("b", { text: (o >= 0.6 ? "✅ " : "🔴 ") + Math.round(o * 100) + "%" }), el("p", { cls: "model" }, manual ? e.en : paintModel(e.en, said).node));
        if (o >= 0.6) { if (!t.__fixed) { t.__fixed = true; fixError(e.en); fixed++; } } else { e.said = said; persist(); }
        nx0.disabled = false;
      }, {});
      w.append(el("div", { cls: "card" }, el("span", { cls: "eyebrow", text: e.kind === "rt" ? "⚡ Passe pro inglês" : "🔁 Ouça e repita" }), steps(i + 1, list.length, ""),
        e.kind === "rt" ? el("p", { cls: "rt-pt", text: e.pt }) : el("div", { cls: "ptools" }, el("button", { cls: "pbtn sm", type: "button", text: "▶", onclick: function () { if (e.file) playUrl(e.file); } }), el("span", { cls: "small", text: e.pt })),
        t, res, nx0));
    }
    if (list.length) one();
    else w.append(emptyBox("Nenhum erro pra revisar.", "Tá se achando, hein? 😏 Quando escapar alguma coisa no treino, ela vem parar aqui pra você treinar de novo.", "Voltar →", function () { next(); }));
  }

  // =====================================================================
  // NOVIDADES DO HOMEWORK NA DESTRAVANDO (27/11, pedido do Thiago: "tudo que tem de novo no homework, eu quero aqui")
  // 🎚️ evolução 🌱🌿🌳🍎 por habilidade · 🎉 tela de evolução · 🎬 cena em partes + 🔍 Raio-X + 🎯 prova do ouvido
  // 🎙️ gravação estilo WhatsApp · 🎧 contador de escutas da fofoca · 🎯 erro de cena com trecho novo
  // 📘 Corrigir meus erros · 📊 Progresso (status, níveis, medalhas) · menu fixo embaixo
  // =====================================================================
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  // ---------- 🔊 sons de videogame (8-bit, gerados na hora, sem arquivos) + 🔥 combo — igual ao homework ----------
  var SFX = (function () {
    var ctx = null, on = true;
    try { on = localStorage.getItem("academia_som") !== "0"; } catch (e) {}
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
    function seq(notes, st, type, vol) { if (!on || MUDO) return; notes.forEach(function (n, i) { if (n) tone(n, i * st, st * 0.95, type, vol); }); }
    // destrava o áudio no primeiro toque (iPhone nasce com o som suspenso)
    document.addEventListener("pointerdown", function () { if (on && !MUDO) c(); }, { once: true });
    return {
      tick: function () { seq([784], 0.06, "triangle", 0.09); },
      go: function () { seq([1047, 1568], 0.06, "square", 0.06); },
      combo: function (n) { var b = 523 * Math.pow(1.0595, Math.min(n, 12) * 2); seq([b, b * 1.26, b * 1.5], 0.05, "square", 0.06); },
      small: function () { seq([523, 659, 784], 0.08, "triangle", 0.1); },
      stage: function () { seq([523, 659, 784, 1047, 0, 784, 1047], 0.085); },
      oops: function () { if (!on || MUDO) return; tone(330, 0, 0.12, "triangle", 0.09); tone(247, 0.12, 0.22, "triangle", 0.09); },
      win: function () { seq([392, 523, 659, 784, 0, 659, 784, 0, 1047, 1047, 1047], 0.1); },
      isOn: function () { return on; },
      toggle: function () { on = !on; try { localStorage.setItem("academia_som", on ? "1" : "0"); } catch (e) {} if (on) seq([659, 988], 0.07); return on; }
    };
  })();
  var combo = 0;
  function fb(ok) {
    buzz(ok ? 20 : [40, 30, 40]);
    if (!ok) { combo = 0; SFX.oops(); return; }
    combo++; S.comboBest = Math.max(S.comboBest || 0, combo);
    if (combo >= 3) {
      SFX.combo(combo); S.xp++; persist();
      var t = el("div", { cls: "combo-toast", role: "status", text: (combo % 5 === 0 ? CHEER[Math.floor(Math.random() * CHEER.length)] + "  " : "") + "🔥 Combo x" + combo + "!  +1 XP" });
      document.body.append(t); setTimeout(function () { t.remove(); }, 1300);
    } else SFX.small();
  }
  var MUDO = Q.get("mudo") === "1"; // só pra testes sem som

  // ---------- 🟢 frase pintada palavra por palavra (verde = falou, vermelho = faltou) ----------
  function nrm(x) { return String(x || "").toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9' ]+/g, " ").trim(); }
  function paintModel(text, said) {
    var pool = nrm(said).split(/\s+/).filter(Boolean), miss = [], node = el("span", { cls: "painted" });
    clean(text).split(/(\s+)/).forEach(function (tok) {
      if (/^\s+$/.test(tok)) { node.append(tok); return; }
      var w = nrm(tok), sp = el("span", { text: tok });
      if (w) { var ps = w.split(" "); if (ps.every(function (x) { return pool.indexOf(x) > -1; })) { ps.forEach(function (x) { pool.splice(pool.indexOf(x), 1); }); sp.className = "hit"; } else { sp.className = "miss"; miss.push(tok.replace(/[^\w'-]/g, "")); } }
      node.append(sp);
    });
    return { node: node, miss: miss };
  }
  // fala em português não conta (o reconhecimento é em inglês)
  var PTW = ("que nao não eu ele ela eles elas voce você de do da dos das para pra com uma um uns umas isso esse essa este esta está tá tava estava ontem hoje amanhã muito muita mas porque então também aqui ali lá onde quando como meu minha seu sua nós gente foi fui tem tinha vai vou fazer falar ser estar obrigado obrigada sim né tipo coisa casa trabalho depois agora sempre nunca ainda mais menos bem bom boa").split(" ");
  function isPortuguese(t) { var w = nrm(t).split(/\s+/).filter(Boolean), p = w.filter(function (x) { return PTW.indexOf(x) > -1 && ["a", "e", "o"].indexOf(x) < 0; }); return w.length > 0 && p.length >= 2 && p.length / w.length >= 0.12; }
  // ← Sair no meio do exercício: janela no próprio site (nada de confirm cinza)
  function askExit() {
    var ov = el("div", { cls: "evo-ov bsheet", role: "dialog", "aria-modal": "true", onclick: function (e) { if (e.target === ov) ov.remove(); } }, el("div", { cls: "evo-card bs-card" },
      el("b", { cls: "evo-name", text: "Quer parar agora?" }), el("p", { cls: "small", text: "Com ☕ Pausar, você continua exatamente daqui depois." }),
      el("button", { cls: "btn", type: "button", text: "☕ Pausar e sair", onclick: function () { ov.remove(); pauseNow(); } }),
      el("button", { cls: "btn ghost", type: "button", text: "Continuar aqui", onclick: function () { ov.remove(); } }),
      el("button", { cls: "linkish", type: "button", text: "Sair sem salvar", onclick: function () { ov.remove(); CUR = null; home(); } })));
    document.body.append(ov); sheetify(ov, ov.querySelector(".bs-card"), function () { ov.remove(); }); ov.querySelector(".btn").focus();
  }
  // ⬅️ voltar do Android: dentro de exercício pausa (salva), nas abas volta pro início
  var navPushed = false;
  function pushNav() { if (!navPushed) { try { history.pushState({ d: 1 }, ""); navPushed = true; } catch (e) {} } }
  window.addEventListener("popstate", function () { navPushed = false; if (document.querySelector(".evo-ov")) { document.querySelectorAll(".evo-ov").forEach(function (o) { o.remove(); }); return; } BACKING = true; if (CUR) pauseNow(); else home(); });
  // ⭐ nível de XP com nome (escada do homework, ajustada: cada exercício da Destravando dá 10 a 30 XP)
  var LEVELS = [{ xp: 0, name: "Iniciante" }, { xp: 120, name: "Curioso" }, { xp: 300, name: "Ouvinte" }, { xp: 540, name: "Fofoqueiro" }, { xp: 840, name: "Tagarela" }, { xp: 1200, name: "Contador de histórias" }, { xp: 1650, name: "Mestre da fofoca" }, { xp: 2250, name: "Quase nativo" }, { xp: 3000, name: "Lenda" }];
  function xpLevel() { var i = 0; while (i + 1 < LEVELS.length && S.xp >= LEVELS[i + 1].xp) i++; var n = LEVELS[i + 1] || null; return { n: i + 1, name: LEVELS[i].name, next: n, left: n ? n.xp - S.xp : 0, f: n ? (S.xp - LEVELS[i].xp) / (n.xp - LEVELS[i].xp) : 1 }; }
  // 🎮 como funciona: aparece no início até tocar em "Entendi"
  function howTo() {
    var seen = !!S.howtoSeen; try { seen = seen || localStorage.getItem(PK("academia_comojoga")) === "1"; } catch (e) {} // S.howtoSeen vai junto com a conta
    if (seen) return null;
    var card = el("section", { cls: "card howto" }, el("b", { cls: "howto-title", text: "🎮 Como funciona" }),
      el("ul", null,
        el("li", { html: "▶️ Todo dia tem o <b>Treino de hoje</b>: fases curtas de ouvir e falar." }),
        el("li", { html: "⭐ Cada fase vale até <b>3 estrelas</b>. Acertos seguidos viram <b>combo 🔥</b> e dão XP." }),
        el("li", { html: "🌱 Cada habilidade <b>evolui</b>: 🌱 → 🌿 → 🌳 → 🍎. Mandou bem 2 vezes seguidas? Sobe de fase." }),
        el("li", { html: "🎙️ Pra falar é igual WhatsApp: <b>toque pra gravar</b>, toque pra finalizar, ouça e <b>✅ Envie</b>." }),
        el("li", { html: "☕ Cansou? <b>Pause</b>: o site guarda onde você parou." }),
        el("li", { html: "🧠 O que você erra vai pro <b>Meus erros</b> e volta em outro dia." })),
      el("button", { cls: "btn", type: "button", text: "Entendi, bora! 🚀", onclick: function () { try { localStorage.setItem(PK("academia_comojoga"), "1"); } catch (e) {} S.howtoSeen = true; persist(); SFX.go(); card.remove(); } }));
    return card;
  }

  // ---------- 🎚️ evolução ----------
  var EVO_N = [{ icon: "🌱", name: "Sementinha" }, { icon: "🌿", name: "Plantinha" }, { icon: "🌳", name: "Árvore" }, { icon: "🍎", name: "Árvore com frutos" }];
  var EVO = {
    ouvido: { label: "Ouvido", emoji: "🎧", rule: "acerte de primeira 4 de 5 partes da cena", fases: ["a cena em 5 partes", "4 partes maiores", "3 partes maiores", "a cena inteira, sem partes"] },
    leitura: { label: "Leitura", emoji: "🗣️", rule: "tire 80% na leitura", fases: ["as palavras ficam verdes enquanto você lê", "o verde só aparece no fim", "no ritmo natural, sem arrastar", "ritmo natural e 90% entendido"] },
    ditado: { label: "Ditado", emoji: "✍️", rule: "acerte 80% do ditado", fases: ["pode usar o 🐢 devagar", "sem o 🐢 devagar", "4 frases emendadas", "no máximo 2 escutas"] },
    lacunas: { label: "Lacunas", emoji: "🧩", rule: "acerte 80% das lacunas", fases: ["escolha entre 3 palavras", "banco de palavras com pegadinhas", "você escreve o que ouviu, frase por frase", "o texto inteiro da fofoca: escreve ouvindo no máximo 2 vezes"] },
    fofoca: { label: "Fofoca", emoji: "🕵️", rule: "acerte 80% das perguntas da fofoca", fases: ["ouve quantas vezes quiser", "no máximo 5 escutas", "no máximo 3 escutas", "no máximo 2 escutas"] },
    reconto: { label: "Reconto", emoji: "🎤", rule: "tire 80% no reconto", fases: ["fale 30 s, com as dicas de apoio", "fale 45 s", "fale 1 minuto", "1 minuto, sem as dicas de apoio"] },
    rt: { label: "Real Time", emoji: "⚡", rule: "tire 80% no Real Time", fases: ["frase por frase, com dica das palavras", "frase por frase, sem dica", "frase por frase, com menos tempo", "o texto inteiro de uma vez, falando pelo menos 20 s"] }
  };
  var EVO_ORDER = ["ouvido", "ditado", "lacunas", "fofoca", "reconto", "leitura", "rt"];
  // 🌱🌿🌳🍎 por NÍVEL (Thiago 28/11): subir de nível recomeça no 🌱 com conteúdo mais difícil; a evolução antiga fica com o nível onde a pessoa estava
  S.evoL = S.evoL || {};
  if (!S.evoL.__mig) { if (S.evo) S.evoL[LVL] = S.evo; S.evoL.__mig = 1; }
  S.evo = S.evoL[LVL] = S.evoL[LVL] || {};
  var FORCE = Number(Q.get("nivel")) || (PROF ? Number(lsGet("prof:nivel")) || 0 : 0); // ?nivel=1..4 mostra todas as habilidades numa fase (demonstração)
  function evoOf(k) {
    if (FORCE >= 1 && FORCE <= 4) return { phase: FORCE, streak: 0 };
    var x = S.evo[k];
    if (!x) x = S.evo[k] = { phase: k === "lacunas" ? (S.lacLevel || [1, 1, 2, 3, 3, 3][(S.test && S.test.band) || 0] || 1) : 1, streak: 0 };
    if (!(x.phase >= 1 && x.phase <= 4)) x.phase = 1; // conserta progresso salvo com fase inválida (faixa 4/5 no teste)
    return x;
  }
  function evoUpdate(k, good) {
    var x = evoOf(k), from = x.phase;
    if (FORCE) return { up: false };
    if (good) { x.streak++; if (x.streak >= 2 && x.phase < 4) { x.phase++; x.streak = 0; S.evoUps = (S.evoUps || 0) + 1; persist(); return { up: true, from: from, to: x.phase }; } }
    else x.streak = 0;
    persist(); return { up: false };
  }
  function evoCheer(k, pct, first) {
    var E = EVO[k], good = pct >= 0.8;
    if (typeof first === "string") { var dk = first, sk = k + "|" + dk; S.evoSeen = S.evoSeen || {}; first = !S.done[dk] && !S.evoSeen[sk]; if (first) { S.evoSeen[sk] = 1; persist(); } }
    if (first === false) return el("p", { cls: "evo-up", html: "🔁 Repetição é ótima pra fixar, mas pra <b>evoluir</b> vale a 1ª vez de cada variação. Faça uma nova!" });
    var r = evoUpdate(k, good), x = evoOf(k);
    if (r.up) {
      var a = EVO_N[r.from - 1], b = EVO_N[r.to - 1];
      setTimeout(function () { evolve(a.icon, b.icon, b.name, E.label, E.fases[r.to - 1]); }, 700);
      return el("p", { cls: "evo-up", html: "🎉 <b>Evoluiu!</b> Agora você é uma " + b.icon + " <b>" + b.name + "</b> em " + E.label + "!" });
    }
    if (x.phase >= 4) return el("p", { cls: "evo-up", html: good ? "🍎 Árvore com frutos em " + E.label + ". Mandou bem!" : "🍎 Você está na fase máxima em " + E.label + ". Bora manter!" });
    var n = EVO_N[x.phase];
    if (good) return el("p", { cls: "evo-up", html: "🔥 <b>Mandou bem!</b> Mais 1 assim e você evolui pra " + n.icon + " " + n.name + "." });
    return el("p", { cls: "evo-up", html: "💪 Hoje: " + Math.round(pct * 100) + "%. Pra evoluir: 80% em 2 seguidas." });
  }
  function dotsOf(p) { var d = ""; for (var i = 1; i <= 4; i++) d += i <= p ? "●" : "○"; return d; }
  // selo de uma linha: "🌿 Plantinha · Lacunas ●●○○ ⓘ" (detalhe só no ⓘ)
  function evoBadge(k) {
    var E = EVO[k], x = evoOf(k), f = EVO_N[x.phase - 1], n = EVO_N[x.phase] || null;
    var tip = el("p", { cls: "badge-tip", hidden: true, html: "Agora: " + esc(E.fases[x.phase - 1]) + "." + (n ? "<br>Pra evoluir pra " + n.icon + " " + n.name + ": " + esc(E.rule) + " em 2 seguidas." + (x.streak ? " Falta 1! 🔥" : "") : "<br>🏆 Evolução máxima!") });
    var b = el("button", { cls: "evo-badge", type: "button", onclick: function () { tip.hidden = !tip.hidden; } },
      el("span", { cls: "evo-ic", text: f.icon }), el("b", { text: f.name }), el("span", { cls: "evo-lab", text: E.label }), el("span", { cls: "evo-dots", text: dotsOf(x.phase) }), el("span", { cls: "evo-i", text: "ⓘ" }));
    return el("div", { cls: "evo-wrap" }, b, tip);
  }
  // 🎉 EVOLUIU! tela cheia, a planta crescendo, confete e som
  function chime() {
    try {
      var C = window.AudioContext || window.webkitAudioContext; if (!C || MUDO) return; var c = new C();
      [523, 659, 784, 1047].forEach(function (f, i) { var o = c.createOscillator(), g = c.createGain(); o.frequency.value = f; o.type = "triangle"; g.gain.setValueAtTime(0.0001, c.currentTime + i * 0.12); g.gain.exponentialRampToValueAtTime(0.18, c.currentTime + i * 0.12 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + i * 0.12 + 0.35); o.connect(g); g.connect(c.destination); o.start(c.currentTime + i * 0.12); o.stop(c.currentTime + i * 0.12 + 0.4); });
    } catch (e) {}
  }
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
  function evolve(fromIcon, toIcon, toName, label, desc) {
    var ov = el("div", { cls: "evo-ov", role: "dialog", "aria-modal": "true" },
      el("div", { cls: "evo-card" },
        el("p", { cls: "evo-top", text: "✨ Você evoluiu em " + label + "!" }),
        el("div", { cls: "evo-anim" }, el("span", { cls: "evo-from", text: fromIcon }), el("span", { cls: "evo-arrow", text: "→" }), el("span", { cls: "evo-to", text: toIcon })),
        el("b", { cls: "evo-name", text: "Agora você é uma " + toName }),
        el("p", { cls: "small", text: desc ? "Daqui pra frente: " + desc + ". É assim que o seu inglês cresce! 🌱" : "O desafio fica um pouco maior. É assim que o seu inglês cresce! 🌱" }),
        el("button", { cls: "btn", type: "button", text: "Bora! 💪", onclick: function () { ov.remove(); } })));
    document.body.append(ov); SFX.win(); buzz([60, 40, 120]); confetti(); ov.querySelector(".btn").focus();
  }
  if (Q.get("evoluir") === "1") setTimeout(function () { evolve("🌿", "🌳", "Árvore", "Ouvido", "3 partes maiores"); }, 900);
  function notice(txt) {
    var n = el("div", { cls: "notice", role: "status", text: txt }); document.body.append(n);
    setTimeout(function () { n.classList.add("go"); }, 3800); setTimeout(function () { n.remove(); }, 4400);
  }

  // ---------- 🎙️ gravação estilo WhatsApp (Thiago 27/11: TODA fala do aluno) ----------
  // toca pra gravar (barrinha + tempo) → toca pra finalizar → ouvir/pausar a própria voz → 🔁 regravar (até 3x) ou ✅ Enviar
  function fmtS(x) { x = Math.max(0, Math.round(x || 0)); return Math.floor(x / 60) + ":" + String(x % 60).padStart(2, "0"); }
  function voicePlayer(url) {
    var a = new Audio(url), fill = el("i"), tm = el("span", { cls: "mb-tm", text: "0:00" });
    var b = el("button", { cls: "wa-play", type: "button", text: "▶ Ouvir minha voz" });
    b.onclick = function () { if (a.paused) { stopAll(); current = a; a.play().catch(function () {}); } else a.pause(); };
    a.addEventListener("play", function () { b.textContent = "⏸ Pausar"; });
    a.addEventListener("pause", function () { b.textContent = "▶ Ouvir minha voz"; });
    a.addEventListener("timeupdate", function () { var d = isFinite(a.duration) ? a.duration : 0; fill.style.width = d ? Math.min(100, a.currentTime / d * 100) + "%" : "0%"; tm.textContent = fmtS(a.currentTime) + (d ? " / " + fmtS(d) : ""); });
    a.addEventListener("ended", function () { b.textContent = "▶ Ouvir de novo"; fill.style.width = "100%"; });
    return el("div", { cls: "wa-voice" }, b, el("div", { cls: "mb-track" }, fill), tm);
  }
  var MAX_REDO = 3;
  function talk(onDone, opts) {
    opts = opts || {};
    var idle = "🎙️ Toque pra gravar";
    var b = el("button", { cls: "mic wa-go", type: "button", text: idle });
    var live = el("div", { cls: "transcript" }), ph0 = el("span", { cls: "small", text: "O que você falar aparece aqui." }); live.append(ph0);
    var mSec = el("span", { text: "0 s" }), mWords = el("span", { text: "0 palavras" });
    function setLive(t) { live.replaceChildren(t ? document.createTextNode(t) : ph0); var nw = t ? t.split(/\s+/).filter(Boolean).length : 0; mWords.textContent = nw + (nw === 1 ? " palavra" : " palavras"); }
    var fill = el("i"), tm = el("span", { cls: "mb-tm", text: "0:00" });
    var lvlBox = el("div", { cls: "wa-meter", title: "nível da sua voz" });
    var bar = el("div", { cls: "wa-live", hidden: true }, el("span", { cls: "wa-dot", text: "🔴" }), el("div", { cls: "mb-track" }, fill), tm, lvlBox);
    var review = el("div", { cls: "wa-review", hidden: true }), mineBox = el("div", { cls: "wa-mine", hidden: true });
    var wc = opts.minWords ? el("p", { cls: "small wc", text: "0 palavras · mínimo " + opts.minWords }) : null;
    var lvl = el("i", { cls: "wa-lvl" }); lvlBox.append(lvl);
    var wrap = el("div", { cls: "talk" }, el("p", { cls: "hint rec-hint", text: opts.quick ? "🎙️ Toque pra gravar · repita igualzinho · toque de novo pra terminar" : "🎙️ Toque pra gravar · toque de novo pra terminar · ouça e envie" }),
      b, bar, el("div", { cls: "meter" }, mSec, mWords), live, wc, review, mineBox);
    if (!SR) {
      b.textContent = "🎤 Este navegador não ouve você";
      b.disabled = true;
      wrap.append(el("p", { cls: "small", text: "Use o Chrome no Android ou computador, ou o Safari no iPhone. Por enquanto, fale em voz alta e toque em continuar." }),
        el("button", { cls: "btn ghost", type: "button", text: "Falei em voz alta →", onclick: function () { onDone("", true); } }));
      return wrap;
    }
    var rec = null, finals = "", interim = "", base = "", state = "idle", empties = 0, redo = 0, mr = null, chunks = [], stream = null, t0 = 0, tick = null, blobUrl = null, an = null, liveIdx = 0, srReady = false, mrReady = false, cdDone = false, armT = null;
    // sair da tela no meio da gravação: desliga microfone, reconhecimento e timers (pente-fino 28/11)
    TALKS.push(function () { state = "idle"; clearTimeout(armT); clearInterval(tick); try { if (rec) rec.abort(); } catch (e) {} rec = null; try { if (mr && mr.state !== "inactive") mr.stop(); } catch (e) {} try { if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; micOff(); } } catch (e) {} });
    function fallback() {
      if (!wrap.querySelector(".mic-fallback")) wrap.append(el("button", { cls: "btn ghost mic-fallback", type: "button", text: "Não consigo usar o microfone: falei em voz alta →", onclick: function () { onDone("", true); } }));
    }
    // 🎙️ MICROFONE (Thiago 27/11: "as duas primeiras palavras cortam"): o microfone liga DURANTE o 3-2-1
    // e o "🔴 FALE AGORA" só aparece quando o reconhecimento e o gravador já estão ouvindo de verdade.
    function startMR() {
      chunks = []; mr = null;
      if (!navigator.mediaDevices || !window.MediaRecorder) { mrReady = true; maybeLive(); return; }
      navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }).then(function (s) {
        if (state !== "arming" && state !== "live") { s.getTracks().forEach(function (t) { t.stop(); }); return; }
        stream = s; micOn();
        // 🎚️ medidor de voz: mostra que o microfone está pegando
        try { var AC = window.AudioContext || window.webkitAudioContext, ac = new AC(), src = ac.createMediaStreamSource(s); an = ac.createAnalyser(); an.fftSize = 256; src.connect(an); an._ac = ac; } catch (e) { an = null; }
        try { mr = new MediaRecorder(s); } catch (e) { mr = null; mrReady = true; maybeLive(); return; }
        mr.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
        mr.onstart = function () { mrReady = true; maybeLive(); };
        mr.start();
      }).catch(function () { mrReady = true; maybeLive(); });
    }
    function stopMR(cb) {
      var done = false; function fin() { if (done) return; done = true; if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); micOff(); } stream = null; if (an && an._ac) { try { an._ac.close(); } catch (e) {} } an = null; cb(chunks.length ? new Blob(chunks, { type: (mr && mr.mimeType) || "audio/webm" }) : null); }
      if (mr && mr.state !== "inactive") { mr.onstop = fin; try { mr.stop(); } catch (e) { fin(); } setTimeout(fin, 1500); } else fin();
    }
    function arm() {
      if (rec) return; finals = ""; interim = ""; base = ""; liveIdx = 0; srReady = false; mrReady = false; cdDone = false;
      setLive(""); mSec.textContent = "0 s"; review.hidden = true; review.replaceChildren();
      stopAll(); state = "arming"; b.disabled = true; b.textContent = "⏳ Ligando o microfone…";
      rec = new SR(); rec.lang = "en-US"; rec.continuous = true; rec.interimResults = true;
      // remonta o texto inteiro a cada resultado (o Chrome do Android reenvia frases) e ignora o que veio antes do "FALE AGORA"
      rec.onresult = function (e) {
        if (state !== "live") { liveIdx = e.results.length; return; }
        var f = "", it = ""; for (var i = liveIdx; i < e.results.length; i++) { if (e.results[i].isFinal) f += " " + e.results[i][0].transcript; else it += " " + e.results[i][0].transcript; }
        finals = (base + " " + f).trim(); interim = it.trim(); var all = (finals + " " + interim).trim(); setLive(all);
        if (wc) { var nw = all.split(/\s+/).filter(Boolean).length; wc.textContent = nw + " palavras · mínimo " + opts.minWords; wc.classList.toggle("ok", nw >= opts.minWords); }
        if (opts.onLive && opts.onLive(all) === true) stop();
      };
      rec.onend = function () { if ((state === "live" || state === "arming") && rec && b.isConnected) { base = finals; liveIdx = 0; try { rec.start(); } catch (e) {} } };
      // Android: o reconhecimento pega o microfone primeiro; o gravador liga logo depois
      rec.onaudiostart = function () { if (srReady) return; srReady = true; setTimeout(startMR, 120); maybeLive(); };
      rec.onerror = function (ev) {
        if (["not-allowed", "service-not-allowed", "audio-capture", "network"].indexOf(ev.error) < 0) return;
        clearTimeout(armT); rec = null; state = "idle"; b.disabled = false; b.classList.remove("live"); bar.hidden = true; clearInterval(tick);
        b.textContent = ev.error === "network" ? "🎤 Sem internet pro microfone. Tente de novo" : "🎤 Libere o microfone e tente de novo";
        stopMR(function () {}); fallback();
      };
      try { rec.start(); } catch (e) {}
      // 3, 2, 1 enquanto o microfone liga
      var n = 3;
      (function cd() { if (state !== "arming") return; if (n === 0) { cdDone = true; b.textContent = "⏳ Só um instante…"; maybeLive(); return; } b.textContent = "Prepare-se… " + n; n--; SFX.tick(); setTimeout(cd, 420); })();
      // se o celular não avisar que o microfone ligou, libera mesmo assim
      clearTimeout(armT); armT = setTimeout(function () { if (state === "arming") { if (!srReady) { srReady = true; startMR(); } mrReady = true; cdDone = true; maybeLive(); } }, 3000);
    }
    function maybeLive() {
      if (state !== "arming" || !srReady || !mrReady || !cdDone) return;
      clearTimeout(armT); goLive();
    }
    function goLive() {
      state = "live"; b.disabled = false; b.classList.add("live"); b.textContent = "🔴 FALE AGORA · toque aqui pra FINALIZAR"; buzz(80); SFX.go();
      t0 = Date.now(); bar.hidden = false; fill.style.width = "0%"; tm.textContent = "0:00";
      clearInterval(tick); tick = setInterval(function () {
        var s = (Date.now() - t0) / 1000; mSec.textContent = Math.round(s) + " s"; tm.textContent = fmtS(s) + (opts.minSecs ? " · mínimo " + opts.minSecs + " s" : ""); fill.style.width = Math.min(100, s / (opts.minSecs || 60) * 100) + "%"; tm.classList.toggle("ok", !!opts.minSecs && s >= opts.minSecs);
        if (an) { var d = new Uint8Array(an.frequencyBinCount); an.getByteTimeDomainData(d); var m = 0; for (var k = 0; k < d.length; k++) m = Math.max(m, Math.abs(d[k] - 128)); lvl.style.width = Math.min(100, m / 64 * 100) + "%"; }
      }, 120);
    }
    function stop() {
      if (!rec || state !== "live") return; state = "stopping"; buzz([30, 40, 30]); clearInterval(tick);
      var secs = (Date.now() - t0) / 1000;
      if (opts.onRecEnd) opts.onRecEnd();
      b.classList.remove("live"); b.textContent = "⏳ Entendendo…"; b.disabled = true;
      var r = rec; setTimeout(function () { try { r.stop(); } catch (e) {} }, 500);
      setTimeout(function () { stopMR(function (blob) {
        setTimeout(function () {
          rec = null; state = "idle"; b.disabled = false; bar.hidden = true;
          var said = (finals + " " + interim).trim();
          // gravação vazia NUNCA conta como resposta (a 1ª costuma ser o pedido de permissão do microfone)
          if (!said) {
            empties++;
            b.textContent = secs < 1.5 ? "🎙️ Muito rápido! Toque, fale e só depois toque de novo" : empties === 1 ? "🎙️ Microfone pronto! Toque e fale de novo" : "🎙️ Não ouvi nada. Toque, fale perto e toque no fim";
            setLive("");
            if (empties >= 2) fallback();
            return;
          }
          empties = 0;
          if (isPortuguese(said)) { b.textContent = "🎙️ Toque e fale em inglês"; setLive(""); live.replaceChildren(el("span", { cls: "small warn-pt", text: "Parece que você falou em português 🙂 Essa gravação não conta." })); return; }
          if (blobUrl) { try { URL.revokeObjectURL(blobUrl); } catch (e) {} }
          blobUrl = blob ? URL.createObjectURL(blob) : null;
          if (opts.quick) { // shadowing: corrige na hora e deixa 🎧 Minha voz do lado, igual ao homework
            b.textContent = opts.again || "🎙️ Gravar de novo";
            if (blobUrl) { mineBox.replaceChildren(el("span", { cls: "small", text: "🎧 Minha voz: compare com o modelo" }), voicePlayer(blobUrl)); mineBox.hidden = false; }
            onDone(said, false, secs); return;
          }
          b.hidden = true; review.hidden = false; review.replaceChildren();
          if (blobUrl) review.append(voicePlayer(blobUrl));
          var left = MAX_REDO - redo;
          review.append(el("div", { cls: "wa-acts" },
            left > 0 ? el("button", { cls: "btn ghost", type: "button", text: "🔁 Gravar de novo · " + left + (left === 1 ? " chance" : " chances"), onclick: function () { redo++; review.hidden = true; setLive(""); b.hidden = false; b.textContent = idle; } }) : null,
            el("button", { cls: "btn", type: "button", text: "✅ Enviar", onclick: function () {
              review.hidden = true; b.hidden = false; b.textContent = opts.again || "🎙️ Gravar de novo"; redo = 0;
              if (blobUrl) { mineBox.replaceChildren(el("span", { cls: "small", text: "🎧 Minha voz: compare com o modelo" }), voicePlayer(blobUrl)); mineBox.hidden = false; }
              onDone(said, false, secs); } })),
            el("p", { cls: "small", text: left > 0 ? "Ouça sua voz. Se não gostou, grave de novo." : "Você já regravou " + MAX_REDO + " vezes. Agora é enviar." }));
        }, 900);
      }); }, 500);
    }
    b.addEventListener("click", function (e) { e.preventDefault(); if (state === "live") stop(); else if (state === "idle") arm(); });
    wrap._stop = stop;
    return wrap;
  }

  // ---------- 🎬 CENA EM PARTES (igual ao homework) ----------
  // public/academia/cenas-partes.json: { "youtubeId@startOriginal": { start, end, intro, transcript, vocab, parts[5] } }
  var PARTS = null;
  function loadParts() { if (PARTS) return Promise.resolve(PARTS); return j("/academia/cenas-partes.json?v=" + (window.__v || 1)).then(function (x) { PARTS = x || {}; return PARTS; }, function () { PARTS = {}; return PARTS; }); }
  function partsOf(V) { return PARTS && V && PARTS[V.youtubeId + "@" + (V.start || 0)] || null; }
  function rich(s) { return hl(s, CURU); }
  // 🔑 Thiago 28/11: TODO chunk / expressão de nativo aparece destacado, em qualquer texto, pro aluno saber o que guardar
  var CURU = null; // tema aberto agora (pra achar os chunks dele)
  function ckPhrases(u) {
    if (u && u.__ck) return u.__ck;
    var out = [];
    ((u && u.lesson && u.lesson.chunks) || []).forEach(function (c) { String(c.chunk || "").split(/\s*\/\s*|\s*·\s*/).forEach(function (x) { x = x.replace(/[…]|\.\.\.|\(.*?\)/g, "").replace(/[?!.,]+$/, "").trim(); if (x.split(/\s+/).length >= 2 && x.length >= 4) out.push(x.toLowerCase()); }); });
    Object.keys(EBOOK || {}).forEach(function (k) { if (/\s/.test(k) && k.indexOf("…") < 0 && k.length >= 5) out.push(k.toLowerCase()); });
    out = out.filter(function (x, i) { return out.indexOf(x) === i; }).sort(function (a, b) { return b.length - a.length; });
    if (u) u.__ck = out; return out;
  }
  function hl(raw, u) {
    var h = esc(raw).replace(/\*\*(.+?)\*\*/g, '<mark class="ck">$1</mark>').replace(/\+\+(.+?)\+\+/g, '<mark class="ck nat">$1</mark>');
    ckPhrases(u).forEach(function (ph) {
      var re = new RegExp("(^|[^a-z'])(" + ph.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/'/g, "['’]") + ")(?![a-z])", "gi");
      h = h.split(/(<mark[^>]*>.*?<\/mark>)/).map(function (seg) { return seg.indexOf("<mark") === 0 ? seg : seg.replace(re, '$1<mark class="ck">$2</mark>'); }).join("");
    });
    return h;
  }
  function ckLegend() { return el("p", { cls: "ck-legend", html: '<mark class="ck">destacado</mark> = como o nativo fala de verdade. Você vai ouvir isso em série e filme: guarde!' }); }
  function ckChips(text, u) { // "🔑 Guarde: …" embaixo de respostas que já vêm coloridas por acerto/erro
    var t = String(text || "").toLowerCase(), found = ckPhrases(u).filter(function (ph) { return new RegExp("(^|[^a-z'])" + ph.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?![a-z])").test(t); });
    found = found.filter(function (x) { return !found.some(function (y) { return y !== x && y.indexOf(x) > -1; }); }).slice(0, 4);
    if (!found.length) return null;
    return el("p", { cls: "ck-chips" }, el("span", { text: "🔑 Guarde: " }), found.map(function (f) { return el("mark", { cls: "ck", text: f }); }));
  }
  function clean(s) { return String(s || "").replace(/\*\*|\+\+/g, ""); }
  function miniBar() {
    var fill = el("i"), lab = el("span", { cls: "mb-lab" }), tm = el("span", { cls: "mb-tm" });
    var box = el("div", { cls: "mini-bar", hidden: true }, el("div", { cls: "mb-top" }, lab, tm), el("div", { cls: "mb-track" }, fill));
    return { box: box, set: function (from, to, cur, playing, name) {
      var len = Math.max(1, to - from), done = Math.min(len, Math.max(0, cur - from)), f = done / len;
      box.hidden = false; fill.style.width = (f * 100) + "%";
      lab.textContent = f >= 0.98 ? "✅ Terminou: " + name : playing ? "🔊 Tocando: " + name : "⏸ Pausado: " + name;
      tm.textContent = fmtS(done) + " / " + fmtS(len);
    } };
  }
  // player do YouTube escondido atrás de uma capa (tela coberta): toca pedaços [t, end]
  function ytScene(holder, id, T0, T1, onFail) {
    var p = null, ready = null, stopAt = 0, onStop = null, at = 0, ticks = [], ok = false, failed = false, held = false;
    // ⏸ Thiago 28/11: todo vídeo pode pausar e continuar de onde parou (o botão aparece em cima do vídeo enquanto toca)
    var pp = el("button", { cls: "yt-pp", type: "button", hidden: true, text: "⏸ Pausar", onclick: function (e) {
      e.stopPropagation(); if (!p || !p.getPlayerState) return; var st = p.getPlayerState();
      if (st === 1 || st === 3) { p.pauseVideo(); held = true; } else if (held) { p.playVideo(); at = Date.now(); held = false; }
      pp.textContent = held ? "▶ Continuar" : "⏸ Pausar"; } });
    if (holder.parentNode) holder.parentNode.append(pp);
    // vídeo que não abre (bloqueador de anúncio, rede que bloqueia YouTube, vídeo restrito): avisa e deixa pular (pente-fino 28/11)
    function fail() { if (ok || failed) return; failed = true; if (onFail && document.body.contains(holder)) onFail(); }
    setTimeout(fail, 12000);
    ready = loadYT().then(function (YT) {
      return new Promise(function (res) {
        p = new YT.Player(holder, { videoId: id, playerVars: { start: Math.floor(T0), end: Math.ceil(T1) + 1, controls: 0, disablekb: 1, fs: 0, rel: 0, playsinline: 1, modestbranding: 1, cc_load_policy: 0, iv_load_policy: 3 },
          events: { onError: function () { ok = false; fail(); }, onReady: function () { ok = true; try { if (MUDO) p.mute(); else { p.unMute(); p.setVolume(100); } } catch (e) {} res(p); } } });
      });
    });
    var iv = setInterval(function () {
      if (!document.body.contains(holder) && !(p && p.getIframe && document.body.contains(p.getIframe()))) { clearInterval(iv); try { p.destroy(); } catch (e) {} return; }
      if (!p || !p.getCurrentTime) return;
      var cur = p.getCurrentTime(), st = p.getPlayerState ? p.getPlayerState() : -1;
      if (!pp.parentNode && holder.parentNode) holder.parentNode.append(pp);
      pp.hidden = !(st === 1 || st === 3 || held); pp.textContent = held ? "▶ Continuar" : "⏸ Pausar";
      if (stopAt && Date.now() - at > 600 && (cur >= stopAt || st === 0)) { p.pauseVideo(); stopAt = 0; if (onStop) { var f = onStop; onStop = null; f(); } }
      ticks.forEach(function (fn) { fn(cur, st); });
    }, 200);
    return {
      play: function (t, end, rate, cb) { held = false; ready.then(function () { try { p.setPlaybackRate(rate || 1); } catch (e) {} p.seekTo(Math.max(0, t), true); p.playVideo(); at = Date.now(); stopAt = end; onStop = cb || null; }); },
      free: function (t) { held = false; ready.then(function () { try { p.setPlaybackRate(1); } catch (e) {} if (t != null) p.seekTo(t, true); stopAt = 0; onStop = null; p.playVideo(); }); },
      pause: function () { held = false; ready.then(function () { p.pauseVideo(); stopAt = 0; onStop = null; }); },
      jump: function (d, lo, hi) { ready.then(function () { var t = Math.min(hi - 0.5, Math.max(lo, p.getCurrentTime() + d)); p.seekTo(t, true); p.playVideo(); }); },
      state: function () { return p && p.getPlayerState ? p.getPlayerState() : -1; },
      onTick: function (fn) { ticks.push(fn); },
      stopEnd: function (end, cb) { stopAt = end; at = Date.now(); onStop = cb; }
    };
  }
  function stCenaParts(u, v, next, ctx, V, X) {
    var w = frame("cena", u, v, ctx, next), T0 = X.start, T1 = X.end, ear = evoOf("ouvido");
    var holder = el("div"), cover = el("div", { cls: "yt-cover2" }, el("span", { cls: "cv-ic", text: "🎧" }), el("span", { text: "Tela coberta · só ouvido" }));
    var vbox = el("div", { cls: "yt yt-wrap2" }, holder, cover);
    var Y = ytScene(holder, V.youtubeId, T0, T1, function () {
      w.append(el("div", { cls: "sheet" }, el("b", { text: "😕 O vídeo não abriu aqui." }), el("p", { cls: "small", text: "Pode ser bloqueador de anúncio, internet instável ou rede que bloqueia o YouTube. Sem problema: pule esta cena e siga o treino." }),
        el("button", { cls: "btn big", type: "button", text: "Pular esta cena →", onclick: function () { next(); } })));
    });
    var head = el("div", { cls: "card" }, evoBadge("ouvido"), el("span", { cls: "eyebrow", text: (function (t) { return /^[A-Za-zÀ-ú0-9]/.test(t) ? "🎬 " + t : t; })(String(V.source || "Vídeo real").replace(/\s*\(.*?\)\s*/g, " ").trim()) }),
      el("p", { html: rich(X.intro || V.context || "") }),
      el("ol", { cls: "pt-steps" }, el("li", { html: "🎧 <b>Ouça tudo</b>" }), el("li", { html: ear.phase >= 4 ? "🍎 <b>Sem partes</b>" : "✂️ <b>Em partes</b>" }), el("li", { html: "🎧 <b>Tudo de novo</b>" }), el("li", { html: "👀 <b>Com imagem</b>" })), vbox);
    var stage = el("div", { cls: "stage" });
    w.append(head, stage);
    var barFn = null; Y.onTick(function (cur, st) { if (barFn) barFn(cur, st); });
    function setStage() { stage.replaceChildren(); for (var i = 0; i < arguments.length; i++) if (arguments[i]) stage.append(arguments[i]); }
    // partes conforme a fase do ouvido: 🌱 5 · 🌿 4 · 🌳 3 · 🍎 cena inteira
    var PP = X.parts.map(function (x) { return { t: x.t, end: x.end, en: x.en, pt: x.pt, qs: (x.comp || []).map(function (c) { return { comp: c.q, options: c.options, en: c.en, said: c.said, said_pt: c.said_pt, answer: c.answer || 0 }; }).concat([{ prompt: x.prompt, options: x.options, answer: x.answer || 0, hard: x.hard }]) }; });
    var NP = [5, 5, 4, 3, 0][ear.phase] || 5;
    if (NP && NP < PP.length) {
      var G = [], base = Math.floor(PP.length / NP), rem = PP.length % NP, at = 0;
      for (var gi = 0; gi < NP; gi++) { var sz = base + (gi < rem ? 1 : 0), grp = PP.slice(at, at + sz); at += sz; G.push({ t: grp[0].t, end: grp[grp.length - 1].end, en: grp.map(function (y) { return y.en; }).join(" "), pt: grp.map(function (y) { return y.pt; }).join(" "), qs: [].concat.apply([], grp.map(function (y) { return y.qs; })) }); }
      PP = G;
    }
    PP.forEach(function (x, pi) { x.qs.forEach(function (q, qn) { q.order = q.options.map(function (_, k) { return k; }); var seed = Math.round(x.t * 13) + 5 + qn * 17; for (var k = q.order.length - 1; k > 0; k--) { seed = (seed * 9301 + 49297) % 233280; var jj = Math.floor(seed / 233280 * (k + 1)), tmp = q.order[k]; q.order[k] = q.order[jj]; q.order[jj] = tmp; } }); });
    var HARDS = [].concat.apply([], PP.map(function (x) { return x.qs.filter(function (q) { return q.hard; }); }));
    var CK = V.youtubeId + "@" + T0 + "|" + NP, result = [], firstTry = 0;
    if (S.cenaRes && S.cenaRes.k === CK && startAt(ctx) > 0) { result = S.cenaRes.r.slice(); firstTry = result.filter(Boolean).length; }
    function keepRes() { S.cenaRes = { k: CK, r: result.slice() }; persist(); }
    // passo 1: ouvir tudo
    function step1() {
      var mb = miniBar(), heard = false;
      var go = el("button", { cls: "btn pt-big pulse", type: "button", text: "▶ Ouvir tudo", onclick: function () {
        go.classList.remove("pulse"); go.textContent = "↺ Ouvir de novo";
        Y.play(T0, T1 + 0.3, 1, function () { if (!heard) { heard = true; nx.hidden = false; nx.classList.add("pulse"); } });
      } });
      var nx = el("button", { cls: "btn", type: "button", hidden: true, text: NP ? "Agora em partes →" : "Ouvir tudo de novo →", onclick: function () { Y.pause(); if (NP) part(0); else again(); } });
      barFn = function (cur, st) { if (!go.classList.contains("pulse") && cur >= T0 - 0.5) mb.set(T0, T1, cur, st === 1, "a cena inteira"); };
      setStage(el("div", { cls: "card" }, el("b", { text: "🎧 Passo 1 · Ouça tudo, tela coberta" }), el("p", { cls: "small", text: "Não entendeu quase nada? Normal! Depois vem em partes." }), go, mb.box, nx));
    }
    // passo 2: cada parte → perguntas em português → pedaço difícil → só então texto + Raio-X
    function part(pi) {
      mark("cena", u, v, ctx, pi + 1, 0, PP.length + 1);
      var x = PP[pi], qi = 0, tries = 0, qTries = 0, heard = false, mb = miniBar();
      var dots = el("div", { cls: "pt-dots" }); PP.forEach(function (_, k) { dots.append(el("i", { cls: k < pi ? (result[k] ? "ok" : "meh") : k === pi ? "cur" : "", text: String(k + 1) })); });
      var msg = el("p", { cls: "small pt-msg", text: x.qs.length > 3 ? "👀 Esta parte é maior: tem " + x.qs.length + " perguntas. Toque no botão amarelo e ouça a parte inteira, sem pausa." : "👀 Leia a pergunta e toque no botão amarelo pra ouvir." }), qBox = el("div", { cls: "pt-q" }), after = el("div", { cls: "pt-after", hidden: true });
      var pb = el("button", { cls: "btn pt-big pulse", type: "button", text: "▶ Ouvir a parte " + (pi + 1), onclick: function () { pb.classList.remove("pulse"); playPart(1); } });
      function playPart(rate) { pb.classList.remove("pulse"); Y.play(Math.max(T0, x.t - 0.3), Math.min(T1 + 0.5, x.end + 0.8), rate, function () { if (!heard) { heard = true; [].forEach.call(qBox.querySelectorAll(".pt-opt.wait"), function (o) { o.classList.remove("wait"); }); msg.textContent = "Escolha a resposta. Pode ouvir de novo quantas vezes quiser."; } }); }
      barFn = function (cur, st) { if (!pb.classList.contains("pulse") && cur >= x.t - 0.5 && cur <= x.end + 1) mb.set(x.t, x.end, cur, st === 1, "parte " + (pi + 1)); };
      function renderQ() {
        var q = x.qs[qi]; qTries = 0; var more = x.qs.length > 1 ? " <span class=\"q-count\">" + (qi + 1) + "/" + x.qs.length + "</span>" : "";
        if (q.comp) qBox.replaceChildren(el("p", { cls: "pt-qt", html: "🧠 <b>O que aconteceu?</b>" + more }), el("p", { cls: "comp-q", text: "❓ " + q.comp }));
        else if (q.prompt) qBox.replaceChildren(el("p", { cls: "pt-qt", html: "👂 <b>Complete o pedaço difícil</b>" + more }), el("p", { cls: "pt-gap", html: esc(clean(q.prompt)).replace("___", "<span class=\"gapline\">______</span>") }));
        else qBox.replaceChildren(el("p", { cls: "pt-qt", html: "👂 <b>Qual destas frases você ouviu?</b>" + more }));
        q.order.forEach(function (k) {
          var b = el("button", { cls: "pt-opt" + (heard ? "" : " wait"), type: "button" }, q.options[k], q.en && q.en[k] ? el("span", { cls: "opt-en", text: q.en[k] }) : null);
          b.addEventListener("click", function () {
            if (b.disabled) return;
            if (b.classList.contains("wait")) { msg.textContent = "🎧 Primeiro ouça a parte " + (pi + 1) + " no botão amarelo."; pb.classList.add("pulse"); return; }
            tries++; qTries++;
            if (k === q.answer) {
              b.classList.add("ok"); fb(qTries === 1); [].forEach.call(qBox.querySelectorAll(".pt-opt"), function (o) { o.disabled = true; });
              if (q.hard && qTries > 1) addError({ uid: u.id, kind: "cena", en: "🎬 " + q.hard.text + " · " + V.youtubeId + "@" + q.hard.t, yt: V.youtubeId, t: q.hard.t, end: q.hard.end, prompt: clean(q.prompt), options: q.options, answer: q.answer, som: q.hard.som, porque: q.hard.porque, tipo: tipoOf(q.hard.text, q.options), level: LVL });
              if (q.said) { var sb = el("p", { cls: "said-box" }, "✅ Isso! 🗣️ No áudio: ", el("i", { text: "“" + q.said + "”" }), q.said_pt ? el("small", { text: q.said_pt }) : null); qBox.append(sb); }
              if (qi + 1 < x.qs.length) {
                var nq = x.qs[qi + 1];
                if (!q.said) { msg.textContent = nq.comp ? "✅ Isso! Próxima pergunta. Pode ouvir de novo." : "✅ Isso! Agora o pedaço mais difícil desta parte."; setTimeout(function () { qi++; renderQ(); }, 700); return; }
                qBox.append(el("button", { cls: "btn mini", type: "button", text: nq.comp ? "Próxima pergunta →" : "Agora o pedaço difícil →", onclick: function () { qi++; renderQ(); } })); msg.textContent = ""; return;
              }
              var ok1 = tries === x.qs.length; result[pi] = ok1; if (ok1) firstTry++; keepRes();
              msg.textContent = ok1 ? "✅ Isso! Você ouviu certinho. Agora ouça de novo lendo o texto." : "✅ Agora sim! Ouça de novo lendo o texto pra fixar.";
              showAfter();
            } else { b.classList.add("bad"); b.disabled = true; fb(false); msg.textContent = "❌ Não foi essa. Ouça de novo, pode usar o 🐢, e escolha outra."; }
          });
          qBox.append(b);
        });
      }
      function showAfter() {
        after.hidden = false; after.replaceChildren();
        x.qs.forEach(function (q) { if (q.hard) after.append(raioX(q.hard)); });
        var spans = [], txt = el("p", { cls: "wp-txt" });
        clean(x.en).split(/\s+/).filter(Boolean).forEach(function (t, i) { if (i) txt.append(" "); var s = el("span", { cls: "wp-w", text: t }); spans.push(s); txt.append(s); });
        var pt = el("p", { cls: "pt-pt", hidden: true, text: (x.pt || "") });
        var kara = el("button", { cls: "btn mini", type: "button", text: "▶ Ouvir lendo", onclick: function () {
          var tot = spans.reduce(function (a, s) { return a + s.textContent.length + 1; }, 0);
          Y.play(Math.max(T0, x.t - 0.3), Math.min(T1 + 0.5, x.end + 0.8), 1, function () { spans.forEach(function (s) { s.classList.remove("lit"); }); barFn = null; });
          barFn = function (cur) { var f = (cur - x.t) / Math.max(1, x.end - x.t), acc = 0; spans.forEach(function (s) { var w2 = (s.textContent.length + 1) / tot; s.classList.toggle("lit", f >= acc && f < acc + w2); acc += w2; }); };
        } });
        after.append(el("div", { cls: "wp" }, el("b", { text: "📖 Leia ouvindo, pra aprender o som" }), el("p", { cls: "small", text: "Repare no que soa diferente do que está escrito." }), txt, el("div", { cls: "pt-play" }, kara, x.pt ? el("button", { cls: "soft", type: "button", text: "Tradução", onclick: function () { pt.hidden = !pt.hidden; } }) : null), pt),
          el("button", { cls: "btn", type: "button", text: pi + 1 < PP.length ? "Próxima parte · " + (pi + 2) + " de " + PP.length + " →" : "✅ Terminei as partes", onclick: function () { Y.pause(); if (pi + 1 < PP.length) part(pi + 1); else partsDone(); } }));
      }
      setStage(el("div", { cls: "card pt-box" }, el("div", { cls: "pt-head" }, el("b", { text: "✂️ Passo 2 · Parte " + (pi + 1) + " de " + PP.length }), dots),
        el("div", { cls: "pt-play" }, pb, el("button", { cls: "soft", type: "button", text: "🐢 Devagar", onclick: function () { playPart(0.75); } })), mb.box, msg, qBox, after));
      renderQ(); window.scrollTo(0, 0);
    }
    function playBit(h, rate) { barFn = null; Y.play(Math.max(T0, h.t - 0.3), h.end + 0.5, rate); }
    function raioX(h) {
      var l1 = el("p", null, "Escrito: ", el("b", { text: h.text }), el("br"), "Soa como: ", el("b", { cls: "rx-som", text: "“" + h.som + "”" }));
      return el("div", { cls: "rx-item" }, el("b", { text: "🔍 Raio-X do som" }), l1, el("p", { cls: "small", text: "💡 " + h.porque }),
        el("div", { cls: "pt-play" }, el("button", { cls: "btn mini", type: "button", text: "🔁 Ouvir só esse pedaço", onclick: function () { playBit(h, 1); } }), el("button", { cls: "soft", type: "button", text: "🐢 Devagar", onclick: function () { playBit(h, 0.75); } })));
    }
    function partsDone() {
      var n = PP.length, rate = firstTry / Math.max(1, n);
      evoResult = evoCheer("ouvido", rate, dkey("cena", u.id, v));
      setStage(el("div", { cls: "card" }, el("p", { cls: "pt-done", html: "✅ <b>Partes feitas!</b> De primeira: " + firstTry + " de " + n + "." }), evoResult,
        el("button", { cls: "btn", type: "button", text: "Ouvir tudo de novo →", onclick: again })));
    }
    var evoResult = null, provaN = 0, provaGot = 0;
    // passo 3: tudo de novo (⏪ 5 s · ⏸ · ⏩ 5 s) → 🎯 prova do ouvido rapidinha
    function again() {
      mark("cena", u, v, ctx, 99, 0);
      var mb = miniBar(), heard = false, pauseB, started = false;
      function onlyAfter(fn) { return function () { if (!started) { notice("🎧 Primeiro toque em ▶ Ouvir tudo de novo."); go.classList.add("pulse"); return; } fn(); }; }
      var go = el("button", { cls: "btn pt-big pulse", type: "button", text: "▶ Ouvir tudo de novo", onclick: function () { started = true; go.classList.remove("pulse"); Y.play(T0, T1 + 0.3, 1, function () { if (!heard) { heard = true; prova.hidden = false; } }); pauseB.textContent = "⏸ Pausar"; } });
      pauseB = el("button", { cls: "soft", type: "button", text: "⏸ Pausar", onclick: onlyAfter(function () { if (Y.state() === 1) { Y.pause(); pauseB.textContent = "▶ Continuar"; } else { Y.free(); Y.stopEnd(T1 + 0.3, function () { if (!heard) { heard = true; prova.hidden = false; } }); pauseB.textContent = "⏸ Pausar"; } }) });
      barFn = function (cur, st) { if (started && cur >= T0 - 0.5) mb.set(T0, T1, cur, st === 1, "a cena inteira"); };
      var prova = provaBox(); prova.hidden = true;
      setStage(el("div", { cls: "card" }, el("b", { text: "🎧 Passo 3 · Tudo de novo" }), el("p", { cls: "small", html: "Tente a 1ª vez <b>sem pausar</b>. Depois, se precisar, volte." }),
        NP ? null : evoBadge("ouvido"), go, mb.box,
        el("div", { cls: "pt-play ag-ctl" }, el("button", { cls: "soft", type: "button", text: "⏪ 5 s", onclick: onlyAfter(function () { Y.jump(-5, T0, T1); Y.stopEnd(T1 + 0.3, function () { if (!heard) { heard = true; prova.hidden = false; } }); }) }), pauseB, el("button", { cls: "soft", type: "button", text: "⏩ 5 s", onclick: onlyAfter(function () { Y.jump(5, T0, T1); Y.stopEnd(T1 + 0.3, function () { if (!heard) { heard = true; prova.hidden = false; } }); }) }))),
        prova);
      window.scrollTo(0, 0);
    }
    function provaBox() {
      var list = HARDS.slice().sort(function (a, b) { return (a.hard.t * 7) % 5 - (b.hard.t * 7) % 5; }).slice(0, 3), got = 0, done = 0;
      provaN = list.length; provaGot = 0;
      var box = el("div", { cls: "card prova" }, el("b", { text: "🎯 Prova do ouvido · rapidinha" }), el("p", { cls: "small", text: "3 pedaços difíceis, fora de ordem. Ouça e toque no que você ouviu." }));
      var fin = el("button", { cls: "btn", type: "button", hidden: true, text: "✅ Concluir a cena", onclick: finish }), sum = el("p", { cls: "small", hidden: true });
      list.forEach(function (it, k) {
        var m = el("p", { cls: "small", hidden: true }), tr = 0, row = el("div", { cls: "pt-q" });
        var order = it.options.map(function (_, i) { return i; }).sort(function (a, b) { return ((a + k * 2) % 3) - ((b + k * 2) % 3); });
        order.forEach(function (i) {
          var bt = el("button", { cls: "pt-opt", type: "button", text: it.options[i] });
          bt.addEventListener("click", function () {
            if (bt.disabled) return; tr++;
            if (i === it.answer) {
              bt.classList.add("ok"); [].forEach.call(row.querySelectorAll(".pt-opt"), function (o) { o.disabled = true; }); fb(tr === 1); done++; if (tr === 1) { got++; provaGot = got; }
              if (tr > 1) addError({ uid: u.id, kind: "cena", en: "🎬 " + it.hard.text + " · " + V.youtubeId + "@" + it.hard.t, yt: V.youtubeId, t: it.hard.t, end: it.hard.end, prompt: clean(it.prompt), options: it.options, answer: it.answer, som: it.hard.som, porque: it.hard.porque, tipo: tipoOf(it.hard.text, it.options), level: LVL });
              m.hidden = false; m.textContent = (tr === 1 ? "✅ Pegou de primeira! " : "✅ Isso. ") + "Soa “" + it.hard.som + "”";
              if (done === list.length) { sum.hidden = false; sum.textContent = got === list.length ? "🎉 Seu ouvido pegou os 3 de primeira!" : "Seu ouvido pegou " + got + " de " + list.length + " de primeira. São os pedaços mais difíceis: normal."; fin.hidden = false; }
            } else { bt.classList.add("bad"); bt.disabled = true; fb(false); m.hidden = false; m.textContent = "❌ Não foi essa. Ouça de novo."; }
          });
          row.append(bt);
        });
        box.append(el("div", { cls: "prova-it" }, el("div", { cls: "pt-play" }, el("b", { text: (k + 1) + "." }), el("button", { cls: "btn mini", type: "button", text: "🔊 Ouvir", onclick: function () { playBit(it.hard, 1); } }), el("button", { cls: "soft", type: "button", "aria-label": "Ouvir devagar", text: "🐢", onclick: function () { playBit(it.hard, 0.75); } })), row, m));
      });
      if (!list.length) fin.hidden = false;
      box.append(sum, fin);
      return box;
    }
    // passo 4: nota + assistir COM imagem, com o texto e o vocabulário
    function finish() {
      Y.pause();
      var n = PP.length, okN = result.filter(Boolean).length, pct = NP ? okN / Math.max(1, n) : provaN ? provaGot / provaN : 1;
      S.cenaRes = null;
      if (!NP) evoResult = evoCheer("ouvido", pct, dkey("cena", u.id, v));
      record("cena", u.id, v, pct); streakToast(w); S.cenasFeitas = (S.cenasFeitas || 0) + 1; persist();
      CUR = null; var pbtn = w.querySelector(".top .pause"); if (pbtn) pbtn.remove();
      head.querySelector(".pt-steps") && head.querySelector(".pt-steps").remove();
      var tl = el("div", { cls: "tr-lines" }), rows = [];
      tl.append(ckLegend());
      (X.transcript || []).forEach(function (L) { var r = el("div", { cls: "tr-line", role: "button", tabindex: "0", html: rich(L.en), onclick: function () { Y.free(L.t); }, onkeydown: function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); Y.free(L.t); } } }); rows.push({ t: L.t, el: r }); tl.append(r); });
      barFn = function (cur, st) { var c = -1; rows.forEach(function (x, i) { if (cur >= x.t - 0.3) c = i; }); rows.forEach(function (x, i) { x.el.classList.toggle("now", i === c && st === 1); }); if (cur >= T1 + 0.3 && st === 1) Y.pause(); };
      var vg = el("div", { cls: "vocab-list" });
      (X.vocab || []).forEach(function (it) { vg.append(el("div", { cls: "vrow" + (it[2] === "chunk" ? " chunk" : it[2] === "nativo" ? " nat" : "") }, el("button", { cls: "ear", type: "button", "aria-label": "Ouvir " + it[0], text: "🔊", onclick: function () { try { var q = new SpeechSynthesisUtterance(it[0]); q.lang = "en-US"; q.rate = 0.85; speechSynthesis.cancel(); speechSynthesis.speak(q); } catch (e) {} } }), el("b", { text: it[0] }), el("span", { text: it[1] }))); });
      var hasC = (X.vocab || []).some(function (it) { return it[2] === "chunk"; }), hasN = (X.vocab || []).some(function (it) { return it[2] === "nativo"; });
      var legend = hasC || hasN ? el("p", { cls: "tr-legend" }, hasC ? el("span", null, el("mark", { text: "amarelo" }), " o que você está treinando") : null, hasN ? el("span", null, el("mark", { cls: "nat", text: "azul" }), " o nativo usa muito") : null) : null;
      var good = pct >= 0.7;
      setStage(el("div", { cls: "sheet " + (good ? "good" : "bad") }, el("b", { text: (good ? "Mandou bem! " : "Treino é isso: ") + Math.round(pct * 100) + "%" }), el("p", { text: NP ? "Partes de primeira: " + okN + " de " + n + "." + (okN < n ? " O que escapou foi pra 🧠 Meus erros." : "") : "🍎 Cena inteira, sem partes. Prova do ouvido: " + provaGot + " de " + provaN + "." })),
        evoResult,
        el("button", { cls: "btn big", type: "button", text: "👀 Agora assista COM imagem", onclick: function () { cover.remove(); Y.free(T0); window.scrollTo(0, 0); } }),
        rows.length ? el("div", { cls: "card" }, el("span", { cls: "eyebrow", text: "📜 O que foi falado" }), el("p", { cls: "small", text: "Toque numa frase pra voltar nela." }), legend, tl) : null,
        vg.children.length ? el("div", { cls: "card" }, el("span", { cls: "eyebrow", text: "📒 Do vídeo pra sua fala" }), legend ? legend.cloneNode(true) : null, vg) : null,
        el("button", { cls: "btn big", type: "button", text: next === home ? "Voltar pro início" : "Próximo →", onclick: function () { Y.pause(); next(); } }));
      window.scrollTo(0, 0);
    }
    var s0 = startAt(ctx);
    if (s0 >= 99) again(); else if (s0 > 0 && s0 <= PP.length) part(s0 - 1); else step1();
  }

  // ---------- 🎯 erro de cena: aquecimento no MESMO trecho + prova com trecho NOVO de outro vídeo ----------
  function tipoOf(text, options) {
    var all = (text + " " + (options || []).join(" ")).toLowerCase();
    if (/\d|\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|teen|ty)\b/.test(all)) return "numeros";
    if (/n't|\bnot\b|\bnever\b/.test(all)) return "negativa";
    if (/(ing|ed|'ll|'d|'s|'re|'ve)\b/.test(all)) return "final";
    return "parecidas";
  }
  function freshBit(e, off) {
    // outro vídeo, mesmo tipo de som se der; nunca o mesmo vídeo do erro
    var c = [], lv = LVL;
    Object.keys(PARTS || {}).forEach(function (k) {
      var X = PARTS[k]; if (!X || k.split("@")[0] === e.yt || (X.level && X.level.toLowerCase() !== lv)) return;
      (X.parts || []).forEach(function (p) { if (p.hard && p.options) c.push({ yt: k.split("@")[0], t: p.hard.t, end: p.hard.end, prompt: clean(p.prompt), options: p.options, answer: p.answer || 0, som: p.hard.som, porque: p.hard.porque, tipo: tipoOf(p.hard.text, p.options) }); });
    });
    var same = c.filter(function (x) { return x.tipo === e.tipo; });
    var pool = same.length ? same : c; if (!pool.length) return null;
    var d = new Date(), seed = d.getDate() * 31 + (e.t | 0);
    return pool.length > (off || 0) ? pool[(seed + (off || 0) * 7) % pool.length] : null;
  }
  function bitCard(B, title, onAns) {
    var holder = el("div"), cover = el("div", { cls: "yt-cover2" }, el("span", { cls: "cv-ic", text: "🎧" }), el("span", { text: "Tela coberta" }));
    var Y = ytScene(holder, B.yt, B.t, B.end, function () { heard = true; [].forEach.call(row.querySelectorAll(".pt-opt.wait"), function (o) { o.classList.remove("wait"); }); m.textContent = "😕 O vídeo não abriu aqui (bloqueador de anúncio ou internet). Responda pelo que você lembra, ou siga em frente."; }), heard = false, done = false, tries = 0;
    var row = el("div", { cls: "pt-q" }), m = el("p", { cls: "small" });
    function play(r) { Y.play(Math.max(0, B.t - 0.3), B.end + 0.5, r, function () { heard = true; [].forEach.call(row.querySelectorAll(".pt-opt.wait"), function (o) { o.classList.remove("wait"); }); }); }
    shuffle(B.options.map(function (_, i) { return i; })).forEach(function (i) {
      var bt = el("button", { cls: "pt-opt wait", type: "button", text: B.options[i] });
      bt.addEventListener("click", function () {
        if (bt.disabled || done) return; if (!heard) { m.textContent = "🎧 Ouça primeiro."; return; } tries++;
        if (i === B.answer) { done = true; bt.classList.add("ok"); fb(tries === 1); [].forEach.call(row.querySelectorAll(".pt-opt"), function (o) { o.disabled = true; }); m.textContent = (tries === 1 ? "✅ De primeira! " : "✅ Isso. ") + (B.som ? "Soa “" + B.som + "”" : ""); onAns(tries === 1); }
        else { bt.classList.add("bad"); bt.disabled = true; fb(false); m.textContent = "❌ Não foi essa. Ouça de novo."; }
      });
      row.append(bt);
    });
    return el("div", { cls: "card" }, el("span", { cls: "eyebrow", text: title }), el("div", { cls: "yt yt-wrap2 small-yt" }, holder, cover),
      B.prompt ? el("p", { cls: "pt-gap", html: esc(B.prompt).replace("___", "<span class=\"gapline\">______</span>") }) : null,
      el("div", { cls: "pt-play" }, el("button", { cls: "btn mini", type: "button", text: "🔊 Ouvir", onclick: function () { play(1); } }), el("button", { cls: "soft", type: "button", text: "🐢 Devagar", onclick: function () { play(0.75); } })), row, m);
  }

  // ---------- 📘 Corrigir meus erros: a regra por trás do erro, com fofoca nova ----------
  var REF = null;
  function loadRef() { if (REF) return Promise.resolve(REF); return j("/academia/reforco/index.json?v=" + (window.__v || 1)).then(function (x) { REF = x || []; return REF; }, function () { REF = []; return REF; }); }
  function ruleFor(e) {
    if (!REF || !e.said) return null;
    for (var i = 0; i < REF.length; i++) { var R = REF[i]; try { if (new RegExp(R.match.said, "i").test(e.said) && new RegExp(R.match.right, "i").test(e.en) && !new RegExp(R.match.said, "i").test(e.en)) return R; } catch (x) {} }
    return null;
  }
  function rulesNow() { var seen = {}, out = []; myErrors().forEach(function (e) { var R = ruleFor(e); if (R && !seen[R.id] && (LVL !== "a1" || R.level === "A1")) { seen[R.id] = 1; out.push(R); } }); return out; }
  function runRule(R0, back) {
    var w = screen(), RA = "/academia/reforco/audio/";
    w.append(el("header", { cls: "top" }, el("button", { cls: "back", type: "button", text: "‹ Sair", onclick: back })));
    j("/academia/reforco/" + R0.id + ".json?v=" + (window.__v || 1)).then(function (R) {
      var mine = myErrors().filter(function (e) { var x = ruleFor(e); return x && x.id === R.id; }).slice(0, 3);
      var steps2 = ["regra", "fofoca", "ouvir", "falar"].concat(mine.length ? ["meu"] : []), si = 0, ok = 0, n = 0, mineOk = [];
      function head2() { return el("div", { cls: "thead" }, el("span", { cls: "eyebrow", text: "📘 Corrigir meus erros · " + R.title }), steps(si + 1, steps2.length, "Parte")); }
      function show() {
        while (w.children.length > 1) w.lastChild.remove(); stopAll(); window.scrollTo(0, 0);
        var s = steps2[si], nxt = el("button", { cls: "btn", type: "button", text: "Continuar →", onclick: function () { si++; if (si < steps2.length) show(); else end(); } });
        w.append(head2());
        if (s === "regra") {
          var ex = el("div", { cls: "vocab-list" });
          (R.exemplos || []).forEach(function (x) { ex.append(el("div", { cls: "vrow" }, el("button", { cls: "ear", type: "button", text: "🔊", onclick: function () { playUrl(RA + x.audio); } }), el("b", { text: x.en }), el("span", { text: x.pt }))); });
          w.append(el("div", { cls: "card" }, el("h2", { text: "Você errou isso: vamos acertar de vez" }), el("p", { html: R.regra }), ex), nxt);
        } else if (s === "fofoca") {
          var heard = false, txt = el("p", { cls: "lac-line", hidden: true, html: esc(R.fofoca.gaps).replace(/\[\[([^\]]+)\]\]/g, "<mark>$1</mark>") });
          w.append(el("div", { cls: "card" }, el("h2", { text: "🕵️ Fofoca nova" }), el("p", { cls: "small", text: "Ouça e repare na regra. O texto aparece depois." }),
            player(RA + R.fofoca.audio, { onEnd: function () { if (!heard) { heard = true; txt.hidden = false; } } }), txt), nxt);
        } else if (s === "ouvir") {
          var k = 0, box = el("div");
          (function one() {
            box.replaceChildren(); var it = R.ouvir[k]; if (!it) { box.append(nxt); return; }
            var dn = false, tr = 0, op = el("div", { cls: "opts locked" }), m = el("p", { cls: "small" });
            shuffle(it.options.map(function (_, i) { return i; })).forEach(function (i) { op.append(el("button", { cls: "opt", type: "button", text: it.options[i], onclick: function (ev) {
              if (dn) return; if (op.classList.contains("locked")) { m.textContent = "🎧 Primeiro ouça."; return; } tr++; var g = i === it.answer;
              if (!g) { ev.currentTarget.classList.add("bad"); ev.currentTarget.disabled = true; fb(false); m.textContent = "❌ Não foi essa. Ouça de novo e tente outra."; return; }
              dn = true; n++; if (tr === 1) ok++; fb(tr === 1); ev.currentTarget.classList.add("ok"); m.textContent = tr === 1 ? "✅ De primeira!" : "✅ Isso!";
              box.append(el("button", { cls: "btn", type: "button", text: "Próxima →", onclick: function () { k++; one(); } })); } })); });
            box.append(el("div", { cls: "card" }, el("b", { text: "👂 Qual você ouviu? " + (k + 1) + " de " + R.ouvir.length }), ears(RA + it.audio, function () { op.classList.remove("locked"); }, { fast: false }), op, m));
          })();
          w.append(box);
        } else if (s === "falar") {
          var k2 = 0, box2 = el("div");
          (function one2() {
            box2.replaceChildren(); var it = R.falar[k2]; if (!it) { box2.append(nxt); return; }
            var res = el("div", { cls: "rt-res" }), nx = el("button", { cls: "btn", type: "button", text: "Próxima →", disabled: true, onclick: function () { k2++; one2(); } });
            var sent = false, t = talk(function (said, manual) { var o = manual ? 0.8 : overlap(it.en, said); if (!sent) { sent = true; n++; if (o >= 0.7) ok++; } fb(o >= 0.7); res.replaceChildren(el("b", { text: (o >= 0.7 ? "✅ " : "🔴 ") + Math.round(o * 100) + "%" }), el("p", { cls: "model" }, el("button", { cls: "ear", type: "button", "aria-label": "Ouvir o modelo", text: "🔊", onclick: function () { playUrl(RA + it.audio); } }), manual ? el("span", { text: it.en }) : paintModel(it.en, said).node)); nx.disabled = false; });
            var peek = el("button", { cls: "linkish", type: "button", text: "👀 Ver a resposta", onclick: function () { peek.replaceWith(el("p", { cls: "model", text: it.en })); } });
            box2.append(el("div", { cls: "card rt" }, el("b", { text: "🗣️ Fale em inglês · " + (k2 + 1) + " de " + R.falar.length }), el("p", { cls: "rt-pt", text: it.pt }), t, peek, res, nx));
          })();
          w.append(box2);
        }
        if (s === "meu") {
          // 🎯 o SEU erro, agora do jeito certo: só isso conta como acerto do dia
          var k3 = 0, box3 = el("div");
          (function one3() {
            box3.replaceChildren(); var e = mine[k3]; if (!e) { box3.append(nxt); return; }
            var res3 = el("div", { cls: "rt-res" }), nx3 = el("button", { cls: "btn", type: "button", text: "Próxima →", disabled: true, onclick: function () { k3++; one3(); } });
            var t3 = talk(function (said, manual) { var o = manual ? 0.8 : overlap(e.en, said); fb(o >= 0.7); if (o >= 0.7 && mineOk.indexOf(e.en) < 0) mineOk.push(e.en); res3.replaceChildren(el("b", { text: (o >= 0.7 ? "✅ " : "🔴 ") + Math.round(o * 100) + "%" }), el("p", { cls: "model" }, manual ? e.en : paintModel(e.en, said).node)); nx3.disabled = false; });
            box3.append(el("div", { cls: "card rt" }, el("b", { text: "🎯 O seu erro, agora do jeito certo · " + (k3 + 1) + " de " + mine.length }),
              el("p", { cls: "small" }, "Você falou: ", el("s", { text: e.said || "" })), e.pt ? el("p", { cls: "rt-pt", text: e.pt }) : null, t3, res3, nx3));
          })();
          w.append(box3);
        }
      }
      function end() {
        while (w.children.length > 1) w.lastChild.remove();
        var pct = ok / Math.max(1, n);
        mineOk.forEach(function (en) { fixError(en); });
        markDay(); persist();
        w.append(el("div", { cls: "sheet " + (pct >= 0.8 ? "good" : "bad") }, el("b", { text: Math.round(pct * 100) + "% · " + R.title }), el("p", { text: (pct >= 0.8 ? "Regra no bolso! " : "Quase! Faça de novo outro dia pra fixar. ") + (mine.length ? "Dos seus erros, " + mineOk.length + " de " + mine.length + " saíram certos hoje." : "") })),
          el("button", { cls: "btn big", type: "button", text: "Voltar", onclick: back }));
      }
      show();
    }, netError);
  }

  // ---------- 📊 Progresso: status, níveis, medalhas, trilha ----------
  function hist() { return S.hist || []; }
  function statusNow() {
    var h = hist().slice(-8), avg = h.length ? h.reduce(function (a, x) { return a + x.p; }, 0) / h.length : 0, last = S.days.length ? S.days[S.days.length - 1] : null;
    var gap = last ? Math.round((new Date(today()) - new Date(last)) / 864e5) : 99;
    var m = Math.round(avg * 100);
    if (!h.length) return { ic: "🌱", t: "Começando", why: "Você ainda não treinou.", how: "Faça o treino de hoje pra ganhar o seu status." };
    if (gap >= 3) return { ic: "⚠️", t: "Precisa acelerar", why: "Faz " + gap + " dias sem treinar.", how: "Um treino hoje já muda isso." };
    if (avg >= 0.85 && streak() >= 3) return { ic: "🔥", t: "Em chamas", why: "Média " + m + "% e ofensiva de " + streak() + " dias.", how: "Não para! Mantenha a ofensiva." };
    if (avg >= 0.7) return { ic: "🚀", t: "Decolando", why: "Média " + m + "%.", how: "Pra ficar 🔥 Em chamas: 85% e 3 dias seguidos." };
    if (avg >= 0.5) return { ic: "🙂", t: "No ritmo", why: "Média " + m + "%.", how: "Pra 🚀 Decolar: 70% nos próximos treinos." };
    return { ic: "⚠️", t: "Precisa acelerar", why: "Média " + m + "%.", how: "Refaça as variações e passe em 🧠 Meus erros." };
  }
  function medals() {
    var rt70 = Object.keys(S.done).filter(function (k) { return /^rt:/.test(k) && S.done[k].best >= 0.7; }).length;
    var evoMax = EVO_ORDER.reduce(function (a, k) { return Math.max(a, evoOf(k).phase); }, 1);
    return [
      { ic: "🔥", n: "Ofensiva de 7 dias", rule: "Treine 7 dias seguidos", cur: streak(), goal: 7 },
      { ic: "🎬", n: "Ouvido de cinema", rule: "Faça 10 cenas", cur: S.cenasFeitas || Object.keys(S.done).filter(function (k) { return /^cena:/.test(k); }).length, goal: 10 },
      { ic: "⚡", n: "Resposta rápida", rule: "10 Real Times com 70% ou mais", cur: rt70, goal: 10 },
      { ic: "🎯", n: "Caçador de erros", rule: "Corrija 20 erros", cur: S.fixed || 0, goal: 20 },
      { ic: "🌳", n: "Primeira Árvore", rule: "Chegue em 🌳 Árvore em qualquer habilidade", cur: evoMax >= 3 ? 1 : 0, goal: 1 },
      { ic: "🗺️", n: "Explorador", rule: "Domine 3 temas da trilha", cur: INDEX.filter(function (x) { return themeMastery(x.id) >= 2; }).length, goal: 3 },
      { ic: "⭐", n: "Fase perfeita", rule: "Tire 3 estrelas numa fase", cur: Math.min(1, S.perfect || 0), goal: 1 },
      { ic: "🔥", n: "Combo x5", rule: "Acerte 5 seguidas", cur: Math.min(5, S.comboBest || 0), goal: 5 },
      { ic: "🗣️", n: "Fala de ouro", rule: "Tire 100% num shadowing", cur: Math.min(1, S.ouro || 0), goal: 1 },
      { ic: "📅", n: "3 semanas", rule: "Treine 21 dias seguidos", cur: streak(), goal: 21 }
    ];
  }
  function xpCard() {
    var L = xpLevel(), lad = el("ul", { hidden: true });
    LEVELS.forEach(function (x, k) { lad.append(el("li", { cls: k + 1 === L.n ? "cur" : "", text: (k + 1) + " · " + x.name + " · " + x.xp + " XP" })); });
    return el("div", { cls: "card" }, el("span", { cls: "eyebrow", text: "⭐ Seu nível" }), el("b", { cls: "st-big", text: "Nível " + L.n + " · " + L.name }),
      el("div", { cls: "pbar2" }, el("i", { style: "width:" + Math.max(3, Math.round(L.f * 100)) + "%" })),
      el("p", { cls: "small", text: L.next ? "Faltam " + L.left + " XP pra " + L.next.name + "." : "🏆 Nível máximo!" }),
      el("button", { cls: "linkish", type: "button", text: "❓ O que é o nível?", onclick: function () { lad.hidden = !lad.hidden; } }),
      el("p", { cls: "small", text: "XP só sobe: cada exercício dá de 10 a 30 XP, e combo 🔥 dá mais." }), lad);
  }
  function levelsCard() {
    var box = el("div", { cls: "card lv-card" }, el("span", { cls: "eyebrow", text: "🎚️ Seus níveis" }), el("p", { cls: "small", text: "Toque numa habilidade pra ver a escada." }));
    EVO_ORDER.forEach(function (k) {
      var E = EVO[k], x = evoOf(k), f = EVO_N[x.phase - 1];
      var lad = el("div", { cls: "lv-ladder", hidden: true });
      E.fases.forEach(function (d, i) { lad.append(el("p", { cls: i + 1 === x.phase ? "cur" : i + 1 < x.phase ? "past" : "", text: EVO_N[i].icon + " " + EVO_N[i].name + ": " + d })); });
      lad.append(el("p", { cls: "small", text: "Pra evoluir: " + E.rule + " em 2 seguidas." + (x.streak ? " Falta 1! 🔥" : "") }));
      box.append(el("button", { cls: "lv-row", type: "button", onclick: function () { lad.hidden = !lad.hidden; } }, el("span", { cls: "lv-e", text: E.emoji }), el("b", { text: E.label }), el("span", { cls: "lv-ph", text: f.icon + " " + f.name }), el("span", { cls: "evo-dots", text: dotsOf(x.phase) })), lad);
    });
    return box;
  }
  function progressPage() {
    var w = screen(), st = statusNow();
    w.append(topBar(), el("h1", { text: "📊 Seu progresso" }),
      el("div", { cls: "card status-card" }, el("span", { cls: "eyebrow", text: "Seu status agora" }), el("b", { cls: "st-big", text: st.ic + " " + st.t }), el("p", { cls: "small", text: st.why }), el("p", { cls: "next-step", text: "👉 " + st.how }),
        el("details", { cls: "faq" }, el("summary", { text: "❓ Como funciona o status?" }), el("ul", null, el("li", { text: "🔥 Em chamas: média 85% e 3 dias seguidos" }), el("li", { text: "🚀 Decolando: média 70%" }), el("li", { text: "🙂 No ritmo: média 50%" }), el("li", { text: "⚠️ Precisa acelerar: abaixo de 50% ou 3 dias sem treinar" }), el("li", { cls: "small", text: "A média é dos seus últimos 8 exercícios. Sobe e desce conforme você treina." })))),
      rankingCard(), xpCard(), levelsCard(),
      el("button", { cls: "station keep-st", type: "button", onclick: function () { pushNav(); cadernoPage(); } }, el("span", { cls: "se", text: "📒" }), el("b", { text: "Meu caderno" }), el("span", { cls: "small", text: ((S.caderno || []).length ? (S.caderno || []).length + " expressões guardadas · revisar" : "as expressões de nativo que você guardou") })),
      accountCard());
    var MD = medals(), nGot = MD.filter(function (m) { return m.cur >= m.goal; }).length;
    var md = el("div", { cls: "card" }, el("span", { cls: "eyebrow", text: "🏅 Medalhas · " + nGot + " de " + MD.length }));
    MD.forEach(function (m) {
      var got = m.cur >= m.goal, f = Math.min(1, m.cur / m.goal);
      md.append(el("div", { cls: "medal" + (got ? " got" : "") }, el("span", { cls: "md-ic", text: got ? m.ic : "🔒" }),
        el("span", { cls: "md-tt" }, el("b", { text: m.n }), el("span", { cls: "small", text: got ? "Conquistada! ✅" : m.rule }), el("span", { cls: "md-bar" }, el("i", { style: "width:" + Math.round(f * 100) + "%" })), el("span", { cls: "small", text: Math.min(m.cur, m.goal) + " de " + m.goal }))));
    });
    var nDone = INDEX.filter(function (x) { return themeMastery(x.id) >= 2; }).length;
    w.append(md, el("div", { cls: "card" }, el("span", { cls: "eyebrow", text: "🗺️ Sua trajetória" }), el("b", { text: nDone + " de " + INDEX.length + " temas dominados no " + LVL.toUpperCase() }),
      el("div", { cls: "pbar2" }, el("i", { style: "width:" + Math.max(3, Math.round(nDone / INDEX.length * 100)) + "%" })),
      el("p", { cls: "small", text: "XP total: ⭐ " + S.xp + " · " + S.days.length + (S.days.length === 1 ? " dia" : " dias") + " de treino" })));
    w.append(menuBar("prog"));
  }
  // menu fixo embaixo (Thiago: "tudo que é navegação tem que GRITAR, aluno não procura")
  // 🎨 ícones de traço (ficam preenchidos na aba aberta)
  var ICO = {
    home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 10.4 12 3.6l8.5 6.8V19a1.5 1.5 0 0 1-1.5 1.5h-4.2v-6h-5.6v6H5A1.5 1.5 0 0 1 3.5 19z"/></svg>',
    prog: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="12" width="4" height="8.5" rx="1.2"/><rect x="10" y="4" width="4" height="16.5" rx="1.2"/><rect x="16.5" y="8.5" width="4" height="12" rx="1.2"/></svg>',
    erros: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.4-5.7"/><path d="M20.3 3.8v4.7h-4.7"/><path d="M12 8v4.3l2.8 1.7"/></svg>',
    nativo: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 15.5V12a8 8 0 0 1 16 0v3.5"/><rect x="3" y="14" width="5" height="7" rx="2"/><rect x="16" y="14" width="5" height="7" rx="2"/></svg>',
    voce: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4.2"/><path d="M4 21c1.4-4 4.4-6.2 8-6.2s6.6 2.2 8 6.2"/></svg>'
  };
  function menuBar(cur) {
    var nErr = myErrors().length;
    var items = [["home", "🏠", "Início", home], ["prog", "📊", "Progresso", progressPage], ["erros", "🧠", "Meus erros", function () { runErrors(); }], ["nativo", "🎧", "Inglês real", extrasPage], ["voce", "👤", "Você", youPage]];
    var bar = el("nav", { cls: "tabbar" });
    items.forEach(function (it) {
      bar.append(el("button", { cls: "tab" + (it[0] === cur ? " on" : ""), type: "button", onclick: function () { if (it[0] === "erros" && !nErr) { pushNav(); return emptyErrors(); } if (it[0] !== "home") pushNav(); it[3](); } },
        el("span", { cls: "tab-ic", html: ICO[it[0]] || it[1] }), el("span", { cls: "tab-t", text: it[2] }), it[0] === "erros" && nErr ? el("span", { cls: "tab-n", text: String(nErr) }) : null));
    });
    var wrapM = el("div", { cls: "tabwrap", "data-cur": cur }, bar);
    setTimeout(largeTitle, 0);
    var visto = true; try { visto = !!localStorage.getItem(PK("academia-menu-visto")); } catch (e) {}
    function vi() { try { localStorage.setItem(PK("academia-menu-visto"), "1"); } catch (e) {} }
    if (!visto) {
      bar.classList.add("pulse");
      var tipM = el("div", { cls: "tab-tip" }, el("span", { text: "👇 Novo! O seu menu fica aqui embaixo" }), el("button", { type: "button", text: "Entendi", onclick: function () { vi(); tipM.remove(); bar.classList.remove("pulse"); } }));
      wrapM.prepend(tipM);
      bar.addEventListener("click", vi);
    }
    return wrapM;
  }


  // =====================================================================
  // 🔐 CONTA (Thiago 27/11): cadastro = lead · login com e-mail e senha · "esqueci a senha" com código por e-mail
  // O progresso continua no aparelho (funciona sem internet) e vai pra conta, pra não perder ao trocar de celular.
  // =====================================================================
  var ACC_KEY = "destravando:conta";
  var ACC = PROF ? null : (function () { try { return JSON.parse(localStorage.getItem(ACC_KEY) || "null"); } catch (e) { return null; } })();
  function setAcc(a) { ACC = a; try { if (a) localStorage.setItem(ACC_KEY, JSON.stringify(a)); else localStorage.removeItem(ACC_KEY); } catch (e) {} }
  var API = "/api/";
  // o login só liga quando o servidor das contas responde (enquanto não estiver no ar, a Destravando funciona como antes)
  var CONTA_OK = false;
  function probeConta() {
    if (PROF) return Promise.resolve(false);
    return Promise.race([
      fetch(API + "eu", { headers: ACC && ACC.token ? { Authorization: "Bearer " + ACC.token } : {} }).then(function (r) {
        var ct = r.headers.get("content-type") || ""; CONTA_OK = ct.indexOf("json") > -1 && (r.status === 200 || r.status === 401);
        if (r.status === 401 && ACC) setAcc(null);
        return CONTA_OK;
      }).catch(function () { return false; }),
      new Promise(function (res) { setTimeout(function () { res(false); }, 9000); })
    ]);
  }
  function api(path, method, body) {
    var h = { "Content-Type": "application/json" }; if (ACC && ACC.token) h.Authorization = "Bearer " + ACC.token;
    return fetch(API + path, { method: method || "GET", headers: h, body: body ? JSON.stringify(body) : undefined, keepalive: method === "PUT" })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { j._status = r.status; if (r.status === 401 && ACC && path !== "entrar") { setAcc(null); } return j; }); })
      .catch(function () { return { _status: 0, error: "Sem internet. Confira a conexão e tente de novo." }; });
  }
  // ☁️ salva o progresso na conta (alguns segundos depois de cada mudança e ao sair da página)
  var pushT = null;
  function snapshot() { var c = JSON.parse(JSON.stringify(S)); try { var u = INDEX && INDEX[S.theme || 0]; if (u) c.temaNome = u.title; } catch (e) {} return c; }
  // 💬 "Achou um problema? Me conta" (Thiago 28/11, teste com os amigos): aba na lateral de toda tela; a mensagem vai pro painel com a tela onde a pessoa estava
  function whereNow() {
    var parts = [];
    [".top .brand", ".eyebrow", "h1", "h2", ".comp-q"].forEach(function (q) { var e = root.querySelector(q); if (e && e.textContent.trim()) parts.push(e.textContent.trim().replace(/\s+/g, " ").slice(0, 60)); });
    return parts.filter(function (x, i) { return parts.indexOf(x) === i; }).join(" › ").slice(0, 190) || "início";
  }
  function feedbackOpen() {
    var where = whereNow(), ta = el("textarea", { cls: "fb-ta", rows: "5", maxlength: "3000", placeholder: "Ex.: cliquei em gravar e não aconteceu nada. Ou: não entendi o que era pra fazer nessa tela." });
    var nm = el("input", { type: "text", placeholder: "Seu nome (opcional)", autocomplete: "name" }), em = el("input", { type: "email", placeholder: "Seu e-mail (opcional)", autocomplete: "email" });
    var msg = el("p", { cls: "small" }), send = el("button", { cls: "btn big gold", type: "button", text: "Enviar pro Joaquim →" });
    var card = el("div", { cls: "fb-card", role: "dialog", "aria-label": "Achou um problema?" },
      el("button", { cls: "fb-x", type: "button", "aria-label": "Fechar", text: "✕", onclick: close }),
      el("span", { cls: "eyebrow", text: "Achou um problema?" }), el("h2", { text: "Me conta o que aconteceu" }),
      el("p", { cls: "small", text: "Pode ser erro, coisa confusa, chata ou que você amou. A mensagem chega direto pra mim, já com a tela onde você está." }),
      ta, ACC ? null : nm, ACC ? null : em, el("p", { cls: "fb-where", text: "📍 " + where }), send, msg);
    var ov = el("div", { cls: "fb-ov", onclick: function (e) { if (e.target === ov) close(); } }, card);
    function close() { ov.remove(); }
    sheetify(ov, card, close);
    send.onclick = function () {
      var t = ta.value.trim(); if (t.length < 2) { msg.textContent = "Escreve o que aconteceu 🙂"; ta.focus(); return; }
      send.disabled = true; send.textContent = "Enviando…";
      api("feedback", "POST", { text: t, screen: where, name: nm.value.trim(), email: em.value.trim() }).then(function (r) {
        if (r && r.ok) { card.replaceChildren(el("div", { cls: "big-emoji", text: "💛" }), el("h2", { text: "Valeu! Chegou pra mim." }), el("p", { cls: "small", text: "Vou olhar com carinho. Falou, validou!" }), el("button", { cls: "btn big", type: "button", text: "Voltar pro treino", onclick: close })); }
        else { send.disabled = false; send.textContent = "Enviar pro Joaquim →"; msg.textContent = (r && r.error) || "Não consegui enviar agora. Tenta de novo daqui a pouco."; }
      });
    };
    document.body.append(ov); setTimeout(function () { ta.focus(); }, 150);
  }
  function feedbackTab() {
    if (document.querySelector(".fb-tab")) return;
    document.body.append(el("button", { cls: "fb-tab", type: "button", "aria-label": "Achou um problema? Me conta", onclick: feedbackOpen }, el("span", { text: "💬 Problema?" })));
  }
  function adopt(p) { // a conta tem progresso mais novo (outro aparelho): ele vale
    if (!p || typeof p !== "object") return false;
    try { if (sessionStorage.getItem("dtv:adopt") === String(p.savedAt)) return false; sessionStorage.setItem("dtv:adopt", String(p.savedAt)); } catch (e) {}
    S = p; try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} location.reload(); return true;
  }
  function pushNow(cb) {
    clearTimeout(pushT); pushT = null; if (!ACC || PROF || !SYNCED) { if (cb) cb(); return; }
    var body = JSON.stringify({ progress: snapshot(), testLevel: S.test && !S.test.skipped ? BANDS[S.test.band] : null, selfLevel: S.self != null && SELF[S.self] ? SELF[S.self].t : null });
    var h = { "Content-Type": "application/json" }; if (ACC && ACC.token) h.Authorization = "Bearer " + ACC.token;
    // keepalive só cabe 64 KB: progresso grande vai sem keepalive
    fetch(API + "progresso", { method: "PUT", headers: h, body: body, keepalive: body.length < 60000 }).then(function (r) {
      if (r.status === 409) return r.json().then(function (j) { adopt(j.progress); });
      if (r.status === 401 && ACC) { setAcc(null); notice("🔐 Sua sessão expirou. Entre de novo pra continuar salvando o progresso."); }
    }).catch(function () {}).then(function () { if (cb) cb(); });
  }
  function schedulePush() { if (!ACC || PROF) return; clearTimeout(pushT); pushT = setTimeout(pushNow, 4000); }
  // no boot: se a conta tem progresso mais novo que o deste aparelho, usa o da conta
  function syncDown() {
    if (!CONTA_OK || !ACC || PROF) { SYNCED = true; return Promise.resolve(); }
    return api("progresso", "GET").then(function (r) {
      var p = r && r.progress;
      if (p && typeof p === "object" && p.test && (p.savedAt || 0) > LOCAL_SAVED + 1000 && adopt(p)) return new Promise(function () {}); // recarregando
      SYNCED = true; if (pushT || (p && (p.savedAt || 0) < LOCAL_SAVED)) pushNow();
    }, function () { SYNCED = true; });
  }
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "hidden" && pushT) pushNow(); });
  // depois de entrar: se a conta já tem progresso, ele vale (é o mesmo aluno em outro aparelho); se não, sobe o do aparelho
  function afterLogin(res, after, viaFace) {
    setAcc({ token: res.token, email: res.user.email, name: res.user.name });
    try { if (!viaFace && window.PublicKeyCredential && !localStorage.getItem("dtv-faceid") && !localStorage.getItem("dtv-faceid-nao")) localStorage.setItem("dtv-oferecer-faceid", "1"); } catch (e) {}
    if (res.progress && typeof res.progress === "object" && res.progress.test) {
      S = res.progress; try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
      location.reload(); return;
    }
    SYNCED = true; S.name = S.name || res.user.name; persist(); pushNow(); after();
  }
  function field(label, input, tip) { return el("label", { cls: "fld" }, el("span", { cls: "fld-l", text: label }), input, tip ? el("span", { cls: "small", text: tip }) : null); }
  function chips(opts, cur, onPick) {
    var box = el("div", { cls: "chips pick" }), val = cur || null;
    opts.forEach(function (o) { var b = el("button", { cls: "chip" + (o === val ? " on" : ""), type: "button", text: o, onclick: function () { val = o; [].forEach.call(box.children, function (c) { c.classList.toggle("on", c === b); }); onPick && onPick(o); } }); box.append(b); });
    box.val = function () { return val; };
    return box;
  }
  function errBox() { var e = el("p", { cls: "form-err", role: "alert", hidden: true }); e.show = function (t) { e.textContent = t; e.hidden = !t; if (t) e.scrollIntoView({ block: "center", behavior: "smooth" }); }; return e; }
  function pwInput(ph) {
    var i = el("input", { type: "password", placeholder: ph || "Pelo menos 6 caracteres", autocomplete: "new-password", minlength: "6" });
    var t = el("button", { cls: "pw-eye", type: "button", text: "👁️ mostrar", onclick: function () { var show = i.type === "password"; i.type = show ? "text" : "password"; t.textContent = show ? "🙈 esconder" : "👁️ mostrar"; } });
    var w = el("div", { cls: "pw-wrap" }, i, t); w.input = i; return w;
  }
  var UFS = "AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" ");
  // 📝 CRIAR CONTA (é o lead): nome, e-mail, senha, WhatsApp, como se identifica, idade, cidade/estado, objetivo, como conheceu
  function signupScreen(after, why) {
    var w = screen();
    var name = el("input", { type: "text", placeholder: "Seu nome", autocomplete: "name", value: S.name || "" });
    var email = el("input", { type: "email", placeholder: "seuemail@exemplo.com", autocomplete: "email", inputmode: "email", autocapitalize: "off" });
    var pw = pwInput();
    // 🌎 muita gente mora fora: país + código do país no WhatsApp; estado só vira lista no Brasil
    var PAISES = [["Brasil", "55"], ["Estados Unidos", "1"], ["Portugal", "351"], ["Canadá", "1"], ["Reino Unido", "44"], ["Irlanda", "353"], ["Espanha", "34"], ["Itália", "39"], ["Alemanha", "49"], ["França", "33"], ["Suíça", "41"], ["Holanda", "31"], ["Japão", "81"], ["Austrália", "61"], ["Argentina", "54"], ["Chile", "56"], ["México", "52"], ["Outro país", ""]];
    var pais = el("select", { autocomplete: "country-name" }); PAISES.forEach(function (x) { pais.append(el("option", { value: x[0], text: x[0] })); });
    var paisOutro = el("input", { type: "text", placeholder: "Qual país?", hidden: true });
    var ddi = el("input", { type: "tel", cls: "ddi", value: "+55", inputmode: "tel", "aria-label": "Código do país", maxlength: "5" });
    var wpp = el("input", { type: "tel", placeholder: "(11) 99999-9999", autocomplete: "tel-national", inputmode: "tel" });
    var gender = chips(["Mulher", "Homem", "Não-binário", "Prefiro não dizer", "Outro"]);
    var age = chips(["Até 17", "18 a 24", "25 a 34", "35 a 44", "45 a 54", "55 ou mais"]);
    var uf = el("select", null, el("option", { value: "", text: "Estado" })); UFS.forEach(function (x) { uf.append(el("option", { value: x, text: x })); });
    var city = el("input", { type: "text", placeholder: "Sua cidade", autocomplete: "address-level2" });
    var ufTxt = el("input", { type: "text", placeholder: "Estado ou região (opcional)", autocomplete: "address-level1" });
    var ufBox = el("div", { cls: "fld-row" }, field("Estado", uf), field("Cidade", city));
    pais.onchange = function () {
      var br = pais.value === "Brasil", hit = PAISES.filter(function (x) { return x[0] === pais.value; })[0];
      paisOutro.hidden = pais.value !== "Outro país";
      ddi.value = hit && hit[1] ? "+" + hit[1] : "+";
      wpp.placeholder = br ? "(11) 99999-9999" : pais.value === "Estados Unidos" || pais.value === "Canadá" ? "(305) 555-1234" : "Seu número";
      ufBox.replaceChildren(br ? field("Estado", uf) : field("Estado ou região", ufTxt), field("Cidade", city));
      ufBox.classList.toggle("fld-row-even", !br);
    };
    var goal = chips(["Trabalho", "Viajar", "Morar fora", "Estudos", "Séries e filmes", "Conversar com gringos", "Outro"]);
    var how = chips(["Instagram", "TikTok", "YouTube", "Indicação", "Google", "Outro"]);
    var mk = el("input", { type: "checkbox" }), ok = el("input", { type: "checkbox" }), dados = el("input", { type: "checkbox" });
    var err = errBox();
    var go = el("button", { cls: "btn big", type: "button", text: "Criar minha conta →", onclick: function () {
      err.show("");
      if (!name.value.trim()) return err.show("Escreva o seu nome.");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim())) return err.show("Confira o seu e-mail.");
      if (pw.input.value.length < 6) return err.show("A senha precisa ter pelo menos 6 caracteres.");
      if (!dados.checked) return err.show("Marque a caixinha 🔒 dos dados pra criar a conta.");
      if (!ok.checked) return err.show("Pra criar a conta, aceite a política de privacidade.");
      go.disabled = true; go.textContent = "⏳ Criando…";
      S.name = name.value.trim(); persist();
      var br = pais.value === "Brasil", num = wpp.value.replace(/\D/g, "");
      api("cadastro", "POST", { name: S.name, email: email.value.trim(), password: pw.input.value, whatsapp: num ? (ddi.value.replace(/[^\d]/g, "") ? "+" + ddi.value.replace(/[^\d]/g, "") + " " : "") + wpp.value.trim() : "", gender: gender.val(), ageRange: age.val(),
        country: pais.value === "Outro país" ? (paisOutro.value.trim() || "Outro país") : pais.value, state: br ? uf.value : ufTxt.value.trim(), city: city.value, goal: goal.val(), howFound: how.val(),
        marketingOk: mk.checked, consent: true, confirma: true, selfLevel: S.self != null && SELF[S.self] ? SELF[S.self].t : null, testLevel: S.test && !S.test.skipped ? BANDS[S.test.band] : null, progress: snapshot() })
        .then(function (r) {
          go.disabled = false; go.textContent = "Criar minha conta →";
          if (r.token) { SFX.go(); afterLogin(r, after); return; }
          if (r.verify) return codeScreen(r.email, after, r.mail);
          err.show(r.error || "Não deu certo. Tente de novo.");
          // servidor fora do ar: não prende o aluno (continua sem conta e pede de novo depois)
          if (!r._status || r._status === 404 || r._status === 429 || r._status >= 500) { err.append(" ", el("button", { cls: "linkish", type: "button", text: "Continuar sem conta por enquanto →", onclick: function () { S.skipAccUntil = today(); persist(); after(); } })); }
          if (r.exists) { err.append(" ", el("button", { cls: "linkish", type: "button", text: "Entrar →", onclick: function () { loginScreen(after, email.value.trim()); } })); }
        });
    } });
    w.append(el("section", { cls: "hero" }, el("span", { cls: "eyebrow", text: "Destravando · sua conta" }),
        el("h1", { html: why ? esc(why) : "Crie sua conta e <mark>salve seu progresso</mark>." }),
        el("p", { text: "Assim você continua de qualquer celular ou computador, sem perder nada." })),
      el("div", { cls: "card form" },
        field("Nome", name), field("E-mail", email), field("Crie uma senha", pw),
        field("Onde você mora?", el("div", { cls: "fld-stack" }, pais, paisOutro)),
        field("WhatsApp", el("div", { cls: "tel-row" }, ddi, wpp), "Com o código do país (Brasil é +55, Estados Unidos é +1). Pra te mandar lembretes e novidades, se você quiser."),
        field("Como você se identifica?", gender), field("Idade", age),
        ufBox,
        field("Pra que você quer o inglês?", goal), field("Como conheceu o Destravando?", how),
        el("label", { cls: "chk chk-lock" }, dados, el("span", { html: "🔒 Entendo que os meus dados servem <b>só pra me dar acesso ao Destravando</b>. Ninguém vende, empresta ou passa eles pra outra pessoa." })),
        el("label", { cls: "chk" }, mk, el("span", { text: "Quero receber novidades e dicas por e-mail e WhatsApp." })),
        el("label", { cls: "chk" }, ok, el("span", { html: "Li e aceito a <a href=\"/privacidade.html\" target=\"_blank\">política de privacidade</a>." })),
        err, go, isMobile() && !STANDALONE ? el("p", { cls: "small center", text: "📲 Depois do cadastro, eu te mostro como colocar o Destravando no celular, como app." }) : null),
      el("button", { cls: "linkish", type: "button", text: "Já tenho conta · Entrar", onclick: function () { loginScreen(after); } }));
    setTimeout(function () { (S.name ? email : name).focus(); }, 250);
  }
  // 🔑 ENTRAR
  function loginScreen(after, pre) {
    after = after || function () { location.reload(); };
    var w = screen(), email = el("input", { type: "email", placeholder: "seuemail@exemplo.com", autocomplete: "email", inputmode: "email", autocapitalize: "off", value: pre || "" });
    var pw = pwInput("Sua senha"); pw.input.autocomplete = "current-password";
    var err = errBox();
    var go = el("button", { cls: "btn big", type: "button", text: "Entrar →", onclick: function () {
      err.show(""); go.disabled = true; go.textContent = "⏳ Entrando…";
      api("entrar", "POST", { email: email.value.trim(), password: pw.input.value }).then(function (r) {
        go.disabled = false; go.textContent = "Entrar →";
        if (r.token) { SFX.go(); afterLogin(r, after); } else if (r.verify) codeScreen(r.email, after, r.mail); else err.show(r.error || "Não deu certo. Tente de novo.");
      });
    } });
    pw.input.addEventListener("keydown", function (e) { if (e.key === "Enter") go.click(); });
    if (window.PublicKeyCredential && lsGet("dtv-faceid")) w.append(el("button", { cls: "btn big gold faceid-go", type: "button", text: "🔐 Entrar com Face ID ou digital", onclick: function (e) { faceLogin(after, e.currentTarget); } }));
    w.append(el("section", { cls: "hero" }, el("span", { cls: "eyebrow", text: "Destravando · entrar" }), el("h1", { html: STANDALONE ? "Bem-vindo ao <mark>Destravando</mark>!" : "Bem-vindo <mark>de volta</mark>!" }), STANDALONE ? el("p", { text: "Entre com o e-mail e a senha da sua conta. Depois, o app fica logado." }) : null),
      el("div", { cls: "card form" }, field("E-mail", email), field("Senha", pw), err, go,
        el("button", { cls: "linkish", type: "button", text: "🔑 Esqueci a senha", onclick: function () { forgotScreen(after, email.value.trim()); } })),
      el("button", { cls: STANDALONE ? "btn ghost" : "linkish", type: "button", text: STANDALONE ? "Ainda não tenho conta · Criar agora" : "Ainda não tenho conta · Criar", onclick: function () { STANDALONE ? startFlow() : signupScreen(after); } }));
    setTimeout(function () { (pre ? pw.input : email).focus(); }, 250);
  }
  // 📩 CONFIRMAR O E-MAIL (Thiago 28/11: "todo lugar é assim"): código de 6 números → confirma → entra
  function codeScreen(mail, after, st) {
    after = after || function () { location.reload(); };
    var w = screen(), err = errBox(), wait = 60, tmr = null;
    var code = el("input", { type: "text", inputmode: "numeric", autocomplete: "one-time-code", maxlength: "6", placeholder: "••••••", cls: "code-in" });
    var go = el("button", { cls: "btn big", type: "button", text: "Confirmar e entrar →", disabled: true, onclick: function () {
      err.show(""); go.disabled = true; go.textContent = "⏳ Conferindo…";
      api("confirmar", "POST", { email: mail, code: code.value }).then(function (r) {
        go.disabled = false; go.textContent = "Confirmar e entrar →";
        if (r.token) { clearInterval(tmr); SFX.win(); if (isMobile() && !STANDALONE && !S.installed) { var go0 = after; after = function () { installGuide(go0, true); }; } try { confetti(); } catch (e) {} notice("✅ E-mail confirmado! Bem-vindo(a) ao Destravando."); afterLogin(r, after); }
        else { err.show(r.error || "Não deu certo. Tente de novo."); code.select(); }
      });
    } });
    code.addEventListener("input", function () { code.value = code.value.replace(/\D/g, "").slice(0, 6); go.disabled = code.value.length !== 6; if (code.value.length === 6) go.click(); });
    var again = el("button", { cls: "linkish", type: "button", disabled: true, onclick: function () {
      again.disabled = true; err.show("");
      api("reenviar", "POST", { email: mail }).then(function (r) { if (r.ok) { notice("📩 Mandei outro código. Confira também o spam."); count(60); } else { err.show(r.error || "Não deu certo. Tente de novo."); count(30); } });
    } });
    function count(n) { wait = n; clearInterval(tmr); again.disabled = true; again.textContent = "Mandar outro código (" + wait + " s)"; tmr = setInterval(function () { if (!again.isConnected) return clearInterval(tmr); wait--; if (wait <= 0) { clearInterval(tmr); again.disabled = false; again.textContent = "📩 Mandar outro código"; } else again.textContent = "Mandar outro código (" + wait + " s)"; }, 1000); }
    w.append(el("section", { cls: "hero" }, el("span", { cls: "eyebrow", text: "Destravando · confirme seu e-mail" }),
        el("h1", { html: "Falta só <mark>confirmar o seu e-mail</mark>." }),
        el("p", { html: "Mandei um código de 6 números para <b>" + esc(mail) + "</b>. Ele chega em até 1 minuto." })),
      el("div", { cls: "card form" }, field("Código do e-mail", code), err, go,
        el("p", { cls: "small", text: "Não chegou? Olhe na caixa de spam ou em Promoções (no Gmail). O e-mail vem de nao-responda@destravando.inglescomjoaquim.com." }), again),
      el("button", { cls: "linkish", type: "button", text: "Errei o e-mail · voltar pro cadastro", onclick: function () { clearInterval(tmr); signupScreen(after); } }));
    if (st === "falhou") err.show("Não consegui mandar o e-mail agora. Toque em “Mandar outro código” daqui a pouco.");
    count(st === "falhou" ? 5 : 60);
    setTimeout(function () { code.focus(); }, 250);
  }
  // 🔑 ESQUECI A SENHA: código de 6 números no e-mail → senha nova → já entra
  function forgotScreen(after, pre) {
    var w = screen(), email = el("input", { type: "email", placeholder: "seuemail@exemplo.com", autocomplete: "email", inputmode: "email", autocapitalize: "off", value: pre || "" });
    var err = errBox(), step2 = el("div", { cls: "form-2", hidden: true });
    var code = el("input", { type: "text", inputmode: "numeric", autocomplete: "one-time-code", maxlength: "6", placeholder: "000000", cls: "code-in" });
    var pw = pwInput("Senha nova, pelo menos 6 caracteres");
    var send = el("button", { cls: "btn big", type: "button", text: "Mandar o código pro meu e-mail", onclick: function () {
      err.show(""); send.disabled = true; send.textContent = "⏳ Mandando…";
      api("esqueci", "POST", { email: email.value.trim() }).then(function (r) {
        send.disabled = false; send.textContent = "Mandar de novo";
        if (r.ok) { step2.hidden = false; send.classList.add("ghost"); notice("📧 Se esse e-mail tem conta, o código chegou. Olhe também o spam."); code.focus(); }
        else err.show(r.error || "Não deu certo. Tente de novo.");
      });
    } });
    var save = el("button", { cls: "btn big", type: "button", text: "Salvar a senha nova e entrar →", onclick: function () {
      err.show(""); save.disabled = true; save.textContent = "⏳ Salvando…";
      api("redefinir", "POST", { email: email.value.trim(), code: code.value, password: pw.input.value }).then(function (r) {
        save.disabled = false; save.textContent = "Salvar a senha nova e entrar →";
        if (r.token) { notice("✅ Senha nova salva!"); afterLogin(r, after || function () { location.reload(); }); } else err.show(r.error || "Não deu certo. Tente de novo.");
      });
    } });
    step2.append(field("Código de 6 números que chegou no e-mail", code), field("Senha nova", pw), save);
    w.append(el("header", { cls: "top" }, el("button", { cls: "back", type: "button", text: "‹ Voltar", onclick: function () { loginScreen(after, email.value.trim()); } })),
      el("section", { cls: "hero" }, el("span", { cls: "eyebrow", text: "Destravando · esqueci a senha" }), el("h1", { html: "Sem problema: <mark>em 1 minuto</mark> você cria outra." }),
        el("p", { text: "A gente manda um código de 6 números pro seu e-mail. Você digita aqui e escolhe a senha nova." })),
      el("div", { cls: "card form" }, field("Seu e-mail", email), send, step2, err));
  }
  function accountCard() {
    if (PROF || !CONTA_OK) return null;
    if (!ACC) return el("div", { cls: "card acc-card" }, el("span", { cls: "eyebrow", text: "🔐 Sua conta" }), el("p", { cls: "small", text: "Você ainda não tem conta: o progresso está só neste aparelho." }),
      el("button", { cls: "btn", type: "button", text: "Criar conta e salvar meu progresso", onclick: function () { signupScreen(home); } }));
    return el("div", { cls: "card acc-card" }, el("span", { cls: "eyebrow", text: "🔐 Sua conta" }), el("p", null, el("b", { text: ACC.name || "" }), el("br"), el("span", { cls: "small", text: ACC.email + " · progresso salvo ☁️" })),
      el("button", { cls: "linkish", type: "button", text: "Sair desta conta", onclick: askLogout }));
  }

  // 📲 APP INSTALÁVEL (Thiago 28/11: "não dá muito aquela impressão de aplicativo"): ícone na tela, tela cheia, sem barra do navegador
  var STANDALONE = (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true || Q.get("app") === "1"; // o ícone abre em /?app=1
  if (STANDALONE) document.documentElement.classList.add("is-app");
  var IOS = !/Android/.test(navigator.userAgent) && (/iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
  var INSTALL_EVT = null;
  window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); INSTALL_EVT = e; var b = document.querySelector(".inst-go"); if (b) b.hidden = false; });
  window.addEventListener("appinstalled", function () { S.installed = today(); persist(); var c = document.querySelector(".install-card"); if (c) c.remove(); notice("📲 Pronto! O Destravando está na sua tela de início."); });
  try { if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("/sw.js").catch(function () {}); } catch (e) {}
  function installCard() {
    if (STANDALONE || PROF || S.installed || (S.installHide && S.installHide > today())) return null;
    var mob = /Android|iPhone|iPad|iPod/.test(navigator.userAgent) || IOS; if (!mob) return null;
    var later = function () { var d = new Date(); d.setDate(d.getDate() + 5); S.installHide = isoOf(d); persist(); card.remove(); };
    var card = el("div", { cls: "card install-card" }, el("img", { cls: "inst-card-ic", src: "/academia/app/icon-96.png", alt: "" }), el("span", { cls: "eyebrow", text: "📲 Destravando no seu celular" }),
      el("b", { text: "Instale o app: abre em tela cheia, direto do ícone, sem precisar procurar o site." }),
      el("button", { cls: "btn gold", type: "button", text: "📲 Ver como instalar (10 segundos)", onclick: function () { pushNav(); installGuide(home); } }));
    if (IOS) card.append(el("ol", { cls: "inst-steps" },
      el("li", { html: "Toque em <b>Compartilhar</b> <span class=\"ios-share\">⬆︎</span> na barra do Safari (embaixo ou em cima)" }),
      el("li", { html: "Role e toque em <b>Adicionar à Tela de Início</b> ➕" }),
      el("li", { html: "Toque em <b>Adicionar</b>. Pronto: abra sempre pelo ícone 🔓" })),
      /CriOS|FxiOS|Instagram|FBAN|FBAV/.test(navigator.userAgent) ? el("p", { cls: "small", text: "⚠️ No iPhone, isso só funciona no Safari. Abra destravando.inglescomjoaquim.com no Safari e siga os passos." }) : null);
    else card.append(el("button", { cls: "btn inst-go", type: "button", hidden: !INSTALL_EVT, text: "📲 Instalar o app", onclick: function () { if (!INSTALL_EVT) return; INSTALL_EVT.prompt(); INSTALL_EVT.userChoice.then(function (c) { if (c && c.outcome === "accepted") { S.installed = today(); persist(); card.remove(); } INSTALL_EVT = null; }); } }),
      el("p", { cls: "small", text: "Não apareceu o botão? No Chrome, toque nos 3 pontinhos ⋮ e em “Instalar app” ou “Adicionar à tela inicial”." }));
    card.append(el("button", { cls: "linkish", type: "button", text: "Agora não", onclick: later }));
    return card;
  }
  // ⬅️ VOLTAR como app: arrastar da beirada esquerda (iPhone) e o botão voltar do Android
  function goBack() {
    if (document.querySelector(".evo-ov")) { document.querySelectorAll(".evo-ov").forEach(function (o) { o.remove(); }); return true; }
    if (CUR) { askExit(); return true; }
    var b = root.querySelector("header .back") || root.querySelector("button.back");
    if (b) { BACKING = true; b.click(); return true; }
    if (S.test && !root.querySelector("section.hello")) { BACKING = true; home(); return true; } // qualquer outra tela volta pro início
    return false;
  }
  if (STANDALONE) {
    var sx = 0, sy = 0, edge = false;
    document.addEventListener("touchstart", function (e) { var t = e.touches[0]; edge = t.clientX < 26; sx = t.clientX; sy = t.clientY; }, { passive: true });
    document.addEventListener("touchend", function (e) { if (!edge) return; edge = false; var t = e.changedTouches[0]; if (t.clientX - sx > 70 && Math.abs(t.clientY - sy) < 60) goBack(); }, { passive: true });
  }
  // 📶 sem internet: aviso fixo no topo (some quando volta)
  function netBanner() {
    var b = document.querySelector(".net-off");
    if (navigator.onLine) { if (b) b.remove(); return; }
    if (!b) document.body.append(el("div", { cls: "net-off", text: "📶 Sem internet. O que você fizer fica salvo e sobe quando a conexão voltar." }));
  }
  window.addEventListener("offline", netBanner); window.addEventListener("online", function () { netBanner(); notice("✅ Internet de volta!"); });
  // ⌨️ teclado: botão "Ir" e nada de zoom sozinho no iPhone (fonte ≥ 16 px no CSS)
  document.addEventListener("focusin", function (e) { var t = e.target; if (t && t.tagName === "INPUT" && !t.getAttribute("enterkeyhint")) t.setAttribute("enterkeyhint", t.type === "email" ? "next" : "go"); });
  // 🔔 NOTIFICAÇÃO NO CELULAR + número no ícone
  var PUSH_OK = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window && (STANDALONE || !IOS);
  function syncBadge() { try { if (!navigator.setAppBadge) return; if (S.dailyDone === today()) navigator.clearAppBadge(); else if (window.Notification && Notification.permission === "granted") navigator.setAppBadge(1); } catch (e) {} }
  function b64u(s) { var p = "=".repeat((4 - s.length % 4) % 4), b = atob((s + p).replace(/-/g, "+").replace(/_/g, "/")), a = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; }
  function pushOn(btn, card) {
    btn.disabled = true; btn.textContent = "⏳ Ativando…";
    function fail(t) { btn.disabled = false; btn.textContent = "🔔 Ativar notificação"; notice(t); }
    Notification.requestPermission().then(function (perm) {
      if (perm !== "granted") { S.pushHide = "9999-12-31"; persist(); if (card) card.remove(); return notice("Tudo bem! Se mudar de ideia, libere as notificações do Destravando nos Ajustes do celular."); }
      return Promise.all([navigator.serviceWorker.ready, api("push", "GET")]).then(function (x) {
        var reg = x[0], key = x[1] && x[1].key; if (!key) return fail("A notificação ainda não está ligada no servidor. Tente mais tarde.");
        return reg.pushManager.getSubscription().then(function (old) { return old || reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64u(key) }); })
          .then(function (sub) { return api("push", "POST", { sub: sub.toJSON(), device: (navigator.userAgent.match(/iPhone|iPad|Android[^;)]*/) || ["?"])[0], teste: true }); })
          .then(function (r) { if (!r.ok) return fail(r.error || "Não deu certo. Tente de novo."); S.pushOn = today(); persist(); syncBadge(); if (card) card.remove(); SFX.win(); notice("🔔 Pronto! Mandei uma notificação de teste agora."); });
      });
    }).catch(function () { fail("Não deu certo. Tente de novo."); });
  }
  function pushCard() {
    if (!PUSH_OK || !ACC || PROF || S.pushOn || (S.pushHide && S.pushHide > today())) return null;
    if (window.Notification && Notification.permission === "denied") return null;
    var card = el("div", { cls: "card push-card" }, el("span", { cls: "eyebrow", text: "🔔 Lembrete no celular" }),
      el("b", { text: "Ative e eu te lembro do treino no fim do dia, direto na tela do celular, como qualquer app." }),
      el("p", { cls: "small", text: "Só 1 por dia, no horário que você escolher (na aba 👤 Você), e só se você ainda não treinou. De férias, não chega nada." }));
    var go = el("button", { cls: "btn", type: "button", text: "🔔 Ativar notificação", onclick: function () { pushOn(go, card); } });
    card.append(go, el("button", { cls: "linkish", type: "button", text: "Agora não", onclick: function () { var d = new Date(); d.setDate(d.getDate() + 5); S.pushHide = isoOf(d); persist(); card.remove(); } }));
    return card;
  }
  // 🚪 SAIR: confirma numa janela de baixo; desliga a notificação deste celular (pra não chegar lembrete da conta de outra pessoa)
  function logoutNow(btn) {
    if (btn) { btn.disabled = true; btn.textContent = "⏳ Saindo…"; }
    function fim() { api("sair", "POST").then(function () { setAcc(null); try { localStorage.removeItem(KEY); navigator.clearAppBadge && navigator.clearAppBadge(); } catch (e) {} location.reload(); }); }
    pushNow(function () {
      var p = (navigator.serviceWorker && S.pushOn) ? navigator.serviceWorker.ready.then(function (reg) { return reg.pushManager.getSubscription(); }).then(function (sub) { if (!sub) return; return api("push", "DELETE", { endpoint: sub.endpoint }).then(function () { return sub.unsubscribe(); }); }).catch(function () {}) : Promise.resolve();
      p.then(fim, fim);
    });
  }
  function askLogout() {
    var go = el("button", { cls: "btn big", type: "button", text: "🚪 Sair da conta" });
    var card = el("div", { cls: "fb-card" }, el("div", { cls: "big-emoji", text: "👋" }), el("h2", { text: "Quer sair da conta?" }),
      el("p", { cls: "small", text: "Seu progresso fica salvo. Pra voltar, é só entrar de novo com e-mail e senha" + (lsGet("dtv-faceid") ? " ou com " + faceName() : "") + "." }), go,
      el("button", { cls: "linkish", type: "button", text: "Cancelar", onclick: function () { close(); } }));
    var ov = el("div", { cls: "fb-ov", onclick: function (e) { if (e.target === ov) close(); } }, card);
    function close() { ov.remove(); }
    go.onclick = function () { logoutNow(go); };
    document.body.append(ov); sheetify(ov, card, close);
  }
  // 🔐 FACE ID / DIGITAL (passkey)
  function bufU(b) { var a = new Uint8Array(b), s = ""; for (var i = 0; i < a.length; i++) s += String.fromCharCode(a[i]); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
  function uBuf(s) { return b64u(s).buffer; }
  function faceName() { return IOS ? "Face ID" : "digital"; }
  function faceOn(btn, done) {
    if (btn) { btn.disabled = true; btn.dataset.t = btn.textContent; btn.textContent = "⏳ Ativando…"; }
    function end(ok, t) { if (btn) { btn.disabled = false; btn.textContent = btn.dataset.t; } if (t) notice(t); if (done) done(ok); }
    api("passkey", "POST", { etapa: "ativar-opcoes" }).then(function (r) {
      if (!r.opts) return end(false, r.error || "Não deu certo agora.");
      var o = r.opts, pk = Object.assign({}, o, { challenge: uBuf(o.challenge), user: Object.assign({}, o.user, { id: new TextEncoder().encode(o.user.id) }), excludeCredentials: (o.excludeCredentials || []).map(function (c) { return Object.assign({}, c, { id: uBuf(c.id) }); }) });
      return navigator.credentials.create({ publicKey: pk }).then(function (c) {
        var rs = c.response, resp = { id: c.id, rawId: bufU(c.rawId), type: c.type, response: { clientDataJSON: bufU(rs.clientDataJSON), attestationObject: bufU(rs.attestationObject), transports: rs.getTransports ? rs.getTransports() : [] }, clientExtensionResults: c.getClientExtensionResults ? c.getClientExtensionResults() : {}, authenticatorAttachment: c.authenticatorAttachment };
        return api("passkey", "POST", { etapa: "ativar", resposta: resp, device: (navigator.userAgent.match(/iPhone|iPad|Android[^;)]*/) || ["?"])[0] }).then(function (x) {
          if (!x.ok) return end(false, x.error || "Não deu certo.");
          try { localStorage.setItem("dtv-faceid", "1"); localStorage.removeItem("dtv-oferecer-faceid"); } catch (e) {} SFX.win(); end(true, "🔐 Pronto! Da próxima vez, é só entrar com " + faceName() + ".");
        });
      });
    }).catch(function (e) { end(false, e && e.name === "NotAllowedError" ? "Tudo bem, ficou pra depois." : "Não deu certo neste aparelho."); });
  }
  function faceLogin(after, btn) {
    after = after || function () { location.reload(); };
    if (btn) { btn.disabled = true; btn.textContent = "⏳ Confirmando…"; }
    function back(t) { if (btn) { btn.disabled = false; btn.textContent = "🔐 Entrar com Face ID ou digital"; } if (t) notice(t); }
    api("passkey", "POST", { etapa: "entrar-opcoes" }).then(function (r) {
      if (!r.opts) return back(r.error || "Não deu certo agora.");
      var o = r.opts, pk = Object.assign({}, o, { challenge: uBuf(o.challenge), allowCredentials: (o.allowCredentials || []).map(function (c) { return Object.assign({}, c, { id: uBuf(c.id) }); }) });
      return navigator.credentials.get({ publicKey: pk }).then(function (c) {
        var rs = c.response, resp = { id: c.id, rawId: bufU(c.rawId), type: c.type, response: { clientDataJSON: bufU(rs.clientDataJSON), authenticatorData: bufU(rs.authenticatorData), signature: bufU(rs.signature), userHandle: rs.userHandle ? bufU(rs.userHandle) : undefined }, clientExtensionResults: c.getClientExtensionResults ? c.getClientExtensionResults() : {}, authenticatorAttachment: c.authenticatorAttachment };
        return api("passkey", "POST", { etapa: "entrar", id: r.id, resposta: resp }).then(function (x) { if (x.token) { SFX.go(); afterLogin(x, after, true); } else back(x.error || "Não deu certo."); });
      });
    }).catch(function (e) { back(e && e.name === "NotAllowedError" ? "" : "Não deu certo. Entre com e-mail e senha."); });
  }
  function offerFace() {
    if (!ACC || PROF || !lsGet("dtv-oferecer-faceid") || document.querySelector(".fb-ov,.evo-ov")) return;
    if (!window.PublicKeyCredential || !PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) return;
    PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().then(function (ok) {
      if (!ok || !root.querySelector("section.hello")) return;
      var go = el("button", { cls: "btn big gold", type: "button", text: "🔐 Ativar " + faceName() });
      var card = el("div", { cls: "fb-card" }, el("div", { cls: "big-emoji", text: "🔐" }), el("h2", { text: "Entrar com " + faceName() + "?" }),
        el("p", { cls: "small", text: "Da próxima vez, nada de digitar e-mail e senha: é só olhar pro celular (ou encostar o dedo) e pronto." }), go,
        el("button", { cls: "linkish", type: "button", text: "Agora não", onclick: function () { try { localStorage.setItem("dtv-faceid-nao", "1"); localStorage.removeItem("dtv-oferecer-faceid"); } catch (e) {} close(); } }));
      var ov = el("div", { cls: "fb-ov", onclick: function (e) { if (e.target === ov) close(); } }, card);
      function close() { ov.remove(); }
      go.onclick = function () { faceOn(go, function (ok) { if (ok) close(); }); };
      document.body.append(ov); sheetify(ov, card, close);
    });
  }
  // ⏰ fuso do aparelho vai pra conta (o lembrete chega na hora local de cada um)
  function sendTz() { var tz = ""; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) {} if (!ACC || !tz || S.tz === tz) return; api("preferencias", "POST", { fuso: tz }).then(function (r) { if (r && r.ok) { S.tz = tz; persist(); } }); }
  // 🏆 conquista: notificação no celular (se a pessoa ativou)
  function conquista(title, body) { try { if (window.Notification && Notification.permission === "granted" && navigator.serviceWorker) navigator.serviceWorker.ready.then(function (reg) { reg.showNotification(title, { body: body, icon: "/academia/app/icon-192.png", badge: "/academia/app/icon-96.png", tag: "conquista", data: { url: "/?app=1&ir=progresso" } }); }); } catch (e) {} }
  // 👆 GESTOS: puxar pra atualizar (início) e deslizar pro lado pra trocar de aba
  (function () {
    var x0 = 0, y0 = 0, pulling = false, ind = null, ok = false, t0 = null;
    document.addEventListener("touchstart", function (e) {
      if (e.touches.length !== 1 || document.querySelector(".fb-ov,.evo-ov")) { t0 = null; return; }
      var t = e.touches[0]; x0 = t.clientX; y0 = t.clientY; t0 = e.target;
      pulling = window.scrollY <= 0 && !!root.querySelector("section.hello") && !t0.closest("input,textarea,select,.onb-track");
    }, { passive: true });
    document.addEventListener("touchmove", function (e) {
      if (!pulling) return; var dy = e.touches[0].clientY - y0; if (dy <= 0) return;
      if (!ind) { ind = el("div", { cls: "ptr" }, el("img", { src: "/academia/app/icon-96.png", alt: "" })); document.body.append(ind); }
      var k = Math.min(1, dy / 110); ok = dy > 110; ind.style.opacity = String(k); ind.style.transform = "translate(-50%," + Math.min(70, dy * 0.5) + "px) rotate(" + Math.round(dy * 2) + "deg)";
    }, { passive: true });
    document.addEventListener("touchend", function (e) {
      if (pulling && ind) { if (ok) { ind.classList.add("spin"); buzz(15); setTimeout(function () { location.reload(); }, 450); } else { ind.remove(); ind = null; } pulling = false; ok = false; return; }
      pulling = false; if (!t0) return;
      var t = e.changedTouches[0], dx = t.clientX - x0, dy = t.clientY - y0;
      if (Math.abs(dx) < 80 || Math.abs(dy) > 45 || x0 < 26) return;
      if (t0.closest("input,textarea,select,.onb-track,.pbar,.lb-track,.chips,.yt,.x-line,[data-noswipe]")) return;
      var tw = root.querySelector(".tabwrap"); if (!tw) return;
      var order = ["home", "prog", "erros", "nativo", "voce"];
      var i = order.indexOf(tw.getAttribute("data-cur")); if (i < 0) return;
      var j = dx < 0 ? i + 1 : i - 1; if (j < 0 || j >= order.length) return;
      var fn = { home: home, prog: progressPage, erros: function () { if (myErrors().length) runErrors(); else emptyErrors(); }, nativo: extrasPage, voce: youPage }[order[j]];
      if (dx > 0) BACKING = true; buzz(8); fn();
    }, { passive: true });
  })();
  // 🫥 TELA VAZIA caprichada: o bonequinho do logo + frase do Joaquim
  function emptyBox(t, txt, btn, fn) { return el("div", { cls: "empty" }, el("img", { src: "/academia/app/icon-192.png", alt: "" }), el("h2", { text: t }), el("p", { text: txt }), btn ? el("button", { cls: "btn big gold", type: "button", text: btn, onclick: fn }) : null); }
  function emptyErrors() { var w = screen(); w.append(topBar(home), el("h1", { text: "Meus erros" }), emptyBox("Nenhum erro pra revisar.", "Tá se achando, hein? 😏 Errar faz parte: quando escapar alguma coisa no treino, ela vem parar aqui pra você treinar de novo.", "Treinar agora →", runDaily), menuBar("erros")); }
  // 🔠 TÍTULO GRANDE estilo iPhone: o 1º título da aba fica grande e, ao rolar, encolhe e vai pro topo
  function largeTitle() {
    var h = root.querySelector("main.wrap > h1, main.wrap > section h1, main.wrap .you-head h1"), top = root.querySelector("main.wrap > header.top");
    document.body.classList.remove("lt-mini"); if (!h || !top) return;
    h.classList.add("lt"); var t = h.textContent.replace(/^[^A-Za-zÀ-ú0-9]+/, "").trim();
    var tt = top.querySelector(".tt") || el("span", { cls: "tt" }); tt.textContent = t; if (!tt.parentNode) top.append(tt);
  }
  window.addEventListener("scroll", function () { var h = root.querySelector(".lt"), top = root.querySelector("main.wrap > header.top"); if (!h || !top) return; document.body.classList.toggle("lt-mini", h.getBoundingClientRect().bottom < top.getBoundingClientRect().bottom + 4); }, { passive: true });
  // ✨ NOVA VERSÃO: quando eu subir atualização, aparece a faixinha "Atualizar" (como os apps)
  var MY_V = ((document.querySelector('script[src*="app.js?v="]') || {}).src || "").replace(/.*app\.js\?v=/, "");
  function checkUpdate() {
    if (!MY_V || document.querySelector(".upd")) return;
    fetch("/?chk=" + Date.now(), { cache: "no-store" }).then(function (r) { return r.text(); }).then(function (t) {
      var m = t.match(/app\.js\?v=(\d+)/); if (!m || m[1] === MY_V) return;
      document.body.append(el("button", { cls: "upd", type: "button", onclick: function () { location.reload(); } }, el("span", { text: "✨ Novidade no app" }), el("b", { text: "Atualizar" })));
    }).catch(function () {});
  }
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") checkUpdate(); });
  setInterval(checkUpdate, 15 * 60000); setTimeout(checkUpdate, 20000);
  var DSEM = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
  function addDays(iso, n) { var d = new Date(iso + "T12:00:00"); d.setDate(d.getDate() + n); return isoOf(d); }
  // 🎧 MODO FONE NO OUVIDO: treino só de áudio (ouça → repita na pausa → confira), com o player na tela bloqueada
  function foneCard() {
    if (!S.test) return null;
    return el("button", { cls: "card fone-card", type: "button", onclick: function () { pushNav(); fonePage(); } },
      el("span", { cls: "fone-ic", text: "🎧" }), el("span", { cls: "fone-t" }, el("b", { text: "Treino no fone · 5 min" }), el("small", { text: "Andando, na academia, no trânsito: o app fala, você repete. Funciona com a tela bloqueada." })), el("span", { cls: "set-go", text: "›" }));
  }
  function fonePage() {
    var w = screen(); w.append(topBar(home), skel());
    var I = INDEX[curTheme()];
    getUnit(I.id).then(function (u) {
      w.replaceChildren(topBar(home));
      var items = [];
      ((u.lesson && u.lesson.chunks) || []).slice(0, 5).forEach(function (c, ci) { (c.examples || []).slice(0, 2).forEach(function (en, k) { var f = af(u, "ex" + ci + "_" + k); if (f) items.push({ en: en, pt: (c.examplesPt || [])[k] || "", ck: c.chunk, f: f }); }); });
      if (!items.length) { w.append(emptyBox("Esse tema ainda não tem treino no fone.", "Faça o treino do dia que, no próximo tema, ele aparece aqui.", "Voltar →", home)); return; }
      var STEPS = []; items.forEach(function (it, i) { STEPS.push({ i: i, ph: 0, src: it.f }, { i: i, ph: 1, src: "/academia/app/silencio-3.mp3" }, { i: i, ph: 2, src: it.f }, { i: i, ph: 3, src: "/academia/app/silencio-2.mp3" }); });
      var PH = [["🎧", "Ouça"], ["🗣️", "Sua vez: repita em voz alta"], ["✅", "Confira"], ["⏭️", "Próxima"]];
      var A = new Audio(); A.preload = "auto"; var si = 0, on = false, showTxt = true, fim = false;
      var phase = el("div", { cls: "fone-ph" }), en = el("h2", { cls: "fone-en" }), pt = el("p", { cls: "fone-pt" }), ck = el("span", { cls: "eyebrow" });
      var fill = el("i"), cnt = el("span", { cls: "small" });
      var pp = el("button", { cls: "fone-pp", type: "button", "aria-label": "Tocar ou pausar", text: "▶", onclick: function () { on ? pause() : play(); } });
      function draw() { var st = STEPS[si], it = items[st.i]; phase.replaceChildren(el("span", { text: PH[st.ph][0] }), el("b", { text: PH[st.ph][1] })); phase.className = "fone-ph p" + st.ph;
        en.textContent = showTxt ? it.en : "🙈 texto escondido"; pt.textContent = showTxt ? it.pt : ""; ck.textContent = "🔑 " + it.ck; cnt.textContent = "Frase " + (st.i + 1) + " de " + items.length; fill.style.width = Math.round((si + 1) / STEPS.length * 100) + "%";
        try { if ("mediaSession" in navigator) navigator.mediaSession.metadata = new MediaMetadata({ title: it.en, artist: "🔓 Destravando · " + PH[st.ph][1], album: "Treino no fone · " + I.title, artwork: [{ src: "/academia/app/icon-512.png", sizes: "512x512", type: "image/png" }] }); } catch (e) {} }
      function load() { A.src = STEPS[si].src; draw(); }
      function play() { if (fim) { si = 0; fim = false; load(); } on = true; pp.textContent = "⏸"; A.play().catch(function () { on = false; pp.textContent = "▶"; }); try { navigator.mediaSession.playbackState = "playing"; } catch (e) {} }
      function pause() { on = false; pp.textContent = "▶"; A.pause(); try { navigator.mediaSession.playbackState = "paused"; } catch (e) {} }
      function jump(d) { var cur = STEPS[si].i, ti = Math.max(0, Math.min(items.length - 1, cur + d)); si = STEPS.findIndex(function (x) { return x.i === ti; }); load(); if (on) A.play().catch(function () {}); }
      A.addEventListener("ended", function () {
        if (si + 1 >= STEPS.length) { on = false; fim = true; pp.textContent = "↺"; S.xp += 10; S.xpByDay = S.xpByDay || {}; S.xpByDay[today()] = (S.xpByDay[today()] || 0) + 10; persist(); SFX.win(); notice("🎧 Treino no fone concluído! +10 XP"); return; }
        si++; load(); A.play().catch(function () {});
      });
      try { if ("mediaSession" in navigator) { var ms = navigator.mediaSession; ms.setActionHandler("play", play); ms.setActionHandler("pause", pause); ms.setActionHandler("nexttrack", function () { jump(1); }); ms.setActionHandler("previoustrack", function () { jump(-1); }); } } catch (e) {}
      TALKS.push(function () { try { A.pause(); A.removeAttribute("src"); A.load(); var ms = navigator.mediaSession; ms.metadata = null; ["play", "pause", "nexttrack", "previoustrack"].forEach(function (k) { ms.setActionHandler(k, null); }); } catch (e) {} });
      w.append(el("h1", { text: "🎧 Treino no fone" }), el("p", { cls: "small", text: "Tema " + (curTheme() + 1) + " · " + I.title + ". Coloque o fone, aperte o play e pode bloquear a tela: o app fala, dá a pausa pra você repetir e segue sozinho." }),
        el("div", { cls: "card fone-card-big" }, phase, ck, en, pt, el("div", { cls: "lb-track fone-bar" }, fill), cnt,
          el("div", { cls: "fone-ctrl" }, el("button", { type: "button", cls: "fone-sk", "aria-label": "Frase anterior", text: "⏮", onclick: function () { jump(-1); } }), pp, el("button", { type: "button", cls: "fone-sk", "aria-label": "Próxima frase", text: "⏭", onclick: function () { jump(1); } }))),
        el("button", { cls: "linkish", type: "button", text: "🙈 Esconder o texto (só ouvido)", onclick: function (e) { showTxt = !showTxt; e.currentTarget.textContent = showTxt ? "🙈 Esconder o texto (só ouvido)" : "👀 Mostrar o texto"; draw(); } }));
      load();
    }, netError);
  }
  // 📊 RETROSPECTIVA DA SEMANA (estilo stories): semana passada, segunda a domingo
  function retroWeek() { var t = new Date(today() + "T12:00:00"), dow = (t.getDay() + 6) % 7, mon = addDays(today(), -dow - 7); return { de: mon, ate: addDays(mon, 6) }; }
  function retroData() {
    var W = retroWeek(), dias = (S.days || []).filter(function (d) { return d >= W.de && d <= W.ate; }).sort(), xb = S.xpByDay || {}, xp = 0, best = null;
    for (var i = 0; i < 7; i++) { var d = addDays(W.de, i), v = xb[d] || 0; xp += v; if (v && (!best || v > xb[best])) best = d; }
    var cad = (S.caderno || []).filter(function (c) { return c.at >= W.de && c.at <= W.ate; }), exp = cad.length ? cad[(dias.length * 7 + xp) % cad.length] : null;
    return { W: W, dias: dias, xp: xp, best: best, bestXp: best ? xb[best] : 0, exp: exp };
  }
  function retroCard() {
    if (!S.test) return null; var R0 = retroData();
    if (!R0.dias.length || S.wrapSeen === R0.W.de) return null;
    return el("button", { cls: "card retro-card", type: "button", onclick: function () { retroOpen(); } }, el("span", { cls: "retro-ic", text: "📊" }),
      el("span", { cls: "fone-t" }, el("b", { text: "Sua retrospectiva da semana" }), el("small", { text: R0.dias.length + (R0.dias.length === 1 ? " dia" : " dias") + " de treino · toque pra ver e postar no story" })), el("span", { cls: "set-go", text: "›" }));
  }
  function retroOpen(force) {
    var R0 = retroData(); if (!R0.dias.length && !force) return;
    var br = function (iso) { var p = iso.split("-"); return p[2] + "/" + p[1]; }, nd = R0.dias.length;
    var frase = nd >= 5 ? "Constância de atleta. Tô orgulhoso! 🏆" : nd >= 3 ? "Bom ritmo! Bora fechar 5 essa semana?" : "Começo é começo. Essa semana a gente dobra! 💪";
    var SL = [
      ["retro-s1", "Sua semana no Destravando 🔓", br(R0.W.de) + " a " + br(R0.W.ate), null],
      ["retro-s2", nd + " de 7 dias", frase, "🔥"],
      ["retro-s3", "+" + R0.xp + " XP", R0.best ? "Seu melhor dia foi " + DSEM[new Date(R0.best + "T12:00:00").getDay()] + " (" + R0.bestXp + " XP)." : "Bora somar mais XP essa semana!", "⭐"],
      ["retro-s4", R0.exp ? "“" + R0.exp.k + "”" : "Expressão da semana", R0.exp ? R0.exp.pt + " · sua expressão da semana" : "Termine treinos pra guardar expressões no caderno.", "💬"],
      ["retro-s5", "🔥 " + streak() + (streak() === 1 ? " dia seguido" : " dias seguidos"), "Falou, validou! Compartilha e marca @inglescomjoaquim 😉", null]
    ];
    var i = 0, tmr = null, bars = el("div", { cls: "st-bars" }), body = el("div", { cls: "st-body" });
    SL.forEach(function () { bars.append(el("i", null, el("b"))); });
    var ov = el("div", { cls: "story", role: "dialog", "aria-modal": "true" }, bars, el("button", { cls: "st-x", type: "button", "aria-label": "Fechar", text: "✕", onclick: close }), body);
    function close() { clearTimeout(tmr); ov.remove(); S.wrapSeen = R0.W.de; persist(); var c = root.querySelector(".retro-card"); if (c) c.remove(); }
    function show(k) {
      i = Math.max(0, Math.min(SL.length - 1, k)); clearTimeout(tmr); var x = SL[i];
      [].forEach.call(bars.children, function (b, n) { b.className = n < i ? "done" : n === i ? "on" : ""; });
      body.className = "st-body " + x[0]; body.replaceChildren(x[3] ? el("div", { cls: "st-em", text: x[3] }) : el("img", { cls: "st-logo", src: "/academia/app/icon-192.png", alt: "" }), el("h1", { cls: "keep-emo", text: x[1] }), el("p", { text: x[2] }));
      if (i === SL.length - 1) body.append(el("button", { cls: "btn big gold", type: "button", text: "📲 Postar no story", onclick: function (e) { e.stopPropagation(); retroShare(R0, frase); } }));
      else tmr = setTimeout(function () { show(i + 1); }, 4500);
    }
    ov.addEventListener("click", function (e) { if (e.target.closest(".st-x,.btn")) return; var r = ov.getBoundingClientRect(); show(e.clientX < r.width * 0.3 ? i - 1 : i + 1); });
    document.body.append(ov); show(0); buzz(10);
  }
  function retroShare(R0, frase) {
    var cv = document.createElement("canvas"); cv.width = 1080; cv.height = 1920; var c = cv.getContext("2d");
    var g = c.createLinearGradient(0, 0, 1080, 1920); g.addColorStop(0, "#F6E3B4"); g.addColorStop(.55, "#F4EBDD"); g.addColorStop(1, "#E9C9CF"); c.fillStyle = g; c.fillRect(0, 0, 1080, 1920);
    var img = new Image(); img.onload = function () {
      c.save(); c.translate(540, 360); c.rotate(-0.06); c.drawImage(img, -150, -150, 300, 300); c.restore();
      c.textAlign = "center"; c.fillStyle = "#6F2A3D"; c.font = "700 64px Fraunces, Georgia, serif"; c.fillText("Minha semana no Destravando", 540, 640);
      c.fillStyle = "#211A10"; c.font = "800 190px Fraunces, Georgia, serif"; c.fillText(R0.dias.length + "/7", 540, 880);
      c.font = "600 52px Inter, sans-serif"; c.fillText("dias de treino", 540, 960);
      c.font = "800 110px Fraunces, Georgia, serif"; c.fillStyle = "#8E3A52"; c.fillText("+" + R0.xp + " XP", 540, 1160);
      c.fillStyle = "#211A10"; c.font = "700 60px Inter, sans-serif"; c.fillText("🔥 " + streak() + (streak() === 1 ? " dia seguido" : " dias seguidos"), 540, 1300);
      if (R0.exp) { c.font = "italic 600 58px Fraunces, Georgia, serif"; c.fillStyle = "#6F2A3D"; c.fillText("“" + R0.exp.k + "”", 540, 1460); c.font = "500 40px Inter, sans-serif"; c.fillStyle = "#5b5040"; c.fillText(R0.exp.pt, 540, 1520); }
      c.fillStyle = "#6F2A3D"; c.font = "700 92px Caveat, cursive"; c.fillText("Falou, validou!", 540, 1700);
      c.fillStyle = "#211A10"; c.font = "700 44px Inter, sans-serif"; c.fillText("@inglescomjoaquim", 540, 1800); c.font = "500 34px Inter, sans-serif"; c.fillStyle = "#5b5040"; c.fillText("destravando.inglescomjoaquim.com", 540, 1852);
      cv.toBlob(function (b) { var f = new File([b], "minha-semana-destravando.jpg", { type: "image/jpeg" });
        if (navigator.canShare && navigator.canShare({ files: [f] })) navigator.share({ files: [f], text: "Minha semana no Destravando 🔓 @inglescomjoaquim" }).catch(function () {});
        else { var a = el("a", { href: URL.createObjectURL(b), download: "minha-semana-destravando.jpg" }); document.body.append(a); a.click(); a.remove(); } }, "image/jpeg", 0.92);
    }; img.src = "/academia/app/icon-512.png";
  }
  // 🤝 DESAFIO COM AMIGO
  var AMIGOS = null;
  function joinInvite() { var c = lsGet("dtv-amigo"); if (!c || !ACC) return; api("amigos", "POST", { codigo: c }).then(function (r) { try { localStorage.removeItem("dtv-amigo"); } catch (e) {} if (r.ok) { AMIGOS = null; SFX.win(); notice("🤝 Você entrou no desafio com " + r.amigo + "! Um vê a ofensiva do outro."); } else if (r._status !== 0) notice(r.error || "Não deu certo o convite."); }); }
  function inviteText(code) { return "Bora treinar inglês comigo no Destravando? 15 min por dia, e um vê a ofensiva do outro 🔥 Entra pelo meu link: https://destravando.inglescomjoaquim.com/?amigo=" + code; }
  function invite(code) { var t = inviteText(code); if (navigator.share) navigator.share({ text: t }).catch(function () {}); else location.href = "https://wa.me/?text=" + encodeURIComponent(t); }
  function amigosCard() {
    if (!ACC || PROF) return null;
    var box = el("button", { cls: "card amigos-card", type: "button", onclick: function () { pushNav(); amigosPage(); } }, el("span", { cls: "retro-ic", text: "🤝" }),
      el("span", { cls: "fone-t" }, el("b", { text: "Desafio com amigos" }), el("small", { text: "Chame alguém pra treinar junto: um vê a ofensiva do outro." })), el("span", { cls: "set-go", text: "›" }));
    function fill(r) { if (!r || !r.amigos || !r.amigos.length) return; var sm = box.querySelector("small"), hoje = r.amigos.filter(function (a) { return a.treinouHoje; }).length;
      sm.textContent = r.amigos.slice(0, 3).map(function (a) { return a.nome.split(" ")[0] + " " + (a.treinouHoje ? "✅" : "⏳") + " 🔥" + a.foguinho; }).join(" · ") + (r.amigos.length > 3 ? " · +" + (r.amigos.length - 3) : ""); }
    if (AMIGOS) fill(AMIGOS); else api("amigos").then(function (r) { if (r && r.codigo) { AMIGOS = r; fill(r); } });
    return box;
  }
  function amigosPage() {
    var w = screen(); w.append(topBar(home), el("h1", { text: "Desafio com amigos" }), skel());
    api("amigos").then(function (r) {
      if (!r || !r.codigo) { w.querySelector(".skel").replaceWith(emptyBox("Entre na sua conta pra usar o desafio.", "O desafio fica salvo na conta, pra funcionar em qualquer celular.", null, null)); return; }
      AMIGOS = r; var list = el("div", { cls: "card set-card" }, el("span", { cls: "eyebrow", text: "🔥 Ofensiva lado a lado" }));
      var all = [Object.assign({ eu: true }, r.eu)].concat(r.amigos).sort(function (a, b) { return b.foguinho - a.foguinho; });
      all.forEach(function (a) {
        var right = a.eu ? el("span", { cls: "am-eu", text: "você" }) : a.treinouHoje ? el("span", { cls: "am-ok", text: "✅ treinou" }) : el("button", { cls: "btn sm", type: "button", disabled: a.jaCutuqueiHoje, text: a.jaCutuqueiHoje ? "👉 cutucado" : "👉 Cutucar", onclick: function (e) {
          var b = e.currentTarget; b.disabled = true; b.textContent = "⏳";
          api("amigos", "POST", { cutucar: a.id }).then(function (x) { if (x.ok) { b.textContent = "👉 cutucado"; buzz(15); notice(x.sent ? "👉 Cutucada enviada pro celular de " + a.nome.split(" ")[0] + "!" : "👉 Cutucada registrada! " + a.nome.split(" ")[0] + " não ativou a notificação: manda um zap 😉"); } else { b.disabled = false; b.textContent = "👉 Cutucar"; notice(x.error || "Não deu certo."); } }); } });
        list.append(el("div", { cls: "set-row" + (a.eu ? " am-me" : "") }, el("span", { cls: "am-av", text: a.nome.charAt(0).toUpperCase() }), el("span", { cls: "set-t" }, el("b", { text: a.eu ? (ACC.name || "Você").split(" ")[0] : a.nome }), el("small", { text: "🔥 " + a.foguinho + (a.foguinho === 1 ? " dia" : " dias") + " · " + a.nivel + (a.eu ? "" : a.treinouHoje ? "" : " · ainda não treinou hoje") })), right));
      });
      if (!r.amigos.length) list.append(el("p", { cls: "small", text: "Ainda é só você aqui. Chame alguém: treinar com companhia dobra a constância 😉" }));
      var cod = el("input", { type: "text", placeholder: "Código (ex.: K7Q2XA)", maxlength: "12", autocapitalize: "characters", autocomplete: "off" }), err = errBox();
      var join = el("button", { cls: "btn", type: "button", text: "Entrar no desafio", onclick: function () { err.show(""); api("amigos", "POST", { codigo: cod.value }).then(function (x) { if (x.ok) { SFX.win(); notice("🤝 Agora você e " + x.amigo + " estão no desafio!"); amigosPage(); } else err.show(x.error || "Não deu certo."); }); } });
      w.querySelector(".skel").replaceWith(list);
      w.append(el("div", { cls: "card set-card" }, el("span", { cls: "eyebrow", text: "📲 Chamar alguém" }),
          el("p", { cls: "small", text: "Seu código: " }), el("div", { cls: "am-code", text: r.codigo }),
          el("button", { cls: "btn big gold", type: "button", text: "📲 Convidar amigo", onclick: function () { invite(r.codigo); } })),
        el("div", { cls: "card set-card form" }, el("span", { cls: "eyebrow", text: "🔑 Recebeu um código?" }), cod, err, join), menuBar("voce"));
    });
  }
  // ⬆️ JANELA QUE SOBE DE BAIXO: alcinha em cima, arrasta pra baixo pra fechar (igual iPhone)
  function sheetify(ov, card, close) {
    ov.classList.add("bsheet"); card.classList.add("bs-card"); card.prepend(el("div", { cls: "bs-h", "aria-hidden": "true" }));
    var y0 = null, dy = 0;
    card.addEventListener("touchstart", function (e) { if (card.scrollTop > 0) return; y0 = e.touches[0].clientY; dy = 0; card.style.transition = "none"; }, { passive: true });
    card.addEventListener("touchmove", function (e) { if (y0 == null) return; dy = Math.max(0, e.touches[0].clientY - y0); card.style.transform = "translateY(" + dy + "px)"; }, { passive: true });
    card.addEventListener("touchend", function () { if (y0 == null) return; y0 = null; card.style.transition = ""; if (dy > 90) { card.style.transform = "translateY(110%)"; setTimeout(close, 180); } else card.style.transform = ""; });
  }
  // 👋 BOAS-VINDAS DO APP (só na 1ª vez que abre pelo ícone, sem conta): 3 telas deslizantes
  function onboarding(done) {
    var w = screen(); w.classList.add("onb-wrap");
    var S3 = [["🎧", "Aqui você não assiste aula.", "Você <b>treina</b>: ouve gente de verdade, repete, erra e acerta. É prática, do jeito que o seu cérebro aprende."],
      ["⏱️", "15 minutinhos por dia.", "Um treino curto e diferente todo dia, com <b>cena real</b>, <b>fofoca</b> e <b>frases-chave</b>. O segredo é a constância."],
      ["🚀", "Do zero ao B2.", "Um teste rapidinho mostra o seu nível e o app monta o caminho. Falou, validou!"]];
    var track = el("div", { cls: "onb-track" }), dots = el("div", { cls: "onb-dots" });
    S3.forEach(function (x, i) { track.append(el("section", { cls: "onb-slide" }, i === 0 ? el("img", { cls: "onb-ic", src: "/academia/app/icon-192.png", alt: "" }) : el("div", { cls: "onb-em", text: x[0] }), el("h1", { text: x[1] }), el("p", { html: x[2] }))); dots.append(el("i", { cls: i ? "" : "on" })); });
    var nx = el("button", { cls: "btn big gold", type: "button", text: "Próximo →" });
    function idx() { return Math.round(track.scrollLeft / Math.max(1, track.clientWidth)); }
    function fin() { try { localStorage.setItem("dtv-onb", "1"); } catch (e) {} done(); }
    track.addEventListener("scroll", function () { var i = idx(); [].forEach.call(dots.children, function (d, k) { d.className = k === i ? "on" : ""; }); nx.textContent = i >= 2 ? "Começar →" : "Próximo →"; }, { passive: true });
    nx.onclick = function () { var i = idx(); if (i >= 2) return fin(); track.scrollTo({ left: (i + 1) * track.clientWidth, behavior: "smooth" }); };
    w.append(el("button", { cls: "onb-skip linkish", type: "button", text: "Pular", onclick: fin }), track, dots, nx);
  }
  // 👤 ABA "VOCÊ": tudo da conta num lugar só, estilo Ajustes
  function youPage() {
    var w = screen(), x = xpLevel(), n = (ACC && ACC.name) || S.name || "Você";
    var row = function (ic, t, sub, right) { return el("div", { cls: "set-row" }, el("span", { cls: "set-ic", text: ic }), el("span", { cls: "set-t" }, el("b", { text: t }), sub ? el("small", { text: sub }) : null), right || null); };
    function sw(on, fn) { var b = el("button", { cls: "sw" + (on ? " on" : ""), type: "button", role: "switch", "aria-checked": on ? "true" : "false", onclick: function () { fn(!b.classList.contains("on"), b); } }, el("i")); return b; }
    function setSw(b, on) { b.classList.toggle("on", on); b.setAttribute("aria-checked", on ? "true" : "false"); }
    w.append(topBar(home), el("section", { cls: "you-head" }, el("div", { cls: "you-av", text: n.trim().charAt(0).toUpperCase() }), el("div", null, el("h1", { text: n }), el("p", { cls: "small", text: (ACC && ACC.email) || "Progresso só neste aparelho" })),
      el("div", { cls: "you-badges" }, el("span", { text: "🎯 " + LVL.toUpperCase() }), el("span", { text: "⭐ " + x.name }), el("span", { text: "🔥 " + streak() + (streak() === 1 ? " dia" : " dias") }))));
    // notificações
    var g1 = el("div", { cls: "card set-card" }, el("span", { cls: "eyebrow", text: "🔔 Lembretes" }));
    if (PUSH_OK && ACC) {
      var pb = sw(!!S.pushOn && window.Notification && Notification.permission === "granted", function (on, b) {
        if (on) { var tmp = el("button"); pushOn(tmp, null); var t = setInterval(function () { if (S.pushOn) { setSw(b, true); clearInterval(t); } else if (!tmp.disabled && tmp.textContent.indexOf("Ativar") > -1) clearInterval(t); }, 400); return; }
        navigator.serviceWorker.ready.then(function (reg) { return reg.pushManager.getSubscription(); }).then(function (sub) { if (sub) { api("push", "DELETE", { endpoint: sub.endpoint }); return sub.unsubscribe(); } })
          .then(function () { S.pushOn = null; persist(); setSw(b, false); try { navigator.clearAppBadge && navigator.clearAppBadge(); } catch (e) {} notice("🔕 Notificação desligada neste celular."); });
      });
      g1.append(row("📲", "Notificação no celular", "1 por dia, só se você ainda não treinou", pb));
    } else g1.append(row("📲", "Notificação no celular", IOS && !STANDALONE ? "Instale o app na tela de início pra ativar" : "Este navegador não aceita notificação", null));
    if (ACC) {
      var eb = sw(true, function (on, b) { setSw(b, on); api("preferencias", "POST", { emailLembrete: on }).then(function (r) { if (!r.ok) { setSw(b, !on); notice(r.error || "Não deu certo."); } }); });
      g1.append(row("✉️", "Lembrete por e-mail", "Na hora escolhida, se você ainda não treinou", eb));
      // ⏰ horário do lembrete (e-mail e notificação), na hora local da pessoa
      var hs = el("select", { cls: "set-sel", "aria-label": "Horário do lembrete" });
      for (var h = 6; h <= 23; h++) hs.append(el("option", { value: String(h), text: (h < 10 ? "0" : "") + h + ":00" }));
      hs.value = String(S.remHora || 19);
      hs.onchange = function () { var v = Number(hs.value); api("preferencias", "POST", { hora: v }).then(function (r) { if (r && r.ok) { S.remHora = v; persist(); notice("⏰ Combinado: lembrete às " + hs.options[hs.selectedIndex].text + "."); } else notice((r && r.error) || "Não deu certo."); }); };
      g1.append(row("⏰", "Horário do lembrete", "No fuso do seu celular", hs));
      api("preferencias").then(function (r) { if (r && typeof r.emailLembrete === "boolean") setSw(eb, r.emailLembrete); if (r && r.hora) { hs.value = String(r.hora); S.remHora = r.hora; } });
    }
    g1.append(row("🔊", "Sons dos exercícios", "Acerto, erro e comemoração", sw(SFX.isOn(), function (on, b) { if (SFX.isOn() !== on) SFX.toggle(); setSw(b, SFX.isOn()); })));
    w.append(g1);
    // 🔐 entrar com Face ID / digital
    if (ACC && window.PublicKeyCredential) {
      var fb2 = sw(!!lsGet("dtv-faceid"), function (on, b) {
        if (on) faceOn(null, function (ok) { setSw(b, ok); });
        else { try { localStorage.removeItem("dtv-faceid"); } catch (e) {} setSw(b, false); notice("Desligado neste celular: da próxima vez, entre com e-mail e senha."); }
      });
      w.append(el("div", { cls: "card set-card" }, el("span", { cls: "eyebrow", text: "🔐 Acesso" }), row("🙂", "Entrar com " + faceName(), "Sem digitar senha neste celular", fb2)));
    }
    w.append(vacationBox());
    if (!STANDALONE) { var ic = installCard(); if (ic) w.append(ic); }
    var g2 = el("div", { cls: "card set-card" }, el("span", { cls: "eyebrow", text: "💬 Ajuda" }),
      el("button", { cls: "set-row set-btn", type: "button", onclick: feedbackOpen }, el("span", { cls: "set-ic", text: "🐞" }), el("span", { cls: "set-t" }, el("b", { text: "Achou um problema?" }), el("small", { text: "Me conta, chega direto pra mim" })), el("span", { cls: "set-go", text: "›" })),
      el("a", { cls: "set-row set-btn", href: "/privacidade.html", target: "_blank" }, el("span", { cls: "set-ic", text: "🔒" }), el("span", { cls: "set-t" }, el("b", { text: "Privacidade" }), el("small", { text: "Seus dados servem só pro seu acesso" })), el("span", { cls: "set-go", text: "›" })));
    if (ACC) w.append(el("div", { cls: "card set-card" }, el("span", { cls: "eyebrow", text: "🤝 Amigos" }), el("button", { cls: "set-row set-btn", type: "button", onclick: function () { pushNav(); amigosPage(); } }, el("span", { cls: "set-ic", text: "🔥" }), el("span", { cls: "set-t" }, el("b", { text: "Desafio com amigos" }), el("small", { text: "Ofensiva lado a lado e cutucadas" })), el("span", { cls: "set-go", text: "›" }))));
    w.append(g2);
    // 🚪 sair da conta (Thiago 29/11: "precisa ter um botão pra deslogar")
    if (ACC) w.append(el("div", { cls: "card set-card" }, el("span", { cls: "eyebrow", text: "🔐 Conta" }),
      row("📧", ACC.email || "", "Seu progresso fica salvo na conta", null),
      el("button", { cls: "set-row set-btn sair-row", type: "button", onclick: askLogout }, el("span", { cls: "set-ic", text: "🚪" }), el("span", { cls: "set-t" }, el("b", { text: "Sair da conta" })), el("span", { cls: "set-go", text: "›" }))));
    else w.append(accountCard());
    w.append(el("p", { cls: "small center you-ver", text: "Destravando · Inglês com Joaquim · Falou, validou!" }), menuBar("voce"));
  }
  // 📲 GUIA "COLOQUE O DESTRAVANDO NO SEU CELULAR" (Thiago 29/11: "tem que deixar muito claro e visível")
  var SHARE_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12"/><path d="M7.5 7.5 12 3l4.5 4.5"/><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"/></svg>';
  var ADD_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8.5v7M8.5 12h7"/></svg>';
  function inApp() { return /Instagram|FBAN|FBAV|FB_IAB|Line\/|TikTok|musical_ly|Snapchat/i.test(navigator.userAgent); }
  function isMobile() { return IOS || /Android/.test(navigator.userAgent); }
  function installSteps() {
    var box = el("div", { cls: "inst-guide" });
    if (inApp()) box.append(el("div", { cls: "inst-warn" }, el("b", { text: "⚠️ Você abriu pelo Instagram (ou outro app)." }), el("span", { text: IOS ? "Toque nos ••• no canto e escolha “Abrir no navegador” (Safari). Lá você consegue instalar." : "Toque nos ⋮ no canto e escolha “Abrir no Chrome”. Lá você consegue instalar." })));
    function step(n, ic, t, sub) { return el("div", { cls: "inst-step" }, el("span", { cls: "inst-n", text: n }), el("span", { cls: "inst-ic", html: ic }), el("span", { cls: "inst-t" }, el("b", { html: t }), sub ? el("small", { text: sub }) : null)); }
    var icon = '<img src="/academia/app/icon-96.png" alt="">';
    if (IOS) box.append(step("1", SHARE_SVG, "Toque em <u>Compartilhar</u>", "O quadradinho com a seta pra cima, na barra do Safari (embaixo ou em cima)."),
      step("2", ADD_SVG, "Toque em <u>Adicionar à Tela de Início</u>", "Se não aparecer, role a lista pra baixo."),
      step("3", "✅", "Toque em <u>Adicionar</u>", "No canto de cima, à direita."),
      step("4", icon, "Abra sempre pelo ícone", "Na primeira vez, entre com o mesmo e-mail e senha. Depois ele abre direto, em tela cheia."));
    else if (/Android/.test(navigator.userAgent)) {
      box.append(el("button", { cls: "btn big gold inst-go", type: "button", hidden: !INSTALL_EVT, text: "📲 Instalar agora", onclick: function () { if (!INSTALL_EVT) return; INSTALL_EVT.prompt(); INSTALL_EVT.userChoice.then(function (c) { if (c && c.outcome === "accepted") { S.installed = today(); persist(); notice("📲 Pronto! O Destravando está na sua tela inicial."); } INSTALL_EVT = null; }); } }));
      box.append(step("1", "⋮", "Toque nos <u>3 pontinhos</u> do Chrome", "No canto de cima, à direita."), step("2", ADD_SVG, "Toque em <u>Instalar app</u>", "Ou “Adicionar à tela inicial”."), step("3", icon, "Abra sempre pelo ícone", "Tela cheia, como app, e com lembrete do treino."));
    } else box.append(el("p", { cls: "inst-pc", html: "Abra <b>destravando.inglescomjoaquim.com</b> no seu celular e siga o passo a passo que aparece lá. É no celular que o Destravando vira app 😉" }));
    return box;
  }
  function installGuide(next, depoisCadastro) {
    next = next || home; var w = screen(); w.classList.add("inst-page");
    w.append(el("div", { cls: "inst-hero" }, el("img", { src: "/academia/app/icon-192.png", alt: "" }),
        el("span", { cls: "eyebrow", text: depoisCadastro ? "✅ Conta criada · falta 1 passo" : "📲 Destravando no celular" }),
        el("h1", { html: "Coloque o Destravando <mark>no seu celular</mark>" }),
        el("p", { text: "Fica com ícone na tela, abre em tela cheia como app e te lembra de treinar. Leva 10 segundos." })),
      installSteps(),
      el("button", { cls: "btn big", type: "button", text: isMobile() ? "Já coloquei ✅" : "Entendi →", onclick: function () { if (isMobile()) { S.installed = S.installed || today(); persist(); } next(); } }),
      el("button", { cls: "linkish", type: "button", text: "Fazer depois", onclick: function () { var d = new Date(); d.setDate(d.getDate() + 3); S.installHide = isoOf(d); persist(); next(); } }));
  }
  // 👩‍🏫 painel do modo professor
  function profPanel() {
    if (!PROF || document.querySelector(".prof-fab")) return;
    function set(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
    var ph = Number(lsGet("prof:nivel")) || 0;
    var sheet = el("div", { cls: "prof-sheet", hidden: true },
      el("b", { text: "👩‍🏫 Modo professor" }),
      el("p", { cls: "small", text: "Aqui nada mexe no seu progresso de verdade nem no dos alunos. Fica tudo só neste modo." }),
      el("button", { cls: "btn", type: "button", text: "🔄 Começar do zero, como aluno novo", onclick: function () { set(KEY, null); ["academia_comojoga", "academia-menu-visto"].forEach(function (k) { set(PK(k), null); }); location.reload(); } }),
      el("button", { cls: "btn ghost", type: "button", text: ALL ? "🔓 Tudo aberto: LIGADO" : "🔒 Tudo aberto: desligado", onclick: function () { set("prof:tudo", ALL ? null : "1"); location.reload(); } }),
      el("span", { cls: "small", text: "Nível da trilha:" }),
      el("div", { cls: "prof-row" }, ["a1", "a2"].concat(B1_READY ? ["b1", "b2"] : []).map(function (lv) { return el("button", { cls: "soft" + (LVL === lv ? " on" : ""), type: "button", text: lv.toUpperCase(), onclick: function () { if (lv !== LVL) setLevel(lv); } }); })),
      el("span", { cls: "small", text: "Fase das habilidades:" }),
      el("div", { cls: "prof-row" }, [["Real", 0], ["🌱", 1], ["🌿", 2], ["🌳", 3], ["🍎", 4]].map(function (x) { return el("button", { cls: "soft" + (ph === x[1] ? " on" : ""), type: "button", text: x[0], onclick: function () { set("prof:nivel", x[1] ? String(x[1]) : null); location.reload(); } }); })),
      el("button", { cls: "btn ghost", type: "button", text: "🎉 Ver a tela de evolução", onclick: function () { sheet.hidden = true; evolve("🌿", "🌳", "Árvore", "Ouvido", "3 partes maiores"); } }),
      el("button", { cls: "btn ghost", type: "button", text: "📝 Refazer o teste de nível", onclick: function () { sheet.hidden = true; runTest(); } }),
      el("a", { cls: "linkish", href: "/", text: "🚪 Sair do modo professor" }));
    var fab = el("button", { cls: "prof-fab", type: "button", text: "⚙️ Painel", onclick: function () { sheet.hidden = !sheet.hidden; } });
    document.body.prepend(el("div", { cls: "prof-bar" }, el("span", { text: "👩‍🏫 Modo professor · não mexe no seu progresso" }), fab)); document.body.append(sheet);
  }
  profPanel();

  try { if (Q.get("amigo")) localStorage.setItem("dtv-amigo", Q.get("amigo")); } catch (e) {}
  // ---------- início ----------
  Promise.all([loadIndex(), loadParts(), probeConta()]).then(syncDown).then(function () {
    // (o botão flutuante "Problema?" saiu: virou o ícone de ajuda no topo de cada tela)
    if (Q.get("teste") === "1") return runTest();
    if (PROF && Q.get("cert")) { var cw = screen(); cw.append(topBar(home), certCard(Q.get("cert"), 82)); return; } // professor: ver o certificado
    if (Q.get("resultado") === "1" && S.test) return result();
    if (Q.get("instalar") === "1" && !STANDALONE) return installGuide(function () { if (CONTA_OK && !ACC && !PROF) landing(); else S.test ? home() : welcome(); });
    // 🔐 quem já treina sem conta: cria a conta (o progresso do aparelho vai junto)
    // 📲 aberto pelo ícone (app instalado) e sem conta: vai direto pro Entrar, sem a página de vendas (Thiago 28/11)
    if (CONTA_OK && !ACC && !PROF && S.skipAccUntil !== today()) { if (!STANDALONE) return landing(); return lsGet("dtv-onb") ? loginFromLanding() : onboarding(loginFromLanding); }
    S.test ? home() : welcome();
    // 📲 atalhos do ícone (segurar o ícone no Android): ?ir=treino | erros | caderno
    var IR = Q.get("ir"); if (IR && S.test) setTimeout(function () { if (IR === "treino") runDaily(); else if (IR === "erros" && myErrors().length) runErrors(); else if (IR === "caderno") cadernoPage(); else if (IR === "progresso") progressPage(); else if (IR === "amigos") amigosPage(); else if (IR === "fone") fonePage(); else if (IR === "retro") retroOpen(true); }, 60);
  }).catch(function () { root.innerHTML = "<p class='boot'>Não consegui carregar. Confira a internet e recarregue.</p>"; });
})();
