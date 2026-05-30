/**
 * ActionPlan.jsx — personalised, specific next-steps checklist.
 * Items are generated from the user's actual numbers and sorted by urgency.
 */
import { CalendarCheck, FileText, PiggyBank, Send } from "lucide-react";
import { formatRupees } from "../utils/formatter.js";
import { AY } from "../engine/constants.js";

/** Build action items from the recommendation + raw input. */
export function buildActionItems(rec, input) {
  const { comparison, oldResult, deductionReport } = rec;
  const winner = comparison.winner;
  const items = [];

  // 1. Declare regime to HR (always first — date sensitive).
  items.push({
    icon: "declare",
    urgent: true,
    title: `Declare the ${winner === "old" ? "OLD" : "NEW"} tax regime to HR by April 15`,
    detail:
      winner === "old"
        ? "Tell HR you opt for the OLD regime for the year and submit Form 12BB with your investment & HRA proofs."
        : "Tell HR you opt for the NEW regime so the correct TDS is deducted from April itself.",
  });

  // 2. Gather documents (old regime, when there are deductions/HRA).
  if (winner === "old") {
    const docs = [];
    if (oldResult.breakdown.hraExemption > 0 && input.rentMonthly) {
      docs.push(
        `Rent receipts Apr–Mar (₹${fmtPlain(input.rentMonthly)}/month = ${formatRupees(
          input.rentMonthly * 12
        )} total)`
      );
    }
    if (oldResult.breakdown.sec80c > 0)
      docs.push(`80C proofs (PPF/ELSS/LIC) for ${formatRupees(oldResult.breakdown.sec80c)}`);
    if (oldResult.breakdown.sec80d > 0)
      docs.push(`Health insurance premium receipt for ${formatRupees(oldResult.breakdown.sec80d)}`);
    if (oldResult.breakdown.sec24b > 0)
      docs.push(`Home-loan interest certificate for ${formatRupees(oldResult.breakdown.sec24b)}`);
    if (docs.length) {
      items.push({
        icon: "docs",
        urgent: false,
        title: "Gather these documents",
        detail: docs.join(" · "),
      });
    }
  }

  // 3. Invest before March 31 (top deduction gaps, old regime only).
  if (rec.oldRegimeRelevant) {
    const gaps = deductionReport.items.filter((i) => i.gap > 0).slice(0, 2);
    gaps.forEach((g) => {
      items.push({
        icon: "invest",
        urgent: g.urgency === "HIGH",
        title: `Invest before March 31 — ${g.section}`,
        detail: `${g.suggestion} (saves ~${formatRupees(g.taxSaving)} in tax).`,
      });
    });
  }

  // 4. File ITR.
  items.push({
    icon: "file",
    urgent: false,
    title: `File your ITR by July 31, ${AY.slice(0, 4) === "2026" ? "2026" : AY.split("-")[0]}`,
    detail:
      (input.freelance > 0
        ? "You have freelance income — you'll likely use ITR-4 (Sugam). "
        : "Use ITR-1 (Sahaj) — you qualify based on your salaried income profile. ") +
      "File online at incometax.gov.in.",
  });

  // Sort: urgent first, keep declared order otherwise (stable).
  return items.sort((a, b) => Number(b.urgent) - Number(a.urgent));
}

const ICONS = {
  declare: CalendarCheck,
  docs: FileText,
  invest: PiggyBank,
  file: Send,
};

export default function ActionPlan({ rec, input }) {
  const items = buildActionItems(rec, input);
  return (
    <div className="card">
      <h3>Your action plan</h3>
      <p className="card-sub">Specific steps based on your numbers — most urgent first.</p>
      {items.map((it, i) => {
        const Icon = ICONS[it.icon] || CalendarCheck;
        return (
          <div className="action-item" key={i}>
            <div className={`action-icon ${it.urgent ? "urgent" : ""}`}>
              <Icon size={18} />
            </div>
            <div className="action-body">
              <div className="a-title">{it.title}</div>
              <div className="a-detail">{it.detail}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function fmtPlain(n) {
  return new Intl.NumberFormat("en-IN").format(Math.round(Number(n) || 0));
}
