/* ==========================================================================
   ALIPOUR — site behaviour
   ========================================================================== */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- nav ---------- */
  var nav = document.querySelector('.nav');
  var ticking = false;
  /* the fixed chrome sits over two different grounds — flip it to ink
     whenever a paper band is the thing directly under it */
  var papers = document.querySelectorAll('.band--paper');
  function chrome() {
    if (!nav || !papers.length) return;
    var y = nav.offsetHeight * 0.5, on = false;
    Array.prototype.forEach.call(papers, function (el) {
      var r = el.getBoundingClientRect();
      if (r.top <= y && r.bottom >= y) on = true;
    });
    nav.classList.toggle('onpaper', on);
  }

  function onScroll() {
    if (nav) nav.classList.toggle('stuck', (window.scrollY || 0) > 30);
    chrome();
    sweep();
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });

  /* ---------- menu ---------- */
  var menu = document.querySelector('.menu');
  var open = document.querySelector('[data-menu]');
  var close = document.querySelector('[data-menu-close]');
  function setMenu(on) {
    if (!menu) return;
    menu.classList.toggle('open', on);
    menu.setAttribute('aria-hidden', on ? 'false' : 'true');
    document.body.style.overflow = on ? 'hidden' : '';
    if (open) open.setAttribute('aria-expanded', on ? 'true' : 'false');
  }
  if (open) open.addEventListener('click', function () { setMenu(!menu.classList.contains('open')); });
  if (close) close.addEventListener('click', function () { setMenu(false); });
  if (menu) menu.addEventListener('click', function (e) { if (e.target.tagName === 'A') setMenu(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });

  /* ---------- reveal ---------- */
  var SEL = '[data-rv],.stag';
  if (reduce || !('IntersectionObserver' in window)) {
    Array.prototype.forEach.call(document.querySelectorAll(SEL), function (el) { el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -5% 0px' });
    Array.prototype.forEach.call(document.querySelectorAll(SEL), function (el) { io.observe(el); });
  }
  /* fallback for a viewport with no height at parse time (hidden tab, bfcache) */
  function sweep() {
    var vh = window.innerHeight;
    if (!vh) return;
    Array.prototype.forEach.call(document.querySelectorAll(SEL), function (el) {
      if (el.classList.contains('in')) return;
      var r = el.getBoundingClientRect();
      if (r.top < vh * 0.95 && r.bottom > 0) el.classList.add('in');
    });
  }
  window.addEventListener('load', sweep);
  window.addEventListener('pageshow', sweep);
  var st;
  window.addEventListener('resize', function () { clearTimeout(st); st = setTimeout(sweep, 200); });

  /* ---------- catalogue ---------- */
  var FA = { ring:'انگشتر جواهر', necklace:'گردنبند جواهر', earring:'گوشواره جواهر',
             bracelet:'دستبند جواهر', pendant:'آویز جواهر', set:'سرویس جواهر',
             gbracelet:'دستبند طلا', gnecklace:'گردنبند طلا', gring:'انگشتر طلا',
             gearring:'گوشواره طلا', watch:'ساعت' };

  /* Weight and certification, not a price tag — a nine-digit number on a grid
     turns a maison page into a listing page. */
  function meta(p) {
    return (FA[p.cat] || '') + ' — کد ' + p.code;
  }

  function tile(p) {
    var a = document.createElement('a');
    a.className = 'pl';
    a.href = p.url; a.target = '_blank'; a.rel = 'noopener';
    a.innerHTML =
      '<span class="pl__m"><img loading="lazy" decoding="async" src="assets/img/p/' + p.code + '.webp" alt="' + p.name + '"></span>' +
      '<span class="pl__b"><span class="pl__n">' + p.name + '</span>' +
      '<span class="pl__s">' + meta(p) + '</span></span>';
    return a;
  }

  var mount = document.querySelector('[data-products]');
  if (mount) {
    fetch('data/catalog.json').then(function (r) { return r.json(); }).then(function (all) {
      var have = all.filter(function (p) { return p.img; });
      var frag = document.createDocumentFragment();
      have.forEach(function (p) { frag.appendChild(tile(p)); });
      mount.appendChild(frag);
      mount.classList.add('in');

      var out = document.querySelector('[data-count-out]');
      if (out) out.textContent = have.length;

      var bar = document.querySelector('.chips');
      if (!bar) return;
      var cats = [];
      have.forEach(function (p) { if (cats.indexOf(p.cat) === -1) cats.push(p.cat); });

      function apply(key, btn) {
        Array.prototype.forEach.call(bar.children, function (c) { c.classList.remove('on'); });
        btn.classList.add('on');
        var n = 0;
        Array.prototype.forEach.call(mount.children, function (el, i) {
          var show = key === 'all' || have[i].cat === key;
          el.style.display = show ? '' : 'none';
          if (show) n++;
        });
        if (out) out.textContent = n;
      }
      function chip(key, label) {
        var b = document.createElement('button');
        b.className = 'chip'; b.textContent = label; b.dataset.cat = key;
        b.addEventListener('click', function () { apply(key, b); });
        return b;
      }
      var first = chip('all', 'همه'); first.classList.add('on'); bar.appendChild(first);
      cats.forEach(function (c) { bar.appendChild(chip(c, FA[c] || c)); });

      /* deep link: products.html#bracelet */
      var h = (location.hash || '').replace('#', '');
      if (h) {
        var btn = bar.querySelector('[data-cat="' + h + '"]');
        if (btn) apply(h, btn);
      }
    }).catch(function () {
      mount.innerHTML = '<p class="dim">در حال حاضر امکان نمایش محصولات وجود ندارد.</p>';
    });
  }

  /* ---------- anchors ---------- */
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href');
    if (id.length < 2) return;
    var el = document.querySelector(id);
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  });

  var y = document.querySelector('[data-year]');
  if (y) y.textContent = new Date().getFullYear();

  onScroll();

  /* ---------- PWA ---------- */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () { /* not fatal */ });
    });
  }

  /* Chrome/Edge fire beforeinstallprompt; we hold it and offer our own card
     rather than letting the browser's mini-infobar interrupt the hero.
     iOS has no such event — Safari installs via the Share sheet — so there we
     show a short instruction instead, and only once. */
  var card = document.querySelector('.install');
  if (card) {
    var deferred = null;
    var KEY = 'alipour.install.dismissed';
    var dismissed = false;
    try { dismissed = localStorage.getItem(KEY) === '1'; } catch (e) {}

    var standalone = window.matchMedia('(display-mode: standalone)').matches ||
                     window.navigator.standalone === true;

    function show() {
      if (dismissed || standalone) return;
      card.hidden = false;
      requestAnimationFrame(function () { card.classList.add('show'); });
    }
    function hide(remember) {
      card.classList.remove('show');
      setTimeout(function () { card.hidden = true; }, 600);
      if (remember) { try { localStorage.setItem(KEY, '1'); } catch (e) {} }
    }

    window.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault();
      deferred = e;
      setTimeout(show, 2600);          // let the hero land first
    });

    var addBtn = card.querySelector('[data-install]');
    if (addBtn) addBtn.addEventListener('click', function () {
      if (!deferred) { hide(true); return; }
      deferred.prompt();
      deferred.userChoice.then(function () { deferred = null; hide(true); });
    });
    var xBtn = card.querySelector('[data-install-close]');
    if (xBtn) xBtn.addEventListener('click', function () { hide(true); });

    window.addEventListener('appinstalled', function () { hide(true); });

    /* iOS Safari: no install event exists, so offer the Share-sheet route */
    var iOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    var webkit = /safari/i.test(navigator.userAgent) && !/crios|fxios|edgios/i.test(navigator.userAgent);
    if (iOS && webkit && !standalone && !dismissed) {
      var t = card.querySelector('p');
      if (t) t.innerHTML = '<b>افزودن به صفحه‌ی اصلی</b>' +
        'دکمه‌ی هم‌رسانی <span class="lat">&#x21E7;</span> را بزنید و ' +
        '«Add to Home Screen» را انتخاب کنید.';
      if (addBtn) addBtn.textContent = 'باشد';
      setTimeout(show, 3000);
    }
  }
})();
