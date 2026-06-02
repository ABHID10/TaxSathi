# Deep Dive: The Tax Engine

The engine is the product. It's pure JavaScript — no I/O, no state, no async — which makes it trivially testable and able to run in the browser in well under a millisecond. Everything else (UI, AI, PDF) is a layer around this core.

Files: `src/engine/{constants,taxCalculator,deductionAnalyser,regimeAdvisor}.js`

---

## 1. Single source of truth — `constants.js`

Every tax figure for FY 2025-26 lives here and nowhere else. Slabs are expressed as cumulative thresholds with a marginal rate:

```js
export const NEW_REGIME_SLABS = [
  { upTo: 400000,  rate: 0.00 },
  { upTo: 800000,  rate: 0.05 },
  { upTo: 1200000, rate: 0.10 },
  { upTo: 1600000, rate: 0.15 },
  { upTo: 2000000, rate: 0.20 },
  { upTo: 2400000, rate: 0.25 },
  { upTo: Infinity, rate: 0.30 },
];
```

Why this shape: it lets one generic function compute either regime, and a Budget change is a data edit (no logic touched). The test suite asserts values *derived* from these constants, so if a slab changes and a test isn't updated, the test fails loudly — exactly what you want for an annual update.

---

## 2. Progressive slab calculation

A common bug is taxing the **whole** income at the top rate. Indian tax is **marginal**: each rupee is taxed at the rate of the band it falls in. The implementation walks bands, taxing only the slice within each:

```js
export function calculateTax(income, slabs) {
  if (income <= 0) return 0;
  let tax = 0, lower = 0;
  for (const slab of slabs) {
    if (income > lower) {
      const sliceInThisBand = Math.min(income, slab.upTo) - lower;
      tax += sliceInThisBand * slab.rate;
      lower = slab.upTo;
    } else break;
  }
  return Math.round(tax);
}
```

**Worked example — taxable ₹15,00,000, new regime:**
| Band | Slice | Rate | Tax |
|---|---|---|---|
| 0–4L | 4,00,000 | 0% | 0 |
| 4–8L | 4,00,000 | 5% | 20,000 |
| 8–12L | 4,00,000 | 10% | 40,000 |
| 12–15L | 3,00,000 | 15% | 45,000 |
| | | **Total** | **₹1,05,000** |

All money is integer rupees, rounded at each step — never floats — to avoid `0.1 + 0.2` style drift on currency.

---

## 3. Section 87A rebate

The rebate zeroes out tax below a threshold — it's a cliff, not a slab:

```js
export function applyRebate(tax, taxableIncome, rebateLimit) {
  return taxableIncome <= rebateLimit ? 0 : tax;
}
```

- **New regime:** rebate limit **₹12,00,000** taxable. With the ₹75,000 standard deduction, gross salary up to ~₹12.75L pays **zero** tax.
- **Old regime:** rebate limit **₹5,00,000** taxable, with the old ₹50,000 standard deduction.

This single difference is why the new regime dominates for most salaried earners now (more below).

---

## 4. HRA exemption — the "least of three"

HRA is the trickiest salaried exemption (old regime only). The exemption is the **minimum** of three quantities:

```js
export function calculateHRA(basicSalary, hraReceived, rentPaid, cityType) {
  if (!hraReceived || !rentPaid) return 0;
  const cityRate = cityType === "metro" ? 0.5 : 0.4;
  const exemption = Math.min(
    hraReceived,                       // (1) actual HRA received
    basicSalary * cityRate,            // (2) 50% (metro) / 40% (non-metro) of basic
    Math.max(0, rentPaid - 0.1 * basicSalary) // (3) rent − 10% of basic
  );
  return Math.round(Math.max(0, exemption));
}
```

**Worked example — basic ₹7.5L, HRA ₹3L, rent ₹3.6L, metro:**
- actual HRA = 3,00,000
- 50% of basic = 3,75,000
- rent − 10% basic = 3,60,000 − 75,000 = 2,85,000 ← smallest
- **Exemption = ₹2,85,000**

The third term is why low rent relative to salary yields a small exemption (a real result that surprises users — and a good thing to *explain*, which is what the AI layer does).

> Note: when the user gives only CTC, we estimate `basic = 50% of CTC` (`ASSUMED_BASIC_RATE`). This is a documented approximation; Form 16 ingestion (F2) will replace it with the real figure.

---

## 5. Surcharge + cess

High incomes attract a surcharge on the *tax* (before cess), then a flat 4% health & education cess on top:

```js
export function applyCessAndSurcharge(tax, income, regime) {
  if (tax <= 0) return { surcharge: 0, cess: 0, total: 0 };
  const rate = getSurchargeRate(income, regime === "old" ? SURCHARGE_OLD : SURCHARGE_NEW);
  const surcharge = Math.round(tax * rate);
  const cess = Math.round((tax + surcharge) * 0.04);
  return { surcharge, cess, total: tax + surcharge + cess };
}
```

Surcharge tiers: 10% above ₹50L, 15% above ₹1Cr, 25% above ₹2Cr. The **new regime caps the top surcharge at 25%** (old regime went to 37%) — encoded as two separate tables so the cap is explicit, not a magic number.

---

## 6. Input normalisation & statutory clamping

`normaliseInput()` is the single place that turns messy user input into clean annual figures and **enforces legal caps** so a user can't over-claim:

```js
sec80c:     clamp(num(userInput.sec80c), 150000),   // 80C capped at ₹1.5L
sec80ccd1b: clamp(num(userInput.sec80ccd1b), 50000),// NPS self capped at ₹50k
npsEmployer: clamp(num(userInput.npsEmployer), Math.round(basicSalary * 0.14)),
```

It also annualises monthly inputs (`hraMonthly × 12`) and coerces junk to 0. Because every downstream function consumes the normalised object, the caps are guaranteed everywhere.

---

## 7. The two regime functions

`calculateOldRegimeTax` and `calculateNewRegimeTax` share the same pipeline — gross income → deductions → taxable → slabs → rebate → surcharge+cess → effective rate — but differ in *what counts as a deduction*:

- **Old:** standard ₹50k + HRA + 80C + 80CCD(1B) + 80D + 24b + 80TTA + employer NPS.
- **New:** standard ₹75k + employer NPS (80CCD2) **only**.

Both return a full `breakdown` object so the UI and PDF can show line-by-line transparency, not just a final number.

---

## 8. Comparison & the break-even search — `regimeAdvisor.js`

`compareRegimes` is trivial (lower tax wins). The interesting part is **break-even**: *how many rupees of deductions would the old regime need to beat the new one?* There's no closed-form answer because deductions interact with slabs, so I use a **binary search**:

```js
// Synthesise a target deduction amount across real sections (each capped):
function withProbe(userInput, amount) {
  let a = amount;
  const take = cap => { const t = Math.min(cap, a); a -= t; return t; };
  return { ...userInput,
    sec80c: take(150000), sec24b: take(200000),
    sec80ccd1b: take(50000), sec80d: take(75000) };
}
```

We binary-search the deduction amount in `[0, 475000]` (the combined statutory headroom) until the old-regime tax equals the new-regime tax. If even the maximum can't win, we return `null` — which is itself a useful, honest answer ("no amount of deductions makes the old regime worth it for you").

---

## 9. Deduction gap analysis — `deductionAnalyser.js`

The "killer feature": how much tax benefit is left on the table. For each section it computes `gap = limit − claimed` and the saving at the user's **marginal rate including cess**:

```js
const rate = marginalRate(oldResult.taxableIncome) * 1.04; // marginal slab + 4% cess
taxSaving = Math.round(gap * rate);
```

Urgency is rule-based: `HIGH` if gap > ₹50k *and* saving > ₹15k; `MEDIUM` if gap > ₹10k *and* saving > ₹3k; else `LOW`. Items are sorted by saving so the most valuable action is on top.

---

## 10. Why the new regime usually wins (FY 2025-26)

This trips people up, so it's worth stating plainly. With nil tax up to ₹12L *taxable* under the new regime, a ₹15L earner pays only ₹97,500 there. To beat that under the old regime you'd need to push taxable income down to ~₹9L — i.e. **~₹6L of deductions**, but the realistic statutory headroom (80C 1.5L + 24b 2L + 80CCD1B 50k + 80D 75k + HRA) tops out around ₹4–5L. So the old regime now wins **only** for people who genuinely stack large HRA + home-loan interest + maxed 80C/80D. TaxSathi computes both and shows the exact break-even rather than repeating the outdated "old regime saves more" folklore.

---

## Testing

36 engine tests in `tests/{taxCalculator,deductionAnalyser,regimeAdvisor}.test.js` cover: each slab boundary, both rebate cliffs, HRA least-of-three (including the rent-bound case), surcharge thresholds, employer-NPS in both regimes, the gap urgency rules, and break-even existence/non-existence. They assert values derived from `constants.js`, so they double as a regression guard for annual Budget updates. Run `npm test`.
