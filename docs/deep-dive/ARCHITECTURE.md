# Deep Dive: Architecture

This is the code-level companion to the ADR-focused [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md). It walks the actual modules, the data flow, and *why* the boundaries sit where they do.

---

## The one big decision: no backend

Every tax calculation is deterministic math, so it runs client-side. The only network calls are optional (Gemini for AI text/embeddings). Consequences:

- **₹0 running cost** — deploy as static files; no server, no database, no DevOps.
- **Instant + private** — math runs locally; no tax data is sent anywhere for the core flow.
- **Trade-off:** no cross-session memory by default → mitigated by optional `localStorage` (no PII).

This shapes everything below: the "backend" is just pure functions, and the AI layer is carefully kept as an *enhancement* that can fail without breaking the app.

---

## Module map

```
src/
  engine/                 ← the product core: pure, synchronous tax math
    constants.js          single source of truth (slabs, limits, sections)
    taxCalculator.js      slabs, rebate, HRA, surcharge, cess, both regimes
    deductionAnalyser.js  deduction gap report + marginal rate + urgency
    regimeAdvisor.js      recommendation + break-even (binary search)

  ai/                     ← AI subsystem (modular, swappable, optional)
    llm/
      provider.js (interface contract, documented in index.js)
      geminiProvider.js   Gemini 2.5 Flash implementation
      index.js            getProvider() — env-driven selection
    rag/
      knowledge/taxKnowledge.js   curated, cited corpus (versioned)
      tokenize.js                 IR tokenizer
      lexicalRetriever.js         BM25 + query expansion + domain gate
      retriever.js                retrieve() facade (pluggable scorer)
    qa/
      askTaxSathi.js      retrieve → ground → cite orchestration
    geminiAdvisor.js      the regime-insight paragraph (uses llm/provider)

  components/             ← React UI (presentational; logic lives in engine/ai)
    ChatInterface, TaxMeter, DeductionChecklist, RegimeResult,
    ActionPlan, AskTaxSathi, PDFReport, StepProgress, Disclaimer

  utils/                  formatter.js · pdfGenerator.js · storage.js
  styles/                 globals · components · animations (design tokens)

scripts/build-kb-index.mjs   optional dense-embedding index builder
tests/                       49 tests (engine + RAG/QA)
```

The dependency rule is one-directional: **components → ai/engine → constants**. The engine never imports React; the AI layer never computes tax. This keeps the core portable and the tests fast.

---

## Data flow

### Core (synchronous, every keystroke)
```
user input (no PII)
  → normaliseInput()          annualise + clamp to statutory caps
  → calculateOldRegimeTax() / calculateNewRegimeTax()    (<1ms, pure)
  → compareRegimes() + analyseDeductions() + findBreakEvenDeduction()
  → recommendRegime()  →  { oldResult, newResult, comparison, deductionReport, breakEven }
  → React state → TaxMeter animates the new numbers (requestAnimationFrame)
```

### AI insight (async, on results step)
```
recommendRegime() → buildPayload() (numbers only — no name/PAN/employer)
  → getProvider().generate()           if a key is set
  → localFallbackInsight()             otherwise / on error
```

### RAG Q&A (async, on demand)
```
question → isOnDomain() → retrieve() (BM25) → askTaxSathi()
         → provider.generate() | extractive → { answer, sources[], grounded, mode }
```

---

## State management

There's no Redux/Zustand — the app is small enough that **`App.jsx` owns the state** and passes it down:

- `input` — the raw user numbers (the only mutable state that matters).
- `rec = useMemo(() => recommendRegime(input), [input])` — the entire analysis is a **pure derivation** of input, recomputed synchronously. This is why the TaxMeter feels instant: no effects, no fetches, just a memoised pure call.
- `insight` — the only async/effectful piece, fetched once on the results step with a fallback.

Because `rec` is pure, the same function powers the live meter, the results page, the PDF, and the AI payload — one computation, many consumers.

---

## The provider abstraction (ADR-010)

```js
// ai/llm/index.js
const PROVIDERS = { gemini: geminiProvider /*, groq, ollama */ };
export function getProvider() {
  return PROVIDERS[import.meta.env.VITE_LLM_PROVIDER || "gemini"] || geminiProvider;
}
```

Every LLM consumer (`geminiAdvisor`, `askTaxSathi`) depends on this interface, not on the Gemini SDK directly. Swapping to an open-source model (Llama via Groq's free tier, or local Ollama) is a single new file + one env var — no churn in app code. This is the seam that keeps the project from vendor lock-in.

---

## Why the AI is an enhancement, never a dependency (ADR-003 / ADR-009)

Both AI features are built to **degrade to a useful state with no key**:

- **Regime insight** → deterministic `localFallbackInsight()` built from the user's own numbers.
- **Ask TaxSathi** → extractive answer (top retrieved chunks verbatim, still cited).

So the entire product — meter, recommendation, deduction gap, action plan, PDF, *and* a working (if plainer) Q&A — functions offline and free. The key only upgrades the prose.

---

## Build & tooling

- **Vite** (ADR-005) — fast builds, ES modules, tree-shaking; `base: "./"` so the static bundle works on any host (GitHub Pages, Vercel, a subpath).
- **Vitest** — Node environment; tests target pure modules so they're milliseconds-fast and need no DOM.
- **Bundle** — dominated by `jspdf` + `html2canvas`; candidates for lazy `import()` if first-paint budget tightens.

---

## Security & privacy posture

- No accounts, no analytics cookies, no server logs of tax data.
- The AI payload is **numbers and flags only** (`buildPayload`) — never name, PAN, or employer.
- RAG retrieval is fully local (no query leaves the device in BM25 mode).
- Production `npm audit` is clean of shipped vulnerabilities; remaining advisories are dev-tooling only (Vite/Vitest dev server), which never reach `dist/`.
- A client-side LLM key is exposed in the bundle by nature → restrict it by HTTP referrer in Google AI Studio before public deployment (see the deployment guide).
