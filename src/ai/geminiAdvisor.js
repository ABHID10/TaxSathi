/**
 * geminiAdvisor.js — Gemini 2.5 Flash natural-language insight layer.
 *
 * This is an ENHANCEMENT, not a dependency: the tax meter, regime result and
 * action plan all work without it. On any failure we return a deterministic
 * local fallback insight so the UI never breaks.
 *
 * Privacy: only numeric values and flags are sent. No name / PAN / employer.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { formatRupees } from "../utils/formatter.js";

const MODEL = "gemini-2.5-flash";

const SYSTEM_PROMPT = `You are TaxSathi, a friendly and knowledgeable Indian tax advisor.
A salaried employee has just run their tax analysis. Explain the results in
plain, warm language — like a smart friend who knows taxes, not a formal CA.

Rules:
- Write in simple English; you may mix natural Hindi phrases ("dekho", "bas itna hi").
- Be specific: always mention the EXACT rupee amounts from the analysis.
- Be concise: max 150 words.
- Lead with the conclusion: "The <regime> regime saves you ₹X this year".
- Explain WHY in one sentence using the user's actual numbers.
- Mention the single biggest missed deduction opportunity, if any.
- End with ONE thing they should do today.
- Never give generic advice. Every sentence must use the user's actual numbers.
- Output ONLY the insight paragraph. No headers, no bullet points, no markdown.`;

let _cache = new Map();

/** Build a privacy-safe numeric payload from the recommendation object. */
export function buildPayload(rec) {
  const { oldResult, newResult, comparison, deductionReport } = rec;
  const top = deductionReport.items.filter((i) => i.gap > 0).slice(0, 3);
  return {
    winner: comparison.winner,
    savings: comparison.savings,
    old: {
      gross: oldResult.grossIncome,
      taxable: oldResult.taxableIncome,
      tax: oldResult.finalTax,
      effRate: oldResult.effectiveRate,
      deductions: oldResult.totalDeductions,
      hraExemption: oldResult.breakdown.hraExemption,
    },
    new: {
      taxable: newResult.taxableIncome,
      tax: newResult.finalTax,
      effRate: newResult.effectiveRate,
    },
    deductionGap: {
      totalGap: deductionReport.gap,
      potentialSaving: deductionReport.potentialTaxSaving,
      topItems: top.map((i) => ({
        section: i.section,
        gap: i.gap,
        saving: i.taxSaving,
      })),
    },
  };
}

/**
 * Deterministic, offline fallback. Always available — used when no API key is
 * set or Gemini errors/rate-limits.
 */
export function localFallbackInsight(rec) {
  const { comparison, deductionReport, oldResult } = rec;
  const regime = comparison.winner === "old" ? "old" : "new";
  const top = deductionReport.items.find((i) => i.gap > 0);

  let s = `The ${regime} tax regime is better for you — it saves about ${formatRupees(
    comparison.savings
  )} this year`;

  if (regime === "old" && oldResult.breakdown.hraExemption > 0) {
    s += `, largely because your HRA exemption of ${formatRupees(
      oldResult.breakdown.hraExemption
    )} and other deductions (${formatRupees(
      oldResult.totalDeductions
    )} total) pull your taxable income down sharply`;
  } else if (regime === "new") {
    s += `, because your declared deductions aren't enough to beat the new regime's wider slabs and ${formatRupees(
      75000
    )} standard deduction`;
  }
  s += ". ";

  if (regime === "old" && top) {
    s += `Your biggest missed opportunity is ${top.section}: investing ${formatRupees(
      top.gap
    )} more could save you another ${formatRupees(
      top.taxSaving
    )} in tax. Do that before March 31. `;
  } else {
    s += `Declare the ${regime} regime to your HR before the April deadline so the right TDS is deducted from month one.`;
  }
  return s.trim();
}

/**
 * Main entry. Returns { text, source: "gemini"|"fallback", error? }.
 * Never throws.
 */
export async function getGeminiInsight(rec) {
  const payload = buildPayload(rec);
  const key = JSON.stringify(payload);
  if (_cache.has(key)) return _cache.get(key);

  const apiKey = import.meta?.env?.VITE_GEMINI_API_KEY;
  if (!apiKey || apiKey === "your_gemini_api_key_here") {
    const res = { text: localFallbackInsight(rec), source: "fallback" };
    _cache.set(key, res);
    return res;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: MODEL,
      systemInstruction: SYSTEM_PROMPT,
    });
    const prompt = `Here is the user's tax analysis (numbers only):\n${JSON.stringify(
      payload,
      null,
      2
    )}\n\nWrite the insight paragraph now.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const res = { text: text || localFallbackInsight(rec), source: "gemini" };
    _cache.set(key, res);
    return res;
  } catch (err) {
    // 429 / 503 / network → graceful fallback, never block the UI.
    return {
      text: localFallbackInsight(rec),
      source: "fallback",
      error: err?.message || "Gemini unavailable",
    };
  }
}
