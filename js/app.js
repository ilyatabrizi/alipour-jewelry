/* ==========================================================================
   ALIPOUR — site behaviour
   ========================================================================== */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- preloader ---------- */
  var pre = document.querySelector('.pre');
  function killPre() {
    if (!pre) return;
    pre.classList.add('is-gone');
    document.documentElement.classList.add('is-loaded');
    setTimeout(function () { if (pre.parentNode) pre.parentNode.removeChild(pre); }, 900);
  }
  if (pre) {
    var t = setTimeout(killPre, reduce ? 200 : 2100);
    window.addEventListener('load', function () {
      clearTimeout(t);
      setTimeout(killPre, reduce ? 0 : 900);
    });
  }

  /* ---------- nav ---------- */
  var nav = document.querySelector('.nav');
  if (nav) {
    var last = 0, ticking = false;
    function onScroll() {
      var y = window.scrollY || window.pageYOffset;
      nav.classList.toggle('is-stuck', y > 40);
      if (y > 560 && y > last + 6) nav.classList.add('is-hidden');
      else if (y < last - 6 || y < 300) nav.classList.remove('is-hidden');
      last = y;
      ticking = false;
      if (typeof sweep === 'function') sweep();
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
    }, { passive: true });
    onScroll();
  }

  /* ---------- drawer ---------- */
  var drawer = document.querySelector('.drawer');
  var burger = document.querySelector('.burger');
  var dclose = document.querySelector('.drawer__x');
  function setDrawer(open) {
    if (!drawer) return;
    drawer.classList.toggle('is-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
    if (burger) burger.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  if (burger) burger.addEventListener('click', function () { setDrawer(!drawer.classList.contains('is-open')); });
  if (dclose) dclose.addEventListener('click', function () { setDrawer(false); });
  if (drawer) drawer.addEventListener('click', function (e) { if (e.target.tagName === 'A') setDrawer(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setDrawer(false); });

  /* ---------- reveal ---------- */
  var rvSel = '[data-rv],[data-rv-x],.stag,.rv-lines';
  function observe(root) {
    var els = (root || document).querySelectorAll(rvSel);
    if (!els.length) return;
    if (reduce || !('IntersectionObserver' in window)) {
      Array.prototype.forEach.call(els, function (el) { el.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    Array.prototype.forEach.call(els, function (el) { io.observe(el); });
  }
  observe(document);

  /* Safety net: if the page laid out with a zero-height viewport (hidden tab,
     bfcache restore, embedded frame) the observer above never intersects.
     Sweep manually whenever the viewport is real again. */
  function sweep() {
    var vh = window.innerHeight;
    if (!vh) return;
    var els = document.querySelectorAll(rvSel);
    Array.prototype.forEach.call(els, function (el) {
      if (el.classList.contains('is-in')) return;
      var r = el.getBoundingClientRect();
      if (r.top < vh * 0.92 && r.bottom > 0) el.classList.add('is-in');
    });
  }
  window.addEventListener('load', sweep);
  window.addEventListener('pageshow', sweep);
  var swT;
  window.addEventListener('resize', function () {
    clearTimeout(swT); swT = setTimeout(sweep, 200);
  });

  /* ---------- counters ---------- */
  var nums = document.querySelectorAll('[data-count]');
  if (nums.length && !reduce && 'IntersectionObserver' in window) {
    var nio = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target, to = parseFloat(el.dataset.count), suf = el.dataset.suffix || '';
        var t0 = null, dur = 1600;
        function step(ts) {
          if (!t0) t0 = ts;
          var p = Math.min(1, (ts - t0) / dur);
          var e = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(to * e).toLocaleString('en-US') + suf;
          if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
        nio.unobserve(el);
      });
    }, { threshold: 0.5 });
    Array.prototype.forEach.call(nums, function (n) { nio.observe(n); });
  }

  /* ---------- catalog ---------- */
  var FA = { ring:'انگشتر', necklace:'گردنبند', earring:'گوشواره', bracelet:'دستبند',
             pendant:'آویز', set:'سرویس', gbracelet:'دستبند طلا', gnecklace:'گردنبند طلا',
             gring:'انگشتر طلا', gearring:'گوشواره طلا', watch:'ساعت' };

  function card(p) {
    var a = document.createElement('a');
    a.className = 'card';
    a.href = p.url; a.target = '_blank'; a.rel = 'noopener';
    a.setAttribute('aria-label', p.name);
    var tag = p.available
      ? '<span class="card__tag">' + (FA[p.cat] || '') + '</span>'
      : '<span class="card__tag card__tag--out">ناموجود</span>';
    var price = p.price
      ? '<span class="card__price">' + p.price + '<small>تومان</small></span>'
      : '<span class="card__price" style="color:var(--muted)">استعلام قیمت</span>';
    a.innerHTML =
      tag +
      '<div class="card__media"><img loading="lazy" decoding="async" src="assets/img/p/' + p.code + '.webp" alt="' + p.name + '"></div>' +
      '<div class="card__body">' +
        '<h3 class="card__name">' + p.name + '</h3>' +
        '<div class="card__meta">' + price + '<span class="card__code lat">' + p.code + '</span></div>' +
      '</div>';
    return a;
  }

  var mounts = document.querySelectorAll('[data-products]');
  if (mounts.length) {
    fetch('data/catalog.json')
      .then(function (r) { return r.json(); })
      .then(function (all) {
        var have = all.filter(function (p) { return p.img; });
        Array.prototype.forEach.call(mounts, function (mount) {
          var mode  = mount.dataset.products;           // 'featured' | 'all'
          var limit = parseInt(mount.dataset.limit || '0', 10);
          var list  = have.slice();

          if (mode === 'featured') {
            // priced + in-stock first, spread across categories
            var seen = {}, pick = [];
            var pool = list.filter(function (p) { return p.price && p.available; });
            pool.forEach(function (p) {
              seen[p.cat] = (seen[p.cat] || 0);
              if (seen[p.cat] < 2) { seen[p.cat]++; pick.push(p); }
            });
            list = pick.concat(pool.filter(function (p) { return pick.indexOf(p) === -1; }));
          }
          if (limit) list = list.slice(0, limit);

          var frag = document.createDocumentFragment();
          list.forEach(function (p) { frag.appendChild(card(p)); });
          mount.appendChild(frag);
          mount.classList.add('is-in');

          var out = document.querySelector('[data-count-out]');
          if (out && mode === 'all') out.textContent = list.length;

          buildFilters(mount, have);
        });
      })
      .catch(function () {
        Array.prototype.forEach.call(mounts, function (m) {
          m.innerHTML = '<p class="small">در حال حاضر امکان نمایش محصولات وجود ندارد.</p>';
        });
      });
  }

  function buildFilters(mount, all) {
    var bar = document.querySelector('[data-filter-for="' + mount.id + '"]');
    if (!bar) return;
    var cats = [];
    all.forEach(function (p) { if (cats.indexOf(p.cat) === -1) cats.push(p.cat); });

    function chip(key, label) {
      var b = document.createElement('button');
      b.className = 'chip'; b.dataset.cat = key; b.textContent = label;
      b.addEventListener('click', function () {
        Array.prototype.forEach.call(bar.children, function (c) { c.classList.remove('is-on'); });
        b.classList.add('is-on');
        var n = 0;
        Array.prototype.forEach.call(mount.children, function (el, i) {
          var p = all[i];
          var show = key === 'all' || (p && p.cat === key);
          el.style.display = show ? '' : 'none';
          if (show) n++;
        });
        var out = document.querySelector('[data-count-out]');
        if (out) out.textContent = n;
      });
      return b;
    }
    var first = chip('all', 'همه');
    first.classList.add('is-on');
    bar.appendChild(first);
    cats.forEach(function (c) { bar.appendChild(chip(c, FA[c] || c)); });
  }

  /* ---------- smooth anchors ---------- */
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href');
    if (id === '#' || id.length < 2) return;
    var el = document.querySelector(id);
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  });

  /* ---------- year ---------- */
  var y = document.querySelector('[data-year]');
  if (y) y.textContent = new Date().getFullYear();
})();
