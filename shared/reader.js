/* 国学经典共读 · 统一阅读器（数据驱动版）
 * 每本书一个 <book>/index.html 壳 + <book>/data.json 数据 + study.html 研读页。
 * 由 /shared/reader.css 提供全部样式。
 */
(function () {
  'use strict';

  var BOOK = document.body.getAttribute('data-book') || location.pathname.split('/')[1] || 'guoxue';
  var DATA_URL = '/' + BOOK + '/data.json';
  var BOOKS_URL = '/books.json';
  var STUDY_URL = '/' + BOOK + '/study.html';

  var data = null, books = [];
  var CN = ['一','二','三','四','五','六','七','八','九','十','十一','十二','十三','十四',
    '十五','十六','十七','十八','十九','二十','二十一','二十二','二十三','二十四','二十五',
    '二十六','二十七','二十八','二十九','三十','三十一','三十二','三十三','三十四','三十五',
    '三十六','三十七','三十八','三十九','四十','四十一','四十二','四十三','四十四','四十五',
    '四十六','四十七','四十八','四十九','五十','五十一','五十二','五十三','五十四','五十五',
    '五十六','五十七','五十八','五十九','六十','六十一','六十二','六十三','六十四','六十五',
    '六十六','六十七','六十八','六十九','七十'];

  // ------------------------------------------------------------ utils ----
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function stripTags(html) {
    return html.replace(/<rt>[\s\S]*?<\/rt>/g, '')
      .replace(/<[^>]+>/g, '').replace(/\s+/g, '');
  }
  function lsGet(k) {
    try { return window.localStorage.getItem(k) || ''; } catch (e) { return ''; }
  }
  function lsSet(k, v) {
    try { window.localStorage.setItem(k, v); } catch (e) {}
  }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function dateStr(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parseDate(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function addDays(s, n) { var d = parseDate(s); d.setDate(d.getDate() + n); return d; }
  function mdStr(d) { return (d.getMonth() + 1) + '月' + d.getDate() + '日'; }

  var toastTimer = null;
  function toast(msg, ms) {
    var t = $('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, ms || 2200);
  }

  function copyText(text, okMsg) {
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); toast(okMsg || '已复制'); } catch (e) { toast('复制失败'); }
      document.body.removeChild(ta);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast(okMsg || '已复制'); }, fallback);
    } else fallback();
  }

  // ------------------------------------------------------------- state ---
  var V = {};              // book vars (LS_KEY etc.)
  var TOTAL = 0;
  var currentChapter = 1;  // 当前章（分页视图 / 记录用）
  var rendered = {};       // n -> true（章 DOM 已渲染）
  var searchIndex = [];

  function lsKey(name) { return (V[name] || BOOK + '_' + name); }
  var LS_START, LS_LAST, LS_SHENG, LS_READ, LS_PY, LS_THEME, LS_PAGED, LS_PAL;

  function initKeys() {
    LS_START = lsKey('LS_KEY') || (BOOK + '_start_v1');
    LS_LAST = lsKey('LAST_KEY') || (BOOK + '_last_v1');
    LS_SHENG = lsKey('SHENG_KEY') || (BOOK + '_sheng_v1');
    LS_READ = BOOK + '_read_v1';
    LS_PY = BOOK + '_py';
    LS_PAGED = BOOK + '_paged';
    LS_THEME = 'guoxue_theme';
    LS_PAL = 'guoxue_pal';
  }

  function dayIndex() {
    var s = lsGet(LS_START) || dateStr(new Date());
    var diff = Math.round((parseDate(dateStr(new Date())) - parseDate(s)) / 86400000) + 1;
    return Math.min(Math.max(diff, 1), TOTAL);
  }

  function startDate() { return lsGet(LS_START) || dateStr(new Date()); }

  function readSet() {
    try { return JSON.parse(lsGet(LS_READ) || '{}'); } catch (e) { return {}; }
  }
  function markRead(n) {
    var r = readSet();
    if (!r[n]) { r[n] = 1; lsSet(LS_READ, JSON.stringify(r)); }
    syncTocMarks();
  }

  // ------------------------------------------------------ html builders --
  function shellHtml() {
    var m = data.meta;
    return ''
      + '<div class="layout">'
      + '<div id="tocBackdrop"></div>'
      + '<aside class="sidebar">'
      + '  <div class="sidebar-head">'
      + '    <a class="sb-back" href="/" title="返回国学经典共读首页"><span class="ar">←</span>国学经典共读</a>'
      + '    <div class="sb-book">'
      + '      <span class="sb-seal">' + esc(m.book.charAt(0)) + '</span>'
      + '      <div class="sb-text">'
      + '        <a class="sb-title" href="#cover" title="回到本书封面">' + esc(m.book) + '</a>'
      + '        <div class="sb-meta">共' + esc(cnNum(TOTAL)) + '章 · 一天一章</div>'
      + '      </div>'
      + '    </div>'
      + '  </div>'
      + '  <a href="#study" class="study-nav"><span class="sn-ico">研</span><span class="sn-t">研读专区</span><span class="sn-ar">›</span></a>'
      + '  <div class="search-box"><div class="search-field">'
      + '    <svg class="sicon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M19.5 19.5l-4-4"/></svg>'
      + '    <input id="searchInput" type="search" placeholder="搜索经文 / 译文 / 注解" autocomplete="off">'
      + '  </div></div>'
      + '  <ul class="search-results" id="searchResults"></ul>'
      + '  <details class="toc-details" id="tocDetails" open><summary>目 录</summary>'
      + '    <nav class="toc" id="toc"><ol id="tocList">' + tocHtml() + '</ol></nav>'
      + '  </details>'
      + '  <div class="sidebar-foot">' + (m.sidebar_foot || '') + '</div>'
      + '</aside>'
      + '<div class="content">'
      + '  <header class="topbar"><div class="topbar-inner">'
      + '    <nav class="crumbs"><a href="/" title="返回国学经典共读首页">国学经典共读</a>'
      + '      <span class="sep">/</span><a href="#cover" class="cur">' + esc(m.book) + '</a></nav>'
      + '    <div class="top-actions">'
      + '      <button class="btn ghost nav-btn" id="homeBtn" title="回到本书封面">封面</button>'
      + '      <button class="btn ghost nav-btn" id="studyBtn" title="研读专区">研读</button>'
      + '      <button class="btn nav-btn" id="todayBtn" title="跳到今日共读">今日</button>'
      + '      <button class="btn ghost nav-btn" id="themeBtn" title="夜间 / 日间">夜览</button>'
      + '      <button class="btn ghost" id="toolsBtn" title="工具箱">工具箱</button>'
      + '    </div>'
      + '  </div></header>'
      + '  <div class="readbar" id="readbar"></div>'
      + '  <nav class="bottom-nav" id="bottomNav">'
      + '    <button class="bn-item" id="bnToc">目录</button>'
      + '    <button class="bn-item" id="bnHome">封面</button>'
      + '    <button class="bn-item" id="bnStudy">研读</button>'
      + '    <button class="bn-item" id="bnToday">今日</button>'
      + '    <button class="bn-item" id="bnTools">工具</button>'
      + '  </nav>'
      + '  <button class="nav-handle" id="navHandle" type="button" aria-label="显示底部导航" aria-controls="bottomNav"><span></span></button>'
      + '  <div class="wrap">'
      + coverHtml()
      + '    <section id="chapters"></section>'
      + '    <section class="study view" data-view="study" id="study">'
      + '      <div id="studyBody"></div>'
      + '      <div class="study-foot"><a href="#cover" class="btn ghost">回到封面</a><span class="hint">研读内容随书加载</span></div>'
      + '    </section>'
      + '    <nav class="pager" id="pager">'
      + '      <div class="pager-row">'
      + '        <button class="btn ghost" id="pPrev"><svg class="par" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.5 5.5 8 12l6.5 6.5"/></svg><span class="plabel">上一章</span></button>'
      + '        <span class="pager-info" id="pagerInfo"></span>'
      + '        <button class="btn" id="pNext"><span class="plabel">下一章</span><svg class="par" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.5 5.5 16 12l-6.5 6.5"/></svg></button>'
      + '      </div>'
      + '    </nav>'
      + '  </div>'
      + '</div></div>'
      + '<div class="tools-mask" id="toolsMask"></div>'
      + '<div class="tools-panel" id="toolsPanel" role="dialog" aria-label="工具箱">'
      + '  <div class="tp-head"><span>工具箱</span><button class="tp-close" id="toolsClose" type="button" aria-label="关闭">×</button></div>'
      + '  <div class="tp-sec"><div class="tp-sec-t">我的践行笔记</div>'
      + '    <button class="btn block" id="exportSheng" type="button">导出我的' + esc(cnNum(TOTAL)) + '天自省</button>'
      + '    <div class="tp-note">笔记与导出都只保存在当前浏览器，不会上传云端。清除缓存、更换设备或浏览器后将不可见，建议定期导出备份。</div>'
      + '    <div class="tp-note" id="exportTip"></div></div>'
      + '  <div class="tp-sec"><div class="tp-sec-t">阅读设置</div>'
      + '    <div class="tp-row"><span>疑难字注音</span><button class="btn ghost py-toggle" id="pyBtn" type="button">开</button></div>'
      + '    <div class="tp-row"><span>夜间模式</span><button class="btn ghost" id="themeBtn2" type="button">切换</button></div>'
      + '    <div class="tp-row tp-col"><span>主题配色</span><div class="pal-swatches" id="palSwatches"></div></div>'
      + '    <div class="tp-row"><span id="modeState">分页阅读</span><button class="btn ghost" id="modeBtn" type="button">切换为连续阅读</button></div></div>'
      + '  <div class="tp-sec"><div class="tp-sec-t">共读设置</div>'
      + '    <div class="tp-row"><span>开始日期</span><input type="date" id="startDate" class="tp-date"></div>'
      + '    <div class="tp-note">改日期自动跳到对应章节</div></div>'
      + '  <div class="tp-sec"><div class="tp-sec-t">今日安心签</div>'
      + '    <div class="tp-anshen" id="tpAnshenText"></div>'
      + '    <button class="btn block ghost" id="shareAnshen" type="button">分享这句</button></div>'
      + '  <div class="tp-sec"><div class="tp-sec-t">更多经典</div><div class="tp-books" id="tpBooks"></div></div>'
      + '</div>'
      + '<button class="backtop" id="backtop" title="回到顶部">↑</button>'
      + '<div class="toast" id="toast"></div>';
  }

  function cnNum(n) { return CN[n - 1] || String(n); }

  function tocHtml() {
    var s = lsGet(LS_START) || dateStr(new Date());
    var html = '';
    for (var i = 0; i < data.chapters.length; i++) {
      var c = data.chapters[i];
      var d = addDays(s, c.n - 1);
      html += '<li><a href="#ch-' + c.n + '" data-n="' + c.n + '">'
        + '<span class="seal">' + esc(c.seal || cnNum(c.n)) + '</span>'
        + '<span class="t">' + esc(c.label) + '</span>'
        + '<span class="d">第' + c.n + '天 · ' + mdStr(d) + '</span></a></li>';
    }
    return html;
  }

  function coverHtml() {
    var m = data.meta;
    return ''
      + '<section class="cover view" data-view="cover" id="cover">'
      + '<section class="hero">'
      + '  <h1>' + esc(m.book) + '</h1>'
      + '  <p class="sub">' + esc(m.subtitle) + '</p>'
      + '  <div class="rule"></div>'
      + '  <p class="intro">' + (m.intro || '') + '</p>'
      + '</section>'
      + '<section class="plan">'
      + '  <div class="plan-head"><h2>今日共读</h2><span class="chip" id="dayChip"></span></div>'
      + '  <div class="plan-body">'
      + '    <p class="today-line" id="todayLine"></p>'
      + '    <div class="progress"><i id="progressBar"></i></div>'
      + '    <div class="plan-actions">'
      + '      <span class="plan-date">开始日期：<b id="planDateLabel"></b></span>'
      + '      <span class="hint">在「工具箱 · 共读设置」中修改</span>'
      + '      <span class="spacer"></span>'
      + '      <button class="btn" id="resumeBtn" hidden>继续阅读</button>'
      + '      <button class="btn" id="jumpBtn">跳到本章</button>'
      + '    </div>'
      + '    <noscript><p class="noscript-tip" style="display:block">当前环境未启用脚本：需启用脚本才能阅读。</p></noscript>'
      + '  </div>'
      + '</section>'
      + '<section class="anshen-block">'
      + '  <div class="anshen-card" id="anshenCard">'
      + '    <div class="anshen-label">今日安心签</div>'
      + '    <div class="anshen-text" id="anshenText"></div>'
      + '    <button class="btn ghost anshen-share" id="anshenShare" type="button">分享这句</button>'
      + '  </div>'
      + '</section>'
      + '</section>';
  }

  // --------------------------------------------------------- chapter -----
  function panelYi(rows) {
    var h = '<div class="sentences">';
    for (var i = 0; i < rows.length; i++) {
      h += '<div class="srow"><div class="src">' + rows[i].src + '</div>'
        + '<div class="tr">' + esc(rows[i].tr) + '</div></div>';
    }
    return h + '</div>';
  }
  function panelZhu(items) {
    var h = '<ul class="zhu">';
    for (var i = 0; i < items.length; i++) {
      h += '<li><b>' + esc(items[i].term) + '</b>' + esc(items[i].text) + '</li>';
    }
    return h + '</ul>';
  }
  function panelChuan(p) {
    var h = p.paras.map(function (t) { return '<p>' + t + '</p>'; }).join('');
    if (p.jzchain && p.jzchain.entries && p.jzchain.entries.length) {
      h += '<div class="jzchain"><div class="jzhead">' + esc(p.jzchain.head || '经证链') + '</div><ul class="jzlist">';
      var es = p.jzchain.entries;
      for (var i = 0; i < es.length; i++) {
        h += '<li><span class="jzbook">' + esc(es[i].book) + '</span>'
          + '<span class="jzpass">' + esc(es[i].pass) + '</span>'
          + '<span class="jznote">' + esc(es[i].note) + '</span></li>';
      }
      h += '</ul></div>';
    }
    return h || '<p class="nodata">暂无串讲。</p>';
  }
  function panelZz(p) {
    return '<p class="zz-head"><span class="zz-ref">' + esc(p.ref) + '</span></p>'
      + '<p class="zz">' + esc(p.text) + '</p>';
  }
  function panelJiedu(p) {
    var h = p.hint ? '<p class="jhint">' + esc(p.hint) + '</p>' : '';
    h += '<div class="jiedu">';
    for (var i = 0; i < p.rows.length; i++) {
      var r = p.rows[i];
      h += '<div class="jrow"><button class="jlabel" type="button" aria-expanded="false">' + esc(r.label) + '</button>'
        + '<div class="jbody">'
        + (r.basis ? '<span class="jbasis">所本：' + esc(r.basis) + '</span>' : '')
        + (r.intro ? '<div class="jintro">' + esc(r.intro) + '</div>' : '')
        + r.paras.map(function (t) { return '<p>' + t + '</p>'; }).join('')
        + '</div></div>';
    }
    return h + '</div>';
  }
  function panelDao(paras) {
    return paras.map(function (t) { return '<p>' + t + '</p>'; }).join('') || '<p class="nodata">暂无导读。</p>';
  }
  function panelSheng(questions, n) {
    var h = '<div class="sheng-wrap"><ol class="sheng">';
    for (var i = 0; i < questions.length; i++) h += '<li>' + esc(questions[i]) + '</li>';
    h += '</ol><div class="sheng-note-box">'
      + '<label class="sheng-lab" for="shengNote-' + n + '">我的省察<span class="sheng-count" id="shengCount-' + n + '"></span></label>'
      + '<textarea class="sheng-note" id="shengNote-' + n + '" data-n="' + n + '" rows="3" placeholder="写下你今天的一句省察…"></textarea>'
      + '</div></div>';
    return h;
  }

  var PANEL_RENDER = {
    yi: function (p) { return panelYi(p); },
    zhu: function (p) { return panelZhu(p); },
    chuan: panelChuan,
    zz: panelZz,
    jiedu: panelJiedu,
    dao: function (p) { return panelDao(p); },
    sheng: function (p, c) { return panelSheng(p, c.n); }
  };

  function chapterHtml(c) {
    var m = data.meta;
    var h = '<article class="chapter view" data-view="ch" id="ch-' + c.n + '" data-chapter="' + c.n + '">'
      + '<div class="ch-head">'
      + '<span class="seal seal-lg">' + esc(c.seal || cnNum(c.n)) + '</span>'
      + '<div><h2>' + esc(c.title || ('第' + c.n + '章')) + '</h2><p class="lab">' + esc(c.label) + '</p></div>'
      + '<span class="spacer"></span>'
      + '<button class="btn ghost share-btn" data-n="' + c.n + '">分享本章</button>'
      + '</div>'
      + '<div class="ch-text">' + c.paras.map(function (t) { return '<p>' + t + '</p>'; }).join('') + '</div>'
      + '<div class="ch-foot"><a href="#toc">回到目录</a></div>';
    // tabs：仅渲染有内容的面板
    var tabs = [], panels = [], tabNames = [];
    var tabMap = {};
    for (var i = 0; i < c.tabs.length; i++) tabMap[c.tabs[i].id] = c.tabs[i].label;
    var order = ['yi', 'zhu', 'chuan', 'zz', 'jiedu', 'dao', 'sheng'];
    for (var j = 0; j < order.length; j++) {
      var pid = order[j];
      if (!(pid in c.panels)) continue;
      var p = c.panels[pid];
      var empty = pid === 'yi' ? !p.length
        : pid === 'sheng' ? !p.length
        : pid === 'zhu' ? !p.length
        : pid === 'dao' ? !p.length
        : pid === 'chuan' ? (!p.paras.length && !(p.jzchain && p.jzchain.entries && p.jzchain.entries.length))
        : pid === 'zz' ? !p.text
        : !p.rows.length;
      if (empty) continue;
      var first = tabs.length === 0;
      var tname = tabMap[pid] || pid;
      tabNames.push(tname);
      tabs.push('<button class="tab-btn' + (first ? ' active' : '') + '" data-tab="' + pid + '">' + esc(tname) + '</button>');
      panels.push('<div class="panel' + (first ? ' active' : '') + '" data-panel="' + pid + '">' + PANEL_RENDER[pid](p, c) + '</div>');
    }
    if (tabs.length) {
      // 详解默认折叠：先让原文独立成篇，需要时再展开注解
      h += '<details class="det">'
        + '<summary class="det-sum">'
        + '<span class="det-label">本章详解</span>'
        + '<span class="det-tabs">' + esc(tabNames.join(' · ')) + '</span>'
        + '<span class="det-act"></span>'
        + '<span class="det-chev" aria-hidden="true"></span>'
        + '</summary>'
        + '<div class="det-body">'
        + '<div class="tabs">' + tabs.join('') + '</div>'
        + '<div class="panels">' + panels.join('') + '</div>'
        + '</div></details>';
    }
    return h + '</article>';
  }

  function ensureChapter(n) {
    if (rendered[n]) return;
    var c = data.chapters[n - 1];
    if (!c) return;
    $('chapters').insertAdjacentHTML('beforeend', chapterHtml(c));
    rendered[n] = true;
    restoreShengNote(n);
    if (bodyClass('paged')) setActiveView($('ch-' + n));
  }

  function restoreShengNote(n) {
    var ta = $('shengNote-' + n);
    if (!ta) return;
    var store = shengStore();
    if (store[n]) ta.value = store[n];
    updateShengCount(n);
    ta.addEventListener('input', function () {
      var s = shengStore();
      s[n] = ta.value;
      lsSet(LS_SHENG, JSON.stringify(s));
      updateShengCount(n);
    });
  }
  function shengStore() {
    try { return JSON.parse(lsGet(LS_SHENG) || '{}'); } catch (e) { return {}; }
  }
  function updateShengCount(n) {
    var el = $('shengCount-' + n);
    var ta = $('shengNote-' + n);
    if (el && ta) el.textContent = ta.value.trim() ? '· 已记' : '';
  }

  // ----------------------------------------------------------- views -----
  function bodyClass(c) { return document.body.classList.contains(c); }

  function setActiveView(el) {
    var views = document.querySelectorAll('.view');
    for (var i = 0; i < views.length; i++) views[i].classList.remove('active-view');
    if (el) el.classList.add('active-view');
  }

  function currentView() {
    var a = document.querySelector('.view.active-view');
    if (!a) return 'cover';
    if (a.id === 'study') return 'study';
    if (a.id === 'cover') return 'cover';
    return 'ch';
  }

  function showCover() {
    showNav();
    syncNav('cover');
    if (bodyClass('paged')) {
      setActiveView($('cover'));
      window.scrollTo(0, 0);
    } else {
      window.scrollTo(0, 0);
    }
    if (location.hash && location.hash !== '#cover') history.replaceState(null, '', '#cover');
    refreshCover();
  }

  function showStudy(scroll) {
    showNav();
    syncNav('study');
    if (bodyClass('paged')) setActiveView($('study'));
    if (scroll !== false) {
      var y = $('study').getBoundingClientRect().top + window.scrollY - 10;
      window.scrollTo(0, Math.max(0, y));
    }
  }

  function showChapter(n, opts) {
    opts = opts || {};
    n = Math.min(Math.max(n, 1), TOTAL);
    currentChapter = n;
    lsSet(LS_LAST, String(n));
    markRead(n);
    ensureChapter(n);
    syncNav('ch');
    showNav();
    var el = $('ch-' + n);
    if (bodyClass('paged')) {
      setActiveView(el);
      updatePager();
      window.scrollTo(0, 0);
    } else {
      var y = el.getBoundingClientRect().top + window.scrollY - 12;
      window.scrollTo(0, Math.max(0, y));
      if (opts.flash) { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }
    }
  }

  function updatePager() {
    var info = $('pagerInfo');
    if (info) info.textContent = '第' + cnNum(currentChapter) + '章 · ' + data.chapters[currentChapter - 1].label;
    $('pPrev').disabled = currentChapter <= 1;
    $('pNext').disabled = currentChapter >= TOTAL;
  }

  function syncNav(view) {
    var ids = { homeBtn: 0, studyBtn: 0, todayBtn: 0, bnHome: 0, bnStudy: 0, bnToday: 0 };
    var map = { cover: ['homeBtn', 'bnHome'], study: ['studyBtn', 'bnStudy'], ch: ['todayBtn', 'bnToday'] };
    for (var k in map) {
      for (var i = 0; i < map[k].length; i++) {
        var el = $(map[k][i]);
        if (el) el.classList.toggle('active', view === k);
      }
    }
    document.body.classList.toggle('view-chapter', view === 'ch');
    document.body.classList.toggle('view-cover', view === 'cover');
    document.body.classList.toggle('view-study', view === 'study');
  }

  // -------------------------------------------------------- cover sync ---
  function refreshCover() {
    var d = dayIndex();
    var c = data.chapters[d - 1];
    $('dayChip').textContent = '第 ' + d + ' / ' + TOTAL + ' 天';
    $('todayLine').textContent = '第' + cnNum(d) + '章 · ' + c.label;
    $('progressBar').style.width = Math.round(d / TOTAL * 100) + '%';
    $('planDateLabel').textContent = startDate();
    var last = parseInt(lsGet(LS_LAST) || '0', 10) || 0;
    $('resumeBtn').hidden = !(last > 1 && last <= TOTAL);
    $('resumeBtn').textContent = '继续阅读 · 第' + cnNum(last) + '章';
    var an = data.anshen && data.anshen.length ? data.anshen[Math.min(d, data.anshen.length) - 1] : '';
    $('anshenText').textContent = an || '今日无安心签，径直读书。';
    $('tpAnshenText').textContent = $('anshenText').textContent;
  }

  function refreshTocDates() {
    var s = startDate();
    var links = document.querySelectorAll('#tocList a .d');
    for (var i = 0; i < links.length; i++) {
      var n = i + 1;
      links[i].textContent = '第' + n + '天 · ' + mdStr(addDays(s, n - 1));
    }
  }

  function syncTocMarks() {
    var reads = readSet();
    var today = dayIndex();
    var links = document.querySelectorAll('#tocList a');
    for (var i = 0; i < links.length; i++) {
      var n = parseInt(links[i].getAttribute('data-n'), 10);
      links[i].classList.toggle('read', !!reads[n]);
      links[i].classList.toggle('today', n === today);
      links[i].classList.toggle('active', n === currentChapter && currentView() === 'ch');
    }
  }

  // --------------------------------------------------------- sharing -----
  function shareChapter(n) {
    var c = data.chapters[n - 1];
    var first = stripTags(c.paras[0] || '');
    var snip = first.slice(0, 26);
    var url = location.origin + location.pathname + '#ch-' + n;
    copyText('《' + data.meta.book + '》' + cnNum(n) + '·' + c.label + '\n「' + snip + '……」\n' + url,
      '已复制本章分享链接');
  }

  // --------------------------------------------------------- search ------
  function buildSearchIndex() {
    searchIndex = data.chapters.map(function (c) {
      var t = stripTags(c.paras.join(''));
      var yi = (c.panels.yi || []).map(function (r) { return stripTags(r.tr); }).join('');
      return { n: c.n, label: c.label, text: t + yi };
    });
  }

  function doSearch(q) {
    var res = $('searchResults');
    if (!q || q.length < 1) { res.classList.remove('open'); res.innerHTML = ''; return; }
    var hits = [];
    for (var i = 0; i < searchIndex.length && hits.length < 20; i++) {
      var idx = searchIndex[i].text.indexOf(q);
      if (idx >= 0) {
        var start = Math.max(0, idx - 12);
        hits.push({ n: searchIndex[i].n, label: searchIndex[i].label,
          snip: '…' + searchIndex[i].text.slice(start, idx + q.length + 24) + '…' });
      }
    }
    var html = hits.length
      ? hits.map(function (h) {
          return '<li data-n="' + h.n + '"><span class="sn-title">' + esc(h.label) + '</span>'
            + '<span class="sn-hit">' + esc(h.snip) + '</span></li>';
        }).join('')
      : '<li class="empty">未找到「' + esc(q) + '」</li>';
    res.innerHTML = html;
    res.classList.add('open');
  }

  // ------------------------------------------------- immersive nav ----
  var lastChromeY = 0, chromeAccum = 0, tapStart = null, lastTapTime = 0;
  function isMobileNav() { return window.matchMedia('(max-width:1023px)').matches; }
  // 仅在真正读到正文时收起导航：封面、目录、研读页保持常显
  function readingInView() {
    if (bodyClass('paged') && currentView() !== 'ch') return false;
    var arts = document.querySelectorAll('article.chapter');
    for (var i = 0; i < arts.length; i++) {
      var r = arts[i].getBoundingClientRect();
      if (r.top < window.innerHeight * 0.6 && r.bottom > 120) return true;
    }
    return false;
  }
  function canHideNav() {
    if (!isMobileNav()) return false;
    if (!readingInView()) return false;
    if (document.body.classList.contains('toc-open')) return false;
    var tp = $('toolsPanel');
    if (tp && tp.classList.contains('open')) return false;
    return true;
  }
  function showNav() {
    document.body.classList.remove('nav-hidden');
  }
  function hideNav(force) {
    if (!canHideNav()) return;
    var nav = $('bottomNav');
    if (!force && nav && nav.contains(document.activeElement)) return;
    document.body.classList.add('nav-hidden');
  }
  function toggleNav() {
    if (!canHideNav()) return;
    if (document.body.classList.contains('nav-hidden')) showNav();
    else hideNav(true);
  }
  // 主流阅读器交互：轻点正文进入/离开沉浸，滑动仅作辅助
  function onTapStart(e) {
    if (!isMobileNav() || e.button !== 0 || e.isPrimary === false) return;
    tapStart = { x: e.clientX, y: e.clientY, t: Date.now() };
  }
  function onTapEnd(e) {
    var s = tapStart;
    tapStart = null;
    if (!s || !isMobileNav()) return;
    if (Math.abs(e.clientX - s.x) > 10 || Math.abs(e.clientY - s.y) > 10) return;
    if (Date.now() - s.t > 320) return;
    var t = e.target;
    if (!t || !t.closest) return;
    if (t.closest('a,button,summary,input,textarea,select,label,.bottom-nav,.nav-handle')) return;
    if (!t.closest('article.chapter')) return;
    var sel = window.getSelection();
    if (sel && !sel.isCollapsed && String(sel).length) return;
    var now = Date.now();
    if (now - lastTapTime < 320) return;
    lastTapTime = now;
    toggleNav();
  }
  function onScrollChrome() {
    if (!isMobileNav()) return;
    var y = window.scrollY;
    var dy = y - lastChromeY;
    lastChromeY = y;
    if (y <= 24) { chromeAccum = 0; showNav(); return; }
    if (dy > 0) {
      chromeAccum = chromeAccum > 0 ? chromeAccum + dy : dy;
      if (chromeAccum > 20 && y > 60) hideNav();
    } else if (dy < 0) {
      chromeAccum = chromeAccum < 0 ? chromeAccum + dy : dy;
      if (chromeAccum < -8) { chromeAccum = 0; showNav(); }
    }
  }

  // ------------------------------------------------- scroll spy / misc ---
  var barRaf = null;
  function updateReadbar() {
    if (barRaf) return;
    barRaf = requestAnimationFrame(function () {
      barRaf = null;
      var bar = $('readbar');
      if (!bar) return;
      var h = document.documentElement.scrollHeight - window.innerHeight;
      var p = h > 0 ? (window.scrollY / h) * 100 : 0;
      bar.style.width = Math.max(0, Math.min(100, p)) + '%';
    });
  }

  var spyRaf = null;
  function onScrollSpy() {
    updateReadbar();
    onScrollChrome();
    if (bodyClass('paged') || currentView() === 'cover') return;
    if (spyRaf) return;
    spyRaf = requestAnimationFrame(function () {
      spyRaf = null;
      var best = currentChapter, bestTop = -1e9;
      var arts = document.querySelectorAll('article.chapter');
      for (var i = 0; i < arts.length; i++) {
        var top = arts[i].getBoundingClientRect().top;
        if (top <= 140 && top > bestTop) { bestTop = top; best = parseInt(arts[i].getAttribute('data-chapter'), 10); }
      }
      if (best !== currentChapter) {
        currentChapter = best;
        lsSet(LS_LAST, String(best));
        markRead(best);
        syncTocMarks();
        scrollSidebarTo(best);
      }
    });
  }

  function scrollSidebarTo(n) {
    var a = document.querySelector('#tocList a[data-n="' + n + '"]');
    if (!a) return;
    // 宽屏下目录区独立滚动，窄屏整体滚动侧栏
    var box = document.querySelector('.toc-details');
    if (!box || box.scrollHeight <= box.clientHeight + 4) {
      box = document.querySelector('.sidebar');
    }
    if (!box) return;
    var ar = a.getBoundingClientRect(), br = box.getBoundingClientRect();
    var delta = (ar.top - br.top) - box.clientHeight / 2 + ar.height / 2;
    box.scrollTop = Math.max(0, box.scrollTop + delta);
  }

  function openToc(open) {
    if (open) showNav();
    document.body.classList.toggle('toc-open', open);
  }

  function openTools(open) {
    if (open) showNav();
    $('toolsPanel').classList.toggle('open', open);
    $('toolsMask').classList.toggle('open', open);
  }

  // ----------------------------------------------------------- look -----
  var PALS = [
    { id: 'a', name: '纸墨', c: '#8b5e3c' },
    { id: 'b', name: '朱砂', c: '#9e3b32' },
    { id: 'c', name: '黛青', c: '#33566e' },
    { id: 'd', name: '竹绿', c: '#47694f' },
    { id: 'e', name: '赭红', c: '#8d4a34' }
  ];

  function applyLook() {
    var t = lsGet(LS_THEME) || 'light';
    var pal = lsGet(LS_PAL) || 'e';
    // html 与 body 同步设置：palette.css 的组合选择器（data-pal + data-theme）才能命中
    var roots = [document.documentElement, document.body];
    for (var i = 0; i < roots.length; i++) {
      roots[i].setAttribute('data-theme', t);
      roots[i].setAttribute('data-pal', pal);
    }
    var btns = [$('themeBtn'), $('themeBtn2')];
    for (i = 0; i < btns.length; i++) if (btns[i]) btns[i].textContent = t === 'dark' ? '日间' : '夜览';

    var host = $('palSwatches');
    if (host) {
      host.innerHTML = PALS.map(function (p) {
        return '<button type="button" class="pal-swatch' + (p.id === pal ? ' on' : '') + '" data-pal-id="' + p.id + '" title="' + p.name + '">'
          + '<span style="background:' + p.c + '"></span>' + p.name + '</button>';
      }).join('');
    }
  }
  function toggleTheme() {
    lsSet(LS_THEME, (lsGet(LS_THEME) || 'light') === 'dark' ? 'light' : 'dark');
    applyLook();
  }
  function setPalFromClick(e) {
    var b = e.target.closest ? e.target.closest('.pal-swatch') : null;
    if (b) { lsSet(LS_PAL, b.getAttribute('data-pal-id')); applyLook(); }
  }

  function applyPaged() {
    var paged = (lsGet(LS_PAGED) || 'paged') !== 'cont';
    document.body.classList.toggle('paged', paged);
    $('modeBtn').textContent = paged ? '切换为连续阅读' : '切换为分页阅读';
    $('modeState').textContent = paged ? '分页阅读' : '连续阅读';
    if (paged) {
      // 重建分页视图：当前 view 高亮
      var v = currentView();
      if (v === 'ch') setActiveView($('ch-' + currentChapter));
      else if (v === 'study') setActiveView($('study'));
      else setActiveView($('cover'));
    }
    if (!paged) {
      // 连续模式：渲染全部章节
      for (var i = 1; i <= TOTAL; i++) ensureChapter(i);
      setActiveView(null);
    }
  }

  function applyPy() {
    var on = (lsGet(LS_PY) || 'on') !== 'off';
    document.body.classList.toggle('no-py', !on);
    $('pyBtn').textContent = on ? '开' : '关';
    $('pyBtn').classList.toggle('on', on);
  }

  // -------------------------------------------------------- export -------
  function exportSheng() {
    var store = shengStore();
    var lines = ['《' + data.meta.book + '》我的 ' + TOTAL + ' 天自省', '导出于 ' + dateStr(new Date()), ''];
    var count = 0;
    for (var i = 0; i < data.chapters.length; i++) {
      var c = data.chapters[i];
      var qs = data.shengq[String(c.n)] || c.panels.sheng || [];
      var note = store[c.n] || '';
      if (!qs.length && !note) continue;
      count++;
      lines.push('—— 第' + cnNum(c.n) + '章 · ' + c.label + ' ——');
      for (var j = 0; j < qs.length; j++) lines.push('问：' + qs[j]);
      if (note) lines.push('记：' + note);
      lines.push('');
    }
    if (!count) { toast('还没有省察笔记'); return; }
    var blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = data.meta.book + '自省笔记.txt';
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    $('exportTip').textContent = '已导出 ' + count + ' 天的笔记。';
  }

  // --------------------------------------------------------- books -------
  function renderTpBooks() {
    var host = $('tpBooks');
    if (!host) return;
    var html = '';
    for (var i = 0; i < books.length; i++) {
      var b = books[i];
      var cur = b.key === BOOK;
      html += (cur ? '<span class="tp-book cur">' : '<a class="tp-book" href="/' + esc(b.key) + '/">')
        + '<span class="tb-name">' + esc(b.book) + '</span>'
        + '<span class="tb-tag">' + esc(cur ? '在读' : (b.tag || '')) + ' · ' + b.total + ' 章</span>'
        + (cur ? '</span>' : '</a>');
    }
    html += '<a class="hub-all" href="/">📚 返回 国学经典共读 首页 →</a>';
    host.innerHTML = html;
  }

  // --------------------------------------------------------- routing -----
  function route() {
    var h = location.hash || '#cover';
    var m = h.match(/^#ch-(\d+)$/);
    if (m) { showChapter(parseInt(m[1], 10)); }
    else if (h === '#study') { showStudy(); }
    else if (h !== '#cover' && document.getElementById(h.slice(1))) {
      // 研读页内部锚点（#sishu-N 等）：留在研读页，由浏览器滚动
      if ($('study') && $('study').contains(document.getElementById(h.slice(1)))) {
        showStudy(false);
      }
    }
    else { showCover(); }
    syncTocMarks();
    scrollSidebarTo(currentChapter);
  }

  // ----------------------------------------------------------- bind ------
  function bind() {
    document.body.addEventListener('click', function (e) {
      var t = e.target;
      // tab 按钮
      var tab = t.closest ? t.closest('.tab-btn') : null;
      if (tab) {
        var art = tab.closest('.chapter');
        var btns = art.querySelectorAll('.tab-btn');
        for (var i = 0; i < btns.length; i++) btns[i].classList.remove('active');
        tab.classList.add('active');
        var pns = art.querySelectorAll('.panel');
        for (var j = 0; j < pns.length; j++) pns[j].classList.remove('active');
        var pn = art.querySelector('.panel[data-panel="' + tab.getAttribute('data-tab') + '"]');
        if (pn) pn.classList.add('active');
        return;
      }
      // 解读视角展开
      var jl = t.closest ? t.closest('.jlabel') : null;
      if (jl) {
        var row = jl.closest('.jrow');
        row.classList.toggle('jopen');
        jl.setAttribute('aria-expanded', row.classList.contains('jopen') ? 'true' : 'false');
        return;
      }
      // 通假字 toast
      var rj = t.closest ? t.closest('ruby.tj') : null;
      if (rj && rj.getAttribute('title')) { toast(rj.getAttribute('title'), 4200); return; }
      // 分享本章
      var sb = t.closest ? t.closest('.share-btn') : null;
      if (sb) { shareChapter(parseInt(sb.getAttribute('data-n'), 10)); return; }
      // 目录 / ch-foot 链接：仅接管阅读器自身的路由锚点
      var a = t.closest ? t.closest('a[href^="#"]') : null;
      if (a) {
        var href = a.getAttribute('href');
        if (href === '#toc') { openToc(true); e.preventDefault(); return; }
        if (/^#(ch-\d+|study|cover)$/.test(href)) {
          e.preventDefault();
          openToc(false);
          location.hash = href;
        }
        return;
      }
    });

    var map = {
      homeBtn: function () { location.hash = '#cover'; },
      bnHome: function () { location.hash = '#cover'; },
      studyBtn: function () { location.hash = '#study'; },
      bnStudy: function () { location.hash = '#study'; },
      todayBtn: function () { showChapter(dayIndex()); location.hash = '#ch-' + dayIndex(); },
      bnToday: function () { showChapter(dayIndex()); location.hash = '#ch-' + dayIndex(); },
      bnToc: function () { openToc(true); },
      bnTools: function () { openTools(true); },
      navHandle: function () {
        showNav();
        var b = $('bnToc');
        if (b) b.focus({ preventScroll: true });
      },
      toolsBtn: function () { openTools(true); },
      toolsClose: function () { openTools(false); },
      toolsMask: function () { openTools(false); },
      tocBackdrop: function () { openToc(false); },
      themeBtn: toggleTheme,
      themeBtn2: toggleTheme,
      palSwatches: setPalFromClick,
      resumeBtn: function () { showChapter(parseInt(lsGet(LS_LAST) || '1', 10) || 1); location.hash = '#ch-' + (parseInt(lsGet(LS_LAST) || '1', 10) || 1); },
      jumpBtn: function () { showChapter(dayIndex()); location.hash = '#ch-' + dayIndex(); },
      anshenShare: function () {
        copyText($('anshenText').textContent + '\n' + location.origin + location.pathname + '#ch-' + dayIndex(), '已复制安心签');
      },
      shareAnshen: function () {
        copyText($('tpAnshenText').textContent + '\n' + location.origin + location.pathname + '#ch-' + dayIndex(), '已复制安心签');
      },
      exportSheng: exportSheng,
      backtop: function () { window.scrollTo({ top: 0, behavior: 'smooth' }); },
      pPrev: function () { showChapter(currentChapter - 1); location.hash = '#ch-' + currentChapter; },
      pNext: function () { showChapter(currentChapter + 1); location.hash = '#ch-' + currentChapter; },
      modeBtn: function () {
        lsSet(LS_PAGED, bodyClass('paged') ? 'cont' : 'paged');
        applyPaged();
        if (bodyClass('paged')) { location.hash = '#ch-' + currentChapter; route(); }
      },
      pyBtn: function () {
        lsSet(LS_PY, (lsGet(LS_PY) || 'on') === 'on' ? 'off' : 'on');
        applyPy();
      }
    };
    for (var k in map) {
      (function (id, fn) {
        var el = $(id);
        if (el) el.addEventListener('click', fn);
      })(k, map[k]);
    }

    // 开始日期
    var sd = $('startDate');
    sd.value = startDate();
    sd.addEventListener('change', function () {
      if (!sd.value) return;
      lsSet(LS_START, sd.value);
      refreshTocDates();
      refreshCover();
      syncTocMarks();
      showChapter(dayIndex());
      location.hash = '#ch-' + dayIndex();
      toast('共读从 ' + sd.value + ' 开始');
    });

    // 搜索
    var si = $('searchInput');
    var timer = null;
    si.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(function () { doSearch(si.value.trim()); }, 120);
    });
    $('searchResults').addEventListener('click', function (e) {
      var li = e.target.closest ? e.target.closest('li[data-n]') : null;
      if (!li) return;
      var n = parseInt(li.getAttribute('data-n'), 10);
      openToc(false);
      showChapter(n, { flash: !bodyClass('paged') });
      location.hash = '#ch-' + n;
    });

    // 键盘翻章
    document.addEventListener('keydown', function (e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (!bodyClass('paged') || currentView() !== 'ch') return;
      if (e.key === 'ArrowLeft') { showChapter(currentChapter - 1); location.hash = '#ch-' + currentChapter; }
      if (e.key === 'ArrowRight') { showChapter(currentChapter + 1); location.hash = '#ch-' + currentChapter; }
    });

    lastChromeY = window.scrollY;
    window.addEventListener('scroll', onScrollSpy, { passive: true });
    window.addEventListener('hashchange', route);
    document.addEventListener('pointerdown', onTapStart, true);
    document.addEventListener('pointerup', onTapEnd, true);
    document.addEventListener('pointercancel', function () { tapStart = null; }, true);
    window.addEventListener('resize', function () {
      if (isMobileNav()) return;
      showNav();
    });
  }

  // ----------------------------------------------------------- boot ------
  function boot() {
    fetch(DATA_URL, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) {
        data = d;
        TOTAL = data.chapters.length;
        V = data.vars || {};
        initKeys();
        document.title = data.meta.title || (data.meta.book + ' · 共读');
        document.querySelector('#app').innerHTML = shellHtml();
        injectStudy();
        return fetch(BOOKS_URL, { cache: 'no-cache' }).then(function (r) { return r.json(); }).catch(function () { return []; });
      })
      .then(function (bs) {
        books = bs || [];
        renderTpBooks();
        applyLook();
        applyPaged();
        applyPy();
        refreshTocDates();
        buildSearchIndex();
        bind();
        refreshCover();   // 工具箱里的安心签/封面信息随时可用
        applyLook();
        route();
        $('appLoading').style.display = 'none';
      })
      .catch(function (err) {
        var el = $('appLoading');
        el.classList.add('error');
        el.textContent = '数据加载失败：' + err.message + '（' + DATA_URL + '）';
      });
  }

  function injectStudy() {
    fetch(STUDY_URL, { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.text() : ''; })
      .then(function (h) { var el = $('studyBody'); if (el) el.innerHTML = h; })
      .catch(function () {});
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else boot();
})();
