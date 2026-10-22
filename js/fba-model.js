/* fba-model.js - a small, educational "toy cell" for flux balance analysis (FBA).
 * Not a real organism: a simplified central metabolism for exploring how
 * gene knockouts and oxygen change growth. Works in the browser and in Node.
 *
 * Needs the LP solver (js/vendor/lp-solver.js) as global `solver` (browser)
 * or passed to FBAModel.setSolver() (Node).
 */
(function (root) {
  'use strict';

  var solverRef = null;

  // Metabolites are balanced at steady state (sum of production - consumption = 0).
  // Reactions: stoichiometry (negative = consumed, positive = produced), flux bounds.
  var REACTIONS = {
    UPT_GLC: { name: 'Glucose uptake',       stoich: { glc: 1 },                               lb: 0, ub: 10 },
    UPT_O2:  { name: 'Oxygen uptake',        stoich: { o2: 1 },                                lb: 0, ub: 20 },
    HK:      { name: 'Hexokinase',           stoich: { glc: -1, atp: -1, g6p: 1 },             lb: 0, ub: 1000, gene: 'glk' },
    GLY:     { name: 'Lower glycolysis',     stoich: { g6p: -1, pyr: 2, atp: 3, nadh: 2 },     lb: 0, ub: 1000, gene: 'gapA' },
    PDH:     { name: 'Pyruvate dehydrogenase', stoich: { pyr: -1, accoa: 1, nadh: 1 },         lb: 0, ub: 1000, gene: 'aceE' },
    PFL:     { name: 'Pyruvate formate-lyase (O2-sensitive)', stoich: { pyr: -1, accoa: 1, for: 1 }, lb: 0, ub: 1000, gene: 'pflB' },
    EX_FOR:  { name: 'Formate secretion',    stoich: { for: -1 },                              lb: 0, ub: 1000 },
    TCA:     { name: 'TCA cycle',            stoich: { accoa: -1, nadh: 3, atp: 1 },           lb: 0, ub: 1000, gene: 'gltA' },
    OXP:     { name: 'Respiration',          stoich: { nadh: -1, o2: -0.5, atp: 2.5 },         lb: 0, ub: 1000, gene: 'cyoB' },
    LDH:     { name: 'Lactate fermentation', stoich: { pyr: -1, nadh: -1, lac: 1 },            lb: 0, ub: 1000, gene: 'ldhA' },
    PTA:     { name: 'Acetate production',   stoich: { accoa: -1, atp: 1, ac: 1 },             lb: 0, ub: 1000, gene: 'pta' },
    ADH:     { name: 'Ethanol fermentation', stoich: { accoa: -1, nadh: -2, etoh: 1 },         lb: 0, ub: 1000, gene: 'adhE' },
    EX_ETOH: { name: 'Ethanol secretion',    stoich: { etoh: -1 },                             lb: 0, ub: 1000 },
    EX_LAC:  { name: 'Lactate secretion',    stoich: { lac: -1 },                              lb: 0, ub: 1000 },
    EX_AC:   { name: 'Acetate secretion',    stoich: { ac: -1 },                               lb: 0, ub: 1000 },
    ATPM:    { name: 'Maintenance energy',   stoich: { atp: -1 },                              lb: 1, ub: 1 },
    BIO:     { name: 'Biomass (growth)',     stoich: { g6p: -1, pyr: -1, accoa: -1, atp: -20 }, lb: 0, ub: 1000 }
  };

  var METABOLITES = ['glc', 'g6p', 'pyr', 'accoa', 'nadh', 'atp', 'o2', 'lac', 'ac', 'etoh', 'for'];

  function genes() {
    var out = [];
    Object.keys(REACTIONS).forEach(function (id) {
      if (REACTIONS[id].gene) out.push({ gene: REACTIONS[id].gene, reaction: id });
    });
    return out;
  }

  /** Solve one FBA problem. opts: { glucose, oxygen, knockouts:[gene...], objective:'growth'|'lactate', minGrowth } */
  function solve(opts) {
    var s = solverRef || root.solver;
    if (!s) throw new Error('LP solver not loaded');
    var knocked = {};
    (opts.knockouts || []).forEach(function (g) { knocked[g] = true; });

    var objective = opts.objective === 'lactate' ? 'EX_LAC' : 'BIO';
    var model = { optimize: 'obj', opType: 'max', constraints: {}, variables: {} };

    METABOLITES.forEach(function (m) { model.constraints[m] = { equal: 0 }; });

    Object.keys(REACTIONS).forEach(function (id) {
      var r = REACTIONS[id];
      var lb = r.lb, ub = r.ub;
      if (id === 'UPT_GLC') ub = opts.glucose;
      if (id === 'UPT_O2') ub = opts.oxygen;
      if (id === 'PFL' && opts.oxygen > 0.5) ub = 0; // oxygen inactivates PFL
      if (r.gene && knocked[r.gene]) { lb = 0; ub = 0; }
      if (id === 'BIO' && opts.minGrowth) lb = Math.max(lb, opts.minGrowth);

      var v = {};
      Object.keys(r.stoich).forEach(function (m) { v[m] = r.stoich[m]; });
      v.obj = id === objective ? 1 : 0;
      v['bound_' + id] = 1;
      model.variables[id] = v;
      model.constraints['bound_' + id] = { min: lb, max: ub };
    });

    var res = s.Solve(model);
    var fluxes = {};
    Object.keys(REACTIONS).forEach(function (id) {
      var val = res[id];
      fluxes[id] = res.feasible !== false && typeof val === 'number' && Math.abs(val) > 1e-9 ? val : 0;
    });
    return { feasible: res.feasible !== false, fluxes: fluxes, growth: fluxes.BIO, lactate: fluxes.EX_LAC };
  }

  /** Growth for the given conditions plus the unmodified reference (no knockouts). */
  function analyse(opts) {
    var wt = solve({ glucose: opts.glucose, oxygen: opts.oxygen, knockouts: [], objective: 'growth' });
    var mutant;
    if (opts.objective === 'lactate') {
      mutant = solve({ glucose: opts.glucose, oxygen: opts.oxygen, knockouts: opts.knockouts,
                       objective: 'lactate', minGrowth: 0.1 * wt.growth });
      if (!mutant.feasible) {
        // cannot keep 10% of wild-type growth: report the growth-optimal state instead
        mutant = solve({ glucose: opts.glucose, oxygen: opts.oxygen, knockouts: opts.knockouts, objective: 'growth' });
        mutant.lactateInfeasible = true;
      }
    } else {
      mutant = solve({ glucose: opts.glucose, oxygen: opts.oxygen, knockouts: opts.knockouts, objective: 'growth' });
    }
    return { wild: wt, mutant: mutant };
  }

  /** Single-gene essentiality screen under the given conditions. */
  function screen(opts) {
    var wt = solve({ glucose: opts.glucose, oxygen: opts.oxygen, knockouts: [], objective: 'growth' });
    return genes().map(function (g) {
      var m = solve({ glucose: opts.glucose, oxygen: opts.oxygen, knockouts: [g.gene], objective: 'growth' });
      var ratio = wt.growth > 1e-9 ? m.growth / wt.growth : 0;
      return { gene: g.gene, reaction: g.reaction, growth: m.growth, ratio: ratio,
               essential: ratio < 0.01 };
    });
  }

  var api = {
    REACTIONS: REACTIONS, METABOLITES: METABOLITES, genes: genes,
    solve: solve, analyse: analyse, screen: screen,
    setSolver: function (s) { solverRef = s; }
  };

  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FBAModel = api;
})(typeof window !== 'undefined' ? window : globalThis);
