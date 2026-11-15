#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""校验 data.json 完整性：章数、tabs、译文行数、安心签/省察问题、meta 字段。"""
import json
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
EXPECT = {'zhixue': 10, 'sushu': 6, 'daxue': 11, 'zhongyong': 33,
          'changduanjing': 64, 'bingjian': 7}

fail = 0
for d in sorted(p for p in REPO.iterdir() if (p / 'data.json').exists()):
    book = json.loads((d / 'data.json').read_text(encoding='utf-8'))
    name = book['key']
    errs = []
    exp = EXPECT.get(name)
    chs = book['chapters']
    if exp and len(chs) != exp:
        errs.append(f'章数 {len(chs)} != {exp}')
    for f in ('book', 'subtitle', 'intro', 'sidebar_foot', 'footer', 'title', 'theme'):
        if not book['meta'].get(f):
            errs.append(f'meta 缺 {f}')
    if not book['anshen'] and name != 'changduanjing':
        errs.append('缺安心签')
    nsh = len(book['shengq'])
    if not (d / 'study.html').exists() or (d / 'study.html').stat().st_size < 1000:
        errs.append('study.html 缺失或过小')
    if not (d / 'favicon.svg').exists():
        errs.append('favicon 缺失')
    # 逐章检查
    for c in chs:
        n = c['n']
        pan = c['panels']
        if not c['label']:
            errs.append(f'ch{n} 缺 label')
        yi = pan.get('yi')
        if not yi and not (name == 'changduanjing' and not pan.get('yi')):
            errs.append(f'ch{n} 缺译文')
        if not c['paras']:
            errs.append(f'ch{n} 缺原文段落')
        tabs = {t['id'] for t in c['tabs']}
        if 'chuan' in tabs and not pan.get('chuan', {}).get('paras'):
            errs.append(f'ch{n} chuan 空但存在 tab')
        if 'sheng' in tabs and not pan.get('sheng'):
            if name != 'changduanjing':
                errs.append(f'ch{n} sheng 空')
        sq = book['shengq'].get(str(n))
        if name != 'changduanjing' and (not sq or len(sq) != len(pan.get('sheng', []))):
            errs.append(f'ch{n} 省察问题 HTML({len(pan.get("sheng", []))}) 与 SHENGQ({len(sq) if sq else 0}) 不一致')
    if errs:
        fail += 1
        print(f'[FAIL] {name}: {len(errs)} 项')
        for e in errs[:20]:
            print('   -', e)
        if len(errs) > 20:
            print(f'   ... 共 {len(errs)} 项')
    else:
        yi_rows = sum(len(c['panels'].get('yi', [])) for c in chs)
        zhu = sum(len(c['panels'].get('zhu', [])) for c in chs)
        jd = sum(len(c['panels'].get('jiedu', {}).get('rows', [])) for c in chs)
        zz = sum(1 for c in chs if 'zz' in c['panels'])
        print(f'[ok] {name}: {len(chs)} 章 · 译文 {yi_rows} 句 · 注释 {zhu} 条 · 解读 {jd} 组 · 朱注章 {zz}')

sys.exit(1 if fail else 0)
