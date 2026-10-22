/* playground.js - UI for the metabolic knockout playground (uses FBAModel). */
(function () {
    'use strict';
    var root = document.getElementById('playground');
    if (!root || !window.FBAModel) return;

    var T = {
        en: {
            growth: 'Growth', ofWt: 'of wild type', noGrowth: 'No growth', growthLbl: 'Growth',
            dead: 'The cell cannot grow at all in this situation.',
            ok: 'No problem: the cell grows just as well.', reduced: 'The cell still grows, but more slowly.',
            lacMade: 'Lactate output', lacFail: 'The cell cannot make lactate and stay alive here. Try other genes or less oxygen.',
            essential: 'Cell dies without it', fine: 'Not needed here', slows: 'Slower growth',
            gene: 'Gene', reaction: 'Reaction', effect: 'Effect on growth',
            flux: 'flux', off: 'knocked out',
            aiWorking: 'Thinking...', aiLocal: 'Built-in explainer (rule-based, not a language model).', aiGemini: 'Written by AI (Gemini) from the simulation numbers. A toy model, so do not read it as real biology.',
            hint: { glk: 'sugar doorman', gapA: 'sugar cutter', aceE: 'converter (air)', pflB: 'converter (no air)', gltA: 'furnace', cyoB: 'breathing engine', ldhA: 'lactate maker', pta: 'vinegar maker', adhE: 'alcohol maker' }
        },
        tr: {
            growth: 'Büyüme', ofWt: '(yabanıl tipe göre)', noGrowth: 'Büyüme yok',
            dead: 'Hücre bu durumda hiç büyüyemiyor.',
            ok: 'Sorun yok: hücre eskisi kadar iyi büyüyor.', reduced: 'Hücre hâlâ büyüyor ama daha yavaş.',
            lacMade: 'Laktat üretimi', lacFail: 'Hücre canlı kalarak laktat üretemiyor. Başka bir gen veya daha oksijensiz koşullar deneyin.',
            essential: 'Onsuz hücre ölür', fine: 'Burada gerekmiyor', slows: 'Daha yavaş büyüme',
            gene: 'Gen', reaction: 'Reaksiyon', effect: 'Büyümeye etkisi',
            flux: 'akı', off: 'devre dışı',
            aiWorking: 'Düşünüyor...', aiLocal: 'Yerleşik açıklayıcı (kural tabanlı, dil modeli değil).', aiGemini: 'Simülasyon sayılarından yapay zeka (Gemini) tarafından yazıldı. Oyuncak model olduğu için gerçek biyoloji olarak okumayın.',
            hint: { glk: 'şeker kapıcısı', gapA: 'şeker kesici', aceE: 'dönüştürücü (hava)', pflB: 'dönüştürücü (havasız)', gltA: 'fırın', cyoB: 'solunum motoru', ldhA: 'laktat üretici', pta: 'sirke üretici', adhE: 'alkol üretici' }
        }
    };
    function t() { return T[(window.i18n && window.i18n.lang) === 'tr' ? 'tr' : 'en']; }

    // Set to your deployed worker URL (see worker/README.md). Empty = built-in explainer only.
    var AI_ENDPOINT = 'https://bay-ai-explainer.omerfarukbay.workers.dev';

    var state = { knockouts: [], glucose: 10, oxygen: 20, objective: 'growth' };
    var $ = function (id) { return document.getElementById(id); };
    var chips = $('pg-chips');

    function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

    function buildChips() {
        chips.innerHTML = '';
        FBAModel.genes().forEach(function (g) {
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'pg-chip';
            b.dataset.gene = g.gene;
            b.addEventListener('click', function () {
                var i = state.knockouts.indexOf(g.gene);
                if (i >= 0) state.knockouts.splice(i, 1); else state.knockouts.push(g.gene);
                render();
            });
            chips.appendChild(b);
        });
    }


    var GLOSS = {
        en: { mol: [
 [
  "Glucose",
  "Plain sugar. It is the cell's only food here, like fuel in a car's tank."
 ],
 [
  "Glucose-6-phosphate",
  "Sugar with a small tag attached. The tag locks it inside the cell, like a ticket that stops it leaving. It is also a raw material for building the cell."
 ],
 [
  "Pyruvate",
  "What is left when a sugar molecule is cut in half. The cell can burn it for energy, turn it into waste, or use it as building material."
 ],
 [
  "Acetyl-CoA",
  "A basic Lego brick of the cell. It can be burned for extra energy or used to build new cell parts."
 ],
 [
  "ATP",
  "The cell's rechargeable battery. Making things and staying alive costs ATP, and burning food recharges it."
 ],
 [
  "NADH",
  "A small delivery truck carrying energy. It must be unloaded to keep things running. With oxygen the cell unloads it for lots of ATP. Without oxygen it has to dump the load into lactate or ethanol."
 ],
 [
  "Oxygen",
  "The air we breathe. It lets the cell burn food much more fully, giving far more energy."
 ],
 [
  "Lactate",
  "The same acid your muscles make when you sprint. A way to get rid of leftover load when there is no oxygen."
 ],
 [
  "Ethanol",
  "The alcohol in drinks, also made by yeast in bread and beer. Another way to get rid of leftovers without oxygen."
 ],
 [
  "Acetate",
  "What vinegar is made of. A side product released while squeezing out a little extra energy."
 ],
 [
  "Formate",
  "A tiny waste molecule (the same one in ant stings) released when the cell cuts pyruvate without oxygen."
 ],
 [
  "Biomass",
  "All the stuff a new cell is made of: proteins, fats, DNA. Making more of it is what we call growth."
 ]
], gene: {
 "glk": "The doorman: tags sugar so it can be used.",
 "gapA": "The sugar cutter: splits sugar in half and earns some energy.",
 "aceE": "The converter: turns pyruvate into a building brick when air is present.",
 "pflB": "The no-air converter: does the same job without oxygen. Oxygen switches it off.",
 "gltA": "The furnace: squeezes extra energy out of the building brick.",
 "cyoB": "The breathing engine: uses oxygen to turn deliveries into lots of energy.",
 "ldhA": "The lactate maker: gets rid of leftover load without oxygen.",
 "pta": "The vinegar maker: turns the building brick into acetate and a little energy.",
 "adhE": "The alcohol maker: gets rid of leftover load without oxygen."
} },
        tr: { mol: [
 [
  "Glikoz",
  "Sade şeker. Burada hücrenin tek yiyeceği; arabanın deposundaki yakıt gibi."
 ],
 [
  "Glikoz-6-fosfat",
  "Üzerine küçük bir etiket takılmış şeker. Etiket onu hücrenin içinde tutar, çıkmasını engelleyen bir bilet gibi. Hücreyi inşa etmek için de hammaddedir."
 ],
 [
  "Piruvat",
  "Bir şeker molekülü ikiye bölününce kalan parça. Hücre onu enerji için yakabilir, atığa çevirebilir ya da yapı malzemesi olarak kullanabilir."
 ],
 [
  "Asetil-KoA",
  "Hücrenin temel Lego parçalarından biri. Ekstra enerji için yakılabilir ya da yeni hücre parçaları yapmak için kullanılır."
 ],
 [
  "ATP",
  "Hücrenin şarj edilebilir pili. Bir şey üretmek ve hayatta kalmak ATP harcar, yiyecek yakmak onu yeniden doldurur."
 ],
 [
  "NADH",
  "Enerji taşıyan küçük bir teslimat kamyonu. Yükünü boşaltması gerekir ki iş akışı sürsün. Oksijen varken hücre onu boşaltıp bolca ATP kazanır. Oksijen yokken yükü laktata ya da etanole boşaltmak zorundadır."
 ],
 [
  "Oksijen",
  "Soluduğumuz hava. Hücrenin yiyeceği çok daha tam yakmasını ve çok daha fazla enerji üretmesini sağlar."
 ],
 [
  "Laktat",
  "Koşarken kaslarınızın ürettiği asitle aynı madde. Oksijen yokken artan yükten kurtulmanın bir yolu."
 ],
 [
  "Etanol",
  "İçkilerdeki alkol; ekmekte ve biradaki maya da üretir. Oksijen yokken artıklardan kurtulmanın başka bir yolu."
 ],
 [
  "Asetat",
  "Sirkenin içindeki madde. Biraz ekstra enerji sıkılırken ortaya çıkan yan ürün."
 ],
 [
  "Format",
  "Hücre oksijensiz ortamda piruvatı keserken açığa çıkan minik bir atık (karınca sokmasındaki madde)."
 ],
 [
  "Biyokütle",
  "Yeni bir hücrenin yapıldığı her şey: proteinler, yağlar, DNA. Daha fazlasını üretmek, büyüme dediğimiz şeydir."
 ]
], gene: {
 "glk": "Kapıcı: şekeri kullanılabilir hale getirmek için etiketler.",
 "gapA": "Şeker kesici: şekeri ikiye böler ve biraz enerji kazanır.",
 "aceE": "Dönüştürücü: hava varken piruvatı yapı taşına çevirir.",
 "pflB": "Havasız dönüştürücü: aynı işi oksijensiz yapar. Oksijen onu kapatır.",
 "gltA": "Fırın: yapı taşından ekstra enerji sıkıp çıkarır.",
 "cyoB": "Solunum motoru: oksijenle teslimatları bol enerjiye çevirir.",
 "ldhA": "Laktat üretici: oksijen yokken artan yükten kurtulur.",
 "pta": "Sirke üretici: yapı taşını asetata ve biraz enerjiye çevirir.",
 "adhE": "Alkol üretici: oksijen yokken artan yükten kurtulur."
} }
    };
    function renderGloss() {
        var lang = (window.i18n && window.i18n.lang) === 'tr' ? 'tr' : 'en', G = GLOSS[lang];
        $('pg-gloss').innerHTML = G.mol.map(function (m) { return '<div><dt>' + esc(m[0]) + '</dt><dd>' + esc(m[1]) + '</dd></div>'; }).join('');
        $('pg-gloss-genes').innerHTML = FBAModel.genes().map(function (g) {
            return '<div><dt><i>' + esc(g.gene) + '</i></dt><dd>' + esc(G.gene[g.gene] || '') + '</dd></div>';
        }).join('');
        Array.prototype.forEach.call(chips.children, function (b) { b.title = G.gene[b.dataset.gene] || ''; });
    }


    // ----- AI explainer -----
    var PRODUCT_OF = { EX_LAC: 'lactate', EX_AC: 'acetate', EX_ETOH: 'ethanol', EX_FOR: 'formate' };
    var PNAME = { en: { lactate: 'lactate (the acid muscles make)', acetate: 'acetate (vinegar)', ethanol: 'ethanol (alcohol)', formate: 'formate' },
                  tr: { lactate: 'laktat (kasların ürettiği asit)', acetate: 'asetat (sirke)', ethanol: 'etanol (alkol)', formate: 'format' } };
    var WORKER = { en: { glk: 'sugar doorman', gapA: 'sugar cutter', aceE: 'air-needing converter', pflB: 'no-air converter', gltA: 'furnace', cyoB: 'breathing engine', ldhA: 'lactate maker', pta: 'vinegar maker', adhE: 'alcohol maker' },
                   tr: { glk: 'şeker kapıcısı', gapA: 'şeker kesici', aceE: 'havalı dönüştürücü', pflB: 'havasız dönüştürücü', gltA: 'fırın', cyoB: 'solunum motoru', ldhA: 'laktat üretici', pta: 'sirke üretici', adhE: 'alkol üretici' } };

    function facts() {
        var res = FBAModel.analyse(state), mu = res.mutant, wt = res.wild.growth;
        var pct = wt > 1e-9 ? Math.max(0, Math.min(1, mu.growth / wt)) : 0;
        var sc = FBAModel.screen({ glucose: state.glucose, oxygen: state.oxygen });
        var products = [];
        Object.keys(PRODUCT_OF).forEach(function (id) { if (mu.fluxes[id] > 1e-6) products.push(PRODUCT_OF[id]); });
        return {
            lang: (window.i18n && window.i18n.lang) === 'tr' ? 'tr' : 'en',
            oxygen: state.oxygen, glucose: state.glucose, goal: state.objective,
            knockouts: state.knockouts.slice(), growthPct: Math.round(pct * 100),
            essential: sc.filter(function (r) { return r.essential; }).map(function (r) { return r.gene; }),
            products: products,
            mainEnergy: pct <= 0.005 ? 'none' : (mu.fluxes.OXP > 1e-6 ? 'respiration' : 'fermentation'),
            lactateFailed: !!mu.lactateInfeasible, lactate: mu.lactate
        };
    }

    function localExplain(f) {
        var tr = f.lang === 'tr', W = WORKER[f.lang], P = PNAME[f.lang], out = [];
        var air = f.oxygen > 0;
        var names = f.knockouts.map(function (g) { return g + ' (' + W[g] + ')'; }).join(', ');
        if (tr) {
            out.push(air ? 'Bu hücre havalı (oksijenli) bir ortamda yaşıyor.' : 'Bu hücre havasız bir ortamda yaşıyor, yani nefes alamıyor.');
            out.push(f.knockouts.length ? 'Şu işçileri işten çıkardınız: ' + names + '.' : 'Hiçbir işçiyi işten çıkarmadınız, hücre tam kadro çalışıyor.');
            if (f.growthPct === 0) out.push('Sonuç: hücre hiç büyüyemiyor, çünkü gerekli bir adım eksik.');
            else if (f.growthPct >= 99) out.push('Sonuç: hücre sağlıklı bir hücre kadar iyi büyüyor; kapattığınız işçiler bu ortamda gerekmiyor ya da başka yol buluyor.');
            else out.push('Sonuç: hücre büyüyor ama sağlıklı bir hücrenin yalnızca %' + f.growthPct + '\'i hızında.');
            if (f.mainEnergy !== 'none') out.push(f.mainEnergy === 'respiration' ? 'Enerjisinin çoğunu oksijenle yakarak (solunum) üretiyor, bu çok verimli.' : 'Oksijen olmadığı için enerjiyi fermantasyonla, yani yarım yanma ile üretiyor; bu daha az verimli ve atık bırakıyor.');
            if (f.growthPct > 0 && f.products.length) out.push('Dışarı attığı maddeler: ' + f.products.map(function (p) { return P[p]; }).join(', ') + '.');
            if (f.goal === 'lactate') out.push(f.lactateFailed ? 'Canlı kalarak laktat üretemiyor.' : 'Hedef laktat olduğu için hücre büyümesinden biraz feragat edip laktat üretiyor.');
            out.push('Bu basitleştirilmiş bir oyuncak model; gerçek bir canlı değildir.');
        } else {
            out.push(air ? 'This cell lives with air (oxygen).' : 'This cell lives without air, so it cannot breathe.');
            out.push(f.knockouts.length ? 'You fired these workers: ' + names + '.' : 'You fired nobody, so the cell works with its full team.');
            if (f.growthPct === 0) out.push('Result: the cell cannot grow at all because a step it needs is missing.');
            else if (f.growthPct >= 99) out.push('Result: the cell grows as well as a healthy one. The workers you removed are not needed here, or the cell finds another route.');
            else out.push('Result: the cell grows, but only at ' + f.growthPct + '% of the speed of a healthy cell.');
            if (f.mainEnergy !== 'none') out.push(f.mainEnergy === 'respiration' ? 'It gets most of its energy by burning food with oxygen (respiration), which is very efficient.' : 'With no oxygen it gets energy by fermentation, a half-burn that gives less energy and leaves waste behind.');
            if (f.growthPct > 0 && f.products.length) out.push('It pushes out: ' + f.products.map(function (p) { return P[p]; }).join(', ') + '.');
            if (f.goal === 'lactate') out.push(f.lactateFailed ? 'It cannot make lactate and stay alive.' : 'Because the goal is lactate, the cell gives up a little growth to make it.');
            out.push('This is a simplified toy model, not a real organism.');
        }
        return out.join(' ');
    }

    var aiBusy = false;
    function explain() {
        if (aiBusy) return;
        var L = t(), f = facts(), box = $('pg-ai-out'), src = $('pg-ai-src');
        var local = function () { box.textContent = localExplain(f); src.textContent = L.aiLocal; };
        if (!AI_ENDPOINT) { local(); return; }
        aiBusy = true; box.textContent = L.aiWorking; src.textContent = '';
        var ctl = typeof AbortController === 'function' ? new AbortController() : null;
        var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 12000);
        fetch(AI_ENDPOINT, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctl ? ctl.signal : undefined,
            body: JSON.stringify({ lang: f.lang, oxygen: f.oxygen, glucose: f.glucose, goal: f.goal, knockouts: f.knockouts,
                growthPct: f.growthPct, essential: f.essential, products: f.products, mainEnergy: f.mainEnergy, lactateFailed: f.lactateFailed })
        }).then(function (r) { if (!r.ok) throw new Error('http'); return r.json(); })
          .then(function (d) { if (!d.text) throw new Error('empty'); box.textContent = d.text; src.textContent = L.aiGemini; })
          .catch(function () { local(); })
          .then(function () { clearTimeout(timer); aiBusy = false; });
    }
    $('pg-ai-btn').addEventListener('click', explain);

    function render() {
        renderGloss();
        if (!aiBusy) { $('pg-ai-out').textContent = ''; $('pg-ai-src').textContent = ''; }
        var L = t();
        // controls
        Array.prototype.forEach.call(chips.children, function (b) {
            var on = state.knockouts.indexOf(b.dataset.gene) >= 0;
            b.setAttribute('aria-pressed', String(on));
            b.classList.toggle('on', on);
            b.innerHTML = '<i>' + esc(b.dataset.gene) + '</i><small>' + esc(L.hint[b.dataset.gene] || '') + '</small>';
        });
        $('pg-glc-out').textContent = state.glucose;
        $('pg-o2-out').textContent = state.oxygen;
        $('pg-glc').value = state.glucose;
        $('pg-o2').value = state.oxygen;
        $('pg-aerobic').setAttribute('aria-pressed', String(state.oxygen > 0));
        $('pg-anaerobic').setAttribute('aria-pressed', String(state.oxygen === 0));
        $('pg-goal-growth').setAttribute('aria-pressed', String(state.objective === 'growth'));
        $('pg-goal-lac').setAttribute('aria-pressed', String(state.objective === 'lactate'));

        var res = FBAModel.analyse(state);
        var wt = res.wild.growth, mu = res.mutant;
        var pct = wt > 1e-9 ? Math.max(0, Math.min(1, mu.growth / wt)) : 0;
        $('pg-growth').textContent = L.growth + ': ' + Math.round(pct * 100) + '% ' + L.ofWt;
        $('pg-growth-bar').style.width = (pct * 100) + '%';

        var verdict;
        if (wt <= 1e-9 || pct < 0.01) verdict = L.dead;
        else if (pct > 0.99) verdict = L.ok;
        else verdict = L.reduced;
        if (state.objective === 'lactate') {
            verdict = mu.lactateInfeasible ? L.lacFail : L.lacMade + ': ' + mu.lactate.toFixed(1) + ' (' + verdict + ')';
        }
        $('pg-verdict').textContent = verdict;

        // fluxes
        var max = 0, ids = Object.keys(FBAModel.REACTIONS);
        ids.forEach(function (id) { max = Math.max(max, Math.abs(mu.fluxes[id])); });
        var html = '';
        ids.forEach(function (id) {
            var r = FBAModel.REACTIONS[id], f = mu.fluxes[id];
            var off = r.gene && state.knockouts.indexOf(r.gene) >= 0;
            if (!off && f === 0 && !r.gene) return; // hide idle exchanges
            var w = max > 0 ? Math.round(100 * Math.abs(f) / max) : 0;
            html += '<div class="pg-row' + (off ? ' off' : '') + '"><span class="pg-rname">' + esc(r.name) +
                (r.gene ? ' <em>' + esc(r.gene) + '</em>' : '') + '</span>' +
                '<span class="pg-rbar"><span style="width:' + w + '%"></span></span>' +
                '<span class="pg-rval">' + (off ? L.off : f.toFixed(1)) + '</span></div>';
        });
        $('pg-flux').innerHTML = html;

        // essentiality screen (single knockouts under current environment)
        var sc = FBAModel.screen({ glucose: state.glucose, oxygen: state.oxygen });
        var tb = '<table><thead><tr><th>' + L.gene + '</th><th>' + L.reaction + '</th><th>' + L.effect + '</th></tr></thead><tbody>';
        sc.forEach(function (r) {
            var cls = r.essential ? 'ess' : (r.ratio < 0.99 ? 'slow' : 'fine');
            var label = r.essential ? L.essential : (r.ratio < 0.99 ? L.slows + ' (' + Math.round(r.ratio * 100) + '%)' : L.fine);
            tb += '<tr class="' + cls + '"><td><i>' + esc(r.gene) + '</i></td><td>' + esc(FBAModel.REACTIONS[r.reaction].name) + '</td><td>' + label + '</td></tr>';
        });
        $('pg-screen').innerHTML = tb + '</tbody></table>';
    }

    $('pg-glc').addEventListener('input', function (e) { state.glucose = +e.target.value; render(); });
    $('pg-o2').addEventListener('input', function (e) { state.oxygen = +e.target.value; render(); });
    $('pg-aerobic').addEventListener('click', function () { state.oxygen = 20; render(); });
    $('pg-anaerobic').addEventListener('click', function () { state.oxygen = 0; render(); });
    $('pg-goal-growth').addEventListener('click', function () { state.objective = 'growth'; render(); });
    $('pg-goal-lac').addEventListener('click', function () { state.objective = 'lactate'; render(); });
    $('pg-reset').addEventListener('click', function () { state = { knockouts: [], glucose: 10, oxygen: 20, objective: 'growth' }; render(); });
    document.addEventListener('langchange', render);

    buildChips();
    render();
})();
