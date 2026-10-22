/* playground-pro.js - academic extras for the Metabolic Playground:
 *  1. real-model mode (E. coli core model, Orth et al. 2010 / BiGG)
 *  2. Methods panel (stoichiometric matrix, equations, assumptions, references)
 *  3. exports: publication-style figure (SVG/PNG), data (CSV), model (SBML), citation
 * Uses window.PGHooks from js/playground.js, FBAModel and RealModel.
 */
(function () {
    'use strict';
    if (!document.getElementById('pg-real')) return;

    var $ = function (id) { return document.getElementById(id); };
    var SITE = 'https://omerfarukbay.com/#playground';

    var P = {
        en: {
            'pgr.title': 'Is the toy cell realistic? Test a real model',
            'pgr.intro': 'The same method, applied to a real published model: the E. coli core metabolism (95 reactions, 137 genes). Switch genes off and compare with the toy cell above.',
            'pgr.aerobic': 'With oxygen', 'pgr.anaerobic': 'Without oxygen',
            'pgr.glc': 'Glucose uptake', 'pgr.gene': 'Gene to switch off (type a name)', 'pgr.add': 'Switch off', 'pgr.try': 'Try:', 'pgr.reset': 'Reset',
            'pgr.cmp': 'Toy cell vs real E. coli core (healthy cells)', 'pgr.top': 'Most active reactions', 'pgr.screen': 'Gene essentiality screen',
            'pgr.run': 'Test all 137 genes',
            'pgr.cite': 'Model: Orth, Fleming & Palsson (2010) EcoSal Plus; distributed by BiGG Models (King et al. 2016, Nucleic Acids Res). FBA solved in your browser with javascript-lp-solver.',
            loading: 'Loading the real model…', failed: 'Could not load the model file. Please reload the page.',
            growth: 'Growth rate', unit: 'per hour', vsWt: 'of a healthy cell', dead: 'No growth: the cell cannot live like this.', fine: 'Growth is unaffected.', slow: 'Growth is reduced.',
            unknown: 'Gene not found in this model. Try names like adhE, gltA, pgi or ldhA.', dup: 'That gene is already switched off.',
            aero: 'With oxygen', anaero: 'Without oxygen', toy: 'Toy cell', real: 'Real E. coli core', pct: '% of its oxygen growth',
            cmpNote: 'In both models oxygen lets the cell grow roughly four times faster, so the toy captures the real pattern, with far fewer parts.',
            reaction: 'Reaction', pathway: 'Pathway', flux: 'Flux', gene: 'Gene', effect: 'Effect',
            running: 'Testing genes…', essential: 'essential', slowing: 'slow growth', noeffect: 'no effect',
            essList: 'Essential genes', slowList: 'Slow growth',
            'pgm.title': 'Methods: the maths and assumptions behind the simulation',
            'pge.title': 'Take it with you', 'pge.note': 'Publication-style figure of the current flux map, the numbers behind it, and the model itself. Settings (oxygen, sugar, switched-off genes) are saved in every file.',
            'pge.svg': 'Figure (SVG)', 'pge.png': 'Figure (PNG, high resolution)', 'pge.csv': 'Data (CSV)', 'pge.sbml': 'Model (SBML)',
            'pge.cite': 'How to cite', 'pge.copy': 'Copy citation', 'pge.bib': 'Copy BibTeX', copied: 'Copied.', cantcopy: 'Copy failed: select the text manually.'
        },
        tr: {
            'pgr.title': 'Oyuncak hücre gerçekçi mi? Gerçek bir modeli deneyin',
            'pgr.intro': 'Aynı yöntem, yayımlanmış gerçek bir modele uygulanıyor: E. coli çekirdek metabolizması (95 reaksiyon, 137 gen). Genleri kapatın ve yukarıdaki oyuncak hücreyle karşılaştırın.',
            'pgr.aerobic': 'Oksijenli', 'pgr.anaerobic': 'Oksijensiz',
            'pgr.glc': 'Glikoz alımı', 'pgr.gene': 'Kapatılacak gen (ad yazın)', 'pgr.add': 'Kapat', 'pgr.try': 'Deneyin:', 'pgr.reset': 'Sıfırla',
            'pgr.cmp': 'Oyuncak hücre ve gerçek E. coli çekirdeği (sağlıklı hücreler)', 'pgr.top': 'En yoğun reaksiyonlar', 'pgr.screen': 'Gen vazgeçilmezlik taraması',
            'pgr.run': 'Tüm 137 geni test et',
            'pgr.cite': 'Model: Orth, Fleming ve Palsson (2010) EcoSal Plus; BiGG Models üzerinden dağıtılır (King ve ark. 2016, Nucleic Acids Res). FBA tarayıcınızda javascript-lp-solver ile çözülür.',
            loading: 'Gerçek model yükleniyor…', failed: 'Model dosyası yüklenemedi. Lütfen sayfayı yenileyin.',
            growth: 'Büyüme hızı', unit: 'saatte', vsWt: 'sağlıklı hücreye göre', dead: 'Büyüme yok: hücre böyle yaşayamaz.', fine: 'Büyüme etkilenmiyor.', slow: 'Büyüme azalıyor.',
            unknown: 'Bu modelde böyle bir gen yok. adhE, gltA, pgi veya ldhA gibi adlar deneyin.', dup: 'Bu gen zaten kapalı.',
            aero: 'Oksijenli', anaero: 'Oksijensiz', toy: 'Oyuncak hücre', real: 'Gerçek E. coli çekirdeği', pct: 'oksijenli büyümesinin %',
            cmpNote: 'Her iki modelde de oksijen hücrenin yaklaşık dört kat daha hızlı büyümesini sağlıyor; yani oyuncak model, çok daha az parçayla gerçek örüntüyü yakalıyor.',
            reaction: 'Reaksiyon', pathway: 'Yolak', flux: 'Akı', gene: 'Gen', effect: 'Etki',
            running: 'Genler test ediliyor…', essential: 'vazgeçilmez', slowing: 'yavaş büyüme', noeffect: 'etkisiz',
            essList: 'Vazgeçilmez genler', slowList: 'Yavaş büyüme',
            'pgm.title': 'Yöntemler: simülasyonun arkasındaki matematik ve varsayımlar',
            'pge.title': 'Yanınıza alın', 'pge.note': 'Mevcut akı haritasının yayın tarzı şekli, arkasındaki sayılar ve modelin kendisi. Ayarlar (oksijen, şeker, kapalı genler) her dosyaya kaydedilir.',
            'pge.svg': 'Şekil (SVG)', 'pge.png': 'Şekil (PNG, yüksek çözünürlük)', 'pge.csv': 'Veri (CSV)', 'pge.sbml': 'Model (SBML)',
            'pge.cite': 'Nasıl atıf verilir', 'pge.copy': 'Atfı kopyala', 'pge.bib': 'BibTeX kopyala', copied: 'Kopyalandı.', cantcopy: 'Kopyalanamadı: metni elle seçin.'
        }
    };
    var K = function () { return window.PGHooks ? window.PGHooks.lang() : ((window.i18n && window.i18n.lang) === 'tr' ? 'tr' : 'en'); };
    var T = function (k) { return P[K()][k]; };
    var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

    function fillStatic() {
        Array.prototype.forEach.call(document.querySelectorAll('#playground [data-pro]'), function (el) { el.textContent = T(el.getAttribute('data-pro')); });
    }

    /* ---------------------------------------------------------------- real model */
    var R = { ready: false, aerobic: true, glucose: 10, kos: [], screenCache: null };
    var byName = {}, byId = {}, loading = false;

    function setSolverIfNeeded() { /* browser uses global `solver` */ }

    function loadReal() {
        if (R.ready || loading) return;
        loading = true;
        $('pgr-status').textContent = T('loading');
        fetch('assets/models/e_coli_core.json').then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
            .then(function (json) {
                RealModel.load(json);
                json.genes.forEach(function (g) { byName[g.name.toLowerCase()] = g; byId[g.id.toLowerCase()] = g; });
                var dl = $('pgr-genes'); dl.innerHTML = '';
                json.genes.map(function (g) { return g.name; }).sort().forEach(function (n) { var o = document.createElement('option'); o.value = n; dl.appendChild(o); });
                R.ready = true; $('pgr-status').textContent = '';
                renderReal();
            }).catch(function () { $('pgr-status').textContent = T('failed'); loading = false; });
    }

    function realOpts(extra) { return Object.assign({ glucose: R.glucose, oxygen: R.aerobic ? 1000 : 0, knockouts: R.kos }, extra || {}); }

    function renderReal() {
        // static labels and controls (always)
        $('pgr-glc-out').textContent = R.glucose;
        $('pgr-glc').value = R.glucose;
        $('pgr-aerobic').setAttribute('aria-pressed', String(R.aerobic));
        $('pgr-anaerobic').setAttribute('aria-pressed', String(!R.aerobic));
        var tr = $('pgr-try');
        if (!tr.children.length) {
            ['gltA', 'pgi', 'ldhA', 'adhE', 'pfkA'].forEach(function (g) {
                var b = document.createElement('button'); b.type = 'button'; b.className = 'pgr-tryb'; b.textContent = g;
                b.addEventListener('click', function () { addGene(g); }); tr.appendChild(b);
            });
        }
        var chips = $('pgr-chips'); chips.innerHTML = '';
        R.kos.forEach(function (id) {
            var g = byId[id.toLowerCase()]; var b = document.createElement('button');
            b.type = 'button'; b.className = 'pg-chip on'; b.setAttribute('aria-pressed', 'true');
            b.innerHTML = '<i>' + esc(g ? g.name : id) + '</i><small>' + esc(id) + '</small>';
            b.addEventListener('click', function () { R.kos.splice(R.kos.indexOf(id), 1); R.screenCache = null; renderReal(); });
            chips.appendChild(b);
        });
        if (!R.ready) { return; }

        var wt = RealModel.solve(realOpts({ knockouts: [] })).growth;
        var mu = RealModel.solve(realOpts());
        var pct = wt > 1e-9 ? Math.max(0, Math.min(1, mu.growth / wt)) : 0;
        $('pgr-growth').textContent = T('growth') + ': ' + mu.growth.toFixed(3) + ' ' + T('unit') + ' (' + Math.round(pct * 100) + '% ' + T('vsWt') + ')';
        $('pgr-bar').style.width = (pct * 100) + '%';
        $('pgr-verdict').textContent = pct < 0.01 ? T('dead') : pct > 0.99 ? T('fine') : T('slow');

        // toy vs real, wild-type cells with and without oxygen
        var ra = RealModel.solve({ glucose: R.glucose, oxygen: 1000, knockouts: [] }).growth, rn = RealModel.solve({ glucose: R.glucose, oxygen: 0, knockouts: [] }).growth;
        var ta = FBAModel.solve({ glucose: 10, oxygen: 20, knockouts: [], objective: 'growth' }).growth, tn = FBAModel.solve({ glucose: 10, oxygen: 0, knockouts: [], objective: 'growth' }).growth;
        var rp = ra > 0 ? Math.round(100 * rn / ra) : 0, tp = ta > 0 ? Math.round(100 * tn / ta) : 0;
        $('pgr-compare').innerHTML =
            '<div class="pgr-cmp-grp"><strong>' + esc(T('real')) + '</strong>' +
            '<div class="pgr-cmp-row"><span>' + esc(T('aero')) + '</span><span class="pg-bar"><span style="width:100%"></span></span><b>' + ra.toFixed(2) + '</b></div>' +
            '<div class="pgr-cmp-row"><span>' + esc(T('anaero')) + '</span><span class="pg-bar"><span style="width:' + rp + '%"></span></span><b>' + rn.toFixed(2) + ' (' + rp + '%)</b></div></div>' +
            '<div class="pgr-cmp-grp"><strong>' + esc(T('toy')) + '</strong>' +
            '<div class="pgr-cmp-row"><span>' + esc(T('aero')) + '</span><span class="pg-bar"><span style="width:100%"></span></span><b>' + ta.toFixed(2) + '</b></div>' +
            '<div class="pgr-cmp-row"><span>' + esc(T('anaero')) + '</span><span class="pg-bar"><span style="width:' + tp + '%"></span></span><b>' + tn.toFixed(2) + ' (' + tp + '%)</b></div></div>' +
            '<p class="pgr-cmpnote">' + esc(T('cmpNote')) + '</p>';

        // top fluxes
        var rows = RealModel.reactions().map(function (r) { return { r: r, v: mu.fluxes[r.id] }; })
            .filter(function (x) { return Math.abs(x.v) > 1e-6; }).sort(function (a, b) { return Math.abs(b.v) - Math.abs(a.v); }).slice(0, 10);
        var mx = rows.length ? Math.abs(rows[0].v) : 1;
        $('pgr-top').innerHTML = '<table><thead><tr><th>' + esc(T('reaction')) + '</th><th>' + esc(T('pathway')) + '</th><th>' + esc(T('flux')) + '</th></tr></thead><tbody>' +
            rows.map(function (x) { return '<tr><td>' + esc(x.r.name) + '</td><td>' + esc(x.r.subsystem || '') + '</td><td class="num"><span class="pgr-fbar"><span style="width:' + Math.round(100 * Math.abs(x.v) / mx) + '%"></span></span> ' + x.v.toFixed(2) + '</td></tr>'; }).join('') + '</tbody></table>';

        if (R.screenCache) showScreen(R.screenCache); else $('pgr-screen').innerHTML = '';
    }

    function addGene(name) {
        var msg = $('pgr-msg'); msg.textContent = '';
        name = (name || '').trim(); if (!name) return;
        var g = byName[name.toLowerCase()] || byId[name.toLowerCase()];
        if (!R.ready) return;
        if (!g) { msg.textContent = T('unknown'); return; }
        if (R.kos.indexOf(g.id) >= 0) { msg.textContent = T('dup'); return; }
        R.kos.push(g.id); R.screenCache = null; $('pgr-gene').value = ''; renderReal();
    }

    function showScreen(sc) {
        var ess = sc.genes.filter(function (g) { return g.essential; }), slow = sc.genes.filter(function (g) { return !g.essential && g.ratio < 0.99; });
        var none = sc.genes.length - ess.length - slow.length, n = sc.genes.length;
        var list = function (a) { return a.sort(function (x, y) { return x.name < y.name ? -1 : 1; }).map(function (g) { return '<i>' + esc(g.name) + '</i>'; }).join(', '); };
        $('pgr-screen').innerHTML =
            '<div class="pgr-stack"><span class="s-ess" style="width:' + (100 * ess.length / n) + '%"></span><span class="s-slow" style="width:' + (100 * slow.length / n) + '%"></span><span class="s-fine" style="width:' + (100 * none / n) + '%"></span></div>' +
            '<p class="pgr-legend"><b class="c-ess">' + ess.length + '</b> ' + esc(T('essential')) + ' · <b class="c-slow">' + slow.length + '</b> ' + esc(T('slowing')) + ' · <b class="c-fine">' + none + '</b> ' + esc(T('noeffect')) + '</p>' +
            (ess.length ? '<p class="pgr-list"><strong>' + esc(T('essList')) + ':</strong> ' + list(ess) + '</p>' : '') +
            (slow.length ? '<p class="pgr-list"><strong>' + esc(T('slowList')) + ':</strong> ' + list(slow) + '</p>' : '');
    }

    function runScreen() {
        if (!R.ready) return;
        var btn = $('pgr-screen-btn'), prog = $('pgr-prog'), bar = $('pgr-prog-bar');
        btn.disabled = true; prog.hidden = false; bar.style.width = '0%'; $('pgr-screen').textContent = T('running');
        RealModel.screen({ glucose: R.glucose, oxygen: R.aerobic ? 1000 : 0 }, function (p) { bar.style.width = Math.round(p * 100) + '%'; }, function (res) {
            R.screenCache = res; btn.disabled = false; prog.hidden = true; showScreen(res);
        });
    }

    function bindReal() {
        $('pgr-aerobic').addEventListener('click', function () { R.aerobic = true; R.screenCache = null; renderReal(); });
        $('pgr-anaerobic').addEventListener('click', function () { R.aerobic = false; R.screenCache = null; renderReal(); });
        $('pgr-glc').addEventListener('input', function (e) { R.glucose = +e.target.value; R.screenCache = null; renderReal(); });
        $('pgr-add').addEventListener('click', function () { addGene($('pgr-gene').value); });
        $('pgr-gene').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); addGene(e.target.value); } });
        $('pgr-reset').addEventListener('click', function () { R.kos = []; R.glucose = 10; R.aerobic = true; R.screenCache = null; $('pgr-msg').textContent = ''; renderReal(); });
        $('pgr-screen-btn').addEventListener('click', runScreen);
        if ('IntersectionObserver' in window) {
            var io = new IntersectionObserver(function (es) { if (es.some(function (e) { return e.isIntersecting; })) { io.disconnect(); loadReal(); } }, { rootMargin: '200px' });
            io.observe($('pg-real'));
        } else loadReal();
    }

    /* ---------------------------------------------------------------- methods panel */
    var M = {
        en: {
            principle: 'Flux balance analysis (FBA)', p1: 'A cell is described as a network of reactions. At steady state the amount of every metabolite stays constant, which gives one equation per metabolite: <b>S·v = 0</b>, where <b>S</b> is the stoichiometric matrix (metabolites × reactions) and <b>v</b> is the vector of reaction rates (fluxes).',
            p2: 'Each flux is limited by bounds, <b>lb ≤ v ≤ ub</b> (for example sugar and oxygen uptake). Switching a gene off sets the bounds of its reaction to zero. Among all flux distributions that satisfy these constraints, FBA picks the one that maximises an objective, here the biomass reaction (growth). This is a linear programme, solved in your browser by the simplex method.',
            p3: 'For the "Make lactate" goal the objective is lactate secretion, with growth required to stay at or above 10% of the healthy cell.',
            eqs: 'Reactions of the toy cell', cols: ['Reaction', 'Equation', 'Bounds', 'Gene'], mat: 'Stoichiometric matrix S (rows: metabolites, columns: reactions; negative = consumed, positive = produced)',
            assume: 'Assumptions and limitations', as: [
                'Steady state: no accumulation of metabolites, and no regulation or kinetics.',
                'The toy cell has 15 reactions and 11 metabolites; it is a teaching cartoon, not any real organism.',
                'Fluxes are in arbitrary units. Only ratios (healthy versus mutant) are meaningful.',
                'The oxygen-sensitive routes are set by rule: pyruvate formate-lyase works only without oxygen, pyruvate dehydrogenase only with oxygen.',
                'A gene knockout removes one reaction; real organisms have isoenzymes, regulation and many more reactions. The real-model mode above shows the same method at realistic scale.'],
            refs: 'References', rs: [
                'Orth JD, Thiele I, Palsson BØ (2010). What is flux balance analysis? <i>Nature Biotechnology</i> 28:245-248.',
                'Orth JD, Fleming RMT, Palsson BØ (2010). Reconstruction and use of microbial metabolic networks: the core <i>Escherichia coli</i> metabolic model as an educational guide. <i>EcoSal Plus</i> 4.',
                'King ZA et al. (2016). BiGG Models: a platform for integrating, standardizing and sharing genome-scale models. <i>Nucleic Acids Research</i> 44:D515-D522.',
                'Bay ÖF, Hayes KS, Schwartz J-M et al. (2023). A genome-scale metabolic model of the parasitic whipworm. <i>Nature Communications</i> (doi:10.1038/s41467-023-42552-4).']
        },
        tr: {
            principle: 'Akı dengesi analizi (FBA)', p1: 'Hücre bir reaksiyon ağı olarak tanımlanır. Kararlı durumda her metabolitin miktarı sabit kalır; bu her metabolit için bir denklem verir: <b>S·v = 0</b>. Burada <b>S</b> stokiyometri matrisi (metabolitler × reaksiyonlar), <b>v</b> ise reaksiyon hızlarının (akıların) vektörüdür.',
            p2: 'Her akı sınırlarla kısıtlanır: <b>alt ≤ v ≤ üst</b> (örneğin şeker ve oksijen alımı). Bir geni kapatmak, reaksiyonunun sınırlarını sıfıra eşitler. Bu kısıtları sağlayan tüm akı dağılımları arasından FBA, bir hedefi en büyük yapanı seçer; burada hedef biyokütle reaksiyonudur (büyüme). Bu bir doğrusal programlama problemidir ve tarayıcınızda simpleks yöntemiyle çözülür.',
            p3: '"Laktat üret" hedefinde amaç laktat salgısıdır; büyümenin sağlıklı hücrenin en az %10\'u kadar kalması şart koşulur.',
            eqs: 'Oyuncak hücrenin reaksiyonları', cols: ['Reaksiyon', 'Denklem', 'Sınırlar', 'Gen'], mat: 'Stokiyometri matrisi S (satırlar: metabolitler, sütunlar: reaksiyonlar; negatif = tüketilir, pozitif = üretilir)',
            assume: 'Varsayımlar ve sınırlılıklar', as: [
                'Kararlı durum: metabolit birikmesi yok; düzenleme ve kinetik de yok.',
                'Oyuncak hücrede 15 reaksiyon ve 11 metabolit var; bu bir öğretim karikatürüdür, gerçek bir organizma değildir.',
                'Akılar keyfi birimdedir. Yalnızca oranlar (sağlıklı ile mutant) anlamlıdır.',
                'Oksijene duyarlı yollar kuralla belirlenir: piruvat format-liyaz yalnızca oksijensiz, piruvat dehidrogenaz yalnızca oksijenli ortamda çalışır.',
                'Bir gen silinmesi bir reaksiyonu kaldırır; gerçek organizmalarda izoenzimler, düzenleme ve çok daha fazla reaksiyon vardır. Yukarıdaki gerçek model modu aynı yöntemi gerçekçi ölçekte gösterir.'],
            refs: 'Kaynaklar', rs: [
                'Orth JD, Thiele I, Palsson BØ (2010). What is flux balance analysis? <i>Nature Biotechnology</i> 28:245-248.',
                'Orth JD, Fleming RMT, Palsson BØ (2010). Reconstruction and use of microbial metabolic networks: the core <i>Escherichia coli</i> metabolic model as an educational guide. <i>EcoSal Plus</i> 4.',
                'King ZA ve ark. (2016). BiGG Models: a platform for integrating, standardizing and sharing genome-scale models. <i>Nucleic Acids Research</i> 44:D515-D522.',
                'Bay ÖF, Hayes KS, Schwartz J-M ve ark. (2023). A genome-scale metabolic model of the parasitic whipworm. <i>Nature Communications</i> (doi:10.1038/s41467-023-42552-4).']
        }
    };
    var MET = { glc: 'glucose', g6p: 'glucose-6-P', pyr: 'pyruvate', accoa: 'acetyl-CoA', nadh: 'NADH', atp: 'ATP', o2: 'O\u2082', lac: 'lactate', ac: 'acetate', etoh: 'ethanol', 'for': 'formate' };

    function equation(r) {
        var l = [], rr = [];
        Object.keys(r.stoich).forEach(function (m) {
            var c = r.stoich[m], a = Math.abs(c), t = (a === 1 ? '' : a + ' ') + MET[m];
            (c < 0 ? l : rr).push(t);
        });
        return (l.join(' + ') || '\u2205') + ' \u2192 ' + (rr.join(' + ') || '\u2205');
    }

    function buildMethods() {
        var X = M[K()], rx = FBAModel.REACTIONS, ids = Object.keys(rx), mets = FBAModel.METABOLITES;
        var h = '<h4>' + esc(X.principle) + '</h4><p>' + X.p1 + '</p><p>' + X.p2 + '</p><p>' + X.p3 + '</p>';
        h += '<h4>' + esc(X.eqs) + '</h4><div class="pgm-scroll"><table><thead><tr>' + X.cols.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('') + '</tr></thead><tbody>';
        ids.forEach(function (id) {
            var r = rx[id];
            h += '<tr><td><code>' + esc(id) + '</code></td><td>' + esc(equation(r)) + '</td><td class="num">' + r.lb + ' \u2013 ' + (r.ub >= 1000 ? '\u221e' : r.ub) + '</td><td><i>' + esc(r.gene || '') + '</i></td></tr>';
        });
        h += '</tbody></table></div>';
        h += '<h4>' + esc(X.mat) + '</h4><div class="pgm-scroll"><table class="pgm-mat"><thead><tr><th></th>' + ids.map(function (id) { return '<th>' + esc(id) + '</th>'; }).join('') + '</tr></thead><tbody>';
        mets.forEach(function (m) {
            h += '<tr><th>' + esc(MET[m]) + '</th>' + ids.map(function (id) {
                var c = rx[id].stoich[m];
                return c ? '<td class="' + (c < 0 ? 'neg' : 'pos') + '">' + (c > 0 ? '+' : '') + c + '</td>' : '<td></td>';
            }).join('') + '</tr>';
        });
        h += '</tbody></table></div>';
        h += '<h4>' + esc(X.assume) + '</h4><ul>' + X.as.map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('') + '</ul>';
        h += '<h4>' + esc(X.refs) + '</h4><ol class="pgm-refs">' + X.rs.map(function (a) { return '<li>' + a + '</li>'; }).join('') + '</ol>';
        $('pgm-body').innerHTML = h;
    }

    /* ---------------------------------------------------------------- exports */
    var DARK = { '#00f0ff': '#0891b2', '#ffc857': '#d97706', '#ff465a': '#dc2626', '#b538ff': '#7c3aed', '#475569': '#cbd5e1' };
    var NS = 'http://www.w3.org/2000/svg';

    function settingsLine() {
        var st = window.PGHooks.state(), tr = K() === 'tr';
        return (tr ? 'Oksijen ' : 'Oxygen ') + st.oxygen + '/20 · ' + (tr ? 'Şeker ' : 'Sugar ') + st.glucose + '/10 · ' +
            (tr ? 'Kapalı genler: ' : 'Genes off: ') + (st.knockouts.length ? st.knockouts.join(', ') : (tr ? 'yok' : 'none')) + ' · ' +
            (tr ? 'Hedef: ' : 'Goal: ') + (st.objective === 'lactate' ? (tr ? 'laktat' : 'lactate') : (tr ? 'büyüme' : 'growth'));
    }

    function figureSVG() {
        var H = window.PGHooks, src = H.svg(), tr = K() === 'tr', res = H.analyse(), wt = res.wild.growth;
        var pct = wt > 1e-9 ? Math.round(100 * res.mutant.growth / wt) : 0;
        var W = 700, top = 64, bottom = 74, mapH = 450;
        var out = document.createElementNS(NS, 'svg');
        out.setAttribute('viewBox', '0 0 ' + W + ' ' + (top + mapH + bottom));
        out.setAttribute('width', W * 2); out.setAttribute('height', (top + mapH + bottom) * 2);
        function el(n, a, p) { var e = document.createElementNS(NS, n); for (var k in a) e.setAttribute(k, a[k]); (p || out).appendChild(e); return e; }
        var FONT = 'Arial, Helvetica, sans-serif';
        el('rect', { x: 0, y: 0, width: W, height: top + mapH + bottom, fill: '#ffffff' });
        el('text', { x: 20, y: 28, 'font-family': FONT, 'font-size': 18, 'font-weight': 700, fill: '#0f172a' }).textContent = tr ? 'Metabolik Simülasyon: akı haritası (oyuncak hücre)' : 'Metabolic Playground: flux map (toy cell)';
        el('text', { x: 20, y: 48, 'font-family': FONT, 'font-size': 11.5, fill: '#475569' }).textContent = settingsLine() + ' · ' + (tr ? 'Büyüme: ' : 'Growth: ') + pct + '% ' + (tr ? 'sağlıklı hücre' : 'of healthy cell');
        var g = el('g', { transform: 'translate(0,' + top + ')' });
        Array.prototype.forEach.call(src.childNodes, function (n) { if (n.nodeName !== 'title') g.appendChild(n.cloneNode(true)); });
        Array.prototype.forEach.call(g.querySelectorAll('title'), function (t) { t.remove(); });
        Array.prototype.forEach.call(g.querySelectorAll('line'), function (l) {
            var c = l.getAttribute('stroke'); l.setAttribute('stroke', DARK[c] || c); l.setAttribute('stroke-linecap', 'round');
            var cls = l.getAttribute('class') || ''; l.removeAttribute('class');
            if (cls.indexOf('off') >= 0) l.setAttribute('stroke-dasharray', '4 6');
        });
        Array.prototype.forEach.call(g.querySelectorAll('polygon'), function (p) { var c = p.getAttribute('fill'); p.setAttribute('fill', DARK[c] || c); });
        Array.prototype.forEach.call(g.querySelectorAll('.pg-node'), function (n) {
            var bio = (n.getAttribute('class') || '').indexOf('pg-bio') >= 0, r = n.querySelector('rect'), t = n.querySelector('text');
            r.removeAttribute('style'); r.setAttribute('fill', bio ? '#f3e8ff' : '#ffffff'); r.setAttribute('stroke', bio ? '#7c3aed' : '#94a3b8'); r.setAttribute('stroke-width', 1.5);
            t.setAttribute('fill', '#0f172a'); t.setAttribute('font-family', FONT); t.setAttribute('font-size', 13); t.setAttribute('font-weight', 600);
        });
        Array.prototype.forEach.call(g.querySelectorAll('.pg-tag'), function (n) {
            var on = (n.getAttribute('class') || '').indexOf(' on') >= 0, r = n.querySelector('rect'), ts = n.querySelectorAll('text');
            r.setAttribute('fill', on ? '#fee2e2' : '#ffffff'); r.setAttribute('stroke', on ? '#dc2626' : '#0891b2'); r.setAttribute('stroke-width', 1.2);
            ts[0].setAttribute('fill', on ? '#dc2626' : '#0e7490'); ts[0].setAttribute('font-family', FONT); ts[0].setAttribute('font-size', 12); ts[0].setAttribute('font-style', 'italic');
            ts[1].setAttribute('fill', on ? '#dc2626' : '#475569'); ts[1].setAttribute('font-family', FONT); ts[1].setAttribute('font-size', 10);
            ['role', 'tabindex', 'aria-pressed', 'aria-label', 'class'].forEach(function (a) { n.removeAttribute(a); });
        });
        Array.prototype.forEach.call(g.querySelectorAll('.pg-fv'), function (t) { t.setAttribute('fill', '#0f172a'); t.setAttribute('font-family', FONT); t.setAttribute('font-size', 11); t.setAttribute('font-weight', 700); t.removeAttribute('class'); });
        var y0 = top + mapH + 14;
        el('text', { x: 20, y: y0, 'font-family': FONT, 'font-size': 10.5, fill: '#475569' }).textContent = tr
            ? 'Çizgi kalınlığı akıyla orantılıdır. Gri: boşta. Kırmızı kesikli: kapatılan gen. Sayılar keyfi birimli akılardır.'
            : 'Line width is proportional to flux. Grey: idle. Red dashed: switched-off gene. Numbers are fluxes in arbitrary units.';
        el('text', { x: 20, y: y0 + 16, 'font-family': FONT, 'font-size': 10.5, fill: '#475569' }).textContent = tr
            ? 'Akı dengesi analizi (FBA) ile hesaplanmış, eğitim amaçlı basitleştirilmiş oyuncak model; gerçek bir organizma değildir.'
            : 'Computed by flux balance analysis (FBA) on a simplified educational toy model; not a real organism.';
        el('text', { x: 20, y: y0 + 34, 'font-family': FONT, 'font-size': 10.5, 'font-weight': 600, fill: '#0e7490' }).textContent = 'Bay, \u00d6.F. (' + new Date().getFullYear() + '). Metabolic Playground. ' + SITE.replace('https://', '');
        return new XMLSerializer().serializeToString(out);
    }

    function download(name, blob) {
        var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
        document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    }
    function stamp() { return new Date().toISOString().slice(0, 10); }

    function exportSVG() { download('metabolic-playground-map-' + stamp() + '.svg', new Blob([figureSVG()], { type: 'image/svg+xml;charset=utf-8' })); }
    function exportPNG() {
        var svg = figureSVG(), img = new Image();
        var url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
        img.onload = function () {
            var s = 3, c = document.createElement('canvas'); c.width = 700 * s; c.height = (64 + 450 + 74) * s;
            var ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height);
            URL.revokeObjectURL(url);
            c.toBlob(function (b) { if (b) download('metabolic-playground-map-' + stamp() + '.png', b); }, 'image/png');
        };
        img.src = url;
    }

    function csvCell(v) { v = String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
    function exportCSV() {
        var H = window.PGHooks, st = H.state(), res = H.analyse(), mu = res.mutant, wt = res.wild.growth, rx = FBAModel.REACTIONS;
        var L = [];
        L.push('# Metabolic Playground export (toy model, educational)');
        L.push('# date,' + stamp());
        L.push('# oxygen_supply,' + st.oxygen); L.push('# glucose_supply,' + st.glucose);
        L.push('# knockouts,' + csvCell(st.knockouts.join(';') || 'none')); L.push('# objective,' + st.objective);
        L.push('# growth_relative_to_healthy,' + (wt > 1e-9 ? (mu.growth / wt).toFixed(4) : '0'));
        L.push('# source,' + SITE);
        L.push(''); L.push('reaction_id,reaction_name,gene,flux_arbitrary_units');
        Object.keys(rx).forEach(function (id) { L.push([id, csvCell(H.rname(id)), rx[id].gene || '', mu.fluxes[id].toFixed(6)].join(',')); });
        var sc = FBAModel.screen({ glucose: st.glucose, oxygen: st.oxygen });
        L.push(''); L.push('gene,reaction,growth_relative_to_healthy,essential');
        sc.forEach(function (r) { L.push([r.gene, r.reaction, r.ratio.toFixed(4), r.essential ? 'yes' : 'no'].join(',')); });
        download('metabolic-playground-data-' + stamp() + '.csv', new Blob([L.join('\n') + '\n'], { type: 'text/csv;charset=utf-8' }));
    }

    function sbml() {
        var st = window.PGHooks.state(), rx = FBAModel.REACTIONS, ids = Object.keys(rx), mets = FBAModel.METABOLITES, knocked = {};
        st.knockouts.forEach(function (g) { knocked[g] = true; });
        var x = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); };
        var o = '<?xml version="1.0" encoding="UTF-8"?>\n' +
            '<sbml xmlns="http://www.sbml.org/sbml/level3/version1/core" xmlns:fbc="http://www.sbml.org/sbml/level3/version1/fbc/version2" level="3" version="1" fbc:required="false">\n' +
            '  <model id="playground_toy_cell" name="Metabolic Playground toy cell" fbc:strict="false">\n' +
            '    <notes><body xmlns="http://www.w3.org/1999/xhtml"><p>Educational toy model from ' + x(SITE) + '. Exported ' + stamp() + '. Oxygen supply ' + st.oxygen + ', glucose supply ' + st.glucose + ', knockouts: ' + x(st.knockouts.join(', ') || 'none') + '. Not a real organism.</p></body></notes>\n' +
            '    <listOfCompartments><compartment id="c" name="cell" spatialDimensions="3" size="1" constant="true"/></listOfCompartments>\n' +
            '    <listOfSpecies>\n' + mets.map(function (m) { return '      <species id="M_' + m + '" name="' + x(MET[m]) + '" compartment="c" hasOnlySubstanceUnits="false" boundaryCondition="false" constant="false"/>'; }).join('\n') + '\n    </listOfSpecies>\n' +
            '    <listOfParameters>\n';
        var bounds = {};
        ids.forEach(function (id) {
            var r = rx[id], lb = r.lb, ub = r.ub;
            if (id === 'UPT_GLC') ub = st.glucose; if (id === 'UPT_O2') ub = st.oxygen;
            if (id === 'PFL' && st.oxygen > 0.5) ub = 0; if (id === 'PDH' && st.oxygen <= 0.5) ub = 0;
            if (r.gene && knocked[r.gene]) { lb = 0; ub = 0; }
            bounds[id] = [lb, ub];
            o += '      <parameter id="lb_' + id + '" value="' + lb + '" constant="true"/>\n      <parameter id="ub_' + id + '" value="' + ub + '" constant="true"/>\n';
        });
        o += '    </listOfParameters>\n    <listOfReactions>\n';
        ids.forEach(function (id) {
            var r = rx[id], re = [], pr = [];
            Object.keys(r.stoich).forEach(function (m) { (r.stoich[m] < 0 ? re : pr).push('        <speciesReference species="M_' + m + '" stoichiometry="' + Math.abs(r.stoich[m]) + '" constant="true"/>'); });
            o += '      <reaction id="R_' + id + '" name="' + x(window.PGHooks.rname(id)) + '" reversible="false" fast="false" fbc:lowerFluxBound="lb_' + id + '" fbc:upperFluxBound="ub_' + id + '">\n' +
                (re.length ? '        <listOfReactants>\n' + re.join('\n') + '\n        </listOfReactants>\n' : '') +
                (pr.length ? '        <listOfProducts>\n' + pr.join('\n') + '\n        </listOfProducts>\n' : '') +
                (r.gene ? '        <fbc:geneProductAssociation><fbc:geneProductRef fbc:geneProduct="G_' + r.gene + '"/></fbc:geneProductAssociation>\n' : '') +
                '      </reaction>\n';
        });
        o += '    </listOfReactions>\n    <fbc:listOfObjectives fbc:activeObjective="obj">\n      <fbc:objective fbc:id="obj" fbc:type="maximize">\n        <fbc:listOfFluxObjectives><fbc:fluxObjective fbc:reaction="R_' + (st.objective === 'lactate' ? 'EX_LAC' : 'BIO') + '" fbc:coefficient="1"/></fbc:listOfFluxObjectives>\n      </fbc:objective>\n    </fbc:listOfObjectives>\n    <fbc:listOfGeneProducts>\n' +
            FBAModel.genes().map(function (g) { return '      <fbc:geneProduct fbc:id="G_' + g.gene + '" fbc:label="' + g.gene + '"/>'; }).join('\n') + '\n    </fbc:listOfGeneProducts>\n  </model>\n</sbml>\n';
        return o;
    }
    function exportSBML() { download('metabolic-playground-model-' + stamp() + '.xml', new Blob([sbml()], { type: 'application/xml;charset=utf-8' })); }

    function citeText() {
        var y = new Date().getFullYear(), d = new Date().toLocaleDateString(K() === 'tr' ? 'tr-TR' : 'en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
        return K() === 'tr'
            ? 'Bay, Ö.F. (' + y + '). Metabolic Playground: etkileşimli akı dengesi analizi gösterimi. ' + SITE + ' (Erişim: ' + d + ').\nGerçek model modunu kullanırsanız ayrıca Orth ve ark. (2010) EcoSal Plus ve King ve ark. (2016) Nucleic Acids Res. çalışmalarına atıf verin.'
            : 'Bay, Ö.F. (' + y + '). Metabolic Playground: an interactive flux balance analysis demo. ' + SITE + ' (accessed ' + d + ').\nIf you use the real-model mode, please also cite Orth et al. (2010) EcoSal Plus and King et al. (2016) Nucleic Acids Res.';
    }
    function bibtex() {
        var y = new Date().getFullYear();
        return '@misc{bay' + y + 'playground,\n  author = {Bay, {\\"O}mer Faruk},\n  title = {Metabolic Playground: an interactive flux balance analysis demo},\n  year = {' + y + '},\n  url = {' + SITE + '},\n  note = {Educational toy model; real-model mode uses the E. coli core model (Orth et al. 2010, BiGG Models)}\n}';
    }
    function copy(text) {
        var done = $('pge-done');
        var ok = function () { done.textContent = T('copied'); setTimeout(function () { done.textContent = ''; }, 2500); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok, function () { done.textContent = T('cantcopy'); });
        else done.textContent = T('cantcopy');
    }

    function bindExport() {
        $('pge-svg').addEventListener('click', exportSVG);
        $('pge-png').addEventListener('click', exportPNG);
        $('pge-csv').addEventListener('click', exportCSV);
        $('pge-sbml').addEventListener('click', exportSBML);
        $('pge-copy').addEventListener('click', function () { copy(citeText()); });
        $('pge-bib').addEventListener('click', function () { copy(bibtex()); });
    }

    function refresh() {
        fillStatic(); buildMethods();
        $('pge-cite').textContent = citeText();
        if (R.ready) renderReal(); else { renderReal(); if (loading) $('pgr-status').textContent = T('loading'); }
    }

    function init() {
        bindReal(); bindExport(); refresh();
        document.addEventListener('langchange', refresh);
    }
    if (window.PGHooks) init(); else document.addEventListener('pghooks', init);

    // test hooks (used by automated checks)
    window.PGPro = { figureSVG: figureSVG, sbml: sbml, loadReal: loadReal, _R: R };
})();
