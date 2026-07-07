/**
 * 新交际英语二年级上册 — 学习机配置 v2
 * PDF 页码 → 课本页码 偏移量 = 4（PDF P5 = 课本 P1）
 */

const TEXTBOOK_OFFSET = 4;
const AUDIO_SUFFIX = '外研新交际英语二年级上册.mp3';
const VIDEO_SUFFIX = '外研新交际英语二年级上册.mp4';

const PATHS = {
  audio: '../课文音频/',
  video: '../课文同步动画视频/',
  wordAudio: '../单词音频/',
  pages: 'pages/'
};

function audioFile(tbPage, part) {
  const p = part ? 'P' + tbPage + '-' + part : 'P' + tbPage;
  return p + AUDIO_SUFFIX;
}

function videoFile(page, suffix) {
  if (!suffix) return page + VIDEO_SUFFIX;
  return page + VIDEO_SUFFIX.replace('.mp4', '') + '（' + suffix + '）.mp4';
}

const UNITS = [
  { id: 'unit1', name: 'Unit 1', title: 'Feelings & Food',
    pdfStart: 5, pdfEnd: 12,      // 课本 P1-P8
    color: '#4CAF50',
    audioPages: [3, 4, 5, 6, 8], audioParts: { 3: ['1', '2'], 6: ['1', '2'] },
    videos: [{ page: 'P3' }, { page: 'P4' }] },
  { id: 'unit2', name: 'Unit 2', title: 'Meals',
    pdfStart: 13, pdfEnd: 18,     // 课本 P9-P14
    color: '#FF9800',
    audioPages: [9, 10, 12, 14], audioParts: { 9: ['1', '2'], 12: ['1', '2'] },
    videos: [{ page: 'P9' }, { page: 'P10' }, { page: 'P14', suffix: '素材1' }, { page: 'P14', suffix: '素材2' }] },
  { id: 'unit3', name: 'Unit 3', title: 'Weather',
    pdfStart: 19, pdfEnd: 24,     // 课本 P15-P20
    color: '#2196F3',
    audioPages: [15, 16, 17, 18, 20], audioParts: { 15: ['1', '2'], 18: ['1', '2'] },
    videos: [{ page: 'P15' }, { page: 'P16' }, { page: 'P20' }] },
  { id: 'unit4', name: 'Unit 4', title: 'Seasons & Activities',
    pdfStart: 25, pdfEnd: 30,     // 课本 P21-P26
    color: '#9C27B0',
    audioPages: [21, 22, 24, 26], audioParts: { 21: ['1', '2'], 24: ['1', '2'] },
    videos: [{ page: 'P21' }, { page: 'P22' }, { page: 'P26' }] },
  { id: 'unit5', name: 'Unit 5', title: 'Clothes',
    pdfStart: 31, pdfEnd: 36,     // 课本 P27-P32
    color: '#E91E63',
    audioPages: [27, 28, 30], audioParts: { 27: ['1', '2'], 30: ['1', '2'] },
    videos: [{ page: 'P27' }, { page: 'P28' }] },
  { id: 'unit6', name: 'Unit 6', title: 'Festivals & Fun',
    pdfStart: 37, pdfEnd: 42,     // 课本 P33-P38
    color: '#00BCD4',
    audioPages: [33, 34, 36, 38], audioParts: { 33: ['1', '2'], 36: ['0', '1', '2'] },
    videos: [{ page: 'P33' }, { page: 'P34' }, { page: 'P38' }] }
];

const EXTRA_AUDIO = [
  { file: 'P1' + AUDIO_SUFFIX, label: 'P1 - The ABC Song', bookPage: 1 },
  { file: 'P44' + AUDIO_SUFFIX, label: 'P44', bookPage: 44 },
  { file: 'P46' + AUDIO_SUFFIX, label: 'P46', bookPage: 46 },
  { file: 'P48' + AUDIO_SUFFIX, label: 'P48', bookPage: 48 },
  { file: 'P50' + AUDIO_SUFFIX, label: 'P50', bookPage: 50 },
  { file: 'P52' + AUDIO_SUFFIX, label: 'P52', bookPage: 52 },
  { file: 'P54' + AUDIO_SUFFIX, label: 'P54', bookPage: 54 },
  { file: 'P56-59' + AUDIO_SUFFIX, label: 'P56-59 - 复习', bookPage: 56 },
  { file: 'P60-63' + AUDIO_SUFFIX, label: 'P60-63 - 复习', bookPage: 60 }
];

function getUnitAudios(unit) {
  const list = [];
  for (const page of unit.audioPages) {
    const parts = unit.audioParts[page];
    if (parts) {
      for (const part of parts) {
        list.push({ file: audioFile(page, part), label: 'P' + page + '-' + part, page: page + TEXTBOOK_OFFSET });
      }
    } else {
      list.push({ file: audioFile(page), label: 'P' + page, page: page + TEXTBOOK_OFFSET });
    }
  }
  return list;
}

function getUnitVideos(unit) {
  return unit.videos.map(v => ({
    file: videoFile(v.page, v.suffix),
    label: v.page + (v.suffix ? '（' + v.suffix + '）' : ''),
    page: parseInt(v.page.replace('P', '')) + TEXTBOOK_OFFSET
  }));
}

/** pdfPage = PDF 页码(1-80)，自动转课本页码查音频 */
function getPageAudios(pdfPage) {
  const bp = pdfPage - TEXTBOOK_OFFSET; // 课本页码
  const results = [];
  for (const unit of UNITS) {
    if (!unit.audioPages.includes(bp)) continue;
    const parts = unit.audioParts[bp];
    if (parts) {
      for (const part of parts) {
        results.push({ file: audioFile(bp, part), label: 'P' + bp + '-' + part, page: pdfPage, unit });
      }
    } else {
      results.push({ file: audioFile(bp), label: 'P' + bp, page: pdfPage, unit });
    }
    break;
  }
  if (results.length === 0) {
    for (const e of EXTRA_AUDIO) {
      if (e.bookPage === bp) {
        results.push({ file: e.file, label: e.label, page: pdfPage, unit: null });
        break;
      }
    }
  }
  return results;
}

function getPageVideos(pdfPage) {
  const bp = pdfPage - TEXTBOOK_OFFSET;
  const pStr = 'P' + bp;
  const results = [];
  for (const unit of UNITS) {
    for (const v of unit.videos) {
      if (v.page === pStr) {
        results.push({ file: videoFile(v.page, v.suffix), label: v.page + (v.suffix ? '（' + v.suffix + '）' : ''), page: pdfPage, unit });
      }
    }
  }
  return results;
}
