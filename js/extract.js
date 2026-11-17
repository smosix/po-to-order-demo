// Sends a purchase order to the Cloudflare Worker proxy, which calls OpenAI and streams the
// structured result back. The OpenAI key never reaches the browser: the browser only holds the
// demo passcode, which the Worker checks.
import { partialParse } from "./vendor/partial-json.js";
import { DEFAULT_PROXY_URL } from "./config.js";

export function getSettings() {
  return {
    proxyUrl: (localStorage.getItem("po-demo.proxyUrl") || DEFAULT_PROXY_URL).replace(/\/+$/, ""),
    passcode: localStorage.getItem("po-demo.passcode") || "",
    replaySamples: localStorage.getItem("po-demo.replaySamples") === "1",
  };
}

export const isLive = (s = getSettings()) => !!(s.proxyUrl && s.passcode);

export function saveSettings({ proxyUrl, passcode, replaySamples }) {
  const url = (proxyUrl || "").trim().replace(/\/+$/, "");
  if (url && url !== DEFAULT_PROXY_URL) localStorage.setItem("po-demo.proxyUrl", url);
  else localStorage.removeItem("po-demo.proxyUrl");
  if (passcode) localStorage.setItem("po-demo.passcode", passcode.trim());
  else localStorage.removeItem("po-demo.passcode");
  localStorage.setItem("po-demo.replaySamples", replaySamples ? "1" : "0");
}

/** Quick check that the Worker is reachable and the passcode is right. Returns { model }. */
export async function checkConnection({ proxyUrl, passcode }) {
  const res = await fetch(`${proxyUrl.replace(/\/+$/, "")}/health`, { headers: { "X-Demo-Passcode": passcode } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw httpError(res.status, body.error);
  return body;
}

async function fileToBase64(file) {
  const buf = new Uint8Array(await file.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(bin);
}

function httpError(status, message) {
  const err = new Error(message || `Request failed (${status})`);
  err.status = status;
  return err;
}

/**
 * Run the extraction. onPartial(partialObject) is called as JSON streams in.
 * Returns { order, usage, model, ms }.
 */
export async function extractOrder(file, { onPartial, signal } = {}) {
  const { proxyUrl, passcode } = getSettings();
  if (!proxyUrl || !passcode) throw new Error("Live AI isn't set up. Open Settings to add the passcode.");

  const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
  const mime = isPdf ? "application/pdf" : file.type === "image/jpg" ? "image/jpeg" : file.type;
  if (!/^(application\/pdf|image\/(png|jpeg|webp|gif))$/.test(mime)) throw new Error("Please upload a PDF or an image (PNG/JPG).");

  const started = performance.now();
  const res = await fetch(`${proxyUrl}/extract`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Demo-Passcode": passcode },
    body: JSON.stringify({ filename: file.name, mime, data: await fileToBase64(file), today: new Date().toISOString().slice(0, 10) }),
    signal,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw httpError(res.status, body.error);
  }

  // Read OpenAI's server-sent events as they arrive.
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  let json = "";
  let last = 0;
  let final = null;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    let idx;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const raw = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const data = raw.split("\n").filter((l) => l.startsWith("data:")).map((l) => l.slice(5).trimStart()).join("\n");
      if (!data || data === "[DONE]") continue;
      let ev;
      try {
        ev = JSON.parse(data);
      } catch {
        continue;
      }
      if (ev.type === "response.output_text.delta") {
        json += ev.delta || "";
        const now = performance.now();
        if (now - last > 120) {
          last = now;
          try {
            onPartial?.(partialParse(json));
          } catch {
            /* fragment not parseable yet */
          }
        }
      } else if (ev.type === "response.refusal.delta" || ev.type === "response.refusal.done") {
        throw new Error("The model declined to process this document.");
      } else if (ev.type === "response.completed" || ev.type === "response.incomplete" || ev.type === "response.failed") {
        final = ev.response || {};
      } else if (ev.type === "error") {
        throw new Error(ev.message || ev.error?.message || "The AI service reported an error.");
      }
    }
  }

  if (!final) throw new Error("The connection closed before the result was complete. Try again.");
  if (final.status === "failed") throw new Error(final.error?.message || "The AI service couldn't process this document.");
  if (final.status === "incomplete") {
    const reason = final.incomplete_details?.reason;
    throw new Error(reason === "max_output_tokens" ? "The document was too long to finish extracting." : `The result was incomplete (${reason || "unknown reason"}).`);
  }
  if (!json) {
    // fall back to the text in the final response object
    json = (final.output || []).flatMap((o) => o.content || []).filter((c) => c.type === "output_text").map((c) => c.text).join("");
  }
  const order = JSON.parse(json);
  onPartial?.(order);
  return { order, usage: final.usage || null, model: final.model || "OpenAI", ms: performance.now() - started };
}

/** Replays a pre-recorded result with the same streaming feel (used when live AI isn't set up). */
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
