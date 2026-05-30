import { describe, test, expect } from "vitest";
import {
  recommendRegime,
  findBreakEvenDeduction,
} from "../src/engine/regimeAdvisor.js";

describe("recommendRegime", () => {
  test("returns both results, comparison, and a deduction report", () => {
    const r = recommendRegime({ ctc: 1500000, sec80c: 150000 });
    expect(r.oldResult.regime).toBe("old");
    expect(r.newResult.regime).toBe("new");
    expect(["old", "new"]).toContain(r.comparison.winner);
    expect(r.deductionReport.items.length).toBeGreaterThan(0);
  });

  test("high-deduction salaried earner → recommends old & flags it relevant", () => {
    const r = recommendRegime({
      ctc: 1500000,
      basicSalary: 750000,
      hraMonthly: 25000,
      rentMonthly: 30000,
      isMetro: true,
      sec80c: 150000,
      sec80d: 25000,
      sec24b: 200000,
    });
    expect(r.comparison.winner).toBe("old");
    expect(r.oldRegimeRelevant).toBe(true);
  });

  test("low-deduction earner → recommends new regime", () => {
    const r = recommendRegime({ ctc: 1500000, sec80c: 0 });
    expect(r.comparison.winner).toBe("new");
  });

  test("reasonCode is a non-empty string", () => {
    const r = recommendRegime({ ctc: 1500000, sec80c: 100000 });
    expect(typeof r.reasonCode).toBe("string");
    expect(r.reasonCode.length).toBeGreaterThan(0);
  });
});

describe("findBreakEvenDeduction", () => {
  test("with HRA, returns a reachable deduction level where old catches new", () => {
    // Add HRA so the old regime is actually winnable; break-even then exists.
    const be = findBreakEvenDeduction({
      ctc: 1500000,
      basicSalary: 750000,
      hraMonthly: 25000,
      rentMonthly: 30000,
      isMetro: true,
    });
    expect(be).not.toBeNull();
    expect(be).toBeGreaterThanOrEqual(0);
    expect(be).toBeLessThanOrEqual(475000);
  });

  test("null when old regime can never beat new (no HRA, ₹15L salary)", () => {
    // The new regime's slabs are generous enough that a ₹15L earner with no
    // HRA cannot win under the old regime even with maxed deductions.
    expect(findBreakEvenDeduction({ ctc: 1500000 })).toBeNull();
  });
});
