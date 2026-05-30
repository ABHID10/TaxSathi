/**
 * TaxSathi AI — Tax Constants for FY 2025-26 (AY 2026-27)
 * Source: Income Tax Act 1961 + Union Budget 2025
 *
 * SINGLE SOURCE OF TRUTH.
 * Never hardcode tax figures in other files — always import from here.
 */

export const FY = "2025-26";
export const AY = "2026-27";

// ─── NEW TAX REGIME SLABS (Section 115BAC) ──────────────────────────────────
// Each slab taxes the portion of income that falls between the previous
// threshold and `upTo` at `rate`.
export const NEW_REGIME_SLABS = [
  { upTo: 400000, rate: 0.0 }, //  0% up to ₹4L
  { upTo: 800000, rate: 0.05 }, //  5% on ₹4L–₹8L
  { upTo: 1200000, rate: 0.1 }, // 10% on ₹8L–₹12L
  { upTo: 1600000, rate: 0.15 }, // 15% on ₹12L–₹16L
  { upTo: 2000000, rate: 0.2 }, // 20% on ₹16L–₹20L
  { upTo: 2400000, rate: 0.25 }, // 25% on ₹20L–₹24L
  { upTo: Infinity, rate: 0.3 }, // 30% above ₹24L
];
export const NEW_REGIME_STANDARD_DEDUCTION = 75000;
export const NEW_REGIME_REBATE_LIMIT = 1200000; // Section 87A: no tax if taxable income ≤ ₹12L
export const NEW_REGIME_REBATE_AMOUNT = 60000; // max rebate under new regime

// ─── OLD TAX REGIME SLABS ────────────────────────────────────────────────────
export const OLD_REGIME_SLABS = [
  { upTo: 250000, rate: 0.0 }, //  0% up to ₹2.5L
  { upTo: 500000, rate: 0.05 }, //  5% on ₹2.5L–₹5L
  { upTo: 1000000, rate: 0.2 }, // 20% on ₹5L–₹10L
  { upTo: Infinity, rate: 0.3 }, // 30% above ₹10L
];
export const OLD_REGIME_STANDARD_DEDUCTION = 50000;
export const OLD_REGIME_REBATE_LIMIT = 500000; // Section 87A: no tax if taxable income ≤ ₹5L
export const OLD_REGIME_REBATE_AMOUNT = 12500;

// ─── HEALTH & EDUCATION CESS ─────────────────────────────────────────────────
export const CESS_RATE = 0.04; // 4% on income tax + surcharge

// ─── HRA city rules ──────────────────────────────────────────────────────────
export const HRA_METRO_RATE = 0.5; // 50% of basic for metro cities
export const HRA_NON_METRO_RATE = 0.4; // 40% of basic for non-metro

// ─── DEDUCTION LIMITS (Old Regime only, unless noted) ───────────────────────
export const DEDUCTIONS = {
  SEC_80C: { limit: 150000, label: "80C (PPF/ELSS/LIC/EPF)", regime: "old" },
  SEC_80CCD_1B: { limit: 50000, label: "80CCD(1B) NPS Self", regime: "old" },
  SEC_80CCD_2: {
    limit: null,
    label: "80CCD(2) Employer NPS",
    regime: "both",
    note: "Up to 14% of basic salary; allowed in BOTH regimes",
  },
  SEC_80D_SELF: {
    limit: 25000,
    label: "80D Health Insurance (self/family)",
    regime: "old",
  },
  SEC_80D_PARENTS: {
    limit: 25000,
    label: "80D Health Insurance (parents)",
    regime: "old",
    seniorLimit: 50000,
  },
  SEC_24B: {
    limit: 200000,
    label: "Home Loan Interest (Sec 24b)",
    regime: "old",
  },
  SEC_80TTA: { limit: 10000, label: "80TTA Savings Interest", regime: "old" },
  HRA: {
    limit: null,
    label: "HRA Exemption",
    regime: "old",
    note: "min(actual HRA, 50%/40% of basic, rent − 10% of basic)",
  },
};

// Employer NPS (80CCD2) cap: 14% of basic salary (private sector raised to 14%
// under the new regime by Budget 2024/2025).
export const NPS_EMPLOYER_RATE = 0.14;

// ─── SURCHARGE RATES ─────────────────────────────────────────────────────────
// Applied on the income tax amount (before cess) when total income crosses
// these thresholds. Ordered high → low for lookup. Under the new regime the
// top surcharge rate is capped at 25% (vs 37% under old regime).
export const SURCHARGE_OLD = [
  { above: 50000000, rate: 0.37 },
  { above: 20000000, rate: 0.25 },
  { above: 10000000, rate: 0.15 },
  { above: 5000000, rate: 0.1 },
];
export const SURCHARGE_NEW = [
  { above: 20000000, rate: 0.25 }, // capped at 25% under new regime
  { above: 10000000, rate: 0.15 },
  { above: 5000000, rate: 0.1 },
];

// Assumed share of CTC that is "basic salary" when the user only provides CTC.
// Used for HRA and employer-NPS estimation. Industry norm ≈ 40–50%.
export const ASSUMED_BASIC_RATE = 0.5;
