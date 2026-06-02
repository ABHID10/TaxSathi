/**
 * lexicalRetriever.js — BM25 sparse retrieval over the tax knowledge base.
 *
 * Why BM25 (ADR-011): it needs no model download, no network, no API key, and
 * runs identically at build time and in the browser — essential because the
 * Hugging Face model CDN is blocked on many corporate networks. BM25 is a
 * standard, strong RAG retriever for bounded, curated corpora. The dense
 * (embedding) retriever is a documented opt-in upgrade behind the same API.
 *
 * Pure and testable: buildIndex(docs) + search(index, query, k) take explicit
 * inputs; the module-level helpers default to the shipped knowledge base.
 */
import { tokenize } from "./tokenize.js";

const K1 = 1.5;
const B = 0.75;

/**
 * Query-expansion: map common lay phrasings to the canonical section tokens
 * the corpus uses, so "house rent allowance" or "mediclaim" still retrieve.
 */
const SYNONYMS = [
  [/house\s*rent\s*allowance|rent\s*allowance|hra/, "hra rent 10 13a"],
  [/national\s*pension|pension\s*scheme|\bnps\b/, "nps 80ccd pension"],
  [/mediclaim|health\s*insurance|medical\s*insurance/, "80d health insurance"],
  [/home\s*loan|housing\s*loan|house\s*loan/, "24b home loan interest"],
  [/ppf|elss|provident\s*fund|life\s*insurance|tax\s*saving/, "80c"],
  [/rebate/, "87a rebate"],
  [/standard\s*deduction/, "standard deduction 16"],
  [/which\s*regime|old\s*vs\s*new|old\s*or\s*new|better\s*regime/, "regime old new"],
  [/\bitr\b|file\s*return|filing|tax\s*return/, "itr return filing"],
  [/form\s*16/, "form 16 tds"],
  [/\bais\b|26\s*as/, "ais 26as"],
  [/due\s*date|deadline|last\s*date/, "due date 139"],
  [/cess/, "cess"],
  [/surcharge/, "surcharge"],
  [/savings?\s*(account|bank)?\s*interest|80tta/, "80tta savings interest"],
  [/parents?/, "parents"],
  [/switch|change\s*regime|opt/, "switch regime 10iea"],
  [/lta|leave\s*travel/, "lta travel"],
];

function expand(query) {
  let extra = "";
  const q = query.toLowerCase();
  for (const [re, add] of SYNONYMS) {
    if (re.test(q)) extra += " " + add;
  }
  return query + extra;
}

/**
 * Tax-domain trigger substrings. A query is "on domain" only if it contains a
 * recognised tax concept or matches a synonym phrase. This stops incidental
 * token overlap (e.g. "weather in Mumbai") from being treated as a tax hit —
 * a known failure mode of pure lexical scoring with score normalisation.
 */
const TRIGGERS = [
  "80c", "80d", "80cc", "80tta", "80ttb", "24b", "87a", "10(13a)", "115bac",
  "hra", "nps", "ppf", "elss", "epf", "lic", "regime", "deduct", "tax",
  "salary", "salaried", "rebate", "itr", "cess", "surcharge", "lta", "tds",
  "ais", "26as", "form 16", "form16", "12bb", "10-iea", "10iea", "slab",
  "exempt", "insurance", "mediclaim", "home loan", "house loan", "housing loan",
  "rent", "pension", "interest", "invest", "income", "filing", "file return",
  "due date", "standard deduction", "capital gain", "professional tax",
  "old regime", "new regime",
];

/** @returns {boolean} whether the query is within TaxSathi's knowledge domain. */
export function isOnDomain(query) {
  const q = (query || "").toLowerCase();
  if (!q.trim()) return false;
  if (SYNONYMS.some(([re]) => re.test(q))) return true;
  return TRIGGERS.some((t) => q.includes(t));
}

/**
 * Build a BM25 index from documents.
 * @param {Array<{id,title,section,text,...}>} docs
 */
export function buildIndex(docs) {
  const postings = docs.map((d) => {
    // Boost title + section by repeating them in the term bag.
    const tokens = tokenize(`${d.title} ${d.section} ${d.section} ${d.title} ${d.text}`);
    const tf = new Map();
    for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
    return { doc: d, tf, len: tokens.length };
  });

  const N = postings.length;
  const df = new Map();
  for (const p of postings) {
    for (const term of p.tf.keys()) df.set(term, (df.get(term) || 0) + 1);
  }
  const idf = new Map();
  for (const [term, count] of df) {
    // BM25 idf with +1 smoothing (always positive).
    idf.set(term, Math.log(1 + (N - count + 0.5) / (count + 0.5)));
  }
  const avgdl = postings.reduce((a, p) => a + p.len, 0) / Math.max(1, N);
  return { postings, idf, avgdl, N };
}

/**
 * Search the index. Returns top-k docs with normalised scores [0..1].
 * @returns {Array<{doc, score, raw}>}
 */
export function search(index, query, k = 4) {
  const terms = tokenize(expand(query));
  if (!terms.length) return [];

  const scored = index.postings.map((p) => {
    let s = 0;
    for (const term of terms) {
      const f = p.tf.get(term);
      if (!f) continue;
      const idf = index.idf.get(term) || 0;
      const denom = f + K1 * (1 - B + (B * p.len) / index.avgdl);
      s += idf * ((f * (K1 + 1)) / denom);
    }
    return { doc: p.doc, raw: s };
  });

  const max = Math.max(...scored.map((x) => x.raw), 0);
  return scored
    .filter((x) => x.raw > 0)
    .map((x) => ({ ...x, score: max > 0 ? +(x.raw / max).toFixed(3) : 0 }))
    .sort((a, b) => b.raw - a.raw)
    .slice(0, k);
}
