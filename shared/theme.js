/* ============================================================
   LLL Viewer — shared theme (light / dark)

   - Follows the OS setting by default.
   - A manual toggle overrides it and is remembered across visits.
   - Degrades safely if localStorage is unavailable.

   Call LLL_THEME.init() early (before paint) to avoid a flash,
   and LLL_THEME.button() to get a toggle button for the navbar.
   ============================================================ */
(function (global) {
  "use strict";

  var KEY = "lll_theme";

  function safeGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function safeSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  function systemPrefersDark() {
    return !!(global.matchMedia && global.matchMedia("(prefers-color-scheme: dark)").matches);
  }

  function resolve() {
    var stored = safeGet(KEY);
    if (stored === "dark" || stored === "light") return stored;
    return systemPrefersDark() ? "dark" : "light";
  }

  function apply(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#17171a" : "#222220");
  }

  var API = {
    current: function () { return document.documentElement.getAttribute("data-theme") || "light"; },

    init: function () {
      apply(resolve());
      // Follow the OS if the user hasn't chosen explicitly.
      if (global.matchMedia) {
        var mq = global.matchMedia("(prefers-color-scheme: dark)");
        var onChange = function () { if (!safeGet(KEY)) apply(systemPrefersDark() ? "dark" : "light"); };
        if (mq.addEventListener) mq.addEventListener("change", onChange);
        else if (mq.addListener) mq.addListener(onChange);
      }
    },

    toggle: function () {
      var next = API.current() === "dark" ? "light" : "dark";
      safeSet(KEY, next);
      apply(next);
      return next;
    },

    /* Returns a <button> that toggles the theme. */
    button: function () {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "theme-btn";
      b.setAttribute("data-i18n-aria", "themeAria");
      b.setAttribute("aria-label", "Toggle theme");
      b.innerHTML =
        '<svg class="sun" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
        'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.9 4.9 1.4 1.4"/>' +
        '<path d="m17.7 17.7 1.4 1.4"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.3 17.7-1.4 1.4"/>' +
        '<path d="m19.1 4.9-1.4 1.4"/></svg>' +
        '<svg class="moon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
        'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"/></svg>';
      b.addEventListener("click", function () { API.toggle(); });
      return b;
    }
  };

  global.LLL_THEME = API;

  // Apply immediately so there is no flash of the wrong theme.
  API.init();
})(window);
