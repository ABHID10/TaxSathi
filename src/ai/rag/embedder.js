/**
 * embedder.js — query embedding via Gemini text-embedding-004 (free tier).
 *
 * This is the runtime half of the optional DENSE retrieval path. It must use
 * the SAME model as scripts/build-kb-index.mjs so query and document vectors
 * live in the same space. If no key is configured, the retriever falls back to
 * BM25 — so this file is purely an enhancement.
 */
import { GoogleGenerativeAI } from "@google/generative-ai";

const MODEL = "text-embedding-004";

function getKey() {
  const k = import.meta?.env?.VITE_GEMINI_API_KEY;
  return !k || k === "your_gemini_api_key_here" ? null : k;
}

/** True when a Gemini key is configured (enables dense retrieval). */
export function embeddingsAvailable() {
  return !!getKey();
}

/**
 * Embed a query string.
 * @returns {Promise<number[]>} the embedding vector (768-dim for text-embedding-004)
 * @throws if no key is configured or the API errors (caller falls back to BM25)
 */
export async function embedQuery(text) {
  const key = getKey();
  if (!key) throw new Error("Gemini API key not configured");
  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({ model: MODEL });
  const res = await model.embedContent(text);
  return res.embedding.values;
}
