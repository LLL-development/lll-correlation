/* ============================================================
   Guess the Correlation — learn page
   Every plot on this page is generated and measured live, so the
   captions can never drift out of sync with the picture. Seeded, so
   the examples stay put between visits.
   ============================================================ */
(function () {
  "use strict";

  var C = window.LLL_CORR;
  var $ = function (id) { return document.getElementById(id); };
  var langHost = LLL_NAV.mount("learn");
  function t(k) { return LLL_I18N.t(k); }

  var MINI = { x0: 14, x1: 108, y0: 78, y1: 8 };
  var TALL = { x0: 14, x1: 116, y0: 86, y1: 8 };

  function mini(box, data, w, h, opts) {
    opts = opts || {};
    var r = C.pearson(data.xs, data.ys);
    var sx = C.scaler(data.xs, box.x0, box.x1), sy = C.scaler(data.ys, box.y0, box.y1);
    var pts = data.xs.map(function (x, i) { return [sx(x), sy(data.ys[i])]; });
    var svg = '<svg viewBox="0 0 ' + w + ' ' + h + '" xmlns="http://www.w3.org/2000/svg" style="--dotc:' +
              C.colorFor(r) + '">' + C.chrome(box, { divisions: 2, ticks: false });
    if (opts.fit) svg += C.fitSvg(box, data, sx, sy, r).replace('class="fit"', 'class="fit show"');
    return { svg: svg + C.dots(pts, { r: opts.r || 2, stagger: 6 }) + "</svg>", r: r };
  }

  /* ---------- reading a scatter plot ---------- */
  function at(target, n, seed) {
    return C.seekSeed(function (rnd) { return C.makeNormal(target, n, rnd); }, target, 0.02, seed);
  }

  function buildExamples() {
    var ex = [[0.95, "exStrongPos", 21], [0.0, "exNone", 22], [-0.95, "exStrongNeg", 23]];
    $("exGrid").innerHTML = ex.map(function (e) {
      var m = mini(MINI, at(e[0], 36, e[2]), 120, 90, {});
      return '<div class="ex">' + m.svg + '<div class="cap">' + t(e[1]) + '</div></div>';
    }).join("");
  }

  /* ---------- the strength scale, with real plots at each band ---------- */
  function buildBands() {
    /* Labels are derived from the measured r, never hardcoded, so the caption
       can't contradict the picture even if a seed search ever falls short. */
    var bands = [[0.00, 31], [0.30, 32], [0.50, 33], [0.70, 34], [0.90, 35], [-0.70, 36]];
    $("bands").innerHTML = bands.map(function (b) {
      var m = mini(MINI, at(b[0], 40, b[1]), 120, 90, {});
      return '<div class="band-c">' + m.svg +
             '<div class="rv">' + C.fmt(m.r) + '</div>' +
             '<div class="lb">' + t(C.bucket(m.r)) + '</div></div>';
    }).join("");
  }

  /* ---------- what r can't tell you ----------
     Four plots that all land near +0.8 for four different reasons.
     The first is the honest one; the rest are the traps the game
     throws at you, so this page is the answer key for them. */
  function buildLimits() {
    var rows = [
      { data: at(0.8, 40, 41), tk: "notHonestT", bk: "notHonestB", fit: true },
      { data: C.makeTrap("curve", 40, false, C.mulberry32(5)), tk: "notLinearT", bk: "trapCurve", fit: true },
      { data: C.makeTrap("lever", 40, false, C.mulberry32(9)), tk: "notOutlierT", bk: "trapLever", fit: true },
      { data: C.makeTrap("cluster", 40, false, C.mulberry32(3)), tk: "notClusterT", bk: "trapCluster", fit: true }
    ];
    $("limits").innerHTML = rows.map(function (row) {
      var m = mini(TALL, row.data, 130, 96, { fit: row.fit, r: 2.2 });
      return '<div class="limit">' + m.svg +
             '<div><h3>' + t(row.tk) + '</h3><p>' + t(row.bk) + '</p>' +
             '<div class="rv">r = ' + C.fmt(m.r) + '</div></div></div>';
    }).join("");
  }

  function renderAll() { buildExamples(); buildBands(); buildLimits(); }
  C.watchTheme(renderAll);

  LLL_I18N.init(LLL_CORR_STRINGS, {
    switcherHost: langHost,
    onChange: function () { LLL_NAV.title("navLearn"); renderAll(); }
  });
})();
