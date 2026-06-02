# Deep Dive: The RAG Pipeline (Ask TaxSathi)

"Ask TaxSathi" answers tax questions **grounded in a curated, cited rulebook** instead of from an LLM's memory. This is the difference between a tool you can trust in a compliance domain and a chatbot that confidently invents section numbers.

Files: `src/ai/rag/*`, `src/ai/qa/askTaxSathi.js`, `src/ai/llm/*`, `src/components/AskTaxSathi.jsx`

```
question → [domain gate] → [retrieve] → [ground] → [synthesize | extractive] → answer + citations
```

---

## 0. Why RAG, not a plain LLM call

Ask a raw model "what's the 80C limit?" and it may return a wrong or stale figure with total confidence. In tax, that can trigger a notice. RAG (Retrieval-Augmented Generation) removes the model's licence to invent: we **retrieve** the actual relevant rules from a trusted corpus, pass them in as context, and instruct the model to answer **only** from them and **cite** them. The model becomes a rephraser of verified text, not a source of facts.

---

## 1. The knowledge base — `rag/knowledge/taxKnowledge.js`

28 hand-curated chunks, each a single self-contained, citable fact:

```js
{
  id: "sec-80c",
  section: "80C",
  title: "Section 80C deductions",
  source: "Income Tax Act · Section 80C",
  url: "https://incometax.gov.in",
  text: "Section 80C allows a deduction of up to ₹1,50,000 per year (old regime only)…"
}
```

Design choices:
- **One concept per chunk** → retrieval returns *precisely* the relevant rule and citations point to something specific.
- **Metadata travels with the text** (`section`, `source`, `url`) → this becomes the clickable citation (source attribution).
- **Versioned** (`KB_VERSION = "FY2025-26.v1"`) → a Budget update is a content edit, not a code change.

---

## 2. Retrieval: BM25 — `rag/lexicalRetriever.js`

The original plan used dense embeddings via a Hugging Face model. **Your corporate network returns HTTP 403 for `huggingface.co`**, so the model can't download at build time *or* in the browser. I refactored to **BM25** — the standard ranking function behind Lucene/Elasticsearch — which needs no model, no key, and no network (ADR-011).

### 2a. Tokenizer — `rag/tokenize.js`
Lowercase → split on non-alphanumerics → drop stopwords & 1-char tokens → light stemming. The key detail: it keeps `[a-z0-9]+` runs intact so **`80c`, `24b`, `87a`, `26as` survive as single tokens** — the most discriminating terms in tax text. A naive tokenizer splitting "80c" into "80"+"c" would destroy them.

### 2b. Index + field boosting
Per chunk we build a term-frequency map, **repeating title + section** so matches there outrank incidental body mentions:
```js
tokenize(`${d.title} ${d.section} ${d.section} ${d.title} ${d.text}`)
```
Then **IDF** (rare terms carry more signal):
```
idf(t) = log(1 + (N − df + 0.5) / (df + 0.5))
```

### 2c. Scoring
```
score(doc) = Σ_terms  idf(t) · ( f·(k1+1) ) / ( f + k1·(1 − b + b·len/avgdl) )      k1=1.5, b=0.75
```
High score = contains **rare query terms**, **multiple times**, **relative to doc length** (length normalisation stops verbose chunks winning by bulk). Scores are normalised to `[0,1]` for display.

### 2d. Query expansion (lay → canonical)
Users say "house rent allowance", not "Section 10(13A)". Before scoring we expand:
```js
[/house\s*rent\s*allowance|rent\s*allowance|hra/, "hra rent 10 13a"],
[/mediclaim|health\s*insurance/,                  "80d health insurance"],
[/national\s*pension|\bnps\b/,                     "nps 80ccd pension"],
```
So "Can I claim **house rent allowance**…" silently gains "hra rent 10 13a" and matches the HRA chunk. Lightweight semantic bridging without a model.

---

## 3. The domain gate — refusing off-topic questions

A bug caught during testing: **"weather in Mumbai tomorrow" returned the HRA chunk** — because "Mumbai" appears in its metro-cities list — and score normalisation made that weak match look like a perfect 1.0. Lexical retrieval has no concept of "is this even a tax question?"

Fix: a **domain gate** that runs *first* in `retrieve()`:

```js
export function retrieve(query, { k = 4, minScore = 0.12 } = {}) {
  if (!isOnDomain(query)) return [];             // refuse off-topic outright
  const hits = search(getIndex(), query, k);
  return hits.filter(h => h.score >= minScore);  // trim weak secondary hits
}
```

`isOnDomain` requires a recognised tax concept — a section code, a term like *regime/deduction/HRA/ITR*, or a synonym phrase. "weather in Mumbai" matches none → refused. This is what lets the app honestly say "I don't have that, check a CA" instead of hallucinating a tangent.

---

## 4. Orchestration — `qa/askTaxSathi.js`

```
retrieve(q, k=4)
  → no hits         → OFF_DOMAIN refusal, grounded:false
  → build sources[] = [{ n, section, title, source, url }]
  → provider NOT configured → extractive answer (top-2 chunks verbatim + [1][2])
  → provider configured     → LLM synthesis under a strict grounding prompt
  → LLM error / 429         → fall back to extractive
returns { answer, sources[], grounded, mode }
```

The grounding prompt is a cage, not a hint (temperature 0.2):

> *"Answer using ONLY the numbered context snippets. Cite like [1]. NEVER invent section numbers or limits not in the context. If the context doesn't cover it, say you don't have that detail."*

Two principles:

- **Retrieval is the guarantee; the LLM is enhancement (ADR-009).** With **no API key** you still get a real, grounded, cited answer — the top chunks returned verbatim with `[1][2]` markers. The LLM only makes it read more naturally. The feature works fully offline and degrades gracefully (rate-limit/offline → extractive).
- **Uniform return shape** regardless of mode (`llm` / `extractive` / `off-domain`), so the UI doesn't branch on provider state.

---

## 5. Source attribution in the UI — `components/AskTaxSathi.jsx`

The answer text contains markers like `[1]`. We split on them and render superscript chips, then list the sources beneath, each linking to its statute:

```js
text.split(/(\[\d+\])/g)  // "[1]" → <sup class="cite-marker">1</sup>
```

Trust loop closed: every claim → a numbered marker → a verifiable source (`section · title · source`, linked to incometax.gov.in).

---

## 6. Pluggable abstractions (so it scales)

- **LLM provider — `ai/llm/getProvider()`** (ADR-010): every model call goes through one interface (`generate({system, prompt})`). Gemini today; swapping to Groq/Llama or local Ollama is a one-file change.
- **Retriever — `retrieve()`**: orchestration depends only on this signature, which makes the dense upgrade drop-in.

### The dense-embedding upgrade
For true semantic matching (catches paraphrases BM25 can't), run:
```powershell
$env:GEMINI_API_KEY="…"; npm run build:kb
```
`scripts/build-kb-index.mjs` embeds every chunk with Gemini's free `text-embedding-004` → `public/kb-index.json`. At runtime the browser embeds the *query* with the same model and ranks by **cosine similarity** — same `retrieve()` API, nothing downstream changes. I chose **Gemini embeddings, not Hugging Face**, precisely because your network blocks HF but allows Google.

---

## 7. Honest limitations

- **BM25 is lexical, not semantic.** Query expansion patches common cases; a truly novel phrasing with zero keyword overlap can miss. The dense path fixes this.
- **Bounded corpus (28 chunks).** A *feature* for an in-browser flat index (instant, private, free). Per-user document stores (Form 16 uploads, F2) graduate to a real vector DB — Qdrant / Supabase pgvector free tiers are the documented migration (ADR-008).
- **Coverage = the KB.** It only knows what's curated; the domain gate makes that boundary explicit rather than papering over it.

---

## 8. Tests

13 tests in `tests/ragRetriever.test.js` and `tests/askTaxSathi.test.js` cover: tokenizer keeps section codes; BM25 ranks the right chunk for lay phrasings; the domain gate refuses off-topic queries; the top hit normalises to 1.0; extractive mode returns grounded, cited answers with no key; and off-domain questions are refused, not answered. 49 tests total across the project.
