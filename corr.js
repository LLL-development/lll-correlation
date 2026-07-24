/* ============================================================
   Guess the Correlation — shared engine
   The maths and drawing primitives used by every page.
   Pure functions; no DOM state, no game rules.
   ============================================================ */
(function (global) {
  "use strict";

  /* ---------- seeded randomness ---------- */
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function hashStr(s) {
    var h = 2166136261 >>> 0;
    for (var i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
    return h >>> 0;
  }
  function gauss(rnd) {
    rnd = rnd || Math.random;
    var u = 0, v = 0;
    while (u === 0) u = rnd();
    while (v === 0) v = rnd();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  /* ---------- statistics ---------- */
  function avg(a) { var s = 0; for (var i = 0; i < a.length; i++) s += a[i]; return s / a.length; }
  function variance(a) { var m = avg(a), s = 0; for (var i = 0; i < a.length; i++) { var d = a[i] - m; s += d * d; } return s / a.length; }
  function pearson(xs, ys) {
    var n = xs.length, mx = avg(xs), my = avg(ys), sxy = 0, sxx = 0, syy = 0, i, dx, dy;
    for (i = 0; i < n; i++) { dx = xs[i] - mx; dy = ys[i] - my; sxy += dx * dy; sxx += dx * dx; syy += dy * dy; }
    if (sxx === 0 || syy === 0) return 0;
    return sxy / Math.sqrt(sxx * syy);
  }

  /* ---------- generators ----------
     y = r*x + sqrt(1-r^2)*z with x,z independent standard normals gives a
     cloud whose population correlation is exactly r, and whose y keeps unit
     spread for every r. That second property is what lets the tutorial sweep
     r on fixed axes without the cloud changing size. */
  function makeNormal(target, n, rnd) {
    rnd = rnd || Math.random;
    var k = Math.sqrt(1 - target * target), xs = [], ys = [], i, x, z;
    for (i = 0; i < n; i++) { x = gauss(rnd); z = gauss(rnd); xs.push(x); ys.push(target * x + k * z); }
    return { xs: xs, ys: ys, trap: null };
  }

  /* Reuse one x/z draw across many r values: same points, smoothly deformed. */
  function morphBase(n, rnd) {
    rnd = rnd || Math.random;
    var xs = [], zs = [], i;
    for (i = 0; i < n; i++) { xs.push(gauss(rnd)); zs.push(gauss(rnd)); }
    return { xs: xs, zs: zs };
  }
  function morphAt(base, r) {
    var k = Math.sqrt(1 - r * r);
    return { xs: base.xs, ys: base.xs.map(function (x, i) { return r * x + k * base.zs[i]; }), trap: null };
  }

  /* y = a*x + noise(s). Correlation is a/sqrt(a^2+s^2) for unit-spread x,
     which is how the tutorial holds the slope fixed and varies only spread. */
  function makeLine(a, s, n, rnd) {
    rnd = rnd || Math.random;
    var xs = [], ys = [], i, x;
    for (i = 0; i < n; i++) { x = gauss(rnd); xs.push(x); ys.push(a * x + gauss(rnd) * s); }
    return { xs: xs, ys: ys, trap: null };
  }

  /* Teaching plots need the number under them to match the label above them.
     Sample r at n=40 scatters by roughly +/-0.15 around its target, which is
     far too loose for a reference ladder, so walk seeds until the sample lands
     on target. Deterministic: same plot every visit, in every language. */
  function seekSeed(make, target, tol, seed0, tries) {
    seed0 = seed0 || 1; tries = tries || 8000; tol = tol == null ? 0.02 : tol;
    for (var s = seed0; s < seed0 + tries; s++) {
      var d = make(mulberry32(s));
      if (Math.abs(pearson(d.xs, d.ys) - target) <= tol) return d;
    }
    return make(mulberry32(seed0));
  }

  var TRAP_KINDS = ["curve", "lever", "cluster"];

  function makeTrap(kind, n, flip, rnd) {
    rnd = rnd || Math.random;
    var xs = [], ys = [], i, x;
    if (kind === "curve") {
      /* Anscombe II in spirit: a clean parabola whose vertex sits near the
         top of the x range, so a linear fit still reports a high r. */
      for (i = 0; i < n; i++) {
        x = 4 + (i + rnd() * 0.9) / n * 10;
        xs.push(x);
        ys.push(-0.127 * x * x + 2.78 * x - 6 + gauss(rnd) * 0.06);
      }
    } else if (kind === "lever") {
      /* A shapeless cloud plus one far-away point. That single point
         invents the entire correlation. */
      for (i = 0; i < n - 1; i++) { xs.push(gauss(rnd) * 0.5); ys.push(gauss(rnd) * 0.5); }
      xs.push(6.5); ys.push(6.5);
    } else {
      /* Two blobs with no internal trend, offset along the diagonal. The
         correlation lives between the groups, not inside them. For blobs at
         +/-d with independent noise s, r = d^2/(d^2+s^2), so s ~ 0.5d puts
         this in the same 0.8 band as the other traps. */
      var half = Math.floor(n / 2), d = 1.9, s = 0.88 + rnd() * 0.3;
      for (i = 0; i < n; i++) {
        var g = i < half ? -1 : 1;
        xs.push(g * d + gauss(rnd) * s);
        ys.push(g * d + gauss(rnd) * s);
      }
    }
    if (flip) for (i = 0; i < xs.length; i++) xs[i] = -xs[i];
    return { xs: xs, ys: ys, trap: kind };
  }

  /* ============================================================
     Palette — the blue -> grey -> orange correlation scale.
     Read back out of CSS so the values stay defined in exactly one
     place (site.css) and dark mode gets its own set for free.
     ============================================================ */
  var PAL = { neg: [74, 127, 176], mid: [201, 201, 196], pos: [224, 132, 60] };
  function cssVar(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
  function hexToRgb(h) {
    h = (h || "").replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var v = parseInt(h, 16);
    if (isNaN(v)) return null;
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
  }
  function refreshPalette() {
    var a = hexToRgb(cssVar("--r-neg")), b = hexToRgb(cssVar("--r-mid")), c = hexToRgb(cssVar("--r-pos"));
    if (a) PAL.neg = a; if (b) PAL.mid = b; if (c) PAL.pos = c;
  }
  function mix(a, b, u) {
    return "rgb(" + Math.round(a[0] + (b[0] - a[0]) * u) + "," +
                    Math.round(a[1] + (b[1] - a[1]) * u) + "," +
                    Math.round(a[2] + (b[2] - a[2]) * u) + ")";
  }
  function colorFor(r) {
    var v = Math.max(-1, Math.min(1, r));
    return v < 0 ? mix(PAL.mid, PAL.neg, -v) : mix(PAL.mid, PAL.pos, v);
  }
  /* Keep the cached palette honest when the theme flips. */
  function watchTheme(cb) {
    if (!global.MutationObserver) return;
    new MutationObserver(function () { refreshPalette(); if (cb) cb(); })
      .observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  }

  /* ============================================================
     Drawing
     box = { x0, x1, y0, y1 } in SVG units, y0 = bottom edge.
     ============================================================ */
  function scaler(vals, lo, hi) {
    var mn = Math.min.apply(null, vals), mx = Math.max.apply(null, vals);
    if (mx === mn) mx = mn + 1;
    return function (v) { return lo + (v - mn) / (mx - mn) * (hi - lo); };
  }
  function fixedScaler(lo, hi, a, b) {
    return function (v) { return a + (v - lo) / (hi - lo) * (b - a); };
  }

  /* Clip a segment to the box vertically; x is assumed already in range. */
  function clipY(box, x0, y0, x1, y1) {
    var t0 = 0, t1 = 1, dy = y1 - y0, dx = x1 - x0;
    function upd(p, q) {
      if (p === 0) return q >= 0;
      var r = q / p;
      if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; }
      else { if (r < t0) return false; if (r < t1) t1 = r; }
      return true;
    }
    if (!upd(-dy, y0 - box.y1)) return null;
    if (!upd(dy, box.y0 - y0)) return null;
    return [x0 + t0 * dx, y0 + t0 * dy, x0 + t1 * dx, y0 + t1 * dy];
  }

  /* Gridlines, ticks, axes and labels — the furniture that makes a scatter
     plot read as statistical rather than as dots on a card. */
  function chrome(box, opts) {
    opts = opts || {};
    var s = "", i, x, y, n = opts.divisions || 4;
    for (i = 1; i < n; i++) {
      x = box.x0 + (box.x1 - box.x0) * i / n;
      y = box.y0 - (box.y0 - box.y1) * i / n;
      s += '<line class="grid" x1="' + x.toFixed(1) + '" y1="' + box.y1 + '" x2="' + x.toFixed(1) + '" y2="' + box.y0 + '"/>';
      s += '<line class="grid" x1="' + box.x0 + '" y1="' + y.toFixed(1) + '" x2="' + box.x1 + '" y2="' + y.toFixed(1) + '"/>';
    }
    if (opts.ticks !== false) {
      for (i = 0; i <= n; i++) {
        x = box.x0 + (box.x1 - box.x0) * i / n;
        y = box.y0 - (box.y0 - box.y1) * i / n;
        s += '<line class="tick" x1="' + x.toFixed(1) + '" y1="' + box.y0 + '" x2="' + x.toFixed(1) + '" y2="' + (box.y0 + 4) + '"/>';
        s += '<line class="tick" x1="' + (box.x0 - 4) + '" y1="' + y.toFixed(1) + '" x2="' + box.x0 + '" y2="' + y.toFixed(1) + '"/>';
      }
    }
    s += '<line class="axis" x1="' + box.x0 + '" y1="' + box.y0 + '" x2="' + box.x1 + '" y2="' + box.y0 + '"/>';
    s += '<line class="axis" x1="' + box.x0 + '" y1="' + box.y0 + '" x2="' + box.x0 + '" y2="' + box.y1 + '"/>';
    s += '<text class="axlabel" x="' + box.x1 + '" y="' + (box.y0 + 16) + '" text-anchor="end">' + (opts.xLabel || "x") + '</text>';
    s += '<text class="axlabel" x="' + (box.x0 - 8) + '" y="' + (box.y1 + 4) + '" text-anchor="end">' + (opts.yLabel || "y") + '</text>';
    return s;
  }

  /* The least-squares line, clipped to the box and pre-armed for the
     stroke-dasharray draw-in. */
  function fitSvg(box, data, sx, sy, r) {
    var vx = variance(data.xs);
    if (!(vx > 0)) return "";
    var b = r * Math.sqrt(variance(data.ys) / vx);
    var mx = avg(data.xs), my = avg(data.ys);
    var x0 = Math.min.apply(null, data.xs), x1 = Math.max.apply(null, data.xs);
    var seg = clipY(box, sx(x0), sy(my + b * (x0 - mx)), sx(x1), sy(my + b * (x1 - mx)));
    if (!seg) return "";
    var len = Math.hypot(seg[2] - seg[0], seg[3] - seg[1]).toFixed(1);
    return '<line class="fit" x1="' + seg[0].toFixed(1) + '" y1="' + seg[1].toFixed(1) +
           '" x2="' + seg[2].toFixed(1) + '" y2="' + seg[3].toFixed(1) +
           '" style="--len:' + len + '; stroke-dasharray:' + len + '; stroke-dashoffset:' + len + ';"/>';
  }

  function dots(pts, opts) {
    opts = opts || {};
    var s = "", i, step = opts.stagger === false || reduced() ? 0 : (opts.stagger || 8);
    for (i = 0; i < pts.length; i++) {
      s += '<circle class="dot" cx="' + pts[i][0].toFixed(1) + '" cy="' + pts[i][1].toFixed(1) +
           '" r="' + (opts.r || 3.2) + '"' +
           (opts.index ? ' data-i="' + i + '"' : "") +
           (step ? ' style="animation-delay:' + (i * step) + 'ms"' : "") + "/>";
    }
    return s;
  }

  /* ============================================================
     Slider truth marker
     Native range thumbs are inset by half their width at the ends, so a
     plain percentage drifts. Correct for it with the thumb width.
     ============================================================ */
  var THUMB = 20;
  function pctOf(v) { return (v + 1) / 2; }
  function leftFor(v) {
    var p = pctOf(v);
    return "calc(" + (p * 100).toFixed(3) + "% + " + ((0.5 - p) * THUMB).toFixed(2) + "px)";
  }
  /* Drop a marker at the real r and shade the gap back to the guess. The
     number alone is abstract; the gap is a distance you can feel. */
  function markSlider(els, guess, truth) {
    var lo = Math.min(guess, truth), hi = Math.max(guess, truth);
    var plo = pctOf(lo), phi = pctOf(hi);
    els.band.style.left = leftFor(lo);
    els.band.style.width = "calc(" + ((phi - plo) * 100).toFixed(3) + "% - " +
                           ((phi - plo) * THUMB).toFixed(2) + "px)";
    els.truth.style.left = leftFor(truth);
    els.truthVal.textContent = fmt(truth);
    els.wrap.classList.add("revealed");
    els.band.classList.add("on");
    els.truth.classList.add("on");
  }
  function clearSlider(els) {
    els.wrap.classList.remove("revealed");
    els.band.classList.remove("on");
    els.truth.classList.remove("on");
  }

  /* ============================================================
     Typed guesses
     ============================================================ */

  /* Accepts what people actually type, not just what parseFloat likes:
     a real minus sign or a dash, a comma decimal, and — the one that
     matters most here, since the default language is Japanese — fullwidth
     digits and punctuation straight out of a CJK IME.
     Returns a value clamped to [-1, 1] and rounded to the slider's step,
     or null if the text isn't a number yet (mid-typing "-", "0.", ""). */
  function parseR(raw) {
    var s = String(raw == null ? "" : raw).trim();
    s = s.replace(/[\uFF10-\uFF19]/g, function (c) {   // fullwidth digits
      return String.fromCharCode(c.charCodeAt(0) - 0xFEE0);
    });
    s = s.replace(/[\u2212\u2013\u2014\uFF0D]/g, "-")  // minus, dashes, fullwidth hyphen
         .replace(/[,\u3001\uFF0C]/g, ".")             // comma decimal, CJK commas
         .replace(/\uFF0E/g, ".")                      // fullwidth full stop
         .replace(/^[+\uFF0B]/, "")                    // leading plus
         .replace(/\s/g, "");
    if (!/^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(s)) return null;
    var v = parseFloat(s);
    if (!isFinite(v)) return null;
    return Math.max(-1, Math.min(1, Math.round(v * 100) / 100));
  }

  /* Canonical display for the input. ASCII only: the text is editable, so
     a U+2212 in there would be a trap the moment someone backspaces it. */
  function fmtInput(v) { return (v > 0 ? "+" : v < 0 ? "-" : "") + Math.abs(v).toFixed(2); }

  /* Wires the typed input, the +/- button and the slider into one value.
     Either control can drive; both always stay in sync. */
  function bindGuess(els, opts) {
    opts = opts || {};
    var input = els.input, slider = els.slider, sign = els.sign;

    function emit(v) { if (opts.onChange) opts.onChange(v); }
    function current() {
      var v = parseR(input.value);
      return v === null ? parseFloat(slider.value) : v;
    }
    function commit(v, retext) {
      slider.value = v;
      if (retext !== false) input.value = fmtInput(v);
      emit(v);
    }

    slider.addEventListener("input", function () {
      var v = parseFloat(slider.value);
      input.value = fmtInput(v);
      emit(v);
    });

    /* While typing, follow along if it parses but never rewrite the text
       under the caret — reformatting mid-keystroke fights the typist. */
    input.addEventListener("input", function () {
      var v = parseR(input.value);
      if (v === null) return;
      commit(v, false);
    });

    /* Tidy up only once they're done. Unparseable text falls back to the
       slider rather than throwing the guess away. */
    input.addEventListener("blur", function () { commit(current()); });
    input.addEventListener("focus", function () { input.select(); });

    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        commit(current());
        if (opts.onSubmit) opts.onSubmit();
        return;
      }
      var d = e.shiftKey ? 0.1 : 0.01;
      if (e.key === "ArrowUp") { e.preventDefault(); commit(clamp(current() + d)); }
      else if (e.key === "ArrowDown") { e.preventDefault(); commit(clamp(current() - d)); }
    });

    /* The decimal keypad on iOS has no minus key, so on a touch device this
       button is the only way to type a negative r at all. */
    if (sign) sign.addEventListener("click", function () {
      var focused = document.activeElement === input;
      commit(clamp(-current()));
      if (focused) input.focus();
    });

    function clamp(v) { return Math.max(-1, Math.min(1, Math.round(v * 100) / 100)); }

    return {
      set: function (v) { commit(clamp(v)); },
      get: current,
      disable: function (on) {
        input.disabled = !!on; slider.disabled = !!on;
        if (sign) sign.disabled = !!on;
      }
    };
  }

  /* ============================================================
     PNG export
     No dependency: clone the SVG, inline every computed style onto the
     clone, rasterize through an Image onto a canvas, download the blob.

     The reason styles must be inlined is that everything on screen is
     styled by external CSS and CSS custom properties. A serialized <svg>
     carries none of that with it, so a naive export produces an unstyled
     black-on-transparent rectangle.
     ============================================================ */

  /* Properties that actually affect how the plots render. Copying every
     computed property instead would bloat the output by ~100x and slow
     serialization to a crawl on larger scatter plots. */
  var EXPORT_PROPS = [
    "fill", "fill-opacity", "stroke", "stroke-width", "stroke-linecap",
    "stroke-linejoin", "stroke-dasharray", "stroke-dashoffset", "opacity",
    "font-family", "font-size", "font-weight", "text-anchor", "letter-spacing"
  ];

  function inlineStyles(srcEl, cloneEl) {
    var cs = getComputedStyle(srcEl);
    var decl = "";
    for (var i = 0; i < EXPORT_PROPS.length; i++) {
      var p = EXPORT_PROPS[i];
      var v = cs.getPropertyValue(p);
      if (v) decl += p + ":" + v + ";";
    }
    /* Animations don't run in a serialized SVG, so anything whose final
       appearance depends on one has to be pinned to its end state here.
       The trend line is the case that bites: fitSvg() writes
       stroke-dashoffset inline and relies on the drawIn animation to
       carry it to 0, so a clone would keep the full offset and render
       the line completely invisible. */
    decl += "animation:none;";
    if (cloneEl.classList && cloneEl.classList.contains("fit")) {
      decl += "stroke-dashoffset:0;stroke-dasharray:none;";
    }
    cloneEl.setAttribute("style", decl);

    var srcKids = srcEl.children || [], cloneKids = cloneEl.children || [];
    for (var k = 0; k < srcKids.length; k++) {
      if (cloneKids[k]) inlineStyles(srcKids[k], cloneKids[k]);
    }
  }

  /* Rasterize an on-page <svg> into an Image, at a given CSS size.
     Resolves with a loaded HTMLImageElement ready to draw onto a canvas. */
  function svgToImage(svgEl, w, h) {
    return new Promise(function (resolve, reject) {
      var clone = svgEl.cloneNode(true);
      inlineStyles(svgEl, clone);
      clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      clone.setAttribute("width", w);
      clone.setAttribute("height", h);

      var svgText = new XMLSerializer().serializeToString(clone);
      /* A data: URL keeps the canvas same-origin, so toBlob() later isn't
         blocked by tainting. encodeURIComponent (rather than btoa) avoids
         throwing on the non-Latin1 characters that appear in localized
         axis labels. */
      var url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgText);
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error("SVG rasterization failed")); };
      img.src = url;
    });
  }

  /* Retina-ish output: the canvas is sized in device pixels but drawn in
     CSS pixels, so exported plots stay crisp when viewed at full size. */
  function makeCanvas(w, h, scale) {
    scale = scale || 2;
    var c = document.createElement("canvas");
    c.width = w * scale;
    c.height = h * scale;
    var ctx = c.getContext("2d");
    ctx.scale(scale, scale);
    return { canvas: c, ctx: ctx, w: w, h: h };
  }

  function downloadCanvas(canvas, filename) {
    return new Promise(function (resolve, reject) {
      if (!canvas.toBlob) { reject(new Error("canvas.toBlob unsupported")); return; }
      canvas.toBlob(function (blob) {
        if (!blob) { reject(new Error("toBlob returned null")); return; }
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        /* Revoking immediately can cancel the download in some browsers;
           a tick later is safe and still avoids leaking the object URL. */
        setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
        resolve(blob);
      }, "image/png");
    });
  }

  /* Filenames go into the user's Downloads folder, so strip anything a
     filesystem might object to and keep it short. */
  function safeFilename(base, ext) {
    var s = String(base || "export")
      .replace(/\.[^.]+$/, "")
      .replace(/[\\/:*?"<>|]+/g, "-")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60);
    return (s || "export") + "." + ext;
  }

  function todayStamp() {
    var d = new Date(), p = function (v) { return (v < 10 ? "0" : "") + v; };
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
  }
  /* ---------- formatting ---------- */
  function fmt(r) { return (r < 0 ? "\u2212" : "+") + Math.abs(r).toFixed(2); }
  function fmtPad(r) { return (r < 0 ? "\u2212" : (r > 0 ? "+" : " ")) + Math.abs(r).toFixed(2); }
  function bucket(r) {
    var a = Math.abs(r);
    if (a < 0.1) return "none";
    if (r > 0) { if (a >= 0.85) return "vsp"; if (a >= 0.6) return "sp"; if (a >= 0.35) return "mp"; return "wp"; }
    if (a >= 0.85) return "vsn"; if (a >= 0.6) return "sn"; if (a >= 0.35) return "mn"; return "wn";
  }
  function descKey(r) { return Math.abs(r) < 0.1 ? "descNone" : (r > 0 ? "descPos" : "descNeg"); }
  function reduced() { return !!(global.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches); }

  /* ============================================================
     Advanced metrics: Spearman's rank correlation, R-squared, and a
     two-tailed p-value for Pearson's r.

     Spearman and R-squared are simple compositions of what's already
     above. The p-value is the one worth real care: it needs the CDF of
     Student's t-distribution, which needs the regularized incomplete beta
     function - a piece of numerical code with no "looks about right" tier,
     since a subtly wrong implementation returns a plausible-looking wrong
     number instead of failing loudly. Implemented from Numerical Recipes'
     continued-fraction method and checked against scipy.stats to 1e-9
     (see corr_stats_test.js).
     ============================================================ */

  /* Average rank for ties (the standard convention: a 3-way tie for ranks
     2,3,4 gets rank 3 for every tied value), needed because Spearman
     correlation is defined as Pearson correlation of the ranks. */
  function rank(arr) {
    var n = arr.length;
    var idx = arr.map(function (v, i) { return i; });
    idx.sort(function (a, b) { return arr[a] - arr[b]; });
    var ranks = new Array(n);
    var i = 0;
    while (i < n) {
      var j = i;
      while (j + 1 < n && arr[idx[j + 1]] === arr[idx[i]]) j++;
      var avgRank = (i + j) / 2 + 1; // 1-indexed, averaged across the tie run
      for (var k = i; k <= j; k++) ranks[idx[k]] = avgRank;
      i = j + 1;
    }
    return ranks;
  }

  function spearman(xs, ys) { return pearson(rank(xs), rank(ys)); }

  /* Coefficient of determination: the share of variance in y "explained"
     by the linear fit on x. Just r^2, but named so callers don't have to
     remember that or re-derive it. */
  function rSquared(r) { return r * r; }

  /* ---- log-gamma (Lanczos approximation, g=7, n=9) ----
     Needed to build the Beta function B(a,b) = exp(lgamma(a)+lgamma(b)-lgamma(a+b))
     without overflowing for the a,b values a t-test produces. */
  var LANCZOS_G = 7;
  var LANCZOS_COEF = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7
  ];
  function logGamma(x) {
    if (x < 0.5) {
      // reflection formula, so we only ever evaluate the series for x >= 0.5
      return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
    }
    x -= 1;
    var a = LANCZOS_COEF[0];
    var t = x + LANCZOS_G + 0.5;
    for (var i = 1; i < LANCZOS_G + 2; i++) a += LANCZOS_COEF[i] / (x + i);
    return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
  }

  /* ---- regularized incomplete beta function I_x(a,b) ----
     Continued fraction from Numerical Recipes (6.4.5-6.4.6), the standard
     way to evaluate this without a full hypergeometric series. Swaps to
     the complementary side when x is past the point where the continued
     fraction converges quickly, which is required for it to converge in a
     bounded number of steps across the whole (0,1) domain. */
  function betacf(x, a, b) {
    var MAXIT = 200, EPS = 3e-16, FPMIN = 1e-300;
    var qab = a + b, qap = a + 1, qam = a - 1;
    var c = 1, d = 1 - qab * x / qap;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    d = 1 / d;
    var h = d;
    for (var m = 1; m <= MAXIT; m++) {
      var m2 = 2 * m;
      var aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
      c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d;
      h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
      c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d;
      var del = d * c;
      h *= del;
      if (Math.abs(del - 1) < EPS) break;
    }
    return h;
  }
  function regIncBeta(x, a, b) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    var bt = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) +
                       a * Math.log(x) + b * Math.log(1 - x));
    // the continued fraction converges fastest below the midpoint;
    // past it, evaluate the complementary function instead
    if (x < (a + 1) / (a + b + 2)) return bt * betacf(x, a, b) / a;
    return 1 - bt * betacf(1 - x, b, a) / b;
  }

  /* Two-tailed p-value for a Pearson correlation r measured from n pairs,
     via the standard t-transform: t = r*sqrt((n-2)/(1-r^2)), df = n-2.
     Returns null when n is too small for the test to mean anything (df<=0)
     or when the correlation is exactly +-1, where t is infinite and the
     p-value is 0 by definition, not "the test breaks". */
  function pValue(r, n) {
    var df = n - 2;
    if (df <= 0) return null;
    r = Math.max(-1, Math.min(1, r));
    if (Math.abs(r) >= 1) return 0;
    var t = r * Math.sqrt(df / (1 - r * r));
    var x = df / (df + t * t);
    var p = regIncBeta(x, df / 2, 0.5);
    return Math.max(0, Math.min(1, p));
  }

  global.LLL_CORR = {
    mulberry32: mulberry32, hashStr: hashStr, gauss: gauss,
    avg: avg, variance: variance, pearson: pearson,
    rank: rank, spearman: spearman, rSquared: rSquared, pValue: pValue,
    makeNormal: makeNormal, makeTrap: makeTrap, makeLine: makeLine, seekSeed: seekSeed,
    morphBase: morphBase, morphAt: morphAt, TRAP_KINDS: TRAP_KINDS,
    cssVar: cssVar, refreshPalette: refreshPalette, colorFor: colorFor, watchTheme: watchTheme,
    scaler: scaler, fixedScaler: fixedScaler, clipY: clipY, chrome: chrome, dots: dots, fitSvg: fitSvg,
    markSlider: markSlider, clearSlider: clearSlider, leftFor: leftFor,
    parseR: parseR, fmtInput: fmtInput, bindGuess: bindGuess,
    svgToImage: svgToImage, makeCanvas: makeCanvas, downloadCanvas: downloadCanvas,
    safeFilename: safeFilename, todayStamp: todayStamp,
    fmt: fmt, fmtPad: fmtPad, bucket: bucket, descKey: descKey, reduced: reduced
  };
  refreshPalette();
})(window);
