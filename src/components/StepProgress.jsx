/** StepProgress.jsx — 4-step indicator bar. */
const STEP_LABELS = ["Salary", "Deductions", "Other income", "Your plan"];

export default function StepProgress({ step }) {
  // step: 1..4
  return (
    <div>
      <div className="steps" role="progressbar" aria-valuemin={1} aria-valuemax={4} aria-valuenow={step}>
        {STEP_LABELS.map((_, i) => (
          <span className="step-pill" key={i}>
            <span className="fill" style={{ width: i < step ? "100%" : "0%" }} />
          </span>
        ))}
      </div>
      <div className="step-label">
        Step {Math.min(step, 4)} of 4 — {STEP_LABELS[Math.min(step, 4) - 1]}
      </div>
    </div>
  );
}
