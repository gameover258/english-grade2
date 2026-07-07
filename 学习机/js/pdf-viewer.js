/**
 * 学习机 v2 — 课本浏览（无工具栏，媒体归入顶部指示器）
 */

(function() {
  'use strict';

  var TOTAL_PAGES = 80;

  function tbPage(pdf) { return pdf - TEXTBOOK_OFFSET; }

  window.renderTextbook = function() {
    var app = window.__app;
    if (!app) return;
    var s = app.state;
    var cur = s.currentPage;
    var tp = tbPage(cur);
    var src = PATHS.pages + 'p' + String(cur).padStart(3, '0') + '.jpg';
    var pageAudios = getPageAudios(cur);
    var pageVids = getPageVideos(cur);

    var pdfEl = document.getElementById('pdf-container');
    var oldImg = document.getElementById('main-page-img');

    // 图片已是最新页 → 仅更新媒体
    if (oldImg && oldImg.dataset.page == cur) {
      window.__pageAudios = pageAudios;
      window.__pageVids = pageVids;
      updateIndicatorMenu();
      return;
    }

    // 首次渲染 → 创建 DOM 结构
    if (!oldImg) {
      pdfEl.innerHTML = '<div class="pdf-page-wrap"><div class="pdf-page-img-wrap"><img id="main-page-img" alt=""></div></div>';
      oldImg = document.getElementById('main-page-img');
    }

    var img = oldImg;
    img.style.opacity = '0';

    // 先用预加载 Image 加载完再设置 src（避免先显示旧图再换）
    var preloader = new Image();
    preloader.onload = function() {
      img.src = src;
      img.alt = 'P' + tp;
      img.dataset.page = cur;
      img.style.opacity = '1';
      applyZoom();
    };
    preloader.onerror = function() {
      img.src = src;
      img.alt = 'P' + tp;
      img.dataset.page = cur;
      img.style.opacity = '1';
    };
    preloader.src = src;

    // 切换页面音频
    if (pageAudios.length > 0) {
      var first = pageAudios[0];
      var needSwitch = !window.__currentTrack || window.__currentTrack.page !== cur;
      if (needSwitch) {
        setPageAudioQueue(pageAudios);
        window.__queueIndex = 0;
        window.globalPlay(first);
      }
    } else {
      if (window.stopAllAudio) window.stopAllAudio();
    }

    window.__pageAudios = pageAudios;
    window.__pageVids = pageVids;
    updateIndicatorMenu();
    preloadAdjacent(cur);
  };

  function applyZoom() {
    var img = document.getElementById('main-page-img');
    if (!img) return;
    var lvl = window.__app ? window.__app.state.zoomLevel : 'fit';
    img.style.maxWidth = 'none'; img.style.maxHeight = 'none';
    img.style.width = 'auto'; img.style.height = 'auto';
    if (lvl === 'fit') { img.style.maxWidth = '100%'; img.style.maxHeight = '100%'; }
    else if (lvl === '100') { if (img.naturalWidth) img.style.width = img.naturalWidth + 'px'; }
    else if (lvl === '150') { if (img.naturalWidth) img.style.width = Math.round(img.naturalWidth * 1.5) + 'px'; }
  }

  function updateIndicatorMenu() {
    var menu = document.getElementById('indicator-menu');
    if (!menu) return;
    var audios = window.__pageAudios || [];
    var vids = window.__pageVids || [];
    if (audios.length === 0 && vids.length === 0) { menu.innerHTML = ''; return; }

    var h = '';
    for (var ai = 0; ai < audios.length; ai++) {
      var a = audios[ai];
      h += '<button class="im-item" data-file="' + a.file + '" data-page="' + a.page + '" data-label="' + a.label + '" onclick="imPlay(this)">🎵 ' + a.label + '</button>';
    }
    for (var vi = 0; vi < vids.length; vi++) {
      var v = vids[vi];
      h += '<button class="im-item im-video" data-file="' + v.file + '" data-page="' + v.page + '" onclick="openVideoOverlay(this)">🎬 ' + v.label + '</button>';
    }
    menu.innerHTML = h;
  }

  window.imPlay = function(btn) {
    window.__queueIndex = 0;
    setPageAudioQueue(window.__pageAudios || []);
    window.globalPlay({
      file: btn.dataset.file,
      page: parseInt(btn.dataset.page),
      label: btn.dataset.label
    });
  };

  /** 预加载相邻页面图片 */
  var _preloadCache = {};
  function preloadAdjacent(curPage) {
    for (var i = -3; i <= 3; i++) {
      if (i === 0) continue;
      var p = curPage + i;
      if (p >= 1 && p <= TOTAL_PAGES && !_preloadCache[p]) {
        _preloadCache[p] = true;
        var img = new Image();
        img.src = PATHS.pages + 'p' + String(p).padStart(3, '0') + '.jpg';
      }
    }
    for (var key in _preloadCache) {
      if (Math.abs(parseInt(key) - curPage) > 6) delete _preloadCache[key];
    }
  }

})();
