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

catalogs = {locale: load_locale(locale) for locale in LOCALES}
keysets = {locale: set(catalog) for locale, catalog in catalogs.items()}
assert len({frozenset(keys) for keys in keysets.values()}) == 1, 'locale catalogs must expose the same keys'

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
}
for locale, catalog in catalogs.items():
    assert required_dynamic <= set(catalog), f'{locale} is missing dynamic translations'
print(f'Validated {len(collector.values)} static translatable strings across {len(LOCALES)} locales.')
