(function () {
  'use strict';
  const COLORS = MelonFruitCatalog.colors;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  class MelonFeedback {
    constructor() { this.effects = []; }
    clear() { this.effects.length = 0; }
    add(event) {
      if (!['impact', 'merge-start', 'merge', 'soften'].includes(event.type)) return;
      const strength = event.type === 'impact' ? clamp((event.speed - 80) / 750, .12, 1) : 1;
      this.effects.push({ ...event, age: 0, strength, duration: event.type === 'impact' ? .3 : event.type === 'merge-start' ? .08 : event.type === 'soften' ? .8 : .58 });
      if (this.effects.length > 48) this.effects.shift();
    }
    advance(dt) {
      for (const effect of this.effects) effect.age += dt;
      this.effects = this.effects.filter(effect => effect.age < effect.duration);
    }
    draw(context, bodies, { reducedMotion = false, layer = 'over' } = {}) {
      for (const effect of this.effects) {
        const progress = clamp(effect.age / effect.duration, 0, 1);
        const eased = 1 - (1 - progress) ** 3;
        const color = COLORS[Math.min(effect.level || 0, MelonFruitCatalog.finalLevel)];
        context.save();
        if (effect.type === 'merge-start' && layer === 'over') {
          const parents = bodies.filter(body => effect.parentIds.includes(body.id));
          for (const body of parents) {
            context.beginPath(); body.points.forEach((point, index) => index ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y)); context.closePath();
            context.strokeStyle = '#fffbed'; context.lineWidth = 1.5 + progress * 2; context.globalAlpha = .3 + .6 * progress; context.stroke();
          }
          if (parents.length === 2) {
            context.strokeStyle = '#fffbea'; context.lineWidth = 5 + progress * 8; context.lineCap = 'round'; context.globalAlpha = progress * .6;
            context.beginPath(); context.moveTo(parents[0].x, parents[0].y); context.lineTo(parents[1].x, parents[1].y); context.stroke();
          }
        }
        if (effect.type === 'impact' && layer === 'under' && !reducedMotion) {
          const radius = 3 + eased * (9 + effect.strength * 20);
          context.translate(effect.x, effect.y); context.rotate(Math.atan2(effect.normalY, effect.normalX) + Math.PI / 2);
          context.globalAlpha = (1 - progress) ** 2 * (.25 + effect.strength * .3);
          context.strokeStyle = '#b8c7a2'; context.lineWidth = 1.3;
          context.beginPath(); context.ellipse(0, 0, radius, radius * .27, 0, 0, Math.PI * 2); context.stroke();
          if (effect.strength > .3) {
            for (const sign of [-1, 1]) {
              context.fillStyle = '#e4eebd'; context.beginPath(); context.ellipse(sign * radius * .85, -Math.sin(progress * Math.PI) * 8, 1.8, 2.8, sign * .6, 0, Math.PI * 2); context.fill();
            }
          }
        }
        if (effect.type === 'merge') {
          const radius = (effect.radius || 30) * (.7 + eased * 1.7);
          context.translate(effect.x, effect.y);
          if (layer === 'under') {
            const glow = context.createRadialGradient(0, 0, 0, 0, 0, radius);
            glow.addColorStop(0, '#fffbd9'); glow.addColorStop(.48, color + '66'); glow.addColorStop(1, color + '00');
            context.globalAlpha = (1 - progress) * (reducedMotion ? .2 : .5); context.fillStyle = glow; context.fillRect(-radius, -radius, radius * 2, radius * 2);
          } else if (!reducedMotion) {
            context.strokeStyle = color; context.globalAlpha = (1 - progress) ** 1.3 * .8; context.lineWidth = 3 * (1 - progress) + .5;
            context.beginPath(); context.ellipse(0, 0, radius, radius * .58, -.12, 0, Math.PI * 2); context.stroke();
            context.strokeStyle = '#fffbee'; context.globalAlpha *= .8; context.lineWidth = 1.6;
            context.beginPath(); context.ellipse(0, 0, radius * .82, radius * .49, -.12, 0, Math.PI * 2); context.stroke();
            for (let index = 0; index < 8; index++) {
              const angle = index * Math.PI / 4 + .23;
              const distance = (effect.radius || 30) * (.7 + eased * 1.1);
              context.save(); context.translate(Math.cos(angle) * distance, Math.sin(angle) * distance * .8);
              context.rotate(angle); context.fillStyle = index % 2 ? '#fffbe4' : color;
              context.beginPath(); context.ellipse(0, 0, 2 + (1 - progress) * 2, 1.5, 0, 0, Math.PI * 2); context.fill(); context.restore();
            }
          }
        }
        if (effect.type === 'soften' && layer === 'under' && !reducedMotion) {
          context.translate(230, 515); context.strokeStyle = '#9ebb74'; context.lineWidth = 2; context.globalAlpha = (1 - progress) * .35;
          for (let index = 0; index < 3; index++) { const radius = 40 + eased * 170 - index * 30; if (radius <= 0) continue; context.beginPath(); context.ellipse(0, 0, radius, radius * .48, 0, 0, Math.PI * 2); context.stroke(); }
        }
        context.restore();
      }
    }
  }
  window.MelonFeedback = MelonFeedback;
})();
