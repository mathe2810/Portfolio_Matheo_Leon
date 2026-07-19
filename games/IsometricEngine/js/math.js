import { TILE_W, TILE_H, ELEVATION_SCALE, origin, gameState } from './state.js';

export function projectPoint(gx, gy, elevation) {
  return {
    x: ((origin.x * TILE_W) + (gx - gy) * (TILE_W / 2)) * gameState.zoom + gameState.panX,
    y: ((origin.y * TILE_H) + (gx + gy) * (TILE_H / 2) - (elevation * ELEVATION_SCALE)) * gameState.zoom + gameState.panY
  };
}

export function unprojectPoint(screenX, screenY) {
  const cx = (screenX / gameState.scale - gameState.panX) / gameState.zoom;
  const cy = (screenY / gameState.scale - gameState.panY) / gameState.zoom;
  
  const dx = cx - (origin.x * TILE_W);
  const dy = cy - (origin.y * TILE_H);
  
  const gx = (dx / (TILE_W / 2) + dy / (TILE_H / 2)) / 2;
  const gy = (dy / (TILE_H / 2) - dx / (TILE_W / 2)) / 2;
  
  return { x: gx, y: gy };
}

// Cache de performance pré-alloué pour éviter le Garbage Collection intensif dans la boucle de détection
let cachedTilesToCheck = [];
let lastCachedW = 0, lastCachedH = 0;

export function canvasToCell(clientX, clientY, canvas) {
  const rect = canvas.getBoundingClientRect();
  const mx = (clientX - rect.left) / gameState.scale;
  const my = (clientY - rect.top) / gameState.scale;
  const gridW = gameState.WORLD_W + 1;

  if (lastCachedW !== gameState.WORLD_W || lastCachedH !== gameState.WORLD_H) {
    cachedTilesToCheck = [];
    for (let y = 0; y < gameState.WORLD_H; y++) {
      for (let x = 0; x < gameState.WORLD_W; x++) {
        cachedTilesToCheck.push({ x, y, depth: y + x });
      }
    }
    lastCachedW = gameState.WORLD_W;
    lastCachedH = gameState.WORLD_H;
  }
  
  cachedTilesToCheck.sort((a, b) => b.depth - a.depth);

  for (let i = 0; i < cachedTilesToCheck.length; i++) {
    const tile = cachedTilesToCheck[i];
    const { x, y } = tile;
    const idx = y * gameState.WORLD_W + x;
    
    const elevTop    = gameState.elevationGrid[y * gridW + x] || 0;
    const elevRight  = gameState.elevationGrid[y * gridW + (x + 1)] || 0;
    const elevBottom = gameState.elevationGrid[(y + 1) * gridW + (x + 1)] || 0;
    const elevLeft   = gameState.elevationGrid[(y + 1) * gridW + x] || 0;

    const ptTop    = projectPoint(x, y, elevTop);
    const ptRight  = projectPoint(x + 1, y, elevRight);
    const ptBottom = projectPoint(x + 1, y + 1, elevBottom);
    const ptLeft   = projectPoint(x, y + 1, elevLeft);

    const pts = [ptTop, ptRight, ptBottom, ptLeft];
    let inside = false;

    for (let k = 0, j = pts.length - 1; k < pts.length; j = k++) {
      const xi = pts[k].x, yi = pts[k].y;
      const xj = pts[j].x, yj = pts[j].y;
      
      const intersect = ((yi > my) !== (yj > my)) && (mx < (xj - xi) * (my - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    if (inside) return idx;
  }
  return -1;
}

export function getDistance(p1, p2) {
  const dx = p1.clientX - p2.clientX;
  const dy = p1.clientY - p2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

export function shadeColor(color, percent) {
  let R = parseInt(color.substring(1, 3), 16);
  let G = parseInt(color.substring(3, 5), 16);
  let B = parseInt(color.substring(5, 7), 16);
  
  R = parseInt(R * (1 + percent)); G = parseInt(G * (1 + percent)); B = parseInt(B * (1 + percent));
  R = Math.max(0, Math.min(255, R)); G = Math.max(0, Math.min(255, G)); B = Math.max(0, Math.min(255, B));
  
  let RR = (R.toString(16).length === 1) ? "0" + R.toString(16) : R.toString(16);
  let GG = (G.toString(16).length === 1) ? "0" + G.toString(16) : G.toString(16);
  let BB = (B.toString(16).length === 1) ? "0" + B.toString(16) : B.toString(16);
  
  return "#" + RR + GG + BB;
}

export function getTileAverageElevation(tileX, tileY) {
  const gridW = gameState.WORLD_W + 1;
  const tLeft  = gameState.elevationGrid[tileY * gridW + tileX] || 0;
  const tRight = gameState.elevationGrid[tileY * gridW + (tileX + 1)] || 0;
  const bRight = gameState.elevationGrid[(tileY + 1) * gridW + (tileX + 1)] || 0;
  const bLeft  = gameState.elevationGrid[(tileY + 1) * gridW + tileX] || 0;
  return (tLeft + tRight + bRight + bLeft) / 4;
}

export function heuristic(idxA, idxB) {
  const ax = idxA % gameState.WORLD_W; const ay = Math.floor(idxA / gameState.WORLD_W);
  const bx = idxB % gameState.WORLD_W; const by = Math.floor(idxB / gameState.WORLD_W);
  const dX = Math.abs(ax - bx); const dY = Math.abs(ay - by);
  
  const elevA = getTileAverageElevation(ax, ay);
  const elevB = getTileAverageElevation(bx, by);
  const dZ = Math.abs(elevA - elevB);
  return dX + dY + (dZ * 0.15);
}

export function getAdjacentNeighbors(idx) {
  const x = idx % gameState.WORLD_W; const y = Math.floor(idx / gameState.WORLD_W);
  const neighbors = [];
  const moves = [
    [-1, 0, 1], [1, 0, 1], [0, -1, 1], [0, 1, 1],
    [-1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [1, 1, Math.SQRT2]
  ];
  const currentElev = getTileAverageElevation(x, y);

  for (const [dy, dx, geomCost] of moves) {
    const ny = y + dy; const nx = x + dx;
    if (nx >= 0 && nx < gameState.WORLD_W && ny >= 0 && ny < gameState.WORLD_H) {
      const neighborIdx = ny * gameState.WORLD_W + nx;
      if (gameState.mapData[neighborIdx] === -1) continue;

      const neighborElev = getTileAverageElevation(nx, ny);
      const elevDiff = neighborElev - currentElev;
      let slopePenalty = 0;
      if (elevDiff > 0) slopePenalty = elevDiff * 0.15;

      neighbors.push({ to: neighborIdx, cost: geomCost + slopePenalty });
    }
  }
  return neighbors;
}

export function findPathAStar(s, t) {
  const n = gameState.WORLD_W * gameState.WORLD_H;
  if (s < 0 || s >= n || t < 0 || t >= n) return [];

  const gScore = new Float32Array(n).fill(Infinity);
  const fScore = new Float32Array(n).fill(Infinity);
  const prev = new Int32Array(n).fill(-1);
  const inOpenSet = new Uint8Array(n); 
  const closedSet = new Uint8Array(n); 

  gScore[s] = 0; fScore[s] = heuristic(s, t);
  const openList = [s]; inOpenSet[s] = 1;

  while (openList.length > 0) {
    let bestIndex = 0; let bestNode = openList[0]; let minF = fScore[bestNode];
    for (let i = 1; i < openList.length; i++) {
      const node = openList[i];
      if (fScore[node] < minF) { minF = fScore[node]; bestNode = node; bestIndex = i; }
    }
    const current = bestNode;
    if (current === t) {
      const resultPath = []; let cur = t;
      while (cur !== -1) { resultPath.push(cur); cur = prev[cur]; }
      return resultPath.reverse();
    }
    openList.splice(bestIndex, 1); inOpenSet[current] = 0; closedSet[current] = 1;
    const neighbors = getAdjacentNeighbors(current);
    for (let i = 0; i < neighbors.length; i++) {
      const neighbor = neighbors[i].to;
      if (closedSet[neighbor]) continue;
      const tentativeG = gScore[current] + neighbors[i].cost;
      if (tentativeG < gScore[neighbor]) {
        prev[neighbor] = current; gScore[neighbor] = tentativeG;
        fScore[neighbor] = tentativeG + heuristic(neighbor, t);
        if (!inOpenSet[neighbor]) { openList.push(neighbor); inOpenSet[neighbor] = 1; }
      }
    }
  }
  return [];
}

export function modifyElevationAtCell(cellIndex, raise = true) {
  const x = cellIndex % gameState.WORLD_W; const y = Math.floor(cellIndex / gameState.WORLD_W);
  const gridW = gameState.WORLD_W + 1; const amount = raise ? 8 : -8;
  const vertices = [{ vx: x, vy: y }, { vx: x + 1, vy: y }, { vx: x + 1, vy: y + 1 }, { vx: x, vy: y + 1 }];

  for (const v of vertices) {
    const vIdx = v.vy * gridW + v.vx;
    if (vIdx >= 0 && vIdx < gameState.elevationGrid.length) {
      gameState.elevationGrid[vIdx] = Math.max(0, gameState.elevationGrid[vIdx] + amount);
    }
  }
  if (gameState.start >= 0 && gameState.goal >= 0 && gameState.path.length > 0) {
    gameState.path = findPathAStar(gameState.start, gameState.goal);
  }
}