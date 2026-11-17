// Re-record the demo-mode results by running every sample PDF through the Worker for real.
//
//   cd worker && npm run dev            # in one terminal (reads worker/.dev.vars)
//   node tools/record-results.mjs       # in another; writes samples/results/*.json
//
// Options: PROXY_URL (default http://localhost:8787). DEMO_PASSCODE is read from the
// environment or, failing that, from worker/.dev.vars.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const proxy = (process.env.PROXY_URL || "http://localhost:8787").replace(/\/+$/, "");
let passcode = process.env.DEMO_PASSCODE;
if (!passcode) {
  const vars = fs.readFileSync(path.join(root, "worker/.dev.vars"), "utf8");
  passcode = vars.match(/^DEMO_PASSCODE=(.*)$/m)?.[1]?.trim();
}
if (!passcode) throw new Error("Set DEMO_PASSCODE or add it to worker/.dev.vars");

const only = process.argv.slice(2);
const pdfs = fs.readdirSync(path.join(root, "samples")).filter((f) => f.endsWith(".pdf") && (!only.length || only.some((o) => f.includes(o))));

for (const pdf of pdfs) {
  const id = pdf.replace(/\.pdf$/, "");
  const started = Date.now();
  process.stdout.write(`${id} … `);
  const res = await fetch(`${proxy}/extract`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Demo-Passcode": passcode, Origin: "http://localhost:8765" },
    body: JSON.stringify({
      filename: pdf,
      mime: "application/pdf",
      data: fs.readFileSync(path.join(root, "samples", pdf)).toString("base64"),
      // recorded as if processed on 17 Nov 2026, so relative dates in the samples resolve consistently
      today: "2026-11-17",
    }),
  });
  if (!res.ok) {
    console.log(`FAILED ${res.status} ${await res.text()}`);
    continue;
  }
  const text = await res.text();
  let json = "";
  let final = null;
  for (const block of text.split("\n\n")) {
    const data = block.split("\n").filter((l) => l.startsWith("data:")).map((l) => l.slice(5).trimStart()).join("\n");
    if (!data || data === "[DONE]") continue;
    let ev;
    try {
      ev = JSON.parse(data);
    } catch {
      continue;
    }
    if (ev.type === "response.output_text.delta") json += ev.delta || "";
    else if (["response.completed", "response.incomplete", "response.failed"].includes(ev.type)) final = ev.response;
    else if (ev.type === "error") console.log("error event:", ev.message || ev.error?.message);
  }
  if (!final || final.status !== "completed") {
    console.log(`FAILED status=${final?.status} ${JSON.stringify(final?.incomplete_details || final?.error || {})}`);
    continue;
  }
  const order = JSON.parse(json);
  fs.writeFileSync(path.join(root, "samples/results", `${id}.json`), JSON.stringify(order, null, 2) + "\n");
  const u = final.usage || {};
  console.log(`ok in ${((Date.now() - started) / 1000).toFixed(1)}s · ${final.model} · ${order.lines.length} lines · ${order.flags.length} flags · ${u.input_tokens ?? "?"} in / ${u.output_tokens ?? "?"} out tokens`);
}
