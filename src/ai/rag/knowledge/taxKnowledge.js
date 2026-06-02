/**
 * taxKnowledge.js — TaxSathi's curated, FY-versioned tax knowledge base.
 *
 * Each chunk is a small, self-contained, citable fact. These are the ONLY
 * sources "Ask TaxSathi" may ground its answers in. Keep facts consistent with
 * src/engine/constants.js (the numerical source of truth).
 *
 * SOURCE URLs: every `url` points to a verified, working page on the official
 * Income Tax Department e-filing portal (www.incometax.gov.in). These were
 * confirmed to resolve (the bare "incometax.gov.in" domain and the separate
 * incometaxindia.gov.in site were unreliable / blocked, so we avoid them).
 *
 * To update for a new financial year: edit chunks here, then run
 *   npm run build:kb
 * to regenerate the (optional) dense embedding index.
 *
 * Chunk shape: { id, section, title, source, url, text }
 */

export const KB_VERSION = "FY2025-26.v2";

// ─── Verified official e-filing portal pages (www.incometax.gov.in) ──────────
const P = "https://www.incometax.gov.in/iec/foportal";
const URL_SALARIED = `${P}/help/individual/return-applicable-1`; // slabs, 87A, cess, surcharge, std deduction, deductions, HRA, regime
const URL_RETURNS = `${P}/help/all-topics/e-filing-services/income-tax-returns`; // ITR forms, due dates
const URL_AIS = `${P}/help/all-topics/e-filing-services/ais-annual-information-statement`;
const URL_TDS = `${P}/help/all-topics/e-filing-services/tds-compliance`; // Form 16 / TDS on salary
const URL_CALC = `${P}/income-tax-calculator`;
const URL_HOME = `${P}/`;

export const KNOWLEDGE = [
  {
    id: "new-regime-slabs",
    section: "115BAC",
    title: "New regime tax slabs (FY 2025-26)",
    source: "Income Tax Department · Tax slabs AY 2026-27 (Section 115BAC)",
    url: URL_SALARIED,
    text: "Under the new tax regime for FY 2025-26 (AY 2026-27), income tax slabs are: nil up to ₹4,00,000; 5% from ₹4,00,001 to ₹8,00,000; 10% from ₹8,00,001 to ₹12,00,000; 15% from ₹12,00,001 to ₹16,00,000; 20% from ₹16,00,001 to ₹20,00,000; 25% from ₹20,00,001 to ₹24,00,000; and 30% above ₹24,00,000. The new regime is the default regime.",
  },
  {
    id: "new-regime-rebate-87a",
    section: "87A",
    title: "Section 87A rebate — new regime",
    source: "Income Tax Department · Rebate u/s 87A (AY 2026-27)",
    url: URL_SALARIED,
    text: "Under the new regime for FY 2025-26, a resident individual pays zero tax if total taxable income does not exceed ₹12,00,000, because of the Section 87A rebate (up to ₹60,000). With the ₹75,000 standard deduction, a salaried person can have gross salary up to about ₹12,75,000 and still pay no tax. The rebate does not apply to income taxed at special rates such as capital gains.",
  },
  {
    id: "old-regime-slabs",
    section: "Slabs",
    title: "Old regime tax slabs",
    source: "Income Tax Department · Tax slabs AY 2026-27 (old regime)",
    url: URL_SALARIED,
    text: "Under the old tax regime, slabs for individuals below 60 are: nil up to ₹2,50,000; 5% from ₹2,50,001 to ₹5,00,000; 20% from ₹5,00,001 to ₹10,00,000; and 30% above ₹10,00,000. The old regime allows most deductions and exemptions (80C, 80D, HRA, home loan interest, etc.) that the new regime does not.",
  },
  {
    id: "old-regime-rebate-87a",
    section: "87A",
    title: "Section 87A rebate — old regime",
    source: "Income Tax Department · Rebate u/s 87A (old regime)",
    url: URL_SALARIED,
    text: "Under the old regime, a resident individual gets a Section 87A rebate of up to ₹12,500, making tax zero if total taxable income does not exceed ₹5,00,000. Above ₹5,00,000 the rebate is not available and tax is computed on the full slab.",
  },
  {
    id: "standard-deduction",
    section: "16(ia)",
    title: "Standard deduction for salaried",
    source: "Income Tax Department · Standard deduction (Section 16(ia))",
    url: URL_SALARIED,
    text: "Salaried individuals and pensioners get a standard deduction from salary income with no proof required. For FY 2025-26 it is ₹75,000 under the new regime and ₹50,000 under the old regime. It is applied automatically before the slabs.",
  },
  {
    id: "sec-80c",
    section: "80C",
    title: "Section 80C deductions",
    source: "Income Tax Department · Deductions for salaried (Section 80C)",
    url: URL_SALARIED,
    text: "Section 80C allows a deduction of up to ₹1,50,000 per year (old regime only) for investments and payments such as EPF, PPF, ELSS mutual funds, life insurance premiums, NSC, 5-year tax-saver fixed deposits, principal repayment of a home loan, Sukanya Samriddhi, and children's tuition fees. It is not available under the new regime.",
  },
  {
    id: "sec-80ccd1b",
    section: "80CCD(1B)",
    title: "Additional NPS deduction (self)",
    source: "Income Tax Department · NPS deduction (Section 80CCD(1B))",
    url: URL_SALARIED,
    text: "Section 80CCD(1B) allows an additional deduction of up to ₹50,000 for your own contribution to the National Pension System (NPS), over and above the ₹1,50,000 limit of Section 80C. Available under the old regime only.",
  },
  {
    id: "sec-80ccd2",
    section: "80CCD(2)",
    title: "Employer NPS contribution — both regimes",
    source: "Income Tax Department · Employer NPS (Section 80CCD(2))",
    url: URL_SALARIED,
    text: "Section 80CCD(2) lets you deduct your employer's contribution to your NPS account. This is one of the very few deductions allowed under BOTH the old and new regimes. The limit is 14% of basic salary (including dearness allowance) for the new regime, and 10% for most private employees under the old regime.",
  },
  {
    id: "sec-80d",
    section: "80D",
    title: "Section 80D health insurance",
    source: "Income Tax Department · Health insurance deduction (Section 80D)",
    url: URL_SALARIED,
    text: "Section 80D (old regime only) allows deduction of health insurance premiums: up to ₹25,000 for self, spouse and children, plus up to ₹25,000 for parents (₹50,000 if a parent is a senior citizen). A preventive health check-up of up to ₹5,000 is included within these limits.",
  },
  {
    id: "sec-24b",
    section: "24(b)",
    title: "Home loan interest deduction",
    source: "Income Tax Department · House property income (Section 24(b))",
    url: URL_SALARIED,
    text: "Section 24(b) (old regime only) allows deduction of interest paid on a home loan for a self-occupied property up to ₹2,00,000 per year. For a let-out property the full interest is deductible against rental income, subject to the overall house-property loss set-off limit of ₹2,00,000 per year.",
  },
  {
    id: "sec-80tta-80ttb",
    section: "80TTA / 80TTB",
    title: "Savings interest deduction",
    source: "Income Tax Department · Deductions for salaried (Sections 80TTA, 80TTB)",
    url: URL_SALARIED,
    text: "Section 80TTA (old regime) allows a deduction of up to ₹10,000 on interest from savings bank accounts for individuals below 60. Senior citizens instead use Section 80TTB, which allows up to ₹50,000 on savings and fixed-deposit interest.",
  },
  {
    id: "hra-exemption",
    section: "10(13A)",
    title: "HRA exemption calculation",
    source: "Income Tax Department · House Rent Allowance (Section 10(13A))",
    url: URL_SALARIED,
    text: "House Rent Allowance (HRA) exemption (old regime only) is the least of three amounts: (1) actual HRA received; (2) 50% of basic salary for metro cities (Mumbai, Delhi, Kolkata, Chennai) or 40% for non-metros; and (3) rent paid minus 10% of basic salary. You need rent receipts; if annual rent exceeds ₹1,00,000 you must report the landlord's PAN.",
  },
  {
    id: "hra-living-with-parents",
    section: "10(13A)",
    title: "Can I claim HRA if I live with parents?",
    source: "Income Tax Department · House Rent Allowance (Section 10(13A))",
    url: URL_SALARIED,
    text: "You can claim HRA while living in your parents' house if you genuinely pay rent to them. Transfer rent to a parent who owns the home, keep proof of payment, and the parent must report that rent as income in their own return. You cannot pay rent to a spouse for this purpose.",
  },
  {
    id: "default-regime",
    section: "115BAC",
    title: "Which regime is the default?",
    source: "Income Tax Department · New regime default (Section 115BAC)",
    url: URL_SALARIED,
    text: "From FY 2023-24 onwards the new tax regime is the default. If you do nothing, your employer deducts TDS under the new regime and your return is filed under it. To use the old regime you must actively opt for it.",
  },
  {
    id: "switching-regime",
    section: "10-IEA",
    title: "How to switch tax regime",
    source: "Income Tax Department · Opting out of the new regime (Form 10-IEA)",
    url: URL_SALARIED,
    text: "Salaried individuals without business income can choose between the old and new regime every year while filing their return — simply select the regime in the ITR. If you have business or professional income and want the old regime, you must file Form 10-IEA before the return due date, and switching back is restricted.",
  },
  {
    id: "form-12bb",
    section: "Form 12BB",
    title: "Form 12BB — declaring investments to employer",
    source: "Income Tax Department · Declaring deductions to your employer",
    url: URL_SALARIED,
    text: "Form 12BB is the statement you give your employer to declare tax-saving investments and expenses (HRA with rent details and landlord PAN, LTA, home loan interest, and Chapter VI-A deductions like 80C/80D). Submitting it ensures the employer deducts the correct TDS through the year instead of over-deducting.",
  },
  {
    id: "itr-form-selection",
    section: "ITR Forms",
    title: "ITR-1 vs ITR-2 vs ITR-4",
    source: "Income Tax Department · Income tax returns (which form to file)",
    url: URL_RETURNS,
    text: "ITR-1 (Sahaj) is for resident salaried individuals with total income up to ₹50,00,000 from salary, one house property, other sources, and long-term capital gains u/s 112A up to ₹1,25,000. ITR-2 is for those with larger capital gains or more than one house property. ITR-4 (Sugam) is for presumptive business or professional income under Sections 44AD/44ADA/44AE.",
  },
  {
    id: "due-dates",
    section: "139",
    title: "ITR filing due dates",
    source: "Income Tax Department · Filing due dates (Section 139)",
    url: URL_RETURNS,
    text: "For most salaried taxpayers (non-audit cases), the due date to file the income tax return is 31 July following the financial year — so 31 July 2026 for FY 2025-26. A belated or revised return can usually be filed until 31 December, with a late fee under Section 234F.",
  },
  {
    id: "cess",
    section: "Cess",
    title: "Health and education cess",
    source: "Income Tax Department · Health & Education Cess",
    url: URL_SALARIED,
    text: "A health and education cess of 4% is added on top of the income tax (plus surcharge, if any) under both regimes. For example, ₹1,00,000 of computed tax becomes ₹1,04,000 after cess.",
  },
  {
    id: "surcharge",
    section: "Surcharge",
    title: "Surcharge on high incomes",
    source: "Income Tax Department · Surcharge rates",
    url: URL_SALARIED,
    text: "A surcharge applies on the income tax when total income is high: 10% above ₹50,00,000, 15% above ₹1,00,00,000, and 25% above ₹2,00,00,000. The new regime caps the top surcharge at 25% (the old regime had 37% above ₹5,00,00,000). Surcharge is computed before cess and may be reduced by marginal relief.",
  },
  {
    id: "marginal-relief-12l",
    section: "87A / Marginal Relief",
    title: "Marginal relief just above ₹12 lakh (new regime)",
    source: "Income Tax Department · Marginal relief (Section 87A)",
    url: URL_SALARIED,
    text: "Under the new regime, if taxable income is slightly above ₹12,00,000, marginal relief ensures the extra tax you pay is not more than the income above ₹12,00,000. This prevents a small increase in income from causing a disproportionately large tax jump just past the rebate threshold.",
  },
  {
    id: "form-16-tds",
    section: "Form 16",
    title: "Form 16 and TDS on salary",
    source: "Income Tax Department · TDS on salary / Form 16 (Section 203)",
    url: URL_TDS,
    text: "Form 16 is the TDS certificate your employer issues by 15 June, showing salary paid and tax deducted. Part A has TDS details; Part B has the salary breakup and deductions. Use it to file your return. If you changed jobs, collect a Form 16 from each employer and combine the income.",
  },
  {
    id: "ais-26as",
    section: "AIS / 26AS",
    title: "AIS and Form 26AS",
    source: "Income Tax Department · Annual Information Statement (AIS)",
    url: URL_AIS,
    text: "Form 26AS and the Annual Information Statement (AIS) show income reported against your PAN — TDS, interest, dividends, securities transactions, and more. Reconcile your return with the AIS before filing; unexplained mismatches are a common trigger for notices. You can submit feedback on incorrect AIS entries online.",
  },
  {
    id: "lta",
    section: "10(5)",
    title: "Leave Travel Allowance (LTA)",
    source: "Income Tax Department · Leave Travel Allowance (Section 10(5))",
    url: URL_SALARIED,
    text: "LTA exemption (old regime only) covers the cost of travel within India for you and your family, for up to two journeys in a block of four calendar years. It covers travel fare only — not hotels or food — and requires travel proof.",
  },
  {
    id: "professional-tax",
    section: "16(iii)",
    title: "Professional tax deduction",
    source: "Income Tax Department · Professional tax (Section 16(iii))",
    url: URL_SALARIED,
    text: "Professional tax levied by a state (commonly up to ₹2,500 per year) and paid by you is deductible from salary income under the old regime. It is not allowed under the new regime.",
  },
  {
    id: "who-should-old-regime",
    section: "Planning",
    title: "Who benefits from the old regime?",
    source: "Income Tax Department · Income & Tax Calculator (compare regimes)",
    url: URL_CALC,
    text: "Because the FY 2025-26 new regime is generous (nil tax up to ₹12 lakh taxable), the old regime usually wins only when your total deductions and exemptions are large — typically when HRA, full ₹1.5 lakh 80C, ₹2 lakh home loan interest, and 80D together push deductions well above ₹3-4 lakh. TaxSathi computes both and shows your exact break-even.",
  },
  {
    id: "capital-gains-scope",
    section: "Scope",
    title: "Capital gains are taxed separately",
    source: "Income Tax Department · Capital gains (Sections 111A / 112A)",
    url: URL_RETURNS,
    text: "Capital gains from shares, mutual funds, or property are taxed at special rates (for example, 12.5% long-term on equity above the annual exemption, 20% short-term on equity) and are not part of slab income. The Section 87A rebate does not apply to them. TaxSathi focuses on salary and regime choice; consult a CA for significant capital gains.",
  },
  {
    id: "disclaimer-scope",
    section: "Disclaimer",
    title: "What TaxSathi does and does not do",
    source: "Income Tax Department · Official e-filing portal",
    url: URL_HOME,
    text: "TaxSathi gives AI-assisted guidance on the old-vs-new regime choice and common salaried deductions for FY 2025-26. It is not a substitute for a Chartered Accountant on complex matters such as business income, capital gains, foreign income, or notices. Always verify against official sources before filing.",
  },
];
