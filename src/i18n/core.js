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
  const localeIds = new Set(LOCALES.map(locale => locale.id));
  const textSources = new WeakMap();
  const textRendered = new WeakMap();
  const attributeState = new WeakMap();
  let currentLocale = resolveInitialLocale();
  let observer = null;

  function normalizeLocale(value) {
    const input = String(value || '').toLowerCase();
    if (input.startsWith('zh')) return 'zh-CN';
    for (const id of ['en', 'vi', 'ja', 'ko']) if (input === id || input.startsWith(`${id}-`)) return id;
    return null;
  }

  function resolveInitialLocale() {
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
    const catalog = window.MelonLocales?.[currentLocale] || {};
    return interpolate(catalog[source] || source, values);
  }

  function translateRaw(raw) {
    if (!raw || currentLocale === SOURCE_LOCALE) return raw;
    const match = String(raw).match(/^(\s*)([\s\S]*?)(\s*)$/);
    if (!match) return raw;
    const [, before, body, after] = match;
    if (!body) return raw;
    const translated = t(body);
    return `${before}${translated}${after}`;
  }

  function translateTextNode(node) {
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
    if (!records) { records = new Map(); attributeState.set(element, records); }
    let record = records.get(name);
    const current = element.getAttribute(name);
    if (!record || current !== record.rendered) {
      record = { source: current, rendered: current };
      records.set(name, record);
    }
    return record;
  }

  function translateAttribute(element, name) {
    if (!element.hasAttribute(name)) return;
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
    if (root.nodeType === Node.TEXT_NODE) { translateTextNode(root); return; }
    if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) return;
    if (root.nodeType === Node.ELEMENT_NODE) translateElement(root);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (node.nodeType === Node.TEXT_NODE) {
        const parent = node.parentElement;
        if (!parent || !['SCRIPT', 'STYLE', 'CODE', 'PRE'].includes(parent.tagName)) translateTextNode(node);
      } else translateElement(node);
    }
  }

  function createLanguagePicker() {
    const utilities = document.querySelector('.utilities');
    if (!utilities || document.getElementById('language-select')) return;
    const label = document.createElement('label');
    label.className = 'language-picker';
    label.setAttribute('aria-label', 'Language');
    const icon = document.createElement('span');
    icon.className = 'language-picker-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = '🌐';
    const select = document.createElement('select');
    select.id = 'language-select';
    select.setAttribute('aria-label', 'Language');
    for (const locale of LOCALES) {
      const option = document.createElement('option');
      option.value = locale.id;
      option.textContent = locale.label;
      select.append(option);
    }
    select.value = currentLocale;
    select.addEventListener('change', () => setLocale(select.value));
    label.append(icon, select);
    utilities.append(label);
  }

  function setLocale(locale) {
    const normalized = normalizeLocale(locale);
    if (!normalized || !localeIds.has(normalized)) return false;
    currentLocale = normalized;
    try { localStorage.setItem(STORAGE_KEY, currentLocale); } catch (_) {}
    document.documentElement.lang = currentLocale;
    const picker = document.getElementById('language-select');
    if (picker) picker.value = currentLocale;
    translateTree(document.documentElement);
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
    observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        if (mutation.type === 'characterData') translateTextNode(mutation.target);
        else if (mutation.type === 'attributes') translateAttribute(mutation.target, mutation.attributeName);
        else for (const node of mutation.addedNodes) translateTree(node);
      }
    });
    observer.observe(document.documentElement, {
      subtree: true, childList: true, characterData: true, attributes: true,
      attributeFilter: ['aria-label', 'title', 'placeholder', 'alt'],
    });
  }

  window.MelonI18n = Object.freeze({
    t, setLocale, formatNumber, locales: LOCALES,
    get locale() { return currentLocale; },
  });

  start();
})();
