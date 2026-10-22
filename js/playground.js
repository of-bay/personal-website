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
            pdfNote: 'Opens the print window: choose "Save as PDF".',
            legend: 'Thicker, moving lines carry more material. Grey = idle. Red dashed = switched off. Click a gene tag on the map to switch it off or on.', food: 'food in', air: 'air in', out: 'out', mapLabel: 'Diagram of the cell showing how sugar flows through its chemical steps',
            nodes: { glc: 'Glucose', g6p: 'Glucose-6-P', pyr: 'Pyruvate', accoa: 'Acetyl-CoA', nadh: 'NADH', atp: 'ATP', o2: 'Oxygen', lac: 'Lactate', ac: 'Acetate', etoh: 'Ethanol', bio: 'Biomass' },
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
            pdfNote: 'Yazdırma penceresi açılır: "PDF olarak kaydet" seçin.',
            legend: 'Kalın ve hareketli çizgiler daha çok madde taşır. Gri = boşta. Kırmızı kesikli = kapalı. Haritadaki bir gen etiketine tıklayarak onu kapatıp açabilirsiniz.', food: 'besin girişi', air: 'hava girişi', out: 'dışarı', mapLabel: 'Şekerin hücrenin kimyasal adımlarından nasıl aktığını gösteren hücre diyagramı',
            nodes: { glc: 'Glikoz', g6p: 'Glikoz-6-P', pyr: 'Piruvat', accoa: 'Asetil-KoA', nadh: 'NADH', atp: 'ATP', o2: 'Oksijen', lac: 'Laktat', ac: 'Asetat', etoh: 'Etanol', bio: 'Biyokütle' },
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

    var RN = {
        en: { UPT_GLC: 'Sugar coming in', UPT_O2: 'Air coming in', HK: 'Tag the sugar', GLY: 'Cut sugar in half', PDH: 'Make building brick (with air)', PFL: 'Make building brick (no air)', TCA: 'Furnace: squeeze out energy', OXP: 'Breathe: turn deliveries into energy', LDH: 'Make lactate', PTA: 'Make acetate', ADH: 'Make ethanol', EX_LAC: 'Lactate released', EX_AC: 'Acetate released', EX_ETOH: 'Ethanol released', EX_FOR: 'Formate released', ATPM: 'Basic upkeep energy', BIO: 'Grow: build a new cell' },
        tr: { UPT_GLC: 'Gelen şeker', UPT_O2: 'Gelen hava', HK: 'Şekeri etiketle', GLY: 'Şekeri ikiye böl', PDH: 'Yapı taşı üret (havalı)', PFL: 'Yapı taşı üret (havasız)', TCA: 'Fırın: enerji sıkıp çıkar', OXP: 'Solunum: teslimatları enerjiye çevir', LDH: 'Laktat üret', PTA: 'Asetat üret', ADH: 'Etanol üret', EX_LAC: 'Salınan laktat', EX_AC: 'Salınan asetat', EX_ETOH: 'Salınan etanol', EX_FOR: 'Salınan format', ATPM: 'Temel bakım enerjisi', BIO: 'Büyü: yeni hücre yap' }
    };
    function rname(id) { return RN[(window.i18n && window.i18n.lang) === 'tr' ? 'tr' : 'en'][id] || FBAModel.REACTIONS[id].name; }

    // ----- Cell map (SVG) -----
    var SVGNS = 'http://www.w3.org/2000/svg', HW = 48, HH = 17;
    var NODES = { glc: [100, 70], g6p: [260, 70], pyr: [430, 70], lac: [610, 70], accoa: [430, 210], ac: [610, 210],
                  etoh: [610, 300], bio: [260, 210], nadh: [430, 330], atp: [260, 330], o2: [345, 420] };
    var EDGES = [
        { f: 'UPT_GLC', p: [4, 70, 50, 70], fx: 27, fy: 60 },
        { f: 'HK', a: 'glc', b: 'g6p', gene: 'glk' },
        { f: 'GLY', a: 'g6p', b: 'pyr', gene: 'gapA' },
        { f: 'PDH', p: [385, 90, 385, 190], gene: 'aceE', lx: 352, ly: 140 },
        { f: 'PFL', p: [415, 90, 415, 190], gene: 'pflB', lx: 448, ly: 140, side: 1 },
        { f: 'LDH', a: 'pyr', b: 'lac', gene: 'ldhA', side: 1 },
        { f: 'EX_LAC', p: [660, 70, 696, 70], side: 1, fx: 678, fy: 60 },
        { f: 'PTA', a: 'accoa', b: 'ac', gene: 'pta', side: 1 },
        { f: 'EX_AC', p: [660, 210, 696, 210], side: 1, fx: 678, fy: 200 },
        { f: 'ADH', a: 'accoa', b: 'etoh', gene: 'adhE', side: 1 },
        { f: 'EX_ETOH', p: [660, 300, 696, 300], side: 1, fx: 678, fy: 290 },
        { f: 'TCA', a: 'accoa', b: 'nadh', gene: 'gltA', ly: 270 },
        { f: 'OXP', a: 'nadh', b: 'atp', gene: 'cyoB', ly: 308 },
        { f: 'UPT_O2', p: [345, 402, 345, 333], fx: 352, fy: 372, anchor: 'start' },
        { f: 'BIO', a: 'accoa', b: 'bio', bio: 1, fx: 345, fy: 201 },
        { f: 'BIO', a: 'g6p', b: 'bio', bio: 1 },
        { f: 'BIO', a: 'atp', b: 'bio', bio: 1 }
    ];
    var mapEls = null;

    function svgEl(name, attrs, parent) {
        var e = document.createElementNS(SVGNS, name);
        for (var k in attrs) e.setAttribute(k, attrs[k]);
        if (parent) parent.appendChild(e);
        return e;
    }
    function clip(a, b) {
        var dx = b[0] - a[0], dy = b[1] - a[1], len = Math.sqrt(dx * dx + dy * dy);
        var s = Math.min(dx ? HW / Math.abs(dx) : Infinity, dy ? HH / Math.abs(dy) : Infinity);
        var ux = dx / len, uy = dy / len;
        return [a[0] + s * dx + 3 * ux, a[1] + s * dy + 3 * uy, b[0] - s * dx - 6 * ux, b[1] - s * dy - 6 * uy];
    }

    function buildMap() {
        var host = $('pg-map');
        var svg = svgEl('svg', { viewBox: '0 0 700 450', role: 'img', 'class': 'pg-svg' });
        host.appendChild(svg);
        mapEls = { svg: svg, edges: [], tags: {}, nodes: {} };
        EDGES.forEach(function (e) {
            var p = e.p || clip(NODES[e.a], NODES[e.b]);
            e.pts = p;
            var g = svgEl('g', {}, svg);
            var title = svgEl('title', {}, g);
            var line = svgEl('line', { x1: p[0], y1: p[1], x2: p[2], y2: p[3], 'stroke-linecap': 'round', 'class': 'pg-edge' }, g);
            var ux = p[2] - p[0], uy = p[3] - p[1], l = Math.sqrt(ux * ux + uy * uy); ux /= l; uy /= l;
            var head = svgEl('polygon', { points: [p[2] + 7 * ux, p[3] + 7 * uy, p[2] - 3 * ux + 5 * -uy, p[3] - 3 * uy + 5 * ux, p[2] - 3 * ux - 5 * -uy, p[3] - 3 * uy - 5 * ux].join(' ') }, g);
            var fv = null;
            if (e.fx !== undefined) fv = svgEl('text', { x: e.fx, y: e.fy, 'text-anchor': e.anchor || 'middle', 'class': 'pg-fv' }, g);
            mapEls.edges.push({ def: e, line: line, head: head, title: title, fv: fv });
        });
        // nodes and gene tags drawn above edges
        Object.keys(NODES).concat([]).forEach(function (k) {
            var n = NODES[k], g = svgEl('g', { 'class': 'pg-node' + (k === 'bio' ? ' pg-bio' : '') }, svg);
            var r = svgEl('rect', { x: n[0] - HW, y: n[1] - HH, width: HW * 2, height: HH * 2, rx: 17 }, g);
            var tx = svgEl('text', { x: n[0], y: n[1] + 4, 'text-anchor': 'middle' }, g);
            mapEls.nodes[k] = { rect: r, text: tx };
        });
        EDGES.forEach(function (e, i) {
            if (!e.gene || mapEls.tags[e.gene]) return;
            var p = e.pts, x = e.lx || (p[0] + p[2]) / 2, y = e.ly || (p[1] + p[3]) / 2;
            var g = svgEl('g', { 'class': 'pg-tag', role: 'button', tabindex: '0', transform: 'translate(' + x + ',' + y + ')' }, svg);
            svgEl('rect', { x: -24, y: -15, width: 48, height: 30, rx: 10 }, g);
            var tx = svgEl('text', { x: 0, y: -2, 'text-anchor': 'middle' }, g);
            tx.textContent = e.gene;
            var tv = svgEl('text', { x: 0, y: 11, 'text-anchor': 'middle', 'class': 'pg-tv' }, g);
            g._tv = tv;
            mapEls.tags[e.gene] = g;
            var toggle = function () { var gi = state.knockouts.indexOf(e.gene); if (gi >= 0) state.knockouts.splice(gi, 1); else state.knockouts.push(e.gene); render(); };
            g.addEventListener('click', toggle);
            g.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); toggle(); } });
        });
    }

    function updateMap(mu, pct) {
        var L = t(), max = 0;
        Object.keys(mu.fluxes).forEach(function (id) { max = Math.max(max, Math.abs(mu.fluxes[id])); });
        mapEls.svg.setAttribute('aria-label', L.mapLabel);
        Object.keys(NODES).forEach(function (k) { mapEls.nodes[k].text.textContent = L.nodes[k]; });
        mapEls.nodes.bio.rect.style.filter = 'drop-shadow(0 0 ' + Math.round(pct * 14) + 'px rgba(181,56,255,0.9))';
        mapEls.edges.forEach(function (o) {
            var e = o.def, f = Math.abs(mu.fluxes[e.f]), off = e.gene && state.knockouts.indexOf(e.gene) >= 0;
            var active = f > 1e-6 && !off, w = active ? 2 + 8 * f / (max || 1) : 2;
            var color = off ? '#ff465a' : !active ? '#475569' : e.bio ? '#b538ff' : e.side ? '#ffc857' : '#00f0ff';
            o.line.setAttribute('stroke', color);
            o.line.setAttribute('stroke-width', w.toFixed(1));
            o.line.setAttribute('class', 'pg-edge' + (active ? ' active' : '') + (off ? ' off' : ''));
            o.head.setAttribute('fill', color);
            var rnm = rname(e.f);
            if (o.fv) o.fv.textContent = active ? f.toFixed(1) : '';
            o.title.textContent = rnm + ': ' + (off ? L.off : f.toFixed(1));
        });
        Object.keys(mapEls.tags).forEach(function (gene) {
            var on = state.knockouts.indexOf(gene) >= 0, g = mapEls.tags[gene];
            var fl = 0; EDGES.forEach(function (ee) { if (ee.gene === gene) fl = Math.abs(mu.fluxes[ee.f]); });
            g._tv.textContent = on ? '\u00d7' : (fl > 1e-6 ? fl.toFixed(1) : '0');
            g.setAttribute('aria-pressed', String(on));
            g.setAttribute('aria-label', gene + ' - ' + (L.hint[gene] || ''));
            g.setAttribute('class', 'pg-tag' + (on ? ' on' : ''));
        });
        $('pg-map-legend').textContent = L.legend;
        $('pg-pdf-note').textContent = L.pdfNote;
    }

    // ----- PDF report (print-to-PDF) -----
    var R = {
 "en": {
  "title": "Metabolic Playground report",
  "chartO2": "Growth at different oxygen levels",
  "chartKO": "Growth when each gene is switched off",
  "xO2": "Oxygen supply",
  "yGr": "Growth (relative units)",
  "healthy": "Healthy cell",
  "yours": "Your cell",
  "pctH": "% of a healthy cell",
  "chartNote": "Left: the line shows how growth changes as oxygen goes from none to plenty. Right: each bar is the cell with only that one gene switched off, in your current surroundings.",
  "sub": "A simulation of a toy cell, explained in plain words",
  "date": "Created",
  "inputs": "What you chose (inputs)",
  "env": "Surroundings",
  "air": "With air (oxygen supply %d of 20)",
  "noair": "Without air",
  "sugar": "Sugar supply",
  "of10": "of 10",
  "goal": "Goal",
  "gGrowth": "Grow as fast as possible",
  "gLac": "Make lactate while staying alive",
  "off": "Genes switched off",
  "none": "None (full team)",
  "outputs": "What happened (outputs)",
  "growth": "Growth compared with a healthy cell",
  "energy": "Main way of getting energy",
  "resp": "Respiration (burning food with oxygen)",
  "ferm": "Fermentation (half-burn, no oxygen)",
  "nogrow": "Not growing",
  "pushed": "Waste and side products released",
  "nothing": "Nothing",
  "lactate": "Lactate produced",
  "map": "Map of the cell",
  "mapNote": "Thicker lines carry more material. Grey: idle. Red dashed: switched off.",
  "flux": "How busy each step was",
  "step": "Step",
  "gene": "Gene",
  "amount": "Amount",
  "screen": "Which genes can the cell not live without?",
  "effect": "Effect on growth",
  "means": "What does this mean?",
  "ai": "Written by AI (Gemini) from the simulation numbers.",
  "local": "Built-in explainer (rule-based).",
  "mol": "The molecules in plain words",
  "genes": "The genes in plain words",
  "how": "How to read this",
  "howTxt": "Think of the cell as a tiny kitchen: sugar goes in, a chain of steps (each done by a worker called an enzyme, built from a gene) cooks it, and the result is energy and the material to build a new cell. Switching a gene off fires that worker. A computer then finds the best way for the remaining kitchen to run, using a method called flux balance analysis.",
  "rel": "How this relates to real research",
  "relTxt": "Scientists use the same method on real organisms, with thousands of reactions instead of 13. Genome-scale metabolic models help to find drug targets in parasites, understand microbial communities, and design useful microbes. Example: Bay et al., Nature Communications 2023, a genome-scale metabolic model of the parasitic whipworm (doi.org/10.1038/s41467-023-42552-4).",
  "disc": "This is a simplified educational toy model, not a real organism. Do not use it for scientific or medical conclusions."
 },
 "tr": {
  "title": "Metabolik Simülasyon raporu",
  "chartO2": "Farklı oksijen düzeylerinde büyüme",
  "chartKO": "Her gen tek tek kapatılınca büyüme",
  "xO2": "Oksijen kaynağı",
  "yGr": "Büyüme (göreli birim)",
  "healthy": "Sağlıklı hücre",
  "yours": "Sizin hücreniz",
  "pctH": "sağlıklı hücrenin %",
  "chartNote": "Solda: oksijen yokken ve bolken büyümenin nasıl değiştiğini çizgi gösterir. Sağda: her çubuk, mevcut ortamınızda yalnızca o gen kapatılmış hücredir.",
  "sub": "Oyuncak bir hücrenin simülasyonu, sade bir dille",
  "date": "Oluşturulma",
  "inputs": "Sizin seçtikleriniz (girdiler)",
  "env": "Ortam",
  "air": "Havalı (oksijen kaynağı %d / 20)",
  "noair": "Havasız",
  "sugar": "Şeker kaynağı",
  "of10": "/ 10",
  "goal": "Hedef",
  "gGrowth": "Olabildiğince hızlı büyümek",
  "gLac": "Canlı kalarak laktat üretmek",
  "off": "Kapatılan genler",
  "none": "Yok (tam kadro)",
  "outputs": "Ne oldu (çıktılar)",
  "growth": "Sağlıklı bir hücreye göre büyüme",
  "energy": "Enerjiyi elde etme yolu",
  "resp": "Solunum (yiyeceği oksijenle yakmak)",
  "ferm": "Fermantasyon (yarım yanma, oksijensiz)",
  "nogrow": "Büyümüyor",
  "pushed": "Dışarı bırakılan atık ve yan ürünler",
  "nothing": "Yok",
  "lactate": "Üretilen laktat",
  "map": "Hücre haritası",
  "mapNote": "Kalın çizgiler daha çok madde taşır. Gri: boşta. Kırmızı kesikli: kapalı.",
  "flux": "Her adım ne kadar yoğundu",
  "step": "Adım",
  "gene": "Gen",
  "amount": "Miktar",
  "screen": "Hangi genler olmadan hücre yaşayamaz?",
  "effect": "Büyümeye etkisi",
  "means": "Bu ne anlama geliyor?",
  "ai": "Simülasyon sayılarından yapay zeka (Gemini) tarafından yazıldı.",
  "local": "Yerleşik açıklayıcı (kural tabanlı).",
  "mol": "Moleküller, sade bir dille",
  "genes": "Genler, sade bir dille",
  "how": "Nasıl okunur",
  "howTxt": "Hücreyi minik bir mutfak gibi düşünün: şeker girer, bir dizi adım (her birini enzim denen, gen talimatıyla üretilen bir işçi yapar) onu pişirir ve sonuçta enerji ile yeni bir hücre yapmak için malzeme çıkar. Bir geni kapatmak o işçiyi işten çıkarmaktır. Bir bilgisayar, kalan mutfağın en iyi nasıl çalışacağını akı dengesi analizi denen yöntemle hesaplar.",
  "rel": "Gerçek araştırmayla ilişkisi",
  "relTxt": "Bilim insanları aynı yöntemi gerçek canlılarda, 13 yerine binlerce reaksiyonla kullanır. Genom ölçekli metabolik modeller parazitlerde ilaç hedefi bulmaya, mikrop topluluklarını anlamaya ve faydalı mikroplar tasarlamaya yardımcı olur. Örnek: Bay ve ark., Nature Communications 2023, parazit kırbaç kurdunun genom ölçekli metabolik modeli (doi.org/10.1038/s41467-023-42552-4).",
  "disc": "Bu, basitleştirilmiş bir eğitim amaçlı oyuncak modeldir, gerçek bir organizma değildir. Bilimsel ya da tıbbi sonuç çıkarmak için kullanmayın."
 }
};
    var DARK = { '#00f0ff': '#0891b2', '#ffc857': '#d97706', '#ff465a': '#dc2626', '#b538ff': '#7c3aed', '#475569': '#cbd5e1' };

    function chartO2(X) {
        var W = 340, H = 200, l = 38, r = 12, t = 24, b = 36, xs = [], wt = [], me = [];
        for (var o = 0; o <= 20; o += 2) {
            xs.push(o);
            wt.push(FBAModel.solve({ glucose: state.glucose, oxygen: o, knockouts: [], objective: 'growth' }).growth);
            me.push(FBAModel.solve({ glucose: state.glucose, oxygen: o, knockouts: state.knockouts, objective: 'growth' }).growth);
        }
        var ymax = Math.max.apply(null, wt.concat(me, [0.5])) * 1.1;
        var X0 = function (v) { return l + (W - l - r) * v / 20; }, Y0 = function (v) { return H - b - (H - t - b) * v / ymax; };
        var pts = function (a) { return a.map(function (v, i) { return X0(xs[i]).toFixed(1) + ',' + Y0(v).toFixed(1); }).join(' '); };
        var g = '';
        [0, 0.5, 1].forEach(function (k) {
            var yv = ymax * k;
            g += '<line x1="' + l + '" x2="' + (W - r) + '" y1="' + Y0(yv).toFixed(1) + '" y2="' + Y0(yv).toFixed(1) + '" stroke="#e2e8f0"/><text x="' + (l - 5) + '" y="' + (Y0(yv) + 3).toFixed(1) + '" text-anchor="end" font-size="9" fill="#64748b">' + yv.toFixed(1) + '</text>';
        });
        [0, 5, 10, 15, 20].forEach(function (v) {
            g += '<text x="' + X0(v) + '" y="' + (H - b + 13) + '" text-anchor="middle" font-size="9" fill="#64748b">' + v + '</text>';
        });
        g += '<polyline fill="none" stroke="#0891b2" stroke-width="2.2" points="' + pts(wt) + '"/>';
        g += '<polyline fill="none" stroke="#7c3aed" stroke-width="2.2" stroke-dasharray="5 3" points="' + pts(me) + '"/>';
        var cur = FBAModel.solve({ glucose: state.glucose, oxygen: state.oxygen, knockouts: state.knockouts, objective: 'growth' }).growth;
        g += '<line x1="' + X0(state.oxygen) + '" x2="' + X0(state.oxygen) + '" y1="' + t + '" y2="' + (H - b) + '" stroke="#94a3b8" stroke-dasharray="2 3"/>';
        g += '<circle cx="' + X0(state.oxygen) + '" cy="' + Y0(cur) + '" r="4.5" fill="#7c3aed" stroke="#fff" stroke-width="1.5"/>';
        g += '<text x="' + (l + 4) + '" y="12" font-size="9.5" fill="#0891b2" font-weight="600">\u2014 ' + esc(X.healthy) + '</text>';
        g += '<text x="' + (l + 110) + '" y="12" font-size="9.5" fill="#7c3aed" font-weight="600">- - ' + esc(X.yours) + '</text>';
        g += '<text x="' + ((l + W - r) / 2) + '" y="' + (H - 6) + '" text-anchor="middle" font-size="9.5" fill="#334155">' + esc(X.xO2) + '</text>';
        g += '<text transform="translate(9,' + ((H - b + t) / 2) + ') rotate(-90)" text-anchor="middle" font-size="9.5" fill="#334155">' + esc(X.yGr) + '</text>';
        return '<svg viewBox="0 0 ' + W + ' ' + H + '" class="chart">' + g + '</svg>';
    }

    function chartKO(X, sc) {
        var W = 340, rowH = 20, top = 22, H = top + sc.length * rowH + 22, l = 56, r = 40, g = '';
        var bw = W - l - r;
        g += '<text x="' + l + '" y="12" font-size="9.5" fill="#334155">' + esc(X.pctH) + '</text>';
        sc.forEach(function (rw, i) {
            var y = top + i * rowH, pct = Math.round(Math.max(0, Math.min(1, rw.ratio)) * 100);
            var col = rw.essential ? '#dc2626' : rw.ratio < 0.99 ? '#d97706' : '#15803d';
            g += '<text x="' + (l - 6) + '" y="' + (y + 11) + '" text-anchor="end" font-size="10" font-style="italic" fill="#0f172a">' + esc(rw.gene) + '</text>';
            g += '<rect x="' + l + '" y="' + (y + 2) + '" width="' + bw + '" height="12" rx="3" fill="#f1f5f9"/>';
            if (pct > 0) g += '<rect x="' + l + '" y="' + (y + 2) + '" width="' + (bw * pct / 100).toFixed(1) + '" height="12" rx="3" fill="' + col + '"/>';
            g += '<text x="' + (l + bw + 5) + '" y="' + (y + 12) + '" font-size="10" font-weight="600" fill="' + col + '">' + pct + '%</text>';
        });
        g += '<line x1="' + l + '" x2="' + l + '" y1="' + top + '" y2="' + (top + sc.length * rowH) + '" stroke="#94a3b8"/>';
        return '<svg viewBox="0 0 ' + W + ' ' + H + '" class="chart">' + g + '</svg>';
    }

    function buildReport() {
        var lang = (window.i18n && window.i18n.lang) === 'tr' ? 'tr' : 'en', X = R[lang], L = T[lang], G = GLOSS[lang];
        var res = FBAModel.analyse(state), mu = res.mutant, wt = res.wild.growth;
        var pct = wt > 1e-9 ? Math.max(0, Math.min(1, mu.growth / wt)) : 0, pc = Math.round(pct * 100);
        var f = facts(), P = PNAME[lang];
        var aiText = aiBusy ? '' : $('pg-ai-out').textContent.trim();
        var aiIsGemini = aiText && $('pg-ai-src').textContent === L.aiGemini;
        if (!aiText) aiText = localExplain(f);

        var svg = mapEls.svg.cloneNode(true);
        svg.setAttribute('class', 'pg-rep-svg');
        Array.prototype.forEach.call(svg.querySelectorAll('line, polygon'), function (e) {
            var c = e.getAttribute(e.tagName === 'line' ? 'stroke' : 'fill');
            var d = DARK[c] || c;
            e.setAttribute(e.tagName === 'line' ? 'stroke' : 'fill', d);
            if (e.tagName === 'line') e.setAttribute('class', e.getAttribute('class').replace(' active', ''));
        });
        Array.prototype.forEach.call(svg.querySelectorAll('rect'), function (r) { r.style.filter = 'none'; });

        var ids = Object.keys(FBAModel.REACTIONS), max = 0;
        ids.forEach(function (id) { max = Math.max(max, Math.abs(mu.fluxes[id])); });
        var rows = '';
        ids.forEach(function (id) {
            var r = FBAModel.REACTIONS[id], v = mu.fluxes[id], off = r.gene && state.knockouts.indexOf(r.gene) >= 0;
            if (!off && v === 0) return;
            rows += '<tr><td>' + esc(rname(id)) + '</td><td><i>' + esc(r.gene || '') + '</i></td><td class="num">' + (off ? esc(L.off) : v.toFixed(1)) +
                '</td><td><span class="bar"><span style="width:' + (max ? Math.round(100 * Math.abs(v) / max) : 0) + '%"></span></span></td></tr>';
        });
        var sc = FBAModel.screen({ glucose: state.glucose, oxygen: state.oxygen }), srows = '';
        sc.forEach(function (r) {
            var lbl = r.essential ? L.essential : (r.ratio < 0.99 ? L.slows + ' (' + Math.round(r.ratio * 100) + '%)' : L.fine);
            srows += '<tr class="' + (r.essential ? 'ess' : r.ratio < 0.99 ? 'slow' : 'fine') + '"><td><i>' + esc(r.gene) + '</i></td><td>' + esc(G.gene[r.gene]) + '</td><td>' + esc(lbl) + '</td></tr>';
        });
        var off = state.knockouts.length ? state.knockouts.map(function (g) { return '<i>' + esc(g) + '</i> (' + esc(L.hint[g]) + ')'; }).join(', ') : esc(X.none);
        var prod = f.products.length ? f.products.map(function (q) { return esc(P[q]); }).join(', ') : esc(X.nothing);
        var energy = f.mainEnergy === 'none' ? X.nogrow : (f.mainEnergy === 'respiration' ? X.resp : X.ferm);
        var date = new Date().toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-GB', { year: 'numeric', month: 'long', day: 'numeric' });

        var h = '<header><h1>' + esc(X.title) + '</h1><p class="sub">' + esc(X.sub) + '</p><p class="meta">Dr. Ömer Faruk Bay · omerfarukbay.com · ' + esc(X.date) + ': ' + esc(date) + '</p></header>' +
            '<section class="two"><div><h2>' + esc(X.inputs) + '</h2><dl>' +
            '<dt>' + esc(X.env) + '</dt><dd>' + esc(state.oxygen > 0 ? X.air.replace('%d', state.oxygen) : X.noair) + '</dd>' +
            '<dt>' + esc(X.sugar) + '</dt><dd>' + state.glucose + ' ' + esc(X.of10) + '</dd>' +
            '<dt>' + esc(X.goal) + '</dt><dd>' + esc(state.objective === 'lactate' ? X.gLac : X.gGrowth) + '</dd>' +
            '<dt>' + esc(X.off) + '</dt><dd>' + off + '</dd></dl></div>' +
            '<div><h2>' + esc(X.outputs) + '</h2><dl>' +
            '<dt>' + esc(X.growth) + '</dt><dd><strong class="big">%' + pc + '</strong><span class="bar wide"><span style="width:' + pc + '%"></span></span></dd>' +
            '<dt>' + esc(X.energy) + '</dt><dd>' + esc(energy) + '</dd>' +
            '<dt>' + esc(X.pushed) + '</dt><dd>' + prod + '</dd>' +
            (state.objective === 'lactate' && !f.lactateFailed ? '<dt>' + esc(X.lactate) + '</dt><dd>' + mu.lactate.toFixed(1) + '</dd>' : '') +
            '</dl></div></section>' +
            '<section class="ai"><h2>' + esc(X.means) + '</h2><p>' + esc(aiText) + '</p><small>' + esc(aiIsGemini ? X.ai : X.local) + '</small></section>' +
            '<section class="map"><h2>' + esc(X.map) + '</h2><div class="mapbox"></div><small>' + esc(X.mapNote) + '</small></section>' +
            '<section class="two charts"><div><h2>' + esc(X.chartO2) + '</h2>' + chartO2(X) + '</div><div><h2>' + esc(X.chartKO) + '</h2>' + chartKO(X, sc) + '</div></section><p class="chartnote"><small>' + esc(X.chartNote) + '</small></p>' +
            '<section><h2>' + esc(X.flux) + '</h2><table><thead><tr><th>' + esc(X.step) + '</th><th>' + esc(X.gene) + '</th><th>' + esc(X.amount) + '</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></section>' +
            '<section><h2>' + esc(X.screen) + '</h2><table><thead><tr><th>' + esc(X.gene) + '</th><th></th><th>' + esc(X.effect) + '</th></tr></thead><tbody>' + srows + '</tbody></table></section>' +
            '<section><h2>' + esc(X.mol) + '</h2><dl class="glos">' + G.mol.map(function (m) { return '<div><dt>' + esc(m[0]) + '</dt><dd>' + esc(m[1]) + '</dd></div>'; }).join('') + '</dl></section>' +
            '<section><h2>' + esc(X.genes) + '</h2><dl class="glos">' + FBAModel.genes().map(function (g) { return '<div><dt><i>' + esc(g.gene) + '</i></dt><dd>' + esc(G.gene[g.gene]) + '</dd></div>'; }).join('') + '</dl></section>' +
            '<section><h2>' + esc(X.how) + '</h2><p>' + esc(X.howTxt) + '</p><h2>' + esc(X.rel) + '</h2><p>' + esc(X.relTxt) + '</p></section>' +
            '<footer>' + esc(X.disc) + '</footer>';
        var old = document.getElementById('pg-report'); if (old) old.remove();
        var el = document.createElement('div');
        el.id = 'pg-report'; el.className = 'pg-rep'; el.lang = lang;
        el.innerHTML = h;
        el.querySelector('.mapbox').appendChild(svg);
        document.body.appendChild(el);
    }

    function printReport() {
        buildReport();
        var prevTitle = document.title;
        document.title = 'Metabolic-Playground-Report';
        document.body.classList.add('printing-report');
        var done = function () {
            document.body.classList.remove('printing-report');
            document.title = prevTitle;
            window.removeEventListener('afterprint', done);
        };
        window.addEventListener('afterprint', done);
        window.print();
    }
    $('pg-pdf-btn').addEventListener('click', printReport);

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
        updateMap(mu, pct);
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
            html += '<div class="pg-row' + (off ? ' off' : '') + '"><span class="pg-rname">' + esc(rname(id)) +
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
            tb += '<tr class="' + cls + '"><td><i>' + esc(r.gene) + '</i></td><td>' + esc(rname(r.reaction)) + '</td><td>' + label + '</td></tr>';
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
    buildMap();
    render();
})();
