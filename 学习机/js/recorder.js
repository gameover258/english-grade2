/**
 * 学习机 v2 — 跟读录音（叠加层模式）
 * MediaRecorder + AudioContext + Canvas 波形
 */

(function() {
  'use strict';

  let mr = null, chunks = [], blob = null, ac = null, sn = null, an = null, aid = null, rec = false;
  let sources = [];

  function buildSources() {
    srcs = [];
    for (const u of UNITS) {
      for (const a of getUnitAudios(u)) srcs.push({ unit: u, label: u.name + ' - ' + a.label, file: PATHS.audio + a.file, page: a.page });
    }
    for (const u of UNITS) {
      const w = (window.WORDS_BY_UNIT && window.WORDS_BY_UNIT[u.id]) ? window.WORDS_BY_UNIT[u.id] : [];
      for (const wd of w) srcs.push({ unit: u, label: u.name + ' - ' + wd.en + ' (' + wd.cn + ')', file: PATHS.wordAudio + wd.audio, page: 0 });
    }
    return srcs;
  }

  window.renderRecorder = async function() {
    if (Object.keys(window.WORDS_BY_UNIT || {}).length === 0) {
      try { const r = await fetch('data/words.json'); window.WORDS_BY_UNIT = await r.json(); } catch(e) {}
    }
    sources = buildSources();
    const el = document.getElementById('recorder-content');
    if (!el) return;

    let html = '<div class="rec-wrap"><h2>🎤 跟读录音</h2><p class="desc">选句子 → 听原声 → 录音 → 对比波形</p>';
    html += '<div class="rec-source"><select id="rec-sel"><option value="">— 选择音频片段 —</option>';
    let g = '';
    for (let i = 0; i < sources.length; i++) {
      const s = sources[i];
      if (s.unit.name !== g) { if (g) html += '</optgroup>'; g = s.unit.name; html += `<optgroup label="${g}">`; }
      html += `<option value="${i}">${s.label}</option>`;
    }
    html += '</optgroup></select></div>';
    html += '<div class="rec-btns">';
    html += '<button class="rec-btn play-og" id="rec-og">🔊</button>';
    html += '<button class="rec-btn rec-start" id="rec-start">🎤</button>';
    html += '<button class="rec-btn rec-stop" id="rec-stop" disabled>⏹</button>';
    html += '</div>';
    html += '<div id="rec-cd" style="min-height:50px;display:flex;align-items:center;justify-content:center;"></div>';
    html += '<div id="rec-compare" style="display:none;width:100%;">';
    html += '<div class="rec-wave"><div class="rec-wave-label">🔊 原声波形</div><canvas id="rec-wv-og" height="90"></canvas></div>';
    html += '<div class="rec-wave"><div class="rec-wave-label">🎤 我的录音</div><canvas id="rec-wv-my" height="90"></canvas></div>';
    html += '<div style="display:flex;gap:8px;justify-content:center;margin-top:8px;">';
    html += '<button class="rec-btn play-og" id="rec-play-og-bt">🔊</button>';
    html += '<button class="rec-btn play-og" id="rec-play-my-bt">🎤</button>';
    html += '<button class="rec-btn" style="background:#FFF3E0;color:#E65100;font-size:12px;width:auto;padding:0 12px;border-radius:8px;" id="rec-dl">💾 下载</button>';
    html += '</div></div></div>';
    el.innerHTML = html;
    bindRec();
  };

  function bindRec() {
    let ogAudio = null;
    const cd = document.getElementById('rec-cd');

    document.getElementById('rec-og').onclick = () => {
      const s = getSel(); if (!s) { cd.textContent = '⚠ 请先选择音频'; return; }
      if (ogAudio) ogAudio.pause();
      ogAudio = new Audio(s.file);
      ogAudio.play().catch(() => cd.textContent = '⚠ 播放失败');
      cd.textContent = '🔊 正在播放原声...';
      ogAudio.onended = () => cd.textContent = '✅ 播完，可以录音了';
    };

    document.getElementById('rec-start').onclick = async () => {
      const s = getSel(); if (!s) { cd.textContent = '⚠ 请先选择音频'; return; }
      if (rec) return;
      for (let i = 3; i > 0; i--) { await d(800); cd.innerHTML = `<div class="rec-countdown">${i}</div>`; }
      await d(800);
      cd.innerHTML = '<div class="rec-countdown" style="color:#C62828;">🎤 录音中...</div>';
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        startRec(stream);
        document.getElementById('rec-start').classList.add('recording');
        document.getElementById('rec-stop').disabled = false;
      } catch(e) { cd.textContent = '⚠ 无法访问麦克风，请允许权限'; }
    };

    document.getElementById('rec-stop').onclick = () => {
      if (rec && mr) { mr.stop(); rec = false; document.getElementById('rec-start').classList.remove('recording'); document.getElementById('rec-stop').disabled = true; cd.textContent = '⏹ 录音停止，正在分析...'; if (mr.stream) mr.stream.getTracks().forEach(t => t.stop()); }
    };

    document.getElementById('rec-play-og-bt').onclick = () => { const s = getSel(); if (s) new Audio(s.file).play(); };
    document.getElementById('rec-play-my-bt').onclick = () => { if (blob) new Audio(URL.createObjectURL(blob)).play(); };
    document.getElementById('rec-dl').onclick = () => {
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'my_recording_' + Date.now() + '.webm';
      a.click();
    };
  }

  function startRec(stream) {
    chunks = []; rec = true;
    if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
    sn = ac.createMediaStreamSource(stream);
    an = ac.createAnalyser();
    an.fftSize = 256;
    sn.connect(an);
    liveWave();
    const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
    mr = new MediaRecorder(stream, { mimeType: mime });
    mr.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    mr.onstop = () => { blob = new Blob(chunks, { type: mime }); rec = false; stopLive(); drawCompare(); };
    mr.start(100);
  }

  function liveWave() {
    const cv = document.getElementById('rec-wv-my');
    if (!cv) return;
    const ctx = cv.getContext('2d');
    const buf = new Uint8Array(an.frequencyBinCount);
    function dr() {
      if (!rec) return;
      aid = requestAnimationFrame(dr);
      an.getByteTimeDomainData(buf);
      ctx.fillStyle = '#1A202C'; ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.lineWidth = 2; ctx.strokeStyle = '#4CAF50'; ctx.beginPath();
      const sw = cv.width / buf.length;
      for (let i = 0; i < buf.length; i++) { const y = (buf[i] / 128) * cv.height / 2; i === 0 ? ctx.moveTo(i * sw, y) : ctx.lineTo(i * sw, y); }
      ctx.stroke();
    }
    dr();
  }

  function stopLive() { if (aid) { cancelAnimationFrame(aid); aid = null; } }

  async function drawCompare() {
    document.getElementById('rec-compare').style.display = 'block';
    const s = getSel();
    if (s) {
      try { const r = await fetch(s.file); const buf = await r.arrayBuffer(); const dec = await ac.decodeAudioData(buf); drawWV('rec-wv-og', dec.getChannelData(0)); } catch(e) {}
    }
    if (blob) {
      try { const buf = await blob.arrayBuffer(); const dec = await ac.decodeAudioData(buf); drawWV('rec-wv-my', dec.getChannelData(0)); } catch(e) {}
    }
    const cd = document.getElementById('rec-cd');
    if (cd) cd.textContent = '✅ 对比完成';
  }

  function drawWV(cid, data) {
    const cv = document.getElementById(cid);
    if (!cv) return;
    const ctx = cv.getContext('2d');
    const dw = cv.clientWidth, dh = 90;
    cv.width = dw * (window.devicePixelRatio || 1); cv.height = dh * (window.devicePixelRatio || 1);
    ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
    ctx.fillStyle = '#1A202C'; ctx.fillRect(0, 0, dw, dh);
    const step = Math.ceil(data.length / dw);
    const samples = [];
    for (let i = 0; i < dw; i++) { let sum = 0; for (let j = 0; j < step && i * step + j < data.length; j++) sum += Math.abs(data[i * step + j]); samples.push(sum / step); }
    const mx = Math.max(...samples, 0.01);
    ctx.fillStyle = '#4CAF50';
    const bw = Math.max(1, dw / samples.length - 1);
    for (let i = 0; i < samples.length; i++) { const bh = (samples[i] / mx) * dh * 0.9; ctx.fillRect(i * (bw + 1), dh - bh, bw, bh); }
  }

  function getSel() { const s = document.getElementById('rec-sel'); if (!s) return null; const ix = parseInt(s.value); return (ix >= 0 && ix < sources.length) ? sources[ix] : null; }
  function d(ms) { return new Promise(r => setTimeout(r, ms)); }

})();
