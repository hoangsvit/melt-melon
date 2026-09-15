(function () {
  'use strict';

  window.MELON_ATLAS = './assets/fruit-atlas.png';

  // Typography is intentionally kept in its own stylesheet so each locale can
  // use an appropriate native font stack without bloating the core layout CSS.
  const typographyHref = './src/styles/typography.css';
  if (!document.querySelector(`link[href="${typographyHref}"]`)) {
    const stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = typographyHref;
    document.head.append(stylesheet);
  }
})();
