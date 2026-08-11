/* ==========================================================================
   SERPENT — scroll-driven 3D product sequence
   Canvas frame-scrubbing + drag-to-spin with momentum.
   ========================================================================== */
(function () {
  'use strict';

  var stage = document.querySelector('[data-serpent]');
  if (!stage) return;

  var track   = stage.closest('.serpent').querySelector('.serpent__track') || stage.parentElement;
  var canvas  = stage.querySelector('.serpent__canvas');
  var glow    = stage.querySelector('.serpent__glow');
  var spine   = stage.querySelector('.spine__fill');
  var loadEl  = stage.querySelector('.serpent__load');
  var loadBar = stage.querySelector('.serpent__bar span');
  var hint    = stage.querySelector('.drag-hint');
  var beats   = Array.prototype.slice.call(stage.querySelectorAll('.beat'));
  var hots    = Array.prototype.slice.call(stage.querySelectorAll('.hot'));
  var ctx     = canvas.getContext('2d', { alpha: false });

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var small  = window.matchMedia('(max-width: 820px)').matches;

  var SET   = small ? 'sm' : 'lg';
  var COUNT = small ? 60 : 120;
  var SIZE  = small ? 540 : 880;
  var PATH  = 'assets/frames/' + SET + '/';

  var frames = new Array(COUNT);
  var loaded = 0;
  var ready  = false;
  var lastDrawn = -1;

  /* ---------- canvas sizing ---------- */
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  function size() {
    var r = canvas.getBoundingClientRect();
    if (r.width < 2) return;                 // layout not settled yet
    var w = Math.round(r.width);
    var px = Math.round(w * dpr);
    if (px === canvas.width) return;
    canvas.width  = px;
    canvas.height = px;
    lastDrawn = -1;
    draw(true);
  }
  // the canvas can gain its real size long after script execution
  // (bfcache restore, late font/layout, hidden tab, embedded frame)
  if ('ResizeObserver' in window) {
    new ResizeObserver(function () { size(); }).observe(canvas);
  }

  /* ---------- loading (sparse first, then fill) ---------- */
  function pad(n) { return String(n).padStart(3, '0'); }

  function load(i) {
    return new Promise(function (res) {
      if (frames[i]) return res();
      var img = new Image();
      img.decoding = 'async';
      img.onload = function () {
        frames[i] = img;
        loaded++;
        if (loadBar) loadBar.style.width = Math.round((loaded / COUNT) * 100) + '%';
        res();
      };
      img.onerror = function () { loaded++; res(); };
      img.src = PATH + pad(i) + '.webp';
    });
  }

  function chunk(list, n, cb) {
    var i = 0;
    function next() {
      if (i >= list.length) return cb && cb();
      var slice = list.slice(i, i + n);
      i += n;
      Promise.all(slice.map(load)).then(function () {
        lastDrawn = -1; draw(true);
        next();
      });
    }
    next();
  }

  function boot() {
    // pass 1 — every 8th frame so the section is usable almost immediately
    var pass1 = [], pass2 = [], i;
    for (i = 0; i < COUNT; i += 8) pass1.push(i);
    for (i = 0; i < COUNT; i++) if (pass1.indexOf(i) === -1) pass2.push(i);

    chunk(pass1, 4, function () {
      ready = true;
      stage.classList.add('is-ready');
      draw(true);
      chunk(pass2, 6, function () {
        if (loadEl) loadEl.classList.add('is-done');
      });
    });
  }

  /* ---------- nearest available frame ---------- */
  function nearest(i) {
    if (frames[i]) return frames[i];
    for (var d = 1; d < COUNT; d++) {
      if (frames[i - d]) return frames[i - d];
      if (frames[i + d]) return frames[i + d];
    }
    return null;
  }

  /* ---------- state ---------- */
  var prog = 0;        // 0..1 from scroll
  var drag = 0;        // frame offset from user drag
  var dragV = 0;       // velocity
  var dragging = false;
  var px = 0;
  var hinted = false;

  function scrollProg() {
    var r = track.getBoundingClientRect();
    var vh = window.innerHeight;
    var total = r.height - vh;
    if (total <= 0) return 0;
    return Math.min(1, Math.max(0, -r.top / total));
  }

  /* ---------- draw ---------- */
  function draw(force) {
    var base = prog * (COUNT - 1);
    var idx = Math.round(base + drag);
    idx = ((idx % COUNT) + COUNT) % COUNT;

    if (idx !== lastDrawn || force) {
      var img = nearest(idx);
      if (img) {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        lastDrawn = idx;
      }
    }

    // glow follows the rotation — drifts and breathes
    if (glow) {
      var a = (idx / COUNT) * Math.PI * 2;
      var tx = Math.cos(a) * 7;
      var ty = Math.sin(a * 1.6) * 5;
      var sc = 0.9 + Math.sin(a) * 0.09;
      glow.style.transform = 'translate(' + tx + '%,' + ty + '%) scale(' + sc.toFixed(3) + ')';
      glow.style.opacity = (0.55 + Math.sin(a * 2) * 0.2).toFixed(3);
    }

    if (spine) spine.style.height = (prog * 100).toFixed(2) + '%';
  }

  /* ---------- beats + hotspots ---------- */
  /* anchors[i] = [eyeX,eyeY, midX,midY, farX,farY] normalised to the frame */
  var anchors = null;
  var ANCHOR_IX = { eye: 0, mid: 2, far: 4 };
  fetch('data/anchors.json')
    .then(function (r) { return r.json(); })
    .then(function (a) { anchors = a; })
    .catch(function () { /* hotspots simply stay hidden */ });

  function placeHots(idx) {
    if (!anchors) return;
    // anchors were measured on the 120-frame set; map if we're on the 60-frame one
    var a = anchors[Math.min(anchors.length - 1, Math.round(idx * (anchors.length - 1) / (COUNT - 1)))];
    if (!a) return;
    hots.forEach(function (h) {
      var o = ANCHOR_IX[h.dataset.anchor];
      if (o === undefined) return;
      var x = a[o], y = a[o + 1];
      h.style.left = (x * 100).toFixed(2) + '%';
      h.style.top  = (y * 100).toFixed(2) + '%';
      h.dataset.side = x > 0.58 ? 'left' : 'right';
    });
  }

  function phases() {
    beats.forEach(function (b) {
      var from = parseFloat(b.dataset.from);
      var to   = parseFloat(b.dataset.to);
      b.classList.toggle('is-on', prog >= from && prog < to);
    });
    var anyHot = false;
    hots.forEach(function (h) {
      var from = parseFloat(h.dataset.from);
      var to   = parseFloat(h.dataset.to);
      var on = prog >= from && prog < to;
      h.classList.toggle('is-on', on);
      if (on) anyHot = true;
    });
    if (anyHot) placeHots(lastDrawn < 0 ? 0 : lastDrawn);
    if (hint) hint.classList.toggle('is-on', prog > 0.06 && prog < 0.3 && !hinted);
  }

  /* ---------- drag to spin ---------- */
  function down(x) {
    dragging = true; px = x; dragV = 0;
    hinted = true;
    canvas.setAttribute('data-grab', '');
  }
  function move(x) {
    if (!dragging) return;
    var dx = x - px; px = x;
    // RTL-natural: drag left → forward
    var d = -dx * (COUNT / (canvas.clientWidth || 600)) * 1.6;
    drag += d; dragV = d;
  }
  function up() {
    if (!dragging) return;
    dragging = false;
    canvas.removeAttribute('data-grab');
  }

  canvas.addEventListener('mousedown', function (e) { e.preventDefault(); down(e.clientX); });
  window.addEventListener('mousemove', function (e) { move(e.clientX); });
  window.addEventListener('mouseup', up);
  canvas.addEventListener('touchstart', function (e) { down(e.touches[0].clientX); }, { passive: true });
  canvas.addEventListener('touchmove', function (e) {
    if (!dragging) return;
    var t = e.touches[0];
    // only hijack when the gesture is mostly horizontal — vertical stays scroll
    move(t.clientX);
  }, { passive: true });
  canvas.addEventListener('touchend', up);
  canvas.addEventListener('touchcancel', up);

  /* ---------- loop ---------- */
  var raf = null;
  var visible = false;

  function update(settle) {
    prog = scrollProg();

    if (settle && !dragging) {
      // momentum, then ease the manual offset back to the scroll-truth pose
      dragV *= 0.93;
      if (Math.abs(dragV) > 0.02) drag += dragV; else dragV = 0;
      drag *= 0.92;
      if (Math.abs(drag) < 0.02) drag = 0;
    }

    draw(false);
    phases();
  }

  function tick() { update(true); raf = requestAnimationFrame(tick); }

  function start() { if (!raf) raf = requestAnimationFrame(tick); }
  function stop() { if (raf) { cancelAnimationFrame(raf); raf = null; } }

  /* Paint on scroll as well as in the rAF loop. Guarantees a correct frame when
     the user lands mid-section (refresh at offset, back-navigation, deep link)
     or when rAF is throttled by the browser. */
  var pending = false;
  window.addEventListener('scroll', function () {
    if (pending) return;
    pending = true;
    requestAnimationFrame(function () { pending = false; });
    update(false);
  }, { passive: true });

  var io = new IntersectionObserver(function (es) {
    visible = es[0].isIntersecting;
    if (visible) start(); else stop();
  }, { rootMargin: '120px' });
  io.observe(stage);

  var rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      var nowSmall = window.matchMedia('(max-width: 820px)').matches;
      size();
      if (nowSmall !== small) location.reload();
    }, 220);
  });

  /* ---------- go ---------- */
  size();
  if (reduce) {
    // static: single representative frame, no scrubbing
    load(Math.round(COUNT * 0.42)).then(function () {
      lastDrawn = -1;
      prog = 0.42; draw(true);
      beats.forEach(function (b) { b.classList.add('is-on'); });
      if (loadEl) loadEl.classList.add('is-done');
    });
    return;
  }
  boot();
  start();
})();
