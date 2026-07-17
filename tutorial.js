/* ============================================================
   Guess the Correlation — tutorial
   Five steps, each with one interaction and one idea. Every dataset
   here is seeded, so the lesson is identical on every visit and in
   every language.
   ============================================================ */
(function () {
  "use strict";

  var C = window.LLL_CORR;
  var $ = function (id) { return document.getElementById(id); };
  var langHost = LLL_NAV.mount("tutorial");

  function t(k) { return LLL_I18N.t(k); }
  function tfa(k, vals) {
    var s = String(LLL_I18N.t(k) || "");
    vals.forEach(function (v) { s = s.replace("%s", v); });
    return s;
  }
  function ss(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  var N_STEPS = 5, step = 1, seen = { 1: true };
  var BOX = { x0: 38, x1: 302, y0: 186, y1: 18 };
  var SMALL = { x0: 20, x1: 120, y0: 88, y1: 10 };

  /* ============================================================
     Step 1 — one dot is one observation
     Concrete beats abstract: these are students, not "x and y".
     ============================================================ */
  var s1 = (function () {
    var rnd = C.mulberry32(20260716);
    var hours = [], marks = [], i, h;
    for (i = 0; i < 14; i++) {
      h = 1.2 + rnd() * 8;
      hours.push(h);
      marks.push(Math.max(28, Math.min(98, 38 + h * 5.6 + C.gauss(rnd) * 7)));
    }
    return { xs: hours, ys: marks };
  })();
  var s1sx, s1sy;

  function drawS1() {
    s1sx = C.scaler(s1.xs, BOX.x0, BOX.x1);
    s1sy = C.scaler(s1.ys, BOX.y0, BOX.y1);
    var pts = s1.xs.map(function (x, i) { return [s1sx(x), s1sy(s1.ys[i])]; });
    $("p1").innerHTML = C.chrome(BOX, { xLabel: t("t1XLabel"), yLabel: t("t1YLabel") }) +
                        C.dots(pts, { r: 4.5, index: true, stagger: 20 });
    $("p1").style.setProperty("--dotc", C.colorFor(0.6));
  }

  $("p1").addEventListener("click", function (e) {
    var d = e.target.closest("circle.dot"); if (!d) return;
    var i = parseInt(d.getAttribute("data-i"), 10);
    [].forEach.call($("p1").querySelectorAll(".dot"), function (n) { n.classList.remove("sel"); });
    d.classList.add("sel");
    var out = $("r1");
    out.classList.remove("empty");
    out.innerHTML = tfa("t1Read", ["<b>" + s1.xs[i].toFixed(1) + "</b>", "<b>" + Math.round(s1.ys[i]) + "</b>"]);
  });

  /* ============================================================
     Step 2 — the sweep
     One x/z draw reused across every r: the same points, smoothly
     deformed, so the change you see is r and nothing else.
     ============================================================ */
  var base2 = C.morphBase(44, C.mulberry32(424242));

  function drawS2(r) {
    var d = C.morphAt(base2, r);
    var sx = C.scaler(d.xs, BOX.x0, BOX.x1), sy = C.scaler(d.ys, BOX.y0, BOX.y1);
    var pts = d.xs.map(function (x, i) { return [sx(x), sy(d.ys[i])]; });
    $("p2").innerHTML = C.chrome(BOX) + C.dots(pts, { stagger: false });
    $("p2").style.setProperty("--dotc", C.colorFor(r));
    $("r2v").textContent = C.fmt(r);
    $("r2l").textContent = t(C.bucket(r));
  }
  $("s2").oninput = function () { drawS2(parseFloat($("s2").value)); };

  /* ============================================================
     Step 3 — tightness, not steepness
     Same slope both times (a = 1); only the noise differs. Because
     r = a / sqrt(a^2 + s^2), holding a fixed and moving s isolates
     spread as the thing r is actually reading.
     ============================================================ */
  function drawSmall(el, data, rEl) {
    var r = C.pearson(data.xs, data.ys);
    var sx = C.scaler(data.xs, SMALL.x0, SMALL.x1), sy = C.scaler(data.ys, SMALL.y0, SMALL.y1);
    var pts = data.xs.map(function (x, i) { return [sx(x), sy(data.ys[i])]; });
    el.innerHTML = C.chrome(SMALL, { divisions: 2, ticks: false }) +
                   C.fitSvg(SMALL, data, sx, sy, r) + C.dots(pts, { r: 2.4, stagger: 6 });
    var f = el.querySelector(".fit"); if (f) f.classList.add("show");
    el.style.setProperty("--dotc", C.colorFor(r));
    if (rEl) rEl.textContent = C.fmt(r);
  }
  /* Both use slope a = 1; only the noise differs. Seeds are searched so the
     pair reliably reads ~0.94 vs ~0.55 rather than wherever chance lands. */
  var s3a = C.seekSeed(function (rnd) { return C.makeLine(1, 0.34, 40, rnd); }, 0.94, 0.015, 11);
  var s3b = C.seekSeed(function (rnd) { return C.makeLine(1, 1.5, 40, rnd); }, 0.55, 0.015, 11);

  /* ============================================================
     Step 4 — r only sees straight lines
     ============================================================ */
  var trapKind = "curve";
  var TRAP_SEEDS = { curve: 5, lever: 9, cluster: 3 };

  function drawS4() {
    var d = C.makeTrap(trapKind, 44, false, C.mulberry32(TRAP_SEEDS[trapKind]));
    var r = C.pearson(d.xs, d.ys);
    var sx = C.scaler(d.xs, BOX.x0, BOX.x1), sy = C.scaler(d.ys, BOX.y0, BOX.y1);
    var pts = d.xs.map(function (x, i) { return [sx(x), sy(d.ys[i])]; });
    $("p4").innerHTML = C.chrome(BOX) + C.fitSvg(BOX, d, sx, sy, r) + C.dots(pts);
    var f = $("p4").querySelector(".fit"); if (f) f.classList.add("show");
    $("p4").style.setProperty("--dotc", C.colorFor(r));
    $("r4").textContent = "r = " + C.fmt(r);
    $("t4What").textContent = t(trapKind === "curve" ? "trapCurve" : trapKind === "lever" ? "trapLever" : "trapCluster");
  }
  $("trapTabs").onclick = function (e) {
    var b = e.target.closest("button"); if (!b) return;
    trapKind = b.getAttribute("data-k");
    [].forEach.call($("trapTabs").querySelectorAll("button"), function (n) {
      n.classList.toggle("on", n.getAttribute("data-k") === trapKind);
    });
    drawS4();
  };

  /* ============================================================
     Step 5 — one real round, same mechanics as the game
     ============================================================ */
  var s5data = null, s5r = 0, s5done = false;
  var SL5 = { wrap: $("sw5"), band: $("b5"), truth: $("tm5"), truthVal: $("tv5") };

  function drawS5() {
    s5data = C.makeNormal(0.62, 44, C.mulberry32(777));
    s5r = C.pearson(s5data.xs, s5data.ys);
    var sx = C.scaler(s5data.xs, BOX.x0, BOX.x1), sy = C.scaler(s5data.ys, BOX.y0, BOX.y1);
    var pts = s5data.xs.map(function (x, i) { return [sx(x), sy(s5data.ys[i])]; });
    $("p5").innerHTML = C.chrome(BOX) + C.fitSvg(BOX, s5data, sx, sy, s5r) + C.dots(pts);
    $("p5").style.setProperty("--dotc", C.colorFor(G5.get()));
  }
  /* Same bound input as the real game, so the step rehearses the actual thing. */
  var G5 = C.bindGuess({ input: $("g5"), sign: $("sign5"), slider: $("s5") }, {
    onChange: function (v) { $("p5").style.setProperty("--dotc", C.colorFor(v)); },
    onSubmit: function () { $("c5").onclick(); }
  });

  $("c5").onclick = function () {
    if (s5done) return;
    s5done = true;
    G5.disable(true);
    $("c5").classList.add("hidden");
    var guess = G5.get(), err = Math.abs(guess - s5r);
    var tier = err <= 0.05 ? 1 : err <= 0.15 ? 2 : err <= 0.35 ? 3 : 4;
    $("res5").style.setProperty("--tierc", C.cssVar("--tier-" + tier));
    $("b5").style.color = C.cssVar("--tier-" + tier);
    $("v5").textContent = t(["", "vClose", "vGood", "vOk", "vFar"][tier]);
    $("a5").textContent = C.fmt(s5r);
    $("l5").textContent = t(C.bucket(s5r));
    $("m5").textContent = t("yourGuess") + " " + C.fmt(guess) + " \u00b7 " + t("offBy") + " " + err.toFixed(2);
    var f = $("p5").querySelector(".fit"); if (f) f.classList.add("show");
    $("p5").style.setProperty("--dotc", C.colorFor(s5r));
    C.markSlider(SL5, guess, s5r);
    $("res5").classList.remove("hidden");
    $("cta5").classList.remove("hidden");
  };

  /* ============================================================
     Stepper
     ============================================================ */
  function render() {
    for (var i = 1; i <= N_STEPS; i++) $("step" + i).classList.toggle("hidden", i !== step);
    [].forEach.call($("steps").children, function (b, i) {
      b.classList.toggle("on", i + 1 === step);
      b.classList.toggle("seen", !!seen[i + 1] && i + 1 !== step);
    });
    $("stepNo").textContent = tfa("tutStep", [step, N_STEPS]);
    $("prevBtn").disabled = step === 1;
    $("nextBtn").textContent = step === N_STEPS ? t("tutDone") : t("tutNext");
    if (step === 1) drawS1();
    if (step === 2) drawS2(parseFloat($("s2").value));
    if (step === 3) { drawSmall($("p3a"), s3a, $("r3a")); drawSmall($("p3b"), s3b, $("r3b")); }
    if (step === 4) drawS4();
    if (step === 5 && !s5done) drawS5();
  }
  function go(n) {
    step = Math.max(1, Math.min(N_STEPS, n));
    seen[step] = true;
    render();
    window.scrollTo({ top: 0, behavior: C.reduced() ? "auto" : "smooth" });
  }
  $("prevBtn").onclick = function () { go(step - 1); };
  $("nextBtn").onclick = function () {
    if (step === N_STEPS) { location.href = "index.html"; return; }
    go(step + 1);
  };

  $("steps").innerHTML = "";
  for (var i = 1; i <= N_STEPS; i++) {
    var b = document.createElement("button");
    b.type = "button";
    b.setAttribute("aria-label", "Step " + i);
    (function (n) { b.onclick = function () { go(n); }; })(i);
    $("steps").appendChild(b);
  }

  C.watchTheme(render);

  /* Seeing the tutorial retires the nudge on the game page. */
  ss("lll_corr_seen_tut", "1");

  LLL_I18N.init(LLL_CORR_STRINGS, {
    switcherHost: langHost,
    onChange: function () {
      LLL_NAV.title("navTutorial");
      $("r1").classList.add("empty");
      $("r1").textContent = t("t1Tap");
      render();
    }
  });
})();
