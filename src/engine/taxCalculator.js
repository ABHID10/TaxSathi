/**
 * taxCalculator.js — Core tax math for both regimes.
 *
 * Pure functions only: no side effects, no API calls, no state.
 * All monetary values are RUPEES as integers. Math.round() everywhere.
 */

import {
  NEW_REGIME_SLABS,
  NEW_REGIME_STANDARD_DEDUCTION,
  NEW_REGIME_REBATE_LIMIT,
  OLD_REGIME_SLABS,
  OLD_REGIME_STANDARD_DEDUCTION,
  OLD_REGIME_REBATE_LIMIT,
  CESS_RATE,
  HRA_METRO_RATE,
  HRA_NON_METRO_RATE,
  SURCHARGE_OLD,
  SURCHARGE_NEW,
  DEDUCTIONS,
  NPS_EMPLOYER_RATE,
  ASSUMED_BASIC_RATE,
} from "./constants.js";

/**
 * Progressive slab calculation. Returns tax BEFORE cess/surcharge/rebate.
 * @param {number} income taxable income in rupees
 * @param {Array<{upTo:number, rate:number}>} slabs
 * @returns {number}
 */
export function calculateTax(income, slabs) {
  if (income <= 0) return 0;
  let tax = 0;
  let lower = 0;
  for (const slab of slabs) {
    if (income > lower) {
      const taxableInThisSlab = Math.min(income, slab.upTo) - lower;
      tax += taxableInThisSlab * slab.rate;
      lower = slab.upTo;
    } else {
      break;
    }
  }
  return Math.round(tax);
}

/**
 * Section 87A rebate. Returns 0 tax if taxable income ≤ rebateLimit,
 * else returns the original tax unchanged.
 */
export function applyRebate(tax, taxableIncome, rebateLimit) {
  if (taxableIncome <= rebateLimit) return 0;
  return tax;
}

/**
 * Pick the surcharge rate for a given total income.
 */
function getSurchargeRate(income, surchargeTable) {
  for (const tier of surchargeTable) {
    if (income > tier.above) return tier.rate;
  }
  return 0;
}

/**
 * Apply surcharge (if applicable) then 4% health & education cess.
 * @param {number} tax tax after rebate, before surcharge/cess
 * @param {number} income total income (for surcharge threshold)
 * @param {"old"|"new"} regime which surcharge table to use
 * @returns {{ surcharge:number, cess:number, total:number }}
 */
export function applyCessAndSurcharge(tax, income, regime = "new") {
  if (tax <= 0) return { surcharge: 0, cess: 0, total: 0 };
  const table = regime === "old" ? SURCHARGE_OLD : SURCHARGE_NEW;
  const rate = getSurchargeRate(income, table);
  const surcharge = Math.round(tax * rate);
  const cess = Math.round((tax + surcharge) * CESS_RATE);
  return { surcharge, cess, total: tax + surcharge + cess };
}

/**
 * HRA exemption = min of:
 *   1. Actual HRA received
 *   2. 50% (metro) or 40% (non-metro) of basic salary
 *   3. Rent paid − 10% of basic salary
 * All inputs are ANNUAL rupees.
 * @returns {number} exemption (never negative)
 */
export function calculateHRA(basicSalary, hraReceived, rentPaid, cityType) {
  if (!hraReceived || !rentPaid || hraReceived <= 0 || rentPaid <= 0) return 0;
  const cityRate = cityType === "metro" ? HRA_METRO_RATE : HRA_NON_METRO_RATE;
  const limitByBasic = basicSalary * cityRate;
  const limitByRent = rentPaid - 0.1 * basicSalary;
  const exemption = Math.min(hraReceived, limitByBasic, Math.max(0, limitByRent));
  return Math.round(Math.max(0, exemption));
}

/**
 * Normalises raw user input into annual rupee figures the engine uses.
 * Accepts CTC, optional explicit basic salary, monthly HRA & rent, etc.
 */
export function normaliseInput(userInput = {}) {
  const ctc = num(userInput.ctc);
  const basicSalary = userInput.basicSalary
    ? num(userInput.basicSalary)
    : Math.round(ctc * ASSUMED_BASIC_RATE);

  // HRA & rent may be entered monthly; annualise.
  const hraReceived = num(userInput.hraAnnual ?? mul(userInput.hraMonthly, 12));
  const rentPaid = num(userInput.rentAnnual ?? mul(userInput.rentMonthly, 12));

  return {
    ctc,
    basicSalary,
    hraReceived,
    rentPaid,
    isMetro: !!userInput.isMetro,
    cityType: userInput.isMetro ? "metro" : "non-metro",
    deductions: {
      sec80c: clamp(num(userInput.sec80c), DEDUCTIONS.SEC_80C.limit),
      sec80ccd1b: clamp(num(userInput.sec80ccd1b), DEDUCTIONS.SEC_80CCD_1B.limit),
      sec80d: clamp(
        num(userInput.sec80d),
        DEDUCTIONS.SEC_80D_SELF.limit + DEDUCTIONS.SEC_80D_PARENTS.seniorLimit
      ),
      sec24b: clamp(num(userInput.sec24b), DEDUCTIONS.SEC_24B.limit),
      sec80tta: clamp(num(userInput.sec80tta), DEDUCTIONS.SEC_80TTA.limit),
      // Employer NPS: capped at 14% of basic; allowed in both regimes.
      npsEmployer: clamp(
        num(userInput.npsEmployer),
        Math.round(basicSalary * NPS_EMPLOYER_RATE)
      ),
    },
    otherIncome: {
      fdInterest: num(userInput.fdInterest),
      freelance: num(userInput.freelance),
      rental: num(userInput.rentalIncome),
    },
  };
}

/**
 * OLD regime calculation. Applies standard deduction, all claimed deductions,
 * HRA exemption, and 80CCD(2).
 */
export function calculateOldRegimeTax(userInput) {
  const n = normaliseInput(userInput);
  const grossIncome =
    n.ctc +
    n.otherIncome.fdInterest +
    n.otherIncome.freelance +
    n.otherIncome.rental;

  const hraExemption = calculateHRA(
    n.basicSalary,
    n.hraReceived,
    n.rentPaid,
    n.cityType
  );

  const d = n.deductions;
  // 80TTA caps the savings-interest exemption against FD/savings interest.
  const sec80tta = Math.min(d.sec80tta, n.otherIncome.fdInterest, DEDUCTIONS.SEC_80TTA.limit);

  const totalDeductions =
    OLD_REGIME_STANDARD_DEDUCTION +
    hraExemption +
    d.sec80c +
    d.sec80ccd1b +
    d.sec80d +
    d.sec24b +
    sec80tta +
    d.npsEmployer;

  const taxableIncome = Math.max(0, Math.round(grossIncome - totalDeductions));
  const taxBeforeRebate = calculateTax(taxableIncome, OLD_REGIME_SLABS);
  const taxAfterRebate = applyRebate(
    taxBeforeRebate,
    taxableIncome,
    OLD_REGIME_REBATE_LIMIT
  );
  const { surcharge, cess, total } = applyCessAndSurcharge(
    taxAfterRebate,
    taxableIncome,
    "old"
  );

  return {
    regime: "old",
    grossIncome,
    totalDeductions,
    taxableIncome,
    taxBeforeRebate,
    taxAfterRebate,
    surcharge,
    cess,
    finalTax: total,
    effectiveRate: grossIncome > 0 ? +((total / grossIncome) * 100).toFixed(2) : 0,
    breakdown: {
      standardDeduction: OLD_REGIME_STANDARD_DEDUCTION,
      hraExemption,
      sec80c: d.sec80c,
      sec80ccd1b: d.sec80ccd1b,
      sec80d: d.sec80d,
      sec24b: d.sec24b,
      sec80tta,
      npsEmployer: d.npsEmployer,
    },
  };
}

/**
 * NEW regime calculation. Applies only standard deduction (₹75K) and
 * 80CCD(2) employer NPS. No 80C/80D/HRA/24b.
 */
export function calculateNewRegimeTax(userInput) {
  const n = normaliseInput(userInput);
  const grossIncome =
    n.ctc +
    n.otherIncome.fdInterest +
    n.otherIncome.freelance +
    n.otherIncome.rental;

  const npsEmployer = n.deductions.npsEmployer;
  const totalDeductions = NEW_REGIME_STANDARD_DEDUCTION + npsEmployer;

  const taxableIncome = Math.max(0, Math.round(grossIncome - totalDeductions));
  const taxBeforeRebate = calculateTax(taxableIncome, NEW_REGIME_SLABS);
  const taxAfterRebate = applyRebate(
    taxBeforeRebate,
    taxableIncome,
    NEW_REGIME_REBATE_LIMIT
  );
  const { surcharge, cess, total } = applyCessAndSurcharge(
    taxAfterRebate,
    taxableIncome,
    "new"
  );

  return {
    regime: "new",
    grossIncome,
    totalDeductions,
    taxableIncome,
    taxBeforeRebate,
    taxAfterRebate,
    surcharge,
    cess,
    finalTax: total,
    effectiveRate: grossIncome > 0 ? +((total / grossIncome) * 100).toFixed(2) : 0,
    breakdown: {
      standardDeduction: NEW_REGIME_STANDARD_DEDUCTION,
      npsEmployer,
    },
  };
}

/**
 * Compare the two regime results.
 * @returns {{winner, savings, savingsPercent, oldTax, newTax}}
 */
export function compareRegimes(oldResult, newResult) {
  const oldTax = oldResult.finalTax;
  const newTax = newResult.finalTax;
  const winner = oldTax <= newTax ? "old" : "new";
  const savings = Math.abs(oldTax - newTax);
  const higher = Math.max(oldTax, newTax);
  const savingsPercent = higher > 0 ? +((savings / higher) * 100).toFixed(1) : 0;
  return { winner, savings, savingsPercent, oldTax, newTax };
}

// ─── helpers ─────────────────────────────────────────────────────────────────
function num(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
}
function mul(v, by) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n * by : 0;
}
function clamp(v, max) {
  if (max == null) return v;
  return Math.min(v, max);
}
