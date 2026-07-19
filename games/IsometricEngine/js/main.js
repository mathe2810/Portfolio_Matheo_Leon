import { gameState, uiElements, tiles, BASE_WIDTH, BASE_HEIGHT, TILE_W, TILE_H } from './state.js';
import { findPathAStar } from './math.js';
import { initInputEvents, renderTilesPalette } from './input.js';
import { draw, drawTextureTriangle } from './engine.js';

export function triggerRender() { requestAnimationFrame(draw); }

window.toggleSection = function(sectionId) {
  const section = document.getElementById(sectionId);
  if (section) section.classList.toggle('collapsed');
};

export function isMapOnlyMode() { return gameState.mapOnlyMode || document.body.classList.contains('map-only'); }

export async function toggleMapOnlyMode() {
  gameState.mapOnlyMode = !gameState.mapOnlyMode;
  document.body.classList.toggle('map-only', gameState.mapOnlyMode);
  if (gameState.mapOnlyMode) {
    uiElements.mapOnlyButton.textContent = 'Sortir carte';
    if (!document.fullscreenElement) { try { await uiElements.canvasContainer.requestFullscreen(); } catch (err) {} }
  } else {
    uiElements.mapOnlyButton.textContent = 'Carte seule';
    if (document.fullscreenElement) { try { await document.exitFullscreen(); } catch (err) {} }
  }
  resizeCanvas(); triggerRender();
}

export function updateInfo() {
  uiElements.infoStartEl.textContent = 'Départ: ' + (gameState.start >= 0 ? gameState.start : '-');
  uiElements.infoGoalEl.textContent = 'Arrivée: ' + (gameState.goal >= 0 ? gameState.goal : '-');
  uiElements.infoPathEl.textContent = 'Longueur du chemin: ' + (gameState.path ? gameState.path.length : 0);
}

export function generateElevation(width, height) {
  const gridW = width + 1; const gridH = height + 1; const grid = new Array(gridW * gridH).fill(0);
  const numHills = Math.floor((width * height) / 30);
  for (let h = 0; h < numHills; h++) {
    const hillX = Math.floor(Math.random() * gridW); const hillY = Math.floor(Math.random() * gridH);
    const radius = 3 + Math.floor(Math.random() * 6); const maxAltitude = 20 + Math.floor(Math.random() * 40);

    for (let y = 0; y < gridH; y++) {
      for (let x = 0; x < gridW; x++) {
        const dist = Math.sqrt((x - hillX) ** 2 + (y - hillY) ** 2);
        if (dist < radius) {
          const factor = (Math.cos((dist / radius) * Math.PI) + 1) / 2; grid[y * gridW + x] += factor * maxAltitude;
        }
      }
    }
  }
  return grid;
}

export function generateMapObjects() {
  gameState.mapObjects = new Array(gameState.WORLD_W * gameState.WORLD_H).fill(null);
  for (let i = 0; i < gameState.mapData.length; i++) {
    if (gameState.mapData[i] === 0) {
      const rand = Math.random();
      if (rand < 0.28) {
        gameState.mapObjects[i] = { type: 'grass_tuft', size: 4 + Math.random() * 5, offsetX: -6 + Math.random() * 12, offsetY: -6 + Math.random() * 12 };
      } else if (rand < 0.32) {
        gameState.mapObjects[i] = { type: 'rock', size: 4 + Math.random() * 5, offsetX: -5 + Math.random() * 10, offsetY: -5 + Math.random() * 10 };
      }
    }
  }
}

export function generateRandomMap(width, height, obstaclePercent = 8) {
  const out = new Array(width * height); const blockedProb = obstaclePercent / 100;
  for (let i = 0; i < width * height; i++) {
    if (Math.random() < blockedProb) out[i] = -1; else out[i] = Math.floor(Math.random() * 11);
  }
  return out;
}

export function resizeCanvas() {
  const availW = uiElements.canvasContainer.clientWidth - 24; const availH = uiElements.canvasContainer.clientHeight - 24;
  uiElements.canvas.width = availW; uiElements.canvas.height = availH;
  gameState.scale = Math.min(availW / BASE_WIDTH, availH / BASE_HEIGHT); triggerRender();
}

/**
 * GÉNÉRATION DU CACHE DES TUILES DE TERRAIN TEXTURÉES
 */
export function preRenderMapCache() {
  if (!gameState.testTextureImage) return;

  // Initialisation propre de la structure de stockage
  gameState.tileCache = {};
  
  const gridW = gameState.WORLD_W + 1;
  
  // On dimensionne le sous-canvas par rapport à la taille théorique d'une tuile plate (TILE_W)
  // en ajoutant une marge pour accueillir les dénivelés verticaux extrêmes.
  const bufferW = TILE_W;
  const bufferH = TILE_H + 120; 
  const offsetY = 50; // Décalage vertical de sécurité appliqué en interne

  for (let y = 0; y < gameState.WORLD_H; y++) {
    for (let x = 0; x < gameState.WORLD_W; x++) {
      const idx = y * gameState.WORLD_W + x;
      const tileId = gameState.mapData[idx];
      const tile = tileId >= 0 ? tiles[tileId] : null;

      // Seul l'ID 10 exploite ce traitement matriciel lourd
      if (tileId !== 10 || !tile) continue;

      const elevTop    = gameState.elevationGrid[y * gridW + x] || 0;
      const elevRight  = gameState.elevationGrid[y * gridW + (x + 1)] || 0;
      const elevBottom = gameState.elevationGrid[(y + 1) * gridW + (x + 1)] || 0;
      const elevLeft   = gameState.elevationGrid[(y + 1) * gridW + x] || 0;

      // Définition de la clé unique décrivant fidèlement cette géométrie de pente
      const slopeKey = `${tileId}_${elevTop}_${elevRight}_${elevBottom}_${elevLeft}`;

      // Si cette configuration a déjà été traitée sur une autre case de la carte, on l'ignore
      if (gameState.tileCache[slopeKey]) continue;

      // Instanciation de notre surface volatile hors-écran
      const offCanvas = document.createElement('canvas');
      offCanvas.width = bufferW;
      offCanvas.height = bufferH;
      const offCtx = offCanvas.getContext('2d');

      const minElev = Math.min(elevTop, elevRight, elevBottom, elevLeft);

      // Reconstruction des 4 points à l'intérieur du repère du sous-canvas (0,0 en haut à gauche)
      // On soustrait l'altitude minimale locale pour ramener la tuile au ras de son buffer
      const localTop    = { x: TILE_W / 2, y: offsetY - (elevTop - minElev) };
      const localRight  = { x: TILE_W,     y: offsetY + (TILE_H / 2) - (elevRight - minElev) };
      const localBottom = { x: TILE_W / 2, y: offsetY + TILE_H - (elevBottom - minElev) };
      const localLeft   = { x: 0,          y: offsetY + (TILE_H / 2) - (elevLeft - minElev) };

      const tw = gameState.testTextureImage.width;
      const th = gameState.testTextureImage.height;
      const uTop = tw / 2, vTop = 0; const uRight = tw, vRight = th / 2;
      const uBottom = tw / 2, vBottom = th; const uLeft = 0, vLeft = th / 2;

      // Couleur de base unie sous la texture par sécurité
      offCtx.fillStyle = tile.color;
      offCtx.beginPath();
      offCtx.moveTo(localTop.x, localTop.y);
      offCtx.lineTo(localRight.x, localRight.y);
      offCtx.lineTo(localBottom.x, localBottom.y);
      offCtx.lineTo(localLeft.x, localLeft.y);
      offCtx.closePath();
      offCtx.fill();

      // Plaquage géométrique précis des textures via l'algorithme affine natif d'engine.js
      drawTextureTriangle(offCtx, gameState.testTextureImage, localTop.x, localTop.y, localRight.x, localRight.y, localLeft.x, localLeft.y, uTop, vTop, uRight, vRight, uLeft, vLeft, true);
      drawTextureTriangle(offCtx, gameState.testTextureImage, localBottom.x, localBottom.y, localRight.x, localRight.y, localLeft.x, localLeft.y, uBottom, vBottom, uRight, vRight, uLeft, vLeft, false);

      // Calcul et application des ombrages de reliefs (conservé d'engine.js)
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

      // Sauvegarde du canvas pré-généré dans le dictionnaire
      gameState.tileCache[slopeKey] = offCanvas;
    }
  }
}

// Initialisation des écouteurs d'interface graphique
document.getElementById('btnReset').addEventListener('click', () => { gameState.start = -1; gameState.goal = -1; gameState.path = []; triggerRender(); });
document.getElementById('btnCompute').addEventListener('click', () => {
  if (gameState.start < 0 || gameState.goal < 0) return alert('Définir départ et arrivée');
  gameState.path = findPathAStar(gameState.start, gameState.goal); triggerRender(); updateInfo();
});
uiElements.mapOnlyButton.addEventListener('click', toggleMapOnlyMode);

document.getElementById('btnCreateMap').addEventListener('click', () => {
  const w = parseInt(document.getElementById('inputWidth').value, 10);
  const h = parseInt(document.getElementById('inputHeight').value, 10);
  const obstacleProb = parseInt(document.getElementById('inputObstacleProb').value, 10);
  if (isNaN(w) || isNaN(h) || isNaN(obstacleProb)) return alert('Valeurs invalides');
  if (w < 5 || h < 5 || w > 100 || h > 100) return alert('Taille entre 5 et 100');
  if (obstacleProb < 0 || obstacleProb > 50) return alert('Obstacles entre 0 et 50%');
  gameState.WORLD_W = w; gameState.WORLD_H = h;
  gameState.mapData = generateRandomMap(gameState.WORLD_W, gameState.WORLD_H, obstacleProb);
  gameState.elevationGrid = generateElevation(gameState.WORLD_W, gameState.WORLD_H);
  generateMapObjects(); gameState.start = -1; gameState.goal = -1; gameState.path = [];
  
  preRenderMapCache(); // <-- Rafraîchissement du cache sur nouvelle map
  resizeCanvas(); triggerRender(); updateInfo(); renderTilesPalette();
});

document.getElementById('btnRegenerate').addEventListener('click', () => {
  const obstacleProb = parseInt(document.getElementById('inputObstacleProb').value, 10);
  if (isNaN(obstacleProb)) return alert('Valeur invalide');
  gameState.mapData = generateRandomMap(gameState.WORLD_W, gameState.WORLD_H, obstacleProb);
  gameState.elevationGrid = generateElevation(gameState.WORLD_W, gameState.WORLD_H);
  generateMapObjects(); gameState.start = -1; gameState.goal = -1; gameState.path = [];
  
  preRenderMapCache(); // <-- Rafraîchissement du cache sur régénération
  triggerRender(); updateInfo(); renderTilesPalette();
});

window.addEventListener('resize', resizeCanvas);

window.addEventListener('DOMContentLoaded', () => {
  gameState.WORLD_W = 20; gameState.WORLD_H = 20;
  gameState.mapData = generateRandomMap(gameState.WORLD_W, gameState.WORLD_H, 8);
  gameState.elevationGrid = generateElevation(gameState.WORLD_W, gameState.WORLD_H);
  generateMapObjects();
  
  gameState.testTextureImage = new Image();
  gameState.testTextureImage.src = 'tales.png';
  gameState.testTextureImage.onload = () => {
    gameState.tilePattern = uiElements.ctx.createPattern(gameState.testTextureImage, 'repeat');
    preRenderMapCache(); // <-- Pré-génération initiale dès que l'image est chargée
    triggerRender();
  };

  resizeCanvas(); initInputEvents(uiElements.canvas); renderTilesPalette(); updateInfo();
});