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
        const target = document.getElementById(id) || document.getElementById('home');

        sections.forEach(sec => sec.classList.remove('active-section'));
        target.classList.add('active-section');

        navLinks.forEach(a => {
            if (a.getAttribute('href') === '#' + target.id) a.setAttribute('aria-current', 'page');
            else a.removeAttribute('aria-current');
        });

        updateTitle(target);
        setMenu(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
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

    window.addEventListener('hashchange', route);
    route();
});
