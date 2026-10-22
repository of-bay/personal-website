/* Interactive metabolic-network canvas used as a full-page background. Hover to highlight, click empty space to send a signal. */
(function () {
    'use strict';
    var cv = document.getElementById('hero-net');
    if (!cv) return;
    var ctx = cv.getContext('2d');
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var NAMES = ['Glucose', 'G6P', 'F6P', 'GAP', 'PEP', 'Pyruvate', 'Acetyl-CoA', 'Citrate', 'α-KG', 'Succinate', 'Fumarate', 'Malate', 'OAA', 'ATP', 'NADH', 'NADPH', 'R5P', 'Lactate', 'Ethanol', 'Acetate', 'Formate', 'Biomass', 'CO₂', 'O₂'];
    var W = 0, H = 0, dpr = 1, nodes = [], edges = [], parts = [], mouse = { x: -1e3, y: -1e3 }, running = false, hover = -1, last = 0;

    function rnd(a, b) { return a + Math.random() * (b - a); }

    function build() {
        var r = cv.getBoundingClientRect();
        W = r.width; H = r.height; dpr = Math.min(window.devicePixelRatio || 1, 2);
        cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        var n = Math.max(18, Math.min(64, Math.round(W * H / 24000))), tries = 0, minD = Math.sqrt(W * H / n) * 0.7;
        nodes = []; edges = []; parts = [];
        while (nodes.length < n && tries++ < 4000) {
            var x = rnd(26, W - 26), y = rnd(26, H - 26), ok = true;
            for (var i = 0; i < nodes.length; i++) if (Math.hypot(nodes[i].x - x, nodes[i].y - y) < minD) { ok = false; break; }
            if (ok) nodes.push({ x: x, y: y, r: rnd(3.5, 6.5), name: NAMES[nodes.length % NAMES.length], glow: 0, vx: rnd(-.08, .08), vy: rnd(-.08, .08), ph: rnd(0, 6.28), nb: [] });
        }
        var seen = {};
        nodes.forEach(function (a, i) {
            var d = nodes.map(function (b, j) { return { j: j, d: i === j ? 1e9 : Math.hypot(a.x - b.x, a.y - b.y) }; }).sort(function (p, q) { return p.d - q.d; });
            for (var k = 0; k < 2 + (i % 2); k++) {
                var j = d[k].j, key = Math.min(i, j) + '-' + Math.max(i, j);
                if (!seen[key]) { seen[key] = 1; edges.push({ a: i, b: j }); a.nb.push(j); nodes[j].nb.push(i); }
            }
        });
        edges.forEach(function (e) { for (var k = 0; k < 2; k++) parts.push({ e: e, t: Math.random(), s: rnd(.08, .22), dir: Math.random() < .5 ? 1 : -1 }); });
    }

    function signal(i) {
        var dist = {}, q = [i]; dist[i] = 0;
        while (q.length) { var c = q.shift(); nodes[c].nb.forEach(function (n) { if (dist[n] === undefined) { dist[n] = dist[c] + 1; q.push(n); } }); }
        Object.keys(dist).forEach(function (k) { var d = dist[k]; setTimeout(function () { nodes[k].glow = 1; }, d * 140); });
    }

    function frame(ts) {
        if (!running) return;
        var dt = Math.min((ts - last) / 1000 || 0.016, 0.05); last = ts;
        ctx.clearRect(0, 0, W, H);
        hover = -1; var best = 38;
        nodes.forEach(function (n, i) {
            if (!reduce) {
                n.x += n.vx; n.y += n.vy; n.ph += dt;
                if (n.x < 20 || n.x > W - 20) n.vx *= -1;
                if (n.y < 20 || n.y > H - 20) n.vy *= -1;
            }
            var d = Math.hypot(n.x - mouse.x, n.y - mouse.y);
            if (d < best) { best = d; hover = i; }
            n.glow = Math.max(0, n.glow - dt * 0.9);
        });
        edges.forEach(function (e) {
            var a = nodes[e.a], b = nodes[e.b], hot = Math.max(a.glow, b.glow) + (hover === e.a || hover === e.b ? .6 : 0);
            ctx.strokeStyle = 'rgba(148,163,184,' + (0.18 + Math.min(hot, 1) * 0.55) + ')';
            ctx.lineWidth = 1 + hot;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        });
        parts.forEach(function (p) {
            if (!reduce) { p.t += p.s * dt * p.dir; if (p.t > 1) p.t -= 1; if (p.t < 0) p.t += 1; }
            var a = nodes[p.e.a], b = nodes[p.e.b], x = a.x + (b.x - a.x) * p.t, y = a.y + (b.y - a.y) * p.t;
            ctx.fillStyle = 'rgba(0,240,255,.85)'; ctx.beginPath(); ctx.arc(x, y, 1.8, 0, 6.283); ctx.fill();
        });
        nodes.forEach(function (n, i) {
            var g = Math.max(n.glow, i === hover ? 1 : 0), pul = 1 + Math.sin(n.ph * 2) * 0.12;
            if (g > 0.02) {
                var grd = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, 34);
                grd.addColorStop(0, 'rgba(181,56,255,' + 0.55 * g + ')'); grd.addColorStop(1, 'rgba(181,56,255,0)');
                ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(n.x, n.y, 34, 0, 6.283); ctx.fill();
            }
            ctx.fillStyle = g > 0.3 ? '#e9d5ff' : '#00f0ff';
            ctx.beginPath(); ctx.arc(n.x, n.y, n.r * pul + g * 2, 0, 6.283); ctx.fill();
        });
        if (hover >= 0) {
            var h = nodes[hover]; ctx.font = '600 13px Outfit, sans-serif';
            var w = ctx.measureText(h.name).width + 16, x = Math.min(Math.max(h.x - w / 2, 4), W - w - 4), y = h.y - 36 < 4 ? h.y + 16 : h.y - 36;
            ctx.fillStyle = 'rgba(15,18,36,.92)'; ctx.strokeStyle = 'rgba(0,240,255,.6)'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, 24, 8) : ctx.rect(x, y, w, 24); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#e2e8f0'; ctx.fillText(h.name, x + 8, y + 16);
        }
        requestAnimationFrame(frame);
    }

    function start() { if (running) return; running = true; last = performance.now(); requestAnimationFrame(frame); }
    function stop() { running = false; }

    // The canvas sits behind the page, so pointer events are read from the window.
    window.addEventListener('pointermove', function (e) { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
    document.addEventListener('pointerleave', function () { mouse.x = mouse.y = -1e3; });
    window.addEventListener('click', function (e) {
        if (hover < 0 || (e.target.closest && e.target.closest('a, button, input, select, textarea, summary, label'))) return;
        signal(hover);
    });
    var rz; window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(function () { if (cv.getBoundingClientRect().width) build(); }, 150); });

    build();
    if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (en) { if (en[0].isIntersecting) { if (!W) build(); start(); } else stop(); }).observe(cv);
    } else start();
    if (reduce) { start(); setTimeout(stop, 120); }
})();
