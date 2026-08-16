/* ==========================================================================
   THE JEWEL — the hero sequence
   The arc is played BACKWARDS (frame 119 → 12): the serpent uncoils out of a
   sculptural profile and turns to face the viewer, so the last thing on screen
   before the hero releases is the frontal diamond head with both emeralds.
   Played forwards it spends the whole scroll travelling away from the best
   angle, which is what made it feel broken.

   Also here: constant-speed playback through the measured motion curve,
   per-frame grounding (contact + cast shadow sized from the real footprint),
   an on-object relight because the renders ship with flat frontal light,
   and a light pool that tracks the rotation.
   ========================================================================== */
(function () {
  'use strict';

  var pin = document.querySelector('[data-jewel]');
  if (!pin) return;

  var track   = pin.parentElement;
  var canvas  = pin.querySelector('.jewel__canvas');
  var jewel   = pin.querySelector('.jewel');
  var plate   = pin.querySelector('.plate__light');
  var contact = pin.querySelector('.shade--contact');
  var cast    = pin.querySelector('.shade--cast');
  var beats   = Array.prototype.slice.call(pin.querySelectorAll('.beat'));
  var ctx     = canvas.getContext('2d');

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var small  = window.matchMedia('(max-width: 900px)').matches;

  var SET   = small ? 'sm' : 'lg';
  var PATH  = 'assets/frames/' + SET + '/';
  var COUNT = small ? 60 : 120;
  var LAST  = COUNT - 1;

  /* the arc, in frame numbers of the desktop set */
  var START = LAST;          // sculptural profile
  var END   = 12;            // frontal head, both emeralds

  var frames = new Array(COUNT);
  var curve = null, bbox = null;
  var lastKey = '';

  fetch('data/motion.json').then(function (r) { return r.json(); }).then(function (m) {
    var c = m.curve, b = m.bbox;
    if (small && c) { var o = []; for (var i = 0; i < c.length; i += 2) o.push(c[i]); c = o; }
    if (small && b) { var p = []; for (var j = 0; j < b.length; j += 2) p.push(b[j]); b = p; }
    if (c) {
      var span = c[c.length - 1] - c[0];
      curve = span > 0 ? c.map(function (v) { return (v - c[0]) / span; }) : null;
    }
    bbox = b || null;
    recalcArc();
    lastKey = ''; update(false);
  }).catch(function () {});

  /* frame index for a point along the *visual* arc, so equal travel is
     equal rotation rather than equal file count */
  function frameAtV(v) {
    if (!curve) return v * LAST;
    v = Math.min(1, Math.max(0, v));
    var lo = 0, hi = curve.length - 1;
    while (lo < hi) { var mid = (lo + hi) >> 1; if (curve[mid] < v) lo = mid + 1; else hi = mid; }
    if (lo === 0) return 0;
    var a = curve[lo - 1], b = curve[lo];
    return (lo - 1) + (b > a ? (v - a) / (b - a) : 0);
  }
  function vAtFrame(f) {
    if (!curve) return f / LAST;
    var i = Math.max(0, Math.min(curve.length - 1, Math.round(f)));
    return curve[i];
  }

  /* recomputed once the curve arrives — before that they fall back to linear */
  var V_START = 1, V_END = END / LAST;
  function recalcArc() { V_START = vAtFrame(START); V_END = vAtFrame(END); }
  recalcArc();

  /* ---------- phrasing: two holds and a turn that carries the middle ---------- */
  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function seg(p, a, b) { return Math.min(1, Math.max(0, (p - a) / (b - a))); }
  function mix(a, b, t) { return a + (b - a) * t; }
  function at(k) { return V_END + (V_START - V_END) * k; }   // k: 1 = start of arc, 0 = resolved

  function arcV(p) {
    if (p < 0.12) return V_START;                                        // hold — establish
    if (p < 0.54) return mix(V_START, at(0.55), ease(seg(p, 0.12, 0.54)));   // the turn
    if (p < 0.86) return mix(at(0.55), at(0.16), seg(p, 0.54, 0.86));        // steady
    if (p < 0.95) return mix(at(0.16), V_END, easeOut(seg(p, 0.86, 0.95)));  // settle
    return V_END;                                                        // hold — resolve
  }

  /* ---------- sizing ---------- */
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  function size() {
    var r = canvas.getBoundingClientRect();
    if (r.width < 2) return;
    var w = Math.round(r.width * dpr), h = Math.round(r.height * dpr);
    if (w === canvas.width && h === canvas.height) return;
    canvas.width = w; canvas.height = h;
    lastKey = ''; draw(true);
  }
  if ('ResizeObserver' in window) new ResizeObserver(size).observe(canvas);

  /* ---------- loading ---------- */
  function load(i) {
    return new Promise(function (res) {
      if (frames[i]) return res();
      var img = new Image();
      img.decoding = 'async';
      img.onload = function () { frames[i] = img; res(); };
      img.onerror = res;
      img.src = PATH + String(i).padStart(3, '0') + '.webp';
    });
  }
  function chunk(list, n, done) {
    var i = 0;
    (function next() {
      if (i >= list.length) return done && done();
      var s = list.slice(i, i + n); i += n;
      Promise.all(s.map(load)).then(function () { lastKey = ''; draw(true); next(); });
    })();
  }
  function boot() {
    /* load the arc in playback order — backwards — so the first thing that
       becomes scrubbable is what the visitor actually sees first */
    var order = [], i;
    for (i = START; i >= END; i -= 8) order.push(i);
    var rest = [];
    for (i = LAST; i >= 0; i--) if (order.indexOf(i) === -1) rest.push(i);
    chunk(order, 4, function () { pin.classList.add('ready'); draw(true); chunk(rest, 6); });
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
  var prog = 0, drag = 0, dragV = 0, dragging = false, px = 0;
  var cur = null;                       // eased frame position — gives it mass

  function scrollProg() {
    var r = track.getBoundingClientRect();
    var total = r.height - window.innerHeight;
    if (total <= 0) return 0;
    return Math.min(1, Math.max(0, -r.top / total));
  }

  /* ---------- draw ---------- */
  function draw(force) {
    var idx = Math.round(cur === null ? frameAtV(arcV(prog)) : cur);
    idx = Math.max(0, Math.min(LAST, idx));
    var key = idx + '|' + canvas.width;
    if (key === lastKey && !force) return;
    var img = nearest(idx);
    if (!img) return;

    var W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    /* the canvas box carries the frame's own aspect, so a plain stretch is
       uniform by construction — the squash bug cannot come back */
    ctx.drawImage(img, 0, 0, W, H);

    /* relight inside the alpha: the renders are flat frontal studio light,
       so without this the piece has no direction and reads as a sticker */
    ctx.globalCompositeOperation = 'source-atop';
    var g = ctx.createRadialGradient(W * 0.66, H * 0.16, 0, W * 0.66, H * 0.16, W * 0.78);
    g.addColorStop(0, 'rgba(255,238,214,.17)');
    g.addColorStop(1, 'rgba(255,238,214,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    var g2 = ctx.createRadialGradient(W * 0.26, H * 0.86, 0, W * 0.26, H * 0.86, W * 0.66);
    g2.addColorStop(0, 'rgba(25,100,64,.20)');
    g2.addColorStop(1, 'rgba(25,100,64,0)');
    ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);

    var g3 = ctx.createLinearGradient(0, H * 0.58, 0, H);
    g3.addColorStop(0, 'rgba(3,16,10,0)');
    g3.addColorStop(1, 'rgba(3,16,10,.40)');
    ctx.fillStyle = g3; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';

    lastKey = key;
    ground(idx);
  }

  /* shadows sized from the real footprint, so they tighten as the piece turns */
  function ground(idx) {
    if (!bbox || !bbox[idx]) return;
    var b = bbox[idx];                       // [left, right, bottom, area]
    var wFrac = b[1] - b[0];
    var box = jewel.getBoundingClientRect();
    var pinBox = pin.getBoundingClientRect();
    var bottomPx = box.top - pinBox.top + box.height * b[2];
    var midPx = box.left - pinBox.left + box.width * ((b[0] + b[1]) / 2);

    if (contact) {
      contact.style.width = (box.width * wFrac * 0.92) + 'px';
      contact.style.left = midPx + 'px';
      contact.style.top = (bottomPx - 10) + 'px';
      contact.style.setProperty('--co', (0.30 + 0.34 * b[3] / 0.33).toFixed(3));
    }
    if (cast) {
      cast.style.width = (box.width * wFrac * 1.24) + 'px';
      cast.style.left = midPx + 'px';
      cast.style.top = (bottomPx - 26) + 'px';
      cast.style.setProperty('--co2', (0.22 + 0.26 * b[3] / 0.33).toFixed(3));
    }
  }

  /* ---------- per-scroll dressing ---------- */
  function dress(idx) {
    var f01 = idx / LAST;
    if (plate) {
      plate.style.setProperty('--lx', (46 + 16 * f01).toFixed(1) + '%');
      plate.style.setProperty('--ly', (30 + 12 * (1 - Math.abs(2 * f01 - 1))).toFixed(1) + '%');
    }
    /* a slow push-in through the middle of the arc, easing back at the end */
    var p = prog;
    var zoom = p < 0.54 ? 1 + 0.16 * ease(seg(p, 0.12, 0.54))
             : p < 0.86 ? 1.16 + 0.13 * seg(p, 0.54, 0.86)
             : 1.29 - 0.17 * easeOut(seg(p, 0.86, 1));
    var rise = p < 0.86 ? -10 * seg(p, 0.12, 0.86) : -10 + 12 * easeOut(seg(p, 0.86, 1));
    jewel.style.setProperty('--zoom', zoom.toFixed(4));
    jewel.style.setProperty('--rise', rise.toFixed(1) + 'px');

    var n = 1;
    beats.forEach(function (b, i) {
      var on = prog >= +b.dataset.from && prog < +b.dataset.to;
      b.classList.toggle('on', on);
      if (on) n = i + 1;
    });
    pin.style.setProperty('--p', prog.toFixed(3));
    var c = pin.querySelector('[data-beat-n]');
    if (c) {
      var fa = ['۰۱', '۰۲', '۰۳'];
      c.textContent = (fa[n - 1] || '۰۱') + ' ⁄ ۰۳';
    }
  }

  /* ---------- drag ---------- */
  function down(x) { dragging = true; px = x; dragV = 0; canvas.parentElement.setAttribute('data-grab',''); }
  function move(x) {
    if (!dragging) return;
    var d = -(x - px) * (COUNT / (canvas.clientWidth || 600)) * 1.4;
    px = x; drag += d; dragV = d;
  }
  function up() { dragging = false; canvas.parentElement.removeAttribute('data-grab'); }

  jewel.addEventListener('mousedown', function (e) { e.preventDefault(); down(e.clientX); });
  window.addEventListener('mousemove', function (e) { move(e.clientX); });
  window.addEventListener('mouseup', up);
  jewel.addEventListener('touchstart', function (e) { down(e.touches[0].clientX); }, { passive: true });
  jewel.addEventListener('touchmove', function (e) { move(e.touches[0].clientX); }, { passive: true });
  jewel.addEventListener('touchend', up);
  jewel.addEventListener('touchcancel', up);

  /* ---------- loop ---------- */
  var raf = null;
  function update(settle) {
    prog = scrollProg();
    var target = frameAtV(arcV(prog)) + drag;
    target = Math.max(0, Math.min(LAST, target));

    if (settle) {
      if (!dragging) {
        dragV *= 0.93;
        if (Math.abs(dragV) > 0.02) drag += dragV; else dragV = 0;
        drag *= 0.94;
        if (Math.abs(drag) < 0.02) drag = 0;
      }
      /* ease toward the target so the piece carries weight instead of
         snapping frame-to-frame with the scroll wheel */
      cur = cur === null ? target : cur + (target - cur) * 0.18;
    } else {
      cur = target;
    }

    draw(false);
    dress(Math.round(cur));
  }
  function tick() { update(true); raf = requestAnimationFrame(tick); }
  function start() { if (!raf) raf = requestAnimationFrame(tick); }
  function stop() { if (raf) { cancelAnimationFrame(raf); raf = null; } }

  var pending = false;
  window.addEventListener('scroll', function () {
    if (pending) return;
    pending = true; requestAnimationFrame(function () { pending = false; });
    if (!raf) update(false);
  }, { passive: true });

  new IntersectionObserver(function (es) {
    if (es[0].isIntersecting) start(); else stop();
  }, { rootMargin: '150px' }).observe(pin);

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
    load(END).then(function () {
      prog = 1; cur = END; lastKey = ''; draw(true); dress(END);
      pin.classList.add('ready');
      beats.forEach(function (b, i) { b.classList.toggle('on', i === 0); });
    });
    return;
  }
  boot();
  start();
})();
