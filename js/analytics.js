/* Google Analytics 4 with cookie consent (EN/TR).
 * GA only loads AFTER the visitor clicks "Accept".
 * Paste your Measurement ID below (format: G-XXXXXXXXXX).
 * While it is still the placeholder, nothing loads and no banner is shown. */
(function () {
  var GA_ID = 'G-7LCDFPWW39';
  var KEY = 'analytics-consent';
  if (/^G-X+$/.test(GA_ID)) return; // still the placeholder: do nothing

  var TEXT = {
    en: {
      msg: 'This site uses Google Analytics (cookies) to understand where visitors come from. Data is anonymous.',
      yes: 'Accept', no: 'Decline'
    },
    tr: {
      msg: 'Bu site, ziyaretçilerin nereden geldiğini anlamak için Google Analytics (çerez) kullanır. Veriler anonimdir.',
      yes: 'Kabul Et', no: 'Reddet'
    }
  };
  function lang() { return document.documentElement.lang === 'tr' ? 'tr' : 'en'; }

  function loadGA() {
    if (window.__gaLoaded) return;
    window.__gaLoaded = true;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    gtag('js', new Date());
    gtag('config', GA_ID, { anonymize_ip: true });
  }

  var banner;
  function render() {
    if (!banner) return;
    var t = TEXT[lang()];
    banner.querySelector('p').textContent = t.msg;
    banner.querySelector('#ga-accept').textContent = t.yes;
    banner.querySelector('#ga-decline').textContent = t.no;
  }

  function showBanner() {
    if (banner) return;
    banner = document.createElement('div');
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Cookie consent');
    banner.style.cssText = 'position:fixed;left:1rem;right:1rem;bottom:1rem;max-width:520px;' +
      'margin:0 auto;z-index:99999;padding:1rem 1.25rem;border-radius:12px;' +
      'background:rgba(15,15,30,.95);color:#e8e8f0;border:1px solid rgba(255,255,255,.15);' +
      'font:14px/1.5 system-ui,sans-serif;backdrop-filter:blur(12px);' +
      'box-shadow:0 10px 40px rgba(0,0,0,.4)';
    banner.innerHTML = '<p style="margin:0 0 .75rem"></p>' +
      '<div style="display:flex;gap:.5rem;justify-content:flex-end">' +
      '<button id="ga-decline" type="button" style="padding:.4rem .9rem;border-radius:8px;border:1px solid rgba(255,255,255,.2);background:transparent;color:inherit;cursor:pointer"></button>' +
      '<button id="ga-accept" type="button" style="padding:.4rem .9rem;border-radius:8px;border:0;background:#00d4aa;color:#06060f;font-weight:600;cursor:pointer"></button></div>';
    document.body.appendChild(banner);
    render();
    function done(v) {
      try { localStorage.setItem(KEY, v); } catch (e) { /* ignore */ }
      banner.remove(); banner = null;
      if (v === 'yes') loadGA();
    }
    banner.querySelector('#ga-accept').onclick = function () { done('yes'); };
    banner.querySelector('#ga-decline').onclick = function () { done('no'); };
  }

  function init() {
    var c = null;
    try { c = localStorage.getItem(KEY); } catch (e) { /* ignore */ }
    if (c === 'yes') loadGA();
    else if (c !== 'no') showBanner();

    document.addEventListener('langchange', render);

    // "Cookie preferences" link lets visitors change their mind.
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('#cookie-prefs');
      if (!a) return;
      e.preventDefault();
      try { localStorage.removeItem(KEY); } catch (err) { /* ignore */ }
      if (window.__gaLoaded) location.reload(); else showBanner();
    });
  }

  if (document.body) init(); else document.addEventListener('DOMContentLoaded', init);
})();
