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
    var u = s.currentUnit;
    var cur = s.currentPage;
    var tp = tbPage(cur);

    var src = PATHS.pages + 'p' + String(cur).padStart(3, '0') + '.jpg';
    var pageAudios = getPageAudios(cur);
    var pageVids = getPageVideos(cur);

    var html = '<div class="pdf-page-wrap">';
    html += '<div class="pdf-page-img-wrap">';
    html += '<img src="' + src + '" alt="P' + tp + '" id="main-page-img">';
    html += '</div></div>';

    var pdfEl = document.getElementById('pdf-container');
    pdfEl.innerHTML = html;
    applyZoom();

    var img = document.getElementById('main-page-img');
    if (img) img.onload = function() { applyZoom(); };

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

    // 更新顶部指示器菜单数据
    window.__pageAudios = pageAudios;
    window.__pageVids = pageVids;
    updateIndicatorMenu();
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
      h += '<button class="im-item" data-file="' + a.file + '" data-page="' + a.page + '" data-label="' + a.label + '" onclick="imPlay(this)">\ud83c\udfb5 ' + a.label + '</button>';
    }
    for (var vi = 0; vi < vids.length; vi++) {
      var v = vids[vi];
      h += '<button class="im-item im-video" data-file="' + v.file + '" data-page="' + v.page + '" onclick="openVideoOverlay(this)">\ud83c\udfac ' + v.label + '</button>';
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

})();
