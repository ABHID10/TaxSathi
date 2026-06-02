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

### ADR-007 — Open-source / API embeddings over a hosted model download (RAG)
- The "Ask TaxSathi" feature is grounded retrieval (RAG) over a curated tax corpus. Embeddings are pluggable behind `ai/rag` so we are not locked to one model.

### ADR-008 — Static in-browser vector index over a hosted vector DB
- For a curated, bounded corpus this is simpler, free, and private; Qdrant/Supabase pgvector are the documented migration path for per-user document vectors (F2).

### ADR-009 — Retrieval is the guarantee; the LLM is enhancement
- "Ask TaxSathi" returns grounded, cited snippets even with **no API key** (extractive mode). The LLM only synthesises a nicer narrative when configured. Off-domain questions are refused, never hallucinated.

### ADR-010 — LLM provider abstraction for model portability
- All LLM calls go through `ai/llm/getProvider()`, so Gemini ↔ Groq/Llama ↔ Ollama is a one-file swap.

### ADR-011 — BM25 lexical retrieval as the default scorer
- **Context:** the Hugging Face model CDN is blocked on many corporate networks (observed: HTTP 403 on `huggingface.co`), so in-browser dense embeddings (transformers.js) cannot be guaranteed to load.
- **Decision:** ship **BM25 sparse retrieval** (no model, no key, no network) as the default — a standard, strong RAG retriever for bounded corpora — with a tax-domain gate to refuse off-topic queries. Keep a **dense path** (Gemini `text-embedding-004`, built via `npm run build:kb`) as an opt-in upgrade behind the same `retrieve()` API.
- **Consequence:** the feature works everywhere, offline, with zero cost; retrieval quality upgrades to semantic with one build step + key when desired. `@xenova/transformers` was removed (it added 3 critical CVEs and a large bundle).

---

## RAG subsystem (Ask TaxSathi)

```
question
   │
   ▼
isOnDomain()  ── domain gate: refuse off-topic queries
   │
   ▼
retrieve()  ── BM25 over curated KB (default) | dense cosine (opt-in)
   │
   ▼
askTaxSathi()  ── grounds answer in top-k cited chunks
   │
   ├─► provider configured → LLM synthesises a cited answer
   └─► no key / error      → extractive cited answer (still grounded)
   │
   ▼
{ answer, sources[], grounded, mode }  → AskTaxSathi.jsx renders inline [n] citations
```

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
