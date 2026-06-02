/**
 * geminiProvider.js — Gemini 2.5 Flash implementation of the LLM provider
 * interface. Free tier (1,500 req/day). Never throws to the caller beyond
 * what the interface documents.
 */
import { GoogleGenerativeAI } from "@google/generative-ai";

const MODEL = "gemini-2.5-flash";

function getApiKey() {
  const k = import.meta?.env?.VITE_GEMINI_API_KEY;
  if (!k || k === "your_gemini_api_key_here") return null;
  return k;
}

export const geminiProvider = {
  name: "gemini-2.5-flash",

  isConfigured() {
    return !!getApiKey();
  },

  /**
   * @param {{system?:string, prompt:string, temperature?:number}} opts
   * @returns {Promise<string>} raw model text
   * @throws if not configured or the API errors (caller handles fallback)
   */
  async generate({ system, prompt, temperature = 0.4 }) {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("Gemini API key not configured");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: MODEL,
      systemInstruction: system,
      generationConfig: { temperature },
    });
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  },
};
