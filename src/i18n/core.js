(function () {
  'use strict';

  const SOURCE_LOCALE = 'zh-CN';
  const STORAGE_KEY = 'melt-melon.locale';
  const LOCALES = Object.freeze([
    { id: 'zh-CN', label: '中文' },
    { id: 'en', label: 'English' },
    { id: 'vi', label: 'Tiếng Việt' },
    { id: 'ja', label: '日本語' },
    { id: 'ko', label: '한국어' },
  ]);

  // Dynamic/source corrections live here instead of being assembled from translated
  // sentences at runtime. Keep this object JSON-compatible: validate_static.py parses it.
  const RUNTIME_CATALOGS = {
    "zh-CN": {
      "选择语言": "选择语言",
      "两颗{fruit}，合成{nextFruit}": "两颗{fruit}，合成{nextFruit}",
      "两颗{fruit}，合成一颗{nextFruit}。": "两颗{fruit}，合成一颗{nextFruit}。",
      "西瓜，西瓜不会消除": "西瓜，西瓜不会消除",
      "西瓜不会消除，要给新水果留出空间。": "西瓜不会消除，要给新水果留出空间。",
      "本局结束，得分{score}。": "本局结束，得分{score}。",
      "两颗相同水果碰到一起，变成下一种水果。共十一级，下一颗随机来自前五级；连续合成会多得分。": "两颗相同水果碰到一起，变成下一种水果。共十一级，下一颗随机来自前五级；连续合成只显示连击提示，不会额外加分。"
    },
    "en": {
      "选择语言": "Choose language",
      "两颗{fruit}，合成{nextFruit}": "Two {fruit} merge into {nextFruit}",
      "两颗{fruit}，合成一颗{nextFruit}。": "Two {fruit} merge into one {nextFruit}.",
      "西瓜，西瓜不会消除": "Watermelon. Watermelons do not disappear.",
      "西瓜不会消除，要给新水果留出空间。": "Watermelons do not disappear, so leave room for new fruit.",
      "本局结束，得分{score}。": "Round over. Score: {score}.",
      "两颗相同水果碰到一起，变成下一种水果。共十一级，下一颗随机来自前五级；连续合成会多得分。": "Two matching fruits become the next fruit. There are 11 levels, and the next fruit is randomly chosen from the first five. Chain merges show combo feedback but do not award bonus points."
    },
    "vi": {
      "选择语言": "Chọn ngôn ngữ",
      "两颗{fruit}，合成{nextFruit}": "Hai {fruit} ghép thành {nextFruit}",
      "两颗{fruit}，合成一颗{nextFruit}。": "Hai {fruit} ghép thành một {nextFruit}.",
      "西瓜，西瓜不会消除": "Dưa hấu. Dưa hấu sẽ không biến mất.",
      "西瓜不会消除，要给新水果留出空间。": "Dưa hấu không biến mất, hãy chừa chỗ cho trái mới.",
      "本局结束，得分{score}。": "Ván chơi kết thúc. Điểm: {score}.",
      "两颗相同水果碰到一起，变成下一种水果。共十一级，下一颗随机来自前五级；连续合成会多得分。": "Hai trái giống nhau chạm nhau sẽ ghép thành cấp tiếp theo. Có 11 cấp và trái tiếp theo được chọn ngẫu nhiên từ 5 cấp đầu. Chuỗi ghép chỉ hiện hiệu ứng combo, không cộng thêm điểm thưởng."
    },
    "ja": {
      "选择语言": "言語を選択",
      "两颗{fruit}，合成{nextFruit}": "2つの{fruit}で{nextFruit}に合成",
      "两颗{fruit}，合成一颗{nextFruit}。": "2つの{fruit}を1つの{nextFruit}に合成します。",
      "西瓜，西瓜不会消除": "スイカ。スイカは消えません。",
      "西瓜不会消除，要给新水果留出空间。": "スイカは消えないので、新しいフルーツのためにスペースを空けてください。",
      "本局结束，得分{score}。": "ラウンド終了。スコア: {score}。",
      "两颗相同水果碰到一起，变成下一种水果。共十一级，下一颗随机来自前五级；连续合成会多得分。": "同じフルーツが触れると次の種類に合成されます。全11段階で、次のフルーツは最初の5段階からランダムに選ばれます。連続合成はコンボ表示のみで、追加得点はありません。"
    },
    "ko": {
      "选择语言": "언어 선택",
      "两颗{fruit}，合成{nextFruit}": "{fruit} 두 개를 {nextFruit}(으)로 합치기",
      "两颗{fruit}，合成一颗{nextFruit}。": "{fruit} 두 개가 하나의 {nextFruit}(으)로 합쳐집니다.",
      "西瓜，西瓜不会消除": "수박. 수박은 사라지지 않습니다.",
      "西瓜不会消除，要给新水果留出空间。": "수박은 사라지지 않으니 새 과일을 위한 공간을 남겨 두세요.",
      "本局结束，得分{score}。": "라운드 종료. 점수: {score}.",
      "两颗相同水果碰到一起，变成下一种水果。共十一级，下一颗随机来自前五级；连续合成会多得分。": "같은 과일 두 개가 만나면 다음 단계 과일로 합쳐집니다. 총 11단계이며 다음 과일은 처음 5단계에서 무작위로 선택됩니다. 연속 합성은 콤보 표시만 제공하며 추가 점수는 없습니다."
    }
  };

  const localeIds = new Set(LOCALES.map(locale => locale.id));
  const textSources = new WeakMap();
  const textRendered = new WeakMap();
  const attributeState = new WeakMap();
  const textBindings = new Map();
  const attributeBindings = new Map();
  let currentLocale = resolveInitialLocale();
  let observer = null;

  function normalizeLocale(value) {
    const input = String(value || '').trim().toLowerCase();
    if (input.startsWith('zh')) return 'zh-CN';
    for (const id of ['en', 'vi', 'ja', 'ko']) {
      if (input === id || input.startsWith(`${id}-`)) return id;
    }
    return null;
  }

  function resolveInitialLocale() {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = normalizeLocale(params.get('lang'));
    if (fromQuery && localeIds.has(fromQuery)) return fromQuery;

    try {
      const saved = normalizeLocale(localStorage.getItem(STORAGE_KEY));
      if (saved && localeIds.has(saved)) return saved;
    } catch (_) {}

    for (const language of navigator.languages || [navigator.language]) {
      const locale = normalizeLocale(language);
      if (locale && localeIds.has(locale)) return locale;
    }
    return SOURCE_LOCALE;
  }

  function interpolate(message, values = {}) {
    return String(message).replace(/\{([A-Za-z0-9_]+)\}/g, (match, key) =>
      Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : match);
  }

  function t(source, values = {}) {
    const baseCatalog = window.MelonLocales?.[currentLocale] || {};
    const runtimeCatalog = RUNTIME_CATALOGS[currentLocale] || {};
    return interpolate(runtimeCatalog[source] ?? baseCatalog[source] ?? source, values);
  }

  function translateRaw(raw) {
    if (!raw) return raw;
    const match = String(raw).match(/^(\s*)([\s\S]*?)(\s*)$/);
    if (!match) return raw;
    const [, before, body, after] = match;
    if (!body) return raw;
    return `${before}${t(body)}${after}`;
  }

  function isTextBound(node) {
    return Boolean(node?.parentElement && textBindings.has(node.parentElement));
  }

  function isAttributeBound(element, name) {
    return attributeBindings.get(element)?.has(name) || false;
  }

  function translateTextNode(node) {
    if (isTextBound(node)) return;
    const previousRendered = textRendered.get(node);
    if (!textSources.has(node) || (previousRendered !== undefined && node.nodeValue !== previousRendered)) {
      textSources.set(node, node.nodeValue);
    }
    const source = textSources.get(node);
    const rendered = translateRaw(source);
    if (node.nodeValue !== rendered) node.nodeValue = rendered;
    textRendered.set(node, rendered);
  }

  function getAttributeRecord(element, name) {
    let records = attributeState.get(element);
    if (!records) {
      records = new Map();
      attributeState.set(element, records);
    }
    let record = records.get(name);
    const current = element.getAttribute(name);
    if (!record || current !== record.rendered) {
      record = { source: current, rendered: current };
      records.set(name, record);
    }
    return record;
  }

  function translateAttribute(element, name) {
    if (!element.hasAttribute(name) || isAttributeBound(element, name)) return;
    const record = getAttributeRecord(element, name);
    const rendered = translateRaw(record.source);
    if (element.getAttribute(name) !== rendered) element.setAttribute(name, rendered);
    record.rendered = rendered;
  }

  function translateElement(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return;
    if (['SCRIPT', 'STYLE', 'CODE', 'PRE'].includes(element.tagName)) return;
    for (const name of ['aria-label', 'title', 'placeholder', 'alt']) translateAttribute(element, name);
  }

  function translateTree(root) {
    if (!root) return;
    if (root.nodeType === Node.TEXT_NODE) {
      translateTextNode(root);
      return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) return;
    if (root.nodeType === Node.ELEMENT_NODE) translateElement(root);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (node.nodeType === Node.TEXT_NODE) {
        const parent = node.parentElement;
        if (!parent || !['SCRIPT', 'STYLE', 'CODE', 'PRE'].includes(parent.tagName)) translateTextNode(node);
      } else {
        translateElement(node);
      }
    }
  }

  function renderText(element, source, values = {}) {
    if (!element) return '';
    const binding = { source: String(source ?? ''), values: { ...values } };
    textBindings.set(element, binding);
    const rendered = t(binding.source, binding.values);
    if (element.textContent !== rendered) element.textContent = rendered;
    return rendered;
  }

  function renderAttribute(element, name, source, values = {}) {
    if (!element || !name) return '';
    let records = attributeBindings.get(element);
    if (!records) {
      records = new Map();
      attributeBindings.set(element, records);
    }
    const binding = { source: String(source ?? ''), values: { ...values } };
    records.set(name, binding);
    const rendered = t(binding.source, binding.values);
    if (element.getAttribute(name) !== rendered) element.setAttribute(name, rendered);
    return rendered;
  }

  function refreshBindings() {
    for (const [element, binding] of textBindings) {
      if (!element.isConnected) {
        textBindings.delete(element);
        continue;
      }
      const rendered = t(binding.source, binding.values);
      if (element.textContent !== rendered) element.textContent = rendered;
    }
    for (const [element, records] of attributeBindings) {
      if (!element.isConnected) {
        attributeBindings.delete(element);
        continue;
      }
      for (const [name, binding] of records) {
        const rendered = t(binding.source, binding.values);
        if (element.getAttribute(name) !== rendered) element.setAttribute(name, rendered);
      }
    }
  }

  function createLanguagePicker() {
    const mount = document.querySelector('.utilities') || document.body;
    if (!mount || document.getElementById('language-select')) return;
    const label = document.createElement('label');
    label.className = 'language-picker';
    renderAttribute(label, 'aria-label', '选择语言');

    const icon = document.createElement('span');
    icon.className = 'language-picker-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = '🌐';

    const select = document.createElement('select');
    select.id = 'language-select';
    renderAttribute(select, 'aria-label', '选择语言');
    for (const locale of LOCALES) {
      const option = document.createElement('option');
      option.value = locale.id;
      option.textContent = locale.label;
      select.append(option);
    }
    select.value = currentLocale;
    select.addEventListener('change', () => setLocale(select.value));
    label.append(icon, select);
    mount.append(label);
  }

  function syncLocaleUrl() {
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.get('lang') === currentLocale) return;
      url.searchParams.set('lang', currentLocale);
      history.replaceState(history.state, '', url.toString());
    } catch (_) {}
  }

  function setLocale(locale) {
    const normalized = normalizeLocale(locale);
    if (!normalized || !localeIds.has(normalized)) return false;
    currentLocale = normalized;
    try { localStorage.setItem(STORAGE_KEY, currentLocale); } catch (_) {}
    syncLocaleUrl();
    document.documentElement.lang = currentLocale;
    const picker = document.getElementById('language-select');
    if (picker) picker.value = currentLocale;
    translateTree(document.documentElement);
    refreshBindings();
    document.dispatchEvent(new CustomEvent('melon:localechange', { detail: { locale: currentLocale } }));
    return true;
  }

  function formatNumber(value, options) {
    const numeric = Number(value);
    return new Intl.NumberFormat(currentLocale, options).format(Number.isFinite(numeric) ? numeric : 0);
  }

  function start() {
    createLanguagePicker();
    document.documentElement.lang = currentLocale;
    translateTree(document.documentElement);
    refreshBindings();
    observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        if (mutation.type === 'characterData') translateTextNode(mutation.target);
        else if (mutation.type === 'attributes') translateAttribute(mutation.target, mutation.attributeName);
        else for (const node of mutation.addedNodes) translateTree(node);
      }
    });
    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['aria-label', 'title', 'placeholder', 'alt'],
    });
  }

  window.MelonI18n = Object.freeze({
    t,
    setLocale,
    renderText,
    renderAttribute,
    formatNumber,
    locales: LOCALES,
    get locale() { return currentLocale; },
  });

  start();
})();
