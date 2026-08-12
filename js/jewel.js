/* ==========================================================================
   THE JEWEL — scroll-driven product sequence (hero)
   Transparent RGBA frames scrubbed on canvas + drag-to-spin.
   ========================================================================== */
(function () {
  'use strict';

  var pin = document.querySelector('[data-jewel]');
  if (!pin) return;

  var track  = pin.parentElement;
  var canvas = pin.querySelector('.jewel__canvas');
  var rule   = pin.querySelector('.jewel__rule i');
  var hint   = pin.querySelector('.jewel__hint');
  var beats  = Array.prototype.slice.call(pin.querySelectorAll('.beat'));
  var ctx    = canvas.getContext('2d');           // alpha kept — frames are keyed

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var small  = window.matchMedia('(max-width: 900px)').matches;

  var SET   = small ? 'sm' : 'lg';
  var COUNT = small ? 60 : 120;
  var PATH  = 'assets/frames/' + SET + '/';
  var RATIO = 721 / 820;                          // frames are cropped, not square

  var frames = new Array(COUNT);
  var loaded = 0;
  var lastDrawn = -1;

  /* ---------- sizing ---------- */
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  function size() {
    var r = canvas.getBoundingClientRect();
    if (r.width < 2) return;
    var w = Math.round(r.width * dpr);
    var h = Math.round(r.height * dpr);
    if (w === canvas.width && h === canvas.height) return;
    canvas.width = w; canvas.height = h;
    lastDrawn = -1;
    draw(true);
  }
  if ('ResizeObserver' in window) new ResizeObserver(size).observe(canvas);

  /* ---------- loading ---------- */
  function load(i) {
    return new Promise(function (res) {
      if (frames[i]) return res();
      var img = new Image();
      img.decoding = 'async';
      img.onload = function () { frames[i] = img; loaded++; res(); };
      img.onerror = function () { loaded++; res(); };
      img.src = PATH + String(i).padStart(3, '0') + '.webp';
    });
  }
  function chunk(list, n, done) {
    var i = 0;
    (function next() {
      if (i >= list.length) return done && done();
      var s = list.slice(i, i + n); i += n;
      Promise.all(s.map(load)).then(function () { lastDrawn = -1; draw(true); next(); });
    })();
  }
  function boot() {
    var a = [], b = [], i;
    for (i = 0; i < COUNT; i += 8) a.push(i);
    for (i = 0; i < COUNT; i++) if (a.indexOf(i) === -1) b.push(i);
    chunk(a, 4, function () { pin.classList.add('ready'); draw(true); chunk(b, 6); });
  }

  function nearest(i) {
    if (frames[i]) return frames[i];
    for (var d = 1; d < COUNT; d++) {
      if (frames[i - d]) return frames[i - d];
      if (frames[i + d]) return frames[i + d];
    }
    return null;
  }

  /* ---------- state ---------- */
  var prog = 0, drag = 0, dragV = 0, dragging = false, px = 0, hinted = false;

  function scrollProg() {
    var r = track.getBoundingClientRect();
    var total = r.height - window.innerHeight;
    if (total <= 0) return 0;
    return Math.min(1, Math.max(0, -r.top / total));
  }

  function draw(force) {
    var idx = Math.round(prog * (COUNT - 1) + drag);
    idx = ((idx % COUNT) + COUNT) % COUNT;
    if (idx === lastDrawn && !force) return;
    var img = nearest(idx);
    if (!img) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    lastDrawn = idx;
  }

  function phases() {
    beats.forEach(function (b) {
      b.classList.toggle('on', prog >= +b.dataset.from && prog < +b.dataset.to);
    });
    if (rule) rule.style.width = (prog * 100).toFixed(2) + '%';
    if (hint) hint.classList.toggle('on', prog < 0.16 && !hinted);
  }

  /* ---------- drag to spin ---------- */
  function down(x) { dragging = true; px = x; dragV = 0; hinted = true; canvas.setAttribute('data-grab',''); }
  function move(x) {
    if (!dragging) return;
    var d = -(x - px) * (COUNT / (canvas.clientWidth || 600)) * 1.6;
    px = x; drag += d; dragV = d;
  }
  function up() { dragging = false; canvas.removeAttribute('data-grab'); }

  canvas.addEventListener('mousedown', function (e) { e.preventDefault(); down(e.clientX); });
  window.addEventListener('mousemove', function (e) { move(e.clientX); });
  window.addEventListener('mouseup', up);
  canvas.addEventListener('touchstart', function (e) { down(e.touches[0].clientX); }, { passive: true });
  canvas.addEventListener('touchmove', function (e) { move(e.touches[0].clientX); }, { passive: true });
  canvas.addEventListener('touchend', up);
  canvas.addEventListener('touchcancel', up);

  /* ---------- loop ---------- */
  var raf = null;
  function update(settle) {
    prog = scrollProg();
    if (settle && !dragging) {
      dragV *= 0.93;
      if (Math.abs(dragV) > 0.02) drag += dragV; else dragV = 0;
      drag *= 0.92;
      if (Math.abs(drag) < 0.02) drag = 0;
    }
    draw(false); phases();
  }
  function tick() { update(true); raf = requestAnimationFrame(tick); }
  function start() { if (!raf) raf = requestAnimationFrame(tick); }
  function stop() { if (raf) { cancelAnimationFrame(raf); raf = null; } }

  /* paint on scroll too, so landing mid-section is always correct */
  var pending = false;
  window.addEventListener('scroll', function () {
    if (pending) return;
    pending = true; requestAnimationFrame(function () { pending = false; });
    update(false);
  }, { passive: true });

  new IntersectionObserver(function (es) {
    if (es[0].isIntersecting) start(); else stop();
  }, { rootMargin: '120px' }).observe(pin);

  var rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      size();
      if (window.matchMedia('(max-width: 900px)').matches !== small) location.reload();
    }, 220);
  });

  /* ---------- go ---------- */
  size();
  if (reduce) {
    load(Math.round(COUNT * 0.4)).then(function () {
      prog = 0.4; lastDrawn = -1; draw(true);
      pin.classList.add('ready');
      beats.forEach(function (b, i) { b.classList.toggle('on', i === 0); });
    });
    return;
  }
  boot();
  start();
})();
