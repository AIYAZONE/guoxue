/* 国学经典共读 · 共享实体书封组件
 * 输入 books.json 条目或 data.json.meta，输出可直接插入的 HTML 字符串。
 * 主题色与纹理按 key 做白名单映射，避免把不可信字段拼进 CSS / HTML。
 */
(function (global) {
  'use strict';

  var THEMES = {
    daxue: '#a02c2c', zhongyong: '#a02c2c', zhixue: '#a02c2c',
    sushu: '#5b3a29', changduanjing: '#2f5d63', bingjian: '#2c5f7c'
  };
  var PATTERNS = {
    daxue: 'wave', zhongyong: 'concentric', zhixue: 'contour',
    sushu: 'concentric', changduanjing: 'contour', bingjian: 'diagonal'
  };
  var VARIANTS = { zhixue: 'ink' };
  // 定制书封色：大学/中庸压为沉稳砖红，止学玄墨，素书深赭檀；优先于 books.json.theme
  var COVER_COLORS = {
    daxue: '#8a3b33', zhongyong: '#803832',
    zhixue: '#2e241e', sushu: '#8a5334'
  };
  var LATIN = {
    daxue: 'DA XUE', zhongyong: 'ZHONG YONG', zhixue: 'ZHI XUE',
    sushu: 'SU SHU', changduanjing: 'CHANG DUAN JING', bingjian: 'BING JIAN'
  };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function safeColor(c) {
    var s = String(c || '');
    return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(s) ? s : '';
  }

  function pick(map, key, fallback) {
    return Object.prototype.hasOwnProperty.call(map, key) ? map[key] : fallback;
  }

  function normalize(book) {
    var b = book || {};
    var key = String(b.key || '');
    var name = String(b.book || '');
    return {
      key: key,
      book: name,
      subtitle: String(b.subtitle || ''),
      favchar: String(b.favchar || name.charAt(0) || '学'),
      color: safeColor(pick(COVER_COLORS, key, b.theme || pick(THEMES, key, ''))),
      pattern: pick(PATTERNS, key, 'grid'),
      variant: pick(VARIANTS, key, 'solid'),
      latin: pick(LATIN, key, 'GUOXUE')
    };
  }

  function html(book, options) {
    var b = normalize(book);
    var o = options || {};
    var size = o.size === 'mini' ? 'mini' : 'large';
    var extra = o.className ? ' ' + esc(o.className) : '';
    var style = b.color ? ' style="--bc-color:' + b.color + '"' : '';
    var title = b.book || '经典';
    var corners = ['tl', 'tr', 'bl', 'br'].map(function (p) {
      return '<span class="bc-corner bc-corner--' + p + '"></span>';
    }).join('');

    return '<div class="bc bc--' + size + ' bc--' + b.pattern + ' bc--' + b.variant + extra + '"' + style
      + ' role="img" aria-label="' + esc(title + ' · 书封') + '">'
      + '<div class="bc-book">'
      + '<span class="bc-spine"><i>' + esc(title) + '</i></span>'
      + '<div class="bc-face">'
      + '<span class="bc-grain"></span>'
      + '<span class="bc-frame">' + corners + '</span>'
      + '<div class="bc-content">'
      + '<span class="bc-eyebrow">国学经典 · 共读</span>'
      + '<span class="bc-title">' + esc(title) + '</span>'
      + '<span class="bc-latin">' + esc(b.latin) + '</span>'
      + '<span class="bc-sub">' + esc(b.subtitle) + '</span>'
      + '<span class="bc-imprint"><i class="bc-mark">' + esc(b.favchar) + '</i>GUOXUE GONGDU</span>'
      + '</div></div>'
      + '<span class="bc-pages"></span>'
      + '</div></div>';
  }

  global.BookCover = { html: html, normalize: normalize };
})(window);
