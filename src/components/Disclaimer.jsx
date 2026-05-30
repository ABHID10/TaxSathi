/** Disclaimer.jsx — required guidance + privacy note on the results page. */
import { ShieldCheck, Info } from "lucide-react";

export default function Disclaimer() {
  return (
    <>
      <div className="privacy-note">
        <ShieldCheck size={14} />
        Your data never leaves your browser, except anonymous numbers sent for AI analysis.
      </div>
      <div className="disclaimer" role="note">
        <Info size={16} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>
          <strong>TaxSathi is an AI tool for guidance only.</strong> Consult a Chartered
          Accountant for complex tax situations. This is not legal or financial advice.
          Tax rules are as per the Union Budget 2025 for FY 2025-26.
        </span>
      </div>
    </>
  );
}
