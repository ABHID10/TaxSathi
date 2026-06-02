# TaxSathi AI — AI Feature Strategy & Architecture

*How TaxSathi evolves from a tax calculator into an AI-native tax co-pilot — using only free / open-source models and free-tier services.*

---

## 1. Market-Gap Analysis

TaxSathi today answers one question well: *old vs new regime*. But the salaried taxpayer's journey has **four unmet jobs-to-be-done**, and every one of them is currently served badly:

| Job-to-be-done | Who serves it today | The gap |
|---|---|---|
| **"Just read my Form 16 / payslip for me"** | Manual data entry on every portal | No consumer tool auto-extracts Indian salary docs reliably & privately |
| **"Is this specific rule true for *my* case?"** | Google → outdated blogs; ChatGPT → hallucinated sections; the IT portal → unreadable legalese | No tool gives a **grounded, cited** answer from the actual statute |
| **"What should I *do* to pay less — show me the trade-offs"** | A CA (₹3–10k), or static calculators | No interactive, reasoning what-if planner that uses *your* numbers |
| **"Did I report everything correctly?"** | AIS/26AS reconciliation by a CA | No affordable mismatch / completeness checker |

The macro gap: **generic LLM chatbots are entering finance, but they hallucinate tax law** — which is unacceptable when a wrong answer triggers a notice. The defensible wedge is **trustworthy, grounded, cited AI** over Indian tax rules, combined with **zero-friction document ingestion** and **deterministic math** (which TaxSathi already owns). That combination — *grounded reasoning + verified calculation + source attribution* — is exactly what neither ClearTax (calculator) nor ChatGPT (ungrounded) delivers.

---

## 2. Pain Points Being Solved

1. **Manual data entry is the #1 drop-off.** Typing CTC, basic, HRA, 80C, etc. is friction; most users have a Form 16 PDF that already contains all of it.
2. **Fear of getting tax rules wrong.** Users don't trust generic AI ("did it make this up?") and can't parse the Income Tax Act themselves.
3. **No personalised "what-if".** "What if I move ₹50k from FD to NPS?" requires re-running the math; no tool reasons over it conversationally.
4. **No provenance.** When an answer *is* given, there's no citation to verify it — fatal for trust in a compliance domain.

---

## 3. Why Existing Solutions Are Inadequate

| Solution | Why it fails the four jobs |
|---|---|
| **ChatGPT / Gemini (raw)** | Ungrounded → hallucinates section numbers and limits; no India-specific, FY-versioned grounding; no calculation guarantee |
| **ClearTax / Tax2Win** | Strong calculators, but no conversational grounding, no cited Q&A, weak document auto-fill, paywalled depth |
| **Income Tax portal / AIS** | Authoritative but unreadable; zero advisory or explanation layer |
| **A CA** | Accurate but ₹3–10k, appointment-based, not 24/7, overkill for simple returns |
| **YouTube / blogs** | Generic, un-personalised, stale after every Budget |

The structural inadequacy: **accuracy and accessibility are split across different tools.** TaxSathi can fuse them.

---

## 4. Proposed AI Features — Ranked by Impact × Feasibility

Scoring: Impact (user value + differentiation), Feasibility (buildable now, free, fits no-backend architecture).

| # | Feature | Impact | Feasibility | AI techniques | Verdict |
|---|---|---|---|---|---|
| **F1** | **Grounded Tax Knowledge Assistant** — "Ask TaxSathi" Q&A grounded in a curated, FY-versioned tax corpus, with **inline citations** | 🟢 Very high (trust + differentiation) | 🟢 High (client-side RAG, open-source embeddings, no backend) | RAG, semantic search, source attribution, context mgmt | **BUILD FIRST** |
| **F2** | **Form 16 / Payslip Ingestion** — upload PDF/image, auto-extract salary structure & deductions, pre-fill the calculator | 🟢 Very high (kills #1 friction) | 🟡 Medium (needs multimodal LLM + parsing; needs API key) | Document ingestion, structured extraction, tool calling | **BUILD SECOND** |
| **F3** | **What-If Tax Planner Agent** — conversational "what if I invest X more?"; agent calls the tax engine as a tool and reasons over outcomes | 🟢 High (advisory feel, uses existing engine) | 🟢 High (tool calling over the pure-JS engine) | Tool calling, reasoning workflow, orchestration | **BUILD THIRD** |
| F4 | AIS / 26AS mismatch checker | 🟡 Medium-high | 🔴 Lower (sensitive docs, parsing complexity) | Document ingestion, reconciliation reasoning | V2 |
| F5 | Multi-year tax-profile drift analysis | 🟡 Medium | 🟡 Medium (needs persistence) | Reasoning, summarisation | V2 |

**F1 is built first** because (a) it directly attacks the trust gap that no competitor closes, (b) its core — semantic retrieval + cited snippets — runs **fully offline with open-source embeddings and zero API key**, with the LLM only *enhancing* the answer (consistent with ADR-003), and (c) it establishes the RAG + provider infrastructure that F2/F3 reuse.

---

## 5. Target Architecture & Technology Stack

### Principle
Keep the **deterministic tax engine** as the source of numerical truth. Layer AI *around* it for language, retrieval, and reasoning — **never** let an LLM compute tax. Preserve the no-backend, privacy-first, ₹0-cost ethos.

### New modular `ai/` subsystem
```
src/ai/
  llm/
    provider.js          # LLM provider interface (generate, generateJSON)
    geminiProvider.js    # Gemini 2.5 Flash (free tier) implementation
    index.js             # provider selection (env-driven, swappable)
  rag/
    embedder.js          # lazy open-source embeddings (transformers.js, in-browser)
    retriever.js         # cosine top-k over the static index (pure, testable)
    knowledgeBase.js     # loads the prebuilt vector index
    knowledge/*.md       # curated, cited source chunks (the corpus)
  qa/
    askTaxSathi.js       # orchestration: retrieve → synthesize → cite (+ fallback)
  geminiAdvisor.js       # existing insight layer (refactored onto llm/provider)
scripts/
  build-kb-index.mjs     # build-time: embed corpus → public/kb-index.json
```

### Stack — all free / open-source

| Concern | Choice | Why (free + fit) |
|---|---|---|
| **Embeddings** | `Xenova/all-MiniLM-L6-v2` via **transformers.js**, run **in the browser** | Fully open-source, **₹0**, no API key, **data never leaves the device** (privacy ADR), 384-dim, lazy-loaded so it never blocks first paint |
| **Vector store** | **In-browser flat index** (cosine over a precomputed static JSON) | Corpus is bounded (hundreds of cited chunks); no infra, instant, private. Documented scale-up path: **Qdrant Cloud free** / **Supabase pgvector free** when the corpus grows or becomes per-user |
| **LLM (synthesis/reasoning)** | **Gemini 2.5 Flash** free tier (1,500 req/day) behind a **provider interface** | Already integrated; free; multimodal (enables F2). Interface lets us swap in **Llama 3.1 via Groq free tier** or **Ollama (local, fully OSS)** with no app changes |
| **Orchestration** | **Minimal custom pipeline** (retriever → prompt builder → provider → citation mapper) | LangChain.js / LlamaIndex.ts are options but heavy; a small custom layer keeps the bundle light for Tier 2/3 mobile (ADR-005) while remaining modular & testable |
| **Source attribution** | Chunk-level metadata (`section`, `title`, `source`, `url`) surfaced as inline citations | Trust requirement for a compliance product |

### Key design decisions (ADRs)
- **ADR-007 — Open-source in-browser embeddings over an embeddings API.** Honors the free/OSS mandate, eliminates per-query cost, and keeps queries private. Trade-off: ~20 MB model download — mitigated by lazy-loading only when the user opens "Ask TaxSathi".
- **ADR-008 — Static in-browser vector index over a hosted vector DB.** For a curated, bounded corpus this is simpler, free, and private; we document Qdrant/Supabase as the migration path for F2's per-user document vectors.
- **ADR-009 — LLM as enhancement, retrieval as the guarantee.** Even with no API key, F1 returns **semantically-retrieved, cited snippets** (extractive). The LLM only adds a synthesized narrative. The product is useful offline and better online.
- **ADR-010 — Provider abstraction for model portability.** All LLM calls go through `ai/llm/provider.js`, so Gemini ↔ Groq/Llama ↔ Ollama is a one-file swap — no vendor lock-in.

---

## 6. Implementation Roadmap

**Increment 1 — Grounded Tax Knowledge Assistant (F1)** ← *this build*
1. Refactor `ai/llm` provider abstraction; move `geminiAdvisor` onto it.
2. Author the curated, cited tax knowledge base.
3. Build-time embedding script → static index; in-browser lazy embedder + cosine retriever (+ unit tests).
4. `askTaxSathi` orchestration with citations + extractive fallback.
5. "Ask TaxSathi" chat UI on the results page; Vite config for transformers.js; build & test.

**Increment 2 — Form 16 / Payslip Ingestion (F2)**
- Multimodal extraction via the LLM provider (Gemini vision, free tier) → structured JSON → validate → pre-fill the calculator. PDF/image upload, on-device pre-processing, confirmation UI before applying.

**Increment 3 — What-If Tax Planner Agent (F3)**
- Expose the pure-JS tax engine as callable **tools**; an agent loop interprets "what if…", calls `recommendRegime`/`analyseDeductions`, and explains the delta. Reasoning + tool calling + context management.

**V2 — F4 (AIS/26AS reconciliation), F5 (multi-year drift), optional migration to a hosted vector DB and a Groq/Llama provider for higher throughput.**

---

*All increments preserve: no backend, no PII leaving the device for retrieval, ₹0 running cost, and the deterministic engine as the single source of numerical truth.*
