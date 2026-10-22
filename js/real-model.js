/* real-model.js - flux balance analysis of a real, published model: the E. coli core
 * model (Orth, Fleming & Palsson 2010, EcoSal Plus; distributed by BiGG Models,
 * http://bigg.ucsd.edu/models/e_coli_core). 95 reactions, 72 metabolites, 137 genes.
 * Works in the browser and in Node. Needs the LP solver as global `solver`
 * (browser) or passed to RealModel.setSolver() (Node).
 */
(function (root) {
  'use strict';

  var solverRef = null, M = null, geneByName = {}, geneIds = [], rxnById = {};
  var GLC = 'EX_glc__D_e', O2 = 'EX_o2_e', BIO = 'BIOMASS_Ecoli_core_w_GAM';

  function load(json) {
    M = json; geneByName = {}; geneIds = []; rxnById = {};
    M.genes.forEach(function (g) { geneByName[g.name] = g.id; geneIds.push(g.id); });
    M.reactions.forEach(function (r) { rxnById[r.id] = r; r._rule = compileRule(r.gene_reaction_rule); });
    return api;
  }

  // gene_reaction_rule such as "(b0008 and b2465) or b2464" -> function(deadSet) -> bool (active?)
  function compileRule(rule) {
    rule = (rule || '').trim();
    if (!rule) return null;
    var js = rule.replace(/\b(and|or)\b/gi, function (m) { return m.toLowerCase() === 'and' ? '&&' : '||'; })
                 .replace(/\bb\d{4}\b|\bs\d{4}\b/g, function (id) { return '!d["' + id + '"]'; });
    /* eslint-disable no-new-func */
    return new Function('d', 'return !!(' + js + ');');
  }

  function toId(g) { return geneByName[g] || g; }

  function solve(opts) {
    var s = solverRef || root.solver;
    if (!s) throw new Error('LP solver not loaded');
    if (!M) throw new Error('model not loaded');
    var dead = {};
    (opts.knockouts || []).forEach(function (g) { dead[toId(g)] = true; });
    var objective = opts.objective || BIO;
    var model = { optimize: 'obj', opType: 'max', constraints: {}, variables: {} };
    M.metabolites.forEach(function (m) { model.constraints[m.id] = { equal: 0 }; });

    function addVar(name, r, sign, lo, hi) {
      var v = {};
      Object.keys(r.metabolites).forEach(function (m) { v[m] = sign * r.metabolites[m]; });
      v.obj = r.id === objective ? sign : 0;
      v['b_' + name] = 1;
      model.variables[name] = v;
      model.constraints['b_' + name] = { min: lo, max: hi };
    }

    M.reactions.forEach(function (r) {
      var lb = r.lower_bound, ub = r.upper_bound;
      if (r.id === GLC) lb = -opts.glucose;
      if (r.id === O2) lb = -opts.oxygen;
      if (r._rule && !r._rule(dead)) { lb = 0; ub = 0; }
      if (r.id === objective && opts.minObjective) lb = Math.max(lb, opts.minObjective);
      if (lb >= 0) addVar(r.id + '+', r, 1, lb, ub);
      else {
        addVar(r.id + '+', r, 1, 0, Math.max(ub, 0));
        addVar(r.id + '-', r, -1, 0, -lb);
      }
    });

    var res = s.Solve(model), fluxes = {};
    M.reactions.forEach(function (r) {
      var p = res[r.id + '+'] || 0, n = res[r.id + '-'] || 0, v = p - n;
      fluxes[r.id] = res.feasible !== false && Math.abs(v) > 1e-9 ? v : 0;
    });
    return { feasible: res.feasible !== false, fluxes: fluxes, growth: fluxes[BIO] };
  }

  /** Single-gene knockout screen. Calls cb(progress 0..1) via async chunks if `onProgress` given. */
  function screen(opts, onProgress, done) {
    var wt = solve({ glucose: opts.glucose, oxygen: opts.oxygen, knockouts: [] }).growth;
    var out = [], i = 0, n = M.genes.length;
    function step() {
      var t0 = Date.now();
      while (i < n && Date.now() - t0 < 40) {
        var g = M.genes[i++];
        var m = solve({ glucose: opts.glucose, oxygen: opts.oxygen, knockouts: [g.id] }).growth;
        out.push({ id: g.id, name: g.name, growth: m, ratio: wt > 1e-9 ? m / wt : 0, essential: wt > 1e-9 && m / wt < 0.01 });
      }
      if (onProgress) onProgress(i / n);
      if (i < n) setTimeout(step, 0);
      else done({ wild: wt, genes: out });
    }
    if (!done) { // synchronous (Node / tests)
      while (i < n) { var g2 = M.genes[i++]; var m2 = solve({ glucose: opts.glucose, oxygen: opts.oxygen, knockouts: [g2.id] }).growth;
        out.push({ id: g2.id, name: g2.name, growth: m2, ratio: wt > 1e-9 ? m2 / wt : 0, essential: wt > 1e-9 && m2 / wt < 0.01 }); }
      return { wild: wt, genes: out };
    }
    step();
  }

  var api = {
    load: load, solve: solve, screen: screen,
    setSolver: function (s) { solverRef = s; },
    model: function () { return M; },
    reactions: function () { return M.reactions; },
    genes: function () { return M.genes; },
    BIO: BIO
  };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RealModel = api;
})(typeof window !== 'undefined' ? window : globalThis);
