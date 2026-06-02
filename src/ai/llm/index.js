/**
 * llm/index.js — provider selection.
 *
 * All LLM access in the app goes through getProvider(), so swapping Gemini for
 * an open-source model (Groq/Llama, Ollama) is a one-file change (ADR-010).
 *
 * A provider implements:
 *   name: string
 *   isConfigured(): boolean
 *   generate({ system?, prompt, temperature? }): Promise<string>   // may throw
 */
import { geminiProvider } from "./geminiProvider.js";

const PROVIDERS = {
  gemini: geminiProvider,
  // groq: groqProvider,      // future: Llama 3.1 via Groq free tier
  // ollama: ollamaProvider,  // future: fully-local open-source
};

export function getProvider() {
  const name = import.meta?.env?.VITE_LLM_PROVIDER || "gemini";
  return PROVIDERS[name] || geminiProvider;
}
