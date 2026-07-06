/**
 * 学习机 v2 — 课本浏览 + 浮动音频指示器
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

    var pdfEl = document.getElementById('pdf-container');
    var html = '<div class="pdf-toolbar">';
    html += '<button onclick="prevPage()"' + (cur <= 1 ? ' disabled' : '') + '>\u25c0</button>';
    html += '<span class="page-info">PDF ' + cur + ' / ' + TOTAL_PAGES + ' (\u8bfe\u672c P' + tp + ')</span>';
    html += '<button onclick="nextPage()"' + (cur >= TOTAL_PAGES ? ' disabled' : '') + '>\u25b6</button>';
    html += '<div class="zoom-group">';
    html += '<button class="zoom-btn' + (s.zoomLevel === 'fit' ? ' active' : '') + '" onclick="setZoom(\'fit\')">\u9002\u914d</button>';
    html += '<button class="zoom-btn' + (s.zoomLevel === '100' ? ' active' : '') + '" onclick="setZoom(\'100\')">100%</button>';
    html += '<button class="zoom-btn' + (s.zoomLevel === '150' ? ' active' : '') + '" onclick="setZoom(\'150\')">150%</button>';
    html += '</div></div>';

    var src = PATHS.pages + 'p' + String(cur).padStart(3, '0') + '.jpg';
    var pageAudios = getPageAudios(cur);
    var pageVids = getPageVideos(cur);
    var hasMedia = pageAudios.length > 0 || pageVids.length > 0;

    html += '<div class="pdf-page-wrap">';
    html += '<div class="pdf-page-img-wrap">';
    html += '<img src="' + src + '" alt="PDF P' + cur + '" id="main-page-img">';
    html += '</div>';

    if (hasMedia) {
      html += '<div class="page-media-bar">';

      for (var ai = 0; ai < pageAudios.length; ai++) {
        var a = pageAudios[ai];
        html += '<div class="pmb-track" data-file="' + a.file + '" data-page="' + a.page + '" data-label="' + a.label + '">';
        html += '<button class="pmb-play" onclick="pmbPlay(this)">\u25b6\ufe0f</button>';
        html += '<span class="pmb-label">' + a.label + '</span>';
        html += '</div>';
      }

      for (var vi = 0; vi < pageVids.length; vi++) {
        var v = pageVids[vi];
        html += '<div class="pmb-track pmb-video" data-file="' + v.file + '" data-page="' + v.page + '" onclick="openVideoOverlay(this)">';
        html += '<button class="pmb-play">\ud83c\udfac</button>';
        html += '<span class="pmb-label">' + v.label + '</span>';
        html += '</div>';
      }

      html += '</div>';
    }

    html += '</div>';

    html += '<div class="pdf-page-mini">';
    for (var i = u.pdfStart; i <= u.pdfEnd; i++) {
      html += '<button class="' + (i === cur ? 'current' : '') + '" onclick="goPage(' + i + ')">' + i + '</button>';
    }
    html += '</div>';

    pdfEl.innerHTML = html;
    applyZoom();
    var img = document.getElementById('main-page-img');
    if (img) img.onload = function() { applyZoom(); };

    // 清空底部媒体面板
    var mediaEl = document.getElementById('media-panel');
    if (mediaEl) mediaEl.innerHTML = '';

    // 切换页面：停止旧的，播放新页面的第一个音频
    if (pageAudios.length > 0) {
      var first = pageAudios[0];
      var needSwitch = !window.__currentTrack || window.__currentTrack.page !== cur;
      if (needSwitch) {
        setPageAudioQueue(pageAudios);
        window.__queueIndex = 0;
        window.globalPlay(first);
      }
    } else {
      // 当前页没有音频 → 停止
      if (window.stopAllAudio) window.stopAllAudio();
    }
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

  // 视频事件委托
  document.addEventListener('click', function(e) {
    var videoTrack = e.target.closest('.pmb-video');
    if (videoTrack && videoTrack.dataset.file) {
      if (typeof window.openVideoOverlay === 'function') {
        window.openVideoOverlay(videoTrack);
      }
    }
  });

  // 音频播放按钮
  window.pmbPlay = function(btn) {
    var track = btn.closest('.pmb-track');
    globalPlay({
      file: track.dataset.file,
      page: parseInt(track.dataset.page),
      label: track.dataset.label
    });
  };

})();
