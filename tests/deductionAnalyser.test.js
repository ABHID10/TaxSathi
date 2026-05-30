import { describe, test, expect } from "vitest";
import { analyseDeductions, marginalRate } from "../src/engine/deductionAnalyser.js";
import { calculateOldRegimeTax } from "../src/engine/taxCalculator.js";

describe("marginalRate", () => {
  test("₹4L taxable → 5% slab", () => expect(marginalRate(400000)).toBe(0.05));
  test("₹8L taxable → 20% slab", () => expect(marginalRate(800000)).toBe(0.2));
  test("₹20L taxable → 30% slab", () => expect(marginalRate(2000000)).toBe(0.3));
});

describe("analyseDeductions", () => {
  const input = { ctc: 1500000, sec80c: 60000, sec80d: 0, sec24b: 0 };
  const oldResult = calculateOldRegimeTax(input);
  const report = analyseDeductions(input, oldResult);

  test("computes gap as totalPossible − totalClaimed", () => {
    expect(report.gap).toBe(report.totalPossible - report.totalClaimed);
  });

  test("80C with ₹60K claimed shows a ₹90K gap", () => {
    const c = report.items.find((i) => i.section === "80C");
    expect(c.claimed).toBe(60000);
    expect(c.gap).toBe(90000);
  });

  test("potential tax saving is positive when gaps exist", () => {
    expect(report.potentialTaxSaving).toBeGreaterThan(0);
  });

  test("items are sorted by tax saving (descending)", () => {
    for (let i = 1; i < report.items.length; i++) {
      expect(report.items[i - 1].taxSaving).toBeGreaterThanOrEqual(
        report.items[i].taxSaving
      );
    }
  });

  test("a fully-maxed section is flagged maxed with zero gap", () => {
    const maxed = analyseDeductions(
      { ctc: 1500000, sec80c: 150000 },
      calculateOldRegimeTax({ ctc: 1500000, sec80c: 150000 })
    );
    const c = maxed.items.find((i) => i.section === "80C");
    expect(c.maxed).toBe(true);
    expect(c.gap).toBe(0);
  });

  test("HIGH urgency when gap > ₹50K and saving > ₹15K", () => {
    // ₹15L income → 30% marginal; 80C gap ₹1.5L → saving ~₹46.8K
    const big = analyseDeductions(
      { ctc: 1500000, sec80c: 0 },
      calculateOldRegimeTax({ ctc: 1500000, sec80c: 0 })
    );
    const c = big.items.find((i) => i.section === "80C");
    expect(c.urgency).toBe("HIGH");
  });
});
