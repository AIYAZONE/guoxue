#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""从各书 data.json 生成 books.json 与每本书的入口页 index.html。

用法: python3 scripts/gen_meta.py
"""
import json
import re
import html as html_mod
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent

# 分类沿用原 guoxue 书架定义
CATS = {
    'daxue': '四书', 'zhongyong': '四书',
    'zhixue': '道家', 'sushu': '道家',
    'changduanjing': '纵横', 'bingjian': '识人',
}

# 首页展示顺序
ORDER = ['daxue', 'zhongyong', 'zhixue', 'sushu', 'changduanjing', 'bingjian']

SHELL = '''<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<link rel="icon" type="image/svg+xml" href="favicon.svg">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
<meta name="theme-color" content="#faf7f2">
<meta name="application-name" content="国学共读">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="国学共读">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<script>try{{var d=document.documentElement,t=localStorage.getItem('guoxue_theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'),p=localStorage.getItem('guoxue_pal')||'e',m=document.querySelector('meta[name="theme-color"]'),L={{a:'#faf8f5',b:'#f7f5f2',c:'#f6f7f6',d:'#f5f7f2',e:'#faf7f2'}},D={{c:'#171a1d',d:'#161a17'}};d.setAttribute('data-theme',t);d.setAttribute('data-pal',p);d.style.colorScheme=t;if(m)m.content=t==='dark'?(D[p]||'#1c1915'):(L[p]||L.e)}}catch(e){{}}</script>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="description" content="{desc}">
<meta name="color-scheme" content="light dark">
<title>{title}</title>
<link rel="stylesheet" href="/shared/reader.css">
<link rel="stylesheet" href="/shared/palette.css">
<script src="/shared/appearance.js"></script>
<script src="/shared/reader.js" defer></script>
</head>
<body data-book="{key}">
<div id="appLoading">载 入 中 …</div>
<div id="app"></div>
<script>if('serviceWorker' in navigator){{addEventListener('load',function(){{navigator.serviceWorker.register('/sw.js').catch(function(){{}})}})}}</script>
</body>
</html>
'''


def main():
    books = []
    for d in sorted(REPO.iterdir()):
        dj = d / 'data.json'
        if not dj.exists():
            continue
        book = json.loads(dj.read_text(encoding='utf-8'))
        m = book['meta']
        key = book['key']
        entry = {
            'key': key,
            'book': m['book'],
            'subtitle': m['subtitle'],
            'total': len(book['chapters']),
            'cat': CATS.get(key, ''),
            'theme': m.get('theme') or m.get('extra', {}).get('theme') or '#a02c2c',
            'favchar': m.get('favchar', ''),
        }
        books.append(entry)
        desc = html_mod.unescape(re.sub(r'<[^>]+>', '', m.get('intro') or m['subtitle']))
        desc = re.sub(r'\s+', '', desc)[:110]
        shell = SHELL.format(title=m['title'], theme=entry['theme'], desc=desc,
                             key=key)
        (d / 'index.html').write_text(shell, encoding='utf-8')
        print(f"[ok] {key}: index.html + books entry ({entry['total']} 章, {entry['cat']})")
    books.sort(key=lambda b: ORDER.index(b['key']) if b['key'] in ORDER else 99)
    (REPO / 'books.json').write_text(
        json.dumps(books, ensure_ascii=False, indent=1), encoding='utf-8')
    print(f"[ok] books.json: {len(books)} 部")


if __name__ == '__main__':
    main()
