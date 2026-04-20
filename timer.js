// Rubetimer
// Version: v2.31
// Build: 2026-04-08
// Author: mentha0608
// Voice: VOICEVOX:四国めたん
//
// タイマー仕様：
// ・高精度タイマー（performance.now + requestAnimationFrame）
// ・ラップ時間は0.25秒単位で丸めて利用
// ・床出現タイミング基準で案内
// ・Howler.js による音声再生基盤へ移行
// ・外部割当キー（[ ] + -）による操作へ整理

(() => {
  'use strict';

/* ========================================
   1. 定数 / データ
   - CONFIG: タイマー基本設定
   - STORAGE_KEYS: 保存キー
   - audioConfig: 音量設定
   - VOICE_PARTS: 音声パーツ定義
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
    metronomeInterval: 'rubetimer.metronomeInterval',
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
    s_5sec: {
        text: '5秒前',
        kana: 'ごびょうまえ',
        file: 's_5sec',
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
        currentText: '➀線上・大外',
        noteText: '-',

        leadParts: ['c_senjo_osoto'],
        nextParts: ['s_tsugi', 'c_senjo_osoto', 's_loop'],
      },
      {
        currentText: '➁中央大・線上',
        noteText: '遅い',

        leadParts: ['s_osoi', 'c_center_large_senjo'],
        nextParts: ['s_tsugi', 'c_center_large_senjo'],
      },
      {
        currentText: '➂中央・網・外',
        noteText: '-',

        leadParts: ['c_center_ami_soto'],
        nextParts: ['s_tsugi', 'c_center_ami_soto'],
      },
      {
        currentText: '➃線上・大外',
        noteText: '遅い',

        leadParts: ['s_osoi', 'c_senjo_osoto'],
        nextParts: ['s_tsugi', 'c_senjo_osoto'],
      },
      {
        currentText: '➄中央大・外',
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
    metronomeIntervalRadios: document.querySelectorAll('input[name="metronomeInterval"]'),
  };

/* ========================================
   3. 状態
   - タイマー進行状態
   - 案内発火フラグ
   - 次案内タイマー管理
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

    lastMetronomeTenths: null,
    fiveSecondsVoiceFired: false,
  };

/* ========================================
   4. 音声ユーティリティ
   - howlPool / getHowl: Howler音源の生成と再利用
   - primeHowler: 初回ユーザー操作で再生基盤を初期化
   - buildKana / resolveLeadKana / resolveNextKana
   - getVoiceMode / seekVoiceVolume
   - stopSpeech / stopAudioPlayback / stopSePlayback
   - speakKana
   - buildAudioFiles
   - resolveLeadFiles / resolveNextFiles
   - playSingleHowl / playHowlSequence
   - playTimeSignal / playVoiceTestSound / playSeTestSound
   - voice
======================================== */

  let activeVoiceHowl = null;
  let activeSeHowl = null;
  let activeSequenceToken = 0;
  const howlPool = new Map();
  let howlerPrimed = false;

  function getHowl(src, options = {}) {
    if (!howlPool.has(src)) {
      const sound = new Howl({
        src: [src],
        preload: true,
        html5: options.html5 ?? false,
        volume: options.volume ?? 1.0,
      });

      howlPool.set(src, sound);
    }

    return howlPool.get(src);
  }

  async function primeHowler() {
    if (howlerPrimed) return;

    const src = 'audio/timeSignal.mp3';
    const sound = getHowl(src);

    try {
      const id = sound.play();

      sound.volume(0, id);

      await new Promise((resolve) => {
        sound.once('play', resolve, id);
        sound.once('playerror', resolve, id);
      });

      sound.stop(id);
      howlerPrimed = true;
      console.log('[primeHowler] complete');
    } catch (err) {
      console.warn('[primeHowler] failed', err);
    }
  }

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

  function stopSpeech() {
    if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    }
  }

  function stopAudioPlayback() {
    console.log('[stopAudioPlayback] called');
    activeSequenceToken += 1;

    if (activeVoiceHowl) {
      try {
        activeVoiceHowl.stop();
      } catch (e) {
        console.warn('[stopAudioPlayback] error', e);
      }

      activeVoiceHowl = null;
    }
  }

  function stopSePlayback() {
    console.log('[stopSePlayback] called');

    if (activeSeHowl) {
      try {
        activeSeHowl.stop();
      } catch (e) {
        console.warn('[stopSePlayback] error', e);
      }

      activeSeHowl = null;
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

  function playSingleHowl(src, volume = 1.0) {
    return new Promise((resolve) => {
      const sound = getHowl(src, { volume });
      activeVoiceHowl = sound;

      const id = sound.play();

      sound.volume(volume, id);

      sound.once('end', () => {
        resolve();
      }, id);

      sound.once('playerror', () => {
        sound.once('unlock', () => {
          sound.play();
        });
        resolve();
      }, id);

      sound.once('loaderror', (_, err) => {
        console.warn('[howl loaderror]', src, err);
        resolve();
      }, id);
    });
  }

  async function playHowlSequence(fileList = []) {
    const token = ++activeSequenceToken;
    console.log('[play sequence start]', fileList);

    for (const src of fileList) {
      if (token !== activeSequenceToken) {
        console.log('[play sequence cancelled]', src);
        return;
      }

      await playSingleHowl(src, seekVoiceVolume());
    }

    if (token === activeSequenceToken) {
      activeVoiceHowl = null;
      console.log('[play sequence end]');
    }
  }

  const se = {
    timeSignal: 'audio/timeSignal.mp3',

    metronomeBeep: 'audio/metronomeBeep.mp3',
    metronomeChime: 'audio/metronomeChime.mp3',
  };

  function playTimeSignal() {
    try {
      const sound = getHowl(se.timeSignal, { volume: audioConfig.seVolume });
      activeSeHowl = sound;

      const id = sound.play();
      sound.volume(audioConfig.seVolume, id);
    } catch (e) {
      console.warn('[playTimeSignal] error', e);
    }
  }

  function playMetronomeBeep() {
  try {
    const sound = getHowl(se.metronomeBeep, { volume: audioConfig.seVolume * 0.45 });
    activeSeHowl = sound;

    const id = sound.play();
    sound.volume(audioConfig.seVolume * 0.45, id);
  } catch (e) {
    console.warn('[playMetronomeBeep] error', e);
  }
}

  function playMetronomeChime() {
    try {
      const sound = getHowl(se.metronomeChime, { volume: audioConfig.seVolume * 0.65 });
      activeSeHowl = sound;

      const id = sound.play();
      sound.volume(audioConfig.seVolume * 0.65, id);
    } catch (e) {
      console.warn('[playMetronomeChime] error', e);
    }
  }

  function playVoiceTestSound() {
    try {
      stopAudioPlayback();

      const sound = getHowl('audio/setvoice.wav', { volume: audioConfig.voiceVolume });
      activeVoiceHowl = sound;

      const id = sound.play();
      sound.volume(audioConfig.voiceVolume, id);
    } catch (e) {
      console.warn('[playVoiceTestSound] error', e);
    }
  }

  function playSeTestSound() {
    try {
      stopSePlayback();

      const sound = getHowl('audio/timeSignal.mp3', { volume: audioConfig.seVolume });
      activeSeHowl = sound;

      const id = sound.play();
      sound.volume(audioConfig.seVolume, id);
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
      playHowlSequence(files);
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
      playHowlSequence(files);
    },

    fiveSeconds() {
      const text = buildKana(['s_5sec']);
      console.log('[fiveSeconds]', text);

      if (getVoiceMode() === 'simple') {
        speakKana(text);
        return;
      }

      const files = buildAudioFiles(['s_5sec']);
      console.log('[fiveSeconds files]', files);
      playHowlSequence(files);
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

    const metronomeIntervalValue =
       document.querySelector('input[name="metronomeInterval"]:checked')?.value ?? 'off';

    localStorage.setItem(STORAGE_KEYS.voiceMode, voiceMode);
    localStorage.setItem(STORAGE_KEYS.announceLead, announceLeadValue);
    localStorage.setItem(STORAGE_KEYS.playNextVoice, playNextVoiceValue);
    localStorage.setItem(STORAGE_KEYS.metronomeInterval, metronomeIntervalValue);

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
    metronomeInterval: metronomeIntervalValue,
  });
  }

  function loadSettings() {
    const savedVoiceMode = localStorage.getItem(STORAGE_KEYS.voiceMode);
    const savedSeVolume = localStorage.getItem(STORAGE_KEYS.seVolume);
    const savedVoiceVolume = localStorage.getItem(STORAGE_KEYS.voiceVolume);
    const savedAnnounceLead = localStorage.getItem(STORAGE_KEYS.announceLead);
    const savedPlayNextVoice = localStorage.getItem(STORAGE_KEYS.playNextVoice);
    const savedMetronomeInterval = localStorage.getItem(STORAGE_KEYS.metronomeInterval);

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

    if (savedMetronomeInterval) {
      const radio = document.querySelector(`input[name="metronomeInterval"][value="${savedMetronomeInterval}"]`);
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
      metronomeInterval: document.querySelector('input[name="metronomeInterval"]:checked')?.value,
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
   - 時刻取得
   - 設定参照
   - タイマー補助
   - 表示補助
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

  function getMetronomeInterval() {
    const checked = document.querySelector('input[name="metronomeInterval"]:checked');
    const raw = checked?.value ?? 'off';

    if (raw === 'off') return 0;

    const value = Number(raw);
    if (Number.isNaN(value) || value <= 0) return 0;

    return value;
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

    state.lastMetronomeTenths = null;
    state.fiveSecondsVoiceFired = false;
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

  function shouldPlayFiveSecondsVoice() {
    return getLeadSeconds() === 10;
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
   - tick: 残り時間更新と案内判定
   - resetTimer: タイマー停止と初期化
======================================== */

  function startMode(modeKey, scrambleState = 0) {
    const mode = getModeConfig(modeKey);
    if (!mode) return;

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

  function handleMetronome(remainingMs) {
    if (remainingMs <= 0) return;
    const intervalSec = getMetronomeInterval();
    if (intervalSec <= 0) return;

    const safeMs = Math.max(0, remainingMs);
    const currentTenths = Math.floor(safeMs / 100);

    if (state.lastMetronomeTenths === currentTenths) return;
    state.lastMetronomeTenths = currentTenths;

    // x.0 の瞬間だけ判定
    if (currentTenths % 10 !== 0) return;

    const wholeSeconds = currentTenths / 10;

    if (wholeSeconds % intervalSec !== 0) {
      playMetronomeBeep();
      return;
    }

    playMetronomeChime();
  }

  function tick() {
    clearTimerLoop();

    if (!state.running || !state.mode) return;

    const remainingMs = state.targetPerfMs - nowPerfMs();
    const current = getPhaseInfo(state.mode, state.scrambleState);

    renderRunning(remainingMs, current);

    // 追加：メトロノーム
    handleMetronome(remainingMs);

    // 事前読み
    const leadMs = getLeadSeconds() * 1000;
    if (!state.leadFired && remainingMs <= leadMs && remainingMs > 0) {
      if (current) {
        voice.lead(current);
      }
      state.leadFired = true;
    }

    // 5秒前読み上げ（10秒設定のときだけ）
    if (
      shouldPlayFiveSecondsVoice() &&
      !state.fiveSecondsVoiceFired &&
      remainingMs <= 5000 &&
      remainingMs > 4000
    ) {
      voice.fiveSeconds();
      state.fiveSecondsVoiceFired = true;
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
   - bindEvents: 初回音声アンロックと各種操作の登録
   - 開始ボタンイベント
   - 調整ボタンイベント
   - 設定変更イベント
   - キーボード / 外部割当キーイベント
======================================== */

  function bindEvents() {
    const unlockOnce = async () => {
      await primeHowler();

      if (howlerPrimed) {
        window.removeEventListener('pointerdown', unlockOnce);
        window.removeEventListener('touchstart', unlockOnce);
        window.removeEventListener('click', unlockOnce);
      }
    };

    window.addEventListener('pointerdown', unlockOnce, { passive: true });
    window.addEventListener('touchstart', unlockOnce, { passive: true });
    window.addEventListener('click', unlockOnce, { passive: true });

    dom.btnCircle?.addEventListener('click', async () => {
      await primeHowler();
      updateButtonState('circle');
      startMode('circle', 0);
    });

    dom.btnCircle1?.addEventListener('click', async () => {
      await primeHowler();
      updateButtonState('circle1');
      startMode('circle', 1);
    });

    dom.btnCircle2?.addEventListener('click', async () => {
      await primeHowler();
      updateButtonState('circle2');
      startMode('circle', 2);
    });

    dom.btnGrand?.addEventListener('click', async () => {
      await primeHowler();
      updateButtonState('grand');
      startMode('grand', 0);
    });

    dom.btnGrand1?.addEventListener('click', async () => {
      await primeHowler();
      updateButtonState('grand1');
      startMode('grand', 1);
    });

    dom.btnGrand2?.addEventListener('click', async () => {
      await primeHowler();
      updateButtonState('grand2');
      startMode('grand', 2);
    });

    dom.btnAdjustPlus?.addEventListener('click', () => {
      adjustTargetTime(CONFIG.adjustStepMs);
    });

    dom.btnAdjustMinus?.addEventListener('click', () => {
      adjustTargetTime(-CONFIG.adjustStepMs);
    });

    dom.btnReset?.addEventListener('click', () => {
      updateButtonState('initial');
      resetTimer();
    });

    document.querySelectorAll('input[name="announceLead"]').forEach((el) => {
      el.addEventListener('change', () => {
        saveSettings();
      });
    });

    document.querySelectorAll('input[name="playNextVoice"]').forEach((el) => {
      el.addEventListener('change', () => {
        saveSettings();
      });
    });

    document.querySelectorAll('input[name="metronomeInterval"]').forEach((el) => {
      el.addEventListener('change', () => {
        saveSettings();
      });
    });

    dom.seVolume?.addEventListener('input', (e) => {
      audioConfig.seVolume = e.target.value / 100;
      playSeTestSound();
      saveSettings();
    });

    dom.voiceVolume?.addEventListener('input', (e) => {
      audioConfig.voiceVolume = e.target.value / 100;
      playVoiceTestSound();
      saveSettings();
    });

    document.querySelectorAll('input[name="voiceMode"]').forEach((el) => {
      el.addEventListener('change', () => {
        saveSettings();
      });
    });



    window.addEventListener('keydown', (event) => {
      if (event.repeat) return;

      switch (event.key) {
        // 新キー
        case '[':
          updateButtonState('circle');
          startMode('circle', 0);
          break;
        case ']':
          updateButtonState('grand');
          startMode('grand', 0);
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
     11. 初期化
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
