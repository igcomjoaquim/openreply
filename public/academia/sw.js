// 📲 Destravando · service worker
// - abre na hora: guarda a "casca" do app e os arquivos com ?v= (mudam de nome a cada atualização, então nunca ficam velhos)
// - página: sempre tenta a internet primeiro (atualização chega na hora); sem internet, usa a última guardada
// - 🔔 notificação no celular + número no ícone
var CACHE = "dtv-v1";
self.addEventListener("install", function () { self.skipWaiting(); });
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  var r = e.request; if (r.method !== "GET") return;
  var u = new URL(r.url);
  if (u.origin !== location.origin || u.pathname.indexOf("/api/") === 0) return;
  if (r.mode === "navigate") {
    e.respondWith(fetch(r).then(function (res) { var c = res.clone(); caches.open(CACHE).then(function (ca) { ca.put("/__casca", c); }); return res; })
      .catch(function () { return caches.match("/__casca").then(function (m) { return m || new Response("<meta charset=utf-8><body style='font-family:system-ui;background:#F4EBDD;padding:40px;text-align:center'><h2>📶 Sem internet</h2><p>Assim que a conexão voltar, o Destravando abre.</p></body>", { headers: { "content-type": "text/html; charset=utf-8" } }); }); }));
    return;
  }
  var fixo = u.search.indexOf("v=") > -1 || /\/academia\/app\//.test(u.pathname);
  if (!fixo) return;
  e.respondWith(caches.open(CACHE).then(function (ca) {
    return ca.match(r).then(function (m) { return m || fetch(r).then(function (res) { if (res.ok) ca.put(r, res.clone()); return res; }); });
  }));
});
self.addEventListener("push", function (e) {
  var d = {}; try { d = e.data ? e.data.json() : {}; } catch (x) { d = { title: "Destravando", body: e.data ? e.data.text() : "" }; }
  var jobs = [self.registration.showNotification(d.title || "Destravando", { body: d.body || "", icon: "/academia/app/icon-192.png", badge: "/academia/app/icon-96.png", tag: d.tag || "dtv", data: { url: d.url || "/?app=1" } })];
  if (d.badge && self.navigator && self.navigator.setAppBadge) jobs.push(self.navigator.setAppBadge(d.badge).catch(function () {}));
  e.waitUntil(Promise.all(jobs));
});
self.addEventListener("notificationclick", function (e) {
  e.notification.close();
  var url = (e.notification.data && e.notification.data.url) || "/?app=1";
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (cs) {
    for (var i = 0; i < cs.length; i++) { if ("focus" in cs[i]) { cs[i].focus(); return; } }
    return self.clients.openWindow(url);
  }));
});
