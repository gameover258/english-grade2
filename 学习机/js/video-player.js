/**
 * 学习机 v2 — 侧弹窗视频播放
 */

(function() {
  'use strict';

  window.openVideoOverlay = function(card) {
    const file = card.dataset.file;
    const overlay = document.getElementById('video-overlay');
    const player = document.getElementById('video-overlay-player');
    
    player.src = PATHS.video + file;
    overlay.className = 'overlay-active';
    player.load();
    player.play().catch(() => {});
  };

  window.hideVideoOverlay = function() {
    const overlay = document.getElementById('video-overlay');
    const player = document.getElementById('video-overlay-player');
    player.pause();
    player.src = '';
    overlay.className = 'overlay-hidden';
  };

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const overlay = document.getElementById('video-overlay');
      if (overlay.classList.contains('overlay-active')) {
        hideVideoOverlay();
      }
    }
  });

})();
