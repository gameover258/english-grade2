/**
 * 学习机 v2 — 应用内核
 */

(function() {
  'use strict';

  var $ = function(s) { return document.querySelector(s); };

  var state = {
    currentUnit: UNITS[0],
    currentPage: UNITS[0].pdfStart,
    zoomLevel: 'fit'
  };

  function tick() {
    var c = $('#clock');
    if (c) c.textContent = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  }
  tick();
  setInterval(tick, 30000);

  function renderUnits() {
    var ul = $('#unit-list');
    ul.innerHTML = UNITS.map(function(u) {
      var active = u.id === state.currentUnit.id;
      return '<li class="' + (active ? 'active' : '') + '" data-id="' + u.id + '">'
        + '<span class="dot" style="background:' + u.color + '"></span>'
        + '<span>' + u.name + '</span>'
        + '<span class="range">P' + u.pdfStart + '-' + u.pdfEnd + '</span></li>';
    }).join('');

    ul.onclick = function(e) {
      var li = e.target.closest('li');
      if (!li) return;
      var u = UNITS.find(function(x) { return x.id === li.dataset.id; });
      if (u) { state.currentUnit = u; state.currentPage = u.pdfStart; renderUnits(); renderAll(); }
    };
  }

  window.goPage = function(n) { if (n >= 1 && n <= 80) { state.currentPage = n; renderAll(); } };
  window.prevPage = function() { if (state.currentPage > 1) { state.currentPage--; renderAll(); } };
  window.nextPage = function() { if (state.currentPage < 80) { state.currentPage++; renderAll(); } };
  window.setZoom = function(lvl) { state.zoomLevel = lvl; renderAll(); };

  document.addEventListener('keydown', function(e) {
    if (document.querySelector('.overlay-active')) return;
    if (e.key === 'ArrowLeft') { prevPage(); e.preventDefault(); }
    if (e.key === 'ArrowRight') { nextPage(); e.preventDefault(); }
  });

  function showOverlay(id, renderFn) { document.getElementById(id).className = 'overlay-active'; renderFn(); }
  function stopAllAudio() {
    // 停止词汇表独立音频
    if (typeof __vocabAudio !== 'undefined' && __vocabAudio) { __vocabAudio.pause(); __vocabAudio = null; }
    __vocabActiveUnit = null;
    updateAllVocabBtns();
    // 停止闪卡独立音频
    if (window.stopFlashcardAudio) window.stopFlashcardAudio();
    // 停止全局课本播放器
    if (window.__globalAudio) { window.__globalAudio.pause(); }
    // 同步 UI
    if (window._syncPageMediaUI) window._syncPageMediaUI();
  }

  function hideOverlay(id) { document.getElementById(id).className = 'overlay-hidden'; }

  function renderAll() { renderTextbook(); }

  function init() {
    renderUnits();

    document.getElementById('btn-flashcards').onclick = function() { showOverlay('flashcard-overlay', renderFlashcards); };
    document.getElementById('btn-recorder').onclick = function() { showOverlay('recorder-overlay', renderRecorder); };
    document.getElementById('btn-vocab').onclick = function() { showOverlay('vocab-overlay', renderVocab); };

    document.getElementById('flashcard-close').onclick = function() { stopAllAudio(); hideOverlay('flashcard-overlay'); };
    document.getElementById('recorder-close').onclick = function() { stopAllAudio(); hideOverlay('recorder-overlay'); };
    document.getElementById('vocab-close').onclick = function() { stopAllAudio(); hideOverlay('vocab-overlay'); };

    document.getElementById('video-close').onclick = hideVideoOverlay;
    document.getElementById('video-overlay-bg').onclick = hideVideoOverlay;

    renderAll();
  }

  // ===== 词汇表 =====
  window.renderVocab = function() {
    var el = document.getElementById('vocab-content');
    if (!el) return;
    var html = '<h2 style="margin-bottom:14px;">📚 词汇表</h2>';
    for (var vi = 0; vi < UNITS.length; vi++) {
      var u = UNITS[vi];
      var words = (window.WORDS_BY_UNIT && window.WORDS_BY_UNIT[u.id]) ? window.WORDS_BY_UNIT[u.id] : [];
      if (words.length === 0) continue;
      var audioFile = words[0].audio;
      html += '<div class="vocab-unit">'
        + '<h3 style="background:' + u.color + '20;color:' + u.color + ';display:flex;align-items:center;gap:8px;">'
        + '<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:' + u.color + ';flex-shrink:0;"></span>'
        + '<span style="flex:1;">' + u.name + ' - ' + u.title + '（' + words.length + '词）</span>'
        + '<button class="vocab-unit-play" data-audio="' + audioFile.replace(/"/g, '&quot;') + '" data-unit="' + u.id + '" onclick="toggleVocabUnitAudio(this)">🔊</button>'
        + '</h3>';
      html += '<table class="vocab-table"><thead><tr><th>英文</th><th>中文</th></tr></thead><tbody>';
      for (var wi = 0; wi < words.length; wi++) {
        var w = words[wi];
        html += '<tr><td class="vocab-en">' + w.emoji + ' ' + w.en + '</td><td>' + w.cn + '</td></tr>';
      }
      html += '</tbody></table></div>';
    }
    el.innerHTML = html;
  };

  // 词汇表单元音频：点▶️播放，再点⏸暂停
  var __vocabAudio = null;
  var __vocabActiveUnit = null;

  window.toggleVocabUnitAudio = function(btn) {
    var audioFile = btn.getAttribute('data-audio');
    var unitId = btn.getAttribute('data-unit');

    // 同一单元：切换播放/暂停
    if (__vocabActiveUnit === unitId && __vocabAudio && !__vocabAudio.paused) {
      __vocabAudio.pause();
      btn.textContent = '🔊';
      updateAllVocabBtns();
      return;
    }

    // 同一单元已暂停：恢复
    if (__vocabActiveUnit === unitId && __vocabAudio && __vocabAudio.paused) {
      __vocabAudio.play().catch(function() {});
      btn.textContent = '⏸';
      updateAllVocabBtns();
      return;
    }

    // 停止上一个
    if (__vocabAudio) { __vocabAudio.pause(); __vocabAudio = null; }
    // 暂停全局课本播放器
    if (window.__globalAudio && !window.__globalAudio.paused) {
      window.__globalAudio.pause();
    }

    var url = encodeURI(PATHS.wordAudio + audioFile);
    var a = new Audio(url);
    __vocabAudio = a;
    __vocabActiveUnit = unitId;
    btn.textContent = '⏸';

    a.addEventListener('ended', function() {
      __vocabAudio = null;
      __vocabActiveUnit = null;
      updateAllVocabBtns();
    });
    a.addEventListener('pause', function() {
      if (__vocabActiveUnit === unitId) updateAllVocabBtns();
    });
    a.play().catch(function() {
      __vocabAudio = null;
      __vocabActiveUnit = null;
      btn.textContent = '🔊';
    });
  };

  // 重置所有单元按钮
  function updateAllVocabBtns() {
    document.querySelectorAll('.vocab-unit-play').forEach(function(b) {
      b.textContent = b.getAttribute('data-unit') === __vocabActiveUnit && __vocabAudio && !__vocabAudio.paused ? '⏸' : '🔊';
    });
  }

  // 保留旧接口（兼容）
  window.playVocabWord = function(audioFile) {
    window.toggleVocabUnitAudio({ getAttribute: function(k) { return k === 'data-audio' ? audioFile : 'legacy'; } });
  };

  // 预加载词表
  if (Object.keys(window.WORDS_BY_UNIT || {}).length === 0) {
    fetch('data/words.json').then(function(r) { return r.json(); }).then(function(d) { window.WORDS_BY_UNIT = d; }).catch(function() {});
  }

  window.__app = { state: state, renderAll: renderAll, renderUnits: renderUnits };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

})();
