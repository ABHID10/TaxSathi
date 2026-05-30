/**
 * deductionAnalyser.js — finds tax benefit the user is leaving on the table.
 *
 * The "deduction gap" is the most valuable feature: how much MORE the user
 * could deduct (and save) under the OLD regime.
 */

import { DEDUCTIONS, OLD_REGIME_SLABS } from "./constants.js";
import { normaliseInput } from "./taxCalculator.js";

/**
 * Marginal tax rate for the old regime at a given taxable income.
 * Returns the rate of the slab the income's top rupee falls into.
 */
export function marginalRate(taxableIncome) {
  let lower = 0;
  for (const slab of OLD_REGIME_SLABS) {
    if (taxableIncome <= slab.upTo) return slab.rate;
    lower = slab.upTo;
  }
  return OLD_REGIME_SLABS[OLD_REGIME_SLABS.length - 1].rate;
}

function urgency(gap, taxSaving) {
  if (gap > 50000 && taxSaving > 15000) return "HIGH";
  if (gap > 10000 && taxSaving > 3000) return "MEDIUM";
  return "LOW";
}

/**
 * @param {object} userInput raw user input
 * @param {object} oldResult result from calculateOldRegimeTax (for taxable income)
 * @returns {DeductionReport}
 */
export function analyseDeductions(userInput, oldResult) {
  const n = normaliseInput(userInput);
  const d = n.deductions;
  // Marginal rate based on old-regime taxable income; include cess in saving.
  const rate = marginalRate(oldResult?.taxableIncome ?? n.ctc) * 1.04;

  const specs = [
    { section: "80C", label: DEDUCTIONS.SEC_80C.label, limit: DEDUCTIONS.SEC_80C.limit, claimed: d.sec80c,
      suggestion: (gap) => `Invest ₹${fmt(gap)} more in ELSS or PPF before March 31` },
    { section: "80CCD(1B)", label: DEDUCTIONS.SEC_80CCD_1B.label, limit: DEDUCTIONS.SEC_80CCD_1B.limit, claimed: d.sec80ccd1b,
      suggestion: (gap) => `Add ₹${fmt(gap)} to NPS for an extra deduction over and above 80C` },
    { section: "80D", label: DEDUCTIONS.SEC_80D_SELF.label, limit: DEDUCTIONS.SEC_80D_SELF.limit, claimed: d.sec80d,
      suggestion: (gap) => `Buy/top-up health insurance by ₹${fmt(gap)} to cover self & family` },
    { section: "24b", label: DEDUCTIONS.SEC_24B.label, limit: DEDUCTIONS.SEC_24B.limit, claimed: d.sec24b,
      suggestion: () => `Claim your full home-loan interest certificate from your lender` },
  ];

  const items = specs.map((s) => {
    const claimed = Math.min(s.claimed, s.limit);
    const gap = Math.max(0, s.limit - claimed);
    const taxSaving = Math.round(gap * rate);
    return {
      section: s.section,
      label: s.label,
      limit: s.limit,
      claimed,
      gap,
      taxSaving,
      maxed: gap === 0,
      suggestion: gap === 0 ? "✓ Maxed out" : s.suggestion(gap),
      urgency: gap === 0 ? "LOW" : urgency(gap, taxSaving),
    };
  });

  const totalPossible = specs.reduce((a, s) => a + s.limit, 0);
  const totalClaimed = items.reduce((a, i) => a + i.claimed, 0);
  const gap = totalPossible - totalClaimed;
  const potentialTaxSaving = items.reduce((a, i) => a + i.taxSaving, 0);

  return {
    totalPossible,
    totalClaimed,
    gap,
    potentialTaxSaving,
    marginalRatePercent: +(rate * 100).toFixed(1),
    items: items.sort((a, b) => b.taxSaving - a.taxSaving),
  };
}

function fmt(n) {
  return new Intl.NumberFormat("en-IN").format(n);
}
