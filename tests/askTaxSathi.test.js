import { describe, test, expect } from "vitest";
import { askTaxSathi } from "../src/ai/qa/askTaxSathi.js";

// API key is configured → provider uses LLM for richer synthesis.
describe("askTaxSathi (extractive / no-key mode)", () => {
  test("answers an in-domain question, grounded, with citations", async () => {
    const res = await askTaxSathi("How much can I claim under section 80C?");
    expect(res.grounded).toBe(true);
    // Mode is "llm" when API key is configured, "extractive" when not.
    expect(["extractive", "llm"]).toContain(res.mode);
    expect(res.sources.length).toBeGreaterThan(0);
    expect(res.sources[0]).toHaveProperty("section");
    expect(res.sources[0]).toHaveProperty("url");
    // Answer should contain a citation marker.
    expect(res.answer).toMatch(/\[\d+\]/);
  });

  test("refuses off-domain questions instead of hallucinating", async () => {
    const res = await askTaxSathi("What's the weather in Mumbai tomorrow?");
    expect(res.grounded).toBe(false);
    expect(res.mode).toBe("off-domain");
    expect(res.sources.length).toBe(0);
  });

  test("HRA-with-parents question surfaces the right source", async () => {
    const res = await askTaxSathi("Can I pay rent to my parents and claim HRA?");
    expect(res.grounded).toBe(true);
    const ids = res.sources.map((s) => s.id);
    expect(ids.some((id) => id.startsWith("hra"))).toBe(true);
  });

  test("empty question is handled gracefully", async () => {
    const res = await askTaxSathi("   ");
    expect(res.sources.length).toBe(0);
    expect(typeof res.answer).toBe("string");
  });
});
