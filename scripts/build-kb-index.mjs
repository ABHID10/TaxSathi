/**
 * build-kb-index.mjs — OPTIONAL dense-embedding index builder.
 *
 * The shipped feature uses BM25 lexical retrieval (no build step, works
 * offline). This script is the opt-in upgrade to DENSE retrieval: it embeds
 * every KB chunk with Gemini's free `text-embedding-004` model and writes
 * public/kb-index.json. At runtime the browser embeds the query with the same
 * model (see src/ai/rag/embedder.js) and the retriever switches to cosine
 * similarity automatically when the index is present.
 *
 * We use Gemini embeddings (not a Hugging Face model) because many corporate
 * networks block the HF CDN; the Google endpoint is generally reachable and
 * the embeddings API is free-tier.
 *
 * Run:  GEMINI_API_KEY=xxx npm run build:kb       (PowerShell: $env:GEMINI_API_KEY="xxx"; npm run build:kb)
 */
import { GoogleGenerativeAI } from "@google/generative-ai";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { KNOWLEDGE, KB_VERSION } from "../src/ai/rag/knowledge/taxKnowledge.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../public/kb-index.json");
const MODEL = "text-embedding-004";

const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
if (!apiKey) {
  console.error(
    "[kb] No GEMINI_API_KEY found. Dense index is optional — the app works with\n" +
      "     BM25 lexical retrieval without it. Set GEMINI_API_KEY to build a dense index."
  );
  process.exit(1);
}

async function main() {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: MODEL });

  console.log(`[kb] embedding ${KNOWLEDGE.length} chunks with ${MODEL}…`);
  const chunks = [];
  let dim = 0;
  for (const c of KNOWLEDGE) {
    const res = await model.embedContent(`${c.title}. ${c.text}`);
    const vector = res.embedding.values.map((x) => +x.toFixed(6));
    dim = vector.length;
    chunks.push({
      id: c.id, section: c.section, title: c.title,
      source: c.source, url: c.url, text: c.text, vector,
    });
    process.stdout.write(".");
  }
  process.stdout.write("\n");

  const index = { version: KB_VERSION, model: MODEL, dim, count: chunks.length, chunks };
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(index));
  console.log(`[kb] wrote ${OUT} — ${chunks.length} chunks, dim ${dim}`);
}

main().catch((err) => {
  console.error("[kb] failed:", err?.message || err);
  process.exit(1);
});
