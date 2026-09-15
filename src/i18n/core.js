(function () {
  'use strict';

  const SOURCE_LOCALE = 'zh-CN';
  const STORAGE_KEY = 'melt-melon.locale';
  const LOCALES = Object.freeze([
    { id: 'zh-CN', label: '中文', compact: '中' },
    { id: 'en', label: 'English', compact: 'EN' },
    { id: 'vi', label: 'Tiếng Việt', compact: 'VI' },
    { id: 'ja', label: '日本語', compact: '日' },
    { id: 'ko', label: '한국어', compact: 'KO' },
  ]);

  // Dynamic/source corrections live here instead of being assembled from translated
  // sentences at runtime. Keep this object JSON-compatible: validate_static.py parses it.
  const RUNTIME_CATALOGS = {
    "zh-CN": {
      "选择语言": "选择语言",
      "揉软看看 ≋": "揉软看看 ≋",
      "两颗{fruit}，合成{nextFruit}": "两颗{fruit}，合成{nextFruit}",
      "两颗{fruit}，合成一颗{nextFruit}。": "两颗{fruit}，合成一颗{nextFruit}。",
      "西瓜，西瓜不会消除": "西瓜，西瓜不会消除",
      "西瓜不会消除，要给新水果留出空间。": "西瓜不会消除，要给新水果留出空间。",
      "本局结束，得分{score}。": "本局结束，得分{score}。",
      "自在玩吧，随时可以点“玩法”。": "自在玩吧，随时可以点“玩法”。",
      "已取消，这颗先留着。": "已取消，这颗先留着。",
      "40 颗水果 · 渲染压力场景": "40 颗水果 · 渲染压力场景",
      "检查透明外膜 · 桃子、椰子、苹果、柠檬": "检查透明外膜 · 桃子、椰子、苹果、柠檬",
      "两颗相同水果碰到一起，变成下一种水果。共十一级，下一颗随机来自前五级；连续合成会多得分。": "两颗相同水果碰到一起，变成下一种水果。共十一级，下一颗随机来自前五级；连续合成只显示连击提示，不会额外加分。"
    },
    "en": {
      "选择语言": "Choose language",
      "揉软看看 ≋": "Try softening ≋",
      "两颗{fruit}，合成{nextFruit}": "Two {fruit} merge into {nextFruit}",
      "两颗{fruit}，合成一颗{nextFruit}。": "Two {fruit} merge into one {nextFruit}.",
      "西瓜，西瓜不会消除": "Watermelon — it stays in the pool after merging.",
      "西瓜不会消除，要给新水果留出空间。": "Watermelons stay in the pool, so leave room for the fruit that come next.",
      "本局结束，得分{score}。": "Round over · {score} points.",
      "自在玩吧，随时可以点“玩法”。": "You're on your own now — open How to play any time you need a refresher.",
      "已取消，这颗先留着。": "Drop cancelled. You can place this fruit again.",
      "40 颗水果 · 渲染压力场景": "40 fruit · rendering stress test",
      "检查透明外膜 · 桃子、椰子、苹果、柠檬": "Check outer membranes · peach, coconut, apple, lemon",
      "两颗相同水果碰到一起，变成下一种水果。共十一级，下一颗随机来自前五级；连续合成会多得分。": "When two matching fruits touch, they merge into the next level. There are 11 levels, and the next fruit is randomly chosen from the first five. Chain merges show a combo, but do not award bonus points."
    },
    "vi": {
      "选择语言": "Chọn ngôn ngữ",
      "揉软看看 ≋": "Thử làm mềm ≋",
      "两颗{fruit}，合成{nextFruit}": "Hai {fruit} ghép thành {nextFruit}",
      "两颗{fruit}，合成一颗{nextFruit}。": "Hai {fruit} ghép thành một {nextFruit}.",
      "西瓜，西瓜不会消除": "Dưa hấu — ghép xong vẫn ở lại trong khay.",
      "西瓜不会消除，要给新水果留出空间。": "Dưa hấu không biến mất, nhớ chừa chỗ cho những trái tiếp theo.",
      "本局结束，得分{score}。": "Ván kết thúc · {score} điểm.",
      "自在玩吧，随时可以点“玩法”。": "Giờ cứ chơi thoải mái; cần xem lại thì mở “Cách chơi” bất cứ lúc nào.",
      "已取消，这颗先留着。": "Đã hủy lượt thả. Bạn có thể đặt lại trái này.",
      "40 颗水果 · 渲染压力场景": "40 trái · kiểm thử tải hiển thị",
      "检查透明外膜 · 桃子、椰子、苹果、柠檬": "Kiểm tra màng ngoài · đào, dừa, táo, chanh",
      "两颗相同水果碰到一起，变成下一种水果。共十一级，下一颗随机来自前五级；连续合成会多得分。": "Hai trái giống nhau chạm nhau sẽ ghép thành cấp tiếp theo. Có 11 cấp; trái kế tiếp được chọn ngẫu nhiên trong 5 cấp đầu. Ghép liên tiếp chỉ hiện combo, không cộng thêm điểm thưởng."
    },
    "ja": {
      "选择语言": "言語を選択",
      "揉软看看 ≋": "やわらかくしてみる ≋",
      "两颗{fruit}，合成{nextFruit}": "同じ{fruit}2つで{nextFruit}に合成",
      "两颗{fruit}，合成一颗{nextFruit}。": "同じ{fruit}2つが合わさると、{nextFruit}になります。",
      "西瓜，西瓜不会消除": "スイカ。合成しても消えません。",
      "西瓜不会消除，要给新水果留出空间。": "スイカは消えないので、次のフルーツのスペースを残しておこう。",
      "本局结束，得分{score}。": "ゲーム終了 · スコア {score}。",
      "自在玩吧，随时可以点“玩法”。": "あとは自由に遊ぼう。「遊び方」はいつでも開けます。",
      "已取消，这颗先留着。": "投下をキャンセルしました。このフルーツはもう一度置けます。",
      "40 颗水果 · 渲染压力场景": "40フルーツ · 描画負荷テスト",
      "检查透明外膜 · 桃子、椰子、苹果、柠檬": "外膜を確認 · モモ、ココナッツ、リンゴ、レモン",
      "两颗相同水果碰到一起，变成下一种水果。共十一级，下一颗随机来自前五级；连续合成会多得分。": "同じフルーツ同士が触れると、次の段階のフルーツに合成されます。全11段階で、次のフルーツは最初の5段階からランダムに選ばれます。連続合成ではコンボ表示が出ますが、ボーナス得点はありません。"
    },
    "ko": {
      "选择语言": "언어 선택",
      "揉软看看 ≋": "부드럽게 해보기 ≋",
      "两颗{fruit}，合成{nextFruit}": "같은 {fruit} 두 개 → {nextFruit}",
      "两颗{fruit}，合成一颗{nextFruit}。": "같은 {fruit} 두 개가 만나면 {nextFruit} 하나가 됩니다.",
      "西瓜，西瓜不会消除": "수박. 합성해도 사라지지 않습니다.",
      "西瓜不会消除，要给新水果留出空间。": "수박은 사라지지 않으니 다음 과일이 들어올 공간을 남겨두세요.",
      "本局结束，得分{score}。": "게임 종료 · {score}점.",
      "自在玩吧，随时可以点“玩法”。": "이제 자유롭게 플레이하세요. 필요하면 언제든 “게임 방법”을 열 수 있습니다.",
      "已取消，这颗先留着。": "투하를 취소했습니다. 이 과일은 다시 놓을 수 있습니다.",
      "40 颗水果 · 渲染压力场景": "과일 40개 · 렌더링 부하 테스트",
      "检查透明外膜 · 桃子、椰子、苹果、柠檬": "외막 확인 · 복숭아, 코코넛, 사과, 레몬",
      "两颗相同水果碰到一起，变成下一种水果。共十一级，下一颗随机来自前五级；连续合成会多得分。": "같은 과일 두 개가 닿으면 다음 단계 과일로 합쳐집니다. 총 11단계이며, 다음 과일은 처음 5단계 중 하나가 무작위로 나옵니다. 연속 합성은 콤보로 표시되지만 추가 점수는 없습니다."
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
    const compact = window.matchMedia?.('(max-width: 600px)').matches === true;
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
      option.textContent = compact ? locale.compact : locale.label;
      select.append(option);
    }
    select.value = currentLocale;
    select.addEventListener('change', () => setLocale(select.value));
    if (!compact) label.append(icon);
    label.append(select);
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