(function () {
  'use strict';
  class MelonInput {
    constructor({ surface, game, onChange = () => {} }) {
      this.surface = surface;
      this.game = game;
      this.onChange = onChange;
      this.activePointerId = null;
      this.isInside = false;
      this.keys = new Set();
      this.listeners = [];
      this.bind(surface, 'pointerdown', event => this.pointerDown(event));
      this.bind(surface, 'pointermove', event => this.pointerMove(event));
      this.bind(surface, 'pointerup', event => this.pointerUp(event));
      this.bind(surface, 'pointercancel', () => this.cancelPointer());
      this.bind(surface, 'lostpointercapture', () => this.cancelPointer());
      this.bind(surface, 'contextmenu', event => { event.preventDefault(); this.cancelPointer(); });
      this.bind(window, 'keydown', event => this.keyDown(event));
      this.bind(window, 'keyup', event => { this.keys.delete(event.code); this.updateTilt(); });
      this.bind(window, 'blur', () => { this.clear(); this.game.setPaused(true); this.onChange(); });
      this.bind(document, 'visibilitychange', () => { if (document.hidden) { this.clear(); this.game.setPaused(true); this.onChange(); } });
    }

    bind(target, type, handler) {
      target.addEventListener(type, handler);
      this.listeners.push({ target, type, handler });
    }

    pointFrom(event) {
      const bounds = this.surface.getBoundingClientRect();
      return { x: (event.clientX - bounds.left) / bounds.width * this.game.options.width, inside: event.clientX >= bounds.left && event.clientX <= bounds.right && event.clientY >= bounds.top && event.clientY <= bounds.bottom };
    }

    pointerDown(event) {
      if (this.activePointerId !== null || this.game.state.isPaused || this.game.state.isOver || event.button > 0) return;
      event.preventDefault();
      this.surface.focus({ preventScroll: true });
      this.activePointerId = event.pointerId;
      this.surface.setPointerCapture(event.pointerId);
      const point = this.pointFrom(event);
      this.isInside = point.inside;
      this.game.setAim(point.x);
      this.onChange();
    }

    pointerMove(event) {
      if (this.activePointerId !== null && event.pointerId !== this.activePointerId) return;
      if (this.activePointerId === null && event.pointerType !== 'mouse') return;
      const point = this.pointFrom(event);
      this.isInside = point.inside;
      if (point.inside) this.game.setAim(point.x);
      this.onChange();
    }

    pointerUp(event) {
      if (event.pointerId !== this.activePointerId) return;
      const point = this.pointFrom(event);
      this.activePointerId = null;
      this.isInside = false;
      if (point.inside) { this.game.setAim(point.x); this.game.drop(); }
      if (this.surface.hasPointerCapture(event.pointerId)) this.surface.releasePointerCapture(event.pointerId);
      this.onChange();
    }

    cancelPointer() {
      const pointerId = this.activePointerId;
      this.activePointerId = null;
      this.isInside = false;
      if (pointerId !== null && this.surface.hasPointerCapture(pointerId)) this.surface.releasePointerCapture(pointerId);
      this.onChange();
    }

    keyDown(event) {
      if (!['ArrowLeft', 'ArrowRight', 'Enter', 'Space', 'KeyA', 'KeyD', 'KeyP', 'Escape'].includes(event.code)) return;
      if (event.target?.closest?.('button,input,textarea,select,[contenteditable="true"]')) return;
      event.preventDefault();
      if (event.repeat) return;
      this.keys.add(event.code);
      if (event.code === 'Enter') this.game.drop();
      if (event.code === 'Space') this.game.soften();
      if (event.code === 'ArrowLeft') this.game.setAim(this.game.state.aimX - 10);
      if (event.code === 'ArrowRight') this.game.setAim(this.game.state.aimX + 10);
      if (event.code === 'KeyP') this.game.setPaused(!this.game.state.isPaused);
      if (event.code === 'Escape') this.cancelPointer();
      this.updateTilt();
      this.onChange();
    }

    updateTilt() {
      this.game.setTilt(Number(this.keys.has('KeyD')) - Number(this.keys.has('KeyA')));
    }

    advance(elapsedSeconds) {
      if (this.game.state.isPaused || this.game.state.isOver) return;
      const direction = Number(this.keys.has('ArrowRight')) - Number(this.keys.has('ArrowLeft'));
      if (direction) this.game.setAim(this.game.state.aimX + direction * 270 * Math.min(elapsedSeconds, .05));
    }

    clear() {
      this.keys.clear();
      this.game.setTilt(0);
      this.cancelPointer();
    }

    destroy() {
      this.clear();
      for (const { target, type, handler } of this.listeners) target.removeEventListener(type, handler);
      this.listeners.length = 0;
    }
  }
  window.MelonInput = MelonInput;
})();
