#!/usr/bin/env python3
from __future__ import annotations

import json
import re
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / 'index.html'
LOCALES = ('en', 'vi', 'ja', 'ko')
HAN = re.compile(r'[\u3400-\u9fff]')
PLACEHOLDER = re.compile(r'\{([A-Za-z0-9_]+)\}')
JS_STRING = re.compile(
    r"(?P<quote>['\"`])(?P<body>(?:\\.|(?!\1)[\s\S])*?)(?P=quote)"
)
UI_RUNTIME_FILES = (
    'src/app.js',
    'src/features/motion-lab.js',
    'src/features/softening-lesson.js',
)
INTERNAL_ONLY_STRINGS = {
    '慢镜头弹窗尚未插入页面。',
    '慢镜头需要 FruitPainter 实例。',
}


class TextCollector(HTMLParser):
    def __init__(self):
        super().__init__()
        self.skip = 0
        self.values = set()

    def handle_starttag(self, tag, attrs):
        if tag in {'script', 'style', 'code', 'pre'}:
            self.skip += 1
        for name, value in attrs:
            if name in {'aria-label', 'title', 'placeholder', 'alt'} and value and HAN.search(value):
                self.values.add(value.strip())

    def handle_endtag(self, tag):
        if tag in {'script', 'style', 'code', 'pre'} and self.skip:
            self.skip -= 1

    def handle_data(self, data):
        value = data.strip()
        if not self.skip and value and HAN.search(value):
            self.values.add(value)


def load_locale(locale):
    text = (ROOT / f'src/i18n/locales/{locale}.js').read_text(encoding='utf-8')
    match = re.search(r'Object\.freeze\((\{[\s\S]*\})\);\s*$', text)
    assert match, f'Cannot parse locale {locale}'
    return json.loads(match.group(1))


def load_runtime_catalogs():
    text = (ROOT / 'src/i18n/core.js').read_text(encoding='utf-8')
    match = re.search(r'const RUNTIME_CATALOGS = (\{[\s\S]*?\n  \});', text)
    assert match, 'Cannot parse RUNTIME_CATALOGS from src/i18n/core.js'
    return json.loads(match.group(1))


def placeholders(value):
    return set(PLACEHOLDER.findall(value))


def collect_ui_runtime_strings():
    values = set()
    for relative in UI_RUNTIME_FILES:
        text = (ROOT / relative).read_text(encoding='utf-8')
        for match in JS_STRING.finditer(text):
            value = match.group('body').strip()
            if value and HAN.search(value) and value not in INTERNAL_ONLY_STRINGS:
                values.add(value)
    return values


html = INDEX.read_text(encoding='utf-8')
assert INDEX.stat().st_size < 100_000, 'index.html regressed into a monolith'
assert '<style' not in html.lower(), 'inline <style> is not allowed'
for script in re.finditer(r'<script\b([^>]*)>', html, re.I):
    assert 'src=' in script.group(1), 'inline <script> is not allowed'
assert 'data:image/png;base64' not in html, 'embedded PNG atlas must stay external'
assert "script-src 'self'" in html and "style-src 'self'" in html and "img-src 'self'" in html, 'CSP must allow local static assets'
assert "'unsafe-inline'" not in html, 'CSP should not need unsafe-inline after refactor'

for relative in re.findall(r'(?:src|href)="\./([^"?#]+)', html):
    assert (ROOT / relative).exists(), f'Missing referenced file: {relative}'

atlas = ROOT / 'assets/fruit-atlas.png'
assert atlas.read_bytes()[:8] == b'\x89PNG\r\n\x1a\n', 'fruit atlas is not a PNG'
assert atlas.stat().st_size > 100_000, 'fruit atlas looks unexpectedly small'

base_catalogs = {locale: load_locale(locale) for locale in LOCALES}
base_keysets = {locale: set(catalog) for locale, catalog in base_catalogs.items()}
assert len({frozenset(keys) for keys in base_keysets.values()}) == 1, 'locale catalogs must expose the same base keys'

runtime_catalogs = load_runtime_catalogs()
assert {'zh-CN', *LOCALES} <= set(runtime_catalogs), 'runtime catalogs must cover every supported locale'
catalogs = {
    locale: {**base_catalogs[locale], **runtime_catalogs.get(locale, {})}
    for locale in LOCALES
}

collector = TextCollector(); collector.feed(html)
missing = {locale: sorted(value for value in collector.values if value not in catalogs[locale]) for locale in LOCALES}
for locale, values in missing.items():
    assert not values, f'{locale} is missing static translations: {values}'

required_dynamic = {
    '软乎乎的 · 还剩 {seconds} 秒', '连续合成 {count} 次', '还有 {seconds} 秒',
    '挤进空隙 · 消耗 {cost}', '再合成 {count} 次就能用', '下一颗水果：{fruit}',
    '合成{fruit}，获得{points}分。', '这一局合成了 {count} 次。下次试着把大水果放在一侧，别把小水果埋在底下。',
    '首次接触 {time} s · 速度 {speed} px/s', '接触蓄力 {time} s',
    '完成合成 {time} s · 产生新水果', '果 {id}', '果 {id} · 宽 {width} / 高 {height} · W/H {ratio}',
    '两颗{fruit}，合成{nextFruit}', '两颗{fruit}，合成一颗{nextFruit}。',
    '本局结束，得分{score}。',
}
ui_runtime_strings = collect_ui_runtime_strings()
all_dynamic_sources = required_dynamic | ui_runtime_strings

for locale, catalog in catalogs.items():
    missing_dynamic = all_dynamic_sources - set(catalog)
    assert not missing_dynamic, f'{locale} is missing UI/runtime translations: {sorted(missing_dynamic)}'
    for source in all_dynamic_sources:
        expected = placeholders(source)
        actual = placeholders(catalog[source])
        assert expected == actual, (
            f'{locale} placeholder mismatch for {source!r}: '
            f'missing={sorted(expected - actual)}, unexpected={sorted(actual - expected)}'
        )

# Regression guards for behavior that existed in the incremental PR and for
# runtime failures found during deep review of this modular PR.
core = (ROOT / 'src/i18n/core.js').read_text(encoding='utf-8')
query_position = core.find("params.get('lang')")
storage_position = core.find('localStorage.getItem(STORAGE_KEY)')
assert 0 <= query_position < storage_position, '?lang= must override persisted/browser locale'
assert 'renderText' in core and 'renderAttribute' in core, 'dynamic i18n bindings are required'
assert 'history.replaceState' in core, 'language changes should keep a shareable ?lang= URL without reload'
assert "compact: 'EN'" in core and "matchMedia?.('(max-width: 600px)')" in core, 'mobile locale picker must stay compact'

app = (ROOT / 'src/app.js').read_text(encoding='utf-8')
assert 'const count = 0;' not in app, 'merge particles must not be permanently disabled'
assert "Number(query.get('seed')) ||" not in app, 'seed=0 must remain deterministic'
assert 'Number.isFinite(parsedSeed)' in app, 'seed parsing must distinguish valid zero from fallback'
assert 'function readSettings' in app and "typeof parsed === 'object'" in app, 'persisted settings must be type-checked'
for source in ('两颗{fruit}，合成{nextFruit}', '两颗{fruit}，合成一颗{nextFruit}。', '本局结束，得分{score}。'):
    assert source in app, f'app must use source-keyed runtime message: {source}'
assert "document.addEventListener('melon:localechange'" in app, 'HUD must refresh on locale changes'

motion_lab = (ROOT / 'src/features/motion-lab.js').read_text(encoding='utf-8')
assert "listen(document, 'melon:localechange'" in motion_lab, 'motion lab must redraw on locale changes'
assert "latestEvent = { source:" in motion_lab, 'motion lab must preserve untranslated event sources'

fruit_catalog = (ROOT / 'src/config/fruit-catalog.js').read_text(encoding='utf-8')
assert 'const logoLevel = names.length;' in fruit_catalog, 'logo atlas level must remain the extra cell'
assert 'Object.freeze([...fruitColors,' in fruit_catalog, 'logo atlas cell needs an explicit rendering color'

print(
    f'Validated {len(collector.values)} static strings, {len(all_dynamic_sources)} UI/runtime messages, '
    f'{len(LOCALES)} translated locales, and runtime regression guards.'
)
