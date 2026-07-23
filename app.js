/* ============================================================
   Guess the Correlation — the game
   Maths and drawing primitives live in corr.js; this file owns the
   game rules: difficulty, modes, scoring, and the calibration report.
   ============================================================ */
(function () {
  "use strict";

  var C = window.LLL_CORR;
  var $ = function (id) { return document.getElementById(id); };

  /* ---------- dom ---------- */
  var plot = $("plot"), slider = $("slider"), guessVal = $("guessVal"), signBtn = $("signBtn");
  var sliderWrap = $("sliderWrap"), band = $("band"), truthMark = $("truthMark"), truthVal = $("truthVal");
  var checkBtn = $("checkBtn"), nextBtn = $("nextBtn");
  var result = $("result"), verdictText = $("verdictText"), verdictPts = $("verdictPts");
  var actualV = $("actualV"), labelV = $("labelV"), missV = $("missV"), descV = $("descV");
  var trapBox = $("trapBox"), trapTag = $("trapTag"), trapWhat = $("trapWhat"), trapLink = $("trapLink");
  var roundV = $("roundV"), scoreV = $("scoreV"), streakV = $("streakV"), bestV = $("bestV");
  var instruction = $("instruction");
  var diffSeg = $("diffSeg"), modeSeg = $("modeSeg"), diffHint = $("diffHint");
  var timerBar = $("timerBar"), timerV = $("timerV"), timerFill = $("timerFill");
  var chOverlay = $("chOverlay"), chCard = $("chCard"), calibBox = $("calibBox");
  var guessPanel = $("guessPanel"), reversePanel = $("reversePanel");
  var revGrid = $("revGrid"), revTargetV = $("revTargetV"), revResult = $("revResult");
  var revVerdict = $("revVerdict"), revPts = $("revPts"), revDesc = $("revDesc"), revNext = $("revNext");
  var newHere = $("newHere"), newHereX = $("newHereX");

  var langHost = LLL_NAV.mount("play");

  /* ---------- storage ---------- */
  function sg(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function ss(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function sj(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } }

  function t(k) { return LLL_I18N.t(k); }
  function tf(k, v) { return String(LLL_I18N.t(k) || "").replace("%s", v); }

  /* ---------- state ---------- */
  var R = Math.random;
  var round = 1, score = 0, streak = 0, best = parseInt(sg("lll_corr_best") || "0", 10) || 0;
  var diff = "normal", mode = "practice";
  var actualR = 0, done = false, curTrap = null;
  var chTime = 60, chLeft = 0, chTimer = null, chAnswered = 0;
  var stats = sj("lll_corr_stats") || { n: 0, sumAbs: 0, nStrong: 0, sumMag: 0 };

  var BOX = { x0: 30, x1: 302, y0: 208, y1: 20 };

  /* Difficulty controls how distinguishable the correlations are and how many
     points are plotted; fewer points read noisier, so they are harder to judge. */
  var DIFF = {
    easy:   { n: 60, pick: function () { return (R() < 0.5 ? 0.70 + R() * 0.25 : R() * 0.15) * (R() < 0.5 ? -1 : 1); } },
    normal: { n: 44, pick: function () { return (R() * 1.96) - 0.98; } },
    hard:   { n: 24, pick: function () { return (0.25 + R() * 0.50) * (R() < 0.5 ? -1 : 1); } }
  };

  C.watchTheme(function () {
    plot.style.setProperty("--dotc", C.colorFor(done ? actualR : G.get()));
  });

  /* ============================================================
     Rounds
     ============================================================ */
  function buildRound(data) {
    actualR = C.pearson(data.xs, data.ys);
    curTrap = data.trap;

    var sx = C.scaler(data.xs, BOX.x0, BOX.x1), sy = C.scaler(data.ys, BOX.y0, BOX.y1);
    var pts = data.xs.map(function (x, i) { return [sx(x), sy(data.ys[i])]; });

    var svg = C.chrome(BOX) + C.fitSvg(BOX, data, sx, sy, actualR);
    svg += C.dots(pts);
    plot.innerHTML = svg;

    done = false;
    result.classList.add("hidden");
    trapBox.classList.add("hidden");
    C.clearSlider(SL);
    G.disable(false);
    G.set(0);
    checkBtn.style.display = "block";
    updateHud();
  }

  function newRound() {
    if (mode === "daily") { buildRound(dailySpecs[dailyIdx]); return; }
    var cfg = DIFF[diff] || DIFF.normal;
    /* Traps only appear once the player has footing: never on easy, and never
       often enough to feel like the norm. */
    if (diff !== "easy" && R() < 0.14) {
      buildRound(C.makeTrap(C.TRAP_KINDS[Math.floor(R() * 3)], cfg.n, R() < 0.5, R));
    } else {
      buildRound(C.makeNormal(cfg.pick(), cfg.n, R));
    }
  }

  function updateHud() {
    roundV.textContent = (mode === "daily") ? (dailyIdx + 1) + "/" + DAILY_N : round;
    bestV.textContent = best;
    streakV.textContent = streak;
  }

  function tierOf(err) { return err <= 0.05 ? 1 : err <= 0.15 ? 2 : err <= 0.35 ? 3 : 4; }

  /* ============================================================
     Slider: live colour + the truth marker
     ============================================================ */
  var SL = { wrap: sliderWrap, band: band, truth: truthMark, truthVal: truthVal };

  /* Typed input, +/- button and slider are one bound value: either control can
     drive it and both stay in sync. Enter checks, so a keyboard player never
     has to reach for the mouse. */
  var G = C.bindGuess({ input: guessVal, sign: signBtn, slider: slider }, {
    onChange: function (v) { plot.style.setProperty("--dotc", C.colorFor(v)); },
    onSubmit: function () { if (!done) checkBtn.onclick(); }
  });

  function showResult() {
    var guess = G.get();
    var err = Math.abs(guess - actualR);
    var tier = tierOf(err);

    result.style.setProperty("--tierc", C.cssVar("--tier-" + tier));
    band.style.color = C.cssVar("--tier-" + tier);

    actualV.textContent = C.fmt(actualR);
    labelV.textContent = t(C.bucket(actualR));
    missV.textContent = t("yourGuess") + " " + C.fmt(guess) + " \u00b7 " + t("offBy") + " " + err.toFixed(2);
    descV.textContent = t(C.descKey(actualR));

    if (curTrap) {
      trapTag.textContent = t("trapTag");
      trapWhat.textContent = t(curTrap === "curve" ? "trapCurve" : curTrap === "lever" ? "trapLever" : "trapCluster");
      trapLink.textContent = t("trapLink");
      trapBox.classList.remove("hidden");
    }

    var f = plot.querySelector(".fit"); if (f) f.classList.add("show");
    plot.style.setProperty("--dotc", C.colorFor(actualR));
    C.markSlider(SL, guess, actualR);
    result.classList.remove("hidden");
  }

  function countUp(el, from, to) {
    if (C.reduced() || from === to) { el.textContent = to; return; }
    var t0 = performance.now(), dur = 480;
    (function step(now) {
      var p = Math.min(1, (now - t0) / dur);
      el.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }

  checkBtn.onclick = function () {
    if (done) return;
    done = true;
    G.disable(true);
    checkBtn.style.display = "none";

    var guess = G.get();
    var err = Math.abs(guess - actualR);
    var pts = Math.max(0, Math.round(100 - err * 100));
    var tier = tierOf(err);

    var prev = score;
    score += pts;
    countUp(scoreV, prev, score);
    streak = err <= 0.15 ? streak + 1 : 0;
    streakV.textContent = streak;
    if (score > best) { best = score; ss("lll_corr_best", String(best)); }
    bestV.textContent = best;

    verdictText.textContent = t(["", "vClose", "vGood", "vOk", "vFar"][tier]);
    verdictPts.textContent = "+" + pts;

    /* Trap rounds are deliberately misleading, so they would poison a bias
       reading. Only honest linear rounds count towards calibration. */
    if (!curTrap) {
      stats.n++;
      stats.sumAbs += err;
      if (Math.abs(actualR) >= 0.5) { stats.nStrong++; stats.sumMag += Math.abs(guess) - Math.abs(actualR); }
      ss("lll_corr_stats", JSON.stringify(stats));
      renderCalib();
    }

    showResult();
    if (tier === 1) confettiBurst(30);

    if (mode === "challenge") chAnswered++;
    if (mode === "daily") {
      dailyErrs.push(err);
      dailyMarks.push(["", "\uD83D\uDFE9", "\uD83D\uDFE8", "\uD83D\uDFE7", "\u2B1C"][tier]);
    }
  };

  nextBtn.onclick = function () {
    if (mode === "daily") {
      dailyIdx++;
      if (dailyIdx >= DAILY_N) { endDaily(); return; }
      updateHud();
      newRound();
      return;
    }
    round++;
    newRound();
  };

  /* ============================================================
     Segmented controls
     ============================================================ */
  function setSeg(seg, val) {
    [].forEach.call(seg.querySelectorAll("button"), function (b) {
      b.classList.toggle("on", b.getAttribute("data-v") === val);
    });
  }
  function updateDiffHint() {
    if (mode === "daily") { diffHint.textContent = t("dailyD"); return; }
    if (mode === "reverse") { diffHint.textContent = t("reverseD"); return; }
    diffHint.textContent = t({ easy: "diffEasyD", normal: "diffNormalD", hard: "diffHardD" }[diff]);
  }

  diffSeg.onclick = function (e) {
    var b = e.target.closest("button"); if (!b) return;
    diff = b.getAttribute("data-v");
    setSeg(diffSeg, diff);
    updateDiffHint();
    if (mode === "practice") newRound();
  };

  modeSeg.onclick = function (e) {
    var b = e.target.closest("button"); if (!b) return;
    var v = b.getAttribute("data-v");
    if (v === mode) return;
    mode = v;
    setSeg(modeSeg, mode);
    stopTimer();
    R = Math.random;
    timerBar.classList.add("hidden");
    chOverlay.classList.add("hidden");
    diffSeg.classList.toggle("dim", mode === "daily" || mode === "reverse");
    guessPanel.classList.toggle("hidden", mode === "reverse");
    reversePanel.classList.toggle("hidden", mode !== "reverse");
    instruction.classList.toggle("hidden", mode === "reverse");
    updateDiffHint();

    round = 1; score = 0; streak = 0;
    scoreV.textContent = 0; streakV.textContent = 0;

    if (mode === "challenge") openChallengeStart();
    else if (mode === "daily") openDailyStart();
    else if (mode === "reverse") { updateHud(); newReverse(); }
    else { updateHud(); newRound(); }
  };

  function backToPractice() {
    chOverlay.classList.add("hidden");
    mode = "practice";
    setSeg(modeSeg, "practice");
    R = Math.random;
    timerBar.classList.add("hidden");
    diffSeg.classList.remove("dim");
    guessPanel.classList.remove("hidden");
    reversePanel.classList.add("hidden");
    instruction.classList.remove("hidden");
    updateDiffHint();
    round = 1; score = 0; streak = 0;
    scoreV.textContent = 0; streakV.textContent = 0;
    updateHud();
    newRound();
  }

  /* ============================================================
     Challenge mode (60 seconds)
     ============================================================ */
  function openChallengeStart() {
    chCard.innerHTML =
      '<h2>' + t("challengeTitle") + '</h2><p>' + t("challengeSub") + '</p>' +
      '<div class="chactions">' +
        '<button class="btn secondary" id="chBack" style="flex:0 0 auto;">' + t("backToPractice") + '</button>' +
        '<button class="btn" id="chStart" style="flex:1;">' + t("startChallenge") + '</button></div>';
    chOverlay.classList.remove("hidden");
    $("chStart").onclick = startChallenge;
    $("chBack").onclick = backToPractice;
  }

  function startChallenge() {
    chOverlay.classList.add("hidden");
    chAnswered = 0; score = 0; streak = 0; round = 1;
    scoreV.textContent = 0; streakV.textContent = 0;
    chLeft = chTime;
    timerBar.classList.remove("hidden", "low");
    renderTimer();
    newRound();
    chTimer = setInterval(function () {
      chLeft--;
      if (chLeft <= 10) timerBar.classList.add("low");
      renderTimer();
      if (chLeft <= 0) { stopTimer(); endChallenge(); }
    }, 1000);
  }
  function renderTimer() {
    timerV.textContent = chLeft;
    timerFill.style.width = (chLeft / chTime * 100) + "%";
  }
  function stopTimer() { if (chTimer) { clearInterval(chTimer); chTimer = null; } }

  function endChallenge() {
    timerBar.classList.add("hidden");
    if (score > best) { best = score; ss("lll_corr_best", String(best)); bestV.textContent = best; }
    chCard.innerHTML =
      '<h2>' + t("challengeOver") + '</h2>' +
      '<div class="chstats">' +
        '<div class="chstat"><div class="k">' + t("answered") + '</div><div class="v">' + chAnswered + '</div></div>' +
        '<div class="chstat"><div class="k">' + t("finalScore") + '</div><div class="v">' + score + '</div></div></div>' +
      '<div class="chactions">' +
        '<button class="btn secondary" id="chBack2" style="flex:0 0 auto;">' + t("backToPractice") + '</button>' +
        '<button class="btn" id="chAgain" style="flex:1;">' + t("tryAgainBtn") + '</button></div>';
    chOverlay.classList.remove("hidden");
    if (chAnswered > 0) confettiBurst(60);
    $("chAgain").onclick = startChallenge;
    $("chBack2").onclick = backToPractice;
  }

  /* ============================================================
     Daily challenge — everything derived from the date, so two players
     on opposite sides of the planet see the same five plots.
     ============================================================ */
  var DAILY_N = 5;
  var dailySpecs = [], dailyIdx = 0, dailyMarks = [], dailyErrs = [];

  function todayKey() {
    var d = new Date(), p = function (v) { return (v < 10 ? "0" : "") + v; };
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
  }

  function buildDaily() {
    var key = todayKey();
    var rng = C.mulberry32(C.hashStr("lll-corr:" + key));
    dailySpecs = [];
    var trapAt = rng() < 0.45 ? Math.floor(rng() * DAILY_N) : -1;
    for (var i = 0; i < DAILY_N; i++) {
      if (i === trapAt) dailySpecs.push(C.makeTrap(C.TRAP_KINDS[Math.floor(rng() * 3)], 44, rng() < 0.5, rng));
      else dailySpecs.push(C.makeNormal(rng() * 1.9 - 0.95, 44, rng));
    }
    return key;
  }

  function openDailyStart() {
    var key = buildDaily();
    var saved = sj("lll_corr_daily");
    if (saved && saved.date === key) { showDailyCard(saved, true); return; }
    chCard.innerHTML =
      '<h2>' + t("dailyTitle") + '</h2><p>' + t("dailySub") + '</p>' +
      '<div class="chactions">' +
        '<button class="btn secondary" id="dBack" style="flex:0 0 auto;">' + t("backToPractice") + '</button>' +
        '<button class="btn" id="dStart" style="flex:1;">' + t("dailyStart") + '</button></div>';
    chOverlay.classList.remove("hidden");
    $("dStart").onclick = startDaily;
    $("dBack").onclick = backToPractice;
  }

  function startDaily() {
    chOverlay.classList.add("hidden");
    dailyIdx = 0; dailyMarks = []; dailyErrs = [];
    score = 0; streak = 0;
    scoreV.textContent = 0; streakV.textContent = 0;
    updateHud();
    newRound();
  }

  function endDaily() {
    var mae = dailyErrs.length ? C.avg(dailyErrs) : 0;
    var saved = { date: todayKey(), score: score, marks: dailyMarks.join(""), mae: mae };
    ss("lll_corr_daily", JSON.stringify(saved));
    if (score > best) { best = score; ss("lll_corr_best", String(best)); bestV.textContent = best; }
    showDailyCard(saved, false);
    confettiBurst(60);
  }

  function showDailyCard(d, replay) {
    chCard.innerHTML =
      '<h2>' + t("dailyOver") + '</h2>' +
      '<div class="marks">' + d.marks + '</div>' +
      '<div class="chstats">' +
        '<div class="chstat"><div class="k">' + t("finalScore") + '</div><div class="v">' + d.score + '/' + (DAILY_N * 100) + '</div></div>' +
        '<div class="chstat"><div class="k">' + t("avgMiss") + '</div><div class="v">' + d.mae.toFixed(2) + '</div></div></div>' +
      (replay ? '<p style="margin:0 0 16px;">' + t("dailyPlayed") + '</p>' : '') +
      '<div class="chactions">' +
        '<button class="btn secondary" id="dBack2" style="flex:0 0 auto;">' + t("backToPractice") + '</button>' +
        '<button class="btn" id="dShare" style="flex:1;">' + t("dailyShare") + '</button></div>';
    chOverlay.classList.remove("hidden");
    $("dShare").onclick = function () { shareDaily(d); };
    $("dBack2").onclick = backToPractice;
  }

  function shareText(d) {
    return t("dailyShareTitle") + " " + d.date + "\n" + d.marks + "\n" +
           d.score + "/" + (DAILY_N * 100) + " \u00b7 " + t("avgMiss") + " " + d.mae.toFixed(2) + "\n" +
           location.origin + location.pathname;
  }
  function shareDaily(d) {
    var txt = shareText(d);
    if (navigator.share) { navigator.share({ text: txt }).catch(function () { copyText(txt); }); return; }
    copyText(txt);
  }
  function copyText(txt) {
    function ok() { toast(t("dailyCopied")); }
    function fallback() {
      var ta = document.createElement("textarea");
      ta.value = txt;
      ta.style.cssText = "position:fixed;top:-1000px;";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); ok(); } catch (e) {}
      document.body.removeChild(ta);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(ok, fallback);
    else fallback();
  }

  var toastEl = null;
  function toast(msg) {
    if (toastEl) toastEl.remove();
    toastEl = document.createElement("div");
    toastEl.className = "toast";
    toastEl.textContent = msg;
    document.body.appendChild(toastEl);
    setTimeout(function () { if (toastEl) { toastEl.remove(); toastEl = null; } }, 2000);
  }

  /* ============================================================
     Reverse mode — read the number, find the plot
     ============================================================ */
  var revAnswer = -1, revDone = false, revVals = [];

  function miniSvg(xs, ys, w, h, rad) {
    var pad = 7;
    var sx = C.scaler(xs, pad, w - pad), sy = C.scaler(ys, h - pad, pad);
    var pts = xs.map(function (x, i) { return [sx(x), sy(ys[i])]; });
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" xmlns="http://www.w3.org/2000/svg">' +
           C.dots(pts, { r: rad, stagger: 6 }) + "</svg>";
  }

  function newReverse() {
    var sets = [], vals = [], guard = 0;
    /* Three plots whose real r values sit far enough apart that the question
       has exactly one defensible answer. */
    while (guard++ < 60) {
      sets = []; vals = [];
      var targets = [R() * 1.9 - 0.95], g2 = 0;
      while (targets.length < 3 && g2++ < 200) {
        var c = R() * 1.9 - 0.95;
        if (targets.every(function (u) { return Math.abs(u - c) >= 0.32; })) targets.push(c);
      }
      if (targets.length < 3) continue;
      targets.forEach(function (tv) {
        var d = C.makeNormal(tv, 40, R);
        sets.push(d); vals.push(C.pearson(d.xs, d.ys));
      });
      var ok = true;
      for (var i = 0; i < 3; i++) for (var j = i + 1; j < 3; j++) if (Math.abs(vals[i] - vals[j]) < 0.25) ok = false;
      if (ok) break;
    }

    revAnswer = Math.floor(R() * 3);
    revVals = vals;
    var shownR = vals[revAnswer];
    revTargetV.textContent = C.fmt(shownR);
    revDone = false;
    revResult.classList.add("hidden");

    /* Every plot is tinted by the *asked* r, not its own, so the colour poses
       the question without giving away the answer. */
    revGrid.style.setProperty("--dotc", C.colorFor(shownR));
    revGrid.innerHTML = sets.map(function (d, i) {
      return '<div class="revopt" role="button" tabindex="0" data-i="' + i + '">' +
             miniSvg(d.xs, d.ys, 130, 110, 2.4) + '<div class="rcap"></div></div>';
    }).join("");
    updateHud();
  }

  function answerReverse(i) {
    if (revDone) return;
    revDone = true;
    var right = i === revAnswer;
    var pts = right ? 100 : 0;
    var prev = score;
    score += pts;
    countUp(scoreV, prev, score);
    streak = right ? streak + 1 : 0;
    streakV.textContent = streak;
    if (score > best) { best = score; ss("lll_corr_best", String(best)); }
    bestV.textContent = best;

    [].forEach.call(revGrid.children, function (el, k) {
      el.classList.add("locked");
      el.removeAttribute("tabindex");
      if (k === revAnswer) el.classList.add("right");
      else if (k === i) el.classList.add("wrong");
      el.querySelector(".rcap").textContent = C.fmt(revVals[k]);
    });

    revResult.style.setProperty("--tierc", C.cssVar(right ? "--tier-1" : "--tier-4"));
    revVerdict.textContent = t(right ? "revCorrect" : "revWrong");
    revPts.textContent = "+" + pts;
    revDesc.textContent = t("revReveal");
    revResult.classList.remove("hidden");
    if (right) confettiBurst(30);
  }

  revGrid.addEventListener("click", function (e) {
    var el = e.target.closest(".revopt"); if (!el) return;
    answerReverse(parseInt(el.getAttribute("data-i"), 10));
  });
  revGrid.addEventListener("keydown", function (e) {
    if (e.key !== "Enter" && e.key !== " ") return;
    var el = e.target.closest(".revopt"); if (!el) return;
    e.preventDefault();
    answerReverse(parseInt(el.getAttribute("data-i"), 10));
  });
  revNext.onclick = function () { round++; newReverse(); };

  /* ============================================================
     Calibration — the bias report
     ============================================================ */
  function renderCalib() {
    if (stats.n < 5) {
      calibBox.innerHTML = '<p class="calibempty">' + t("calibEmpty") + '</p>';
      return;
    }
    var mae = stats.sumAbs / stats.n;
    var html =
      '<div class="calibgrid">' +
        '<div class="cs"><div class="k">' + t("calibRounds") + '</div><div class="v">' + stats.n + '</div></div>' +
        '<div class="cs"><div class="k">' + t("calibMae") + '</div><div class="v">' + mae.toFixed(2) + '</div></div>' +
      '</div>';

    if (stats.nStrong >= 5) {
      var m = stats.sumMag / stats.nStrong;
      var line = Math.abs(m) < 0.04 ? t("calibBalanced")
               : tf(m < 0 ? "calibUnder" : "calibOver", "<b>" + Math.abs(m).toFixed(2) + "</b>");
      var pct = Math.max(0, Math.min(100, 50 + Math.max(-0.5, Math.min(0.5, m)) * 100));
      html += '<div class="biasline">' + line + '</div>' +
        '<div class="biasmeter"><span class="zero"></span>' +
          '<span class="fill" style="left:' + Math.min(50, pct) + '%; width:' + Math.abs(pct - 50) + '%"></span></div>' +
        '<div class="biasends"><span>' + t("calibUnderEnd") + '</span><span>' + t("calibOverEnd") + '</span></div>';
    }

    html += '<p class="calibnote">' + t("calibNote") + '</p>' +
            '<button class="linkbtn" id="calibReset">' + t("calibReset") + '</button>';
    calibBox.innerHTML = html;
    $("calibReset").onclick = function () {
      stats = { n: 0, sumAbs: 0, nStrong: 0, sumMag: 0 };
      ss("lll_corr_stats", JSON.stringify(stats));
      renderCalib();
    };
  }

  /* ============================================================
     Confetti
     ============================================================ */
  function confettiBurst(count) {
    var host = $("confetti");
    if (!host || C.reduced()) return;
    var colors = ["#e8845a", "#e0b13c", "#6aa9d8", "#63b57e", "#b57ec6"];
    for (var i = 0; i < count; i++) {
      (function (i) {
        var d = document.createElement("div");
        d.style.cssText = "position:absolute;width:8px;height:8px;top:-12px;left:" + (Math.random() * 100) +
          "vw;background:" + colors[i % colors.length] + ";border-radius:" + (Math.random() < 0.5 ? "50%" : "2px") + ";";
        var dur = 2 + Math.random() * 1.5;
        d.animate([{ transform: "translateY(0) rotate(0)" }, { transform: "translateY(105vh) rotate(720deg)" }],
                  { duration: dur * 1000, easing: "linear", fill: "forwards" });
        host.appendChild(d);
        setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); }, dur * 1000 + 300);
      })(i);
    }
  }

  /* ============================================================
     First-visit nudge towards the tutorial
     ============================================================ */
  if (!sg("lll_corr_seen_tut")) newHere.classList.remove("hidden");
  newHereX.onclick = function () {
    ss("lll_corr_seen_tut", "1");
    newHere.classList.add("hidden");
  };

  /* ============================================================
     Boot
     ============================================================ */
  LLL_I18N.init(LLL_CORR_STRINGS, {
    switcherHost: langHost,
    onChange: function () {
      updateDiffHint();
      renderCalib();
      if (done && mode !== "reverse") showResult();
      /* shared/i18n.js only has one onChange slot, and it's claimed here.
         The CSV upload panel lives in a separate IIFE further down this
         file and needs to relocalize its own result card on a language
         switch too, so it registers itself on this hook rather than this
         file calling LLL_I18N.init a second time (which would duplicate
         the language switcher UI). */
      if (window.LLL_CORR_ON_LANG) window.LLL_CORR_ON_LANG();
    }
  });

  setSeg(diffSeg, diff);
  setSeg(modeSeg, mode);
  updateDiffHint();
  renderCalib();
  updateHud();
  newRound();
})();

/* ============================================================
   Custom CSV upload
   Parses a two-column CSV, plots it with the same pipeline the game
   uses, and shows the computed r. Kept in its own IIFE so the game
   logic above is untouched.
   ============================================================ */
(function () {
  "use strict";
  var C = window.LLL_CORR;
  var $ = function (id) { return document.getElementById(id); };
  var file = $("csvFile"), status = $("csvStatus"), card = $("csvCard");
  var plot = $("csvPlot"), meta = $("csvMeta"), metrics = $("csvMetrics"), hint = $("csvHint");
  if (!file) return;
  var dropzone = $("dropzone");
  if (!dropzone) return;

  function t(k) { return LLL_I18N.t(k); }
  function tfa(k, arr) {
    var s = String(LLL_I18N.t(k) || "");
    (arr || []).forEach(function (v) { s = s.replace("%s", v); });
    return s;
  }
  function setStatus(msg, cls) {
    status.textContent = msg;
    status.classList.remove("err", "ok");
    if (cls) status.classList.add(cls);
  }

  /* Real-world CSVs need at least: Excel's \r\n line endings, a header row,
     quoted fields ("1,234"), and trailing blank lines. Split-by-comma
     handles none of these. This handles all four in ~30 lines. */
  function parseCsv(text) {
    var rows = [], cur = [], field = "", inQuote = false, i, ch;
    for (i = 0; i < text.length; i++) {
      ch = text.charAt(i);
      if (inQuote) {
        if (ch === '"') {
          if (text.charAt(i + 1) === '"') { field += '"'; i++; }
          else inQuote = false;
        } else field += ch;
        continue;
      }
      if (ch === '"') { inQuote = true; continue; }
      if (ch === ",") { cur.push(field); field = ""; continue; }
      if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && text.charAt(i + 1) === "\n") i++;
        cur.push(field); field = "";
        /* Skip blank lines rather than emitting empty rows. */
        if (cur.length > 1 || (cur.length === 1 && cur[0] !== "")) rows.push(cur);
        cur = [];
        continue;
      }
      field += ch;
    }
    if (field !== "" || cur.length) { cur.push(field); rows.push(cur); }
    return rows;
  }

  /* Turn parsed rows into { xs, ys }. Detects a header row (first row where
     no two adjacent cells parse as numbers), and picks the pair of columns
     that actually holds the numeric data. A label column ("Smith, J.",1,2)
     is common enough that assuming columns 0 and 1 is a real mistake. */
  function toNumericPairs(rows) {
    if (!rows.length) return { xs: [], ys: [], skipped: 0, hadHeader: false, cols: [0, 1] };

    /* Which two columns hold the numbers? Score every adjacent pair by how
       often both cells across all rows parse as finite numbers. */
    var width = 0;
    for (var r = 0; r < rows.length; r++) width = Math.max(width, rows[r].length);
    if (width < 2) return { xs: [], ys: [], skipped: rows.length, hadHeader: false, cols: [0, 1] };
    var bestScore = -1, bestPair = [0, 1];
    for (var a = 0; a < width - 1; a++) {
      var b = a + 1;
      var score = 0;
      for (var i = 0; i < rows.length; i++) {
        var x = parseFloat(rows[i][a]), y = parseFloat(rows[i][b]);
        if (isFinite(x) && isFinite(y)) score++;
      }
      if (score > bestScore) { bestScore = score; bestPair = [a, b]; }
    }
    var ca = bestPair[0], cb = bestPair[1];

    /* Header row: the first row where the chosen pair isn't both numeric. */
    var start = 0, hadHeader = false;
    if (rows.length) {
      var f0 = parseFloat(rows[0][ca]), f1 = parseFloat(rows[0][cb]);
      if (!isFinite(f0) || !isFinite(f1)) { start = 1; hadHeader = true; }
    }

    var xs = [], ys = [], skipped = 0;
    for (var j = start; j < rows.length; j++) {
      var row = rows[j];
      if (row.length <= cb) { skipped++; continue; }
      var xv = parseFloat(row[ca]), yv = parseFloat(row[cb]);
      if (!isFinite(xv) || !isFinite(yv)) { skipped++; continue; }
      xs.push(xv); ys.push(yv);
    }
    return { xs: xs, ys: ys, skipped: skipped, hadHeader: hadHeader, cols: bestPair };
  }

  var BOX = { x0: 30, x1: 302, y0: 208, y1: 20 };

  var lastData = null; // re-render target for a language switch (see hook below)

  function render(data) {
    lastData = data;
    var r = C.pearson(data.xs, data.ys);
    var rho = C.spearman(data.xs, data.ys);
    var r2 = C.rSquared(r);
    var p = C.pValue(r, data.xs.length);

    var sx = C.scaler(data.xs, BOX.x0, BOX.x1), sy = C.scaler(data.ys, BOX.y0, BOX.y1);
    var pts = data.xs.map(function (x, i) { return [sx(x), sy(data.ys[i])]; });
    var svg = C.chrome(BOX) + C.fitSvg(BOX, data, sx, sy, r) + C.dots(pts);
    plot.innerHTML = svg;
    plot.style.setProperty("--dotc", C.colorFor(r));
    var f = plot.querySelector(".fit"); if (f) f.classList.add("show");
    meta.innerHTML =
      '<span>' + tfa("uploadPoints", [data.xs.length]) + '</span>' +
      '<span>r = <span class="r">' + C.fmt(r) + '</span> \u00b7 ' + t(C.bucket(r)) + '</span>';

    /* p < 0.05 is the conventional (if debatable) line for "statistically
       significant" - shown as a plain-language label, not just the raw
       number, since a bare p-value means little without that context. */
    var sig = p === null ? "" :
      '<span class="sig ' + (p < 0.05 ? "yes" : "no") + '">' +
      t(p < 0.05 ? "metricSig" : "metricNotSig") + '</span>';

    metrics.innerHTML =
      '<div class="metric"><div class="mk">' + t("metricPearson") + '</div><div class="mv">' + C.fmt(r) + '</div></div>' +
      '<div class="metric"><div class="mk">' + t("metricSpearman") + '</div><div class="mv">' + C.fmt(rho) + '</div></div>' +
      '<div class="metric"><div class="mk">' + t("metricRSq") + '</div><div class="mv">' + r2.toFixed(3) + '</div></div>' +
      '<div class="metric"><div class="mk">' + t("metricPValue") + '</div><div class="mv">' +
        (p === null ? "\u2014" : (p < 0.001 ? "< 0.001" : p.toFixed(3))) + sig + '</div></div>';

    /* Pearson only sees the linear component of a relationship; Spearman
       sees any consistently increasing/decreasing trend, linear or not.
       A meaningful gap between them is itself informative - it is the
       CSV-upload version of exactly what the trap rounds teach in the
       game (see learn.html#limits once Day 3 lands the explanation). */
    var diverges = Math.abs(r - rho) >= 0.15;
    hint.innerHTML = diverges ? '<p class="tipbox" style="margin-top:10px;">' + t("metricDivergeHint") + '</p>' : "";

    card.classList.remove("hidden");
  }

  function hidePlot() {
    /* Blank everything, not just hide the container, so a subsequent
       test/assertion (or a user peeking at DevTools) can never see stale
       content from a previous upload. */
    lastData = null;
    plot.innerHTML = "";
    meta.innerHTML = "";
    metrics.innerHTML = "";
    hint.innerHTML = "";
    card.classList.add("hidden");
  }

  /* Shared by both entry points (click-to-browse and drag-drop) so there is
     exactly one place that validates a file and turns it into a plot. */
  function processFile(f) {
    if (!f) return;
    if (!/\.csv$/i.test(f.name) && f.type && f.type !== "text/csv" && f.type !== "") {
      /* Only reject on a confident non-CSV type; many OSes report an empty
         type for .csv, so an empty type is treated as "unknown, allow it"
         rather than rejected. */
      setStatus(t("uploadNotCsv"), "err");
      hidePlot();
      return;
    }
    /* 5 MB is comfortably larger than any hand-rolled dataset and small
       enough that FileReader/parseCsv won't hang the tab. */
    if (f.size > 5 * 1024 * 1024) {
      setStatus(t("uploadTooBig"), "err");
      hidePlot();
      return;
    }
    setStatus(tfa("uploadReading", [f.name]));

    var reader = new FileReader();
    reader.onerror = function () { setStatus(t("uploadReadErr"), "err"); hidePlot(); };
    reader.onload = function () {
      try {
        var rows = parseCsv(String(reader.result || ""));
        var pairs = toNumericPairs(rows);

        /* Log the structured array so it's inspectable from DevTools and
           available for any future pipeline that wants raw pairs. */
        console.log("[lll-correlation] parsed CSV:", { rows: rows, pairs: pairs });

        if (pairs.xs.length < 3) {
          setStatus(t("uploadTooFew"), "err");
          hidePlot();
          return;
        }
        render(pairs);
        var msg = tfa("uploadOk", [f.name, pairs.xs.length]);
        if (pairs.skipped) msg += " " + tfa("uploadSkipped", [pairs.skipped]);
        setStatus(msg, "ok");
      } catch (err) {
        console.error("[lll-correlation] CSV parse failed:", err);
        setStatus(t("uploadParseErr"), "err");
        hidePlot();
      }
    };
    reader.readAsText(f);
  }

  file.addEventListener("change", function () {
    processFile(file.files && file.files[0]);
  });

  /* ---------- drag and drop ----------
     The zone is a <label for="csvFile">, so a plain click already opens the
     file dialog via native label/input association - no JS needed for that
     path. Only three things need wiring by hand: the drag visuals, the
     actual drop, and Enter/Space activation (a <label> isn't a native
     interactive element, so browsers don't synthesize a click from the
     keyboard the way they do for a real <button>). */
  var dragDepth = 0; // dragenter/dragleave fire on every child element too;
                     // a plain counter is the standard fix for the flicker
                     // that a naive enter/leave toggle produces.

  function activate(e) { dragDepth++; dropzone.classList.add("drag-active"); }
  function deactivate(e) { dragDepth = Math.max(0, dragDepth - 1); if (dragDepth === 0) dropzone.classList.remove("drag-active"); }

  dropzone.addEventListener("dragenter", function (e) { e.preventDefault(); activate(e); });
  dropzone.addEventListener("dragover", function (e) { e.preventDefault(); }); // required for drop to fire at all
  dropzone.addEventListener("dragleave", function (e) { e.preventDefault(); deactivate(e); });
  dropzone.addEventListener("drop", function (e) {
    e.preventDefault();
    dragDepth = 0;
    dropzone.classList.remove("drag-active");
    var files = e.dataTransfer && e.dataTransfer.files;
    if (files && files.length) processFile(files[0]);
  });
  dropzone.addEventListener("keydown", function (e) {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    file.click();
  });

  /* Safety net: if a file is dragged and mis-dropped anywhere else on the
     page, the browser's default behaviour is to navigate the whole tab to
     that file. Swallowing dragover/drop at the document level prevents
     that without affecting the dropzone's own handlers above (which run
     first, on the more specific target, and already called preventDefault
     there). */
  document.addEventListener("dragover", function (e) { e.preventDefault(); });
  document.addEventListener("drop", function (e) { e.preventDefault(); });

  /* Relocalize the result card's labels and hint text (not the numbers -
     those don't change) when the language switches. See the matching
     comment on the game's LLL_I18N.init call above. */
  window.LLL_CORR_ON_LANG = function () { if (lastData) render(lastData); };
})();

/* ============================================================
   Service worker registration
   Runs after everything else so a broken SW can never block the page.
   ============================================================ */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("sw.js").catch(function (err) {
      console.warn("[lll-correlation] service worker registration failed:", err);
    });
  });
}
