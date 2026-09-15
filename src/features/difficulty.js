(function () {
  'use strict';

  const STORAGE_KEY = 'melt-melon.difficulty';
  const DEFAULT_DIFFICULTY = 'normal';
  const PROFILE_ORDER = ['easy', 'normal', 'hard'];
  const PROFILES = Object.freeze({
    easy: Object.freeze({
      id: 'easy',
      warningY: 126,
      overflowSeconds: 4.5,
      softenSeconds: 3.2,
      softenCost: 45,
      energyPerMerge: 4,
      tiltEnergyPerSecond: 7,
      initialEnergy: 85,
      initialLayout: Object.freeze([[0, .18], [2, .5], [0, .82]]),
    }),
    normal: Object.freeze({
      id: 'normal',
      warningY: 137,
      overflowSeconds: 3,
      softenSeconds: 2.4,
      softenCost: 60,
      energyPerMerge: 2,
      tiltEnergyPerSecond: 10,
      initialEnergy: 60,
      initialLayout: Object.freeze([[1, .13], [3, .35], [0, .59], [2, .81]]),
    }),
    hard: Object.freeze({
      id: 'hard',
      warningY: 150,
      overflowSeconds: 2.1,
      softenSeconds: 1.8,
      softenCost: 72,
      energyPerMerge: 1,
      tiltEnergyPerSecond: 14,
      initialEnergy: 45,
      initialLayout: Object.freeze([[1, .1], [3, .3], [0, .5], [2, .7], [1, .9]]),
    }),
  });

  const COPY = Object.freeze({
    'zh-CN': {
      label: '难度', choose: '选择游戏难度', easy: '轻松', normal: '经典', hard: '高手',
      restart: '切换难度会开始新的一局',
      easyDetail: '更多空间与能量 · 危险线 4.5 秒',
      normalDetail: '标准规则 · 危险线 3 秒',
      hardDetail: '更少空间与能量 · 危险线 2.1 秒',
      soften: p => `当前难度：揉软持续 ${p.softenSeconds} 秒，消耗 ${p.softenCost} 能量。每次合成恢复 ${p.energyPerMerge} 能量；倾斜每秒消耗 ${p.tiltEnergyPerSecond} 能量。`,
      danger: p => `当前难度下，水果越过红线 ${p.overflowSeconds} 秒后结束。西瓜不会消除，合出后可以继续冲分。`,
      softenAria: p => `揉软水果，消耗 ${p.softenCost} 能量`,
      tiltLeftAria: p => `按住向左倾斜，每秒消耗 ${p.tiltEnergyPerSecond} 能量`,
      tiltRightAria: p => `按住向右倾斜，每秒消耗 ${p.tiltEnergyPerSecond} 能量`,
      mergeEnergy: p => `合成 +${p.energyPerMerge}`,
    },
    en: {
      label: 'Difficulty', choose: 'Choose difficulty', easy: 'Relaxed', normal: 'Classic', hard: 'Expert',
      restart: 'Changing difficulty starts a new round',
      easyDetail: 'More room & energy · 4.5s danger timer',
      normalDetail: 'Standard rules · 3s danger timer',
      hardDetail: 'Less room & energy · 2.1s danger timer',
      soften: p => `On this difficulty, Soften lasts ${p.softenSeconds}s and costs ${p.softenCost} energy. Each merge restores ${p.energyPerMerge}; tilting costs ${p.tiltEnergyPerSecond} energy per second.`,
      danger: p => `On this difficulty, the round ends after fruit stays above the red line for ${p.overflowSeconds}s. Watermelons remain in the pool, so you can keep scoring after making one.`,
      softenAria: p => `Soften fruit; costs ${p.softenCost} energy`,
      tiltLeftAria: p => `Hold to tilt left; costs ${p.tiltEnergyPerSecond} energy per second`,
      tiltRightAria: p => `Hold to tilt right; costs ${p.tiltEnergyPerSecond} energy per second`,
      mergeEnergy: p => `Merge +${p.energyPerMerge}`,
    },
    vi: {
      label: 'Độ khó', choose: 'Chọn độ khó', easy: 'Dễ', normal: 'Thường', hard: 'Khó',
      restart: 'Đổi độ khó sẽ bắt đầu một ván mới',
      easyDetail: 'Nhiều chỗ và năng lượng hơn · Cảnh báo 4,5 giây',
      normalDetail: 'Luật tiêu chuẩn · Cảnh báo 3 giây',
      hardDetail: 'Ít chỗ và năng lượng hơn · Cảnh báo 2,1 giây',
      soften: p => `Ở độ khó này, Làm mềm kéo dài ${String(p.softenSeconds).replace('.', ',')} giây và tốn ${p.softenCost} năng lượng. Mỗi lần ghép hồi ${p.energyPerMerge}; nghiêng tốn ${p.tiltEnergyPerSecond} năng lượng/giây.`,
      danger: p => `Ở độ khó này, ván chơi kết thúc khi trái nằm trên vạch đỏ trong ${String(p.overflowSeconds).replace('.', ',')} giây. Dưa hấu không biến mất nên bạn vẫn có thể tiếp tục ghi điểm.`,
      softenAria: p => `Làm mềm trái cây, tốn ${p.softenCost} năng lượng`,
      tiltLeftAria: p => `Giữ để nghiêng trái, tốn ${p.tiltEnergyPerSecond} năng lượng mỗi giây`,
      tiltRightAria: p => `Giữ để nghiêng phải, tốn ${p.tiltEnergyPerSecond} năng lượng mỗi giây`,
      mergeEnergy: p => `Ghép +${p.energyPerMerge}`,
    },
    ja: {
      label: '難易度', choose: '難易度を選択', easy: 'やさしい', normal: 'ノーマル', hard: 'むずかしい',
      restart: '難易度を変更すると新しいゲームが始まります',
      easyDetail: 'スペースとエネルギー多め · 危険ライン 4.5秒',
      normalDetail: '標準ルール · 危険ライン 3秒',
      hardDetail: 'スペースとエネルギー少なめ · 危険ライン 2.1秒',
      soften: p => `この難易度では、やわらか状態は${p.softenSeconds}秒、消費エネルギーは${p.softenCost}。合成ごとに${p.energyPerMerge}回復し、傾けると毎秒${p.tiltEnergyPerSecond}消費します。`,
      danger: p => `この難易度では、フルーツが赤いラインの上に${p.overflowSeconds}秒とどまると終了。スイカは消えないので、その後もスコアを伸ばせます。`,
      softenAria: p => `フルーツをやわらかくする。エネルギー${p.softenCost}消費`,
      tiltLeftAria: p => `長押しで左に傾ける。毎秒エネルギー${p.tiltEnergyPerSecond}消費`,
      tiltRightAria: p => `長押しで右に傾ける。毎秒エネルギー${p.tiltEnergyPerSecond}消費`,
      mergeEnergy: p => `合成 +${p.energyPerMerge}`,
    },
    ko: {
      label: '난이도', choose: '난이도 선택', easy: '쉬움', normal: '보통', hard: '어려움',
      restart: '난이도를 바꾸면 새 게임이 시작됩니다',
      easyDetail: '공간·에너지 여유 · 위험선 4.5초',
      normalDetail: '기본 규칙 · 위험선 3초',
      hardDetail: '공간·에너지 부족 · 위험선 2.1초',
      soften: p => `이 난이도에서는 말랑 효과가 ${p.softenSeconds}초 지속되고 에너지 ${p.softenCost}을 사용합니다. 합성할 때마다 ${p.energyPerMerge} 회복하며, 기울이기는 초당 ${p.tiltEnergyPerSecond}을 사용합니다.`,
      danger: p => `이 난이도에서는 과일이 빨간 선 위에 ${p.overflowSeconds}초 머물면 게임이 끝납니다. 수박은 사라지지 않아 이후에도 계속 점수를 올릴 수 있습니다.`,
      softenAria: p => `과일을 말랑하게 하기, 에너지 ${p.softenCost} 소모`,
      tiltLeftAria: p => `길게 눌러 왼쪽으로 기울이기, 초당 에너지 ${p.tiltEnergyPerSecond} 소모`,
      tiltRightAria: p => `길게 눌러 오른쪽으로 기울이기, 초당 에너지 ${p.tiltEnergyPerSecond} 소모`,
      mergeEnergy: p => `합성 +${p.energyPerMerge}`,
    },
  });

  function normalizeDifficulty(value) {
    const id = String(value || '').trim().toLowerCase();
    return PROFILE_ORDER.includes(id) ? id : null;
  }

  function resolveDifficulty() {
    const queryValue = normalizeDifficulty(new URLSearchParams(location.search).get('difficulty'));
    if (queryValue) return queryValue;
    try {
      const saved = normalizeDifficulty(localStorage.getItem(STORAGE_KEY));
      if (saved) return saved;
    } catch (_) {}
    return DEFAULT_DIFFICULTY;
  }

  function localeCopy() {
    const locale = window.MelonI18n?.locale || document.documentElement.lang || 'zh-CN';
    return COPY[locale] || COPY['zh-CN'];
  }

  const difficultyId = resolveDifficulty();
  const profile = PROFILES[difficultyId];
  const BaseMelonGame = window.MelonGame;

  class DifficultyMelonGame extends BaseMelonGame {
    constructor(options = {}) {
      super({ ...profile, ...options });
      this.difficultyId = difficultyId;
      if (Number.isFinite(options.seed) && this.initialSeed !== (options.seed >>> 0)) this.reset(options.seed);
    }

    reset(seed = this.initialSeed) {
      super.reset(seed);
      const initialEnergy = Number(this.options.initialEnergy);
      this.state.energy = Math.max(0, Math.min(100, Number.isFinite(initialEnergy) ? initialEnergy : 60));
    }

    placeInitialFruit() {
      const layout = Array.isArray(this.options.initialLayout) ? this.options.initialLayout : null;
      if (!layout) return super.placeInitialFruit();
      const availableWidth = this.options.right - this.options.left;
      for (const [level, fraction] of layout) {
        const radius = this.options.radii[level];
        this.world.add(level, this.options.left + availableWidth * fraction, this.options.floor - radius - 1, radius);
        this.state.highestLevel = Math.max(this.state.highestLevel, level);
      }
    }
  }

  window.MelonGame = DifficultyMelonGame;

  function updateDifficultyCopy() {
    const copy = localeCopy();
    const root = document.getElementById('difficulty-control');
    if (!root) return;
    root.querySelector('.difficulty-label').textContent = copy.label;
    root.setAttribute('aria-label', copy.choose);
    root.querySelectorAll('[data-difficulty]').forEach(button => {
      const id = button.dataset.difficulty;
      button.textContent = copy[id];
      button.title = copy.restart;
      button.setAttribute('aria-label', `${copy[id]}. ${copy.restart}`);
    });
    root.querySelector('.difficulty-detail').textContent = copy[`${difficultyId}Detail`];

    const softenRule = document.querySelector('#help-dialog .help-rules li:nth-child(3) p');
    const dangerRule = document.querySelector('#help-dialog .help-rules li:nth-child(4) p');
    if (softenRule) softenRule.textContent = copy.soften(profile);
    if (dangerRule) dangerRule.textContent = copy.danger(profile);

    const softenButton = document.getElementById('soften-button');
    const tiltLeft = document.getElementById('tilt-left');
    const tiltRight = document.getElementById('tilt-right');
    const energyExplain = document.querySelector('.energy-explain');
    if (softenButton) softenButton.setAttribute('aria-label', copy.softenAria(profile));
    if (tiltLeft) tiltLeft.setAttribute('aria-label', copy.tiltLeftAria(profile));
    if (tiltRight) tiltRight.setAttribute('aria-label', copy.tiltRightAria(profile));
    if (energyExplain) energyExplain.textContent = copy.mergeEnergy(profile);
  }

  function selectDifficulty(id) {
    const nextId = normalizeDifficulty(id);
    if (!nextId || nextId === difficultyId) return;
    try { localStorage.setItem(STORAGE_KEY, nextId); } catch (_) {}
    const url = new URL(location.href);
    url.searchParams.set('difficulty', nextId);
    location.assign(url.toString());
  }

  function createDifficultyControl() {
    const mount = document.querySelector('.action-panel');
    if (!mount || document.getElementById('difficulty-control')) return;
    const root = document.createElement('section');
    root.id = 'difficulty-control';
    root.className = 'difficulty-control';
    root.setAttribute('role', 'group');

    const heading = document.createElement('div');
    heading.className = 'difficulty-heading';
    const label = document.createElement('span');
    label.className = 'difficulty-label';
    const detail = document.createElement('small');
    detail.className = 'difficulty-detail';
    heading.append(label, detail);

    const options = document.createElement('div');
    options.className = 'difficulty-options';
    for (const id of PROFILE_ORDER) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.difficulty = id;
      button.className = 'difficulty-option';
      button.setAttribute('aria-pressed', String(id === difficultyId));
      button.addEventListener('click', () => selectDifficulty(id));
      options.append(button);
    }

    root.append(heading, options);
    mount.prepend(root);
    document.body.dataset.difficulty = difficultyId;
    updateDifficultyCopy();
  }

  window.MelonDifficulty = Object.freeze({
    id: difficultyId,
    profile,
    profiles: PROFILES,
  });

  createDifficultyControl();
  document.addEventListener('melon:localechange', updateDifficultyCopy);
})();
