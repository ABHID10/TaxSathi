/**
 * retriever.js — retrieval facade for the RAG pipeline.
 *
 * Default scorer: BM25 lexical (no model, no key, works offline/anywhere).
 * The index is built once (lazily) from the shipped knowledge base.
 *
 * A dense embedding retriever can be slotted in behind this same `retrieve`
 * API (see ai/rag/embedder.js + scripts/build-kb-index.mjs) without changing
 * any caller — the QA orchestration only depends on this signature.
 */
import { KNOWLEDGE } from "./knowledge/taxKnowledge.js";
import { buildIndex, search, isOnDomain } from "./lexicalRetriever.js";
import { embeddingsAvailable, embedQuery } from "./embedder.js";

let _index = null;
function getIndex() {
  if (!_index) _index = buildIndex(KNOWLEDGE);
  return _index;
}

/**
 * BM25 lexical retrieval — synchronous, no model, no key, works offline.
 * This is the default and the guaranteed fallback.
 * @param {string} query
 * @param {{k?:number, minScore?:number}} opts
 * @returns {Array<{doc, score}>} top matches (may be empty for off-domain queries)
 */
export function retrieve(query, { k = 4, minScore = 0.12 } = {}) {
  // Domain gate first: refuse off-topic queries rather than matching on an
  // incidental shared token (e.g. a city name) and surfacing an irrelevant chunk.
  if (!isOnDomain(query)) return [];
  const hits = search(getIndex(), query, k);
  // minScore trims weak secondary hits relative to the best match.
  return hits.filter((h) => h.score >= minScore);
}

// ─── Optional DENSE path (Gemini text-embedding-004) ─────────────────────────
// Activates only when a key is configured AND public/kb-index.json exists
// (built via `npm run build:kb`). Otherwise everything falls back to BM25, so
// this is a strict upgrade behind the same retrieval contract.

const DENSE_MIN_SCORE = 0.45; // cosine floor for a relevant match

let _dense = null;
let _denseTried = false;
async function loadDenseIndex() {
  if (_denseTried) return _dense;
  _denseTried = true;
  try {
    const base = import.meta?.env?.BASE_URL ?? "/";
    const res = await fetch(base + "kb-index.json");
    if (res.ok) {
      const idx = await res.json();
      if (idx?.chunks?.length) _dense = idx;
    }
  } catch {
    _dense = null; // no index shipped → stay on BM25
  }
  return _dense;
}

function cosine(a, b) {
  let dot = 0,
    na = 0,
    nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

/**
 * Smart retrieval: semantic (dense embeddings) when available, else BM25.
 * Same return shape and domain gate as retrieve(). Always async.
 * @returns {Promise<Array<{doc, score}>>}
 */
export async function retrieveSmart(query, { k = 4 } = {}) {
  if (!isOnDomain(query)) return [];

  if (embeddingsAvailable()) {
    try {
      const idx = await loadDenseIndex();
      if (idx) {
        const qv = await embedQuery(query);
        const dense = idx.chunks
          .map((c) => ({ doc: c, score: +cosine(qv, c.vector).toFixed(3) }))
          .sort((a, b) => b.score - a.score)
          .filter((h) => h.score >= DENSE_MIN_SCORE)
          .slice(0, k);
        if (dense.length) return dense; // dense is a strict upgrade when it hits
      }
    } catch {
      /* network/auth/index error → fall through to BM25 */
    }
  }

  return retrieve(query, { k });
}
