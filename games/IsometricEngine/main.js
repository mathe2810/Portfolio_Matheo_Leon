// ==========================================
// 1. CONFIGURATION ET CONSTANTES DU JEU
// ==========================================

const tiles = {
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

// Bibliothèque d'objets en fausse 3D adaptés au relief
const objectTypes = {
  'grass_tuft': {
    name: "Touffe d'herbe",
    alignWithSlope: true, // S'incline avec la pente de la colline
    draw: (ctx, size) => {
      // NOTE POUR PLUS TARD : Quand tu auras ton image Paint, remplace ce bloc par :
      // ctx.drawImage(monImageHerbePaint, -size, -size * 2, size * 2, size * 2);
      
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
    alignWithSlope: false, // Reste vertical, mais possède une ombre au sol
    draw: (ctx, size) => {
      // NOTE POUR PLUS TARD : Remplacer par ctx.drawImage(monImageRochePaint, -size, -size * 1.5, size * 2, size * 2);
      
      // Dessin de la roche 3D
      ctx.fillStyle = "#90a4ae";
      ctx.beginPath();
      ctx.moveTo(-size, 0);
      ctx.lineTo(-size * 0.8, -size * 1.2);
      ctx.lineTo(size * 0.2, -size * 1.5);
      ctx.lineTo(size, -size * 0.5);
      ctx.lineTo(size * 0.8, 0);
      ctx.closePath();
      ctx.fill();
      
      // Face ombragée
      ctx.fillStyle = "#78909c";
      ctx.beginPath();
      ctx.moveTo(size * 0.2, -size * 1.5);
      ctx.lineTo(size, -size * 0.5);
      ctx.lineTo(size * 0.8, 0);
      ctx.lineTo(0, 0);
      ctx.fill();
    }
  }
};

// Canvas et dimensions de base
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const BASE_WIDTH = 900;
const BASE_HEIGHT = 800; 
const TILE_W = 94;
const TILE_H = 54;

// Variables de la carte et du monde
let WORLD_W = 20; 
let WORLD_H = 20; 
let mapData = []; 
let elevationGrid = []; 
let mapObjects = [];    
let start = -1;
let goal = -1;
let path = [];
let scale = 1; 

const origin = { x: 9.5, y: 1.5 }; 
const ELEVATION_SCALE = 1.0; 

// Paramètres de l'éditeur
let editorMode = "paint"; 
let elevationTool = "raise"; 
let selectedTileId = 0;   
let isMouseDown = false; 
let lastPaintedCell = -1; 

// Éléments d'interface HTML (UI)
const infoStartEl = document.getElementById('infoStart');
const infoGoalEl = document.getElementById('infoGoal');
const infoPathEl = document.getElementById('infoPath');
const canvasContainer = document.getElementById('canvasContainer');
const mapOnlyButton = document.getElementById('btnMapOnly');
let mapOnlyMode = false;

// Caméra (Zoom et Panoramique universels)
let zoom = 1.0;
const MIN_ZOOM = 0.3; 
const MAX_ZOOM = 3.0; 
let panX = 0;
let panY = 0;

// Variables pour le suivi multi-touch / souris unifié
let activePointers = [];
let isPanning = false;
let startPanX = 0;
let startPanY = 0;
let initialPinchDistance = 0;
let initialZoom = 1;

// Appui long pour simuler le clic droit sur mobile
let touchTimer;
const LONG_PRESS_DELAY = 600; 

// SYSTEME DE PERFORMANCE & TEXTURE OPTIMISÉE
let testTextureImage = null;
let tilePattern = null; 

let lastCalledTime = 0;
let fps = 0;
let frameTime = 0;
let renderedTilesCount = 0;
let fpsDisplayInterval = 0;

testTextureImage = new Image();
testTextureImage.src = 'tales.png';
testTextureImage.onload = () => {
  tilePattern = ctx.createPattern(testTextureImage, 'repeat');
  triggerRender();
};

function triggerRender() {
  requestAnimationFrame(draw);
}

// Fonction mathématique d'affichage d'un triangle texturé déformé stabilisée
function drawTextureTriangle(ctx, img, x0, y0, x1, y1, x2, y2, u0, v0, u1, v1, u2, v2, isUpperTriangle = true) {
  ctx.save();
  
  const bleed = 0.7; 
  let bx1 = x1, by1 = y1; 
  let bx2 = x2, by2 = y2; 

  if (isUpperTriangle) {
    by1 += bleed;
    by2 += bleed;
  } else {
    by1 -= bleed;
    by2 -= bleed;
  }

  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(bx1, by1);
  ctx.lineTo(bx2, by2);
  ctx.closePath();
  ctx.clip();

  const delta = u0 * (v1 - v2) + u1 * (v2 - v0) + u2 * (v0 - v1);
  if (delta === 0) {
    ctx.restore();
    return;
  }

  const a = (x0 * (v1 - v2) + x1 * (v2 - v0) + x2 * (v0 - v1)) / delta;
  const c = (x0 * (u2 - u1) + x1 * (u0 - u2) + x2 * (u1 - u0)) / delta;
  const e = (x0 * (u1 * v2 - u2 * v1) + x1 * (u2 * v0 - u0 * v2) + x2 * (u0 * v1 - u1 * v0)) / delta;

  const b = (y0 * (v1 - v2) + y1 * (v2 - v0) + y2 * (v0 - v1)) / delta;
  const d = (y0 * (u2 - u1) + y1 * (u0 - u2) + y2 * (u1 - u0)) / delta;
  const f = (y0 * (u1 * v2 - u2 * v1) + y1 * (u2 * v0 - u0 * v2) + y2 * (u0 * v1 - u1 * v0)) / delta;

  ctx.transform(a, b, c, d, e, f);
  ctx.drawImage(img, 0, 0);
  
  ctx.restore();

  if (tilePattern) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(bx1, by1);
    ctx.lineTo(bx2, by2);
    ctx.closePath();
    ctx.clip();

    ctx.transform(a, b, c, d, e, f);
    
    try {
      ctx.strokeStyle = tilePattern; 
      const matrixScale = Math.sqrt(a * a + b * b + c * c + d * d) || 1;
      ctx.lineWidth = 0.4 / matrixScale;
      
      ctx.beginPath();
      ctx.moveTo(bx1, by1);
      ctx.lineTo(bx2, by2);
      ctx.stroke();
    } catch(err) {}
    
    ctx.restore();
  }
}

// ==========================================
// 2. UTILITAIRES DE GÉOMÉTRIE ET MATHS
// ==========================================

function projectPoint(gx, gy, elevation, origin) {
  return {
    x: ((origin.x * TILE_W) + (gx - gy) * (TILE_W / 2)) * zoom + panX,
    y: ((origin.y * TILE_H) + (gx + gy) * (TILE_H / 2) - (elevation * ELEVATION_SCALE)) * zoom + panY
  };
}

function unprojectPoint(screenX, screenY, origin) {
  const cx = (screenX / scale - panX) / zoom;
  const cy = (screenY / scale - panY) / zoom;
  
  const dx = cx - (origin.x * TILE_W);
  const dy = cy - (origin.y * TILE_H);
  
  const gx = (dx / (TILE_W / 2) + dy / (TILE_H / 2)) / 2;
  const gy = (dy / (TILE_H / 2) - dx / (TILE_W / 2)) / 2;
  
  return { x: gx, y: gy };
}

function canvasToCell(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const mx = (clientX - rect.left) / scale;
  const my = (clientY - rect.top) / scale;

  const gridW = WORLD_W + 1;
  const tiles_to_check = [];

  for (let y = 0; y < WORLD_H; y++) {
    for (let x = 0; x < WORLD_W; x++) {
      tiles_to_check.push({ x, y, depth: y + x });
    }
  }
  tiles_to_check.sort((a, b) => b.depth - a.depth);

  for (const tile of tiles_to_check) {
    const { x, y } = tile;
    const idx = y * WORLD_W + x;
    
    const elevTop    = elevationGrid[y * gridW + x] || 0;
    const elevRight  = elevationGrid[y * gridW + (x + 1)] || 0;
    const elevBottom = elevationGrid[(y + 1) * gridW + (x + 1)] || 0;
    const elevLeft   = elevationGrid[(y + 1) * gridW + x] || 0;

    const ptTop    = projectPoint(x, y, elevTop, origin);
    const ptRight  = projectPoint(x + 1, y, elevRight, origin);
    const ptBottom = projectPoint(x + 1, y + 1, elevBottom, origin);
    const ptLeft   = projectPoint(x, y + 1, elevLeft, origin);

    const pts = [ptTop, ptRight, ptBottom, ptLeft];
    let inside = false;

    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const xi = pts[i].x, yi = pts[i].y;
      const xj = pts[j].x, yj = pts[j].y;
      
      const intersect = ((yi > my) !== (yj > my))
          && (mx < (xj - xi) * (my - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    if (inside) return idx;
  }
  return -1;
}

function getDistance(p1, p2) {
  const dx = p1.clientX - p2.clientX;
  const dy = p1.clientY - p2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function shadeColor(color, percent) {
  let R = parseInt(color.substring(1, 3), 16);
  let G = parseInt(color.substring(3, 5), 16);
  let B = parseInt(color.substring(5, 7), 16);
  
  R = parseInt(R * (1 + percent));
  G = parseInt(G * (1 + percent));
  B = parseInt(B * (1 + percent));
  
  R = Math.max(0, Math.min(255, R));
  G = Math.max(0, Math.min(255, G));
  B = Math.max(0, Math.min(255, B));
  
  let RR = (R.toString(16).length === 1) ? "0" + R.toString(16) : R.toString(16);
  let GG = (G.toString(16).length === 1) ? "0" + G.toString(16) : G.toString(16);
  let BB = (B.toString(16).length === 1) ? "0" + B.toString(16) : B.toString(16);
  
  return "#" + RR + GG + BB;
}

// ==========================================
// 3. GÉNÉRATION DE TERRAIN ET RELIEF
// ==========================================

function generateElevation(width, height) {
  const gridW = width + 1;
  const gridH = height + 1;
  const grid = new Array(gridW * gridH).fill(0);
  
  const numHills = Math.floor((width * height) / 30);
  for (let h = 0; h < numHills; h++) {
    const hillX = Math.floor(Math.random() * gridW);
    const hillY = Math.floor(Math.random() * gridH);
    const radius = 3 + Math.floor(Math.random() * 6);
    const maxAltitude = 20 + Math.floor(Math.random() * 40);

    for (let y = 0; y < gridH; y++) {
      for (let x = 0; x < gridW; x++) {
        const dist = Math.sqrt((x - hillX) ** 2 + (y - hillY) ** 2);
        if (dist < radius) {
          const factor = (Math.cos((dist / radius) * Math.PI) + 1) / 2;
          grid[y * gridW + x] += factor * maxAltitude;
        }
      }
    }
  }
  return grid;
}

function generateMapObjects() {
  mapObjects = new Array(WORLD_W * WORLD_H).fill(null);
  for (let i = 0; i < mapData.length; i++) {
    if (mapData[i] === 0) {
      const rand = Math.random();
      if (rand < 0.28) { // Augmentation de la densité globale
        mapObjects[i] = {
          type: 'grass_tuft',
          size: 4 + Math.random() * 5, 
          offsetX: -6 + Math.random() * 12, 
          offsetY: -6 + Math.random() * 12
        };
      } else if (rand < 0.32) { 
        mapObjects[i] = {
          type: 'rock',
          size: 4 + Math.random() * 5,
          offsetX: -5 + Math.random() * 10,
          offsetY: -5 + Math.random() * 10
        };
      }
    }
  }
}

function getTileAverageElevation(tileX, tileY) {
  const gridW = WORLD_W + 1;
  const tLeft  = elevationGrid[tileY * gridW + tileX] || 0;
  const tRight = elevationGrid[tileY * gridW + (tileX + 1)] || 0;
  const bRight = elevationGrid[(tileY + 1) * gridW + (tileX + 1)] || 0;
  const bLeft  = elevationGrid[(tileY + 1) * gridW + tileX] || 0;
  return (tLeft + tRight + bRight + bLeft) / 4;
}

function modifyElevationAtCell(cellIndex, raise = true) {
  const x = cellIndex % WORLD_W;
  const y = Math.floor(cellIndex / WORLD_W);
  const gridW = WORLD_W + 1;
  const amount = raise ? 8 : -8; 

  const vertices = [
    { vx: x, vy: y },
    { vx: x + 1, vy: y },
    { vx: x + 1, vy: y + 1 },
    { vx: x, vy: y + 1 }
  ];

  for (const v of vertices) {
    const vIdx = v.vy * gridW + v.vx;
    if (vIdx >= 0 && vIdx < elevationGrid.length) {
      elevationGrid[vIdx] = Math.max(0, elevationGrid[vIdx] + amount); 
    }
  }

  if (start >= 0 && goal >= 0 && path.length > 0) {
    path = findPathAStar(start, goal);
  }
}

function generateRandomMap(width, height, obstaclePercent = 8) {
  const out = new Array(width * height);
  const blockedProb = obstaclePercent / 100;
  for (let i = 0; i < width * height; i++) {
    if (Math.random() < blockedProb) out[i] = -1;
    else out[i] = Math.floor(Math.random() * 11); 
  }
  return out;
}

// ==========================================
// 4. ALGORITHME DE PATHFINDING A*
// ==========================================

function heuristic(idxA, idxB) {
  const ax = idxA % WORLD_W;
  const ay = Math.floor(idxA / WORLD_W);
  const bx = idxB % WORLD_W;
  const by = Math.floor(idxB / WORLD_W);
  
  const dX = Math.abs(ax - bx);
  const dY = Math.abs(ay - by);
  
  const elevA = getTileAverageElevation(ax, ay);
  const elevB = getTileAverageElevation(bx, by);
  const dZ = Math.abs(elevA - elevB);

  return dX + dY + (dZ * 0.15);
}

function getAdjacentNeighbors(idx) {
  const x = idx % WORLD_W;
  const y = Math.floor(idx / WORLD_W);
  const neighbors = [];

  const moves = [
    [-1, 0, 1], [1, 0, 1], [0, -1, 1], [0, 1, 1],
    [-1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [1, 1, Math.SQRT2]
  ];

  const currentElev = getTileAverageElevation(x, y);

  for (const [dy, dx, geomCost] of moves) {
    const ny = y + dy;
    const nx = x + dx;

    if (nx >= 0 && nx < WORLD_W && ny >= 0 && ny < WORLD_H) {
      const neighborIdx = ny * WORLD_W + nx;
      if (mapData[neighborIdx] === -1) continue;

      const neighborElev = getTileAverageElevation(nx, ny);
      const elevDiff = neighborElev - currentElev;
      let slopePenalty = 0;
      if (elevDiff > 0) {
        slopePenalty = elevDiff * 0.15;
      }

      neighbors.push({
        to: neighborIdx,
        cost: geomCost + slopePenalty
      });
    }
  }
  return neighbors;
}

function findPathAStar(s, t) {
  const n = WORLD_W * WORLD_H;
  if (s < 0 || s >= n || t < 0 || t >= n) return [];

  const gScore = new Float32Array(n).fill(Infinity);
  const fScore = new Float32Array(n).fill(Infinity);
  const prev = new Int32Array(n).fill(-1);
  const inOpenSet = new Uint8Array(n); 
  const closedSet = new Uint8Array(n); 

  gScore[s] = 0;
  fScore[s] = heuristic(s, t);

  const openList = [s];
  inOpenSet[s] = 1;

  while (openList.length > 0) {
    let bestIndex = 0;
    let bestNode = openList[0];
    let minF = fScore[bestNode];

    for (let i = 1; i < openList.length; i++) {
      const node = openList[i];
      if (fScore[node] < minF) {
        minF = fScore[node];
        bestNode = node;
        bestIndex = i;
      }
    }

    const current = bestNode;

    if (current === t) {
      const resultPath = [];
      let cur = t;
      while (cur !== -1) {
        resultPath.push(cur);
        cur = prev[cur];
      }
      return resultPath.reverse();
    }

    openList.splice(bestIndex, 1);
    inOpenSet[current] = 0;
    closedSet[current] = 1;

    const neighbors = getAdjacentNeighbors(current);
    for (let i = 0; i < neighbors.length; i++) {
      const neighbor = neighbors[i].to;
      if (closedSet[neighbor]) continue;

      const tentativeG = gScore[current] + neighbors[i].cost;

      if (tentativeG < gScore[neighbor]) {
        prev[neighbor] = current;
        gScore[neighbor] = tentativeG;
        fScore[neighbor] = tentativeG + heuristic(neighbor, t);

        if (!inOpenSet[neighbor]) {
          openList.push(neighbor);
          inOpenSet[neighbor] = 1;
        }
      }
    }
  }
  return [];
}

// ==========================================
// 5. FONCTIONS DE DESSIN (MOTEUR RENDU)
// ==========================================

function drawIsometric3DBuilding(x, y, origin, tileId, height) {
  const gridW = WORLD_W + 1;
  const tile = tiles[tileId] || tiles[0];
  const baseColor = tile.color;
  
  if (height <= 0) return;
  
  const elevTop    = elevationGrid[y * gridW + x] || 0;
  const elevRight  = elevationGrid[y * gridW + (x + 1)] || 0;
  const elevBottom = elevationGrid[(y + 1) * gridW + (x + 1)] || 0;
  const elevLeft   = elevationGrid[(y + 1) * gridW + x] || 0;

  const baseElevation = (elevTop + elevRight + elevBottom + elevLeft) / 4;

  const ptRight  = projectPoint(x + 1, y, elevRight, origin);
  const ptBottom = projectPoint(x + 1, y + 1, elevBottom, origin);
  const ptLeft   = projectPoint(x, y + 1, elevLeft, origin);

  const flatTop    = projectPoint(x, y, baseElevation, origin);
  const flatRight  = projectPoint(x + 1, y, baseElevation, origin);
  const flatBottom = projectPoint(x + 1, y + 1, baseElevation, origin);
  const flatLeft   = projectPoint(x, y + 1, baseElevation, origin);

  const h = height * 15 * zoom; 
  const topTop    = { x: flatTop.x,    y: flatTop.y - h };
  const topRight  = { x: flatRight.x,  y: flatRight.y - h };
  const topBottom = { x: flatBottom.x, y: flatBottom.y - h };
  const topLeft   = { x: flatLeft.x,   y: flatLeft.y - h };

  const rightColor = shadeColor(baseColor, -0.2);
  ctx.fillStyle = rightColor;
  ctx.beginPath();
  ctx.moveTo(ptRight.x, ptRight.y);
  ctx.lineTo(topRight.x, topRight.y);
  ctx.lineTo(topBottom.x, topBottom.y);
  ctx.lineTo(ptBottom.x, ptBottom.y);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 1;
  ctx.stroke();

  const leftColor = shadeColor(baseColor, -0.4);
  ctx.fillStyle = leftColor;
  ctx.beginPath();
  ctx.moveTo(ptLeft.x, ptLeft.y);
  ctx.lineTo(topLeft.x, topLeft.y);
  ctx.lineTo(topBottom.x, topBottom.y);
  ctx.lineTo(ptBottom.x, ptBottom.y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  const lightColor = shadeColor(baseColor, 0.2);
  ctx.fillStyle = lightColor;
  ctx.beginPath();
  ctx.moveTo(topTop.x, topTop.y);
  ctx.lineTo(topRight.x, topRight.y);
  ctx.lineTo(topBottom.x, topBottom.y);
  ctx.lineTo(topLeft.x, topLeft.y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function draw() {
  const startTime = performance.now(); 

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
  
  ctx.setTransform(scale, 0, 0, scale, 0, 0);

  const tl = unprojectPoint(0, 0, origin);
  const tr = unprojectPoint(canvas.width, 0, origin);
  const bl = unprojectPoint(0, canvas.height, origin);
  const br = unprojectPoint(canvas.width, canvas.height, origin);

  const padding = 4;
  const minX = Math.max(0, Math.floor(Math.min(tl.x, tr.x, bl.x, br.x) - padding));
  const maxX = Math.min(WORLD_W - 1, Math.ceil(Math.max(tl.x, tr.x, bl.x, br.x) + padding));
  const minY = Math.max(0, Math.floor(Math.min(tl.y, tr.y, bl.y, br.y) - padding));
  const maxY = Math.min(WORLD_H - 1, Math.ceil(Math.max(tl.y, tr.y, bl.y, br.y) + padding));
  
  const tiles_to_draw = [];
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      tiles_to_draw.push({ x, y, depth: y + x });
    }
  }
  tiles_to_draw.sort((a, b) => a.depth - b.depth);
  
  renderedTilesCount = tiles_to_draw.length; 
  const gridW = WORLD_W + 1;

  for (const tile_info of tiles_to_draw) {
    const { x, y } = tile_info;
    const idx = y * WORLD_W + x;
    const tileId = mapData[idx];
    const tile = tileId >= 0 ? tiles[tileId] : null;

    const elevTop    = elevationGrid[y * gridW + x] || 0;
    const elevRight  = elevationGrid[y * gridW + (x + 1)] || 0;
    const elevBottom = elevationGrid[(y + 1) * gridW + (x + 1)] || 0;
    const elevLeft   = elevationGrid[(y + 1) * gridW + x] || 0;

    const ptTop    = projectPoint(x, y, elevTop, origin);
    const ptRight  = projectPoint(x + 1, y, elevRight, origin);
    const ptBottom = projectPoint(x + 1, y + 1, elevBottom, origin);
    const ptLeft   = projectPoint(x, y + 1, elevLeft, origin);

    if (tile) {
      if (tileId === 10 && testTextureImage) {
        const tw = testTextureImage.width;
        const th = testTextureImage.height;

        const uTop = tw / 2,     vTop = 0;
        const uRight = tw,       vRight = th / 2;
        const uBottom = tw / 2,  vBottom = th;
        const uLeft = 0,         vLeft = th / 2;

        ctx.fillStyle = tile.color;
        ctx.beginPath();
        ctx.moveTo(ptTop.x, ptTop.y);
        ctx.lineTo(ptRight.x, ptRight.y);
        ctx.lineTo(ptBottom.x, ptBottom.y);
        ctx.lineTo(ptLeft.x, ptLeft.y);
        ctx.closePath();
        ctx.fill();

        drawTextureTriangle(ctx, testTextureImage, 
          ptTop.x, ptTop.y, ptRight.x, ptRight.y, ptLeft.x, ptLeft.y,
          uTop, vTop, uRight, vRight, uLeft, vLeft, true
        );
        drawTextureTriangle(ctx, testTextureImage, 
          ptBottom.x, ptBottom.y, ptRight.x, ptRight.y, ptLeft.x, ptLeft.y,
          uBottom, vBottom, uRight, vRight, uLeft, vLeft, false
        );

        const slope = (elevTop + elevLeft) - (elevBottom + elevRight);
        if (Math.abs(slope) > 2) {
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(ptTop.x, ptTop.y);
          ctx.lineTo(ptRight.x, ptRight.y);
          ctx.lineTo(ptBottom.x, ptBottom.y);
          ctx.lineTo(ptLeft.x, ptLeft.y);
          ctx.closePath();
          ctx.clip();

          ctx.globalCompositeOperation = 'multiply';
          if (slope > 2) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.15)'; 
          } else {
            const darkness = Math.min(0.4, Math.abs(slope) * 0.006);
            ctx.fillStyle = `rgba(0, 0, 0, ${darkness})`; 
          }
          ctx.fill();
          ctx.restore();
        }

      } else {
        const slope = (elevTop + elevLeft) - (elevBottom + elevRight);
        let fillColor = tile.color;
        if (slope > 2) {
          fillColor = shadeColor(tile.color, 0.15); 
        } else if (slope < -2) {
          const darkness = Math.max(-0.4, slope * 0.006);
          fillColor = shadeColor(tile.color, darkness); 
        }

        ctx.fillStyle = fillColor;
        ctx.beginPath();
        ctx.moveTo(ptTop.x, ptTop.y);
        ctx.lineTo(ptRight.x, ptRight.y);
        ctx.lineTo(ptBottom.x, ptBottom.y);
        ctx.lineTo(ptLeft.x, ptLeft.y);
        ctx.closePath();
        ctx.fill();
      }

      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.lineWidth = 1;
      ctx.stroke();

      if (tile.height > 0) {
        drawIsometric3DBuilding(x, y, origin, tileId, tile.height);
      }
    } else {
      ctx.fillStyle = '#1a1410';
      ctx.beginPath();
      ctx.moveTo(ptTop.x, ptTop.y);
      ctx.lineTo(ptRight.x, ptRight.y);
      ctx.lineTo(ptBottom.x, ptBottom.y);
      ctx.lineTo(ptLeft.x, ptLeft.y);
      ctx.closePath();
      ctx.fill();
    }

    // --- RENDU DES OBJETS EN FAUSSE 3D ADAPTÉE AU RELIEF ---
    const obj = mapObjects[idx];
    if (obj && objectTypes[obj.type]) {
      const typeCfg = objectTypes[obj.type];
      
      // Altitude moyenne sous l'objet
      const elevAverage = (elevTop + elevRight + elevBottom + elevLeft) / 4;
      const centerPt = projectPoint(x + 0.5, y + 0.5, elevAverage, origin);
      
      const objX = centerPt.x + (obj.offsetX * zoom);
      const objY = centerPt.y + (obj.offsetY * zoom);
      
      ctx.save();
      ctx.translate(objX, objY);

      // Calcul des inclinaisons X et Y du terrain sur la tuile
      const diffX = (elevRight + elevBottom) - (elevTop + elevLeft);
      const diffY = (elevBottom + elevLeft) - (elevTop + elevRight);
      
      if (typeCfg.alignWithSlope) {
        // Option A : Déformation/Rotation pour s'aligner parallèlement à la pente
        const angleRotation = Math.atan2(diffX * (TILE_H / 2), TILE_W) * 0.45;
        ctx.rotate(angleRotation);
        
        // Simulation d'une compression selon la sévérité de la pente Y
        const scaleY = 1 - Math.min(0.25, Math.abs(diffY) * 0.008);
        ctx.scale(1, scaleY);
      } else {
        // Option B : Objet rigide (Rocher) -> On dessine d'abord son ombre déformée au sol
        ctx.save();
        ctx.scale(1.2, 0.5); // Écrasement pour faire l'ellipse de l'ombre
        // Décalage léger de l'ombre en fonction de la pente
        ctx.translate(diffX * 0.2 * zoom, diffY * 0.1 * zoom);
        ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
        ctx.beginPath();
        ctx.arc(0, 0, obj.size * zoom, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      
      // Exécution de la fonction de dessin (vectorielle ou image future)
      typeCfg.draw(ctx, obj.size * zoom);
      ctx.restore();
    }
  }
  
  for (const tile_info of tiles_to_draw) {
    const { x, y } = tile_info;
    const idx = y * WORLD_W + x;
    if (idx === start || idx === goal) {
      const elevTop    = elevationGrid[y * gridW + x] || 0;
      const elevRight  = elevationGrid[y * gridW + (x + 1)] || 0;
      const elevBottom = elevationGrid[(y + 1) * gridW + (x + 1)] || 0;
      const elevLeft   = elevationGrid[(y + 1) * gridW + x] || 0;

      const ptTop    = projectPoint(x, y, elevTop, origin);
      const ptRight  = projectPoint(x + 1, y, elevRight, origin);
      const ptBottom = projectPoint(x + 1, y + 1, elevBottom, origin);
      const ptLeft   = projectPoint(x, y + 1, elevLeft, origin);

      ctx.fillStyle = (idx === start) ? 'rgba(0,250,0,0.5)' : 'rgba(250,0,0,0.5)';
      ctx.beginPath();
      ctx.moveTo(ptTop.x, ptTop.y);
      ctx.lineTo(ptRight.x, ptRight.y);
      ctx.lineTo(ptBottom.x, ptBottom.y);
      ctx.lineTo(ptLeft.x, ptLeft.y);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = (idx === start) ? '#0f0' : '#f00';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }
  
  if (path && path.length) {
    for (const p of path) {
      const x = p % WORLD_W, y = Math.floor(p / WORLD_W);
      if (x < minX || x > maxX || y < minY || y > maxY) continue;
      
      const elevTop    = elevationGrid[y * gridW + x] || 0;
      const elevRight  = elevationGrid[y * gridW + (x + 1)] || 0;
      const elevBottom = elevationGrid[(y + 1) * gridW + (x + 1)] || 0;
      const elevLeft   = elevationGrid[(y + 1) * gridW + x] || 0;

      const ptTop    = projectPoint(x, y, elevTop, origin);
      const ptRight  = projectPoint(x + 1, y, elevRight, origin);
      const ptBottom = projectPoint(x + 1, y + 1, elevBottom, origin);
      const ptLeft   = projectPoint(x, y + 1, elevLeft, origin);

      ctx.fillStyle = 'rgba(212,175,55,0.4)'; 
      ctx.beginPath();
      ctx.moveTo(ptTop.x, ptTop.y);
      ctx.lineTo(ptRight.x, ptRight.y);
      ctx.lineTo(ptBottom.x, ptBottom.y);
      ctx.lineTo(ptLeft.x, ptLeft.y);
      ctx.closePath();
      ctx.fill();
    }
  }

  frameTime = performance.now() - startTime;
  renderPerformanceHUD();
}

function renderPerformanceHUD() {
  if (!lastCalledTime) {
    lastCalledTime = performance.now();
    fps = 0;
  } else {
    let delta = (performance.now() - lastCalledTime) / 1000;
    lastCalledTime = performance.now();
    let currentFps = Math.round(1 / delta);
    
    fpsDisplayInterval++;
    if (fpsDisplayInterval >= 5) { 
      fps = currentFps;
      fpsDisplayInterval = 0;
    }
  }

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0); 

  ctx.fillStyle = "rgba(18, 14, 10, 0.85)";
  ctx.strokeStyle = "#8b7355";
  ctx.lineWidth = 1.5;
  ctx.fillRect(15, 15, 190, 85);
  ctx.strokeRect(15, 15, 190, 85);

  ctx.font = "bold 12px monospace";
  ctx.textBaseline = "top";

  ctx.fillStyle = fps < 30 ? "#ff4a4a" : fps < 55 ? "#ffcc00" : "#00ff66";
  ctx.fillText(`⚡ ${fps} FPS`, 25, 23);

  ctx.fillStyle = frameTime > 16 ? "#ff7c7c" : "#e2d1b7";
  ctx.fillText(`⏱️ Frame: ${frameTime.toFixed(2)} ms`, 25, 43);

  ctx.fillStyle = "#c9a961";
  ctx.fillText(`🧱 Tuiles: ${renderedTilesCount}`, 25, 63);

  ctx.restore();
}

// ==========================================
// 6. GESTION DE L'INTERFACE UTILISATEUR (UI)
// ==========================================

window.toggleSection = function(sectionId) {
  const section = document.getElementById(sectionId);
  if (section) section.classList.toggle('collapsed');
};

function isMapOnlyMode() {
  return mapOnlyMode || document.body.classList.contains('map-only');
}

async function toggleMapOnlyMode() {
  mapOnlyMode = !mapOnlyMode;
  document.body.classList.toggle('map-only', mapOnlyMode);
  if (mapOnlyMode) {
    mapOnlyButton.textContent = 'Sortir carte';
    if (!document.fullscreenElement) {
      try { await canvasContainer.requestFullscreen(); } catch (err) {}
    }
  } else {
    mapOnlyButton.textContent = 'Carte seule';
    if (document.fullscreenElement) {
      try { await document.exitFullscreen(); } catch (err) {}
    }
  }
  resizeCanvas();
  triggerRender();
}

function updateInfo() {
  infoStartEl.textContent = 'Départ: ' + (start >= 0 ? start : '-');
  infoGoalEl.textContent = 'Arrivée: ' + (goal >= 0 ? goal : '-');
  infoPathEl.textContent = 'Longueur du chemin: ' + (path ? path.length : 0);
}

function renderTilesPalette() {
  const paletteEl = document.getElementById('tilesPalette');
  paletteEl.innerHTML = '';

  const modeSelector = document.createElement('div');
  modeSelector.style.cssText = 'grid-column: span 3; display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; border-bottom: 1px solid #8b7355; padding-bottom: 12px;';
  
  const modeTitle = document.createElement('div');
  modeTitle.textContent = "Mode Actif :";
  modeTitle.style.cssText = 'color: #d4af37; font-size: 11px; font-weight: bold; text-transform: uppercase;';
  modeSelector.appendChild(modeTitle);

  const btnGroup = document.createElement('div');
  btnGroup.style.cssText = 'display: flex; gap: 4px;';

  const btnPaintMode = document.createElement('button');
  btnPaintMode.textContent = "Dessin";
  btnPaintMode.style.cssText = 'flex: 1; padding: 6px; border-radius: 4px; border: 1px solid #8b7355; cursor: pointer; font-size: 10px; font-weight: bold;';

  const btnElevMode = document.createElement('button');
  btnElevMode.textContent = "Relief";
  btnElevMode.style.cssText = 'flex: 1; padding: 6px; border-radius: 4px; border: 1px solid #8b7355; cursor: pointer; font-size: 10px; font-weight: bold;';

  const btnPathMode = document.createElement('button');
  btnPathMode.textContent = "Chemin";
  btnPathMode.style.cssText = 'flex: 1; padding: 6px; border-radius: 4px; border: 1px solid #8b7355; cursor: pointer; font-size: 10px; font-weight: bold;';

  function refreshModeUI() {
    if (editorMode === "paint") {
      btnPaintMode.style.background = "#689f38"; btnPaintMode.style.color = "white";
      btnElevMode.style.background = "#3e5a20"; btnElevMode.style.color = "#ccc";
      btnPathMode.style.background = "#3e5a20"; btnPathMode.style.color = "#ccc";
      tilesListContainer.style.display = "grid";
      elevationOptions.style.display = "none";
    } 
    else if (editorMode === "elevation") {
      btnPaintMode.style.background = "#3e5a20"; btnPaintMode.style.color = "#ccc";
      btnElevMode.style.background = "#689f38"; btnElevMode.style.color = "white";
      btnPathMode.style.background = "#3e5a20"; btnPathMode.style.color = "#ccc";
      tilesListContainer.style.display = "none";
      elevationOptions.style.display = "flex";
    } 
    else if (editorMode === "pathfinding") {
      btnPaintMode.style.background = "#3e5a20"; btnPaintMode.style.color = "#ccc";
      btnElevMode.style.background = "#3e5a20"; btnElevMode.style.color = "#ccc";
      btnPathMode.style.background = "#689f38"; btnPathMode.style.color = "white";
      tilesListContainer.style.display = "none";
      elevationOptions.style.display = "none";
    }
  }

  btnPaintMode.addEventListener('click', () => { editorMode = "paint"; refreshModeUI(); });
  btnElevMode.addEventListener('click', () => { editorMode = "elevation"; refreshModeUI(); });
  btnPathMode.addEventListener('click', () => { editorMode = "pathfinding"; refreshModeUI(); });

  btnGroup.appendChild(btnPaintMode);
  btnGroup.appendChild(btnElevMode);
  btnGroup.appendChild(btnPathMode);
  modeSelector.appendChild(btnGroup);
  paletteEl.appendChild(modeSelector);

  const elevationOptions = document.createElement('div');
  elevationOptions.style.cssText = 'grid-column: span 3; display: flex; gap: 8px; margin-bottom: 10px;';
  
  const btnRaise = document.createElement('button');
  btnRaise.textContent = "🔺 Monter";
  btnRaise.style.cssText = 'flex: 1; padding: 6px; border-radius: 4px; border: 1px solid #8b7355; cursor: pointer; font-size: 11px;';
  btnRaise.addEventListener('click', () => {
    elevationTool = "raise";
    btnRaise.style.background = "#d4af37"; btnRaise.style.color = "#000";
    btnLower.style.background = "#1a1410"; btnLower.style.color = "#d4af37";
  });

  const btnLower = document.createElement('button');
  btnLower.textContent = "🔻 Baisser";
  btnLower.style.cssText = 'flex: 1; padding: 6px; border-radius: 4px; border: 1px solid #8b7355; cursor: pointer; font-size: 11px;';
  btnLower.addEventListener('click', () => {
    elevationTool = "lower";
    btnLower.style.background = "#d4af37"; btnLower.style.color = "#000";
    btnRaise.style.background = "#1a1410"; btnRaise.style.color = "#d4af37";
  });

  if (elevationTool === "raise") {
    btnRaise.style.background = "#d4af37"; btnRaise.style.color = "#000";
    btnLower.style.background = "#1a1410"; btnLower.style.color = "#d4af37";
  } else {
    btnLower.style.background = "#d4af37"; btnLower.style.color = "#000";
    btnRaise.style.background = "#1a1410"; btnRaise.style.color = "#d4af37";
  }

  elevationOptions.appendChild(btnRaise);
  elevationOptions.appendChild(btnLower);
  paletteEl.appendChild(elevationOptions);

  const tilesListContainer = document.createElement('div');
  tilesListContainer.style.cssText = 'grid-column: span 3; display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px;';
  paletteEl.appendChild(tilesListContainer);

  function deselectAllPaletteItems() {
    const items = tilesListContainer.querySelectorAll('.palette-item');
    items.forEach(el => el.style.border = '1px solid transparent');
  }

  for (let i = 0; i < 15; i++) {
    const tile = tiles[i] || { name: 'Unknown', color: '#999', height: 0 };
    const tileDiv = document.createElement('div');
    tileDiv.className = 'palette-item';
    tileDiv.style.cssText = 'display:flex;flex-direction:column;gap:4px;padding:6px;background:rgba(0,0,0,0.2);border-radius:3px; border: 1px solid transparent; cursor:pointer;';
    
    if (editorMode === "paint" && selectedTileId === i) {
      tileDiv.style.border = '1px solid #d4af37';
    }

    const colorBox = document.createElement('div');
    colorBox.style.cssText = `width:100%;height:30px;background:${tile.color};border:2px solid #8b7355;border-radius:2px;`;
    colorBox.title = `ID ${i}: ${tile.name}`;
    
    colorBox.addEventListener('click', () => {
      editorMode = "paint";
      selectedTileId = i;
      deselectAllPaletteItems();
      tileDiv.style.border = '1px solid #d4af37';
      refreshModeUI();
    });

    const label = document.createElement('small');
    label.style.cssText = 'color:#d4af37;text-align:center;font-size:10px;font-weight:bold';
    label.textContent = `ID ${i}`;
    
    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.value = tile.color;
    colorInput.style.cssText = 'width:100%;height:20px;cursor:pointer;border:none;border-radius:2px';
    colorInput.addEventListener('change', (e) => {
      tiles[i].color = e.target.value;
      colorBox.style.background = e.target.value;
      triggerRender();
    });
    
    const heightLabel = document.createElement('label');
    heightLabel.style.cssText = 'font-size:11px;color:#c9a961;display:flex;align-items:center;gap:2px';
    heightLabel.textContent = 'H: ';
    
    const heightInput = document.createElement('input');
    heightInput.type = 'number';
    heightInput.min = '0';
    heightInput.max = '5';
    heightInput.value = tile.height;
    heightInput.style.cssText = 'width:30px;height:18px;font-size:11px;background:#1a1410;color:#d4af37;border:1px solid #8b7355;border-radius:2px';
    heightInput.addEventListener('change', (e) => {
      tiles[i].height = Math.max(0, Math.min(5, parseInt(e.target.value, 10) || 0));
      e.target.value = tiles[i].height;
      triggerRender();
    });
    
    heightLabel.appendChild(heightInput);
    tileDiv.appendChild(colorBox);
    tileDiv.appendChild(label);
    tileDiv.appendChild(colorInput);
    tileDiv.appendChild(heightLabel);
    tilesListContainer.appendChild(tileDiv);
  }

  refreshModeUI();
}

// ==========================================
// 7. ÉVÉNEMENTS UNIFIÉS (SOURIS, TACTILE)
// ==========================================

function handleActionAtCell(cell, button) {
  if (editorMode === "paint") {
    if (button === 0) { 
      mapData[cell] = selectedTileId;
      if (selectedTileId !== 0) mapObjects[cell] = null;
    }
  } 
  else if (editorMode === "elevation") {
    if (button === 0) { 
      modifyElevationAtCell(cell, elevationTool === "raise");
    }
  } 
  else if (editorMode === "pathfinding") {
    if (button === 0) { 
      start = cell;
    } else if (button === 2) { 
      goal = cell;
    }
  }
}

canvas.addEventListener('pointerdown', (e) => {
  activePointers.push(e);
  canvas.setPointerCapture(e.pointerId);

  if (e.pointerType === 'mouse' && e.button === 2) {
    const cell = canvasToCell(e.clientX, e.clientY);
    if (cell !== -1) {
      handleActionAtCell(cell, 2);
      triggerRender();
      updateInfo();
    }
    return;
  }

  if (e.pointerType === 'touch') {
    touchTimer = setTimeout(() => {
      const cell = canvasToCell(e.clientX, e.clientY);
      if (cell !== -1) {
        handleActionAtCell(cell, 2); 
        triggerRender();
        updateInfo();
        isPanning = false; 
      }
    }, LONG_PRESS_DELAY);
  }

  if (activePointers.length === 1 && e.button !== 2) {
    const cell = canvasToCell(e.clientX, e.clientY);
    if (cell !== -1) {
      isMouseDown = true;
      lastPaintedCell = cell;
      handleActionAtCell(cell, 0);
      triggerRender();
      updateInfo();
    } else {
      isPanning = true;
      startPanX = e.clientX - panX;
      startPanY = e.clientY - panY;
      canvas.style.cursor = 'grabbing';
    }
  } 
  else if (activePointers.length === 2) {
    isMouseDown = false;
    isPanning = false;
    clearTimeout(touchTimer); 
    initialPinchDistance = getDistance(activePointers[0], activePointers[1]);
    initialZoom = zoom;
  }
});

canvas.addEventListener('pointermove', (e) => {
  const index = activePointers.findIndex(p => p.pointerId === e.pointerId);
  if (index !== -1) activePointers[index] = e;

  if (e.pointerType === 'touch' && activePointers.length === 1) {
    const deltaX = Math.abs(e.clientX - (startPanX + panX));
    const deltaY = Math.abs(e.clientY - (startPanY + panY));
    if (deltaX > 15 || deltaY > 15) {
      clearTimeout(touchTimer);
    }
  }

  if (isMouseDown && activePointers.length === 1 && editorMode !== "pathfinding") {
    const cell = canvasToCell(e.clientX, e.clientY);
    if (cell !== -1 && cell !== lastPaintedCell) {
      lastPaintedCell = cell;
      handleActionAtCell(cell, 0);
      triggerRender();
      updateInfo();
    }
  } 
  else if (isPanning && activePointers.length === 1) {
    panX = e.clientX - startPanX;
    panY = e.clientY - startPanY;
    triggerRender();
  }
  else if (activePointers.length === 2) {
    const currentDistance = getDistance(activePointers[0], activePointers[1]);
    if (initialPinchDistance > 0) {
      const factor = currentDistance / initialPinchDistance;
      zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, initialZoom * factor));
      
      const midX = (activePointers[0].clientX + activePointers[1].clientX) / 2;
      const midY = (activePointers[0].clientY + activePointers[1].clientY) / 2;
      
      const rect = canvas.getBoundingClientRect();
      const worldX = ((midX - rect.left) / scale - panX) / initialZoom;
      const worldY = ((midY - rect.top) / scale - panY) / initialZoom;
      
      panX = (midX - rect.left) / scale - worldX * zoom;
      panY = (midY - rect.top) / scale - worldY * zoom;
      
      triggerRender();
    }
  }
});

function handlePointerUp(e) {
  clearTimeout(touchTimer);
  isMouseDown = false;
  lastPaintedCell = -1;

  activePointers = activePointers.filter(p => p.pointerId !== e.pointerId);
  if (activePointers.length < 2) {
    initialPinchDistance = 0;
  }
  if (activePointers.length === 0) {
    isPanning = false;
    canvas.style.cursor = 'default';
  }
}
canvas.addEventListener('pointerup', handlePointerUp);
canvas.addEventListener('pointercancel', handlePointerUp);

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  const worldX = (mouseX - panX) / zoom;
  const worldY = (mouseY - panY) / zoom;

  const zoomFactor = 1.15;
  if (e.deltaY < 0) {
    zoom = Math.min(zoom * zoomFactor, MAX_ZOOM);
  } else {
    zoom = Math.max(zoom / zoomFactor, MIN_ZOOM);
  }

  panX = mouseX - worldX * zoom;
  panY = mouseY - worldY * zoom;

  triggerRender(); 
}, { passive: false });

canvas.addEventListener('contextmenu', e => e.preventDefault());

document.addEventListener('keydown', async (e) => {
  if (e.code === 'KeyF') {
    await toggleMapOnlyMode();
    return;
  }
  if (e.code === 'Space') {
    if (start < 0 || goal < 0) return alert('Définir départ et arrivée');
    path = findPathAStar(start, goal);
    triggerRender();
  }
  if (e.code === 'ArrowUp') { panY += 30; triggerRender(); }
  if (e.code === 'ArrowDown') { panY -= 30; triggerRender(); }
  if (e.code === 'ArrowLeft') { panX += 30; triggerRender(); }
  if (e.code === 'ArrowRight') { panX -= 30; triggerRender(); }
  if (e.key === 'r' || e.key === 'R') { start = -1; goal = -1; path = []; triggerRender(); }
  updateInfo();
});

// ==========================================
// 8. ACTIONS DES BOUTONS DE L'INTERFACE
// ==========================================

document.getElementById('btnReset').addEventListener('click', () => { start = -1; goal = -1; path = []; triggerRender(); });

document.getElementById('btnCompute').addEventListener('click', () => {
  if (start < 0 || goal < 0) return alert('Définir départ et arrivée');
  path = findPathAStar(start, goal);
  triggerRender(); 
  updateInfo();
});

mapOnlyButton.addEventListener('click', toggleMapOnlyMode);

document.getElementById('btnCreateMap').addEventListener('click', () => {
  const w = parseInt(document.getElementById('inputWidth').value, 10);
  const h = parseInt(document.getElementById('inputHeight').value, 10);
  const obstacleProb = parseInt(document.getElementById('inputObstacleProb').value, 10);
  if (isNaN(w) || isNaN(h) || isNaN(obstacleProb)) return alert('Valeurs invalides');
  if (w < 5 || h < 5 || w > 100 || h > 100) return alert('Taille entre 5 et 100');
  if (obstacleProb < 0 || obstacleProb > 50) return alert('Obstacles entre 0 et 50%');
  WORLD_W = w; WORLD_H = h;
  mapData = generateRandomMap(WORLD_W, WORLD_H, obstacleProb);
  elevationGrid = generateElevation(WORLD_W, WORLD_H);
  generateMapObjects(); 
  start = -1; goal = -1; path = [];
  resizeCanvas(); 
  triggerRender(); 
  updateInfo(); 
  renderTilesPalette();
});

document.getElementById('btnRegenerate').addEventListener('click', () => {
  const obstacleProb = parseInt(document.getElementById('inputObstacleProb').value, 10);
  if (isNaN(obstacleProb)) return alert('Valeur invalide');
  mapData = generateRandomMap(WORLD_W, WORLD_H, obstacleProb);
  elevationGrid = generateElevation(WORLD_W, WORLD_H);
  generateMapObjects(); 
  start = -1; goal = -1; path = [];
  triggerRender(); 
  updateInfo(); 
  renderTilesPalette();
});

// ==========================================
// 9. CHARGEMENT ET INITIALISATION
// ==========================================

function resizeCanvas() {
  const availW = canvasContainer.clientWidth - 24; 
  const availH = canvasContainer.clientHeight - 24;
  
  canvas.width = availW;
  canvas.height = availH;
  
  scale = Math.min(availW / BASE_WIDTH, availH / BASE_HEIGHT);
  triggerRender();
}

window.addEventListener('resize', resizeCanvas);

window.addEventListener('DOMContentLoaded', () => {
  WORLD_W = 20;
  WORLD_H = 20;
  mapData = generateRandomMap(WORLD_W, WORLD_H, 8);
  elevationGrid = generateElevation(WORLD_W, WORLD_H);
  generateMapObjects(); 
  
  resizeCanvas();
  renderTilesPalette();
  updateInfo();
});