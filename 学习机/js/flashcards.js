/**
 * 学习机 v2 — 单词闪卡（叠加层模式）
 */

(function() {
  'use strict';

  var wordData = {};
  var filterMode = 'all';
  var knownWords = new Set();
  var autoTimer = null;
  var autoActive = false;

  try {
    var saved = localStorage.getItem('knownWords');
    if (saved) knownWords = new Set(JSON.parse(saved));
  } catch (e) {}

  function save() {
    try { localStorage.setItem('knownWords', JSON.stringify([...knownWords])); } catch (e) {}
  }

  async function load() {
    if (Object.keys(wordData).length > 0) return;
    try { var r = await fetch('data/words.json'); wordData = await r.json(); } catch (e) {}
  }

  // 播放单词音频（独立 Audio，暂停全局播放器避免冲突）
  var __fcAudio = null;
  function playWordAudio(audioFile) {
    // 停止上一个闪卡音频
    if (__fcAudio) { __fcAudio.pause(); __fcAudio = null; }
    // 暂停全局课本播放器，避免背景音频干扰
    if (window.__globalAudio && !window.__globalAudio.paused) {
      window.__globalAudio.pause();
    }
    var url = PATHS.wordAudio + audioFile;
    var a = new Audio(encodeURI(url));
    __fcAudio = a;
    a.addEventListener('ended', function() { __fcAudio = null; });
    a.play().catch(function() { __fcAudio = null; });
  }

  // 外部可调用：停止闪卡音频
  window.stopFlashcardAudio = function() {
    if (__fcAudio) { __fcAudio.pause(); __fcAudio = null; }
  };

  window.WORDS_BY_UNIT = {};

  window.renderFlashcards = async function() {
    await load();
    window.WORDS_BY_UNIT = wordData;
    var app = window.__app;
    if (!app) return;
    var u = app.state.currentUnit;
    var allWords = wordData[u.id] || [];
    var words = allWords;
    if (filterMode === 'known') words = allWords.filter(function(w) { return knownWords.has(w.en); });
    else if (filterMode === 'unknown') words = allWords.filter(function(w) { return !knownWords.has(w.en); });

    var el = document.getElementById('flashcard-content');
    if (!el) return;

    if (words.length === 0) {
      el.innerHTML = '<div style="text-align:center;padding:40px;"><div style="font-size:48px;">📝</div><p style="margin:12px 0;">' + (allWords.length === 0 ? '本单元暂无单词' : '没有匹配的单词') + '</p><button onclick="fcSetFilter(\'all\')" style="padding:8px 20px;border:none;border-radius:8px;background:var(--primary);color:#fff;cursor:pointer;">显示全部</button></div>';
      return;
    }

    if (typeof window._fcIdx === 'undefined' || window._fcIdx >= words.length) window._fcIdx = 0;
    var idx = window._fcIdx;
    var word = words[idx];
    var isKnown = knownWords.has(word.en);

    var html = '<div class="fc-container">';
    html += '<div class="fc-controls">';
    html += '<button class="filter-btn' + (filterMode === 'all' ? ' active' : '') + '" onclick="fcSetFilter(\'all\')">全部(' + allWords.length + ')</button>';
    html += '<button class="filter-btn' + (filterMode === 'unknown' ? ' active' : '') + '" onclick="fcSetFilter(\'unknown\')">未掌握</button>';
    html += '<button class="filter-btn' + (filterMode === 'known' ? ' active' : '') + '" onclick="fcSetFilter(\'known\')">已掌握</button>';
    html += '</div>';

    html += '<div class="fc-scene" onclick="fcFlip()"><div class="fc-card" id="fc-card">';
    html += '<div class="fc-face fc-front"><div class="word-en">' + word.en + '</div><div class="word-emoji">' + word.emoji + '</div></div>';
    html += '<div class="fc-face fc-back"><div class="word-cn">' + word.cn + '</div><div class="word-en-small">' + word.en + '</div></div>';
    html += '</div></div>';

    html += '<div class="fc-nav">';
    html += '<button onclick="fcPrev()"' + (idx <= 0 ? ' style="opacity:0.3"' : '') + '>◀</button>';
    html += '<span class="counter">' + (idx + 1) + ' / ' + words.length + '</span>';
    html += '<button onclick="fcNext()"' + (idx >= words.length - 1 ? ' style="opacity:0.3"' : '') + '>▶</button>';
    html += '</div>';

    html += '<div class="fc-actions">';
    html += '<button class="btn-sound" onclick="fcPlay(' + idx + ')">🔊 发音</button>';
    html += '<button class="btn-auto' + (autoActive ? ' active' : '') + '" onclick="fcAuto()">' + (autoActive ? '⏹ 停止' : '▶ 自动') + '</button>';
    html += '<button class="btn-sound" style="background:' + (isKnown ? '#C8E6C9' : '#F5F5F5') + ';color:' + (isKnown ? '#2E7D32' : '#757575') + '" onclick="fcToggleKnown()">' + (isKnown ? '✅ 已掌握' : '⬜ 标记掌握') + '</button>';
    html += '</div></div>';

    el.innerHTML = html;
  };

  window.fcFlip = function() { var c = document.getElementById('fc-card'); if (c) c.classList.toggle('flipped'); };
  window.fcPrev = function() { var w = getFilteredWords(); if (window._fcIdx > 0) { window._fcIdx--; window.renderFlashcards(); } };
  window.fcNext = function() { var w = getFilteredWords(); if (window._fcIdx < w.length - 1) { window._fcIdx++; window.renderFlashcards(); } };
  window.fcSetFilter = function(m) { filterMode = m; window._fcIdx = 0; fcStopAuto(); window.renderFlashcards(); };

  window.fcPlay = function(idx) {
    // 手动播放时停止自动模式
    if (autoActive) fcStopAuto();
    window._fcIdx = (typeof idx === 'number') ? idx : (window._fcIdx || 0);
    var app = window.__app;
    if (!app) return;
    var words = getFilteredWords();
    var w = words[window._fcIdx];
    if (w && w.audio) playWordAudio(w.audio);
  };

  window.fcToggleKnown = function() {
    var app = window.__app;
    if (!app) return;
    var words = getFilteredWords();
    var w = words[window._fcIdx || 0];
    if (!w) return;
    if (knownWords.has(w.en)) knownWords.delete(w.en); else knownWords.add(w.en);
    save();
    window.renderFlashcards();
  };

  window.fcAuto = function() { autoActive ? fcStopAuto() : fcStartAuto(); };

  function fcNextAuto() {
    var words = getFilteredWords();
    if ((window._fcIdx || 0) < words.length - 1) {
      window._fcIdx++;
      window.renderFlashcards();
      setTimeout(function() { fcPlayAudioAndFlip(); }, 600);
    } else {
      fcStopAuto();
    }
  }

  function fcPlayAudioAndFlip() {
    if (!autoActive) return;
    var words = getFilteredWords();
    var w = words[window._fcIdx || 0];
    // 翻转卡片
    var card = document.getElementById('fc-card');
    if (card && !card.classList.contains('flipped')) {
      card.classList.add('flipped');
    }
    // 播放音频，结束后自动下一页
    if (w && w.audio) {
      if (__fcAudio) { __fcAudio.pause(); __fcAudio = null; }
      if (window.__globalAudio && !window.__globalAudio.paused) { window.__globalAudio.pause(); }
      var url = PATHS.wordAudio + w.audio;
      var a = new Audio(encodeURI(url));
      __fcAudio = a;
      a.addEventListener('ended', function() {
        __fcAudio = null;
        if (autoActive) fcNextAuto();
      });
      a.play().catch(function() {
        __fcAudio = null;
        if (autoActive) setTimeout(function() { fcNextAuto(); }, 1500);
      });
    } else {
      if (autoActive) setTimeout(function() { fcNextAuto(); }, 1500);
    }
  }

  function fcStartAuto() {
    autoActive = true;
    autoTimer = null; // no more setInterval, audio-driven
    window._fcIdx = 0;
    window.renderFlashcards();
    setTimeout(function() { fcPlayAudioAndFlip(); }, 600);
  }

  function fcStopAuto() {
    autoActive = false;
    if (__fcAudio) { __fcAudio.pause(); __fcAudio = null; }
  }

  function getFilteredWords() {
    var app = window.__app;
    if (!app) return [];
    var all = (window.WORDS_BY_UNIT[app.state.currentUnit.id] || []);
    if (filterMode === 'known') return all.filter(function(w) { return knownWords.has(w.en); });
    if (filterMode === 'unknown') return all.filter(function(w) { return !knownWords.has(w.en); });
    return all;
  }

  load();
})();
