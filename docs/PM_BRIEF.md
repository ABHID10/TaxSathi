# TaxSathi AI — Product Requirements Document

**FY 2025-26 (AY 2026-27) | Digital Personal Finance | Portfolio / Interview Use**

---

## 1. Executive Summary

**Problem:** 85M+ salaried ITR filers in India lack personalised, affordable guidance on the single most consequential annual tax decision — *old regime vs new regime*.

**Solution:** An AI-powered conversational tax advisor — free, browser-based, no login — that calculates exact liability under both regimes, surfaces the deductions the user is missing, and produces a ready-to-use action plan.

**Differentiator:** The first tool to combine **real-time dual-regime tax calculation + deduction gap analysis + LLM-personalised explanation** in one no-login flow.

---

## 2. Problem Sizing

| Metric | Value |
|---|---|
| Individual ITRs filed (AY 2023-24) | 75M+, more than 2× the 30.3M of AY 2013-14 |
| Estimated salaried filers (AY 2026-27) | 85M+ |
| Average wrong-regime cost (₹10–25L salary band) | ₹18,000–₹50,000 / year |
| Addressable annual wealth destruction | ~₹1.5 lakh crore |
| Cost of a CA-assisted filing | ₹3,000–₹10,000 (unaffordable for ₹6–12L earners) |

The structural pain: **employers ask employees to declare their regime by April** — before most people have done the maths, and before they have their investment proofs.

---

## 3. User Personas

**Persona 1 — "The Confused Fresher"**
23, ₹7L first job, never filed independently. Doesn't know the two regimes exist. Files in a panic before July 31. *Need: a guided, jargon-free walkthrough.*

**Persona 2 — "The Mid-Career Overpayer"**
31, ₹18L CTC, has a home loan + LIC + HRA. Defaulted onto the new regime by their employer. Leaving ₹34,000–₹52,000 of savings unused. *Need: a deduction gap report that proves the old regime is worth the paperwork.*

**Persona 3 — "The Job-Hopper"**
28, changed jobs in October. Two Form 16s, restructured salary, unsure how to aggregate. *Need: clarity on combined income and which deductions still apply.*

---

## 4. North Star Metric

**Correct regime recommendations delivered** — verified by the user tapping "This helped" (V2 feedback hook).

## 5. Success Metrics

- Monthly Active Users (MAU)
- Step 1 → Step 4 completion rate
- PDF download rate
- Average deduction gap surfaced per user (₹)
- Year-over-year return rate (same user files next year)

## 6. Counter Metrics

- Drop-off at Step 2 (deductions feel overwhelming)
- "Not helpful" feedback rate
- Gemini error / rate-limit (429) rate → must stay invisible to the user via fallback

---

## 7. Competitive Positioning

| Tool | Gap | TaxSathi advantage |
|---|---|---|
| ClearTax / Tax2Win | Calculator, no *why* or next steps | Explains + personalises + action plan |
| CA / tax advisor | ₹3–10k, appointment-based | Free, instant, 24/7 |
| Bank apps | Generic regime nudges | Deduction gap analysis on real numbers |
| Income Tax Portal | Functional, zero advisory intelligence | Advisory-first |

**TaxSathi = Personalised + Free + Instant + Explainable.**

---

## 8. Monetisation Model (Freemium)

| Tier | Price | Includes |
|---|---|---|
| Free | ₹0 | Full dual-regime calculation, recommendation, deduction gap |
| Plus | ₹199 | Downloadable PDF + WhatsApp share + email summary |
| Pro | ₹499 | Salary restructuring advisor (renegotiate CTC for tax efficiency) |
| Assisted | ₹1,499 | CA-reviewed filing via partner network |

---

## 9. V2 Roadmap

- DigiLocker **Form 26AS** auto-import (pre-fill income)
- **Form 16** PDF upload + auto-parse
- **AIS** (Annual Information Statement) mismatch checker
- Multi-year comparison ("your tax profile changed since last year")
- WhatsApp bot interface

---

## 10. Regulatory Notes

- Slabs reflect the **Union Budget 2025** for FY 2025-26 (new regime: 0% up to ₹4L, full §87A rebate up to ₹12L taxable income, ₹75K standard deduction).
- The new **Income Tax Act 2025** is effective April 1, 2026 — `src/engine/constants.js` must be reviewed annually.
- **Data privacy:** no PII stored; Gemini receives only numeric values and flags.
- **Disclaimer:** AI guidance ≠ legal tax advice; recommend a CA for complex situations.

---

## 11. Note on Calculation Accuracy

The FY 2025-26 new-regime slabs are materially more generous than prior years. As a result, for a typical ₹10–18L salaried earner with modest deductions, **the new regime now wins in most cases** — only large HRA + 80C + home-loan-interest stacks tip the balance back to the old regime. TaxSathi surfaces the exact **break-even deduction level** so users understand *what it would take* for the old regime to be worth it. This is a deliberate, defensible product stance grounded in the current statute, not a generic "old regime is always better" heuristic.
