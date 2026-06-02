/**
 * askTaxSathi.js — grounded tax Q&A orchestration (RAG).
 *
 * Pipeline:  retrieve (BM25)  →  guardrail  →  synthesize (LLM)  ||  extractive
 *
 * Guarantees:
 * - Answers are grounded ONLY in the curated knowledge base (no open-web claims).
 * - Every answer carries source citations (source attribution / trust).
 * - Works with NO API key: falls back to returning the retrieved snippets
 *   verbatim with citations (ADR-009: retrieval is the guarantee, LLM enhances).
 * - Off-domain questions are refused rather than hallucinated.
 */
import { retrieve } from "../rag/retriever.js";
import { getProvider } from "../llm/index.js";

const SYSTEM_PROMPT = `You are TaxSathi, a friendly Indian tax assistant for FY 2025-26 (AY 2026-27).
Answer the user's question using ONLY the numbered context snippets provided.
Rules:
- Cite the snippets you use inline, like [1] or [2].
- Be concise (under 120 words), warm, and in plain English.
- Use exact figures from the context; NEVER invent section numbers, limits, or rules not present in the context.
- If the context does not contain the answer, say you don't have that detail and suggest checking incometax.gov.in or a Chartered Accountant.
- Do not give advice on capital gains, business income, or foreign income beyond what the context states.
Output only the answer text.`;

const OFF_DOMAIN =
  "I don't have that in my tax knowledge base yet. I cover the old-vs-new regime choice and common salaried deductions (80C, 80D, HRA, home loan, NPS, etc.) for FY 2025-26. For this one, please check incometax.gov.in or a Chartered Accountant.";

function toSources(hits) {
  return hits.map((h, i) => ({
    n: i + 1,
    id: h.doc.id,
    title: h.doc.title,
    section: h.doc.section,
    source: h.doc.source,
    url: h.doc.url,
    score: h.score,
  }));
}

function buildContext(hits) {
  return hits
    .map((h, i) => `[${i + 1}] (${h.doc.section} — ${h.doc.title}) ${h.doc.text}`)
    .join("\n\n");
}

/** Extractive answer when no LLM is available — still grounded & cited. */
function extractiveAnswer(hits) {
  const top = hits.slice(0, 2);
  const body = top.map((h, i) => `${h.doc.text} [${i + 1}]`).join(" ");
  return `Here's what the rules say: ${body}`;
}

/**
 * @param {string} question
 * @returns {Promise<{answer, sources, grounded, mode, error?}>}
 */
export async function askTaxSathi(question) {
  const q = (question || "").trim();
  if (!q) return { answer: "Ask me anything about your tax regime or deductions.", sources: [], grounded: false, mode: "empty" };

  const hits = retrieve(q, { k: 4 });
  if (!hits.length) {
    return { answer: OFF_DOMAIN, sources: [], grounded: false, mode: "off-domain" };
  }

  const sources = toSources(hits);
  const provider = getProvider();

  if (!provider.isConfigured()) {
    return { answer: extractiveAnswer(hits), sources, grounded: true, mode: "extractive" };
  }

  try {
    const prompt = `Question: ${q}\n\nContext:\n${buildContext(hits)}\n\nAnswer (cite snippets like [1]):`;
    const text = await provider.generate({ system: SYSTEM_PROMPT, prompt, temperature: 0.2 });
    return {
      answer: text || extractiveAnswer(hits),
      sources,
      grounded: true,
      mode: text ? "llm" : "extractive",
    };
  } catch (err) {
    // Rate-limited / offline → graceful, still-grounded fallback.
    return {
      answer: extractiveAnswer(hits),
      sources,
      grounded: true,
      mode: "extractive",
      error: err?.message || "LLM unavailable",
    };
  }
}
