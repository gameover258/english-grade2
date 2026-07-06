/**
 * 学习机 v2 — 音频播放器
 * 页面进入自动依次播放，点击屏幕暂停/继续
 */

(function() {
  'use strict';

  window.__globalAudio = null;
  window.__currentTrack = null;
  window.__pageAudioQueue = [];
  window.__queueIndex = 0;

  function fmt(s) {
    if (!s || !isFinite(s)) return '0:00';
    var m = Math.floor(s / 60);
    var sec = Math.floor(s % 60);
    return m + ':' + String(sec).padStart(2, '0');
  }

  function createAudio(file) {
    var a = new Audio(PATHS.audio + file);
    a.addEventListener('error', function h() {
      a.removeEventListener('error', h);
      if (file.endsWith('.mp3')) {
        a.src = PATHS.audio + file.slice(0, -4) + '.MP3';
        a.load();
      }
    }, { once: true });
    return a;
  }

  /** 设置当前页面的音频播放队列 */
  window.setPageAudioQueue = function(tracks) {
    window.__pageAudioQueue = tracks || [];
    window.__queueIndex = 0;
  };

  /** 播放指定 track */
  function playTrack(track) {
    if (window.__globalAudio) {
      window.__globalAudio.pause();
      window.__globalAudio = null;
    }
    window.__currentTrack = track;
    var audio = createAudio(track.file);
    window.__globalAudio = audio;

    audio.addEventListener('timeupdate', updateIndicator);
    audio.addEventListener('ended', function() {
      updateIndicator();
      // 自动播放下一个
      var next = getNextInQueue(track);
      if (next) {
        window.__queueIndex++;
        playTrack(next);
      } else {
        window.__currentTrack = null;
        updateIndicator();
      }
    });
    audio.addEventListener('loadedmetadata', updateIndicator);

    audio.play().then(function() {
      updateIndicator();
      audio.volume = 1;
    }).catch(function() {
      updateIndicator();
    });
  }

  function getNextInQueue(track) {
    var q = window.__pageAudioQueue;
    if (!q || q.length === 0) return null;
    var idx = window.__queueIndex + 1;
    if (idx >= q.length) {
      // 循环：回到第一个
      window.__queueIndex = 0;
      return q[0];
    }
    return q[idx];
  }

  /** 全局播放（兼容旧接口） */
  window.globalPlay = function(track) {
    // 同一轨 → 切换暂停/播放
    if (window.__currentTrack && window.__currentTrack.file === track.file) {
      if (window.__globalAudio && !window.__globalAudio.paused) {
        window.__globalAudio.pause();
        updateIndicator();
        return;
      }
      if (window.__globalAudio && window.__globalAudio.paused) {
        window.__globalAudio.play().catch(function() {});
        updateIndicator();
        return;
      }
    }
    playTrack(track);
  };

  /** 点击课本区域 → 暂停/继续 */
  window.togglePlayPause = function() {
    if (!window.__globalAudio) return;
    if (window.__globalAudio.paused) {
      window.__globalAudio.play().catch(function() {});
    } else {
      window.__globalAudio.pause();
    }
    updateIndicator();
  };

  /** 停止所有音频 */
  window.stopAllAudio = function() {
    if (window.__globalAudio) {
      window.__globalAudio.pause();
      window.__globalAudio = null;
    }
    window.__currentTrack = null;
    window.__pageAudioQueue = [];
    window.__queueIndex = 0;
    updateIndicator();
  };

  /** 更新浮动指示器 */
  function updateIndicator() {
    var el = document.getElementById('audio-indicator');
    var icon = document.getElementById('ai-icon');
    var label = document.getElementById('ai-label');
    var time = document.getElementById('ai-time');
    var menu = document.getElementById('indicator-menu');
    var track = window.__currentTrack;
    var audio = window.__globalAudio;

    if (!track || !audio) {
      if (el) el.style.display = 'none';
      if (menu) { menu.classList.remove('open'); menu.innerHTML = ''; }
      return;
    }

    if (el) el.style.display = 'flex';
    var dur = audio.duration || 0;
    var remaining = dur - (audio.currentTime || 0);

    if (icon) {
      icon.textContent = audio.paused ? '⏸' : '🎵';
    }
    if (label) {
      label.textContent = track.label;
    }
    if (time) {
      if (audio.paused) {
        time.textContent = '暂停中';
      } else if (dur && isFinite(dur)) {
        time.textContent = fmt(remaining);
      } else {
        time.textContent = '加载中…';
      }
    }
  }

  /** 切换指示器二级菜单 */
  window.toggleIndicatorMenu = function() {
    var indicator = document.getElementById('audio-indicator');
    var menu = document.getElementById('indicator-menu');
    if (!indicator || !menu) return;
    indicator.classList.toggle('open');
    menu.classList.toggle('open');
  };

  // 点击课本区域暂停/继续
  document.addEventListener('click', function(e) {
    // 不拦截按钮、链接、叠加层内的点击
    if (e.target.closest('button') || e.target.closest('a') || e.target.closest('.overlay-active') || e.target.closest('#bottom-sheet') || e.target.closest('#mobile-bar') || e.target.closest('#audio-indicator') || e.target.closest('#indicator-menu')) return;
    if (window.__globalAudio || window.__currentTrack) {
      window.togglePlayPause();
    }
  });

})();
