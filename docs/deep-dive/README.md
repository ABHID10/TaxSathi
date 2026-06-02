# TaxSathi AI — Deep Dives

In-depth technical walkthroughs of how each part of TaxSathi works and why it's built that way.

| Doc | What it covers |
|---|---|
| [TAX_ENGINE.md](./TAX_ENGINE.md) | The pure-JS tax core: progressive slabs, §87A rebate, the HRA least-of-three, surcharge + cess, statutory clamping, the break-even binary search, the deduction gap analysis, and why the new regime usually wins for FY 2025-26. With worked numeric examples. |
| [RAG_PIPELINE.md](./RAG_PIPELINE.md) | "Ask TaxSathi" end to end: the cited knowledge base, BM25 retrieval (formula, tokenizer, query expansion, field boosting), the domain gate, the retrieve→ground→cite orchestration, the no-key extractive fallback, source attribution, and the dense-embedding upgrade path. |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Code-level architecture: the no-backend design, module map and dependency rules, data flow (core / insight / RAG), state management, the LLM provider abstraction, and the security/privacy posture. |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Getting a real public URL: the static build, Vercel and GitHub Pages (incl. an auto-deploy Actions workflow), how `VITE_` env vars work, the client-side API-key caveat and how to lock it down, and dense-index-at-deploy. |

For higher-level context see the sibling docs: [`../PM_BRIEF.md`](../PM_BRIEF.md), [`../AI_STRATEGY.md`](../AI_STRATEGY.md), [`../ARCHITECTURE.md`](../ARCHITECTURE.md) (ADRs), and [`../DEMO_SCRIPT.md`](../DEMO_SCRIPT.md).
