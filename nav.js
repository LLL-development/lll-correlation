/* ============================================================
   Guess the Correlation — global navbar
   Uses the .lll-nav component already defined in shared/brand.css,
   so this tool's chrome matches the rest of the LLL Series.
   ============================================================ */
(function (global) {
  "use strict";

  var PAGES = [
    { id: "play",     href: "index.html",    key: "navPlay" },
    { id: "tutorial", href: "tutorial.html", key: "navTutorial" },
    { id: "learn",    href: "learn.html",    key: "navLearn" }
  ];

  global.LLL_NAV = {
    /* Builds the bar, mounts the theme toggle, and hands back the element
       the language switcher should be rendered into. */
    mount: function (active) {
      var nav = document.createElement("nav");
      nav.className = "lll-nav";
      nav.innerHTML =
        '<a class="nav-logo" href="index.html" aria-label="Live Laugh Love">' +
          '<img src="shared/logo.svg" alt="LLL"></a>' +
        '<div class="nav-links">' +
          PAGES.map(function (p) {
            return '<a href="' + p.href + '"' +
                   (p.id === active ? ' class="active" aria-current="page"' : "") +
                   ' data-i18n="' + p.key + '"></a>';
          }).join("") +
        '</div>' +
        '<div class="nav-lang"></div>';
      document.body.insertBefore(nav, document.body.firstChild);

      var host = nav.querySelector(".nav-lang");
      if (global.LLL_THEME && LLL_THEME.button) host.appendChild(LLL_THEME.button());
      var langHost = document.createElement("div");
      host.appendChild(langHost);
      return langHost;
    },

    /* i18n always sets document.title to the tool name; give sub-pages
       their own title once the dictionary is live. */
    title: function (pageKey) {
      if (!pageKey) return;
      document.title = LLL_I18N.t("brand") + " \u2014 " + LLL_I18N.t(pageKey);
    }
  };
})(window);
