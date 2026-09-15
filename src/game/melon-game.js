(function () {
  'use strict';
  const LOGIC_STEP_SECONDS = 1 / 60;
  const MAX_FRAME_SECONDS = 0.1;
  const clamp = (value, lower, upper) => Math.max(lower, Math.min(upper, value));

  class MelonGame {
    constructor(options = {}) {
      this.options = { width: 460, height: 640, left: 24, right: 436, floor: 615, warningY: 137, overflowSeconds: 3, dropCooldownSeconds: .32, spawnY: 64, softenSeconds: 2.4, softenCost: 60, energyPerMerge: 2, tiltEnergyPerSecond: 10, radii: [12, 16, 22, 29, 37, 47, 59, 74, 91, 112, 137], ...options };
      this.world = new SoftWorld(this.options);
      this.reset(options.seed || 2743);
    }

    random() {
      this.randomState |= 0;
      this.randomState = this.randomState + 0x6D2B79F5 | 0;
      let value = Math.imul(this.randomState ^ this.randomState >>> 15, 1 | this.randomState);
      value = value + Math.imul(value ^ value >>> 7, 61 | value) ^ value;
      return ((value ^ value >>> 14) >>> 0) / 4294967296;
    }

    nextLevel() {
      const draw = this.random();
      return Math.floor(draw * 5);
    }

    reset(seed = this.initialSeed) {
      this.initialSeed = seed >>> 0;
      this.randomState = this.initialSeed;
      this.world.clear();
      this.accumulatorSeconds = 0;
      this.events = [];
      this.pendingMerges = [];
      this.state = { time: 0, score: 0, energy: 60, currentLevel: this.nextLevel(), nextLevel: this.nextLevel(), aimX: this.options.width / 2, cooldownSeconds: 0, liquid: 0, liquidRemainingSeconds: 0, tilt: 0, dangerSeconds: 0, combo: 0, mergeCount: 0, dropCount: 0, highestLevel: 0, isPaused: false, isOver: false, hasWatermelon: false, lastMergeTime: -Infinity };
      if (this.options.initialFruit !== false) this.placeInitialFruit();
      this.emit('reset', { seed: this.initialSeed });
    }

    placeInitialFruit() {
      const availableWidth = this.options.right - this.options.left;
      for (const [level, fraction] of [[1, .13], [3, .35], [0, .59], [2, .81]]) {
        const radius = this.options.radii[level];
        this.world.add(level, this.options.left + availableWidth * fraction, this.options.floor - radius - 1, radius);
        this.state.highestLevel = Math.max(this.state.highestLevel, level);
      }
    }

    emit(type, details = {}) {
      this.events.push({ type, time: this.state.time, ...details });
      // Rendering may pause independently; keep an inactive consumer bounded.
      if (this.events.length > 256) this.events.shift();
    }

    takeEvents() {
      return this.events.splice(0);
    }

    setAim(x) {
      if (!Number.isFinite(x)) return;
      const radius = this.options.radii[this.state.currentLevel];
      this.state.aimX = clamp(x, this.options.left + radius + 2, this.options.right - radius - 2);
    }

    setTilt(direction) {
      this.state.tilt = Number.isFinite(direction) ? clamp(direction, -1, 1) : 0;
    }

    setPaused(isPaused) {
      if (this.state.isOver) return;
      this.state.isPaused = Boolean(isPaused);
      this.state.tilt = 0;
      this.accumulatorSeconds = 0;
      this.emit(isPaused ? 'pause' : 'resume');
    }

    drop() {
      if (this.state.isPaused || this.state.isOver || this.state.cooldownSeconds > 0) return false;
      const level = this.state.currentLevel;
      this.setAim(this.state.aimX);
      const body = this.world.add(level, this.state.aimX, this.options.spawnY, this.options.radii[level], { vy: 65 });
      this.state.currentLevel = this.state.nextLevel;
      this.state.nextLevel = this.nextLevel();
      this.state.cooldownSeconds = this.options.dropCooldownSeconds;
      this.state.dropCount++;
      this.emit('drop', { id: body.id, level, x: body.x, y: body.y });
      return true;
    }

    soften() {
      if (this.state.isPaused || this.state.isOver || this.state.liquidRemainingSeconds > 0 || this.state.energy < this.options.softenCost) return false;
      this.state.energy -= this.options.softenCost;
      this.state.liquidRemainingSeconds = this.options.softenSeconds;
      // A brief kneading impulse makes the change in material visible and releases crowded contacts.
      for (const body of this.world.bodies) {
        const horizontal = 0;
        const upward = Math.min(170, 100 + body.r);
        for (const point of body.points) {
          point.vx += horizontal + (point.x - body.x) * 1.15;
          point.vy -= upward + (point.y - body.y) * .8;
        }
        body.vx += horizontal; body.vy -= upward;
        body.impactExcitation = Math.max(body.impactExcitation, .4);
        this.world.wake(body);
      }
      this.emit('soften', { durationSeconds: this.options.softenSeconds });
      return true;
    }

    commitMerges() {
      const ready = this.pendingMerges.filter(pair => this.state.time >= pair.readyAt);
      this.pendingMerges = this.pendingMerges.filter(pair => this.state.time < pair.readyAt);
      for (const pair of ready) {
        const first = this.world.bodies.find(body => body.id === pair.firstId);
        const second = this.world.bodies.find(body => body.id === pair.secondId);
        if (first && second) this.finishMerge(first, second);
      }
      const reserved = new Set(this.pendingMerges.flatMap(pair => [pair.firstId, pair.secondId]));
      const active = new Set(this.world.bodies.map(body => body.id));
      const contacts = this.world.getContacts().sort((a, b) => Math.min(a[0].id, a[1].id) - Math.min(b[0].id, b[1].id));
      for (const [first, second] of contacts) {
        if (first.level >= this.options.radii.length - 1 || first.level !== second.level || first.age < .24 || second.age < .24 || reserved.has(first.id) || reserved.has(second.id) || !active.has(first.id) || !active.has(second.id)) continue;
        reserved.add(first.id); reserved.add(second.id);
        const readyAt = this.state.time + .08;
        first.mergingUntil = second.mergingUntil = readyAt;
        this.pendingMerges.push({ firstId: first.id, secondId: second.id, readyAt });
        this.emit('merge-start', { parentIds: [first.id, second.id], level: first.level, x: (first.x + second.x) / 2, y: (first.y + second.y) / 2, radius: first.r, duration: .08 });
      }
    }

    finishMerge(first, second) {
      if (first.level !== second.level || first.level >= this.options.radii.length - 1) return;
      const firstMass = first.r ** 2, secondMass = second.r ** 2, mass = firstMass + secondMass;
      const x = (first.x * firstMass + second.x * secondMass) / mass;
      const y = (first.y * firstMass + second.y * secondMass) / mass;
      const vx = (first.vx * firstMass + second.vx * secondMass) / mass;
      const vy = (first.vy * firstMass + second.vy * secondMass) / mass;
      const level = first.level + 1;
      this.world.remove([first.id, second.id]);
      let mergedId = null;
      if (level < this.options.radii.length) {
        const merged = this.world.add(level, x, y, this.options.radii[level], { vx, vy, growFrom: this.options.mergeGrowFrom ?? 1, growthSeconds: .18 });
        mergedId = merged.id;
        this.state.highestLevel = Math.max(this.state.highestLevel, level);
      }
      this.state.combo = this.state.time - this.state.lastMergeTime < 1.2 ? this.state.combo + 1 : 1;
      this.state.lastMergeTime = this.state.time;
      const points = level * (level + 1) / 2;
      this.state.score += points;
      this.state.mergeCount++;
      this.state.energy = Math.min(100, this.state.energy + this.options.energyPerMerge);
      this.emit('merge', { parentIds: [first.id, second.id], id: mergedId, level, x, y, radius: this.options.radii[Math.min(level, this.options.radii.length - 1)], points, combo: this.state.combo });
      if (level === this.options.radii.length - 1 && !this.state.hasWatermelon) {
        this.state.hasWatermelon = true;
        this.emit('watermelon', { id: mergedId });
      }
    }

    stepLogic() {
      const state = this.state, step = LOGIC_STEP_SECONDS;
      state.time += step;
      if (state.tilt) {
        const cost = this.options.tiltEnergyPerSecond * Math.abs(state.tilt) * step;
        if (state.energy < cost) state.tilt = 0;
        else state.energy -= cost;
      }
      state.cooldownSeconds = Math.max(0, state.cooldownSeconds - step);
      state.liquidRemainingSeconds = Math.max(0, state.liquidRemainingSeconds - step);
      const liquidTarget = state.liquidRemainingSeconds > 0 ? 1 : 0;
      state.liquid += (liquidTarget - state.liquid) * (1 - Math.exp(-9 * step));
      this.world.step(step, { liquid: state.liquid, tilt: state.tilt });
      for (const impact of this.world.takeImpactEvents()) this.emit('impact', impact);
      this.commitMerges();
      const overflow = this.world.bodies.some(body => body.age > 2 && body.points.some(point => point.y < this.options.warningY));
      state.dangerSeconds = overflow ? state.dangerSeconds + step : Math.max(0, state.dangerSeconds - step * 2);
      if (state.dangerSeconds >= this.options.overflowSeconds) {
        state.isOver = true;
        state.tilt = 0;
        this.emit('game-over', { score: state.score });
      }
    }

    advance(elapsedSeconds) {
      if (!Number.isFinite(elapsedSeconds) || elapsedSeconds <= 0 || this.state.isPaused || this.state.isOver) return;
      this.accumulatorSeconds += Math.min(elapsedSeconds, MAX_FRAME_SECONDS);
      while (this.accumulatorSeconds + 1e-10 >= LOGIC_STEP_SECONDS && !this.state.isOver) {
        this.accumulatorSeconds -= LOGIC_STEP_SECONDS;
        this.stepLogic();
      }
    }

    getSnapshot() {
      return { ...this.state, seed: this.initialSeed, bodyCount: this.world.bodies.length, bodies: this.world.bodies.map(body => ({ id: body.id, level: body.level, x: body.x, y: body.y, r: body.r, age: body.age, isSleeping: Boolean(body.isSleeping), points: body.points.map(point => ({ x: point.x, y: point.y })) })) };
    }
  }

  window.MelonGame = MelonGame;
})();
