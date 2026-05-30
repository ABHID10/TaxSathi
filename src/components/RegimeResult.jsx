/**
 * RegimeResult.jsx — the winner card + tax summary + Gemini insight.
 */
import { Sparkles, Trophy } from "lucide-react";
import { formatRupees, formatPercent } from "../utils/formatter.js";

export default function RegimeResult({ rec, insight, insightLoading }) {
  const { comparison, oldResult, newResult } = rec;
  const winner = comparison.winner;
  const winResult = winner === "old" ? oldResult : newResult;
  const regimeName = winner === "old" ? "Old Tax Regime" : "New Tax Regime";

  return (
    <div>
      <div className={`result-hero ${winner === "old" ? "old" : ""} pop-in`}>
        <div className="eyebrow">
          <Trophy size={13} style={{ verticalAlign: "-2px" }} /> Recommended for you
        </div>
        <div className="regime">{regimeName}</div>
        <div className="save">Saves you {formatRupees(comparison.savings)} / year</div>
      </div>

      {/* AI insight */}
      <div className="insight fade-in-up">
        <div className="ai-tag">
          <Sparkles size={13} /> TaxSathi AI says
        </div>
        {insightLoading ? (
          <span className="typing" aria-label="TaxSathi is thinking">
            <span></span>
            <span></span>
            <span></span>
          </span>
        ) : (
          insight
        )}
      </div>

      {/* Tax summary */}
      <div className="card">
        <h3>Your tax summary ({regimeName})</h3>
        <div className="summary-row">
          <span>Gross income</span>
          <span className="val mono">{formatRupees(winResult.grossIncome)}</span>
        </div>
        <div className="summary-row">
          <span>Total deductions & exemptions</span>
          <span className="val mono">− {formatRupees(winResult.totalDeductions)}</span>
        </div>
        <div className="summary-row">
          <span>Taxable income</span>
          <span className="val mono">{formatRupees(winResult.taxableIncome)}</span>
        </div>
        {winResult.surcharge > 0 && (
          <div className="summary-row">
            <span>Surcharge</span>
            <span className="val mono">{formatRupees(winResult.surcharge)}</span>
          </div>
        )}
        <div className="summary-row">
          <span>Health & education cess (4%)</span>
          <span className="val mono">{formatRupees(winResult.cess)}</span>
        </div>
        <div className="summary-row total">
          <span>Final tax payable</span>
          <span className="val mono">{formatRupees(winResult.finalTax)}</span>
        </div>
        <div className="summary-row">
          <span>Effective tax rate</span>
          <span className="val mono">{formatPercent(winResult.effectiveRate)}</span>
        </div>
      </div>
    </div>
  );
}
