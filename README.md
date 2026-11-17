# Order Capture AI: PO to sales order demo (prepared for Fortus)

A single-page demo for a non-technical audience. Someone drops in a customer purchase order (a PDF, a scan, an email printed to PDF, or a photo) and AI pulls out everything needed to book the sales order:

- customer, matched to an account
- PO number, dates, quote and job references, currency
- delivery or collection, the fulfilling branch, address and site instructions
- every line, matched to a stock code in the catalogue, with a confidence level
- checks: PO price vs list price, totals that don't add up, missing prices, items that aren't stocked, VAT oddities, price-only requests

The reviewer can change a quantity or product and then press **Create sales order**. That produces a mock sales order number with a JSON/CSV download, to show the ERP hand-off.

It is plain HTML/CSS/JS with no build step and no server, so it runs on GitHub Pages as-is.

## Two modes

| Mode | When | What happens |
|---|---|---|
| **Demo mode** (default) | No API key set | The six sample orders play back recorded results with the same "filling in live" animation. Works offline. Uploading your own file asks for a key. |
| **Live AI** | Anthropic API key added in ⚙ Settings | Any PDF or image is sent straight from the browser to Claude (`claude-opus-5-5` by default; Sonnet 5.5 and Haiku 5.5 can be picked in Settings). The result streams into the form as it is read. |

The key is kept in the browser's `localStorage` and is only sent to `api.anthropic.com`. Use a key with a low spend limit, and remove it (Settings → Remove key) on shared machines. Settings also has a "play samples from recordings" switch: uploads go live while the six samples stay instant.

> **Before a real demo:** the recorded results in `samples/results/` were written by hand to match each sample. They were **not** captured from a live run. To replace them with genuine model output, add a key, run each sample, click **Download data** and save the file over `samples/results/<sample-id>.json`.

## Presenter talk track

1. **Clean PDF (Brightwater, CCTV, EUR).** The easy case. Point out the account match (A/C C10421), the required-by date, and the flag that the NVR is €30 below list.
2. **Loose descriptions (Northpoint, Fire, GBP).** "Hochiki ESP optical heads" and "std bases to suit" become real stock codes. The panel is "as quoted" with no price, which gets flagged, and the site rules (no deliveries before 8am, tail-lift) are pulled out.
3. **Handwritten phone scan (Seán Kelly Alarms).** No typed text at all. It still reads the pad, sees that it's a **collection** from Cork on Friday, and applies list prices because none were given.
4. **Two-page project PO (Meridian, Access).** 13 lines, phased delivery, T&Cs on page 2. It catches the printed subtotal being £54 out, and that the Abloy lock isn't a stocked item.
5. **Email order (Kingdom Gates).** "For Thursday" becomes a date, "usual account" becomes C10390, and the battery *price request* is flagged rather than ordered.
6. **Dutch PO (VeiligWerk).** Dutch layout and `1.234,50` number formats. Lines are translated, and the 21% BTW is flagged for an accounts check.

Then drop in one of the audience's own POs (live mode). This usually lands best.

## Hosting on GitHub Pages

```bash
git init && git add . && git commit -m "PO to sales order demo"
gh repo create po-to-order-demo --public --source . --push
gh api -X POST repos/{owner}/po-to-order-demo/pages -f "source[branch]=main" -f "source[path]=/"
```

The site appears at `https://<owner>.github.io/po-to-order-demo/` after a minute or so. A private repo also works if your GitHub plan supports Pages for private repos.

To run it locally, serve the folder over HTTP (ES modules don't load from `file://`):

```bash
python3 -m http.server 8765
```

## Project layout

```
index.html               page shell
css/styles.css           styling
js/app.js                UI: samples, upload, live rendering, review, create order
js/extract.js            Claude call (streaming + JSON schema), replay of recorded results
js/data.js               demo catalogue (50 SKUs), customer accounts, branches
js/vendor/anthropic-sdk.js  official @anthropic-ai/sdk (v1.9.0) bundled for the browser
samples/*.pdf            six sample purchase orders
samples/pages/*.jpg      page images for the viewer and sample cards
samples/results/*.json   recorded extraction results for demo mode
tools/generate_samples.py  regenerates the sample PDFs (reportlab + pillow)
```

## Notes

- **All data is fictional.** The catalogue, prices, SKUs and customer accounts are illustrative, not Fortus data. The real product range and brands (Hikvision, Paxton, Pyronix, Hochiki, Advanced, Roger Technology) were used only to make the samples feel familiar. Phone numbers use reserved drama ranges.
- **How the extraction works:** one Claude Messages API call. The PDF goes in as a `document` block, the catalogue, customers and branches go in the (cached) system prompt, and a strict JSON schema is set via `output_config.format`. On Opus/Sonnet, server-side refusal fallback (`fallbacks: "default"`) is turned on.
- **Speed:** effort is set to `low` to keep live runs short for a demo. Raise it in `js/extract.js` if accuracy matters more than speed.
- **In production** this would sit behind a small server (so no API key in the browser), pull the catalogue and accounts from the ERP, and post the order to the ERP instead of downloading it.
