# Deep Dive: Deployment & Hosting

TaxSathi is a static single-page app — `npm run build` produces a `dist/` folder of HTML/CSS/JS with **no server component**. That makes hosting free and trivial. This guide covers the build, the two recommended hosts, environment variables, the API-key security caveat, and CI.

---

## 1. The build

```bash
npm run build      # → dist/
npm run preview    # serve dist/ locally to sanity-check
```

`vite.config.js` sets `base: "./"` (relative asset paths), so the same `dist/` works whether it's served from a domain root (`taxsathi.app`) or a subpath (`username.github.io/TaxSathi/`). No config change needed between hosts.

What's in `dist/`: `index.html`, hashed JS/CSS bundles, `favicon.svg`, and (if you ran `npm run build:kb`) `kb-index.json`. No `.env`, no source maps of secrets, no `node_modules`.

---

## 2. Option A — Vercel (recommended, zero-config)

```bash
npm i -g vercel
vercel            # first run: link/create project
vercel --prod     # deploy to a public URL
```

- Vercel auto-detects Vite (build = `npm run build`, output = `dist`).
- Set env vars in the Vercel dashboard → Project → Settings → Environment Variables: add `VITE_GEMINI_API_KEY` (and `VITE_LLM_PROVIDER` if not Gemini). Vite inlines `VITE_`-prefixed vars **at build time**, so redeploy after changing them.
- Every git push gets a preview URL; `--prod` promotes to the production domain.

---

## 3. Option B — GitHub Pages (pairs with your repo)

Since the code is in `sanket95droid/TaxSathi`, Pages is a natural fit.

### Quick way — `gh-pages` package
```bash
npm i -D gh-pages
# package.json:  "deploy": "npm run build && gh-pages -d dist"
npm run deploy
```
Then in GitHub → Settings → Pages, set the source to the `gh-pages` branch. Your URL: `https://sanket95droid.github.io/TaxSathi/` (the relative `base` already handles the subpath).

### Better way — GitHub Actions (auto-deploy on push)
Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages
on:
  push: { branches: [main] }
permissions: { contents: read, pages: write, id-token: write }
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm test
      - run: npm run build
        env:
          VITE_GEMINI_API_KEY: ${{ secrets.VITE_GEMINI_API_KEY }}
      - uses: actions/upload-pages-artifact@v3
        with: { path: dist }
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: { name: github-pages }
    steps:
      - uses: actions/deploy-pages@v4
```

Add `VITE_GEMINI_API_KEY` under GitHub → Settings → Secrets and variables → Actions. Now every push to `main` runs the tests, builds, and publishes. In GitHub → Settings → Pages, set source = "GitHub Actions".

---

## 4. Environment variables — how they work here

- Only `VITE_`-prefixed vars are exposed to the browser bundle (`import.meta.env.VITE_GEMINI_API_KEY`). This is a Vite security boundary — non-prefixed vars never ship.
- They're inlined **at build time**, not read at runtime. Change a key → rebuild/redeploy.
- `VITE_LLM_PROVIDER` (optional) selects the model provider; defaults to `gemini`.
- Locally: copy `.env.example` → `.env`. `.env` is git-ignored; only `.env.example` is committed.

### Optional: dense semantic search in production
If you want embedding-based retrieval instead of BM25, run the index builder *before* deploying (it needs a key, but only at build time):
```bash
GEMINI_API_KEY=xxx npm run build:kb   # writes public/kb-index.json
npm run build                          # bundles it into dist/
```
The committed `kb-index.json` then ships as a static asset; no key is needed at runtime for retrieval.

---

## 5. ⚠️ The client-side API-key caveat

Because there's no backend, any `VITE_` key is **visible in the shipped JS** — anyone can read it from the browser. For a free Gemini key this is acceptable *if* you lock it down:

1. In **Google AI Studio → API key → restrict**, set an **HTTP referrer** restriction to your deployed domain (e.g. `https://sanket95droid.github.io/*`). The key then only works from your site.
2. Keep it on the **free tier** (1,500 req/day) so abuse can't cost money.
3. If you later need stronger protection or higher limits, the clean upgrade is a tiny serverless proxy (Vercel Function / Cloudflare Worker) that holds the key server-side — the provider abstraction (`ai/llm`) makes that a one-file change.

For demos/portfolio use, the app's **fallback modes mean you can deploy with no key at all** — the tax engine, deduction gap, action plan, PDF, and a (extractive) Ask TaxSathi all work without it.

---

## 6. Recommended path for you

1. Push `main` (already set up; you've pushed once successfully).
2. Add the GitHub Actions workflow above → auto-deploy + tests on every push.
3. Add `VITE_GEMINI_API_KEY` as an Actions secret, referrer-restricted to `sanket95droid.github.io`.
4. Enable Pages (source = GitHub Actions). Live at `https://sanket95droid.github.io/TaxSathi/`.

Net result: a free, public, auto-deploying, test-gated URL with zero running cost.
