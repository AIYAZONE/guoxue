/* 国学经典共读 · 外观同步（状态栏 / 全面屏）
   把当前「日/夜 × 五套配色」同步给浏览器 UI：
   - theme-color 取当前 --paper（直接读 CSS 令牌，配色增减无需改 JS）
   - color-scheme 跟随实际明暗，避免系统控件与页面反色
   - iOS standalone 状态栏：日间 default（黑字）/ 夜间 black（白字）
   页面切换主题或配色后调用 GuoxueAppearance.sync()，或派发 guoxue:appearancechange。
*/
(function () {
  'use strict';

  var root = document.documentElement;
  var themeMeta = null, schemeMeta = null, iosMeta = null;

  function findMeta(name) {
    var list = document.getElementsByTagName('meta');
    for (var i = 0; i < list.length; i++) {
      if (list[i].getAttribute('name') === name) return list[i];
    }
    return null;
  }

  function lsGet(k) {
    try { return localStorage.getItem(k) || ''; } catch (e) { return ''; }
  }

  function sync() {
    var dark = root.getAttribute('data-theme') === 'dark';
    var paper = '';
    try { paper = getComputedStyle(root).getPropertyValue('--paper').trim(); } catch (e) {}
    if (!/^#[0-9a-fA-F]{3,8}$/.test(paper)) paper = dark ? '#1c1915' : '#faf7f2';

    if (!themeMeta) themeMeta = findMeta('theme-color');
    if (themeMeta) themeMeta.setAttribute('content', paper);

    if (!schemeMeta) schemeMeta = findMeta('color-scheme');
    if (schemeMeta) schemeMeta.setAttribute('content', dark ? 'dark' : 'light');
    root.style.colorScheme = dark ? 'dark' : 'light';

    if (!iosMeta) iosMeta = findMeta('apple-mobile-web-app-status-bar-style');
    if (iosMeta) iosMeta.setAttribute('content', dark ? 'black' : 'default');
  }

  function applyStored() {
    var dark = lsGet('guoxue_theme')
      ? lsGet('guoxue_theme') === 'dark'
      : !!(window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
    var pal = lsGet('guoxue_pal') || 'e';
    root.setAttribute('data-theme', dark ? 'dark' : 'light');
    root.setAttribute('data-pal', pal);
    if (document.body) {
      document.body.setAttribute('data-theme', dark ? 'dark' : 'light');
      document.body.setAttribute('data-pal', pal);
    }
    sync();
  }

  window.GuoxueAppearance = { sync: sync };

  document.addEventListener('guoxue:appearancechange', sync);
  window.addEventListener('storage', function (e) {
    if (e.key === 'guoxue_theme' || e.key === 'guoxue_pal') applyStored();
  });

  if (window.matchMedia) {
    var mq = matchMedia('(prefers-color-scheme: dark)');
    var onSchemeChange = function (e) { if (!lsGet('guoxue_theme')) applyStored(); };
    if (mq.addEventListener) mq.addEventListener('change', onSchemeChange);
    else if (mq.addListener) mq.addListener(onSchemeChange);
  }

  // 立即同步一次：PWA 可能在 DOMContentLoaded 前读取并锁定系统栏颜色。
  sync();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', sync);
})();
