(function () {
  'use strict';

  const STORAGE_KEY = 'melt-melon.stages.v1';
  const MODE_STAGE = 'stage';
  const FINAL_LEVEL = window.MelonFruitCatalog?.finalLevel ?? 10;
  const TOTAL_STAGES = 20;
  const MAX_STARS = TOTAL_STAGES * 3;
  const MAX_RANDOM_LEVEL = 4;
  const STAGES = Object.freeze([
    { id: 1, merges: 2, dropLimit: 8 },
    { id: 2, score: 8, dropLimit: 10 },
    { id: 3, targetLevel: 4, dropLimit: 14 },
    { id: 4, score: 18, merges: 5, dropLimit: 16 },
    { id: 5, targetLevel: 5, dropLimit: 18 },
    { id: 6, score: 35, dropLimit: 18 },
    { id: 7, merges: 10, dropLimit: 22 },
    { id: 8, targetLevel: 6, dropLimit: 24 },
    { id: 9, score: 60, merges: 12, dropLimit: 26 },
    { id: 10, targetLevel: 7, dropLimit: 28 },
    { id: 11, score: 90, dropLimit: 28 },
    { id: 12, merges: 18, dropLimit: 30 },
    { id: 13, targetLevel: 8, dropLimit: 42 },
    { id: 14, score: 135, merges: 20, dropLimit: 44 },
    { id: 15, score: 160, targetLevel: 8, dropLimit: 48 },
    { id: 16, score: 180, dropLimit: 46 },
    { id: 17, merges: 28, dropLimit: 52 },
    { id: 18, targetLevel: 9, dropLimit: 96 },
    { id: 19, score: 260, merges: 30, dropLimit: 64 },
    { id: 20, score: 320, targetLevel: 10, dropLimit: 180 },
  ]);

  function normalizeStageId(value, fallback = 1) {
    const number = Number(value);
    if (Number.isInteger(number) && number >= 1 && number <= TOTAL_STAGES) return number;
    const fallbackNumber = Number(fallback);
    return Number.isInteger(fallbackNumber) && fallbackNumber >= 1 && fallbackNumber <= TOTAL_STAGES ? fallbackNumber : 1;
  }

  function normalizeStars(value) {
    const number = Number(value);
    return Number.isInteger(number) ? Math.max(0, Math.min(3, number)) : 0;
  }

  function starThresholds(stage) {
    const two = Math.max(1, stage.dropLimit - 1);
    const three = Math.max(1, Math.min(two - 1, stage.dropLimit - Math.max(2, Math.ceil(stage.dropLimit * .1))));
    return { two, three };
  }

  function starGlyphs(value) {
    const stars = normalizeStars(value);
    return `${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}`;
  }

  function validateStageDefinitions(stages) {
    if (stages.length !== TOTAL_STAGES) throw new Error(`Expected ${TOTAL_STAGES} stages, received ${stages.length}`);
    const maxMaterialPerDrop = 2 ** MAX_RANDOM_LEVEL;
    stages.forEach((stage, index) => {
      if (stage.id !== index + 1) throw new Error(`Stage IDs must be sequential; expected ${index + 1}`);
      if (!Number.isInteger(stage.dropLimit) || stage.dropLimit <= 2) throw new Error(`Stage ${stage.id} requires an integer drop limit above 2`);
      if (stage.score !== undefined && (!Number.isInteger(stage.score) || stage.score <= 0)) throw new Error(`Stage ${stage.id} has an invalid score target`);
      if (stage.merges !== undefined && (!Number.isInteger(stage.merges) || stage.merges <= 0)) throw new Error(`Stage ${stage.id} has an invalid merge target`);
      if (stage.targetLevel !== undefined) {
        if (!Number.isInteger(stage.targetLevel) || stage.targetLevel < 1 || stage.targetLevel > FINAL_LEVEL) throw new Error(`Stage ${stage.id} has an invalid fruit target`);
        const requiredMaterial = 2 ** stage.targetLevel;
        const maximumDroppedMaterial = stage.dropLimit * maxMaterialPerDrop;
        if (maximumDroppedMaterial < requiredMaterial) throw new Error(`Stage ${stage.id} cannot reach fruit level ${stage.targetLevel} within ${stage.dropLimit} drops`);
      }
      const thresholds = starThresholds(stage);
      if (!(thresholds.three < thresholds.two && thresholds.two < stage.dropLimit)) throw new Error(`Stage ${stage.id} has invalid star thresholds`);
    });
    return true;
  }

  validateStageDefinitions(STAGES);

  const COPY = Object.freeze({
    'zh-CN': {
      endless: '无尽', stages: '关卡', stage: n => `第 ${n} 关`, stageOf: n => `第 ${n} / ${TOTAL_STAGES} 关`, locked: n => `🔒 第 ${n} 关`,
      score: n => `达到 ${n} 分`, merges: n => `合成 ${n} 次`, fruit: name => `合成 ${name}`, drops: n => `剩余 ${n} 次投放`,
      complete: '关卡完成', failed: '挑战失败', next: '下一关', retry: '再试一次', endlessAfter: '进入无尽模式',
      completeCopy: '做得漂亮，下一关已经解锁。', finalCopy: '20 关全部完成！现在可以继续挑战无尽模式。',
      failDrops: '投放次数用完了。再试一次，尽量让每颗水果都发挥作用。', failOverflow: '水果越过危险线了。重新安排大水果的位置再试一次。',
      modeLabel: '游戏模式', goalLabel: '本关目标', selectLabel: '选择关卡',
      totalStars: (n, max) => `星星 ${n} / ${max}`, bestStars: n => `最佳 ${n} / 3 星`, earnedStars: n => `本关获得 ${n} 星`,
      ratingGoal: (three, two) => `3★：${three} 次投放内 · 2★：${two} 次投放内`,
    },
    en: {
      endless: 'Endless', stages: 'Levels', stage: n => `Level ${n}`, stageOf: n => `Level ${n} / ${TOTAL_STAGES}`, locked: n => `🔒 Level ${n}`,
      score: n => `Reach ${n} points`, merges: n => `Make ${n} merges`, fruit: name => `Create ${name}`, drops: n => `${n} drops left`,
      complete: 'Level complete', failed: 'Challenge failed', next: 'Next level', retry: 'Try again', endlessAfter: 'Play Endless',
      completeCopy: 'Nice work. The next level is now unlocked.', finalCopy: 'All 20 levels cleared. Endless mode is ready when you are.',
      failDrops: 'You ran out of drops. Try to make every fruit count.', failOverflow: 'The fruit crossed the danger line. Rebuild with more breathing room.',
      modeLabel: 'Game mode', goalLabel: 'Level goal', selectLabel: 'Choose level',
      totalStars: (n, max) => `${n} / ${max} stars`, bestStars: n => `Best ${n} / 3 stars`, earnedStars: n => `Earned ${n} stars`,
      ratingGoal: (three, two) => `3★ ≤ ${three} drops · 2★ ≤ ${two} drops`,
    },
    vi: {
      endless: 'Vô tận', stages: 'Màn chơi', stage: n => `Màn ${n}`, stageOf: n => `Màn ${n} / ${TOTAL_STAGES}`, locked: n => `🔒 Màn ${n}`,
      score: n => `Đạt ${n} điểm`, merges: n => `Ghép ${n} lần`, fruit: name => `Tạo ${name}`, drops: n => `Còn ${n} lượt thả`,
      complete: 'Hoàn thành màn', failed: 'Chưa qua màn', next: 'Màn tiếp theo', retry: 'Thử lại', endlessAfter: 'Chơi Vô tận',
      completeCopy: 'Tốt lắm! Màn tiếp theo đã được mở khóa.', finalCopy: 'Bạn đã hoàn thành cả 20 màn. Có thể tiếp tục chinh phục chế độ Vô tận.',
      failDrops: 'Bạn đã dùng hết lượt thả. Hãy cố tận dụng mỗi trái để tạo nhiều lần ghép hơn.', failOverflow: 'Trái cây đã vượt vạch nguy hiểm. Hãy chừa thêm khoảng trống rồi thử lại.',
      modeLabel: 'Chế độ chơi', goalLabel: 'Mục tiêu màn', selectLabel: 'Chọn màn',
      totalStars: (n, max) => `Tổng sao ${n} / ${max}`, bestStars: n => `Kỷ lục ${n} / 3 sao`, earnedStars: n => `Nhận ${n} sao`,
      ratingGoal: (three, two) => `3★ ≤ ${three} lượt · 2★ ≤ ${two} lượt`,
    },
    ja: {
      endless: 'エンドレス', stages: 'ステージ', stage: n => `ステージ ${n}`, stageOf: n => `ステージ ${n} / ${TOTAL_STAGES}`, locked: n => `🔒 ステージ ${n}`,
      score: n => `${n}点に到達`, merges: n => `${n}回合成`, fruit: name => `${name}を作る`, drops: n => `残り ${n} 回`,
      complete: 'ステージクリア', failed: 'チャレンジ失敗', next: '次のステージ', retry: 'もう一度', endlessAfter: 'エンドレスへ',
      completeCopy: 'クリア！次のステージが解放されました。', finalCopy: '全20ステージクリア！このままエンドレスにも挑戦できます。',
      failDrops: '残り回数を使い切りました。1個ずつ大事に置いて再挑戦しましょう。', failOverflow: 'フルーツが危険ラインを越えました。大きいフルーツの置き場所を見直してみましょう。',
      modeLabel: 'ゲームモード', goalLabel: 'ステージ目標', selectLabel: 'ステージ選択',
      totalStars: (n, max) => `スター ${n} / ${max}`, bestStars: n => `ベスト ${n} / 3`, earnedStars: n => `${n}スター獲得`,
      ratingGoal: (three, two) => `3★：${three}回以内 · 2★：${two}回以内`,
    },
    ko: {
      endless: '무한', stages: '스테이지', stage: n => `스테이지 ${n}`, stageOf: n => `스테이지 ${n} / ${TOTAL_STAGES}`, locked: n => `🔒 스테이지 ${n}`,
      score: n => `${n}점 달성`, merges: n => `${n}회 합성`, fruit: name => `${name} 만들기`, drops: n => `남은 드롭 ${n}회`,
      complete: '스테이지 완료', failed: '도전 실패', next: '다음 스테이지', retry: '다시 도전', endlessAfter: '무한 모드',
      completeCopy: '좋아요! 다음 스테이지가 열렸습니다.', finalCopy: '20개 스테이지를 모두 완료했습니다. 이제 무한 모드에도 도전해 보세요.',
      failDrops: '드롭 기회를 모두 사용했습니다. 과일 하나하나를 더 효율적으로 합쳐 보세요.', failOverflow: '과일이 위험선을 넘었습니다. 큰 과일의 위치를 다시 잡아 보세요.',
      modeLabel: '게임 모드', goalLabel: '스테이지 목표', selectLabel: '스테이지 선택',
      totalStars: (n, max) => `별 ${n} / ${max}`, bestStars: n => `최고 ${n} / 3별`, earnedStars: n => `${n}별 획득`,
      ratingGoal: (three, two) => `3★ ${three}회 이내 · 2★ ${two}회 이내`,
    },
  });

  function localeCopy() {
    const locale = window.MelonI18n?.locale || document.documentElement.lang || 'zh-CN';
    return COPY[locale] || COPY['zh-CN'];
  }

  function loadProgress() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      const completed = Array.isArray(parsed.completed)
        ? Array.from(new Set(parsed.completed.filter(value => Number.isInteger(value) && value >= 1 && value <= TOTAL_STAGES))).sort((a, b) => a - b)
        : [];
      const stars = {};
      if (parsed.stars && typeof parsed.stars === 'object' && !Array.isArray(parsed.stars)) {
        for (const stageId of completed) stars[stageId] = normalizeStars(parsed.stars[stageId]);
      }
      for (const stageId of completed) stars[stageId] = Math.max(1, stars[stageId] || 0);
      const storedUnlocked = normalizeStageId(parsed.unlocked, 1);
      const completedUnlocked = completed.length ? Math.min(TOTAL_STAGES, completed[completed.length - 1] + 1) : 1;
      const unlocked = Math.max(storedUnlocked, completedUnlocked);
      const lastStage = Math.min(normalizeStageId(parsed.lastStage, 1), unlocked);
      return { unlocked, lastStage, completed, stars };
    } catch (_) {
      return { unlocked: 1, lastStage: 1, completed: [], stars: {} };
    }
  }

  const progress = loadProgress();
  const query = new URLSearchParams(location.search);
  const mode = query.get('mode') === MODE_STAGE ? MODE_STAGE : 'endless';
  const requestedStage = normalizeStageId(query.get('stage'), progress.lastStage);
  const stageId = mode === MODE_STAGE ? Math.min(requestedStage, progress.unlocked) : null;
  const activeStage = stageId ? STAGES[stageId - 1] : null;
  const runtime = { game: null, status: null, root: null };

  function saveProgress() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); } catch (_) {}
  }

  function totalStars() {
    return STAGES.reduce((sum, stage) => sum + normalizeStars(progress.stars?.[stage.id]), 0);
  }

  function translatedFruit(level) {
    const source = window.MelonFruitCatalog?.names?.[level] || '';
    return window.MelonI18n?.t ? window.MelonI18n.t(source) : source;
  }

  function goalParts(stage) {
    const copy = localeCopy();
    const parts = [];
    if (stage.score) parts.push(copy.score(stage.score));
    if (stage.merges) parts.push(copy.merges(stage.merges));
    if (Number.isInteger(stage.targetLevel)) parts.push(copy.fruit(translatedFruit(stage.targetLevel)));
    return parts;
  }

  function meetsGoals(stage, game, status) {
    if (stage.score && game.state.score < stage.score) return false;
    if (stage.merges && game.state.mergeCount < stage.merges) return false;
    if (Number.isInteger(stage.targetLevel) && status.highestMergedLevel < stage.targetLevel) return false;
    return true;
  }

  function progressRatio(stage, game, status) {
    const ratios = [];
    if (stage.score) ratios.push(Math.min(1, game.state.score / stage.score));
    if (stage.merges) ratios.push(Math.min(1, game.state.mergeCount / stage.merges));
    if (Number.isInteger(stage.targetLevel)) ratios.push(Math.min(1, status.highestMergedLevel / stage.targetLevel));
    if (!ratios.length) return 0;
    return ratios.reduce((sum, value) => sum + value, 0) / ratios.length;
  }

  function calculateStars(stage, game) {
    const usedDrops = Math.max(0, Number(game?.state?.dropCount) || 0);
    const thresholds = starThresholds(stage);
    if (usedDrops <= thresholds.three) return 3;
    if (usedDrops <= thresholds.two) return 2;
    return 1;
  }

  function finishStage(game) {
    const status = game.stageStatus;
    if (!status || status.complete || status.failed) return;
    status.complete = true;
    status.reason = 'complete';
    status.earnedStars = calculateStars(activeStage, game);
    const previousBest = normalizeStars(progress.stars[activeStage.id]);
    status.bestStars = Math.max(previousBest, status.earnedStars);
    progress.stars[activeStage.id] = status.bestStars;
    progress.completed = Array.from(new Set([...progress.completed, activeStage.id])).sort((a, b) => a - b);
    progress.unlocked = Math.max(progress.unlocked, Math.min(TOTAL_STAGES, activeStage.id + 1));
    progress.lastStage = Math.min(TOTAL_STAGES, activeStage.id + 1);
    saveProgress();
    game.state.isOver = true;
    game.state.tilt = 0;
    game.events.push({ type: 'game-over', time: game.state.time, score: game.state.score, stageComplete: true, stage: activeStage.id, stars: status.earnedStars, bestStars: status.bestStars });
    renderStageUi();
  }

  function failStage(game, reason) {
    const status = game.stageStatus;
    if (!status || status.complete || status.failed) return;
    status.failed = true;
    status.reason = reason;
    game.state.isOver = true;
    game.state.tilt = 0;
    game.events.push({ type: 'game-over', time: game.state.time, score: game.state.score, stageFailed: true, stage: activeStage.id, reason });
    renderStageUi();
  }

  if (activeStage && window.MelonGame) {
    const BaseMelonGame = window.MelonGame;
    class StageMelonGame extends BaseMelonGame {
      constructor(options = {}) {
        super(options);
        this.stageStatus = { highestMergedLevel: 0, complete: false, failed: false, reason: null, outOfDropsAt: null, earnedStars: 0, bestStars: normalizeStars(progress.stars[activeStage.id]) };
        runtime.game = this;
        runtime.status = this.stageStatus;
        renderStageUi();
      }

      reset(seed = this.initialSeed) {
        super.reset(seed);
        if (this.stageStatus) {
          this.stageStatus.highestMergedLevel = 0;
          this.stageStatus.complete = false;
          this.stageStatus.failed = false;
          this.stageStatus.reason = null;
          this.stageStatus.outOfDropsAt = null;
          this.stageStatus.earnedStars = 0;
          this.stageStatus.bestStars = normalizeStars(progress.stars[activeStage.id]);
          runtime.status = this.stageStatus;
          renderStageUi();
        }
      }

      drop() {
        if (!this.stageStatus || this.stageStatus.complete || this.stageStatus.failed) return false;
        if (activeStage.dropLimit && this.state.dropCount >= activeStage.dropLimit) return false;
        const dropped = super.drop();
        if (dropped && activeStage.dropLimit && this.state.dropCount >= activeStage.dropLimit && this.stageStatus.outOfDropsAt === null) {
          this.stageStatus.outOfDropsAt = this.state.time;
          renderStageUi();
        }
        return dropped;
      }

      emit(type, details = {}) {
        super.emit(type, details);
        if (!this.stageStatus || this.stageStatus.complete || this.stageStatus.failed) return;
        if (type === 'merge') this.stageStatus.highestMergedLevel = Math.max(this.stageStatus.highestMergedLevel, Number(details.level) || 0);
        if (type === 'game-over') {
          this.stageStatus.failed = true;
          this.stageStatus.reason = 'overflow';
          renderStageUi();
          return;
        }
        const waitingForWatermelonEvent = activeStage.targetLevel === FINAL_LEVEL && type !== 'watermelon';
        if (!waitingForWatermelonEvent && meetsGoals(activeStage, this, this.stageStatus)) finishStage(this);
        renderStageUi();
      }

      stepLogic() {
        super.stepLogic();
        if (!this.stageStatus || this.state.isOver || this.stageStatus.complete || this.stageStatus.failed) return;
        if (activeStage.dropLimit && this.state.dropCount >= activeStage.dropLimit && this.stageStatus.outOfDropsAt !== null) {
          const graceElapsed = this.state.time - this.stageStatus.outOfDropsAt >= 4;
          if (graceElapsed && this.pendingMerges.length === 0) failStage(this, 'drops');
        }
      }
    }
    window.MelonGame = StageMelonGame;
  }

  function go(params) {
    const url = new URL(location.href);
    if (params.mode === 'endless') {
      url.searchParams.delete('mode');
      url.searchParams.delete('stage');
    } else {
      const nextStage = Math.min(normalizeStageId(params.stage, progress.lastStage), progress.unlocked);
      url.searchParams.set('mode', MODE_STAGE);
      url.searchParams.set('stage', String(nextStage));
      progress.lastStage = nextStage;
      saveProgress();
    }
    location.assign(url.toString());
  }

  function createStageUi() {
    const playColumn = document.querySelector('.play-column');
    const scoreStrip = document.querySelector('.score-strip');
    if (!playColumn || !scoreStrip || document.getElementById('stage-control')) return;

    const root = document.createElement('section');
    root.id = 'stage-control';
    root.className = 'stage-control';
    root.innerHTML = `
      <div class="stage-mode" role="group">
        <span class="stage-mode-label"></span>
        <span class="stage-stars-total"></span>
        <button type="button" data-game-mode="endless"></button>
        <button type="button" data-game-mode="stage"></button>
      </div>
      <div class="stage-detail">
        <div class="stage-heading"><div class="stage-title"><strong class="stage-number"></strong><span class="stage-best-stars"></span></div><select class="stage-select"></select></div>
        <span class="stage-goal-label"></span>
        <p class="stage-goal"></p>
        <p class="stage-star-goals"></p>
        <div class="stage-progress-row"><progress class="stage-progress" max="100" value="0"></progress><small class="stage-drops"></small></div>
      </div>`;
    scoreStrip.insertAdjacentElement('afterend', root);
    runtime.root = root;

    root.querySelector('[data-game-mode="endless"]').addEventListener('click', () => go({ mode: 'endless' }));
    root.querySelector('[data-game-mode="stage"]').addEventListener('click', () => go({ mode: MODE_STAGE, stage: progress.lastStage || progress.unlocked }));
    root.querySelector('.stage-select').addEventListener('change', event => go({ mode: MODE_STAGE, stage: event.target.value }));
    renderStageUi();
  }

  function renderStageUi() {
    const root = runtime.root || document.getElementById('stage-control');
    if (!root) return;
    runtime.root = root;
    const copy = localeCopy();
    document.body.dataset.gameMode = mode;
    if (activeStage) document.body.dataset.stage = String(activeStage.id); else delete document.body.dataset.stage;

    root.querySelector('.stage-mode-label').textContent = copy.modeLabel;
    const starsTotal = root.querySelector('.stage-stars-total');
    const collectedStars = totalStars();
    starsTotal.textContent = `★ ${collectedStars} / ${MAX_STARS}`;
    starsTotal.title = copy.totalStars(collectedStars, MAX_STARS);
    starsTotal.setAttribute('aria-label', copy.totalStars(collectedStars, MAX_STARS));

    const endlessButton = root.querySelector('[data-game-mode="endless"]');
    const stageButton = root.querySelector('[data-game-mode="stage"]');
    endlessButton.textContent = copy.endless;
    stageButton.textContent = copy.stages;
    endlessButton.setAttribute('aria-pressed', String(mode !== MODE_STAGE));
    stageButton.setAttribute('aria-pressed', String(mode === MODE_STAGE));

    const detail = root.querySelector('.stage-detail');
    detail.hidden = mode !== MODE_STAGE || !activeStage;
    if (detail.hidden) return;

    root.querySelector('.stage-number').textContent = copy.stageOf(activeStage.id);
    const stageBest = normalizeStars(progress.stars[activeStage.id]);
    const bestStars = root.querySelector('.stage-best-stars');
    bestStars.textContent = starGlyphs(stageBest);
    bestStars.title = copy.bestStars(stageBest);
    bestStars.setAttribute('aria-label', copy.bestStars(stageBest));
    root.querySelector('.stage-goal-label').textContent = copy.goalLabel;
    root.querySelector('.stage-goal').textContent = goalParts(activeStage).join(' · ');
    const thresholds = starThresholds(activeStage);
    root.querySelector('.stage-star-goals').textContent = copy.ratingGoal(thresholds.three, thresholds.two);

    const select = root.querySelector('.stage-select');
    select.setAttribute('aria-label', copy.selectLabel);
    const selected = String(activeStage.id);
    const previousValue = select.value;
    select.replaceChildren(...STAGES.map(stage => {
      const option = document.createElement('option');
      option.value = String(stage.id);
      const unlocked = stage.id <= progress.unlocked;
      option.disabled = !unlocked;
      const savedStars = normalizeStars(progress.stars[stage.id]);
      option.textContent = unlocked ? `${copy.stage(stage.id)}${savedStars ? ` ${starGlyphs(savedStars)}` : ''}` : copy.locked(stage.id);
      return option;
    }));
    select.value = selected || previousValue;

    const status = runtime.status;
    const game = runtime.game;
    const ratio = game && status ? progressRatio(activeStage, game, status) : 0;
    root.querySelector('.stage-progress').value = Math.round(ratio * 100);
    const usedDrops = game?.state?.dropCount || 0;
    root.querySelector('.stage-drops').textContent = activeStage.dropLimit ? copy.drops(Math.max(0, activeStage.dropLimit - usedDrops)) : '';
  }

  function ensureResultStars() {
    const dialog = document.getElementById('result-dialog');
    if (!dialog) return null;
    let node = document.getElementById('stage-result-stars');
    if (node) return node;
    node = document.createElement('div');
    node.id = 'stage-result-stars';
    node.className = 'stage-result-stars';
    const icons = document.createElement('strong');
    icons.className = 'stage-result-star-icons';
    const summary = document.createElement('small');
    summary.className = 'stage-result-star-summary';
    node.append(icons, summary);
    document.getElementById('result-title')?.insertAdjacentElement('afterend', node);
    return node;
  }

  function rewriteResult() {
    if (!activeStage || !runtime.status) return;
    const dialog = document.getElementById('result-dialog');
    if (!dialog?.open) return;
    const copy = localeCopy();
    const primary = document.getElementById('result-primary');
    const secondary = document.getElementById('result-secondary');
    const resultStars = ensureResultStars();
    if (runtime.status.complete) {
      document.getElementById('result-kicker').textContent = copy.stageOf(activeStage.id);
      document.getElementById('result-title').textContent = copy.complete;
      document.getElementById('result-copy').textContent = activeStage.id === TOTAL_STAGES ? copy.finalCopy : copy.completeCopy;
      primary.textContent = activeStage.id === TOTAL_STAGES ? copy.endlessAfter : copy.next;
      secondary.hidden = true;
      if (resultStars) {
        resultStars.hidden = false;
        resultStars.querySelector('.stage-result-star-icons').textContent = starGlyphs(runtime.status.earnedStars);
        resultStars.querySelector('.stage-result-star-summary').textContent = `${copy.earnedStars(runtime.status.earnedStars)} · ${copy.bestStars(runtime.status.bestStars)} · ${copy.totalStars(totalStars(), MAX_STARS)}`;
      }
    } else if (runtime.status.failed) {
      document.getElementById('result-kicker').textContent = copy.stageOf(activeStage.id);
      document.getElementById('result-title').textContent = copy.failed;
      document.getElementById('result-copy').textContent = runtime.status.reason === 'drops' ? copy.failDrops : copy.failOverflow;
      primary.textContent = copy.retry;
      secondary.hidden = true;
      if (resultStars) resultStars.hidden = true;
    }
  }

  createStageUi();
  const resultDialog = document.getElementById('result-dialog');
  if (resultDialog) new MutationObserver(rewriteResult).observe(resultDialog, { attributes: true, attributeFilter: ['open'] });

  document.addEventListener('click', event => {
    if (!activeStage || event.target?.id !== 'result-primary' || !runtime.status?.complete) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (activeStage.id >= TOTAL_STAGES) go({ mode: 'endless' });
    else go({ mode: MODE_STAGE, stage: activeStage.id + 1 });
  }, true);

  document.addEventListener('melon:localechange', () => {
    renderStageUi();
    rewriteResult();
  });

  window.MelonStages = Object.freeze({
    stages: STAGES,
    mode,
    activeStage,
    progress,
    total: TOTAL_STAGES,
    maxStars: MAX_STARS,
    definitionsValidated: true,
    starThresholds,
    starsForStage: id => normalizeStars(progress.stars[normalizeStageId(id)]),
    totalStars,
  });
})();
