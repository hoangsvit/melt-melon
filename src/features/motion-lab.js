(function () {
  'use strict';

  const WIDTH = 460, HEIGHT = 640, FRAME_SECONDS = 1 / 60;
  const SCENES = {
    drop: { title: '单果落地', hint: '看下落加速、触地压缩，以及回弹后的余振。' },
    collision: { title: '大小碰撞', hint: '看小水果接触大水果时，两边的轮廓怎样变化。' },
    merge: { title: '同果合成', hint: '看两颗相同水果接触后，怎样变成新水果。' }
  };

  /** The host owns modal focus and main-game pause; every scene owns its simulation. */
  function initMotionLab({ painter, openModal, closeModal }) {
    const dialog = document.getElementById('motion-lab-dialog');
    if (!dialog) throw new Error('慢镜头弹窗尚未插入页面。');
    if (!painter || typeof painter.paint !== 'function') throw new Error('慢镜头需要 FruitPainter 实例。');
    const find = selector => dialog.querySelector(selector);
    const canvas = find('canvas'), context = canvas.getContext('2d');
    const timeOutput = find('[data-motion-time]'), shapeOutput = find('[data-motion-shape]');
    const eventOutput = find('[data-motion-event]'), hintOutput = find('[data-motion-hint]');
    const pauseButton = find('[data-motion-pause]'), nodeCheckbox = find('[data-motion-nodes]');
    const timeline = find('[data-motion-timeline]');
    const feedback = new MelonFeedback();
    const scenarioButtons = Array.from(dialog.querySelectorAll('[data-motion-scene]'));
    const speedButtons = Array.from(dialog.querySelectorAll('[data-motion-speed]'));
    const listeners = [];
    let world = null, sceneGame = null, sceneName = 'drop';
    let playbackRate = .25, isPaused = false, isDestroyed = false;
    let frameRequest = null, previousTimestamp = null, pendingSeconds = 0;
    let latestEvent = '还未接触', contactMarkers = [], hasFirstContact = false;
    let lastShapeText = '', lastEventText = '';

    function listen(target, eventName, callback) {
      target.addEventListener(eventName, callback);
      listeners.push(() => target.removeEventListener(eventName, callback));
    }

    function elapsedSeconds() { return sceneGame ? sceneGame.state.time : world?.time || 0; }

    function updateControls() {
      for (const button of scenarioButtons) button.setAttribute('aria-pressed', String(button.dataset.motionScene === sceneName));
      for (const button of speedButtons) button.setAttribute('aria-pressed', String(Number(button.dataset.motionSpeed) === playbackRate));
      pauseButton.textContent = isPaused ? '继续' : '暂停';
      pauseButton.setAttribute('aria-pressed', String(isPaused));
      hintOutput.textContent = SCENES[sceneName].hint;
    }

    function resetScene(nextScene = sceneName) {
      sceneName = Object.hasOwn(SCENES, nextScene) ? nextScene : 'drop';
      sceneGame = null;
      if (sceneName === 'merge') {
        sceneGame = new MelonGame({ width: WIDTH, height: HEIGHT, seed: 2743, initialFruit: false });
        world = sceneGame.world;
        const level = 3, radius = sceneGame.options.radii[level];
        world.add(level, 230, world.floor - radius - 1, radius);
        world.add(level, 230, 108, radius, { vy: 70 });
        sceneGame.takeEvents();
      } else {
        world = new SoftWorld({ width: WIDTH, height: HEIGHT });
        if (sceneName === 'collision') {
          const lowerRadius = 16 * Math.SQRT2 ** 5;
          world.add(5, 252, world.floor - lowerRadius - 1, lowerRadius);
          world.add(2, 213, 108, 32, { vy: 70 });
        } else world.add(4, 230, 108, 64, { vy: 70 });
      }
      pendingSeconds = 0; previousTimestamp = null;
      contactMarkers = []; hasFirstContact = false; latestEvent = '还未接触'; feedback.clear();
      isPaused = false;
      updateControls(); renderScene();
      if (dialog.open) requestFrame();
    }

    function recordImpact(impact) {
      const simulationTime = elapsedSeconds();
      contactMarkers.push({ x: impact.x, y: impact.y, time: simulationTime });
      if (contactMarkers.length > 8) contactMarkers.shift();
      if (!hasFirstContact) {
        hasFirstContact = true;
        latestEvent = `首次接触 ${simulationTime.toFixed(3)} s · 速度 ${Math.round(impact.speed || 0)} px/s`;
      }
    }

    function advanceScene() {
      feedback.advance(FRAME_SECONDS);
      if (sceneGame) {
        sceneGame.advance(FRAME_SECONDS);
        for (const event of sceneGame.takeEvents()) {
          feedback.add(event);
          if (event.type === 'impact') recordImpact(event);
          if (event.type === 'merge-start') latestEvent = `接触蓄力 ${elapsedSeconds().toFixed(3)} s`;
          if (event.type === 'merge') latestEvent = `完成合成 ${elapsedSeconds().toFixed(3)} s · 产生新水果`;
        }
      } else world.step(FRAME_SECONDS, { liquid: 0 });
      for (const impact of world.takeImpactEvents?.() || []) {
        feedback.add({ type: 'impact', ...impact }); recordImpact(impact);
      }
    }

    function drawPool() {
      context.fillStyle = '#f8f8ee'; context.fillRect(0, 0, WIDTH, HEIGHT);
      context.save(); context.strokeStyle = '#dce4d1'; context.lineWidth = 1;
      context.setLineDash([2, 8]);
      for (let y = 115; y < world.floor; y += 100) {
        context.beginPath(); context.moveTo(world.left, y); context.lineTo(world.right, y); context.stroke();
      }
      context.setLineDash([]); context.strokeStyle = '#b4c39f'; context.lineWidth = 2;
      context.beginPath(); context.moveTo(world.left, 32); context.lineTo(world.left, world.floor);
      context.lineTo(world.right, world.floor); context.lineTo(world.right, 32); context.stroke();
      context.fillStyle = '#dce5cf'; context.fillRect(world.left, world.floor + 2, world.right - world.left, 5);
      context.restore();
    }

    function drawNodes(body) {
      context.save(); context.strokeStyle = '#1f7058'; context.lineWidth = 1.1;
      context.beginPath(); body.points.forEach((point, index) => index ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y));
      context.closePath(); context.stroke();
      context.fillStyle = '#fffef4';
      for (const point of body.points) {
        context.beginPath(); context.arc(point.x, point.y, 2.3, 0, Math.PI * 2); context.fill(); context.stroke();
      }
      context.restore();
    }

    function renderScene() {
      if (!world || isDestroyed) return;
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      if (canvas.width !== Math.round(WIDTH * pixelRatio) || canvas.height !== Math.round(HEIGHT * pixelRatio)) {
        canvas.width = Math.round(WIDTH * pixelRatio); canvas.height = Math.round(HEIGHT * pixelRatio);
      }
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      drawPool();
      const simulationTime = elapsedSeconds();
      const reducedMotion = document.body.dataset.reduced === 'true';
      feedback.draw(context, world.bodies, { reducedMotion, layer: 'under' });
      for (const body of world.bodies) {
        painter.paint(context, body, { time: simulationTime, liquid: 0, reducedMotion });
        if (nodeCheckbox.checked) drawNodes(body);
        context.save(); context.font = '12px ui-monospace, monospace'; context.textAlign = 'center';
        context.fillStyle = '#526647'; context.fillText(`果 ${body.id}`, body.x, Math.max(24, body.minY - 13)); context.restore();
      }
      feedback.draw(context, world.bodies, { reducedMotion, layer: 'over' });
      contactMarkers = contactMarkers.filter(marker => simulationTime - marker.time < .35);
      for (const marker of contactMarkers) {
        context.save(); context.strokeStyle = '#ab633d'; context.lineWidth = 2;
        context.globalAlpha = Math.max(0, 1 - (simulationTime - marker.time) / .35);
        context.beginPath(); context.moveTo(marker.x - 6, marker.y); context.lineTo(marker.x + 6, marker.y);
        context.moveTo(marker.x, marker.y - 6); context.lineTo(marker.x, marker.y + 6); context.stroke(); context.restore();
      }
      timeline.value = Math.min(3, simulationTime);
      timeOutput.textContent = `${simulationTime.toFixed(3)} s`;
      const shapeText = world.bodies.map(body => {
        const width = body.maxX - body.minX, height = body.maxY - body.minY;
        return `果 ${body.id} · 宽 ${width.toFixed(1)} / 高 ${height.toFixed(1)} · W/H ${(width / Math.max(height, .001)).toFixed(3)}`;
      }).join('\n');
      if (shapeText !== lastShapeText) { shapeOutput.textContent = shapeText; lastShapeText = shapeText; }
      if (latestEvent !== lastEventText) { eventOutput.textContent = latestEvent; lastEventText = latestEvent; }
      dialog.dataset.motionScene = sceneName;
      dialog.dataset.motionTime = simulationTime.toFixed(6);
      dialog.dataset.motionPaused = String(isPaused);
    }

    function requestFrame() {
      if (frameRequest === null && dialog.open && !document.hidden && !isDestroyed && !isPaused) frameRequest = requestAnimationFrame(animate);
    }

    function stopFrames() {
      if (frameRequest !== null) cancelAnimationFrame(frameRequest);
      frameRequest = null; previousTimestamp = null;
    }

    function animate(timestamp) {
      frameRequest = null;
      if (!dialog.open || document.hidden || isDestroyed || isPaused) { previousTimestamp = null; return; }
      if (previousTimestamp !== null) pendingSeconds += Math.min(Math.max((timestamp - previousTimestamp) / 1000, 0), .05) * playbackRate;
      previousTimestamp = timestamp;
      while (pendingSeconds + 1e-10 >= FRAME_SECONDS) { pendingSeconds -= FRAME_SECONDS; advanceScene(); }
      renderScene(); requestFrame();
    }

    function open(nextScene = sceneName) {
      resetScene(nextScene);
      if (!dialog.open) openModal('motion-lab-dialog');
      requestFrame(); pauseButton.focus({ preventScroll: true });
    }

    function close() {
      stopFrames();
      if (dialog.open) closeModal();
    }

    for (const button of scenarioButtons) listen(button, 'click', () => resetScene(button.dataset.motionScene));
    for (const button of speedButtons) listen(button, 'click', () => {
      playbackRate = Number(button.dataset.motionSpeed); previousTimestamp = null; updateControls(); requestFrame();
    });
    listen(pauseButton, 'click', () => {
      isPaused = !isPaused; stopFrames(); updateControls(); renderScene(); requestFrame();
    });
    listen(find('[data-motion-restart]'), 'click', () => resetScene());
    listen(find('[data-motion-step]'), 'click', () => {
      isPaused = true; stopFrames(); pendingSeconds = 0; advanceScene(); updateControls(); renderScene();
    });
    listen(find('[data-motion-close]'), 'click', close);
    listen(timeline, 'input', () => {
      const targetFrames = Math.round(Number(timeline.value) / FRAME_SECONDS);
      stopFrames(); resetScene(); stopFrames(); isPaused = true;
      for (let frame = 0; frame < targetFrames; frame++) advanceScene();
      updateControls(); renderScene();
    });
    listen(nodeCheckbox, 'change', renderScene);
    listen(dialog, 'close', stopFrames);
    listen(dialog, 'cancel', event => { event.preventDefault(); close(); });
    listen(document, 'visibilitychange', () => { stopFrames(); requestFrame(); });
    for (const button of document.querySelectorAll('[data-open-motion-lab]')) listen(button, 'click', () => open(button.dataset.openMotionLab || sceneName));

    // A host can also open this dialog through its own modal router.
    const dialogObserver = new MutationObserver(() => {
      if (dialog.open) { if (!world) resetScene(); renderScene(); requestFrame(); }
      else stopFrames();
    });
    dialogObserver.observe(dialog, { attributes: true, attributeFilter: ['open'] });

    resetScene();
    return {
      open, close, reset: resetScene,
      getSnapshot() {
        return {
          scene: sceneName, time: elapsedSeconds(), playbackRate, isPaused, isOpen: dialog.open,
          event: latestEvent, mergeCount: sceneGame?.state.mergeCount || 0,
          bodies: world.bodies.map(body => ({ id: body.id, level: body.level, x: body.x, y: body.y, width: body.maxX - body.minX, height: body.maxY - body.minY, points: body.points.map(point => ({ x: point.x, y: point.y })) }))
        };
      },
      destroy() { isDestroyed = true; stopFrames(); dialogObserver.disconnect(); for (const removeListener of listeners) removeListener(); }
    };
  }

  window.initMotionLab = initMotionLab;
})();
