/**
 * tokenize.js — minimal IR tokenizer for the lexical retriever.
 *
 * Keeps alphanumeric section tokens intact ("80c", "24b", "87a", "26as"),
 * lowercases, drops stopwords and 1-char tokens, and applies very light
 * suffix normalisation so "deductions" ≈ "deduction".
 */

const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "but", "by", "can", "do", "does",
  "for", "from", "had", "has", "have", "how", "i", "if", "in", "is", "it", "its",
  "me", "my", "no", "not", "of", "on", "or", "so", "than", "that", "the", "their",
  "them", "then", "there", "these", "they", "this", "to", "up", "was", "we", "what",
  "when", "which", "who", "will", "with", "would", "you", "your", "about", "any",
  "get", "got", "should", "could", "much", "many", "am", "i'm", "do",
]);

/** Light stemmer: trims common English suffixes without external deps. */
function normalise(token) {
  if (token.length <= 3) return token;
  return token
    .replace(/(ies)$/, "y")
    .replace(/(ing|ed|es|s)$/, "")
    .replace(/(tion)$/, "t");
}

/** @returns {string[]} */
export function tokenize(text) {
  if (!text) return [];
  const raw = String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/);
  const out = [];
  for (const t of raw) {
    if (!t || t.length < 2) continue;
    if (STOPWORDS.has(t)) continue;
    out.push(normalise(t));
  }
  return out;
}
