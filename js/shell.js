/* ==========================================================================
   ALIPOUR — app shell
   The iOS-style tab bar, and the local stores behind the bag and the account.
   There is no backend: this is a pitch build, so state lives in localStorage
   and every "order" ends with a client advisor rather than a card charge.
   ========================================================================== */
window.ALP = window.ALP || {};

(function (A) {
  'use strict';

  /* ---------- tiny spring, for the tab pill ---------- */
  function Spring(apply) {
    this.x = 0; this.v = 0; this.target = 0;
    this.resp = 0.34; this.damp = 0.82; this.apply = apply; this.raf = 0;
  }
  Spring.prototype.set = function (x) {
    if (this.raf) { cancelAnimationFrame(this.raf); this.raf = 0; }
    this.x = x; this.v = 0; this.apply(x);
  };
  Spring.prototype.to = function (t) {
    this.target = t;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { this.set(t); return; }
    if (this.raf) return;
    var self = this, last = 0;
    this.raf = requestAnimationFrame(function step(ts) {
      if (!last) last = ts;
      var dt = Math.min(0.032, (ts - last) / 1000); last = ts;
      var k = (6.28318 / self.resp), d = 2 * self.damp * k;
      var a = k * k * (self.target - self.x) - d * self.v;
      self.v += a * dt; self.x += self.v * dt;
      self.apply(self.x);
      if (Math.abs(self.target - self.x) < 0.4 && Math.abs(self.v) < 0.4) {
        self.x = self.target; self.v = 0; self.apply(self.x); self.raf = 0; return;
      }
      self.raf = requestAnimationFrame(step);
    });
  };
  A.Spring = Spring;

  /* ---------- icons ---------- */
  var ICON = {
    home: '<path d="M3.6 10.4 12 3.8l8.4 6.6"/><path d="M5.6 9.2V20h12.8V9.2"/><path d="M9.8 20v-5.4h4.4V20"/>',
    gem:  '<path d="M7.2 3.6h9.6L21 9.2 12 20.6 3 9.2z"/><path d="M3 9.2h18"/><path d="M9.4 9.2 12 20.6l2.6-11.4"/><path d="m7.2 3.6 2.2 5.6M16.8 3.6l-2.2 5.6"/>',
    book: '<path d="M4.4 4.6h6.2a2.4 2.4 0 0 1 2.4 2.4v12a1.8 1.8 0 0 0-1.8-1.8H4.4z"/><path d="M19.6 4.6h-6.2A2.4 2.4 0 0 0 11 7v12a1.8 1.8 0 0 1 1.8-1.8h6.8z"/>',
    bag:  '<path d="M6 8h12l-1 12H7z"/><path d="M9.2 8V6.4a2.8 2.8 0 0 1 5.6 0V8"/>',
    user: '<circle cx="12" cy="8.4" r="3.6"/><path d="M4.8 20.2a7.2 7.2 0 0 1 14.4 0"/>'
  };
  function icon(n) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true" stroke-linecap="round" ' +
           'stroke-linejoin="round">' + (ICON[n] || '') + '</svg>';
  }
  A.icon = icon;

  var TABS = [
    { id: 'home',    href: 'index.html',    icon: 'home', fa: 'خانه' },
    { id: 'pieces',  href: 'products.html', icon: 'gem',  fa: 'جواهرات' },
    { id: 'journal', href: 'blog.html',     icon: 'book', fa: 'روایت‌ها' },
    { id: 'bag',     href: 'bag.html',      icon: 'bag',  fa: 'سبد', badge: true },
    { id: 'account', href: 'account.html',  icon: 'user', fa: 'حساب' }
  ];

  /* ---------- store ---------- */
  var BAG_KEY = 'alipour.bag.v1';
  var USER_KEY = 'alipour.user.v1';
  var SAVE_KEY = 'alipour.saved.v1';

  function read(k, fallback) {
    try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; }
    catch (e) { return fallback; }
  }
  function write(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {}
    document.dispatchEvent(new CustomEvent('alp:store', { detail: { key: k } }));
  }

  var Store = {
    bag:  function () { return read(BAG_KEY, []); },
    saved:function () { return read(SAVE_KEY, []); },
    user: function () { return read(USER_KEY, null); },

    bagCount: function () {
      return Store.bag().reduce(function (n, i) { return n + (i.qty || 1); }, 0);
    },
    add: function (item) {
      var b = Store.bag();
      var hit = null;
      b.forEach(function (i) { if (i.code === item.code) hit = i; });
      if (hit) hit.qty = (hit.qty || 1) + 1;
      else b.push({ code: item.code, name: item.name, cat: item.cat || '',
                    price: item.price || null, url: item.url || '', qty: 1 });
      write(BAG_KEY, b);
      return Store.bagCount();
    },
    setQty: function (code, qty) {
      var b = Store.bag().map(function (i) {
        if (i.code === code) i.qty = Math.max(0, qty);
        return i;
      }).filter(function (i) { return i.qty > 0; });
      write(BAG_KEY, b);
    },
    remove: function (code) {
      write(BAG_KEY, Store.bag().filter(function (i) { return i.code !== code; }));
    },
    clearBag: function () { write(BAG_KEY, []); },

    toggleSaved: function (item) {
      var s = Store.saved();
      var has = s.some(function (i) { return i.code === item.code; });
      s = has ? s.filter(function (i) { return i.code !== item.code; })
              : s.concat([{ code: item.code, name: item.name, cat: item.cat || '', url: item.url || '' }]);
      write(SAVE_KEY, s);
      return !has;
    },
    isSaved: function (code) {
      return Store.saved().some(function (i) { return i.code === code; });
    },

    signIn: function (u) {
      write(USER_KEY, {
        name: u.name || '', phone: u.phone || '', email: u.email || '',
        since: u.since || new Date().toISOString(),
        appointments: u.appointments || [], orders: u.orders || []
      });
    },
    signOut: function () { write(USER_KEY, null); }
  };
  A.Store = Store;

  /* ---------- money ---------- */
  A.toman = function (n) {
    if (n == null || n === '') return '—';
    var s = String(n).replace(/[^\d]/g, '');
    if (!s) return '—';
    return s.replace(/\B(?=(\d{3})+(?!\d))/g, '٬');   // Persian thousands mark
  };

  /* ---------- tab bar ---------- */
  function currentTab() {
    var f = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    if (!f || f === '') f = 'index.html';
    for (var i = 0; i < TABS.length; i++) {
      if (TABS[i].href.toLowerCase() === f) return TABS[i].id;
    }
    if (f.indexOf('blog') === 0) return 'journal';
    return 'home';
  }

  function buildTabs() {
    var bar = document.querySelector('.tabbar');
    if (!bar) return;
    var cur = currentTab();
    bar.innerHTML = '<span class="tabbar__pill" aria-hidden="true"></span>' +
      TABS.map(function (t) {
        return '<a class="tab" href="' + t.href + '" data-tab="' + t.id + '"' +
          (t.id === cur ? ' aria-current="page"' : '') + '>' + icon(t.icon) +
          (t.badge ? '<i class="tab__badge" data-bag-badge>0</i>' : '') +
          '<span>' + t.fa + '</span></a>';
      }).join('');

    var pill = bar.querySelector('.tabbar__pill');
    var spring = new Spring(function (x) { pill.style.transform = 'translateX(' + x + 'px)'; });

    function place(animate) {
      var el = bar.querySelector('.tab[aria-current="page"]');
      if (!el) { pill.style.opacity = '0'; return; }
      pill.style.opacity = '1';
      pill.style.width = el.offsetWidth + 'px';
      if (animate) spring.to(el.offsetLeft - 5); else spring.set(el.offsetLeft - 5);
    }
    // fonts change tab widths, so place again once they have landed
    place(false);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { place(false); });
    window.addEventListener('resize', function () { place(false); });

    /* press feedback that survives the navigation */
    bar.addEventListener('click', function (e) {
      var t = e.target.closest && e.target.closest('.tab');
      if (!t) return;
      bar.querySelectorAll('.tab').forEach(function (x) { x.removeAttribute('aria-current'); });
      t.setAttribute('aria-current', 'page');
      place(true);
    });

    syncBadge();
  }

  function syncBadge() {
    var n = Store.bagCount();
    document.querySelectorAll('[data-bag-badge]').forEach(function (b) {
      b.textContent = n > 99 ? '۹۹+' : String(n);
      b.classList.toggle('on', n > 0);
    });
  }
  A.syncBadge = syncBadge;

  document.addEventListener('alp:store', syncBadge);
  window.addEventListener('pageshow', syncBadge);
  window.addEventListener('storage', syncBadge);

  /* ---------- toast ---------- */
  A.toast = function (msg) {
    var t = document.querySelector('.toast');
    if (!t) {
      t = document.createElement('div');
      t.className = 'toast'; t.setAttribute('role', 'status');
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('on');
    clearTimeout(t._h);
    t._h = setTimeout(function () { t.classList.remove('on'); }, 2400);
  };

  /* ---------- add to bag / save, from anywhere ---------- */
  document.addEventListener('click', function (e) {
    var add = e.target.closest && e.target.closest('[data-add]');
    if (add) {
      e.preventDefault();
      Store.add({
        code: add.dataset.add, name: add.dataset.name || '',
        cat: add.dataset.cat || '', price: add.dataset.price || null,
        url: add.dataset.url || ''
      });
      A.toast('به سبد افزوده شد');
      return;
    }
    var sv = e.target.closest && e.target.closest('[data-save]');
    if (sv) {
      e.preventDefault();
      var on = Store.toggleSaved({
        code: sv.dataset.save, name: sv.dataset.name || '',
        cat: sv.dataset.cat || '', url: sv.dataset.url || ''
      });
      sv.classList.toggle('on', on);
      sv.setAttribute('aria-pressed', on ? 'true' : 'false');
      A.toast(on ? 'به علاقه‌مندی‌ها افزوده شد' : 'از علاقه‌مندی‌ها حذف شد');
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildTabs);
  } else buildTabs();
})(window.ALP);

/* ==========================================================================
   BAG + ACCOUNT views
   Mounted only where their placeholders exist.
   ========================================================================== */
(function (A) {
  'use strict';
  var Store = A.Store, toman = A.toman;
  var COPY = null;

  function load() {
    return fetch('data/content.json').then(function (r) { return r.json(); });
  }

  /* ---------------- bag ---------------- */
  function renderBag(mount, ui) {
    var B = ui.bag, items = Store.bag();

    if (!items.length) {
      mount.innerHTML =
        '<div class="empty">' + A.icon('bag') +
        '<h2 class="d2">' + B.emptyTitle + '</h2>' +
        '<p>' + B.emptyBody + '</p>' +
        '<a class="btn" href="products.html">' + B.emptyCta + '</a></div>';
      var sv = document.querySelector('.empty svg');
      if (sv) { sv.style.width = '58px'; sv.style.height = '58px'; }
      return;
    }

    var total = items.reduce(function (s, i) {
      var n = parseInt(String(i.price || '').replace(/[^\d]/g, ''), 10) || 0;
      return s + n * (i.qty || 1);
    }, 0);
    var count = Store.bagCount();

    mount.innerHTML =
      '<div class="lines">' + items.map(function (i) {
        return '<div class="line" data-code="' + i.code + '">' +
          '<span class="line__m"><img src="assets/img/p/' + i.code + '.webp" alt=""></span>' +
          '<div><div class="line__n">' + i.name + '</div>' +
            '<div class="line__s">' + (i.cat || '') + ' — کد ' + i.code + '</div>' +
            (i.price ? '<div class="line__p">' + toman(i.price) + ' تومان</div>' : '') +
          '</div>' +
          '<div><span class="qty">' +
            '<button data-q="-" aria-label="کاهش">−</button><b>' + (i.qty || 1) + '</b>' +
            '<button data-q="+" aria-label="افزایش">+</button></span> ' +
            '<button class="iconbtn" data-rm aria-label="حذف" style="margin-inline-start:8px">' +
            '<svg viewBox="0 0 24 24" stroke-linecap="round"><path d="M6 7h12M10 7V5.6h4V7M8.4 7l.7 12h5.8l.7-12"/></svg>' +
            '</button></div>' +
        '</div>';
      }).join('') + '</div>' +

      '<div class="sum">' +
        '<div><span>' + (B.summaryLabels[0] || 'تعداد قطعه') + '</span><span>' + count + '</span></div>' +
        '<div><span>جمع اقلام</span><span>' + (total ? toman(total) + ' تومان' : 'استعلام') + '</span></div>' +
        '<div><span>' + (B.summaryLabels[3] || 'بسته‌بندی و بیمهٔ ارسال') + '</span><span>رایگان</span></div>' +
        '<div><span>' + (B.summaryLabels[4] || 'مبلغ قابل‌پرداخت') + '</span><span>' +
          (total ? toman(total) + ' تومان' : 'استعلام') + '</span></div>' +
      '</div>' +

      '<p class="form-note" style="margin-top:22px;max-width:60ch">' + B.checkoutNote + '</p>' +
      '<div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:26px">' +
        '<button class="btn" data-checkout>' + B.checkoutCta + '</button>' +
        '<a class="btn btn--ghost" href="products.html">ادامهٔ انتخاب</a>' +
      '</div>';
  }

  function bindBag(mount, ui) {
    mount.addEventListener('click', function (e) {
      var line = e.target.closest && e.target.closest('.line');
      if (line) {
        var code = line.dataset.code;
        var q = e.target.closest('[data-q]');
        if (q) {
          var cur = parseInt(line.querySelector('.qty b').textContent, 10) || 1;
          Store.setQty(code, q.dataset.q === '+' ? cur + 1 : cur - 1);
          renderBag(mount, ui); return;
        }
        if (e.target.closest('[data-rm]')) { Store.remove(code); renderBag(mount, ui); return; }
      }
      if (e.target.closest('[data-checkout]')) {
        var u = Store.user();
        if (!u) { A.toast('برای ثبت سفارش وارد شوید'); location.href = 'account.html'; return; }
        var orders = (u.orders || []).concat([{
          at: new Date().toISOString(),
          items: Store.bag().map(function (i) { return { code: i.code, name: i.name, qty: i.qty }; })
        }]);
        u.orders = orders; Store.signIn(u); Store.clearBag();
        A.toast('سفارش ثبت شد — مشاور شما تماس می‌گیرد');
        renderBag(mount, ui);
      }
    });
  }

  /* ---------------- account ---------------- */
  function renderAccount(mount, ui) {
    var A_ = ui.account, u = Store.user();
    if (!u) return;                     // signed-out markup is already in the page

    var saved = Store.saved();
    function panel(id, title, empty, inner) {
      return '<section class="acct__sec"><h2 class="acct__t">' + title + '</h2>' +
        (inner || '<p class="dim" style="font-size:14px">' + empty + '</p>') + '</section>';
    }
    var savedHtml = saved.length
      ? '<div class="plates">' + saved.map(function (s) {
          return '<a class="pl" href="' + (s.url || '#') + '" target="_blank" rel="noopener">' +
            '<span class="pl__m"><img loading="lazy" src="assets/img/p/' + s.code + '.webp" alt=""></span>' +
            '<span class="pl__b"><span class="pl__n">' + s.name + '</span>' +
            '<span class="pl__s">کد ' + s.code + '</span></span></a>';
        }).join('') + '</div>'
      : null;
    var ordersHtml = (u.orders && u.orders.length)
      ? '<div class="idx">' + u.orders.slice().reverse().map(function (o, i) {
          var n = o.items.reduce(function (s, x) { return s + (x.qty || 1); }, 0);
          return '<a href="#"><span class="idx__n">سفارش ' + (u.orders.length - i) + '</span>' +
            '<span class="idx__c">' + n + ' قطعه</span></a>';
        }).join('') + '</div>'
      : null;

    mount.innerHTML =
      '<div class="acct__hi">' +
        '<div><span class="kick">خوش آمدید</span><h2 class="d2">' + (u.name || 'مشتری گرامی') + '</h2>' +
          '<p class="micro faint" style="margin-top:10px">' + (u.phone || '') + '</p></div>' +
        '<button class="btn btn--ghost" data-signout>خروج</button>' +
      '</div>' +
      panel('saved', A_.sections[0].title, A_.sections[0].empty, savedHtml) +
      panel('appt',  A_.sections[1].title, A_.sections[1].empty, null) +
      panel('orders', A_.sections[2].title, A_.sections[2].empty, ordersHtml) +
      panel('certs', A_.sections[3].title, A_.sections[3].empty, null) +
      panel('details', A_.sections[4].title, '',
        '<div class="facts" style="border-top:1px solid var(--hair)">' +
          '<div><b>' + (u.name || '—') + '</b><span class="micro faint">نام</span></div>' +
          '<div><b>' + (u.phone || '—') + '</b><span class="micro faint">همراه</span></div>' +
          '<div><b><span class="lat">' + (u.email || '—') + '</span></b><span class="micro faint">ایمیل</span></div>' +
        '</div>');
  }

  function bindAccount(mount, ui) {
    var form = mount.querySelector('[data-auth]');
    if (form) {
      var seg = form.querySelector('.seg');
      seg.addEventListener('click', function (e) {
        var b = e.target.closest('button'); if (!b) return;
        seg.querySelectorAll('button').forEach(function (x) { x.classList.remove('on'); });
        b.classList.add('on');
        var up = b.dataset.mode === 'up';
        form.querySelector('button[type=submit]').textContent =
          up ? mount.dataset.register : mount.dataset.signin;
        form.querySelectorAll('.field').forEach(function (f, i) {
          f.style.display = (!up && i > 1 && i !== 3) ? 'none' : '';
        });
      });
      // sign-in shows only name + mobile + password
      form.querySelectorAll('.field').forEach(function (f, i) {
        if (i > 1 && i !== 3) f.style.display = 'none';
      });

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var d = {};
        form.querySelectorAll('input').forEach(function (i) { d[i.name] = i.value.trim(); });
        if (!d.fullName || !d.mobile) { A.toast('نام و شمارهٔ همراه لازم است'); return; }
        Store.signIn({ name: d.fullName, phone: d.mobile, email: d.email || '' });
        A.toast('خوش آمدید');
        renderAccount(mount, ui);
      });
    }
    mount.addEventListener('click', function (e) {
      if (e.target.closest('[data-signout]')) {
        Store.signOut(); A.toast('از حساب خارج شدید'); location.reload();
      }
    });
  }

  function boot() {
    var bag = document.querySelector('[data-bag-mount]');
    var acc = document.querySelector('[data-account-mount]');
    if (!bag && !acc) return;
    load().then(function (c) {
      COPY = c.ui;
      if (bag) { renderBag(bag, COPY); bindBag(bag, COPY); }
      if (acc) { bindAccount(acc, COPY); renderAccount(acc, COPY); }
    }).catch(function () {
      if (bag) bag.innerHTML = '<p class="dim">در حال حاضر امکان نمایش سبد وجود ندارد.</p>';
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window.ALP);
