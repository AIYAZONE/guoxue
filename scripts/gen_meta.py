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
<meta name="theme-color" content="#faf8f5">
<script>try{{var d=document.documentElement;d.setAttribute('data-theme',localStorage.getItem('guoxue_theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'));d.setAttribute('data-pal',localStorage.getItem('guoxue_pal')||'a')}}catch(e){{}}</script>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="description" content="{desc}">
<meta name="color-scheme" content="light dark">
<title>{title}</title>
<link rel="stylesheet" href="/shared/reader.css">
<link rel="stylesheet" href="/shared/palette.css">
<script src="/shared/reader.js" defer></script>
</head>
<body data-book="{key}">
<div id="appLoading">载 入 中 …</div>
<div id="app"></div>
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
