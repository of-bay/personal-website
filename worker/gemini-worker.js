/* Cloudflare Worker: turns a metabolic-playground result into a plain-language
 * explanation using Gemini. The site sends ONLY structured numbers (no free text),
 * which are validated here, so visitors cannot inject their own prompts.
 *
 * Secret needed: GEMINI_API_KEY  (wrangler secret put GEMINI_API_KEY)
 */
const ALLOWED_ORIGINS = ['https://omerfarukbay.com', 'https://www.omerfarukbay.com', 'http://localhost:8765'];
const MODEL = 'gemini-3.8-flash';
const GENES = ['glk', 'gapA', 'aceE', 'pflB', 'gltA', 'cyoB', 'ldhA', 'pta', 'adhE'];
const PRODUCTS = ['lactate', 'acetate', 'ethanol', 'formate'];

function cors(origin) {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin'
  };
}
const num = (v, lo, hi) => Math.min(hi, Math.max(lo, Number(v) || 0));

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const headers = { ...cors(origin), 'Content-Type': 'application/json' };
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'POST' || !ALLOWED_ORIGINS.includes(origin)) {
      return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers });
    }

    let b;
    try { b = await request.json(); } catch (e) { return new Response(JSON.stringify({ error: 'bad json' }), { status: 400, headers }); }

    const f = {
      lang: b.lang === 'tr' ? 'Turkish' : 'English',
      oxygen: num(b.oxygen, 0, 20), glucose: num(b.glucose, 1, 10),
      goal: b.goal === 'lactate' ? 'make lactate' : 'grow as fast as possible',
      knockouts: (Array.isArray(b.knockouts) ? b.knockouts : []).filter(g => GENES.includes(g)).slice(0, 9),
      growthPct: Math.round(num(b.growthPct, 0, 100)),
      essential: (Array.isArray(b.essential) ? b.essential : []).filter(g => GENES.includes(g)).slice(0, 9),
      products: (Array.isArray(b.products) ? b.products : []).filter(p => PRODUCTS.includes(p)).slice(0, 4),
      mainEnergy: b.mainEnergy === 'respiration' ? 'respiration (uses oxygen)' : b.mainEnergy === 'fermentation' ? 'fermentation (no oxygen)' : 'none (the cell is not growing)',
      lactateFailed: !!b.lactateFailed
    };

    const system =
      'You explain the results of a tiny educational simulation of a cell (flux balance analysis of a toy model) ' +
      'to the general public, including children and adults with no biology background. Use everyday words and one ' +
      'simple analogy (a cell is a tiny kitchen, genes are instructions for workers). Write 3 to 5 short sentences, ' +
      'no jargon, no lists, no markdown. Say clearly it is a simplified toy model, not a real organism. ' +
      'Do not invent facts beyond the data given. Gene hints: glk=sugar doorman, gapA=sugar cutter, aceE=converter ' +
      'that needs air, pflB=converter that works without air, gltA=furnace, cyoB=breathing engine, ' +
      'ldhA=lactate maker, pta=vinegar maker, adhE=alcohol maker. Reply in ' + f.lang + '.';
    const user = 'Simulation result: ' + JSON.stringify(f);

    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + MODEL + ':generateContent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig: { temperature: 0.5, maxOutputTokens: 350, thinkingConfig: { thinkingBudget: 0 } }
      })
    });
    if (!r.ok) {
      let msg = ''; try { msg = ((await r.json()).error || {}).message || ''; } catch (e) {}
      return new Response(JSON.stringify({ error: 'upstream', status: r.status, detail: msg.slice(0, 160) }), { status: 502, headers });
    }
    const data = await r.json();
    const text = (((data.candidates || [])[0] || {}).content || {}).parts;
    const out = text ? text.map(p => p.text || '').join('').trim() : '';
    if (!out) return new Response(JSON.stringify({ error: 'empty' }), { status: 502, headers });
    return new Response(JSON.stringify({ text: out }), { status: 200, headers });
  }
};
