/* Ámsterdam en bici · web app compartida (Marcos e Isabel) */
"use strict";
const API = "https://oktgcpydxuczcfvzripn.supabase.co/functions/v1/api";
const ANON = "sb_publishable_Vbfurh41gaorwJ8zTeZgmA_Z19fPs26";

const TYPES = { ver: "Ver", comer: "Comer", diseno: "Diseño", bici: "Bici", base: "Base", ferri: "Ferri", otro: "Otro" };
const DAYN = { sab: "Sáb", dom: "Dom", lun: "Lun" };
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const col = t => `var(--${TYPES[t] ? t : "otro"})`;
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { } },
  del(k) { try { localStorage.removeItem(k); } catch { } },
};
const ico = {
  go: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l18-8-8 18-2-8-8-2z"/></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s7-6.5 7-12a7 7 0 10-14 0c0 5.5 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></svg>',
  map: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16v4z"/></svg>',
  ask: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16v11H9l-5 4V5z"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  move: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18M3 12h18M8 7l4-4 4 4M8 17l4 4 4-4M7 8l-4 4 4 4M17 8l4 4-4 4"/></svg>',
};

let S = store.get("state", null);       // estado compartido (copia local)
let code = store.get("code", "");
let who = store.get("who", "Marcos");
let curTab = "ruta", curDay = null, busy = false;

/* ---------- API ---------- */
async function api(action, payload = {}) {
  const r = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: ANON, "x-trip-code": code },
    body: JSON.stringify({ action, who, ...payload }),
  });
  let data = null;
  try { data = await r.json(); } catch { }
  if (r.status === 401) { logout("El código no es correcto."); throw new Error("Código incorrecto"); }
  if (!r.ok) throw new Error(data?.error || "Error " + r.status);
  return data;
}
function toast(t, ms = 2600) {
  let el = $(".gtoast");
  if (!el) { el = document.createElement("div"); el.className = "gtoast"; el.setAttribute("role", "status"); document.body.appendChild(el); }
  el.textContent = t; el.hidden = false;
  clearTimeout(toast._t); toast._t = setTimeout(() => el.hidden = true, ms);
}
let refreshSeq = 0, appliedSeq = 0;
async function refresh(quiet = true) {
  const seq = ++refreshSeq;
  try {
    const s = await api("state");
    if (seq < appliedSeq) return;
    appliedSeq = seq;
    S = s; store.set("state", s); $("#offline").hidden = true;
    renderAll();
  } catch (e) {
    if (!navigator.onLine || e instanceof TypeError) $("#offline").hidden = false;
    else if (!quiet) toast(e.message);
  }
}
async function act(action, payload, okMsg) {
  try { const r = await api(action, payload); if (okMsg) toast(okMsg); await refresh(); return r; }
  catch (e) { toast("No se ha guardado: " + e.message, 4000); throw e; }
}

/* ---------- Entrada ---------- */
function logout(msg) {
  store.del("code"); code = "";
  $("#app").hidden = true; $("#login").hidden = false;
  $("#loginErr").textContent = msg || "";
}
$("#loginForm").addEventListener("submit", async e => {
  e.preventDefault();
  code = $("#codeIn").value.trim();
  who = $("input[name=who]:checked").value;
  $("#loginErr").textContent = "Comprobando…";
  try {
    await api("ping");
    store.set("code", code); store.set("who", who);
    $("#login").hidden = true; $("#app").hidden = false;
    start();
  } catch (err) { $("#loginErr").textContent = err.message === "Código incorrecto" ? "El código no es correcto." : "No se puede conectar: " + err.message; }
});

/* ---------- Hora de Ámsterdam ---------- */
function nowAms() {
  const f = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Amsterdam", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
  const g = k => f.find(x => x.type === k).value;
  return { date: `${g("year")}-${g("month")}-${g("day")}`, min: (+g("hour") % 24) * 60 + +g("minute"), hm: `${+g("hour") % 24}:${g("minute")}` };
}
const toMin = t => { const m = /^(\d{1,2}):(\d{2})/.exec(t || ""); return m ? +m[1] * 60 + +m[2] : 9999; };
function tick() { $("#clock").textContent = nowAms().hm; }

/* ---------- Google Maps ---------- */
const gq = p => encodeURIComponent(["base", "bici", "ferri"].includes(p.type) || !p.address ? (p.address || p.name) : p.name + ", " + p.address);
const gmPlace = p => p.lat && !p.address ? `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}` : "https://www.google.com/maps/search/?api=1&query=" + gq(p);
const gmGo = p => "https://www.google.com/maps/dir/?api=1&destination=" + (p.address ? gq(p) : `${p.lat},${p.lng}`) + "&travelmode=bicycling";
const placeById = id => S?.places.find(p => p.id === id);

/* ---------- Rutas en bici y tiempo ---------- */
const routeMem = store.get("routes", {});
function dayPoints(d) {
  const pts = [];
  daySteps(d).forEach(s => { const p = placeById(s.place_id); if (!p || s.minor || p.lat == null) return; const ll = [p.lat, p.lng]; const last = pts[pts.length - 1]; if (!last || last[0] !== ll[0] || last[1] !== ll[1]) pts.push(ll); });
  return pts;
}
async function getRoute(points) {
  if (points.length < 2) return null;
  const key = points.map(p => p[0].toFixed(5) + "," + p[1].toFixed(5)).join(";");
  if (routeMem[key]) return routeMem[key];
  const r = await api("route", { points });
  routeMem[key] = r;
  const keys = Object.keys(routeMem); if (keys.length > 30) delete routeMem[keys[0]];
  store.set("routes", routeMem);
  return r;
}
const kmTxt = m => (m / 1000).toFixed(1).replace(".", ",") + " km";
const minTxt = s => { const m = Math.max(1, Math.round(s / 60)); return m < 60 ? m + " min" : Math.floor(m / 60) + " h " + String(m % 60).padStart(2, "0") + " min"; };
function haversine(a, b) { const R = 6371e3, r = x => x * Math.PI / 180; const dLa = r(b[0] - a[0]), dLn = r(b[1] - a[1]); const h = Math.sin(dLa / 2) ** 2 + Math.cos(r(a[0])) * Math.cos(r(b[0])) * Math.sin(dLn / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); }

let W = store.get("weather", null);
async function loadWeather() {
  if (W && Date.now() - W.at < 2 * 3600e3) return;
  try { const w = await api("weather"); W = { at: Date.now(), w }; store.set("weather", W); if (curTab === "ruta") renderRuta(); } catch { }
}
const WCODE = c => c == null ? "" : c === 0 ? "Despejado" : c <= 2 ? "Algo nuboso" : c === 3 ? "Nublado" : c <= 48 ? "Niebla" : c <= 57 ? "Llovizna" : c <= 67 ? "Lluvia" : c <= 77 ? "Nieve" : c <= 82 ? "Chubascos" : c <= 86 ? "Nieve" : "Tormenta";
function weatherHtml(D) {
  if (!W?.w?.hourly) return "";
  const h = W.w.hourly, dd = W.w.daily; const di = dd.time.indexOf(D.date); if (di < 0) return "";
  const cells = [];
  h.time.forEach((t, i) => { if (!t.startsWith(D.date)) return; const hr = +t.slice(11, 13); if (hr < 10 || hr > 20 || hr % 2) return;
    const p = h.precipitation_probability[i] ?? 0;
    cells.push(`<div class="wh"><span>${hr}h</span><b>${Math.round(h.temperature_2m[i])}°</b><i style="--p:${p}%"></i><small>${p}%</small></div>`); });
  const sunset = (dd.sunset[di] || "").slice(11, 16);
  return `<div class="weather" aria-label="Previsión del tiempo"><div class="wtop"><span><b>${Math.round(dd.temperature_2m_min[di])}–${Math.round(dd.temperature_2m_max[di])}°</b> · ${dd.precipitation_sum[di] > 0.2 ? dd.precipitation_sum[di].toFixed(1).replace(".", ",") + " mm de lluvia" : "sin lluvia apreciable"}</span><span>Puesta de sol ${sunset}</span></div><div class="whours">${cells.join("")}</div><div class="small">Probabilidad de lluvia por horas · Open-Meteo</div></div>`;
}

/* ---------- Ruta ---------- */
function daySteps(d) { return S.steps.filter(s => s.day === d).sort((a, b) => toMin(a.time) - toMin(b.time)); }
function nextStopHtml(D) {
  const n = nowAms(); if (n.date !== D.date) return "";
  const st = daySteps(D.id).filter(s => !s.minor && s.place_id);
  const nx = st.find(s => toMin(s.time) >= n.min - 20); if (!nx) return "";
  const p = placeById(nx.place_id); if (!p) return "";
  const dist = meLL && p.lat != null ? " · a " + kmTxt(haversine(meLL, [p.lat, p.lng]) * 1.3) + " aprox." : "";
  return `<div class="nextstop"><div><span class="small">Siguiente · ${esc(nx.time)}${dist}</span><b>${esc(nx.title)}</b></div><a class="btn primary" href="${gmGo(p)}" target="_blank" rel="noopener">${ico.go}Ir</a></div>`;
}
function renderRuta() {
  if (!S) return;
  if (!curDay) { const d = nowAms().date; curDay = (S.days.find(x => x.date === d) || {}).id || store.get("day", S.days[0]?.id); }
  $("#dayTabs").innerHTML = S.days.map(d => `<button type="button" data-day="${d.id}" aria-pressed="${d.id === curDay}"><b>${esc(d.label)}</b><span>${esc(d.zone)}</span></button>`).join("");
  const D = S.days.find(d => d.id === curDay); if (!D) return;
  let n = 0;
  const steps = daySteps(curDay).map(s => {
    const p = s.place_id && placeById(s.place_id);
    const num = s.minor ? "" : ++n;
    const ride = s.km ? `<div class="ride">${esc(s.km)} km · ${esc(s.min)} min en bici</div>` : "";
    const acts = p && !s.minor ? `<div class="actions"><a class="btn primary" href="${gmGo(p)}" target="_blank" rel="noopener">${ico.go}Ir en bici</a>${p.lat != null ? `<button class="btn" type="button" data-show="${esc(p.id)}">${ico.map}Mapa</button>` : `<button class="btn" type="button" data-place="${esc(p.id)}">${ico.pin}Colocar en mapa</button>`}</div>` : "";
    const dot = s.minor ? `<span class="dot leg"></span>` : `<span class="dot" style="background:${p ? col(p.type) : "var(--muted)"}">${num}</span>`;
    return `<li class="step${s.minor ? " minor" : ""}" data-t="${esc(s.time)}"><div class="t">${esc(s.time)}</div>${dot}<div class="body">${ride}<h3>${esc(s.title)}</h3>${s.note ? `<div class="sub">${esc(s.note)}</div>` : ""}${acts}<button class="iconbtn edit" type="button" data-editstep="${s.id}" aria-label="Editar parada">${ico.edit}</button></div></li>`;
  }).join("");
  const legs = (D.legs || []).map((l, i) => `<a href="https://www.google.com/maps/dir/?api=1&${esc(l.query)}" target="_blank" rel="noopener"><span>${esc(l.label)}</span><b>Tramo ${i + 1} ↗</b></a>`).join("");
  $("#day").innerHTML = `${nextStopHtml(D)}<div class="dayhead"><h2>${esc(D.title)}</h2>${D.sub ? `<p>${esc(D.sub)}</p>` : ""}<div class="meta"><span class="pill" id="dayKm">${esc(D.km || "")}</span>${D.light ? `<span class="pill warn">${esc(D.light)}</span>` : ""}</div></div>
   ${weatherHtml(D)}
   <ol class="timeline">${steps}</ol>
   <div class="addrow"><button class="btn" type="button" id="addStep">${ico.plus}Añadir parada</button></div>
   ${legs ? `<section class="block"><h3 class="label">Ruta completa en Google Maps</h3><div class="legs">${legs}</div></section>` : ""}
   ${D.note ? `<div class="note">${esc(D.note)}</div>` : ""}`;
  markNow();
  const pts = dayPoints(curDay), forDay = curDay;
  getRoute(pts).then(r => { if (r && forDay === curDay && $("#dayKm")) $("#dayKm").textContent = "Ruta en bici: " + kmTxt(r.distance) + " · " + minTxt(r.duration); }).catch(() => { });
}
function markNow() {
  if (!S) return;
  const n = nowAms(), D = S.days.find(d => d.id === curDay); const li = $$("#day .step");
  li.forEach(e => e.classList.remove("now", "past"));
  if (!D || n.date !== D.date) return;
  let cur = -1; li.forEach((e, i) => { if (toMin(e.dataset.t) <= n.min) cur = i; });
  li.forEach((e, i) => { if (i < cur) e.classList.add("past"); });
  const el = li[Math.max(cur, 0)]; if (el) el.classList.add("now");
}
$("#dayTabs").addEventListener("click", e => { const b = e.target.closest("[data-day]"); if (!b) return; curDay = b.dataset.day; store.set("day", curDay); renderRuta(); $("#view-ruta").scrollTop = 0; });
$("#day").addEventListener("click", e => {
  const pl = e.target.closest("[data-place]"); if (pl) { const p = placeById(pl.dataset.place); if (p) { go("mapa"); setTimeout(() => startMove(p), 150); } return; }
  const s = e.target.closest("[data-show]"); if (s) { mapFilter = curDay; go("mapa"); setTimeout(() => select(s.dataset.show, true), 80); return; }
  const ed = e.target.closest("[data-editstep]"); if (ed) { stepEditor(S.steps.find(x => x.id === ed.dataset.editstep)); return; }
  if (e.target.closest("#addStep")) stepEditor({ day: curDay, time: "", title: "", km: "", min: "", note: "", minor: false, place_id: null });
});

/* ---------- Hoja inferior ---------- */
function openSheet(html) {
  $("#sheet").innerHTML = html; $("#sheet").hidden = false; $("#sheetBg").hidden = false;
  setTimeout(() => { const f = $("#sheet input, #sheet textarea, #sheet select"); f && f.focus({ preventScroll: true }); }, 50);
}
function closeSheet() { $("#sheet").hidden = true; $("#sheetBg").hidden = true; $("#sheet").innerHTML = ""; }
$("#sheetBg").onclick = closeSheet;
function confirmBtn(btn, label, fn) {
  if (btn.dataset.armed) { fn(); return; }
  btn.dataset.armed = "1"; const old = btn.textContent; btn.textContent = label;
  setTimeout(() => { if (btn.isConnected) { delete btn.dataset.armed; btn.textContent = old; } }, 3000);
}

function placeOptions(sel) {
  const ps = [...S.places].sort((a, b) => (a.name || "").localeCompare(b.name || "", "es"));
  return `<option value="">— Sin sitio —</option>` + ps.map(p => `<option value="${esc(p.id)}"${p.id === sel ? " selected" : ""}>${esc(p.name)}</option>`).join("");
}
function stepEditor(s) {
  openSheet(`<h2>${s.id ? "Editar parada" : "Nueva parada"}</h2>
  <form id="stepForm">
    <div class="grid2"><div class="field"><label for="sf-time">Hora</label><input id="sf-time" type="time" value="${esc((s.time || "").padStart(5, "0"))}"></div>
    <div class="field"><label for="sf-day">Día</label><select id="sf-day">${S.days.map(d => `<option value="${d.id}"${d.id === s.day ? " selected" : ""}>${esc(d.label)}</option>`).join("")}</select></div></div>
    <div class="field"><label for="sf-title">Qué</label><input id="sf-title" type="text" value="${esc(s.title)}" required></div>
    <div class="field"><label for="sf-place">Sitio del mapa</label><select id="sf-place">${placeOptions(s.place_id)}</select></div>
    <div class="grid2"><div class="field"><label for="sf-km">Km desde la anterior</label><input id="sf-km" type="text" inputmode="decimal" value="${esc(s.km)}"></div>
    <div class="field"><label for="sf-min">Minutos en bici</label><input id="sf-min" type="text" value="${esc(s.min)}"></div></div>
    <div class="field"><label for="sf-note">Nota</label><input id="sf-note" type="text" value="${esc(s.note)}"></div>
    <label class="chipradio"><input type="checkbox" id="sf-minor"${s.minor ? " checked" : ""}><span>Paso sin bici (vuelo, bus…)</span></label>
    <div class="actions">${s.id ? `<button class="btn danger" type="button" id="sf-del">${ico.trash}Borrar</button>` : ""}<button class="btn ghost" type="button" id="sf-cancel">Cancelar</button><button class="btn primary" type="submit">Guardar</button></div>
  </form>`);
  $("#sf-cancel").onclick = closeSheet;
  if (s.id) $("#sf-del").onclick = e => confirmBtn(e.currentTarget, "¿Seguro? Toca otra vez", async () => { closeSheet(); await act("deleteStep", { id: s.id }, "Parada borrada"); });
  $("#stepForm").onsubmit = async e => {
    e.preventDefault();
    const t = $("#sf-time").value.replace(/^0(\d):/, "$1:");
    const step = { id: s.id, day: $("#sf-day").value, time: t, title: $("#sf-title").value.trim(), place_id: $("#sf-place").value || null, km: $("#sf-km").value.trim(), min: $("#sf-min").value.trim(), note: $("#sf-note").value.trim(), minor: $("#sf-minor").checked };
    if (!step.title) { const pl = placeById(step.place_id); if (pl) step.title = pl.name; else return; }
    closeSheet(); await act("saveStep", { step }, "Parada guardada");
  };
}

function placeEditor(p) {
  let geo = p.lat != null ? { lat: p.lat, lng: p.lng } : null;
  const days = p.days || [];
  openSheet(`<h2>${p.id ? "Editar sitio" : "Nuevo sitio"}</h2>
  <form id="placeForm">
    <div class="field"><label for="pf-name">Nombre</label><input id="pf-name" type="text" value="${esc(p.name)}" required></div>
    <div class="field"><label for="pf-addr">Dirección</label><div class="inline"><input id="pf-addr" type="text" value="${esc(p.address)}" placeholder="Calle y número, o nombre del sitio"><button class="btn" type="button" id="pf-find">Buscar</button></div>
      <div class="georesults" id="pf-res"></div><span class="geook" id="pf-ok">${geo ? "Ubicación fijada en el mapa" : ""}</span></div>
    <div class="field"><span>Tipo</span><div class="checkrow">${Object.entries(TYPES).map(([k, v]) => `<label class="chipradio"><input type="radio" name="pf-type" value="${k}"${(p.type || "ver") === k ? " checked" : ""}><span>${v}</span></label>`).join("")}</div></div>
    <div class="field"><span>Días</span><div class="checkrow">${S.days.map(d => `<label class="chipradio"><input type="checkbox" name="pf-day" value="${d.id}"${days.includes(d.id) ? " checked" : ""}><span>${esc(d.label)}</span></label>`).join("")}</div></div>
    <div class="field"><label for="pf-notes">Notas</label><textarea id="pf-notes" placeholder="Horario, precio, por qué ir…">${esc(p.notes)}</textarea></div>
    <div class="actions">${p.id ? `<button class="btn danger" type="button" id="pf-del">${ico.trash}Borrar</button>` : ""}<button class="btn ghost" type="button" id="pf-cancel">Cancelar</button><button class="btn primary" type="submit">Guardar</button></div>
  </form>`);
  $("#pf-cancel").onclick = closeSheet;
  $("#pf-find").onclick = async () => {
    const q = $("#pf-addr").value.trim() || $("#pf-name").value.trim(); if (!q) return;
    $("#pf-res").innerHTML = `<span class="small">Buscando…</span>`;
    try {
      const r = await api("geocode", { q: /amsterdam/i.test(q) ? q : q + ", Amsterdam" });
      if (!r.length) { $("#pf-res").innerHTML = `<span class="small">No lo encuentro. Prueba con otra forma de escribirlo, o guárdalo y colócalo en el mapa con «Mover».</span>`; return; }
      $("#pf-res").innerHTML = r.map((x, i) => `<button type="button" data-i="${i}">${esc(x.label)}</button>`).join("");
      $$("#pf-res button").forEach(b => b.onclick = () => { geo = r[+b.dataset.i]; $("#pf-res").innerHTML = ""; $("#pf-ok").textContent = "Ubicación fijada en el mapa"; });
    } catch (e) { $("#pf-res").innerHTML = `<span class="small">${esc(e.message)}</span>`; }
  };
  if (p.id) $("#pf-del").onclick = e => confirmBtn(e.currentTarget, "¿Seguro? Toca otra vez", async () => { closeSheet(); select(null); await act("deletePlace", { id: p.id }, "Sitio borrado"); });
  $("#placeForm").onsubmit = async e => {
    e.preventDefault();
    const place = { id: p.id, name: $("#pf-name").value.trim(), address: $("#pf-addr").value.trim(), type: $("input[name=pf-type]:checked").value, days: $$("input[name=pf-day]:checked").map(i => i.value), notes: $("#pf-notes").value.trim() };
    if (geo) { place.lat = geo.lat; place.lng = geo.lng; }
    closeSheet();
    const r = await act("savePlace", { place }, "Sitio guardado");
    if (r && r.lat == null) { toast("No encontré la dirección: arrastra el punto a su sitio en el mapa.", 5000); go("mapa"); setTimeout(() => startMove(r), 200); }
    else if (curTab === "mapa") setTimeout(() => select(r.id, true), 200);
  };
}

/* ---------- Mapa ---------- */
let map, markers = {}, routeLine, mapFilter = "all", selId = null, meMarker = null, meLL = store.get("lastLoc", null), watchId = null, dragId = null;
function initMap() {
  map = L.map("map", { zoomControl: false }).setView([52.368, 4.895], 13);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, crossOrigin: true, attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>' }).addTo(map);
  map.on("click", () => { if (dragId) cancelMove(); else select(null); });
  map.on("contextmenu", e => { if (dragId) return; placeEditor({ name: "", address: "", type: "ver", days: curDay ? [curDay] : [], notes: "", lat: e.latlng.lat, lng: e.latlng.lng }); });
  $("#legend").innerHTML = Object.entries(TYPES).filter(([k]) => k !== "otro").map(([k, v]) => `<span><i style="background:${col(k)}"></i>${v}</span>`).join("");
  drawMarkers(); fit();
}
function renderMapbar() {
  $("#mapbar").innerHTML = [["all", "Todo"], ...S.days.map(d => [d.id, d.label])].map(([k, l]) => `<button type="button" data-f="${k}" aria-pressed="${k === mapFilter}">${esc(l)}</button>`).join("") + `<button type="button" data-f="near" aria-pressed="false">Cerca de mí</button><button type="button" data-f="fit" aria-pressed="false">Encuadrar</button>`;
}
function nearMe() {
  const list = () => {
    const ps = S.places.filter(p => p.lat != null).map(p => ({ p, d: haversine(meLL, [p.lat, p.lng]) })).sort((a, b) => a.d - b.d).slice(0, 10);
    openSheet(`<h2>Cerca de ti</h2><div class="nearlist">${ps.map(({ p, d }) => `<button type="button" data-near="${esc(p.id)}"><i style="background:${col(p.type)}"></i><span><b>${esc(p.name)}</b><small>${esc(TYPES[p.type] || "")}${(p.days || []).length ? " · " + p.days.map(x => esc(DAYN[x] || x)).join(", ") : ""}</small></span><em>${d < 1000 ? Math.round(d / 10) * 10 + " m" : kmTxt(d)}</em></button>`).join("")}</div><p class="small">Distancia en línea recta desde donde estás.</p><div class="actions"><button class="btn ghost" type="button" id="nearClose">Cerrar</button></div>`);
    $("#nearClose").onclick = closeSheet;
    $$("#sheet [data-near]").forEach(b => b.onclick = () => { closeSheet(); select(b.dataset.near, true); });
  };
  if (meLL && watchId != null) list(); else { toast("Buscando tu ubicación…"); startLocate(list); }
}
function drawMarkers() {
  if (!map || !S) return;
  renderMapbar();
  Object.values(markers).forEach(m => m.remove()); markers = {}; if (routeLine) { routeLine.remove(); routeLine = null; }
  const order = {}; let pts = [];
  if (mapFilter !== "all") { let n = 0; daySteps(mapFilter).forEach(s => { const p = placeById(s.place_id); if (!p || s.minor) return; n++; (order[p.id] = order[p.id] || []).push(n); if (p.lat != null) pts.push([p.lat, p.lng]); }); }
  S.places.filter(p => p.lat != null && (mapFilter === "all" || (p.days || []).includes(mapFilter) || order[p.id])).forEach(p => {
    const lab = order[p.id] ? order[p.id].join("·") : "";
    const m = L.marker([p.lat, p.lng], { icon: L.divIcon({ className: "", html: `<div class="pin${p.id === selId ? " sel" : ""}" style="background:${col(p.type)}"><span>${lab}</span></div>`, iconSize: [28, 28], iconAnchor: [14, 28] }), title: p.name, zIndexOffset: p.id === "hotel" ? 500 : 0, draggable: p.id === dragId });
    m.on("click", e => { L.DomEvent.stopPropagation(e); if (!dragId) select(p.id); });
    m.on("dragend", async () => { const ll = m.getLatLng(); dragId = null; $("#mapHint").hidden = true; await act("savePlace", { place: { id: p.id, lat: ll.lat, lng: ll.lng } }, "Ubicación guardada"); select(p.id); });
    m.addTo(map); markers[p.id] = m;
  });
  pts = pts.filter((p, i) => !i || p[0] !== pts[i - 1][0] || p[1] !== pts[i - 1][1]);
  if (!meRoute) $("#routeInfo").hidden = true;
  if (pts.length > 1) {
    const red = getComputedStyle(document.documentElement).getPropertyValue("--fiets").trim() || "#B83A2C";
    // Mientras llega la ruta real se ve una línea discontinua recta.
    routeLine = L.polyline(pts, { color: red, weight: 3, opacity: .6, dashArray: "2 8", lineCap: "round" }).addTo(map);
    const forFilter = mapFilter;
    getRoute(pts).then(r => {
      if (!r || forFilter !== mapFilter || !map) return;
      if (routeLine) routeLine.remove();
      routeLine = L.layerGroup([
        L.polyline(r.geometry, { color: "#fff", weight: 8, opacity: .85 }),
        L.polyline(r.geometry, { color: red, weight: 5, opacity: .95 }),
      ]).addTo(map);
      Object.values(markers).forEach(m => m.setZIndexOffset(100));
      if (!meRoute) { $("#routeInfo").innerHTML = `<b>${kmTxt(r.distance)}</b> · ${minTxt(r.duration)} pedaleando`; $("#routeInfo").hidden = false; }
    }).catch(() => { });
  }
  if (meLL) showMe(meLL, false);
  if (meRoute) meRoute.addTo(map);
}
let meRoute = null;
async function startMove(p) {
  if (!map) { go("mapa"); await new Promise(r => setTimeout(r, 120)); }
  $("#card").hidden = true;
  if (p.lat == null) {
    // Sin ubicación: se coloca en el centro del mapa y luego se arrastra.
    const c = map.getCenter();
    try { await api("savePlace", { place: { id: p.id, lat: c.lat, lng: c.lng } }); await refresh(); } catch (e) { toast("No se pudo colocar: " + e.message); return; }
    mapFilter = "all";
  }
  dragId = p.id; drawMarkers();
  const m = markers[p.id]; if (m) map.panTo(m.getLatLng());
  $("#mapHint").innerHTML = 'Arrastra el punto a su sitio <button type="button" class="linkbtn" id="cancelMove">Cancelar</button>';
  $("#mapHint").hidden = false;
  $("#cancelMove").onclick = e => { e.stopPropagation(); cancelMove(); };
}
function cancelMove() { if (!dragId) return; dragId = null; $("#mapHint").hidden = true; if (map) drawMarkers(); }
async function routeFromMe(p) {
  const run = async () => {
    try {
      const r = await getRoute([meLL, [p.lat, p.lng]]);
      if (meRoute) meRoute.remove();
      meRoute = L.layerGroup([L.polyline(r.geometry, { color: "#fff", weight: 8, opacity: .85 }), L.polyline(r.geometry, { color: "#2F80ED", weight: 5 })]).addTo(map);
      map.fitBounds(L.latLngBounds(r.geometry), { padding: [70, 50] });
      $("#routeInfo").innerHTML = `Hasta <b>${esc(p.name)}</b>: <b>${kmTxt(r.distance)}</b> · ${minTxt(r.duration)} <button type="button" class="linkbtn" id="clearMeRoute">Quitar</button>`;
      $("#routeInfo").hidden = false;
      $("#clearMeRoute").onclick = () => { meRoute.remove(); meRoute = null; $("#routeInfo").hidden = true; drawMarkers(); };
    } catch (e) { toast("No se pudo calcular la ruta: " + e.message, 4000); }
  };
  if (meLL) return run();
  toast("Buscando tu ubicación…");
  startLocate(() => run());
}
function fit() { const ll = Object.values(markers).map(m => m.getLatLng()); if (ll.length) map.fitBounds(L.latLngBounds(ll), { padding: [60, 40], maxZoom: 15 }); }
function select(id, pan) {
  selId = id;
  Object.entries(markers).forEach(([k, m]) => { const d = m.getElement()?.querySelector(".pin"); d && d.classList.toggle("sel", k === id); });
  const c = $("#card"); if (!id) { c.hidden = true; return; }
  const p = placeById(id); if (!p) { c.hidden = true; return; }
  const inSteps = S.steps.filter(s => s.place_id === id).map(s => esc(`${DAYN[s.day] || s.day} ${s.time}`));
  c.innerHTML = `<button class="close" type="button" aria-label="Cerrar">×</button>
   <div class="kind" style="color:${col(p.type)}">${TYPES[p.type] || "Otro"}${(p.days || []).length ? " · " + p.days.map(d => esc(DAYN[d] || d)).join(", ") : ""}${inSteps.length ? " · Ruta " + inSteps.join(", ") : ""}</div>
   <h3>${esc(p.name)}</h3>${p.address ? `<div class="addr">${esc(p.address)}</div>` : ""}${p.notes ? `<div class="notes">${esc(p.notes)}</div>` : ""}
   <div class="actions"><a class="btn primary" href="${gmGo(p)}" target="_blank" rel="noopener">${ico.go}Ir en bici</a><a class="btn" href="${gmPlace(p)}" target="_blank" rel="noopener">${ico.pin}Google Maps</a></div>
   <div class="actions"><button class="btn" type="button" data-a="route">${ico.go}Ruta desde aquí</button><button class="btn" type="button" data-a="addstep">${ico.plus}Añadir a la ruta</button><button class="btn" type="button" data-a="edit">${ico.edit}Editar</button><button class="btn" type="button" data-a="move">${ico.move}Mover</button><button class="btn" type="button" data-a="ask">${ico.ask}Preguntar</button></div>`;
  c.hidden = false;
  $(".close", c).onclick = () => select(null);
  $("[data-a=edit]", c).onclick = () => placeEditor(p);
  $("[data-a=route]", c).onclick = () => { c.hidden = true; routeFromMe(p); };
  $("[data-a=addstep]", c).onclick = () => stepEditor({ day: (mapFilter !== "all" ? mapFilter : curDay) || (p.days || [])[0] || "sab", time: "", title: p.name, km: "", min: "", note: "", minor: false, place_id: p.id });
  $("[data-a=move]", c).onclick = () => startMove(p);
  $("[data-a=ask]", c).onclick = () => { go("claude"); $("#msg").value = `Sobre ${p.name}: `; $("#msg").focus(); };
  if (pan && p.lat != null) { if (!markers[id]) { mapFilter = "all"; drawMarkers(); } map.setView([p.lat, p.lng], Math.max(map.getZoom(), 15), { animate: true }); }
}
$("#mapbar").addEventListener("click", e => { const b = e.target.closest("[data-f]"); if (!b) return; if (b.dataset.f === "fit") { fit(); return; } if (b.dataset.f === "near") { nearMe(); return; } mapFilter = b.dataset.f; select(null); drawMarkers(); fit(); });
$("#addPlaceBtn").onclick = () => placeEditor({ name: "", address: "", type: "ver", days: curDay ? [curDay] : [], notes: "" });
function showMe(ll, pan) {
  if (!map) return;
  if (!meMarker) meMarker = L.marker(ll, { icon: L.divIcon({ className: "", html: '<div class="me-dot"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }), zIndexOffset: 1000, interactive: false });
  meMarker.setLatLng(ll).addTo(map);
  if (pan) map.setView(ll, Math.max(map.getZoom(), 15));
}
function startLocate(onFirst) {
  if (!navigator.geolocation) { toast("Este móvil no da la ubicación al navegador."); return; }
  if (watchId != null) { if (meLL) { showMe(meLL, true); onFirst && onFirst(); } return; }
  $("#locBtn").classList.add("on");
  let first = true;
  watchId = navigator.geolocation.watchPosition(pos => {
    meLL = [pos.coords.latitude, pos.coords.longitude]; store.set("lastLoc", meLL);
    showMe(meLL, first && !onFirst); if (first && onFirst) onFirst(); first = false;
  }, err => { $("#locBtn").classList.remove("on"); watchId = null; toast(err.code === 1 ? "Sin permiso de ubicación. Actívalo en los ajustes del navegador." : "No se pudo obtener la ubicación."); }, { enableHighAccuracy: true, maximumAge: 15000 });
}
$("#locBtn").onclick = () => startLocate();

/* ---------- Claude ---------- */
let attached = [];
function md(s) {
  // Markdown mínimo: párrafos, listas, **negrita**, `código` copiable y enlaces.
  const inline = t => esc(t).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/`([^`]+)`/g, '<code class="cp">$1</code>').replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>').replace(/(^|\s)(https?:\/\/[^\s<]+)/g, '$1<a href="$2" target="_blank" rel="noopener">$2</a>');
  const out = []; let list = null;
  for (const line of String(s || "").split("\n")) {
    const m = /^\s*[-*•]\s+(.*)/.exec(line);
    if (m) { if (!list) { list = []; } list.push(`<li>${inline(m[1])}</li>`); continue; }
    if (list) { out.push(`<ul>${list.join("")}</ul>`); list = null; }
    if (line.trim()) out.push(`<p>${inline(line)}</p>`);
  }
  if (list) out.push(`<ul>${list.join("")}</ul>`);
  return out.join("");
}
function renderChat() {
  if (!S) return;
  const log = $("#chatlog");
  const atBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 80;
  const msgs = S.messages || [];
  if (!msgs.length && !busy) {
    log.innerHTML = `<div class="empty"><p><b>Pregunta o pide cambios a Claude</b>, escribiendo o con el micrófono. Puede cambiar la ruta, el mapa y las fichas, leer vuestros documentos y buscar en internet.</p><ul><li>«Añade al mapa el Mercado de Noordermarkt para el lunes»</li><li>«Retrasa la cena del sábado a las 19:30»</li><li>«¿Abre hoy el Stedelijk hasta qué hora?»</li><li>«Lee la reserva del hotel: ¿a qué hora es el check-out?»</li></ul></div>`;
    return;
  }
  log.innerHTML = msgs.map(m => `<div class="msg ${m.role}"><span class="who">${esc(m.role === "user" ? m.author : "Claude")}</span>${m.role === "user" ? `<p>${esc(m.content)}</p>` : md(m.content)}${m.meta?.changes ? `<div class="changes">${m.meta.changes.map(c => `<span>${esc(c.what)}</span>`).join("")}</div>` : ""}${m.meta?.docs ? `<div class="changes">${m.meta.docs.map(id => `<span>📎 ${esc((S.docs.find(d => d.id === id) || {}).name || "documento")}</span>`).join("")}</div>` : ""}</div>`).join("")
    + (busy ? `<div class="msg assistant thinking">Claude está pensando…</div>` : "");
  if (atBottom || busy) log.scrollTop = log.scrollHeight;
}
function renderAttached() {
  const el = $("#attached");
  el.hidden = !attached.length;
  el.innerHTML = attached.map(id => `<span>📎 ${esc((S.docs.find(d => d.id === id) || {}).name || "documento")} <button class="iconbtn" style="width:20px;height:20px;display:inline-grid" type="button" data-un="${id}" aria-label="Quitar">×</button></span>`).join("");
}
$("#attached").addEventListener("click", e => { const b = e.target.closest("[data-un]"); if (b) { attached = attached.filter(x => x !== b.dataset.un); renderAttached(); } });
$("#attachBtn").onclick = () => {
  if (!S.docs.length) { toast("Aún no hay documentos. Súbelos en la pestaña Docs."); return; }
  openSheet(`<h2>Adjuntar documentos</h2><div class="checkrow docpick" style="flex-direction:column">${S.docs.map(d => `<label class="chipradio"><input type="checkbox" value="${d.id}"${attached.includes(d.id) ? " checked" : ""}><span>${esc(d.name)}</span></label>`).join("")}</div><div class="actions"><button class="btn primary" type="button" id="attOk">Listo</button></div>`);
  $("#attOk").onclick = () => { attached = $$("#sheet input:checked").map(i => i.value); closeSheet(); renderAttached(); };
};
const QUICK = ["¿Qué toca ahora y cómo llego?", "¿Va a llover hoy?", "¿Qué hay interesante cerca de mí?", "Recalcula los km de la ruta de hoy", "¿Dónde comemos cerca?"];
function renderQuick() { $("#quick").innerHTML = QUICK.map(q => `<button type="button">${esc(q)}</button>`).join(""); }
$("#quick").addEventListener("click", e => { const b = e.target.closest("button"); if (!b || busy) return; $("#msg").value = b.textContent; send(); });
let speakOn = store.get("speak", false);
function renderSpeak() { $("#speakBtn").setAttribute("aria-pressed", String(speakOn)); $("#speakBtn").setAttribute("aria-label", speakOn ? "Lectura en voz alta activada" : "Lectura en voz alta desactivada"); }
$("#speakBtn").onclick = () => { speakOn = !speakOn; store.set("speak", speakOn); renderSpeak(); if (!speakOn && window.speechSynthesis) speechSynthesis.cancel(); toast(speakOn ? "Claude leerá las respuestas en voz alta" : "Lectura en voz alta desactivada"); };
function speak(text) {
  if (!speakOn || !("speechSynthesis" in window)) return;
  const plain = text.replace(/\*\*|`/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/https?:\/\/\S+/g, "").slice(0, 900);
  const u = new SpeechSynthesisUtterance(plain); u.lang = "es-ES"; u.rate = 1.05;
  const v = speechSynthesis.getVoices().find(v => v.lang && v.lang.startsWith("es")); if (v) u.voice = v;
  speechSynthesis.cancel(); speechSynthesis.speak(u);
}
async function send() {
  const ta = $("#msg"); const text = ta.value.trim(); if (!text || busy) return;
  busy = true; ta.value = ""; autoGrow();
  const docIds = attached; attached = []; renderAttached();
  S.messages = [...(S.messages || []), { role: "user", author: who, content: text, meta: docIds.length ? { docs: docIds } : null }];
  renderChat(); $("#sendBtn").disabled = true;
  try {
    const r = await api("chat", { text, docIds, loc: meLL ? { lat: meLL[0], lng: meLL[1] } : null });
    if (r.changes?.length) toast("Claude ha cambiado la app");
    if (r.reply) speak(r.reply);
  } catch (e) {
    S.messages.push({ role: "assistant", content: "No he podido responder: " + e.message });
  }
  busy = false; $("#sendBtn").disabled = false;
  await refresh(); renderChat();
}
$("#sendBtn").onclick = send;
$("#msg").addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey && !("ontouchstart" in window)) { e.preventDefault(); send(); } });
function autoGrow() { const t = $("#msg"); t.style.height = "auto"; t.style.height = Math.min(t.scrollHeight, 140) + "px"; }
$("#msg").addEventListener("input", autoGrow);
$("#autoSend").checked = store.get("autoSend", true);
renderQuick(); renderSpeak();
$("#autoSend").onchange = e => store.set("autoSend", e.target.checked);

/* Dictado por voz (Web Speech API) */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec = null, listening = false, baseText = "";
function startMic() {
  if (!SR) { toast("Este navegador no permite dictar aquí. Usa el micrófono del teclado.", 4500); $("#msg").focus(); return; }
  if (listening) { rec.stop(); return; }
  rec = new SR(); rec.lang = "es-ES"; rec.interimResults = true; rec.continuous = false;
  baseText = $("#msg").value ? $("#msg").value.trim() + " " : "";
  let finalText = "";
  rec.onresult = e => {
    let interim = ""; finalText = "";
    for (let i = 0; i < e.results.length; i++) { const r = e.results[i]; if (r.isFinal) finalText += r[0].transcript; else interim += r[0].transcript; }
    $("#msg").value = baseText + finalText + interim; autoGrow();
  };
  rec.onerror = e => { if (e.error === "service-not-allowed" || e.error === "language-not-supported") { toast("Aquí no se puede dictar. Toca el campo de texto y usa el micrófono del teclado.", 5000); $("#msg").focus(); return; } if (e.error === "not-allowed") toast("Sin permiso para el micrófono. Actívalo en los ajustes del navegador.", 4500); else if (e.error !== "no-speech" && e.error !== "aborted") toast("Error del micrófono: " + e.error); };
  rec.onend = () => { listening = false; $("#micBtn").classList.remove("on"); if (finalText.trim() && $("#autoSend").checked) send(); };
  try { rec.start(); } catch (e) { toast("No se pudo activar el micrófono."); return; }
  listening = true; $("#micBtn").classList.add("on");
}
$("#micBtn").onclick = startMic;
$("#hdrMic").onclick = () => { go("claude"); startMic(); };

/* ---------- Documentos ---------- */
const fmtSize = b => b > 1e6 ? (b / 1e6).toFixed(1) + " MB" : Math.max(1, Math.round(b / 1e3)) + " KB";
function renderDocs() {
  if (!S) return;
  const urls = S.docUrls || {};
  $("#docs").innerHTML = S.docs.length ? S.docs.map(d => {
    const isImg = d.mime.startsWith("image/");
    const thumb = isImg && urls[d.id] ? `<img src="${esc(urls[d.id])}" alt="" loading="lazy">` : esc((d.name.split(".").pop() || "").slice(0, 4).toUpperCase());
    return `<div class="doc"><div class="thumb">${thumb}</div><div class="dm"><a href="${esc(urls[d.id] || "#")}" target="_blank" rel="noopener">${esc(d.name)}</a><span class="small">${fmtSize(d.size)} · ${esc(d.created_by || "")} · ${new Date(d.created_at).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}</span></div>
     <button class="iconbtn" type="button" data-askdoc="${d.id}" aria-label="Preguntar a Claude">${ico.ask}</button><button class="iconbtn" type="button" data-deldoc="${d.id}" aria-label="Borrar">${ico.trash}</button></div>`;
  }).join("") : `<p class="small" style="margin-top:20px">Todavía no hay documentos.</p>`;
}
$("#docs").addEventListener("click", e => {
  const a = e.target.closest("[data-askdoc]"); if (a) { attached = [a.dataset.askdoc]; renderAttached(); go("claude"); $("#msg").focus(); return; }
  const d = e.target.closest("[data-deldoc]"); if (d) confirmBtn(d, "✓?", () => act("deleteDoc", { id: d.dataset.deldoc }, "Documento borrado"));
});
async function shrinkImage(file) {
  // Las fotos del móvil pesan mucho; se reducen a 2000 px para subirlas rápido y que Claude las pueda leer.
  if (!/^image\/(jpeg|png|webp|heic|heif)$/i.test(file.type) || file.size < 1.5e6) return file;
  try {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas"); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise(r => c.toBlob(r, "image/jpeg", .85));
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch { return file; }
}
$("#fileIn").addEventListener("change", async e => {
  const files = [...e.target.files]; e.target.value = "";
  for (const f0 of files) {
    const prog = document.createElement("p"); prog.className = "progress"; prog.textContent = "Subiendo " + f0.name + "…"; $("#docs").prepend(prog);
    try {
      const f = await shrinkImage(f0);
      if (f.size > 25e6) throw new Error("ocupa más de 25 MB");
      const u = await api("uploadUrl", { name: f.name });
      const r = await fetch(u.signedUrl, { method: "PUT", headers: { "Content-Type": f.type || "application/octet-stream", "x-upsert": "false" }, body: f });
      if (!r.ok) throw new Error("error " + r.status + " al subir");
      await api("registerDoc", { doc: { name: f.name, path: u.path, mime: f.type || "application/octet-stream", size: f.size } });
      toast("Documento subido");
    } catch (err) { toast("No se pudo subir " + f0.name + ": " + err.message, 5000); }
    prog.remove();
  }
  refresh();
});

/* ---------- Viaje ---------- */
function renderViaje() {
  if (!S) return;
  $("#viaje").innerHTML = `
   <section><h3 class="label">Pendientes</h3><div class="checks">${S.checks.map(c => `<div class="ck"><input type="checkbox" id="ck-${c.id}" data-ck="${c.id}"${c.done ? " checked" : ""}><span><label for="ck-${c.id}">${esc(c.label)}</label></span><button class="iconbtn" type="button" data-delck="${c.id}" aria-label="Borrar pendiente">${ico.trash}</button></div>`).join("")}
   <form class="addck" id="addCk"><label class="sr" for="newCk">Nuevo pendiente</label><input id="newCk" placeholder="Añadir pendiente…"><button class="btn" type="submit">Añadir</button></form></div></section>
   ${S.info.map(i => `<div class="infocard"><h3>${esc(i.title)}</h3><div class="md">${md(i.body)}</div><button class="iconbtn edit" type="button" data-editinfo="${esc(i.id)}" aria-label="Editar ficha">${ico.edit}</button></div>`).join("")}
   <div class="actions" style="margin-top:14px"><button class="btn" type="button" id="addInfo">${ico.plus}Nueva ficha</button></div>
   <p class="foot">Toca un número en gris para copiarlo. Conectado como <b>${esc(who)}</b> · <button class="btn ghost" type="button" id="logoutBtn">Cambiar de persona o código</button></p>
   <p class="foot">Mapa © colaboradores de OpenStreetMap. Kilómetros y tiempos estimados sobre plano.</p>`;
}
$("#viaje").addEventListener("change", e => { const c = e.target.closest("[data-ck]"); if (c) act("saveCheck", { check: { id: c.dataset.ck, done: c.checked } }); });
$("#viaje").addEventListener("submit", e => { if (e.target.id !== "addCk") return; e.preventDefault(); const v = $("#newCk").value.trim(); if (v) act("saveCheck", { check: { label: v, sort: S.checks.length } }, "Pendiente añadido"); });
$("#viaje").addEventListener("click", e => {
  const d = e.target.closest("[data-delck]"); if (d) { confirmBtn(d, "✓?", () => act("deleteCheck", { id: d.dataset.delck })); return; }
  const ed = e.target.closest("[data-editinfo]"); if (ed) { infoEditor(S.info.find(i => i.id === ed.dataset.editinfo)); return; }
  if (e.target.closest("#addInfo")) { infoEditor({ title: "", body: "", sort: S.info.length }); return; }
  if (e.target.closest("#logoutBtn")) { logout(); return; }
});
function infoEditor(i) {
  openSheet(`<h2>${i.id ? "Editar ficha" : "Nueva ficha"}</h2><form id="infoForm">
   <div class="field"><label for="if-title">Título</label><input id="if-title" type="text" value="${esc(i.title)}" required></div>
   <div class="field"><label for="if-body">Texto</label><textarea id="if-body" rows="10">${esc(i.body)}</textarea><span class="small">**negrita**, líneas que empiezan por «- » para listas y \`123\` para números que se copian con un toque.</span></div>
   <div class="actions">${i.id ? `<button class="btn danger" type="button" id="if-del">${ico.trash}Borrar</button>` : ""}<button class="btn ghost" type="button" id="if-cancel">Cancelar</button><button class="btn primary" type="submit">Guardar</button></div></form>`);
  $("#if-cancel").onclick = closeSheet;
  if (i.id) $("#if-del").onclick = e => confirmBtn(e.currentTarget, "¿Seguro? Toca otra vez", async () => { closeSheet(); await act("deleteInfo", { id: i.id }, "Ficha borrada"); });
  $("#infoForm").onsubmit = async e => { e.preventDefault(); const info = { id: i.id, title: $("#if-title").value.trim(), body: $("#if-body").value, sort: i.sort }; closeSheet(); await act("saveInfo", { info }, "Ficha guardada"); };
}
document.addEventListener("click", e => {
  const c = e.target.closest("code.cp"); if (!c) return;
  const v = c.textContent.replace(/^#/, "");
  const done = () => toast("Copiado: " + v, 1600);
  if (navigator.clipboard) navigator.clipboard.writeText(v).then(done, () => { }); else done();
});

/* ---------- Pestañas ---------- */
const TABS = ["ruta", "mapa", "claude", "docs", "viaje"];
function go(tab) { if (location.hash !== "#" + tab) location.hash = tab; else show(tab); }
function show(tab) {
  if (tab !== "mapa" && dragId) cancelMove();
  if (!TABS.includes(tab)) tab = "ruta"; curTab = tab;
  TABS.forEach(t => $("#view-" + t).hidden = t !== tab);
  $$("#tabs a").forEach(a => a.dataset.tab === tab ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current"));
  if (tab === "mapa") { if (!map) initMap(); else drawMarkers(); setTimeout(() => map.invalidateSize(), 30); }
  if (tab === "claude") { renderChat(); const l = $("#chatlog"); l.scrollTop = l.scrollHeight; }
  if (tab === "ruta") markNow();
}
addEventListener("hashchange", () => show(location.hash.slice(1)));

function renderAll() {
  if (!S) return;
  renderRuta(); renderDocs(); renderViaje(); renderAttached();
  if (curTab === "claude") renderChat();
  if (map && curTab === "mapa" && !dragId) { drawMarkers(); if (selId) select(selId); }
}

/* ---------- Arranque ---------- */
let started = false;
function start() {
  if (started) { refresh(false); return; }
  started = true;
  tick(); setInterval(() => { tick(); if (curTab === "ruta") markNow(); }, 30000);
  if (S) renderAll();
  show(location.hash.slice(1) || "ruta");
  refresh(false);
  loadWeather(); setInterval(loadWeather, 30 * 60e3);
  // Sincroniza con el otro móvil cada 20 s mientras la app está a la vista y no se está editando.
  setInterval(() => { if (document.visibilityState === "visible" && $("#sheet").hidden && !busy && !dragId) refresh(); }, 20000);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") refresh(); });
  addEventListener("online", () => refresh());
  addEventListener("offline", () => $("#offline").hidden = false);
}
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => { });
if (code) { $("#app").hidden = false; start(); } else { $("#login").hidden = false; }
