/**
 * taxOptimizer.js — Generate personalized tax-saving strategies
 * based on user profile, income, and deductions.
 *
 * Strategies are ranked by impact and feasibility.
 */

import { DEDUCTIONS } from "./constants.js";

/**
 * Build personalized tax optimization strategies.
 * @param {object} userInput - raw user input
 * @param {object} recommendation - result from recommendRegime()
 * @returns {array of strategy objects}
 */
export function generateTaxStrategies(userInput, recommendation) {
  const strategies = [];
  const { oldResult, newResult, comparison, deductionReport } = recommendation;
  const winner = comparison.winner;
  const n = userInput;

  // ============================================
  // 1. REGIME OPTIMIZATION STRATEGIES
  // ============================================

  // Strategy: If regimes are close, suggest switching might be risky
  if (comparison.savings <= 5000) {
    strategies.push({
      category: "regime",
      priority: "MEDIUM",
      title: "⚠️ Your regimes are close — think carefully before switching",
      details: [
        `The ${winner} regime saves you only ₹${Math.abs(
          comparison.savings
        )}, which is within margin of error.`,
        "If you invest more in deductions (80C, 80D, etc.), the old regime becomes even better.",
        "Recommendation: Lock in old regime with Form 12BB if there's any chance you'll invest more.",
      ],
      impact: `Avoid accidentally choosing worse regime by ₹5,000+`,
      feasibility: "Easy",
      deadline: "April 15 (before HR declares deductions)",
    });
  }

  // ============================================
  // 2. HRA OPTIMIZATION STRATEGIES
  // ============================================

  if (n.hraMonthly > 0 && n.rentMonthly > 0) {
    const hraBreakEven = recommendation.breakEvenDeduction || 0;

    if (n.rentMonthly > n.hraMonthly) {
      strategies.push({
        category: "hra",
        priority: "HIGH",
        title: "📍 You're paying MORE rent than HRA — maximize HRA exemption",
        details: [
          `You pay ₹${formatNum(n.rentMonthly)}/month rent but receive HRA ₹${formatNum(
            n.hraMonthly
          )}/month.`,
          "The exemption is limited to HRA amount (₹" +
            formatNum(n.hraMonthly * 12) +
            "/year).",
          "Current HRA exemption: ₹" + formatNum(oldResult.breakdown.hraExemption) + "/year",
          `To maximize: Ensure rent receipts are documented for ₹${formatNum(
            n.hraMonthly
          )}/month × 12 months.`,
        ],
        impact: `You're already getting max HRA benefit (₹${formatNum(
          oldResult.breakdown.hraExemption * 0.3
        )} tax saving). No action needed.`,
        feasibility: "Done",
        deadline: "Maintain rent receipts Apr-Mar",
      });
    } else if (n.rentMonthly < n.hraMonthly) {
      strategies.push({
        category: "hra",
        priority: "HIGH",
        title: "📍 You're paying LESS rent than HRA — opportunity exists",
        details: [
          `You pay ₹${formatNum(n.rentMonthly)}/month but receive HRA ₹${formatNum(
            n.hraMonthly
          )}/month.`,
          `HRA exemption is capped at rent: ₹${formatNum(
            n.rentMonthly * 12
          )}/year (not full HRA).`,
          `You're leaving ₹${formatNum(
            (n.hraMonthly - n.rentMonthly) * 12
          )}/year of HRA exemption on table.`,
          "Option: If feasible, increase rent (via roommate arrangement or move to slightly pricier place).",
        ],
        impact: `Potential savings: ₹${formatNum(
          (n.hraMonthly - n.rentMonthly) * 12 * 0.3
        )}/year (at 30% tax rate)`,
        feasibility: "Medium (requires rent increase)",
        deadline: "Before registering new lease",
      });
    }
  } else if (n.hraMonthly > 0 && n.rentMonthly === 0) {
    strategies.push({
      category: "hra",
      priority: "HIGH",
      title: "🚨 You receive HRA but pay NO rent — zero exemption!",
      details: [
        `You get HRA ₹${formatNum(n.hraMonthly)}/month (₹${formatNum(
          n.hraMonthly * 12
        )}/year) but listed rent is ₹0.`,
        "HRA exemption = Min(HRA, Rent, % of salary) = Min(any, 0, any) = ₹0",
        "This is likely a data entry error OR you need to formalize rent arrangement.",
        "If you truly own the house: remove HRA from input (HR might have error).",
        "If you pay rent but forgot to enter: Update to actual monthly rent ASAP.",
      ],
      impact: `You could be missing ₹${formatNum(
        Math.min(n.hraMonthly * 12, n.hraMonthly * 12 * 0.5) * 0.3
      )}/year saving!`,
      feasibility: "Easy (just update form or HR records)",
      deadline: "Immediately — impacts current & past years",
    });
  }

  // ============================================
  // 3. DEDUCTION GAP STRATEGIES (Priority-ranked)
  // ============================================

  const gaps = deductionReport.items.filter((i) => i.gap > 0);

  if (gaps.length > 0) {
    // HIGH urgency gaps
    const highGaps = gaps.filter((g) => g.urgency === "HIGH");
    highGaps.forEach((gap) => {
      const priorityMap = { "80C": 1, "80D": 2, "80CCD(1B)": 3, "24b": 4 };
      const sortPriority = priorityMap[gap.section] || 99;

      strategies.push({
        category: "deduction",
        priority: "HIGH",
        title: `💰 URGENT: Close ${gap.section} gap — invest ₹${formatNum(gap.gap)} by March 31`,
        details: generateDeductionDetails(gap),
        impact: `Tax saving: ₹${formatNum(gap.taxSaving)}/year (${formatNum(
          gap.taxSaving * 10
        )}/decade)`,
        feasibility: gap.section === "80C" ? "Easy" : gap.section === "80D" ? "Medium" : "Medium",
        deadline: "March 31 (before FY end)",
        sortPriority,
      });
    });

    // MEDIUM urgency gaps
    const medGaps = gaps.filter((g) => g.urgency === "MEDIUM");
    medGaps.forEach((gap) => {
      strategies.push({
        category: "deduction",
        priority: "MEDIUM",
        title: `📊 Consider: Close ${gap.section} gap — invest ₹${formatNum(gap.gap)} by March 31`,
        details: generateDeductionDetails(gap),
        impact: `Tax saving: ₹${formatNum(gap.taxSaving)}/year`,
        feasibility: "Medium",
        deadline: "March 31 (optional)",
      });
    });
  }

  // ============================================
  // 4. OTHER INCOME STRATEGIES
  // ============================================

  if (n.fdInterest > 40000) {
    strategies.push({
      category: "income",
      priority: "MEDIUM",
      title: "🏦 Your FD interest (₹" + formatNum(n.fdInterest) + ") triggers TDS",
      details: [
        `FD interest above ₹40,000/year → Bank auto-deducts 20% TDS.`,
        `TDS deducted: ~₹${formatNum(n.fdInterest * 0.2)}`,
        "This TDS is credited during ITR filing, but you lose liquidity.",
        "Option: Spread FDs across multiple accounts/banks to avoid TDS (each account below ₹40K).",
      ],
      impact: `No tax increase, but optimizes cash flow`,
      feasibility: "Easy",
      deadline: "Next FY (before opening new FDs)",
    });
  }

  if (n.freelance > 0) {
    strategies.push({
      category: "income",
      priority: "HIGH",
      title: "💼 Freelance income (₹" + formatNum(n.freelance) + ") — claim business deductions",
      details: [
        "Freelance income is self-employment; you can deduct business expenses:",
        "✓ Equipment, software subscriptions, internet/phone (proportionate)",
        "✓ Home office rent (if dedicated space)",
        "✓ Professional fees, training, travel",
        "✓ GST if registered (you can claim input GST credit)",
        "File using ITR-4 (Sugam) and maintain all invoices/receipts.",
      ],
      impact: `Could reduce taxable freelance income by 20-40%`,
      feasibility: "Medium (requires documentation)",
      deadline: "Before filing ITR (July 31)",
    });
  }

  if (n.rentalIncome > 0) {
    strategies.push({
      category: "income",
      priority: "HIGH",
      title: "🏠 Rental income (₹" + formatNum(n.rentalIncome) + ") — deduct property expenses",
      details: [
        "Rental income allows deductions for:",
        "✓ Property tax (100% deductible)",
        "✓ Loan interest (if financed property) up to ₹2L",
        "✓ Repairs and maintenance",
        "✓ Insurance premiums",
        "✓ Depreciation (if let out for business)",
        "Net taxable = Gross rent - deductible expenses",
      ],
      impact: `Could reduce taxable rental income by 30-50%`,
      feasibility: "Medium (requires property tax & repair docs)",
      deadline: "Before filing ITR (July 31)",
    });
  }

  // ============================================
  // 5. EMPLOYER BENEFITS STRATEGIES
  // ============================================

  const basicSalary = oldResult.breakdown.basicSalary || 0;
  const maxEmployerNPS = basicSalary * 0.14;

  if (n.npsEmployer < maxEmployerNPS && n.npsEmployer > 0) {
    strategies.push({
      category: "employer",
      priority: "MEDIUM",
      title: `💼 Your employer NPS is only ₹${formatNum(
        n.npsEmployer
      )} — can go up to ₹${formatNum(maxEmployerNPS)}`,
      details: [
        `Employer NPS limit: 14% of basic salary = ₹${formatNum(maxEmployerNPS)}`,
        `You're currently contributing: ₹${formatNum(n.npsEmployer)}`,
        `Unclaimed benefit: ₹${formatNum(maxEmployerNPS - n.npsEmployer)}/year`,
        "Talk to HR/Finance to increase employer NPS contribution (doesn't reduce your salary).",
      ],
      impact: `Unlock ₹${formatNum(
        (maxEmployerNPS - n.npsEmployer) * 0.3
      )}/year tax saving without spending your money`,
      feasibility: "Easy (HR/Finance discussion)",
      deadline: "Before next FY cycle",
    });
  }

  // ============================================
  // 6. STRATEGIC RECOMMENDATIONS
  // ============================================

  if (winner === "old" && deductionReport.gap < 50000) {
    strategies.push({
      category: "strategy",
      priority: "MEDIUM",
      title: "🎯 You're close to maxing deductions — finish the job",
      details: [
        `Current deduction: ₹${formatNum(deductionReport.totalClaimed)} / ₹${formatNum(
          deductionReport.totalPossible
        )}`,
        `Only ₹${formatNum(deductionReport.gap)} gap left.`,
        "Maxing out deductions locks in old regime advantage and future-proofs your choice.",
        "Priority order: 80D (health) → 80CCD (NPS) → 80C (if space left)",
      ],
      impact: `Save ₹${formatNum(
        deductionReport.gap * (deductionReport.marginalRatePercent / 100)
      )}/year by completing`,
      feasibility: "Easy",
      deadline: "March 31",
    });
  }

  if (newResult.finalTax < oldResult.finalTax && comparison.savings > 10000) {
    strategies.push({
      category: "strategy",
      priority: "HIGH",
      title: "⭐ NEW regime wins by ₹" + formatNum(comparison.savings) + " — lock it in early",
      details: [
        "New regime saves significantly more for your profile.",
        "Declare to HR immediately via Form 12BB to start TDS in new regime from April.",
        "Note: New regime cannot be changed later in the same FY (mostly).",
        "This gives you time to course-correct if numbers change.",
      ],
      impact: `Save ₹${formatNum(comparison.savings)}/year automatically`,
      feasibility: "Easy",
      deadline: "April 15 (before TDS cycle starts)",
    });
  }

  // ============================================
  // FINAL SORTING & RETURN
  // ============================================

  // Sort by priority and custom sort priority
  const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  return strategies.sort((a, b) => {
    const priorDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorDiff !== 0) return priorDiff;
    return (a.sortPriority || 99) - (b.sortPriority || 99);
  });
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatNum(n) {
  if (!n || n === 0) return "0";
  return new Intl.NumberFormat("en-IN").format(Math.round(n));
}

function generateDeductionDetails(gap) {
  const details = [];

  switch (gap.section) {
    case "80C":
      details.push(
        "Section 80C covers: ELSS mutual funds, PPF, LIC, FD (5-yr), Tuition fees, Home loan principal"
      );
      details.push(`Max limit: ₹1,50,000/year`);
      details.push(
        `ELSS is most popular: 3-year tax lock-in, historically 12-15% annual returns, fully tradable after 3 years.`
      );
      details.push(`Action: Invest ₹${formatNum(gap.gap)} in ELSS/PPF before March 31.`);
      break;

    case "80CCD(1B)":
      details.push(
        "Section 80CCD(1B) is EXTRA deduction only for NPS (National Pension Scheme)."
      );
      details.push(`Max limit: ₹50,000/year (separate from 80C limit of ₹1,50,000)`);
      details.push(
        `NPS benefits: Tax-free at 60+, no wealth tax, lower TDS on withdrawals, strong long-term growth.`
      );
      details.push(`Action: Open NPS account (Tier-1) and contribute ₹${formatNum(gap.gap)}.`);
      break;

    case "80D":
      details.push("Section 80D covers health insurance premiums for self, spouse, and parents.");
      details.push(
        `Limits: ₹25,000 (self/spouse) or ₹50,000 (with any parents) or ₹75,000+ (if parents 60+)`
      );
      details.push(
        `Check: Buy a ₹5-10L cover from reputed insurer (ICICI, HDFC, Star, Apollo, etc.).`
      );
      details.push(
        `Tip: Often bundled policies for family are cheaper than individual covers. Also covers parents' medical emergencies.`
      );
      details.push(`Action: Buy health insurance policy for ₹${formatNum(gap.gap)}/year.`);
      break;

    case "24b":
      details.push(
        "Section 24b is home loan interest (not principal) — works in BOTH old AND new regimes."
      );
      details.push(`Max limit: ₹2,00,000/year`);
      details.push(
        `Action: Get interest certificate from bank showing exact interest paid in FY. Claim in old regime.`
      );
      details.push(`If gap = 0: You've already maxed this deduction (great!)`);
      break;

    default:
      details.push(`Gap: ₹${formatNum(gap.gap)}`);
      details.push(`Tax Saving: ₹${formatNum(gap.taxSaving)}`);
  }

  return details;
}
