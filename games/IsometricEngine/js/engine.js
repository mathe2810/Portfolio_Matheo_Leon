import { gameState, uiElements, tiles, objectTypes, TILE_W, TILE_H } from './state.js';
import { projectPoint, unprojectPoint, shadeColor, findPathAStar } from './math.js';

/**
 * GÉNÉRATION DU CACHE DES TUILES DE TERRAIN TEXTURÉES
 */
export function preRenderMapCache() {
  if (!gameState.testTextureImage) return;

  gameState.tileCache = {};
  const gridW = gameState.WORLD_W + 1;
  const bufferW = TILE_W;
  const bufferH = TILE_H + 120; 
  const offsetY = 50; 

  for (let y = 0; y < gameState.WORLD_H; y++) {
    for (let x = 0; x < gameState.WORLD_W; x++) {
      const idx = y * gameState.WORLD_W + x;
      const tileId = gameState.mapData[idx];
      const tile = tileId >= 0 ? tiles[tileId] : null;

      if (tileId !== 10 || !tile) continue;

      const elevTop    = gameState.elevationGrid[y * gridW + x] || 0;
      const elevRight  = gameState.elevationGrid[y * gridW + (x + 1)] || 0;
      const elevBottom = gameState.elevationGrid[(y + 1) * gridW + (x + 1)] || 0;
      const elevLeft   = gameState.elevationGrid[(y + 1) * gridW + x] || 0;

      const slopeKey = `${tileId}_${elevTop}_${elevRight}_${elevBottom}_${elevLeft}`;

      if (gameState.tileCache[slopeKey]) continue;

      const offCanvas = document.createElement('canvas');
      offCanvas.width = bufferW;
      offCanvas.height = bufferH;
      const offCtx = offCanvas.getContext('2d');

      const minElev = Math.min(elevTop, elevRight, elevBottom, elevLeft);

      const localTop    = { x: TILE_W / 2, y: offsetY - (elevTop - minElev) };
      const localRight  = { x: TILE_W,     y: offsetY + (TILE_H / 2) - (elevRight - minElev) };
      const localBottom = { x: TILE_W / 2, y: offsetY + TILE_H - (elevBottom - minElev) };
      const localLeft   = { x: 0,          y: offsetY + (TILE_H / 2) - (elevLeft - minElev) };

      const tw = gameState.testTextureImage.width;
      const th = gameState.testTextureImage.height;
      const uTop = tw / 2, vTop = 0; const uRight = tw, vRight = th / 2;
      const uBottom = tw / 2, vBottom = th; const uLeft = 0, vLeft = th / 2;

      offCtx.fillStyle = tile.color;
      offCtx.beginPath();
      offCtx.moveTo(localTop.x, localTop.y);
      offCtx.lineTo(localRight.x, localRight.y);
      offCtx.lineTo(localBottom.x, localBottom.y);
      offCtx.lineTo(localLeft.x, localLeft.y);
      offCtx.closePath();
      offCtx.fill();

      drawTextureTriangle(offCtx, gameState.testTextureImage, localTop.x, localTop.y, localRight.x, localRight.y, localLeft.x, localLeft.y, uTop, vTop, uRight, vRight, uLeft, vLeft, true);
      drawTextureTriangle(offCtx, gameState.testTextureImage, localBottom.x, localBottom.y, localRight.x, localRight.y, localLeft.x, localLeft.y, uBottom, vBottom, uRight, vRight, uLeft, vLeft, false);

      const slope = (elevTop + elevLeft) - (elevBottom + elevRight);
      if (Math.abs(slope) > 2) {
        offCtx.save(); offCtx.beginPath(); offCtx.moveTo(localTop.x, localTop.y);
        offCtx.lineTo(localRight.x, localRight.y); offCtx.lineTo(localBottom.x, localBottom.y);
        offCtx.lineTo(localLeft.x, localLeft.y); offCtx.closePath(); offCtx.clip();
        offCtx.globalCompositeOperation = 'multiply';
        if (slope > 2) offCtx.fillStyle = 'rgba(255, 255, 255, 0.15)'; 
        else { const darkness = Math.min(0.4, Math.abs(slope) * 0.006); offCtx.fillStyle = `rgba(0, 0, 0, ${darkness})`; }
        offCtx.fill(); offCtx.restore();
      }

      gameState.tileCache[slopeKey] = offCanvas;
    }
  }
}

export function drawTextureTriangle(ctx, img, x0, y0, x1, y1, x2, y2, u0, v0, u1, v1, u2, v2, isUpperTriangle = true) {
  ctx.save();
  const bleed = 0.7; let bx1 = x1, by1 = y1; let bx2 = x2, by2 = y2;
  if (isUpperTriangle) { by1 += bleed; by2 += bleed; } else { by1 -= bleed; by2 -= bleed; }

  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(bx1, by1); ctx.lineTo(bx2, by2); ctx.closePath(); ctx.clip();

  const delta = u0 * (v1 - v2) + u1 * (v2 - v0) + u2 * (v0 - v1);
  if (delta === 0) { ctx.restore(); return; }

  const a = (x0 * (v1 - v2) + x1 * (v2 - v0) + x2 * (v0 - v1)) / delta;
  const c = (x0 * (u2 - u1) + x1 * (u0 - u2) + x2 * (u1 - u0)) / delta;
  const e = (x0 * (u1 * v2 - u2 * v1) + x1 * (u2 * v0 - u0 * v2) + x2 * (u0 * v1 - u1 * v0)) / delta;
  const b = (y0 * (v1 - v2) + y1 * (v2 - v0) + y2 * (v0 - v1)) / delta;
  const d = (y0 * (u2 - u1) + y1 * (u0 - u2) + y2 * (u1 - u0)) / delta;
  const f = (y0 * (u1 * v2 - u2 * v1) + y1 * (u2 * v0 - u0 * v2) + y2 * (u0 * v1 - u1 * v0)) / delta;

  ctx.transform(a, b, c, d, e, f); ctx.drawImage(img, 0, 0); ctx.restore();

  if (gameState.tilePattern) {
    ctx.save(); ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(bx1, by1); ctx.lineTo(bx2, by2); ctx.closePath(); ctx.clip();
    ctx.transform(a, b, c, d, e, f);
    try {
      ctx.strokeStyle = gameState.tilePattern;
      const matrixScale = Math.sqrt(a * a + b * b + c * c + d * d) || 1;
      ctx.lineWidth = 0.4 / matrixScale;
      ctx.beginPath(); ctx.moveTo(bx1, by1); ctx.lineTo(bx2, by2); ctx.stroke();
    } catch(err) {}
    ctx.restore();
  }
}

export function drawIsometric3DBuilding(x, y, tileId, height) {
  const gridW = gameState.WORLD_W + 1; const tile = tiles[tileId] || tiles[0]; const baseColor = tile.color;
  if (height <= 0) return;
  
  const elevTop    = gameState.elevationGrid[y * gridW + x] || 0;
  const elevRight  = gameState.elevationGrid[y * gridW + (x + 1)] || 0;
  const elevBottom = gameState.elevationGrid[(y + 1) * gridW + (x + 1)] || 0;
  const elevLeft   = gameState.elevationGrid[(y + 1) * gridW + x] || 0;
  const baseElevation = (elevTop + elevRight + elevBottom + elevLeft) / 4;

  const ptRight  = projectPoint(x + 1, y, elevRight);
  const ptBottom = projectPoint(x + 1, y + 1, elevBottom);
  const ptLeft   = projectPoint(x, y + 1, elevLeft);

  const flatTop    = projectPoint(x, y, baseElevation);
  const flatRight  = projectPoint(x + 1, y, baseElevation);
  const flatBottom = projectPoint(x + 1, y + 1, baseElevation);
  const flatLeft   = projectPoint(x, y + 1, baseElevation);

  const h = height * 15 * gameState.zoom;
  const topTop    = { x: flatTop.x,    y: flatTop.y - h };
  const topRight  = { x: flatRight.x,  y: flatRight.y - h };
  const topBottom = { x: flatBottom.x, y: flatBottom.y - h };
  const topLeft   = { x: flatLeft.x,   y: flatLeft.y - h };

  const rightColor = shadeColor(baseColor, -0.2);
  uiElements.ctx.fillStyle = rightColor; uiElements.ctx.beginPath();
  uiElements.ctx.moveTo(ptRight.x, ptRight.y); uiElements.ctx.lineTo(topRight.x, topRight.y);
  uiElements.ctx.lineTo(topBottom.x, topBottom.y); uiElements.ctx.lineTo(ptBottom.x, ptBottom.y);
  uiElements.ctx.closePath(); uiElements.ctx.fill(); uiElements.ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  uiElements.ctx.lineWidth = 1; uiElements.ctx.stroke();

  const leftColor = shadeColor(baseColor, -0.4);
  uiElements.ctx.fillStyle = leftColor; uiElements.ctx.beginPath();
  uiElements.ctx.moveTo(ptLeft.x, ptLeft.y); uiElements.ctx.lineTo(topLeft.x, topLeft.y);
  uiElements.ctx.lineTo(topBottom.x, topBottom.y); uiElements.ctx.lineTo(ptBottom.x, ptBottom.y);
  uiElements.ctx.closePath(); uiElements.ctx.fill(); uiElements.ctx.stroke();

  const lightColor = shadeColor(baseColor, 0.2);
  uiElements.ctx.fillStyle = lightColor; uiElements.ctx.beginPath();
  uiElements.ctx.moveTo(topTop.x, topTop.y); uiElements.ctx.lineTo(topRight.x, topRight.y);
  uiElements.ctx.lineTo(topBottom.x, topBottom.y); uiElements.ctx.lineTo(topLeft.x, topLeft.y);
  uiElements.ctx.closePath(); uiElements.ctx.fill(); uiElements.ctx.stroke();
}

export function renderPerformanceHUD() {
  if (!gameState.lastCalledTime) { gameState.lastCalledTime = performance.now(); gameState.fps = 0; } 
  else {
    let delta = (performance.now() - gameState.lastCalledTime) / 1000; gameState.lastCalledTime = performance.now();
    let currentFps = Math.round(1 / delta); gameState.fpsDisplayInterval++;
    if (gameState.fpsDisplayInterval >= 5) { gameState.fps = currentFps; gameState.fpsDisplayInterval = 0; }
  }
  uiElements.ctx.save(); uiElements.ctx.setTransform(1, 0, 0, 1, 0, 0);
  uiElements.ctx.fillStyle = "rgba(18, 14, 10, 0.85)"; uiElements.ctx.strokeStyle = "#8b7355"; uiElements.ctx.lineWidth = 1.5;
  uiElements.ctx.fillRect(15, 15, 190, 85); uiElements.ctx.strokeRect(15, 15, 190, 85);
  uiElements.ctx.font = "bold 12px monospace"; uiElements.ctx.textBaseline = "top";

  uiElements.ctx.fillStyle = gameState.fps < 30 ? "#ff4a4a" : gameState.fps < 55 ? "#ffcc00" : "#00ff66";
  uiElements.ctx.fillText(`⚡ ${gameState.fps} FPS`, 25, 23);
  uiElements.ctx.fillStyle = gameState.frameTime > 16 ? "#ff7c7c" : "#e2d1b7";
  uiElements.ctx.fillText(`⏱️ Frame: ${gameState.frameTime.toFixed(2)} ms`, 25, 43);
  uiElements.ctx.fillStyle = "#c9a961"; uiElements.ctx.fillText(`🧱 Tuiles: ${gameState.renderedTilesCount}`, 25, 63);
  uiElements.ctx.restore();
}

export function draw() {
  const startTime = performance.now();
  uiElements.ctx.save(); uiElements.ctx.setTransform(1, 0, 0, 1, 0, 0);
  uiElements.ctx.clearRect(0, 0, uiElements.canvas.width, uiElements.canvas.height); uiElements.ctx.restore();
  uiElements.ctx.setTransform(gameState.scale, 0, 0, gameState.scale, 0, 0);

  const tl = unprojectPoint(0, 0); const tr = unprojectPoint(uiElements.canvas.width, 0);
  const bl = unprojectPoint(0, uiElements.canvas.height); const br = unprojectPoint(uiElements.canvas.width, uiElements.canvas.height);
  const padding = 4;
  const minX = Math.max(0, Math.floor(Math.min(tl.x, tr.x, bl.x, br.x) - padding));
  const maxX = Math.min(gameState.WORLD_W - 1, Math.ceil(Math.max(tl.x, tr.x, bl.x, br.x) + padding));
  const minY = Math.max(0, Math.floor(Math.min(tl.y, tr.y, bl.y, br.y) - padding));
  const maxY = Math.min(gameState.WORLD_H - 1, Math.ceil(Math.max(tl.y, tr.y, bl.y, br.y) + padding));
  
  let counter = 0;
  const gridW = gameState.WORLD_W + 1;

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      counter++;
      const idx = y * gameState.WORLD_W + x;
      const tileId = gameState.mapData[idx]; const tile = tileId >= 0 ? tiles[tileId] : null;
      const elevTop    = gameState.elevationGrid[y * gridW + x] || 0;
      const elevRight  = gameState.elevationGrid[y * gridW + (x + 1)] || 0;
      const elevBottom = gameState.elevationGrid[(y + 1) * gridW + (x + 1)] || 0;
      const elevLeft   = gameState.elevationGrid[(y + 1) * gridW + x] || 0;

      const ptTop    = projectPoint(x, y, elevTop); const ptRight  = projectPoint(x + 1, y, elevRight);
      const ptBottom = projectPoint(x + 1, y + 1, elevBottom); const ptLeft   = projectPoint(x, y + 1, elevLeft);

      if (tile) {
        if (tileId === 10 && gameState.tileCache) {
          const slopeKey = `${tileId}_${elevTop}_${elevRight}_${elevBottom}_${elevLeft}`;
          const cachedCanvas = gameState.tileCache[slopeKey];

          if (cachedCanvas) {
            const minElev = Math.min(elevTop, elevRight, elevBottom, elevLeft);
            const ptMin = projectPoint(x, y, minElev);
            
            const drawX = ptMin.x - ((cachedCanvas.width * gameState.zoom) / 2);
            const drawY = ptMin.y - (50 * gameState.zoom);

            uiElements.ctx.drawImage(
              cachedCanvas, 
              drawX, 
              drawY, 
              cachedCanvas.width * gameState.zoom, 
              cachedCanvas.height * gameState.zoom
            );
          } else {
            uiElements.ctx.fillStyle = tile.color; uiElements.ctx.beginPath();
            uiElements.ctx.moveTo(ptTop.x, ptTop.y); uiElements.ctx.lineTo(ptRight.x, ptRight.y);
            uiElements.ctx.lineTo(ptBottom.x, ptBottom.y); uiElements.ctx.lineTo(ptLeft.x, ptLeft.y);
            uiElements.ctx.closePath(); uiElements.ctx.fill();
          }
        } else {
          const slope = (elevTop + elevLeft) - (elevBottom + elevRight);
          let fillColor = tile.color;
          if (slope > 2) fillColor = shadeColor(tile.color, 0.15); 
          else if (slope < -2) { const darkness = Math.max(-0.4, slope * 0.006); fillColor = shadeColor(tile.color, darkness); }
          uiElements.ctx.fillStyle = fillColor; uiElements.ctx.beginPath();
          uiElements.ctx.moveTo(ptTop.x, ptTop.y); uiElements.ctx.lineTo(ptRight.x, ptRight.y);
          uiElements.ctx.lineTo(ptBottom.x, ptBottom.y); uiElements.ctx.lineTo(ptLeft.x, ptLeft.y);
          uiElements.ctx.closePath(); uiElements.ctx.fill();
        }

        uiElements.ctx.beginPath();
        uiElements.ctx.moveTo(ptTop.x, ptTop.y); uiElements.ctx.lineTo(ptRight.x, ptRight.y);
        uiElements.ctx.lineTo(ptBottom.x, ptBottom.y); uiElements.ctx.lineTo(ptLeft.x, ptLeft.y);
        uiElements.ctx.closePath();
        uiElements.ctx.strokeStyle = 'rgba(0,0,0,0.15)'; uiElements.ctx.lineWidth = 1; uiElements.ctx.stroke();

        if (tile.height > 0) drawIsometric3DBuilding(x, y, tileId, tile.height);
      } else {
        uiElements.ctx.fillStyle = '#1a1410'; uiElements.ctx.beginPath();
        uiElements.ctx.moveTo(ptTop.x, ptTop.y); uiElements.ctx.lineTo(ptRight.x, ptRight.y);
        uiElements.ctx.lineTo(ptBottom.x, ptBottom.y); uiElements.ctx.lineTo(ptLeft.x, ptLeft.y);
        uiElements.ctx.closePath(); uiElements.ctx.fill();
      }

      const obj = gameState.mapObjects[idx];
      if (obj && objectTypes[obj.type]) {
        const typeCfg = objectTypes[obj.type];
        const elevAverage = (elevTop + elevRight + elevBottom + elevLeft) / 4;
        const centerPt = projectPoint(x + 0.5, y + 0.5, elevAverage);
        const objX = centerPt.x + (obj.offsetX * gameState.zoom); const objY = centerPt.y + (obj.offsetY * gameState.zoom);
        
        uiElements.ctx.save(); uiElements.ctx.translate(objX, objY);
        const diffX = (elevRight + elevBottom) - (elevTop + elevLeft); const diffY = (elevBottom + elevLeft) - (elevTop + origin);
        
        if (typeCfg.alignWithSlope) {
          const angleRotation = Math.atan2(diffX * (54 / 2), 94) * 0.45; uiElements.ctx.rotate(angleRotation);
          const scaleY = 1 - Math.min(0.25, Math.abs(diffY) * 0.008); uiElements.ctx.scale(1, scaleY);
        } else {
          uiElements.ctx.save(); uiElements.ctx.scale(1.2, 0.5);
          uiElements.ctx.fillStyle = "rgba(0, 0, 0, 0.25)"; uiElements.ctx.beginPath(); uiElements.ctx.arc(0, 0, obj.size * gameState.zoom, 0, Math.PI * 2);
          uiElements.ctx.fill(); uiElements.ctx.restore();
        }
        typeCfg.draw(uiElements.ctx, obj.size * gameState.zoom); uiElements.ctx.restore();
      }
    }
  }
  gameState.renderedTilesCount = counter;

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const idx = y * gameState.WORLD_W + x;
      if (idx === gameState.start || idx === gameState.goal) {
        const elevTop    = gameState.elevationGrid[y * gridW + x] || 0;
        const elevRight  = gameState.elevationGrid[y * gridW + (x + 1)] || 0;
        const elevBottom = gameState.elevationGrid[(y + 1) * gridW + (x + 1)] || 0;
        const elevLeft   = gameState.elevationGrid[(y + 1) * gridW + x] || 0;

        const ptTop    = projectPoint(x, y, elevTop); const ptRight  = projectPoint(x + 1, y, elevRight);
        const ptBottom = projectPoint(x + 1, y + 1, elevBottom); const ptLeft   = projectPoint(x, y + 1, elevLeft);

        uiElements.ctx.fillStyle = (idx === gameState.start) ? 'rgba(0,250,0,0.5)' : 'rgba(250,0,0,0.5)';
        uiElements.ctx.beginPath(); uiElements.ctx.moveTo(ptTop.x, ptTop.y); uiElements.ctx.lineTo(ptRight.x, ptRight.y);
        uiElements.ctx.lineTo(ptBottom.x, ptBottom.y); uiElements.ctx.lineTo(ptLeft.x, ptLeft.y);
        uiElements.ctx.closePath(); uiElements.ctx.fill();
        uiElements.ctx.strokeStyle = (idx === gameState.start) ? '#0f0' : '#f00'; uiElements.ctx.lineWidth = 1.5; uiElements.ctx.stroke();
      }
    }
  }
  
  if (gameState.path && gameState.path.length) {
    for (let i = 0; i < gameState.path.length; i++) {
      const p = gameState.path[i]; const x = p % gameState.WORLD_W; const y = Math.floor(p / gameState.WORLD_W);
      if (x < minX || x > maxX || y < minY || y > maxY) continue;
      
      const elevTop    = gameState.elevationGrid[y * gridW + x] || 0;
      const elevRight  = gameState.elevationGrid[y * gridW + (x + 1)] || 0;
      const elevBottom = gameState.elevationGrid[(y + 1) * gridW + (x + 1)] || 0;
      const elevLeft   = gameState.elevationGrid[(y + 1) * gridW + x] || 0;

      const ptTop    = projectPoint(x, y, elevTop); const ptRight  = projectPoint(x + 1, y, elevRight);
      const ptBottom = projectPoint(x + 1, y + 1, elevBottom); const ptLeft   = projectPoint(x, y + 1, elevLeft);

      uiElements.ctx.fillStyle = 'rgba(212,175,55,0.4)'; uiElements.ctx.beginPath();
      uiElements.ctx.moveTo(ptTop.x, ptTop.y); uiElements.ctx.lineTo(ptRight.x, ptRight.y);
      uiElements.ctx.lineTo(ptBottom.x, ptBottom.y); uiElements.ctx.lineTo(ptLeft.x, ptLeft.y);
      uiElements.ctx.closePath(); uiElements.ctx.fill();
    }
  }
  gameState.frameTime = performance.now() - startTime; renderPerformanceHUD();
}