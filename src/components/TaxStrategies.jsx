/**
 * TaxStrategies.jsx — Personalized tax optimization strategies
 * Shows user-specific actions to maximize tax savings.
 */

import React from "react";
import {
  TrendingUp,
  AlertCircle,
  Lightbulb,
  CheckCircle2,
  Clock,
  ChevronDown,
} from "lucide-react";
import { formatRupees } from "../utils/formatter.js";

const CATEGORY_ICONS = {
  regime: TrendingUp,
  hra: AlertCircle,
  deduction: Lightbulb,
  income: Lightbulb,
  employer: CheckCircle2,
  strategy: TrendingUp,
};

const CATEGORY_LABELS = {
  regime: "Regime Choice",
  hra: "HRA Optimization",
  deduction: "Deduction Opportunity",
  income: "Income Strategy",
  employer: "Employer Benefits",
  strategy: "Strategic Plan",
};

const PRIORITY_COLORS = {
  HIGH: "#e74c3c", // red
  MEDIUM: "#f39c12", // orange
  LOW: "#3498db", // blue
};

export default function TaxStrategies({ strategies = [] }) {
  if (!strategies || strategies.length === 0) {
    return (
      <div className="card">
        <h3>Tax Optimization Strategies</h3>
        <p className="card-sub">No specific strategies at this time. You're optimized!</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h3>💡 Personalized Tax Strategies</h3>
      <p className="card-sub">
        Custom actions to maximize your tax savings. Sorted by priority and impact.
      </p>

      <div className="strategies-list">
        {strategies.map((strat, idx) => (
          <StrategyCard key={idx} strategy={strat} index={idx} />
        ))}
      </div>

      <div className="strategies-footer">
        <p className="small-text">
          <strong>💡 Tip:</strong> Start with HIGH priority strategies before March 31. These are
          time-sensitive for the current financial year.
        </p>
      </div>
    </div>
  );
}

function StrategyCard({ strategy, index }) {
  const Icon = CATEGORY_ICONS[strategy.category] || Lightbulb;
  const categoryLabel = CATEGORY_LABELS[strategy.category];
  const priorityColor = PRIORITY_COLORS[strategy.priority];

  const [expanded, setExpanded] = React.useState(false);

  return (
    <div className={`strategy-card ${expanded ? "expanded" : ""}`}>
      <div
        className="strategy-header"
        onClick={() => setExpanded(!expanded)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            setExpanded(!expanded);
          }
        }}
      >
        <div className="strategy-left">
          <div className="strategy-icon-wrapper" style={{ "--icon-color": priorityColor }}>
            <div className="strategy-icon">
              <Icon size={20} />
            </div>
          </div>
          <div className="strategy-header-content">
            <div className="strategy-category">{categoryLabel}</div>
            <div className="strategy-title">{strategy.title}</div>
          </div>
        </div>

        <div className="strategy-right">
          <div className="strategy-priority-badge" style={{ background: priorityColor }}>
            {strategy.priority}
          </div>
          <div className="strategy-chevron">
            <ChevronDown size={20} />
          </div>
        </div>
      </div>

      {expanded && (
        <div className="strategy-body">
          {/* Details */}
          {strategy.details && strategy.details.length > 0 && (
            <div className="strategy-section">
              <h4 className="section-title">Key Actions</h4>
              <ul className="strategy-details">
                {strategy.details.map((detail, i) => (
                  <li key={i}>{detail}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Impact */}
          {strategy.impact && (
            <div className="strategy-section">
              <div className="impact-box">{strategy.impact}</div>
            </div>
          )}

          {/* Feasibility & Deadline */}
          <div className="strategy-meta-container">
            {strategy.feasibility && (
              <div className="meta-item">
                <span className="meta-label">Feasibility</span>
                <span className="meta-value">{strategy.feasibility}</span>
              </div>
            )}
            {strategy.deadline && (
              <div className="meta-item">
                <span className="meta-label">Deadline</span>
                <span className="meta-value">{strategy.deadline}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {!expanded && (
        <div className="strategy-collapse-hint">
          {/* <span className="small-text">Click to expand</span> */}
        </div>
      )}
    </div>
  );
}
