// The extraction prompt and output schema. Shared by the browser and the Cloudflare Worker
// (the Worker bundles this file, so the catalogue and prompt live in one place).
import { BRANCHES, CATALOGUE, CUSTOMERS } from "./data.js";

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

export function systemPrompt() {
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
