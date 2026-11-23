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
        reading = c.get('reading')
        if reading:
            translations = reading.get('translations', [])
            if len(translations) != len(c['paras']):
                errs.append(f'ch{n} 阅读样章的译文与原文段落不一致')
            if len(reading.get('notes', [])) != len(c['paras']):
                errs.append(f'ch{n} 阅读样章的词义与原文段落数量不一致')
            if 'lecture' in reading or 'commentary' in reading:
                if not reading.get('lecture') or not all(s.get('title') and s.get('paras') for s in reading['lecture']):
                    errs.append(f'ch{n} 缺讲解标题或正文')
                if not reading.get('commentary'):
                    errs.append(f'ch{n} 缺注家解读')
                for topic in reading.get('commentary', []):
                    if not topic.get('title') or not topic.get('intro') or not topic.get('voices'):
                        errs.append(f'ch{n} 注家解读缺题目或内容')
                    for voice in topic.get('voices', []):
                        if not all(voice.get(k) for k in ('author', 'quote', 'source', 'explanation')) or not voice.get('url', '').startswith('https://'):
                            errs.append(f'ch{n} 注家引文缺正文、说明或出处')
            # 新版伴读结构
            for key in ('guide', 'paragraphs', 'deepDive', 'commentaries', 'practice', 'resonance'):
                if key not in reading:
                    errs.append(f'ch{n} 伴读结构缺 {key}')
            guide = reading.get('guide', {})
            if guide and not guide.get('oneLine'):
                errs.append(f'ch{n} 导读缺一句话')
            anchors = guide.get('anchors', []) if guide else []
            if anchors and any(not isinstance(a, int) or a < 0 or a >= len(c['paras']) for a in anchors):
                errs.append(f'ch{n} 导读锚点超出原文段落范围')
            ps = reading.get('paragraphs', [])
            if ps and len(ps) != len(c['paras']):
                errs.append(f'ch{n} 伴读段落与原文段落不一致')
            for i, p in enumerate(ps):
                for ref in p.get('refs', []):
                    if not ref.get('label') or not ref.get('href'):
                        errs.append(f'ch{n} 第{i + 1}段互参链接缺标题或地址')
            sections = reading.get('deepDive', {}).get('sections', [])
            if not sections or any(not s.get('title') or not s.get('paras') for s in sections):
                errs.append(f'ch{n} 深读长卷缺章节或正文')
            for s in sections:
                if s.get('para') is not None and not (0 <= s['para'] < len(c['paras'])):
                    errs.append(f'ch{n} 深读段落锚点越界')
            com = reading.get('commentaries', [])
            for topic in com:
                if topic.get('para') is not None and not (0 <= topic['para'] < len(c['paras'])):
                    errs.append(f'ch{n} 注家异说段落锚点越界')
                if not topic.get('title') or not topic.get('intro') or not topic.get('voices'):
                    errs.append(f'ch{n} 注家异说缺题目、引言或声音')
                for voice in topic.get('voices', []):
                    if not all(voice.get(k) for k in ('author', 'quote', 'source', 'explanation')) or not voice.get('url', '').startswith('https://'):
                        errs.append(f'ch{n} 注家异说引文缺正文、说明或 HTTPS 出处')
            practice = reading.get('practice', [])
            if not practice or any(not p.get('question') for p in practice):
                errs.append(f'ch{n} 省察问题为空')
            for p in practice:
                if p.get('para') is not None and not (0 <= p['para'] < len(c['paras'])):
                    errs.append(f'ch{n} 省察问题段落锚点越界')
            if any(not x.get('title') or not x.get('scene') for x in reading.get('resonance', [])):
                errs.append(f'ch{n} 现代处境卡缺标题或情境')

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
