const KEY = "qfc-map-state-v1";
const $ = (id) => document.getElementById(id);
let layout;
let items = []; // { id, text, section|null, suggested, checked }

const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ items, text: $("input").value })); } catch {} };
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) ?? {}; } catch { return {}; } };

// Split a free-form list into items: newlines, commas, semicolons, bullets, and " and ".
export function parseList(text) {
  return text
    .split(/[\n,;]+|\s+and\s+/i)
    .map((s) => s.replace(/^\s*(?:[-*•]|\[ ?\])\s*/, "").trim())
    .filter(Boolean);
}

function render() {
  const byId = Object.fromEntries(layout.sections.map((s) => [s.id, s]));
  const groups = layout.sections
    .slice().sort((a, b) => a.order - b.order)
    .map((s) => ({ s, list: items.filter((i) => i.section === s.id) }))
    .filter((g) => g.list.length);
  const unsure = items.filter((i) => !i.section);

  // Map
  const svg = $("map");
  svg.hidden = !items.length;
  svg.innerHTML = layout.sections.map((s) => {
    const g = groups.find((g) => g.s.id === s.id);
    const done = g && g.list.every((i) => i.checked);
    const n = groups.findIndex((g) => g.s.id === s.id) + 1;
    const cls = g ? (done ? "sec done" : "sec has") : "sec";
    return `<g class="${cls}" data-id="${s.id}"><rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" rx="1"/>
      <text x="${s.x + s.w / 2}" y="${s.y + s.h / 2 + 1}">${s.name.split(/[ (]/)[0]}</text>
      ${g ? `<circle class="badge" cx="${s.x + 3}" cy="${s.y + 3}" r="2.6"/><text class="badge-t" x="${s.x + 3}" y="${s.y + 4}" style="text-anchor:middle">${n}</text>` : ""}</g>`;
  }).join("") + `<text x="${layout.entrance.x}" y="99" style="font-size:2.6px;text-anchor:middle;fill:var(--mute)">▲ entrance</text>`;
  svg.querySelectorAll(".sec.has, .sec.done").forEach((el) =>
    el.addEventListener("click", () => $("g-" + el.dataset.id)?.scrollIntoView({ behavior: "smooth", block: "start" })));

  // Groups
  const opts = (sel) => `<option value="">Pick section…</option>` + layout.sections.map((s) => `<option value="${s.id}" ${s.id === sel ? "selected" : ""}>${s.name}</option>`).join("");
  const itemRow = (i, withSelect) => `<label class="item ${i.checked ? "checked" : ""}">
      <input type="checkbox" data-id="${i.id}" ${i.checked ? "checked" : ""} ${withSelect ? "disabled" : ""}>
      <span>${esc(i.text)}</span>
      ${withSelect ? `<select data-assign="${i.id}">${opts(i.suggested)}</select>` : ""}</label>`;
  $("groups").innerHTML =
    (unsure.length ? `<section class="group unsure" id="g-unsure"><h2>Not sure where these are <span>pick a section</span></h2>${unsure.map((i) => itemRow(i, true)).join("")}</section>` : "") +
    groups.map(({ s, list }, idx) => `<section class="group" id="g-${s.id}"><h2>${idx + 1}. ${s.name}<span>${list.filter((i) => i.checked).length}/${list.length}</span></h2>${list.map((i) => itemRow(i)).join("")}</section>`).join("");

  $("groups").querySelectorAll("input[type=checkbox]").forEach((el) =>
    el.addEventListener("change", () => { items.find((i) => i.id === el.dataset.id).checked = el.checked; save(); render(); }));
  $("groups").querySelectorAll("select[data-assign]").forEach((el) =>
    el.addEventListener("change", () => { if (el.value) { items.find((i) => i.id === el.dataset.assign).section = el.value; save(); render(); } }));
}

const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

async function go() {
  const parsed = parseList($("input").value);
  if (!parsed.length) return;
  $("go").disabled = true;
  $("status").textContent = "Finding items…";
  try {
    const res = await fetch("/api/classify", { method: "POST", body: JSON.stringify({ items: parsed }) });
    if (!res.ok) throw new Error((await res.json()).error ?? res.status);
    const { results } = await res.json();
    // Keep checked state for items that were already on the list.
    const prev = new Map(items.map((i) => [i.text.toLowerCase(), i.checked]));
    items = results.map((r, n) => ({ id: `i${Date.now()}_${n}`, text: r.item, section: r.section, suggested: r.suggested, checked: prev.get(r.item.toLowerCase()) ?? false }));
    $("status").textContent = "";
    save(); render();
  } catch (e) {
    $("status").textContent = "Couldn't classify: " + e.message;
  } finally { $("go").disabled = false; }
}

async function init() {
  layout = await (await fetch("/api/layout")).json();
  if (layout.placeholder) $("banner").innerHTML = `<div class="banner">Placeholder store layout — section positions aren't real yet.</div>`;
  const saved = load();
  items = saved.items ?? [];
  $("input").value = saved.text ?? "";
  $("input").addEventListener("input", save);
  $("go").addEventListener("click", go);
  $("clear").addEventListener("click", () => { items = []; $("input").value = ""; save(); render(); });
  render();
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
}
init();
