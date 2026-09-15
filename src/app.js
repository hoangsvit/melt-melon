(function () {
  'use strict';
  const { names: FRUIT_NAMES, colors: FRUIT_COLORS, finalLevel: FINAL_LEVEL, logoLevel: LOGO_LEVEL } = MelonFruitCatalog;
  const STORAGE_KEY = 'soft-melon-club-v6';
  const byId = id => document.getElementById(id);
  const query = new URLSearchParams(location.search);
  const isQa = query.has('qa');
  let saved = {};
  try {
    const currentSettings = localStorage.getItem(STORAGE_KEY);
    saved = currentSettings ? JSON.parse(currentSettings) : { ...JSON.parse(localStorage.getItem('soft-melon-club-v3') || '{}'), best: 0 };
  } catch (_) { /* Local storage may be unavailable for an offline file. */ }
  let bestScore = Number(saved.best) || 0;
  let isSoundEnabled = saved.sound === true;
  let reducedMotion = typeof saved.reduced === 'boolean' ? saved.reduced : matchMedia('(prefers-reduced-motion: reduce)').matches;
  let tutorialStage = saved.learned ? 'complete' : 'drop';
  let activeDialog = null, wasPausedBeforeModal = false, lessonIsOnboarding = false;
  let visualTime = 0, previousTime = null, previousDrawTime = -Infinity, nextDrawTime = 0, lastHudTime = 0;
  let heldTilt = 0, pendingLessonTime = null, pendingWinTime = null, transientMessage = '', transientUntil = 0;
  let qaAutoplay = false, qaNextDropAt = 0;
  let lastNextLevel = -1, lastHighestLevel = -1, hasLoadedArt = false, isStressScene = false;
  const frameIntervals = [], frameCosts = [], simulationCosts = [], drawingCosts = [], eventHistory = [];
  const particles = [], floatingScores = [];
  const feedback = new MelonFeedback();
  let lastImpactAudioTime = -Infinity;
  let lastInputTime = null, lastInputRenderDelayMs = null;

  const canvas = byId('game');
  const context = canvas.getContext('2d', { alpha: true });
  const painter = new FruitPainter(window.MELON_ATLAS || 'fruit-atlas-final.png');
  const seed = Number(query.get('seed')) || (Date.now() >>> 0);
  const game = new MelonGame({ seed });
  const input = new MelonInput({ surface: canvas, game, onChange: () => { lastInputTime = performance.now(); updateHud(); } });
  let lesson = null;

  function savePreferences() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ best: bestScore, sound: isSoundEnabled, reduced: reducedMotion, learned: tutorialStage === 'complete' })); } catch (_) {}
  }

  function say(message) { byId('announcer').textContent = message; }
  function flashMessage(message, seconds = 1.7) { transientMessage = message; transientUntil = visualTime + seconds; }

  let audioContext = null, audioBus = null;
  function unlockSound() {
    if (!isSoundEnabled) return;
    const AudioConstructor = window.AudioContext || window.webkitAudioContext;
    if (!AudioConstructor) return;
    if (!audioContext) {
      audioContext = new AudioConstructor();
      const compressor = audioContext.createDynamicsCompressor();
      audioBus = audioContext.createGain(); audioBus.gain.value = .25;
      audioBus.connect(compressor); compressor.connect(audioContext.destination);
    }
    if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
  }

  function playSound(kind, level = 0, combo = 1) {
    if (!isSoundEnabled) return;
    unlockSound(); if (!audioContext || audioContext.state !== 'running') return;
    const now = audioContext.currentTime;
    const frequencies = kind === 'win' ? [261.63, 329.63, 392, 523.25] : kind === 'merge' ? [220 * 2 ** (level / 7), 330 * 2 ** (level / 7)] : kind === 'soften' ? [164.81, 196, 246.94] : [185];
    frequencies.forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator(), envelope = audioContext.createGain();
      const start = now + index * (kind === 'win' ? .095 : .04), duration = kind === 'drop' ? .08 : kind === 'merge' ? .16 : kind === 'soften' ? .24 : .32;
      const pitch = frequency * (kind === 'merge' ? 2 ** (Math.min(combo - 1, 4) * 2 / 12) : 1);
      oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(pitch * (kind === 'drop' || kind === 'merge' && index === 0 ? 1.65 : 1), start);
      oscillator.frequency.exponentialRampToValueAtTime(pitch * (kind === 'drop' || kind === 'merge' && index === 0 ? .6 : 1.008), start + duration);
      envelope.gain.setValueAtTime(.001, start); envelope.gain.exponentialRampToValueAtTime(kind === 'drop' ? .1 : .16 + Math.min(combo, 4) * .008, start + .012);
      envelope.gain.exponentialRampToValueAtTime(.001, start + duration);
      oscillator.connect(envelope); envelope.connect(audioBus); oscillator.start(start); oscillator.stop(start + duration + .02);
      oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
    });
  }

  function playImpactSound(event) {
    if (!isSoundEnabled || visualTime - lastImpactAudioTime < .08 || event.speed < 115) return;
    unlockSound(); if (!audioContext || audioContext.state !== 'running') return;
    lastImpactAudioTime = visualTime;
    const body = game.world.bodies.find(body => body.id === event.id);
    const radius = body?.r || 30, strength = Math.min(1, event.speed / 850);
    const now = audioContext.currentTime, oscillator = audioContext.createOscillator(), envelope = audioContext.createGain();
    const frequency = Math.max(95, 260 - radius * 1.3);
    oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(frequency * 1.8, now); oscillator.frequency.exponentialRampToValueAtTime(frequency * .7, now + .12);
    envelope.gain.setValueAtTime(.001, now); envelope.gain.exponentialRampToValueAtTime(.07 + strength * .13, now + .007); envelope.gain.exponentialRampToValueAtTime(.001, now + .16);
    oscillator.connect(envelope); envelope.connect(audioBus); oscillator.start(now); oscillator.stop(now + .18);
    oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
  }

  function setMotionPreference() {
    document.body.dataset.reduced = String(reducedMotion);
    byId('reduced-button').setAttribute('aria-pressed', String(reducedMotion));
    byId('reduced-button').textContent = reducedMotion ? '恢复完整动态' : '减少动态效果';
    if (lesson) lesson.reducedMotion = reducedMotion;
  }


  function startRound() {
    if (activeDialog) { byId(activeDialog).close(); activeDialog = null; }
    input.clear(); heldTilt = 0; frameIntervals.length = frameCosts.length = simulationCosts.length = drawingCosts.length = 0; particles.length = 0; floatingScores.length = 0; feedback.clear();
    pendingLessonTime = pendingWinTime = null; isStressScene = false; qaAutoplay = false; qaNextDropAt = 0;
    tutorialStage = saved.learned || tutorialStage === 'complete' ? 'complete' : 'drop';
    game.reset((Number(query.get('seed')) || Date.now()) >>> 0);
    eventHistory.length = 0;
    say('新的一局，先看看已有水果的位置。');
    game.takeEvents(); game.world.takeImpactEvents(); painter.clearCache();
    lastNextLevel = lastHighestLevel = -1; transientUntil = 0;
    if (!hasLoadedArt) game.setPaused(true);
    updateCoach(); updateHud(); previousTime = null;
  }

  function updateCoach() {
    const copy = byId('coach-copy'), badge = byId('coach-step');
    byId('coach').classList.toggle('is-complete', tutorialStage === 'complete');
    byId('skip-tutorial').hidden = tutorialStage === 'complete';
    if (tutorialStage === 'drop') { badge.textContent = '01'; copy.textContent = '左右移动，给第一颗水果选个落点。'; }
    else if (tutorialStage === 'merge') { badge.textContent = '02'; copy.textContent = '再放一颗也可以，相同水果碰到一起就会合成。'; }
    else if (tutorialStage === 'soften') { badge.textContent = '03'; copy.textContent = '合成了！接着，亲手试一次揉软。'; }
    else { badge.textContent = '↗'; copy.textContent = '先看下一颗，再给它留个位置。'; }
  }

  function finishTutorial() {
    tutorialStage = 'complete'; saved.learned = true; pendingLessonTime = null;
    savePreferences(); updateCoach();
  }

  function openModal(id) {
    input.clear(); heldTilt = 0;
    if (activeDialog) byId(activeDialog).close(); else wasPausedBeforeModal = game.state.isPaused;
    game.setPaused(true); activeDialog = id; byId(id).showModal(); updateHud();
    if (id === 'lesson-dialog') byId('lesson-soften').focus({ preventScroll: true });
    if (id === 'restart-dialog') byId(id).querySelector('[data-close]').focus({ preventScroll: true });
  }

  function closeModal() {
    if (!activeDialog) return;
    const closingId = activeDialog; activeDialog = null; byId(closingId).close();
    if (closingId === 'lesson-dialog') painter.clearCache();
    if (!wasPausedBeforeModal && !game.state.isOver) game.setPaused(false);
    previousTime = null; updateHud(); canvas.focus({ preventScroll: true });
  }

  function ensureLesson() {
    if (lesson) return;
    lesson = new SofteningLesson({ canvas: byId('lesson-canvas'), painter, reducedMotion,
      onStatus(snapshot) {
        byId('lesson-soften').disabled = !snapshot.canSoften;
        if (snapshot.isSoftened && !snapshot.isComplete) { byId('lesson-soften').textContent = '软乎乎地挤过去…'; byId('lesson-copy').textContent = '体积没消失，只是换了个形状。'; }
      },
      onComplete() {
        byId('lesson-title').textContent = '挤过去，合在一起了。';
        byId('lesson-copy').textContent = '下次小水果卡住时，就用这一招。';
        byId('lesson-soften').hidden = true; byId('lesson-continue').hidden = false; byId('lesson-retry').hidden = false;
        playSound('merge', 7); say('练习完成。揉软让水果穿过缝隙，并合成了蜜桃。');
      }
    });
  }

  function resetLesson() {
    ensureLesson(); lesson.reset(); painter.clearCache();
    byId('lesson-title').textContent = '差一点，就能碰到伙伴。';
    byId('lesson-copy').textContent = '点一下揉软，让上面的果肉挤过缝隙。';
    byId('lesson-soften').textContent = '揉软看看 ≋'; byId('lesson-soften').hidden = false;
    byId('lesson-soften').disabled = !lesson.canSoften;
    byId('lesson-continue').hidden = true; byId('lesson-retry').hidden = true;
  }

  function openLesson(isOnboarding = false) { lessonIsOnboarding = isOnboarding; resetLesson(); openModal('lesson-dialog'); }

  function showResult(isWin) {
    byId('result-kicker').textContent = isWin ? '这颗大西瓜，属于你' : game.state.score >= bestScore && game.state.score > 0 ? '达到自己的最高纪录' : '这一池，收获满满';
    byId('result-title').textContent = isWin ? '合出来了！' : '果池装满啦。';
    byId('result-score').textContent = game.state.score.toLocaleString('zh-CN');
    byId('result-copy').textContent = isWin ? '还可以继续冲分。西瓜会留在果池里，不会消除。' : `这一局合成了 ${game.state.mergeCount} 次。下次试着把大水果放在一侧，别把小水果埋在底下。`;
    byId('result-secondary').hidden = !isWin;
    byId('result-secondary').textContent = '继续挑战';
    byId('result-secondary').className = isWin ? 'primary-button' : 'secondary-button';
    byId('result-primary').className = isWin ? 'secondary-button' : 'primary-button';
    painter.drawIcon(byId('result-fruit'), isWin ? FINAL_LEVEL : Math.min(Math.max(game.state.highestLevel, 2), FINAL_LEVEL));
    openModal('result-dialog');
    if (isWin) byId('result-secondary').focus({ preventScroll: true });
  }

  function addMergeEffects(event) {
    const count = 0;
    for (let index = 0; index < count; index++) {
      const angle = index * 2.39996 + event.id * .17, speed = 28 + (index % 7) * 10;
      particles.push({ x: event.x, y: event.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 25, life: .55 + index % 4 * .1, age: 0, size: 1.2 + index % 3, color: FRUIT_COLORS[Math.min(event.level, FINAL_LEVEL)], kind: index % 5 });
    }
    while (particles.length > 100) particles.shift();
    floatingScores.push({ x: event.x, y: event.y - 15, points: event.points, combo: event.combo, age: 0 });
    while (floatingScores.length > 4) floatingScores.shift();
  }

  function processEvents() {
    for (const event of game.takeEvents()) {
      eventHistory.push({ type: event.type, time: Math.round(event.time * 100) / 100, level: event.level, points: event.points, speed: event.speed ? Math.round(event.speed) : undefined });
      if (eventHistory.length > 30) eventHistory.shift();
      feedback.add(event);
      if (event.type === 'impact') playImpactSound(event);
      if (event.type === 'drop') {
        playSound('drop');
        if (tutorialStage === 'drop' || tutorialStage === 'merge') { tutorialStage = 'merge'; updateCoach(); }
      }
      if (event.type === 'soften') { playSound('soften'); say('水果开始揉软，持续2.4秒。'); }
      if (event.type === 'merge') {
        painter.retainBodies(game.world.bodies);
        addMergeEffects(event); playSound('merge', Math.min(event.level, FINAL_LEVEL), event.combo);
        if (!reducedMotion) document.querySelectorAll('.fruit-step canvas')[Math.min(event.level, FINAL_LEVEL)]?.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.25)', offset: .3 }, { transform: 'scale(1)' }], { duration: 400, easing: 'ease-out' });
        if (!isQa && game.state.score > bestScore) { bestScore = game.state.score; savePreferences(); }
        say(`合成${FRUIT_NAMES[Math.min(event.level, FINAL_LEVEL)]}，获得${event.points}分。`);
        if (tutorialStage === 'drop' || tutorialStage === 'merge') {
          finishTutorial(); flashMessage('合成了！继续放，卡住时试试揉软。', 3);
        }
      }
      if (event.type === 'watermelon') { pendingWinTime = visualTime + 1; playSound('win'); }
      if (event.type === 'game-over') { pendingWinTime = null; showResult(false); say(`本局结束，得分${game.state.score}。`); }
    }
  }

  function currentHint() {
    if (!hasLoadedArt) return painter.assetError ? '水果图片未能载入，请重新打开文件。' : '图片准备中…';
    if (visualTime < transientUntil) return transientMessage;
    if (input.activePointerId !== null) return input.isInside ? '松手放下 · 拖出果池可取消' : '已移出果池，松手会取消';
    if (game.state.liquidRemainingSeconds > 0) return `软乎乎的 · 还剩 ${game.state.liquidRemainingSeconds.toFixed(1)} 秒`;
    return tutorialStage === 'drop' ? '左右移动 · 松手放下第一颗' : '左右移动 · 松手投放';
  }

  function updateHud() {
    const state = game.state;
    byId('score').textContent = state.score.toLocaleString('zh-CN'); byId('best').textContent = bestScore.toLocaleString('zh-CN');
    byId('combo').textContent = state.combo > 1 && state.time - state.lastMergeTime < 1.15 ? `连续合成 ${state.combo} 次` : '';
    for (const id of ['tilt-left', 'tilt-right']) byId(id).disabled = !hasLoadedArt || state.isPaused || state.isOver || state.energy < .2;
    byId('energy').value = state.energy; byId('energy-value').textContent = Math.floor(state.energy);
    const isSoftening = state.liquidRemainingSeconds > 0, canAfford = state.energy >= game.options.softenCost;
    byId('soften-button').disabled = !hasLoadedArt || state.isPaused || state.isOver || isSoftening || !canAfford;
    byId('soften-button').classList.toggle('is-active', isSoftening);
    byId('soften-label').textContent = isSoftening ? '软乎乎的…' : canAfford ? '揉软一下' : '再攒一点能量';
    byId('soften-detail').textContent = isSoftening ? `还有 ${state.liquidRemainingSeconds.toFixed(1)} 秒` : canAfford ? `挤进空隙 · 消耗 ${game.options.softenCost}` : `再合成 ${Math.ceil((game.options.softenCost - state.energy) / game.options.energyPerMerge)} 次就能用`;
    byId('board-message').textContent = currentHint();
    byId('pause-cover').hidden = !hasLoadedArt || !state.isPaused || Boolean(activeDialog);
    byId('pause-button').setAttribute('aria-label', state.isPaused ? '继续游戏' : '暂停游戏');
    byId('pause-button').querySelector('span').textContent = state.isPaused ? '继续' : '暂停';
    byId('danger-note').hidden = state.dangerSeconds < .15 || Boolean(activeDialog);
    byId('danger-count').textContent = Math.max(1, Math.ceil(game.options.overflowSeconds - state.dangerSeconds));
    byId('sound-button').setAttribute('aria-pressed', String(isSoundEnabled));
    byId('sound-button').setAttribute('aria-label', isSoundEnabled ? '关闭声音' : '开启声音');
    if (hasLoadedArt && lastNextLevel !== state.nextLevel) {
      lastNextLevel = state.nextLevel;
      for (const id of ['next-fruit', 'next-mobile']) { painter.drawIcon(byId(id), state.nextLevel); byId(id).setAttribute('aria-label', `下一颗水果：${FRUIT_NAMES[state.nextLevel]}`); }
      byId('next-name').textContent = FRUIT_NAMES[state.nextLevel];
    }
    if (lastHighestLevel !== state.highestLevel) {
      lastHighestLevel = state.highestLevel;
      document.querySelectorAll('.fruit-step').forEach((button, index) => button.classList.toggle('is-latest', index === lastHighestLevel));
    }
  }

  function glassPath(ctx) {
    ctx.beginPath(); ctx.moveTo(35, 111); ctx.lineTo(29, 111); ctx.quadraticCurveTo(20, 111, 20, 122); ctx.lineTo(20, 582);
    ctx.quadraticCurveTo(20, 625, 61, 625); ctx.lineTo(399, 625); ctx.quadraticCurveTo(440, 625, 440, 583);
    ctx.lineTo(440, 122); ctx.quadraticCurveTo(440, 111, 430, 111); ctx.lineTo(425, 111);
  }

  function predictContactY(x, radius) {
    let centerY = game.options.floor - radius;
    for (const body of game.world.bodies) for (const point of body.points) {
      const dx = x - point.x;
      if (Math.abs(dx) <= radius) centerY = Math.min(centerY, point.y - Math.sqrt(Math.max(0, radius * radius - dx * dx)));
    }
    return Math.max(game.options.spawnY + radius * 2, centerY);
  }

  function drawMain() {
    const state = game.state, scale = canvas.width / 460;
    context.setTransform(scale, 0, 0, scale, 0, 0); context.clearRect(0, 0, 460, 640);
    glassPath(context); context.lineCap = 'round'; context.lineJoin = 'round'; context.strokeStyle = '#b4c59b'; context.lineWidth = 10; context.stroke();
    context.strokeStyle = '#faffed'; context.lineWidth = 6; context.stroke(); context.strokeStyle = '#d9e5c5'; context.lineWidth = 1.1; context.stroke();
    context.save(); context.setLineDash([6, 7]); context.lineWidth = 1.2; context.strokeStyle = state.dangerSeconds > 0 ? '#db7767' : '#c48e7547';
    context.beginPath(); context.moveTo(36, game.options.warningY); context.lineTo(424, game.options.warningY); context.stroke(); context.restore();
    context.font = '8px "PingFang SC", sans-serif'; context.fillStyle = '#9cae8966'; context.fillText('留点空隙', 41, game.options.warningY - 9);
    for (let tick = 0; tick < 6; tick++) {
      const y = 199 + tick * 62; context.strokeStyle = '#b5c7a13b'; context.lineWidth = .7; context.beginPath(); context.moveTo(33, y); context.lineTo(39, y); context.stroke();
    }
    if (!state.isOver && !isStressScene) {
      const radius = game.options.radii[state.currentLevel], ghostY = predictContactY(state.aimX, radius);
      context.save(); context.globalAlpha = state.isPaused ? .3 : 1;
      context.setLineDash([3, 7]); context.strokeStyle = '#a3b57c88'; context.lineWidth = 1;
      context.beginPath(); context.moveTo(state.aimX, 67 + radius); context.lineTo(state.aimX, ghostY - radius); context.stroke();
      context.setLineDash([3, 4]); context.strokeStyle = '#879f5a66'; context.beginPath(); context.arc(state.aimX, ghostY, radius, 0, Math.PI * 2); context.stroke();
      context.setLineDash([]); context.fillStyle = '#a7bc7710'; context.fill();
      painter.drawAt(context, state.currentLevel, state.aimX, game.options.spawnY, radius, { time: visualTime, reducedMotion, aimX: state.aimX, alpha: state.cooldownSeconds > 0 ? .6 : 1 });
      if (state.cooldownSeconds > 0) { context.strokeStyle = '#9eaf6c'; context.lineWidth = 1.5; context.beginPath(); context.arc(state.aimX, game.options.spawnY, radius + 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - state.cooldownSeconds / game.options.dropCooldownSeconds)); context.stroke(); }
      context.restore();
    }
    feedback.draw(context, game.world.bodies, { reducedMotion, layer: 'under' });
    for (const body of game.world.bodies) painter.paint(context, body, { time: visualTime, liquid: state.liquid, reducedMotion, aimX: state.aimX });
    feedback.draw(context, game.world.bodies, { reducedMotion, layer: 'over' });
    if (tutorialStage === 'drop' && !reducedMotion) {
      const target = game.world.bodies.find(body => body.level === 0);
      if (target) { context.strokeStyle = '#829c5977'; context.lineWidth = 1.1; context.setLineDash([3, 4]); context.beginPath(); context.arc(target.x, target.y, target.r + 7 + Math.sin(visualTime * 3) * 2, 0, Math.PI * 2); context.stroke(); context.setLineDash([]); }
    }
    for (const particle of particles) {
      context.save(); context.globalAlpha = Math.max(0, 1 - particle.age / particle.life); context.fillStyle = particle.color;
      context.translate(particle.x, particle.y); context.rotate(particle.age * 3 + particle.vx);
      context.beginPath(); context.ellipse(0, 0, particle.size, particle.kind ? particle.size * .5 : particle.size, 0, 0, Math.PI * 2); context.fill(); context.restore();
    }
    for (const label of floatingScores) {
      context.save(); context.globalAlpha = Math.min(1, (1.15 - label.age) * 3); context.fillStyle = '#426137'; context.strokeStyle = '#fffdf4'; context.lineWidth = 3.5;
      context.font = `${label.combo > 1 ? 600 : 500} ${label.combo > 1 ? 22 : 18}px Georgia`; context.textAlign = 'center';
      const y = label.y - Math.min(label.age, .9) * (reducedMotion ? 0 : 25); context.strokeText(`+${label.points}`, label.x, y); context.fillText(`+${label.points}`, label.x, y); context.restore();
    }
    context.strokeStyle = '#ffffffa1'; context.lineWidth = 1; context.beginPath(); context.moveTo(26, 144); context.lineTo(26, 580); context.quadraticCurveTo(26, 616, 62, 619); context.stroke();
    if (Math.abs(state.tilt) > .01) { context.strokeStyle = '#8aa463'; context.lineWidth = 2; context.beginPath(); context.moveTo(210, 634); context.lineTo(250, 634 + state.tilt * 5); context.stroke(); }
  }

  function animateEffects(dt) {
    feedback.advance(dt);
    for (let index = particles.length - 1; index >= 0; index--) {
      const particle = particles[index]; particle.age += dt; particle.vy += 100 * dt; particle.x += particle.vx * dt; particle.y += particle.vy * dt;
      if (particle.age >= particle.life) particles.splice(index, 1);
    }
    for (let index = floatingScores.length - 1; index >= 0; index--) { floatingScores[index].age += dt; if (floatingScores[index].age > 1.15) floatingScores.splice(index, 1); }
  }

  function percentile(values, fraction) { if (!values.length) return 0; const ordered = values.slice().sort((a, b) => a - b); return Math.round(ordered[Math.floor((ordered.length - 1) * fraction)] * 100) / 100; }
  function diagnostics() {
    const state = game.state;
    let minimumAreaRatio = 1, maximumBoundaryViolation = 0, finite = true;
    for (const body of game.world.bodies) { minimumAreaRatio = Math.min(minimumAreaRatio, body.area / body.targetArea); for (const point of body.points) { finite &&= Number.isFinite(point.x) && Number.isFinite(point.y); maximumBoundaryViolation = Math.max(maximumBoundaryViolation, game.world.left - point.x, point.x - game.world.right, point.y - game.world.floor); } }
    return { artReady: hasLoadedArt, assetError: painter.assetError, time: Math.round(state.time * 100) / 100, tutorialStage, activeDialog, score: state.score, dropCount: state.dropCount, mergeCount: state.mergeCount, bodyCount: game.world.bodies.length, energy: state.energy, liquid: state.liquid, isPaused: state.isPaused, isOver: state.isOver, minimumAreaRatio, maximumBoundaryViolation, finite, computeP95Ms: percentile(frameCosts, .95), simulationP95Ms: percentile(simulationCosts, .95), drawingP95Ms: percentile(drawingCosts, .95), intervalP95Ms: percentile(frameIntervals, .95), intervalP99Ms: percentile(frameIntervals, .99), sampleCount: frameIntervals.length, lastInputRenderDelayMs, canvasPixels: [canvas.width, canvas.height], renderer: painter.getDiagnostics(), effects: feedback.effects.length, soundEnabled: isSoundEnabled, audioState: audioContext?.state || 'uninitialized', pendingMerges: game.pendingMerges.length, lesson: activeDialog === 'lesson-dialog' ? lesson.getSnapshot() : null, eventHistory };
  }

  function frame(now) {
    const started = performance.now();
    const sampledActiveFrame = hasLoadedArt && !activeDialog && !game.state.isPaused && !game.state.isOver;
    const intervalMs = previousTime === null ? 0 : now - previousTime; previousTime = now;
    const dt = Math.min(intervalMs / 1000, .05); visualTime += dt;
    if (hasLoadedArt && !activeDialog) {
      if (heldTilt) game.setTilt(heldTilt);
      input.advance(dt);
      if (isQa && qaAutoplay && !game.state.isPaused && !game.state.isOver && game.state.time >= qaNextDropAt) {
        game.setAim(230); if (game.drop()) qaNextDropAt = game.state.time + .5;
      }
      const simulationStarted = performance.now();
      if (isStressScene) { if (!game.state.isPaused) { game.state.time += dt; game.world.step(dt, { liquid: game.state.liquidRemainingSeconds > 0 ? 1 : 0, tilt: game.state.tilt }); game.state.liquidRemainingSeconds = Math.max(0, game.state.liquidRemainingSeconds - dt); } }
      else game.advance(dt);
      if (sampledActiveFrame) { simulationCosts.push(performance.now() - simulationStarted); if (simulationCosts.length > 3600) simulationCosts.shift(); }
      processEvents(); animateEffects(dt);
    }
    if (activeDialog === 'lesson-dialog') lesson.advance(dt);
    if (pendingLessonTime !== null && visualTime >= pendingLessonTime && !activeDialog && input.activePointerId === null) { pendingLessonTime = null; openLesson(true); }
    if (pendingWinTime !== null && visualTime >= pendingWinTime && !activeDialog) { pendingWinTime = null; showResult(true); }
    if (now >= nextDrawTime - 1 || previousDrawTime === -Infinity) {
      nextDrawTime = nextDrawTime === 0 || now - nextDrawTime > 100 ? now + 1000 / 60 : nextDrawTime + 1000 / 60;
      if (previousDrawTime !== -Infinity && !document.hidden && !activeDialog && !game.state.isPaused) { frameIntervals.push(now - previousDrawTime); if (frameIntervals.length > 3600) frameIntervals.shift(); }
      previousDrawTime = now;
      const drawingStarted = performance.now();
      if (activeDialog === 'lesson-dialog') lesson.draw(visualTime); else if (!activeDialog) drawMain();
      if (sampledActiveFrame) { drawingCosts.push(performance.now() - drawingStarted); if (drawingCosts.length > 3600) drawingCosts.shift(); }
      if (lastInputTime !== null) { lastInputRenderDelayMs = Math.round((performance.now() - lastInputTime) * 100) / 100; lastInputTime = null; }
    }
    if (sampledActiveFrame) { frameCosts.push(performance.now() - started); if (frameCosts.length > 3600) frameCosts.shift(); }
    if (now - lastHudTime > 100) { updateHud(); lastHudTime = now; if (isQa) byId('diagnostics').textContent = JSON.stringify(diagnostics(), null, 2); }
    window.__ready = hasLoadedArt; requestAnimationFrame(frame);
  }

  function bindTilt(id, direction) {
    const button = byId(id);
    const clear = () => { heldTilt = 0; game.setTilt(0); button.classList.remove('is-held'); };
    button.addEventListener('pointerdown', event => { if (game.state.isPaused || game.state.isOver || activeDialog) return; event.preventDefault(); button.setPointerCapture(event.pointerId); heldTilt = direction; game.setTilt(direction); button.classList.add('is-held'); });
    for (const eventName of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(eventName, clear);
  }

  byId('help-button').onclick = () => openModal('help-dialog');
  byId('help-practice').onclick = () => openLesson(false);
  byId('lesson-button').onclick = () => openLesson(false);
  byId('lesson-soften').onclick = () => { unlockSound(); if (lesson.soften()) playSound('soften'); };
  byId('lesson-retry').onclick = resetLesson;
  const dismissLesson = () => { if (lessonIsOnboarding) finishTutorial(); closeModal(); };
  byId('lesson-continue').onclick = dismissLesson; byId('lesson-skip').onclick = dismissLesson;
  byId('skip-tutorial').onclick = () => { finishTutorial(); flashMessage('自在玩吧，随时可以点“玩法”。'); };
  byId('soften-button').onclick = () => { unlockSound(); game.soften(); updateHud(); };
  byId('pause-button').onclick = () => { if (!hasLoadedArt || activeDialog || game.state.isOver) return; game.setPaused(!game.state.isPaused); input.clear(); heldTilt = 0; updateHud(); };
  byId('resume-button').onclick = () => { game.setPaused(false); updateHud(); canvas.focus({ preventScroll: true }); };
  byId('restart-button').onclick = () => openModal('restart-dialog');
  byId('confirm-restart').onclick = startRound; byId('result-primary').onclick = startRound; byId('result-secondary').onclick = closeModal;
  byId('sound-button').onclick = () => { isSoundEnabled = !isSoundEnabled; if (isSoundEnabled) { unlockSound(); playSound('merge', 1); } savePreferences(); updateHud(); };
  byId('reduced-button').onclick = () => { reducedMotion = !reducedMotion; setMotionPreference(); savePreferences(); };
  document.querySelectorAll('[data-close]').forEach(button => button.onclick = closeModal);
  document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('cancel', event => { event.preventDefault(); if (dialog.id === 'result-dialog' && game.state.isOver) return; if (dialog.id === 'lesson-dialog') dismissLesson(); else closeModal(); }));
  bindTilt('tilt-left', -1); bindTilt('tilt-right', 1);
  canvas.addEventListener('pointerdown', unlockSound);
  canvas.addEventListener('pointerup', event => { if (!input.pointFrom(event).inside) flashMessage('已取消，这颗先留着。'); });
  window.addEventListener('blur', () => { heldTilt = 0; document.querySelectorAll('.is-held').forEach(button => button.classList.remove('is-held')); });
  document.addEventListener('visibilitychange', () => { previousTime = null; if (document.hidden) heldTilt = 0; });

  function resizeCanvas() {
    const displayedWidth = canvas.getBoundingClientRect().width || 460;
    const ratio = Math.min(displayedWidth, 460) / 460 * Math.min(devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(460 * ratio));
    const height = Math.max(1, Math.round(width * 640 / 460));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width; canvas.height = height; painter.clearCache();
    }
    previousDrawTime = -Infinity; nextDrawTime = 0;
  }
  window.addEventListener('resize', resizeCanvas); resizeCanvas(); setMotionPreference();

  FRUIT_NAMES.forEach((name, index) => {
    const button = document.createElement('button'); button.className = 'fruit-step'; button.setAttribute('aria-label', index === FINAL_LEVEL ? '西瓜，西瓜不会消除' : `两颗${name}，合成${FRUIT_NAMES[index + 1]}`);
    const icon = document.createElement('canvas'); icon.width = icon.height = 100; icon.setAttribute('aria-hidden', 'true');
    const label = document.createElement('span'); label.textContent = name; button.append(icon, label); byId('route-fruits').append(button);
    button.onclick = () => { const message = index === FINAL_LEVEL ? '西瓜不会消除，要给新水果留出空间。' : `两颗${name}，合成一颗${FRUIT_NAMES[index + 1]}。`; byId('route-caption').textContent = message; flashMessage(message, 2.5); say(message); };
  });

  if (isQa) {
    byId('qa-panel').hidden = false;
    byId('qa-stress').onclick = () => {
      finishTutorial(); startRound(); game.world.clear(); game.state.currentLevel = game.state.nextLevel = 0;
      for (let index = 0; index < 40; index++) { const column = index % 5, row = Math.floor(index / 5), level = (column + row * 2) % 5; game.world.add(level, 70 + column * 80 + (row % 2 ? 2 : -2), 570 - row * 76, 20 + level * 4); }
      isStressScene = true; frameIntervals.length = frameCosts.length = 0; flashMessage('40 颗水果 · 渲染压力场景', 4);
    };
    byId('qa-bubbles').onclick = () => {
      finishTutorial(); startRound(); game.world.clear();
      for (const [level, x, y] of [[7, 108, 539], [8, 325, 521], [5, 180, 373], [4, 300, 378]]) game.world.add(level, x, y, game.options.radii[level]);
      isStressScene = true; flashMessage('检查透明外膜 · 桃子、椰子、苹果、柠檬', 4);
    };
    byId('qa-autoplay').onclick = () => { finishTutorial(); startRound(); qaAutoplay = true; frameIntervals.length = frameCosts.length = 0; };
    byId('qa-end').onclick = () => showResult(false); byId('qa-win').onclick = () => showResult(true);
  }
  const motionLab = initMotionLab({ painter, openModal, closeModal });
  window.__melon = { diagnostics };
  startRound();
  painter.ready.then(loaded => {
    hasLoadedArt = loaded;
    if (!loaded) { updateHud(); say('水果图片未能载入，请重新打开文件。'); return; }
    painter.drawIcon(byId('brand-icon'), LOGO_LEVEL, { face: false });
    painter.drawIcon(byId('goal-fruit'), FINAL_LEVEL, { face: false });
    document.querySelectorAll('.fruit-step canvas').forEach((icon, index) => painter.drawIcon(icon, index));
    game.setPaused(false); lastNextLevel = -1; updateHud();
  });
  requestAnimationFrame(frame);
})();
