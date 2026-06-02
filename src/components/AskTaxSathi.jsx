/**
 * AskTaxSathi.jsx — grounded tax Q&A chat with inline source citations.
 *
 * Every answer is retrieved from TaxSathi's curated knowledge base (RAG) and
 * shows the sources it used. Works with no API key (extractive mode); richer
 * synthesised answers appear when a Gemini key is configured.
 */
import { useRef, useState } from "react";
import { Sparkles, Send, BookOpen, ShieldCheck } from "lucide-react";
import { askTaxSathi } from "../ai/qa/askTaxSathi.js";

const SUGGESTIONS = [
  "Can I claim HRA if I live with my parents?",
  "How much can I invest under 80C?",
  "Which regime should I pick this year?",
  "What's the ITR filing due date?",
];

/** Render [1]/[2] citation markers as small superscript chips. */
function renderWithCitations(text) {
  const parts = String(text).split(/(\[\d+\])/g);
  return parts.map((p, i) => {
    const m = p.match(/^\[(\d+)\]$/);
    if (m) return <sup key={i} className="cite-marker">{m[1]}</sup>;
    return <span key={i}>{p}</span>;
  });
}

export default function AskTaxSathi() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef(null);

  const ask = async (q) => {
    const question = (q ?? input).trim();
    if (!question || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: question }]);
    setLoading(true);
    try {
      const res = await askTaxSathi(question);
      setMessages((m) => [
        ...m,
        { role: "bot", text: res.answer, sources: res.sources, mode: res.mode },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "bot", text: "Something went wrong. Please try again.", sources: [] },
      ]);
    } finally {
      setLoading(false);
      requestAnimationFrame(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
      });
    }
  };

  return (
    <div className="card ask">
      <h3>
        <Sparkles size={17} style={{ verticalAlign: "-3px", color: "var(--accent)" }} /> Ask
        TaxSathi
      </h3>
      <p className="card-sub">
        Tax questions answered from a curated rulebook — with sources you can verify.
      </p>

      <div className="ask-messages" ref={listRef}>
        {messages.length === 0 && (
          <div className="ask-suggestions">
            {SUGGESTIONS.map((s) => (
              <button key={s} className="suggestion-chip" onClick={() => ask(s)}>
                {s}
              </button>
            ))}
          </div>
        )}

        {messages.map((m, i) =>
          m.role === "user" ? (
            <div className="ask-bubble user" key={i}>
              {m.text}
            </div>
          ) : (
            <div className="ask-answer" key={i}>
              <div className="ask-answer-text">{renderWithCitations(m.text)}</div>
              {m.sources?.length > 0 && (
                <div className="ask-sources">
                  <div className="ask-sources-head">
                    <BookOpen size={12} /> Sources
                  </div>
                  {m.sources.map((s) => (
                    <a
                      key={s.n}
                      className="source-item"
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span className="source-n">{s.n}</span>
                      <span className="source-meta">
                        <strong>{s.section}</strong> · {s.title}
                        <span className="source-cite">{s.source}</span>
                      </span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          )
        )}

        {loading && (
          <div className="ask-answer">
            <span className="typing" aria-label="TaxSathi is searching">
              <span></span>
              <span></span>
              <span></span>
            </span>
          </div>
        )}
      </div>

      <form
        className="ask-input"
        onSubmit={(e) => {
          e.preventDefault();
          ask();
        }}
      >
        <input
          type="text"
          value={input}
          placeholder="Ask about HRA, 80C, regime, ITR…"
          onChange={(e) => setInput(e.target.value)}
          aria-label="Ask a tax question"
        />
        <button type="submit" className="btn btn-accent" disabled={loading || !input.trim()}>
          <Send size={17} />
        </button>
      </form>

      <div className="privacy-note" style={{ marginTop: 10 }}>
        <ShieldCheck size={13} />
        Answers are grounded in a curated FY 2025-26 tax rulebook. Verify before filing.
      </div>
    </div>
  );
}
