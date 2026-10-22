/* Site-wide interactivity: scroll progress, card spotlight */
(function () {
    'use strict';
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* scroll progress */
    var bar = document.createElement('div'); bar.className = 'scroll-progress'; bar.setAttribute('aria-hidden', 'true'); document.body.appendChild(bar);
    var tick = false;
    function prog() { var d = document.documentElement, m = d.scrollHeight - d.clientHeight; bar.style.transform = 'scaleX(' + (m > 0 ? d.scrollTop / m : 0) + ')'; tick = false; }
    window.addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(prog); } }, { passive: true });

    /* card spotlight */
    document.addEventListener('pointermove', function (e) {
        var c = e.target.closest && e.target.closest('.glass-card:not(.floating-card)');
        if (!c) return;
        var r = c.getBoundingClientRect();
        c.style.setProperty('--mx', (e.clientX - r.left) + 'px'); c.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }, { passive: true });
})();
