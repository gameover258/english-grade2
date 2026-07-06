/**
 * 学习机 v2 — 全局音频播放器
 * 单一音频实例，迷你播放栏 UI 更新
 */

(function() {
  'use strict';

  window.__globalAudio = null;
  window.__currentTrack = null;

  function createAudio(file) {
    const a = new Audio(PATHS.audio + file);
    // .MP3 fallback
    a.addEventListener('error', function h() {
      a.removeEventListener('error', h);
      if (file.endsWith('.mp3')) {
        a.src = PATHS.audio + file.slice(0, -4) + '.MP3';
        a.load();
      }
    }, { once: true });
    return a;
  }

  /** 全局播放 */
  window.globalPlay = function(track) {
    // 如果同一轨正在播放 → 暂停
    if (window.__currentTrack && window.__currentTrack.file === track.file && window.__globalAudio && !window.__globalAudio.paused) {
      window.__globalAudio.pause();
      updateAllPlayBtns('▶️');
      if (window._syncPageMediaUI) window._syncPageMediaUI();
      return;
    }

    // 如果同一轨已暂停 → 恢复
    if (window.__currentTrack && window.__currentTrack.file === track.file && window.__globalAudio && window.__globalAudio.paused) {
      window.__globalAudio.play().catch(() => {});
      updateAllPlayBtns('⏸');
      return;
    }

    // 停止旧的
    if (window.__globalAudio) {
      window.__globalAudio.pause();
      window.__globalAudio = null;
    }

    window.__currentTrack = track;
    const audio = createAudio(track.file);
    window.__globalAudio = audio;

    // 同步所有迷你播放栏
    function syncUI() {
      // 同步页面内嵌媒体条
      if (window._syncPageMediaUI) window._syncPageMediaUI();
      
      const bars = document.querySelectorAll('.media-mini-player');
      bars.forEach(bar => {
        const btn = bar.querySelector('.play-btn');
        const rc = bar.querySelector('.progress-slider');
        const tp = bar.querySelector('.time-text');

        if (audio.duration && isFinite(audio.duration)) {
          if (rc) rc.value = (audio.currentTime / audio.duration) * 100;
          if (tp) tp.textContent = fmt(audio.currentTime) + ' / ' + fmt(audio.duration);
        }
        if (btn) btn.textContent = audio.paused ? '▶️' : '⏸';
      });
    }

    audio.addEventListener('timeupdate', syncUI);
    audio.addEventListener('ended', () => {
      updateAllPlayBtns('▶️');
      syncUI();
      // 尝试自动下一首
      autoNext(track);
    });
    audio.addEventListener('loadedmetadata', syncUI);

    audio.play().then(() => {
      updateAllPlayBtns('⏸');
      restoreSettings();
      syncUI();
      if (window._syncPageMediaUI) window._syncPageMediaUI();
    }).catch(() => {
      updateAllPlayBtns('▶️');
      if (window._syncPageMediaUI) window._syncPageMediaUI();
    });

    // 高亮音频 chip
    document.querySelectorAll('.media-audio-chip').forEach(c => {
      const p = parseInt(c.dataset.page);
      c.classList.toggle('playing', p === track.page);
    });
  };

  function autoNext(track) {
    // 如有叠加层打开（闪卡/词汇表/录音），不自动播放下一首
    if (document.querySelector('.overlay-active')) return;
    const app = window.__app;
    if (!app) return;
    const unitAudios = getUnitAudios(app.state.currentUnit);
    const idx = unitAudios.findIndex(a => a.file === track.file);
    if (idx >= 0 && idx < unitAudios.length - 1) {
      const next = unitAudios[idx + 1];
      window.globalPlay(next);
    }
  }

  function restoreSettings() {
    const bars = document.querySelectorAll('.media-mini-player');
    bars.forEach(bar => {
      const speedBtns = bar.querySelectorAll('.speed-btn');
      speedBtns.forEach(b => {
        if (b.classList.contains('active') && window.__globalAudio) {
          window.__globalAudio.playbackRate = parseFloat(b.dataset.sp);
        }
      });
      const vol = bar.querySelector('.vol-slider');
      if (vol && window.__globalAudio) {
        window.__globalAudio.volume = parseFloat(vol.value) / 100;
      }
    });
  }

  function updateAllPlayBtns(icon) {
    document.querySelectorAll('.media-mini-player .play-btn').forEach(b => {
      b.textContent = icon;
    });
  }

  function fmt(s) {
    if (!s || !isFinite(s)) return '00:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
  }

  window.addEventListener('beforeunload', () => {
    if (window.__globalAudio) window.__globalAudio.pause();
  });

})();
