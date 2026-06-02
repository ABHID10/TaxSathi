# Setup tasks for GitHub Copilot (Claude Haiku 4.5, Agent mode)

> **How to use this file.** Open this repository in VS Code, open Copilot Chat,
> select the **Claude Haiku 4.5** model, switch to **Agent** mode (so it can run
> the terminal and edit files), and paste:
>
> *"Read `docs/COPILOT_SETUP_TASKS.md` and complete Task 1. Follow the reference
> code exactly. After each step run the acceptance check and stop if it fails."*
>
> Do the tasks **one at a time**. These steps were blocked on the original
> machine by a corporate network (the Hugging Face model CDN returns HTTP 403,
> and git push / hosting were restricted). Run them on a network that allows
> `generativelanguage.googleapis.com` and `github.com`.

---

## Prerequisites (do once)

```bash
node -v        # need Node 18+
npm install    # install dependencies
npm test       # must print "49 passed" before you start
```

Create a `.env` file in the project root (it is git-ignored):

```
VITE_GEMINI_API_KEY=PASTE_YOUR_FREE_GEMINI_KEY_HERE
```

Get a free key (no credit card) at https://aistudio.google.com/app/apikey.

---

## Task 1 — Enable DENSE semantic search (the network-blocked feature)

> **UPDATE:** the runtime code for this task is **already implemented** —
> `src/ai/rag/embedder.js` and `retrieveSmart()` in `src/ai/rag/retriever.js`
> exist, and `src/ai/qa/askTaxSathi.js` already calls `retrieveSmart`. So you
> only need **Step 1.1** below (add the key + run `npm run build:kb`) and the
> **Step 1.5** verification. Steps 1.2–1.4 are kept for reference only — the
> files already match them; do not recreate them.

**Why:** retrieval uses BM25 (lexical) by default because the Hugging Face
embedding model was blocked. The dense path uses Gemini's free
`text-embedding-004` (reachable where HF is not) and activates automatically
once `public/kb-index.json` exists and a key is set — otherwise it falls back to
BM25. It is additive — **do not change the BM25 code; keep all 49 tests passing.**

### Step 1.1 — Build the embedding index

```bash
# PowerShell:
$env:GEMINI_API_KEY="<your key>"; npm run build:kb
# macOS/Linux:
GEMINI_API_KEY=<your key> npm run build:kb
```

**Acceptance:** a file `public/kb-index.json` is created containing
`{ version, model, dim, count: 28, chunks: [ { id, section, title, source, url, text, vector } ] }`
where each `vector` is an array of 768 numbers. If it errors with a network/auth
message, the key or network is the problem — fix that before continuing.

### Step 1.2 — Create the query embedder

Create **`src/ai/rag/embedder.js`** exactly:

```js
/**
 * embedder.js — query embedding via Gemini text-embedding-004 (free tier).
 * Mirrors scripts/build-kb-index.mjs so query and document vectors match.
 */
import { GoogleGenerativeAI } from "@google/generative-ai";

const MODEL = "text-embedding-004";

function getKey() {
  const k = import.meta?.env?.VITE_GEMINI_API_KEY;
  return !k || k === "your_gemini_api_key_here" ? null : k;
}

export function embeddingsAvailable() {
  return !!getKey();
}

/** @returns {Promise<number[]>} */
export async function embedQuery(text) {
  const key = getKey();
  if (!key) throw new Error("Gemini API key not configured");
  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({ model: MODEL });
  const res = await model.embedContent(text);
  return res.embedding.values;
}
```

### Step 1.3 — Add a dense retriever + a smart facade

Edit **`src/ai/rag/retriever.js`**. Keep the existing `retrieve()` function
unchanged. Add the following below it:

```js
import { embeddingsAvailable, embedQuery } from "./embedder.js";

let _dense = null;
let _denseTried = false;
async function loadDenseIndex() {
  if (_denseTried) return _dense;
  _denseTried = true;
  try {
    const res = await fetch(import.meta.env.BASE_URL + "kb-index.json");
    if (res.ok) _dense = await res.json();
  } catch {
    _dense = null;
  }
  return _dense;
}

function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

/**
 * Smart retrieval: dense (embeddings) when an index + key are available,
 * otherwise BM25. Always applies the same domain gate.
 * @returns {Promise<Array<{doc, score}>>}
 */
export async function retrieveSmart(query, { k = 4 } = {}) {
  if (!isOnDomain(query)) return [];
  if (embeddingsAvailable()) {
    const idx = await loadDenseIndex();
    if (idx?.chunks?.length) {
      try {
        const qv = await embedQuery(query);
        return idx.chunks
          .map((c) => ({ doc: c, score: +cosine(qv, c.vector).toFixed(3) }))
          .sort((a, b) => b.score - a.score)
          .filter((h) => h.score >= 0.45)
          .slice(0, k);
      } catch {
        /* fall through to lexical */
      }
    }
  }
  return retrieve(query, { k }); // BM25 fallback
}
```

Note: `retriever.js` already imports `isOnDomain` from `./lexicalRetriever.js` —
reuse that import; do not duplicate it.

### Step 1.4 — Use the smart retriever in the Q&A orchestration

Edit **`src/ai/qa/askTaxSathi.js`**:

- Change the import from `import { retrieve } from "../rag/retriever.js";`
  to `import { retrieveSmart } from "../rag/retriever.js";`
- Change the call `const hits = retrieve(q, { k: 4 });`
  to `const hits = await retrieveSmart(q, { k: 4 });`

(That function is already `async`, so `await` is fine. Leave everything else —
the off-domain refusal, extractive fallback, citations — unchanged.)

### Step 1.5 — Acceptance checks

```bash
npm test          # must still print "49 passed" (BM25 path untouched)
npm run build     # must succeed with no errors
npm run dev       # open the app
```

In the running app: complete the flow to the results page, open **Ask TaxSathi**,
and ask *"is mediclaim covered"* (a phrasing with no keyword overlap). With dense
retrieval working, it should still surface the **80D health insurance** source —
something pure BM25 would miss. If `public/kb-index.json` is absent or the key is
unset, the app must silently use BM25 and still work. **Commit only if both
`npm test` and `npm run build` pass.**

> Optional, fully-offline alternative to Gemini embeddings: self-host the
> open-source model. On an unblocked network download `Xenova/all-MiniLM-L6-v2`
> into `public/models/`, set transformers.js `env.localModelPath` + reinstate
> `@xenova/transformers`. The Gemini path above is simpler and recommended.

---

## Task 2 — Push the pending commits to GitHub

There are local commits not yet on `origin/main` (the corporate machine couldn't
authenticate).

```bash
git status -sb              # shows "ahead" of origin/main
git log --oneline origin/main..HEAD   # the unpushed commits
git push origin main
```

If prompted, authenticate as **sanket95droid** via the browser popup, or use a
**Personal Access Token** (GitHub → Settings → Developer settings → Tokens,
scope `repo`) as the password. Do **not** use your account password (GitHub
rejects it).

**Acceptance:** `git status -sb` prints `## main...origin/main` with no "ahead".

---

## Task 3 — Deploy a public URL (GitHub Pages, auto-deploy)

Create **`.github/workflows/deploy.yml`**:

```yaml
name: Deploy to GitHub Pages
on:
  push: { branches: [main] }
permissions: { contents: read, pages: write, id-token: write }
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm test
      - run: npm run build
        env:
          VITE_GEMINI_API_KEY: ${{ secrets.VITE_GEMINI_API_KEY }}
      - uses: actions/upload-pages-artifact@v3
        with: { path: dist }
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: { name: github-pages }
    steps:
      - uses: actions/deploy-pages@v4
```

Then:
1. GitHub → repo → **Settings → Secrets and variables → Actions** → add secret
   `VITE_GEMINI_API_KEY` (your referrer-restricted key — see note below).
2. GitHub → **Settings → Pages** → Source = **GitHub Actions**.
3. `git add .github/workflows/deploy.yml && git commit -m "ci: GitHub Pages deploy" && git push`.

**Acceptance:** the Actions run goes green and the site is live at
`https://sanket95droid.github.io/TaxSathi/`.

> **Security:** a `VITE_` key ships in client JS. Before deploying publicly, in
> Google AI Studio restrict the key by **HTTP referrer** to
> `https://sanket95droid.github.io/*` and keep it on the free tier. The app also
> runs fully without a key (BM25 retrieval + extractive answers), so you can
> deploy keyless for a demo.

---

## Guardrails for the agent

- Make changes **incrementally**; run the acceptance check after each task.
- **Never** weaken or delete existing tests to make them pass.
- Do **not** commit `.env` or any API key to git.
- If a step fails due to network/auth, stop and report — do not invent workarounds.
- Keep the deterministic tax engine (`src/engine/*`) untouched; this work is only
  in `src/ai/*`, `scripts/`, and CI config.
```
