#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""从旧版单文件站点抽取内容数据到 <book>/data.json + study.html + favicon.svg。

用法:  python3 scripts/extract.py [源站目录...]
不带参数时处理仓库同级目录下的 6 个旧站点。
"""
import json
import re
import base64
import sys
import html as html_mod
from pathlib import Path
from html.parser import HTMLParser

REPO = Path(__file__).resolve().parent.parent
VOID = {'br', 'hr', 'img', 'input', 'meta', 'link', 'source', 'wbr',
        'area', 'base', 'col', 'embed', 'track'}


# ---------------------------------------------------------------- DOM ------
class Node:
    __slots__ = ('tag', 'attrs', 'raw', 'children', 'parent')

    def __init__(self, tag, attrs, raw=''):
        self.tag = tag
        self.attrs = dict(attrs)
        self.raw = raw
        self.children = []
        self.parent = None


class TreeBuilder(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.root = Node('#root', {})
        self.stack = [self.root]

    def _add(self, node):
        node.parent = self.stack[-1]
        self.stack[-1].children.append(node)

    def handle_starttag(self, tag, attrs):
        n = Node(tag, attrs, self.get_starttag_text())
        self._add(n)
        if tag not in VOID:
            self.stack.append(n)

    def handle_startendtag(self, tag, attrs):
        self._add(Node(tag, attrs, self.get_starttag_text()))

    def handle_endtag(self, tag):
        for i in range(len(self.stack) - 1, 0, -1):
            if self.stack[i].tag == tag:
                del self.stack[i + 1:]
                self.stack.pop()
                return

    def _text(self, s):
        if not s:
            return
        prev = self.stack[-1].children
        if prev and isinstance(prev[-1], str):
            prev[-1] += s
        else:
            prev.append(s)

    def handle_data(self, d):
        self._text(d)

    def handle_entityref(self, name):
        self._text(f'&{name};')

    def handle_charref(self, content):
        self._text(f'&#{content};')


def parse_html(s):
    tb = TreeBuilder()
    tb.feed(s)
    tb.close()
    return tb.root


def ser_children(node):
    return ''.join(ser(c) for c in node.children)


def ser(node):
    if isinstance(node, str):
        return node
    if node.tag == '#root':
        return ser_children(node)
    inner = ser_children(node)
    if node.tag in VOID:
        return node.raw
    return node.raw + inner + f'</{node.tag}>'


def text_of(node):
    """取纯文本（实体已解码），ruby 注音部分丢弃。"""
    out = []

    def walk(n, skip_rt):
        for c in n.children if not isinstance(n, str) else []:
            if isinstance(c, str):
                out.append(c)
            elif skip_rt and c.tag == 'rt':
                continue
            else:
                walk(c, skip_rt)
    walk(node, True)
    t = ''.join(out)
    t = re.sub(r'\s+', '', t)
    return html_mod.unescape(t)


def find_all(node, tag=None, cls=None):
    res = []

    def walk(n):
        for c in n.children:
            if isinstance(c, str):
                continue
            if (tag is None or c.tag == tag) and (cls is None or cls in (c.attrs.get('class') or '').split()):
                res.append(c)
            walk(c)
    walk(node)
    return res


def find(node, tag=None, cls=None, id_=None):
    for c in find_all(node, tag, cls):
        if id_ is not None and c.attrs.get('id') != id_:
            continue
        return c
    return None


def kids(node, tag=None, cls=None):
    if node is None:
        return []
    res = []
    for c in node.children:
        if isinstance(c, str):
            continue
        if (tag is None or c.tag == tag) and (cls is None or cls in (c.attrs.get('class') or '').split()):
            res.append(c)
    return res


# ---------------------------------------------------------------- vars -----
def extract_vars(script_text):
    out = {}
    for line in script_text.splitlines():
        m = re.match(r'\s*var\s+(\w+)\s*=\s*(.+?);?\s*(/\*.*\*/)?\s*$', line)
        if not m:
            continue
        name, val = m.group(1), m.group(2).strip()
        if name in out:
            continue
        try:
            out[name] = json.loads(val)
        except Exception:
            if len(val) >= 2 and val[0] == "'" and val[-1] == "'":
                out[name] = val[1:-1].replace("\\'", "'")
            elif val in ('true', 'false'):
                out[name] = val == 'true'
            elif re.fullmatch(r'-?\d+', val):
                out[name] = int(val)
    return out


# ------------------------------------------------------------ panels -------
def parse_panel_yi(p):
    rows = []
    for srow in find_all(p, 'div', 'srow'):
        src = find(srow, 'div', 'src')
        tr = find(srow, 'div', 'tr')
        rows.append({'src': ser_children(src) if src else '', 'tr': text_of(tr) if tr else ''})
    return rows


def parse_panel_zhu(p):
    items = []
    for li in find_all(p, 'li'):
        b = find(li, 'b')
        term = text_of(b) if b else ''
        full = text_of(li)
        rest = full[len(term):].lstrip('：:　 ') if term else full
        items.append({'term': term, 'text': rest})
    return items


def parse_panel_chuan(p):
    paras, chain = [], None
    for c in p.children:
        if isinstance(c, str):
            continue
        if c.tag == 'p':
            paras.append(ser_children(c))
        elif c.attrs.get('class') == 'jzchain':
            head = find(c, 'div', 'jzhead')
            entries = []
            for li in find_all(c, 'li'):
                entries.append({
                    'book': text_of(find(li, 'span', 'jzbook')),
                    'pass': text_of(find(li, 'span', 'jzpass')),
                    'note': text_of(find(li, 'span', 'jznote')),
                })
            chain = {'head': text_of(head), 'entries': entries}
    return {'paras': paras, 'jzchain': chain}


def parse_panel_zz(p):
    ref = find(p, 'span', 'zz-ref')
    body = find(p, 'p', 'zz')
    return {'ref': text_of(ref), 'text': text_of(body)}


def parse_panel_jiedu(p):
    hint = find(p, 'p', 'jhint')
    rows = []
    for jrow in find_all(p, 'div', 'jrow'):
        lab = find(jrow, 'button', 'jlabel')
        basis = find(jrow, 'span', 'jbasis')
        intro = find(jrow, 'div', 'jintro')
        jbody = find(jrow, 'div', 'jbody')
        paras = [ser_children(c) for c in (jbody.children if jbody else []) if not isinstance(c, str) and c.tag == 'p']
        bas = text_of(basis)
        while bas.startswith('所本：') or bas.startswith('所本:'):
            bas = bas[3:]
        rows.append({'label': text_of(lab), 'basis': bas,
                     'intro': text_of(intro), 'paras': paras})
    return {'hint': text_of(hint), 'rows': rows}


def parse_panel_dao(p):
    return [ser_children(c) for c in p.children if not isinstance(c, str) and c.tag == 'p']


def parse_panel_sheng(p):
    ol = find(p, 'ol', 'sheng')
    return [text_of(li) for li in kids(ol, 'li')] if ol else []


PANEL_PARSERS = {
    'yi': parse_panel_yi,
    'zhu': parse_panel_zhu,
    'chuan': parse_panel_chuan,
    'zz': parse_panel_zz,
    'jiedu': parse_panel_jiedu,
    'dao': parse_panel_dao,
    'sheng': parse_panel_sheng,
}


def parse_chapter(article):
    ch = {}
    ch['id'] = article.attrs.get('id')
    ch['n'] = int(article.attrs.get('data-chapter', '0'))
    head = find(article, 'div', 'ch-head')
    h2 = find(head, 'h2')
    lab = find(head, 'p', 'lab')
    ch['title'] = text_of(h2) if h2 else ''
    ch['label'] = text_of(lab) if lab else ''
    seal = find(head, 'span', 'seal')
    ch['seal'] = text_of(seal) if seal else ''
    chhead_text = find(article, 'div', 'ch-text')
    ch['paras'] = [ser_children(c) for c in kids(chhead_text, 'p')]
    det = find(article, 'div', 'det')
    tabs, panels = [], {}
    if det:
        for btn in find_all(det, 'button', 'tab-btn'):
            tabs.append({'id': btn.attrs.get('data-tab'), 'label': text_of(btn)})
        for p in find_all(det, 'div', 'panel'):
            pid = p.attrs.get('data-panel')
            fn = PANEL_PARSERS.get(pid)
            if fn:
                panels[pid] = fn(p)
    ch['tabs'] = tabs
    ch['panels'] = panels
    return ch


# ---------------------------------------------------------------- main -----
def extract_book(src: Path):
    raw = src.joinpath('index.html').read_text(encoding='utf-8')
    root = parse_html(raw)

    scripts = ''.join(ser_children(s) for s in find_all(root, 'script'))
    script_vars = extract_vars(scripts)

    meta = {}
    title_tag = find(root, 'title')
    meta['title'] = text_of(title_tag) if title_tag else ''
    for m in find_all(root, 'meta'):
        if m.attrs.get('name') == 'theme-color':
            meta['theme'] = m.attrs.get('content')
    hero = find(root, 'section', 'hero')
    if hero:
        h1 = find(hero, 'h1')
        meta['book'] = text_of(h1) if h1 else ''
        sub = find(hero, 'p', 'sub')
        meta['subtitle'] = text_of(sub) if sub else ''
        intro = find(hero, 'p', 'intro')
        meta['intro'] = ser_children(intro) if intro else ''
    sfoot = find(root, 'div', 'sidebar-foot')
    meta['sidebar_foot'] = ser_children(sfoot) if sfoot else ''
    footer = find(root, 'footer')
    meta['footer'] = ser_children(footer) if footer else ''
    # favicon: data-uri svg -> favicon.svg
    fav = None
    for link in find_all(root, 'link'):
        if link.attrs.get('rel') == 'icon':
            fav = link.attrs.get('href')
            break
    if fav and fav.startswith('data:image/svg+xml;base64,'):
        svg = base64.b64decode(fav.split(',', 1)[1]).decode('utf-8')
        dest = REPO / src.name / 'favicon.svg'
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(svg, encoding='utf-8')
        mt = re.search(r'<text[^>]*>(.*?)</text>', svg)
        meta['favchar'] = mt.group(1) if mt else ''
    # 长短经 config.json 合并
    cfg = src / 'config.json'
    extra = json.loads(cfg.read_text(encoding='utf-8')) if cfg.exists() else {}

    chapters = [parse_chapter(a) for a in find_all(root, 'article', 'chapter')]
    study = find(root, 'section', None, 'study')
    study_html = ser_children(study) if study else ''

    book = {
        'key': src.name,
        'meta': meta,
        'vars': {k: script_vars.get(k) for k in
                 ('LS_KEY', 'LAST_KEY', 'SHENG_KEY', 'SHARE_BASE', 'PAGED')},
        'anshen': script_vars.get('ANSHEN', []),
        'shengq': script_vars.get('SHENGQ', {}),
        'chapters': chapters,
        'extra': extra,
    }
    out_dir = REPO / src.name
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / 'data.json').write_text(
        json.dumps(book, ensure_ascii=False, indent=1), encoding='utf-8')
    (out_dir / 'study.html').write_text(study_html, encoding='utf-8')
    print(f"[ok] {src.name}: {len(chapters)} 章, study {len(study_html)//1024} KB")
    return book


def main():
    default = [REPO.parent / n for n in
               ('zhixue', 'sushu', 'daxue', 'zhongyong', 'changduanjing', 'bingjian')]
    srcs = [Path(a) for a in sys.argv[1:]] or default
    for s in srcs:
        extract_book(s)


if __name__ == '__main__':
    main()
