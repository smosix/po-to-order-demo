// Cloudflare Worker: the only place the OpenAI API key lives.
//
// The static GitHub Pages site POSTs a document here; the Worker checks the caller
// (allowed origin + demo passcode), sends the document to the OpenAI Responses API with the
// fixed extraction prompt and JSON schema, and streams OpenAI's server-sent events straight back.
//
// Secrets (wrangler secret put / .dev.vars): OPENAI_API_KEY, DEMO_PASSCODE
// Vars (wrangler.toml): ALLOWED_ORIGINS, OPENAI_MODEL, REASONING_EFFORT
import { ORDER_SCHEMA, systemPrompt } from "../../js/prompt.js";

const MAX_BASE64_CHARS = 28_000_000; // ~20 MB file
const ALLOWED_MIME = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp", "image/gif"]);

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const allowed = (env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
    const originOk = allowed.includes(origin);
    const cors = originOk
      ? {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, X-Demo-Passcode",
          "Access-Control-Max-Age": "86400",
          Vary: "Origin",
        }
      : {};
    const json = (status, body) =>
      new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

    if (request.method === "OPTIONS") return new Response(null, { status: originOk ? 204 : 403, headers: cors });
    if (!originOk) return json(403, { error: "Origin not allowed" });

    const url = new URL(request.url);
    if (!env.OPENAI_API_KEY || !env.DEMO_PASSCODE) return json(500, { error: "Worker is missing OPENAI_API_KEY or DEMO_PASSCODE" });
    if (!(await passcodeMatches(request.headers.get("X-Demo-Passcode") || "", env.DEMO_PASSCODE))) {
      return json(401, { error: "Wrong passcode" });
    }

    if (request.method === "GET" && url.pathname === "/health") return json(200, { ok: true, model: env.OPENAI_MODEL });
    if (request.method !== "POST" || url.pathname !== "/extract") return json(404, { error: "Not found" });

    let body;
    try {
      body = await request.json();
    } catch {
      return json(400, { error: "Expected a JSON body" });
    }
    const { filename = "document", mime, data, today } = body || {};
    if (!ALLOWED_MIME.has(mime)) return json(400, { error: "Upload a PDF or a PNG/JPG/WebP image" });
    if (typeof data !== "string" || !data.length) return json(400, { error: "No document data" });
    if (data.length > MAX_BASE64_CHARS) return json(413, { error: "File is too large (max about 20 MB)" });

    const dataUrl = `data:${mime};base64,${data}`;
    const docPart =
      mime === "application/pdf"
        ? { type: "input_file", filename: String(filename).slice(0, 200), file_data: dataUrl, detail: "high" }
        : { type: "input_image", image_url: dataUrl, detail: "high" };
    const day = /^\d{4}-\d{2}-\d{2}$/.test(today || "") ? today : new Date().toISOString().slice(0, 10);

    const upstream = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: env.OPENAI_MODEL || "gpt-6.1-sol",
        reasoning: { effort: env.REASONING_EFFORT || "low" },
        max_output_tokens: 16000,
        store: false,
        stream: true,
        text: { format: { type: "json_schema", name: "sales_order", schema: ORDER_SCHEMA, strict: true } },
        input: [
          { role: "system", content: systemPrompt() },
          {
            role: "user",
            content: [docPart, { type: "input_text", text: `File name: ${filename}\nExtract this order. Today's date is ${day}.` }],
          },
        ],
      }),
    });

    if (!upstream.ok || !upstream.body) {
      let message = `OpenAI returned ${upstream.status}`;
      try {
        const err = await upstream.json();
        if (err?.error?.message) message = err.error.message;
      } catch {
        /* keep generic message */
      }
      return json(upstream.status === 429 ? 429 : 502, { error: message, upstream_status: upstream.status });
    }

    return new Response(upstream.body, {
      status: 200,
      headers: { ...cors, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
    });
  },
};

// Constant-time comparison so the passcode can't be guessed from response timing.
async function passcodeMatches(given, expected) {
  const enc = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(given)),
    crypto.subtle.digest("SHA-256", enc.encode(expected)),
  ]);
  const x = new Uint8Array(a);
  const y = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}
