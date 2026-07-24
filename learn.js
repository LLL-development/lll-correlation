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

  /* ---- Beyond Pearson's r ----
     Two examples, chosen because they disagree in *opposite* directions.
     Everything shown is measured from the plotted points at runtime, so
     the captions can't drift away from the pictures. */
  function buildSpearPair() {
    /* A: a monotonic curve. Every step goes up, so the ranks are a perfect
       ladder and Spearman reads 1.00 - but the curve accelerates, so the
       straight-line fit Pearson measures is visibly worse.
       B: the game's own outlier trap. One far-away point drags Pearson up
       to ~0.8; ranks flatten that point to "just the largest one", so
       Spearman correctly reports there's nothing in the cloud. */
    var xs = [1,2,3,4,5,6,7,8,9,10,11,12];
    var curve = { xs: xs, ys: xs.map(function (x) { return Math.pow(1.9, x); }) };
    var lever = C.makeTrap("lever", 40, false, C.mulberry32(4));

    var rows = [
      { data: curve, tk: "spearCurveT", wk: "spearCurveW" },
      { data: lever, tk: "spearLeverT", wk: "spearLeverW" }
    ];

    $("spearPair").innerHTML = rows.map(function (row) {
      var r = C.pearson(row.data.xs, row.data.ys);
      var rho = C.spearman(row.data.xs, row.data.ys);
      var m = mini(TALL, row.data, 130, 96, { fit: true, r: 2.2 });
      /* Colour whichever coefficient is the more trustworthy read here:
         higher = "this one saw the relationship", lower = "this one was
         fooled". Which is which differs between the two examples, which
         is exactly the point. */
      var pearsonCls = r > rho ? "lo" : "";
      var spearCls = rho > r ? "hi" : "lo";
      return '<div class="cmp">' + m.svg +
        '<div class="ct">' + t(row.tk) + '</div>' +
        '<div class="cvals">' +
          '<div class="cv ' + pearsonCls + '"><div class="k">' + t("metricPearson") + '</div>' +
            '<div class="v">' + C.fmt(r) + '</div></div>' +
          '<div class="cv ' + spearCls + '"><div class="k">' + t("metricSpearman") + '</div>' +
            '<div class="v">' + C.fmt(rho) + '</div></div>' +
        '</div>' +
        '<p class="cwhy">' + t(row.wk) + '</p></div>';
    }).join("");
  }

  /* The same correlation at growing sample sizes. Nothing about the
     relationship changes down the column - only how much data there is -
     and yet the verdict flips. That is the entire lesson about p-values,
     and it is far more convincing computed live than asserted in prose. */
  function buildPTable() {
    var R_DEMO = 0.10;
    var ns = [10, 30, 100, 400, 1000];
    var html =
      '<div class="prow"><span>' + t("pColN") + '</span><span>' + t("pColP") + '</span>' +
      '<span>' + t("pColVerdict") + '</span></div>';
    ns.forEach(function (n) {
      var p = C.pValue(R_DEMO, n);
      var sig = p < 0.05;
      html += '<div class="prow">' +
        '<span class="mono">' + n + '</span>' +
        '<span class="mono">' + (p < 0.0001 ? "< 0.0001" : p.toFixed(4)) + '</span>' +
        '<span class="' + (sig ? "yes" : "no") + '">' + t(sig ? "metricSig" : "metricNotSig") + '</span>' +
        '</div>';
    });
    $("pTable").innerHTML = html;
  }

  function renderAll() { buildExamples(); buildBands(); buildLimits(); buildSpearPair(); buildPTable(); }
  C.watchTheme(renderAll);

  LLL_I18N.init(LLL_CORR_STRINGS, {
    switcherHost: langHost,
    onChange: function () { LLL_NAV.title("navLearn"); renderAll(); }
  });
})();
