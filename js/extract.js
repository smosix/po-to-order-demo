// Calls Claude directly from the browser to turn a purchase-order PDF into a structured order.
// The API key is supplied by the presenter at runtime and kept in this browser's localStorage only.
import { Anthropic, partialParse } from "./vendor/anthropic-sdk.js";
import { BRANCHES, CATALOGUE, CUSTOMERS } from "./data.js";

export const MODELS = [
  { id: "claude-opus-5-5", label: "Claude Opus 5.5 (most accurate)" },
  { id: "claude-sonnet-5-5", label: "Claude Sonnet 5.5 (balanced)" },
  { id: "claude-haiku-5-5", label: "Claude Haiku 5.5 (fastest)" },
];

const str = { type: "string" };
const num = { type: "number" };
const nullable = (schema) => ({ anyOf: [schema, { type: "null" }] });
const obj = (properties) => ({
  type: "object",
  additionalProperties: false,
  required: Object.keys(properties),
  properties,
});
const confidence = { type: "string", enum: ["high", "medium", "low", "none"] };

export const ORDER_SCHEMA = obj({
  summary: { type: "string", description: "One plain-English sentence describing the order, for a non-technical reader." },
  document: obj({
    kind: { type: "string", enum: ["purchase_order", "email_order", "handwritten_order", "other"] },
    language: { type: "string", description: "Language of the document, e.g. English, Dutch" },
  }),
  customer: obj({
    name: str,
    account: nullable({ type: "string", description: "Matched customer account code from the customer list, or null" }),
    account_confidence: confidence,
    contact_name: nullable(str),
    contact_email: nullable(str),
    contact_phone: nullable(str),
    vat_number: nullable(str),
  }),
  order: obj({
    po_number: nullable(str),
    po_date: nullable({ type: "string", description: "ISO date YYYY-MM-DD" }),
    required_date: nullable({ type: "string", description: "ISO date YYYY-MM-DD; earliest date if phased" }),
    quote_reference: nullable(str),
    job_reference: nullable(str),
    currency: { type: "string", enum: ["EUR", "GBP"] },
    payment_terms: nullable(str),
  }),
  fulfilment: obj({
    method: { type: "string", enum: ["delivery", "collection"] },
    branch: { type: "string", description: "Fulfilling branch id from the branch list" },
    deliver_to: nullable(obj({
      name: str,
      address_lines: { type: "array", items: str },
      postcode: nullable(str),
      country: str,
    })),
    instructions: nullable({ type: "string", description: "Delivery/collection instructions, site contact, access times" }),
  }),
  lines: {
    type: "array",
    items: obj({
      line: { type: "integer" },
      customer_ref: nullable({ type: "string", description: "Customer's own part code as written, if any" }),
      description: { type: "string", description: "Item description as written on the document (translated to English in brackets if not English)" },
      quantity: num,
      po_unit_price: nullable({ type: "number", description: "Unit price written on the PO, excl. tax; null if not stated" }),
      sku: nullable({ type: "string", description: "Matched Fortus SKU from the catalogue, or null if no reasonable match" }),
      match_confidence: confidence,
      match_note: { type: "string", description: "Short reason for the match, e.g. 'Exact part number' or 'Assumed standard PIR'" },
    }),
  },
  totals: obj({
    po_subtotal: nullable({ type: "number", description: "Subtotal excl. tax as printed on the document" }),
    po_tax: nullable(num),
    po_total: nullable(num),
    tax_rate_percent: nullable(num),
  }),
  flags: {
    type: "array",
    items: obj({
      severity: { type: "string", enum: ["warning", "info"] },
      message: { type: "string", description: "One short sentence a sales administrator can act on" },
    }),
  },
});

function systemPrompt() {
  const cat = CATALOGUE.map((p) => `${p.sku} | ${p.brand} ${p.mpn} | ${p.description} | per ${p.unit} | EUR ${p.price_eur} | GBP ${p.price_gbp}`).join("\n");
  const cust = CUSTOMERS.map((c) => `${c.account} | ${c.name} | ${c.town} | ${c.country} | ${c.currency} | home branch ${c.home_branch}`).join("\n");
  const br = BRANCHES.map((b) => `${b.id} | ${b.name} | ${b.country}`).join("\n");
  return `You are the order-entry assistant for Fortus, a distributor of security products (CCTV, fire, access control, intruder alarms, gate automation) to installers across Ireland, the UK and the Netherlands.

A sales administrator will give you a customer purchase order. It may be a formal PO, a forwarded email, a handwritten order pad or a scan, in any language. Read every page and return the data needed to key a sales order.

Rules:
- Extract only what the document says. Use null when something is not stated; never invent PO numbers, prices, dates or contacts.
- Dates: return ISO YYYY-MM-DD. Resolve relative dates ("for Thursday", "w/c 23/11") against the document date. Day-first dates are normal in Ireland, UK and NL.
- Numbers: return plain numbers (Dutch "1.234,50" is 1234.50). Unit prices exclude tax.
- Customer: match to an account in the customer list by name, address, email domain or account number. Beware of similarly named companies. Use null if unsure.
- Lines: one entry per item ordered. Do not add items the customer only asked a price for or mentioned in passing; flag those instead. Ignore labour or non-product lines unless clearly ordered.
- SKU matching: choose the Fortus SKU that is the item ordered, using part numbers first, then brand + description. If the description fits several products, pick the most standard one and use medium or low confidence and say why in match_note. If nothing in the catalogue fits, sku = null and confidence "none".
- Branch: use the branch named on the document if any, otherwise the customer's home branch, otherwise the nearest branch.
- Flags: raise a warning for anything a person must check before booking the order: PO unit price differing from list price by more than 2%, printed totals that do not equal the sum of lines, missing prices, items with no catalogue match, low-confidence matches, unusual VAT treatment, missing PO number or delivery date, special delivery requirements. Use info for helpful notes (e.g. phased delivery, collection, price requests). Keep each flag to one sentence and mention numbers.
- The summary is one friendly sentence, e.g. "Brightwater are ordering 18 CCTV items for a medical centre job, needed by 20 Nov."

FORTUS CATALOGUE (sku | brand part number | description | unit | list prices):
${cat}

CUSTOMER ACCOUNTS (account | name | town | country | currency | home branch):
${cust}

BRANCHES (id | name | country):
${br}`;
}

export function getSettings() {
  return {
    apiKey: localStorage.getItem("po-demo.apiKey") || "",
    model: localStorage.getItem("po-demo.model") || MODELS[0].id,
    replaySamples: localStorage.getItem("po-demo.replaySamples") === "1",
  };
}

export function saveSettings({ apiKey, model, replaySamples }) {
  localStorage.setItem("po-demo.replaySamples", replaySamples ? "1" : "0");
  if (apiKey) localStorage.setItem("po-demo.apiKey", apiKey.trim());
  else localStorage.removeItem("po-demo.apiKey");
  localStorage.setItem("po-demo.model", model);
}

async function fileToBase64(file) {
  const buf = new Uint8Array(await file.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(bin);
}

/**
 * Run the extraction. onPartial(partialObject, phase) is called as JSON streams in.
 * Returns { order, usage, model, ms }.
 */
export async function extractOrder(file, { onPartial, onPhase, signal } = {}) {
  const { apiKey, model } = getSettings();
  if (!apiKey) throw new Error("No API key set. Open Settings to add one.");
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true, maxRetries: 2 });

  const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
  const isImage = /^image\/(png|jpe?g|gif|webp)$/.test(file.type);
  if (!isPdf && !isImage) throw new Error("Please upload a PDF or an image (PNG/JPG).");
  const data = await fileToBase64(file);
  const docBlock = isPdf
    ? { type: "document", source: { type: "base64", media_type: "application/pdf", data } }
    : { type: "image", source: { type: "base64", media_type: file.type === "image/jpg" ? "image/jpeg" : file.type, data } };

  const started = performance.now();
  onPhase?.("reading");

  // Server-side refusal fallback is enabled for Opus/Sonnet (not available on Haiku).
  const fallback = model.includes("haiku") ? {} : { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" };

  const stream = client.beta.messages.stream(
    {
      model,
      max_tokens: 32000,
      ...fallback,
      thinking: { type: "adaptive" },
      output_config: { effort: "low", format: { type: "json_schema", schema: ORDER_SCHEMA } },
      system: [{ type: "text", text: systemPrompt(), cache_control: { type: "ephemeral" } }],
      messages: [
        {
          role: "user",
          content: [docBlock, { type: "text", text: `File name: ${file.name}\nExtract this order. Today's date is ${new Date().toISOString().slice(0, 10)}.` }],
        },
      ],
    },
    { signal },
  );

  let json = "";
  let last = 0;
  stream.on("text", (delta) => {
    json += delta;
    const now = performance.now();
    if (now - last > 120) {
      last = now;
      try {
        onPartial?.(partialParse(json));
      } catch {
        /* incomplete JSON fragment; wait for more */
      }
    }
  });

  const message = await stream.finalMessage();
  if (message.stop_reason === "refusal") throw new Error("The model declined to process this document.");
  if (message.stop_reason === "max_tokens") throw new Error("The document was too long to finish extracting.");
  const text = message.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  const order = JSON.parse(text);
  onPartial?.(order);
  return { order, usage: message.usage, model: message.model, ms: performance.now() - started };
}

/** Replays a pre-computed result with the same streaming feel (used when no API key is set). */
export async function replayOrder(order, { onPartial, signal, durationMs = 9000 } = {}) {
  const started = performance.now();
  const json = JSON.stringify(order);
  const readPause = 1800; // "reading" pause before fields start appearing
  await sleep(readPause, signal);
  // time-based so it still finishes on schedule if the tab is in the background
  for (;;) {
    await sleep(80, signal);
    const frac = Math.min(1, (performance.now() - started - readPause) / (durationMs - readPause));
    try {
      onPartial?.(partialParse(json.slice(0, Math.round(json.length * frac))));
    } catch {
      /* incomplete fragment */
    }
    if (frac >= 1) break;
  }
  onPartial?.(order);
  return { order, usage: null, model: "replay", ms: performance.now() - started };
}

function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });
}
