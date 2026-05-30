/**
 * ChatInterface.jsx — the conversational input wizard (steps 1–3).
 * Chat-style bubbles from TaxSathi, with inline input cards the user fills.
 * Inputs update parent state live so the TaxMeter recalculates instantly.
 */
import { formatNumber, parseRupees } from "../utils/formatter.js";
import { Check } from "lucide-react";

/* Controlled money input with Indian-comma display. */
function MoneyInput({ value, onChange, placeholder, id, autoFocus }) {
  const display = value ? formatNumber(value) : "";
  return (
    <div className="input-money">
      <span className="rupee">₹</span>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoFocus={autoFocus}
        value={display}
        placeholder={placeholder || "0"}
        onChange={(e) => onChange(parseRupees(e.target.value))}
        aria-label={placeholder}
      />
    </div>
  );
}

function CheckItem({ label, sub, value, onChange }) {
  const on = value > 0;
  return (
    <div className="check-item">
      <button
        type="button"
        className={`check-toggle ${on ? "on" : ""}`}
        aria-pressed={on}
        aria-label={`Toggle ${label}`}
        onClick={() => onChange(on ? 0 : "")}
      >
        {on && <Check size={15} />}
      </button>
      <div className="check-body">
        <div className="lbl">{label}</div>
        {sub && <div className="sub">{sub}</div>}
      </div>
      <div className="check-input">
        <MoneyInput
          value={value}
          onChange={(v) => onChange(v)}
          placeholder="Amount"
        />
      </div>
    </div>
  );
}

export default function ChatInterface({ step, input, update }) {
  return (
    <div className="chat">
      {/* Greeting */}
      <div className="bubble bubble-bot fade-in-up">
        Namaste! 🙏 I'm <strong>TaxSathi</strong>. Let's find your best tax regime for
        FY 2025-26 — it takes about 2 minutes.
      </div>

      {/* STEP 1 — SALARY */}
      {step >= 1 && (
        <>
          <div className="bubble bubble-bot fade-in-up">
            First, your <strong>salary</strong>. What's your annual CTC, and do you get
            HRA?
          </div>
          <div className="input-card fade-in-up">
            <div className="field">
              <label htmlFor="ctc">Annual CTC (Cost to Company)</label>
              <MoneyInput
                id="ctc"
                autoFocus
                value={input.ctc}
                onChange={(v) => update({ ctc: v })}
                placeholder="e.g. 15,00,000"
              />
              <div className="helper">Tip: you can type "15L" or "1500000".</div>
            </div>
            <div className="field">
              <label htmlFor="hra">HRA received per month</label>
              <MoneyInput
                id="hra"
                value={input.hraMonthly}
                onChange={(v) => update({ hraMonthly: v })}
                placeholder="e.g. 25,000 (0 if none)"
              />
            </div>
            <div className="field">
              <label>Do you live in a metro city? (Mumbai, Delhi, Kolkata, Chennai)</label>
              <div className="toggle-row">
                <button
                  type="button"
                  className={`toggle-btn ${input.isMetro ? "active" : ""}`}
                  onClick={() => update({ isMetro: true })}
                >
                  Yes, metro
                </button>
                <button
                  type="button"
                  className={`toggle-btn ${!input.isMetro ? "active" : ""}`}
                  onClick={() => update({ isMetro: false })}
                >
                  Non-metro
                </button>
              </div>
            </div>
            <div className="field">
              <label htmlFor="rent">Monthly rent you pay</label>
              <MoneyInput
                id="rent"
                value={input.rentMonthly}
                onChange={(v) => update({ rentMonthly: v })}
                placeholder="e.g. 30,000 (0 if you don't rent)"
              />
            </div>
          </div>
        </>
      )}

      {/* STEP 2 — DEDUCTIONS */}
      {step >= 2 && (
        <>
          <div className="bubble bubble-bot fade-in-up">
            Great! Now your <strong>investments & deductions</strong>. Tap each one you
            have and enter the yearly amount. (These mainly help under the old regime.)
          </div>
          <div className="input-card fade-in-up">
            <CheckItem
              label="80C — PPF / ELSS / LIC / EPF"
              sub="Max ₹1,50,000"
              value={input.sec80c}
              onChange={(v) => update({ sec80c: v })}
            />
            <CheckItem
              label="80D — Health insurance"
              sub="Max ₹25,000 (₹50,000 if parents are seniors)"
              value={input.sec80d}
              onChange={(v) => update({ sec80d: v })}
            />
            <CheckItem
              label="80CCD(1B) — NPS self"
              sub="Max ₹50,000 over and above 80C"
              value={input.sec80ccd1b}
              onChange={(v) => update({ sec80ccd1b: v })}
            />
            <CheckItem
              label="80CCD(2) — Employer NPS"
              sub="Allowed in BOTH regimes (up to 14% of basic)"
              value={input.npsEmployer}
              onChange={(v) => update({ npsEmployer: v })}
            />
            <CheckItem
              label="Sec 24b — Home loan interest"
              sub="Max ₹2,00,000"
              value={input.sec24b}
              onChange={(v) => update({ sec24b: v })}
            />
            <CheckItem
              label="80TTA — Savings bank interest"
              sub="Max ₹10,000"
              value={input.sec80tta}
              onChange={(v) => update({ sec80tta: v })}
            />
          </div>
        </>
      )}

      {/* STEP 3 — OTHER INCOME */}
      {step >= 3 && (
        <>
          <div className="bubble bubble-bot fade-in-up">
            Almost done! Any <strong>other income</strong> this year? (Leave blank if
            none.)
          </div>
          <div className="input-card fade-in-up">
            <CheckItem
              label="FD / RD / savings interest"
              sub="Annual interest earned"
              value={input.fdInterest}
              onChange={(v) => update({ fdInterest: v })}
            />
            <CheckItem
              label="Freelance / consulting income"
              sub="Annual amount"
              value={input.freelance}
              onChange={(v) => update({ freelance: v })}
            />
            <CheckItem
              label="Rental income from property"
              sub="Annual amount received"
              value={input.rentalIncome}
              onChange={(v) => update({ rentalIncome: v })}
            />
          </div>
        </>
      )}
    </div>
  );
}
