# TaxSathi AI — 5-Minute Demo Script

**Audience:** interview panel / portfolio reviewer / hiring manager.
**Goal:** show product sense, a working data product, and digital-transformation framing.

---

## 0. Setup (before you start)

```bash
cd taxsathi
npm install
npm run dev        # → http://localhost:5173
```

(Optional, for live AI text) copy `.env.example` → `.env` and add a free Gemini key from
https://aistudio.google.com/app/apikey. **The demo works fully without it** — the insight
falls back to a deterministic, personalised paragraph.

---

## 1. The Hook (30s)

> "Every April, 85 million salaried Indians have to tell their employer: old tax regime or new? Most guess. Guessing wrong costs ₹18,000–₹50,000 a year. A CA costs ₹3,000–₹10,000 and needs an appointment. TaxSathi answers it in two minutes, for free, in a browser tab — and tells you *why*."

Open the landing page. Point at the three badges: **No login · ₹0 · AI-personalised.**

---

## 2. The Live Tax Meter — the "wow" moment (60s)

Click **Find my best regime**. In Step 1, type a CTC of **₹15,00,000**.

> "Watch the meter — both regimes recalculate live as I type, no submit button."

Point at the two meters counting up, the **SAVES YOU ₹1,59,900**, and the **✓ BETTER FOR YOU** badge snapping onto the winner.

> "This is real progressive-slab math running client-side in under a millisecond — not a lookup table."

---

## 3. Progressive Disclosure (45s)

Click **Next** through Step 2 (deductions) and Step 3 (other income).

> "It's a conversation, not a 30-field form. One topic at a time. Each deduction has its statutory cap built in, so the user can't over-claim."

Add an **80C** of ₹1,50,000 and a **home-loan interest** of ₹2,00,000, plus **HRA ₹25,000/mo** and **rent ₹30,000/mo, metro** back in Step 1 — watch the meter swing toward the **old** regime.

> "Now the deductions are large enough that the old regime wins — and the app shows exactly when that flip happens."

---

## 4. The Killer Feature — Deduction Gap (60s)

On the results page, scroll to **Deduction Gap Report**.

> "This is the part no calculator does. It shows what you're *leaving on the table* — section by section, how much more you could invest, and how much tax that saves, flagged by urgency before the March 31 deadline."

Point at a HIGH-urgency item with the coral "before March 31" label.

---

## 5. AI Insight + Action Plan (45s)

Scroll to **TaxSathi AI says**.

> "A plain-language explanation in the user's own numbers — warm, not a government portal. If the AI is rate-limited or offline, this gracefully falls back to a deterministic version, so the product never breaks."

Then the **Action Plan**: declare-to-HR deadline, documents to gather, what to invest, when to file ITR — all generated from the user's data and sorted by urgency.

---

## 6. Take It With You (30s)

Click **Download PDF plan**.

> "A one-page plan they can hand to HR or a CA. And a WhatsApp share for the viral loop. Zero backend — this PDF is generated entirely in the browser."

---

## 7. The Close — why it scales (30s)

> "No backend, no database, no DevOps. It deploys as a static site for ₹0/month and handles any traffic. V2 plugs into India Stack — DigiLocker Form 26AS auto-import, Form 16 parsing — so the user types nothing at all. AI is the last-mile advisory layer on top of public tax infrastructure."

---

## Backup Q&A

- **"Is the tax math right?"** → 36 unit tests, all derived from a single `constants.js` source of truth; run `npm test` live.
- **"Why does the new regime win so often?"** → Budget 2025 made the new-regime slabs very generous (0% to ₹4L, rebate to ₹12L). TaxSathi reflects the *current* statute and shows the break-even deduction level rather than parroting "old is better."
- **"What about privacy?"** → No PII ever leaves the browser; Gemini sees only numbers.
- **"Monetisation?"** → Free core; ₹199 PDF/share tier; ₹499 salary-restructuring advisor; ₹1,499 CA-reviewed filing.
