(() => {
  'use strict';

  const GAME_URL = './game.html';
  const INJECTED_HEAD = [
    '<link rel="stylesheet" href="./src/i18n.css">',
    '<script src="./src/locales.js"></script>',
    '<script src="./src/i18n.js"></script>'
  ].join('');

  function renderError(error) {
    console.error('[Melt Melon] Failed to load game shell', error);
    const status = document.getElementById('boot-status');
    if (!status) return;
    status.innerHTML = [
      '<strong>Unable to load Melt Melon.</strong>',
      '<span>Please refresh the page or open the original game.</span>',
      '<a href="./game.html">Open game.html</a>'
    ].join('');
  }

  async function boot() {
    const response = await fetch(GAME_URL, { credentials: 'same-origin' });
    if (!response.ok) throw new Error(`HTTP ${response.status} while loading ${GAME_URL}`);

    const source = await response.text();
    const headPattern = /<head(?:\s[^>]*)?>/i;
    if (!headPattern.test(source)) throw new Error('game.html does not contain a <head> element');

    const localizedSource = source.replace(headPattern, (head) => `${head}${INJECTED_HEAD}`);
    document.open();
    document.write(localizedSource);
    document.close();
  }

  boot().catch(renderError);
})();
