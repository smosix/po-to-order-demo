# Order Capture AI: PO to sales order demo (prepared for Fortus)

A single-page demo for a non-technical audience. Someone drops in a customer purchase order (a PDF, a scan, an email printed to PDF, or a photo) and AI pulls out everything needed to book the sales order:

- customer, matched to an account
- PO number, dates, quote and job references, currency
- delivery or collection, the fulfilling branch, address and site instructions
- every line, matched to a stock code in the catalogue, with a confidence level
- checks: PO price vs list price, totals that don't add up, missing prices, items that aren't stocked, VAT oddities, price-only requests

The reviewer can change a quantity or product and then press **Create sales order**. That produces a mock sales order number with a JSON/CSV download, to show the ERP hand-off.

The site is plain HTML/CSS/JS on GitHub Pages. AI extraction uses **OpenAI** (`gpt-6.1-sol` by default) through a small **Cloudflare Worker** that keeps the OpenAI key out of the browser.

```
Browser (GitHub Pages) ──passcode + PDF──▶ Cloudflare Worker ──OPENAI_API_KEY──▶ OpenAI Responses API
         ◀──────────── streamed JSON (server-sent events) ─────────────
```

## Two modes

| Mode | When | What happens |
|---|---|---|
| **Demo mode** (default) | No passcode entered | The six sample orders play back recorded results with the same "filling in live" animation. Works offline. Uploading your own file asks for the passcode. |
| **Live AI** | Demo passcode entered in ⚙ Settings | Any PDF or image goes to the Worker, which sends it to OpenAI with the fixed prompt and JSON schema and streams the result back into the form. |

The browser only stores the passcode. The OpenAI key is a secret on the Worker. The Worker also rejects any site not listed in `ALLOWED_ORIGINS`. Settings has a "play samples from recordings" switch so uploads go live while the six samples stay instant.

## Setting up the Worker (one-off)

You need a free Cloudflare account and Node.js.

1. Put the key and passcode in `worker/.dev.vars`. This file is git-ignored and never leaves your machine:
   ```
   OPENAI_API_KEY=sk-...
   DEMO_PASSCODE=pick-something
   ```
2. Test locally:
   ```bash
   cd worker && npm install && npm run dev                      # Worker on http://localhost:8787
   python3 -m http.server 8765                                  # site, run from the repo root
   ```
   Open http://localhost:8765, then ⚙ → enter the passcode → Advanced → proxy `http://localhost:8787`.
3. Deploy and upload the secrets:
   ```bash
   cd worker
   npx wrangler login
   npx wrangler deploy                    # prints https://po-to-order-demo-proxy.<you>.workers.dev
   npx wrangler secret bulk .dev.vars     # uploads OPENAI_API_KEY and DEMO_PASSCODE
   ```
4. Put the Worker address in `js/config.js` (`DEFAULT_PROXY_URL`) and push. Presenters then only need the passcode.

Settings live in `worker/wrangler.toml`: `OPENAI_MODEL`, `REASONING_EFFORT` (default `low`, for speed) and `ALLOWED_ORIGINS`. Set a monthly spend limit on the OpenAI project too.

## Re-recording the sample results

With the Worker running locally (`npm run dev`), run:

```bash
node tools/record-results.mjs            # all six, or pass part of a name: node tools/record-results.mjs kelly
```

This sends each sample PDF through the real model and overwrites `samples/results/*.json`, so demo mode replays genuine output.

## Presenter talk track

1. **Clean PDF (Brightwater, CCTV, EUR).** The easy case. Point out the account match (A/C C10421), the required-by date, and the flag that the NVR is €30 below list.
2. **Loose descriptions (Northpoint, Fire, GBP).** "Hochiki ESP optical heads" and "std bases to suit" become real stock codes. The panel is "as quoted" with no price, which gets flagged, and the site rules (no deliveries before 8am, tail-lift) are pulled out.
3. **Handwritten phone scan (Seán Kelly Alarms).** No typed text at all. It still reads the pad, sees that it's a **collection** from Cork on Friday, and applies list prices because none were given.
4. **Two-page project PO (Meridian, Access).** 13 lines, phased delivery, T&Cs on page 2. It catches the printed subtotal being £54 out, and that the Abloy lock isn't a stocked item.
5. **Email order (Kingdom Gates).** "For Thursday" becomes a date, "usual account" becomes C10390, and the battery *price request* is flagged rather than ordered.
6. **Dutch PO (VeiligWerk).** Dutch layout and `1.234,50` number formats. Lines are translated, and the 21% BTW is flagged for an accounts check.

Then drop in one of the audience's own POs (live mode). This usually lands best.

## Hosting on GitHub Pages

The repo is published from `main` (root). Push to update; the site rebuilds in about a minute. To run the site locally, serve it over HTTP (ES modules don't load from `file://`): `python3 -m http.server 8765`.

## Project layout

```
index.html               page shell
css/styles.css           styling
js/app.js                UI: samples, upload, live rendering, review, create order
js/extract.js            calls the Worker, reads the SSE stream, replays recorded results
js/prompt.js             extraction prompt + strict JSON schema (shared with the Worker)
js/config.js             default Worker address
js/data.js               demo catalogue (50 SKUs), customer accounts, branches
js/vendor/partial-json.js   partial-json (MIT) for rendering JSON while it streams
worker/                  Cloudflare Worker proxy (holds the OpenAI key)
samples/*.pdf            six sample purchase orders
samples/pages/*.jpg      page images for the viewer and sample cards
samples/results/*.json   recorded extraction results for demo mode
tools/generate_samples.py  regenerates the sample PDFs (reportlab + pillow)
tools/record-results.mjs   re-records samples/results from the real model
```

## Notes

- **All data is fictional.** The catalogue, prices, SKUs and customer accounts are illustrative, not Fortus data. The real product range and brands (Hikvision, Paxton, Pyronix, Hochiki, Advanced, Roger Technology) were used only to make the samples feel familiar. Phone numbers use reserved drama ranges.
- **How the extraction works:** one OpenAI Responses API call from the Worker. The PDF goes in as an `input_file` part, the catalogue, customers and branches go in the system message, and output is constrained by a strict `json_schema` (`text.format`). `store: false` is set, so OpenAI doesn't keep the response.
- **Speed vs accuracy:** `REASONING_EFFORT` is `low` to keep live runs short. Use `medium` or a bigger model (`gpt-6-astra`) if accuracy matters more.
- **In production** the Worker would sit behind real sign-in rather than a shared passcode, pull the catalogue and accounts from the ERP, and post the order to the ERP instead of downloading it.
