/* ============================================================
   LLL Tools — shared i18n engine
   - One place for the language list + common UI strings.
   - Each tool calls LLL_I18N.init(toolStrings) with only its
     own tool-specific strings (openTitle, openSub, privacy, error...).
   ============================================================ */
(function (global) {
  "use strict";

  var LANGS = [
    { code: "ja",      label: "\u65e5\u672c\u8a9e" },        // 日本語
    { code: "en",      label: "English" },
    { code: "zh-Hans", label: "\u7b80\u4f53\u4e2d\u6587" },  // 简体中文
    { code: "zh-Hant", label: "\u7e41\u9ad4\u4e2d\u6587" },  // 繁體中文
    { code: "ko",      label: "\ud55c\uad6d\uc5b4" },        // 한국어
    { code: "ms",      label: "Bahasa Melayu" }
  ];

  // Strings shared across every tool.
  var COMMON = {
    "ja": { dropHint: "\u307e\u305f\u306f\u3053\u3053\u306b\u30d5\u30a1\u30a4\u30eb\u3092\u30c9\u30ed\u30c3\u30d7", loading: "\u8aad\u307f\u8fbc\u307f\u4e2d\u2026", themeAria: "\u30c6\u30fc\u30de\u3092\u5207\u308a\u66ff\u3048", chooseBtn: "\u30d5\u30a1\u30a4\u30eb\u3092\u9078\u629e", back: "\u623b\u308b", newTab: "\u65b0\u3057\u3044\u30bf\u30d6", backAria: "\u30a2\u30c3\u30d7\u30ed\u30fc\u30c9\u753b\u9762\u306b\u623b\u308b", newTabAria: "\u65b0\u3057\u3044\u30bf\u30d6\u3067\u958b\u304f", langAria: "\u8a00\u8a9e" },
    "en": { dropHint: "or drop a file here", loading: "Loading\u2026", themeAria: "Toggle theme", chooseBtn: "Choose file", back: "Back", newTab: "New tab", backAria: "Back to upload", newTabAria: "Open in a new tab", langAria: "Language" },
    "zh-Hans": { dropHint: "\u6216\u5c06\u6587\u4ef6\u62d6\u5165\u6b64\u5904", loading: "\u52a0\u8f7d\u4e2d\u2026", themeAria: "\u5207\u6362\u4e3b\u9898", chooseBtn: "\u9009\u62e9\u6587\u4ef6", back: "\u8fd4\u56de", newTab: "\u65b0\u6807\u7b7e\u9875", backAria: "\u8fd4\u56de\u4e0a\u4f20\u9875\u9762", newTabAria: "\u5728\u65b0\u6807\u7b7e\u9875\u4e2d\u6253\u5f00", langAria: "\u8bed\u8a00" },
    "zh-Hant": { dropHint: "\u6216\u5c07\u6a94\u6848\u62d6\u5165\u6b64\u8655", loading: "\u8f09\u5165\u4e2d\u2026", themeAria: "\u5207\u63db\u4e3b\u984c", chooseBtn: "\u9078\u64c7\u6a94\u6848", back: "\u8fd4\u56de", newTab: "\u65b0\u5206\u9801", backAria: "\u8fd4\u56de\u4e0a\u50b3\u9801\u9762", newTabAria: "\u5728\u65b0\u5206\u9801\u4e2d\u958b\u555f", langAria: "\u8a9e\u8a00" },
    "ko": { dropHint: "\ub610\ub294 \uc5ec\uae30\uc5d0 \ud30c\uc77c\uc744 \ub193\uc73c\uc138\uc694", loading: "\ubd88\ub7ec\uc624\ub294 \uc911\u2026", themeAria: "\ud14c\ub9c8 \uc804\ud658", chooseBtn: "\ud30c\uc77c \uc120\ud0dd", back: "\ub4a4\ub85c", newTab: "\uc0c8 \ud0ed", backAria: "\uc5c5\ub85c\ub4dc \ud654\uba74\uc73c\ub85c \ub3cc\uc544\uac00\uae30", newTabAria: "\uc0c8 \ud0ed\uc5d0\uc11c \uc5f4\uae30", langAria: "\uc5b8\uc5b4" },
    "ms": { dropHint: "atau lepaskan fail di sini", loading: "Memuatkan\u2026", themeAria: "Tukar tema", chooseBtn: "Pilih fail", back: "Kembali", newTab: "Tab baharu", backAria: "Kembali ke muat naik", newTabAria: "Buka dalam tab baharu", langAria: "Bahasa" }
  };

  var DEFAULT_LANG = "ja";
  var STORAGE_KEY = "lll_lang";

  function safeGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function safeSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  var dicts = {};      // merged per-language dictionaries
  var current = {};    // active dictionary
  var selectEl = null;
  var onChangeCb = null;

  function apply(code) {
    var dict = dicts[code] || dicts[DEFAULT_LANG];
    current = dict;

    document.documentElement.lang = code;
    if (dict.brand) document.title = dict.brand;

    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      if (dict[key] != null) el.textContent = dict[key];
    });
    document.querySelectorAll("[data-i18n-aria]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-aria");
      if (dict[key] != null) el.setAttribute("aria-label", dict[key]);
    });

    if (selectEl) selectEl.value = code;
    safeSet(STORAGE_KEY, code);
    if (typeof onChangeCb === "function") onChangeCb(current, code);
  }

  /* Build the <div class="lang-switch"> markup into a host element. */
  function buildSwitcher(host) {
    var wrap = document.createElement("div");
    wrap.className = "lang-switch" + (host.getAttribute("data-fixed") === "true" ? " fixed" : "");
    wrap.innerHTML =
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/>' +
      '<path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>' +
      '</svg>';
    var sel = document.createElement("select");
    sel.setAttribute("data-i18n-aria", "langAria");
    sel.setAttribute("aria-label", "Language");
    LANGS.forEach(function (l) {
      var o = document.createElement("option");
      o.value = l.code;
      o.textContent = l.label;
      sel.appendChild(o);
    });
    sel.addEventListener("change", function (e) { apply(e.target.value); });
    wrap.appendChild(sel);
    host.appendChild(wrap);
    selectEl = sel;
  }

  /* Public API */
  var API = {
    langs: LANGS,
    t: function (key) { return current[key]; },
    lang: function () { return document.documentElement.lang; },
    /*
      toolStrings: { "ja": {brand, openTitle, ...}, "en": {...}, ... }
      opts.switcherHost: element to render the language <select> into
      opts.onChange(dict, code): optional callback after each language change
    */
    init: function (toolStrings, opts) {
      opts = opts || {};
      onChangeCb = opts.onChange || null;

      LANGS.forEach(function (l) {
        var c = l.code;
        var merged = {};
        var base = COMMON[c] || {};
        for (var k in base) merged[k] = base[k];
        var extra = (toolStrings && toolStrings[c]) || {};
        for (var k2 in extra) merged[k2] = extra[k2];
        dicts[c] = merged;
      });

      if (opts.switcherHost) buildSwitcher(opts.switcherHost);

      var stored = safeGet(STORAGE_KEY);
      apply(stored && dicts[stored] ? stored : DEFAULT_LANG);
    }
  };

  global.LLL_I18N = API;
})(window);
