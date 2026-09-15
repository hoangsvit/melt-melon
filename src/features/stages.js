(function () {
  'use strict';

  const STORAGE_KEY = 'melt-melon.stages.v1';
  const MODE_STAGE = 'stage';
  const FINAL_LEVEL = window.MelonFruitCatalog?.finalLevel ?? 10;
  const TOTAL_STAGES = 20;
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
    { id: 13, targetLevel: 8, dropLimit: 32 },
    { id: 14, score: 135, merges: 20, dropLimit: 34 },
    { id: 15, targetLevel: 9, dropLimit: 38 },
    { id: 16, score: 180, dropLimit: 38 },
    { id: 17, merges: 28, dropLimit: 42 },
    { id: 18, targetLevel: 10, dropLimit: 46 },
    { id: 19, score: 260, merges: 30, dropLimit: 48 },
    { id: 20, score: 320, targetLevel: 10, dropLimit: 55 },
  ]);

  const COPY = Object.freeze({
    'zh-CN': {
      endless: '无尽', stages: '关卡', stage: n => `第 ${n} 关`, stageOf: n => `第 ${n} / ${TOTAL_STAGES} 关`, locked: n => `🔒 第 ${n} 关`,
      score: n => `达到 ${n} 分`, merges: n => `合成 ${n} 次`, fruit: name => `合成 ${name}`, drops: n => `剩余 ${n} 次投放`,
      complete: '关卡完成', failed: '挑战失败', next: '下一关', retry: '再试一次', endlessAfter: '进入无尽模式',
      completeCopy: '做得漂亮，下一关已经解锁。', finalCopy: '20 关全部完成！现在可以继续挑战无尽模式。',
      failDrops: '投放次数用完了。再试一次，尽量让每颗水果都发挥作用。', failOverflow: '水果越过危险线了。重新安排大水果的位置再试一次。',
      modeLabel: '游戏模式', goalLabel: '本关目标', selectLabel: '选择关卡',
    },
    en: {
      endless: 'Endless', stages: 'Levels', stage: n => `Level ${n}`, stageOf: n => `Level ${n} / ${TOTAL_STAGES}`, locked: n => `🔒 Level ${n}`,
      score: n => `Reach ${n} points`, merges: n => `Make ${n} merges`, fruit: name => `Create ${name}`, drops: n => `${n} drops left`,
      complete: 'Level complete', failed: 'Challenge failed', next: 'Next level', retry: 'Try again', endlessAfter: 'Play Endless',
      completeCopy: 'Nice work. The next level is now unlocked.', finalCopy: 'All 20 levels cleared. Endless mode is ready when you are.',
      failDrops: 'You ran out of drops. Try to make every fruit count.', failOverflow: 'The fruit crossed the danger line. Rebuild with more breathing room.',
      modeLabel: 'Game mode', goalLabel: 'Level goal', selectLabel: 'Choose level',
    },
    vi: {
      endless: 'Vô tận', stages: 'Màn chơi', stage: n => `Màn ${n}`, stageOf: n => `Màn ${n} / ${TOTAL_STAGES}`, locked: n => `🔒 Màn ${n}`,
      score: n => `Đạt ${n} điểm`, merges: n => `Ghép ${n} lần`, fruit: name => `Tạo ${name}`, drops: n => `Còn ${n} lượt thả`,
      complete: 'Hoàn thành màn', failed: 'Chưa qua màn', next: 'Màn tiếp theo', retry: 'Thử lại', endlessAfter: 'Chơi Vô tận',
      completeCopy: 'Tốt lắm! Màn tiếp theo đã được mở khóa.', finalCopy: 'Bạn đã hoàn thành cả 20 màn. Có thể tiếp tục chinh phục chế độ Vô tận.',
      failDrops: 'Bạn đã dùng hết lượt thả. Hãy cố tận dụng mỗi trái để tạo nhiều lần ghép hơn.', failOverflow: 'Trái cây đã vượt vạch nguy hiểm. Hãy chừa thêm khoảng trống rồi thử lại.',
      modeLabel: 'Chế độ chơi', goalLabel: 'Mục tiêu màn', selectLabel: 'Chọn màn',
    },
    ja: {
      endless: 'エンドレス', stages: 'ステージ', stage: n => `ステージ ${n}`, stageOf: n => `ステージ ${n} / ${TOTAL_STAGES}`, locked: n => `🔒 ステージ ${n}`,
      score: n => `${n}点に到達`, merges: n => `${n}回合成`, fruit: name => `${name}を作る`, drops: n => `残り ${n} 回`,
      complete: 'ステージクリア', failed: 'チャレンジ失敗', next: '次のステージ', retry: 'もう一度', endlessAfter: 'エンドレスへ',
      completeCopy: 'クリア！次のステージが解放されました。', finalCopy: '全20ステージクリア！このままエンドレスにも挑戦できます。',
      failDrops: '残り回数を使い切りました。1個ずつ大事に置いて再挑戦しましょう。', failOverflow: 'フルーツが危険ラインを越えました。大きいフルーツの置き場所を見直してみましょう。',
      modeLabel: 'ゲームモード', goalLabel: 'ステージ目標', selectLabel: 'ステージ選択',
    },
    ko: {
      endless: '무한', stages: '스테이지', stage: n => `스테이지 ${n}`, stageOf: n => `스테이지 ${n} / ${TOTAL_STAGES}`, locked: n => `🔒 스테이지 ${n}`,
      score: n => `${n}점 달성`, merges: n => `${n}회 합성`, fruit: name => `${name} 만들기`, drops: n => `남은 드롭 ${n}회`,
      complete: '스테이지 완료', failed: '도전 실패', next: '다음 스테이지', retry: '다시 도전', endlessAfter: '무한 모드',
      completeCopy: '좋아요! 다음 스테이지가 열렸습니다.', finalCopy: '20개 스테이지를 모두 완료했습니다. 이제 무한 모드에도 도전해 보세요.',
      failDrops: '드롭 기회를 모두 사용했습니다. 과일 하나하나를 더 효율적으로 합쳐 보세요.', failOverflow: '과일이 위험선을 넘었습니다. 큰 과일의 위치를 다시 잡아 보세요.',
      modeLabel: '게임 모드', goalLabel: '스테이지 목표', selectLabel: '스테이지 선택',
    },
  });

  function localeCopy() {
    const locale = window.MelonI18n?.locale || document.documentElement.lang || 'zh-CN';
    return COPY[locale] || COPY['zh-CN'];
  }

  function loadProgress() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      const completed = Array.isArray(parsed.completed) ? parsed.completed.filter(Number.isInteger) : [];
      return {
        unlocked: Math.max(1, Math.min(TOTAL_STAGES, Number(parsed.unlocked) || 1)),
        lastStage: Math.max(1, Math.min(TOTAL_STAGES, Number(parsed.lastStage) || 1)),
        completed,
      };
    } catch (_) {
      return { unlocked: 1, lastStage: 1, completed: [] };
    }
  }

  const progress = loadProgress();
  const query = new URLSearchParams(location.search);
  const mode = query.get('mode') === MODE_STAGE ? MODE_STAGE : 'endless';
  const requestedStage = Math.max(1, Math.min(TOTAL_STAGES, Number(query.get('stage')) || progress.lastStage || 1));
  const stageId = mode === MODE_STAGE ? Math.min(requestedStage, progress.unlocked) : null;
  const activeStage = stageId ? STAGES[stageId - 1] : null;
  const runtime = { game: null, status: null, root: null };

  function saveProgress() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); } catch (_) {}
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

  function finishStage(game) {
    const status = game.stageStatus;
    if (!status || status.complete || status.failed) return;
    status.complete = true;
    status.reason = 'complete';
    progress.completed = Array.from(new Set([...progress.completed, activeStage.id])).sort((a, b) => a - b);
    progress.unlocked = Math.max(progress.unlocked, Math.min(TOTAL_STAGES, activeStage.id + 1));
    progress.lastStage = Math.min(TOTAL_STAGES, activeStage.id + 1);
    saveProgress();
    game.state.isOver = true;
    game.state.tilt = 0;
    game.events.push({ type: 'game-over', time: game.state.time, score: game.state.score, stageComplete: true, stage: activeStage.id });
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
        this.stageStatus = { highestMergedLevel: 0, complete: false, failed: false, reason: null, outOfDropsAt: null };
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
          runtime.status = this.stageStatus;
          renderStageUi();
        }
      }

      emit(type, details = {}) {
        super.emit(type, details);
        if (!this.stageStatus || this.stageStatus.complete || this.stageStatus.failed) return;
        if (type === 'merge') this.stageStatus.highestMergedLevel = Math.max(this.stageStatus.highestMergedLevel, Number(details.level) || 0);
        if (type === 'drop' && activeStage.dropLimit && this.state.dropCount >= activeStage.dropLimit) this.stageStatus.outOfDropsAt = this.state.time;
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
      url.searchParams.set('mode', MODE_STAGE);
      url.searchParams.set('stage', String(params.stage));
      progress.lastStage = params.stage;
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
        <button type="button" data-game-mode="endless"></button>
        <button type="button" data-game-mode="stage"></button>
      </div>
      <div class="stage-detail">
        <div class="stage-heading"><strong class="stage-number"></strong><select class="stage-select"></select></div>
        <span class="stage-goal-label"></span>
        <p class="stage-goal"></p>
        <div class="stage-progress-row"><progress class="stage-progress" max="100" value="0"></progress><small class="stage-drops"></small></div>
      </div>`;
    scoreStrip.insertAdjacentElement('afterend', root);
    runtime.root = root;

    root.querySelector('[data-game-mode="endless"]').addEventListener('click', () => go({ mode: 'endless' }));
    root.querySelector('[data-game-mode="stage"]').addEventListener('click', () => go({ mode: MODE_STAGE, stage: progress.lastStage || progress.unlocked }));
    root.querySelector('.stage-select').addEventListener('change', event => go({ mode: MODE_STAGE, stage: Number(event.target.value) }));
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
    root.querySelector('.stage-goal-label').textContent = copy.goalLabel;
    root.querySelector('.stage-goal').textContent = goalParts(activeStage).join(' · ');

    const select = root.querySelector('.stage-select');
    select.setAttribute('aria-label', copy.selectLabel);
    const selected = String(activeStage.id);
    const previousValue = select.value;
    select.replaceChildren(...STAGES.map(stage => {
      const option = document.createElement('option');
      option.value = String(stage.id);
      const unlocked = stage.id <= progress.unlocked;
      option.disabled = !unlocked;
      option.textContent = unlocked ? copy.stage(stage.id) : copy.locked(stage.id);
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

  function rewriteResult() {
    if (!activeStage || !runtime.status) return;
    const dialog = document.getElementById('result-dialog');
    if (!dialog?.open) return;
    const copy = localeCopy();
    const primary = document.getElementById('result-primary');
    const secondary = document.getElementById('result-secondary');
    if (runtime.status.complete) {
      document.getElementById('result-kicker').textContent = copy.stageOf(activeStage.id);
      document.getElementById('result-title').textContent = copy.complete;
      document.getElementById('result-copy').textContent = activeStage.id === TOTAL_STAGES ? copy.finalCopy : copy.completeCopy;
      primary.textContent = activeStage.id === TOTAL_STAGES ? copy.endlessAfter : copy.next;
      secondary.hidden = true;
    } else if (runtime.status.failed) {
      document.getElementById('result-kicker').textContent = copy.stageOf(activeStage.id);
      document.getElementById('result-title').textContent = copy.failed;
      document.getElementById('result-copy').textContent = runtime.status.reason === 'drops' ? copy.failDrops : copy.failOverflow;
      primary.textContent = copy.retry;
      secondary.hidden = true;
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

  window.MelonStages = Object.freeze({ stages: STAGES, mode, activeStage, progress, total: TOTAL_STAGES });
})();
