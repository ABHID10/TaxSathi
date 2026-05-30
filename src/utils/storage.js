/**
 * storage.js — optional localStorage session persistence.
 * No PII is stored; only the numeric inputs the user typed.
 */

const KEY = "taxsathi.session.v1";

export function saveSession(input) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ input, savedAt: Date.now() }));
  } catch {
    /* storage may be disabled (private mode) — fail silently */
  }
}

export function loadSession() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.input ?? null;
  } catch {
    return null;
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
