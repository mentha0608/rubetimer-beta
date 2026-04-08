// Rubetimer
// Version: v2.22beta
// Build: 2026-04-02
// Author: mentha0608
// Voice: VOICEVOX:四国めたん
//
// タイマー仕様：
// ・高精度タイマー（performance.now + requestAnimationFrame）
// ・ラップ時間は0.25秒単位で丸めて利用
// ・床出現タイミング基準で案内
// ・beta版ではSafari対応テスト中

(() => {
  'use strict';

    /* ========================================
   1. 定数 / データ
   - CONFIG: 予告7秒前、爆発後の次のディレイ 等
   - STORAGE_KEYS
   - audioConfig: 音量設定
   - VOICE_PARTS: 読み上げ用
   - MODES: ルベランギス床パターン
======================================== */

  const CONFIG = {
    defaultLeadSeconds: 7,
    nextAnnounceDelayMs: 6500,
    adjustStepMs: 500,
    displayPrecisionMs: 100,
  };

  const STORAGE_KEYS = {
    voiceMode: 'rubetimer.voiceMode',
    seVolume: 'rubetimer.seVolume',
    voiceVolume: 'rubetimer.voiceVolume',
    announceLead: 'rubetimer.announceLead',
    playNextVoice: 'rubetimer.playNextVoice',
  };

  const audioConfig = {
    seVolume: 0.85,
    voiceVolume: 0.7,
  };

  const VOICE_PARTS = {
    // ===== 汎用 =====
    s_tsugi: {
        text: '次、',
        kana: 'つぎ、',
        file: 's_tsugi',
    },
    s_loop: {
        text: '初回にループします',
        kana: 'しょかいにループします',
        file: 's_loop',
    },
    s_osoi: {
        text: '遅い',
        kana: 'おそい',
        file: 's_osoi',
    },

    // ===== サークル =====
    c_senjo_osoto: {
        text: '線上・大外です',
        kana: 'せんじょう、おおそとです',
        file: 'c_senjo_osoto',
    },
    c_center_large_senjo: {
        text: '中央大・線上です',
        kana: 'ちゅうおう だい、せんじょうです',
        file: 'c_center_large_senjo',
    },
    c_center_ami_soto: {
        text: '中央・網・外です',
        kana: 'ちゅうおう、あみ、そとです',
        file: 'c_center_ami_soto',
    },
    c_center_large_soto: {
        text: '中央大・外です',
        kana: 'ちゅうおう だい、そとです',
        file: 'c_center_large_soto',
    },

    // ===== グランド =====
    g_niji: {
        text: '虹床です',
        kana: 'にじゆかです',
        file: 'g_niji',
    },
    g_amisen_osoto: {
        text: '網と線上、大外です',
        kana: 'あみとせんじょう、おおそとです',
        file: 'g_amisen_osoto',
    },
    g_amisen_soto: {
        text: '網と線上、外です',
        kana: 'あみとせんじょう、そとです',
        file: 'g_amisen_soto',
    },
    g_center_amisen: {
        text: '中央、網と線上です',
        kana: 'ちゅうおう、あみとせんじょうです',
        file: 'g_center_amisen',
    },
    g_center_large_soto: {
        text: '中央大、外です',
        kana: 'ちゅうおう だい、そとです',
        file: 'g_center_large_soto',
    },
    g_center_senjo_soto: {
        text: '中央大・線上と外です',
        kana: 'ちゅうおうだい、せんじょうとそとです',
        file: 'g_center_senjo_soto',
      },

  };
 
  // loopLapMsは実測値 
  const MODES = {
  circle: {
    key: 'circle',
    label: 'サークル',
    initialDelayMs: 5750,
    loopLapMs: [23750, 20750, 23250, 21000, 25000, 20750],
    phases: [
      {
        currentText: '線上・大外',
        noteText: '-',

        leadParts: ['c_senjo_osoto'],
        nextParts: ['s_tsugi', 'c_senjo_osoto', 's_loop'],
      },
      {
        currentText: '中央大・線上',
        noteText: '遅い',

        leadParts: ['s_osoi', 'c_center_large_senjo'],
        nextParts: ['s_tsugi', 'c_center_large_senjo'],
      },
      {
        currentText: '中央・網・外',
        noteText: '-',

        leadParts: ['c_center_ami_soto'],
        nextParts: ['s_tsugi', 'c_center_ami_soto'],
      },
      {
        currentText: '線上・大外',
        noteText: '遅い',

        leadParts: ['s_osoi', 'c_senjo_osoto'],
        nextParts: ['s_tsugi', 'c_senjo_osoto'],
      },
      {
        currentText: '中央大・外',
        noteText: '-',

        leadParts: ['c_center_large_soto'],
        nextParts: ['s_tsugi', 'c_center_large_soto'],
      },
      {
        currentText: '中央・網・外',
        noteText: '遅い',

        leadParts: ['s_osoi', 'c_center_ami_soto'],
        nextParts: ['s_tsugi', 'c_center_ami_soto'],
      },
    ],
  },

  grand: {
    key: 'grand',
    label: 'グランド',
    initialDelayMs: 6750,
    loopLapMs: [22000, 24500, 22250, 24000, 22750, 23500,
                23250, 23500, 23250, 23000, 23750, 22500],
    phases: [
      {
        currentText: '虹床',
        noteText: '-',

        leadParts: ['g_niji'],
        nextParts: ['s_tsugi', 'g_niji', 's_loop'],
      },
      {
        currentText: '網上・大外',
        noteText: '外の外（安置）',

        leadParts: ['g_amisen_osoto'],
        nextParts: ['s_tsugi', 'g_amisen_osoto'],
      },
      {
        currentText: '虹床',
        noteText: '-',

        leadParts: ['g_niji'],
        nextParts: ['s_tsugi', 'g_niji'],
      },
      {
        currentText: '中央大・外',
        noteText: '外の外（安置）',

        leadParts: ['g_center_large_soto'],
        nextParts: ['s_tsugi', 'g_center_large_soto'],
      },
      {
        currentText: '虹床',
        noteText: '-',

        leadParts: ['g_niji'],
        nextParts: ['s_tsugi', 'g_niji'],
      },
      {
        currentText: '中央、網と線の上',
        noteText: '大外（安置）',

        leadParts: ['g_center_amisen'],
        nextParts: ['s_tsugi', 'g_center_amisen'],
      },
      {
        currentText: '虹床',
        noteText: '-',

        leadParts: ['g_niji'],
        nextParts: ['s_tsugi', 'g_niji'],
      },
      {
        currentText: '網上・大外',
        noteText: '線上（安置）',

        leadParts: ['g_amisen_osoto'],
        nextParts: ['s_tsugi', 'g_amisen_osoto'],
      },
      {
        currentText: '虹床',
        noteText: '-',

        leadParts: ['g_niji'],
        nextParts: ['s_tsugi', 'g_niji'],
      },
      {
        currentText: '網上・線上・外',
        noteText: '網上（安置）',

        leadParts: ['g_amisen_soto'],
        nextParts: ['s_tsugi', 'g_amisen_soto'],
      },
      {
        currentText: '虹床',
        noteText: '-',

        leadParts: ['g_niji'],
        nextParts: ['s_tsugi', 'g_niji'],
      },
      {
        currentText: '中央大・線上と外',
        noteText: '外（安置）',

        leadParts: ['g_center_senjo_soto'],
        nextParts: ['s_tsugi', 'g_center_senjo_soto'],
      },
    ],
  },
};

  /* ========================================
     2. DOM 取得
  ======================================== */

  const dom = {
    timerMain: document.getElementById('timerMain'),
    timerSub: document.getElementById('timerSub'),
    currentSafe: document.getElementById('currentSafe'),
    nextSafe: document.getElementById('nextSafe'),

    btnCircle: document.getElementById('btnCircle'),
    btnCircle1: document.getElementById('btnCircle1'),
    btnCircle2: document.getElementById('btnCircle2'),

    btnGrand: document.getElementById('btnGrand'),
    btnGrand1: document.getElementById('btnGrand1'),
    btnGrand2: document.getElementById('btnGrand2'),

    btnAdjustPlus: document.getElementById('btnAdjustPlus'),
    btnAdjustMinus: document.getElementById('btnAdjustMinus'),
    btnReset: document.getElementById('btnReset'),

    announceLeadRadios: document.querySelectorAll('input[name="announceLead"]'),
    seVolume: document.getElementById('seVolume'),
    voiceVolume: document.getElementById('voiceVolume'),
    playNextVoiceRadios: document.querySelectorAll('input[name="playNextVoice"]'),
  };

  /* ========================================
     3. 状態
  ======================================== */

  const state = {
    mode: null,
    scrambleState: -1,
    running: false,
    targetPerfMs: 0,
    rafId: 0,
    history: [],
    leadFired: false,
    countdown3Fired: false,
    nextAnnounceTimeoutId: 0,
  };

/* ========================================
   4. 音声ユーティリティ
   - buildKana: （シンプル）読み上げ用組み合わせ
   - resolveLeadKana / resolveNextKana
   - getVoiceMode / seekVoiceVolume
   - stopSpeech / stopAudioPlayback / stopSePlayback
   - speakKana
   - buildAudioFiles
   - resolveLeadFiles / resolveNextFiles
   - playSingleAudio / playAudioSequence 
   - playVoiceTestSound / playSeTestSound
   - voice
  ======================================== */

  let activeAudio = null;
  let activeSeAudio = null;
  let activeSequenceToken = 0;
  let audioUnlocked = false;
  let audioUnlocking = false;
  const audioCache = new Map();

  function buildKana(parts = []) {
    return parts
        .map((key) => {
      const part = VOICE_PARTS[key];

      if (!part) {
        console.warn('[buildKana] missing VOICE_PARTS key:', key);
        return '';
      }

      return part.kana || '';
    })
    .filter(Boolean)
    .join(' ');
  }

  function resolveLeadKana(arg1, arg2 = '') {
    // 新形式: phaseオブジェクトを渡した場合
    if (arg1 && typeof arg1 === 'object' && !Array.isArray(arg1)) {
      if (Array.isArray(arg1.leadParts)) {
        return buildKana(arg1.leadParts);
      }
    // 旧形式の名残がphase内にある場合の保険
      return [arg1.leadText, arg1.leadExtraText].filter(Boolean).join(' ');
    }
    // 旧形式: 文字列2本
    return [arg1, arg2].filter(Boolean).join(' ');
  }

  function resolveNextKana(arg1) {
    // 新形式: phaseオブジェクトを渡した場合
    if (arg1 && typeof arg1 === 'object' && !Array.isArray(arg1)) {
      if (Array.isArray(arg1.nextParts)) {
        return buildKana(arg1.nextParts);
      }
    // 旧形式の名残がphase内にある場合の保険
      return arg1.nextVoiceText || '';
    }
    // 旧形式: 文字列
    return arg1 || '';
  }


  function getVoiceMode() {
      return document.querySelector('input[name="voiceMode"]:checked')?.value || 'simple';
  }

  function seekVoiceVolume() {
    return audioConfig.voiceVolume;
  }


  function createAudio(src) {
    const audio = new Audio(src);
    audio.preload = 'auto';
    audio.playsInline = true;
    audio.setAttribute?.('playsinline', '');
    audio.setAttribute?.('webkit-playsinline', '');
    return audio;
  }

  function getCachedAudio(src) {
    if (!audioCache.has(src)) {
      audioCache.set(src, createAudio(src));
    }
    return audioCache.get(src);
  }

  function collectModeVoiceParts(modeKey) {
    const mode = getModeConfig(modeKey);
    if (!mode || !Array.isArray(mode.phases)) return [];

    const partKeys = new Set();

    mode.phases.forEach((phase) => {
      if (Array.isArray(phase?.leadParts)) {
        phase.leadParts.forEach((key) => partKeys.add(key));
      }

      if (Array.isArray(phase?.nextParts)) {
        phase.nextParts.forEach((key) => partKeys.add(key));
      }
    });

    return [...partKeys];
  }

  function collectModeVoiceSources(modeKey) {
    return collectModeVoiceParts(modeKey)
      .map((key) => VOICE_PARTS[key]?.file)
      .filter(Boolean)
      .map((file) => `audio/${file}.wav`);
  }

  function preloadModeVoices(modeKey) {
    const sources = collectModeVoiceSources(modeKey);

    sources.forEach((src) => {
      const audio = getCachedAudio(src);
      try {
        audio.load();
      } catch (err) {
        console.warn('[preloadModeVoices] load failed', src, err);
      }
    });

    console.log('[preloadModeVoices]', modeKey, sources);
  }

  function createPlaybackAudio(src) {
    const base = getCachedAudio(src);
    const audio = base.cloneNode(true);

    audio.preload = 'auto';
    audio.playsInline = true;
    audio.setAttribute?.('playsinline', '');
    audio.setAttribute?.('webkit-playsinline', '');

    return audio;
  }

  function collectVoiceSources() {
    return [
      'audio/timeSignal.mp3',
      'audio/setvoice.wav',
    ];
  }

  async function unlockAudio() {
    if (audioUnlocked || audioUnlocking) return;

    audioUnlocking = true;
    const sources = collectVoiceSources();

    try {
      await Promise.all(
        sources.map(async (src) => {
          const audio = getCachedAudio(src);

          const prevMuted = audio.muted;
          const prevVolume = audio.volume;

          audio.muted = true;
          audio.volume = 0;

          try {
            await audio.play();
          } catch (err) {
            console.warn('[unlockAudio] play failed', src, err);
          }

          try {
            audio.pause();
          } catch (err) {
            console.warn('[unlockAudio] pause failed', src, err);
          }

          try {
            audio.currentTime = 0;
          } catch (err) {
            console.warn('[unlockAudio] rewind failed', src, err);
          }

          audio.muted = prevMuted;
          audio.volume = prevVolume;
        })
      );

      audioUnlocked = true;
      console.log('[unlockAudio] complete');
    } finally {
      audioUnlocking = false;
    }
  }

  function stopSpeech() {
    if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    }
  }

  function stopAudioPlayback() {
    activeSequenceToken++;
    console.log('[stopAudioPlayback] called');

    if (activeAudio) {
      try {
        activeAudio.onended = null;
        activeAudio.onerror = null;
        activeAudio.onpause = null;
        activeAudio.pause();
        activeAudio.currentTime = 0;
      } catch (e) {
        console.warn('[stopAudioPlayback] error', e);
      }

      activeAudio = null;
    }
  }

  function stopSePlayback() {
  console.log('[stopSePlayback] called');

  if (activeSeAudio) {
    try {
      activeSeAudio.pause();
      activeSeAudio.currentTime = 0;
    } catch (e) {
      console.warn('[stopSePlayback] error', e);
    }

    activeSeAudio = null;
  }
}


  function speakKana(text) {
    if (!text) return;
    stopAudioPlayback();
    console.log('[speakKana]', text, { mode: getVoiceMode() });

    if (!('speechSynthesis' in window)) {
      console.warn('[speakKana] speechSynthesis is not supported in this browser.');
      return;
    }

    stopSpeech();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    utterance.volume = Number(seekVoiceVolume());
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      console.log('[speech start]', text);
    };

    utterance.onend = () => {
      console.log('[speech end]', text);
    };

    utterance.onerror = (event) => {
      if (event.error === 'interrupted') {
        console.log('[speech interrupted]', text);
        return;
      }

      console.warn('[speech error]', text, event);
    };

    window.speechSynthesis.speak(utterance);
  }

  function buildAudioFiles(parts = []) {
    return parts
      .map((key) => {
        const part = VOICE_PARTS[key];

        if (!part) {
          console.warn('[buildAudioFiles] missing VOICE_PARTS key:', key);
          return null;
        }

        if (!part.file) {
          console.warn('[buildAudioFiles] missing file name:', key, part);
          return null;
        }

        return `audio/${part.file}.wav`;
      })
      .filter(Boolean);
  }

  function resolveLeadFiles(arg1) {
    if (arg1 && typeof arg1 === 'object' && !Array.isArray(arg1)) {
      if (Array.isArray(arg1.leadParts)) {
        return buildAudioFiles(arg1.leadParts);
      }
    }
    return [];
  }

  function resolveNextFiles(arg1) {
    if (arg1 && typeof arg1 === 'object' && !Array.isArray(arg1)) {
      if (Array.isArray(arg1.nextParts)) {
        return buildAudioFiles(arg1.nextParts);
      }
    }
    return [];
  }

  function playSingleAudio(src) {
    return new Promise((resolve) => {
      const audio = createPlaybackAudio(src);
      activeAudio = audio;

      let resolved = false;
      const done = () => {
        if (resolved) return;
        resolved = true;

        audio.onended = null;
        audio.onerror = null;
        audio.onpause = null;

        if (activeAudio === audio) {
          activeAudio = null;
        }

        resolve();
      };

      audio.volume = seekVoiceVolume();
      audio.muted = false;

      audio.onended = () => {
        console.log('[audio ended]', src);
        done();
      };

      audio.onerror = (event) => {
        console.warn('[audio error]', src, event);
        done();
      };

      audio.play()
        .then(() => {
          console.log('[audio play]', src);
        })
        .catch((err) => {
          console.warn('[audio play failed]', src, err);
          done();
        });
    });
  }

  function playAudioSequence(fileList = []) {
    if (!Array.isArray(fileList) || fileList.length === 0) return;

    stopAudioPlayback();

    const token = ++activeSequenceToken;
    console.log('[play sequence start]', fileList, { token });

    (async () => {
      for (const src of fileList) {
        if (token !== activeSequenceToken) {
          console.log('[play sequence cancelled before]', src, { token, activeSequenceToken });
          return;
        }

        await playSingleAudio(src);

        if (token !== activeSequenceToken) {
          console.log('[play sequence cancelled after]', src, { token, activeSequenceToken });
          return;
        }

        // Safari向けのワンクッション
        await new Promise((r) => setTimeout(r, 60));
      }

      if (token === activeSequenceToken) {
        activeAudio = null;
        console.log('[play sequence end]', { token });
      }
    })().catch((err) => {
      console.warn('[play sequence failed]', err);
    });
  }

  const se = {
    timeSignal: getCachedAudio('audio/timeSignal.mp3'),
  };

  function playTimeSignal() {
    try {
      activeSeAudio = se.timeSignal;
      activeSeAudio.pause();
      activeSeAudio.currentTime = 0;
      activeSeAudio.muted = false;
      activeSeAudio.volume = audioConfig.seVolume;
      activeSeAudio.play();
    } catch (e) {
      console.warn('[playTimeSignal] error', e);
    }
  }

  function playVoiceTestSound() {
    try {
      stopAudioPlayback();

      activeAudio = getCachedAudio('audio/setvoice.wav');
      activeAudio.pause();
      activeAudio.currentTime = 0;
      activeAudio.muted = false;
      activeAudio.volume = audioConfig.voiceVolume;
      activeAudio.play();
    } catch (e) {
      console.warn('[playVoiceTestSound] error', e);
    }
  }

  function playSeTestSound() {
    try {
      stopSePlayback();

      activeSeAudio = getCachedAudio('audio/timeSignal.mp3');
      activeSeAudio.pause();
      activeSeAudio.currentTime = 0;
      activeSeAudio.muted = false;
      activeSeAudio.volume = audioConfig.seVolume;
      activeSeAudio.play();
    } catch (e) {
      console.warn('[playSeTestSound] error', e);
    }
  }

  const voice = {
    lead(arg1, arg2 = '') {
      const text = resolveLeadKana(arg1, arg2);
      console.log('[lead]', text, { raw1: arg1, raw2: arg2 });

      if (getVoiceMode() === 'simple') {
        speakKana(text);
        return;
      }

      const files = resolveLeadFiles(arg1);
      console.log('[lead files]', files);
      playAudioSequence(files);
    },

    countdown(sec) {
      console.log('[countdown]', sec);
      playTimeSignal();
    },

    next(arg1) {
      const text = resolveNextKana(arg1);
      console.log('[next]', text, { raw: arg1 });

      if (getVoiceMode() === 'simple') {
        speakKana(text);
        return;
      }

      const files = resolveNextFiles(arg1);
      console.log('[next files]', files);
      playAudioSequence(files);
    },
  };

/* ========================================
   5. 設定保存
   - saveSettings
   - loadSettings
   - syncAudioConfigFromDom
  ======================================== */

  function saveSettings() {
    const voiceMode = document.querySelector('input[name="voiceMode"]:checked')?.value || 'voicevox';
    const seVolumeEl = document.getElementById('seVolume');
    const voiceVolumeEl = document.getElementById('voiceVolume');

    const announceLeadValue =
      document.querySelector('input[name="announceLead"]:checked')?.value ?? String(CONFIG.defaultLeadSeconds);

    const playNextVoiceValue =
      document.querySelector('input[name="playNextVoice"]:checked')?.value ?? 'on';

    localStorage.setItem(STORAGE_KEYS.voiceMode, voiceMode);
    localStorage.setItem(STORAGE_KEYS.announceLead, announceLeadValue);
    localStorage.setItem(STORAGE_KEYS.playNextVoice, playNextVoiceValue);

    if (seVolumeEl) {
      localStorage.setItem(STORAGE_KEYS.seVolume, seVolumeEl.value);
    }

    if (voiceVolumeEl) {
      localStorage.setItem(STORAGE_KEYS.voiceVolume, voiceVolumeEl.value);
    }

    console.log('[settings save]', {
    voiceMode,
    seVolume: dom.seVolume?.value,
    voiceVolume: dom.voiceVolume?.value,
    announceLead: announceLeadValue,
    playNextVoice: playNextVoiceValue,
  });
  }

  function loadSettings() {
    const savedVoiceMode = localStorage.getItem(STORAGE_KEYS.voiceMode);
    const savedSeVolume = localStorage.getItem(STORAGE_KEYS.seVolume);
    const savedVoiceVolume = localStorage.getItem(STORAGE_KEYS.voiceVolume);
    const savedAnnounceLead = localStorage.getItem(STORAGE_KEYS.announceLead);
    const savedPlayNextVoice = localStorage.getItem(STORAGE_KEYS.playNextVoice);

    if (savedVoiceMode) {
      const radio = document.querySelector(`input[name="voiceMode"][value="${savedVoiceMode}"]`);
      if (radio) {
        radio.checked = true;
      }
    }

    const seVolumeEl = document.getElementById('seVolume');
    if (seVolumeEl && savedSeVolume !== null) {
      seVolumeEl.value = savedSeVolume;
    }

    const voiceVolumeEl = document.getElementById('voiceVolume');
    if (voiceVolumeEl && savedVoiceVolume !== null) {
      voiceVolumeEl.value = savedVoiceVolume;
    }

    if (savedAnnounceLead) {
      const radio = document.querySelector(`input[name="announceLead"][value="${savedAnnounceLead}"]`);
      if (radio) {
        radio.checked = true;
      }
    }

    if (savedPlayNextVoice) {
      const radio = document.querySelector(`input[name="playNextVoice"][value="${savedPlayNextVoice}"]`);
      if (radio) {
        radio.checked = true;
      }
    }

    console.log('[settings load]', {
      voiceMode: getVoiceMode(),
      seVolume: dom.seVolume?.value,
      voiceVolume: dom.voiceVolume?.value,
      announceLead: document.querySelector('input[name="announceLead"]:checked')?.value,
      playNextVoice: document.querySelector('input[name="playNextVoice"]:checked')?.value,
    });
  }

  function syncAudioConfigFromDom() {
    if (dom.seVolume) {
      const seValue = Number(dom.seVolume.value);
      if (!Number.isNaN(seValue)) {
        audioConfig.seVolume = Math.max(0, Math.min(1, seValue / 100));
      }
    }

    if (dom.voiceVolume) {
      const voiceValue = Number(dom.voiceVolume.value);
      if (!Number.isNaN(voiceValue)) {
        audioConfig.voiceVolume = Math.max(0, Math.min(1, voiceValue / 100));
      }
    }

    console.log('[audioConfig sync]', { ...audioConfig });
  }

/* ========================================
   6. 汎用
   - nowPerfMs: 超精度時計採用
   - getLeadSeconds
   - shouldPlayNextVoice
   - clearNextAnnounceTimeout
   - clearTimerLoop
   - getModeConfig
   - getPhaseInfo
   - getDurationMs
   - pushHistory
   - resetAnnouncementFlags
   - bindVolumeDisplay
======================================== */

  function nowPerfMs() {
    return performance.now();
  }

  function getLeadSeconds() {
    const checked = document.querySelector('input[name="announceLead"]:checked');
    const raw = Number(checked?.value ?? CONFIG.defaultLeadSeconds);

    if (Number.isNaN(raw)) return CONFIG.defaultLeadSeconds;
    return Math.max(0, raw);
  }

  function shouldPlayNextVoice() {
    const checked = document.querySelector('input[name="playNextVoice"]:checked');
    return checked?.value !== 'off';
  }

  function clearNextAnnounceTimeout() {
    if (state.nextAnnounceTimeoutId) {
      window.clearTimeout(state.nextAnnounceTimeoutId);
      state.nextAnnounceTimeoutId = 0;
    }
  }

  
  function clearTimerLoop() {
    if (state.rafId) {
      window.cancelAnimationFrame(state.rafId);
      state.rafId = 0;
    }
  }

  function getModeConfig(modeKey) {
   return MODES[modeKey] || null;
  }

  function getPhaseInfo(modeKey, scrambleState) {
    const mode = getModeConfig(modeKey);
    if (!mode) return null;

    if (scrambleState < 0 || scrambleState >= mode.phases.length) {
      return null;
    }

    return mode.phases[scrambleState] || null;
  }

  function getDurationMs(modeKey, scrambleState, isInitialStart = false) {
    const mode = getModeConfig(modeKey);
    if (!mode) return 0;

    if (isInitialStart) {
      return mode.initialDelayMs;
    }

    return mode.loopLapMs[scrambleState] ?? 0;
  }

  function pushHistory() {
    if (!state.mode || state.scrambleState < 0) return;

    state.history.push({
      mode: state.mode,
      scrambleState: state.scrambleState,
      targetPerfMs: state.targetPerfMs,
      timestamp: Date.now(),
    });

    if (state.history.length > 20) {
      state.history.shift();
    }
  }

  function resetAnnouncementFlags() {
    state.leadFired = false;
    state.countdown3Fired = false;
  }

  function bindVolumeDisplay(rangeEl, valueEl) {
    if (!rangeEl || !valueEl) return;

    const update = () => {
      valueEl.textContent = rangeEl.value;
    };

    rangeEl.addEventListener('input', update);

    // 初期表示
    update();
  }

  /* ========================================
   7. UI補助
   - updateButtonState: ボタン描画
   - BUTTON_STATE_TABLE: ボタンの考え方反映
   - adjustTargetTime 系
======================================== */

  function updateButtonState(stateKey) {
    const table = BUTTON_STATE_TABLE[stateKey];
    if (!table) return;

    Object.entries(table).forEach(([domKey, className]) => {
      const el = dom[domKey];
      if (!el) return;

      el.classList.remove('is-dark', 'is-normal', 'is-bright', 'is-active-timer');
      el.classList.add(className);
    });
  }

  // ボタン状態テーブル
  const BUTTON_STATE_TABLE = {
    initial: {
      btnCircle: 'is-bright',
      btnCircle1: 'is-normal',
      btnCircle2: 'is-normal',
      btnGrand: 'is-dark',
      btnGrand1: 'is-dark',
      btnGrand2: 'is-dark',
      btnAdjustPlus: 'is-normal',
      btnAdjustMinus: 'is-normal',
      btnReset: 'is-normal',
      activeTimer: null,
    },

    circle: {
      btnCircle: 'is-dark',
      btnCircle1: 'is-bright',
      btnCircle2: 'is-normal',
      btnGrand: 'is-bright',
      btnGrand1: 'is-normal',
      btnGrand2: 'is-normal',
      btnAdjustPlus: 'is-normal',
      btnAdjustMinus: 'is-normal',
      btnReset: 'is-normal',
      activeTimer: 'btnCircle',
    },

    circle1: {
      btnCircle: 'is-dark',
      btnCircle1: 'is-dark',
      btnCircle2: 'is-bright',
      btnGrand: 'is-bright',
      btnGrand1: 'is-normal',
      btnGrand2: 'is-normal',
      btnAdjustPlus: 'is-normal',
      btnAdjustMinus: 'is-normal',
      btnReset: 'is-normal',
      activeTimer: 'is-btnCircle',
    },

    circle2: {
      btnCircle: 'is-dark',
      btnCircle1: 'is-dark',
      btnCircle2: 'is-dark',
      btnGrand: 'is-bright',
      btnGrand1: 'is-normal',
      btnGrand2: 'is-normal',
      btnAdjustPlus: 'is-normal',
      btnAdjustMinus: 'is-normal',
      btnReset: 'is-normal',
      activeTimer: 'btnCircle',
    },

    grand: {
      btnCircle: 'is-dark',
      btnCircle1: 'is-dark',
      btnCircle2: 'is-dark',
      btnGrand: 'is-dark',
      btnGrand1: 'is-bright',
      btnGrand2: 'is-normal',
      btnAdjustPlus: 'is-normal',
      btnAdjustMinus: 'is-normal',
      btnReset: 'is-normal',
      activeTimer: 'btnGrand',
    },

    grand1: {
      btnCircle: 'is-dark',
      btnCircle1: 'is-dark',
      btnCircle2: 'is-dark',
      btnGrand: 'is-dark',
      btnGrand1: 'is-dark',
      btnGrand2: 'is-bright',
      btnAdjustPlus: 'is-normal',
      btnAdjustMinus: 'is-normal',
      btnReset: 'is-normal',
      activeTimer: 'btnGrand',
    },

    grand2: {
      btnCircle: 'is-dark',
      btnCircle1: 'is-dark',
      btnCircle2: 'is-dark',
      btnGrand: 'is-dark',
      btnGrand1: 'is-dark',
      btnGrand2: 'is-dark',
      btnAdjustPlus: 'is-normal',
      btnAdjustMinus: 'is-normal',
      btnReset: 'is-normal',
      activeTimer: 'btnGrand',
    },
  };

  function adjustTargetTime(diffMs) {
    if (!state.running) return;

    state.targetPerfMs += diffMs;
    console.log('[adjustTargetTime]', { diffMs, targetPerfMs: state.targetPerfMs });
  }

/* ========================================
   8. 描画
   - formatDisplaySeconds: タイマー整形
   - renderIdle: 待機画面描画
   - renderRunning: 実行中の表示更新
======================================== */

  function formatDisplaySeconds(ms) {
    const seconds = Math.max(0, ms) / 1000;
    return seconds.toFixed(1);
  }

  function renderIdle() {
    if (dom.timerMain) dom.timerMain.textContent = '00';
    if (dom.timerSub) dom.timerSub.textContent = '0';
    if (dom.currentSafe) dom.currentSafe.textContent = '待機中';
    if (dom.nextSafe) dom.nextSafe.textContent = '-';
  }

  function renderRunning(remainingMs, phase) {
    const safeMs = Math.max(0, remainingMs);
    const formatted = formatDisplaySeconds(safeMs);
    const [main, sub = '0'] = formatted.split('.');

    if (dom.timerMain) {
      dom.timerMain.textContent = main.padStart(2, '0');
    }

    if (dom.timerSub) {
      dom.timerSub.textContent = sub;
    }

    if (dom.currentSafe) {
      dom.currentSafe.textContent = phase?.currentText || '-';
    }

    if (dom.nextSafe) {
      dom.nextSafe.textContent = phase?.noteText || '-';
    }
  }

  /* ========================================
   9. タイマー
   - startMode: タイマー開始
   - goToNextPhase: フェーズ進行
   - tick: 残り時間描写
   - resetTimer: タイマー停止と初期化
  ======================================== */

  function startMode(modeKey, scrambleState = 0) {
    const mode = getModeConfig(modeKey);
    if (!mode) return;

    preloadModeVoices(modeKey);

    clearNextAnnounceTimeout();
    clearTimerLoop();
    stopSpeech();
    stopAudioPlayback();
    stopSePlayback();

    state.mode = modeKey;
    state.scrambleState = scrambleState;
    state.running = true;

    const isInitialStart = scrambleState === 0;

    if (isInitialStart) {
      state.lapIndex = -1; // ループ開始位置
      } else {
      state.lapIndex = scrambleState - 1;
    }

    const durationMs = isInitialStart
    ? mode.initialDelayMs
    : mode.loopLapMs[state.lapIndex] ?? 0;
    state.targetPerfMs = nowPerfMs() + durationMs;

    resetAnnouncementFlags();

    updateButtonState(
      scrambleState === 0 ? modeKey : `${modeKey}${scrambleState}`
    );

    const phase = getPhaseInfo(state.mode, state.scrambleState);
    renderRunning(durationMs, phase);

    console.log('[startMode]', {
      modeKey,
      scrambleState,
      durationMs,
    });

    tick();
  }

  function goToNextPhase() {
  const mode = getModeConfig(state.mode);
  if (!mode) return;

  // 表示用
  state.scrambleState =
    (state.scrambleState + 1) % mode.phases.length;

  // 時間用（これがlapIndex）
  state.lapIndex =
    (state.lapIndex + 1) % mode.loopLapMs.length;

  const durationMs = mode.loopLapMs[state.lapIndex] ?? 0;

  state.targetPerfMs = nowPerfMs() + durationMs;

  resetAnnouncementFlags();

  updateButtonState(
    state.scrambleState === 0
      ? state.mode
      : `${state.mode}${state.scrambleState}`
  );

  const phase = getPhaseInfo(state.mode, state.scrambleState);
  renderRunning(durationMs, phase);

  console.log('[goToNextPhase]', {
    scrambleState: state.scrambleState,
    lapIndex: state.lapIndex,
    durationMs,
  });

  state.rafId = requestAnimationFrame(tick);
}

  function tick() {
    clearTimerLoop();

    if (!state.running || !state.mode) return;

    const remainingMs = state.targetPerfMs - nowPerfMs();
    const current = getPhaseInfo(state.mode, state.scrambleState);

    renderRunning(remainingMs, current);

    // 事前読み
    const leadMs = getLeadSeconds() * 1000;
    if (!state.leadFired && remainingMs <= leadMs && remainingMs > 0) {
      if (current) {
        voice.lead(current);
      }
      state.leadFired = true;
    }

    // 3秒前SE/カウント
    if (!state.countdown3Fired && remainingMs <= 3000 && remainingMs > 0) {
      voice.countdown(3);
      state.countdown3Fired = true;
    }

    // フェーズ終了
    if (remainingMs <= 0) {
      const mode = getModeConfig(state.mode);
      const nextScrambleState = mode
        ? (state.scrambleState + 1) % mode.phases.length
        : 0;

      const next = getPhaseInfo(state.mode, nextScrambleState);

      clearNextAnnounceTimeout();
    if (next && shouldPlayNextVoice()) {
      state.nextAnnounceTimeoutId = window.setTimeout(() => {
        voice.next(next);
      }, CONFIG.nextAnnounceDelayMs);
    }

      goToNextPhase();

      console.log('[tick after advance]', {
        mode: state.mode,
        scrambleState: state.scrambleState,
        durationMs: getDurationMs(state.mode, state.scrambleState),
        nextPhase: getPhaseInfo(state.mode, state.scrambleState),
      });
      return;
    }

    state.rafId = window.requestAnimationFrame(tick);
  }

  function resetTimer() {
    stopSpeech();
    stopAudioPlayback();
    stopSePlayback();
    console.log('[reset] stop speech/audio/se');

    pushHistory();
    clearNextAnnounceTimeout();
    clearTimerLoop();

    state.mode = null;
    state.scrambleState = -1;
    state.running = false;
    state.targetPerfMs = 0;
    resetAnnouncementFlags();

    updateButtonState('initial');
    renderIdle();
  }

/* ========================================
   10. イベント
   - bindEvents: ボタンと押し忘れボタンのモード
   - ボタンイベント
   - saveSettings: 設定記憶
======================================== */

function bindEvents() {
  dom.btnCircle?.addEventListener('click', async () => {
    unlockAudio().catch((err) => {
      console.warn('[unlockAudio] failed', err);
    });
    updateButtonState('circle');
    startMode('circle', 0);
  });

  dom.btnCircle1?.addEventListener('click', async () => {
    unlockAudio().catch((err) => {
      console.warn('[unlockAudio] failed', err);
    });
    updateButtonState('circle1');
    startMode('circle', 1);
  });

  dom.btnCircle2?.addEventListener('click', async () => {
    unlockAudio().catch((err) => {
      console.warn('[unlockAudio] failed', err);
    });
    updateButtonState('circle2');
    startMode('circle', 2);
  });

  dom.btnGrand?.addEventListener('click', async () => {
    unlockAudio().catch((err) => {
      console.warn('[unlockAudio] failed', err);
    });
    updateButtonState('grand');
    startMode('grand', 0);
  });

  dom.btnGrand1?.addEventListener('click', async () => {
    unlockAudio().catch((err) => {
      console.warn('[unlockAudio] failed', err);
    });
    updateButtonState('grand1');
    startMode('grand', 1);
  });

  dom.btnGrand2?.addEventListener('click', async () => {
    unlockAudio().catch((err) => {
      console.warn('[unlockAudio] failed', err);
    });
    updateButtonState('grand2');
    startMode('grand', 2);
  });

  dom.btnAdjustPlus?.addEventListener('click', async () => {
    unlockAudio().catch((err) => {
      console.warn('[unlockAudio] failed', err);
    });
    adjustTargetTime(CONFIG.adjustStepMs);
  });

  dom.btnAdjustMinus?.addEventListener('click', async () => {
    unlockAudio().catch((err) => {
      console.warn('[unlockAudio] failed', err);
    });
    adjustTargetTime(-CONFIG.adjustStepMs);
  });

  dom.btnReset?.addEventListener('click', async () => {
    unlockAudio().catch((err) => {
      console.warn('[unlockAudio] failed', err);
    });
    updateButtonState('initial');
    resetTimer();
  });

  document.querySelectorAll('input[name="announceLead"]').forEach((el) => {
    el.addEventListener('change', async () => {
      unlockAudio().catch((err) => {
      console.warn('[unlockAudio] failed', err);
    });
      saveSettings();
    });
  });

  document.querySelectorAll('input[name="playNextVoice"]').forEach((el) => {
    el.addEventListener('change', async () => {
      unlockAudio().catch((err) => {
      console.warn('[unlockAudio] failed', err);
    });
      saveSettings();
    });
  });

  dom.seVolume?.addEventListener('input', async (e) => {
    unlockAudio().catch((err) => {
      console.warn('[unlockAudio] failed', err);
    });
    audioConfig.seVolume = e.target.value / 100;
    playSeTestSound();
    saveSettings();
  });

  dom.voiceVolume?.addEventListener('input', async (e) => {
    unlockAudio().catch((err) => {
      console.warn('[unlockAudio] failed', err);
    });
    audioConfig.voiceVolume = e.target.value / 100;
    playVoiceTestSound();
    saveSettings();
  });

  document.querySelectorAll('input[name="voiceMode"]').forEach((el) => {
    el.addEventListener('change', async () => {
      unlockAudio().catch((err) => {
      console.warn('[unlockAudio] failed', err);
    });
      saveSettings();
    });
  });

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;

    switch (event.key) {
      case 'F1':
        updateButtonState('circle');
        startMode('circle', 0);
        break;
      case 'F2':
        updateButtonState('circle1');
        startMode('circle', 1);
        break;
      case 'F3':
        updateButtonState('circle2');
        startMode('circle', 2);
        break;
      case 'F5':
        updateButtonState('grand');
        startMode('grand', 0);
        break;
      case 'F6':
        updateButtonState('grand1');
        startMode('grand', 1);
        break;
      case 'F7':
        updateButtonState('grand2');
        startMode('grand', 2);
        break;
      case '+':
      case '=':
        adjustTargetTime(CONFIG.adjustStepMs);
        break;
      case '-':
        adjustTargetTime(-CONFIG.adjustStepMs);
        break;
      case 'Delete':
        updateButtonState('initial');
        resetTimer();
        break;
      default:
        break;
    }
  });
}

  /* ========================================
     9. 初期化
  ======================================== */

  function init() {
    loadSettings();
    bindEvents();

    updateButtonState('initial');
    renderIdle();
    syncAudioConfigFromDom();
    
    bindVolumeDisplay(
      dom.voiceVolume,
      document.getElementById('voiceVolumeValue')
    );

    bindVolumeDisplay(
      dom.seVolume,
      document.getElementById('seVolumeValue')
    );

    collectVoiceSources().forEach((src) => {
      getCachedAudio(src);
    });

    console.log('[init] complete', {
      voiceMode: getVoiceMode(),
      seVolume: dom.seVolume?.value,
      voiceVolume: dom.voiceVolume?.value,
      announceLead: document.querySelector('input[name="announceLead"]:checked')?.value,
      playNextVoice: document.querySelector('input[name="playNextVoice"]:checked')?.value,
    });
  }

init();

})();
