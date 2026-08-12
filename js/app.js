/* ==========================================================================
   ALIPOUR — site behaviour
   ========================================================================== */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- nav ---------- */
  var nav = document.querySelector('.nav');
  var ticking = false;
  function onScroll() {
    if (nav) nav.classList.toggle('stuck', (window.scrollY || 0) > 40);
    sweep();
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });

  /* ---------- drawer ---------- */
  var drawer = document.querySelector('.drawer');
  var burger = document.querySelector('.burger');
  function setDrawer(open) {
    if (!drawer) return;
    drawer.classList.toggle('open', open);
    document.body.style.overflow = open ? 'hidden' : '';
    if (burger) burger.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  if (burger) burger.addEventListener('click', function () { setDrawer(!drawer.classList.contains('open')); });
  if (drawer) drawer.addEventListener('click', function (e) {
    if (e.target.tagName === 'A' || e.target.classList.contains('drawer__x')) setDrawer(false);
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setDrawer(false); });

  /* ---------- reveal ---------- */
  var SEL = '[data-rv],.stag';
  if (reduce || !('IntersectionObserver' in window)) {
    Array.prototype.forEach.call(document.querySelectorAll(SEL), function (el) { el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });
    Array.prototype.forEach.call(document.querySelectorAll(SEL), function (el) { io.observe(el); });
  }

  /* Fallback for a viewport that had no height at parse time (hidden tab,
     bfcache restore, embedded frame) — the observer never fires there. */
  function sweep() {
    var vh = window.innerHeight;
    if (!vh) return;
    Array.prototype.forEach.call(document.querySelectorAll(SEL), function (el) {
      if (el.classList.contains('in')) return;
      var r = el.getBoundingClientRect();
      if (r.top < vh * 0.94 && r.bottom > 0) el.classList.add('in');
    });
  }
  window.addEventListener('load', sweep);
  window.addEventListener('pageshow', sweep);
  var st;
  window.addEventListener('resize', function () { clearTimeout(st); st = setTimeout(sweep, 200); });

  /* ---------- catalogue ---------- */
  var FA = { ring:'انگشتر', necklace:'گردنبند', earring:'گوشواره', bracelet:'دستبند',
             pendant:'آویز', set:'سرویس', gbracelet:'دستبند طلا', gnecklace:'گردنبند طلا',
             gring:'انگشتر طلا', gearring:'گوشواره طلا', watch:'ساعت' };

  function card(p) {
    var a = document.createElement('a');
    a.className = 'pc';
    a.href = p.url; a.target = '_blank'; a.rel = 'noopener';
    a.innerHTML =
      '<span class="pc__m"><img loading="lazy" decoding="async" src="assets/img/p/' + p.code + '.webp" alt="' + p.name + '"></span>' +
      '<span class="pc__b"><span class="pc__n">' + p.name + '</span>' +
      '<span class="pc__p">' + (p.price ? p.price + '<em>تومان</em>' : 'استعلام قیمت') + '</span></span>';
    return a;
  }

  var mount = document.querySelector('[data-products]');
  if (mount) {
    fetch('data/catalog.json').then(function (r) { return r.json(); }).then(function (all) {
      var have = all.filter(function (p) { return p.img; });
      var frag = document.createDocumentFragment();
      have.forEach(function (p) { frag.appendChild(card(p)); });
      mount.appendChild(frag);
      mount.classList.add('in');

      var out = document.querySelector('[data-count-out]');
      if (out) out.textContent = have.length;

      var bar = document.querySelector('.chips');
      if (!bar) return;
      var cats = [];
      have.forEach(function (p) { if (cats.indexOf(p.cat) === -1) cats.push(p.cat); });

      function chip(key, label) {
        var b = document.createElement('button');
        b.className = 'chip'; b.textContent = label;
        b.addEventListener('click', function () {
          Array.prototype.forEach.call(bar.children, function (c) { c.classList.remove('on'); });
          b.classList.add('on');
          var n = 0;
          Array.prototype.forEach.call(mount.children, function (el, i) {
            var show = key === 'all' || have[i].cat === key;
            el.style.display = show ? '' : 'none';
            if (show) n++;
          });
          if (out) out.textContent = n;
        });
        return b;
      }
      var first = chip('all', 'همه'); first.classList.add('on'); bar.appendChild(first);
      cats.forEach(function (c) { bar.appendChild(chip(c, FA[c] || c)); });
    }).catch(function () {
      mount.innerHTML = '<p class="small">در حال حاضر امکان نمایش محصولات وجود ندارد.</p>';
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
})();
