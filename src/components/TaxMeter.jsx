/**
 * TaxMeter.jsx — real-time live tax comparison widget.
 * Two meters (old vs new) with animated count-up numbers and progress bars.
 * Updates instantly on input change (no debounce on the local calc).
 */
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { formatRupees, formatPercent } from "../utils/formatter.js";

/** Smoothly animate a number toward `target` using requestAnimationFrame. */
function useCountUp(target, duration = 450) {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);
  const startRef = useRef(0);
  const rafRef = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    const to = target;
    if (from === to) return;
    startRef.current = performance.now();
    cancelAnimationFrame(rafRef.current);

    const tick = (now) => {
      const t = Math.min(1, (now - startRef.current) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      const v = Math.round(from + (to - from) * eased);
      setValue(v);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return value;
}

function Meter({ kind, name, tax, effRate, pct, isWinner }) {
  const animated = useCountUp(tax);
  return (
    <div className={`meter-card meter-${kind}`}>
      <div className="regime-name">{name}</div>
      <div className="tax-amount mono">{formatRupees(animated)}</div>
      <div className="eff-rate">Effective rate: {formatPercent(effRate)}</div>
      <div className="meter-bar">
        <span className="fill" style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      {isWinner && (
        <div className="meter-winner pop-in">
          <Check size={13} /> BETTER FOR YOU
        </div>
      )}
    </div>
  );
}

export default function TaxMeter({ oldResult, newResult, comparison }) {
  const gross = Math.max(oldResult.grossIncome, newResult.grossIncome, 1);
  const oldPct = (oldResult.finalTax / gross) * 100;
  const newPct = (newResult.finalTax / gross) * 100;
  const winner = comparison.winner;

  return (
    <div className="taxmeter">
      <Meter
        kind="old"
        name="Old Regime"
        tax={oldResult.finalTax}
        effRate={oldResult.effectiveRate}
        pct={oldPct}
        isWinner={winner === "old"}
      />
      <div className="meter-mid">
        <span className="savings-label">Saves you</span>
        <span className="savings-amount mono">{formatRupees(comparison.savings)}</span>
        <ArrowRight className="arrow" size={20} />
      </div>
      <Meter
        kind="new"
        name="New Regime"
        tax={newResult.finalTax}
        effRate={newResult.effectiveRate}
        pct={newPct}
        isWinner={winner === "new"}
      />
    </div>
  );
}
