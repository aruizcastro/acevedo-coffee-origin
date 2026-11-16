/* Shared helpers for index.html and lot.html.
 *
 * Bilingual model: every piece of text is rendered in both languages, each
 * wrapped in an element carrying lang="es" or lang="en". CSS hides whichever
 * does not match <html lang>. Switching language is therefore just a matter of
 * changing that one attribute — nothing has to be re-rendered.
 */
(function () {
  'use strict';

  var root = document.documentElement;
  root.classList.add('js');

  var PENDING = '[PENDIENTE]';
  var langListeners = [];

  function esc(value) {
    return String(value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function isLocalized(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value) &&
      ('es' in value || 'en' in value);
  }

  /* Plain text of a value in one language (for titles, attributes, checks) */
  function text(value, lang) {
    if (Array.isArray(value)) {
      var parts = value.filter(function (v) { return v !== null && v !== ''; })
        .map(function (v) { return text(v, lang); });
      return parts.length ? parts.join(' · ') : PENDING;
    }
    if (isLocalized(value)) {
      var picked = value[lang || 'es'];
      return text(picked === undefined || picked === '' ? (value.es || value.en) : picked, lang);
    }
    if (value === null || value === undefined || value === '') return PENDING;
    return String(value);
  }

  function isPending(value) {
    var s = text(value, 'es').trim();
    return s.indexOf('[PENDIENTE') === 0 || s.indexOf('[PENDING') === 0;
  }

  /* HTML with both languages: bi('Hola', 'Hello') */
  function bi(es, en) {
    return '<span lang="es">' + esc(es) + '</span><span lang="en">' + esc(en) + '</span>';
  }

  /* HTML for a data value that may be a string, a number, a list or {es, en} */
  function loc(value) {
    var es = text(value, 'es');
    var en = text(value, 'en');
    return es === en ? esc(es) : bi(es, en);
  }

  function loadJSON(path) {
    return fetch(path, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('Could not load ' + path + ' (' + r.status + ')');
      return r.json();
    });
  }

  /* get(obj, 'farm.name') */
  function get(obj, path) {
    return path.split('.').reduce(function (o, k) {
      return o === null || o === undefined ? undefined : o[k];
    }, obj);
  }

  /* Fills every element carrying data-f="path.to.value" from farm.json */
  function bindFarm(farm) {
    document.querySelectorAll('[data-f]').forEach(function (el) {
      var value = get(farm, el.getAttribute('data-f'));
      el.innerHTML = loc(value);
      el.classList.toggle('pending', isPending(value));
    });
  }

  function formatDate(iso, lang) {
    if (!iso) return PENDING;
    var d = new Date(iso + 'T12:00:00');
    if (isNaN(d)) return String(iso);
    return new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'es-CO',
      { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
  }

  function dateBi(iso) {
    return bi(formatDate(iso, 'es'), formatDate(iso, 'en'));
  }

  function formatNumber(n, lang) {
    if (typeof n !== 'number') return text(n, lang);
    return new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'es-CO',
      { maximumFractionDigits: 2 }).format(n);
  }

  /* numBi(1650, ' msnm', ' masl') → "1.650 msnm" / "1,650 masl" */
  function numBi(n, suffixEs, suffixEn) {
    var es = formatNumber(n, 'es') + (suffixEs || '');
    var en = formatNumber(n, 'en') + (suffixEn === undefined ? (suffixEs || '') : suffixEn);
    return es === en ? esc(es) : bi(es, en);
  }

  /* ---------- Language ---------- */

  function getLang() {
    return root.lang === 'en' ? 'en' : 'es';
  }

  function setLang(lang) {
    lang = lang === 'en' ? 'en' : 'es';
    root.lang = lang;
    try { localStorage.setItem('lang', lang); } catch (e) { /* private mode */ }
    document.querySelectorAll('[data-set-lang]').forEach(function (btn) {
      btn.setAttribute('aria-pressed', String(btn.getAttribute('data-set-lang') === lang));
    });
    langListeners.forEach(function (fn) { fn(lang); });
  }

  /* Runs fn(lang) now and again on every language change */
  function onLang(fn) {
    langListeners.push(fn);
    fn(getLang());
  }

  function initLang() {
    document.querySelectorAll('[data-set-lang]').forEach(function (btn) {
      btn.addEventListener('click', function () { setLang(btn.getAttribute('data-set-lang')); });
    });
    setLang(getLang());
  }

  /* ---------- Mobile menu ---------- */

  function initNav() {
    var toggle = document.querySelector('.nav-toggle');
    var nav = document.getElementById('nav');
    if (!toggle || !nav) return;
    function close() {
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  }

  /* ---------- Reveal on scroll ---------- */

  function initReveal() {
    var els = document.querySelectorAll('.reveal:not(.seen)');
    if (!('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('seen'); });
      return;
    }
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('seen');
          obs.unobserve(e.target);
        }
      });
    }, { rootMargin: '0px 0px -6% 0px' });
    els.forEach(function (el) { obs.observe(el); });
  }

  window.Coffee = {
    PENDING: PENDING,
    esc: esc,
    text: text,
    isPending: isPending,
    bi: bi,
    loc: loc,
    loadJSON: loadJSON,
    get: get,
    bindFarm: bindFarm,
    formatDate: formatDate,
    dateBi: dateBi,
    formatNumber: formatNumber,
    numBi: numBi,
    getLang: getLang,
    setLang: setLang,
    onLang: onLang,
    initLang: initLang,
    initNav: initNav,
    initReveal: initReveal
  };
})();
