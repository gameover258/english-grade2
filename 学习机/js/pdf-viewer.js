/**
 * 学习机 v2 — 课本浏览 + 页面内嵌媒体条
 * 页码显示：PDF P{n} (课本P{n-4})
 */

(function() {
  'use strict';

  const TOTAL_PAGES = 80;

  function tbPage(pdf) { return pdf - TEXTBOOK_OFFSET; }

  window.renderTextbook = function() {
    const app = window.__app;
    if (!app) return;
    const s = app.state;
    const u = s.currentUnit;
    const cur = s.currentPage;
    const tp = tbPage(cur);

    // ===== 课本区域 =====
    const pdfEl = document.getElementById('pdf-container');
    let html = '<div class="pdf-toolbar">';
    html += '<button onclick="prevPage()"' + (cur <= 1 ? ' disabled' : '') + '>◀</button>';
    html += '<span class="page-info">PDF ' + cur + ' / ' + TOTAL_PAGES + ' (课本 P' + tp + ')</span>';
    html += '<button onclick="nextPage()"' + (cur >= TOTAL_PAGES ? ' disabled' : '') + '>▶</button>';
    html += '<div class="zoom-group">';
    html += '<button class="zoom-btn' + (s.zoomLevel === 'fit' ? ' active' : '') + '" onclick="setZoom(\'fit\')">适配</button>';
    html += '<button class="zoom-btn' + (s.zoomLevel === '100' ? ' active' : '') + '" onclick="setZoom(\'100\')">100%</button>';
    html += '<button class="zoom-btn' + (s.zoomLevel === '150' ? ' active' : '') + '" onclick="setZoom(\'150\')">150%</button>';
    html += '</div></div>';

    const src = PATHS.pages + 'p' + String(cur).padStart(3, '0') + '.jpg';

    // 获取当前页的音视频
    const pageAudios = getPageAudios(cur);
    const pageVids = getPageVideos(cur);
    const hasMedia = pageAudios.length > 0 || pageVids.length > 0;

    html += '<div class="pdf-page-wrap">';
    html += '<div class="pdf-page-img-wrap">';
    html += '<img src="' + src + '" alt="PDF P' + cur + '" id="main-page-img">';
    html += '</div>';

    // === 页面内嵌媒体条 ===
    if (hasMedia) {
      html += '<div class="page-media-bar">';

      // 音频
      for (var ai = 0; ai < pageAudios.length; ai++) {
        var a = pageAudios[ai];
        html += '<div class="pmb-track" data-file="' + a.file + '" data-page="' + a.page + '" data-label="' + a.label + '">';
        html += '<button class="pmb-play" onclick="pmbPlay(this)">▶️</button>';
        html += '<span class="pmb-label">🎵 ' + a.label + '</span>';
        html += '<input type="range" class="pmb-progress" value="0" min="0" max="100" oninput="pmbSeek(this)">';
        html += '<span class="pmb-time">00:00 / 00:00</span>';
        html += '</div>';
      }

      // 视频
      for (var vi = 0; vi < pageVids.length; vi++) {
        var v = pageVids[vi];
        html += '<div class="pmb-track pmb-video" data-file="' + v.file + '" data-page="' + v.page + '" onclick="openVideoOverlay(this)">';
        html += '<button class="pmb-play">🎬</button>';
        html += '<span class="pmb-label">' + v.label + '</span>';
        html += '</div>';
      }

      html += '</div>';
    }

    html += '</div>'; // .pdf-page-wrap

    // 页码小格（当前单元的 PDF 页范围）
    html += '<div class="pdf-page-mini">';
    for (let i = u.pdfStart; i <= u.pdfEnd; i++) {
      html += '<button class="' + (i === cur ? 'current' : '') + '" onclick="goPage(' + i + ')">' + i + '</button>';
    }
    html += '</div>';

    pdfEl.innerHTML = html;
    applyZoom();
    const img = document.getElementById('main-page-img');
    if (img) img.onload = () => applyZoom();

    // 清空底部媒体面板（不再使用）
    const mediaEl = document.getElementById('media-panel');
    if (mediaEl) mediaEl.innerHTML = '';
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

  // ===== 页面内嵌播放条交互（事件委托） =====
  // 视频点击事件委托（音频用 inline onclick）
  document.addEventListener('click', function(e) {
    var videoTrack = e.target.closest('.pmb-video');
    if (videoTrack && videoTrack.dataset.file) {
      if (typeof window.openVideoOverlay === 'function') {
        window.openVideoOverlay(videoTrack);
      }
    }
  });

  window.pmbPlay = function(btn) {
    var track = btn.closest('.pmb-track');
    globalPlay({
      file: track.dataset.file,
      page: parseInt(track.dataset.page),
      label: track.dataset.label
    });
  };

  window.pmbSeek = function(slider) {
    var pct = parseFloat(slider.value) / 100;
    if (window.__globalAudio && window.__globalAudio.duration) {
      window.__globalAudio.currentTime = pct * window.__globalAudio.duration;
    }
  };

  // 全局同步：播放器状态变化时更新所有页面内嵌播放条
  window._syncPageMediaUI = function() {
    var audio = window.__globalAudio;
    var track = window.__currentTrack;
    document.querySelectorAll('.pmb-track').forEach(function(trk) {
      var isCurrent = track && trk.dataset.file === track.file && trk.dataset.page == track.page;
      var btn = trk.querySelector('.pmb-play');
      var prog = trk.querySelector('.pmb-progress');
      var time = trk.querySelector('.pmb-time');

      if (isCurrent) {
        if (audio && !audio.paused) {
          if (btn) btn.textContent = '⏸';
          if (prog && audio.duration && isFinite(audio.duration)) {
            prog.value = (audio.currentTime / audio.duration) * 100;
          }
          if (time && audio.duration && isFinite(audio.duration)) {
            time.textContent = fmtTime(audio.currentTime) + ' / ' + fmtTime(audio.duration);
          }
        } else {
          if (btn) btn.textContent = '▶️';
        }
      } else {
        if (btn) btn.textContent = '▶️';
        if (prog && !isCurrent) prog.value = 0;
        if (time && !isCurrent) time.textContent = '00:00 / 00:00';
      }
    });
  };

  function fmtTime(s) {
    if (!s || !isFinite(s)) return '00:00';
    var m = Math.floor(s / 60);
    var sec = Math.floor(s % 60);
    return String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
  }

})();
