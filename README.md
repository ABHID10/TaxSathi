# 🟢 TaxSathi AI

**Your tax plan in 5 minutes. Free, forever.**

An AI-powered personal tax advisor for India's salaried employees. TaxSathi answers the one question everyone gets wrong every April — **old tax regime or new?** — with exact dual-regime calculations, a deduction gap report, an AI-personalised explanation, and a downloadable action plan. No login, no backend, ₹0 to run.

> Built for **FY 2025-26 (AY 2026-27)** per the Union Budget 2025.

---

## Features

- **Live tax meter** — both regimes recalculate in real time as you type (client-side, sub-millisecond).
- **Deduction gap analysis** — shows exactly how much tax benefit you're leaving on the table, by section, with urgency flags.
- **Break-even calculator** — the deduction level at which the old regime starts to win.
- **AI insight** — a warm, plain-language explanation via Gemini 2.5 Flash, with a deterministic offline fallback (the app never breaks if the AI is down).
- **Action plan** — personalised next steps (declare to HR, gather docs, invest before March 31, file ITR), sorted by urgency.
- **PDF export + WhatsApp share** — generated entirely in the browser.
- **Privacy-first** — no accounts, no PII; the AI receives only anonymous numbers.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React 18 + Vite |
| Tax engine | Pure JavaScript (fully unit-tested) |
| AI | Gemini 2.5 Flash (free tier, optional) |
| PDF | jsPDF + html2canvas |
| Icons / motion | lucide-react, framer-motion |
| Hosting | Any static host (GitHub Pages / Vercel) |
| Cost | ₹0 / month |

---

## Quick Start

```bash
npm install
npm run dev          # http://localhost:5173
```

### Optional: enable live AI text

The app works fully without an API key (it falls back to a deterministic personalised insight). To enable Gemini-generated text:

1. Get a **free** key (no credit card) at https://aistudio.google.com/app/apikey
2. `cp .env.example .env` and set `VITE_GEMINI_API_KEY`
3. Before public deployment, restrict the key by HTTP referrer in Google AI Studio.

---

## Scripts

```bash
npm run dev        # dev server
npm test           # run the 36-test engine suite (Vitest)
npm run build      # production bundle → dist/
npm run preview    # preview the production build
```

---

## Project Structure

```
src/
  engine/      constants.js · taxCalculator.js · deductionAnalyser.js · regimeAdvisor.js
  ai/          geminiAdvisor.js
  components/  ChatInterface · TaxMeter · DeductionChecklist · RegimeResult · ActionPlan · PDFReport · StepProgress · Disclaimer
  utils/       formatter.js · pdfGenerator.js · storage.js
  styles/      globals.css · components.css · animations.css
tests/         taxCalculator · deductionAnalyser · regimeAdvisor
docs/          PM_BRIEF.md · ARCHITECTURE.md · DEMO_SCRIPT.md
```

---

## Deployment

The build output in `dist/` is a static site — `vite.config.js` uses a relative `base` so it works on any host.

**Vercel:** `npm i -g vercel && vercel --prod`
**GitHub Pages:** push `dist/` to a `gh-pages` branch (or use the `gh-pages` npm package).

---

## Updating for a new financial year

All tax figures live in **`src/engine/constants.js`** — the single source of truth. Update slabs, limits, rebate thresholds, and the `FY`/`AY` strings there; the test suite will flag any stale expectations.

---

## Disclaimer

TaxSathi is an AI tool for **guidance only**. It is not legal or financial advice. Consult a Chartered Accountant for complex situations.
