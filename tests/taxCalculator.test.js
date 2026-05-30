import { describe, test, expect } from "vitest";
import {
  calculateTax,
  calculateHRA,
  calculateOldRegimeTax,
  calculateNewRegimeTax,
  compareRegimes,
} from "../src/engine/taxCalculator.js";
import {
  NEW_REGIME_SLABS,
  OLD_REGIME_SLABS,
  NEW_REGIME_STANDARD_DEDUCTION,
} from "../src/engine/constants.js";

describe("Progressive slab calculation", () => {
  test("New regime: taxable ₹15L → ₹1,05,000 before cess", () => {
    // 4-8L: 20k, 8-12L: 40k, 12-15L: 15%×3L = 45k → 1,05,000
    expect(calculateTax(1500000, NEW_REGIME_SLABS)).toBe(105000);
  });

  test("Old regime: taxable ₹10L → ₹1,12,500 before cess", () => {
    // 2.5-5L: 12.5k, 5-10L: 20%×5L = 1,00,000 → 1,12,500
    expect(calculateTax(1000000, OLD_REGIME_SLABS)).toBe(112500);
  });

  test("zero / negative income → 0", () => {
    expect(calculateTax(0, NEW_REGIME_SLABS)).toBe(0);
    expect(calculateTax(-5000, OLD_REGIME_SLABS)).toBe(0);
  });
});

describe("New Regime Tax Calculation", () => {
  test("CTC ₹8L → tax = 0 after rebate (Section 87A)", () => {
    expect(calculateNewRegimeTax({ ctc: 800000 }).finalTax).toBe(0);
  });

  test("CTC ₹12L → tax = 0 (taxable ₹11.25L ≤ ₹12L rebate)", () => {
    const r = calculateNewRegimeTax({ ctc: 1200000 });
    expect(r.taxableIncome).toBe(1125000);
    expect(r.finalTax).toBe(0);
  });

  test("CTC ₹12.76L → tax > 0 (taxable just above ₹12L threshold)", () => {
    const r = calculateNewRegimeTax({ ctc: 1276000 });
    expect(r.taxableIncome).toBe(1201000);
    expect(r.finalTax).toBeGreaterThan(0);
  });

  test("CTC ₹20L → progressive slabs + 4% cess", () => {
    // taxable 19.25L → 20k+40k+60k+ (20%×3.25L=65k) = 185000; cess 7400
    const r = calculateNewRegimeTax({ ctc: 2000000 });
    expect(r.taxableIncome).toBe(1925000);
    expect(r.taxAfterRebate).toBe(185000);
    expect(r.cess).toBe(7400);
    expect(r.finalTax).toBe(192400);
  });

  test("CTC ₹60L → surcharge applies (income > ₹50L)", () => {
    const r = calculateNewRegimeTax({ ctc: 6000000 });
    expect(r.surcharge).toBeGreaterThan(0);
    expect(r.finalTax).toBeGreaterThan(r.taxAfterRebate);
  });

  test("Standard deduction ₹75K applied before slabs", () => {
    const r = calculateNewRegimeTax({ ctc: 1000000 });
    expect(r.breakdown.standardDeduction).toBe(NEW_REGIME_STANDARD_DEDUCTION);
    expect(r.taxableIncome).toBe(1000000 - 75000);
  });

  test("Employer NPS (80CCD2) reduces taxable income in new regime", () => {
    const base = calculateNewRegimeTax({ ctc: 2000000, basicSalary: 1000000 });
    const withNps = calculateNewRegimeTax({
      ctc: 2000000,
      basicSalary: 1000000,
      npsEmployer: 100000,
    });
    expect(withNps.taxableIncome).toBe(base.taxableIncome - 100000);
  });
});

describe("Old Regime Tax Calculation", () => {
  test("CTC ₹5L → tax = 0 after Section 87A rebate (taxable ≤ ₹5L)", () => {
    expect(calculateOldRegimeTax({ ctc: 500000 }).finalTax).toBe(0);
  });

  test("CTC ₹10L with full 80C + 80D → taxable ₹7.75L", () => {
    const r = calculateOldRegimeTax({ ctc: 1000000, sec80c: 150000, sec80d: 25000 });
    // 10L − 50k std − 150k − 25k = 7,75,000
    expect(r.taxableIncome).toBe(775000);
  });

  test("Home loan interest (Sec 24b) reduces taxable income", () => {
    const base = calculateOldRegimeTax({ ctc: 1500000 });
    const withLoan = calculateOldRegimeTax({ ctc: 1500000, sec24b: 200000 });
    expect(withLoan.taxableIncome).toBe(base.taxableIncome - 200000);
  });

  test("Surcharge at ₹51L+ income (old regime)", () => {
    const r = calculateOldRegimeTax({ ctc: 6000000 });
    expect(r.surcharge).toBeGreaterThan(0);
  });
});

describe("HRA exemption", () => {
  test("Metro: min of the three values is applied", () => {
    // basic 5L, HRA 2L/yr, rent 2.5L/yr, metro:
    // actual 200000 | 50%×5L=250000 | 250000−50000=200000 → min 200000
    expect(calculateHRA(500000, 200000, 250000, "metro")).toBe(200000);
  });

  test("Non-metro: 40% of basic rule applied", () => {
    // basic 6L → 40% = 240000; actual HRA 300000; rent 360000−60000=300000
    // min(300000, 240000, 300000) = 240000
    expect(calculateHRA(600000, 300000, 360000, "non-metro")).toBe(240000);
  });

  test("No rent or no HRA → exemption 0", () => {
    expect(calculateHRA(600000, 0, 360000, "metro")).toBe(0);
    expect(calculateHRA(600000, 200000, 0, "metro")).toBe(0);
  });

  test("Rent − 10% basic can be the binding constraint", () => {
    // basic 8L, HRA 5L, rent 2L → rent−80k = 120000 is smallest
    expect(calculateHRA(800000, 500000, 200000, "metro")).toBe(120000);
  });
});

describe("Regime comparison", () => {
  test("High-deduction taxpayer (₹3.5L+ deductions) → old regime wins", () => {
    const input = {
      ctc: 1500000,
      basicSalary: 750000,
      hraMonthly: 25000,
      rentMonthly: 30000,
      isMetro: true,
      sec80c: 150000,
      sec80d: 25000,
      sec24b: 200000,
    };
    const cmp = compareRegimes(
      calculateOldRegimeTax(input),
      calculateNewRegimeTax(input)
    );
    expect(cmp.winner).toBe("old");
    expect(cmp.savings).toBeGreaterThan(0);
  });

  test("Low-deduction taxpayer (< ₹1.5L deductions) → new regime wins", () => {
    const input = { ctc: 1500000, sec80c: 50000 };
    const cmp = compareRegimes(
      calculateOldRegimeTax(input),
      calculateNewRegimeTax(input)
    );
    expect(cmp.winner).toBe("new");
  });

  test("Savings amount is non-negative and percent is bounded", () => {
    const input = { ctc: 1800000, sec80c: 150000 };
    const cmp = compareRegimes(
      calculateOldRegimeTax(input),
      calculateNewRegimeTax(input)
    );
    expect(cmp.savings).toBeGreaterThanOrEqual(0);
    expect(cmp.savingsPercent).toBeGreaterThanOrEqual(0);
    expect(cmp.savingsPercent).toBeLessThanOrEqual(100);
  });
});
