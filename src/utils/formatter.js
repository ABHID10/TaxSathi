/**
 * formatter.js — Indian-locale currency & number formatting.
 */

const inr = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 0,
});

/** 1234567 → "₹12,34,567" */
export function formatRupees(n) {
  const v = Number(n) || 0;
  return "₹" + inr.format(Math.round(v));
}

/** 1234567 → "12,34,567" (no symbol) */
export function formatNumber(n) {
  return inr.format(Math.round(Number(n) || 0));
}

/** Compact Indian short form: 1234567 → "₹12.3L", 15000000 → "₹1.5Cr" */
export function formatCompact(n) {
  const v = Math.round(Number(n) || 0);
  if (v >= 10000000) return "₹" + (v / 10000000).toFixed(2).replace(/\.00$/, "") + "Cr";
  if (v >= 100000) return "₹" + (v / 100000).toFixed(2).replace(/\.00$/, "") + "L";
  if (v >= 1000) return "₹" + (v / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  return "₹" + v;
}

/** 12.5 → "12.5%" */
export function formatPercent(n, digits = 1) {
  return (Number(n) || 0).toFixed(digits) + "%";
}

/** Parse a user-typed string like "12,34,567" or "₹15L" into an integer. */
export function parseRupees(str) {
  if (typeof str === "number") return Math.round(str);
  if (!str) return 0;
  let s = String(str).trim().toLowerCase().replace(/[₹,\s]/g, "");
  let mult = 1;
  if (s.endsWith("cr")) {
    mult = 10000000;
    s = s.slice(0, -2);
  } else if (s.endsWith("l")) {
    mult = 100000;
    s = s.slice(0, -1);
  } else if (s.endsWith("k")) {
    mult = 1000;
    s = s.slice(0, -1);
  }
  const v = parseFloat(s);
  return Number.isFinite(v) && v > 0 ? Math.round(v * mult) : 0;
}
