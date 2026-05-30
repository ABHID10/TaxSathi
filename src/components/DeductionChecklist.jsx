/**
 * DeductionChecklist.jsx — visual deduction gap report.
 * Shows a progress bar per section: filled = claimed, dashed = gap.
 * Only meaningful when the OLD regime wins or is close.
 */
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { formatRupees } from "../utils/formatter.js";

export default function DeductionChecklist({ report, oldRegimeRelevant, winner }) {
  if (!oldRegimeRelevant) {
    return (
      <div className="card">
        <h3>Deduction snapshot</h3>
        <p className="card-sub">
          You're better off on the <strong>new regime</strong>. The deductions below
          would only apply under the old regime — but the new regime still saves you
          more, so there's nothing you need to chase.
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <h3>Deduction Gap Report</h3>
      <p className="card-sub">
        How much tax benefit you're leaving on the table under the old regime.
      </p>

      {report.items.map((item) => {
        const pct = item.limit > 0 ? (item.claimed / item.limit) * 100 : 0;
        return (
          <div className="ded-item" key={item.section}>
            <div className="ded-head">
              <span className="name">
                {item.section} · {shortLabel(item.label)}
              </span>
              <span className="amt mono">
                {formatRupees(item.claimed)} / {formatRupees(item.limit)}
              </span>
            </div>
            <div className="ded-track">
              <span
                className={`ded-fill ${item.maxed ? "full" : ""}`}
                style={{ width: `${Math.min(100, pct)}%` }}
              />
            </div>
            {item.maxed ? (
              <div className="ded-note maxed">
                <CheckCircle2 size={13} style={{ verticalAlign: "-2px" }} /> Maxed out
              </div>
            ) : (
              <div className={`ded-note ${item.urgency === "HIGH" ? "high" : ""}`}>
                {item.urgency === "HIGH" && (
                  <AlertTriangle size={13} style={{ verticalAlign: "-2px" }} />
                )}{" "}
                Gap {formatRupees(item.gap)} → saves {formatRupees(item.taxSaving)} more
                {item.urgency === "HIGH" ? " · before March 31" : ""}
              </div>
            )}
          </div>
        );
      })}

      {report.potentialTaxSaving > 0 && (
        <div className="ded-total">
          <span className="big mono">{formatRupees(report.potentialTaxSaving)}</span>
          If you invest {formatRupees(report.gap)} more before March 31, you could save{" "}
          {formatRupees(report.potentialTaxSaving)} in taxes (at your{" "}
          {report.marginalRatePercent}% marginal rate incl. cess).
        </div>
      )}
    </div>
  );
}

function shortLabel(label) {
  return label.replace(/\s*\(.*?\)\s*/g, " ").trim();
}
