(function () {
  'use strict';

  const ATLAS_COLUMNS = MelonFruitCatalog.atlasColumns;
  const ATLAS_ROWS = MelonFruitCatalog.atlasRows;
  const FRUIT_COUNT = MelonFruitCatalog.names.length;
  const ICON_POINT_COUNT = 18;
  const SPRITE_SIZE = 384;
  const MAX_CACHE_ENTRIES = 72;
  const MAX_CACHE_BYTES = 24 * 1024 * 1024;
  const SHAPE_REUSE_DISTANCE = 0.8;
  const TAU = Math.PI * 2;
  const FRUIT_COLORS = MelonFruitCatalog.colors;
  const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));

  function createCanvas(width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.ceil(width));
    canvas.height = Math.max(1, Math.ceil(height));
    return canvas;
  }

  function traceOutline(context, coordinates) {
    const count = coordinates.length / 2;
    context.beginPath();
    context.moveTo(coordinates[0], coordinates[1]);
    for (let index = 0; index < count; index++) {
      const previous = ((index + count - 1) % count) * 2;
      const current = index * 2;
      const next = ((index + 1) % count) * 2;
      const after = ((index + 2) % count) * 2;
      const tangentScale = 0.13;
      context.bezierCurveTo(
        coordinates[current] + (coordinates[next] - coordinates[previous]) * tangentScale,
        coordinates[current + 1] + (coordinates[next + 1] - coordinates[previous + 1]) * tangentScale,
        coordinates[next] - (coordinates[after] - coordinates[current]) * tangentScale,
        coordinates[next + 1] - (coordinates[after + 1] - coordinates[current + 1]) * tangentScale,
        coordinates[next], coordinates[next + 1]
      );
    }
    context.closePath();
  }

  /** time is seconds; liquid is 0–1; body points are in the context's world coordinates. */
  class FruitPainter {
    constructor(atlasSource) {
      this.isReady = false;
      this.assetError = null;
      this.assetWarnings = [];
      this.sprites = [];
      this.cache = new Map();
      this.objectKeys = new WeakMap();
      this.nextObjectKey = 1;
      this.scratchCoordinates = new Float64Array(ICON_POINT_COUNT * 2);
      this.diagnostics = {
        textureRebuilds: 0, cacheHits: 0, cacheEntries: 0, cacheEvictions: 0,
        cacheBytes: 0, trianglesDrawn: 0, paintCalls: 0, atlasCells: 0,
        alphaScanFallbacks: 0, textureCanvasAllocations: 0, textureCanvasReuses: 0, compactSpriteDraws: 0
      };
      // Resolve false on an asset failure so the host can show its own retry UI.
      this.ready = this.loadAtlas(atlasSource).then(() => {
        this.isReady = true;
        this.clearCache();
        return true;
      }).catch(error => {
        this.assetError = error instanceof Error ? error.message : String(error);
        return false;
      });
    }

    async loadAtlas(atlasSource) {
      if (typeof atlasSource !== 'string' || !atlasSource.trim()) {
        throw new Error('未提供水果图集。');
      }
      const atlas = new Image();
      if (/^https?:/i.test(atlasSource)) atlas.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        atlas.onload = resolve;
        atlas.onerror = () => reject(new Error('水果图集未能加载。'));
        atlas.src = atlasSource;
      });
      if (atlas.naturalWidth < 64 || atlas.naturalHeight < 32) {
        throw new Error('水果图集尺寸不足。');
      }
      this.atlas = atlas;
      for (let level = 0; level < ATLAS_COLUMNS * ATLAS_ROWS; level++) {
        this.sprites.push(this.extractSprite(atlas, level));
      }
      if (this.sprites.slice(0, FRUIT_COUNT).some(sprite => !sprite)) {
        throw new Error('水果图集的每个等级都需要包含水果。');
      }
      this.diagnostics.atlasCells = this.sprites.filter(Boolean).length;
    }

    extractSprite(atlas, level) {
      const column = level % ATLAS_COLUMNS;
      const row = Math.floor(level / ATLAS_COLUMNS);
      const sourceLeft = Math.round(column * atlas.naturalWidth / ATLAS_COLUMNS);
      const sourceTop = Math.round(row * atlas.naturalHeight / ATLAS_ROWS);
      const cellWidth = Math.round((column + 1) * atlas.naturalWidth / ATLAS_COLUMNS) - sourceLeft;
      const cellHeight = Math.round((row + 1) * atlas.naturalHeight / ATLAS_ROWS) - sourceTop;
      const cell = createCanvas(cellWidth, cellHeight);
      const cellContext = cell.getContext('2d', { willReadFrequently: true });
      cellContext.drawImage(atlas, sourceLeft, sourceTop, cellWidth, cellHeight, 0, 0, cellWidth, cellHeight);
      let left = cellWidth, top = cellHeight, right = -1, bottom = -1;
      try {
        const pixels = cellContext.getImageData(0, 0, cellWidth, cellHeight).data;
        let coveredPixels = 0;
        let largestComponentSize = 0;
        const visited = new Uint8Array(cellWidth * cellHeight);
        const queue = new Int32Array(cellWidth * cellHeight);
        for (let start = 0; start < visited.length; start++) {
          if (visited[start] || pixels[start * 4 + 3] <= 32) continue;
          let head = 0, tail = 1;
          let componentLeft = cellWidth, componentTop = cellHeight, componentRight = -1, componentBottom = -1;
          queue[0] = start; visited[start] = 1;
          while (head < tail) {
            const pixelIndex = queue[head++];
            const x = pixelIndex % cellWidth, y = Math.floor(pixelIndex / cellWidth);
            componentLeft = Math.min(componentLeft, x); componentRight = Math.max(componentRight, x);
            componentTop = Math.min(componentTop, y); componentBottom = Math.max(componentBottom, y);
            for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
              const nextX = x + dx, nextY = y + dy;
              if (nextX < 0 || nextY < 0 || nextX >= cellWidth || nextY >= cellHeight) continue;
              const next = nextY * cellWidth + nextX;
              if (visited[next] || pixels[next * 4 + 3] <= 32) continue;
              visited[next] = 1; queue[tail++] = next;
            }
          }
          coveredPixels += tail;
          if (tail > largestComponentSize) {
            largestComponentSize = tail;
            left = componentLeft; right = componentRight; top = componentTop; bottom = componentBottom;
          }
        }
        if (right < left || bottom < top) return null;
        // Tiny pieces from a neighboring atlas row must not enlarge this fruit's crop.
        left = Math.max(0, left - 2); top = Math.max(0, top - 2);
        right = Math.min(cellWidth - 1, right + 2); bottom = Math.min(cellHeight - 1, bottom + 2);
        if (coveredPixels > cellWidth * cellHeight * 0.96) {
          this.assetWarnings.push(`图集第 ${level + 1} 格几乎没有透明边缘。`);
        }
      } catch (_) {
        left = 0; top = 0; right = cellWidth - 1; bottom = cellHeight - 1;
        this.diagnostics.alphaScanFallbacks++;
        this.assetWarnings.push(`图集第 ${level + 1} 格无法读取透明边界，使用整格。`);
      }
      const cropSide = Math.max(right - left + 1, bottom - top + 1) * 1.035;
      const cropLeft = (left + right + 1 - cropSide) / 2;
      const cropTop = (top + bottom + 1 - cropSide) / 2;
      const sprite = createCanvas(SPRITE_SIZE, SPRITE_SIZE);
      const spriteContext = sprite.getContext('2d');
      const scale = SPRITE_SIZE / cropSide;
      // Draw an isolated cell: square padding cannot accidentally include a neighboring fruit.
      spriteContext.drawImage(cell, left, top, right - left + 1, bottom - top + 1, (left - cropLeft) * scale, (top - cropTop) * scale, (right - left + 1) * scale, (bottom - top + 1) * scale);
      return sprite;
    }

    getCacheKey(body) {
      if (body.id !== undefined && body.id !== null) return `body:${body.id}`;
      if (!this.objectKeys.has(body)) this.objectKeys.set(body, `object:${this.nextObjectKey++}`);
      return this.objectKeys.get(body);
    }

    getShape(body) {
      const points = body.points;
      if (!Array.isArray(points) || points.length < 3) return null;
      let centerX = 0, centerY = 0;
      for (const point of points) {
        if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return null;
        centerX += point.x; centerY += point.y;
      }
      centerX /= points.length; centerY /= points.length;
      if (this.scratchCoordinates.length !== points.length * 2) {
        this.scratchCoordinates = new Float64Array(points.length * 2);
      }
      let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
      for (let index = 0; index < points.length; index++) {
        const x = points[index].x - centerX;
        const y = points[index].y - centerY;
        this.scratchCoordinates[index * 2] = x;
        this.scratchCoordinates[index * 2 + 1] = y;
        left = Math.min(left, x); right = Math.max(right, x);
        top = Math.min(top, y); bottom = Math.max(bottom, y);
      }
      return {
        centerX, centerY, left, top, right, bottom,
        coordinates: this.scratchCoordinates,
        radius: Math.max(1, body.currentRadius || body.r || body.radius || (right - left + bottom - top) / 4)
      };
    }

    canReuseTexture(entry, shape, level, pixelRatio) {
      if (!entry || entry.level !== level || entry.pixelRatio !== pixelRatio || entry.coordinates.length !== shape.coordinates.length) return false;
      for (let index = 0; index < shape.coordinates.length; index += 2) {
        const deltaX = shape.coordinates[index] - entry.coordinates[index];
        const deltaY = shape.coordinates[index + 1] - entry.coordinates[index + 1];
        if (deltaX * deltaX + deltaY * deltaY > SHAPE_REUSE_DISTANCE * SHAPE_REUSE_DISTANCE) return false;
      }
      return true;
    }

    paint(context, body, options = {}) {
      const shape = this.getShape(body);
      if (!shape) return;
      const level = clamp(Math.floor(body.level ?? body.type ?? 0), 0, this.sprites.length > FRUIT_COUNT ? FRUIT_COUNT : FRUIT_COUNT - 1);
      const transform = context.getTransform();
      const pixelRatio = Math.round(clamp(Math.hypot(transform.a, transform.b), 1, 1.5) * 4) / 4;
      const key = this.getCacheKey(body);
      let entry = this.cache.get(key);
      this.diagnostics.paintCalls++;
      if (this.canReuseTexture(entry, shape, level, pixelRatio)) {
        this.diagnostics.cacheHits++;
        this.cache.delete(key);
        this.cache.set(key, entry);
      } else {
        if (entry) this.removeCacheEntry(key, false);
        entry = this.buildTexture(shape, level, pixelRatio, entry);
        this.cache.set(key, entry);
        this.diagnostics.cacheBytes += entry.bytes;
        this.trimCache();
      }
      const alpha = Number.isFinite(options.alpha) ? clamp(options.alpha, 0, 1) : 1;
      context.save();
      context.globalAlpha *= alpha;
      context.translate(shape.centerX, shape.centerY);
      if (!options.reducedMotion && body.growthSeconds && body.age < .5) {
        const pulse = Math.sin(Math.min(1, body.age / .5) * Math.PI) * .065;
        context.scale(1 + pulse, 1 + pulse);
      }
      context.drawImage(entry.canvas, entry.left, entry.top, entry.canvas.width / entry.pixelRatio, entry.canvas.height / entry.pixelRatio);
      if (options.face !== false && level < FRUIT_COUNT) this.paintFace(context, body, shape, options);
      context.restore();
      this.diagnostics.cacheEntries = this.cache.size;
    }

    buildTexture(shape, level, pixelRatio, previousEntry) {
      const padding = Math.max(5, shape.radius * 0.11);
      const left = Math.floor(shape.left - padding);
      const top = Math.floor(shape.top - padding);
      const width = Math.ceil(shape.right + padding - left);
      const height = Math.ceil(shape.bottom + padding - top);
      const requiredWidth = Math.ceil(width * pixelRatio / 32) * 32;
      const requiredHeight = Math.ceil(height * pixelRatio / 32) * 32;
      const canReuseCanvas = previousEntry && previousEntry.canvas.width >= requiredWidth && previousEntry.canvas.height >= requiredHeight && previousEntry.bytes <= requiredWidth * requiredHeight * 8;
      const canvas = canReuseCanvas ? previousEntry.canvas : createCanvas(requiredWidth, requiredHeight);
      if (canReuseCanvas) this.diagnostics.textureCanvasReuses++;
      else this.diagnostics.textureCanvasAllocations++;
      const context = canvas.getContext('2d');
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, -left * pixelRatio, -top * pixelRatio);
      const coordinates = new Float64Array(shape.coordinates);
      const color = FRUIT_COLORS[level];
      traceOutline(context, coordinates);
      // Transparent sprite margins reveal this membrane, so it must remain light.
      const bubbleFill = context.createRadialGradient(0, 0, shape.radius * .65, 0, 0, shape.radius * 1.1);
      bubbleFill.addColorStop(0, '#ffffff00');
      bubbleFill.addColorStop(.72, color + '0c');
      bubbleFill.addColorStop(1, '#ffffff38');
      context.fillStyle = bubbleFill;
      context.fill();
      context.save();
      traceOutline(context, coordinates);
      context.clip();
      if (this.isReady && this.sprites[level]) {
        if (level < 4) {
          // Small fruit keep the real membrane outline. Their interior texture
          // needs only one affine draw instead of eighteen tiny triangle clips.
          const spriteWidth = shape.right - shape.left, spriteHeight = shape.bottom - shape.top;
          context.drawImage(this.sprites[level], shape.left - spriteWidth * .018, shape.top - spriteHeight * .018, spriteWidth * 1.036, spriteHeight * 1.036);
          this.diagnostics.compactSpriteDraws++;
        } else this.paintWarpedSprite(context, this.sprites[level], coordinates);
      } else {
        this.paintFallback(context, shape, color);
      }
      context.restore();
      traceOutline(context, coordinates);
      const bubbleRim = context.createLinearGradient(shape.left, shape.top, shape.right, shape.bottom);
      bubbleRim.addColorStop(0, '#ffffffed');
      bubbleRim.addColorStop(.35, '#ffffff32');
      bubbleRim.addColorStop(.64, '#b0dbc332');
      bubbleRim.addColorStop(.88, '#ffffffcc');
      bubbleRim.addColorStop(1, '#ffffff55');
      context.strokeStyle = bubbleRim;
      context.lineWidth = clamp(shape.radius * 0.014, 0.65, 1.35);
      context.stroke();
      this.diagnostics.textureRebuilds++;
      return { canvas, level, coordinates, pixelRatio, left, top, bytes: canvas.width * canvas.height * 4 };
    }

    paintWarpedSprite(context, sprite, coordinates) {
      const count = coordinates.length / 2;
      const half = sprite.width / 2;
      for (let index = 0; index < count; index++) {
        const next = (index + 1) % count;
        const angle = index / count * TAU;
        const nextAngle = (index + 1) / count * TAU;
        const sourceX1 = Math.cos(angle) * half;
        const sourceY1 = Math.sin(angle) * half;
        const sourceX2 = Math.cos(nextAngle) * half;
        const sourceY2 = Math.sin(nextAngle) * half;
        const determinant = sourceX1 * sourceY2 - sourceY1 * sourceX2;
        if (Math.abs(determinant) < 0.0001) continue;
        // Extend under the outer clip to cover curved edges and subpixel triangle seams.
        const rimScale = 1.035;
        const destinationX1 = coordinates[index * 2] * rimScale;
        const destinationY1 = coordinates[index * 2 + 1] * rimScale;
        const destinationX2 = coordinates[next * 2] * rimScale;
        const destinationY2 = coordinates[next * 2 + 1] * rimScale;
        const horizontalX = (destinationX1 * sourceY2 - destinationX2 * sourceY1) / determinant;
        const horizontalY = (destinationY1 * sourceY2 - destinationY2 * sourceY1) / determinant;
        const verticalX = (destinationX2 * sourceX1 - destinationX1 * sourceX2) / determinant;
        const verticalY = (destinationY2 * sourceX1 - destinationY1 * sourceX2) / determinant;
        const triangleCenterX = (destinationX1 + destinationX2) / 3;
        const triangleCenterY = (destinationY1 + destinationY2) / 3;
        context.save();
        context.beginPath();
        for (let corner = 0; corner < 3; corner++) {
          const x = corner === 0 ? 0 : corner === 1 ? destinationX1 : destinationX2;
          const y = corner === 0 ? 0 : corner === 1 ? destinationY1 : destinationY2;
          const outwardX = x - triangleCenterX;
          const outwardY = y - triangleCenterY;
          const distance = Math.hypot(outwardX, outwardY) || 1;
          const clipX = x + outwardX / distance * 0.65;
          const clipY = y + outwardY / distance * 0.65;
          if (corner === 0) context.moveTo(clipX, clipY);
          else context.lineTo(clipX, clipY);
        }
        context.closePath();
        context.clip();
        context.transform(horizontalX, horizontalY, verticalX, verticalY, -half * (horizontalX + verticalX), -half * (horizontalY + verticalY));
        context.drawImage(sprite, 0, 0);
        context.restore();
        this.diagnostics.trianglesDrawn++;
      }
    }

    paintFallback(context, shape, color) {
      const fill = context.createRadialGradient(-shape.radius * 0.3, -shape.radius * 0.4, 0, 0, 0, shape.radius * 1.5);
      fill.addColorStop(0, '#fff4d4');
      fill.addColorStop(0.38, color);
      fill.addColorStop(1, color + '55');
      context.fillStyle = fill;
      context.fillRect(shape.left - 2, shape.top - 2, shape.right - shape.left + 4, shape.bottom - shape.top + 4);
    }

    paintFace(context, body, shape, options) {
      const radius = shape.radius;
      const widthRatio = clamp((shape.right - shape.left) / (radius * 2), 0.5, 1.6);
      const heightRatio = clamp((shape.bottom - shape.top) / (radius * 2), 0.45, 1.4);
      const pressure = clamp((1 - heightRatio) * 1.6 + Math.max(0, widthRatio - 1) * 0.4, 0, 1);
      const liquid = clamp(options.liquid || 0, 0, 1);
      const time = Number.isFinite(options.time) ? options.time : 0;
      const numericId = Number(body.id);
      const seed = Number.isFinite(numericId) ? numericId * 0.731 : (body.level + 1) * 0.919;
      const blinkInterval = 4.1 + ((Math.abs(seed) * 7) % 1) * 2.1;
      const blinkPhase = ((time + seed) % blinkInterval + blinkInterval) % blinkInterval;
      const blink = !options.reducedMotion && blinkPhase < 0.13 ? Math.sin(blinkPhase / 0.13 * Math.PI) : 0;
      const look = Number.isFinite(options.aimX) ? clamp((options.aimX - shape.centerX) / (radius * 5), -1, 1) : 0;
      const eyeSpacing = radius * 0.24 * Math.sqrt(widthRatio);
      const eyeRadius = clamp(radius * 0.063, 1.1, 7);
      const faceY = radius * 0.1 * heightRatio;
      const gazeX = look * radius * 0.033;
      const isSquinting = pressure > 0.22 || blink > 0.6 || (body.impactExcitation || 0) > .28 || body.mergingUntil > 0 && body.age < .08;
      context.save();
      context.translate(gazeX, faceY);
      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.fillStyle = '#333628';
      context.strokeStyle = '#333628';
      context.lineWidth = clamp(radius * 0.03, 1, 2.8);
      for (const direction of [-1, 1]) {
        const eyeX = direction * eyeSpacing;
        context.fillStyle = '#fff9e9';
        context.beginPath();
        context.ellipse(eyeX, 0, eyeRadius * 1.65, eyeRadius * 1.9, 0, 0, TAU);
        context.fill();
        context.fillStyle = '#333628';
        if (isSquinting) {
          context.beginPath();
          context.moveTo(eyeX - eyeRadius * 1.2, 0);
          context.quadraticCurveTo(eyeX, -eyeRadius * (0.8 + pressure), eyeX + eyeRadius * 1.2, 0);
          context.stroke();
        } else {
          const eyeHeight = Math.max(0.18, 1 - blink * 0.9 - liquid * 0.18);
          context.beginPath();
          context.ellipse(eyeX + look * eyeRadius * .3, 0, eyeRadius, eyeRadius * 1.15 * eyeHeight, 0, 0, TAU);
          context.fill();
          context.fillStyle = '#ffffff';
          context.beginPath();
          context.arc(eyeX + eyeRadius * .1, -eyeRadius * .35, eyeRadius * .24, 0, TAU);
          context.fill();
        }
      }
      const mouthY = radius * 0.18 * Math.sqrt(heightRatio);
      const smileWidth = radius * (0.105 + liquid * 0.024);
      context.beginPath();
      if (body.vy > 350 && (body.impactExcitation || 0) < .1) {
        context.ellipse(0, mouthY, radius * .055, radius * .082, 0, 0, TAU);
        context.fillStyle = '#514432'; context.fill();
      } else {
      context.moveTo(-smileWidth, mouthY);
      context.bezierCurveTo(-smileWidth * 0.5, mouthY + radius * 0.065, smileWidth * 0.6, mouthY + radius * (0.066 - pressure * 0.025), smileWidth, mouthY - radius * liquid * 0.018);
      context.stroke();
      }
      if (radius > 22) {
        context.fillStyle = '#e88d7b36';
        for (const direction of [-1, 1]) {
          context.beginPath();
          context.ellipse(direction * eyeSpacing * 1.35, radius * 0.072, radius * 0.071, radius * 0.036, direction * 0.1, 0, TAU);
          context.fill();
        }
      }
      context.restore();
    }

    drawAt(context, level, x, y, radius, options = {}) {
      if (!Number.isFinite(radius) || radius <= 0) return;
      const points = Array.from({ length: ICON_POINT_COUNT }, (_, index) => {
        const angle = index / ICON_POINT_COUNT * TAU;
        return { x: x + Math.cos(angle) * radius, y: y + Math.sin(angle) * radius };
      });
      const body = { id: `icon:${level}:${radius.toFixed(2)}`, level, r: radius, currentRadius: radius, x, y, points };
      this.paint(context, body, options);
    }

    drawIcon(canvas, level, options = {}) {
      const context = canvas.getContext('2d');
      context.save();
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, canvas.width, canvas.height);
      this.drawAt(context, level, canvas.width / 2, canvas.height / 2, Math.min(canvas.width, canvas.height) * 0.425, { reducedMotion: true, ...options });
      context.restore();
    }

    removeCacheEntry(key, isEviction) {
      const entry = this.cache.get(key);
      if (!entry) return;
      this.diagnostics.cacheBytes -= entry.bytes;
      this.cache.delete(key);
      if (isEviction) this.diagnostics.cacheEvictions++;
    }

    trimCache() {
      while (this.cache.size > MAX_CACHE_ENTRIES || (this.diagnostics.cacheBytes > MAX_CACHE_BYTES && this.cache.size > 1)) {
        this.removeCacheEntry(this.cache.keys().next().value, true);
      }
      this.diagnostics.cacheEntries = this.cache.size;
    }

    retainBodies(bodies) {
      const liveKeys = new Set(bodies.map(body => this.getCacheKey(body)));
      for (const key of this.cache.keys()) {
        if (/^body:\d+$/.test(key) && !liveKeys.has(key)) this.removeCacheEntry(key, false);
      }
      this.diagnostics.cacheEntries = this.cache.size;
    }

    clearCache() {
      this.cache.clear();
      this.diagnostics.cacheEntries = 0;
      this.diagnostics.cacheBytes = 0;
    }

    getDiagnostics() {
      return { ...this.diagnostics, isReady: this.isReady, assetError: this.assetError, assetWarnings: [...this.assetWarnings] };
    }
  }

  window.FruitPainter = FruitPainter;
})();
