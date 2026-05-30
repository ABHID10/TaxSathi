# TaxSathi AI — Architecture Documentation

## Overview

TaxSathi is a **single-page React app with no backend**. All tax logic is deterministic math that runs client-side; the only network call is an optional one to the Gemini API for the natural-language insight. This keeps monthly cost at ₹0 and makes the app deployable as a static bundle.

```
React (Vite SPA)
 ├── engine/      pure JS tax math (no I/O, fully unit-tested)
 ├── ai/          Gemini 2.5 Flash insight (optional, with offline fallback)
 ├── components/  conversational UI + live tax meter + results
 └── utils/       formatting, localStorage, client-side PDF
```

---

## Architecture Decision Records (ADRs)

### ADR-001 — No Backend / No Database
- **Why:** all tax logic is deterministic math, runnable client-side.
- **Benefit:** zero server cost, instant load, works offline after first load.
- **Trade-off:** no cross-session memory by default.
- **Mitigation:** optional `localStorage` session persistence (`utils/storage.js`); no PII stored.

### ADR-002 — Gemini 2.5 Flash as the LLM
- **Why:** free tier (1,500 req/day, no credit card), frontier quality, simple JS SDK.
- **Constraint:** the API key is exposed in frontend JS → must be restricted by HTTP referrer in Google AI Studio before public deployment.

### ADR-003 — Gemini as Enhancement, Not Dependency
- **Why:** tax calculations must work even if Gemini is down or rate-limited.
- **Implementation:** `geminiAdvisor.js` always returns a result — on missing key / 429 / 503 / network error it returns a deterministic `localFallbackInsight()` built from the user's own numbers. The TaxMeter, RegimeResult, DeductionChecklist, and ActionPlan never depend on Gemini.

### ADR-004 — jsPDF + html2canvas over server-side PDF
- **Why:** server-side PDF needs a backend (cost, ops). `pdfGenerator.js` captures the off-screen `<PDFReport>` node and exports an A4 PDF entirely in the browser.
- **Limitation:** complex vector layouts are harder; we render a styled DOM node to an image instead.

### ADR-005 — Vite over Create React App
- **Why:** faster builds, native ES modules, better tree-shaking → smaller bundle for Tier 2/3 mobile users.

### ADR-006 — `constants.js` as the single source of truth
- All slabs, limits, rebate thresholds, and section codes live in `src/engine/constants.js`. No tax figure is hardcoded anywhere else. Annual Budget updates are a one-file change.

---

## Data Flow

```
User input (no PII)
      │
      ▼
normaliseInput()  ── annualises monthly figures, clamps to statutory caps
      │
      ▼
calculateOldRegimeTax() / calculateNewRegimeTax()   (pure, synchronous, <1ms)
      │
      ▼
compareRegimes()  +  analyseDeductions()  +  findBreakEvenDeduction()
      │
      ▼
recommendRegime() → { oldResult, newResult, comparison, deductionReport, breakEven }
      │
      ├─► React state → TaxMeter re-renders live (<50ms, requestAnimationFrame count-up)
      │
      └─► (on results step) getGeminiInsight() ── async, debounced, cached, fallback-safe
                 │
                 ▼
          insight paragraph renders in RegimeResult
                 │
                 ▼
          downloadPDF(<PDFReport>)  ── html2canvas + jsPDF, client-side only
```

---

## Module Responsibilities

| Module | Responsibility | Pure? |
|---|---|---|
| `engine/constants.js` | All FY 2025-26 tax data | ✅ data only |
| `engine/taxCalculator.js` | Slabs, rebate, surcharge, cess, HRA, both regimes | ✅ |
| `engine/deductionAnalyser.js` | Deduction gap report, marginal rate, urgency | ✅ |
| `engine/regimeAdvisor.js` | Recommendation + break-even (binary search) | ✅ |
| `ai/geminiAdvisor.js` | LLM insight + deterministic fallback | side-effecting (network), never throws |
| `utils/formatter.js` | Indian-locale currency / number parsing | ✅ |
| `utils/pdfGenerator.js` | Client-side PDF export | side-effecting (DOM, download) |
| `utils/storage.js` | Optional session persistence | side-effecting (localStorage) |
| `components/*` | Conversational UI, live meter, results, PDF layout | React |

---

## Testing Strategy

- The engine is **100% pure functions** and is the product's core, so it carries the test weight: **36 unit tests** across `tests/taxCalculator.test.js`, `deductionAnalyser.test.js`, and `regimeAdvisor.test.js`.
- Tests assert against values **derived from `constants.js`**, so a Budget update that changes a slab will correctly fail the stale tests and force a review.
- Run: `npm test` (Vitest, Node environment).

---

## Privacy Architecture

- No analytics cookies, no accounts, no server logs of tax data.
- Gemini receives **numbers and flags only** (see `buildPayload()` in `geminiAdvisor.js`) — never name, PAN, or employer.
- `localStorage` holds only the numeric inputs and is clearable via "Start over".

---

## Performance Notes

- Local recalculation is synchronous and sub-millisecond; the TaxMeter animates with `requestAnimationFrame` (easeOutCubic count-up), not on every keystroke debounce.
- Only the Gemini call is async/debounced.
- Bundle is dominated by `jspdf` + `html2canvas`; these are candidates for `import()` code-splitting if first-paint budget tightens.
