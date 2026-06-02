import { describe, test, expect } from "vitest";
import { tokenize } from "../src/ai/rag/tokenize.js";
import { buildIndex, search } from "../src/ai/rag/lexicalRetriever.js";
import { retrieve } from "../src/ai/rag/retriever.js";
import { KNOWLEDGE } from "../src/ai/rag/knowledge/taxKnowledge.js";

describe("tokenize", () => {
  test("keeps alphanumeric section tokens like 80c / 24b / 87a", () => {
    const t = tokenize("What is the 80C and 24b and 87A limit?");
    expect(t).toContain("80c");
    expect(t).toContain("24b");
    expect(t).toContain("87a");
  });

  test("drops stopwords and 1-char tokens", () => {
    const t = tokenize("I am in the a");
    expect(t).not.toContain("the");
    expect(t).not.toContain("a");
  });
});

describe("BM25 search over the knowledge base", () => {
  const index = buildIndex(KNOWLEDGE);

  test("retrieves the HRA chunk for a lay phrasing (synonym expansion)", () => {
    const hits = search(index, "can I claim house rent allowance living with my parents", 4);
    const ids = hits.map((h) => h.doc.id);
    expect(ids.some((id) => id.startsWith("hra"))).toBe(true);
  });

  test("retrieves 80C for a PPF/ELSS investment question", () => {
    const hits = search(index, "how much can I invest in PPF or ELSS to save tax", 3);
    expect(hits[0].doc.id).toBe("sec-80c");
  });

  test("retrieves the regime-slabs chunk for a new-regime question", () => {
    const hits = search(index, "what are the new regime tax slabs for this year", 3);
    const ids = hits.map((h) => h.doc.id);
    expect(ids).toContain("new-regime-slabs");
  });

  test("top result carries a normalised score of 1.0", () => {
    const hits = search(index, "section 80D health insurance for parents", 3);
    expect(hits[0].score).toBe(1);
    expect(hits[0].doc.id).toBe("sec-80d");
  });

  test("returns empty for clearly off-domain queries", () => {
    const hits = search(index, "best recipe to cook pasta with cheese", 4);
    // No tax terms → no postings match.
    expect(hits.length).toBe(0);
  });
});

describe("retrieve facade", () => {
  test("applies minScore guardrail", () => {
    const good = retrieve("home loan interest deduction limit", { k: 3 });
    expect(good.length).toBeGreaterThan(0);
    expect(good[0].score).toBeGreaterThanOrEqual(0.12);
  });

  test("off-domain query returns no hits", () => {
    expect(retrieve("who won the cricket match yesterday").length).toBe(0);
  });
});
