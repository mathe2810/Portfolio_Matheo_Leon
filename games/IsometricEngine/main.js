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
let elevationGrid = []; // Altitude des sommets (WORLD_W+1) * (WORLD_H+1)
let start = -1;
let goal = -1;
let path = [];
let scale = 1; 

// Origine ajustée pour centrer parfaitement la grille 20x20
const origin = { x: 9.5, y: 1.5 }; 
const ELEVATION_SCALE = 1.0; 

// Paramètres de l'éditeur
let editorMode = "paint"; // "paint", "elevation" ou "pathfinding"
let elevationTool = "raise"; // "raise" ou "lower"
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
const LONG_PRESS_DELAY = 600; // ms


// ==========================================
// AJOUT : SYSTÈME DE TEXTURE DE TEST
// ==========================================

// Image de texture qui sera associée à notre ID de test
let testTextureImage = null;

// Génère une texture procédurale de pierre (ID 10) pour tester sans charger de fichier externe
function createProceduralTestTexture() {
  const texCanvas = document.createElement('canvas');
  texCanvas.width = 128;
  texCanvas.height = 128;
  const tCtx = texCanvas.getContext('2d');

  // Fond gris de base
  tCtx.fillStyle = '#8888aa';
  tCtx.fillRect(0, 0, 128, 128);

  // Ajout d'un motif de dalles/bruit pour simuler de la pierre
  tCtx.strokeStyle = '#555577';
  tCtx.lineWidth = 4;
  // Tracé d'un quadrillage de pavés
  for (let i = 0; i <= 128; i += 32) {
    tCtx.beginPath();
    tCtx.moveTo(i, 0); tCtx.lineTo(i, 128);
    tCtx.stroke();
    tCtx.beginPath();
    tCtx.moveTo(0, i); tCtx.lineTo(128, i);
    tCtx.stroke();
  }

  // Petites tâches de bruit organiques pour donner du grain
  tCtx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  for (let i = 0; i < 40; i++) {
    tCtx.fillRect(Math.random() * 128, Math.random() * 128, 6, 6);
  }
  tCtx.fillStyle = 'rgba(0, 0, 0, 0.15)';
  for (let i = 0; i < 40; i++) {
    tCtx.fillRect(Math.random() * 128, Math.random() * 128, 6, 6);
  }

  testTextureImage = new Image();
  testTextureImage.src = texCanvas.toDataURL();
}

// Initialisation de la texture
//createProceduralTestTexture();

testTextureImage = new Image();
testTextureImage.src = 'tales.png'; // Assurez-vous que ce fichier existe dans le même répertoire
testTextureImage.onload = () => {
  draw(); // Redessine la scène une fois la texture chargée
};

// Fonction mathématique d'affichage d'un triangle texturé déformé (Homographie 2D)
function drawTextureTriangle(ctx, img, x0, y0, x1, y1, x2, y2, u0, v0, u1, v1, u2, v2) {
  ctx.save();
  
  // Création du masque triangulaire pour ne pas déborder
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.closePath();
  ctx.clip();

  // Matrice de transformation affine
  const delta = u0 * v1 + v0 * u2 + u1 * v2 - v1 * u2 - v0 * u1 - u0 * v2;
  if (delta === 0) {
    ctx.restore();
    return;
  }

  const a = (x0 * v1 + v0 * x2 + x1 * v2 - v1 * x2 - v0 * x1 - x0 * v2) / delta;
  const b = (y0 * v1 + v0 * y2 + y1 * v2 - v1 * y2 - v0 * y1 - y0 * v2) / delta;
  const c = (u0 * x1 + x0 * u2 + u1 * x2 - x1 * u2 - x0 * u1 - u0 * x2) / delta;
  const d = (u0 * y1 + y0 * u2 + u1 * y2 - y1 * u2 - y0 * u1 - u0 * y2) / delta;
  const e = (u0 * v1 * x2 + v0 * u2 * x1 + u1 * v2 * x0 - v1 * u2 * x0 - v0 * u1 * x2 - u0 * v2 * x1) / delta;
  const f = (u0 * v1 * y2 + v0 * u2 * y1 + u1 * v2 * y0 - v1 * u2 * y0 - v0 * u1 * y2 - u0 * v2 * y1) / delta;

  // Appliquer la transformation et dessiner l'image originale
  ctx.transform(a, b, c, d, e, f);
  ctx.drawImage(img, 0, 0);
  
  ctx.restore();
}


// ==========================================
// 2. UTILITAIRES DE GÉOMÉTRIE ET MATHS (PROJECTIONS)
// ==========================================

// Projette des coordonnées 2D plates en coordonnées 3D Isométriques
function projectPoint(gx, gy, elevation, origin) {
  return {
    x: ((origin.x * TILE_W) + (gx - gy) * (TILE_W / 2)) * zoom + panX,
    y: ((origin.y * TILE_H) + (gx + gy) * (TILE_H / 2) - (elevation * ELEVATION_SCALE)) * zoom + panY
  };
}

// Projection inverse simplifiée (Sans relief) pour le frustum culling
function unprojectPoint(screenX, screenY, origin) {
  // Ajuste l'écran par rapport à la caméra, zoom et scale globale du canvas
  const cx = (screenX / scale - panX) / zoom;
  const cy = (screenY / scale - panY) / zoom;
  
  // Repasse l'origine
  const dx = cx - (origin.x * TILE_W);
  const dy = cy - (origin.y * TILE_H);
  
  // Formule inverse de la rotation isométrique
  const gx = (dx / (TILE_W / 2) + dy / (TILE_H / 2)) / 2;
  const gy = (dy / (TILE_H / 2) - dx / (TILE_W / 2)) / 2;
  
  return { x: gx, y: gy };
}

// Convertit les coordonnées brutes (clientX, clientY) de l'écran en index de cellule sur la grille
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
  // Tri de l'avant-plan vers l'arrière-plan
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

// Calcule l'écart entre deux points tactiles pour le zoom
function getDistance(p1, p2) {
  const dx = p1.clientX - p2.clientX;
  const dy = p1.clientY - p2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

// Ajoute du contraste/ombrage à une couleur hexadécimale
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

// Génère de façon procédurale des collines d'altitudes
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

// Récupère l'altitude moyenne d'une tuile à partir de ses 4 sommets
function getTileAverageElevation(tileX, tileY) {
  const gridW = WORLD_W + 1;
  const tLeft  = elevationGrid[tileY * gridW + tileX] || 0;
  const tRight = elevationGrid[tileY * gridW + (tileX + 1)] || 0;
  const bRight = elevationGrid[(tileY + 1) * gridW + (tileX + 1)] || 0;
  const bLeft  = elevationGrid[(tileY + 1) * gridW + tileX] || 0;
  return (tLeft + tRight + bRight + bLeft) / 4;
}

// Modifie l'altitude des 4 sommets d'une cellule (monte ou baisse)
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

  // Recalcul du chemin immédiat s'il y en avait un de configuré
  if (start >= 0 && goal >= 0 && path.length > 0) {
    path = findPathAStar(start, goal);
  }
}

// Génère un tableau de tuiles aléatoires
function generateRandomMap(width, height, obstaclePercent = 8) {
  const out = new Array(width * height);
  const blockedProb = obstaclePercent / 100;
  for (let i = 0; i < width * height; i++) {
    if (Math.random() < blockedProb) out[i] = -1; // Case vide/bloquée
    else out[i] = Math.floor(Math.random() * 11); 
  }
  return out;
}


// ==========================================
// 4. ALGORITHME DE PATHFINDING A* (A-STAR) OPTIMISÉ
// ==========================================

// Heuristique de Manhattan 3D prenant en compte la distance et l'altitude moyenne estimée
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

  return dX + dY + (dZ * 0.15); // Manhattan + distance verticale pondérée
}

// Récupère les indices des voisins valides d'une cellule avec les coûts (pentes et diagonales)
function getAdjacentNeighbors(idx) {
  const x = idx % WORLD_W;
  const y = Math.floor(idx / WORLD_W);
  const neighbors = [];

  // Mouvements possibles [dy, dx, coût_géométrique]
  const moves = [
    [-1, 0, 1], [1, 0, 1], [0, -1, 1], [0, 1, 1],                      // Cardinaux
    [-1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [1, 1, Math.SQRT2] // Diagonales
  ];

  const currentElev = getTileAverageElevation(x, y);

  for (const [dy, dx, geomCost] of moves) {
    const ny = y + dy;
    const nx = x + dx;

    if (nx >= 0 && nx < WORLD_W && ny >= 0 && ny < WORLD_H) {
      const neighborIdx = ny * WORLD_W + nx;
      if (mapData[neighborIdx] === -1) continue; // Ignorer les obstacles

      const neighborElev = getTileAverageElevation(nx, ny);
      const elevDiff = neighborElev - currentElev;
      let slopePenalty = 0;
      if (elevDiff > 0) {
        slopePenalty = elevDiff * 0.15; // Pénalité en montée
      }

      neighbors.push({
        to: neighborIdx,
        cost: geomCost + slopePenalty
      });
    }
  }
  return neighbors;
}

// Algorithme A* extrêmement performant en JS (Pas de dépendance externe)
function findPathAStar(s, t) {
  const n = WORLD_W * WORLD_H;
  if (s < 0 || s >= n || t < 0 || t >= n) return [];

  // Tableaux de valeurs à plat pour accélérer l'accès mémoire
  const gScore = new Float32Array(n).fill(Infinity);
  const fScore = new Float32Array(n).fill(Infinity);
  const prev = new Int32Array(n).fill(-1);
  const inOpenSet = new Uint8Array(n); // Masque binaire rapide
  const closedSet = new Uint8Array(n); 

  gScore[s] = 0;
  fScore[s] = heuristic(s, t);

  // File d'attente à priorité simplifiée mais optimisée pour JS (Array plat à tri ciblé)
  const openList = [s];
  inOpenSet[s] = 1;

  while (openList.length > 0) {
    // Extraction rapide de la valeur minimale de fScore
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

    // Arrivée trouvée ! Reconstruction du trajet
    if (current === t) {
      const resultPath = [];
      let cur = t;
      while (cur !== -1) {
        resultPath.push(cur);
        cur = prev[cur];
      }
      return resultPath.reverse();
    }

    // Retirer de la liste
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

  return []; // Aucun chemin trouvé
}


// ==========================================
// 5. FONCTIONS DE DESSIN (MOTEUR RENDU OPTIMISÉ PAR FRUSTUM CULLING)
// ==========================================

// Dessine un bâtiment ou bloc 3D étiré vers le haut
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

  // Face Droite (Ombre moyenne)
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

  // Face Gauche (Ombre forte)
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

  // Toit (Éclairé)
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

// Fonction globale de rendu de la scène (Optimisation Frustum Culling)
function draw() {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
  
  ctx.setTransform(scale, 0, 0, scale, 0, 0);

  // 1. DÉFINITION DE L'ÉCRAN VISIBLE POUR LE FRUSTUM CULLING
  // On récupère les limites du canvas (coins haut-gauche et bas-droite) projetées à l'envers sur la grille
  const tl = unprojectPoint(0, 0, origin);
  const tr = unprojectPoint(canvas.width, 0, origin);
  const bl = unprojectPoint(0, canvas.height, origin);
  const br = unprojectPoint(canvas.width, canvas.height, origin);

  // Définition de la boîte de délimitation de la caméra (bounding box) sur la grille isométrique
  // On ajoute un padding dynamique de sécurité (par exemple 4 tuiles pour les reliefs élevés)
  const padding = 4;
  const minX = Math.max(0, Math.floor(Math.min(tl.x, tr.x, bl.x, br.x) - padding));
  const maxX = Math.min(WORLD_W - 1, Math.ceil(Math.max(tl.x, tr.x, bl.x, br.x) + padding));
  const minY = Math.max(0, Math.floor(Math.min(tl.y, tr.y, bl.y, br.y) - padding));
  const maxY = Math.min(WORLD_H - 1, Math.ceil(Math.max(tl.y, tr.y, bl.y, br.y) + padding));
  
  // 2. ORDONNANCEMENT PAR CALQUES UNIQUEMENT SUR LA ZONE VISIBLE (FRUSTUM CULLING)
  const tiles_to_draw = [];
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      tiles_to_draw.push({ x, y, depth: y + x });
    }
  }
  // Tri du rendu peintre (Y-Sort)
  tiles_to_draw.sort((a, b) => a.depth - b.depth);
  
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
      // --- MODIFICATION : RENDU AVEC TEXTURE OU COULEUR UNIE ---
      // Si l'ID est 10 (Pierre) et que la texture est disponible, on dessine la texture
      if (tileId === 10 && testTextureImage) {
        const tw = testTextureImage.width;
        const th = testTextureImage.height;

        // Définition des coordonnées U,V fixes sur l'image source (losange parfait)
        const uTop = tw / 2,     vTop = 0;
        const uRight = tw,       vRight = th / 2;
        const uBottom = tw / 2,  vBottom = th;
        const uLeft = 0,         vLeft = th / 2;

        // Division de la tuile déformée en deux triangles
        // Triangle 1 (Haut, Droite, Gauche)
        drawTextureTriangle(ctx, testTextureImage, 
          ptTop.x, ptTop.y, ptRight.x, ptRight.y, ptLeft.x, ptLeft.y,
          uTop, vTop, uRight, vRight, uLeft, vLeft
        );
        // Triangle 2 (Bas, Droite, Gauche)
        drawTextureTriangle(ctx, testTextureImage, 
          ptBottom.x, ptBottom.y, ptRight.x, ptRight.y, ptLeft.x, ptLeft.y,
          uBottom, vBottom, uRight, vRight, uLeft, vLeft
        );

        // --- APPLICATION DE L'OMBRAGE DU RELIEF SUR LA TEXTURE ---
        const slope = (elevTop + elevLeft) - (elevBottom + elevRight);
        if (Math.abs(slope) > 2) {
          ctx.save();
          // Masque de la tuile pour n'appliquer l'ombre que sur celle-ci
          ctx.beginPath();
          ctx.moveTo(ptTop.x, ptTop.y);
          ctx.lineTo(ptRight.x, ptRight.y);
          ctx.lineTo(ptBottom.x, ptBottom.y);
          ctx.lineTo(ptLeft.x, ptLeft.y);
          ctx.closePath();
          ctx.clip();

          // Mode de fusion Multiply pour intégrer l'ombre à la texture sans effacer ses détails
          ctx.globalCompositeOperation = 'multiply';
          if (slope > 2) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.15)'; // Éclaircissement
          } else {
            const darkness = Math.min(0.4, Math.abs(slope) * 0.006);
            ctx.fillStyle = `rgba(0, 0, 0, ${darkness})`; // Assombrissement
          }
          ctx.fill();
          ctx.restore();
        }

      } else {
        // Rendu classique à plat couleur unie si pas texturé
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

      // Bordures de tuiles identiques
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
  }
  
  // 3. AFFICHAGE DES RECOUVREMENTS DÉPART / ARRIVÉE (Si visible)
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
  
  // 4. DESSIN DU CHEMIN DE L'ALGORITHME A*
  if (path && path.length) {
    for (const p of path) {
      const x = p % WORLD_W, y = Math.floor(p / WORLD_W);
      
      // On ne dessine le segment du chemin que s'il est dans la zone visible
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
  draw();
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
      draw();
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
      draw();
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
// 7. ÉVÉNEMENTS UNIFIÉS (SOURIS, TACTILE, CLAVIER)
// ==========================================

function handleActionAtCell(cell, button) {
  if (editorMode === "paint") {
    if (button === 0) { 
      mapData[cell] = selectedTileId;
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

// 1. Appui (Souris ou Tactile)
canvas.addEventListener('pointerdown', (e) => {
  activePointers.push(e);
  canvas.setPointerCapture(e.pointerId);

  // CLIC DROIT SOURIS (Définir la cible du chemin)
  if (e.pointerType === 'mouse' && e.button === 2) {
    const cell = canvasToCell(e.clientX, e.clientY);
    if (cell !== -1) {
      handleActionAtCell(cell, 2);
      draw();
      updateInfo();
    }
    return;
  }

  // TACTILE : Lancer le timer pour simuler le clic droit (appui long)
  if (e.pointerType === 'touch') {
    touchTimer = setTimeout(() => {
      const cell = canvasToCell(e.clientX, e.clientY);
      if (cell !== -1) {
        handleActionAtCell(cell, 2); // Simule le clic droit pour l'arrivée
        draw();
        updateInfo();
        isPanning = false; // On annule le mouvement en glissant
      }
    }, LONG_PRESS_DELAY);
  }

  // Action d'édition au clic (avec le bouton principal de la souris ou à un seul doigt)
  if (activePointers.length === 1 && e.button !== 2) {
    const cell = canvasToCell(e.clientX, e.clientY);
    if (cell !== -1) {
      isMouseDown = true;
      lastPaintedCell = cell;
      handleActionAtCell(cell, 0);
      draw();
      updateInfo();
    } else {
      // Si on clique dans le vide, on active le déplacement caméra (panoramique)
      isPanning = true;
      startPanX = e.clientX - panX;
      startPanY = e.clientY - panY;
      canvas.style.cursor = 'grabbing';
    }
  } 
  // PINCEMENT TACTILE (Zoom à 2 doigts)
  else if (activePointers.length === 2) {
    isMouseDown = false;
    isPanning = false;
    clearTimeout(touchTimer); // Annule l'appui long si on commence à pincer
    initialPinchDistance = getDistance(activePointers[0], activePointers[1]);
    initialZoom = zoom;
  }
});

// 2. Mouvement (Souris ou Tactile)
canvas.addEventListener('pointermove', (e) => {
  const index = activePointers.findIndex(p => p.pointerId === e.pointerId);
  if (index !== -1) activePointers[index] = e;

  // Si on bouge trop l'écran, on annule l'appui long tactile
  if (e.pointerType === 'touch' && activePointers.length === 1) {
    const deltaX = Math.abs(e.clientX - (startPanX + panX));
    const deltaY = Math.abs(e.clientY - (startPanY + panY));
    if (deltaX > 15 || deltaY > 15) {
      clearTimeout(touchTimer);
    }
  }

  // Action d'édition continue (dessiner/ajuster le relief en glissant)
  if (isMouseDown && activePointers.length === 1 && editorMode !== "pathfinding") {
    const cell = canvasToCell(e.clientX, e.clientY);
    if (cell !== -1 && cell !== lastPaintedCell) {
      lastPaintedCell = cell;
      handleActionAtCell(cell, 0);
      draw();
      updateInfo();
    }
  } 
  // Glissement de la caméra (Panoramique avec 1 doigt ou souris)
  else if (isPanning && activePointers.length === 1) {
    panX = e.clientX - startPanX;
    panY = e.clientY - startPanY;
    requestAnimationFrame(draw);
  }
  // Zoom au pincement (Mobile à deux doigts)
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
      
      requestAnimationFrame(draw);
    }
  }
});

// 3. Fin du geste (Relâchement souris ou tactile)
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

// 4. ZOOM À LA MOLETTE SOURIS (Ordinateurs)
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

  requestAnimationFrame(draw); 
}, { passive: false });

// Bloquer le menu contextuel natif du clic droit sur la grille
canvas.addEventListener('contextmenu', e => e.preventDefault());

// Événements Clavier (Flèches directionnelles, Espace, R, F)
document.addEventListener('keydown', async (e) => {
  if (e.code === 'KeyF') {
    await toggleMapOnlyMode();
    return;
  }
  if (e.code === 'Space') {
    if (start < 0 || goal < 0) return alert('Définir départ et arrivée (Clic gauche ou tape rapide pour départ / Clic droit ou appui long pour arrivée)');
    path = findPathAStar(start, goal);
    draw();
  }
  if (e.code === 'ArrowUp') { panY += 30; draw(); }
  if (e.code === 'ArrowDown') { panY -= 30; draw(); }
  if (e.code === 'ArrowLeft') { panX += 30; draw(); }
  if (e.code === 'ArrowRight') { panX -= 30; draw(); }
  if (e.key === 'r' || e.key === 'R') { start = -1; goal = -1; path = []; draw(); }
  updateInfo();
});


// ==========================================
// 8. BOUTONS ET ACTIONS DE L'INTERFACE
// ==========================================

document.getElementById('btnReset').addEventListener('click', () => { start = -1; goal = -1; path = []; draw(); });

document.getElementById('btnCompute').addEventListener('click', () => {
  if (start < 0 || goal < 0) return alert('Définir départ et arrivée (Passez en mode "Chemin" pour les placer)');
  path = findPathAStar(start, goal);
  draw(); 
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
  start = -1; goal = -1; path = [];
  resizeCanvas(); 
  draw(); 
  updateInfo(); 
  renderTilesPalette();
});

document.getElementById('btnRegenerate').addEventListener('click', () => {
  const obstacleProb = parseInt(document.getElementById('inputObstacleProb').value, 10);
  if (isNaN(obstacleProb)) return alert('Valeur invalide pour obstacles');
  mapData = generateRandomMap(WORLD_W, WORLD_H, obstacleProb);
  elevationGrid = generateElevation(WORLD_W, WORLD_H);
  start = -1; goal = -1; path = [];
  draw(); 
  updateInfo(); 
  renderTilesPalette();
});


// ==========================================
// 9. CHARGEMENT ET REDIMENSIONNEMENT DU CANVAS
// ==========================================

async function loadText(name) {
  const r = await fetch(name);
  return await r.text();
}

function parseMap(text) {
  const parts = text.trim().split(/\s+/).map(Number);
  const rows = WORLD_H, cols = WORLD_W;
  const out = new Array(rows * cols).fill(-1);
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const idx = i * cols + j;
      out[idx] = (idx < parts.length) ? parts[idx] : -1;
    }
  }
  return out;
}

function resizeCanvas() {
  const availW = canvasContainer.clientWidth - 24; 
  const availH = canvasContainer.clientHeight - 24;
  
  canvas.width = availW;
  canvas.height = availH;
  
  scale = Math.min(availW / BASE_WIDTH, availH / BASE_HEIGHT);
  
  draw();
}

window.addEventListener('resize', resizeCanvas);

// Initialisation globale au chargement de la page
window.addEventListener('DOMContentLoaded', () => {
  WORLD_W = 20;
  WORLD_H = 20;
  mapData = generateRandomMap(WORLD_W, WORLD_H, 8);
  elevationGrid = generateElevation(WORLD_W, WORLD_H);
  
  resizeCanvas();
  renderTilesPalette();
  updateInfo();
});