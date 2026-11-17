import { CATALOGUE, findBranch, findCustomer, findProduct } from "./data.js";
import { MODELS, extractOrder, getSettings, replayOrder, saveSettings } from "./extract.js";

const SAMPLES = [
  { id: "01-brightwater-cctv-po", title: "Clean PDF purchase order", customer: "Brightwater Security Systems", tag: "CCTV · EUR", blurb: "A tidy typed PO with part numbers, plus one price that's below list." },
  { id: "02-northpoint-fire-site-delivery", title: "Loose descriptions, site delivery", customer: "Northpoint Fire Protection", tag: "Fire · GBP", blurb: "The installer's own codes, an \"as quoted\" price and strict site delivery rules." },
  { id: "03-kelly-handwritten-scan", title: "Handwritten order, phone scan", customer: "Seán Kelly Alarms", tag: "Intruder · EUR", blurb: "A carbon order pad photographed on a phone. No prices, no PO number." },
  { id: "04-meridian-access-project-po", pages: 2, title: "Two-page project PO", customer: "Meridian Access Solutions", tag: "Access · GBP", blurb: "13 lines, phased delivery, T&Cs, and a subtotal that doesn't add up." },
  { id: "05-kingdom-gates-email-order", title: "Order sent by email", customer: "Kingdom Gates & Automation", tag: "Gates · EUR", blurb: "\"For Thursday\", \"usual account\" and a price request mixed in." },
  { id: "06-veiligwerk-dutch-po", title: "Dutch-language PO", customer: "VeiligWerk Beveiliging", tag: "CCTV + Intruder · EUR", blurb: "An inkooporder with Dutch number formats and 21% BTW." },
];

const $ = (sel) => document.querySelector(sel);
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

let run = null; // { id, controller, startedAt, timer, source, order, final, meta }

// ------------------------------------------------------------------ formatting
const money = (v, cur = "EUR") =>
  v == null || Number.isNaN(v) ? "—" : new Intl.NumberFormat(cur === "GBP" ? "en-GB" : "en-IE", { style: "currency", currency: cur }).format(v);
const fmtDate = (iso) => {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return iso || "";
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("en-IE", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
};
const listPrice = (p, cur) => (p ? (cur === "GBP" ? p.price_gbp : p.price_eur) : null);
const val = (v, fallback = '<span class="skeleton"></span>') => (v == null || v === "" ? fallback : esc(v));

// ------------------------------------------------------------------ settings / mode
function refreshMode() {
  const { apiKey, model } = getSettings();
  const pill = $("#modePill");
  const label = MODELS.find((m) => m.id === model)?.label.split(" (")[0] || model;
  pill.classList.toggle("live", !!apiKey);
  pill.textContent = apiKey ? `Live AI · ${label.replace("Claude ", "")}` : "Demo mode · recorded results";
  pill.title = apiKey ? "Documents are read live by Claude" : "Samples play back recorded results. Add an API key to read any document live.";
}

let pendingFile = null;
function openSettings(message) {
  const { apiKey, model, replaySamples } = getSettings();
  $("#apiKey").value = apiKey;
  $("#replaySamples").checked = replaySamples;
  $("#modelSel").innerHTML = MODELS.map((m) => `<option value="${m.id}" ${m.id === model ? "selected" : ""}>${esc(m.label)}</option>`).join("");
  if (message) toast(message);
  $("#settingsDlg").showModal();
}

$("#settingsForm").addEventListener("submit", (e) => {
  e.preventDefault();
  saveSettings({ apiKey: $("#apiKey").value, model: $("#modelSel").value, replaySamples: $("#replaySamples").checked });
  refreshMode();
  $("#settingsDlg").close();
  toast(getSettings().apiKey ? "Live AI enabled" : "Demo mode: samples use recorded results");
  const file = pendingFile;
  pendingFile = null;
  if (file && getSettings().apiKey) startRun({ file, name: file.name });
});
$("#settingsDlg").addEventListener("cancel", () => (pendingFile = null));
$("#cancelSettings").addEventListener("click", () => { pendingFile = null; $("#settingsDlg").close(); });
$("#clearKey").addEventListener("click", () => ($("#apiKey").value = ""));
$("#settingsBtn").addEventListener("click", () => openSettings());
$("#modePill").addEventListener("click", () => openSettings());

// ------------------------------------------------------------------ home
function renderSamples() {
  $("#sampleGrid").innerHTML = SAMPLES.map(
    (s) => `<button class="sample" data-id="${s.id}" type="button">
      <img src="samples/pages/${s.id}-p1.jpg" alt="" loading="lazy" />
      <div><span class="tag">${esc(s.tag)}</span><h3>${esc(s.title)}</h3><p class="cust">${esc(s.customer)}</p><p>${esc(s.blurb)}</p></div>
    </button>`,
  ).join("");
  $("#sampleGrid").addEventListener("click", (e) => {
    const card = e.target.closest(".sample");
    if (card) startSample(card.dataset.id);
  });
}

const dz = $("#dropzone");
["dragenter", "dragover"].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add("drag"); }));
["dragleave", "drop"].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove("drag"); }));
dz.addEventListener("drop", (e) => handleFile(e.dataTransfer.files[0]));
dz.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); $("#fileInput").click(); } });
$("#fileInput").addEventListener("change", (e) => { handleFile(e.target.files[0]); e.target.value = ""; });
// allow dropping anywhere on the home page
document.addEventListener("dragover", (e) => e.preventDefault());
document.addEventListener("drop", (e) => { e.preventDefault(); if (!$("#home").classList.contains("hidden") && e.target.closest("#dropzone") == null) handleFile(e.dataTransfer.files[0]); });

function handleFile(file) {
  if (!file) return;
  if (!/pdf|png|jpe?g|webp/i.test(file.type) && !/\.pdf$/i.test(file.name)) return toast("Please choose a PDF or an image file.");
  if (!getSettings().apiKey) {
    pendingFile = file;
    return openSettings("Reading your own documents needs live AI. Add an API key to continue.");
  }
  startRun({ file, name: file.name });
}

function startSample(id) {
  const s = SAMPLES.find((x) => x.id === id);
  startRun({ sampleId: id, name: `${s.id}.pdf`, url: `samples/${s.id}.pdf`, pages: s.pages || 1 });
}

// ------------------------------------------------------------------ run
function showView(name) {
  $("#home").classList.toggle("hidden", name !== "home");
  $("#work").classList.toggle("hidden", name !== "work");
  window.scrollTo(0, 0);
}

$("#backBtn").addEventListener("click", resetToHome);
function resetToHome() {
  if (run) {
    run.controller.abort();
    clearInterval(run.timer);
    if (run.source.blobUrl) URL.revokeObjectURL(run.source.blobUrl);
  }
  run = null;
  $("#docViewer").innerHTML = "";
  showView("home");
}

async function startRun(source) {
  if (run) resetToHome();
  source = { ...source, forceReplay: source.forceReplay && !!source.sampleId };
  const controller = new AbortController();
  run = { id: Math.random(), controller, source, order: {}, final: false, startedAt: performance.now(), meta: null };
  const me = run;

  // document viewer
  const viewer = $("#docViewer");
  let url = source.url;
  if (source.file) url = source.blobUrl = URL.createObjectURL(source.file);
  const isImage = source.file && source.file.type.startsWith("image/");
  let docHtml;
  if (source.sampleId) {
    // pre-rendered page images: instant and identical in every browser
    docHtml = `<div class="pages">${Array.from({ length: source.pages }, (_, i) => `<img src="samples/pages/${source.sampleId}-p${i + 1}.jpg" alt="Page ${i + 1}" />`).join("")}</div>`;
  } else if (isImage) docHtml = `<div class="pages"><img src="${url}" alt="Uploaded document" /></div>`;
  else docHtml = `<iframe src="${url}#view=FitH&toolbar=0&navpanes=0" title="Purchase order"></iframe>`;
  viewer.innerHTML = `<div class="doc-scroll">${docHtml}</div><div class="scanline"></div>`;
  $("#docName").innerHTML = `<a href="${url}" target="_blank" rel="noopener">${esc(source.name)}</a>`;

  // order pane skeleton
  buildOrderShell();
  showView("work");
  setSteps({});
  me.timer = setInterval(() => {
    $("#timer").textContent = `AI reading… ${((performance.now() - me.startedAt) / 1000).toFixed(1)}s`;
  }, 100);

  const onPartial = (o) => {
    if (run !== me) return;
    me.order = o || {};
    renderOrder(me.order, false);
    setSteps(me.order);
  };

  try {
    let result;
    const { apiKey, replaySamples } = getSettings();
    const live = !!apiKey && !source.forceReplay && !(source.sampleId && replaySamples);
    if (live) {
      const file = source.file || (await fetchAsFile(source.url, source.name));
      result = await extractOrder(file, { onPartial, signal: controller.signal });
    } else {
      const recorded = await (await fetch(`samples/results/${source.sampleId}.json`)).json();
      result = await replayOrder(recorded, { onPartial, signal: controller.signal });
    }
    if (run !== me) return;
    finish(me, result, live);
  } catch (err) {
    if (err?.name === "AbortError" || run !== me) return;
    console.error(err);
    showError(me, err);
  }
}

async function fetchAsFile(url, name) {
  const blob = await (await fetch(url)).blob();
  return new File([blob], name, { type: "application/pdf" });
}

function finish(me, result, live) {
  clearInterval(me.timer);
  me.final = true;
  me.order = normalise(result.order);
  me.meta = { ...result, live };
  const secs = (result.ms / 1000).toFixed(1);
  $("#timer").textContent = live ? `Read in ${secs}s by ${result.model}` : `Read in ${secs}s (recorded result)`;
  $(".scanline")?.remove();
  setSteps(me.order, true);
  renderOrder(me.order, true);
}

function normalise(o) {
  o.lines = (o.lines || []).map((l, i) => ({ ...l, line: l.line ?? i + 1, quantity: Number(l.quantity) || 0 }));
  o.flags = o.flags || [];
  return o;
}

function showError(me, err) {
  clearInterval(me.timer);
  $(".scanline")?.remove();
  $("#timer").textContent = "";
  let msg = err?.message || String(err);
  if (err?.status === 401) msg = "The API key was rejected. Check it in Settings.";
  else if (err?.status === 429) msg = "Rate limit reached. Wait a moment and try again.";
  else if (err?.status === 529 || err?.status >= 500) msg = "The AI service is busy right now. Try again in a few seconds.";
  else if (/fetch|network/i.test(msg)) msg = "Couldn't reach the AI service. Check the internet connection.";
  const canReplay = !!me.source.sampleId;
  $("#orderBody").innerHTML = `<div class="error-box"><h3>Something went wrong</h3><p>${esc(msg)}</p>
    <button class="primary-btn" id="retryBtn">Try again</button>
    ${canReplay ? '<button class="ghost-btn" id="replayBtn">Show recorded result instead</button>' : ""}
    <button class="ghost-btn" id="setBtn">Settings</button></div>`;
  $("#retryBtn").onclick = () => startRun(me.source);
  $("#setBtn").onclick = () => openSettings();
  if (canReplay)
    $("#replayBtn").onclick = () => startRun({ ...me.source, forceReplay: true });
}

function setSteps(o, final = false) {
  const has = (k) => o && o[k] != null;
  const state = {
    reading: has("summary") || has("customer") ? "done" : "active",
    customer: has("order") ? "done" : has("customer") ? "active" : "",
    order: has("fulfilment") || has("lines") ? "done" : has("order") ? "active" : "",
    lines: has("totals") ? "done" : has("lines") ? "active" : "",
    checks: final ? "done" : has("totals") || has("flags") ? "active" : "",
  };
  document.querySelectorAll("#steps li").forEach((li) => {
    li.className = state[li.dataset.step] || "";
  });
}

// ------------------------------------------------------------------ order rendering
function buildOrderShell() {
  $("#orderBody").innerHTML = `
    <div id="sumBox"></div>
    <div class="cards">
      <div class="card" id="custCard"></div>
      <div class="card" id="ordCard"></div>
      <div class="card" id="fulCard"></div>
    </div>
    <div class="card lines-card">
      <h3><span>Line items</span><span id="lineCount"></span></h3>
      <table class="lines"><colgroup><col class="c-n"><col class="c-c"><col class="c-q"><col><col class="c-m"><col class="c-u"><col class="c-t"></colgroup><thead><tr><th>#</th><th>Customer wrote</th><th class="num">Qty</th><th>Matched product</th><th>Match</th><th class="num">Unit price</th><th class="num">Total</th></tr></thead>
      <tbody id="lineRows"></tbody></table>
      <div class="totals" id="totals"></div>
    </div>
    <div class="card"><h3><span>Needs attention</span><span id="flagCount"></span></h3><div class="flags" id="flagList"><span class="skeleton"></span></div></div>
    <div class="actionbar" id="actionbar"></div>`;
}

const setHTML = (el, html) => { if (el && el.__html !== html) { el.innerHTML = html; el.__html = html; } };

function renderOrder(o, final) {
  const cur = o.order?.currency || "EUR";

  // summary
  setHTML($("#sumBox"), o.summary
    ? `<div class="summary"><div class="spark">✦</div><p><small>AI summary</small>${esc(o.summary)}</p></div>`
    : "");

  // customer
  const c = o.customer || {};
  const acct = c.account ? findCustomer(c.account) : null;
  const acctBadge = !o.customer || c.account === undefined ? "" : acct
    ? `<span class="badge ${c.account_confidence === "high" ? "good" : "warn"}">A/C ${esc(acct.account)}</span>`
    : `<span class="badge warn">No account match</span>`;
  setHTML($("#custCard"), `<h3><span>Customer</span>${acctBadge}</h3>
    <div class="big">${val(c.name)}</div>
    <dl class="kv">
      <dt>Account</dt><dd>${acct ? `${esc(acct.name)}<br><span class="muted">${esc(acct.terms)}</span>` : val(c.account === null ? "—" : undefined)}</dd>
      <dt>Contact</dt><dd>${val(c.contact_name, o.customer ? "—" : undefined)}</dd>
      <dt>Email</dt><dd>${val(c.contact_email, o.customer ? "—" : undefined)}</dd>
      <dt>Phone</dt><dd>${val(c.contact_phone, o.customer ? "—" : undefined)}</dd>
    </dl>`);

  // order details
  const d = o.order || {};
  const dash = o.order ? "—" : undefined;
  setHTML($("#ordCard"), `<h3><span>Order details</span>${o.document?.kind ? `<span class="badge neutral">${esc(kindLabel(o.document))}</span>` : ""}</h3>
    <div class="big">${o.order ? (d.po_number ? `PO ${esc(d.po_number)}` : '<span class="badge warn">No PO number</span>') : '<span class="skeleton"></span>'}</div>
    <dl class="kv">
      <dt>PO date</dt><dd>${val(fmtDate(d.po_date), dash)}</dd>
      <dt>Required by</dt><dd>${d.required_date ? `<b>${esc(fmtDate(d.required_date))}</b>` : val(null, dash)}</dd>
      <dt>Quote ref</dt><dd>${val(d.quote_reference, dash)}</dd>
      <dt>Job / project</dt><dd>${val(d.job_reference, dash)}</dd>
      <dt>Currency</dt><dd>${val(d.currency, dash)}${d.payment_terms ? ` · <span class="muted">${esc(d.payment_terms)}</span>` : ""}</dd>
    </dl>`);

  // fulfilment
  const f = o.fulfilment || {};
  const br = f.branch ? findBranch(f.branch) : null;
  const addr = f.deliver_to ? [f.deliver_to.name, ...(f.deliver_to.address_lines || []), f.deliver_to.postcode, f.deliver_to.country].filter(Boolean).map(esc).join("<br>") : null;
  const fd = o.fulfilment ? "—" : undefined;
  setHTML($("#fulCard"), `<h3><span>Fulfilment</span>${f.method ? `<span class="badge ${f.method === "collection" ? "info" : "neutral"}">${f.method === "collection" ? "Collection" : "Delivery"}</span>` : ""}</h3>
    <div class="big">${br ? `${esc(br.name)} branch` : val(f.branch)}</div>
    <dl class="kv">
      <dt>${f.method === "collection" ? "Collect" : "Deliver to"}</dt><dd>${addr || (f.method === "collection" ? "Customer collects" : val(null, fd))}</dd>
      <dt>Instructions</dt><dd>${val(f.instructions, fd)}</dd>
    </dl>`);

  renderLines(o, final);
  renderTotals(o);

  // flags
  const flags = (o.flags || []).filter((x) => x && x.message);
  const fl = $("#flagList");
  if (!o.flags) {
    setHTML(fl, final ? '<span class="muted">Nothing to check.</span>' : '<span class="skeleton"></span>');
  } else {
    if (fl.__html?.includes("skeleton") || fl.__html === undefined) { fl.innerHTML = ""; fl.__html = ""; }
    flags.forEach((fg, i) => {
      let el = fl.children[i];
      const html = `<span class="ico">${fg.severity === "warning" ? "!" : "i"}</span><span>${esc(fg.message)}</span>`;
      if (!el) { el = document.createElement("div"); el.className = "flag appear"; fl.appendChild(el); }
      el.classList.toggle("warning", fg.severity === "warning");
      el.classList.toggle("info", fg.severity !== "warning");
      setHTML(el, html);
    });
    if (final && flags.length === 0) setHTML(fl, '<span class="muted">Nothing to check. Ready to book.</span>');
  }
  const warnCount = flags.filter((x) => x.severity === "warning").length;
  setHTML($("#flagCount"), o.flags ? (warnCount ? `<span class="badge warn">${warnCount} to check</span>` : `<span class="badge good">All clear</span>`) : "");

  renderActionbar(o, final);
}

function kindLabel(doc) {
  const k = { purchase_order: "Purchase order", email_order: "Email", handwritten_order: "Handwritten", other: "Document" }[doc.kind] || doc.kind;
  return doc.language && doc.language !== "English" ? `${k} · ${doc.language}` : k;
}

const MATCH = {
  high: ["good", "Matched"],
  medium: ["warn", "Check"],
  low: ["warn", "Unsure"],
  none: ["bad", "Not stocked"],
};

let catalogueOptions = null;
function skuOptions(selected) {
  if (!catalogueOptions) {
    const groups = {};
    CATALOGUE.forEach((p) => (groups[p.category] ||= []).push(p));
    catalogueOptions = Object.entries(groups).map(([g, ps]) => `<optgroup label="${esc(g)}">${ps.map((p) => `<option value="${p.sku}">${esc(p.brand)} ${esc(p.mpn)} – ${esc(p.description)}</option>`).join("")}</optgroup>`).join("");
  }
  return `<option value="">— No product / remove line —</option>` + catalogueOptions.replace(`value="${selected}"`, `value="${selected}" selected`);
}

function lineCalc(l, cur) {
  const p = l.sku ? findProduct(l.sku) : null;
  const list = listPrice(p, cur);
  const unit = l.po_unit_price ?? list;
  const variance = l.po_unit_price != null && list ? (l.po_unit_price - list) / list : 0;
  return { p, list, unit, total: unit != null && l.quantity != null ? unit * (Number(l.quantity) || 0) : null, variance };
}

function renderLines(o, final) {
  const cur = o.order?.currency || "EUR";
  const tbody = $("#lineRows");
  const lines = (o.lines || []).filter((l) => l && l.description != null);
  if (!o.lines) {
    setHTML(tbody, `<tr><td colspan="7"><span class="skeleton" style="width:100%"></span></td></tr>`.repeat(3));
    return;
  }
  if (tbody.__html !== undefined) { tbody.innerHTML = ""; tbody.__html = undefined; }
  lines.forEach((l, i) => {
    const { p, list, unit, total, variance } = lineCalc(l, cur);
    const [mcls, mlabel] = MATCH[l.match_confidence] || ["neutral", "…"];
    const priceSub = l.po_unit_price == null
      ? (p ? `<span class="price-sub">list price</span>` : "")
      : Math.abs(variance) > 0.02
        ? `<span class="price-sub" style="color:var(--warn)">list ${money(list, cur)} (${variance > 0 ? "+" : ""}${(variance * 100).toFixed(1)}%)</span>`
        : p ? `<span class="price-sub">= list</span>` : "";
    const rowCls = l.match_confidence === "none" || !l.sku ? "row-bad" : l.match_confidence === "medium" || l.match_confidence === "low" || Math.abs(variance) > 0.02 ? "row-warn" : "";
    const product = p
      ? `<span class="prod-desc"><b>${esc(p.brand)}</b> ${esc(p.description)}</span><span class="prod-sku">${esc(p.sku)} · ${esc(p.mpn)}</span>`
      : l.match_confidence ? `<span class="prod-desc" style="color:var(--bad)">No catalogue match</span>` : `<span class="skeleton"></span>`;
    const html = `<td>${i + 1}</td>
      <td><span class="cust-text">${esc(l.description)}</span>${l.customer_ref ? `<span class="cust-ref">${esc(l.customer_ref)}</span>` : ""}</td>
      <td class="num">${final ? `<input class="qty-input" type="number" min="0" step="1" value="${l.quantity}" data-i="${i}" aria-label="Quantity line ${i + 1}">` : esc(l.quantity ?? "")}</td>
      <td>${product}${l.match_note || final ? `<span class="prod-note">${esc(l.match_note || "")}${final ? `<button type="button" class="link-btn" data-change="${i}">Change</button>` : ""}</span>` : ""}${final ? `<select class="sku-select hidden" data-i="${i}" aria-label="Product line ${i + 1}">${skuOptions(l.sku || "")}</select>` : ""}</td>
      <td>${l.match_confidence ? `<span class="badge ${mcls}">${mlabel}</span>` : ""}</td>
      <td class="num">${unit != null ? money(unit, cur) : l.match_confidence ? "—" : ""}${priceSub}</td>
      <td class="num">${total != null ? money(total, cur) : ""}</td>`;
    let tr = tbody.children[i];
    if (!tr) { tr = document.createElement("tr"); tr.className = "appear"; tbody.appendChild(tr); }
    if (tr.__html !== html) { tr.innerHTML = html; tr.__html = html; }
    tr.classList.toggle("row-warn", rowCls === "row-warn");
    tr.classList.toggle("row-bad", rowCls === "row-bad");
  });
  while (tbody.children.length > lines.length) tbody.lastChild.remove();
  setHTML($("#lineCount"), lines.length ? `<span class="badge neutral">${lines.length} line${lines.length === 1 ? "" : "s"}</span>` : "");
}

function orderValue(o) {
  const cur = o.order?.currency || "EUR";
  return (o.lines || []).reduce((s, l) => s + (lineCalc(l, cur).total || 0), 0);
}

function renderTotals(o) {
  const cur = o.order?.currency || "EUR";
  const t = o.totals;
  const value = orderValue(o);
  let check = "";
  if (t) {
    if (t.po_subtotal == null) check = `<span class="badge neutral">No total on PO</span>`;
    else {
      const diff = value - t.po_subtotal;
      check = Math.abs(diff) < 0.01 ? `<span class="badge good">Matches PO</span>` : `<span class="badge warn">PO says ${money(t.po_subtotal, cur)}</span>`;
    }
  }
  const tax = t?.tax_rate_percent != null ? value * (t.tax_rate_percent / 100) : null;
  setHTML($("#totals"), o.lines ? `
    <div><small>Order value (ex VAT)</small><strong>${money(value, cur)}</strong><br>${check}</div>
    ${tax != null ? `<div><small>VAT @ ${t.tax_rate_percent}%</small><strong>${money(tax, cur)}</strong></div><div><small>Total</small><strong>${money(value + tax, cur)}</strong></div>` : ""}` : "");
}

function minutesSaved(o) {
  // rough manual keying estimate: 3 min for header + 50s per line + 1 min per check
  const lines = (o.lines || []).length;
  return Math.max(3, Math.round(3 + lines * 0.85 + (o.flags || []).length * 0.5));
}

function renderActionbar(o, final) {
  const bar = $("#actionbar");
  if (!final) {
    setHTML(bar, `<span class="stat">AI is reading the document and filling in the order…</span><span class="spacer"></span><button class="primary-btn" disabled>Create sales order</button>`);
    return;
  }
  const warn = (o.flags || []).filter((f) => f.severity === "warning").length;
  const secs = run?.meta ? (run.meta.ms / 1000).toFixed(1) : "";
  setHTML(bar, `<span class="stat">Read in <b>${secs}s</b> · <b>${o.lines.length}</b> lines · <b>${warn}</b> to check · saves about <b>${minutesSaved(o)} min</b> of typing</span>
    <span class="spacer"></span><button class="ghost-btn" id="jsonBtn" type="button" title="Download the extracted data as JSON">Download data</button><button class="primary-btn" id="createBtn" type="button">Create sales order</button>`);
  $("#createBtn").onclick = () => createOrder(o);
  $("#jsonBtn").onclick = () => download(`${o.order?.po_number || "order"}.json`, JSON.stringify(o, null, 2), "application/json");
}

$("#orderBody").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-change]");
  if (!btn) return;
  const sel = btn.closest("td").querySelector(".sku-select");
  sel.classList.remove("hidden");
  btn.remove();
  sel.focus();
});

// edits after extraction
$("#orderBody").addEventListener("change", (e) => {
  if (!run?.final) return;
  const i = Number(e.target.dataset.i);
  const line = run.order.lines[i];
  if (!line) return;
  if (e.target.classList.contains("qty-input")) {
    line.quantity = Math.max(0, Number(e.target.value) || 0);
  } else if (e.target.classList.contains("sku-select")) {
    line.sku = e.target.value || null;
    line.match_confidence = line.sku ? "high" : "none";
    line.match_note = line.sku ? "Confirmed by reviewer" : "Removed by reviewer";
    if (line.sku) line.po_unit_price = line.po_unit_price ?? null;
  }
  renderLines(run.order, true);
  renderTotals(run.order);
  toast("Updated");
});

// ------------------------------------------------------------------ create order
function createOrder(o) {
  const cur = o.order?.currency || "EUR";
  const lines = o.lines.filter((l) => l.sku && l.quantity > 0);
  const so = `SO-${new Date().getFullYear().toString().slice(2)}${String(Math.floor(Math.random() * 900000) + 100000)}`;
  const acct = o.customer?.account ? findCustomer(o.customer.account) : null;
  const br = findBranch(o.fulfilment?.branch);
  const skipped = o.lines.length - lines.length;
  const value = lines.reduce((s, l) => s + (lineCalc(l, cur).total || 0), 0);
  const payload = {
    sales_order: so,
    created_at: new Date().toISOString(),
    customer_account: acct?.account || null,
    customer_name: o.customer?.name,
    customer_po: o.order?.po_number,
    required_date: o.order?.required_date,
    currency: cur,
    branch: br?.id,
    fulfilment: o.fulfilment,
    lines: lines.map((l, i) => {
      const { p, unit } = lineCalc(l, cur);
      return { line: i + 1, sku: l.sku, description: p?.description, quantity: l.quantity, unit_price: unit, price_source: l.po_unit_price != null ? "customer PO" : "list" };
    }),
    value_ex_vat: Math.round(value * 100) / 100,
    review_notes: (o.flags || []).map((f) => f.message),
  };
  const dlg = $("#doneDlg");
  dlg.innerHTML = `<div class="inner">
    <div class="tick"><svg viewBox="0 0 24 24" width="38" height="38" fill="none" stroke="var(--good)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg></div>
    <h2>Sales order created</h2>
    <div class="so">${so}</div>
    <p class="muted">Ready to send to the ERP / order system.</p>
    <div class="done-grid">
      <div><small>Customer</small><b>${esc(acct ? `${acct.name} (${acct.account})` : o.customer?.name || "—")}</b></div>
      <div><small>Customer PO</small><b>${esc(o.order?.po_number || "—")}</b></div>
      <div><small>Branch</small><b>${esc(br ? br.name : "—")}</b> · ${o.fulfilment?.method === "collection" ? "Collection" : "Delivery"}</div>
      <div><small>Required</small><b>${esc(fmtDate(o.order?.required_date) || "—")}</b></div>
      <div><small>Lines</small><b>${lines.length}</b>${skipped ? ` <span class="muted">(${skipped} held for review)</span>` : ""}</div>
      <div><small>Value ex VAT</small><b>${money(value, cur)}</b></div>
    </div>
    <div class="saving">About ${minutesSaved(o)} minutes of manual order entry saved on this order.</div>
    <div class="dlg-actions">
      <button class="ghost-btn" id="dlJson">Download JSON</button>
      <button class="ghost-btn" id="dlCsv">Download CSV</button>
      <button class="ghost-btn" id="closeDone">Back to order</button>
      <button class="primary-btn" id="another">Process another PO</button>
    </div></div>`;
  dlg.showModal();
  $("#dlJson").onclick = () => download(`${so}.json`, JSON.stringify(payload, null, 2), "application/json");
  $("#dlCsv").onclick = () => {
    const rows = [["sales_order", "customer_account", "customer_po", "line", "sku", "description", "quantity", "unit_price", "currency"]];
    payload.lines.forEach((l) => rows.push([so, payload.customer_account, payload.customer_po, l.line, l.sku, l.description, l.quantity, l.unit_price, cur]));
    download(`${so}.csv`, rows.map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n"), "text/csv");
  };
  $("#closeDone").onclick = () => dlg.close();
  $("#another").onclick = () => { dlg.close(); resetToHome(); };
}

function download(name, text, type) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

let toastTimer;
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2600);
}

renderSamples();
refreshMode();
