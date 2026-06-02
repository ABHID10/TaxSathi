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

let _index = null;
function getIndex() {
  if (!_index) _index = buildIndex(KNOWLEDGE);
  return _index;
}

/**
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
