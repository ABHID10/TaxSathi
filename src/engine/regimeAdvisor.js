/**
 * regimeAdvisor.js — the decision layer.
 *
 * Runs both regimes, compares them, computes the break-even deduction level,
 * and produces a structured recommendation object the UI + Gemini consume.
 */

import {
  calculateOldRegimeTax,
  calculateNewRegimeTax,
  compareRegimes,
} from "./taxCalculator.js";
import { analyseDeductions } from "./deductionAnalyser.js";

/**
 * The deduction level (old regime) at which both regimes produce equal tax.
 * Found by binary search over additional 80C-style deductions, holding all
 * other inputs constant. Useful for the "you need ₹X of deductions to make
 * the old regime worthwhile" narrative.
 */
export function findBreakEvenDeduction(userInput) {
  const newTax = calculateNewRegimeTax(userInput).finalTax;
  let lo = 0;
  let hi = PROBE_CEILING; // max extra deductions we can synthesise
  // If even the maximum probe deductions can't beat the new regime, the old
  // regime is unreachable for this profile → no break-even exists.
  const maxOld = calculateOldRegimeTax(withProbe(userInput, PROBE_CEILING)).finalTax;
  if (maxOld > newTax) return null;

  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    const probed = calculateOldRegimeTax(withProbe(userInput, mid)).finalTax;
    if (probed > newTax) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return Math.round(hi);
}

// Combined headroom across the synthesisable old-regime deductions:
// 80C ₹1.5L + 24b ₹2L + 80CCD(1B) ₹50K + 80D ₹75K = ₹4.75L.
const PROBE_CEILING = 475000;

// Synthesise a target deduction amount by filling sections in priority order,
// each respecting its statutory cap (taxCalculator clamps anyway).
function withProbe(userInput, amount) {
  let a = Math.round(amount);
  const take = (cap) => {
    const t = Math.min(cap, a);
    a -= t;
    return t;
  };
  return {
    ...userInput,
    sec80c: take(150000),
    sec24b: take(200000),
    sec80ccd1b: take(50000),
    sec80d: take(75000),
  };
}

/**
 * Full recommendation. This is the object the results page renders.
 */
export function recommendRegime(userInput) {
  const oldResult = calculateOldRegimeTax(userInput);
  const newResult = calculateNewRegimeTax(userInput);
  const comparison = compareRegimes(oldResult, newResult);
  const deductionReport = analyseDeductions(userInput, oldResult);
  const breakEvenDeduction = findBreakEvenDeduction(userInput);

  // "Close" = within ₹5,000. The deduction checklist is most relevant when
  // the old regime wins or is close.
  const oldRegimeRelevant =
    comparison.winner === "old" || comparison.savings <= 5000;

  const reasonCode = buildReasonCode(oldResult, newResult, comparison);

  return {
    oldResult,
    newResult,
    comparison,
    deductionReport,
    breakEvenDeduction,
    oldRegimeRelevant,
    reasonCode,
  };
}

/**
 * A short machine reason for the winner, used for deterministic copy and as a
 * hint to Gemini. Not user-facing prose.
 */
function buildReasonCode(oldResult, newResult, comparison) {
  if (comparison.winner === "new") {
    if (oldResult.totalDeductions < 250000) return "LOW_DEDUCTIONS_NEW_WINS";
    return "NEW_SLABS_OUTWEIGH_DEDUCTIONS";
  }
  if (oldResult.breakdown.hraExemption > 100000)
    return "HRA_DRIVES_OLD_WIN";
  if (oldResult.totalDeductions > 350000) return "HIGH_DEDUCTIONS_OLD_WINS";
  return "OLD_MARGINALLY_WINS";
}
