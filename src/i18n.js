(() => {
  'use strict';

  const STORAGE_KEY = 'melt-melon.locale';
  const SUPPORTED = ['zh-CN', 'en', 'vi'];
  const locales = window.MeltMelonLocales || {};

  function normalizeLocale(value) {
    const candidate = String(value || '').trim().toLowerCase();
    if (candidate === 'zh-cn' || candidate.startsWith('zh')) return 'zh-CN';
    if (candidate === 'vi' || candidate.startsWith('vi-')) return 'vi';
    if (candidate === 'en' || candidate.startsWith('en-')) return 'en';
    return null;
  }

  function detectLocale() {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = normalizeLocale(params.get('lang'));
    if (fromQuery) return fromQuery;
    try {
      const saved = normalizeLocale(localStorage.getItem(STORAGE_KEY));
      if (saved) return saved;
    } catch (_) {}
    return normalizeLocale(navigator.language) || 'zh-CN';
  }

  const locale = detectLocale();
  const dictionary = locales[locale]?.strings || {};
  document.documentElement.lang = locale;

  function exact(value) {
    return dictionary[value] || value;
  }

  function translateFruit(value) {
    return exact(value.trim());
  }

  function translateDynamic(value) {
    let match;
    if ((match = value.match(/^下一颗水果：(.+)$/))) {
      const fruit = translateFruit(match[1]);
      return locale === 'vi' ? `Trái tiếp theo: ${fruit}` : locale === 'en' ? `Next fruit: ${fruit}` : value;
    }
    if ((match = value.match(/^合成(.+)，获得(\d+)分。?$/))) {
      const fruit = translateFruit(match[1]);
      return locale === 'vi' ? `Ghép thành ${fruit}, +${match[2]} điểm.` : locale === 'en' ? `Merged into ${fruit}, +${match[2]} points.` : value;
    }
    if ((match = value.match(/^本局结束，得分(\d+)。?$/))) {
      return locale === 'vi' ? `Ván chơi kết thúc, được ${match[1]} điểm.` : locale === 'en' ? `Round over. Score: ${match[1]}.` : value;
    }
    if ((match = value.match(/^两颗(.+)，合成一颗(.+)。?$/))) {
      const from = translateFruit(match[1]);
      const to = translateFruit(match[2]);
      return locale === 'vi' ? `Hai ${from} ghép thành một ${to}.` : locale === 'en' ? `Two ${from} merge into one ${to}.` : value;
    }
    if ((match = value.match(/^两颗(.+)，合成(.+)$/))) {
      const from = translateFruit(match[1]);
      const to = translateFruit(match[2]);
      return locale === 'vi' ? `Hai ${from} ghép thành ${to}` : locale === 'en' ? `Two ${from} merge into ${to}` : value;
    }
    if ((match = value.match(/^软乎乎的 · 还剩\s*([\d.]+)\s*秒$/))) {
      return locale === 'vi' ? `Đang mềm · còn ${match[1]} giây` : locale === 'en' ? `Softened · ${match[1]}s left` : value;
    }
    if ((match = value.match(/^还有\s*([\d.]+)\s*秒$/))) {
      return locale === 'vi' ? `Còn ${match[1]} giây` : locale === 'en' ? `${match[1]}s left` : value;
    }
    if ((match = value.match(/^挤进空隙 · 消耗\s*(\d+)$/))) {
      return locale === 'vi' ? `Len vào khe · tốn ${match[1]}` : locale === 'en' ? `Squeeze into gaps · costs ${match[1]}` : value;
    }
    if ((match = value.match(/^再合成\s*(\d+)\s*次就能用$/))) {
      return locale === 'vi' ? `Ghép thêm ${match[1]} lần để dùng` : locale === 'en' ? `${match[1]} more merge${match[1] === '1' ? '' : 's'} to use` : value;
    }
    if ((match = value.match(/^这一局合成了\s*(\d+)\s*次。下次试着把大水果放在一侧，别把小水果埋在底下。$/))) {
      return locale === 'vi' ? `Ván này đã ghép ${match[1]} lần. Lần tới hãy để trái lớn về một bên và đừng chôn trái nhỏ ở đáy.` : locale === 'en' ? `You made ${match[1]} merges this round. Next time, keep large fruit to one side and avoid burying small fruit at the bottom.` : value;
    }
    return value;
  }

  function translateCore(value) {
    if (!value || locale === 'zh-CN') return value;
    return translateDynamic(exact(value));
  }

  function translateValue(value) {
    if (typeof value !== 'string' || locale === 'zh-CN') return value;
    const match = value.match(/^(\s*)([\s\S]*?)(\s*)$/);
    if (!match || !match[2]) return value;
    const translated = translateCore(match[2]);
    return `${match[1]}${translated}${match[3]}`;
  }

  function translateTextNode(node) {
    if (!node || !node.parentElement) return;
    if (node.parentElement.closest('#melt-melon-locale-switcher, script, style, textarea, code, pre')) return;
    const translated = translateValue(node.nodeValue);
    if (translated !== node.nodeValue) node.nodeValue = translated;
  }

  function translateElement(element) {
    if (!(element instanceof Element) || element.closest('#melt-melon-locale-switcher')) return;
    for (const attribute of ['aria-label', 'title', 'placeholder']) {
      if (!element.hasAttribute(attribute)) continue;
      const value = element.getAttribute(attribute);
      const translated = translateValue(value);
      if (translated !== value) element.setAttribute(attribute, translated);
    }
    element.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) translateTextNode(node);
    });
  }

  function translateTree(root) {
    if (locale === 'zh-CN' || !root) return;
    if (root.nodeType === Node.TEXT_NODE) {
      translateTextNode(root);
      return;
    }
    if (root instanceof Element) translateElement(root);
    root.querySelectorAll?.('*').forEach(translateElement);
  }

  function patchCanvasText() {
    if (locale === 'zh-CN' || !window.CanvasRenderingContext2D) return;
    for (const methodName of ['fillText', 'strokeText']) {
      const original = CanvasRenderingContext2D.prototype[methodName];
      if (typeof original !== 'function' || original.__meltMelonI18n) continue;
      const wrapped = function (text, ...args) {
        return original.call(this, translateValue(String(text)), ...args);
      };
      Object.defineProperty(wrapped, '__meltMelonI18n', { value: true });
      CanvasRenderingContext2D.prototype[methodName] = wrapped;
    }
  }

  function mountLocaleSwitcher() {
    if (document.getElementById('melt-melon-locale-switcher')) return;
    const label = document.createElement('label');
    label.id = 'melt-melon-locale-switcher';
    label.setAttribute('aria-label', locale === 'vi' ? 'Chọn ngôn ngữ' : locale === 'en' ? 'Choose language' : '选择语言');

    const icon = document.createElement('span');
    icon.className = 'melt-melon-locale-switcher__icon';
    icon.textContent = '文';
    icon.setAttribute('aria-hidden', 'true');

    const select = document.createElement('select');
    select.setAttribute('aria-label', label.getAttribute('aria-label'));
    for (const code of SUPPORTED) {
      const option = document.createElement('option');
      option.value = code;
      option.textContent = locales[code]?.name || code;
      option.selected = code === locale;
      select.append(option);
    }
    select.addEventListener('change', () => {
      const nextLocale = normalizeLocale(select.value) || 'zh-CN';
      try { localStorage.setItem(STORAGE_KEY, nextLocale); } catch (_) {}
      const url = new URL(window.location.href);
      url.searchParams.set('lang', nextLocale);
      window.location.assign(url.toString());
    });

    label.append(icon, select);
    document.body.append(label);
  }

  function observeChanges() {
    if (locale === 'zh-CN') return;
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'characterData') translateTextNode(mutation.target);
        if (mutation.type === 'attributes') translateElement(mutation.target);
        mutation.addedNodes.forEach(translateTree);
      }
    });
    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['aria-label', 'title', 'placeholder']
    });
  }

  patchCanvasText();
  observeChanges();

  document.addEventListener('DOMContentLoaded', () => {
    translateTree(document.body);
    if (locale !== 'zh-CN') document.title = locale === 'vi' ? 'Dưa hấu mềm' : 'Soft Watermelon';
    mountLocaleSwitcher();
  });

  window.MeltMelonI18n = Object.freeze({
    locale,
    supportedLocales: Object.freeze([...SUPPORTED]),
    translate: translateValue
  });
})();
