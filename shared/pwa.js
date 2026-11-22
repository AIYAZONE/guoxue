/* 国学经典共读 · PWA 安装入口 */
(function () {
  'use strict';

  var deferredPrompt = null;
  var installed = false;
  var guide = null;
  var guideBody = null;

  function isStandalone() {
    return installed || window.navigator.standalone === true
      || !!(window.matchMedia && matchMedia('(display-mode: standalone)').matches);
  }

  function isIOS() {
    var ua = navigator.userAgent;
    return /iPad|iPhone|iPod/.test(ua)
      || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }

  function updateButtons() {
    var buttons = document.querySelectorAll('[data-pwa-install]');
    var standalone = isStandalone();
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].disabled = standalone;
      buttons[i].innerHTML = standalone ? '已安装' : '安装 <span class="pwa-app-suffix">APP</span>';
      buttons[i].title = standalone ? '国学共读已安装' : '安装国学共读到主屏幕';
    }
    var notes = document.querySelectorAll('[data-pwa-note]');
    for (var j = 0; j < notes.length; j++) {
      notes[j].textContent = standalone ? '当前正以安装模式运行。' : '安装后可从主屏幕打开，并支持离线阅读。';
    }
  }

  function showGuide(html) {
    if (!guide) {
      guide = document.createElement('dialog');
      guide.className = 'pwa-guide';
      guide.setAttribute('aria-labelledby', 'pwaGuideTitle');
      guide.innerHTML = ''
        + '<div class="pwa-guide-head"><h2 id="pwaGuideTitle">安装国学共读</h2>'
        + '<button class="pwa-guide-close" type="button" data-pwa-close aria-label="关闭">×</button></div>'
        + '<div class="pwa-guide-body"></div>'
        + '<div class="pwa-guide-foot"><button class="pwa-guide-ok" type="button" data-pwa-close>知道了</button></div>';
      document.body.appendChild(guide);
      guideBody = guide.querySelector('.pwa-guide-body');
    }
    guideBody.innerHTML = html;
    if (guide.showModal) {
      if (!guide.open) guide.showModal();
    } else {
      window.alert(guideBody.textContent);
    }
  }

  function install() {
    if (isStandalone()) return;
    if (deferredPrompt) {
      var promptEvent = deferredPrompt;
      deferredPrompt = null;
      try {
        var result = promptEvent.prompt();
        if (result && result.catch) result.catch(function () {});
        if (promptEvent.userChoice) promptEvent.userChoice.catch(function () {});
      } catch (e) {}
      return;
    }
    if (isIOS()) {
      showGuide('<p>请在 Safari 中按以下步骤安装：</p>'
        + '<ol><li>点击浏览器底部的「分享」按钮。</li>'
        + '<li>选择「添加到主屏幕」。</li>'
        + '<li>点击右上角的「添加」。</li></ol>');
      return;
    }
    showGuide('<p>请打开浏览器菜单，选择「安装应用」或「添加到主屏幕」。</p>'
      + '<p>若没有安装选项，请使用最新版 Chrome 或 Edge，并确认通过 HTTPS 访问本站。</p>');
  }

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    updateButtons();
  });

  window.addEventListener('appinstalled', function () {
    installed = true;
    deferredPrompt = null;
    updateButtons();
  });

  document.addEventListener('click', function (e) {
    var target = e.target.closest ? e.target : e.target.parentElement;
    if (!target) return;
    if (target.closest('[data-pwa-install]')) {
      e.preventDefault();
      install();
    } else if (target.closest('[data-pwa-close]')) {
      if (guide && guide.open) guide.close();
    }
  });

  function init() {
    updateButtons();
    // 阅读器目录在数据加载后生成，首次出现时同步安装状态。
    if (document.querySelector('[data-pwa-install]') || !window.MutationObserver) return;
    var app = document.getElementById('app');
    if (!app) return;
    var observer = new MutationObserver(function () {
      if (!document.querySelector('[data-pwa-install]')) return;
      updateButtons();
      observer.disconnect();
    });
    observer.observe(app, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
