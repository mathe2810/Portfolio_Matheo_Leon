import { gameState, uiElements, tiles, BASE_WIDTH, BASE_HEIGHT } from './state.js';
import { findPathAStar } from './math.js';
import { initInputEvents, renderTilesPalette } from './input.js';
// CORRECTION : On importe maintenant preRenderMapCache depuis engine.js
import { draw, preRenderMapCache } from './engine.js';

export function triggerRender() { requestAnimationFrame(draw); }

window.toggleSection = function(sectionId) {
  const section = document.getElementById(sectionId);
  if (section) section.classList.toggle('collapsed');
};

export function isMapOnlyMode() { return gameState.mapOnlyMode || document.body.classList.contains('map-only'); }

export async function toggleMapOnlyMode() {
  gameState.mapMode = !gameState.mapOnlyMode;
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
  
  preRenderMapCache(); 
  resizeCanvas(); triggerRender(); updateInfo(); renderTilesPalette();
});

document.getElementById('btnRegenerate').addEventListener('click', () => {
  const obstacleProb = parseInt(document.getElementById('inputObstacleProb').value, 10);
  if (isNaN(obstacleProb)) return alert('Valeur invalide');
  gameState.mapData = generateRandomMap(gameState.WORLD_W, gameState.WORLD_H, obstacleProb);
  gameState.elevationGrid = generateElevation(gameState.WORLD_W, gameState.WORLD_H);
  generateMapObjects(); gameState.start = -1; gameState.goal = -1; gameState.path = [];
  
  preRenderMapCache(); 
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
    preRenderMapCache(); 
    triggerRender();
  };

  resizeCanvas(); initInputEvents(uiElements.canvas); renderTilesPalette(); updateInfo();
});