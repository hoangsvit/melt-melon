(function () {
  'use strict';

  const LOGIC_STEP_SECONDS = 1 / 60;
  const MAX_FRAME_SECONDS = 0.1;
  const SOFTEN_SECONDS = 2.4;
  const LIQUID_RESPONSE_RATE = 9;
  const FRUIT_RADIUS = 40;
  const FRUIT_LEVEL = 6;
  const BOUNDS = { width: 460, height: 640, left: 24, right: 436, floor: 615 };
  const OBSTACLES = [{ x: 150, y: 320, r: 55 }, { x: 310, y: 320, r: 55 }];
  const MESSAGES = {
    settling: '两颗猕猴桃，被挡板隔开了。',
    blocked: '缝隙太窄了。点一下软化，让果肉挤过去。',
    softening: '果肉变软了，正在挤过缝隙。',
    reforming: '果肉正在恢复弹性。',
    complete: '挤过去了！同样的水果碰到一起，就会合成。',
  };

  function roundedRectangle(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  class Lesson {
    constructor({ canvas = null, painter = null, onComplete = null, onStatus = null, reducedMotion = false } = {}) {
      this.canvas = canvas;
      this.ctx = canvas ? canvas.getContext('2d') : null;
      this.painter = painter;
      this.onComplete = typeof onComplete === 'function' ? onComplete : null;
      this.onStatus = typeof onStatus === 'function' ? onStatus : null;
      this.reducedMotion = Boolean(reducedMotion);
      this.world = new window.SoftWorld(BOUNDS);
      this.reset();
    }

    get isComplete() { return this.state.isComplete; }
    get isSoftened() { return this.state.isSoftened; }
    get canSoften() { return this.state.canSoften; }
    get time() { return this.state.time; }
    get minimumAreaRatio() { return this.state.minimumAreaRatio; }

    reset() {
      this.world.clear();
      this.world.obstacles = OBSTACLES.map(obstacle => ({ ...obstacle }));
      this.world.lastLiquid = 0;
      this.world.lastTilt = 0;
      this.accumulatorSeconds = 0;
      this.blockedSeconds = 0;
      this.mergeEvidence = null;
      this.state = {
        phase: 'settling', message: MESSAGES.settling,
        time: 0, prewarmSeconds: 0,
        liquid: 0, liquidRemainingSeconds: 0, softenedAt: null, completedAt: null,
        isComplete: false, isSoftened: false, isBlocked: false, canSoften: false,
        minimumAreaRatio: 1, maximumAreaRatio: 1,
        maximumBoundaryViolation: 0, allFinite: true,
        mergeCount: 0, mergedId: null,
      };
      this.upperFruitId = this.world.add(FRUIT_LEVEL, 230, 215, FRUIT_RADIUS).id;
      this.lowerFruitId = this.world.add(FRUIT_LEVEL, 230, 575, FRUIT_RADIUS).id;
      this.updateMetrics();

      // Show a genuinely blocked fruit immediately; prewarming never changes its material or coordinates directly.
      while (!this.state.isBlocked && this.state.prewarmSeconds < 5) {
        this.world.step(LOGIC_STEP_SECONDS, { liquid: 0, tilt: 0 });
        this.state.prewarmSeconds += LOGIC_STEP_SECONDS;
        this.updateMetrics();
        this.updateBlockedState();
      }
      this.state.phase = this.state.isBlocked ? 'blocked' : 'settling';
      this.state.message = MESSAGES[this.state.phase];
      this.notifyStatus();
      return this.getSnapshot();
    }

    updateMetrics() {
      for (const body of this.world.bodies) {
        const ratio = body.area / body.targetArea;
        const hasFiniteGeometry = [body.x, body.y, body.vx, body.vy, ratio].every(Number.isFinite);
        this.state.allFinite = this.state.allFinite && hasFiniteGeometry;
        if (Number.isFinite(ratio)) {
          this.state.minimumAreaRatio = Math.min(this.state.minimumAreaRatio, ratio);
          this.state.maximumAreaRatio = Math.max(this.state.maximumAreaRatio, ratio);
        }
        for (const point of body.points) {
          this.state.allFinite = this.state.allFinite && [point.x, point.y, point.vx, point.vy].every(Number.isFinite);
          this.state.maximumBoundaryViolation = Math.max(this.state.maximumBoundaryViolation,
            BOUNDS.left - point.x, point.x - BOUNDS.right, point.y - BOUNDS.floor);
        }
      }
    }

    updateBlockedState() {
      if (this.state.isSoftened || this.state.isComplete) return;
      const upperFruit = this.world.bodies.find(body => body.id === this.upperFruitId);
      const restsAboveGap = upperFruit && upperFruit.x > 205 && upperFruit.x < 255 && upperFruit.y > 260 && upperFruit.y < 320;
      const isNearlyStill = upperFruit && Math.hypot(upperFruit.vx, upperFruit.vy) < 3;
      this.blockedSeconds = restsAboveGap && isNearlyStill ? this.blockedSeconds + LOGIC_STEP_SECONDS : 0;
      this.state.isBlocked = this.blockedSeconds >= 0.3;
      this.state.canSoften = this.state.isBlocked;
    }

    notifyStatus() {
      if (this.onStatus) this.onStatus(this.getSnapshot());
    }

    soften() {
      if (!this.state.canSoften || this.state.isSoftened || this.state.isComplete) return false;
      Object.assign(this.state, {
        isSoftened: true, canSoften: false, isBlocked: false,
        phase: 'softening', message: MESSAGES.softening,
        softenedAt: this.state.time, liquidRemainingSeconds: SOFTEN_SECONDS,
      });
      this.notifyStatus();
      return true;
    }

    commitContactMerge() {
      if (this.state.isComplete) return;
      const contact = this.world.getContacts().find(([first, second]) =>
        first.level === FRUIT_LEVEL && second.level === FRUIT_LEVEL &&
        ((first.id === this.upperFruitId && second.id === this.lowerFruitId) ||
         (first.id === this.lowerFruitId && second.id === this.upperFruitId)));
      if (!contact) return;
      const [first, second] = contact;
      const firstMass = first.r ** 2, secondMass = second.r ** 2;
      const combinedMass = firstMass + secondMass;
      const x = (first.x * firstMass + second.x * secondMass) / combinedMass;
      const y = (first.y * firstMass + second.y * secondMass) / combinedMass;
      const vx = (first.vx * firstMass + second.vx * secondMass) / combinedMass;
      const vy = (first.vy * firstMass + second.vy * secondMass) / combinedMass;
      const radius = Math.sqrt(combinedMass);
      this.mergeEvidence = {
        source: 'SoftWorld.getContacts', time: this.state.time,
        secondsAfterSoftening: this.state.softenedAt === null ? null : this.state.time - this.state.softenedAt,
        parentIds: [first.id, second.id],
        parents: contact.map(body => ({ id: body.id, level: body.level, x: body.x, y: body.y, r: body.r, area: body.area, targetArea: body.targetArea })),
        radius, x, y, liquid: this.state.liquid,
      };
      this.world.remove([first.id, second.id]);
      const mergedFruit = this.world.add(FRUIT_LEVEL + 1, x, y, radius, { vx, vy });
      Object.assign(this.state, {
        isComplete: true, isBlocked: false, canSoften: false,
        phase: 'complete', message: MESSAGES.complete,
        completedAt: this.state.time, mergeCount: 1, mergedId: mergedFruit.id,
      });
      this.updateMetrics();
      this.notifyStatus();
      if (this.onComplete) this.onComplete(this.getSnapshot());
    }

    stepLogic() {
      const state = this.state;
      state.time += LOGIC_STEP_SECONDS;
      state.liquidRemainingSeconds = Math.max(0, state.liquidRemainingSeconds - LOGIC_STEP_SECONDS);
      const liquidTarget = state.liquidRemainingSeconds > 0 ? 1 : 0;
      state.liquid += (liquidTarget - state.liquid) * (1 - Math.exp(-LIQUID_RESPONSE_RATE * LOGIC_STEP_SECONDS));
      this.world.step(LOGIC_STEP_SECONDS, { liquid: state.liquid, tilt: 0 });
      this.updateMetrics();
      this.updateBlockedState();
      this.commitContactMerge();
      if (!state.isComplete && state.isBlocked && state.phase === 'settling') {
        state.phase = 'blocked'; state.message = MESSAGES.blocked;
        this.notifyStatus();
      } else if (!state.isComplete && state.isSoftened && state.liquidRemainingSeconds === 0 && state.phase !== 'reforming') {
        state.phase = 'reforming'; state.message = MESSAGES.reforming;
        this.notifyStatus();
      }
    }

    advance(elapsedSeconds) {
      if (!Number.isFinite(elapsedSeconds) || elapsedSeconds <= 0) return;
      this.accumulatorSeconds += Math.min(elapsedSeconds, MAX_FRAME_SECONDS);
      while (this.accumulatorSeconds + 1e-10 >= LOGIC_STEP_SECONDS) {
        this.accumulatorSeconds = Math.max(0, this.accumulatorSeconds - LOGIC_STEP_SECONDS);
        this.stepLogic();
      }
    }

    draw(time = this.state.time) {
      const ctx = this.ctx;
      if (!ctx || !this.canvas || this.canvas.width <= 0 || this.canvas.height <= 0) return;
      const width = this.canvas.width, height = this.canvas.height;
      const scale = Math.min(width / BOUNDS.width, height / BOUNDS.height);
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#f6f7eb';
      ctx.fillRect(0, 0, width, height);
      ctx.translate((width - BOUNDS.width * scale) / 2, (height - BOUNDS.height * scale) / 2);
      ctx.scale(scale, scale);

      roundedRectangle(ctx, 14, 106, 432, 522, 24);
      ctx.fillStyle = '#e5ecd8'; ctx.fill();
      roundedRectangle(ctx, BOUNDS.left, 112, BOUNDS.right - BOUNDS.left, BOUNDS.floor - 112, 16);
      ctx.fillStyle = '#fffef5'; ctx.fill();
      ctx.strokeStyle = '#c1cfad'; ctx.lineWidth = 2; ctx.stroke();

      ctx.save();
      ctx.strokeStyle = '#d7dfc3'; ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 6]);
      ctx.beginPath(); ctx.arc(230, 565, 56, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();

      for (const obstacle of this.world.obstacles) {
        const gradient = ctx.createLinearGradient(obstacle.x, obstacle.y - obstacle.r, obstacle.x, obstacle.y + obstacle.r);
        gradient.addColorStop(0, '#e3ead3'); gradient.addColorStop(1, '#bdcba6');
        ctx.beginPath(); ctx.arc(obstacle.x, obstacle.y, obstacle.r, 0, Math.PI * 2);
        ctx.fillStyle = gradient; ctx.fill();
        ctx.strokeStyle = '#829868'; ctx.lineWidth = 2; ctx.stroke();
        ctx.beginPath(); ctx.arc(obstacle.x, obstacle.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#f8faed'; ctx.fill();
        ctx.strokeStyle = '#8c9d77'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(obstacle.x - 3, obstacle.y); ctx.lineTo(obstacle.x + 3, obstacle.y); ctx.stroke();
      }

      ctx.save();
      ctx.strokeStyle = '#82946e'; ctx.fillStyle = '#657952'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(205, 320); ctx.lineTo(255, 320);
      ctx.moveTo(205, 315); ctx.lineTo(205, 325);
      ctx.moveTo(255, 315); ctx.lineTo(255, 325); ctx.stroke();
      ctx.font = '12px system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(window.MelonI18n.t('有点窄'), 230, 343);
      ctx.restore();

      if (this.painter && typeof this.painter.paint === 'function') {
        for (const body of this.world.bodies) this.painter.paint(ctx, body, {
          time: Number.isFinite(time) ? time : this.state.time,
          liquid: this.state.liquid, reducedMotion: this.reducedMotion,
        });
      }
      ctx.restore();
    }

    getSnapshot() {
      return {
        ...this.state,
        bodyCount: this.world.bodies.length,
        upperFruitId: this.upperFruitId, lowerFruitId: this.lowerFruitId,
        gapWidth: 50,
        mergeEvidence: this.mergeEvidence ? {
          ...this.mergeEvidence,
          parentIds: [...this.mergeEvidence.parentIds],
          parents: this.mergeEvidence.parents.map(parent => ({ ...parent })),
        } : null,
        bodies: this.world.bodies.map(body => ({
          id: body.id, level: body.level, x: body.x, y: body.y, r: body.r,
          area: body.area, targetArea: body.targetArea, areaRatio: body.area / body.targetArea,
          isSleeping: body.isSleeping,
          points: body.points.map(point => ({ x: point.x, y: point.y })),
        })),
      };
    }
  }

  window.SofteningLesson = function SofteningLesson(options) { return new Lesson(options); };
})();
