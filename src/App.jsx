/**
 * App.jsx — root component & flow orchestration.
 *
 * - Landing screen → 4-step flow.
 * - Tax engine runs synchronously on every input change (live TaxMeter).
 * - Gemini insight fires once the user reaches the results step (with fallback).
 * - PDF export + WhatsApp share on the results page.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Leaf,
  ArrowLeft,
  ArrowRight,
  Download,
  Share2,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Wallet,
} from "lucide-react";

import StepProgress from "./components/StepProgress.jsx";
import ChatInterface from "./components/ChatInterface.jsx";
import TaxMeter from "./components/TaxMeter.jsx";
import RegimeResult from "./components/RegimeResult.jsx";
import DeductionChecklist from "./components/DeductionChecklist.jsx";
import ActionPlan from "./components/ActionPlan.jsx";
import AskTaxSathi from "./components/AskTaxSathi.jsx";
import Disclaimer from "./components/Disclaimer.jsx";
import PDFReport from "./components/PDFReport.jsx";

import { recommendRegime } from "./engine/regimeAdvisor.js";
import { getGeminiInsight } from "./ai/geminiAdvisor.js";
import { downloadPDF, buildShareText } from "./utils/pdfGenerator.js";
import { saveSession, loadSession, clearSession } from "./utils/storage.js";
import { FY } from "./engine/constants.js";

const EMPTY_INPUT = {
  ctc: 0,
  hraMonthly: 0,
  rentMonthly: 0,
  isMetro: false,
  sec80c: 0,
  sec80d: 0,
  sec80ccd1b: 0,
  npsEmployer: 0,
  sec24b: 0,
  sec80tta: 0,
  fdInterest: 0,
  freelance: 0,
  rentalIncome: 0,
};

export default function App() {
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(1);
  const [input, setInput] = useState(EMPTY_INPUT);
  const [insight, setInsight] = useState("");
  const [insightLoading, setInsightLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const pdfRef = useRef(null);

  // Restore any saved session on first mount.
  useEffect(() => {
    const saved = loadSession();
    if (saved && saved.ctc) setInput({ ...EMPTY_INPUT, ...saved });
  }, []);

  const update = (patch) => {
    setInput((prev) => {
      const next = { ...prev, ...patch };
      saveSession(next);
      return next;
    });
  };

  // Recommendation recomputed synchronously whenever input changes.
  const rec = useMemo(() => (input.ctc > 0 ? recommendRegime(input) : null), [input]);

  // Fire Gemini once we land on the results step (and when numbers change there).
  useEffect(() => {
    if (step !== 4 || !rec) return;
    let alive = true;
    setInsightLoading(true);
    getGeminiInsight(rec).then((res) => {
      if (alive) {
        setInsight(res.text);
        setInsightLoading(false);
      }
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, rec?.comparison.winner, rec?.comparison.savings]);

  const canProceed = step > 1 || input.ctc > 0;

  const next = () => setStep((s) => Math.min(4, s + 1));
  const back = () => setStep((s) => Math.max(1, s - 1));

  const restart = () => {
    clearSession();
    setInput(EMPTY_INPUT);
    setInsight("");
    setStep(1);
    setStarted(false);
  };

  const onDownload = async () => {
    try {
      setDownloading(true);
      await downloadPDF(pdfRef.current);
    } catch (e) {
      alert("Sorry, the PDF could not be generated. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const onShare = () => {
    const msg = buildShareText(rec?.comparison.savings) + window.location.href;
    window.open(`https://wa.me/?text=${msg}`, "_blank", "noopener");
  };

  return (
    <div className="app">
      <Header />

      {!started ? (
        <Landing onStart={() => setStarted(true)} />
      ) : (
        <main className="container" style={{ flex: 1 }}>
          <StepProgress step={step} />

          {/* Live tax meter (from the moment CTC is entered, before results) */}
          {rec && step < 4 && (
            <TaxMeter
              oldResult={rec.oldResult}
              newResult={rec.newResult}
              comparison={rec.comparison}
            />
          )}

          {step < 4 ? (
            <ChatInterface step={step} input={input} update={update} />
          ) : (
            <Results
              rec={rec}
              input={input}
              insight={insight}
              insightLoading={insightLoading}
              onDownload={onDownload}
              onShare={onShare}
              downloading={downloading}
            />
          )}

          {/* Sticky nav */}
          <div className="footer-bar">
            <div className="container footer-inner">
              {step > 1 && (
                <button className="btn btn-ghost" onClick={back}>
                  <ArrowLeft size={18} /> Back
                </button>
              )}
              {step < 4 ? (
                <button
                  className="btn btn-primary"
                  disabled={!canProceed}
                  onClick={next}
                >
                  {step === 3 ? "See my result" : "Next"} <ArrowRight size={18} />
                </button>
              ) : (
                <button className="btn btn-ghost" onClick={restart}>
                  <RotateCcw size={18} /> Start over
                </button>
              )}
            </div>
          </div>
        </main>
      )}

      {/* Off-screen PDF render target */}
      {rec && (
        <div className="offscreen" aria-hidden="true">
          <PDFReport ref={pdfRef} rec={rec} input={input} insight={insight} />
        </div>
      )}
    </div>
  );
}

function Header() {
  return (
    <header className="header">
      <div className="container header-inner">
        <div className="logo">
          <Leaf size={22} />
        </div>
        <div>
          <div className="brand-name">TaxSathi AI</div>
          <div className="brand-tag">Your tax plan in 5 minutes. Free, forever.</div>
        </div>
        <div className="header-fy">FY {FY}</div>
      </div>
    </header>
  );
}

function Landing({ onStart }) {
  return (
    <main className="container hero" style={{ flex: 1 }}>
      <h1>Old regime or new regime?</h1>
      <p className="lead">
        Stop guessing. TaxSathi calculates your exact tax under both regimes, finds the
        deductions you're missing, and gives you a ready-to-use action plan — in plain
        language, for free.
      </p>
      <button className="btn btn-accent" style={{ minWidth: 220 }} onClick={onStart}>
        <Sparkles size={18} /> Find my best regime
      </button>
      <div className="hero-badges">
        <span className="hero-badge">
          <ShieldCheck size={14} /> No login, no PII
        </span>
        <span className="hero-badge">
          <Wallet size={14} /> ₹0 to use
        </span>
        <span className="hero-badge">
          <Sparkles size={14} /> AI-personalised
        </span>
      </div>
    </main>
  );
}

function Results({ rec, input, insight, insightLoading, onDownload, onShare, downloading }) {
  if (!rec) {
    return (
      <div className="card" style={{ marginTop: 24 }}>
        <h3>Add your salary first</h3>
        <p className="card-sub">Go back to Step 1 and enter your CTC to see results.</p>
      </div>
    );
  }
  return (
    <div style={{ paddingBottom: 120 }}>
      <TaxMeter
        oldResult={rec.oldResult}
        newResult={rec.newResult}
        comparison={rec.comparison}
      />
      <RegimeResult rec={rec} insight={insight} insightLoading={insightLoading} />
      <DeductionChecklist
        report={rec.deductionReport}
        oldRegimeRelevant={rec.oldRegimeRelevant}
        winner={rec.comparison.winner}
      />
      <ActionPlan rec={rec} input={input} />
      <AskTaxSathi />

      <div style={{ display: "flex", gap: 12, margin: "16px 0" }}>
        <button className="btn btn-accent" style={{ flex: 1 }} onClick={onDownload} disabled={downloading}>
          <Download size={18} /> {downloading ? "Generating…" : "Download PDF plan"}
        </button>
        <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onShare}>
          <Share2 size={18} /> Share
        </button>
      </div>

      <Disclaimer />
    </div>
  );
}
