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

  // 移动端左右滑动翻页
  var swipeStartX = 0, swipeStartY = 0, swiping = false;

  document.addEventListener('touchstart', function(e) {
    if (document.querySelector('.overlay-active')) return;
    if (!e.touches || !e.touches[0]) return;
    swipeStartX = e.touches[0].clientX;
    swipeStartY = e.touches[0].clientY;
    swiping = true;
  }, { passive: true });

  document.addEventListener('touchmove', function(e) {
    if (!swiping) return;
    if (document.querySelector('.overlay-active')) { swiping = false; return; }
  }, { passive: true });

  document.addEventListener('touchend', function(e) {
    if (!swiping) return;
    swiping = false;
    if (document.querySelector('.overlay-active')) return;
    var touch = e.changedTouches && e.changedTouches[0];
    if (!touch) return;
    var dx = touch.clientX - swipeStartX;
    var dy = touch.clientY - swipeStartY;
    // 水平为主且滑动距离 > 30px
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 30) {
      if (dx < 0) nextPage();
      else prevPage();
    }
  });

  function showOverlay(id, renderFn) { document.getElementById(id).className = 'overlay-active'; renderFn(); }
  function stopAllAudio() {
    try {
      if (typeof __vocabAudio !== 'undefined' && __vocabAudio) { __vocabAudio.pause(); __vocabAudio = null; }
      __vocabActiveUnit = null;
      updateAllVocabBtns();
    } catch(e) {}
    try { if (window.stopAllAudio) window.stopAllAudio(); } catch(e) {}
  }

  function hideOverlay(id) { document.getElementById(id).className = 'overlay-hidden'; }

  function renderAll() { renderTextbook(); }

  function init() {
    renderUnits();

    document.getElementById('btn-vocab').onclick = function() { showOverlay('vocab-overlay', renderVocab); };

    document.getElementById('vocab-close').onclick = function() { hideOverlay('vocab-overlay'); try { stopAllAudio(); } catch(e) {} };

    document.getElementById('video-close').onclick = hideVideoOverlay;
    document.getElementById('video-overlay-bg').onclick = hideVideoOverlay;

    renderAll();
  }

  // ===== 词汇表 =====
  window.renderVocab = function() {
    var el = document.getElementById('vocab-content');
    if (!el) return;

    // 数据未加载 → 显示加载中，等待后重新渲染
    if (Object.keys(window.WORDS_BY_UNIT || {}).length === 0) {
      el.innerHTML = '<div style="text-align:center;padding:60px 20px;"><div style="font-size:36px;">⏳</div><p style="margin-top:12px;color:var(--text-light);">加载词汇数据…</p></div>';
      ensureWords().then(function() { window.renderVocab(); }).catch(function() {
        el.innerHTML = '<div style="text-align:center;padding:60px 20px;"><div style="font-size:36px;">❌</div><p style="margin-top:12px;color:var(--text-light);">加载失败，请刷新重试</p></div>';
      });
      return;
    }

    var html = '<h2 style="margin-bottom:14px;">📚 词汇表</h2>';
    var hasAny = false;
    for (var vi = 0; vi < UNITS.length; vi++) {
      var u = UNITS[vi];
      var words = (window.WORDS_BY_UNIT && window.WORDS_BY_UNIT[u.id]) ? window.WORDS_BY_UNIT[u.id] : [];
      if (words.length === 0) continue;
      hasAny = true;
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
    if (!hasAny) {
      html += '<p style="text-align:center;color:var(--text-light);padding:40px;">暂无词汇数据</p>';
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

  // 预加载词表（返回 Promise 供 renderVocab 等待）
  window.WORDS_BY_UNIT = {};
  var _wordsPromise = null;
  function ensureWords() {
    if (_wordsPromise) return _wordsPromise;
    if (Object.keys(window.WORDS_BY_UNIT || {}).length > 0) {
      _wordsPromise = Promise.resolve(window.WORDS_BY_UNIT);
      return _wordsPromise;
    }
    _wordsPromise = fetch('data/words.json')
      .then(function(r) { return r.json(); })
      .then(function(d) { window.WORDS_BY_UNIT = d; return d; })
      .catch(function(e) { _wordsPromise = null; throw e; });
    return _wordsPromise;
  }
  ensureWords();

  // ===== 移动端浮动底栏 =====
  function isMobile() { return window.innerWidth <= 768; }

  function updateMobileBar() {
    if (!isMobile()) return;
    var bar = document.getElementById('mobile-bar');
    bar.classList.add('mobile-visible');
    var ul = document.getElementById('mobile-unit-label');
    var pl = document.getElementById('mobile-page-label');
    if (ul) ul.textContent = state.currentUnit.name;
    if (pl) pl.textContent = 'P' + (state.currentPage - TEXTBOOK_OFFSET);
  }

  function renderSheetUnits() {
    var el = document.getElementById('sheet-unit-list');
    var acts = document.getElementById('sheet-actions');
    if (!el) return;
    var html = '';
    for (var i = 0; i < UNITS.length; i++) {
      var u = UNITS[i];
      html += '<button class="sheet-unit-item" data-id="' + u.id + '">'
        + '<span class="dot" style="background:' + u.color + '"></span>'
        + '<span class="name">' + u.name + '</span>'
        + '<span class="range">' + u.title + '</span></button>';
    }
    el.innerHTML = html;
    el.onclick = function(e) {
      var btn = e.target.closest('.sheet-unit-item');
      if (!btn) return;
      var u = UNITS.find(function(x) { return x.id === btn.dataset.id; });
      if (u) { state.currentUnit = u; state.currentPage = u.pdfStart; renderAll(); hideBottomSheet(); }
    };
    acts.innerHTML = '<button class="sheet-action-btn" id="sheet-btn-voc" onclick="hideBottomSheet();document.getElementById(\'vocab-overlay\').className=\'overlay-active\';renderVocab()">📚 词汇表</button>';
  }

  window.showBottomSheet = function() {
    var sheet = document.getElementById('bottom-sheet');
    sheet.classList.add('open');
    renderSheetUnits();
    resetHideTimer();
  };
  window.hideBottomSheet = function() {
    document.getElementById('bottom-sheet').classList.remove('open');
  };

  // 浮动底栏自动隐藏
  var hideTimer = null;
  function resetHideTimer() {
    if (!isMobile()) return;
    var bar = document.getElementById('mobile-bar');
    if (!bar) return;
    bar.classList.remove('fading');
    clearTimeout(hideTimer);
    hideTimer = setTimeout(function() { bar.classList.add('fading'); }, 4000);
  }

  document.addEventListener('touchstart', resetHideTimer);
  document.addEventListener('click', resetHideTimer);

  // 更新底栏
  var origRenderAll = renderAll;
  renderAll = function() {
    origRenderAll();
    updateMobileBar();
    resetHideTimer();
  };

  // 初始化移动端
  if (isMobile()) {
    var bar = document.getElementById('mobile-bar');
    bar.classList.add('mobile-visible');
    document.getElementById('mobile-unit-btn').onclick = function() { showBottomSheet(); };
    document.getElementById('mobile-menu-btn').onclick = function() { showBottomSheet(); };
    updateMobileBar();
    resetHideTimer();
  }

  window.__app = { state: state, renderAll: renderAll, renderUnits: renderUnits };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

})();
