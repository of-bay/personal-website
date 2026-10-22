# AI explainer worker (optional)

The Playground works without this: it falls back to a built-in explainer.
Deploy this worker to get real Gemini-written explanations.

1. Get a Gemini API key at https://aistudio.google.com/apikey
2. `npm i -g wrangler && wrangler login`
3. In this folder create `wrangler.toml`:
   ```
   name = "bay-ai-explainer"
   main = "gemini-worker.js"
   compatibility_date = "2025-01-01"
   ```
4. `wrangler secret put GEMINI_API_KEY` (paste the key), then `wrangler deploy`
5. Copy the worker URL into `AI_ENDPOINT` at the top of `js/playground.js`.
6. In the Cloudflare dashboard add a rate-limiting rule for the worker route
   (e.g. 10 requests per minute per IP) to protect your quota.

The key never reaches the browser. The page sends only numbers and gene names,
which the worker validates before building the prompt.
