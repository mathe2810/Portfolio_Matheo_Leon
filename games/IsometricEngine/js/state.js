// ==========================================
// 1. CONFIGURATION ET CONSTANTES DU JEU
// ==========================================

export const tiles = {
  0: { name: "Herbe", color: "#7cb342", height: 0 },
  1: { name: "Route1", color: "#a67c52", height: 0 },
  2: { name: "Route2", color: "#8d6644", height: 0 },
  3: { name: "Route3", color: "#9b7653", height: 0 },
  4: { name: "Route4", color: "#a6825a", height: 0 },
  5: { name: "Coin1", color: "#a59a73", height: 0 },
  6: { name: "Coin2", color: "#9d9168", height: 0 },
  7: { name: "Coin3", color: "#8b8659", height: 0 },
  8: { name: "Coin4", color: "#7d7a4e", height: 0 },
  9: { name: "Eau", color: "#4a90e2", height: 0 },
  10: { name: "Pierre", color: "#8888aa", height: 0 },
  11: { name: "Arbre", color: "#3d7c37", height: 0 },
  12: { name: "Maison", color: "#c84c3c", height: 0 },
  13: { name: "Tours", color: "#696969", height: 0 },
  14: { name: "Décor", color: "#9b7653", height: 0 }
};

export const objectTypes = {
  'grass_tuft': {
    name: "Touffe d'herbe",
    alignWithSlope: true,
    draw: (ctx, size) => {
      ctx.fillStyle = "#558b2f"; 
      ctx.beginPath();
      ctx.moveTo(-size, 0); ctx.lineTo(-size * 0.5, -size * 2); ctx.lineTo(0, 0);
      ctx.moveTo(0, 0); ctx.lineTo(size * 0.2, -size * 2.5); ctx.lineTo(size * 0.8, 0);
      ctx.moveTo(-size * 0.3, 0); ctx.lineTo(size * 0.5, -size * 1.5); ctx.lineTo(size, 0);
      ctx.fill();
    }
  },
  'rock': {
    name: "Petite Pierre",
    alignWithSlope: false,
    draw: (ctx, size) => {
      ctx.fillStyle = "#90a4ae";
      ctx.beginPath();
      ctx.moveTo(-size, 0); ctx.lineTo(-size * 0.8, -size * 1.2); ctx.lineTo(size * 0.2, -size * 1.5); ctx.lineTo(size, -size * 0.5); ctx.lineTo(size * 0.8, 0);
      ctx.closePath();
      ctx.fill();
      
      ctx.fillStyle = "#78909c";
      ctx.beginPath();
      ctx.moveTo(size * 0.2, -size * 1.5); ctx.lineTo(size, -size * 0.5); ctx.lineTo(size * 0.8, 0); ctx.lineTo(0, 0);
      ctx.fill();
    }
  }
};

export const BASE_WIDTH = 900;
export const BASE_HEIGHT = 800; 
export const TILE_W = 94;
export const TILE_H = 54;
export const ELEVATION_SCALE = 1.0; 
export const origin = { x: 9.5, y: 1.5 }; 

export const gameState = {
  WORLD_W: 20,
  WORLD_H: 20,
  mapData: [],
  elevationGrid: [],
  mapObjects: [],
  start: -1,
  goal: -1,
  path: [],
  scale: 1,
  zoom: 1.0,
  MIN_ZOOM: 0.3,
  MAX_ZOOM: 3.0,
  panX: 0,
  panY: 0,
  editorMode: "paint",
  elevationTool: "raise",
  selectedTileId: 0,
  isMouseDown: false,
  lastPaintedCell: -1,
  mapOnlyMode: false,
  testTextureImage: null,
  tilePattern: null,
  lastCalledTime: 0,
  fps: 0,
  frameTime: 0,
  renderedTilesCount: 0,
  fpsDisplayInterval: 0
};

export const uiElements = {
  canvas: document.getElementById('game'),
  ctx: document.getElementById('game').getContext('2d'),
  infoStartEl: document.getElementById('infoStart'),
  infoGoalEl: document.getElementById('infoGoal'),
  infoPathEl: document.getElementById('infoPath'),
  canvasContainer: document.getElementById('canvasContainer'),
  mapOnlyButton: document.getElementById('btnMapOnly')
};