// main.js - Client side logic
// Hash-based routing: every section has its own URL (e.g. /#publications),
// the back button works, and links can be shared.

document.addEventListener('DOMContentLoaded', () => {
    const sections = document.querySelectorAll('.page-section');
    const navLinks = document.querySelectorAll('.nav-links a');
    const toggle = document.getElementById('nav-toggle');
    const menu = document.getElementById('nav-links');

    function setMenu(open) {
        if (!toggle || !menu) return;
        menu.classList.toggle('open', open);
        toggle.setAttribute('aria-expanded', String(open));
    }

    function route() {
        const id = (location.hash || '#home').slice(1);
        // An id may point at a sub-block (e.g. #tubitak); show the section that contains it.
        const el = document.getElementById(id);
        const target = (el && el.closest('.page-section')) || document.getElementById('home');

        sections.forEach(sec => sec.classList.remove('active-section'));
        target.classList.add('active-section');

        navLinks.forEach(a => {
            if (a.getAttribute('href') === '#' + target.id) a.setAttribute('aria-current', 'page');
            else a.removeAttribute('aria-current');
        });

        updateTitle(target);
        setMenu(false);
        if (el && el !== target) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        else window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function updateTitle(target) {
        target = target || document.querySelector('.page-section.active-section');
        if (!target) return;
        const i18n = window.i18n;
        const heading = target.querySelector('h1, h2');
        document.title = target.id === 'home' || !heading
            ? (i18n ? i18n.homeTitle() : 'Dr. Ömer Faruk Bay | Bioinformatics & Metabolic Modeling')
            : heading.textContent.replace(/\s+/g, ' ').trim() + (i18n ? i18n.titleSuffix() : ' | Ömer Faruk Bay');
    }

    document.addEventListener('langchange', () => updateTitle());

    if (toggle) toggle.addEventListener('click', () => setMenu(!menu.classList.contains('open')));


    // ── Partner logo strip ─────────────────────────────────────
    // Endless marquee: the list is cloned enough times to always cover the viewport,
    // and the animation moves by exactly one list width, so the loop has no jump or gap.
    // If a logo file is missing, the institution name is shown instead.
    const track = document.getElementById('partners-track');
    if (track) {
        const viewport = track.parentElement;
        const SPEED = 35; // pixels per second

        const toText = (img) => {
            const text = document.createElement('span');
            text.className = 'partner-text';
            text.textContent = img.alt;
            img.replaceWith(text);
        };
        track.addEventListener('error', (e) => {
            if (e.target.tagName === 'IMG') { toText(e.target); build(); }
        }, true);
        track.querySelectorAll('img').forEach((img) => {
            if (img.complete && img.naturalWidth === 0) toText(img);
        });

        const originals = Array.from(track.children);

        function build() {
            track.querySelectorAll('[data-clone]').forEach((n) => n.remove());
            const setWidth = track.scrollWidth; // width of one full list (margins included)
            if (!setWidth) return;
            const copies = Math.ceil(viewport.clientWidth / setWidth) + 1;
            for (let i = 0; i < copies; i++) {
                originals.forEach((li) => {
                    const clone = li.cloneNode(true);
                    clone.setAttribute('aria-hidden', 'true');
                    clone.setAttribute('data-clone', '');
                    clone.querySelector('img')?.setAttribute('alt', '');
                    track.appendChild(clone);
                });
            }
            track.style.setProperty('--shift', `-${setWidth}px`);
            track.style.setProperty('--duration', `${(setWidth / SPEED).toFixed(1)}s`);
        }

        // Measure only once images have their real size.
        if (document.readyState === 'complete') build();
        else window.addEventListener('load', build);

        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(build, 200);
        });
    }

    window.addEventListener('hashchange', route);
    route();
});
